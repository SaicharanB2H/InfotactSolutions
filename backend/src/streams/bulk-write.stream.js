const { Writable } = require('stream');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * BulkWriteStream collects objects and writes them to MongoDB in batches using bulkWrite.
 * It manages backpressure naturally by only calling the write callback once MongoDB acknowledges the batch.
 */
class BulkWriteStream extends Writable {
  /**
   * @param {string} jobId 
   * @param {string} pipelineId 
   * @param {object} options 
   */
  constructor(jobId, pipelineId, options = {}) {
    super({ objectMode: true, ...options });
    this.jobId = jobId;
    this.pipelineId = pipelineId;
    this.batchSize = config.BULK_BATCH_SIZE || 5000;
    this.batch = [];
    
    // Get native MongoDB collection reference
    const collectionName = `pipeline_data_${pipelineId}`;
    this.collection = mongoose.connection.db.collection(collectionName);
    
    this.pendingAsyncOps = [];
  }

  async _write(row, encoding, callback) {
    this.batch.push(row);

    if (this.batch.length >= this.batchSize) {
      try {
        await this.flushBatch();
        callback();
      } catch (error) {
        callback(error);
      }
    } else {
      callback();
    }
  }

  async _final(callback) {
    try {
      if (this.batch.length > 0) {
        await this.flushBatch();
      }
      
      // Ensure all background db writes (like error logging) complete before finishing
      if (this.pendingAsyncOps.length > 0) {
        await Promise.all(this.pendingAsyncOps);
      }
      
      callback();
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Flushes the current batch of rows to MongoDB using collection.bulkWrite.
   */
  async flushBatch() {
    const batchToFlush = [...this.batch];
    this.batch = [];

    const operations = batchToFlush.map(row => {
      // Strip metadata field _rowNumber before database insert
      const { _rowNumber, ...data } = row;
      return {
        insertOne: {
          document: {
            ...data,
            _jobId: new mongoose.Types.ObjectId(this.jobId),
            _uploadedAt: new Date()
          }
        }
      };
    });

    const Job = require('../models/job.model');
    const ErrorRecord = require('../models/error-record.model');

    try {
      const result = await this.collection.bulkWrite(operations, { ordered: false });
      const insertedCount = result.insertedCount || 0;
      const failedCount = operations.length - insertedCount;

      // Update Job processed/failed counts in database
      await Job.updateOne(
        { _id: this.jobId },
        { $inc: { processedRows: insertedCount, failedRows: failedCount } }
      );
      
    } catch (error) {
      // Catch bulk write failures (e.g. key collisions, schema violations)
      const writeErrors = error.writeErrors || [];
      const failedIndices = new Set(writeErrors.map(e => e.index));
      const insertedCount = operations.length - failedIndices.size;
      const failedCount = failedIndices.size;

      // Update Job with whatever succeeded
      await Job.updateOne(
        { _id: this.jobId },
        { $inc: { processedRows: insertedCount, failedRows: failedCount } }
      ).catch(err => logger.error({ err, jobId: this.jobId }, 'Failed to update job metrics on write error'));

      // Log error records for each failed operation in the batch
      const errorRecords = writeErrors.map(we => {
        const originalRow = batchToFlush[we.index];
        return {
          jobId: this.jobId,
          rowNumber: originalRow._rowNumber || 0,
          originalData: originalRow,
          errorMessage: we.errmsg,
          stage: 'database'
        };
      });

      if (errorRecords.length > 0) {
        const errorPromise = ErrorRecord.insertMany(errorRecords).catch(err => 
          logger.error({ err, jobId: this.jobId }, 'Failed to write ErrorRecords for bulkWrite failures')
        );
        this.pendingAsyncOps.push(errorPromise);
      }
    }
  }
}

module.exports = BulkWriteStream;
