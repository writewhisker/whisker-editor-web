/**
 * Error Formatter - Standardized Error Message Format
 *
 * Implements WLS Chapter 14.1 error message format with:
 * - Source context with caret indicator
 * - Suggestions and documentation links
 * - Multiple output formats: text, JSON, SARIF
 *
 * Reference: WLS Chapter 14 - Developer Experience
 */

import type { ParseError } from './ast';
import type { SourceSpan, SourceLocation } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Severity levels per WLS 14.1.3
 */
export type Severity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Formatted error with full context for display
 */
export interface FormattedError {
  /** WLS error code (e.g., WLS-LNK-001) */
  code: string;
  /** Brief description of the error */
  message: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (1-indexed) */
  column: number;
  /** 2-3 context lines before the error */
  context: string[];
  /** The source line containing the error */
  sourceLine: string;
  /** Column position for caret (0-indexed from start of line) */
  caretPosition: number;
  /** Length of caret underline */
  caretLength: number;
  /** Detailed explanation of the error */
  explanation: string;
  /** Suggested fix (if determinable) */
  suggestion?: string;
  /** URL to documentation */
  docUrl: string;
  /** Error severity */
  severity: Severity;
  /** File path (if available) */
  filePath?: string;
}

/**
 * Output format options
 */
export type OutputFormat = 'text' | 'json' | 'sarif';

/**
 * Options for error formatting
 */
export interface FormatOptions {
  /** Output format (default: 'text') */
  format?: OutputFormat;
  /** Number of context lines to show (default: 2) */
  contextLines?: number;
  /** Whether to include doc URLs (default: true) */
  includeDocUrl?: boolean;
  /** Whether to colorize output (default: false) */
  colorize?: boolean;
  /** Base URL for documentation links */
  docBaseUrl?: string;
}

/**
 * SARIF result for CI integration
 */
export interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn: number;
        endLine?: number;
        endColumn?: number;
      };
    };
  }>;
}

/**
 * SARIF output structure
 */
export interface SarifOutput {
  version: '2.1.0';
  $schema: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
      };
    };
    results: SarifResult[];
  }>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DOC_BASE_URL = 'https://wls.whisker.dev/errors';
const DEFAULT_CONTEXT_LINES = 2;

// =============================================================================
// Error Formatting Functions
// =============================================================================

/**
 * Format a single error as human-readable text
 * Per WLS Chapter 14.1.1
 */
export function formatErrorText(error: FormattedError, options: FormatOptions = {}): string {
  const lines: string[] = [];
  const includeDocUrl = options.includeDocUrl !== false;

  // Header: WLS-XXX-NNN: Brief description at line L, column C
  lines.push(`${error.code}: ${error.message} at line ${error.line}, column ${error.column}`);
  lines.push('');

  // Context lines (lines before the error)
  const startLine = error.line - error.context.length;
  error.context.forEach((line, i) => {
    const lineNum = startLine + i;
    lines.push(`  ${padLineNum(lineNum, error.line)} | ${line}`);
  });

  // Error line with marker
  lines.push(`> ${padLineNum(error.line, error.line)} | ${error.sourceLine}`);

  // Caret indicator and explanation
  const padding = ' '.repeat(2 + String(error.line).length + 3 + error.caretPosition);
  lines.push(`${padding}${'^'.repeat(Math.max(1, error.caretLength))}`);
  lines.push(`${padding}${error.explanation}`);
  lines.push('');

  // Suggestion
  if (error.suggestion) {
    lines.push(`Suggestion: ${error.suggestion}`);
  }

  // Documentation link
  if (includeDocUrl) {
    lines.push(`See: ${error.docUrl}`);
  }

  return lines.join('\n');
}

/**
 * Format a single error as JSON
 */
export function formatErrorJson(error: FormattedError): string {
  return JSON.stringify({
    code: error.code,
    message: error.message,
    severity: error.severity,
    location: {
      line: error.line,
      column: error.column,
      file: error.filePath,
    },
    context: {
      lines: error.context,
      sourceLine: error.sourceLine,
      caretPosition: error.caretPosition,
      caretLength: error.caretLength,
    },
    explanation: error.explanation,
    suggestion: error.suggestion,
    docUrl: error.docUrl,
  }, null, 2);
}

/**
 * Format multiple errors as SARIF for CI integration
 */
export function formatErrorsSarif(errors: FormattedError[], filePath?: string): SarifOutput {
  return {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'whisker-lint',
          version: '1.0.0',
          informationUri: 'https://wls.whisker.dev',
        },
      },
      results: errors.map(error => ({
        ruleId: error.code,
        level: severityToSarifLevel(error.severity),
        message: { text: `${error.message}\n${error.explanation}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: error.filePath || filePath || 'unknown' },
            region: {
              startLine: error.line,
              startColumn: error.column,
              endColumn: error.column + error.caretLength,
            },
          },
        }],
      })),
    }],
  };
}

/**
 * Format a single error in the specified format
 */
export function formatError(error: FormattedError, options: FormatOptions = {}): string {
  const format = options.format || 'text';

  switch (format) {
    case 'json':
      return formatErrorJson(error);
    case 'sarif':
      return JSON.stringify(formatErrorsSarif([error]), null, 2);
    case 'text':
    default:
      return formatErrorText(error, options);
  }
}

/**
 * Format multiple errors
 */
export function formatErrors(errors: FormattedError[], options: FormatOptions = {}): string {
  const format = options.format || 'text';

  switch (format) {
    case 'json':
      return JSON.stringify(errors.map(e => JSON.parse(formatErrorJson(e))), null, 2);
    case 'sarif':
      return JSON.stringify(formatErrorsSarif(errors), null, 2);
    case 'text':
    default:
      return errors.map(e => formatErrorText(e, options)).join('\n\n---\n\n');
  }
}

// =============================================================================
// Error Conversion Functions
// =============================================================================

/**
 * Convert a ParseError to a FormattedError with source context
 */
export function parseErrorToFormatted(
  error: ParseError,
  source: string,
  options: FormatOptions = {}
): FormattedError {
  const lines = source.split('\n');
  const line = error.location.start.line;
  const column = error.location.start.column;
  const contextCount = options.contextLines ?? DEFAULT_CONTEXT_LINES;
  const docBaseUrl = options.docBaseUrl ?? DEFAULT_DOC_BASE_URL;

  // Get context lines (lines before the error)
  const contextStart = Math.max(0, line - 1 - contextCount);
  const context: string[] = [];
  for (let i = contextStart; i < line - 1; i++) {
    context.push(lines[i] || '');
  }

  // Get the source line
  const sourceLine = lines[line - 1] || '';

  // Calculate caret length from error span
  let caretLength = 1;
  if (error.location.end.line === error.location.start.line) {
    caretLength = Math.max(1, error.location.end.column - error.location.start.column);
  } else {
    // Multi-line error - underline to end of first line
    caretLength = Math.max(1, sourceLine.length - column + 1);
  }

  // Generate error code if not present
  const code = error.code || 'WLS-ERR-000';

  // Generate explanation from message
  const explanation = generateExplanation(error.message, code);

  return {
    code,
    message: extractBriefMessage(error.message),
    line,
    column,
    context,
    sourceLine,
    caretPosition: column - 1,
    caretLength,
    explanation,
    suggestion: error.suggestion,
    docUrl: `${docBaseUrl}/${code}`,
    severity: error.severity || 'error',
  };
}

/**
 * Convert multiple ParseErrors to FormattedErrors
 */
export function parseErrorsToFormatted(
  errors: ParseError[],
  source: string,
  options: FormatOptions = {}
): FormattedError[] {
  return errors.map(e => parseErrorToFormatted(e, source, options));
}

// =============================================================================
// Suggestion Generation
// =============================================================================

/**
 * Common misspellings and their corrections for suggestion generation
 */
const COMMON_MISSPELLINGS: Record<string, string[]> = {
  'START': ['Start', 'start', 'STRAT', 'Strat'],
  'END': ['End', 'end', 'ENd', 'ENDD'],
  'BACK': ['Back', 'back', 'BAKC'],
  'RESTART': ['Restart', 'restart', 'RESTRAT'],
};

/**
 * Generate a suggestion based on error type and context
 */
export function generateSuggestion(
  errorCode: string,
  context: { target?: string; variable?: string; expected?: string }
): string | undefined {
  switch (errorCode) {
    case 'WLS-LNK-001': // Dead link
      if (context.target) {
        const suggestion = findSimilarName(context.target, Object.keys(COMMON_MISSPELLINGS));
        if (suggestion) {
          return `Did you mean "${suggestion}"?`;
        }
      }
      return 'Check that the passage name is spelled correctly';

    case 'WLS-VAR-001': // Undefined variable
      if (context.variable) {
        return `Make sure $${context.variable} is defined before use`;
      }
      return 'Define the variable before using it';

    case 'WLS-SYN-005': // Expected closing brace
      return 'Add {/} to close the conditional block';

    case 'WLS-PRS-006': // Unclosed formatting
      if (context.expected) {
        return `Add closing ${context.expected} to complete the formatting`;
      }
      return 'Add closing marker to complete the formatting';

    default:
      return undefined;
  }
}

/**
 * Find a similar name using Levenshtein distance
 */
export function findSimilarName(target: string, candidates: string[], maxDistance = 2): string | undefined {
  let bestMatch: string | undefined;
  let bestDistance = maxDistance + 1;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(target.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Pad line number for alignment
 */
function padLineNum(lineNum: number, maxLineNum: number): string {
  const maxWidth = String(maxLineNum).length;
  return String(lineNum).padStart(maxWidth, ' ');
}

/**
 * Convert severity to SARIF level
 */
function severityToSarifLevel(severity: Severity): 'error' | 'warning' | 'note' | 'none' {
  switch (severity) {
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'note';
    case 'hint': return 'note';
    default: return 'none';
  }
}

/**
 * Extract brief message from full error message
 */
function extractBriefMessage(message: string): string {
  // Take first sentence or up to 60 chars
  const firstSentence = message.split(/[.!?]/)[0];
  if (firstSentence.length <= 60) {
    return firstSentence;
  }
  return message.substring(0, 57) + '...';
}

/**
 * Generate explanation from message and error code
 */
function generateExplanation(message: string, code: string): string {
  // For now, use the message as explanation
  // In the future, this could look up detailed explanations by code
  return message;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a FormattedError from components
 */
export function createFormattedError(
  code: string,
  message: string,
  location: SourceLocation | SourceSpan,
  source: string,
  options: {
    suggestion?: string;
    severity?: Severity;
    caretLength?: number;
    explanation?: string;
    filePath?: string;
    contextLines?: number;
    docBaseUrl?: string;
  } = {}
): FormattedError {
  const lines = source.split('\n');
  const line = 'start' in location ? location.start.line : location.line;
  const column = 'start' in location ? location.start.column : location.column;
  const contextCount = options.contextLines ?? DEFAULT_CONTEXT_LINES;
  const docBaseUrl = options.docBaseUrl ?? DEFAULT_DOC_BASE_URL;

  // Get context lines
  const contextStart = Math.max(0, line - 1 - contextCount);
  const context: string[] = [];
  for (let i = contextStart; i < line - 1; i++) {
    context.push(lines[i] || '');
  }

  const sourceLine = lines[line - 1] || '';

  return {
    code,
    message,
    line,
    column,
    context,
    sourceLine,
    caretPosition: column - 1,
    caretLength: options.caretLength ?? 1,
    explanation: options.explanation ?? message,
    suggestion: options.suggestion,
    docUrl: `${docBaseUrl}/${code}`,
    severity: options.severity ?? 'error',
    filePath: options.filePath,
  };
}
