const { Transform } = require('stream');
const logger = require('../utils/logger');

/**
 * ValidationStream validates fields of incoming objects based on a set of validation rules.
 * Fails individual rows gracefully by logging to ErrorRecord and updating Job statistics.
 */
class ValidationStream extends Transform {
  /**
   * @param {string} jobId 
   * @param {Array<object>} validationRules 
   * @param {object} options 
   */
  constructor(jobId, validationRules, options = {}) {
    super({ objectMode: true, ...options });
    this.jobId = jobId;
    this.rules = validationRules || [];
    this.rowNumber = 0;
    this.pendingAsyncOps = [];
  }

  async _transform(row, encoding, callback) {
    this.rowNumber++;
    try {
      const errors = [];
      const validatedRow = { ...row };

      for (const rule of this.rules) {
        const { field, required, type, min, max, regex } = rule;
        const value = row[field];

        // 1. Required check
        const isMissing = value === undefined || value === null || String(value).trim() === '';
        if (required && isMissing) {
          errors.push(`Field '${field}' is required but was empty`);
          continue;
        }

        // If field is empty and not required, skip type/regex validation
        if (isMissing) {
          continue;
        }

        // 2. Type validation and casting
        if (type === 'number') {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push(`Field '${field}' must be a number, got '${value}'`);
          } else {
            validatedRow[field] = num;
            if (min !== undefined && num < min) {
              errors.push(`Field '${field}' value ${num} is less than minimum ${min}`);
            }
            if (max !== undefined && num > max) {
              errors.push(`Field '${field}' value ${num} is greater than maximum ${max}`);
            }
          }
        } else if (type === 'boolean') {
          const strVal = String(value).toLowerCase().trim();
          if (strVal === 'true' || strVal === '1' || strVal === 'yes') {
            validatedRow[field] = true;
          } else if (strVal === 'false' || strVal === '0' || strVal === 'no') {
            validatedRow[field] = false;
          } else {
            errors.push(`Field '${field}' must be a boolean (true/false/1/0), got '${value}'`);
          }
        } else if (type === 'date') {
          const timestamp = Date.parse(value);
          if (isNaN(timestamp)) {
            errors.push(`Field '${field}' must be a valid date, got '${value}'`);
          } else {
            validatedRow[field] = new Date(timestamp);
          }
        } else if (type === 'string') {
          const str = String(value);
          validatedRow[field] = str;
          if (min !== undefined && str.length < min) {
            errors.push(`Field '${field}' length ${str.length} is less than minimum length ${min}`);
          }
          if (max !== undefined && str.length > max) {
            errors.push(`Field '${field}' length ${str.length} is greater than maximum length ${max}`);
          }
          if (regex) {
            try {
              const rx = new RegExp(regex);
              if (!rx.test(str)) {
                errors.push(`Field '${field}' value does not match regex '${regex}'`);
              }
            } catch (err) {
              logger.warn({ err, regex }, 'Invalid regex configuration in validation rule');
            }
          }
        }
      }

      if (errors.length > 0) {
        // Row failed validation. Log to DB and do not push row down the stream
        const errorMessage = errors.join('; ');
        this.trackRowFailure(row, errorMessage);
        callback();
      } else {
        // Valid row, push it to next stream in the pipeline
        this.push(validatedRow);
        callback();
      }
    } catch (error) {
      // Catch any unexpected validation errors
      logger.error({ error, row: this.rowNumber }, 'Unexpected error in validation stream');
      this.trackRowFailure(row, `Unexpected validation error: ${error.message}`);
      callback();
    }
  }

  /**
   * Log the failed row and update the Job metrics in the background.
   */
  trackRowFailure(originalData, errorMessage) {
    // Dynamic import to avoid circular dependencies
    const ErrorRecord = require('../models/error-record.model');
    const Job = require('../models/job.model');

    const jobUpdatePromise = Job.updateOne(
      { _id: this.jobId },
      { $inc: { failedRows: 1 } }
    ).catch(err => logger.error({ err, jobId: this.jobId }, 'Failed to increment job failedRows'));

    const errorRecordPromise = ErrorRecord.create({
      jobId: this.jobId,
      rowNumber: this.rowNumber,
      originalData,
      errorMessage,
      stage: 'validation'
    }).catch(err => logger.error({ err, jobId: this.jobId }, 'Failed to create validation ErrorRecord'));

    this.pendingAsyncOps.push(Promise.all([jobUpdatePromise, errorRecordPromise]));
  }

  async _flush(callback) {
    try {
      // Ensure all background database writes complete before flushing/closing the stream
      if (this.pendingAsyncOps.length > 0) {
        await Promise.all(this.pendingAsyncOps);
      }
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = ValidationStream;
