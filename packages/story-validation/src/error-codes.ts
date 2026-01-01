/**
 * WLS 1.0 Unified Error Codes
 *
 * All validation error codes following the format: WLS-{CATEGORY}-{NUMBER}
 */

import type { ValidationCategory, ValidationSeverity } from './types';

/**
 * Error code definition
 */
export interface ErrorCodeDefinition {
  code: string;
  name: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  message: string;
  description: string;
}

/**
 * All WLS 1.0 validation error codes
 */
export const WLS_ERROR_CODES = {
  // Structure (STR)
  'WLS-STR-001': {
    code: 'WLS-STR-001',
    name: 'missing_start_passage',
    category: 'structure' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'No start passage defined',
    description: 'Every story must have a passage named "Start" or specify a start passage via @start: directive.',
  },
  'WLS-STR-002': {
    code: 'WLS-STR-002',
    name: 'unreachable_passage',
    category: 'structure' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Passage "{passageName}" is unreachable',
    description: 'This passage cannot be reached from the start passage through any path of choices.',
  },
  'WLS-STR-003': {
    code: 'WLS-STR-003',
    name: 'duplicate_passage',
    category: 'structure' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Duplicate passage name: "{passageName}"',
    description: 'Multiple passages have the same name.',
  },
  'WLS-STR-004': {
    code: 'WLS-STR-004',
    name: 'empty_passage',
    category: 'structure' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Passage "{passageName}" is empty',
    description: 'This passage has no content and no choices.',
  },
  'WLS-STR-005': {
    code: 'WLS-STR-005',
    name: 'orphan_passage',
    category: 'structure' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Passage "{passageName}" has no incoming links',
    description: 'No other passages link to this passage (except if it\'s the start passage).',
  },
  'WLS-STR-006': {
    code: 'WLS-STR-006',
    name: 'no_terminal',
    category: 'structure' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Story has no terminal passages',
    description: 'The story has no passages that end the story (via -> END or having no choices).',
  },

  // Links (LNK)
  'WLS-LNK-001': {
    code: 'WLS-LNK-001',
    name: 'dead_link',
    category: 'links' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Choice links to non-existent passage: "{targetPassage}"',
    description: 'The target passage does not exist in the story.',
  },
  'WLS-LNK-002': {
    code: 'WLS-LNK-002',
    name: 'self_link_no_change',
    category: 'links' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Choice links to same passage without state change',
    description: 'This choice links back to the same passage without any action, potentially causing an infinite loop.',
  },
  'WLS-LNK-003': {
    code: 'WLS-LNK-003',
    name: 'special_target_case',
    category: 'links' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Special target "{actual}" should be "{expected}"',
    description: 'Special targets (END, BACK, RESTART) must be uppercase.',
  },
  'WLS-LNK-004': {
    code: 'WLS-LNK-004',
    name: 'back_on_start',
    category: 'links' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'BACK used on start passage',
    description: 'Using BACK on the start passage has no effect since there\'s no history.',
  },
  'WLS-LNK-005': {
    code: 'WLS-LNK-005',
    name: 'empty_choice_target',
    category: 'links' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Choice has no target',
    description: 'Every choice must have a target passage or special target.',
  },

  // Variables (VAR)
  'WLS-VAR-001': {
    code: 'WLS-VAR-001',
    name: 'undefined_variable',
    category: 'variables' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Undefined variable: "{variableName}"',
    description: 'This variable is used before it is defined.',
  },
  'WLS-VAR-002': {
    code: 'WLS-VAR-002',
    name: 'unused_variable',
    category: 'variables' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Unused variable: "{variableName}"',
    description: 'This variable is declared but never used.',
  },
  'WLS-VAR-003': {
    code: 'WLS-VAR-003',
    name: 'invalid_variable_name',
    category: 'variables' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid variable name: "{variableName}"',
    description: 'Variable names must start with a letter or underscore and contain only alphanumerics.',
  },
  'WLS-VAR-004': {
    code: 'WLS-VAR-004',
    name: 'reserved_prefix',
    category: 'variables' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Variable uses reserved prefix: "{variableName}"',
    description: 'Variables starting with "whisker_" or "__" are reserved.',
  },
  'WLS-VAR-005': {
    code: 'WLS-VAR-005',
    name: 'shadowing',
    category: 'variables' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Temporary variable shadows story variable: "{variableName}"',
    description: 'A temp variable ($_var) has the same name as a story variable ($var).',
  },
  'WLS-VAR-006': {
    code: 'WLS-VAR-006',
    name: 'lone_dollar',
    category: 'variables' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Lone $ not followed by variable name',
    description: 'A $ character appears but is not followed by a valid variable name.',
  },
  'WLS-VAR-007': {
    code: 'WLS-VAR-007',
    name: 'unclosed_interpolation',
    category: 'variables' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Unclosed expression interpolation',
    description: 'An expression interpolation ${ is not closed with }.',
  },
  'WLS-VAR-008': {
    code: 'WLS-VAR-008',
    name: 'temp_cross_passage',
    category: 'variables' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Temp variable used in different passage: "{variableName}"',
    description: 'Temporary variables ($_var) are only valid within the passage where they are defined.',
  },

  // Expressions (EXP)
  'WLS-EXP-001': {
    code: 'WLS-EXP-001',
    name: 'empty_expression',
    category: 'expression' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Empty expression',
    description: 'An expression block ${} or condition {} is empty.',
  },
  'WLS-EXP-002': {
    code: 'WLS-EXP-002',
    name: 'unclosed_block',
    category: 'expression' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Unclosed conditional block',
    description: 'A conditional block { is not closed with {/}.',
  },
  'WLS-EXP-003': {
    code: 'WLS-EXP-003',
    name: 'assignment_in_condition',
    category: 'expression' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Assignment in condition (did you mean ==?)',
    description: 'Single = (assignment) used in a condition where == (comparison) was likely intended.',
  },
  'WLS-EXP-004': {
    code: 'WLS-EXP-004',
    name: 'missing_operand',
    category: 'expression' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Missing operand in expression',
    description: 'A binary operator is missing an operand.',
  },
  'WLS-EXP-005': {
    code: 'WLS-EXP-005',
    name: 'invalid_operator',
    category: 'expression' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid operator: "{operator}"',
    description: 'An unknown or invalid operator is used.',
  },
  'WLS-EXP-006': {
    code: 'WLS-EXP-006',
    name: 'unmatched_parenthesis',
    category: 'expression' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Unmatched parenthesis',
    description: 'Parentheses are not balanced.',
  },
  'WLS-EXP-007': {
    code: 'WLS-EXP-007',
    name: 'incomplete_expression',
    category: 'expression' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Incomplete expression',
    description: 'Expression is syntactically incomplete.',
  },

  // Flow (FLW)
  'WLS-FLW-001': {
    code: 'WLS-FLW-001',
    name: 'dead_end',
    category: 'content' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Passage "{passageName}" is a dead end',
    description: 'This passage has no choices and is not a terminal passage.',
  },
  'WLS-FLW-002': {
    code: 'WLS-FLW-002',
    name: 'bottleneck',
    category: 'structure' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Passage "{passageName}" is a bottleneck',
    description: 'All paths through the story must pass through this passage.',
  },
  'WLS-FLW-003': {
    code: 'WLS-FLW-003',
    name: 'cycle_detected',
    category: 'structure' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Story contains cycles',
    description: 'The story contains cycles (loops back to earlier passages).',
  },
  'WLS-FLW-004': {
    code: 'WLS-FLW-004',
    name: 'infinite_loop',
    category: 'structure' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Potential infinite loop in "{passageName}"',
    description: 'A potential infinite loop exists with no exit condition.',
  },
  'WLS-FLW-005': {
    code: 'WLS-FLW-005',
    name: 'unreachable_choice',
    category: 'content' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Choice condition is always false',
    description: 'This choice can never be selected because its condition is always false.',
  },
  'WLS-FLW-006': {
    code: 'WLS-FLW-006',
    name: 'always_true_condition',
    category: 'content' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Choice condition is always true',
    description: 'This choice condition is always true and could be simplified.',
  },

  // Quality (QUA)
  'WLS-QUA-001': {
    code: 'WLS-QUA-001',
    name: 'low_branching',
    category: 'quality' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Low branching factor ({value})',
    description: 'Average choices per passage is below threshold.',
  },
  'WLS-QUA-002': {
    code: 'WLS-QUA-002',
    name: 'high_complexity',
    category: 'quality' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'High story complexity',
    description: 'Story complexity score exceeds threshold.',
  },
  'WLS-QUA-003': {
    code: 'WLS-QUA-003',
    name: 'long_passage',
    category: 'content' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Passage "{passageName}" is very long ({wordCount} words)',
    description: 'This passage exceeds the word count threshold.',
  },
  'WLS-QUA-004': {
    code: 'WLS-QUA-004',
    name: 'deep_nesting',
    category: 'content' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Deep conditional nesting ({depth} levels)',
    description: 'Conditional nesting exceeds recommended depth.',
  },
  'WLS-QUA-005': {
    code: 'WLS-QUA-005',
    name: 'many_variables',
    category: 'quality' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Story has many variables ({count})',
    description: 'Story has more variables than threshold.',
  },

  // Syntax (SYN)
  'WLS-SYN-001': {
    code: 'WLS-SYN-001',
    name: 'syntax_error',
    category: 'syntax' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Syntax error in "{passageName}"',
    description: 'Parse error in passage content.',
  },
  'WLS-SYN-002': {
    code: 'WLS-SYN-002',
    name: 'unmatched_braces',
    category: 'syntax' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Unmatched braces in stylesheet',
    description: 'Opening and closing braces are not balanced.',
  },
  'WLS-SYN-003': {
    code: 'WLS-SYN-003',
    name: 'unmatched_keywords',
    category: 'syntax' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Unmatched Lua keywords',
    description: 'Lua keywords like function/end or if/then are not balanced.',
  },

  // Assets (AST)
  'WLS-AST-001': {
    code: 'WLS-AST-001',
    name: 'missing_asset_id',
    category: 'content' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Asset missing ID',
    description: 'Asset must have a unique ID.',
  },
  'WLS-AST-002': {
    code: 'WLS-AST-002',
    name: 'missing_asset_path',
    category: 'content' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Asset "{assetId}" missing path',
    description: 'Asset must have a path or data URI.',
  },
  'WLS-AST-003': {
    code: 'WLS-AST-003',
    name: 'broken_asset_reference',
    category: 'content' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Broken asset reference: "{assetId}"',
    description: 'Referenced asset does not exist.',
  },
  'WLS-AST-004': {
    code: 'WLS-AST-004',
    name: 'unused_asset',
    category: 'content' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Unused asset: "{assetName}"',
    description: 'This asset is not referenced in any passage.',
  },
  'WLS-AST-005': {
    code: 'WLS-AST-005',
    name: 'missing_asset_name',
    category: 'content' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Asset "{assetId}" missing name',
    description: 'Asset should have a descriptive name.',
  },
  'WLS-AST-006': {
    code: 'WLS-AST-006',
    name: 'missing_mimetype',
    category: 'content' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Asset "{assetId}" missing MIME type',
    description: 'Asset should specify a MIME type.',
  },
  'WLS-AST-007': {
    code: 'WLS-AST-007',
    name: 'large_asset',
    category: 'content' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Asset "{assetName}" is large ({size})',
    description: 'Asset exceeds recommended size.',
  },

  // Metadata (META)
  'WLS-META-001': {
    code: 'WLS-META-001',
    name: 'missing_ifid',
    category: 'structure' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Missing IFID',
    description: 'Story should have an Interactive Fiction ID.',
  },
  'WLS-META-002': {
    code: 'WLS-META-002',
    name: 'invalid_ifid',
    category: 'structure' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid IFID format',
    description: 'IFID must be a valid UUID v4.',
  },
  'WLS-META-003': {
    code: 'WLS-META-003',
    name: 'invalid_dimensions',
    category: 'structure' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid passage dimensions',
    description: 'Passage dimensions must be positive.',
  },
  'WLS-META-004': {
    code: 'WLS-META-004',
    name: 'reserved_metadata_key',
    category: 'structure' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Reserved metadata key: "{key}"',
    description: 'Metadata key conflicts with a built-in property.',
  },
  'WLS-META-005': {
    code: 'WLS-META-005',
    name: 'large_metadata',
    category: 'structure' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Large metadata ({size})',
    description: 'Metadata size exceeds threshold.',
  },

  // Scripts (SCR)
  'WLS-SCR-001': {
    code: 'WLS-SCR-001',
    name: 'empty_script',
    category: 'content' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Empty script',
    description: 'This script is empty and can be removed.',
  },
  'WLS-SCR-002': {
    code: 'WLS-SCR-002',
    name: 'script_syntax_error',
    category: 'content' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Script syntax error',
    description: 'Script contains syntax errors.',
  },
  'WLS-SCR-003': {
    code: 'WLS-SCR-003',
    name: 'unsafe_function',
    category: 'content' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Potentially unsafe function: "{function}"',
    description: 'This function may not be available in sandboxed environments.',
  },
  'WLS-SCR-004': {
    code: 'WLS-SCR-004',
    name: 'large_script',
    category: 'content' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Large script ({size})',
    description: 'Script size exceeds threshold.',
  },
} as const;

/**
 * Get error code definition
 */
export function getErrorCode(code: keyof typeof WLS_ERROR_CODES): ErrorCodeDefinition {
  return WLS_ERROR_CODES[code];
}

/**
 * Format error message with context values
 */
export function formatErrorMessage(code: keyof typeof WLS_ERROR_CODES, context: Record<string, unknown> = {}): string {
  let message: string = WLS_ERROR_CODES[code].message;
  for (const [key, value] of Object.entries(context)) {
    message = message.replace(`{${key}}`, String(value));
  }
  return message;
}

/**
 * Get all error codes for a category
 */
export function getErrorsByCategory(category: ValidationCategory): ErrorCodeDefinition[] {
  return Object.values(WLS_ERROR_CODES).filter(def => def.category === category);
}

/**
 * Get all error codes by severity
 */
export function getErrorsBySeverity(severity: ValidationSeverity): ErrorCodeDefinition[] {
  return Object.values(WLS_ERROR_CODES).filter(def => def.severity === severity);
}
