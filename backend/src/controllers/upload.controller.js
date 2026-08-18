const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const Job = require('../models/job.model');
const Pipeline = require('../models/pipeline.model');
const { runEtlJob } = require('../services/etl.service');
const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * Controller to handle incoming CSV streaming uploads.
 * Streams data directly to disk before triggering background ETL process.
 */
async function handleUpload(req, res, next) {
  try {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: { message: 'Invalid Content-Type, must be multipart/form-data' } });
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: config.MAX_FILE_SIZE, // E.g., 10GB limit
        files: 1
      }
    });

    let pipelineId = null;
    let fileWritten = false;
    let tempFilePath = null;
    let fileName = '';
    let totalBytes = 0;
    let writeStream = null;
    let limitExceeded = false;

    busboy.on('field', (name, val) => {
      if (name === 'pipelineId') {
        pipelineId = val;
      }
    });

    busboy.on('file', (fieldname, fileStream, info) => {
      const { filename } = info;
      // Sanitize the filename to prevent directory traversal attacks
      fileName = path.basename(filename);

      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      tempFilePath = path.join(uploadsDir, `${uniqueSuffix}-${fileName}`);

      writeStream = fs.createWriteStream(tempFilePath);

      fileStream.on('limit', () => {
        limitExceeded = true;
        fileStream.unpipe(writeStream);
        writeStream.destroy();
        fs.unlink(tempFilePath, () => {});
        logger.warn('Uploaded file exceeded the configured size limit');
      });

      fileStream.pipe(writeStream);

      writeStream.on('finish', () => {
        fileWritten = true;
        totalBytes = writeStream.bytesWritten;
      });

      writeStream.on('error', (error) => {
        logger.error({ error }, 'Error saving uploaded stream to disk');
        fileStream.unpipe(writeStream);
        writeStream.destroy();
        fs.unlink(tempFilePath, () => {});
      });
    });

    busboy.on('finish', async () => {
      if (limitExceeded) {
        return res.status(413).json({ error: { message: 'File size limit exceeded' } });
      }

      if (!pipelineId) {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        return res.status(400).json({ error: { message: 'Missing pipelineId field' } });
      }

      if (!fileWritten || !tempFilePath || !fs.existsSync(tempFilePath)) {
        return res.status(400).json({ error: { message: 'No file uploaded or file upload failed' } });
      }

      try {
        // Validate pipeline configuration exists
        const pipelineConfig = await Pipeline.findById(pipelineId);
        if (!pipelineConfig) {
          fs.unlinkSync(tempFilePath);
          return res.status(404).json({ error: { message: `Pipeline configuration not found for ID: ${pipelineId}` } });
        }

        // Initialize Job database entry
        const job = new Job({
          status: 'pending',
          fileName,
          pipelineId
        });
        await job.save();

        logger.info({ jobId: job._id, pipelineId }, 'File upload completed. Initializing background ETL pipeline');

        // Execute streaming pipeline processing in the background asynchronously
        setImmediate(() => {
          runEtlJob(job._id, pipelineId, tempFilePath, totalBytes).catch((error) => {
            logger.error({ error, jobId: job._id }, 'Background ETL execution initialization failed');
          });
        });

        // Respond immediately with the job credentials
        res.status(202).json({
          message: 'File upload completed successfully. Processing has started.',
          jobId: job._id,
          fileName,
          totalBytes
        });

      } catch (error) {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        next(error);
      }
    });

    req.pipe(busboy);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleUpload
};
