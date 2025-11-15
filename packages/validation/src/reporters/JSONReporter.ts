/**
 * JSON reporter for programmatic consumption
 */

import type { ValidationResult } from '@writewhisker/core-ts';
import type { Reporter } from './Reporter.js';

export class JSONReporter implements Reporter {
  constructor(private pretty: boolean = true) {}

  format(result: ValidationResult): string {
    const errors = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    const info = result.issues.filter(i => i.severity === 'info');

    const output = {
      valid: result.valid,
      timestamp: new Date().toISOString(),
      summary: {
        total: errors.length + warnings.length + info.length,
        errors: errors.length,
        warnings: warnings.length,
        info: info.length,
      },
      issues: {
        errors: errors,
        warnings: warnings,
        info: info,
      },
    };

    return this.pretty
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
  }

  getExtension(): string {
    return 'json';
  }
}
