/**
 * Dead Links Validator
 *
 * Finds choices that point to non-existent passages.
 * Error code: WLS-LNK-001
 */

import type { Story } from '@writewhisker/story-models';
import { isSpecialTarget } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class DeadLinksValidator implements Validator {
  name = 'dead_links';
  category = 'links' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      for (const choice of passage.choices) {
        // Skip choices with no target (end of story)
        if (!choice.target) {
          continue;
        }

        // Skip special targets (END, BACK, RESTART)
        if (isSpecialTarget(choice.target)) {
          continue;
        }

        // Skip wrong-case special targets (handled by WlsSpecialTargetsValidator)
        const upperTarget = choice.target.toUpperCase();
        if (upperTarget === 'END' || upperTarget === 'BACK' || upperTarget === 'RESTART') {
          continue;
        }

        // Check if target exists
        const targetPassage = story.getPassage(choice.target);

        if (!targetPassage) {
          issues.push({
            id: `dead_link_${passage.id}_${choice.id}`,
            code: 'WLS-LNK-001',
            severity: 'error',
            category: 'links',
            message: `Choice links to non-existent passage: "${choice.target}"`,
            description: `Choice "${choice.text}" in passage "${passage.title}" points to non-existent passage`,
            passageId: passage.id,
            passageTitle: passage.title,
            choiceId: choice.id,
            context: { targetPassage: choice.target },
            fixable: true,
            fixDescription: 'Remove this choice or create the target passage',
          });
        }
      }
    }

    return issues;
  }
}
