/**
 * CLI Batch Operations
 *
 * Provides parallel batch processing for migration and validation operations.
 * Supports progress tracking, concurrency control, and comprehensive reporting.
 */


/**
 * Batch operation item
 */
export interface BatchItem<T = unknown> {
  id: string;
  path: string;
  data?: T;
}

/**
 * Batch operation result for a single item
 */
export interface BatchItemResult<T = unknown> {
  id: string;
  path: string;
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
}

/**
 * Batch operation summary
 */
export interface BatchSummary {
  totalItems: number;
  successful: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  averageDuration: number;
}

/**
 * Batch operation result
 */
export interface BatchResult<T = unknown> {
  results: BatchItemResult<T>[];
  summary: BatchSummary;
}

/**
 * Progress callback
 */
export type ProgressCallback = (
  current: number,
  total: number,
  item: BatchItem,
  status: 'pending' | 'processing' | 'success' | 'error' | 'skipped'
) => void;

/**
 * Batch operation options
 */
export interface BatchOptions {
  /** Maximum concurrent operations (default: 4) */
  concurrency?: number;
  /** Continue on error (default: true) */
  continueOnError?: boolean;
  /** Progress callback */
  onProgress?: ProgressCallback;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Retry failed items (default: 0) */
  retryCount?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
}

/**
 * Batch processor function type
 */
export type BatchProcessor<TInput = unknown, TOutput = unknown> = (
  item: BatchItem<TInput>,
  options?: Record<string, unknown>
) => Promise<TOutput>;

/**
 * Process items in batches with concurrency control
 */
export async function processBatch<TInput = unknown, TOutput = unknown>(
  items: BatchItem<TInput>[],
  processor: BatchProcessor<TInput, TOutput>,
  options: BatchOptions = {}
): Promise<BatchResult<TOutput>> {
  const {
    concurrency = 4,
    continueOnError = true,
    onProgress,
    signal,
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const results: BatchItemResult<TOutput>[] = [];
  const startTime = Date.now();

  let successful = 0;
  let failed = 0;
  let skipped = 0;

  // Create a queue of items to process
  const queue = [...items];
  const activePromises = new Map<string, Promise<void>>();

  // Process items with concurrency control
  const processItem = async (item: BatchItem<TInput>, attempt = 0): Promise<void> => {
    // Check for abort
    if (signal?.aborted) {
      skipped++;
      results.push({
        id: item.id,
        path: item.path,
        success: false,
        error: 'Operation aborted',
        duration: 0,
      });
      onProgress?.(results.length, items.length, item, 'skipped');
      return;
    }

    onProgress?.(results.length, items.length, item, 'processing');
    const itemStart = Date.now();

    try {
      const data = await processor(item);
      successful++;
      results.push({
        id: item.id,
        path: item.path,
        success: true,
        data,
        duration: Date.now() - itemStart,
      });
      onProgress?.(results.length, items.length, item, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Retry if configured
      if (attempt < retryCount) {
        await delay(retryDelay);
        return processItem(item, attempt + 1);
      }

      failed++;
      results.push({
        id: item.id,
        path: item.path,
        success: false,
        error: errorMessage,
        duration: Date.now() - itemStart,
      });
      onProgress?.(results.length, items.length, item, 'error');

      if (!continueOnError) {
        throw new Error(`Batch processing failed at item ${item.id}: ${errorMessage}`);
      }
    }
  };

  // Process queue with concurrency
  while (queue.length > 0 || activePromises.size > 0) {
    // Check for abort
    if (signal?.aborted) {
      // Skip remaining items
      for (const item of queue) {
        skipped++;
        results.push({
          id: item.id,
          path: item.path,
          success: false,
          error: 'Operation aborted',
          duration: 0,
        });
      }
      break;
    }

    // Start new items up to concurrency limit
    while (queue.length > 0 && activePromises.size < concurrency) {
      const item = queue.shift()!;
      const promise = processItem(item).finally(() => {
        activePromises.delete(item.id);
      });
      activePromises.set(item.id, promise);
    }

    // Wait for at least one to complete
    if (activePromises.size > 0) {
      await Promise.race(activePromises.values());
    }
  }

  const totalDuration = Date.now() - startTime;

  return {
    results,
    summary: {
      totalItems: items.length,
      successful,
      failed,
      skipped,
      totalDuration,
      averageDuration: results.length > 0
        ? totalDuration / results.length
        : 0,
    },
  };
}

/**
 * Create batch items from file paths
 */
export function createBatchItems(paths: string[]): BatchItem[] {
  return paths.map((path, index) => ({
    id: `item-${index}`,
    path,
  }));
}

/**
 * Filter batch results by status
 */
export function filterResults<T>(
  results: BatchItemResult<T>[],
  status: 'success' | 'failed' | 'all'
): BatchItemResult<T>[] {
  if (status === 'all') return results;
  if (status === 'success') return results.filter(r => r.success);
  return results.filter(r => !r.success);
}

/**
 * Format batch summary for display
 */
export function formatBatchSummary(summary: BatchSummary): string {
  const lines: string[] = [
    '═══════════════════════════════════════════',
    '          Batch Operation Summary          ',
    '═══════════════════════════════════════════',
    '',
    `Total items:      ${summary.totalItems}`,
    `Successful:       ${summary.successful} (${percentage(summary.successful, summary.totalItems)})`,
    `Failed:           ${summary.failed} (${percentage(summary.failed, summary.totalItems)})`,
    `Skipped:          ${summary.skipped} (${percentage(summary.skipped, summary.totalItems)})`,
    '',
    `Total duration:   ${formatDuration(summary.totalDuration)}`,
    `Average per item: ${formatDuration(summary.averageDuration)}`,
    '',
    '═══════════════════════════════════════════',
  ];

  return lines.join('\n');
}

/**
 * Format detailed results report
 */
export function formatDetailedResults<T>(
  results: BatchItemResult<T>[],
  options: { showSuccessful?: boolean; showFailed?: boolean } = {}
): string {
  const { showSuccessful = true, showFailed = true } = options;

  const lines: string[] = [];

  if (showFailed) {
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      lines.push('Failed Items:');
      for (const result of failed) {
        lines.push(`  ✗ ${result.path}`);
        if (result.error) {
          lines.push(`    Error: ${result.error}`);
        }
      }
      lines.push('');
    }
  }

  if (showSuccessful) {
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      lines.push('Successful Items:');
      for (const result of successful) {
        lines.push(`  ✓ ${result.path} (${formatDuration(result.duration)})`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Create a progress bar string
 */
export function createProgressBar(
  current: number,
  total: number,
  width: number = 40
): string {
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pct = Math.round(percentage * 100);

  return `[${bar}] ${pct}% (${current}/${total})`;
}

// Helper functions

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function percentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

/**
 * Batch migration options
 */
export interface BatchMigrateOptions {
  files: string[];
  targetVersion: string;
  outputDir?: string;
  createBackups?: boolean;
  concurrency?: number;
  continueOnError?: boolean;
  onProgress?: ProgressCallback;
}

/**
 * Batch validation options
 */
export interface BatchValidateOptions {
  files: string[];
  concurrency?: number;
  onProgress?: ProgressCallback;
}

/**
 * Run batch migration on multiple files
 */
export async function batchMigrate(options: BatchMigrateOptions): Promise<BatchResult> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const items = createBatchItems(options.files);

  return processBatch(
    items,
    async (item) => {
      const content = await fs.readFile(item.path, 'utf-8');
      const story = JSON.parse(content);

      // Create backup if requested
      if (options.createBackups !== false) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = path.extname(item.path);
        const base = path.basename(item.path, ext);
        const dir = path.dirname(item.path);
        const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);
        await fs.copyFile(item.path, backupPath);
      }

      // Update version
      story.version = options.targetVersion;
      story.metadata = {
        ...story.metadata,
        updatedAt: new Date().toISOString(),
        migratedAt: new Date().toISOString(),
      };

      // Write output
      const outputDir = options.outputDir || path.dirname(item.path);
      await fs.mkdir(outputDir, { recursive: true });

      const outputPath = options.outputDir
        ? path.join(outputDir, path.basename(item.path))
        : item.path;

      await fs.writeFile(outputPath, JSON.stringify(story, null, 2));

      return { migrated: true, outputPath };
    },
    {
      concurrency: options.concurrency ?? 4,
      continueOnError: options.continueOnError ?? true,
      onProgress: options.onProgress,
    }
  );
}

/**
 * Run batch validation on multiple files
 */
export async function batchValidate(options: BatchValidateOptions): Promise<BatchResult> {
  const fs = await import('fs/promises');

  const items = createBatchItems(options.files);

  return processBatch(
    items,
    async (item) => {
      const content = await fs.readFile(item.path, 'utf-8');
      const story = JSON.parse(content);

      const errors: string[] = [];

      // Basic validation
      if (!story.metadata?.title) {
        errors.push('Missing title in metadata');
      }

      if (!story.passages || !Array.isArray(story.passages)) {
        errors.push('Missing or invalid passages array');
      } else {
        // Validate passages
        const titles = new Set<string>();
        const ids = new Set<string>();

        for (let i = 0; i < story.passages.length; i++) {
          const passage = story.passages[i];

          if (!passage.id) {
            errors.push(`Passage ${i} missing ID`);
          } else if (ids.has(passage.id)) {
            errors.push(`Duplicate passage ID: ${passage.id}`);
          } else {
            ids.add(passage.id);
          }

          if (!passage.title) {
            errors.push(`Passage ${i} missing title`);
          } else if (titles.has(passage.title)) {
            errors.push(`Duplicate passage title: ${passage.title}`);
          } else {
            titles.add(passage.title);
          }

          if (passage.content === undefined) {
            errors.push(`Passage ${i} missing content`);
          }
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      return { valid: true, passageCount: story.passages?.length || 0 };
    },
    {
      concurrency: options.concurrency ?? 4,
      onProgress: options.onProgress,
    }
  );
}
