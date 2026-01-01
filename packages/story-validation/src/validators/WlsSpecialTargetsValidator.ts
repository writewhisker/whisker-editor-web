/**
 * WLS 1.0 Special Targets Validator
 *
 * Validates choice targets that use WLS special targets (END, BACK, RESTART).
 * Ensures proper usage of special navigation commands.
 */

import type { Story } from '@writewhisker/story-models';
import { isSpecialTarget, SpecialTargets } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class WlsSpecialTargetsValidator implements Validator {
  name = 'wls_special_targets';
  category = 'links' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const allPassages = Array.from(story.passages.values());

    // Build set of passage titles for lookup
    const passageTitles = new Set<string>();
    for (const p of allPassages) {
      passageTitles.add(p.title);
    }

    for (const passage of allPassages) {
      for (const choice of passage.choices) {
        if (!choice.target) continue;

        // Check if target looks like a special target but with wrong case
        const upperTarget = choice.target.toUpperCase();
        if (upperTarget === 'END' || upperTarget === 'BACK' || upperTarget === 'RESTART') {
          // Skip if there's an actual passage with this name
          if (passageTitles.has(choice.target)) {
            continue;
          }

          if (!isSpecialTarget(choice.target)) {
            // Wrong case - suggest correct case
            issues.push({
              id: `wls_special_target_case_${passage.id}_${choice.id}`,
              code: 'WLS-LNK-003',
              severity: 'warning',
              category: 'links',
              message: `Incorrect case for special target in "${passage.title}"`,
              description: `"${choice.target}" should be "${upperTarget}". Special targets must be uppercase.`,
              passageId: passage.id,
              passageTitle: passage.title,
              choiceId: choice.id,
              context: { actual: choice.target, expected: upperTarget },
              fixable: true,
              fixDescription: `Change to "${upperTarget}"`,
            });
          }
        }

        // Validate BACK usage - check if there's history to go back to
        if (choice.target === SpecialTargets.BACK) {
          // BACK is always potentially valid, but warn if it's the only choice on the start passage
          if (passage.id === story.startPassage && passage.choices.length === 1) {
            issues.push({
              id: `wls_back_on_start_${passage.id}_${choice.id}`,
              code: 'WLS-LNK-004',
              severity: 'warning',
              category: 'links',
              message: `BACK target on start passage`,
              description: `The BACK special target on the start passage may have no effect since there's no history.`,
              passageId: passage.id,
              passageTitle: passage.title,
              choiceId: choice.id,
              context: { passageName: passage.title },
              fixable: false,
            });
          }
        }
      }
    }

    return issues;
  }
}
