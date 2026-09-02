import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    logger.info(`MongoDB Connected successfully to: ${mongoose.connection.host || config.mongoUri}`);
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error event:', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error(`MongoDB initial connection failed: ${error.message}`);
    // Do not hard exit in dev test runs if database connection is managed by caller
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected cleanly');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', { error: error.message });
  }
}
