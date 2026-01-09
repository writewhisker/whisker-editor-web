/**
 * Condition Analysis Validator
 *
 * Analyzes choice conditions to detect:
 * - Always-false conditions (unreachable choices) - WLS-FLW-005
 * - Always-true conditions (redundant conditions) - WLS-FLW-006
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class ConditionAnalysisValidator implements Validator {
  name = 'condition_analysis';
  category = 'flow' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate unreachable choices (always-false conditions)
    issues.push(...this.validateUnreachableChoices(story));

    // Validate always-true conditions
    issues.push(...this.validateAlwaysTrue(story));

    return issues;
  }

  /**
   * Validate unreachable choices (WLS-FLW-005)
   * Checks for conditions that are obviously always false
   */
  private validateUnreachableChoices(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const [passageId, passage] of story.passages) {
      for (let i = 0; i < passage.choices.length; i++) {
        const choice = passage.choices[i];

        if (choice.condition) {
          const cond = choice.condition.trim().toLowerCase();

          // Check for obvious always-false conditions
          if (cond === 'false' || cond === 'nil' || cond === '0') {
            issues.push({
              id: `unreachable_choice_${passageId}_${i}`,
              code: 'WLS-FLW-005',
              severity: 'warning',
              category: 'flow',
              message: `Unreachable choice in "${passage.title}"`,
              description: `Choice "${choice.text}" has condition "${choice.condition}" which is always false and will never be shown.`,
              passageId,
              passageTitle: passage.title,
              choiceId: choice.id,
              context: {
                choiceIndex: i,
                choiceText: choice.text,
                condition: choice.condition,
              },
              suggestion: 'Remove the condition or update it to a meaningful expression.',
              fixable: true,
              fixDescription: 'Remove the always-false condition',
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Validate always-true conditions (WLS-FLW-006)
   * Checks for conditions that are obviously always true (redundant)
   */
  private validateAlwaysTrue(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const [passageId, passage] of story.passages) {
      for (let i = 0; i < passage.choices.length; i++) {
        const choice = passage.choices[i];

        if (choice.condition) {
          const cond = choice.condition.trim().toLowerCase();

          // Check for obvious always-true conditions
          if (cond === 'true' || cond === '1') {
            issues.push({
              id: `always_true_${passageId}_${i}`,
              code: 'WLS-FLW-006',
              severity: 'info',
              category: 'flow',
              message: `Redundant condition in "${passage.title}"`,
              description: `Choice "${choice.text}" has condition "${choice.condition}" which is always true. The condition is redundant.`,
              passageId,
              passageTitle: passage.title,
              choiceId: choice.id,
              context: {
                choiceIndex: i,
                choiceText: choice.text,
                condition: choice.condition,
              },
              suggestion: 'Remove the redundant condition.',
              fixable: true,
              fixDescription: 'Remove the always-true condition',
            });
          }
        }
      }
    }

    return issues;
  }
}
