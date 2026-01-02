/**
 * Duplicate Passages Validator
 *
 * Finds passages with duplicate names.
 * Error code: WLS-STR-003
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class DuplicatePassagesValidator implements Validator {
  name = 'duplicate_passages';
  category = 'structure' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Group passages by title
    const passagesByTitle = new Map<string, Array<{ id: string; title: string }>>();

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      const title = passage.title.toLowerCase().trim();
      if (!passagesByTitle.has(title)) {
        passagesByTitle.set(title, []);
      }
      passagesByTitle.get(title)!.push({ id: passage.id, title: passage.title });
    }

    // Find duplicates - report one error per duplicate passage
    for (const [, passages] of passagesByTitle) {
      if (passages.length > 1) {
        // Report one error for each passage in the duplicate group
        for (const passage of passages) {
          issues.push({
            id: `duplicate_passage_${passage.id}`,
            code: 'WLS-STR-003',
            severity: 'error',
            category: 'structure',
            message: `Duplicate passage name: "${passage.title}"`,
            description: `There are ${passages.length} passages with the name "${passage.title}". Passage names must be unique.`,
            passageId: passage.id,
            passageTitle: passage.title,
            context: { passageName: passage.title, count: passages.length },
            fixable: false,
          });
        }
      }
    }

    return issues;
  }
}
