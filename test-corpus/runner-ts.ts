/**
 * Cross-Platform Test Runner for TypeScript (whisker-editor-web)
 *
 * Runs YAML test cases against the TypeScript LuaEngine implementation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { LuaEngine } from '../packages/scripting/src/LuaEngine';
import {
  TestCase,
  TestResult,
  TestSuiteResult,
  Assertion,
  AssertionResult,
  VariableAssertion,
  OutputAssertion,
  ErrorAssertion,
  ListAssertion,
} from './types';

/**
 * Parse a YAML test file
 */
function parseTestFile(filePath: string): TestCase {
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content) as TestCase;
}

/**
 * Find all YAML test files in a directory
 */
function findTestFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Execute a single test case
 */
function runTest(testCase: TestCase): TestResult {
  const startTime = Date.now();
  const assertionResults: AssertionResult[] = [];
  let testError: string | undefined;

  // Check if test should be skipped for TypeScript
  if (testCase.platforms?.typescript?.skip) {
    return {
      name: testCase.name,
      passed: true,
      duration: 0,
      assertions: [],
      error: `Skipped: ${testCase.platforms.typescript.reason || 'platform skip'}`,
    };
  }

  try {
    // Create fresh engine
    const engine = new LuaEngine();

    // Execute the WLS code
    const result = engine.execute(testCase.wls);

    // Check each assertion
    for (const assertion of testCase.assertions) {
      const assertionResult = checkAssertion(engine, result, assertion);
      assertionResults.push(assertionResult);
    }
  } catch (error) {
    testError = error instanceof Error ? error.message : String(error);
  }

  const duration = Date.now() - startTime;
  const passed = !testError && assertionResults.every((r) => r.passed);

  return {
    name: testCase.name,
    passed,
    duration,
    assertions: assertionResults,
    error: testError,
  };
}

/**
 * Check a single assertion
 */
function checkAssertion(
  engine: LuaEngine,
  result: { success: boolean; errors: string[]; output: string[] },
  assertion: Assertion
): AssertionResult {
  // Variable assertion
  if ('variable' in assertion) {
    return checkVariableAssertion(engine, assertion as VariableAssertion);
  }

  // Output assertion
  if ('output' in assertion) {
    return checkOutputAssertion(result.output, assertion as OutputAssertion);
  }

  // Error assertion
  if ('error' in assertion) {
    return checkErrorAssertion(result.errors, assertion as ErrorAssertion);
  }

  // List assertion
  if ('list' in assertion) {
    return checkListAssertion(engine, assertion as ListAssertion);
  }

  return {
    assertion,
    passed: false,
    message: 'Unknown assertion type',
  };
}

/**
 * Check variable assertion
 */
function checkVariableAssertion(
  engine: LuaEngine,
  assertion: VariableAssertion
): AssertionResult {
  const actual = engine.getVariable(assertion.variable);

  if (assertion.equals !== undefined) {
    const passed = actual === assertion.equals;
    return {
      assertion,
      passed,
      expected: assertion.equals,
      actual,
      message: passed ? undefined : `Variable ${assertion.variable}: expected ${assertion.equals}, got ${actual}`,
    };
  }

  if (assertion.type !== undefined) {
    const actualType = typeof actual;
    const passed = actualType === assertion.type;
    return {
      assertion,
      passed,
      expected: assertion.type,
      actual: actualType,
      message: passed ? undefined : `Variable ${assertion.variable}: expected type ${assertion.type}, got ${actualType}`,
    };
  }

  if (assertion.greaterThan !== undefined) {
    const passed = typeof actual === 'number' && actual > assertion.greaterThan;
    return {
      assertion,
      passed,
      expected: `> ${assertion.greaterThan}`,
      actual,
    };
  }

  if (assertion.lessThan !== undefined) {
    const passed = typeof actual === 'number' && actual < assertion.lessThan;
    return {
      assertion,
      passed,
      expected: `< ${assertion.lessThan}`,
      actual,
    };
  }

  return {
    assertion,
    passed: actual !== undefined && actual !== null,
    actual,
    message: 'Variable exists check',
  };
}

/**
 * Check output assertion
 */
function checkOutputAssertion(
  output: string[],
  assertion: OutputAssertion
): AssertionResult {
  const outputText = output.join('\n');

  if (assertion.output.contains) {
    const passed = outputText.includes(assertion.output.contains);
    return {
      assertion,
      passed,
      expected: assertion.output.contains,
      actual: outputText,
      message: passed ? undefined : `Output does not contain "${assertion.output.contains}"`,
    };
  }

  if (assertion.output.equals) {
    const passed = outputText.trim() === assertion.output.equals.trim();
    return {
      assertion,
      passed,
      expected: assertion.output.equals,
      actual: outputText,
    };
  }

  if (assertion.output.matches) {
    const regex = new RegExp(assertion.output.matches);
    const passed = regex.test(outputText);
    return {
      assertion,
      passed,
      expected: assertion.output.matches,
      actual: outputText,
    };
  }

  return { assertion, passed: true };
}

/**
 * Check error assertion
 */
function checkErrorAssertion(
  errors: string[],
  assertion: ErrorAssertion
): AssertionResult {
  const errorText = errors.join('\n');

  if (assertion.error.contains) {
    const passed = errorText.includes(assertion.error.contains);
    return {
      assertion,
      passed,
      expected: assertion.error.contains,
      actual: errorText,
    };
  }

  if (assertion.error.code) {
    const passed = errorText.includes(assertion.error.code);
    return {
      assertion,
      passed,
      expected: assertion.error.code,
      actual: errorText,
    };
  }

  // Just check that an error occurred
  return {
    assertion,
    passed: errors.length > 0,
    actual: errors.length,
    message: 'Expected an error to occur',
  };
}

/**
 * Check list assertion
 */
function checkListAssertion(
  engine: LuaEngine,
  assertion: ListAssertion
): AssertionResult {
  // Lists are accessed through the engine's variable system
  // This is a simplified check - real implementation would use ListRegistry
  const listVar = engine.getVariable(assertion.list);

  if (assertion.isEmpty !== undefined) {
    const isEmpty = listVar === null || listVar === undefined ||
      (Array.isArray(listVar) && listVar.length === 0);
    return {
      assertion,
      passed: isEmpty === assertion.isEmpty,
      expected: assertion.isEmpty ? 'empty' : 'not empty',
      actual: listVar,
    };
  }

  return { assertion, passed: true };
}

/**
 * Run all tests in a directory
 */
function runTestSuite(testDir: string): TestSuiteResult {
  const startTime = Date.now();
  const testFiles = findTestFiles(testDir);
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  console.log(`\nRunning ${testFiles.length} test files from ${testDir}\n`);

  for (const file of testFiles) {
    try {
      const testCase = parseTestFile(file);
      const result = runTest(testCase);
      results.push(result);

      if (result.error?.startsWith('Skipped')) {
        skipped++;
        console.log(`  SKIP ${result.name}`);
      } else if (result.passed) {
        passed++;
        console.log(`  PASS ${result.name}`);
      } else {
        failed++;
        console.log(`  FAIL ${result.name}`);
        if (result.error) {
          console.log(`       Error: ${result.error}`);
        }
        for (const ar of result.assertions.filter((a) => !a.passed)) {
          console.log(`       - ${ar.message || JSON.stringify(ar)}`);
        }
      }
    } catch (error) {
      failed++;
      console.log(`  FAIL ${file}: ${error instanceof Error ? error.message : error}`);
    }
  }

  const duration = Date.now() - startTime;

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`Duration: ${duration}ms`);
  console.log(`${'='.repeat(50)}\n`);

  return {
    total: testFiles.length,
    passed,
    failed,
    skipped,
    duration,
    results,
  };
}

/**
 * Main entry point
 */
function main() {
  const testDir = process.argv[2] || path.join(__dirname, '.');
  const result = runTestSuite(testDir);

  // Write results to JSON for comparison
  const outputPath = path.join(__dirname, 'results-typescript.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Results written to ${outputPath}`);

  // Exit with error code if any tests failed
  process.exit(result.failed > 0 ? 1 : 0);
}

// Export for programmatic use
export { runTestSuite, runTest, parseTestFile };

// Run if called directly
if (require.main === module) {
  main();
}
