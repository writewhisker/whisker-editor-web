/**
 * Unreachable Passages Validator
 *
 * Finds passages that cannot be reached from the start passage.
 */

import type { Story } from '@writewhisker/core-ts';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class UnreachablePassagesValidator implements Validator {
  name = 'unreachable_passages';
  category = 'structure' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Get start passage
    const startPassageId = story.startPassage;
    if (!startPassageId) {
      return issues; // MissingStartPassageValidator will catch this
    }

    // Find all reachable passages using BFS
    const reachable = new Set<string>();
    const queue: string[] = [startPassageId];
    reachable.add(startPassageId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const passage = story.getPassage(currentId);

      if (!passage) continue;

      // Add all choice targets
      for (const choice of passage.choices) {
        if (choice.target && !reachable.has(choice.target)) {
          reachable.add(choice.target);
          queue.push(choice.target);
        }
      }
    }

    // Find unreachable passages
    const allPassages = Array.from(story.passages.values());
    for (const passage of allPassages) {
      if (!reachable.has(passage.id)) {
        issues.push({
          id: `unreachable_${passage.id}`,
          severity: 'warning',
          category: 'structure',
          message: `Unreachable passage: "${passage.title}"`,
          description: 'This passage cannot be reached from the start passage. Consider adding a link to it or removing it.',
          passageId: passage.id,
          passageTitle: passage.title,
          fixable: true,
          fixDescription: 'Delete this passage',
        });
      }
    }

    return issues;
  }
}
