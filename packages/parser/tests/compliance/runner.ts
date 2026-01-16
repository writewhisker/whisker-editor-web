/**
 * Compliance Test Runner
 *
 * Runs deterministic compliance tests to verify WLS specification compliance.
 * Each test has a .ws input file and .expected.json with exact expected output.
 *
 * Reference: WLS Chapter 14 - Phase 13 Deterministic Verification
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from '../../src/parser';
import type { StoryNode, PassageNode, ChoiceNode, ContentNode } from '../../src/ast';

// =============================================================================
// Types
// =============================================================================

interface ExpectedOutput {
  passages?: ExpectedPassage[];
  errors?: ExpectedError[];
  metadata?: Record<string, any>;
  variables?: ExpectedVariable[];
}

interface ExpectedPassage {
  name: string;
  content?: string;
  tags?: string[];
  choices?: ExpectedChoice[];
}

interface ExpectedChoice {
  text?: string;
  target?: string;
  condition?: string;
}

interface ExpectedError {
  code?: string;
  message?: string;
  line?: number;
}

interface ExpectedVariable {
  name: string;
  type?: string;
  value?: any;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  expected?: any;
  actual?: any;
}

interface ComplianceResults {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

// =============================================================================
// Test Runner
// =============================================================================

/**
 * Run all compliance tests in a directory
 */
export async function runComplianceTests(baseDir: string): Promise<ComplianceResults> {
  const results: ComplianceResults = {
    total: 0,
    passed: 0,
    failed: 0,
    results: [],
  };

  // Find all .ws test files
  const chapters = fs.readdirSync(baseDir).filter(f =>
    fs.statSync(path.join(baseDir, f)).isDirectory()
  );

  for (const chapter of chapters) {
    const chapterDir = path.join(baseDir, chapter);
    const testFiles = fs.readdirSync(chapterDir).filter(f => f.endsWith('.ws'));

    for (const testFile of testFiles) {
      const testPath = path.join(chapterDir, testFile);
      const expectedPath = testPath.replace('.ws', '.expected.json');

      if (!fs.existsSync(expectedPath)) {
        results.results.push({
          name: `${chapter}/${testFile}`,
          passed: false,
          error: 'Missing expected.json file',
        });
        results.failed++;
        results.total++;
        continue;
      }

      const result = runSingleTest(testPath, expectedPath);
      result.name = `${chapter}/${testFile}`;
      results.results.push(result);
      results.total++;

      if (result.passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    }
  }

  return results;
}

/**
 * Run a single compliance test
 */
export function runSingleTest(inputPath: string, expectedPath: string): TestResult {
  try {
    const input = fs.readFileSync(inputPath, 'utf-8');
    const expected: ExpectedOutput = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));

    // Parse the input
    const parseResult = parse(input);
    const actual = extractOutput(parseResult.ast, parseResult.errors);

    // Compare
    const comparison = compareOutputs(expected, actual);

    if (comparison.match) {
      return { name: '', passed: true };
    } else {
      return {
        name: '',
        passed: false,
        error: comparison.error,
        expected: comparison.expected,
        actual: comparison.actual,
      };
    }
  } catch (err) {
    return {
      name: '',
      passed: false,
      error: `Exception: ${(err as Error).message}`,
    };
  }
}

/**
 * Extract output from parse result for comparison
 */
function extractOutput(ast: StoryNode | null, errors: any[]): ExpectedOutput {
  const output: ExpectedOutput = {};

  // Extract errors
  if (errors.length > 0) {
    output.errors = errors.map(e => ({
      code: e.code,
      message: e.message,
      line: e.location?.start?.line,
    }));
  }

  if (!ast) return output;

  // Extract passages
  output.passages = ast.passages.map(p => {
    const passage: ExpectedPassage = {
      name: p.name,
    };

    // Extract text content
    const textContent = p.content
      .filter(n => n.type === 'text')
      .map(n => (n as any).value || '')
      .join('');
    if (textContent) {
      passage.content = textContent.trim();
    }

    // Extract tags
    if (p.tags.length > 0) {
      passage.tags = p.tags;
    }

    // Extract choices
    const choices = p.content.filter(n => n.type === 'choice') as ChoiceNode[];
    if (choices.length > 0) {
      passage.choices = choices.map(c => {
        const choice: ExpectedChoice = {};
        if (c.text) choice.text = c.text;
        if (c.target) choice.target = c.target;
        return choice;
      });
    }

    return passage;
  });

  // Extract variables
  if (ast.variables && ast.variables.length > 0) {
    output.variables = ast.variables.map(v => ({
      name: v.name,
      type: (v.initialValue as any)?.type,
      value: (v.initialValue as any)?.value,
    }));
  }

  return output;
}

/**
 * Compare expected and actual outputs
 */
function compareOutputs(
  expected: ExpectedOutput,
  actual: ExpectedOutput
): { match: boolean; error?: string; expected?: any; actual?: any } {
  // Compare errors
  if (expected.errors) {
    if (!actual.errors || actual.errors.length !== expected.errors.length) {
      return {
        match: false,
        error: 'Error count mismatch',
        expected: expected.errors,
        actual: actual.errors,
      };
    }

    for (let i = 0; i < expected.errors.length; i++) {
      const exp = expected.errors[i];
      const act = actual.errors![i];

      if (exp.code && exp.code !== act.code) {
        return {
          match: false,
          error: `Error code mismatch at index ${i}`,
          expected: exp.code,
          actual: act.code,
        };
      }

      if (exp.line && exp.line !== act.line) {
        return {
          match: false,
          error: `Error line mismatch at index ${i}`,
          expected: exp.line,
          actual: act.line,
        };
      }

      if (exp.message && !act.message?.includes(exp.message)) {
        return {
          match: false,
          error: `Error message mismatch at index ${i}`,
          expected: exp.message,
          actual: act.message,
        };
      }
    }
  }

  // Compare passages
  if (expected.passages) {
    if (!actual.passages || actual.passages.length !== expected.passages.length) {
      return {
        match: false,
        error: 'Passage count mismatch',
        expected: expected.passages?.length || 0,
        actual: actual.passages?.length || 0,
      };
    }

    for (let i = 0; i < expected.passages.length; i++) {
      const exp = expected.passages[i];
      const act = actual.passages![i];

      if (exp.name !== act.name) {
        return {
          match: false,
          error: `Passage name mismatch at index ${i}`,
          expected: exp.name,
          actual: act.name,
        };
      }

      if (exp.content !== undefined && exp.content !== act.content) {
        return {
          match: false,
          error: `Passage content mismatch for "${exp.name}"`,
          expected: exp.content,
          actual: act.content,
        };
      }

      if (exp.tags) {
        if (!act.tags || exp.tags.length !== act.tags.length) {
          return {
            match: false,
            error: `Passage tags mismatch for "${exp.name}"`,
            expected: exp.tags,
            actual: act.tags,
          };
        }
        for (const tag of exp.tags) {
          if (!act.tags.includes(tag)) {
            return {
              match: false,
              error: `Missing tag "${tag}" in passage "${exp.name}"`,
              expected: exp.tags,
              actual: act.tags,
            };
          }
        }
      }

      if (exp.choices) {
        if (!act.choices || exp.choices.length !== act.choices.length) {
          return {
            match: false,
            error: `Choice count mismatch for passage "${exp.name}"`,
            expected: exp.choices.length,
            actual: act.choices?.length || 0,
          };
        }

        for (let j = 0; j < exp.choices.length; j++) {
          const expChoice = exp.choices[j];
          const actChoice = act.choices![j];

          if (expChoice.text && expChoice.text !== actChoice.text) {
            return {
              match: false,
              error: `Choice text mismatch at passage "${exp.name}" choice ${j}`,
              expected: expChoice.text,
              actual: actChoice.text,
            };
          }

          if (expChoice.target && expChoice.target !== actChoice.target) {
            return {
              match: false,
              error: `Choice target mismatch at passage "${exp.name}" choice ${j}`,
              expected: expChoice.target,
              actual: actChoice.target,
            };
          }
        }
      }
    }
  }

  // Compare variables
  if (expected.variables) {
    if (!actual.variables || actual.variables.length !== expected.variables.length) {
      return {
        match: false,
        error: 'Variable count mismatch',
        expected: expected.variables.length,
        actual: actual.variables?.length || 0,
      };
    }

    for (const expVar of expected.variables) {
      const actVar = actual.variables!.find(v => v.name === expVar.name);
      if (!actVar) {
        return {
          match: false,
          error: `Missing variable "${expVar.name}"`,
          expected: expVar,
          actual: null,
        };
      }

      if (expVar.type && expVar.type !== actVar.type) {
        return {
          match: false,
          error: `Variable type mismatch for "${expVar.name}"`,
          expected: expVar.type,
          actual: actVar.type,
        };
      }

      if (expVar.value !== undefined && expVar.value !== actVar.value) {
        return {
          match: false,
          error: `Variable value mismatch for "${expVar.name}"`,
          expected: expVar.value,
          actual: actVar.value,
        };
      }
    }
  }

  return { match: true };
}

/**
 * Format test results as a report
 */
export function formatResults(results: ComplianceResults): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('WLS Compliance Test Results');
  lines.push('='.repeat(60));
  lines.push('');

  // Summary
  lines.push(`Total: ${results.total}`);
  lines.push(`Passed: ${results.passed}`);
  lines.push(`Failed: ${results.failed}`);
  lines.push(`Pass Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  lines.push('');

  // Failed tests
  const failed = results.results.filter(r => !r.passed);
  if (failed.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('Failed Tests:');
    lines.push('-'.repeat(60));

    for (const test of failed) {
      lines.push(`\n${test.name}:`);
      lines.push(`  Error: ${test.error}`);
      if (test.expected !== undefined) {
        lines.push(`  Expected: ${JSON.stringify(test.expected)}`);
      }
      if (test.actual !== undefined) {
        lines.push(`  Actual: ${JSON.stringify(test.actual)}`);
      }
    }
  }

  // Passed tests (summary only)
  const passed = results.results.filter(r => r.passed);
  if (passed.length > 0) {
    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('Passed Tests:');
    lines.push('-'.repeat(60));
    for (const test of passed) {
      lines.push(`  ✓ ${test.name}`);
    }
  }

  return lines.join('\n');
}

// Export for vitest
export { ExpectedOutput, ExpectedPassage, ExpectedChoice, ExpectedError, ExpectedVariable };
