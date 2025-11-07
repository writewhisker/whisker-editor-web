/**
 * Empty Passages Validator
 *
 * Finds passages with no content or no choices.
 */

import type { Story } from '@whisker/core-ts';
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
          severity: 'warning',
          category: 'content',
          message: `Empty passage: "${passage.title}"`,
          description: 'This passage has no content. Add some text or remove the passage.',
          passageId: passage.id,
          passageTitle: passage.title,
          fixable: false,
        });
      }

      // Check for passages with no choices (unless it's intentionally an ending)
      const hasChoices = passage.choices.length > 0;

      if (!hasChoices) {
        // This is just info - it might be an intentional ending
        issues.push({
          id: `no_choices_${passage.id}`,
          severity: 'info',
          category: 'content',
          message: `Terminal passage: "${passage.title}"`,
          description: 'This passage has no choices (story ending). This is fine if intentional.',
          passageId: passage.id,
          passageTitle: passage.title,
          fixable: false,
        });
      }
    }

    return issues;
  }
}
