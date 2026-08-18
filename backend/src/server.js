const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { connectDatabase } = require('./config/database');
const logger = require('./utils/logger');
const { initWebSocketServer } = require('./websocket/progress.socket');

async function startServer() {
  // Connect to Database
  await connectDatabase();

  // Create HTTP Server
  const server = http.createServer(app);

  // Initialize WebSocket server attached to HTTP server
  initWebSocketServer(server);

  server.listen(config.PORT, () => {
    logger.info(`StreamWeaver backend running on port ${config.PORT} [${config.NODE_ENV}]`);
  });

  // Handle termination gracefully
  const gracefulShutdown = () => {
    logger.info('Shutting down server gracefully...');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

startServer().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
