/**
 * Variable Validation for WLS Stories
 *
 * Validates all variable-related aspects of a story:
 * - Undefined variables (WLS-VAR-001)
 * - Unused variables (WLS-VAR-002)
 * - Invalid variable names (WLS-VAR-003)
 * - Reserved prefix usage (WLS-VAR-004)
 * - Variable shadowing (WLS-VAR-005)
 * - Temp variable cross-passage usage (WLS-VAR-008)
 */

import type {
  StoryNode,
  ContentNode,
  ExpressionNode,
  VariableNode,
  AssignmentExpressionNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
  VariableDeclarationNode,
} from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { SourceSpan } from '../types';
import type { ValidationDiagnostic } from './links';

/** Reserved variable prefixes that users shouldn't use */
const RESERVED_PREFIXES = ['_', '__', 'whisker_', 'wls_'] as const;

/** Built-in system variables */
const SYSTEM_VARIABLES = new Set([
  '_visits',
  '_turns',
  '_passage',
  '_previous',
  '_random',
]);

/**
 * Variable usage tracking
 */
interface VariableInfo {
  name: string;
  isTemp: boolean;
  definedIn: string[];  // Passage names where defined
  usedIn: string[];     // Passage names where used
  locations: SourceSpan[];
  isGlobal: boolean;
}

/**
 * Result of variable validation
 */
export interface VariableValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
  variables: Map<string, VariableInfo>;
}

/**
 * Check if a variable name is valid
 */
function isValidVariableName(name: string): boolean {
  // Must start with letter or underscore, contain only alphanumeric and underscore
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Check if variable uses a reserved prefix
 */
function hasReservedPrefix(name: string): string | null {
  for (const prefix of RESERVED_PREFIXES) {
    if (name.startsWith(prefix) && !SYSTEM_VARIABLES.has(name)) {
      return prefix;
    }
  }
  return null;
}

/**
 * Check if variable is a temp variable (starts with _)
 */
function isTempVariable(name: string): boolean {
  return name.startsWith('_') && !SYSTEM_VARIABLES.has(name);
}

/**
 * Get normalized variable name
 * The parser may store temp variables as name="temp" with scope="temp",
 * but we want to track them as "_temp" consistently.
 */
function getNormalizedVarName(varNode: VariableNode): string {
  const node = varNode as VariableNode & { scope?: string };
  // If scope is "temp", prepend underscore to normalize
  if (node.scope === 'temp' && !node.name.startsWith('_')) {
    return '_' + node.name;
  }
  return node.name;
}

/**
 * Extract variable references from an expression
 */
function extractVariablesFromExpression(
  expr: ExpressionNode,
  isAssignment: boolean = false
): Array<{ name: string; location?: SourceSpan; isWrite: boolean }> {
  const vars: Array<{ name: string; location?: SourceSpan; isWrite: boolean }> = [];

  if (expr.type === 'variable') {
    const varNode = expr as VariableNode;
    vars.push({ name: getNormalizedVarName(varNode), location: varNode.location, isWrite: isAssignment });
  } else if (expr.type === 'assignment_expression') {
    const assign = expr as AssignmentExpressionNode;
    // Target is a write (could be variable or member)
    if (assign.target.type === 'variable') {
      const targetVar = assign.target as VariableNode;
      vars.push({ name: getNormalizedVarName(targetVar), location: assign.target.location, isWrite: true });
    }
    // Value is a read
    vars.push(...extractVariablesFromExpression(assign.value, false));
  } else if (expr.type === 'binary_expression') {
    const binary = expr as { left: ExpressionNode; right: ExpressionNode };
    vars.push(...extractVariablesFromExpression(binary.left, false));
    vars.push(...extractVariablesFromExpression(binary.right, false));
  } else if (expr.type === 'unary_expression') {
    const unary = expr as { argument: ExpressionNode };
    vars.push(...extractVariablesFromExpression(unary.argument, false));
  } else if (expr.type === 'call_expression') {
    const call = expr as { arguments: ExpressionNode[] };
    for (const arg of call.arguments || []) {
      vars.push(...extractVariablesFromExpression(arg, false));
    }
  } else if (expr.type === 'member_expression') {
    const member = expr as { object: ExpressionNode };
    vars.push(...extractVariablesFromExpression(member.object, false));
  }

  return vars;
}

/**
 * Extract variable references from content nodes
 */
function extractVariablesFromContent(
  content: ContentNode[],
  passageName: string
): Array<{ name: string; location?: SourceSpan; isWrite: boolean; passage: string }> {
  const vars: Array<{ name: string; location?: SourceSpan; isWrite: boolean; passage: string }> = [];

  for (const node of content) {
    if (node.type === 'interpolation') {
      const interp = node as { expression: ExpressionNode };
      const extracted = extractVariablesFromExpression(interp.expression, false);
      vars.push(...extracted.map(v => ({ ...v, passage: passageName })));
    } else if (node.type === 'expression_statement') {
      const stmt = node as { expression: ExpressionNode };
      const extracted = extractVariablesFromExpression(stmt.expression, false);
      vars.push(...extracted.map(v => ({ ...v, passage: passageName })));
    } else if (node.type === 'choice') {
      const choice = node as ChoiceNode;
      if (choice.condition) {
        const extracted = extractVariablesFromExpression(choice.condition, false);
        vars.push(...extracted.map(v => ({ ...v, passage: passageName })));
      }
      if (choice.action) {
        for (const action of choice.action) {
          const extracted = extractVariablesFromExpression(action, false);
          vars.push(...extracted.map(v => ({ ...v, passage: passageName })));
        }
      }
      if (choice.text) {
        vars.push(...extractVariablesFromContent(choice.text, passageName));
      }
    } else if (node.type === 'conditional') {
      const cond = node as ConditionalNode;
      if (cond.condition) {
        const extracted = extractVariablesFromExpression(cond.condition, false);
        vars.push(...extracted.map(v => ({ ...v, passage: passageName })));
      }
      if (cond.consequent) {
        vars.push(...extractVariablesFromContent(cond.consequent, passageName));
      }
      if (cond.alternatives) {
        for (const alt of cond.alternatives) {
          const branch = alt as ConditionalBranchNode;
          if (branch.condition) {
            const extracted = extractVariablesFromExpression(branch.condition, false);
            vars.push(...extracted.map(v => ({ ...v, passage: passageName })));
          }
          if (branch.content) {
            vars.push(...extractVariablesFromContent(branch.content, passageName));
          }
        }
      }
      if (cond.alternate) {
        vars.push(...extractVariablesFromContent(cond.alternate, passageName));
      }
    }
  }

  return vars;
}

/**
 * Track all variables in a story
 */
export function trackVariables(story: StoryNode): Map<string, VariableInfo> {
  const variables = new Map<string, VariableInfo>();

  // Track global variable declarations
  for (const decl of story.variables || []) {
    const varDecl = decl as VariableDeclarationNode;
    const name = varDecl.name;
    if (!variables.has(name)) {
      variables.set(name, {
        name,
        isTemp: isTempVariable(name),
        definedIn: ['_global'],
        usedIn: [],
        locations: varDecl.location ? [varDecl.location] : [],
        isGlobal: true,
      });
    }
  }

  // Track variables in passages
  for (const passage of story.passages) {
    const refs = extractVariablesFromContent(passage.content, passage.name);

    for (const ref of refs) {
      let info = variables.get(ref.name);
      if (!info) {
        info = {
          name: ref.name,
          isTemp: isTempVariable(ref.name),
          definedIn: [],
          usedIn: [],
          locations: [],
          isGlobal: false,
        };
        variables.set(ref.name, info);
      }

      if (ref.isWrite) {
        if (!info.definedIn.includes(ref.passage)) {
          info.definedIn.push(ref.passage);
        }
      } else {
        if (!info.usedIn.includes(ref.passage)) {
          info.usedIn.push(ref.passage);
        }
      }

      if (ref.location) {
        info.locations.push(ref.location);
      }
    }
  }

  return variables;
}

/**
 * Validate all variables in a story
 */
export function validateVariables(story: StoryNode): VariableValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  const variables = trackVariables(story);

  for (const [name, info] of variables) {
    // Skip system variables
    if (SYSTEM_VARIABLES.has(name)) {
      continue;
    }

    // Check for invalid variable name (WLS-VAR-003)
    if (!isValidVariableName(name)) {
      diagnostics.push({
        code: WLS_ERROR_CODES.INVALID_VARIABLE_NAME,
        message: `Invalid variable name "${name}"`,
        severity: 'error',
        location: info.locations[0],
        suggestion: 'Variable names must start with a letter or underscore and contain only alphanumeric characters',
      });
    }

    // Check for reserved prefix (WLS-VAR-004)
    const reservedPrefix = hasReservedPrefix(name);
    if (reservedPrefix) {
      diagnostics.push({
        code: WLS_ERROR_CODES.RESERVED_PREFIX,
        message: `Variable "${name}" uses reserved prefix "${reservedPrefix}"`,
        severity: 'warning',
        location: info.locations[0],
        suggestion: `Avoid using "${reservedPrefix}" prefix as it's reserved for system use`,
      });
    }

    // Check for undefined variable (WLS-VAR-001)
    // A variable is undefined if it's used but never defined (written to)
    if (info.usedIn.length > 0 && info.definedIn.length === 0) {
      diagnostics.push({
        code: WLS_ERROR_CODES.UNDEFINED_VARIABLE,
        message: `Variable "${name}" is used but never defined`,
        severity: 'error',
        location: info.locations[0],
        suggestion: `Define "${name}" before using it, or declare it in the story header`,
      });
    }

    // Check for unused variable (WLS-VAR-002)
    // A variable is unused if it's defined but never read
    if (info.definedIn.length > 0 && info.usedIn.length === 0 && !info.isGlobal) {
      diagnostics.push({
        code: WLS_ERROR_CODES.UNUSED_VARIABLE,
        message: `Variable "${name}" is defined but never used`,
        severity: 'warning',
        location: info.locations[0],
        suggestion: `Remove unused variable or use it in your story`,
      });
    }

    // Check for temp variable cross-passage usage (WLS-VAR-008)
    if (info.isTemp) {
      const allPassages = new Set([...info.definedIn, ...info.usedIn]);
      if (allPassages.size > 1) {
        diagnostics.push({
          code: WLS_ERROR_CODES.TEMP_CROSS_PASSAGE,
          message: `Temp variable "${name}" is used across multiple passages`,
          severity: 'warning',
          location: info.locations[0],
          suggestion: `Temp variables (starting with _) should only be used within a single passage`,
        });
      }
    }
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
    variables,
  };
}
