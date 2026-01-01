/**
 * No Terminal Validator
 *
 * Detects stories with no terminal passages (no way to end the story).
 * Error code: WLS-STR-006
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue, ValidationCategory } from '../types';
import { WLS_ERROR_CODES } from '../error-codes';

export class NoTerminalValidator implements Validator {
  name = 'NoTerminalValidator';
  category: ValidationCategory = 'structure';

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    let hasTerminal = false;

    for (const passage of story.passages.values()) {
      // Check if passage is terminal (no choices or has END)
      if (!passage.choices || passage.choices.length === 0) {
        hasTerminal = true;
        break;
      }

      // Check for END target
      for (const choice of passage.choices) {
        if (choice.target === 'END') {
          hasTerminal = true;
          break;
        }
      }

      if (hasTerminal) {
        break;
      }
    }

    if (!hasTerminal && story.passages.size > 0) {
      const errorDef = WLS_ERROR_CODES['WLS-STR-006'];
      issues.push({
        id: 'no_terminal',
        code: 'WLS-STR-006',
        severity: errorDef?.severity ?? 'info',
        category: this.category,
        message: errorDef?.message ?? 'Story has no terminal passages',
        description: errorDef?.description ?? '',
        fixable: false,
      });
    }

    return issues;
  }
}
