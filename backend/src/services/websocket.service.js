import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

// Registry of connected WebSocket clients per jobId
// Map<jobId, Set<WebSocket>>
const jobSockets = new Map();

let wss = null;

/**
 * Initialize WebSocket Server attached to Express HTTP server
 */
export function initWebSocketServer(server) {
  wss = new WebSocketServer({ 
    noServer: true
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;

    // Handle paths like /ws/jobs/:jobId or /ws?jobId=:jobId
    if (pathname.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathnameParts = url.pathname.split('/');
    
    // Extract jobId from path /ws/jobs/:jobId or query ?jobId=...
    let jobId = url.searchParams.get('jobId');
    if (!jobId && pathnameParts.length >= 4 && pathnameParts[1] === 'ws' && pathnameParts[2] === 'jobs') {
      jobId = pathnameParts[3];
    }

    if (!jobId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing jobId parameter' }));
      ws.close(1008, 'Missing jobId');
      return;
    }

    if (!jobSockets.has(jobId)) {
      jobSockets.set(jobId, new Set());
    }
    jobSockets.get(jobId).add(ws);

    logger.info(`WebSocket client connected for jobId: ${jobId}`);

    ws.send(JSON.stringify({
      type: 'connected',
      jobId,
      message: `Subscribed to real-time progress for job ${jobId}`
    }));

    ws.on('close', () => {
      if (jobSockets.has(jobId)) {
        jobSockets.get(jobId).delete(ws);
        if (jobSockets.get(jobId).size === 0) {
          jobSockets.delete(jobId);
        }
      }
      logger.info(`WebSocket client disconnected from jobId: ${jobId}`);
    });

    ws.on('error', (err) => {
      logger.error(`WebSocket error for jobId ${jobId}:`, { error: err.message });
    });
  });

  logger.info(`WebSocket server initialized on path ${config.wsPath}`);
}

/**
 * Broadcast event payload to all clients listening to a jobId
 */
export function broadcastJobProgress(jobId, data) {
  const clients = jobSockets.get(jobId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Close all active WebSockets on server shutdown
 */
export function closeWebSocketServer() {
  if (wss) {
    for (const [, clients] of jobSockets.entries()) {
      for (const ws of clients) {
        ws.close(1001, 'Server shutting down');
      }
    }
    jobSockets.clear();
    wss.close();
  }
}
