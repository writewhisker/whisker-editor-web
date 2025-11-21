/**
 * IFID Validator
 *
 * Ensures the story has a valid Interactive Fiction ID (UUID v4 format).
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class ValidateIFIDValidator implements Validator {
  name = 'validate_ifid';
  category = 'structure' as const;

  // UUID v4 regex pattern
  private readonly UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if IFID exists
    if (!story.metadata.ifid) {
      issues.push({
        id: 'missing_ifid',
        severity: 'warning',
        category: 'structure',
        message: 'Missing IFID',
        description: 'Story should have an Interactive Fiction ID (IFID). One will be generated automatically when saved.',
        fixable: true,
        fixDescription: 'Generate a new IFID',
        fixAction: () => {
          story.metadata.ifid = crypto.randomUUID();
        }
      });
      return issues;
    }

    // Check if IFID is valid UUID v4 format
    if (!this.UUID_V4_PATTERN.test(story.metadata.ifid)) {
      issues.push({
        id: 'invalid_ifid',
        severity: 'error',
        category: 'structure',
        message: 'Invalid IFID format',
        description: `IFID "${story.metadata.ifid}" is not a valid UUID v4 format. Expected format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`,
        fixable: true,
        fixDescription: 'Generate a new valid IFID',
        fixAction: () => {
          story.metadata.ifid = crypto.randomUUID();
        }
      });
    }

    return issues;
  }
}
