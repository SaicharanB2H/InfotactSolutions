const WebSocket = require('ws');
const url = require('url');
const logger = require('../utils/logger');

// Map to store job connections: jobId -> Set of WebSocket clients
const activeConnections = new Map();

function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = url.parse(request.url);
    const pathname = parsedUrl.pathname;
    
    // Support matching MongoDB ObjectId (24 hex characters) or uuid/arbitrary job string
    const match = pathname.match(/^\/ws\/jobs\/([a-fA-F0-9]{24})$/) || pathname.match(/^\/ws\/jobs\/([a-zA-Z0-9\-_]+)$/);

    if (match) {
      const jobId = match[1];
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, jobId);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request, jobId) => {
    logger.info(`WebSocket client connected for Job: ${jobId}`);
    
    if (!activeConnections.has(jobId)) {
      activeConnections.set(jobId, new Set());
    }
    activeConnections.get(jobId).add(ws);

    // Send an initial handshake/connected message
    ws.send(JSON.stringify({ event: 'connected', jobId }));

    ws.on('close', () => {
      logger.info(`WebSocket client disconnected for Job: ${jobId}`);
      const connections = activeConnections.get(jobId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          activeConnections.delete(jobId);
        }
      }
    });

    ws.on('error', (err) => {
      logger.error({ err, jobId }, 'WebSocket client connection error');
    });
  });
}

/**
 * Broadcast progress details to all clients subscribed to a Job ID
 * @param {string} jobId 
 * @param {object} progressData 
 */
function sendProgress(jobId, progressData) {
  const connections = activeConnections.get(jobId);
  if (!connections || connections.size === 0) return;

  const message = JSON.stringify({ event: 'progress', ...progressData });
  for (const client of connections) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

module.exports = {
  initWebSocketServer,
  sendProgress
};
