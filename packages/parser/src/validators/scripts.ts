/**
 * Script Validation for WLS Stories
 *
 * Validates script-related aspects of a story:
 * - Empty script blocks (WLS-SCR-001)
 * - Script syntax errors (WLS-SCR-002)
 * - Unsafe function usage (WLS-SCR-003)
 * - Script too large (WLS-SCR-004)
 *
 * Note: In WLS, scripts are embedded in do blocks ({do ... /})
 * and expression statements. This validator checks for common issues.
 */

import type {
  StoryNode,
  ContentNode,
  DoBlockNode,
  ExpressionNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
  CallExpressionNode,
  MemberExpressionNode,
} from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { ValidationDiagnostic } from './links';

/** Unsafe function names that should not be used in stories */
const UNSAFE_FUNCTIONS = new Set([
  'os.execute',
  'os.remove',
  'os.rename',
  'os.exit',
  'io.open',
  'io.popen',
  'loadfile',
  'loadstring',
  'dofile',
  'load',
  'require',
  'rawset',
  'rawget',
  'setmetatable',
  'getmetatable',
]);

/** Script size limits */
export interface ScriptSizeLimits {
  maxExpressionCount: number;  // Maximum expressions per do block
  maxTotalExpressions: number; // Maximum total expressions in story
}

const DEFAULT_SIZE_LIMITS: ScriptSizeLimits = {
  maxExpressionCount: 50,
  maxTotalExpressions: 500,
};

/**
 * Result of script validation
 */
export interface ScriptValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
  stats: ScriptStats;
}

/**
 * Statistics about scripts in the story
 */
export interface ScriptStats {
  doBlockCount: number;
  totalExpressions: number;
  unsafeFunctionCalls: string[];
}

/**
 * Check if an expression contains an unsafe function call
 */
function findUnsafeFunctionCalls(expr: ExpressionNode): string[] {
  const unsafe: string[] = [];

  if (!expr) return unsafe;

  if (expr.type === 'call_expression') {
    const call = expr as CallExpressionNode;
    // Check if callee is a member expression like os.execute
    if (call.callee && call.callee.type === 'member_expression') {
      const member = call.callee as MemberExpressionNode;
      if (member.object.type === 'identifier') {
        const objName = (member.object as { name: string }).name;
        const propName = member.property;
        const fullName = `${objName}.${propName}`;
        if (UNSAFE_FUNCTIONS.has(fullName)) {
          unsafe.push(fullName);
        }
      }
    }
    // Check if callee is a direct unsafe function
    if (call.callee && call.callee.type === 'identifier') {
      const funcName = (call.callee as { name: string }).name;
      if (UNSAFE_FUNCTIONS.has(funcName)) {
        unsafe.push(funcName);
      }
    }
    // Check arguments
    if (call.arguments) {
      for (const arg of call.arguments) {
        unsafe.push(...findUnsafeFunctionCalls(arg));
      }
    }
  } else if (expr.type === 'binary_expression') {
    const binary = expr as { left?: ExpressionNode; right?: ExpressionNode };
    if (binary.left) unsafe.push(...findUnsafeFunctionCalls(binary.left));
    if (binary.right) unsafe.push(...findUnsafeFunctionCalls(binary.right));
  } else if (expr.type === 'unary_expression') {
    const unary = expr as { argument?: ExpressionNode };
    if (unary.argument) unsafe.push(...findUnsafeFunctionCalls(unary.argument));
  } else if (expr.type === 'assignment_expression') {
    const assign = expr as { value?: ExpressionNode };
    if (assign.value) unsafe.push(...findUnsafeFunctionCalls(assign.value));
  }

  return unsafe;
}

/**
 * Extract do blocks from content
 */
function extractDoBlocks(
  content: ContentNode[],
  passageName: string
): Array<{ block: DoBlockNode; passageName: string }> {
  const blocks: Array<{ block: DoBlockNode; passageName: string }> = [];

  for (const node of content) {
    if (node.type === 'do_block') {
      blocks.push({ block: node as DoBlockNode, passageName });
    } else if (node.type === 'conditional') {
      const cond = node as ConditionalNode;
      if (cond.consequent) {
        blocks.push(...extractDoBlocks(cond.consequent, passageName));
      }
      if (cond.alternatives) {
        for (const alt of cond.alternatives) {
          const branch = alt as ConditionalBranchNode;
          if (branch.content) {
            blocks.push(...extractDoBlocks(branch.content, passageName));
          }
        }
      }
      if (cond.alternate) {
        blocks.push(...extractDoBlocks(cond.alternate, passageName));
      }
    } else if (node.type === 'choice') {
      const choice = node as ChoiceNode;
      if (choice.text) {
        blocks.push(...extractDoBlocks(choice.text, passageName));
      }
    }
  }

  return blocks;
}

/**
 * Validate all scripts in a story
 */
export function validateScripts(
  story: StoryNode,
  limits: Partial<ScriptSizeLimits> = {}
): ScriptValidationResult {
  const config = { ...DEFAULT_SIZE_LIMITS, ...limits };
  const diagnostics: ValidationDiagnostic[] = [];
  let doBlockCount = 0;
  let totalExpressions = 0;
  const allUnsafeFunctions: string[] = [];

  // Collect all do blocks from passages
  const doBlocks: Array<{ block: DoBlockNode; passageName: string }> = [];
  for (const passage of story.passages) {
    doBlocks.push(...extractDoBlocks(passage.content, passage.name));
  }

  // Validate each do block
  for (const { block, passageName } of doBlocks) {
    doBlockCount++;
    const actions = block.actions || [];
    const actionCount = actions.length;
    totalExpressions += actionCount;

    // Empty script block (WLS-SCR-001)
    if (actionCount === 0) {
      diagnostics.push({
        code: WLS_ERROR_CODES.EMPTY_SCRIPT,
        message: `Empty do block in passage "${passageName}"`,
        severity: 'warning',
        location: block.location,
        passageId: passageName,
        suggestion: 'Add script content or remove the empty block',
      });
      continue;
    }

    // Check for unsafe functions (WLS-SCR-003)
    for (const action of actions) {
      const unsafe = findUnsafeFunctionCalls(action);
      if (unsafe.length > 0) {
        allUnsafeFunctions.push(...unsafe);
        diagnostics.push({
          code: WLS_ERROR_CODES.UNSAFE_FUNCTION,
          message: `Unsafe function(s) used in passage "${passageName}": ${unsafe.join(', ')}`,
          severity: 'warning',
          location: block.location,
          passageId: passageName,
          suggestion: 'Avoid using system-level functions. Use the whisker API instead.',
        });
      }
    }

    // Script too large (WLS-SCR-004) - check per block
    if (actionCount > config.maxExpressionCount) {
      diagnostics.push({
        code: WLS_ERROR_CODES.SCRIPT_TOO_LARGE,
        message: `Do block in passage "${passageName}" has too many expressions (${actionCount} > ${config.maxExpressionCount})`,
        severity: 'warning',
        location: block.location,
        passageId: passageName,
        suggestion: 'Consider splitting into smaller do blocks or using functions',
      });
    }
  }

  // Check total expressions (WLS-SCR-004)
  if (totalExpressions > config.maxTotalExpressions) {
    diagnostics.push({
      code: WLS_ERROR_CODES.SCRIPT_TOO_LARGE,
      message: `Story has too many script expressions (${totalExpressions} > ${config.maxTotalExpressions})`,
      severity: 'warning',
      suggestion: 'Consider reducing script complexity or using external modules',
    });
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
    stats: {
      doBlockCount,
      totalExpressions,
      unsafeFunctionCalls: allUnsafeFunctions,
    },
  };
}

/**
 * Get list of unsafe functions
 */
export function getUnsafeFunctions(): string[] {
  return Array.from(UNSAFE_FUNCTIONS);
}
