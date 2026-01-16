/**
 * Lint Library
 *
 * Programmatic API for linting Whisker story files.
 * Integrates with WLS Chapter 14.1 error formatting.
 */

import * as fs from 'fs';
import {
  Parser,
  parseErrorToFormatted,
  formatError,
  formatErrors,
  type FormattedError,
  type OutputFormat,
} from '@writewhisker/parser';

/**
 * Lint issue severity
 */
export type LintSeverity = 'error' | 'warning' | 'info';

/**
 * Individual lint issue
 */
export interface LintIssue {
  severity: LintSeverity;
  message: string;
  line?: number;
  column?: number;
  code?: string;
  suggestion?: string;
}

/**
 * Lint options
 */
export interface LintOptions {
  /** Use colors in output */
  useColors?: boolean;
  /** Include info-level issues */
  includeInfo?: boolean;
  /** Include warnings */
  includeWarnings?: boolean;
  /** Custom validator categories to enable */
  categories?: string[];
}

/**
 * Lint result for a single file
 */
export interface LintResult {
  /** File path */
  file: string;
  /** File content */
  content: string;
  /** All validation issues */
  issues: LintIssue[];
  /** Count of errors */
  errorCount: number;
  /** Count of warnings */
  warningCount: number;
  /** Count of info messages */
  infoCount: number;
  /** Whether parsing succeeded */
  parseSuccess: boolean;
}

/**
 * Default lint options
 */
const DEFAULT_OPTIONS: Required<LintOptions> = {
  useColors: false,
  includeInfo: true,
  includeWarnings: true,
  categories: [],
};

/**
 * Lint a file by path
 */
export async function lintFile(
  filePath: string,
  options: LintOptions = {}
): Promise<LintResult> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return lintContent(content, filePath, options);
}

/**
 * Lint content string
 */
export function lintContent(
  content: string,
  filePath: string = 'story.ws',
  options: LintOptions = {}
): LintResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Parse the content
  const parser = new Parser();
  const parseResult = parser.parse(content);
  const ast = parseResult.ast;

  // Collect issues
  const issues: LintIssue[] = [];

  // Add parse errors
  for (const error of parseResult.errors) {
    issues.push({
      severity: 'error',
      message: error.message,
      line: error.location.start.line,
      column: error.location.start.column,
      code: error.code,
      suggestion: error.suggestion,
    });
  }

  // Add structural warnings based on AST
  if (ast) {
    // Check for missing start passage
    const hasStart = ast.metadata.some(m => m.key === 'start');
    if (!hasStart && ast.passages.length > 0) {
      issues.push({
        severity: 'warning',
        message: 'No @start directive found. First passage will be used as start.',
        line: 1,
      });
    }

    // Check for empty passages
    for (const passage of ast.passages) {
      if (passage.content.length === 0) {
        issues.push({
          severity: 'info',
          message: `Passage "${passage.name}" has no content.`,
          line: passage.location.start.line,
        });
      }
    }
  }

  // Filter issues by severity
  const filteredIssues = issues.filter(issue => {
    if (issue.severity === 'error') return true;
    if (issue.severity === 'warning' && opts.includeWarnings) return true;
    if (issue.severity === 'info' && opts.includeInfo) return true;
    return false;
  });

  // Count by severity
  const errorCount = filteredIssues.filter(i => i.severity === 'error').length;
  const warningCount = filteredIssues.filter(i => i.severity === 'warning').length;
  const infoCount = filteredIssues.filter(i => i.severity === 'info').length;

  return {
    file: filePath,
    content,
    issues: filteredIssues,
    errorCount,
    warningCount,
    infoCount,
    parseSuccess: parseResult.errors.length === 0,
  };
}

/**
 * Lint multiple files
 */
export async function lintFiles(
  filePaths: string[],
  options: LintOptions = {}
): Promise<LintResult[]> {
  return Promise.all(filePaths.map(file => lintFile(file, options)));
}

/**
 * Check if a file has any errors
 */
export async function hasErrors(filePath: string): Promise<boolean> {
  const result = await lintFile(filePath, { includeInfo: false, includeWarnings: false });
  return result.errorCount > 0;
}

/**
 * Convert LintIssue to FormattedError for WLS Chapter 14.1 output
 */
export function lintIssueToFormatted(
  issue: LintIssue,
  content: string,
  filePath?: string
): FormattedError {
  const lines = content.split('\n');
  const line = issue.line ?? 1;
  const column = issue.column ?? 1;
  const contextCount = 2;

  // Get context lines
  const contextStart = Math.max(0, line - 1 - contextCount);
  const context: string[] = [];
  for (let i = contextStart; i < line - 1; i++) {
    context.push(lines[i] || '');
  }

  const sourceLine = lines[line - 1] || '';

  return {
    code: issue.code || 'WLS-LINT-000',
    message: issue.message,
    line,
    column,
    context,
    sourceLine,
    caretPosition: column - 1,
    caretLength: 1,
    explanation: issue.message,
    suggestion: issue.suggestion,
    docUrl: `https://wls.whisker.dev/errors/${issue.code || 'WLS-LINT-000'}`,
    severity: issue.severity,
    filePath,
  };
}

/**
 * Format lint result using WLS Chapter 14.1 error format
 */
export function formatLintResult(
  result: LintResult,
  format: OutputFormat = 'text'
): string {
  const formattedErrors = result.issues.map(issue =>
    lintIssueToFormatted(issue, result.content, result.file)
  );

  return formatErrors(formattedErrors, { format });
}

/**
 * Re-export formatting utilities for CLI use
 */
export { formatError, formatErrors, type FormattedError, type OutputFormat };
