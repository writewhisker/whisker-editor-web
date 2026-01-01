/**
 * Export System Types
 *
 * Type definitions for the story export and publishing system.
 */

import type { Story, ValidationResult, QualityMetrics } from '@writewhisker/core-ts';

/**
 * Supported export formats
 */
export type ExportFormat = 'json' | 'whisker-core' | 'html' | 'html-standalone' | 'markdown' | 'package' | 'epub' | 'twine' | 'pdf' | 'wls';

/**
 * Export options configuration
 */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;

  /** Custom filename (without extension) */
  filename?: string;

  /** Include story metadata */
  includeMetadata?: boolean;

  /** Pretty-print JSON output */
  prettyPrint?: boolean;

  /** Include validation report */
  includeValidation?: boolean;

  /** Include quality metrics */
  includeMetrics?: boolean;

  /** Include test scenarios */
  includeTestScenarios?: boolean;

  /** Custom CSS for HTML export */
  customCSS?: string;

  /** Custom JavaScript for HTML export */
  customJS?: string;

  /** Minify HTML output */
  minifyHTML?: boolean;

  /** Theme for HTML export */
  theme?: 'light' | 'dark' | 'auto';

  /** Custom theme name for HTML export */
  customTheme?: string;

  /** Language code for HTML export */
  language?: string;

  /** Include source map for debugging */
  includeSourceMap?: boolean;

  /** whisker-core format version (1.0 or 2.0 or 2.1) */
  whiskerCoreVersion?: '1.0' | '2.0' | '2.1';

  /** Strip editor-specific extensions for whisker-core export */
  stripExtensions?: boolean;

  /** Asset processing mode: 'embed' (base64), 'bundle' (separate files), 'external' (keep URLs) */
  assetMode?: 'embed' | 'bundle' | 'external';

  /** Maximum asset size for embedding in bytes (default: 1MB) */
  maxEmbedSize?: number;

  /** Embed assets as base64 data URLs (shorthand for assetMode: 'embed') */
  embedAssets?: boolean;

  // PDF Export Options
  /** PDF page format */
  pdfFormat?: 'a4' | 'letter' | 'legal';

  /** PDF orientation */
  pdfOrientation?: 'portrait' | 'landscape';

  /** Include table of contents in PDF */
  pdfIncludeTOC?: boolean;

  /** Include story graph visualization in PDF */
  pdfIncludeGraph?: boolean;

  /** PDF export mode: 'playable' (interactive playthrough), 'manuscript' (printable text), 'outline' (structure view) */
  pdfMode?: 'playable' | 'manuscript' | 'outline';

  /** Font size for PDF (in points) */
  pdfFontSize?: number;

  /** Line height for PDF */
  pdfLineHeight?: number;

  /** Margin size for PDF (in mm) */
  pdfMargin?: number;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Export success status */
  success: boolean;

  /** Exported content (string, Blob, or Buffer for Node.js environments) */
  content?: string | Blob | Buffer;

  /** Export format used */
  format?: ExportFormat;

  /** Filename suggestion */
  filename?: string;

  /** MIME type */
  mimeType?: string;

  /** File size in bytes */
  size?: number;

  /** Export duration in milliseconds */
  duration?: number;

  /** Error message if export failed */
  error?: string;

  /** Warnings encountered during export */
  warnings?: string[];
}

/**
 * Export metadata included in exports
 */
export interface ExportMetadata {
  /** Export timestamp */
  exportDate: string;

  /** Editor version */
  editorVersion: string;

  /** Export format version */
  formatVersion: string;

  /** Story identifier */
  storyId?: string;

  /** Story title */
  storyTitle?: string;

  /** Story author */
  storyAuthor?: string;

  /** Validation status at time of export */
  validationStatus?: 'valid' | 'warnings' | 'errors';

  /** Export options used */
  exportOptions?: Partial<ExportOptions>;
}

/**
 * Package manifest for distributable packages
 */
export interface PackageManifest {
  /** Package name */
  name: string;

  /** Package version */
  version: string;

  /** Package description */
  description?: string;

  /** Author information */
  author?: string;

  /** License information */
  license?: string;

  /** Entry point file */
  main: string;

  /** Included files */
  files: string[];

  /** Creation timestamp */
  created: string;

  /** Package metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Export context passed to exporters
 */
export interface ExportContext {
  /** Story to export */
  story: Story;

  /** Export options */
  options: ExportOptions;

  /** Validation result (if available) */
  validation?: ValidationResult;

  /** Quality metrics (if available) */
  metrics?: QualityMetrics;

  /** Test scenarios (if available) */
  testScenarios?: unknown[];

  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Base exporter interface
 */
export interface IExporter {
  /** Exporter name */
  readonly name: string;

  /** Supported format */
  readonly format: ExportFormat;

  /** Default file extension */
  readonly extension: string;

  /** MIME type */
  readonly mimeType: string;

  /**
   * Export a story
   */
  export(context: ExportContext): Promise<ExportResult>;

  /**
   * Validate export options
   */
  validateOptions?(options: ExportOptions): string[];

  /**
   * Get estimated export size
   */
  estimateSize?(story: Story): number;
}

/**
 * Export history entry
 */
export interface ExportHistoryEntry {
  /** Export ID */
  id: string;

  /** Export timestamp */
  timestamp: number;

  /** Export format */
  format: ExportFormat;

  /** Story title */
  storyTitle: string;

  /** File size in bytes */
  size: number;

  /** Export success status */
  success: boolean;

  /** Error message if failed */
  error?: string;
}
