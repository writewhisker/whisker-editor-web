/**
 * Cycle Detector Validator
 *
 * Detects cycles in the story graph.
 * Error code: WLS-FLW-003
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue, ValidationCategory } from '../types';
import { WLS_ERROR_CODES } from '../error-codes';

const SPECIAL_TARGETS = ['END', 'BACK', 'RESTART'];

export class CycleDetectorValidator implements Validator {
  name = 'CycleDetectorValidator';
  category: ValidationCategory = 'structure';

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!story.startPassage) {
      return issues;
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const inStack = new Set<string>();
    let hasCycle = false;

    const dfs = (passageId: string): void => {
      if (hasCycle) return;
      if (inStack.has(passageId)) {
        hasCycle = true;
        return;
      }
      if (visited.has(passageId)) return;

      visited.add(passageId);
      inStack.add(passageId);

      const passage = story.passages.get(passageId);
      if (passage?.choices) {
        for (const choice of passage.choices) {
          if (choice.target && choice.target !== '') {
            if (!SPECIAL_TARGETS.includes(choice.target)) {
              if (story.passages.has(choice.target)) {
                dfs(choice.target);
              }
            }
          }
        }
      }

      inStack.delete(passageId);
    };

    dfs(story.startPassage);

    if (hasCycle) {
      const errorDef = WLS_ERROR_CODES['WLS-FLW-003'];
      issues.push({
        id: 'cycle_detected',
        code: 'WLS-FLW-003',
        severity: errorDef?.severity ?? 'info',
        category: this.category,
        message: errorDef?.message ?? 'Story contains a cycle',
        description: errorDef?.description ?? '',
        fixable: false,
      });
    }

    return issues;
  }
}
