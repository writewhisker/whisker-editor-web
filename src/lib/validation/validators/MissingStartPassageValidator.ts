/**
 * Missing Start Passage Validator
 *
 * Ensures the story has a valid start passage defined.
 */

import type { Story } from '@whisker/core-ts';
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
        severity: 'error',
        category: 'structure',
        message: 'No start passage defined',
        description: 'The story must have a start passage. Set one in the story settings.',
        fixable: false,
      });
      return issues;
    }

    // Check if start passage exists
    const startPassage = story.getPassage(story.startPassage);
    if (!startPassage) {
      issues.push({
        id: 'invalid_start_passage',
        severity: 'error',
        category: 'structure',
        message: 'Start passage does not exist',
        description: `The start passage ID "${story.startPassage}" does not exist in the story.`,
        fixable: false,
      });
    }

    return issues;
  }
}
