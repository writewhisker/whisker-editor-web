/**
 * Bottleneck Validator
 *
 * Detects passages that all paths must pass through (bottleneck passages).
 * Error code: WLS-FLW-002
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue, ValidationCategory } from '../types';
import { WLS_ERROR_CODES } from '../error-codes';

const SPECIAL_TARGETS = ['END', 'BACK', 'RESTART'];

export class BottleneckValidator implements Validator {
  name = 'BottleneckValidator';
  category: ValidationCategory = 'structure';

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!story.startPassage) {
      return issues;
    }

    // Build adjacency list
    const adj = new Map<string, string[]>();
    const allIds = new Set<string>();

    for (const [passageId, passage] of story.passages) {
      allIds.add(passageId);
      adj.set(passageId, []);

      for (const choice of passage.choices) {
        if (choice.target && choice.target !== '') {
          if (!SPECIAL_TARGETS.includes(choice.target)) {
            if (story.passages.has(choice.target)) {
              adj.get(passageId)!.push(choice.target);
            }
          }
        }
      }
    }

    // Find terminal passages
    const terminals = new Set<string>();
    for (const [passageId, passage] of story.passages) {
      if (!passage.choices || passage.choices.length === 0) {
        terminals.add(passageId);
      } else {
        for (const choice of passage.choices) {
          if (choice.target === 'END') {
            terminals.add(passageId);
            break;
          }
        }
      }
    }

    // For each non-start, non-terminal passage, check if removing it disconnects start from terminals
    for (const [passageId, passage] of story.passages) {
      if (passageId === story.startPassage || terminals.has(passageId)) {
        continue;
      }

      // BFS from start without this passage
      const visited = new Set<string>([passageId]);
      const queue = [story.startPassage];
      visited.add(story.startPassage);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adj.get(current) ?? [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      // Check if any terminal is unreachable
      let allTerminalsUnreachable = true;
      for (const termId of terminals) {
        if (visited.has(termId)) {
          allTerminalsUnreachable = false;
          break;
        }
      }

      if (allTerminalsUnreachable && terminals.size > 0) {
        const errorDef = WLS_ERROR_CODES['WLS-FLW-002'];
        issues.push({
          id: `bottleneck_${passageId}`,
          code: 'WLS-FLW-002',
          severity: errorDef?.severity ?? 'info',
          category: this.category,
          message: errorDef?.message.replace('{passageName}', passage.title || passageId) ?? `Passage "${passage.title || passageId}" is a bottleneck`,
          description: errorDef?.description ?? '',
          passageId,
          passageTitle: passage.title,
          fixable: false,
        });
      }
    }

    return issues;
  }
}
