/**
 * WLS Final Certification
 *
 * Comprehensive certification system that validates complete WLS
 * specification compliance and generates certification reports.
 *
 * Reference: WLS Chapter 14 - Phase 13C Final Certification
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { runComplianceTests, ComplianceResults } from './runner';
import { generateVerificationReport, getPlatformInfo, PlatformInfo } from './platform';
import { parse } from '../../src/parser';

// =============================================================================
// Types
// =============================================================================

export interface CertificationLevel {
  name: string;
  minPassRate: number;
  description: string;
}

export interface ChapterCoverage {
  chapter: string;
  totalTests: number;
  passedTests: number;
  passRate: number;
  status: 'PASS' | 'PARTIAL' | 'FAIL';
}

export interface CertificationReport {
  /** Report version */
  version: string;
  /** Generation timestamp */
  timestamp: string;
  /** Platform information */
  platform: PlatformInfo;
  /** Implementation being certified */
  implementation: {
    name: string;
    version: string;
    repository: string;
  };
  /** Overall certification status */
  status: 'CERTIFIED' | 'PARTIAL' | 'NOT_CERTIFIED';
  /** Certification level achieved */
  certificationLevel: CertificationLevel;
  /** Overall statistics */
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
  };
  /** Coverage by WLS chapter */
  chapterCoverage: ChapterCoverage[];
  /** Report signature for verification */
  signature: string;
}

// =============================================================================
// Certification Levels
// =============================================================================

export const CERTIFICATION_LEVELS: CertificationLevel[] = [
  {
    name: 'PLATINUM',
    minPassRate: 100,
    description: 'Complete WLS 2.0 specification compliance',
  },
  {
    name: 'GOLD',
    minPassRate: 95,
    description: 'Near-complete WLS compliance with minor gaps',
  },
  {
    name: 'SILVER',
    minPassRate: 85,
    description: 'Strong WLS compliance with some limitations',
  },
  {
    name: 'BRONZE',
    minPassRate: 70,
    description: 'Basic WLS compliance with known limitations',
  },
  {
    name: 'NONE',
    minPassRate: 0,
    description: 'Does not meet minimum certification requirements',
  },
];

// =============================================================================
// Certification Engine
// =============================================================================

/**
 * Run full WLS certification and generate report
 */
export async function certify(
  testDir: string,
  implementationInfo?: {
    name?: string;
    version?: string;
    repository?: string;
  }
): Promise<CertificationReport> {
  // Run compliance tests
  const complianceResults = await runComplianceTests(testDir);

  // Calculate chapter coverage
  const chapterCoverage = calculateChapterCoverage(complianceResults);

  // Determine certification level
  const passRate = (complianceResults.passed / complianceResults.total) * 100;
  const certificationLevel = determineCertificationLevel(passRate);

  // Determine overall status
  const status = determineStatus(passRate);

  // Generate report
  const report: CertificationReport = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    platform: getPlatformInfo(),
    implementation: {
      name: implementationInfo?.name || 'whisker-parser',
      version: implementationInfo?.version || readPackageVersion(),
      repository: implementationInfo?.repository || 'https://github.com/writewhisker/whisker-editor-web',
    },
    status,
    certificationLevel,
    summary: {
      totalTests: complianceResults.total,
      passedTests: complianceResults.passed,
      failedTests: complianceResults.failed,
      passRate: Math.round(passRate * 10) / 10,
    },
    chapterCoverage,
    signature: '', // Will be set below
  };

  // Generate signature
  report.signature = generateSignature(report);

  return report;
}

/**
 * Calculate coverage by WLS chapter
 */
function calculateChapterCoverage(results: ComplianceResults): ChapterCoverage[] {
  const chapterMap = new Map<string, { passed: number; total: number }>();

  for (const result of results.results) {
    const parts = result.name.split('/');
    if (parts.length >= 2) {
      const chapter = parts[0];
      if (!chapterMap.has(chapter)) {
        chapterMap.set(chapter, { passed: 0, total: 0 });
      }
      const stats = chapterMap.get(chapter)!;
      stats.total++;
      if (result.passed) {
        stats.passed++;
      }
    }
  }

  const coverage: ChapterCoverage[] = [];
  for (const [chapter, stats] of chapterMap) {
    const passRate = (stats.passed / stats.total) * 100;
    coverage.push({
      chapter: formatChapterName(chapter),
      totalTests: stats.total,
      passedTests: stats.passed,
      passRate: Math.round(passRate * 10) / 10,
      status: passRate >= 90 ? 'PASS' : passRate >= 50 ? 'PARTIAL' : 'FAIL',
    });
  }

  return coverage.sort((a, b) => a.chapter.localeCompare(b.chapter));
}

/**
 * Format chapter directory name to display name
 */
function formatChapterName(dirName: string): string {
  // chapter3_syntax -> Chapter 3: Syntax
  const match = dirName.match(/chapter(\d+)_(\w+)/);
  if (match) {
    const num = match[1];
    const name = match[2].charAt(0).toUpperCase() + match[2].slice(1);
    return `Chapter ${num}: ${name}`;
  }
  return dirName;
}

/**
 * Determine certification level based on pass rate
 */
function determineCertificationLevel(passRate: number): CertificationLevel {
  for (const level of CERTIFICATION_LEVELS) {
    if (passRate >= level.minPassRate) {
      return level;
    }
  }
  return CERTIFICATION_LEVELS[CERTIFICATION_LEVELS.length - 1];
}

/**
 * Determine overall certification status
 */
function determineStatus(passRate: number): 'CERTIFIED' | 'PARTIAL' | 'NOT_CERTIFIED' {
  if (passRate >= 95) return 'CERTIFIED';
  if (passRate >= 70) return 'PARTIAL';
  return 'NOT_CERTIFIED';
}

/**
 * Read package.json version
 */
function readPackageVersion(): string {
  try {
    const packagePath = path.join(__dirname, '..', '..', 'package.json');
    const content = fs.readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Generate cryptographic signature for report integrity
 */
function generateSignature(report: Omit<CertificationReport, 'signature'>): string {
  const content = JSON.stringify({
    version: report.version,
    timestamp: report.timestamp,
    implementation: report.implementation,
    status: report.status,
    summary: report.summary,
  });
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 32);
}

// =============================================================================
// Report Formatting
// =============================================================================

/**
 * Format certification report as markdown
 */
export function formatReportMarkdown(report: CertificationReport): string {
  const lines: string[] = [];

  // Header
  lines.push('# WLS Compliance Certification Report');
  lines.push('');
  lines.push(`**Generated:** ${report.timestamp}`);
  lines.push(`**Report Version:** ${report.version}`);
  lines.push('');

  // Implementation Info
  lines.push('## Implementation');
  lines.push(`- **Name:** ${report.implementation.name}`);
  lines.push(`- **Version:** ${report.implementation.version}`);
  lines.push(`- **Repository:** ${report.implementation.repository}`);
  lines.push('');

  // Certification Status
  const statusEmoji = report.status === 'CERTIFIED' ? '✅' :
    report.status === 'PARTIAL' ? '⚠️' : '❌';
  lines.push('## Certification Status');
  lines.push(`${statusEmoji} **${report.status}**`);
  lines.push('');
  lines.push(`**Level:** ${report.certificationLevel.name}`);
  lines.push(`> ${report.certificationLevel.description}`);
  lines.push('');

  // Summary
  lines.push('## Test Summary');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Tests | ${report.summary.totalTests} |`);
  lines.push(`| Passed | ${report.summary.passedTests} |`);
  lines.push(`| Failed | ${report.summary.failedTests} |`);
  lines.push(`| Pass Rate | ${report.summary.passRate}% |`);
  lines.push('');

  // Chapter Coverage
  lines.push('## Chapter Coverage');
  lines.push('| Chapter | Tests | Passed | Rate | Status |');
  lines.push('|---------|-------|--------|------|--------|');
  for (const chapter of report.chapterCoverage) {
    const statusIcon = chapter.status === 'PASS' ? '✓' :
      chapter.status === 'PARTIAL' ? '◐' : '✗';
    lines.push(
      `| ${chapter.chapter} | ${chapter.totalTests} | ${chapter.passedTests} | ${chapter.passRate}% | ${statusIcon} |`
    );
  }
  lines.push('');

  // Platform
  lines.push('## Platform Information');
  lines.push(`- OS: ${report.platform.os}`);
  lines.push(`- Node: ${report.platform.nodeVersion}`);
  lines.push(`- Architecture: ${report.platform.architecture}`);
  lines.push('');

  // Signature
  lines.push('## Verification');
  lines.push(`Report Signature: \`${report.signature}\``);
  lines.push('');

  return lines.join('\n');
}

/**
 * Format certification report as JSON
 */
export function formatReportJSON(report: CertificationReport): string {
  return JSON.stringify(report, null, 2);
}

// =============================================================================
// Badge Generation
// =============================================================================

/**
 * Generate certification badge URL (shields.io format)
 */
export function generateBadgeURL(report: CertificationReport): string {
  const level = report.certificationLevel.name.toLowerCase();
  const color = level === 'platinum' ? 'brightgreen' :
    level === 'gold' ? 'green' :
      level === 'silver' ? 'yellow' :
        level === 'bronze' ? 'orange' : 'red';

  const label = 'WLS%20Compliance';
  const message = encodeURIComponent(`${report.certificationLevel.name} (${report.summary.passRate}%)`);

  return `https://img.shields.io/badge/${label}-${message}-${color}`;
}

/**
 * Generate markdown badge
 */
export function generateBadgeMarkdown(report: CertificationReport): string {
  const url = generateBadgeURL(report);
  return `![WLS Compliance](${url})`;
}

// =============================================================================
// CLI Entry Point
// =============================================================================

/**
 * Run certification from command line
 */
export async function runCertification(testDir: string): Promise<void> {
  console.log('Running WLS Certification...\n');

  const report = await certify(testDir);

  console.log(formatReportMarkdown(report));

  // Save reports
  const reportsDir = path.join(testDir, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(reportsDir, `certification-${timestamp}.json`),
    formatReportJSON(report)
  );
  fs.writeFileSync(
    path.join(reportsDir, `certification-${timestamp}.md`),
    formatReportMarkdown(report)
  );

  console.log(`\nReports saved to ${reportsDir}`);
  console.log(`Badge: ${generateBadgeMarkdown(report)}`);
}
