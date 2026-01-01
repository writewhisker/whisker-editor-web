/**
 * Orphan Passages Validator
 *
 * Detects passages with no incoming links (except the start passage).
 * Error code: WLS-STR-005
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue, ValidationCategory } from '../types';
import { WLS_ERROR_CODES } from '../error-codes';

const SPECIAL_TARGETS = ['END', 'BACK', 'RESTART'];

export class OrphanPassagesValidator implements Validator {
  name = 'OrphanPassagesValidator';
  category: ValidationCategory = 'structure';

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!story.startPassage) {
      return issues;
    }

    // Build set of passages that have incoming links
    const hasIncoming = new Set<string>();
    hasIncoming.add(story.startPassage); // Start is not orphan

    for (const passage of story.passages.values()) {
      for (const choice of passage.choices) {
        if (choice.target && choice.target !== '') {
          if (!SPECIAL_TARGETS.includes(choice.target)) {
            hasIncoming.add(choice.target);
          }
        }
      }
    }

    // Find orphans
    for (const [passageId, passage] of story.passages) {
      if (!hasIncoming.has(passageId) && passageId !== story.startPassage) {
        const errorDef = WLS_ERROR_CODES['WLS-STR-005'];
        issues.push({
          id: `orphan_${passageId}`,
          code: 'WLS-STR-005',
          severity: errorDef?.severity ?? 'info',
          category: this.category,
          message: errorDef?.message.replace('{passageName}', passage.title || passageId) ?? `Passage "${passage.title || passageId}" has no incoming links`,
          description: errorDef?.description ?? '',
          passageId,
          passageTitle: passage.title,
          fixable: false,
        });
      }
    }

    return issues;
  }
}
