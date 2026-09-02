import { Writable } from 'node:stream';
import mongoose from 'mongoose';
import { Job, JOB_STATUS } from '../models/Job.js';
import { broadcastJobProgress } from '../services/websocket.service.js';
import { logger } from '../utils/logger.js';
import { calculateProgress } from '../utils/progress.js';

/**
 * MongoDB BulkWrite Backpressured Writable Stream
 */
export class MongoBulkStream extends Writable {
  constructor({
    jobId,
    destinationCollection,
    batchSize = 5000,
    fileSize = 0,
    options = {}
  }) {
    super({ objectMode: true, highWaterMark: 16, ...options });

    this.jobId = jobId;
    this.destinationCollection = destinationCollection;
    this.batchSize = batchSize;
    this.fileSize = fileSize;

    this.buffer = [];
    this.processedCount = 0;
    this.failedCount = 0;
    this.startTime = Date.now();
    this.lastProgressEmit = 0;
    this.bytesProcessed = 0;

    this.collection = mongoose.connection.db
      ? mongoose.connection.db.collection(destinationCollection)
      : null;
  }

  _write(chunk, encoding, callback) {
    if (!chunk) return callback();

    if (chunk.isValid) {
      this.buffer.push(chunk.data);
      this.processedCount++;
    } else {
      this.failedCount++;
    }

    if (this.buffer.length >= this.batchSize) {
      this.flushBatch()
        .then(() => {
          return this.updateProgressAndCheckCancel();
        })
        .then(() => callback())
        .catch((err) => callback(err));
    } else {
      this.updateProgressAndCheckCancel()
        .then(() => callback())
        .catch((err) => callback(err));
    }
  }

  async _final(callback) {
    try {
      if (this.buffer.length > 0) {
        await this.flushBatch();
      }
      await this.updateProgressAndCheckCancel(true);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  async flushBatch() {
    if (this.buffer.length === 0) return;

    if (!this.collection && mongoose.connection.db) {
      this.collection = mongoose.connection.db.collection(this.destinationCollection);
    }

    const docsToInsert = [...this.buffer];
    this.buffer = [];

    const bulkOps = docsToInsert.map((doc) => ({
      insertOne: { document: doc }
    }));

    try {
      if (this.collection) {
        await this.collection.bulkWrite(bulkOps, { ordered: false });
      }
    } catch (err) {
      logger.error(`BulkWrite partial batch error in job ${this.jobId}:`, { error: err.message });
      // BulkWrite error might insert partially; increment failed count for write errors
      if (err.result && err.result.nInserted !== undefined) {
        const failedInBatch = docsToInsert.length - err.result.nInserted;
        this.failedCount += failedInBatch;
      }
    }
  }

  async updateProgressAndCheckCancel(forceUpdate = false) {
    const job = await Job.findOne({ jobId: this.jobId });
    if (!job) return;

    if (job.cancelRequested) {
      throw new Error('JOB_CANCELLED');
    }

    const totalHandled = this.processedCount + this.failedCount;
    const now = Date.now();

    // Throttled progress broadcast every 300ms
    if (forceUpdate || now - this.lastProgressEmit >= 300) {
      this.lastProgressEmit = now;

      const stats = calculateProgress({
        processedRows: totalHandled,
        fileSize: this.fileSize,
        bytesProcessed: this.bytesProcessed,
        startTime: this.startTime
      });

      job.processedRows = this.processedCount;
      job.failedRows = this.failedCount;
      job.rowsPerSecond = stats.rowsPerSecond;
      job.totalRows = totalHandled;
      
      if (this.fileSize > 0 && job.progress < stats.progress) {
        job.progress = stats.progress;
      }

      await job.save();

      broadcastJobProgress(this.jobId, {
        type: 'progress',
        jobId: this.jobId,
        status: job.status,
        processedRows: this.processedCount,
        failedRows: this.failedCount,
        rowsPerSecond: stats.rowsPerSecond,
        progress: job.progress
      });
    }
  }
}

export function createMongoBulkStream(config) {
  return new MongoBulkStream(config);
}
