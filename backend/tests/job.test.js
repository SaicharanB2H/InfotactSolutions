import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProgress } from '../src/utils/progress.js';

test('Job & Progress Metrics', async (t) => {
  await t.test('calculates rows per second and progress percentage correctly', () => {
    const startTime = Date.now() - 2000; // 2 seconds ago
    const stats = calculateProgress({
      processedRows: 10000,
      fileSize: 1000000,
      bytesProcessed: 500000,
      startTime
    });

    assert.ok(stats.rowsPerSecond > 0);
    assert.equal(stats.progress, 50);
  });
});
