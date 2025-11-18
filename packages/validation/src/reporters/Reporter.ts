/**
 * Base reporter interface for validation results
 */

import type { ValidationResult } from '@writewhisker/core-ts';

export interface Reporter {
  /**
   * Format validation results
   */
  format(result: ValidationResult): string;

  /**
   * Get file extension for this reporter
   */
  getExtension(): string;
}
