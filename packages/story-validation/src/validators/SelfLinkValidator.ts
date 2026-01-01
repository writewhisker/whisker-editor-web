/**
 * Self Link Validator
 *
 * Detects choices that link back to the same passage without any state change.
 * Error code: WLS-LNK-002
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class SelfLinkValidator implements Validator {
  name = 'self_link';
  category = 'links' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      for (const choice of passage.choices) {
        // Check if choice links to the same passage
        if (choice.target === passage.id) {
          // Check if there's any state change (action script)
          const hasStateChange = choice.action && choice.action.trim().length > 0;

          if (!hasStateChange) {
            issues.push({
              id: `self_link_${passage.id}_${choice.id}`,
              code: 'WLS-LNK-002',
              severity: 'warning',
              category: 'links',
              message: `Self-link without state change in "${passage.title}"`,
              description: `Choice "${choice.text}" links back to the same passage without any action, potentially causing an infinite loop.`,
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
