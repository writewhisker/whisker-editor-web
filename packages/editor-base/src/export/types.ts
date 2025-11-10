/**
 * Export System Types
 *
 * Type definitions for the story export and publishing system.
 */

import type { Story, ValidationResult, QualityMetrics } from '@whisker/core-ts';

/**
 * Supported export formats
 */
export type ExportFormat = 'json' | 'whisker-core' | 'html' | 'html-standalone' | 'markdown' | 'package' | 'epub' | 'twine';

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

  /** whisker-core format version (1.0 or 2.0) */
  whiskerCoreVersion?: '1.0' | '2.0';

  /** Strip editor-specific extensions for whisker-core export */
  stripExtensions?: boolean;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Export success status */
  success: boolean;

  /** Exported content (string or Blob) */
  content?: string | Blob;

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
