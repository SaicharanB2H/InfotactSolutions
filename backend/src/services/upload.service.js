import busboy from 'busboy';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { Job, JOB_STATUS } from '../models/Job.js';
import { Pipeline } from '../models/Pipeline.js';
import { sanitizeFileName, getFileExtension, removeFileSafely } from '../utils/file.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Streaming file upload handler using busboy
 */
export async function handleStreamUpload(req) {
  return new Promise((resolve, reject) => {
    let bb;
    try {
      bb = busboy({
        headers: req.headers,
        limits: {
          files: 1,
          fileSize: config.maxFileSizeBytes
        }
      });
    } catch (err) {
      return reject(new AppError(ERROR_CODES.INVALID_FILE, 'Malformed multipart upload request', 400));
    }

    const jobId = uuidv4();
    let pipelineId = null;
    let fileUploaded = false;
    let uploadError = null;
    let savedFilePath = '';
    let originalFileName = '';
    let fileSize = 0;
    let fileType = 'CSV';

    bb.on('field', (fieldname, val) => {
      if (fieldname === 'pipelineId' && val) {
        pipelineId = val;
      }
    });

    bb.on('file', (fieldname, fileStream, info) => {
      if (fieldname !== 'file') {
        fileStream.resume(); // Drain unneeded streams
        return;
      }

      fileUploaded = true;
      const { filename, mimeType } = info;
      originalFileName = sanitizeFileName(filename);
      const ext = getFileExtension(originalFileName);

      if (ext === 'json') fileType = 'JSON';
      else if (ext === 'ndjson') fileType = 'NDJSON';
      else fileType = 'CSV';

      savedFilePath = path.join(config.uploadDir, `${jobId}_${originalFileName}`);
      const writeStream = fs.createWriteStream(savedFilePath);

      fileStream.on('data', (data) => {
        fileSize += data.length;
        if (fileSize > config.maxFileSizeBytes) {
          uploadError = new AppError(
            ERROR_CODES.FILE_TOO_LARGE,
            `File size exceeds maximum allowed limit of ${config.maxFileSizeGb}GB`,
            400
          );
          fileStream.unpipe(writeStream);
          writeStream.destroy();
          removeFileSafely(savedFilePath);
        }
      });

      fileStream.pipe(writeStream);

      writeStream.on('error', (err) => {
        uploadError = new AppError(ERROR_CODES.INTERNAL_ERROR, `File write error: ${err.message}`, 500);
        removeFileSafely(savedFilePath);
      });
    });

    bb.on('error', (err) => {
      removeFileSafely(savedFilePath);
      reject(uploadError || new AppError(ERROR_CODES.INVALID_FILE, `Upload parsing error: ${err.message}`, 400));
    });

    bb.on('finish', async () => {
      if (uploadError) {
        removeFileSafely(savedFilePath);
        return reject(uploadError);
      }

      if (!fileUploaded || fileSize === 0) {
        removeFileSafely(savedFilePath);
        return reject(new AppError(ERROR_CODES.INVALID_FILE, 'No valid file provided in request field "file"', 400));
      }

      try {
        if (pipelineId) {
          const pipelineExists = await Pipeline.findById(pipelineId);
          if (!pipelineExists) {
            removeFileSafely(savedFilePath);
            return reject(new AppError(ERROR_CODES.PIPELINE_NOT_FOUND, `Pipeline ${pipelineId} not found`, 404));
          }
        }

        const job = await Job.create({
          jobId,
          pipelineId: pipelineId || null,
          originalFileName,
          filePath: savedFilePath,
          fileSize,
          fileType,
          status: JOB_STATUS.QUEUED
        });

        logger.info(`File uploaded successfully for job ${jobId}`, {
          fileName: originalFileName,
          fileSize
        });

        resolve({
          success: true,
          jobId: job.jobId,
          message: 'File uploaded successfully',
          fileName: job.originalFileName,
          fileSize: job.fileSize,
          fileType: job.fileType,
          status: job.status
        });
      } catch (err) {
        removeFileSafely(savedFilePath);
        reject(new AppError(ERROR_CODES.INTERNAL_ERROR, `Failed to create job record: ${err.message}`, 500));
      }
    });

    req.pipe(bb);
  });
}
