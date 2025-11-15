/**
 * JUnit XML reporter for CI/CD integration
 */

import type { ValidationResult } from '@writewhisker/core-ts';
import type { Reporter } from './Reporter.js';

export class JUnitReporter implements Reporter {
  private formatIssuePath(issue: any): string | undefined {
    const parts: string[] = [];
    if (issue.passageTitle) parts.push(`Passage: ${issue.passageTitle}`);
    if (issue.choiceId) parts.push(`Choice ID: ${issue.choiceId}`);
    if (issue.variableName) parts.push(`Variable: ${issue.variableName}`);
    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  format(result: ValidationResult): string {
    const errors = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    const info = result.issues.filter(i => i.severity === 'info');
    const totalTests = errors.length + warnings.length + info.length;
    const failures = errors.length;
    const timestamp = new Date().toISOString();

    const lines: string[] = [];

    // XML header
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');

    // Testsuite
    lines.push(`<testsuite name="Whisker Story Validation" tests="${totalTests}" failures="${failures}" errors="0" time="0" timestamp="${timestamp}">`);

    // Errors as test failures
    errors.forEach((issue) => {
      lines.push('  <testcase name="' + this.escapeXml(issue.message) + '" classname="validation.error">');
      lines.push('    <failure message="' + this.escapeXml(issue.message) + '">');
      const path = this.formatIssuePath(issue);
      if (path) {
        lines.push(this.escapeXml(path));
      }
      if (issue.description) {
        lines.push('Description: ' + this.escapeXml(issue.description));
      }
      lines.push('    </failure>');
      lines.push('  </testcase>');
    });

    // Warnings as passing tests with system-out
    warnings.forEach((issue) => {
      lines.push('  <testcase name="' + this.escapeXml(issue.message) + '" classname="validation.warning">');
      lines.push('    <system-out>');
      lines.push('Warning: ' + this.escapeXml(issue.message));
      const path = this.formatIssuePath(issue);
      if (path) {
        lines.push(this.escapeXml(path));
      }
      lines.push('    </system-out>');
      lines.push('  </testcase>');
    });

    // Info as passing tests
    info.forEach((issue) => {
      lines.push('  <testcase name="' + this.escapeXml(issue.message) + '" classname="validation.info">');
      lines.push('    <system-out>');
      lines.push('Info: ' + this.escapeXml(issue.message));
      const path = this.formatIssuePath(issue);
      if (path) {
        lines.push(this.escapeXml(path));
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
