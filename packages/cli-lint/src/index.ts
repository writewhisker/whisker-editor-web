/**
 * WLS 1.0 Lint Library
 * Programmatic API for linting Whisker story files
 * WLS 1.0 Gap 6: Developer Experience
 */

import * as fs from 'fs';
import { Parser } from '@writewhisker/parser';
import { createDefaultValidator, type ValidationIssue } from '@writewhisker/story-validation';

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
  issues: ValidationIssue[];
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
  const story = parseResult.ast;

  // Collect issues
  const issues: ValidationIssue[] = [];

  // Add parse errors
  for (const error of parseResult.errors) {
    issues.push({
      message: error.message,
      severity: 'error',
      line: error.location.start.line,
      column: error.location.start.column,
      code: error.code,
      suggestion: error.suggestion,
    });
  }

  // Validate if parsing succeeded
  if (story) {
    const validator = createDefaultValidator();
    const validationIssues = validator.validate(story);
    issues.push(...validationIssues);
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
