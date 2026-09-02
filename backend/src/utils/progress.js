/**
 * Helper utility for calculating ETL statistics
 */

export function calculateProgress({ processedRows, fileSize, bytesProcessed, startTime }) {
  const elapsedMs = Date.now() - (startTime || Date.now());
  const elapsedSec = Math.max(elapsedMs / 1000, 0.001);

  const rowsPerSecond = Math.round(processedRows / elapsedSec);

  let progressPercentage = 0;
  if (fileSize && bytesProcessed) {
    progressPercentage = Math.min(Math.round((bytesProcessed / fileSize) * 100), 100);
  }

  return {
    rowsPerSecond,
    progress: progressPercentage,
    elapsedSeconds: Math.round(elapsedSec)
  };
}
