const fs = require('fs');
const { Transform } = require('stream');
const { pipeline: nativePipeline } = require('stream');
const Job = require('../models/job.model');
const Pipeline = require('../models/pipeline.model');
const logger = require('../utils/logger');
const { createCsvParserStream } = require('../streams/csv-parser.stream');
const MappingStream = require('../streams/mapping.stream');
const TransformationStream = require('../streams/transformation.stream');
const ValidationStream = require('../streams/validation.stream');
const BulkWriteStream = require('../streams/bulk-write.stream');
const { startProgressTracker, stopProgressTracker, trackJobBytes, incrementJobBytes } = require('./progress.service');

// Registry to track running pipelines for cancellation: jobId (string) -> { streams: Array, tempFilePath: string }
const activePipelines = new Map();

/**
 * Orchestrates the streaming ETL pipeline execution.
 * @param {string} jobId 
 * @param {string} pipelineId 
 * @param {string} tempFilePath 
 * @param {number} totalBytes 
 */
async function runEtlJob(jobId, pipelineId, tempFilePath, totalBytes) {
  const jobIdStr = String(jobId);
  logger.info(`Orchestrating ETL job ${jobIdStr} for pipeline ${pipelineId}`);

  // Fetch Pipeline configuration
  const pipelineConfig = await Pipeline.findById(pipelineId);
  if (!pipelineConfig) {
    throw new Error(`Pipeline ${pipelineId} not found`);
  }

  // Set Job to processing status
  await Job.updateOne(
    { _id: jobId },
    { $set: { status: 'processing', startedAt: new Date(), error: null } }
  );

  // Initialize byte tracking stats and WebSocket logging interval
  trackJobBytes(jobIdStr, totalBytes);
  startProgressTracker(jobIdStr);

  const streams = [];

  // 1. File Stream Reader (reads from local temp storage)
  const fileStream = fs.createReadStream(tempFilePath);
  streams.push(fileStream);

  // 2. Byte Counter Stream (updates bytesRead progress metrics)
  const byteCounterStream = new Transform({
    transform(chunk, encoding, callback) {
      incrementJobBytes(jobIdStr, chunk.length);
      this.push(chunk);
      callback();
    }
  });
  streams.push(byteCounterStream);

  // 3. CSV Parser Stream (parses buffer chunks to row objects)
  const csvParserStream = createCsvParserStream();
  streams.push(csvParserStream);

  // 4. Row Indexer (adds _rowNumber metadata to preserve line counts on failures)
  let rowCounter = 0;
  const rowIndexerStream = new Transform({
    objectMode: true,
    transform(row, encoding, callback) {
      rowCounter++;
      row._rowNumber = rowCounter;
      this.push(row);
      callback();
    }
  });
  streams.push(rowIndexerStream);

  // 5. Mapping Stream (renames source columns to target names)
  const mappingStream = new MappingStream(pipelineConfig.mappings);
  streams.push(mappingStream);

  // Build the pipeline array dynamically
  const pipelineArray = [
    fileStream,
    byteCounterStream,
    csvParserStream,
    rowIndexerStream,
    mappingStream
  ];

  // 6. Optional: Secure Transformation Stream (isolated-vm JS code)
  if (pipelineConfig.transformations && pipelineConfig.transformations.length > 0) {
    const transformationStream = new TransformationStream(jobIdStr, pipelineConfig.transformations);
    streams.push(transformationStream);
    pipelineArray.push(transformationStream);
  }

  // 7. Optional: Validation Stream (type assertions and constraints checking)
  if (pipelineConfig.validationRules && pipelineConfig.validationRules.length > 0) {
    const validationStream = new ValidationStream(jobIdStr, pipelineConfig.validationRules);
    streams.push(validationStream);
    pipelineArray.push(validationStream);
  }

  // 8. Bulk Write Stream (Writable - batches data and executes native bulkWrite)
  const bulkWriteStream = new BulkWriteStream(jobIdStr, pipelineConfig._id);
  streams.push(bulkWriteStream);
  pipelineArray.push(bulkWriteStream);

  // Construct promise wrapping native stream.pipeline
  const pipelinePromise = new Promise((resolve, reject) => {
    nativePipeline(...pipelineArray, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  // Track the active pipeline for potential user cancellations
  activePipelines.set(jobIdStr, { streams, tempFilePath });

  pipelinePromise
    .then(async () => {
      logger.info(`ETL job ${jobIdStr} completed successfully`);
      
      // Update Job status to completed
      await Job.updateOne(
        { _id: jobId },
        { $set: { status: 'completed', completedAt: new Date() } }
      );
    })
    .catch(async (error) => {
      const currentJob = await Job.findById(jobId);
      
      // If user cancelled, don't overwrite the cancellation status
      if (currentJob && currentJob.status === 'cancelled') {
        logger.info(`ETL job ${jobIdStr} aborted via cancellation cleanup`);
        return;
      }

      logger.error({ error, jobId: jobIdStr }, `ETL job ${jobIdStr} execution failed`);
      await Job.updateOne(
        { _id: jobId },
        { $set: { status: 'failed', completedAt: new Date(), error: error.message } }
      );
    })
    .finally(() => {
      // Delete temporary file from local storage
      fs.unlink(tempFilePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          logger.error({ err, tempFilePath }, 'Failed to delete temporary file');
        } else {
          logger.debug(`Cleaned up temporary file: ${tempFilePath}`);
        }
      });

      // Cleanup trackers
      activePipelines.delete(jobIdStr);
      stopProgressTracker(jobIdStr);
    });
}

/**
 * Halts an active stream pipeline and aborts processing.
 * @param {string} jobId 
 * @returns {boolean} True if job was running and is now cancelled
 */
function cancelEtlJob(jobId) {
  const jobIdStr = String(jobId);
  const active = activePipelines.get(jobIdStr);
  
  if (!active) {
    logger.warn(`Cancellation requested for job ${jobIdStr} but no active pipeline found`);
    return false;
  }

  logger.info(`Aborting stream pipeline for ETL Job: ${jobIdStr}`);

  // Destroy all active streams in the pipeline.
  // This causes the pipeline to tear down immediately and close all file descriptors
  for (const stream of active.streams) {
    if (stream && typeof stream.destroy === 'function' && !stream.destroyed) {
      stream.destroy();
    }
  }

  // Update status in database immediately to reflect cancellation
  Job.updateOne(
    { _id: jobId },
    { $set: { status: 'cancelled', completedAt: new Date(), error: 'Job cancelled by user' } }
  ).catch(err => logger.error({ err, jobIdStr }, 'Failed to update job cancellation status'));

  return true;
}

module.exports = {
  runEtlJob,
  cancelEtlJob
};
