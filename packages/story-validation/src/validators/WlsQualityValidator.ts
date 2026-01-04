/**
 * WLS 1.0 Quality Validator
 *
 * Validates story quality metrics: branching, complexity, length, nesting.
 * Error codes: WLS-QUA-001 through WLS-QUA-005
 *
 * This validator produces the same error codes as whisker-core's quality.lua
 * for cross-platform parity.
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

/**
 * Configurable thresholds for quality checks
 */
export interface QualityThresholds {
  minBranchingFactor: number;  // Minimum average choices per passage
  maxComplexity: number;       // Maximum story complexity score
  maxPassageWords: number;     // Maximum words per passage
  maxNestingDepth: number;     // Maximum conditional nesting depth
  maxVariableCount: number;    // Maximum variables in story
  maxChoicesPerPassage: number; // Maximum choices per passage
}

/**
 * Default thresholds matching whisker-core quality.lua
 */
export const DEFAULT_THRESHOLDS: QualityThresholds = {
  minBranchingFactor: 1.5,
  maxComplexity: 100,
  maxPassageWords: 1000,
  maxNestingDepth: 5,
  maxVariableCount: 50,
  maxChoicesPerPassage: 10,
};

/**
 * Count words in text
 */
function countWords(text: string | undefined): number {
  if (!text || text.trim() === '') {
    return 0;
  }
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate nesting depth of conditionals in content
 * Matches whisker-core algorithm for cross-platform parity
 */
function calculateNestingDepth(content: string | undefined): number {
  if (!content) {
    return 0;
  }

  let maxDepth = 0;
  let currentDepth = 0;
  let i = 0;

  while (i < content.length) {
    // Check for {/} closing
    if (content.substring(i, i + 3) === '{/}') {
      currentDepth = Math.max(0, currentDepth - 1);
      i += 3;
      continue;
    }

    // Check for opening { that looks like a conditional
    if (content[i] === '{') {
      const rest = content.substring(i + 1);
      // Check if it's a condition block (starts with $, !, or identifier)
      if (/^\s*[\$!a-zA-Z_]/.test(rest) && !/^\s*do\s/.test(rest)) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      i++;
      continue;
    }

    i++;
  }

  return maxDepth;
}

export class WlsQualityValidator implements Validator {
  name = 'wls_quality';
  category = 'quality' as const;

  private thresholds: QualityThresholds;

  constructor(thresholds?: Partial<QualityThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate branching factor
    issues.push(...this.validateBranching(story));

    // Validate story complexity
    issues.push(...this.validateComplexity(story));

    // Validate passage length
    issues.push(...this.validatePassageLength(story));

    // Validate conditional nesting
    issues.push(...this.validateNesting(story));

    // Validate variable count
    issues.push(...this.validateVariableCount(story));

    // Validate choices per passage
    issues.push(...this.validateChoicesPerPassage(story));

    return issues;
  }

  /**
   * Validate branching factor (WLS-QUA-001)
   */
  private validateBranching(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const passages = Array.from(story.passages.values());
    const passageCount = passages.length;

    if (passageCount === 0) {
      return issues;
    }

    const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
    const branchingFactor = totalChoices / passageCount;

    if (branchingFactor < this.thresholds.minBranchingFactor) {
      issues.push({
        id: 'low_branching',
        code: 'WLS-QUA-001',
        severity: 'info',
        category: 'quality',
        message: `Low branching factor: ${branchingFactor.toFixed(2)}`,
        description: 'Story has minimal branching. Consider adding more choices.',
        context: {
          value: branchingFactor.toFixed(2),
          threshold: this.thresholds.minBranchingFactor,
          actual: branchingFactor,
        },
        fixable: false,
      });
    }

    return issues;
  }

  /**
   * Validate story complexity (WLS-QUA-002)
   * Complexity = passages * avg_choices * (1 + variable_count/10)
   */
  private validateComplexity(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const passages = Array.from(story.passages.values());
    const passageCount = passages.length;

    if (passageCount === 0) {
      return issues;
    }

    const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
    const variableCount = story.variables.size;

    const avgChoices = totalChoices / passageCount;
    const complexity = passageCount * avgChoices * (1 + variableCount / 10);

    if (complexity > this.thresholds.maxComplexity) {
      issues.push({
        id: 'high_complexity',
        code: 'WLS-QUA-002',
        severity: 'warning',
        category: 'quality',
        message: `High story complexity: ${complexity.toFixed(0)}`,
        description: 'Story complexity score exceeds threshold. Consider simplifying.',
        context: {
          threshold: this.thresholds.maxComplexity,
          actual: complexity,
        },
        fixable: false,
      });
    }

    return issues;
  }

  /**
   * Validate passage length (WLS-QUA-003)
   */
  private validatePassageLength(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const [passageId, passage] of story.passages) {
      const wordCount = countWords(passage.content);

      if (wordCount > this.thresholds.maxPassageWords) {
        issues.push({
          id: `long_passage_${passageId}`,
          code: 'WLS-QUA-003',
          severity: 'info',
          category: 'quality',
          message: `Long passage: "${passage.name}" (${wordCount} words)`,
          description: 'Passage exceeds recommended word count. Consider splitting.',
          passageId,
          context: {
            passageName: passage.name,
            wordCount,
            threshold: this.thresholds.maxPassageWords,
          },
          fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Validate conditional nesting depth (WLS-QUA-004)
   */
  private validateNesting(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const [passageId, passage] of story.passages) {
      const depth = calculateNestingDepth(passage.content);

      if (depth > this.thresholds.maxNestingDepth) {
        issues.push({
          id: `deep_nesting_${passageId}`,
          code: 'WLS-QUA-004',
          severity: 'warning',
          category: 'quality',
          message: `Deep conditional nesting in "${passage.name}" (depth: ${depth})`,
          description: 'Deeply nested conditionals may be hard to maintain.',
          passageId,
          context: {
            passageName: passage.name,
            depth,
            threshold: this.thresholds.maxNestingDepth,
          },
          fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Validate variable count (WLS-QUA-005)
   */
  private validateVariableCount(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const variableCount = story.variables.size;

    if (variableCount > this.thresholds.maxVariableCount) {
      issues.push({
        id: 'many_variables',
        code: 'WLS-QUA-005',
        severity: 'info',
        category: 'quality',
        message: `Many variables defined: ${variableCount}`,
        description: 'Large number of variables may indicate overcomplexity.',
        context: {
          count: variableCount,
          threshold: this.thresholds.maxVariableCount,
        },
        fixable: false,
      });
    }

    return issues;
  }

  /**
   * Validate choices per passage (WLS-QUA-006)
   */
  private validateChoicesPerPassage(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const [passageId, passage] of story.passages) {
      const choiceCount = passage.choices.length;

      if (choiceCount > this.thresholds.maxChoicesPerPassage) {
        issues.push({
          id: `too_many_choices_${passageId}`,
          code: 'WLS-QUA-006',
          severity: 'info',
          category: 'quality',
          message: `Too many choices in "${passage.name}" (${choiceCount})`,
          description: 'Passage has more choices than recommended.',
          passageId,
          context: {
            passageName: passage.name,
            count: choiceCount,
            threshold: this.thresholds.maxChoicesPerPassage,
          },
          fixable: false,
        });
      }
    }

    return issues;
  }
}
