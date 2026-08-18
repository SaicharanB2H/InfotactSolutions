const Job = require('../models/job.model');
const { sendProgress } = require('../websocket/progress.socket');
const config = require('../config/env');
const logger = require('../utils/logger');

// Active tracking loops: jobId (string) -> setInterval ID
const activeIntervals = new Map();

// Byte monitoring data: jobId (string) -> { bytesRead, totalBytes }
const activeByteStats = new Map();

/**
 * Initialize byte tracking stats for a job.
 * @param {string} jobId 
 * @param {number} totalBytes 
 */
function trackJobBytes(jobId, totalBytes) {
  activeByteStats.set(String(jobId), { bytesRead: 0, totalBytes });
}

/**
 * Increment the read bytes count for a job.
 * @param {string} jobId 
 * @param {number} bytes 
 */
function incrementJobBytes(jobId, bytes) {
  const stats = activeByteStats.get(String(jobId));
  if (stats) {
    stats.bytesRead += bytes;
  }
}

/**
 * Starts a background interval that updates Job speed and broadcasts WebSocket progress frames.
 * @param {string} jobId 
 */
function startProgressTracker(jobId) {
  const jobIdStr = String(jobId);
  if (activeIntervals.has(jobIdStr)) return;

  const intervalMs = config.PROGRESS_INTERVAL_MS || 1000;

  const intervalId = setInterval(async () => {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        clearInterval(intervalId);
        activeIntervals.delete(jobIdStr);
        activeByteStats.delete(jobIdStr);
        return;
      }

      // If job is finished, clear interval and emit final status
      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        clearInterval(intervalId);
        activeIntervals.delete(jobIdStr);
        activeByteStats.delete(jobIdStr);
        
        const elapsedMs = Date.now() - new Date(job.startedAt).getTime();
        sendProgress(jobIdStr, {
          jobId: jobIdStr,
          status: job.status,
          rowsProcessed: job.processedRows,
          rowsFailed: job.failedRows,
          rowsPerSecond: job.rowsPerSecond,
          percentage: 100,
          elapsedMs,
          estimatedRemainingMs: 0
        });
        return;
      }

      const elapsedMs = Date.now() - new Date(job.startedAt).getTime();
      const elapsedSeconds = elapsedMs / 1000;
      
      const totalProcessed = job.processedRows + job.failedRows;
      const rowsPerSecond = elapsedSeconds > 0 ? Math.round(totalProcessed / elapsedSeconds) : 0;

      // Update speed in database
      await Job.updateOne({ _id: jobId }, { $set: { rowsPerSecond } });

      let percentage = 0;
      let estimatedRemainingMs = 0;

      const bytesStats = activeByteStats.get(jobIdStr);
      if (bytesStats && bytesStats.totalBytes > 0) {
        const { bytesRead, totalBytes } = bytesStats;
        // Cap percentage at 99% until the job is explicitly transitioned to completed
        percentage = Math.min(Math.round((bytesRead / totalBytes) * 100), 99);

        if (percentage > 0) {
          const totalEstimatedTimeMs = elapsedMs / (bytesRead / totalBytes);
          estimatedRemainingMs = Math.max(Math.round(totalEstimatedTimeMs - elapsedMs), 0);
        }
      }

      // Emit progress frame via WebSocket
      sendProgress(jobIdStr, {
        jobId: jobIdStr,
        status: job.status,
        rowsProcessed: job.processedRows,
        rowsFailed: job.failedRows,
        rowsPerSecond,
        percentage,
        elapsedMs,
        estimatedRemainingMs
      });

    } catch (error) {
      logger.error({ error, jobId }, 'Error in progress tracker background interval');
    }
  }, intervalMs);

  activeIntervals.set(jobIdStr, intervalId);
}

/**
 * Stops progress tracking for a job and cleans up memory.
 * @param {string} jobId 
 */
function stopProgressTracker(jobId) {
  const jobIdStr = String(jobId);
  const intervalId = activeIntervals.get(jobIdStr);
  if (intervalId) {
    clearInterval(intervalId);
    activeIntervals.delete(jobIdStr);
  }
  activeByteStats.delete(jobIdStr);
}

module.exports = {
  trackJobBytes,
  incrementJobBytes,
  startProgressTracker,
  stopProgressTracker
};
