/**
 * Unreachable Passages Validator
 *
 * Finds passages that cannot be reached from the start passage.
 * Error code: WLS-STR-002
 */

import type { Story } from '@writewhisker/story-models';
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
    // First, identify duplicate passage names (case-insensitive)
    const allPassages = Array.from(story.passages.values());
    const seenTitles = new Map<string, string>(); // lowercase title -> first passage ID
    const duplicatePassageIds = new Set<string>();

    for (const passage of allPassages) {
      const titleLower = passage.title.toLowerCase();
      if (seenTitles.has(titleLower)) {
        // This is a duplicate - the first one is the "real" one for linking
        duplicatePassageIds.add(passage.id);
      } else {
        seenTitles.set(titleLower, passage.id);
      }
    }

    for (const passage of allPassages) {
      if (!reachable.has(passage.id)) {
        // Skip duplicates - they're already flagged by DuplicatePassagesValidator
        // and are unreachable only because links resolve to the first occurrence
        if (duplicatePassageIds.has(passage.id)) {
          continue;
        }

        issues.push({
          id: `unreachable_${passage.id}`,
          code: 'WLS-STR-002',
          severity: 'warning',
          category: 'structure',
          message: `Passage "${passage.title}" is unreachable`,
          description: 'This passage cannot be reached from the start passage through any path of choices.',
          passageId: passage.id,
          passageTitle: passage.title,
          context: { passageName: passage.title },
          fixable: true,
          fixDescription: 'Delete this passage or add a link to it',
        });
      }
    }

    return issues;
  }
}
