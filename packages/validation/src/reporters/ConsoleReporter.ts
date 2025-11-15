/**
 * Console reporter with colored output
 */

import chalk from 'chalk';
import type { ValidationResult } from '@writewhisker/core-ts';
import type { Reporter } from './Reporter.js';

export class ConsoleReporter implements Reporter {
  format(result: ValidationResult): string {
    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(chalk.bold('═══ Whisker Story Validation Report ═══'));
    lines.push('');

    // Summary
    const totalIssues = result.errors.length + result.warnings.length + result.info.length;
    const status = result.valid ? chalk.green('✓ PASSED') : chalk.red('✗ FAILED');

    lines.push(`Status: ${status}`);
    lines.push(`Total Issues: ${totalIssues}`);
    lines.push(`  ${chalk.red('Errors')}: ${result.errors.length}`);
    lines.push(`  ${chalk.yellow('Warnings')}: ${result.warnings.length}`);
    lines.push(`  ${chalk.blue('Info')}: ${result.info.length}`);
    lines.push('');

    // Errors
    if (result.errors.length > 0) {
      lines.push(chalk.red.bold('Errors:'));
      result.errors.forEach((issue, i) => {
        lines.push(`  ${i + 1}. ${chalk.red('●')} ${issue.message}`);
        if (issue.path) {
          lines.push(`     ${chalk.gray(`Path: ${issue.path}`)}`);
        }
        if (issue.suggestion) {
          lines.push(`     ${chalk.cyan(`💡 ${issue.suggestion}`)}`);
        }
      });
      lines.push('');
    }

    // Warnings
    if (result.warnings.length > 0) {
      lines.push(chalk.yellow.bold('Warnings:'));
      result.warnings.forEach((issue, i) => {
        lines.push(`  ${i + 1}. ${chalk.yellow('⚠')} ${issue.message}`);
        if (issue.path) {
          lines.push(`     ${chalk.gray(`Path: ${issue.path}`)}`);
        }
        if (issue.suggestion) {
          lines.push(`     ${chalk.cyan(`💡 ${issue.suggestion}`)}`);
        }
      });
      lines.push('');
    }

    // Info
    if (result.info.length > 0) {
      lines.push(chalk.blue.bold('Info:'));
      result.info.forEach((issue, i) => {
        lines.push(`  ${i + 1}. ${chalk.blue('ℹ')} ${issue.message}`);
        if (issue.path) {
          lines.push(`     ${chalk.gray(`Path: ${issue.path}`)}`);
        }
      });
      lines.push('');
    }

    // Footer
    lines.push(chalk.gray('═══════════════════════════════════════'));

    return lines.join('\n');
  }

  getExtension(): string {
    return 'txt';
  }
}
