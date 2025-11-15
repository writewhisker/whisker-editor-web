/**
 * JUnit XML reporter for CI/CD integration
 */

import type { ValidationResult } from '@writewhisker/core-ts';
import type { Reporter } from './Reporter.js';

export class JUnitReporter implements Reporter {
  format(result: ValidationResult): string {
    const totalTests = result.errors.length + result.warnings.length + result.info.length;
    const failures = result.errors.length;
    const timestamp = new Date().toISOString();

    const lines: string[] = [];

    // XML header
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');

    // Testsuite
    lines.push(`<testsuite name="Whisker Story Validation" tests="${totalTests}" failures="${failures}" errors="0" time="0" timestamp="${timestamp}">`);

    // Errors as test failures
    result.errors.forEach((issue) => {
      lines.push('  <testcase name="' + this.escapeXml(issue.message) + '" classname="validation.error">');
      lines.push('    <failure message="' + this.escapeXml(issue.message) + '">');
      if (issue.path) {
        lines.push('Path: ' + this.escapeXml(issue.path));
      }
      if (issue.suggestion) {
        lines.push('Suggestion: ' + this.escapeXml(issue.suggestion));
      }
      lines.push('    </failure>');
      lines.push('  </testcase>');
    });

    // Warnings as passing tests with system-out
    result.warnings.forEach((issue) => {
      lines.push('  <testcase name="' + this.escapeXml(issue.message) + '" classname="validation.warning">');
      lines.push('    <system-out>');
      lines.push('Warning: ' + this.escapeXml(issue.message));
      if (issue.path) {
        lines.push('Path: ' + this.escapeXml(issue.path));
      }
      lines.push('    </system-out>');
      lines.push('  </testcase>');
    });

    // Info as passing tests
    result.info.forEach((issue) => {
      lines.push('  <testcase name="' + this.escapeXml(issue.message) + '" classname="validation.info">');
      lines.push('    <system-out>');
      lines.push('Info: ' + this.escapeXml(issue.message));
      if (issue.path) {
        lines.push('Path: ' + this.escapeXml(issue.path));
      }
      lines.push('    </system-out>');
      lines.push('  </testcase>');
    });

    lines.push('</testsuite>');

    return lines.join('\n');
  }

  getExtension(): string {
    return 'xml';
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
