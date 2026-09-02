import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/streamweaver',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  tempDir: path.resolve(process.env.TEMP_DIR || './temp'),
  maxFileSizeGb: parseFloat(process.env.MAX_FILE_SIZE_GB || '10'),
  maxFileSizeBytes: parseFloat(process.env.MAX_FILE_SIZE_GB || '10') * 1024 * 1024 * 1024,
  wsPath: process.env.WS_PATH || '/ws',
  sandboxTimeoutMs: parseInt(process.env.SANDBOX_TIMEOUT_MS || '100', 10),
  sandboxMemoryMb: parseInt(process.env.SANDBOX_MEMORY_MB || '32', 10),
  batchSize: parseInt(process.env.BATCH_SIZE || '5000', 10),
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '2', 10),
  nodeEnv: process.env.NODE_ENV || 'development'
};
