import { Transform } from 'node:stream';
import { FailedRow } from '../models/FailedRow.js';
import { logger } from '../utils/logger.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a record against validation rules
 */
export function validateRecord(record, rules = {}) {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const val = record ? record[field] : undefined;

    // Required check
    if (rule.required && (val === undefined || val === null || val === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }

    if (val === undefined || val === null || val === '') {
      continue; // Skip optional empty field validation
    }

    // Type checks
    if (rule.type) {
      switch (rule.type) {
        case 'string':
          if (typeof val !== 'string') errors.push(`Field '${field}' must be a string`);
          break;
        case 'number':
          if (typeof val !== 'number' && isNaN(Number(val))) errors.push(`Field '${field}' must be a number`);
          break;
        case 'boolean':
          if (typeof val !== 'boolean' && val !== 'true' && val !== 'false') errors.push(`Field '${field}' must be a boolean`);
          break;
        case 'email':
          if (typeof val !== 'string' || !EMAIL_REGEX.test(val)) errors.push(`Field '${field}' must be a valid email`);
          break;
      }
    }

    // String length checks
    if (typeof val === 'string') {
      if (rule.minLength !== undefined && val.length < rule.minLength) {
        errors.push(`Field '${field}' length must be at least ${rule.minLength}`);
      }
      if (rule.maxLength !== undefined && val.length > rule.maxLength) {
        errors.push(`Field '${field}' length must not exceed ${rule.maxLength}`);
      }
      if (rule.regex) {
        const re = new RegExp(rule.regex);
        if (!re.test(val)) errors.push(`Field '${field}' does not match regex pattern`);
      }
    }

    // Numeric min/max checks
    if (typeof val === 'number' || !isNaN(Number(val))) {
      const num = Number(val);
      if (rule.min !== undefined && num < rule.min) {
        errors.push(`Field '${field}' must be >= ${rule.min}`);
      }
      if (rule.max !== undefined && num > rule.max) {
        errors.push(`Field '${field}' must be <= ${rule.max}`);
      }
    }
  }

  return errors;
}

/**
 * Validation Transform Stream
 */
export class StreamweaverValidation extends Transform {
  constructor({ jobId, validationRules = {}, failedRowBatchSize = 1000, options = {} }) {
    super({ objectMode: true, ...options });

    this.jobId = jobId;
    this.validationRules = validationRules || {};
    this.failedRowBatchSize = failedRowBatchSize;
    this.failedRowBuffer = [];
  }

  _transform(chunk, encoding, callback) {
    const { rowNumber, originalData, mappedData, transformError } = chunk;

    if (transformError) {
      this.handleFailedRow(rowNumber, originalData, transformError, callback);
      return;
    }

    const errors = validateRecord(mappedData, this.validationRules);

    if (errors.length > 0) {
      this.handleFailedRow(rowNumber, originalData, errors.join('; '), callback);
    } else {
      this.push({
        isValid: true,
        rowNumber,
        data: mappedData
      });
      callback();
    }
  }

  async handleFailedRow(rowNumber, originalData, errorMsg, callback) {
    this.failedRowBuffer.push({
      jobId: this.jobId,
      rowNumber,
      originalData,
      error: errorMsg
    });

    this.push({
      isValid: false,
      rowNumber,
      error: errorMsg
    });

    if (this.failedRowBuffer.length >= this.failedRowBatchSize) {
      await this.flushFailedRows();
    }

    callback();
  }

  async flushFailedRows() {
    if (this.failedRowBuffer.length === 0) return;
    const batch = [...this.failedRowBuffer];
    this.failedRowBuffer = [];
    try {
      await FailedRow.insertMany(batch, { ordered: false });
    } catch (err) {
      logger.error('Error inserting FailedRow batch to DB:', { error: err.message });
    }
  }

  async _flush(callback) {
    try {
      await this.flushFailedRows();
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

export function createValidationStream(config) {
  return new StreamweaverValidation(config);
}
