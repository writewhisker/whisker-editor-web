/**
 * Dead Links Validator
 *
 * Finds choices that point to non-existent passages.
 */

import type { Story } from '@writewhisker/core-ts';
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

        // Check if target exists
        const targetPassage = story.getPassage(choice.target);

        if (!targetPassage) {
          issues.push({
            id: `dead_link_${passage.id}_${choice.id}`,
            severity: 'error',
            category: 'links',
            message: `Dead link in "${passage.title}"`,
            description: `Choice "${choice.text}" points to non-existent passage ID: ${choice.target}`,
            passageId: passage.id,
            passageTitle: passage.title,
            choiceId: choice.id,
            fixable: true,
            fixDescription: 'Remove this choice',
          });
        }
      }
    }

    return issues;
  }
}
