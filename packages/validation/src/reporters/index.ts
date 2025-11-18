/**
 * Validation result reporters
 */

export { Reporter } from './Reporter.js';
export { ConsoleReporter } from './ConsoleReporter.js';
export { JSONReporter } from './JSONReporter.js';
export { JUnitReporter } from './JUnitReporter.js';
export { HTMLReporter } from './HTMLReporter.js';

import { ConsoleReporter } from './ConsoleReporter.js';
import { JSONReporter } from './JSONReporter.js';
import { JUnitReporter } from './JUnitReporter.js';
import { HTMLReporter } from './HTMLReporter.js';
import type { Reporter } from './Reporter.js';

export type ReporterFormat = 'console' | 'json' | 'junit' | 'html';

export function createReporter(format: ReporterFormat): Reporter {
  switch (format) {
    case 'console':
      return new ConsoleReporter();
    case 'json':
      return new JSONReporter();
    case 'junit':
      return new JUnitReporter();
    case 'html':
      return new HTMLReporter();
    default:
      throw new Error(`Unknown reporter format: ${format}`);
  }
}
