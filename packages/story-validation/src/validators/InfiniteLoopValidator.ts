/**
 * Infinite Loop Validator
 *
 * Detects passages that only link back to themselves without state change.
 * Error code: WLS-FLW-004
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue, ValidationCategory } from '../types';
import { WLS_ERROR_CODES } from '../error-codes';

export class InfiniteLoopValidator implements Validator {
  name = 'InfiniteLoopValidator';
  category: ValidationCategory = 'structure';

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const [passageId, passage] of story.passages) {
      if (passage.choices && passage.choices.length > 0) {
        let allSelfLinks = true;
        let hasStateChange = false;

        for (const choice of passage.choices) {
          // Check if target is self
          if (choice.target !== passageId && choice.target !== passage.title) {
            allSelfLinks = false;
          }
          // Check for action (state change)
          if (choice.action) {
            hasStateChange = true;
          }
        }

        // Check onEnterScript for state changes
        if (passage.onEnterScript && passage.onEnterScript.includes('=')) {
          hasStateChange = true;
        }

        if (allSelfLinks && !hasStateChange) {
          const errorDef = WLS_ERROR_CODES['WLS-FLW-004'];
          issues.push({
            id: `infinite_loop_${passageId}`,
            code: 'WLS-FLW-004',
            severity: errorDef?.severity ?? 'warning',
            category: this.category,
            message: errorDef?.message.replace('{passageName}', passage.title || passageId) ?? `Passage "${passage.title || passageId}" may cause an infinite loop`,
            description: errorDef?.description ?? '',
            passageId,
            passageTitle: passage.title,
            fixable: false,
          });
        }
      }
    }

    return issues;
  }
}
