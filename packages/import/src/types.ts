/**
 * Import System Types
 *
 * Type definitions for the story import system.
 */

import type { Story } from '@writewhisker/core-ts';
import type { ValidationResult } from '@writewhisker/core-ts';

/**
 * Supported import formats
 */
export type ImportFormat = 'json' | 'twine' | 'ink' | 'yarn' | 'wls';

/**
 * Import options configuration
 */
export interface ImportOptions {
  /** Import format (auto-detected if not specified) */
  format?: ImportFormat;

  /** Validate after import */
  validateAfterImport?: boolean;

  /** Merge strategy for existing stories */
  mergeStrategy?: 'replace' | 'merge' | 'duplicate';

  /** Convert passage IDs to preserve references */
  preserveIds?: boolean;

  /** Import metadata */
  importMetadata?: boolean;

  /** Import tags */
  importTags?: boolean;

  /** Import variables */
  importVariables?: boolean;

  /** Strict mode (fail on any errors) */
  strictMode?: boolean;

  /** Transform passage titles */
  transformTitles?: (title: string) => string;

  /** Custom import handlers */
  customHandlers?: Record<string, (data: unknown) => unknown>;

  /** Conversion options for format conversion (e.g., Twine) */
  conversionOptions?: ConversionOptions;
}

/**
 * Conversion issue severity
 */
export type ConversionSeverity = 'critical' | 'warning' | 'info';

/**
 * Conversion issue details
 */
export interface ConversionIssue {
  /** Severity level */
  severity: ConversionSeverity;

  /** Issue category (e.g., 'macro', 'syntax', 'variable') */
  category: string;

  /** Feature or syntax that couldn't be converted */
  feature: string;

  /** Passage where issue occurred */
  passageId?: string;

  /** Passage name for display */
  passageName?: string;

  /** Line number in passage (if applicable) */
  line?: number;

  /** Original syntax */
  original?: string;

  /** Suggested manual fix */
  suggestion?: string;

  /** Detailed explanation */
  message: string;
}

/**
 * Loss report for format conversion
 */
export interface LossReport {
  /** Total number of issues */
  totalIssues: number;

  /** Issues by severity */
  critical: ConversionIssue[];
  warnings: ConversionIssue[];
  info: ConversionIssue[];

  /** Count by category */
  categoryCounts: Record<string, number>;

  /** Passages affected */
  affectedPassages: string[];

  /** Overall conversion quality estimate (0-1) */
  conversionQuality?: number;
}

/**
 * Conversion options for Twine import
 */
export interface ConversionOptions {
  /** Automatically convert variables (e.g., $var to {{var}}) */
  convertVariables?: boolean;

  /** Preserve original syntax in comments */
  preserveOriginalSyntax?: boolean;

  /** Strict mode - fail on unknown macros */
  strictMode?: boolean;

  /** Convert macros to equivalent Whisker syntax */
  convertMacros?: boolean;

  /** Target Whisker syntax version */
  targetVersion?: string;
}

/**
 * Import result
 */
export interface ImportResult {
  /** Import success status */
  success: boolean;

  /** Imported story */
  story?: Story;

  /** Validation result (if validateAfterImport is true) */
  validation?: ValidationResult;

  /** Import duration in milliseconds */
  duration?: number;

  /** Number of passages imported */
  passageCount?: number;

  /** Number of variables imported */
  variableCount?: number;

  /** Error message if import failed */
  error?: string;

  /** Warnings encountered during import */
  warnings?: string[];

  /** Loss report for format conversions */
  lossReport?: LossReport;

  /** Skipped elements */
  skipped?: {
    passages?: string[];
    variables?: string[];
    metadata?: string[];
  };
}

/**
 * Import context passed to importers
 */
export interface ImportContext {
  /** Raw import data */
  data: string | object;

  /** Import options */
  options: ImportOptions;

  /** Source filename (if available) */
  filename?: string;

  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Base importer interface
 */
export interface IImporter {
  /** Importer name */
  readonly name: string;

  /** Supported format */
  readonly format: ImportFormat;

  /** Supported file extensions */
  readonly extensions: string[];

  /**
   * Import a story
   */
  import(context: ImportContext): Promise<ImportResult>;

  /**
   * Detect if data matches this format
   */
  canImport(data: string | object): boolean;

  /**
   * Validate import data
   */
  validate?(data: string | object): string[];

  /**
   * Get format version
   */
  getFormatVersion?(data: string | object): string;
}

/**
 * Twine-specific types
 */
export namespace Twine {
  /**
   * Twine story format
   */
  export interface TwineStory {
    name: string;
    startPassage?: string;
    passages: TwinePassage[];
    metadata?: Record<string, unknown>;
  }

  /**
   * Twine passage format
   */
  export interface TwinePassage {
    pid: string | number;
    name: string;
    tags?: string[];
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    text: string;
    metadata?: Record<string, unknown>;
  }

  /**
   * Twine link format
   */
  export interface TwineLink {
    text: string;
    target: string;
    conditional?: string;
  }
}

/**
 * Import history entry
 */
export interface ImportHistoryEntry {
  /** Import ID */
  id: string;

  /** Import timestamp */
  timestamp: number;

  /** Import format */
  format: ImportFormat;

  /** Story title */
  storyTitle: string;

  /** Number of passages imported */
  passageCount: number;

  /** Import success status */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Source filename */
  filename?: string;
}

/**
 * Format detection result
 */
export interface FormatDetectionResult {
  /** Detected format */
  format: ImportFormat | null;

  /** Detection confidence (0-1) */
  confidence: number;

  /** Detection reason */
  reason?: string;
}
