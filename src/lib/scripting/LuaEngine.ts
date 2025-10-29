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

    // Table dot notation (t.key)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
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
      const output = args.map((arg) => String(arg.value)).join('\t');
      context.output.push(output);
      return { type: 'nil', value: null };
    }

    if (funcName === 'math.random') {
      const min = args[0]?.value || 0;
      const max = args[1]?.value || 1;
      const value = Math.floor(Math.random() * (max - min + 1)) + min;
      return { type: 'number', value };
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

    if (funcName === 'string.upper') {
      return { type: 'string', value: String(args[0].value).toUpperCase() };
    }

    if (funcName === 'string.lower') {
      return { type: 'string', value: String(args[0].value).toLowerCase() };
    }

    if (funcName === 'string.len') {
      return { type: 'number', value: String(args[0].value).length };
    }

    // Check for user-defined functions
    const userFunc = context.functions.get(funcName);
    if (userFunc) {
      // Lua has global scope by default (no 'local' keyword implementation)
      // So we share the same variables map
      // Bind parameters to arguments
      for (let i = 0; i < userFunc.params.length; i++) {
        const paramName = userFunc.params[i];
        const argValue = args[i] || { type: 'nil', value: null };
        context.variables.set(paramName, argValue);
      }

      // Execute function body
      try {
        this.executeBlock(userFunc.body, context);
        return { type: 'nil', value: null }; // Default return
      } catch (error) {
        // Check if it's a return statement
        if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'return') {
          return (error as { type: string; value: LuaValue }).value;
        }
        throw error;
      }
    }

    throw new Error(`Unknown function: ${funcName}`);
  }

  /**
   * Parse function arguments
   */
  private parseArguments(argsStr: string, context: LuaExecutionContext): LuaValue[] {
    const args: LuaValue[] = [];
    const parts = argsStr.split(',');

    for (const part of parts) {
      args.push(this.evaluateExpression(part.trim(), context));
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
   * Execute for loop
   */
  private executeFor(fullCode: string, context: LuaExecutionContext): void {
    // Parse numeric for loop: for var = start, end [, step] do <body> end
    // Extract parts more carefully
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
  private add(a: LuaValue, b: LuaValue): LuaValue {
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

  private multiply(a: LuaValue, b: LuaValue): LuaValue {
    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: a.value * b.value };
    }
    throw new Error('Cannot multiply non-numbers');
  }

  private divide(a: LuaValue, b: LuaValue): LuaValue {
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
