/**
 * WLS 1.0 Error Formatter
 * Provides rich error messages with source context
 * WLS 1.0 Gap 6: Developer Experience
 */

import type { ValidationIssue, ValidationSeverity } from './types';
import { WLS_ERROR_CODES, formatErrorMessage } from './error-codes';

/**
 * Options for error formatting
 */
export interface ErrorFormatOptions {
  /** Number of context lines before the error */
  contextLinesBefore?: number;
  /** Number of context lines after the error */
  contextLinesAfter?: number;
  /** Whether to include suggestions */
  includeSuggestion?: boolean;
  /** Whether to include documentation links */
  includeDocLink?: boolean;
  /** Base URL for documentation */
  docBaseUrl?: string;
  /** Whether to use colors (for terminal output) */
  useColors?: boolean;
}

const DEFAULT_OPTIONS: Required<ErrorFormatOptions> = {
  contextLinesBefore: 2,
  contextLinesAfter: 0,
  includeSuggestion: true,
  includeDocLink: true,
  docBaseUrl: 'https://wls.whisker.dev/errors',
  useColors: false,
};

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

/**
 * Get severity color
 */
function getSeverityColor(severity: ValidationSeverity, useColors: boolean): string {
  if (!useColors) return '';
  switch (severity) {
    case 'error': return COLORS.red;
    case 'warning': return COLORS.yellow;
    case 'info': return COLORS.blue;
    default: return '';
  }
}

/**
 * Extract source lines from content
 */
function getSourceLines(source: string): string[] {
  return source.split('\n');
}

/**
 * Generate caret indicator pointing to the error column
 */
function generateCaret(column: number, length: number = 1): string {
  const spaces = ' '.repeat(Math.max(0, column - 1));
  const carets = '^'.repeat(Math.max(1, length));
  return spaces + carets;
}

/**
 * Format line number with padding
 */
function formatLineNumber(lineNum: number, maxLineNum: number): string {
  const maxDigits = String(maxLineNum).length;
  return String(lineNum).padStart(maxDigits, ' ');
}

/**
 * Format a single validation issue with source context
 */
export function formatError(
  issue: ValidationIssue,
  source: string,
  options: ErrorFormatOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];
  const sourceLines = getSourceLines(source);

  const color = opts.useColors ? getSeverityColor(issue.severity, true) : '';
  const reset = opts.useColors ? COLORS.reset : '';
  const gray = opts.useColors ? COLORS.gray : '';
  const cyan = opts.useColors ? COLORS.cyan : '';

  // Header: error code, message, location
  const errorCode = issue.code || 'WLS-ERR';
  const line = issue.line ?? 1;
  const column = issue.column ?? 1;

  lines.push(`${color}${errorCode}: ${issue.message} at line ${line}, column ${column}${reset}`);
  lines.push('');

  // Source context
  const startLine = Math.max(1, line - opts.contextLinesBefore);
  const endLine = Math.min(sourceLines.length, line + opts.contextLinesAfter);
  const maxLineNum = endLine;

  for (let i = startLine; i <= endLine; i++) {
    const lineContent = sourceLines[i - 1] || '';
    const lineNumStr = formatLineNumber(i, maxLineNum);
    const prefix = i === line ? `${color}>${reset}` : ' ';
    lines.push(`${gray}${prefix} ${lineNumStr} |${reset} ${lineContent}`);

    // Add caret indicator on the error line
    if (i === line) {
      const padding = ' '.repeat(lineNumStr.length + 4); // account for prefix and "| "
      const caret = generateCaret(column, issue.length);
      lines.push(`${padding}${color}${caret}${reset}`);

      // Add explanation if available
      if (issue.details) {
        lines.push(`${padding}${color}${issue.details}${reset}`);
      }
    }
  }

  lines.push('');

  // Suggestion
  if (opts.includeSuggestion && issue.suggestion) {
    lines.push(`${cyan}Suggestion: ${issue.suggestion}${reset}`);
  }

  // Documentation link
  if (opts.includeDocLink && issue.code) {
    lines.push(`${gray}See: ${opts.docBaseUrl}/${issue.code}${reset}`);
  }

  return lines.join('\n');
}

/**
 * Format multiple validation issues
 */
export function formatErrors(
  issues: ValidationIssue[],
  source: string,
  options: ErrorFormatOptions = {}
): string {
  if (issues.length === 0) {
    return '';
  }

  const formattedErrors = issues.map(issue => formatError(issue, source, options));
  const summary = formatSummary(issues, options);

  return formattedErrors.join('\n\n') + '\n\n' + summary;
}

/**
 * Format error summary
 */
export function formatSummary(
  issues: ValidationIssue[],
  options: ErrorFormatOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const color = opts.useColors;

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.filter(i => i.severity === 'info').length;

  const parts: string[] = [];

  if (errors > 0) {
    const c = color ? COLORS.red : '';
    const r = color ? COLORS.reset : '';
    parts.push(`${c}${errors} error${errors !== 1 ? 's' : ''}${r}`);
  }

  if (warnings > 0) {
    const c = color ? COLORS.yellow : '';
    const r = color ? COLORS.reset : '';
    parts.push(`${c}${warnings} warning${warnings !== 1 ? 's' : ''}${r}`);
  }

  if (infos > 0) {
    const c = color ? COLORS.blue : '';
    const r = color ? COLORS.reset : '';
    parts.push(`${c}${infos} info${r}`);
  }

  if (parts.length === 0) {
    return 'No issues found.';
  }

  return `Found ${parts.join(', ')}.`;
}

/**
 * Format error as JSON for tool integration
 */
export function formatErrorAsJson(
  issue: ValidationIssue,
  source: string,
  options: ErrorFormatOptions = {}
): object {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sourceLines = getSourceLines(source);
  const line = issue.line ?? 1;

  const startLine = Math.max(1, line - opts.contextLinesBefore);
  const endLine = Math.min(sourceLines.length, line + opts.contextLinesAfter);
  const context = sourceLines.slice(startLine - 1, endLine).join('\n');

  return {
    code: issue.code,
    message: issue.message,
    severity: issue.severity,
    location: {
      line: issue.line,
      column: issue.column,
      length: issue.length,
      passageName: issue.passageName,
    },
    context,
    suggestion: issue.suggestion,
    docUrl: opts.includeDocLink && issue.code ? `${opts.docBaseUrl}/${issue.code}` : undefined,
  };
}

/**
 * Format errors in SARIF format for CI integration
 */
export function formatErrorsAsSarif(
  issues: ValidationIssue[],
  source: string,
  filePath: string
): object {
  const results = issues.map(issue => ({
    ruleId: issue.code || 'WLS-ERR',
    level: issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'note',
    message: {
      text: issue.message,
    },
    locations: [{
      physicalLocation: {
        artifactLocation: {
          uri: filePath,
        },
        region: {
          startLine: issue.line ?? 1,
          startColumn: issue.column ?? 1,
          endLine: issue.line ?? 1,
          endColumn: (issue.column ?? 1) + (issue.length ?? 1),
        },
      },
    }],
    fixes: issue.suggestion ? [{
      description: {
        text: issue.suggestion,
      },
    }] : undefined,
  }));

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'whisker-lint',
          version: '1.0.0',
          informationUri: 'https://wls.whisker.dev',
          rules: Object.values(WLS_ERROR_CODES).map(def => ({
            id: def.code,
            name: def.name,
            shortDescription: {
              text: def.message,
            },
            fullDescription: {
              text: def.description,
            },
            defaultConfiguration: {
              level: def.severity === 'error' ? 'error' : def.severity === 'warning' ? 'warning' : 'note',
            },
          })),
        },
      },
      results,
    }],
  };
}

/**
 * Suggest similar names for typos (Levenshtein distance)
 */
export function suggestSimilar(
  input: string,
  candidates: string[],
  maxDistance: number = 3
): string | undefined {
  let bestMatch: string | undefined;
  let bestDistance = maxDistance + 1;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(input.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestDistance <= maxDistance ? bestMatch : undefined;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
