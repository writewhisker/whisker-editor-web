/**
 * Tests for CLI Batch Operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processBatch,
  createBatchItems,
  filterResults,
  formatBatchSummary,
  formatDetailedResults,
  createProgressBar,
  type BatchItem,
  type BatchItemResult,
  type BatchSummary,
  type BatchOptions,
} from './batchOperations.js';

describe('processBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process items successfully', async () => {
    const items: BatchItem[] = [
      { id: '1', path: '/path/a.json' },
      { id: '2', path: '/path/b.json' },
      { id: '3', path: '/path/c.json' },
    ];

    const processor = vi.fn().mockResolvedValue({ success: true });

    const result = await processBatch(items, processor);

    expect(result.summary.totalItems).toBe(3);
    expect(result.summary.successful).toBe(3);
    expect(result.summary.failed).toBe(0);
    expect(result.results.length).toBe(3);
    expect(processor).toHaveBeenCalledTimes(3);
  });

  it('should handle processor errors with continueOnError', async () => {
    const items: BatchItem[] = [
      { id: '1', path: '/path/a.json' },
      { id: '2', path: '/path/b.json' },
      { id: '3', path: '/path/c.json' },
    ];

    const processor = vi.fn()
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce({ success: true });

    const result = await processBatch(items, processor, { continueOnError: true });

    expect(result.summary.successful).toBe(2);
    expect(result.summary.failed).toBe(1);
    expect(result.results.find(r => r.id === '2')?.error).toBe('Failed');
  });

  it('should stop on error when continueOnError is false with sequential processing', async () => {
    const items: BatchItem[] = [
      { id: '1', path: '/path/a.json' },
      { id: '2', path: '/path/b.json' },
      { id: '3', path: '/path/c.json' },
    ];

    const processor = vi.fn()
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('Critical failure'));

    // With concurrency=1, errors are sequential and should propagate
    await expect(
      processBatch(items, processor, { continueOnError: false, concurrency: 1 })
    ).rejects.toThrow('Critical failure');
  });

  it('should respect concurrency limit', async () => {
    const items: BatchItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      path: `/path/${i}.json`,
    }));

    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const processor = vi.fn().mockImplementation(async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await new Promise(resolve => setTimeout(resolve, 10));
      currentConcurrent--;
      return { success: true };
    });

    await processBatch(items, processor, { concurrency: 2 });

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should call progress callback', async () => {
    const items: BatchItem[] = [
      { id: '1', path: '/path/a.json' },
      { id: '2', path: '/path/b.json' },
    ];

    const onProgress = vi.fn();
    const processor = vi.fn().mockResolvedValue({ success: true });

    await processBatch(items, processor, { onProgress });

    expect(onProgress).toHaveBeenCalled();
    // Should be called with processing and success for each item
    const processingCalls = onProgress.mock.calls.filter(c => c[3] === 'processing');
    const successCalls = onProgress.mock.calls.filter(c => c[3] === 'success');
    expect(processingCalls.length).toBe(2);
    expect(successCalls.length).toBe(2);
  });

  it('should support abort signal', async () => {
    const items: BatchItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      path: `/path/${i}.json`,
    }));

    const controller = new AbortController();
    let processedCount = 0;

    const processor = vi.fn().mockImplementation(async () => {
      processedCount++;
      if (processedCount === 2) {
        controller.abort();
      }
      await new Promise(resolve => setTimeout(resolve, 5));
      return { success: true };
    });

    const result = await processBatch(items, processor, {
      concurrency: 1,
      signal: controller.signal,
    });

    expect(result.summary.skipped).toBeGreaterThan(0);
    expect(result.results.some(r => r.error === 'Operation aborted')).toBe(true);
  });

  it('should retry failed items', async () => {
    const items: BatchItem[] = [
      { id: '1', path: '/path/a.json' },
    ];

    let attempts = 0;
    const processor = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return { success: true };
    });

    const result = await processBatch(items, processor, {
      retryCount: 3,
      retryDelay: 10,
    });

    expect(result.summary.successful).toBe(1);
    expect(attempts).toBe(3);
  });

  it('should track duration accurately', async () => {
    const items: BatchItem[] = [
      { id: '1', path: '/path/a.json' },
    ];

    const processor = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: true };
    });

    const result = await processBatch(items, processor);

    expect(result.results[0].duration).toBeGreaterThanOrEqual(40);
    expect(result.summary.totalDuration).toBeGreaterThanOrEqual(40);
  });

  it('should handle empty items array', async () => {
    const result = await processBatch([], vi.fn());

    expect(result.summary.totalItems).toBe(0);
    expect(result.summary.successful).toBe(0);
    expect(result.results.length).toBe(0);
  });

  it('should pass item data to processor', async () => {
    const items: BatchItem<{ value: number }>[] = [
      { id: '1', path: '/path/a.json', data: { value: 42 } },
    ];

    const processor = vi.fn().mockResolvedValue({ success: true });

    await processBatch(items, processor);

    expect(processor).toHaveBeenCalledWith(
      expect.objectContaining({ data: { value: 42 } })
    );
  });
});

describe('createBatchItems', () => {
  it('should create batch items from paths', () => {
    const paths = ['/path/a.json', '/path/b.json', '/path/c.json'];
    const items = createBatchItems(paths);

    expect(items.length).toBe(3);
    expect(items[0]).toEqual({ id: 'item-0', path: '/path/a.json' });
    expect(items[1]).toEqual({ id: 'item-1', path: '/path/b.json' });
    expect(items[2]).toEqual({ id: 'item-2', path: '/path/c.json' });
  });

  it('should handle empty array', () => {
    const items = createBatchItems([]);
    expect(items.length).toBe(0);
  });
});

describe('filterResults', () => {
  const results: BatchItemResult[] = [
    { id: '1', path: '/a', success: true, duration: 10 },
    { id: '2', path: '/b', success: false, error: 'Error', duration: 5 },
    { id: '3', path: '/c', success: true, duration: 15 },
  ];

  it('should filter successful results', () => {
    const filtered = filterResults(results, 'success');
    expect(filtered.length).toBe(2);
    expect(filtered.every(r => r.success)).toBe(true);
  });

  it('should filter failed results', () => {
    const filtered = filterResults(results, 'failed');
    expect(filtered.length).toBe(1);
    expect(filtered[0].error).toBe('Error');
  });

  it('should return all results', () => {
    const filtered = filterResults(results, 'all');
    expect(filtered.length).toBe(3);
  });
});

describe('formatBatchSummary', () => {
  it('should format summary correctly', () => {
    const summary: BatchSummary = {
      totalItems: 100,
      successful: 90,
      failed: 8,
      skipped: 2,
      totalDuration: 5000,
      averageDuration: 50,
    };

    const formatted = formatBatchSummary(summary);

    expect(formatted).toContain('Total items:      100');
    expect(formatted).toContain('Successful:       90 (90%)');
    expect(formatted).toContain('Failed:           8 (8%)');
    expect(formatted).toContain('Skipped:          2 (2%)');
    expect(formatted).toContain('Total duration:   5.0s');
    expect(formatted).toContain('Average per item: 50ms');
  });

  it('should handle zero items', () => {
    const summary: BatchSummary = {
      totalItems: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0,
      averageDuration: 0,
    };

    const formatted = formatBatchSummary(summary);

    expect(formatted).toContain('Total items:      0');
    expect(formatted).toContain('Successful:       0 (0%)');
  });

  it('should format minutes correctly', () => {
    const summary: BatchSummary = {
      totalItems: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
      totalDuration: 125000, // 2m 5s
      averageDuration: 125000,
    };

    const formatted = formatBatchSummary(summary);

    expect(formatted).toContain('2m');
  });
});

describe('formatDetailedResults', () => {
  const results: BatchItemResult[] = [
    { id: '1', path: '/path/success.json', success: true, duration: 100 },
    { id: '2', path: '/path/failed.json', success: false, error: 'Parse error', duration: 50 },
  ];

  it('should show failed items by default', () => {
    const formatted = formatDetailedResults(results, { showSuccessful: false });

    expect(formatted).toContain('Failed Items:');
    expect(formatted).toContain('/path/failed.json');
    expect(formatted).toContain('Parse error');
    expect(formatted).not.toContain('Successful Items:');
  });

  it('should show successful items when requested', () => {
    const formatted = formatDetailedResults(results, { showSuccessful: true });

    expect(formatted).toContain('Successful Items:');
    expect(formatted).toContain('/path/success.json');
    expect(formatted).toContain('100ms');
  });

  it('should show both when both options are true', () => {
    const formatted = formatDetailedResults(results, {
      showSuccessful: true,
      showFailed: true,
    });

    expect(formatted).toContain('Failed Items:');
    expect(formatted).toContain('Successful Items:');
  });

  it('should handle all successful results', () => {
    const successOnly: BatchItemResult[] = [
      { id: '1', path: '/a', success: true, duration: 10 },
    ];

    const formatted = formatDetailedResults(successOnly, { showFailed: true });

    expect(formatted).not.toContain('Failed Items:');
  });
});

describe('createProgressBar', () => {
  it('should create progress bar at 0%', () => {
    const bar = createProgressBar(0, 100, 10);
    expect(bar).toContain('░░░░░░░░░░');
    expect(bar).toContain('0%');
    expect(bar).toContain('(0/100)');
  });

  it('should create progress bar at 50%', () => {
    const bar = createProgressBar(50, 100, 10);
    expect(bar).toContain('█████░░░░░');
    expect(bar).toContain('50%');
    expect(bar).toContain('(50/100)');
  });

  it('should create progress bar at 100%', () => {
    const bar = createProgressBar(100, 100, 10);
    expect(bar).toContain('██████████');
    expect(bar).toContain('100%');
    expect(bar).toContain('(100/100)');
  });

  it('should handle zero total', () => {
    const bar = createProgressBar(0, 0, 10);
    expect(bar).toContain('░░░░░░░░░░');
    expect(bar).toContain('0%');
  });

  it('should respect custom width', () => {
    const bar = createProgressBar(5, 10, 20);
    expect(bar).toContain('██████████░░░░░░░░░░');
  });
});

describe('batch processor edge cases', () => {
  it('should handle processor returning non-object', async () => {
    const items: BatchItem[] = [{ id: '1', path: '/a' }];
    const processor = vi.fn().mockResolvedValue('string result');

    const result = await processBatch(items, processor);

    expect(result.summary.successful).toBe(1);
    expect(result.results[0].data).toBe('string result');
  });

  it('should handle processor returning undefined', async () => {
    const items: BatchItem[] = [{ id: '1', path: '/a' }];
    const processor = vi.fn().mockResolvedValue(undefined);

    const result = await processBatch(items, processor);

    expect(result.summary.successful).toBe(1);
    expect(result.results[0].data).toBeUndefined();
  });

  it('should handle non-Error throws', async () => {
    const items: BatchItem[] = [{ id: '1', path: '/a' }];
    const processor = vi.fn().mockRejectedValue('string error');

    const result = await processBatch(items, processor);

    expect(result.summary.failed).toBe(1);
    expect(result.results[0].error).toBe('string error');
  });

  it('should process large batches efficiently', async () => {
    const items = createBatchItems(
      Array.from({ length: 1000 }, (_, i) => `/path/${i}.json`)
    );

    const processor = vi.fn().mockResolvedValue({ success: true });

    const startTime = Date.now();
    const result = await processBatch(items, processor, { concurrency: 50 });
    const duration = Date.now() - startTime;

    expect(result.summary.totalItems).toBe(1000);
    expect(result.summary.successful).toBe(1000);
    // Should complete quickly with high concurrency
    expect(duration).toBeLessThan(1000);
  });
});
