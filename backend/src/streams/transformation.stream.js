const { Transform } = require('stream');
const JavascriptSandbox = require('../sandbox/javascript-sandbox');
const logger = require('../utils/logger');

/**
 * TransformationStream runs custom isolated-vm scripts for row columns.
 * Properly manages isolated-vm lifecycle and disposes of it on finish/destruction.
 */
class TransformationStream extends Transform {
  /**
   * @param {string} jobId 
   * @param {Array<object>} transformations - Array of { field, code }
   * @param {object} options 
   */
  constructor(jobId, transformations, options = {}) {
    super({ objectMode: true, ...options });
    this.jobId = jobId;
    this.transformations = transformations || [];
    this.rowNumber = 0;
    this.pendingAsyncOps = [];

    // Instantiate isolated-vm manager for this stream
    this.sandbox = new JavascriptSandbox();

    // Precompile scripts to optimize row processing speed
    for (const transform of this.transformations) {
      const cacheKey = `${jobId}_${transform.field}`;
      this.sandbox.compile(cacheKey, transform.code);
    }
  }

  async _transform(row, encoding, callback) {
    this.rowNumber++;
    try {
      const transformedRow = { ...row };
      let hasError = false;
      let errorField = '';
      let errorMessage = '';

      for (const transform of this.transformations) {
        const { field } = transform;
        const cacheKey = `${this.jobId}_${field}`;
        const val = row[field];

        if (val !== undefined) {
          try {
            const transformedVal = this.sandbox.execute(cacheKey, val);
            transformedRow[field] = transformedVal;
          } catch (err) {
            hasError = true;
            errorField = field;
            errorMessage = err.message;
            break; // Stop running subsequent transformations for this row
          }
        }
      }

      if (hasError) {
        // Discard row and record failure
        this.trackRowFailure(row, errorField, errorMessage);
        callback();
      } else {
        // Push transformed row to next stream
        this.push(transformedRow);
        callback();
      }
    } catch (error) {
      logger.error({ error, row: this.rowNumber }, 'Unexpected error in transformation stream');
      this.trackRowFailure(row, 'global', error.message);
      callback();
    }
  }

  trackRowFailure(originalData, field, errorMessage) {
    const ErrorRecord = require('../models/error-record.model');
    const Job = require('../models/job.model');

    const jobUpdatePromise = Job.updateOne(
      { _id: this.jobId },
      { $inc: { failedRows: 1 } }
    ).catch(err => logger.error({ err, jobId: this.jobId }, 'Failed to increment job failedRows'));

    const errorRecordPromise = ErrorRecord.create({
      jobId: this.jobId,
      rowNumber: originalData._rowNumber || this.rowNumber,
      originalData,
      errorMessage: `Field '${field}' transformation failed: ${errorMessage}`,
      stage: 'transformation'
    }).catch(err => logger.error({ err, jobId: this.jobId }, 'Failed to write ErrorRecord'));

    this.pendingAsyncOps.push(Promise.all([jobUpdatePromise, errorRecordPromise]));
  }

  async _flush(callback) {
    try {
      if (this.pendingAsyncOps.length > 0) {
        await Promise.all(this.pendingAsyncOps);
      }
    } catch (error) {
      logger.error({ error }, 'Error flushing transformation stream async operations');
    } finally {
      // CRITICAL: dispose of isolate to avoid memory leaks
      this.sandbox.dispose();
      callback();
    }
  }

  _destroy(err, callback) {
    // Ensure cleanup is executed on early abort or cancellation
    this.sandbox.dispose();
    callback(err);
  }
}

module.exports = TransformationStream;
