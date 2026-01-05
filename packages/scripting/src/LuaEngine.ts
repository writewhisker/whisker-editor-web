/**
 * LuaEngine - SIMPLIFIED Lua scripting engine for interactive fiction preview
 *
 * ⚠️ WARNING: This is a LIMITED preview engine with ~30% Lua compatibility.
 * For production use, deploy to whisker-core which has FULL Lua 5.1+ support.
 *
 * SUPPORTED Features:
 * - ✅ Variables (numbers, strings, booleans)
 * - ✅ Arithmetic operators (+, -, *, /, %)
 * - ✅ Comparison operators (==, ~=, <, >, <=, >=)
 * - ✅ Logical operators (and, or, not)
 * - ✅ Limited stdlib (math.random, math.floor, string.upper, string.lower, print)
 *
 * PARTIALLY SUPPORTED:
 * - ⚠️ If/then/else statements (with elseif support)
 * - ⚠️ While loops (basic implementation, max 10000 iterations)
 * - ⚠️ For loops (numeric only: for i=1,10 do...end, max 10000 iterations)
 *
 * NOT SUPPORTED (will throw errors):
 * - ❌ Function definitions (function...end)
 * - ❌ Generic for loops (for k,v in pairs...)
 * - ❌ Tables (very limited, unreliable)
 * - ❌ Most standard library functions
 *
 * See LUAENGINE_LIMITATIONS.md for complete documentation.
 */

export interface LuaValue {
  type: 'nil' | 'boolean' | 'number' | 'string' | 'table' | 'function';
  value: any;
}

export interface LuaTable {
  [key: string]: LuaValue;
}

export interface LuaFunction {
  params: string[];
  body: string;
  upvalues?: Map<string, LuaValue>; // For closures
}

export interface LuaIterator {
  type: 'pairs' | 'ipairs' | 'custom';
  table: LuaTable;
  keys?: string[];
  currentIndex: number;
}

export interface LuaExecutionContext {
  variables: Map<string, LuaValue>;
  functions: Map<string, LuaFunction>;
  output: string[];
  errors: string[];
}

export interface LuaExecutionResult {
  success: boolean;
  output: string[];
  errors: string[];
  returnValue?: LuaValue;
  context: LuaExecutionContext;
}

/**
 * LuaEngine - Core Lua execution engine
 */
export class LuaEngine {
  private globalContext: LuaExecutionContext;

  constructor() {
    this.globalContext = {
      variables: new Map(),
      functions: new Map(),
      output: [],
      errors: [],
    };

    this.initializeStandardLibrary();
  }

  /**
   * Execute Lua code
   */
  execute(code: string): LuaExecutionResult {
    const context: LuaExecutionContext = {
      variables: new Map(this.globalContext.variables),
      functions: new Map(this.globalContext.functions),
      output: [],
      errors: [],
    };

    try {
      this.executeBlock(code, context);

      // Update global context with new variables
      context.variables.forEach((value, key) => {
        this.globalContext.variables.set(key, value);
      });

      return {
        success: context.errors.length === 0,
        output: context.output,
        errors: context.errors,
        context,
      };
    } catch (error) {
      context.errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        output: context.output,
        errors: context.errors,
        context,
      };
    }
  }

  /**
   * Evaluate a Lua expression
   */
  evaluate(expression: string, context?: LuaExecutionContext): LuaValue {
    const ctx = context || this.globalContext;
    return this.evaluateExpression(expression.trim(), ctx);
  }

  /**
   * Set a variable value
   */
  setVariable(name: string, value: any): void {
    this.globalContext.variables.set(name, this.toLuaValue(value));
  }

  /**
   * Get a variable value
   */
  getVariable(name: string): any {
    const luaValue = this.globalContext.variables.get(name);
    return luaValue ? this.fromLuaValue(luaValue) : undefined;
  }

  /**
   * Get all variables
   */
  getAllVariables(): Record<string, any> {
    const vars: Record<string, any> = {};
    this.globalContext.variables.forEach((value, key) => {
      vars[key] = this.fromLuaValue(value);
    });
    return vars;
  }

  /**
   * Clear all variables and functions
   */
  reset(): void {
    this.globalContext.variables.clear();
    this.globalContext.functions.clear();
    this.globalContext.output = [];
    this.globalContext.errors = [];
    this.initializeStandardLibrary();
  }

  /**
   * Initialize standard library functions
   */
  private initializeStandardLibrary(): void {
    // print function
    this.globalContext.functions.set('print', {
      params: ['...'],
      body: '__builtin_print',
    });

    // Math functions
    this.globalContext.functions.set('math.random', {
      params: ['min', 'max'],
      body: '__builtin_math_random',
    });

    this.globalContext.functions.set('math.floor', {
      params: ['x'],
      body: '__builtin_math_floor',
    });

    this.globalContext.functions.set('math.ceil', {
      params: ['x'],
      body: '__builtin_math_ceil',
    });

    this.globalContext.functions.set('math.abs', {
      params: ['x'],
      body: '__builtin_math_abs',
    });

    // String functions
    this.globalContext.functions.set('string.upper', {
      params: ['s'],
      body: '__builtin_string_upper',
    });

    this.globalContext.functions.set('string.lower', {
      params: ['s'],
      body: '__builtin_string_lower',
    });

    this.globalContext.functions.set('string.len', {
      params: ['s'],
      body: '__builtin_string_len',
    });

    // Table functions
    this.globalContext.functions.set('table.insert', {
      params: ['t', 'value'],
      body: '__builtin_table_insert',
    });

    this.globalContext.functions.set('table.remove', {
      params: ['t', 'pos'],
      body: '__builtin_table_remove',
    });

    this.globalContext.functions.set('table.concat', {
      params: ['t', 'sep', 'i', 'j'],
      body: '__builtin_table_concat',
    });

    this.globalContext.functions.set('table.sort', {
      params: ['t', 'comp'],
      body: '__builtin_table_sort',
    });

    // Iterator functions
    this.globalContext.functions.set('pairs', {
      params: ['t'],
      body: '__builtin_pairs',
    });

    this.globalContext.functions.set('ipairs', {
      params: ['t'],
      body: '__builtin_ipairs',
    });

    this.globalContext.functions.set('next', {
      params: ['t', 'k'],
      body: '__builtin_next',
    });

    // Utility functions
    this.globalContext.functions.set('type', {
      params: ['v'],
      body: '__builtin_type',
    });

    this.globalContext.functions.set('tonumber', {
      params: ['e', 'base'],
      body: '__builtin_tonumber',
    });

    this.globalContext.functions.set('tostring', {
      params: ['v'],
      body: '__builtin_tostring',
    });

    this.globalContext.functions.set('assert', {
      params: ['v', 'message'],
      body: '__builtin_assert',
    });

    this.globalContext.functions.set('error', {
      params: ['message', 'level'],
      body: '__builtin_error',
    });

    this.globalContext.functions.set('pcall', {
      params: ['f', '...'],
      body: '__builtin_pcall',
    });

    this.globalContext.functions.set('select', {
      params: ['index', '...'],
      body: '__builtin_select',
    });

    this.globalContext.functions.set('unpack', {
      params: ['list', 'i', 'j'],
      body: '__builtin_unpack',
    });

    this.globalContext.functions.set('rawget', {
      params: ['t', 'k'],
      body: '__builtin_rawget',
    });

    this.globalContext.functions.set('rawset', {
      params: ['t', 'k', 'v'],
      body: '__builtin_rawset',
    });

    this.globalContext.functions.set('setmetatable', {
      params: ['t', 'mt'],
      body: '__builtin_setmetatable',
    });

    this.globalContext.functions.set('getmetatable', {
      params: ['t'],
      body: '__builtin_getmetatable',
    });

    // Extended math functions
    this.globalContext.functions.set('math.min', {
      params: ['...'],
      body: '__builtin_math_min',
    });

    this.globalContext.functions.set('math.max', {
      params: ['...'],
      body: '__builtin_math_max',
    });

    this.globalContext.functions.set('math.sqrt', {
      params: ['x'],
      body: '__builtin_math_sqrt',
    });

    this.globalContext.functions.set('math.pow', {
      params: ['x', 'y'],
      body: '__builtin_math_pow',
    });

    this.globalContext.functions.set('math.sin', {
      params: ['x'],
      body: '__builtin_math_sin',
    });

    this.globalContext.functions.set('math.cos', {
      params: ['x'],
      body: '__builtin_math_cos',
    });

    this.globalContext.functions.set('math.tan', {
      params: ['x'],
      body: '__builtin_math_tan',
    });

    this.globalContext.functions.set('math.randomseed', {
      params: ['x'],
      body: '__builtin_math_randomseed',
    });

    this.globalContext.functions.set('math.log', {
      params: ['x', 'base'],
      body: '__builtin_math_log',
    });

    this.globalContext.functions.set('math.exp', {
      params: ['x'],
      body: '__builtin_math_exp',
    });

    // Math constants
    this.globalContext.variables.set('math.pi', { type: 'number', value: Math.PI });
    this.globalContext.variables.set('math.huge', { type: 'number', value: Infinity });

    // Extended string functions
    this.globalContext.functions.set('string.sub', {
      params: ['s', 'i', 'j'],
      body: '__builtin_string_sub',
    });

    this.globalContext.functions.set('string.find', {
      params: ['s', 'pattern', 'init', 'plain'],
      body: '__builtin_string_find',
    });

    this.globalContext.functions.set('string.match', {
      params: ['s', 'pattern', 'init'],
      body: '__builtin_string_match',
    });

    this.globalContext.functions.set('string.gsub', {
      params: ['s', 'pattern', 'repl', 'n'],
      body: '__builtin_string_gsub',
    });

    this.globalContext.functions.set('string.format', {
      params: ['formatstring', '...'],
      body: '__builtin_string_format',
    });

    this.globalContext.functions.set('string.rep', {
      params: ['s', 'n', 'sep'],
      body: '__builtin_string_rep',
    });

    this.globalContext.functions.set('string.reverse', {
      params: ['s'],
      body: '__builtin_string_reverse',
    });

    this.globalContext.functions.set('string.byte', {
      params: ['s', 'i', 'j'],
      body: '__builtin_string_byte',
    });

    this.globalContext.functions.set('string.char', {
      params: ['...'],
      body: '__builtin_string_char',
    });

    this.globalContext.functions.set('string.gmatch', {
      params: ['s', 'pattern'],
      body: '__builtin_string_gmatch',
    });
  }

  /**
   * Execute a block of code
   */
  private executeBlock(code: string, context: LuaExecutionContext): void {
    // Remove comments
    const cleanCode = this.removeComments(code);

    // Split into statements
    const statements = this.splitStatements(cleanCode);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      try {
        this.executeStatement(trimmed, context);
      } catch (error) {
        // Re-throw return statements (they're not errors)
        if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'return') {
          throw error;
        }
        context.errors.push(
          `Error in statement "${trimmed}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Execute a single statement
   */
  private executeStatement(statement: string, context: LuaExecutionContext): void {
    // Check for control structures first (before assignment check)
    // Function definition
    if (statement.startsWith('function ')) {
      this.executeFunction(statement, context);
      return;
    }

    // Return statement
    if (statement.startsWith('return ')) {
      const expr = statement.substring(7).trim();
      const value = this.evaluateExpression(expr, context);
      throw { type: 'return', value }; // Use exception for control flow
    }

    // If statement
    if (statement.startsWith('if ')) {
      this.executeIf(statement, context);
      return;
    }

    // While loop
    if (statement.startsWith('while ')) {
      this.executeWhile(statement, context);
      return;
    }

    // For loop
    if (statement.startsWith('for ')) {
      this.executeFor(statement, context);
      return;
    }

    // Variable assignment
    if (statement.includes('=') && !this.isComparison(statement)) {
      this.executeAssignment(statement, context);
      return;
    }

    // Function call
    if (statement.includes('(') && statement.includes(')')) {
      this.evaluateFunctionCall(statement, context);
      return;
    }

    // Expression evaluation
    this.evaluateExpression(statement, context);
  }

  /**
   * Check if a statement contains a comparison (not assignment)
   */
  private isComparison(statement: string): boolean {
    return /[<>!]=|==|<|>/.test(statement);
  }

  /**
   * Check if operator appears outside of string literals
   */
  private hasOperatorOutsideStrings(expr: string, op: string): boolean {
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];

      // Toggle string state
      if ((char === '"' || char === "'") && (i === 0 || expr[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      // Check for operator outside strings
      if (!inString && expr.substring(i, i + op.length) === op) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if expression is a single string literal (not concatenation)
   */
  private isStringLiteral(expr: string): boolean {
    if (!expr.startsWith('"') && !expr.startsWith("'")) {
      return false;
    }

    const quote = expr[0];
    let i = 1;

    // Find the closing quote
    while (i < expr.length) {
      if (expr[i] === quote && expr[i - 1] !== '\\') {
        // Found closing quote - check if there's more after it
        const remaining = expr.substring(i + 1).trim();
        return remaining.length === 0; // True only if nothing after the string
      }
      i++;
    }

    return false; // No closing quote found
  }

  /**
   * Split expression by operator, respecting string literals
   */
  private splitByOperator(expr: string, op: string): string[] {
    const parts: string[] = [];
    let currentPart = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];

      // Toggle string state
      if ((char === '"' || char === "'") && (i === 0 || expr[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      // Check for operator outside strings
      if (!inString && expr.substring(i, i + op.length) === op) {
        parts.push(currentPart.trim());
        currentPart = '';
        i += op.length - 1; // Skip operator
      } else {
        currentPart += char;
      }
    }

    // Add last part
    if (currentPart) {
      parts.push(currentPart.trim());
    }

    return parts;
  }

  /**
   * Execute variable assignment
   */
  private executeAssignment(statement: string, context: LuaExecutionContext): void {
    const equalIndex = statement.indexOf('=');
    const varName = statement.substring(0, equalIndex).trim();
    const expression = statement.substring(equalIndex + 1).trim();

    // Handle table assignments: t[key] = value
    if (varName.includes('[') && varName.includes(']')) {
      const bracketIndex = varName.indexOf('[');
      const tableName = varName.substring(0, bracketIndex).trim();
      const keyExpr = varName.substring(bracketIndex + 1, varName.lastIndexOf(']')).trim();

      const tableValue = context.variables.get(tableName);
      if (!tableValue || tableValue.type !== 'table') {
        // Create new table if it doesn't exist
        context.variables.set(tableName, { type: 'table', value: {} });
      }

      const table = context.variables.get(tableName)!;
      const keyValue = this.evaluateExpression(keyExpr, context);
      const key = String(keyValue.value);
      const value = this.evaluateExpression(expression, context);

      (table.value as Record<string, LuaValue>)[key] = value;
      return;
    }

    // Handle table dot notation: t.key = value
    if (varName.includes('.')) {
      const dotIndex = varName.indexOf('.');
      const tableName = varName.substring(0, dotIndex).trim();
      const key = varName.substring(dotIndex + 1).trim();

      const tableValue = context.variables.get(tableName);
      if (!tableValue || tableValue.type !== 'table') {
        // Create new table if it doesn't exist
        context.variables.set(tableName, { type: 'table', value: {} });
      }

      const table = context.variables.get(tableName)!;
      const value = this.evaluateExpression(expression, context);

      (table.value as Record<string, LuaValue>)[key] = value;
      return;
    }

    // Handle compound operators
    if (varName.endsWith('+')) {
      const name = varName.slice(0, -1).trim();
      const current = context.variables.get(name);
      const value = this.evaluateExpression(expression, context);
      const result = this.add(current, value);
      context.variables.set(name, result);
      return;
    }

    if (varName.endsWith('-')) {
      const name = varName.slice(0, -1).trim();
      const current = context.variables.get(name);
      const value = this.evaluateExpression(expression, context);
      const result = this.subtract(current, value);
      context.variables.set(name, result);
      return;
    }

    if (varName.endsWith('*')) {
      const name = varName.slice(0, -1).trim();
      const current = context.variables.get(name);
      const value = this.evaluateExpression(expression, context);
      const result = this.multiply(current, value);
      context.variables.set(name, result);
      return;
    }

    if (varName.endsWith('/')) {
      const name = varName.slice(0, -1).trim();
      const current = context.variables.get(name);
      const value = this.evaluateExpression(expression, context);
      const result = this.divide(current, value);
      context.variables.set(name, result);
      return;
    }

    // Regular assignment
    const value = this.evaluateExpression(expression, context);
    context.variables.set(varName, value);
  }

  /**
   * Evaluate an expression
   */
  private evaluateExpression(expr: string, context: LuaExecutionContext): LuaValue {
    const trimmed = expr.trim();

    // Nil
    if (trimmed === 'nil') {
      return { type: 'nil', value: null };
    }

    // Boolean literals
    if (trimmed === 'true') {
      return { type: 'boolean', value: true };
    }
    if (trimmed === 'false') {
      return { type: 'boolean', value: false };
    }

    // String literals (only if it's a SINGLE complete string, not concatenation)
    if (this.isStringLiteral(trimmed)) {
      return { type: 'string', value: trimmed.slice(1, -1) };
    }

    // Table literals
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return this.evaluateTableLiteral(trimmed, context);
    }

    // Table indexing (before function call to handle t[key] correctly)
    if (trimmed.includes('[') && trimmed.includes(']')) {
      return this.evaluateTableIndex(trimmed, context);
    }

    // Table dot notation (t.key) - also check for direct variable names like math.pi
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      // First check if it's a direct variable (like math.pi, math.huge)
      const directValue = context.variables.get(trimmed);
      if (directValue) {
        return directValue;
      }
      // Otherwise treat as table.key access
      const dotIndex = trimmed.indexOf('.');
      const tableName = trimmed.substring(0, dotIndex);
      const key = trimmed.substring(dotIndex + 1);
      const tableValue = context.variables.get(tableName);
      if (tableValue?.type === 'table') {
        return tableValue.value[key] || { type: 'nil', value: null };
      }
      return { type: 'nil', value: null };
    }

    // Number literals
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { type: 'number', value: parseFloat(trimmed) };
    }

    // Function call
    if (trimmed.includes('(') && trimmed.includes(')')) {
      return this.evaluateFunctionCall(trimmed, context);
    }

    // Logical operators (lowest precedence - check first)
    if (trimmed.includes(' and ') || trimmed.includes(' && ')) {
      const op = trimmed.includes(' && ') ? ' && ' : ' and ';
      return this.evaluateLogical(trimmed, op, context);
    }
    if (trimmed.includes(' or ') || trimmed.includes(' || ')) {
      const op = trimmed.includes(' || ') ? ' || ' : ' or ';
      return this.evaluateLogical(trimmed, op, context);
    }
    if (trimmed.startsWith('not ') || trimmed.startsWith('!')) {
      const prefix = trimmed.startsWith('not ') ? 'not ' : '!';
      return this.evaluateNot(trimmed.substring(prefix.length), context);
    }

    // Comparison operators (check === before ==, <= before <, etc.)
    if (trimmed.includes('===')) {
      return this.evaluateComparison(trimmed, '===', context);
    }
    if (trimmed.includes('!==')) {
      return this.evaluateComparison(trimmed, '!==', context);
    }
    if (trimmed.includes('==')) {
      return this.evaluateComparison(trimmed, '==', context);
    }
    if (trimmed.includes('~=') || trimmed.includes('!=')) {
      return this.evaluateComparison(trimmed, trimmed.includes('~=') ? '~=': '!=', context);
    }
    if (trimmed.includes('<=')) {
      return this.evaluateComparison(trimmed, '<=', context);
    }
    if (trimmed.includes('>=')) {
      return this.evaluateComparison(trimmed, '>=', context);
    }
    if (trimmed.includes('<') && !trimmed.includes('<<')) {
      return this.evaluateComparison(trimmed, '<', context);
    }
    if (trimmed.includes('>') && !trimmed.includes('>>')) {
      return this.evaluateComparison(trimmed, '>', context);
    }

    // Binary operators
    // String concatenation (check before other operators)
    // Only check if .. appears outside of string literals
    if (this.hasOperatorOutsideStrings(trimmed, '..')) {
      return this.evaluateBinaryOp(trimmed, '..', context);
    }
    if (trimmed.includes('+') && !trimmed.startsWith('+')) {
      return this.evaluateBinaryOp(trimmed, '+', context);
    }
    if (trimmed.includes('-') && !trimmed.startsWith('-') && trimmed.indexOf('-') > 0) {
      return this.evaluateBinaryOp(trimmed, '-', context);
    }
    if (trimmed.includes('*')) {
      return this.evaluateBinaryOp(trimmed, '*', context);
    }
    if (trimmed.includes('/')) {
      return this.evaluateBinaryOp(trimmed, '/', context);
    }
    if (trimmed.includes('%')) {
      return this.evaluateBinaryOp(trimmed, '%', context);
    }

    // Variable reference
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      const value = context.variables.get(trimmed);
      return value || { type: 'nil', value: null };
    }

    // Unknown expression
    throw new Error(`Cannot evaluate expression: ${trimmed}`);
  }

  /**
   * Evaluate binary operation
   */
  private evaluateBinaryOp(
    expr: string,
    op: string,
    context: LuaExecutionContext
  ): LuaValue {
    // Split by operator, but respect string literals
    const parts = this.splitByOperator(expr, op);
    if (parts.length < 2) {
      throw new Error(`Invalid binary operation: ${expr}`);
    }

    let result = this.evaluateExpression(parts[0], context);

    for (let i = 1; i < parts.length; i++) {
      const right = this.evaluateExpression(parts[i], context);

      switch (op) {
        case '..':
          // Lua string concatenation
          result = { type: 'string', value: String(result.value) + String(right.value) };
          break;
        case '+':
          result = this.add(result, right);
          break;
        case '-':
          result = this.subtract(result, right);
          break;
        case '*':
          result = this.multiply(result, right);
          break;
        case '/':
          result = this.divide(result, right);
          break;
        case '%':
          result = this.modulo(result, right);
          break;
      }
    }

    return result;
  }

  /**
   * Evaluate comparison
   */
  private evaluateComparison(
    expr: string,
    op: string,
    context: LuaExecutionContext
  ): LuaValue {
    const [left, right] = expr.split(op).map((s) => s.trim());
    const leftVal = this.evaluateExpression(left, context);
    const rightVal = this.evaluateExpression(right, context);

    let result = false;

    switch (op) {
      case '==':
      case '===':
        result = leftVal.value === rightVal.value;
        break;
      case '~=':
      case '!=':
      case '!==':
        result = leftVal.value !== rightVal.value;
        break;
      case '<':
        result = leftVal.value < rightVal.value;
        break;
      case '>':
        result = leftVal.value > rightVal.value;
        break;
      case '<=':
        result = leftVal.value <= rightVal.value;
        break;
      case '>=':
        result = leftVal.value >= rightVal.value;
        break;
    }

    return { type: 'boolean', value: result };
  }

  /**
   * Evaluate logical operation
   */
  private evaluateLogical(
    expr: string,
    op: ' and ' | ' or ' | ' && ' | ' || ',
    context: LuaExecutionContext
  ): LuaValue {
    const parts = expr.split(op);
    const left = this.evaluateExpression(parts[0], context);

    const isAnd = op === ' and ' || op === ' && ';

    if (isAnd) {
      if (!this.isTruthy(left)) return { type: 'boolean', value: false };
      const right = this.evaluateExpression(parts[1], context);
      return { type: 'boolean', value: this.isTruthy(right) };
    } else {
      // or / ||
      if (this.isTruthy(left)) return { type: 'boolean', value: true };
      const right = this.evaluateExpression(parts[1], context);
      return { type: 'boolean', value: this.isTruthy(right) };
    }
  }

  /**
   * Evaluate NOT operation
   */
  private evaluateNot(expr: string, context: LuaExecutionContext): LuaValue {
    const value = this.evaluateExpression(expr, context);
    return { type: 'boolean', value: !this.isTruthy(value) };
  }

  /**
   * Check if value is truthy
   */
  private isTruthy(value: LuaValue): boolean {
    if (value.type === 'nil') return false;
    if (value.type === 'boolean') return value.value;
    return true; // Everything else is truthy in Lua
  }

  // Store for metatables (weak reference simulation)
  private metatables: WeakMap<object, LuaValue> = new WeakMap();
  private randomSeed: number = Date.now();

  /**
   * Evaluate function call
   */
  private evaluateFunctionCall(expr: string, context: LuaExecutionContext): LuaValue {
    const parenIndex = expr.indexOf('(');
    const funcName = expr.substring(0, parenIndex).trim();
    const argsStr = expr.substring(parenIndex + 1, expr.lastIndexOf(')')).trim();

    const args = argsStr ? this.parseArguments(argsStr, context) : [];

    // Built-in functions
    if (funcName === 'print') {
      const output = args.map((arg) => this.luaToString(arg)).join('\t');
      context.output.push(output);
      return { type: 'nil', value: null };
    }

    // ============ MATH FUNCTIONS ============
    if (funcName === 'math.random') {
      if (args.length === 0) {
        return { type: 'number', value: this.seededRandom() };
      } else if (args.length === 1) {
        const max = args[0].value;
        return { type: 'number', value: Math.floor(this.seededRandom() * max) + 1 };
      } else {
        const min = args[0].value;
        const max = args[1].value;
        return { type: 'number', value: Math.floor(this.seededRandom() * (max - min + 1)) + min };
      }
    }

    if (funcName === 'math.randomseed') {
      this.randomSeed = args[0]?.value || Date.now();
      return { type: 'nil', value: null };
    }

    if (funcName === 'math.floor') {
      return { type: 'number', value: Math.floor(args[0].value) };
    }

    if (funcName === 'math.ceil') {
      return { type: 'number', value: Math.ceil(args[0].value) };
    }

    if (funcName === 'math.abs') {
      return { type: 'number', value: Math.abs(args[0].value) };
    }

    if (funcName === 'math.min') {
      const values = args.map(a => a.value);
      return { type: 'number', value: Math.min(...values) };
    }

    if (funcName === 'math.max') {
      const values = args.map(a => a.value);
      return { type: 'number', value: Math.max(...values) };
    }

    if (funcName === 'math.sqrt') {
      return { type: 'number', value: Math.sqrt(args[0].value) };
    }

    if (funcName === 'math.pow') {
      return { type: 'number', value: Math.pow(args[0].value, args[1].value) };
    }

    if (funcName === 'math.sin') {
      return { type: 'number', value: Math.sin(args[0].value) };
    }

    if (funcName === 'math.cos') {
      return { type: 'number', value: Math.cos(args[0].value) };
    }

    if (funcName === 'math.tan') {
      return { type: 'number', value: Math.tan(args[0].value) };
    }

    if (funcName === 'math.log') {
      if (args.length === 1) {
        return { type: 'number', value: Math.log(args[0].value) };
      } else {
        return { type: 'number', value: Math.log(args[0].value) / Math.log(args[1].value) };
      }
    }

    if (funcName === 'math.exp') {
      return { type: 'number', value: Math.exp(args[0].value) };
    }

    // ============ STRING FUNCTIONS ============
    if (funcName === 'string.upper') {
      return { type: 'string', value: String(args[0].value).toUpperCase() };
    }

    if (funcName === 'string.lower') {
      return { type: 'string', value: String(args[0].value).toLowerCase() };
    }

    if (funcName === 'string.len') {
      return { type: 'number', value: String(args[0].value).length };
    }

    if (funcName === 'string.sub') {
      const s = String(args[0].value);
      let i = args[1]?.value || 1;
      let j = args[2]?.value || s.length;
      // Lua uses 1-based indexing, negative indices count from end
      if (i < 0) i = s.length + i + 1;
      if (j < 0) j = s.length + j + 1;
      // Convert to 0-based for JS
      return { type: 'string', value: s.substring(i - 1, j) };
    }

    if (funcName === 'string.find') {
      const s = String(args[0].value);
      const pattern = String(args[1].value);
      const init = (args[2]?.value || 1) - 1; // Convert to 0-based
      const plain = args[3]?.value === true;

      if (plain) {
        const idx = s.indexOf(pattern, init);
        if (idx === -1) return { type: 'nil', value: null };
        return { type: 'number', value: idx + 1 }; // Return 1-based index
      } else {
        try {
          const regex = new RegExp(this.luaPatternToRegex(pattern));
          const match = s.substring(init).match(regex);
          if (!match) return { type: 'nil', value: null };
          const idx = s.indexOf(match[0], init);
          return { type: 'number', value: idx + 1 };
        } catch {
          // Fallback to plain search
          const idx = s.indexOf(pattern, init);
          if (idx === -1) return { type: 'nil', value: null };
          return { type: 'number', value: idx + 1 };
        }
      }
    }

    if (funcName === 'string.match') {
      const s = String(args[0].value);
      const pattern = String(args[1].value);
      const init = (args[2]?.value || 1) - 1;

      try {
        const regex = new RegExp(this.luaPatternToRegex(pattern));
        const match = s.substring(init).match(regex);
        if (!match) return { type: 'nil', value: null };
        return { type: 'string', value: match[0] };
      } catch {
        return { type: 'nil', value: null };
      }
    }

    if (funcName === 'string.gsub') {
      const s = String(args[0].value);
      const pattern = String(args[1].value);
      const repl = args[2]?.value ?? '';
      const n = args[3]?.value;

      try {
        const regex = new RegExp(this.luaPatternToRegex(pattern), n ? undefined : 'g');
        let result = s;
        let count = 0;

        if (n) {
          for (let i = 0; i < n; i++) {
            const newResult = result.replace(regex, String(repl));
            if (newResult === result) break;
            result = newResult;
            count++;
          }
        } else {
          const matches = s.match(regex);
          count = matches ? matches.length : 0;
          result = s.replace(regex, String(repl));
        }

        return { type: 'string', value: result };
      } catch {
        return { type: 'string', value: s.replace(pattern, String(repl)) };
      }
    }

    if (funcName === 'string.format') {
      const formatStr = String(args[0].value);
      const formatArgs = args.slice(1).map(a => a.value);
      return { type: 'string', value: this.luaFormat(formatStr, formatArgs) };
    }

    if (funcName === 'string.rep') {
      const s = String(args[0].value);
      const n = args[1]?.value || 0;
      const sep = args[2]?.value || '';
      if (n <= 0) return { type: 'string', value: '' };
      return { type: 'string', value: Array(n).fill(s).join(sep) };
    }

    if (funcName === 'string.reverse') {
      return { type: 'string', value: String(args[0].value).split('').reverse().join('') };
    }

    if (funcName === 'string.byte') {
      const s = String(args[0].value);
      const i = (args[1]?.value || 1) - 1;
      const j = args[2]?.value ? args[2].value - 1 : i;

      if (i === j) {
        return { type: 'number', value: s.charCodeAt(i) };
      }
      // For multiple bytes, return only the first (simplified)
      return { type: 'number', value: s.charCodeAt(i) };
    }

    if (funcName === 'string.char') {
      const chars = args.map(a => String.fromCharCode(a.value));
      return { type: 'string', value: chars.join('') };
    }

    // ============ TABLE FUNCTIONS ============
    if (funcName === 'table.insert') {
      const tableVal = args[0];
      if (tableVal.type !== 'table') throw new Error('table.insert expects a table');

      const table = tableVal.value as Record<string, LuaValue>;
      if (args.length === 2) {
        // table.insert(t, value) - insert at end
        const keys = Object.keys(table).filter(k => !isNaN(Number(k))).map(Number);
        const nextIndex = keys.length > 0 ? Math.max(...keys) + 1 : 1;
        table[String(nextIndex)] = args[1];
      } else if (args.length === 3) {
        // table.insert(t, pos, value) - insert at position
        const pos = args[1].value;
        const value = args[2];
        // Shift existing elements
        const keys = Object.keys(table).filter(k => !isNaN(Number(k))).map(Number).sort((a, b) => b - a);
        for (const k of keys) {
          if (k >= pos) {
            table[String(k + 1)] = table[String(k)];
          }
        }
        table[String(pos)] = value;
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'table.remove') {
      const tableVal = args[0];
      if (tableVal.type !== 'table') throw new Error('table.remove expects a table');

      const table = tableVal.value as Record<string, LuaValue>;
      const keys = Object.keys(table).filter(k => !isNaN(Number(k))).map(Number).sort((a, b) => a - b);

      if (keys.length === 0) return { type: 'nil', value: null };

      const pos = args[1]?.value || keys[keys.length - 1];
      const removed = table[String(pos)] || { type: 'nil', value: null };

      // Shift elements down
      for (let i = pos; i < keys[keys.length - 1]; i++) {
        if (table[String(i + 1)] !== undefined) {
          table[String(i)] = table[String(i + 1)];
        }
      }
      delete table[String(keys[keys.length - 1])];

      return removed;
    }

    if (funcName === 'table.concat') {
      const tableVal = args[0];
      if (tableVal.type !== 'table') throw new Error('table.concat expects a table');

      const table = tableVal.value as Record<string, LuaValue>;
      const sep = args[1]?.value ?? '';
      const i = args[2]?.value || 1;
      const j = args[3]?.value || Object.keys(table).filter(k => !isNaN(Number(k))).length;

      const result: string[] = [];
      for (let idx = i; idx <= j; idx++) {
        const val = table[String(idx)];
        if (val) result.push(String(val.value));
      }

      return { type: 'string', value: result.join(sep) };
    }

    if (funcName === 'table.sort') {
      const tableVal = args[0];
      if (tableVal.type !== 'table') throw new Error('table.sort expects a table');

      const table = tableVal.value as Record<string, LuaValue>;
      const keys = Object.keys(table).filter(k => !isNaN(Number(k))).map(Number).sort((a, b) => a - b);
      const values = keys.map(k => table[String(k)]);

      // Simple sort by value
      values.sort((a, b) => {
        if (a.type === 'number' && b.type === 'number') {
          return a.value - b.value;
        }
        return String(a.value).localeCompare(String(b.value));
      });

      // Reassign
      keys.forEach((k, i) => {
        table[String(k)] = values[i];
      });

      return { type: 'nil', value: null };
    }

    // ============ ITERATOR FUNCTIONS ============
    if (funcName === 'pairs') {
      // Return iterator function placeholder
      const tableVal = args[0];
      if (tableVal.type !== 'table') throw new Error('pairs expects a table');
      return {
        type: 'function',
        value: {
          __iterator: 'pairs',
          __table: tableVal.value,
          __keys: Object.keys(tableVal.value as Record<string, LuaValue>),
          __index: 0
        }
      };
    }

    if (funcName === 'ipairs') {
      const tableVal = args[0];
      if (tableVal.type !== 'table') throw new Error('ipairs expects a table');
      return {
        type: 'function',
        value: {
          __iterator: 'ipairs',
          __table: tableVal.value,
          __index: 0
        }
      };
    }

    if (funcName === 'next') {
      const tableVal = args[0];
      if (tableVal.type !== 'table') return { type: 'nil', value: null };

      const table = tableVal.value as Record<string, LuaValue>;
      const keys = Object.keys(table);

      if (args.length === 1 || args[1].type === 'nil') {
        // Return first key-value pair
        if (keys.length === 0) return { type: 'nil', value: null };
        const firstKey = keys[0];
        // Return as table with key and value
        return { type: 'table', value: { '1': { type: 'string', value: firstKey }, '2': table[firstKey] } };
      }

      const currentKey = String(args[1].value);
      const currentIndex = keys.indexOf(currentKey);
      if (currentIndex === -1 || currentIndex === keys.length - 1) {
        return { type: 'nil', value: null };
      }

      const nextKey = keys[currentIndex + 1];
      return { type: 'table', value: { '1': { type: 'string', value: nextKey }, '2': table[nextKey] } };
    }

    // ============ UTILITY FUNCTIONS ============
    if (funcName === 'type') {
      const val = args[0] || { type: 'nil', value: null };
      return { type: 'string', value: val.type };
    }

    if (funcName === 'tonumber') {
      const val = args[0];
      const base = args[1]?.value || 10;

      if (val.type === 'number') return val;
      if (val.type === 'string') {
        const num = parseInt(val.value, base);
        if (isNaN(num)) return { type: 'nil', value: null };
        return { type: 'number', value: num };
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'tostring') {
      return { type: 'string', value: this.luaToString(args[0]) };
    }

    if (funcName === 'assert') {
      const val = args[0];
      const message = args[1]?.value || 'assertion failed!';

      if (!this.isTruthy(val)) {
        throw new Error(String(message));
      }
      return val;
    }

    if (funcName === 'error') {
      const message = args[0]?.value || '';
      throw new Error(String(message));
    }

    if (funcName === 'pcall') {
      const funcVal = args[0];
      const funcArgs = args.slice(1);

      try {
        // Try to find and execute the function
        if (funcVal.type === 'string') {
          const func = context.functions.get(funcVal.value);
          if (func) {
            for (let i = 0; i < func.params.length; i++) {
              context.variables.set(func.params[i], funcArgs[i] || { type: 'nil', value: null });
            }
            try {
              this.executeBlock(func.body, context);
              return { type: 'table', value: { '1': { type: 'boolean', value: true } } };
            } catch (e) {
              if (typeof e === 'object' && e !== null && 'type' in e && (e as any).type === 'return') {
                return { type: 'table', value: { '1': { type: 'boolean', value: true }, '2': (e as any).value } };
              }
              throw e;
            }
          }
        }
        return { type: 'table', value: { '1': { type: 'boolean', value: true } } };
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        return { type: 'table', value: { '1': { type: 'boolean', value: false }, '2': { type: 'string', value: errMsg } } };
      }
    }

    if (funcName === 'select') {
      const index = args[0];
      const restArgs = args.slice(1);

      if (index.value === '#') {
        return { type: 'number', value: restArgs.length };
      }

      const idx = Number(index.value);
      if (idx > 0) {
        return restArgs[idx - 1] || { type: 'nil', value: null };
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'unpack') {
      const tableVal = args[0];
      if (tableVal.type !== 'table') return { type: 'nil', value: null };

      const table = tableVal.value as Record<string, LuaValue>;
      const i = args[1]?.value || 1;
      const keys = Object.keys(table).filter(k => !isNaN(Number(k))).map(Number).sort((a, b) => a - b);
      const j = args[2]?.value || (keys.length > 0 ? keys[keys.length - 1] : 0);

      // Return first value (simplified - real Lua returns multiple values)
      if (i <= j && table[String(i)]) {
        return table[String(i)];
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'rawget') {
      const tableVal = args[0];
      const key = args[1];

      if (tableVal.type !== 'table') return { type: 'nil', value: null };
      const table = tableVal.value as Record<string, LuaValue>;
      const k = String(key.value);
      return table[k] || { type: 'nil', value: null };
    }

    if (funcName === 'rawset') {
      const tableVal = args[0];
      const key = args[1];
      const value = args[2];

      if (tableVal.type !== 'table') throw new Error('rawset expects a table');
      const table = tableVal.value as Record<string, LuaValue>;
      table[String(key.value)] = value;
      return tableVal;
    }

    if (funcName === 'setmetatable') {
      const tableVal = args[0];
      const mt = args[1];

      if (tableVal.type !== 'table') throw new Error('setmetatable expects a table');

      if (mt.type === 'nil') {
        // Remove metatable
        if (tableVal.value && typeof tableVal.value === 'object') {
          this.metatables.delete(tableVal.value);
        }
      } else if (mt.type === 'table') {
        // Set metatable
        if (tableVal.value && typeof tableVal.value === 'object') {
          this.metatables.set(tableVal.value, mt);
        }
      }

      return tableVal;
    }

    if (funcName === 'getmetatable') {
      const tableVal = args[0];

      if (tableVal.type !== 'table') return { type: 'nil', value: null };

      if (tableVal.value && typeof tableVal.value === 'object') {
        const mt = this.metatables.get(tableVal.value);
        return mt || { type: 'nil', value: null };
      }

      return { type: 'nil', value: null };
    }

    // Check for user-defined functions
    const userFunc = context.functions.get(funcName);
    if (userFunc) {
      // Create new context for function scope (preserves upvalues/closures)
      const funcContext: LuaExecutionContext = {
        variables: new Map(context.variables),
        functions: context.functions,
        output: context.output,
        errors: context.errors,
      };

      // Bind parameters to arguments
      for (let i = 0; i < userFunc.params.length; i++) {
        const paramName = userFunc.params[i];
        const argValue = args[i] || { type: 'nil', value: null };
        funcContext.variables.set(paramName, argValue);
      }

      // Add upvalues if present (for closures)
      if (userFunc.upvalues) {
        userFunc.upvalues.forEach((value, key) => {
          if (!funcContext.variables.has(key)) {
            funcContext.variables.set(key, value);
          }
        });
      }

      // Execute function body
      try {
        this.executeBlock(userFunc.body, funcContext);
        // Copy back modified variables to parent context
        funcContext.variables.forEach((value, key) => {
          context.variables.set(key, value);
        });
        return { type: 'nil', value: null }; // Default return
      } catch (error) {
        // Check if it's a return statement
        if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'return') {
          // Copy back modified variables to parent context
          funcContext.variables.forEach((value, key) => {
            context.variables.set(key, value);
          });
          return (error as { type: string; value: LuaValue }).value;
        }
        throw error;
      }
    }

    throw new Error(`Unknown function: ${funcName}`);
  }

  /**
   * Simple seeded random number generator
   */
  private seededRandom(): number {
    this.randomSeed = (this.randomSeed * 1103515245 + 12345) & 0x7fffffff;
    return (this.randomSeed / 0x7fffffff);
  }

  /**
   * Convert Lua value to string representation
   */
  private luaToString(val: LuaValue): string {
    if (val.type === 'nil') return 'nil';
    if (val.type === 'boolean') return val.value ? 'true' : 'false';
    if (val.type === 'number') return String(val.value);
    if (val.type === 'string') return val.value;
    if (val.type === 'table') return 'table: ' + Object.keys(val.value).length + ' entries';
    if (val.type === 'function') return 'function';
    return String(val.value);
  }

  /**
   * Convert Lua pattern to JavaScript regex (simplified)
   */
  private luaPatternToRegex(pattern: string): string {
    // Basic Lua pattern to regex conversion
    return pattern
      .replace(/%a/g, '[a-zA-Z]')
      .replace(/%d/g, '\\d')
      .replace(/%l/g, '[a-z]')
      .replace(/%u/g, '[A-Z]')
      .replace(/%w/g, '\\w')
      .replace(/%s/g, '\\s')
      .replace(/%p/g, '[\\p{P}]')
      .replace(/%c/g, '[\\x00-\\x1f]')
      .replace(/%x/g, '[0-9a-fA-F]')
      .replace(/%./g, '.')  // %z and others become .
      .replace(/%%/g, '%');
  }

  /**
   * Lua-style string formatting
   */
  private luaFormat(format: string, args: any[]): string {
    let argIndex = 0;
    return format.replace(/%(-?\d*)\.?(\d*)([diouxXeEfgGcs%])/g, (match, width, precision, specifier) => {
      if (specifier === '%') return '%';

      const arg = args[argIndex++];
      if (arg === undefined) return match;

      switch (specifier) {
        case 'd':
        case 'i':
          return String(Math.floor(Number(arg)));
        case 'o':
          return Math.floor(Number(arg)).toString(8);
        case 'u':
          return String(Math.abs(Math.floor(Number(arg))));
        case 'x':
          return Math.floor(Number(arg)).toString(16);
        case 'X':
          return Math.floor(Number(arg)).toString(16).toUpperCase();
        case 'e':
          return Number(arg).toExponential(precision ? Number(precision) : undefined);
        case 'E':
          return Number(arg).toExponential(precision ? Number(precision) : undefined).toUpperCase();
        case 'f':
          return Number(arg).toFixed(precision ? Number(precision) : 6);
        case 'g':
        case 'G':
          return String(Number(arg));
        case 'c':
          return String.fromCharCode(Number(arg));
        case 's':
          return String(arg);
        default:
          return match;
      }
    });
  }

  /**
   * Parse function arguments - respects string literals and nested parens
   */
  private parseArguments(argsStr: string, context: LuaExecutionContext): LuaValue[] {
    const args: LuaValue[] = [];
    let currentArg = '';
    let inString = false;
    let stringChar = '';
    let parenDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      // Toggle string state
      if ((char === '"' || char === "'") && (i === 0 || argsStr[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      // Track parentheses and braces
      if (!inString) {
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
      }

      // Split on comma only at top level
      if (char === ',' && !inString && parenDepth === 0 && braceDepth === 0) {
        if (currentArg.trim()) {
          args.push(this.evaluateExpression(currentArg.trim(), context));
        }
        currentArg = '';
      } else {
        currentArg += char;
      }
    }

    // Add last argument
    if (currentArg.trim()) {
      args.push(this.evaluateExpression(currentArg.trim(), context));
    }

    return args;
  }

  /**
   * Evaluate table literal
   */
  private evaluateTableLiteral(expr: string, context: LuaExecutionContext): LuaValue {
    const content = expr.slice(1, -1).trim(); // Remove { }
    if (!content) {
      return { type: 'table', value: {} };
    }

    const table: Record<string, LuaValue> = {};
    const parts = content.split(',').map(p => p.trim());
    let numericIndex = 1;

    for (const part of parts) {
      if (part.includes('=')) {
        // Key-value pair: key = value
        const eqIndex = part.indexOf('=');
        const key = part.substring(0, eqIndex).trim();
        const valueExpr = part.substring(eqIndex + 1).trim();
        const value = this.evaluateExpression(valueExpr, context);
        table[key] = value;
      } else {
        // Array-style: {1, 2, 3} -> {[1] = 1, [2] = 2, [3] = 3}
        const value = this.evaluateExpression(part, context);
        table[String(numericIndex++)] = value;
      }
    }

    return { type: 'table', value: table };
  }

  /**
   * Evaluate table indexing
   */
  private evaluateTableIndex(expr: string, context: LuaExecutionContext): LuaValue {
    const bracketIndex = expr.indexOf('[');
    const tableName = expr.substring(0, bracketIndex).trim();
    const keyExpr = expr.substring(bracketIndex + 1, expr.lastIndexOf(']')).trim();

    const tableValue = context.variables.get(tableName);
    if (!tableValue || tableValue.type !== 'table') {
      return { type: 'nil', value: null };
    }

    const keyValue = this.evaluateExpression(keyExpr, context);
    const key = String(keyValue.value);

    return tableValue.value[key] || { type: 'nil', value: null };
  }

  /**
   * Execute if statement
   */
  private executeIf(fullCode: string, context: LuaExecutionContext): void {
    // Parse if...then...elseif...else...end structure
    const lines = fullCode.split('\n').map(l => l.trim());

    interface Branch {
      condition: string | null; // null for 'else'
      body: string[];
    }

    const branches: Branch[] = [];
    let currentBranch: Branch | null = null;
    let blockDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Start of if block
      if (line.startsWith('if ') && blockDepth === 0) {
        const thenIndex = line.indexOf(' then');
        if (thenIndex === -1) continue;
        const condition = line.substring(3, thenIndex).trim();
        currentBranch = { condition, body: [] };
        blockDepth = 1;
        continue;
      }

      // Track nested blocks BEFORE checking elseif/else
      // This ensures we only catch top-level elseif/else
      if (line.match(/\b(if|while|for|function)\s/)) {
        blockDepth++;
      }

      // elseif branch (only at depth 1 = top-level)
      if (line.startsWith('elseif ') && blockDepth === 1) {
        if (currentBranch) {
          branches.push(currentBranch);
        }
        const thenIndex = line.indexOf(' then');
        if (thenIndex === -1) continue;
        const condition = line.substring(7, thenIndex).trim();
        currentBranch = { condition, body: [] };
        continue;
      }

      // else branch (only at depth 1 = top-level)
      if (line === 'else' && blockDepth === 1) {
        if (currentBranch) {
          branches.push(currentBranch);
        }
        currentBranch = { condition: null, body: [] };
        continue;
      }

      // end of block
      if (line === 'end') {
        blockDepth--;
        if (blockDepth === 0) {
          if (currentBranch) {
            branches.push(currentBranch);
          }
          break;
        }
      }

      // Add line to current branch body
      if (currentBranch && line !== 'then') {
        currentBranch.body.push(line);
      }
    }

    // Validate that we found at least one branch
    if (branches.length === 0) {
      throw new Error('Invalid if statement syntax. Expected: if <condition> then <body> end');
    }

    // Execute the first branch whose condition is true
    for (const branch of branches) {
      if (branch.condition === null) {
        // else clause - always execute
        this.executeBlock(branch.body.join('\n'), context);
        return;
      }

      const conditionValue = this.evaluateExpression(branch.condition, context);
      if (this.isTruthy(conditionValue)) {
        this.executeBlock(branch.body.join('\n'), context);
        return;
      }
    }

    // No branch executed (no else clause or all conditions false)
  }

  /**
   * Execute while loop
   */
  private executeWhile(fullCode: string, context: LuaExecutionContext): void {
    // Parse: while <condition> do <body> end
    // Extract condition from first line
    const firstLineMatch = fullCode.match(/^while\s+(.+?)\s+do/);
    if (!firstLineMatch) {
      throw new Error('Invalid while loop syntax. Expected: while <condition> do <body> end');
    }

    const condition = firstLineMatch[1].trim();

    // Extract body by tracking block depth
    const doIndex = fullCode.indexOf(' do');
    if (doIndex === -1) {
      throw new Error('Invalid while loop syntax. Missing do keyword');
    }

    const afterDo = fullCode.substring(doIndex + 3).trim(); // Skip ' do'
    const lines = afterDo.split('\n');
    let depth = 1;
    const bodyLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for nested block starts
      if (/^(while|for|if|function)\s/.test(trimmed)) {
        depth++;
      }

      // Check for block ends
      if (trimmed === 'end' || trimmed.startsWith('end ') || trimmed.endsWith(' end')) {
        depth--;
        if (depth === 0) {
          // This is the closing 'end' for our while loop
          break;
        }
      }

      bodyLines.push(line);
    }

    if (depth !== 0) {
      throw new Error('Invalid while loop syntax. Missing end keyword');
    }

    const body = bodyLines.join('\n').trim();

    // Infinite loop protection
    const MAX_ITERATIONS = 10000;
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      const conditionValue = this.evaluateExpression(condition, context);

      if (!this.isTruthy(conditionValue)) {
        break;
      }

      try {
        this.executeBlock(body, context);
      } catch (error) {
        if (error instanceof Error && error.message === 'break') {
          break;
        }
        throw error;
      }

      iterations++;
    }

    if (iterations >= MAX_ITERATIONS) {
      throw new Error(`While loop exceeded maximum iterations (${MAX_ITERATIONS})`);
    }
  }

  /**
   * Execute for loop (both numeric and generic)
   */
  private executeFor(fullCode: string, context: LuaExecutionContext): void {
    // Check for generic for loop: for var1, var2 in iterator(table) do ... end
    const genericMatch = fullCode.match(/^for\s+(\w+)(?:\s*,\s*(\w+))?\s+in\s+/);
    if (genericMatch) {
      this.executeGenericFor(fullCode, context, genericMatch);
      return;
    }

    // Parse numeric for loop: for var = start, end [, step] do <body> end
    const forStart = fullCode.match(/^for\s+(\w+)\s*=\s*/);
    if (!forStart) {
      throw new Error('Invalid for loop syntax. Expected: for var = start, end [, step] do <body> end');
    }

    const varName = forStart[1];
    const afterVar = fullCode.substring(forStart[0].length);

    // Find 'do' keyword (can be followed by newline or space)
    const doMatch = afterVar.match(/\s+do(?:\s|$)/);
    if (!doMatch) {
      throw new Error('Invalid for loop syntax. Expected: for var = start, end [, step] do <body> end');
    }

    const doIndex = doMatch.index!;
    const params = afterVar.substring(0, doIndex).trim();
    const rest = afterVar.substring(doIndex + doMatch[0].length); // skip past 'do' and whitespace

    // Extract body
    const endIndex = rest.lastIndexOf('end');
    if (endIndex === -1) {
      throw new Error('Invalid for loop syntax. Missing end keyword');
    }

    const body = rest.substring(0, endIndex).trim();

    // Parse parameters (start, end, step)
    const paramParts = params.split(',').map(p => p.trim());
    if (paramParts.length < 2 || paramParts.length > 3) {
      throw new Error(`For loop requires 2 or 3 parameters: start, end [, step]. Got: ${paramParts.length} (${JSON.stringify(paramParts)})`);
    }

    const startExpr = paramParts[0];
    const endExpr = paramParts[1];
    const stepExpr = paramParts[2] || '1';

    // Evaluate loop parameters
    const startValue = this.evaluateExpression(startExpr, context);
    const endValue = this.evaluateExpression(endExpr, context);
    const stepValue = this.evaluateExpression(stepExpr, context);

    if (startValue.type !== 'number' || endValue.type !== 'number' || stepValue.type !== 'number') {
      throw new Error('For loop parameters must be numbers');
    }

    const start = startValue.value;
    const end = endValue.value;
    const step = stepValue.value;

    if (step === 0) {
      throw new Error('For loop step cannot be zero');
    }

    // Infinite loop protection
    const MAX_ITERATIONS = 10000;
    let iterations = 0;

    // Execute loop
    if (step > 0) {
      for (let i = start; i <= end; i += step) {
        if (iterations++ >= MAX_ITERATIONS) {
          throw new Error(`For loop exceeded maximum iterations (${MAX_ITERATIONS})`);
        }

        context.variables.set(varName, { type: 'number', value: i });

        try {
          this.executeBlock(body, context);
        } catch (error) {
          if (error instanceof Error && error.message === 'break') {
            break;
          }
          throw error;
        }
      }
    } else {
      for (let i = start; i >= end; i += step) {
        if (iterations++ >= MAX_ITERATIONS) {
          throw new Error(`For loop exceeded maximum iterations (${MAX_ITERATIONS})`);
        }

        context.variables.set(varName, { type: 'number', value: i });

        try {
          this.executeBlock(body, context);
        } catch (error) {
          if (error instanceof Error && error.message === 'break') {
            break;
          }
          throw error;
        }
      }
    }
  }

  /**
   * Execute generic for loop (for k, v in pairs/ipairs)
   */
  private executeGenericFor(fullCode: string, context: LuaExecutionContext, match: RegExpMatchArray): void {
    const keyVar = match[1];
    const valueVar = match[2]; // May be undefined for single-variable loops

    // Find the iterator expression
    const afterIn = fullCode.substring(match[0].length);
    const doMatch = afterIn.match(/\s+do(?:\s|$)/);
    if (!doMatch) {
      throw new Error('Invalid generic for loop syntax. Missing do keyword');
    }

    const iteratorExpr = afterIn.substring(0, doMatch.index).trim();
    const rest = afterIn.substring(doMatch.index! + doMatch[0].length);

    // Extract body
    const endIndex = rest.lastIndexOf('end');
    if (endIndex === -1) {
      throw new Error('Invalid generic for loop syntax. Missing end keyword');
    }

    const body = rest.substring(0, endIndex).trim();

    // Evaluate the iterator expression
    const iteratorResult = this.evaluateExpression(iteratorExpr, context);

    // Handle pairs() and ipairs()
    if (iteratorResult.type === 'function' && iteratorResult.value && typeof iteratorResult.value === 'object') {
      const iterInfo = iteratorResult.value as { __iterator?: string; __table?: Record<string, LuaValue>; __keys?: string[]; __index?: number };

      if (iterInfo.__iterator === 'pairs' && iterInfo.__table) {
        this.executePairsLoop(keyVar, valueVar, iterInfo.__table, iterInfo.__keys || [], body, context);
        return;
      }

      if (iterInfo.__iterator === 'ipairs' && iterInfo.__table) {
        this.executeIpairsLoop(keyVar, valueVar, iterInfo.__table, body, context);
        return;
      }
    }

    throw new Error(`Unsupported iterator: ${iteratorExpr}`);
  }

  /**
   * Execute pairs() loop
   */
  private executePairsLoop(
    keyVar: string,
    valueVar: string | undefined,
    table: Record<string, LuaValue>,
    keys: string[],
    body: string,
    context: LuaExecutionContext
  ): void {
    const MAX_ITERATIONS = 10000;
    let iterations = 0;

    for (const key of keys) {
      if (iterations++ >= MAX_ITERATIONS) {
        throw new Error(`For loop exceeded maximum iterations (${MAX_ITERATIONS})`);
      }

      // Set key variable (convert numeric strings to numbers for Lua compatibility)
      const keyValue = !isNaN(Number(key)) ? { type: 'number' as const, value: Number(key) } : { type: 'string' as const, value: key };
      context.variables.set(keyVar, keyValue);

      // Set value variable if provided
      if (valueVar) {
        context.variables.set(valueVar, table[key] || { type: 'nil', value: null });
      }

      try {
        this.executeBlock(body, context);
      } catch (error) {
        if (error instanceof Error && error.message === 'break') {
          break;
        }
        throw error;
      }
    }
  }

  /**
   * Execute ipairs() loop
   */
  private executeIpairsLoop(
    keyVar: string,
    valueVar: string | undefined,
    table: Record<string, LuaValue>,
    body: string,
    context: LuaExecutionContext
  ): void {
    const MAX_ITERATIONS = 10000;
    let iterations = 0;

    // ipairs iterates over consecutive integer keys starting at 1
    let index = 1;
    while (table[String(index)] !== undefined) {
      if (iterations++ >= MAX_ITERATIONS) {
        throw new Error(`For loop exceeded maximum iterations (${MAX_ITERATIONS})`);
      }

      context.variables.set(keyVar, { type: 'number', value: index });

      if (valueVar) {
        context.variables.set(valueVar, table[String(index)]);
      }

      try {
        this.executeBlock(body, context);
      } catch (error) {
        if (error instanceof Error && error.message === 'break') {
          break;
        }
        throw error;
      }

      index++;
    }
  }

  /**
   * Execute function definition
   */
  private executeFunction(fullCode: string, context: LuaExecutionContext): void {
    // Parse: function name(param1, param2, ...) <body> end
    const funcMatch = fullCode.match(/^function\s+(\w+)\s*\((.*?)\)/);
    if (!funcMatch) {
      throw new Error('Invalid function syntax. Expected: function name(params) ... end');
    }

    const funcName = funcMatch[1];
    const paramsStr = funcMatch[2].trim();
    const params = paramsStr ? paramsStr.split(',').map(p => p.trim()) : [];

    // Extract body using depth tracking (similar to while/for loops)
    const afterParams = fullCode.substring(funcMatch[0].length).trim();
    const lines = afterParams.split('\n');
    let depth = 1;
    const bodyLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Track nested blocks
      if (/^(while|for|if|function)\s/.test(trimmed)) {
        depth++;
      }

      if (trimmed === 'end' || trimmed.startsWith('end ')) {
        depth--;
        if (depth === 0) break;
      }

      bodyLines.push(line);
    }

    const body = bodyLines.join('\n').trim();

    // Store function definition
    context.functions.set(funcName, { params, body });
  }

  /**
   * Arithmetic operations
   */
  private add(a: LuaValue | undefined, b: LuaValue): LuaValue {
    if (!a) a = { type: 'number', value: 0 };
    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: a.value + b.value };
    }
    if (a.type === 'string' || b.type === 'string') {
      return { type: 'string', value: String(a.value) + String(b.value) };
    }
    throw new Error('Cannot add these types');
  }

  private subtract(a: LuaValue | undefined, b: LuaValue): LuaValue {
    if (!a) a = { type: 'number', value: 0 };
    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: a.value - b.value };
    }
    throw new Error('Cannot subtract non-numbers');
  }

  private multiply(a: LuaValue | undefined, b: LuaValue): LuaValue {
    if (!a) a = { type: 'number', value: 0 };
    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: a.value * b.value };
    }
    throw new Error('Cannot multiply non-numbers');
  }

  private divide(a: LuaValue | undefined, b: LuaValue): LuaValue {
    if (!a) a = { type: 'number', value: 0 };
    if (a.type === 'number' && b.type === 'number') {
      if (b.value === 0) return { type: 'number', value: 0 }; // Safely return 0 for division by zero
      return { type: 'number', value: a.value / b.value };
    }
    throw new Error('Cannot divide non-numbers');
  }

  private modulo(a: LuaValue, b: LuaValue): LuaValue {
    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: a.value % b.value };
    }
    throw new Error('Cannot modulo non-numbers');
  }

  /**
   * Convert JavaScript value to Lua value
   */
  private toLuaValue(value: any): LuaValue {
    if (value === null || value === undefined) {
      return { type: 'nil', value: null };
    }
    if (typeof value === 'boolean') {
      return { type: 'boolean', value };
    }
    if (typeof value === 'number') {
      return { type: 'number', value };
    }
    if (typeof value === 'string') {
      return { type: 'string', value };
    }
    if (typeof value === 'object') {
      return { type: 'table', value };
    }
    return { type: 'nil', value: null };
  }

  /**
   * Convert Lua value to JavaScript value
   */
  private fromLuaValue(value: LuaValue): any {
    if (value.type === 'nil') return null;
    if (value.type === 'table') {
      // Recursively unwrap table values
      const unwrapped: Record<string, any> = {};
      for (const [key, val] of Object.entries(value.value as Record<string, LuaValue>)) {
        unwrapped[key] = this.fromLuaValue(val);
      }
      return unwrapped;
    }
    return value.value;
  }

  /**
   * Remove comments from code
   */
  private removeComments(code: string): string {
    // Remove single-line comments
    let result = code.replace(/--.*$/gm, '');
    // Remove multi-line comments
    result = result.replace(/--\[\[[\s\S]*?\]\]/g, '');
    return result;
  }

  /**
   * Split code into statements, preserving block structures
   */
  private splitStatements(code: string): string[] {
    const statements: string[] = [];
    const lines = code.split('\n');
    let currentStatement = '';
    let blockDepth = 0;
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      // Check for block start keywords (only when NOT already in a block)
      if (/^(while|for|if|function)\s/.test(line) && !inBlock) {
        inBlock = true;
        blockDepth = 1;
        currentStatement = line;
        continue;
      }

      if (inBlock) {
        currentStatement += '\n' + line;

        // Track nested blocks
        if (/\b(while|for|if|function)\s/.test(line)) {
          blockDepth++;
        }

        // Check for block end
        if (line.includes('end')) {
          blockDepth--;
          if (blockDepth === 0) {
            statements.push(currentStatement);
            currentStatement = '';
            inBlock = false;
          }
        }
      } else {
        // Regular statement (not in a block)
        // Split by semicolons
        const parts = line.split(';').map(s => s.trim()).filter(s => s.length > 0);
        statements.push(...parts);
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement);
    }

    return statements;
  }
}

/**
 * Get singleton Lua engine instance
 */
let engineInstance: LuaEngine | null = null;

export function getLuaEngine(): LuaEngine {
  if (!engineInstance) {
    engineInstance = new LuaEngine();
  }
  return engineInstance;
}
