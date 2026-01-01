/**
 * Empty Passages Validator
 *
 * Finds passages with no content or no choices.
 * Error codes: WLS-STR-004 (empty), WLS-FLW-001 (dead end)
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class EmptyPassagesValidator implements Validator {
  name = 'empty_passages';
  category = 'content' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      // Check for empty content
      const hasContent = passage.content && passage.content.trim().length > 0;

      if (!hasContent) {
        issues.push({
          id: `empty_content_${passage.id}`,
          code: 'WLS-STR-004',
          severity: 'warning',
          category: 'content',
          message: `Passage "${passage.title}" is empty`,
          description: 'This passage has no content and no choices.',
          passageId: passage.id,
          passageTitle: passage.title,
          context: { passageName: passage.title },
          fixable: false,
        });
      }

      // Check for passages with no valid exit (dead end)
      // A valid exit is a choice with a non-empty target
      const hasValidExit = passage.choices.some(
        (choice) => choice.target && choice.target.trim() !== ''
      );

      if (!hasValidExit) {
        // This is just info - it might be an intentional ending
        issues.push({
          id: `no_choices_${passage.id}`,
          code: 'WLS-FLW-001',
          severity: 'info',
          category: 'content',
          message: `Passage "${passage.title}" is a dead end`,
          description:
            passage.choices.length === 0
              ? 'This passage has no choices. It may be an intentional story ending.'
              : 'This passage has choices but all have empty targets. It may be an intentional story ending.',
          passageId: passage.id,
          passageTitle: passage.title,
          context: { passageName: passage.title },
          fixable: false,
        });
      }
    }

    return issues;
  }
}
