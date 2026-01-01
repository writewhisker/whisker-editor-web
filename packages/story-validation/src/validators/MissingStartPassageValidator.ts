/**
 * Missing Start Passage Validator
 *
 * Ensures the story has a valid start passage defined.
 * Error code: WLS-STR-001
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class MissingStartPassageValidator implements Validator {
  name = 'missing_start_passage';
  category = 'structure' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if start passage is defined
    if (!story.startPassage) {
      issues.push({
        id: 'missing_start_passage',
        code: 'WLS-STR-001',
        severity: 'error',
        category: 'structure',
        message: 'No start passage defined',
        description: 'Every story must have a passage named "Start" or specify a start passage via @start: directive.',
        fixable: false,
      });
      return issues;
    }

    // Check if start passage exists
    const startPassage = story.getPassage(story.startPassage);
    if (!startPassage) {
      issues.push({
        id: 'invalid_start_passage',
        code: 'WLS-STR-001',
        severity: 'error',
        category: 'structure',
        message: 'Start passage does not exist',
        description: `The start passage ID "${story.startPassage}" does not exist in the story.`,
        context: { passageName: story.startPassage },
        fixable: false,
      });
    }

    return issues;
  }
}
