/**
 * Custom Error Class and Standardized Error Codes
 */

export const ERROR_CODES = {
  INVALID_FILE: 'INVALID_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  PIPELINE_NOT_FOUND: 'PIPELINE_NOT_FOUND',
  INVALID_MAPPING: 'INVALID_MAPPING',
  TRANSFORMATION_ERROR: 'TRANSFORMATION_ERROR',
  TRANSFORMATION_TIMEOUT: 'TRANSFORMATION_TIMEOUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MONGO_ERROR: 'MONGO_ERROR',
  JOB_CANCELLED: 'JOB_CANCELLED',
  JOB_ALREADY_RUNNING: 'JOB_ALREADY_RUNNING',
  CONCURRENCY_LIMIT_REACHED: 'CONCURRENCY_LIMIT_REACHED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
