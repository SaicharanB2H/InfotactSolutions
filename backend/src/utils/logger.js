const pino = require('pino');
const config = require('../config/env');

const isDev = config.NODE_ENV === 'development';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l'
        }
      }
    : undefined
});

module.exports = logger;
