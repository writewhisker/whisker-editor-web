/**
 * JSON reporter for programmatic consumption
 */

import type { ValidationResult } from '@writewhisker/core-ts';
import type { Reporter } from './Reporter.js';

export class JSONReporter implements Reporter {
  constructor(private pretty: boolean = true) {}

  format(result: ValidationResult): string {
    const output = {
      valid: result.valid,
      timestamp: new Date().toISOString(),
      summary: {
        total: result.errors.length + result.warnings.length + result.info.length,
        errors: result.errors.length,
        warnings: result.warnings.length,
        info: result.info.length,
      },
      issues: {
        errors: result.errors,
        warnings: result.warnings,
        info: result.info,
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
