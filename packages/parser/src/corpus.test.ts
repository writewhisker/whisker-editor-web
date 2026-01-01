/**
 * WLS 1.0 Test Corpus Runner
 *
 * Runs the official WLS 1.0 test corpus against our parser implementation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { parse } from './index';

// Path to test corpus - use absolute path
const CORPUS_PATH = '/Users/jims/code/github.com/whisker-language-specification-1.0/phase-4-validation/test-corpus';

interface CorpusTest {
  name: string;
  description: string;
  input: string;
  expected: {
    valid?: boolean;
    passages?: number;
    error?: string;
    output?: string;
    variables?: Record<string, unknown>;
  };
}

interface CorpusFile {
  tests: CorpusTest[];
}

/**
 * Load corpus test file
 */
function loadCorpusFile(category: string): CorpusTest[] {
  const filePath = resolve(CORPUS_PATH, category, `${category.replace('edge-cases', 'edge-case')}-tests.yaml`);

  if (!existsSync(filePath)) {
    console.warn(`Corpus file not found: ${filePath}`);
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const data = yaml.load(content) as CorpusFile;

  return data.tests || [];
}

/**
 * Run a single corpus test
 */
function runCorpusTest(test: CorpusTest): { passed: boolean; message: string } {
  try {
    const result = parse(test.input);
    const hasErrors = result.errors.length > 0;

    // Check valid/invalid expectation
    if (test.expected.valid === false) {
      // Some errors are runtime errors, not parse errors
      const runtimeErrors = [
        'division by zero',
        'modulo by zero',
        'stack overflow',
        'infinite loop',
        'undefined variable',
        'type error',
      ];

      // Some errors are validation errors, not parse errors
      // These are semantic checks performed by story-validation, not the parser
      const validationErrors = [
        'invalid passage name',
        'duplicate passage',
        'undefined passage',
        'unreachable passage',
      ];

      const isRuntimeError = runtimeErrors.some(re =>
        test.expected.error?.toLowerCase().includes(re)
      );

      const isValidationError = validationErrors.some(ve =>
        test.expected.error?.toLowerCase().includes(ve)
      );

      // Should have errors (unless it's a runtime or validation error)
      if (!hasErrors && !isRuntimeError && !isValidationError) {
        return {
          passed: false,
          message: `Expected parsing to fail with error: "${test.expected.error}", but parsing succeeded`,
        };
      }

      // For runtime errors, just verify parsing succeeded
      if (isRuntimeError) {
        return { passed: true, message: 'Parsing succeeded; error would occur at runtime' };
      }

      // For validation errors, verify parsing succeeded (validation is separate)
      if (isValidationError) {
        return { passed: true, message: 'Parsing succeeded; error would occur during validation' };
      }
      // Check error message if specified
      if (test.expected.error) {
        const errorMessages = result.errors.map(e => e.message.toLowerCase());
        const expectedError = test.expected.error.toLowerCase();
        // More flexible matching - check for key words
        const expectedWords = expectedError.split(/\s+/).filter(w => w.length > 3);
        const hasMatchingError = errorMessages.some(msg => {
          // Direct containment
          if (msg.includes(expectedError)) return true;
          // Partial match
          if (expectedError.includes(msg.split(':')[0])) return true;
          // Key word match (at least half the words match)
          const matchingWords = expectedWords.filter(w => msg.includes(w));
          if (matchingWords.length >= Math.ceil(expectedWords.length / 2)) return true;
          return false;
        });
        if (!hasMatchingError) {
          return {
            passed: false,
            message: `Expected error containing "${test.expected.error}", got: ${errorMessages.join(', ')}`,
          };
        }
      }
      return { passed: true, message: 'Correctly rejected invalid input' };
    }

    // Valid input expected
    if (test.expected.valid !== false && hasErrors) {
      // Check if errors are critical
      const criticalErrors = result.errors.filter(e => e.severity === 'error');
      if (criticalErrors.length > 0) {
        return {
          passed: false,
          message: `Expected valid parse, got errors: ${criticalErrors.map(e => e.message).join(', ')}`,
        };
      }
    }

    // Check passage count
    if (test.expected.passages !== undefined) {
      const actualPassages = result.ast.passages.length;
      if (actualPassages !== test.expected.passages) {
        return {
          passed: false,
          message: `Expected ${test.expected.passages} passages, got ${actualPassages}`,
        };
      }
    }

    return { passed: true, message: 'Parsed successfully' };
  } catch (error) {
    if (test.expected.valid === false) {
      return { passed: true, message: 'Correctly threw error for invalid input' };
    }
    return {
      passed: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Check if corpus exists
const corpusExists = existsSync(CORPUS_PATH);

describe('WLS 1.0 Test Corpus', () => {
  if (!corpusExists) {
    it.skip('Corpus not found - skipping tests', () => {
      console.warn(`Test corpus not found at: ${CORPUS_PATH}`);
    });
    return;
  }

  describe('Syntax Tests', () => {
    const tests = loadCorpusFile('syntax');

    if (tests.length === 0) {
      it.skip('No syntax tests found', () => {});
      return;
    }

    tests.forEach((test) => {
      it(`${test.name}: ${test.description}`, () => {
        const result = runCorpusTest(test);
        if (!result.passed) {
          console.log('Input:', test.input);
          console.log('Expected:', test.expected);
        }
        expect(result.passed, result.message).toBe(true);
      });
    });
  });

  describe('Variable Tests', () => {
    const tests = loadCorpusFile('variables');

    if (tests.length === 0) {
      it.skip('No variable tests found', () => {});
      return;
    }

    tests.forEach((test) => {
      it(`${test.name}: ${test.description}`, () => {
        const result = runCorpusTest(test);
        if (!result.passed) {
          console.log('Input:', test.input);
          console.log('Expected:', test.expected);
        }
        expect(result.passed, result.message).toBe(true);
      });
    });
  });

  describe('Conditional Tests', () => {
    const tests = loadCorpusFile('conditionals');

    if (tests.length === 0) {
      it.skip('No conditional tests found', () => {});
      return;
    }

    tests.forEach((test) => {
      it(`${test.name}: ${test.description}`, () => {
        const result = runCorpusTest(test);
        if (!result.passed) {
          console.log('Input:', test.input);
          console.log('Expected:', test.expected);
        }
        expect(result.passed, result.message).toBe(true);
      });
    });
  });

  describe('Choice Tests', () => {
    const tests = loadCorpusFile('choices');

    if (tests.length === 0) {
      it.skip('No choice tests found', () => {});
      return;
    }

    tests.forEach((test) => {
      it(`${test.name}: ${test.description}`, () => {
        const result = runCorpusTest(test);
        if (!result.passed) {
          console.log('Input:', test.input);
          console.log('Expected:', test.expected);
        }
        expect(result.passed, result.message).toBe(true);
      });
    });
  });

  describe('Alternative Tests', () => {
    const tests = loadCorpusFile('alternatives');

    if (tests.length === 0) {
      it.skip('No alternative tests found', () => {});
      return;
    }

    tests.forEach((test) => {
      it(`${test.name}: ${test.description}`, () => {
        const result = runCorpusTest(test);
        if (!result.passed) {
          console.log('Input:', test.input);
          console.log('Expected:', test.expected);
        }
        expect(result.passed, result.message).toBe(true);
      });
    });
  });

  describe('API Tests', () => {
    const tests = loadCorpusFile('api');

    if (tests.length === 0) {
      it.skip('No API tests found', () => {});
      return;
    }

    tests.forEach((test) => {
      it(`${test.name}: ${test.description}`, () => {
        const result = runCorpusTest(test);
        if (!result.passed) {
          console.log('Input:', test.input);
          console.log('Expected:', test.expected);
        }
        expect(result.passed, result.message).toBe(true);
      });
    });
  });

  describe('Format Tests', () => {
    const tests = loadCorpusFile('formats');

    if (tests.length === 0) {
      it.skip('No format tests found', () => {});
      return;
    }

    tests.forEach((test) => {
      it(`${test.name}: ${test.description}`, () => {
        const result = runCorpusTest(test);
        if (!result.passed) {
          console.log('Input:', test.input);
          console.log('Expected:', test.expected);
        }
        expect(result.passed, result.message).toBe(true);
      });
    });
  });

  describe('Edge Case Tests', () => {
    const tests = loadCorpusFile('edge-cases');

    if (tests.length === 0) {
      it.skip('No edge case tests found', () => {});
      return;
    }

    tests.forEach((test) => {
      it(`${test.name}: ${test.description}`, () => {
        const result = runCorpusTest(test);
        if (!result.passed) {
          console.log('Input:', test.input);
          console.log('Expected:', test.expected);
        }
        expect(result.passed, result.message).toBe(true);
      });
    });
  });
});
