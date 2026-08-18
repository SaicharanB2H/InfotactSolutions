const logger = require('../utils/logger');

function errorMiddleware(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log the full error stack in development, or just the error object
  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
      status
    },
    req: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip
    }
  }, 'Request failed');

  res.status(status).json({
    error: {
      message,
      status,
      // Only include stack trace in development mode
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

module.exports = errorMiddleware;
