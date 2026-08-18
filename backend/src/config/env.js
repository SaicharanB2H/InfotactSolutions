const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

function parseSize(sizeStr) {
  if (!sizeStr) return 10 * 1024 * 1024 * 1024; // 10GB default
  if (typeof sizeStr === 'number') return sizeStr;
  
  const match = String(sizeStr).trim().toUpperCase().match(/^(\d+)\s*(GB|MB|KB|B)?$/);
  if (!match) {
    const parsed = parseInt(sizeStr, 10);
    return isNaN(parsed) ? 10 * 1024 * 1024 * 1024 : parsed;
  }
  
  const val = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 'GB': return val * 1024 * 1024 * 1024;
    case 'MB': return val * 1024 * 1024;
    case 'KB': return val * 1024;
    default: return val;
  }
}

const config = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamweaver',
  BULK_BATCH_SIZE: parseInt(process.env.BULK_BATCH_SIZE, 10) || 5000,
  MAX_FILE_SIZE: parseSize(process.env.MAX_FILE_SIZE),
  SANDBOX_TIMEOUT_MS: parseInt(process.env.SANDBOX_TIMEOUT_MS, 10) || 100,
  PROGRESS_INTERVAL_MS: parseInt(process.env.PROGRESS_INTERVAL_MS, 10) || 1000,
  NODE_ENV: process.env.NODE_ENV || 'development'
};

module.exports = config;
