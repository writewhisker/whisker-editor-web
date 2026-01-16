/**
 * Cross-Platform Output Verification
 *
 * Platform-agnostic verification tools for ensuring consistent
 * parser output across different environments and runtime configurations.
 *
 * Reference: WLS Chapter 14 - Phase 13B Cross-Platform Verification
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface CanonicalOutput {
  /** Sorted, normalized passages */
  passages: CanonicalPassage[];
  /** Normalized errors */
  errors: CanonicalError[];
  /** Platform-independent hash */
  hash: string;
  /** Verification timestamp */
  timestamp: string;
}

export interface CanonicalPassage {
  name: string;
  tags: string[];
  contentHash: string;
  choiceCount: number;
  linkCount: number;
}

export interface CanonicalError {
  code: string;
  line: number;
  column: number;
  messageHash: string;
}

export interface PlatformInfo {
  os: string;
  nodeVersion: string;
  architecture: string;
  timezone: string;
}

export interface VerificationReport {
  platform: PlatformInfo;
  testFile: string;
  canonical: CanonicalOutput;
  matches: boolean;
  differences?: string[];
}

// =============================================================================
// Canonical Serialization
// =============================================================================

/**
 * Normalize and canonicalize parser output for cross-platform comparison.
 * This ensures identical inputs produce identical outputs regardless of platform.
 */
export function canonicalize(parseResult: any): CanonicalOutput {
  const passages = normalizePassages(parseResult.ast?.passages || []);
  const errors = normalizeErrors(parseResult.errors || []);

  // Create deterministic hash of normalized content
  const contentString = JSON.stringify({ passages, errors }, null, 0);
  const hash = crypto.createHash('sha256').update(contentString).digest('hex').slice(0, 16);

  return {
    passages,
    errors,
    hash,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Normalize passages for cross-platform comparison
 */
function normalizePassages(passages: any[]): CanonicalPassage[] {
  return passages
    .map(p => ({
      name: String(p.name || ''),
      tags: (p.tags || []).sort(),
      contentHash: hashContent(p.content || []),
      choiceCount: countNodes(p.content, 'choice'),
      linkCount: countNodes(p.content, 'link'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Normalize errors for cross-platform comparison
 */
function normalizeErrors(errors: any[]): CanonicalError[] {
  return errors
    .map(e => ({
      code: String(e.code || 'UNKNOWN'),
      line: e.location?.start?.line || 0,
      column: e.location?.start?.column || 0,
      messageHash: crypto.createHash('sha256')
        .update(String(e.message || ''))
        .digest('hex')
        .slice(0, 8),
    }))
    .sort((a, b) => a.line - b.line || a.column - b.column);
}

/**
 * Create a hash of content nodes for comparison
 */
function hashContent(content: any[]): string {
  const textValues: string[] = [];

  function extractText(nodes: any[]) {
    for (const node of nodes) {
      if (node.type === 'text') {
        textValues.push(String(node.value || ''));
      }
      if (node.content && Array.isArray(node.content)) {
        extractText(node.content);
      }
    }
  }

  extractText(content);
  const combined = textValues.join('|');
  return crypto.createHash('sha256').update(combined).digest('hex').slice(0, 12);
}

/**
 * Count nodes of a specific type
 */
function countNodes(content: any[], type: string): number {
  let count = 0;

  function countRecursive(nodes: any[]) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (node.type === type) count++;
      if (node.content && Array.isArray(node.content)) {
        countRecursive(node.content);
      }
    }
  }

  countRecursive(content);
  return count;
}

// =============================================================================
// Platform Detection
// =============================================================================

/**
 * Get information about the current platform
 */
export function getPlatformInfo(): PlatformInfo {
  return {
    os: process.platform,
    nodeVersion: process.version,
    architecture: process.arch,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// =============================================================================
// Snapshot Management
// =============================================================================

const SNAPSHOT_DIR = '.snapshots';

/**
 * Save a canonical snapshot for a test
 */
export function saveSnapshot(
  testName: string,
  canonical: CanonicalOutput,
  baseDir: string
): string {
  const snapshotDir = path.join(baseDir, SNAPSHOT_DIR);
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const snapshotPath = path.join(snapshotDir, `${testName}.snapshot.json`);
  const snapshotContent = JSON.stringify(canonical, null, 2);
  fs.writeFileSync(snapshotPath, snapshotContent, 'utf-8');

  return snapshotPath;
}

/**
 * Load a saved snapshot
 */
export function loadSnapshot(
  testName: string,
  baseDir: string
): CanonicalOutput | null {
  const snapshotPath = path.join(baseDir, SNAPSHOT_DIR, `${testName}.snapshot.json`);

  if (!fs.existsSync(snapshotPath)) {
    return null;
  }

  const content = fs.readFileSync(snapshotPath, 'utf-8');
  return JSON.parse(content) as CanonicalOutput;
}

/**
 * Compare current output against saved snapshot
 */
export function compareWithSnapshot(
  testName: string,
  current: CanonicalOutput,
  baseDir: string
): { matches: boolean; differences?: string[] } {
  const saved = loadSnapshot(testName, baseDir);

  if (!saved) {
    return { matches: false, differences: ['No snapshot found'] };
  }

  const differences: string[] = [];

  // Compare hashes
  if (saved.hash !== current.hash) {
    differences.push(`Hash mismatch: expected ${saved.hash}, got ${current.hash}`);
  }

  // Compare passage count
  if (saved.passages.length !== current.passages.length) {
    differences.push(
      `Passage count: expected ${saved.passages.length}, got ${current.passages.length}`
    );
  }

  // Compare error count
  if (saved.errors.length !== current.errors.length) {
    differences.push(
      `Error count: expected ${saved.errors.length}, got ${current.errors.length}`
    );
  }

  // Compare individual passages
  const savedPassageMap = new Map(saved.passages.map(p => [p.name, p]));
  for (const passage of current.passages) {
    const savedPassage = savedPassageMap.get(passage.name);
    if (!savedPassage) {
      differences.push(`New passage: ${passage.name}`);
    } else if (savedPassage.contentHash !== passage.contentHash) {
      differences.push(`Content changed in passage: ${passage.name}`);
    }
  }

  return {
    matches: differences.length === 0,
    differences: differences.length > 0 ? differences : undefined,
  };
}

// =============================================================================
// Verification Runner
// =============================================================================

/**
 * Run cross-platform verification for a test file
 */
export function verifyTest(
  inputPath: string,
  parse: (input: string) => any,
  baseDir: string
): VerificationReport {
  const input = fs.readFileSync(inputPath, 'utf-8');
  const parseResult = parse(input);
  const canonical = canonicalize(parseResult);

  const testName = path.basename(inputPath, '.ws');
  const comparison = compareWithSnapshot(testName, canonical, baseDir);

  return {
    platform: getPlatformInfo(),
    testFile: inputPath,
    canonical,
    matches: comparison.matches,
    differences: comparison.differences,
  };
}

/**
 * Generate verification report for all tests in a directory
 */
export async function generateVerificationReport(
  testDir: string,
  parse: (input: string) => any
): Promise<{
  platform: PlatformInfo;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: VerificationReport[];
}> {
  const platform = getPlatformInfo();
  const results: VerificationReport[] = [];

  // Find all .ws test files
  const chapters = fs.readdirSync(testDir).filter(f => {
    const fullPath = path.join(testDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  for (const chapter of chapters) {
    const chapterDir = path.join(testDir, chapter);
    const testFiles = fs.readdirSync(chapterDir).filter(f => f.endsWith('.ws'));

    for (const testFile of testFiles) {
      const inputPath = path.join(chapterDir, testFile);
      const report = verifyTest(inputPath, parse, testDir);
      results.push(report);
    }
  }

  const passedTests = results.filter(r => r.matches).length;

  return {
    platform,
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    results,
  };
}

// =============================================================================
// CI/CD Integration
// =============================================================================

/**
 * Format verification results for CI output
 */
export function formatCIOutput(report: Awaited<ReturnType<typeof generateVerificationReport>>): string {
  const lines: string[] = [];

  lines.push('# Cross-Platform Verification Report');
  lines.push('');
  lines.push('## Platform Information');
  lines.push(`- OS: ${report.platform.os}`);
  lines.push(`- Node: ${report.platform.nodeVersion}`);
  lines.push(`- Arch: ${report.platform.architecture}`);
  lines.push(`- TZ: ${report.platform.timezone}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Total Tests: ${report.totalTests}`);
  lines.push(`- Passed: ${report.passedTests}`);
  lines.push(`- Failed: ${report.failedTests}`);
  lines.push(`- Pass Rate: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`);
  lines.push('');

  if (report.failedTests > 0) {
    lines.push('## Failed Tests');
    for (const result of report.results) {
      if (!result.matches) {
        lines.push(`- ${result.testFile}`);
        if (result.differences) {
          for (const diff of result.differences) {
            lines.push(`  - ${diff}`);
          }
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * Exit code for CI based on verification results
 */
export function getCIExitCode(report: Awaited<ReturnType<typeof generateVerificationReport>>): number {
  return report.failedTests === 0 ? 0 : 1;
}
