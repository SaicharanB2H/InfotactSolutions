const logger = require('./logger');

function getMemoryUsage() {
  const memory = process.memoryUsage();
  return {
    rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
    raw: memory
  };
}

function logMemoryUsage(context = 'Global') {
  const mem = getMemoryUsage();
  logger.info(
    `[Memory - ${context}] RSS: ${mem.rss} | Heap Used: ${mem.heapUsed} | Heap Total: ${mem.heapTotal} | External: ${mem.external}`
  );
}

let monitorIntervalId = null;

function startMemoryMonitoring(intervalMs = 5000) {
  if (monitorIntervalId) return;
  monitorIntervalId = setInterval(() => {
    logMemoryUsage('Periodic');
  }, intervalMs);
  // Unref the timer so it doesn't keep the process alive
  monitorIntervalId.unref();
  logger.info(`Memory monitoring started (every ${intervalMs}ms)`);
}

function stopMemoryMonitoring() {
  if (monitorIntervalId) {
    clearInterval(monitorIntervalId);
    monitorIntervalId = null;
    logger.info('Memory monitoring stopped');
  }
}

module.exports = {
  getMemoryUsage,
  logMemoryUsage,
  startMemoryMonitoring,
  stopMemoryMonitoring
};
