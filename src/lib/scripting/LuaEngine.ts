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
      if (line.startsWith('if ')) {
        const condition = line.substring(3, line.indexOf(' then')).trim();
        currentBranch = { condition, body: [] };
        blockDepth = 1;
        continue;
      }

      // elseif branch
      if (line.startsWith('elseif ') && blockDepth === 1) {
        if (currentBranch) {
          branches.push(currentBranch);
        }
        const condition = line.substring(7, line.indexOf(' then')).trim();
        currentBranch = { condition, body: [] };
        continue;
      }

      // else branch
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

      // Track nested blocks
      if (line.match(/\b(if|while|for|function)\s/)) {
        blockDepth++;
      }

      // Add line to current branch body
      if (currentBranch && line !== 'then') {
        currentBranch.body.push(line);
      }
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
    const whileMatch = fullCode.match(/^while\s+(.+?)\s+do\s+([\s\S]*?)\s+end/);

    if (!whileMatch) {
      throw new Error('Invalid while loop syntax. Expected: while <condition> do <body> end');
    }

    const condition = whileMatch[1].trim();
    const body = whileMatch[2].trim();

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

      // Check for block start keywords
      if (/^(while|for|if|function)\s/.test(line)) {
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
