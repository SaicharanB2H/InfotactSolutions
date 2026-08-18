const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

async function connectDatabase() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI, {
      autoIndex: true
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to MongoDB');
    process.exit(1);
  }
}

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB connection error');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

module.exports = {
  connectDatabase,
  connection: mongoose.connection
};
