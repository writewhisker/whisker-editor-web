/**
 * Unified Error Codes
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
 * All WLS validation error codes
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
  'WLS-QUA-006': {
    code: 'WLS-QUA-006',
    name: 'too_many_choices',
    category: 'quality' as ValidationCategory,
    severity: 'info' as ValidationSeverity,
    message: 'Passage "{passageName}" has too many choices ({count})',
    description: 'Passage has more choices than recommended threshold.',
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

  // Collections (COL)
  'WLS-COL-001': {
    code: 'WLS-COL-001',
    name: 'duplicate_list_value',
    category: 'collections' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Duplicate value "{value}" in LIST "{listName}"',
    description: 'LIST declarations cannot have duplicate values.',
  },
  'WLS-COL-002': {
    code: 'WLS-COL-002',
    name: 'empty_list',
    category: 'collections' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'LIST "{listName}" has no values',
    description: 'A LIST declaration should have at least one value.',
  },
  'WLS-COL-003': {
    code: 'WLS-COL-003',
    name: 'invalid_list_value',
    category: 'collections' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid value name "{value}" in LIST "{listName}"',
    description: 'LIST values must be valid identifiers.',
  },
  'WLS-COL-004': {
    code: 'WLS-COL-004',
    name: 'duplicate_array_index',
    category: 'collections' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Duplicate index {index} in ARRAY "{arrayName}"',
    description: 'ARRAY declarations cannot have duplicate explicit indices.',
  },
  'WLS-COL-005': {
    code: 'WLS-COL-005',
    name: 'negative_array_index',
    category: 'collections' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Negative index {index} in ARRAY "{arrayName}"',
    description: 'ARRAY indices must be non-negative.',
  },
  'WLS-COL-006': {
    code: 'WLS-COL-006',
    name: 'duplicate_map_key',
    category: 'collections' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Duplicate key "{key}" in MAP "{mapName}"',
    description: 'MAP declarations cannot have duplicate keys.',
  },
  'WLS-COL-007': {
    code: 'WLS-COL-007',
    name: 'invalid_map_key',
    category: 'collections' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid key "{key}" in MAP "{mapName}"',
    description: 'MAP keys must be valid identifiers or strings.',
  },
  'WLS-COL-008': {
    code: 'WLS-COL-008',
    name: 'undefined_list',
    category: 'collections' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Undefined LIST: "{listName}"',
    description: 'Referenced LIST is not defined.',
  },
  'WLS-COL-009': {
    code: 'WLS-COL-009',
    name: 'undefined_array',
    category: 'collections' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Undefined ARRAY: "{arrayName}"',
    description: 'Referenced ARRAY is not defined.',
  },
  'WLS-COL-010': {
    code: 'WLS-COL-010',
    name: 'undefined_map',
    category: 'collections' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Undefined MAP: "{mapName}"',
    description: 'Referenced MAP is not defined.',
  },

  // Modules (MOD)
  'WLS-MOD-001': {
    code: 'WLS-MOD-001',
    name: 'include_not_found',
    category: 'modules' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Include file not found: "{path}"',
    description: 'The included file does not exist.',
  },
  'WLS-MOD-002': {
    code: 'WLS-MOD-002',
    name: 'circular_include',
    category: 'modules' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Circular include detected: "{path}"',
    description: 'The included file creates a circular dependency.',
  },
  'WLS-MOD-003': {
    code: 'WLS-MOD-003',
    name: 'undefined_function',
    category: 'modules' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Undefined function: "{functionName}"',
    description: 'This function is called but not defined.',
  },
  'WLS-MOD-004': {
    code: 'WLS-MOD-004',
    name: 'namespace_conflict',
    category: 'modules' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Namespace conflict: "{passageName}"',
    description: 'Multiple passages have the same fully-qualified name.',
  },
  'WLS-MOD-005': {
    code: 'WLS-MOD-005',
    name: 'stack_overflow',
    category: 'modules' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Function call stack overflow detected',
    description: 'Recursive function calls exceed the maximum depth.',
  },
  'WLS-MOD-006': {
    code: 'WLS-MOD-006',
    name: 'invalid_function_name',
    category: 'modules' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid function name: "{functionName}"',
    description: 'Function names must be valid identifiers.',
  },
  'WLS-MOD-007': {
    code: 'WLS-MOD-007',
    name: 'invalid_namespace_name',
    category: 'modules' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid namespace name: "{namespaceName}"',
    description: 'Namespace names must be valid identifiers.',
  },
  'WLS-MOD-008': {
    code: 'WLS-MOD-008',
    name: 'unmatched_end_namespace',
    category: 'modules' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Unmatched END NAMESPACE',
    description: 'An END NAMESPACE was found without a matching NAMESPACE declaration.',
  },

  // Presentation (PRS)
  'WLS-PRS-001': {
    code: 'WLS-PRS-001',
    name: 'invalid_markdown',
    category: 'presentation' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid markdown syntax: {detail}',
    description: 'The markdown formatting is malformed.',
  },
  'WLS-PRS-002': {
    code: 'WLS-PRS-002',
    name: 'invalid_css_class',
    category: 'presentation' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid CSS class name: "{className}"',
    description: 'CSS class names must start with a letter or hyphen and contain only alphanumerics, hyphens, and underscores.',
  },
  'WLS-PRS-003': {
    code: 'WLS-PRS-003',
    name: 'missing_media_asset',
    category: 'presentation' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Missing media asset: "{path}"',
    description: 'The referenced media file was not found.',
  },
  'WLS-PRS-004': {
    code: 'WLS-PRS-004',
    name: 'invalid_theme',
    category: 'presentation' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Invalid theme: "{themeName}"',
    description: 'Unknown or invalid theme name.',
  },
  'WLS-PRS-005': {
    code: 'WLS-PRS-005',
    name: 'invalid_media_attribute',
    category: 'presentation' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Invalid media attribute: "{attribute}"',
    description: 'Unknown media attribute specified.',
  },
  'WLS-PRS-006': {
    code: 'WLS-PRS-006',
    name: 'unclosed_formatting',
    category: 'presentation' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Unclosed formatting: {marker}',
    description: 'Formatting markers like ** or * must be closed.',
  },
  'WLS-PRS-007': {
    code: 'WLS-PRS-007',
    name: 'invalid_style_property',
    category: 'presentation' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Invalid style property: "{property}"',
    description: 'Unknown CSS custom property in STYLE block.',
  },
  'WLS-PRS-008': {
    code: 'WLS-PRS-008',
    name: 'nested_blockquote_depth',
    category: 'presentation' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Blockquote nesting exceeds recommended depth ({depth})',
    description: 'Deeply nested blockquotes may affect readability.',
  },

  // Developer Experience (DEV)
  'WLS-DEV-001': {
    code: 'WLS-DEV-001',
    name: 'lsp_connection_failed',
    category: 'structure' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Failed to connect to language server',
    description: 'The language server could not be started or connected to.',
  },
  'WLS-DEV-002': {
    code: 'WLS-DEV-002',
    name: 'debug_adapter_error',
    category: 'structure' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Debug adapter protocol error: {detail}',
    description: 'An error occurred in the debug adapter.',
  },
  'WLS-DEV-003': {
    code: 'WLS-DEV-003',
    name: 'format_parse_error',
    category: 'syntax' as ValidationCategory,
    severity: 'error' as ValidationSeverity,
    message: 'Cannot format: file has parse errors',
    description: 'The file cannot be formatted because it contains syntax errors.',
  },
  'WLS-DEV-004': {
    code: 'WLS-DEV-004',
    name: 'preview_runtime_error',
    category: 'content' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Error during story preview: {detail}',
    description: 'A runtime error occurred while previewing the story.',
  },
  'WLS-DEV-005': {
    code: 'WLS-DEV-005',
    name: 'breakpoint_invalid_location',
    category: 'content' as ValidationCategory,
    severity: 'warning' as ValidationSeverity,
    message: 'Breakpoint at invalid location: line {line}',
    description: 'A breakpoint was set at a location that cannot be executed.',
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
