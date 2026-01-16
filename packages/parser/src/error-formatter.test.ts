/**
 * Error Formatter Tests
 * Tests for WLS Chapter 14.1 error message format
 */

import { describe, it, expect } from 'vitest';
import {
  formatErrorText,
  formatErrorJson,
  formatErrorsSarif,
  formatError,
  formatErrors,
  parseErrorToFormatted,
  parseErrorsToFormatted,
  generateSuggestion,
  findSimilarName,
  levenshteinDistance,
  createFormattedError,
  FormattedError,
  SarifOutput,
} from './error-formatter';
import type { ParseError } from './ast';

// =============================================================================
// Test Fixtures
// =============================================================================

const sampleSource = `:: Start
Welcome to the story!
+ [Go to shop] -> Shopp
+ [Go home] -> Home

:: Shop
You browse the wares.

:: Home
You rest at home.`;

const sampleError: FormattedError = {
  code: 'WLS-LNK-001',
  message: 'Choice links to non-existent passage',
  line: 3,
  column: 20,
  context: [':: Start', 'Welcome to the story!'],
  sourceLine: '+ [Go to shop] -> Shopp',
  caretPosition: 19,
  caretLength: 5,
  explanation: 'Passage "Shopp" does not exist',
  suggestion: 'Did you mean "Shop"?',
  docUrl: 'https://wls.whisker.dev/errors/WLS-LNK-001',
  severity: 'error',
};

// =============================================================================
// Text Format Tests
// =============================================================================

describe('Error Formatter', () => {
  describe('formatErrorText', () => {
    it('should format error with standard structure', () => {
      const result = formatErrorText(sampleError);

      // Header
      expect(result).toContain('WLS-LNK-001: Choice links to non-existent passage at line 3, column 20');

      // Context lines
      expect(result).toContain('1 | :: Start');
      expect(result).toContain('2 | Welcome to the story!');

      // Error line with marker
      expect(result).toContain('> 3 | + [Go to shop] -> Shopp');
      expect(result).toContain('^^^^^');

      // Explanation
      expect(result).toContain('Passage "Shopp" does not exist');

      // Suggestion
      expect(result).toContain('Suggestion: Did you mean "Shop"?');

      // Doc URL
      expect(result).toContain('See: https://wls.whisker.dev/errors/WLS-LNK-001');
    });

    it('should handle error without suggestion', () => {
      const errorNoSuggestion: FormattedError = {
        ...sampleError,
        suggestion: undefined,
      };

      const result = formatErrorText(errorNoSuggestion);
      expect(result).not.toContain('Suggestion:');
    });

    it('should respect includeDocUrl option', () => {
      const result = formatErrorText(sampleError, { includeDocUrl: false });
      expect(result).not.toContain('See:');
    });

    it('should align line numbers correctly', () => {
      const errorHighLineNum: FormattedError = {
        ...sampleError,
        line: 100,
        context: ['line 97', 'line 98', 'line 99'],
      };

      const result = formatErrorText(errorHighLineNum);
      // Line numbers should be padded to align
      expect(result).toContain(' 97 |');
      expect(result).toContain(' 98 |');
      expect(result).toContain(' 99 |');
      expect(result).toContain('> 100 |');
    });

    it('should handle empty context', () => {
      const errorNoContext: FormattedError = {
        ...sampleError,
        context: [],
      };

      const result = formatErrorText(errorNoContext);
      expect(result).toContain('> 3 | + [Go to shop] -> Shopp');
    });

    it('should handle single character caret', () => {
      const errorSingleChar: FormattedError = {
        ...sampleError,
        caretLength: 1,
      };

      const result = formatErrorText(errorSingleChar);
      // Should have exactly one caret on its own line
      expect(result).toContain('^');
      expect(result).not.toContain('^^');
    });
  });

  // ===========================================================================
  // JSON Format Tests
  // ===========================================================================

  describe('formatErrorJson', () => {
    it('should produce valid JSON', () => {
      const result = formatErrorJson(sampleError);
      const parsed = JSON.parse(result);

      expect(parsed.code).toBe('WLS-LNK-001');
      expect(parsed.message).toBe('Choice links to non-existent passage');
      expect(parsed.severity).toBe('error');
      expect(parsed.location.line).toBe(3);
      expect(parsed.location.column).toBe(20);
    });

    it('should include context information', () => {
      const result = formatErrorJson(sampleError);
      const parsed = JSON.parse(result);

      expect(parsed.context.lines).toEqual([':: Start', 'Welcome to the story!']);
      expect(parsed.context.sourceLine).toBe('+ [Go to shop] -> Shopp');
      expect(parsed.context.caretPosition).toBe(19);
      expect(parsed.context.caretLength).toBe(5);
    });

    it('should include suggestion when present', () => {
      const result = formatErrorJson(sampleError);
      const parsed = JSON.parse(result);

      expect(parsed.suggestion).toBe('Did you mean "Shop"?');
    });
  });

  // ===========================================================================
  // SARIF Format Tests
  // ===========================================================================

  describe('formatErrorsSarif', () => {
    it('should produce valid SARIF structure', () => {
      const result = formatErrorsSarif([sampleError]);

      expect(result.version).toBe('2.1.0');
      expect(result.$schema).toContain('sarif-schema');
      expect(result.runs).toHaveLength(1);
      expect(result.runs[0].tool.driver.name).toBe('whisker-lint');
    });

    it('should map errors to SARIF results', () => {
      const result = formatErrorsSarif([sampleError], 'story.ws');

      expect(result.runs[0].results).toHaveLength(1);
      const sarifResult = result.runs[0].results[0];

      expect(sarifResult.ruleId).toBe('WLS-LNK-001');
      expect(sarifResult.level).toBe('error');
      expect(sarifResult.message.text).toContain('Choice links to non-existent passage');
      expect(sarifResult.locations[0].physicalLocation.region.startLine).toBe(3);
      expect(sarifResult.locations[0].physicalLocation.region.startColumn).toBe(20);
    });

    it('should map severity to SARIF levels correctly', () => {
      const errors: FormattedError[] = [
        { ...sampleError, severity: 'error' },
        { ...sampleError, code: 'WLS-WARN-001', severity: 'warning' },
        { ...sampleError, code: 'WLS-INFO-001', severity: 'info' },
        { ...sampleError, code: 'WLS-HINT-001', severity: 'hint' },
      ];

      const result = formatErrorsSarif(errors);
      const levels = result.runs[0].results.map(r => r.level);

      expect(levels).toEqual(['error', 'warning', 'note', 'note']);
    });

    it('should handle multiple errors', () => {
      const errors: FormattedError[] = [
        sampleError,
        { ...sampleError, code: 'WLS-VAR-001', line: 5 },
      ];

      const result = formatErrorsSarif(errors);
      expect(result.runs[0].results).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Format Selection Tests
  // ===========================================================================

  describe('formatError', () => {
    it('should default to text format', () => {
      const result = formatError(sampleError);
      expect(result).toContain('WLS-LNK-001:');
      expect(result).toContain('> 3 |');
    });

    it('should support json format', () => {
      const result = formatError(sampleError, { format: 'json' });
      const parsed = JSON.parse(result);
      expect(parsed.code).toBe('WLS-LNK-001');
    });

    it('should support sarif format', () => {
      const result = formatError(sampleError, { format: 'sarif' });
      const parsed = JSON.parse(result);
      expect(parsed.version).toBe('2.1.0');
    });
  });

  describe('formatErrors', () => {
    it('should format multiple errors with separator in text mode', () => {
      const errors = [sampleError, { ...sampleError, code: 'WLS-VAR-001' }];
      const result = formatErrors(errors, { format: 'text' });

      expect(result).toContain('WLS-LNK-001');
      expect(result).toContain('WLS-VAR-001');
      expect(result).toContain('---');
    });

    it('should format multiple errors as JSON array', () => {
      const errors = [sampleError, { ...sampleError, code: 'WLS-VAR-001' }];
      const result = formatErrors(errors, { format: 'json' });
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });
  });

  // ===========================================================================
  // ParseError Conversion Tests
  // ===========================================================================

  describe('parseErrorToFormatted', () => {
    it('should convert ParseError to FormattedError', () => {
      const parseError: ParseError = {
        message: 'Undefined passage "Shopp"',
        location: {
          start: { line: 3, column: 20, offset: 45 },
          end: { line: 3, column: 25, offset: 50 },
        },
        code: 'WLS-LNK-001',
        suggestion: 'Did you mean "Shop"?',
        severity: 'error',
      };

      const result = parseErrorToFormatted(parseError, sampleSource);

      expect(result.code).toBe('WLS-LNK-001');
      expect(result.line).toBe(3);
      expect(result.column).toBe(20);
      expect(result.sourceLine).toBe('+ [Go to shop] -> Shopp');
      expect(result.caretLength).toBe(5);
      expect(result.suggestion).toBe('Did you mean "Shop"?');
    });

    it('should extract context lines', () => {
      const parseError: ParseError = {
        message: 'Test error',
        location: {
          start: { line: 3, column: 1, offset: 30 },
          end: { line: 3, column: 5, offset: 35 },
        },
      };

      const result = parseErrorToFormatted(parseError, sampleSource, { contextLines: 2 });

      expect(result.context).toHaveLength(2);
      expect(result.context[0]).toBe(':: Start');
      expect(result.context[1]).toBe('Welcome to the story!');
    });

    it('should handle first line errors with no context', () => {
      const parseError: ParseError = {
        message: 'Test error',
        location: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 5, offset: 5 },
        },
      };

      const result = parseErrorToFormatted(parseError, sampleSource);

      expect(result.context).toHaveLength(0);
      expect(result.line).toBe(1);
    });

    it('should generate default error code if missing', () => {
      const parseError: ParseError = {
        message: 'Some error',
        location: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 5, offset: 5 },
        },
      };

      const result = parseErrorToFormatted(parseError, sampleSource);

      expect(result.code).toBe('WLS-ERR-000');
    });
  });

  describe('parseErrorsToFormatted', () => {
    it('should convert multiple ParseErrors', () => {
      const parseErrors: ParseError[] = [
        {
          message: 'Error 1',
          location: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 5, offset: 5 },
          },
          code: 'WLS-ERR-001',
        },
        {
          message: 'Error 2',
          location: {
            start: { line: 3, column: 1, offset: 30 },
            end: { line: 3, column: 5, offset: 35 },
          },
          code: 'WLS-ERR-002',
        },
      ];

      const results = parseErrorsToFormatted(parseErrors, sampleSource);

      expect(results).toHaveLength(2);
      expect(results[0].code).toBe('WLS-ERR-001');
      expect(results[1].code).toBe('WLS-ERR-002');
    });
  });

  // ===========================================================================
  // Suggestion Generation Tests
  // ===========================================================================

  describe('generateSuggestion', () => {
    it('should suggest for dead links', () => {
      const suggestion = generateSuggestion('WLS-LNK-001', { target: 'Strat' });
      expect(suggestion).toContain('Did you mean');
    });

    it('should suggest for undefined variables', () => {
      const suggestion = generateSuggestion('WLS-VAR-001', { variable: 'gold' });
      expect(suggestion).toContain('$gold');
    });

    it('should suggest for unclosed braces', () => {
      const suggestion = generateSuggestion('WLS-SYN-005', {});
      expect(suggestion).toContain('{/}');
    });

    it('should suggest for unclosed formatting', () => {
      const suggestion = generateSuggestion('WLS-PRS-006', { expected: '*' });
      expect(suggestion).toContain('closing *');
    });

    it('should return undefined for unknown error codes', () => {
      const suggestion = generateSuggestion('WLS-UNKNOWN-999', {});
      expect(suggestion).toBeUndefined();
    });
  });

  describe('findSimilarName', () => {
    it('should find similar names', () => {
      const candidates = ['Shop', 'Home', 'Start', 'End'];

      expect(findSimilarName('Shopp', candidates)).toBe('Shop');
      expect(findSimilarName('Strat', candidates)).toBe('Start');
      expect(findSimilarName('ENd', candidates)).toBe('End');
    });

    it('should respect max distance', () => {
      const candidates = ['Shop', 'Home'];

      // 'Shops' is 1 edit away from 'Shop'
      expect(findSimilarName('Shops', candidates, 2)).toBe('Shop');
      // 'Shopping' is 4 edits away from 'Shop', so maxDistance=1 won't find it
      expect(findSimilarName('Shopping', candidates, 1)).toBeUndefined();
    });

    it('should be case insensitive', () => {
      const candidates = ['Shop', 'HOME'];

      expect(findSimilarName('shop', candidates)).toBe('Shop');
      expect(findSimilarName('home', candidates)).toBe('HOME');
    });
  });

  describe('levenshteinDistance', () => {
    it('should calculate correct distances', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('a', '')).toBe(1);
      expect(levenshteinDistance('', 'a')).toBe(1);
      expect(levenshteinDistance('abc', 'abc')).toBe(0);
      expect(levenshteinDistance('abc', 'abd')).toBe(1);
      expect(levenshteinDistance('abc', 'abcd')).toBe(1);
      expect(levenshteinDistance('abc', 'ab')).toBe(1);
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });
  });

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe('createFormattedError', () => {
    it('should create FormattedError from SourceLocation', () => {
      const location = { line: 3, column: 20, offset: 45 };

      const result = createFormattedError(
        'WLS-TEST-001',
        'Test error message',
        location,
        sampleSource
      );

      expect(result.code).toBe('WLS-TEST-001');
      expect(result.message).toBe('Test error message');
      expect(result.line).toBe(3);
      expect(result.column).toBe(20);
      expect(result.sourceLine).toBe('+ [Go to shop] -> Shopp');
    });

    it('should create FormattedError from SourceSpan', () => {
      const span = {
        start: { line: 3, column: 20, offset: 45 },
        end: { line: 3, column: 25, offset: 50 },
      };

      const result = createFormattedError(
        'WLS-TEST-001',
        'Test error message',
        span,
        sampleSource
      );

      expect(result.line).toBe(3);
      expect(result.column).toBe(20);
    });

    it('should accept custom options', () => {
      const location = { line: 3, column: 20, offset: 45 };

      const result = createFormattedError(
        'WLS-TEST-001',
        'Test error',
        location,
        sampleSource,
        {
          suggestion: 'Try this instead',
          severity: 'warning',
          caretLength: 10,
          explanation: 'Detailed explanation here',
          filePath: 'story.ws',
          contextLines: 1,
          docBaseUrl: 'https://example.com/docs',
        }
      );

      expect(result.suggestion).toBe('Try this instead');
      expect(result.severity).toBe('warning');
      expect(result.caretLength).toBe(10);
      expect(result.explanation).toBe('Detailed explanation here');
      expect(result.filePath).toBe('story.ws');
      expect(result.context).toHaveLength(1);
      expect(result.docUrl).toBe('https://example.com/docs/WLS-TEST-001');
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Error Formatter Integration', () => {
  it('should produce WLS-compliant error format', () => {
    // Example from WLS Chapter 14.1.2
    const error: FormattedError = {
      code: 'WLS-LNK-001',
      message: 'Choice links to non-existent passage',
      line: 5,
      column: 8,
      context: [':: Start'],
      sourceLine: '+ [Go to shop] -> Shopp',
      caretPosition: 18,
      caretLength: 5,
      explanation: 'Passage "Shopp" does not exist',
      suggestion: 'Did you mean "Shop"?',
      docUrl: 'https://wls.whisker.dev/errors/WLS-LNK-001',
      severity: 'error',
    };

    const formatted = formatErrorText(error);

    // Verify WLS-compliant structure
    expect(formatted).toMatch(/^WLS-LNK-001:/);
    expect(formatted).toContain('at line 5, column 8');
    expect(formatted).toContain('> 5 |');
    expect(formatted).toContain('^^^^^');
    expect(formatted).toContain('Suggestion:');
    expect(formatted).toContain('See:');
  });

  it('should handle real parse errors from parser', () => {
    const realSource = `:: Test
+ [Go somewhere] -> NonExistent
`;

    const parseError: ParseError = {
      message: 'Reference to undefined passage "NonExistent"',
      location: {
        start: { line: 2, column: 21, offset: 30 },
        end: { line: 2, column: 32, offset: 41 },
      },
      code: 'WLS-LNK-001',
      suggestion: 'Check the passage name spelling',
      severity: 'error',
    };

    const formatted = parseErrorToFormatted(parseError, realSource);
    const output = formatErrorText(formatted);

    expect(output).toContain('WLS-LNK-001');
    expect(output).toContain('line 2');
    expect(output).toContain('NonExistent');
  });
});
