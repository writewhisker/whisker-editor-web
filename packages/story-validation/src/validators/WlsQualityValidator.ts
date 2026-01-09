/**
 * Quality Validator
 *
 * Validates story quality metrics: branching, complexity, length, nesting.
 * Error codes: WLS-QUA-001 through WLS-QUA-012
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
  minPassageWords: number;     // Minimum words per passage (for pacing)
  maxNestingDepth: number;     // Maximum conditional nesting depth
  maxVariableCount: number;    // Maximum variables in story
  maxChoicesPerPassage: number; // Maximum choices per passage
  maxPacingVariance: number;   // Maximum coefficient of variation for pacing
  minTerminalPassages: number; // Minimum number of ending passages
}

/**
 * Default thresholds matching whisker-core quality.lua
 */
export const DEFAULT_THRESHOLDS: QualityThresholds = {
  minBranchingFactor: 1.5,
  maxComplexity: 100,
  maxPassageWords: 1000,
  minPassageWords: 10,
  maxNestingDepth: 5,
  maxVariableCount: 50,
  maxChoicesPerPassage: 10,
  maxPacingVariance: 2.0,
  minTerminalPassages: 1,
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

    // Validate dead-ends
    issues.push(...this.validateDeadEnds(story));

    // Validate pacing
    issues.push(...this.validatePacing(story));

    // Validate terminal passages
    issues.push(...this.validateTerminalPassages(story));

    // Validate variable usage patterns
    issues.push(...this.validateVariableUsage(story));

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

  /**
   * Validate dead-end passages (WLS-QUA-007)
   * Dead-ends are passages with no choices and no special targets (ENDING, RETURN)
   */
  private validateDeadEnds(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Special targets that indicate intentional termination
    const terminalTargets = new Set(['ENDING', 'END', 'RETURN', 'BACK']);

    for (const [passageId, passage] of story.passages) {
      // Skip if passage has choices
      if (passage.choices.length > 0) {
        continue;
      }

      // Check content for terminal patterns or goto
      const content = passage.content || '';
      const hasGoto = /\[\[.*?\]\]|\{goto\s+.*?\}/.test(content);
      const hasTerminal = terminalTargets.has(passage.name) ||
        /\{(ENDING|END|RETURN|BACK)\}/.test(content);

      // If no outgoing links and not a terminal, it's a dead-end
      if (!hasGoto && !hasTerminal && passageId !== story.startPassage) {
        issues.push({
          id: `dead_end_${passageId}`,
          code: 'WLS-QUA-007',
          severity: 'warning',
          category: 'quality',
          message: `Potential dead-end: "${passage.name}"`,
          description: 'Passage has no choices or links. Consider adding choices or marking as an ending.',
          passageId,
          context: {
            passageName: passage.name,
          },
          suggestion: 'Add choices to continue the story, or mark this passage as an explicit ending.',
          fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Validate pacing consistency (WLS-QUA-008)
   * Checks for consistent passage lengths throughout the story
   */
  private validatePacing(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const passages = Array.from(story.passages.values());
    if (passages.length < 3) {
      return issues; // Not enough passages to analyze pacing
    }

    // Calculate word counts for each passage
    const wordCounts = passages.map(p => countWords(p.content));
    const nonZeroCounts = wordCounts.filter(c => c > 0);

    if (nonZeroCounts.length < 3) {
      return issues;
    }

    // Calculate mean and standard deviation
    const mean = nonZeroCounts.reduce((a, b) => a + b, 0) / nonZeroCounts.length;
    const squaredDiffs = nonZeroCounts.map(c => Math.pow(c - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / nonZeroCounts.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation (CV) - normalized measure of dispersion
    const cv = mean > 0 ? stdDev / mean : 0;

    if (cv > this.thresholds.maxPacingVariance) {
      issues.push({
        id: 'inconsistent_pacing',
        code: 'WLS-QUA-008',
        severity: 'info',
        category: 'quality',
        message: `Inconsistent pacing (variance: ${cv.toFixed(2)})`,
        description: 'Passage lengths vary significantly. Consider more consistent passage lengths.',
        context: {
          coefficientOfVariation: cv.toFixed(2),
          threshold: this.thresholds.maxPacingVariance,
          meanWords: Math.round(mean),
          stdDev: Math.round(stdDev),
        },
        fixable: false,
      });
    }

    // Check for very short passages (pacing issues)
    for (const [passageId, passage] of story.passages) {
      const wordCount = countWords(passage.content);

      if (wordCount > 0 && wordCount < this.thresholds.minPassageWords) {
        issues.push({
          id: `short_passage_${passageId}`,
          code: 'WLS-QUA-009',
          severity: 'info',
          category: 'quality',
          message: `Short passage: "${passage.name}" (${wordCount} words)`,
          description: 'Passage is very short. Consider expanding or merging with another passage.',
          passageId,
          context: {
            passageName: passage.name,
            wordCount,
            threshold: this.thresholds.minPassageWords,
          },
          fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Validate terminal passages (WLS-QUA-010)
   * Ensures story has proper endings
   */
  private validateTerminalPassages(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Count terminal passages (passages with no outgoing links)
    let terminalCount = 0;

    for (const [, passage] of story.passages) {
      const hasChoices = passage.choices.length > 0;
      const content = passage.content || '';
      const hasGoto = /\[\[.*?\]\]|\{goto\s+.*?\}/.test(content);

      if (!hasChoices && !hasGoto) {
        terminalCount++;
      }
    }

    if (terminalCount < this.thresholds.minTerminalPassages) {
      issues.push({
        id: 'no_terminal_passages',
        code: 'WLS-QUA-010',
        severity: 'warning',
        category: 'quality',
        message: 'Story has no clear endings',
        description: 'Every story should have at least one ending passage.',
        context: {
          terminalCount,
          threshold: this.thresholds.minTerminalPassages,
        },
        fixable: false,
      });
    }

    return issues;
  }

  /**
   * Validate variable usage patterns (WLS-QUA-011, WLS-QUA-012)
   * Checks for write-before-read and read-before-write patterns
   */
  private validateVariableUsage(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Track variable usage
    const variableWrites = new Set<string>();
    const variableReads = new Set<string>();

    // Pattern to find variable references in content
    const readPattern = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const writePattern = /\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=|\{set\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;

    // Analyze all passages
    for (const [, passage] of story.passages) {
      const content = passage.content || '';

      // Find reads
      let match;
      while ((match = readPattern.exec(content)) !== null) {
        variableReads.add(match[1]);
      }

      // Find writes
      while ((match = writePattern.exec(content)) !== null) {
        const varName = match[1] || match[2];
        if (varName) {
          variableWrites.add(varName);
        }
      }

      // Also check choices for conditions
      for (const choice of passage.choices) {
        if (choice.condition) {
          const condMatch = choice.condition.match(readPattern);
          if (condMatch) {
            for (const m of condMatch) {
              const varName = m.substring(1); // Remove $
              variableReads.add(varName);
            }
          }
        }
      }
    }

    // Check for variables read but never written (potentially uninitialized)
    const declaredVars = new Set(Array.from(story.variables.keys()).map(v => {
      const variable = story.variables.get(v);
      return variable?.name || v;
    }));

    for (const varName of variableReads) {
      if (!variableWrites.has(varName) && !declaredVars.has(varName)) {
        issues.push({
          id: `uninitialized_read_${varName}`,
          code: 'WLS-QUA-011',
          severity: 'warning',
          category: 'quality',
          message: `Variable "${varName}" read but never initialized`,
          description: 'Variable is used before being set. Consider declaring it or initializing it.',
          variableName: varName,
          context: {
            variableName: varName,
          },
          suggestion: `Declare variable "${varName}" with a default value, or ensure it's set before being read.`,
          fixable: false,
        });
      }
    }

    // Check for variables written but never read (potentially unused)
    for (const varName of variableWrites) {
      if (!variableReads.has(varName)) {
        issues.push({
          id: `unused_write_${varName}`,
          code: 'WLS-QUA-012',
          severity: 'info',
          category: 'quality',
          message: `Variable "${varName}" set but never read`,
          description: 'Variable is modified but its value is never used.',
          variableName: varName,
          context: {
            variableName: varName,
          },
          suggestion: `Consider removing the variable "${varName}" if it's not needed.`,
          fixable: false,
        });
      }
    }

    return issues;
  }
}
