import fs from 'fs';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Job, JOB_STATUS } from '../models/Job.js';
import { Pipeline } from '../models/Pipeline.js';
import { FailedRow } from '../models/FailedRow.js';
import { createCsvStream } from '../streams/csv.parser.js';
import { createJsonStream } from '../streams/json.parser.js';
import { createTransformStream } from '../streams/transform.stream.js';
import { createValidationStream } from '../streams/validation.stream.js';
import { createMongoBulkStream } from '../streams/mongo.bulk.stream.js';
import { broadcastJobProgress } from './websocket.service.js';
import { config } from '../config/env.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { removeFileSafely } from '../utils/file.js';

// Map of running jobs: Map<jobId, { streams: Array, abortController: AbortController }>
const activeJobs = new Map();

/**
 * Get active running job count
 */
export function getActiveJobCount() {
  return activeJobs.size;
}

/**
 * Start execution of a queued job
 */
export async function startJob(jobId, options = {}) {
  const job = await Job.findOne({ jobId });
  if (!job) {
    throw new AppError(ERROR_CODES.JOB_NOT_FOUND, `Job ${jobId} not found`, 404);
  }

  if (job.status === JOB_STATUS.PROCESSING) {
    throw new AppError(ERROR_CODES.JOB_ALREADY_RUNNING, `Job ${jobId} is already processing`, 400);
  }

  if (getActiveJobCount() >= config.maxConcurrentJobs) {
    throw new AppError(
      ERROR_CODES.CONCURRENCY_LIMIT_REACHED,
      `Maximum concurrent processing jobs (${config.maxConcurrentJobs}) reached. Job is QUEUED.`,
      429
    );
  }

  // Load pipeline definition
  let pipeline = null;
  const pipelineIdToUse = options.pipelineId || job.pipelineId;
  
  if (pipelineIdToUse) {
    pipeline = await Pipeline.findById(pipelineIdToUse);
    if (!pipeline) {
      throw new AppError(ERROR_CODES.PIPELINE_NOT_FOUND, `Pipeline ${pipelineIdToUse} not found`, 404);
    }
  }

  // Update status to PROCESSING
  job.status = JOB_STATUS.PROCESSING;
  job.startedAt = new Date();
  job.cancelRequested = false;
  job.error = null;
  await job.save();

  broadcastJobProgress(jobId, {
    type: 'started',
    jobId,
    status: JOB_STATUS.PROCESSING,
    message: 'Job processing started'
  });

  // Run ETL pipeline asynchronously
  executePipeline(job, pipeline).catch(async (err) => {
    logger.error(`Unhandled pipeline error for job ${jobId}:`, { error: err.message });
  });

  return job;
}

/**
 * Executes the streaming pipeline for a job
 */
async function executePipeline(job, pipeline) {
  const { jobId, filePath, fileType, fileSize } = job;
  const abortController = new AbortController();

  const destinationCollection = pipeline?.destinationCollection || `job_${jobId.replace(/-/g, '_')}`;
  const mapping = pipeline?.mapping || {};
  const transformations = pipeline?.transformations || [];
  const validationRules = pipeline?.validationRules || {};

  const streamsToDestroy = [];

  try {
    if (!fs.existsSync(filePath)) {
      throw new AppError(ERROR_CODES.INVALID_FILE, `Source file for job ${jobId} missing at path ${filePath}`, 404);
    }

    const readStream = fs.createReadStream(filePath);
    streamsToDestroy.push(readStream);

    let parserStreamReadable;
    if (fileType === 'JSON' || fileType === 'NDJSON') {
      const jsonStream = createJsonStream();
      readStream.pipe(jsonStream.writable);
      parserStreamReadable = jsonStream.readable;
      streamsToDestroy.push(jsonStream.writable, jsonStream.readable);
    } else {
      const csvStream = createCsvStream();
      readStream.pipe(csvStream);
      parserStreamReadable = csvStream;
      streamsToDestroy.push(csvStream);
    }

    const transformStream = createTransformStream({
      mapping,
      transformations
    });
    streamsToDestroy.push(transformStream);

    const validationStream = createValidationStream({
      jobId,
      validationRules
    });
    streamsToDestroy.push(validationStream);

    const mongoStream = createMongoBulkStream({
      jobId,
      destinationCollection,
      batchSize: config.batchSize,
      fileSize
    });
    streamsToDestroy.push(mongoStream);

    activeJobs.set(jobId, {
      streams: streamsToDestroy,
      abortController
    });

    // Run pipeline using Node stream.pipeline
    await streamPipeline(
      parserStreamReadable,
      transformStream,
      validationStream,
      mongoStream,
      { signal: abortController.signal }
    );

    // Pipeline finished successfully
    const updatedJob = await Job.findOne({ jobId });
    if (updatedJob && updatedJob.status !== JOB_STATUS.CANCELLED) {
      updatedJob.status = JOB_STATUS.COMPLETED;
      updatedJob.completedAt = new Date();
      updatedJob.progress = 100;
      await updatedJob.save();

      broadcastJobProgress(jobId, {
        type: 'completed',
        jobId,
        status: JOB_STATUS.COMPLETED,
        processedRows: updatedJob.processedRows,
        failedRows: updatedJob.failedRows,
        totalRows: updatedJob.totalRows,
        rowsPerSecond: updatedJob.rowsPerSecond,
        progress: 100
      });

      logger.info(`Job ${jobId} completed successfully`, {
        processed: updatedJob.processedRows,
        failed: updatedJob.failedRows
      });
    }

  } catch (err) {
    const isCancelled = err.message === 'JOB_CANCELLED' || err.name === 'AbortError' || (await Job.findOne({ jobId }))?.cancelRequested;

    const currentJob = await Job.findOne({ jobId });
    if (currentJob) {
      if (isCancelled) {
        currentJob.status = JOB_STATUS.CANCELLED;
        currentJob.completedAt = new Date();
        currentJob.error = 'Job cancelled by user';
        await currentJob.save();

        broadcastJobProgress(jobId, {
          type: 'cancelled',
          jobId,
          status: JOB_STATUS.CANCELLED,
          processedRows: currentJob.processedRows,
          failedRows: currentJob.failedRows
        });

        logger.info(`Job ${jobId} cancelled successfully`);
      } else {
        currentJob.status = JOB_STATUS.FAILED;
        currentJob.completedAt = new Date();
        currentJob.error = err.message || 'Pipeline processing failed';
        await currentJob.save();

        broadcastJobProgress(jobId, {
          type: 'error',
          jobId,
          status: JOB_STATUS.FAILED,
          message: currentJob.error
        });

        logger.error(`Job ${jobId} failed: ${currentJob.error}`);
      }
    }
  } finally {
    // Cleanup active job entry
    activeJobs.delete(jobId);

    // Process next queued job if available
    processNextQueuedJob().catch(() => {});
  }
}

/**
 * Automatically trigger next queued job when slot opens up
 */
async function processNextQueuedJob() {
  if (getActiveJobCount() < config.maxConcurrentJobs) {
    const nextJob = await Job.findOne({ status: JOB_STATUS.QUEUED }).sort({ createdAt: 1 });
    if (nextJob) {
      logger.info(`Auto-starting next queued job ${nextJob.jobId}`);
      startJob(nextJob.jobId).catch((err) => {
        logger.error(`Failed to auto-start queued job ${nextJob.jobId}: ${err.message}`);
      });
    }
  }
}

/**
 * Cancel a processing or queued job
 */
export async function cancelJob(jobId) {
  const job = await Job.findOne({ jobId });
  if (!job) {
    throw new AppError(ERROR_CODES.JOB_NOT_FOUND, `Job ${jobId} not found`, 404);
  }

  if (job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.FAILED) {
    throw new AppError(
      ERROR_CODES.INVALID_MAPPING,
      `Cannot cancel job with status ${job.status}`,
      400
    );
  }

  job.cancelRequested = true;

  if (job.status === JOB_STATUS.QUEUED) {
    job.status = JOB_STATUS.CANCELLED;
    job.completedAt = new Date();
    job.error = 'Job cancelled by user while queued';
    await job.save();

    broadcastJobProgress(jobId, {
      type: 'cancelled',
      jobId,
      status: JOB_STATUS.CANCELLED
    });

    return job;
  }

  await job.save();

  // If job is running, signal abort controller & destroy streams
  const activeEntry = activeJobs.get(jobId);
  if (activeEntry) {
    try {
      activeEntry.abortController.abort();
    } catch (e) {}
    for (const s of activeEntry.streams) {
      if (s && typeof s.destroy === 'function') {
        try { s.destroy(); } catch (e) {}
      }
    }
  }

  return job;
}

export async function getJobById(jobId) {
  const job = await Job.findOne({ jobId }).populate('pipelineId');
  if (!job) {
    throw new AppError(ERROR_CODES.JOB_NOT_FOUND, `Job ${jobId} not found`, 404);
  }
  return job;
}

export async function getJobErrors(jobId, page = 1, limit = 50) {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);

  const total = await FailedRow.countDocuments({ jobId });
  const errors = await FailedRow.find({ jobId })
    .sort({ rowNumber: 1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    errors
  };
}

export async function deleteJob(jobId) {
  const job = await Job.findOne({ jobId });
  if (!job) {
    throw new AppError(ERROR_CODES.JOB_NOT_FOUND, `Job ${jobId} not found`, 404);
  }

  if (job.status === JOB_STATUS.PROCESSING) {
    throw new AppError(ERROR_CODES.INVALID_MAPPING, `Cannot delete actively processing job ${jobId}`, 400);
  }

  // Clean up stored upload file & failed rows
  await removeFileSafely(job.filePath);
  await FailedRow.deleteMany({ jobId });
  await Job.deleteOne({ jobId });

  return { success: true, message: `Job ${jobId} and associated temporary files deleted` };
}
