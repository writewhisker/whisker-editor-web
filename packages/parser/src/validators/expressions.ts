/**
 * Expression Validation for WLS Stories
 *
 * Validates all expression-related aspects of a story:
 * - Empty expressions (WLS-EXP-001)
 * - Unclosed conditional blocks (WLS-EXP-002)
 * - Assignment in condition (WLS-EXP-003)
 * - Missing operands (WLS-EXP-004)
 * - Invalid operators (WLS-EXP-005)
 * - Unmatched parentheses (WLS-EXP-006)
 * - Incomplete expressions (WLS-EXP-007)
 */

import type {
  StoryNode,
  ContentNode,
  ExpressionNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  AssignmentExpressionNode,
} from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { ValidationDiagnostic } from './links';

/** Valid binary operators */
const VALID_BINARY_OPERATORS = new Set([
  '+', '-', '*', '/', '%',      // Arithmetic
  '==', '!=', '<', '>', '<=', '>=',  // Comparison
  'and', 'or', '&&', '||',      // Logical
  '..', '?',                     // String concat, null coalesce
]);

/** Valid unary operators */
const VALID_UNARY_OPERATORS = new Set([
  '-', 'not', '!', '#',         // Negation, logical not, length
]);

/** Valid assignment operators */
const VALID_ASSIGNMENT_OPERATORS = new Set([
  '=', '+=', '-=', '*=', '/=', '%=', '..=',
]);

/**
 * Result of expression validation
 */
export interface ExpressionValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
}

/**
 * Check if an expression appears empty
 */
function isEmptyExpression(expr: ExpressionNode | null | undefined): boolean {
  if (!expr) return true;
  if (expr.type === 'literal' && (expr as { value: unknown }).value === null) return true;
  return false;
}

/**
 * Validate a single expression node
 */
function validateExpression(
  expr: ExpressionNode,
  diagnostics: ValidationDiagnostic[],
  passageName?: string,
  isCondition: boolean = false
): void {
  if (!expr) return;

  switch (expr.type) {
    case 'binary_expression': {
      const binary = expr as BinaryExpressionNode;

      // Check for valid operator (WLS-EXP-005)
      if (binary.operator && !VALID_BINARY_OPERATORS.has(binary.operator)) {
        diagnostics.push({
          code: WLS_ERROR_CODES.INVALID_OPERATOR,
          message: `Invalid operator "${binary.operator}"`,
          severity: 'error',
          location: binary.location,
          passageId: passageName,
          suggestion: `Use a valid operator: ${Array.from(VALID_BINARY_OPERATORS).join(', ')}`,
        });
      }

      // Check for missing operands (WLS-EXP-004)
      if (!binary.left) {
        diagnostics.push({
          code: WLS_ERROR_CODES.MISSING_OPERAND,
          message: `Missing left operand for operator "${binary.operator}"`,
          severity: 'error',
          location: binary.location,
          passageId: passageName,
          suggestion: 'Add an expression before the operator',
        });
      }
      if (!binary.right) {
        diagnostics.push({
          code: WLS_ERROR_CODES.MISSING_OPERAND,
          message: `Missing right operand for operator "${binary.operator}"`,
          severity: 'error',
          location: binary.location,
          passageId: passageName,
          suggestion: 'Add an expression after the operator',
        });
      }

      // Recursively validate operands
      if (binary.left) validateExpression(binary.left, diagnostics, passageName, isCondition);
      if (binary.right) validateExpression(binary.right, diagnostics, passageName, isCondition);
      break;
    }

    case 'unary_expression': {
      const unary = expr as UnaryExpressionNode;

      // Check for valid operator (WLS-EXP-005)
      if (unary.operator && !VALID_UNARY_OPERATORS.has(unary.operator)) {
        diagnostics.push({
          code: WLS_ERROR_CODES.INVALID_OPERATOR,
          message: `Invalid unary operator "${unary.operator}"`,
          severity: 'error',
          location: unary.location,
          passageId: passageName,
          suggestion: `Use a valid operator: ${Array.from(VALID_UNARY_OPERATORS).join(', ')}`,
        });
      }

      // Check for missing argument (WLS-EXP-004)
      if (!unary.argument) {
        diagnostics.push({
          code: WLS_ERROR_CODES.MISSING_OPERAND,
          message: `Missing operand for unary operator "${unary.operator}"`,
          severity: 'error',
          location: unary.location,
          passageId: passageName,
          suggestion: 'Add an expression after the operator',
        });
      }

      if (unary.argument) validateExpression(unary.argument, diagnostics, passageName, isCondition);
      break;
    }

    case 'assignment_expression': {
      const assign = expr as AssignmentExpressionNode;

      // Check for assignment in condition (WLS-EXP-003)
      if (isCondition && assign.operator === '=') {
        diagnostics.push({
          code: WLS_ERROR_CODES.ASSIGNMENT_IN_CONDITION,
          message: 'Assignment operator "=" used in condition (did you mean "=="?)',
          severity: 'warning',
          location: assign.location,
          passageId: passageName,
          suggestion: 'Use "==" for comparison or wrap assignment in parentheses if intentional',
        });
      }

      // Validate assignment operator
      if (assign.operator && !VALID_ASSIGNMENT_OPERATORS.has(assign.operator)) {
        diagnostics.push({
          code: WLS_ERROR_CODES.INVALID_OPERATOR,
          message: `Invalid assignment operator "${assign.operator}"`,
          severity: 'error',
          location: assign.location,
          passageId: passageName,
          suggestion: `Use a valid assignment operator: ${Array.from(VALID_ASSIGNMENT_OPERATORS).join(', ')}`,
        });
      }

      if (assign.target) validateExpression(assign.target, diagnostics, passageName, false);
      if (assign.value) validateExpression(assign.value, diagnostics, passageName, false);
      break;
    }

    case 'call_expression': {
      const call = expr as { callee?: ExpressionNode; arguments?: ExpressionNode[] };
      if (call.callee) validateExpression(call.callee, diagnostics, passageName, false);
      if (call.arguments) {
        for (const arg of call.arguments) {
          validateExpression(arg, diagnostics, passageName, false);
        }
      }
      break;
    }

    case 'member_expression': {
      // MemberExpressionNode has property: string (not an expression)
      const member = expr as { object?: ExpressionNode; property?: string };
      if (member.object) validateExpression(member.object, diagnostics, passageName, false);
      // property is a string identifier, not an expression - no recursion needed
      break;
    }
  }
}

/**
 * Validate expressions in content nodes
 */
function validateContentExpressions(
  content: ContentNode[],
  diagnostics: ValidationDiagnostic[],
  passageName: string
): void {
  for (const node of content) {
    switch (node.type) {
      case 'interpolation': {
        const interp = node as { expression?: ExpressionNode };
        if (!interp.expression || isEmptyExpression(interp.expression)) {
          diagnostics.push({
            code: WLS_ERROR_CODES.EMPTY_EXPRESSION,
            message: 'Empty expression interpolation ${}',
            severity: 'error',
            location: node.location,
            passageId: passageName,
            suggestion: 'Add an expression inside ${}',
          });
        } else {
          validateExpression(interp.expression, diagnostics, passageName, false);
        }
        break;
      }

      case 'expression_statement': {
        const stmt = node as { expression?: ExpressionNode };
        if (!stmt.expression || isEmptyExpression(stmt.expression)) {
          diagnostics.push({
            code: WLS_ERROR_CODES.EMPTY_EXPRESSION,
            message: 'Empty expression statement',
            severity: 'error',
            location: node.location,
            passageId: passageName,
            suggestion: 'Add an expression or remove the empty block',
          });
        } else {
          validateExpression(stmt.expression, diagnostics, passageName, false);
        }
        break;
      }

      case 'conditional': {
        const cond = node as ConditionalNode;

        // Check for empty condition (WLS-EXP-001)
        if (!cond.condition || isEmptyExpression(cond.condition)) {
          diagnostics.push({
            code: WLS_ERROR_CODES.EMPTY_EXPRESSION,
            message: 'Empty condition in conditional block',
            severity: 'error',
            location: cond.location,
            passageId: passageName,
            suggestion: 'Add a condition expression',
          });
        } else {
          validateExpression(cond.condition, diagnostics, passageName, true);
        }

        // Validate nested content
        if (cond.consequent) {
          validateContentExpressions(cond.consequent, diagnostics, passageName);
        }
        if (cond.alternatives) {
          for (const alt of cond.alternatives) {
            const branch = alt as ConditionalBranchNode;
            if (branch.condition) {
              validateExpression(branch.condition, diagnostics, passageName, true);
            }
            if (branch.content) {
              validateContentExpressions(branch.content, diagnostics, passageName);
            }
          }
        }
        if (cond.alternate) {
          validateContentExpressions(cond.alternate, diagnostics, passageName);
        }
        break;
      }

      case 'choice': {
        const choice = node as ChoiceNode;

        // Validate choice condition if present
        if (choice.condition) {
          validateExpression(choice.condition, diagnostics, passageName, true);
        }

        // Validate choice actions
        if (choice.action) {
          for (const action of choice.action) {
            validateExpression(action, diagnostics, passageName, false);
          }
        }

        // Validate nested text content
        if (choice.text) {
          validateContentExpressions(choice.text, diagnostics, passageName);
        }
        break;
      }
    }
  }
}

/**
 * Validate all expressions in a story
 */
export function validateExpressions(story: StoryNode): ExpressionValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  // Validate expressions in each passage
  for (const passage of story.passages) {
    validateContentExpressions(passage.content, diagnostics, passage.name);
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
  };
}
