import { AppError, ERROR_CODES } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || ERROR_CODES.INTERNAL_ERROR;
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    details = Object.values(err.errors).map(e => e.message);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = ERROR_CODES.INVALID_MAPPING;
    message = `Invalid format for field ${err.path}`;
  }

  logger.error(`[${req.method} ${req.url}] ${code} - ${message}`, {
    statusCode,
    stack: config.nodeEnv === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}
