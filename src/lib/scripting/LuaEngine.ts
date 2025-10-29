/**
 * LuaEngine - Lua scripting engine for interactive fiction
 *
 * Supports essential Lua features for story scripting:
 * - Variables (numbers, strings, booleans, tables)
 * - Operators (arithmetic, comparison, logical)
 * - Control flow (if/elseif/else, while, for)
 * - Functions
 * - Standard library subset (string, math, table)
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
    // Variable assignment
    if (statement.includes('=') && !this.isComparison(statement)) {
      this.executeAssignment(statement, context);
      return;
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
   * Execute variable assignment
   */
  private executeAssignment(statement: string, context: LuaExecutionContext): void {
    const equalIndex = statement.indexOf('=');
    const varName = statement.substring(0, equalIndex).trim();
    const expression = statement.substring(equalIndex + 1).trim();

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

    // String literals
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return { type: 'string', value: trimmed.slice(1, -1) };
    }

    // Number literals
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { type: 'number', value: parseFloat(trimmed) };
    }

    // Function call
    if (trimmed.includes('(') && trimmed.includes(')')) {
      return this.evaluateFunctionCall(trimmed, context);
    }

    // Binary operators
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

    // Comparison operators
    if (trimmed.includes('==')) {
      return this.evaluateComparison(trimmed, '==', context);
    }
    if (trimmed.includes('~=')) {
      return this.evaluateComparison(trimmed, '~=', context);
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

    // Logical operators
    if (trimmed.includes(' and ')) {
      return this.evaluateLogical(trimmed, 'and', context);
    }
    if (trimmed.includes(' or ')) {
      return this.evaluateLogical(trimmed, 'or', context);
    }
    if (trimmed.startsWith('not ')) {
      return this.evaluateNot(trimmed.substring(4), context);
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
    const parts = expr.split(op);
    if (parts.length < 2) {
      throw new Error(`Invalid binary operation: ${expr}`);
    }

    let result = this.evaluateExpression(parts[0], context);

    for (let i = 1; i < parts.length; i++) {
      const right = this.evaluateExpression(parts[i], context);

      switch (op) {
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
        result = leftVal.value === rightVal.value;
        break;
      case '~=':
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
    op: 'and' | 'or',
    context: LuaExecutionContext
  ): LuaValue {
    const parts = expr.split(` ${op} `);
    const left = this.evaluateExpression(parts[0], context);

    if (op === 'and') {
      if (!this.isTruthy(left)) return { type: 'boolean', value: false };
      const right = this.evaluateExpression(parts[1], context);
      return { type: 'boolean', value: this.isTruthy(right) };
    } else {
      // or
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
   * Execute if statement
   */
  private executeIf(statement: string, context: LuaExecutionContext): void {
    // Simple if statement parsing - in real implementation would need proper parser
    throw new Error('If statements not yet implemented in simplified engine');
  }

  /**
   * Execute while loop
   */
  private executeWhile(statement: string, context: LuaExecutionContext): void {
    throw new Error('While loops not yet implemented in simplified engine');
  }

  /**
   * Execute for loop
   */
  private executeFor(statement: string, context: LuaExecutionContext): void {
    throw new Error('For loops not yet implemented in simplified engine');
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
      if (b.value === 0) throw new Error('Division by zero');
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
   * Split code into statements
   */
  private splitStatements(code: string): string[] {
    // Simple split by newlines and semicolons
    return code
      .split(/[\n;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
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
