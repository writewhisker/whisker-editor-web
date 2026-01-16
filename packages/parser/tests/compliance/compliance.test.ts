/**
 * WLS Compliance Test Suite
 *
 * Runs all compliance tests to verify WLS specification compliance.
 * Tests are organized by WLS chapter and cover all language features.
 *
 * Reference: WLS Chapter 14 - Phase 13 Deterministic Verification
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runSingleTest, runComplianceTests, formatResults } from './runner';

const COMPLIANCE_DIR = __dirname;

// =============================================================================
// Chapter 3: Syntax Tests
// =============================================================================

describe('WLS Compliance - Chapter 3: Syntax', () => {
  const chapterDir = path.join(COMPLIANCE_DIR, 'chapter3_syntax');

  if (fs.existsSync(chapterDir)) {
    const testFiles = fs.readdirSync(chapterDir).filter(f => f.endsWith('.ws'));

    for (const testFile of testFiles) {
      const testName = testFile.replace('.ws', '').replace(/_/g, ' ');
      const inputPath = path.join(chapterDir, testFile);
      const expectedPath = inputPath.replace('.ws', '.expected.json');

      it(testName, () => {
        const result = runSingleTest(inputPath, expectedPath);
        if (!result.passed) {
          console.log(`Failed: ${result.error}`);
          if (result.expected) console.log(`Expected: ${JSON.stringify(result.expected)}`);
          if (result.actual) console.log(`Actual: ${JSON.stringify(result.actual)}`);
        }
        expect(result.passed).toBe(true);
      });
    }
  }
});

// =============================================================================
// Chapter 4: Variables Tests
// =============================================================================

describe('WLS Compliance - Chapter 4: Variables', () => {
  const chapterDir = path.join(COMPLIANCE_DIR, 'chapter4_variables');

  if (fs.existsSync(chapterDir)) {
    const testFiles = fs.readdirSync(chapterDir).filter(f => f.endsWith('.ws'));

    for (const testFile of testFiles) {
      const testName = testFile.replace('.ws', '').replace(/_/g, ' ');
      const inputPath = path.join(chapterDir, testFile);
      const expectedPath = inputPath.replace('.ws', '.expected.json');

      it(testName, () => {
        const result = runSingleTest(inputPath, expectedPath);
        if (!result.passed) {
          console.log(`Failed: ${result.error}`);
          if (result.expected) console.log(`Expected: ${JSON.stringify(result.expected)}`);
          if (result.actual) console.log(`Actual: ${JSON.stringify(result.actual)}`);
        }
        expect(result.passed).toBe(true);
      });
    }
  }
});

// =============================================================================
// Chapter 5: Control Flow Tests
// =============================================================================

describe('WLS Compliance - Chapter 5: Control Flow', () => {
  const chapterDir = path.join(COMPLIANCE_DIR, 'chapter5_control_flow');

  if (fs.existsSync(chapterDir)) {
    const testFiles = fs.readdirSync(chapterDir).filter(f => f.endsWith('.ws'));

    if (testFiles.length === 0) {
      it.skip('no tests yet', () => {});
    }

    for (const testFile of testFiles) {
      const testName = testFile.replace('.ws', '').replace(/_/g, ' ');
      const inputPath = path.join(chapterDir, testFile);
      const expectedPath = inputPath.replace('.ws', '.expected.json');

      it(testName, () => {
        const result = runSingleTest(inputPath, expectedPath);
        if (!result.passed) {
          console.log(`Failed: ${result.error}`);
          if (result.expected) console.log(`Expected: ${JSON.stringify(result.expected)}`);
          if (result.actual) console.log(`Actual: ${JSON.stringify(result.actual)}`);
        }
        expect(result.passed).toBe(true);
      });
    }
  } else {
    it.skip('chapter5_control_flow directory not found', () => {});
  }
});

// =============================================================================
// Chapter 6: Choices Tests
// =============================================================================

describe('WLS Compliance - Chapter 6: Choices', () => {
  const chapterDir = path.join(COMPLIANCE_DIR, 'chapter6_choices');

  if (fs.existsSync(chapterDir)) {
    const testFiles = fs.readdirSync(chapterDir).filter(f => f.endsWith('.ws'));

    for (const testFile of testFiles) {
      const testName = testFile.replace('.ws', '').replace(/_/g, ' ');
      const inputPath = path.join(chapterDir, testFile);
      const expectedPath = inputPath.replace('.ws', '.expected.json');

      it(testName, () => {
        const result = runSingleTest(inputPath, expectedPath);
        if (!result.passed) {
          console.log(`Failed: ${result.error}`);
          if (result.expected) console.log(`Expected: ${JSON.stringify(result.expected)}`);
          if (result.actual) console.log(`Actual: ${JSON.stringify(result.actual)}`);
        }
        expect(result.passed).toBe(true);
      });
    }
  }
});

// =============================================================================
// Chapter 7: Runtime Tests
// =============================================================================

describe('WLS Compliance - Chapter 7: Runtime', () => {
  const chapterDir = path.join(COMPLIANCE_DIR, 'chapter7_runtime');

  if (fs.existsSync(chapterDir)) {
    const testFiles = fs.readdirSync(chapterDir).filter(f => f.endsWith('.ws'));

    for (const testFile of testFiles) {
      const testName = testFile.replace('.ws', '').replace(/_/g, ' ');
      const inputPath = path.join(chapterDir, testFile);
      const expectedPath = inputPath.replace('.ws', '.expected.json');

      it(testName, () => {
        const result = runSingleTest(inputPath, expectedPath);
        if (!result.passed) {
          console.log(`Failed: ${result.error}`);
          if (result.expected) console.log(`Expected: ${JSON.stringify(result.expected)}`);
          if (result.actual) console.log(`Actual: ${JSON.stringify(result.actual)}`);
        }
        expect(result.passed).toBe(true);
      });
    }
  }
});

// =============================================================================
// Chapter 12: Modules Tests
// =============================================================================

describe('WLS Compliance - Chapter 12: Modules', () => {
  const chapterDir = path.join(COMPLIANCE_DIR, 'chapter12_modules');

  if (fs.existsSync(chapterDir)) {
    const testFiles = fs.readdirSync(chapterDir).filter(f => f.endsWith('.ws'));

    for (const testFile of testFiles) {
      const testName = testFile.replace('.ws', '').replace(/_/g, ' ');
      const inputPath = path.join(chapterDir, testFile);
      const expectedPath = inputPath.replace('.ws', '.expected.json');

      it(testName, () => {
        const result = runSingleTest(inputPath, expectedPath);
        if (!result.passed) {
          console.log(`Failed: ${result.error}`);
          if (result.expected) console.log(`Expected: ${JSON.stringify(result.expected)}`);
          if (result.actual) console.log(`Actual: ${JSON.stringify(result.actual)}`);
        }
        expect(result.passed).toBe(true);
      });
    }
  }
});

// =============================================================================
// Chapter 13: Presentation Tests
// =============================================================================

describe('WLS Compliance - Chapter 13: Presentation', () => {
  const chapterDir = path.join(COMPLIANCE_DIR, 'chapter13_presentation');

  if (fs.existsSync(chapterDir)) {
    const testFiles = fs.readdirSync(chapterDir).filter(f => f.endsWith('.ws'));

    for (const testFile of testFiles) {
      const testName = testFile.replace('.ws', '').replace(/_/g, ' ');
      const inputPath = path.join(chapterDir, testFile);
      const expectedPath = inputPath.replace('.ws', '.expected.json');

      it(testName, () => {
        const result = runSingleTest(inputPath, expectedPath);
        if (!result.passed) {
          console.log(`Failed: ${result.error}`);
          if (result.expected) console.log(`Expected: ${JSON.stringify(result.expected)}`);
          if (result.actual) console.log(`Actual: ${JSON.stringify(result.actual)}`);
        }
        expect(result.passed).toBe(true);
      });
    }
  }
});

// =============================================================================
// Full Compliance Report
// =============================================================================

describe('WLS Compliance - Full Report', () => {
  it('should generate compliance report', async () => {
    const results = await runComplianceTests(COMPLIANCE_DIR);
    const report = formatResults(results);
    console.log('\n' + report);

    // Print summary
    console.log(`\n[Compliance Summary] ${results.passed}/${results.total} tests passed (${((results.passed / results.total) * 100).toFixed(1)}%)`);

    // This test tracks overall compliance but doesn't fail the suite
    // Individual chapter tests handle pass/fail
  });
});
