import http from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { initWebSocketServer, closeWebSocketServer } from './services/websocket.service.js';
import { logger } from './utils/logger.js';
import { ensureDirectoryExists } from './utils/file.js';

// Ensure directories exist
ensureDirectoryExists(config.uploadDir);
ensureDirectoryExists(config.tempDir);
ensureDirectoryExists('./logs');

const server = http.createServer(app);

// Initialize WebSockets
initWebSocketServer(server);

async function startServer() {
  await connectDB();

  server.listen(config.port, () => {
    logger.info(`🚀 StreamWeaver Backend Server running on port ${config.port} (${config.nodeEnv})`);
    logger.info(`WebSocket endpoint active at ws://localhost:${config.port}${config.wsPath}`);
  });
}

// Graceful Shutdown Handler
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
  });

  closeWebSocketServer();
  await disconnectDB();

  logger.info('StreamWeaver shutdown complete cleanly.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.error('Failed to start server:', { error: err.message });
    process.exit(1);
  });
}

export { server, startServer };
