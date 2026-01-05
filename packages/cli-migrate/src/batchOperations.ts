/**
 * CLI Batch Operations
 *
 * Provides parallel batch processing for migration and validation operations.
 * Supports progress tracking, concurrency control, and comprehensive reporting.
 *
 * Features:
 * - Glob pattern file selection
 * - Batch conversion with format selection
 * - Multiple output formats (JSON, text, SARIF)
 * - Concurrency control and progress tracking
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

// ============================================================================
// Glob Pattern File Selection
// ============================================================================

/**
 * Glob pattern options
 */
export interface GlobOptions {
  /** Base directory to search from */
  cwd?: string;
  /** Include pattern(s) */
  include?: string | string[];
  /** Exclude pattern(s) */
  exclude?: string | string[];
  /** Follow symbolic links */
  followSymlinks?: boolean;
  /** Include directories in results */
  includeDirectories?: boolean;
}

/**
 * Match files using glob patterns
 * Uses minimatch-style patterns
 */
export async function globFiles(
  patterns: string | string[],
  options: GlobOptions = {}
): Promise<string[]> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const {
    cwd = process.cwd(),
    exclude = [],
    followSymlinks = true,
    includeDirectories = false,
  } = options;

  const patternList = Array.isArray(patterns) ? patterns : [patterns];
  const excludeList = Array.isArray(exclude) ? exclude : [exclude];
  const results: string[] = [];
  const seen = new Set<string>();

  // Simple glob pattern matching
  const matchPattern = (filePath: string, pattern: string): boolean => {
    // Convert glob pattern to regex
    let regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*');

    // Handle patterns starting with **/
    if (pattern.startsWith('**/')) {
      regex = '(.*/)?' + regex.substring(4);
    }

    return new RegExp(`^${regex}$`).test(filePath);
  };

  // Recursively walk directory
  const walkDir = async (dir: string, relativeBase = ''): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(relativeBase, entry.name);

      // Check if symlink and handle accordingly
      let stats = entry;
      if (entry.isSymbolicLink() && followSymlinks) {
        try {
          const realStats = await fs.stat(fullPath);
          stats = {
            ...entry,
            isDirectory: () => realStats.isDirectory(),
            isFile: () => realStats.isFile(),
          } as typeof entry;
        } catch {
          continue; // Skip broken symlinks
        }
      }

      // Check exclusions
      const isExcluded = excludeList.some(p => matchPattern(relativePath, p));
      if (isExcluded) continue;

      if (stats.isDirectory()) {
        if (includeDirectories) {
          for (const pattern of patternList) {
            if (matchPattern(relativePath, pattern) && !seen.has(fullPath)) {
              seen.add(fullPath);
              results.push(fullPath);
            }
          }
        }
        await walkDir(fullPath, relativePath);
      } else if (stats.isFile()) {
        for (const pattern of patternList) {
          if (matchPattern(relativePath, pattern) && !seen.has(fullPath)) {
            seen.add(fullPath);
            results.push(fullPath);
          }
        }
      }
    }
  };

  await walkDir(cwd);
  return results.sort();
}

// ============================================================================
// SARIF Output Format
// ============================================================================

/**
 * SARIF (Static Analysis Results Interchange Format) result
 */
export interface SarifResult {
  version: '2.1.0';
  $schema: string;
  runs: SarifRun[];
}

/**
 * SARIF run
 */
export interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri?: string;
      rules?: SarifRule[];
    };
  };
  results: SarifResultItem[];
  invocations?: SarifInvocation[];
}

/**
 * SARIF rule
 */
export interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription?: { text: string };
  helpUri?: string;
  defaultConfiguration?: {
    level: 'none' | 'note' | 'warning' | 'error';
  };
}

/**
 * SARIF result item
 */
export interface SarifResultItem {
  ruleId: string;
  level: 'none' | 'note' | 'warning' | 'error';
  message: { text: string };
  locations?: Array<{
    physicalLocation: {
      artifactLocation: {
        uri: string;
        uriBaseId?: string;
      };
      region?: {
        startLine?: number;
        startColumn?: number;
        endLine?: number;
        endColumn?: number;
      };
    };
  }>;
}

/**
 * SARIF invocation
 */
export interface SarifInvocation {
  executionSuccessful: boolean;
  startTimeUtc?: string;
  endTimeUtc?: string;
  exitCode?: number;
}

/**
 * Convert batch results to SARIF format
 */
export function toSarif<T>(
  results: BatchResult<T>,
  options: {
    toolName: string;
    toolVersion: string;
    toolUri?: string;
    ruleId?: string;
    ruleName?: string;
  }
): SarifResult {
  const {
    toolName,
    toolVersion,
    toolUri,
    ruleId = 'batch-operation',
    ruleName = 'Batch Operation Result',
  } = options;

  const sarifResults: SarifResultItem[] = [];

  for (const result of results.results) {
    sarifResults.push({
      ruleId,
      level: result.success ? 'none' : 'error',
      message: {
        text: result.success
          ? `Successfully processed: ${result.path}`
          : `Failed: ${result.error || 'Unknown error'}`,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: result.path,
            },
          },
        },
      ],
    });
  }

  return {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: toolName,
            version: toolVersion,
            informationUri: toolUri,
            rules: [
              {
                id: ruleId,
                name: ruleName,
                shortDescription: { text: ruleName },
                defaultConfiguration: { level: 'error' },
              },
            ],
          },
        },
        results: sarifResults,
        invocations: [
          {
            executionSuccessful: results.summary.failed === 0,
            exitCode: results.summary.failed > 0 ? 1 : 0,
          },
        ],
      },
    ],
  };
}

/**
 * Format batch results as SARIF JSON
 */
export function formatAsSarif<T>(
  results: BatchResult<T>,
  options: {
    toolName: string;
    toolVersion: string;
    toolUri?: string;
  }
): string {
  const sarif = toSarif(results, options);
  return JSON.stringify(sarif, null, 2);
}

// ============================================================================
// Batch Conversion
// ============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'html' | 'json' | 'markdown' | 'ink' | 'text' | 'pdf' | 'epub';

/**
 * Batch conversion options
 */
export interface BatchConvertOptions {
  /** Files to convert (paths or glob patterns) */
  files: string[];
  /** Use glob patterns for file selection */
  useGlob?: boolean;
  /** Glob options */
  globOptions?: GlobOptions;
  /** Target format */
  format: ExportFormat;
  /** Output directory */
  outputDir: string;
  /** Concurrency level */
  concurrency?: number;
  /** Continue on error */
  continueOnError?: boolean;
  /** Progress callback */
  onProgress?: ProgressCallback;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Conversion result
 */
export interface ConversionResult {
  inputPath: string;
  outputPath: string;
  format: ExportFormat;
  size: number;
}

/**
 * Run batch conversion on multiple files
 */
export async function batchConvert(options: BatchConvertOptions): Promise<BatchResult<ConversionResult>> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Resolve files (use glob if enabled)
  let filePaths: string[];
  if (options.useGlob) {
    filePaths = await globFiles(options.files, options.globOptions);
  } else {
    filePaths = options.files;
  }

  const items = createBatchItems(filePaths);

  return processBatch<unknown, ConversionResult>(
    items,
    async (item) => {
      const content = await fs.readFile(item.path, 'utf-8');
      const story = JSON.parse(content);

      // Generate output filename
      const baseName = path.basename(item.path, path.extname(item.path));
      const extension = getExtensionForFormat(options.format);
      const outputPath = path.join(options.outputDir, `${baseName}${extension}`);

      // Convert content based on format
      let outputContent: string;
      switch (options.format) {
        case 'json':
          outputContent = JSON.stringify(story, null, 2);
          break;
        case 'markdown':
          outputContent = convertToMarkdown(story);
          break;
        case 'text':
          outputContent = convertToPlainText(story);
          break;
        case 'html':
          outputContent = convertToHtml(story);
          break;
        case 'ink':
          outputContent = convertToInk(story);
          break;
        default:
          outputContent = JSON.stringify(story, null, 2);
      }

      // Ensure output directory exists
      await fs.mkdir(options.outputDir, { recursive: true });

      // Write output
      await fs.writeFile(outputPath, outputContent);

      return {
        inputPath: item.path,
        outputPath,
        format: options.format,
        size: outputContent.length,
      };
    },
    {
      concurrency: options.concurrency ?? 4,
      continueOnError: options.continueOnError ?? true,
      onProgress: options.onProgress,
      signal: options.signal,
    }
  );
}

/**
 * Get file extension for format
 */
function getExtensionForFormat(format: ExportFormat): string {
  switch (format) {
    case 'html': return '.html';
    case 'json': return '.json';
    case 'markdown': return '.md';
    case 'ink': return '.ink';
    case 'text': return '.txt';
    case 'pdf': return '.pdf';
    case 'epub': return '.epub';
    default: return '.json';
  }
}

/**
 * Convert story to Markdown format
 */
function convertToMarkdown(story: any): string {
  const lines: string[] = [];

  // Title and metadata
  lines.push(`# ${story.metadata?.title || 'Untitled Story'}`);
  lines.push('');
  if (story.metadata?.author) {
    lines.push(`*By ${story.metadata.author}*`);
    lines.push('');
  }
  if (story.metadata?.description) {
    lines.push(story.metadata.description);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Passages
  const passages = story.passages || [];
  for (const passage of passages) {
    lines.push(`## ${passage.title || 'Unnamed Passage'}`);
    lines.push('');
    if (passage.content) {
      lines.push(passage.content);
      lines.push('');
    }
    if (passage.choices && passage.choices.length > 0) {
      for (const choice of passage.choices) {
        lines.push(`- **${choice.text}** → ${choice.target || 'END'}`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Convert story to plain text format
 */
function convertToPlainText(story: any): string {
  const lines: string[] = [];

  // Title
  lines.push(story.metadata?.title || 'Untitled Story');
  lines.push('='.repeat(40));
  lines.push('');

  if (story.metadata?.author) {
    lines.push(`By ${story.metadata.author}`);
    lines.push('');
  }

  // Passages
  const passages = story.passages || [];
  for (const passage of passages) {
    lines.push(`[${passage.title || 'Unnamed'}]`);
    lines.push('-'.repeat(20));
    if (passage.content) {
      lines.push(passage.content);
    }
    if (passage.choices && passage.choices.length > 0) {
      lines.push('');
      lines.push('Choices:');
      for (let i = 0; i < passage.choices.length; i++) {
        lines.push(`  ${i + 1}. ${passage.choices[i].text}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Convert story to HTML format
 */
function convertToHtml(story: any): string {
  const title = story.metadata?.title || 'Untitled Story';
  const author = story.metadata?.author || '';

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { border-bottom: 2px solid #333; }
    .passage { margin: 2rem 0; padding: 1rem; background: #f9f9f9; border-radius: 4px; }
    .passage-title { color: #333; margin-bottom: 0.5rem; }
    .choices { list-style-type: none; padding: 0; }
    .choices li { padding: 0.5rem; margin: 0.25rem 0; background: #e9e9e9; border-radius: 4px; }
    .choice-target { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${author ? `<p><em>By ${escapeHtml(author)}</em></p>` : ''}
`;

  const passages = story.passages || [];
  for (const passage of passages) {
    html += `
  <div class="passage" id="${escapeHtml(passage.id || passage.title)}">
    <h2 class="passage-title">${escapeHtml(passage.title || 'Unnamed')}</h2>
    <p>${escapeHtml(passage.content || '')}</p>`;

    if (passage.choices && passage.choices.length > 0) {
      html += '\n    <ul class="choices">';
      for (const choice of passage.choices) {
        html += `\n      <li>${escapeHtml(choice.text)} <span class="choice-target">→ ${escapeHtml(choice.target || 'END')}</span></li>`;
      }
      html += '\n    </ul>';
    }

    html += '\n  </div>';
  }

  html += '\n</body>\n</html>';
  return html;
}

/**
 * Convert story to Ink format
 */
function convertToInk(story: any): string {
  const lines: string[] = [];

  // Header
  lines.push(`// ${story.metadata?.title || 'Untitled Story'}`);
  if (story.metadata?.author) {
    lines.push(`// by ${story.metadata.author}`);
  }
  lines.push(`// Exported from Whisker`);
  lines.push('');

  // Variables
  if (story.variables) {
    for (const [name, variable] of Object.entries(story.variables as Record<string, any>)) {
      const value = typeof variable.initial === 'string'
        ? `"${variable.initial}"`
        : String(variable.initial);
      lines.push(`VAR ${name} = ${value}`);
    }
    lines.push('');
  }

  // Passages as knots
  const passages = story.passages || [];
  for (const passage of passages) {
    const knotName = (passage.title || 'unnamed')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1');

    lines.push(`=== ${knotName} ===`);

    if (passage.content) {
      lines.push(passage.content);
    }

    if (passage.choices && passage.choices.length > 0) {
      for (const choice of passage.choices) {
        const target = choice.target
          ? (choice.target.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1'))
          : 'END';
        lines.push(`* [${choice.text}]`);
        lines.push(`    -> ${target}`);
      }
    } else {
      lines.push('-> END');
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// CLI Progress Display
// ============================================================================

/**
 * Spinner frames for CLI animation
 */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * CLI Spinner for progress indication
 */
export class CLISpinner {
  private frameIndex = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private message = '';
  private stream: NodeJS.WriteStream;

  constructor(stream: NodeJS.WriteStream = process.stderr) {
    this.stream = stream;
  }

  /**
   * Start the spinner with a message
   */
  start(message: string): void {
    this.message = message;
    this.frameIndex = 0;

    if (this.intervalId) {
      this.stop();
    }

    this.render();
    this.intervalId = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
      this.render();
    }, 80);
  }

  /**
   * Update the spinner message
   */
  update(message: string): void {
    this.message = message;
    this.render();
  }

  /**
   * Stop the spinner
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Clear the line
    this.stream.write('\r' + ' '.repeat(this.message.length + 10) + '\r');
  }

  /**
   * Stop with a success message
   */
  succeed(message?: string): void {
    this.stop();
    this.stream.write(`✓ ${message || this.message}\n`);
  }

  /**
   * Stop with a failure message
   */
  fail(message?: string): void {
    this.stop();
    this.stream.write(`✗ ${message || this.message}\n`);
  }

  /**
   * Stop with an info message
   */
  info(message?: string): void {
    this.stop();
    this.stream.write(`ℹ ${message || this.message}\n`);
  }

  private render(): void {
    const frame = SPINNER_FRAMES[this.frameIndex];
    this.stream.write(`\r${frame} ${this.message}`);
  }
}

/**
 * Create a CLI progress display
 */
export function createProgressDisplay(options: {
  total: number;
  width?: number;
  showPercentage?: boolean;
  showCount?: boolean;
  showETA?: boolean;
  stream?: NodeJS.WriteStream;
}): {
  update: (current: number, message?: string) => void;
  finish: (message?: string) => void;
} {
  const {
    total,
    width = 40,
    showPercentage = true,
    showCount = true,
    showETA = true,
    stream = process.stderr,
  } = options;

  const startTime = Date.now();
  let lastUpdate = 0;

  const update = (current: number, message?: string): void => {
    // Throttle updates to avoid flicker
    const now = Date.now();
    if (now - lastUpdate < 100 && current < total) {
      return;
    }
    lastUpdate = now;

    const percentage = total > 0 ? current / total : 0;
    const filled = Math.round(percentage * width);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    let status = `[${bar}]`;

    if (showPercentage) {
      status += ` ${Math.round(percentage * 100)}%`;
    }

    if (showCount) {
      status += ` (${current}/${total})`;
    }

    if (showETA && current > 0 && current < total) {
      const elapsed = now - startTime;
      const rate = current / elapsed;
      const remaining = (total - current) / rate;
      status += ` ETA: ${formatDuration(remaining)}`;
    }

    if (message) {
      status += ` ${message}`;
    }

    stream.write(`\r${status}`);
  };

  const finish = (message?: string): void => {
    const elapsed = Date.now() - startTime;
    stream.write(`\r${' '.repeat(width + 50)}\r`);
    if (message) {
      stream.write(`${message} (${formatDuration(elapsed)})\n`);
    }
  };

  return { update, finish };
}

// ============================================================================
// Exit Codes
// ============================================================================

/**
 * Standard CLI exit codes
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  MISUSE: 2,
  CANNOT_EXECUTE: 126,
  NOT_FOUND: 127,
  INVALID_ARGUMENT: 128,
  // Custom exit codes (64-113)
  VALIDATION_ERROR: 65,
  NO_INPUT: 66,
  IO_ERROR: 74,
  PARTIAL_SUCCESS: 75,
  MIGRATION_ERROR: 80,
  CONVERSION_ERROR: 81,
} as const;

export type ExitCode = typeof EXIT_CODES[keyof typeof EXIT_CODES];

/**
 * Get exit code for batch result
 */
export function getExitCodeForBatch<T>(result: BatchResult<T>): ExitCode {
  if (result.summary.failed === 0 && result.summary.skipped === 0) {
    return EXIT_CODES.SUCCESS;
  }
  if (result.summary.successful > 0 && result.summary.failed > 0) {
    return EXIT_CODES.PARTIAL_SUCCESS;
  }
  if (result.summary.failed === result.summary.totalItems) {
    return EXIT_CODES.GENERAL_ERROR;
  }
  return EXIT_CODES.PARTIAL_SUCCESS;
}

/**
 * Exit the process with appropriate code
 */
export function exitWithCode(code: ExitCode, message?: string): never {
  if (message) {
    if (code === EXIT_CODES.SUCCESS) {
      console.log(message);
    } else {
      console.error(message);
    }
  }
  process.exit(code);
}

/**
 * Create a CLI runner with proper exit handling
 */
export async function runCLI<T>(
  operation: () => Promise<BatchResult<T>>,
  options: {
    successMessage?: string;
    failureMessage?: string;
    showProgress?: boolean;
    onProgress?: ProgressCallback;
  } = {}
): Promise<never> {
  const { successMessage, failureMessage, showProgress = true } = options;

  try {
    const result = await operation();
    const exitCode = getExitCodeForBatch(result);

    if (exitCode === EXIT_CODES.SUCCESS) {
      exitWithCode(exitCode, successMessage || `✓ All ${result.summary.totalItems} items processed successfully`);
    } else if (exitCode === EXIT_CODES.PARTIAL_SUCCESS) {
      exitWithCode(exitCode, `⚠ Partial success: ${result.summary.successful} succeeded, ${result.summary.failed} failed`);
    } else {
      exitWithCode(exitCode, failureMessage || `✗ All ${result.summary.failed} items failed`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    exitWithCode(EXIT_CODES.GENERAL_ERROR, `✗ Error: ${message}`);
  }
}

// ============================================================================
// Output Formats
// ============================================================================

/**
 * Output format type
 */
export type OutputFormat = 'json' | 'text' | 'sarif';

/**
 * Format options
 */
export interface FormatOptions {
  /** Output format */
  format: OutputFormat;
  /** Tool name (for SARIF) */
  toolName?: string;
  /** Tool version (for SARIF) */
  toolVersion?: string;
  /** Pretty print JSON */
  pretty?: boolean;
}

/**
 * Format batch results according to specified format
 */
export function formatResults<T>(
  results: BatchResult<T>,
  options: FormatOptions
): string {
  switch (options.format) {
    case 'json':
      return options.pretty !== false
        ? JSON.stringify(results, null, 2)
        : JSON.stringify(results);

    case 'sarif':
      return formatAsSarif(results, {
        toolName: options.toolName || 'whisker-cli',
        toolVersion: options.toolVersion || '1.0.0',
      });

    case 'text':
    default:
      return formatBatchSummary(results.summary) + '\n' +
        formatDetailedResults(results.results);
  }
}
