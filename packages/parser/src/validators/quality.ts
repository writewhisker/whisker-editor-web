/**
 * Quality Validation for WLS Stories
 *
 * Validates code quality aspects of a story:
 * - Low branching factor (WLS-QUA-001)
 * - High complexity (WLS-QUA-002)
 * - Long passages (WLS-QUA-003)
 * - Deep nesting (WLS-QUA-004)
 * - Too many variables (WLS-QUA-005)
 */

import type {
  StoryNode,
  ContentNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
} from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { ValidationDiagnostic } from './links';

/** Quality thresholds (configurable) */
export interface QualityThresholds {
  minBranchingFactor: number;      // Minimum average choices per passage
  maxComplexity: number;           // Maximum cyclomatic complexity
  maxPassageWordCount: number;     // Maximum words per passage
  maxNestingDepth: number;         // Maximum conditional nesting depth
  maxVariableCount: number;        // Maximum total variables
}

/** Default quality thresholds */
const DEFAULT_THRESHOLDS: QualityThresholds = {
  minBranchingFactor: 1.5,
  maxComplexity: 20,
  maxPassageWordCount: 500,
  maxNestingDepth: 5,
  maxVariableCount: 100,
};

/**
 * Result of quality validation
 */
export interface QualityValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
  metrics: QualityMetrics;
}

/**
 * Quality metrics for a story
 */
export interface QualityMetrics {
  totalPassages: number;
  totalChoices: number;
  branchingFactor: number;
  maxComplexity: number;
  maxPassageWords: number;
  maxNestingDepth: number;
  totalVariables: number;
}

/**
 * Count words in text content
 */
function countWords(content: ContentNode[]): number {
  let wordCount = 0;

  for (const node of content) {
    if (node.type === 'text') {
      const text = (node as { value?: string }).value || '';
      wordCount += text.split(/\s+/).filter(w => w.length > 0).length;
    } else if (node.type === 'choice') {
      const choice = node as ChoiceNode;
      if (choice.text) {
        wordCount += countWords(choice.text);
      }
    } else if (node.type === 'conditional') {
      const cond = node as ConditionalNode;
      if (cond.consequent) wordCount += countWords(cond.consequent);
      if (cond.alternatives) {
        for (const alt of cond.alternatives) {
          const branch = alt as ConditionalBranchNode;
          if (branch.content) wordCount += countWords(branch.content);
        }
      }
      if (cond.alternate) wordCount += countWords(cond.alternate);
    }
  }

  return wordCount;
}

/**
 * Count choices in content
 */
function countChoices(content: ContentNode[]): number {
  let choiceCount = 0;

  for (const node of content) {
    if (node.type === 'choice') {
      choiceCount++;
    } else if (node.type === 'conditional') {
      const cond = node as ConditionalNode;
      if (cond.consequent) choiceCount += countChoices(cond.consequent);
      if (cond.alternatives) {
        for (const alt of cond.alternatives) {
          const branch = alt as ConditionalBranchNode;
          if (branch.content) choiceCount += countChoices(branch.content);
        }
      }
      if (cond.alternate) choiceCount += countChoices(cond.alternate);
    }
  }

  return choiceCount;
}

/**
 * Calculate maximum nesting depth in content
 */
function calculateNestingDepth(content: ContentNode[], currentDepth: number = 0): number {
  let maxDepth = currentDepth;

  for (const node of content) {
    if (node.type === 'conditional') {
      const cond = node as ConditionalNode;
      const newDepth = currentDepth + 1;

      if (cond.consequent) {
        maxDepth = Math.max(maxDepth, calculateNestingDepth(cond.consequent, newDepth));
      }
      if (cond.alternatives) {
        for (const alt of cond.alternatives) {
          const branch = alt as ConditionalBranchNode;
          if (branch.content) {
            maxDepth = Math.max(maxDepth, calculateNestingDepth(branch.content, newDepth));
          }
        }
      }
      if (cond.alternate) {
        maxDepth = Math.max(maxDepth, calculateNestingDepth(cond.alternate, newDepth));
      }
    } else if (node.type === 'choice') {
      const choice = node as ChoiceNode;
      if (choice.text) {
        maxDepth = Math.max(maxDepth, calculateNestingDepth(choice.text, currentDepth));
      }
    }
  }

  return maxDepth;
}

/**
 * Calculate cyclomatic complexity of content
 * Complexity = 1 + number of decision points (conditionals, choices)
 */
function calculateComplexity(content: ContentNode[]): number {
  let complexity = 1;

  for (const node of content) {
    if (node.type === 'conditional') {
      const cond = node as ConditionalNode;
      complexity++; // Each conditional adds complexity

      if (cond.consequent) complexity += calculateComplexity(cond.consequent) - 1;
      if (cond.alternatives) {
        for (const alt of cond.alternatives) {
          const branch = alt as ConditionalBranchNode;
          complexity++; // Each branch adds complexity
          if (branch.content) complexity += calculateComplexity(branch.content) - 1;
        }
      }
      if (cond.alternate) complexity += calculateComplexity(cond.alternate) - 1;
    } else if (node.type === 'choice') {
      const choice = node as ChoiceNode;
      if (choice.condition) complexity++; // Conditional choice
      if (choice.text) complexity += calculateComplexity(choice.text) - 1;
    }
  }

  return complexity;
}

/**
 * Count unique variables in a story
 */
function countVariables(story: StoryNode): number {
  const variables = new Set<string>();

  // Count declared variables
  for (const decl of story.variables || []) {
    const name = (decl as { name?: string }).name;
    if (name) variables.add(name);
  }

  // Count variables used in passages (simplified check)
  for (const passage of story.passages) {
    const content = JSON.stringify(passage.content);
    const matches = content.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    for (const match of matches) {
      variables.add(match.substring(1)); // Remove $ prefix
    }
  }

  return variables.size;
}

/**
 * Validate quality aspects of a story
 */
export function validateQuality(
  story: StoryNode,
  thresholds: Partial<QualityThresholds> = {}
): QualityValidationResult {
  const config = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const diagnostics: ValidationDiagnostic[] = [];

  // Calculate metrics
  const totalPassages = story.passages.length;
  let totalChoices = 0;
  let maxComplexity = 0;
  let maxPassageWords = 0;
  let maxNestingDepth = 0;
  let maxComplexityPassage = '';
  let maxWordsPassage = '';
  let maxNestingPassage = '';

  for (const passage of story.passages) {
    const choices = countChoices(passage.content);
    totalChoices += choices;

    const wordCount = countWords(passage.content);
    if (wordCount > maxPassageWords) {
      maxPassageWords = wordCount;
      maxWordsPassage = passage.name;
    }

    const complexity = calculateComplexity(passage.content);
    if (complexity > maxComplexity) {
      maxComplexity = complexity;
      maxComplexityPassage = passage.name;
    }

    const nestingDepth = calculateNestingDepth(passage.content);
    if (nestingDepth > maxNestingDepth) {
      maxNestingDepth = nestingDepth;
      maxNestingPassage = passage.name;
    }
  }

  const branchingFactor = totalPassages > 0 ? totalChoices / totalPassages : 0;
  const totalVariables = countVariables(story);

  // Check low branching factor (WLS-QUA-001)
  if (branchingFactor < config.minBranchingFactor && totalPassages > 1) {
    diagnostics.push({
      code: WLS_ERROR_CODES.LOW_BRANCHING,
      message: `Low branching factor (${branchingFactor.toFixed(2)}) - story may be too linear`,
      severity: 'info',
      suggestion: `Consider adding more choices. Current: ${totalChoices} choices across ${totalPassages} passages`,
    });
  }

  // Check high complexity (WLS-QUA-002)
  if (maxComplexity > config.maxComplexity) {
    diagnostics.push({
      code: WLS_ERROR_CODES.HIGH_COMPLEXITY,
      message: `High complexity in passage "${maxComplexityPassage}" (complexity: ${maxComplexity})`,
      severity: 'info',
      passageId: maxComplexityPassage,
      suggestion: `Consider breaking this passage into smaller parts. Threshold: ${config.maxComplexity}`,
    });
  }

  // Check long passage (WLS-QUA-003)
  if (maxPassageWords > config.maxPassageWordCount) {
    diagnostics.push({
      code: WLS_ERROR_CODES.LONG_PASSAGE,
      message: `Passage "${maxWordsPassage}" is very long (${maxPassageWords} words)`,
      severity: 'info',
      passageId: maxWordsPassage,
      suggestion: `Consider splitting into multiple passages. Threshold: ${config.maxPassageWordCount} words`,
    });
  }

  // Check deep nesting (WLS-QUA-004)
  if (maxNestingDepth > config.maxNestingDepth) {
    diagnostics.push({
      code: WLS_ERROR_CODES.DEEP_NESTING,
      message: `Deep conditional nesting in passage "${maxNestingPassage}" (${maxNestingDepth} levels)`,
      severity: 'warning',
      passageId: maxNestingPassage,
      suggestion: `Consider flattening nested conditionals. Threshold: ${config.maxNestingDepth} levels`,
    });
  }

  // Check many variables (WLS-QUA-005)
  if (totalVariables > config.maxVariableCount) {
    diagnostics.push({
      code: WLS_ERROR_CODES.MANY_VARIABLES,
      message: `Story has many variables (${totalVariables})`,
      severity: 'info',
      suggestion: `Consider reducing variable count or organizing with collections. Threshold: ${config.maxVariableCount}`,
    });
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
    metrics: {
      totalPassages,
      totalChoices,
      branchingFactor,
      maxComplexity,
      maxPassageWords,
      maxNestingDepth,
      totalVariables,
    },
  };
}
