/**
 * Empty Choice Target Validator
 *
 * Detects choices that have no target passage.
 * Error code: WLS-LNK-005
 */

import type { Story } from '@writewhisker/story-models';
import { isSpecialTarget } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class EmptyChoiceTargetValidator implements Validator {
  name = 'empty_choice_target';
  category = 'links' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      for (const choice of passage.choices) {
        // Check if choice has no target
        if (!choice.target || choice.target.trim().length === 0) {
          // Check if this is not a special target
          if (!isSpecialTarget(choice.target || '')) {
            issues.push({
              id: `empty_target_${passage.id}_${choice.id}`,
              code: 'WLS-LNK-005',
              severity: 'error',
              category: 'links',
              message: `Choice has no target in "${passage.title}"`,
              description: `Choice "${choice.text}" has no target passage or special target (END, BACK, RESTART).`,
              passageId: passage.id,
              passageTitle: passage.title,
              choiceId: choice.id,
              context: { passageName: passage.title, choiceText: choice.text },
              fixable: false,
            });
          }
        }
      }
    }

    return issues;
  }
}
