/**
 * WLS 1.0 Expression Evaluator
 *
 * Evaluates AST expression nodes against a runtime context.
 * Supports all WLS 1.0 operators and the whisker.* API.
 */

import type {
  ExpressionNode,
  LiteralNode,
  VariableNode,
  IdentifierNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode,
  MemberExpressionNode,
  AssignmentExpressionNode,
  BinaryOperator,
  UnaryOperator,
  AssignmentOperator,
} from '@writewhisker/parser';

import type { WhiskerRuntimeContext, WhiskerValue } from './whiskerApi';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of expression evaluation
 */
export type EvalResult = WhiskerValue;

/**
 * Evaluation error with context
 */
export class EvaluationError extends Error {
  constructor(
    message: string,
    public readonly node?: ExpressionNode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'EvaluationError';
  }
}

/**
 * Options for expression evaluation
 */
export interface EvalOptions {
  /** Maximum call stack depth (default: 100) */
  maxCallDepth?: number;
  /** Enable debug logging */
  debug?: boolean;
}

// ============================================================================
// Expression Evaluator
// ============================================================================

/**
 * Expression evaluator for WLS 1.0 AST nodes
 */
export class ExpressionEvaluator {
  private callDepth = 0;
  private readonly maxCallDepth: number;
  private readonly debug: boolean;

  constructor(
    private readonly context: WhiskerRuntimeContext,
    options: EvalOptions = {}
  ) {
    this.maxCallDepth = options.maxCallDepth ?? 100;
    this.debug = options.debug ?? false;
  }

  /**
   * Evaluate an expression node
   */
  evaluate(node: ExpressionNode): EvalResult {
    if (this.debug) {
      console.log('Evaluating:', node.type);
    }

    switch (node.type) {
      case 'literal':
        return this.evaluateLiteral(node);
      case 'variable':
        return this.evaluateVariable(node);
      case 'identifier':
        return this.evaluateIdentifier(node);
      case 'binary_expression':
        return this.evaluateBinary(node);
      case 'unary_expression':
        return this.evaluateUnary(node);
      case 'call_expression':
        return this.evaluateCall(node);
      case 'member_expression':
        return this.evaluateMember(node);
      case 'assignment_expression':
        return this.evaluateAssignment(node);
      default:
        throw new EvaluationError(`Unknown expression type: ${(node as ExpressionNode).type}`, node);
    }
  }

  /**
   * Evaluate a literal value
   */
  private evaluateLiteral(node: LiteralNode): EvalResult {
    return node.value;
  }

  /**
   * Evaluate a variable reference
   */
  private evaluateVariable(node: VariableNode): EvalResult {
    const value = this.context.getVariable(node.name);
    return value === undefined ? null : value;
  }

  /**
   * Evaluate an identifier (for function names, etc.)
   */
  private evaluateIdentifier(node: IdentifierNode): EvalResult {
    // Identifiers are typically resolved in context (e.g., as function names)
    // For now, treat as a variable lookup
    const value = this.context.getVariable(node.name);
    return value === undefined ? null : value;
  }

  /**
   * Evaluate a binary expression
   */
  private evaluateBinary(node: BinaryExpressionNode): EvalResult {
    const op = node.operator;

    // Short-circuit evaluation for logical operators
    if (op === 'and') {
      const left = this.evaluate(node.left);
      if (!this.isTruthy(left)) return left;
      return this.evaluate(node.right);
    }

    if (op === 'or') {
      const left = this.evaluate(node.left);
      if (this.isTruthy(left)) return left;
      return this.evaluate(node.right);
    }

    // Evaluate both sides for other operators
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);

    return this.applyBinaryOperator(op, left, right, node);
  }

  /**
   * Apply a binary operator to two values
   */
  private applyBinaryOperator(
    op: BinaryOperator,
    left: EvalResult,
    right: EvalResult,
    node: BinaryExpressionNode
  ): EvalResult {
    switch (op) {
      // Arithmetic
      case '+':
        return this.toNumber(left) + this.toNumber(right);
      case '-':
        return this.toNumber(left) - this.toNumber(right);
      case '*':
        return this.toNumber(left) * this.toNumber(right);
      case '/': {
        const divisor = this.toNumber(right);
        if (divisor === 0) {
          throw new EvaluationError('Division by zero', node);
        }
        return this.toNumber(left) / divisor;
      }
      case '%': {
        const divisor = this.toNumber(right);
        if (divisor === 0) {
          throw new EvaluationError('Modulo by zero', node);
        }
        return this.toNumber(left) % divisor;
      }
      case '^':
        return Math.pow(this.toNumber(left), this.toNumber(right));

      // String concatenation
      case '..':
        return this.toString(left) + this.toString(right);

      // Comparison
      case '==':
        return this.equals(left, right);
      case '~=':
        return !this.equals(left, right);
      case '<':
        return this.compare(left, right) < 0;
      case '>':
        return this.compare(left, right) > 0;
      case '<=':
        return this.compare(left, right) <= 0;
      case '>=':
        return this.compare(left, right) >= 0;

      // Logical (handled above, but for completeness)
      case 'and':
      case 'or':
        throw new EvaluationError(`Operator ${op} should be handled with short-circuit evaluation`, node);

      default:
        throw new EvaluationError(`Unknown binary operator: ${op}`, node);
    }
  }

  /**
   * Evaluate a unary expression
   */
  private evaluateUnary(node: UnaryExpressionNode): EvalResult {
    const value = this.evaluate(node.argument);
    return this.applyUnaryOperator(node.operator, value, node);
  }

  /**
   * Apply a unary operator
   */
  private applyUnaryOperator(
    op: UnaryOperator,
    value: EvalResult,
    node: UnaryExpressionNode
  ): EvalResult {
    switch (op) {
      case '-':
        return -this.toNumber(value);
      case 'not':
        return !this.isTruthy(value);
      case '#':
        // Length operator
        if (typeof value === 'string') {
          return value.length;
        }
        if (Array.isArray(value)) {
          return value.length;
        }
        if (value !== null && typeof value === 'object') {
          return Object.keys(value).length;
        }
        throw new EvaluationError('Length operator (#) requires string, array, or table', node);
      default:
        throw new EvaluationError(`Unknown unary operator: ${op}`, node);
    }
  }

  /**
   * Evaluate a function call
   */
  private evaluateCall(node: CallExpressionNode): EvalResult {
    if (this.callDepth >= this.maxCallDepth) {
      throw new EvaluationError('Maximum call depth exceeded', node);
    }

    this.callDepth++;
    try {
      // Get the function path (e.g., "whisker.state.get")
      const funcPath = this.getFunctionPath(node.callee);

      // Evaluate arguments
      const args = node.arguments.map(arg => this.evaluate(arg));

      // Call the function
      return this.callFunction(funcPath, args, node);
    } finally {
      this.callDepth--;
    }
  }

  /**
   * Get the full path of a function call (e.g., "whisker.state.get")
   */
  private getFunctionPath(node: ExpressionNode): string[] {
    if (node.type === 'identifier') {
      return [node.name];
    }
    if (node.type === 'member_expression') {
      const objectPath = this.getFunctionPath(node.object);
      return [...objectPath, node.property];
    }
    throw new EvaluationError('Invalid function callee', node);
  }

  /**
   * Call a function by path
   */
  private callFunction(path: string[], args: EvalResult[], node: CallExpressionNode): EvalResult {
    const funcName = path.join('.');

    // Built-in whisker.* functions
    if (path[0] === 'whisker') {
      return this.callWhiskerFunction(path.slice(1), args, node);
    }

    // Built-in math functions
    if (path[0] === 'math') {
      return this.callMathFunction(path[1], args, node);
    }

    // Built-in string functions
    if (path[0] === 'string') {
      return this.callStringFunction(path[1], args, node);
    }

    // Built-in print
    if (funcName === 'print') {
      this.context.print(...args);
      return null;
    }

    // Built-in type
    if (funcName === 'type') {
      return this.getType(args[0]);
    }

    // Built-in tostring
    if (funcName === 'tostring') {
      return this.toString(args[0]);
    }

    // Built-in tonumber
    if (funcName === 'tonumber') {
      const num = Number(args[0]);
      return isNaN(num) ? null : num;
    }

    throw new EvaluationError(`Unknown function: ${funcName}`, node);
  }

  /**
   * Call a whisker.* function
   */
  private callWhiskerFunction(path: string[], args: EvalResult[], node: CallExpressionNode): EvalResult {
    if (path.length === 0) {
      throw new EvaluationError('Invalid whisker function call', node);
    }

    const namespace = path[0];
    const method = path[1];

    // Top-level whisker functions
    if (path.length === 1) {
      switch (namespace) {
        case 'visited':
          return this.context.getVisitCount(args[0] as string | undefined);
        case 'random': {
          const min = this.toNumber(args[0]);
          const max = this.toNumber(args[1]);
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        case 'pick': {
          if (args.length === 0) {
            throw new EvaluationError('whisker.pick requires at least one argument', node);
          }
          const index = Math.floor(Math.random() * args.length);
          return args[index];
        }
        case 'print':
          this.context.print(...args);
          return null;
        default:
          throw new EvaluationError(`Unknown whisker function: whisker.${namespace}`, node);
      }
    }

    // whisker.state.*
    if (namespace === 'state') {
      switch (method) {
        case 'get': {
          const key = this.toString(args[0]);
          const value = this.context.getVariable(key);
          return value === undefined ? null : value;
        }
        case 'set': {
          const key = this.toString(args[0]);
          this.context.setVariable(key, args[1]);
          return null;
        }
        case 'has': {
          const key = this.toString(args[0]);
          return this.context.hasVariable(key);
        }
        case 'delete': {
          const key = this.toString(args[0]);
          this.context.deleteVariable(key);
          return null;
        }
        case 'all':
          return this.context.getAllVariables();
        case 'reset':
          this.context.resetVariables();
          return null;
        default:
          throw new EvaluationError(`Unknown whisker.state function: ${method}`, node);
      }
    }

    // whisker.passage.*
    if (namespace === 'passage') {
      switch (method) {
        case 'current': {
          const passage = this.context.getCurrentPassage();
          return passage ? this.passageToValue(passage) : null;
        }
        case 'get': {
          const id = this.toString(args[0]);
          const passage = this.context.getPassage(id);
          return passage ? this.passageToValue(passage) : null;
        }
        case 'go': {
          const id = this.toString(args[0]);
          this.context.goToPassage(id);
          return null;
        }
        case 'exists': {
          const id = this.toString(args[0]);
          return this.context.passageExists(id);
        }
        case 'all': {
          const passages = this.context.getAllPassages();
          const result: Record<string, WhiskerValue> = {};
          for (const [id, passage] of Object.entries(passages)) {
            result[id] = this.passageToValue(passage);
          }
          return result;
        }
        case 'tags': {
          const tag = this.toString(args[0]);
          const passages = this.context.getPassagesByTag(tag);
          return passages.map(p => this.passageToValue(p));
        }
        default:
          throw new EvaluationError(`Unknown whisker.passage function: ${method}`, node);
      }
    }

    // whisker.history.*
    if (namespace === 'history') {
      switch (method) {
        case 'back':
          return this.context.goBack();
        case 'canBack':
          return this.context.canGoBack();
        case 'list':
          return this.context.getHistory();
        case 'count':
          return this.context.getHistoryCount();
        case 'contains': {
          const id = this.toString(args[0]);
          return this.context.historyContains(id);
        }
        case 'clear':
          this.context.clearHistory();
          return null;
        default:
          throw new EvaluationError(`Unknown whisker.history function: ${method}`, node);
      }
    }

    // whisker.choice.*
    if (namespace === 'choice') {
      switch (method) {
        case 'available': {
          const choices = this.context.getAvailableChoices();
          return choices.map(c => ({
            text: c.text,
            target: c.target,
            type: c.type,
            index: c.index,
          }));
        }
        case 'select': {
          const index = this.toNumber(args[0]);
          this.context.selectChoice(index);
          return null;
        }
        case 'count':
          return this.context.getChoiceCount();
        default:
          throw new EvaluationError(`Unknown whisker.choice function: ${method}`, node);
      }
    }

    throw new EvaluationError(`Unknown whisker namespace: ${namespace}`, node);
  }

  /**
   * Convert a passage to a value
   */
  private passageToValue(passage: { id: string; content: string; tags: string[]; metadata: Record<string, string> }): WhiskerValue {
    return {
      id: passage.id,
      content: passage.content,
      tags: [...passage.tags],
      metadata: { ...passage.metadata },
    };
  }

  /**
   * Call a math.* function
   */
  private callMathFunction(method: string, args: EvalResult[], node: CallExpressionNode): EvalResult {
    const a = args[0] !== undefined ? this.toNumber(args[0]) : 0;
    const b = args[1] !== undefined ? this.toNumber(args[1]) : 0;

    switch (method) {
      case 'abs':
        return Math.abs(a);
      case 'ceil':
        return Math.ceil(a);
      case 'floor':
        return Math.floor(a);
      case 'max':
        return Math.max(a, b);
      case 'min':
        return Math.min(a, b);
      case 'random':
        if (args.length === 0) {
          return Math.random();
        }
        if (args.length === 1) {
          return Math.floor(Math.random() * a) + 1;
        }
        return Math.floor(Math.random() * (b - a + 1)) + a;
      case 'sqrt':
        return Math.sqrt(a);
      case 'pow':
        return Math.pow(a, b);
      case 'sin':
        return Math.sin(a);
      case 'cos':
        return Math.cos(a);
      case 'tan':
        return Math.tan(a);
      default:
        throw new EvaluationError(`Unknown math function: math.${method}`, node);
    }
  }

  /**
   * Call a string.* function
   */
  private callStringFunction(method: string, args: EvalResult[], node: CallExpressionNode): EvalResult {
    const str = this.toString(args[0]);

    switch (method) {
      case 'len':
        return str.length;
      case 'upper':
        return str.toUpperCase();
      case 'lower':
        return str.toLowerCase();
      case 'sub': {
        const start = this.toNumber(args[1]) - 1; // Lua is 1-indexed
        const end = args[2] !== undefined ? this.toNumber(args[2]) : str.length;
        return str.substring(start, end);
      }
      case 'find': {
        const pattern = this.toString(args[1]);
        const index = str.indexOf(pattern);
        return index === -1 ? null : index + 1; // Lua is 1-indexed
      }
      case 'rep': {
        const count = this.toNumber(args[1]);
        return str.repeat(count);
      }
      case 'reverse':
        return str.split('').reverse().join('');
      case 'format':
        // Simple format implementation
        return this.stringFormat(str, args.slice(1));
      default:
        throw new EvaluationError(`Unknown string function: string.${method}`, node);
    }
  }

  /**
   * Simple string.format implementation
   */
  private stringFormat(format: string, args: EvalResult[]): string {
    let argIndex = 0;
    return format.replace(/%[sd]/g, () => {
      if (argIndex >= args.length) return '';
      return this.toString(args[argIndex++]);
    });
  }

  /**
   * Evaluate a member expression
   */
  private evaluateMember(node: MemberExpressionNode): EvalResult {
    const obj = this.evaluate(node.object);

    if (obj === null) {
      return null;
    }

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const value = (obj as Record<string, WhiskerValue>)[node.property];
      return value === undefined ? null : value;
    }

    throw new EvaluationError('Cannot access property of non-object', node);
  }

  /**
   * Evaluate an assignment expression
   */
  private evaluateAssignment(node: AssignmentExpressionNode): EvalResult {
    const value = this.evaluate(node.value);
    const target = node.target;

    if (target.type === 'variable') {
      const currentValue = this.context.getVariable(target.name);
      const newValue = this.applyAssignmentOperator(node.operator, currentValue, value);
      this.context.setVariable(target.name, newValue);
      return newValue;
    }

    if (target.type === 'member_expression') {
      // For member expressions, we need to update the object
      const obj = this.evaluate(target.object);
      if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
        const currentValue = (obj as Record<string, WhiskerValue>)[target.property];
        const newValue = this.applyAssignmentOperator(node.operator, currentValue, value);
        (obj as Record<string, WhiskerValue>)[target.property] = newValue;
        return newValue;
      }
      throw new EvaluationError('Cannot assign to property of non-object', node);
    }

    throw new EvaluationError('Invalid assignment target', node);
  }

  /**
   * Apply an assignment operator
   */
  private applyAssignmentOperator(
    op: AssignmentOperator,
    current: WhiskerValue | undefined,
    value: EvalResult
  ): EvalResult {
    switch (op) {
      case '=':
        return value;
      case '+=':
        return this.toNumber(current ?? 0) + this.toNumber(value);
      case '-=':
        return this.toNumber(current ?? 0) - this.toNumber(value);
      case '*=':
        return this.toNumber(current ?? 0) * this.toNumber(value);
      case '/=': {
        const divisor = this.toNumber(value);
        if (divisor === 0) {
          throw new EvaluationError('Division by zero');
        }
        return this.toNumber(current ?? 0) / divisor;
      }
      default:
        throw new EvaluationError(`Unknown assignment operator: ${op}`);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Check if a value is truthy (Lua semantics: only nil and false are falsy)
   */
  private isTruthy(value: EvalResult): boolean {
    if (value === null) return false;
    if (value === false) return false;
    return true;
  }

  /**
   * Convert value to number
   */
  private toNumber(value: EvalResult): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = Number(value);
      if (!isNaN(num)) return num;
    }
    if (value === null) return 0;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
  }

  /**
   * Convert value to string
   */
  private toString(value: EvalResult): string {
    if (value === null) return 'nil';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return 'table';
    if (typeof value === 'object') return 'table';
    return String(value);
  }

  /**
   * Check equality (Lua semantics)
   */
  private equals(a: EvalResult, b: EvalResult): boolean {
    // Same reference or same primitive
    if (a === b) return true;
    // Different types are not equal
    if (typeof a !== typeof b) return false;
    // Both null
    if (a === null && b === null) return true;
    // Compare arrays/objects by reference only
    return false;
  }

  /**
   * Compare two values (for <, >, <=, >=)
   */
  private compare(a: EvalResult, b: EvalResult): number {
    // Numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    // Strings
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    throw new EvaluationError(`Cannot compare ${typeof a} with ${typeof b}`);
  }

  /**
   * Get the type of a value (Lua type names)
   */
  private getType(value: EvalResult): string {
    if (value === null) return 'nil';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'table';
    if (typeof value === 'object') return 'table';
    return 'unknown';
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create an expression evaluator
 */
export function createEvaluator(context: WhiskerRuntimeContext, options?: EvalOptions): ExpressionEvaluator {
  return new ExpressionEvaluator(context, options);
}

/**
 * Evaluate an expression node
 */
export function evaluate(node: ExpressionNode, context: WhiskerRuntimeContext): EvalResult {
  const evaluator = new ExpressionEvaluator(context);
  return evaluator.evaluate(node);
}
