/**
 * Simple structured logger utility for StreamWeaver
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
};

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaString}`;
}

export const logger = {
  info(message, meta = {}) {
    console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
  },
  warn(message, meta = {}) {
    console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
  },
  error(message, meta = {}) {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
  },
  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }
};
