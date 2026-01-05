/**
 * LuaEngine - Enhanced Lua scripting engine for interactive fiction preview
 *
 * This engine provides ~80% Lua 5.1 compatibility for in-browser preview.
 * For production use, deploy to whisker-core which has FULL Lua 5.1+ support.
 *
 * SUPPORTED Features:
 * - ✅ Variables (numbers, strings, booleans, nil, tables)
 * - ✅ Arithmetic operators (+, -, *, /, %, ^)
 * - ✅ Comparison operators (==, ~=, <, >, <=, >=)
 * - ✅ Logical operators (and, or, not)
 * - ✅ String concatenation (..)
 * - ✅ Length operator (#)
 * - ✅ If/then/else/elseif statements
 * - ✅ While loops (max 10000 iterations)
 * - ✅ Numeric for loops (for i=1,10 do...end)
 * - ✅ Generic for loops (for k,v in pairs/ipairs(t) do...end)
 * - ✅ Repeat-until loops
 * - ✅ Function definitions with return values
 * - ✅ Local variable scoping
 * - ✅ Tables with dot/bracket notation
 * - ✅ Break statement
 *
 * Standard Library:
 * - ✅ print, type, tostring, tonumber, assert, error
 * - ✅ pairs, ipairs, next
 * - ✅ math: random, floor, ceil, abs, min, max, sqrt, pow, sin, cos, tan, log, exp, pi
 * - ✅ string: upper, lower, len, sub, find, rep, reverse, char, byte, format
 * - ✅ table: insert, remove, concat, sort
 *
 * NOT SUPPORTED:
 * - ❌ Metatables and metamethods
 * - ❌ Coroutines
 * - ❌ Modules (require/module)
 * - ❌ File I/O
 * - ❌ Debug library
 * - ❌ String pattern matching (partial)
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
  localScopes: Map<string, LuaValue>[]; // Stack of local variable scopes
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
      localScopes: [],
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
      localScopes: [],
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
    this.globalContext.localScopes = [];
    this.globalContext.functions.clear();
    this.globalContext.output = [];
    this.globalContext.errors = [];
    this.initializeStandardLibrary();
  }

  /**
   * Initialize standard library functions
   */
  private initializeStandardLibrary(): void {
    // Set math.pi constant
    this.globalContext.variables.set('math', {
      type: 'table',
      value: {
        pi: { type: 'number', value: Math.PI },
        huge: { type: 'number', value: Infinity },
      },
    });

    // print function
    this.globalContext.functions.set('print', {
      params: ['...'],
      body: '__builtin_print',
    });

    // type function
    this.globalContext.functions.set('type', {
      params: ['value'],
      body: '__builtin_type',
    });

    // tostring function
    this.globalContext.functions.set('tostring', {
      params: ['value'],
      body: '__builtin_tostring',
    });

    // tonumber function
    this.globalContext.functions.set('tonumber', {
      params: ['value', 'base'],
      body: '__builtin_tonumber',
    });

    // assert function
    this.globalContext.functions.set('assert', {
      params: ['v', 'message'],
      body: '__builtin_assert',
    });

    // error function
    this.globalContext.functions.set('error', {
      params: ['message'],
      body: '__builtin_error',
    });

    // pairs function (returns iterator for generic for)
    this.globalContext.functions.set('pairs', {
      params: ['t'],
      body: '__builtin_pairs',
    });

    // ipairs function (returns iterator for array-style tables)
    this.globalContext.functions.set('ipairs', {
      params: ['t'],
      body: '__builtin_ipairs',
    });

    // next function
    this.globalContext.functions.set('next', {
      params: ['t', 'k'],
      body: '__builtin_next',
    });

    // rawget/rawset/rawequal
    this.globalContext.functions.set('rawget', {
      params: ['t', 'k'],
      body: '__builtin_rawget',
    });

    this.globalContext.functions.set('rawset', {
      params: ['t', 'k', 'v'],
      body: '__builtin_rawset',
    });

    this.globalContext.functions.set('rawequal', {
      params: ['a', 'b'],
      body: '__builtin_rawequal',
    });

    // select function
    this.globalContext.functions.set('select', {
      params: ['index', '...'],
      body: '__builtin_select',
    });

    // unpack function
    this.globalContext.functions.set('unpack', {
      params: ['list', 'i', 'j'],
      body: '__builtin_unpack',
    });

    // Math functions
    this.globalContext.functions.set('math.random', {
      params: ['min', 'max'],
      body: '__builtin_math_random',
    });

    this.globalContext.functions.set('math.randomseed', {
      params: ['seed'],
      body: '__builtin_math_randomseed',
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

    this.globalContext.functions.set('math.asin', {
      params: ['x'],
      body: '__builtin_math_asin',
    });

    this.globalContext.functions.set('math.acos', {
      params: ['x'],
      body: '__builtin_math_acos',
    });

    this.globalContext.functions.set('math.atan', {
      params: ['x'],
      body: '__builtin_math_atan',
    });

    this.globalContext.functions.set('math.atan2', {
      params: ['y', 'x'],
      body: '__builtin_math_atan2',
    });

    this.globalContext.functions.set('math.log', {
      params: ['x'],
      body: '__builtin_math_log',
    });

    this.globalContext.functions.set('math.log10', {
      params: ['x'],
      body: '__builtin_math_log10',
    });

    this.globalContext.functions.set('math.exp', {
      params: ['x'],
      body: '__builtin_math_exp',
    });

    this.globalContext.functions.set('math.deg', {
      params: ['x'],
      body: '__builtin_math_deg',
    });

    this.globalContext.functions.set('math.rad', {
      params: ['x'],
      body: '__builtin_math_rad',
    });

    this.globalContext.functions.set('math.fmod', {
      params: ['x', 'y'],
      body: '__builtin_math_fmod',
    });

    this.globalContext.functions.set('math.modf', {
      params: ['x'],
      body: '__builtin_math_modf',
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

    this.globalContext.functions.set('string.rep', {
      params: ['s', 'n'],
      body: '__builtin_string_rep',
    });

    this.globalContext.functions.set('string.reverse', {
      params: ['s'],
      body: '__builtin_string_reverse',
    });

    this.globalContext.functions.set('string.char', {
      params: ['...'],
      body: '__builtin_string_char',
    });

    this.globalContext.functions.set('string.byte', {
      params: ['s', 'i', 'j'],
      body: '__builtin_string_byte',
    });

    this.globalContext.functions.set('string.format', {
      params: ['formatstring', '...'],
      body: '__builtin_string_format',
    });

    this.globalContext.functions.set('string.gmatch', {
      params: ['s', 'pattern'],
      body: '__builtin_string_gmatch',
    });

    // Table functions
    this.globalContext.functions.set('table.insert', {
      params: ['t', 'pos', 'value'],
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

    this.globalContext.functions.set('table.maxn', {
      params: ['t'],
      body: '__builtin_table_maxn',
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
        // Re-throw break statements (they need to propagate to loops)
        if (error instanceof Error && error.message === 'break') {
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

    // Break statement
    if (statement === 'break') {
      throw new Error('break');
    }

    // Function definition
    if (statement.startsWith('function ')) {
      this.executeFunction(statement, context);
      return;
    }

    // Local function definition
    if (statement.startsWith('local function ')) {
      this.executeLocalFunction(statement, context);
      return;
    }

    // Return statement
    if (statement.startsWith('return ')) {
      const expr = statement.substring(7).trim();
      const value = this.evaluateExpression(expr, context);
      throw { type: 'return', value }; // Use exception for control flow
    }

    // Return with no value
    if (statement === 'return') {
      throw { type: 'return', value: { type: 'nil', value: null } };
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

    // Repeat-until loop
    if (statement.startsWith('repeat')) {
      this.executeRepeatUntil(statement, context);
      return;
    }

    // For loop (check for generic for first)
    if (statement.startsWith('for ')) {
      if (statement.includes(' in ')) {
        this.executeGenericFor(statement, context);
      } else {
        this.executeFor(statement, context);
      }
      return;
    }

    // Local variable declaration
    if (statement.startsWith('local ')) {
      this.executeLocalAssignment(statement, context);
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

      let tableValue = this.lookupVariable(tableName, context);
      if (!tableValue || tableValue.type !== 'table') {
        // Create new table if it doesn't exist
        tableValue = { type: 'table', value: {} };
        context.variables.set(tableName, tableValue);
      }

      const keyValue = this.evaluateExpression(keyExpr, context);
      const key = String(keyValue.value);
      const value = this.evaluateExpression(expression, context);

      (tableValue.value as Record<string, LuaValue>)[key] = value;
      return;
    }

    // Handle table dot notation: t.key = value
    if (varName.includes('.')) {
      const dotIndex = varName.indexOf('.');
      const tableName = varName.substring(0, dotIndex).trim();
      const key = varName.substring(dotIndex + 1).trim();

      let tableValue = this.lookupVariable(tableName, context);
      if (!tableValue || tableValue.type !== 'table') {
        // Create new table if it doesn't exist
        tableValue = { type: 'table', value: {} };
        context.variables.set(tableName, tableValue);
      }

      const value = this.evaluateExpression(expression, context);

      (tableValue.value as Record<string, LuaValue>)[key] = value;
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

    // Length operator (#) - unary prefix
    if (trimmed.startsWith('#')) {
      const operand = this.evaluateExpression(trimmed.substring(1), context);
      if (operand.type === 'string') {
        return { type: 'number', value: (operand.value as string).length };
      }
      if (operand.type === 'table') {
        // For tables, # returns the length of the array part (highest consecutive integer key)
        const table = operand.value as Record<string, LuaValue>;
        let length = 0;
        while (table[String(length + 1)] !== undefined) {
          length++;
        }
        return { type: 'number', value: length };
      }
      throw new Error(`attempt to get length of a ${operand.type} value`);
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
      const tableValue = this.lookupVariable(tableName, context);
      if (tableValue?.type === 'table') {
        return tableValue.value[key] || { type: 'nil', value: null };
      }
      return { type: 'nil', value: null };
    }

    // Number literals (including hex)
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { type: 'number', value: parseFloat(trimmed) };
    }
    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
      return { type: 'number', value: parseInt(trimmed, 16) };
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
    // Power operator (^)
    if (trimmed.includes('^')) {
      return this.evaluateBinaryOp(trimmed, '^', context);
    }

    // Variable reference (check local scopes first, then global)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      const value = this.lookupVariable(trimmed, context);
      return value || { type: 'nil', value: null };
    }

    // Unknown expression
    throw new Error(`Cannot evaluate expression: ${trimmed}`);
  }

  /**
   * Look up a variable in local scopes first, then global
   */
  private lookupVariable(name: string, context: LuaExecutionContext): LuaValue | undefined {
    // Check local scopes from innermost to outermost
    for (let i = context.localScopes.length - 1; i >= 0; i--) {
      const value = context.localScopes[i].get(name);
      if (value !== undefined) {
        return value;
      }
    }
    // Fall back to global
    return context.variables.get(name);
  }

  /**
   * Set a variable - use current local scope if it exists there, otherwise global
   */
  private setContextVariable(name: string, value: LuaValue, context: LuaExecutionContext): void {
    // Check if variable exists in any local scope
    for (let i = context.localScopes.length - 1; i >= 0; i--) {
      if (context.localScopes[i].has(name)) {
        context.localScopes[i].set(name, value);
        return;
      }
    }
    // Set in global scope
    context.variables.set(name, value);
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
        case '^':
          result = this.power(result, right);
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
    // === Global functions ===
    if (funcName === 'print') {
      const output = args.map((arg) => this.luaToString(arg)).join('\t');
      context.output.push(output);
      return { type: 'nil', value: null };
    }

    if (funcName === 'type') {
      if (args.length === 0) return { type: 'string', value: 'nil' };
      return { type: 'string', value: args[0].type };
    }

    if (funcName === 'tostring') {
      if (args.length === 0) return { type: 'string', value: 'nil' };
      return { type: 'string', value: this.luaToString(args[0]) };
    }

    if (funcName === 'tonumber') {
      if (args.length === 0) return { type: 'nil', value: null };
      const val = args[0];
      const base = args[1]?.value || 10;
      if (val.type === 'number') return val;
      if (val.type === 'string') {
        const parsed = base === 10 ? parseFloat(val.value) : parseInt(val.value, base);
        if (isNaN(parsed)) return { type: 'nil', value: null };
        return { type: 'number', value: parsed };
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'assert') {
      if (args.length === 0 || !this.isTruthy(args[0])) {
        const message = args[1]?.value || 'assertion failed!';
        throw new Error(String(message));
      }
      return args[0];
    }

    if (funcName === 'error') {
      const message = args[0]?.value || 'error';
      throw new Error(String(message));
    }

    if (funcName === 'pairs') {
      // Return a special marker for generic for to handle
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to pairs (table expected)');
      }
      return { type: 'table', value: { __pairs: true, table: args[0].value } };
    }

    if (funcName === 'ipairs') {
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to ipairs (table expected)');
      }
      return { type: 'table', value: { __ipairs: true, table: args[0].value } };
    }

    if (funcName === 'next') {
      if (args.length === 0 || args[0].type !== 'table') {
        return { type: 'nil', value: null };
      }
      const t = args[0].value as Record<string, LuaValue>;
      const k = args[1]?.value;
      const keys = Object.keys(t);
      if (k === undefined || k === null) {
        // Return first key-value pair
        if (keys.length === 0) return { type: 'nil', value: null };
        return { type: 'table', value: { key: keys[0], val: t[keys[0]] } };
      }
      const idx = keys.indexOf(String(k));
      if (idx === -1 || idx === keys.length - 1) return { type: 'nil', value: null };
      return { type: 'table', value: { key: keys[idx + 1], val: t[keys[idx + 1]] } };
    }

    if (funcName === 'rawget') {
      if (args.length < 2 || args[0].type !== 'table') return { type: 'nil', value: null };
      const t = args[0].value as Record<string, LuaValue>;
      return t[String(args[1].value)] || { type: 'nil', value: null };
    }

    if (funcName === 'rawset') {
      if (args.length < 3 || args[0].type !== 'table') return args[0];
      const t = args[0].value as Record<string, LuaValue>;
      t[String(args[1].value)] = args[2];
      return args[0];
    }

    if (funcName === 'rawequal') {
      if (args.length < 2) return { type: 'boolean', value: false };
      return { type: 'boolean', value: args[0].value === args[1].value };
    }

    if (funcName === 'select') {
      if (args.length === 0) return { type: 'nil', value: null };
      const idx = args[0].value;
      if (idx === '#') return { type: 'number', value: args.length - 1 };
      const n = Number(idx);
      if (n < 0) return args[args.length + n] || { type: 'nil', value: null };
      return args[n] || { type: 'nil', value: null };
    }

    if (funcName === 'unpack') {
      if (args.length === 0 || args[0].type !== 'table') return { type: 'nil', value: null };
      const t = args[0].value as Record<string, LuaValue>;
      const i = args[1]?.value || 1;
      const j = args[2]?.value || Object.keys(t).length;
      const result: LuaValue[] = [];
      for (let k = i; k <= j; k++) {
        result.push(t[String(k)] || { type: 'nil', value: null });
      }
      // Return first element for now (full multiple return not supported)
      return result[0] || { type: 'nil', value: null };
    }

    // === Math functions ===
    if (funcName === 'math.random') {
      if (args.length === 0) {
        return { type: 'number', value: Math.random() };
      }
      if (args.length === 1) {
        const max = args[0].value;
        return { type: 'number', value: Math.floor(Math.random() * max) + 1 };
      }
      const min = args[0].value;
      const max = args[1].value;
      return { type: 'number', value: Math.floor(Math.random() * (max - min + 1)) + min };
    }

    if (funcName === 'math.randomseed') {
      // JavaScript doesn't have seed support, just acknowledge
      return { type: 'nil', value: null };
    }

    if (funcName === 'math.floor') {
      return { type: 'number', value: Math.floor(args[0]?.value || 0) };
    }

    if (funcName === 'math.ceil') {
      return { type: 'number', value: Math.ceil(args[0]?.value || 0) };
    }

    if (funcName === 'math.abs') {
      return { type: 'number', value: Math.abs(args[0]?.value || 0) };
    }

    if (funcName === 'math.min') {
      if (args.length === 0) throw new Error('bad argument #1 to min (number expected)');
      const values = args.map(a => a.value);
      return { type: 'number', value: Math.min(...values) };
    }

    if (funcName === 'math.max') {
      if (args.length === 0) throw new Error('bad argument #1 to max (number expected)');
      const values = args.map(a => a.value);
      return { type: 'number', value: Math.max(...values) };
    }

    if (funcName === 'math.sqrt') {
      return { type: 'number', value: Math.sqrt(args[0]?.value || 0) };
    }

    if (funcName === 'math.pow') {
      return { type: 'number', value: Math.pow(args[0]?.value || 0, args[1]?.value || 0) };
    }

    if (funcName === 'math.sin') {
      return { type: 'number', value: Math.sin(args[0]?.value || 0) };
    }

    if (funcName === 'math.cos') {
      return { type: 'number', value: Math.cos(args[0]?.value || 0) };
    }

    if (funcName === 'math.tan') {
      return { type: 'number', value: Math.tan(args[0]?.value || 0) };
    }

    if (funcName === 'math.asin') {
      return { type: 'number', value: Math.asin(args[0]?.value || 0) };
    }

    if (funcName === 'math.acos') {
      return { type: 'number', value: Math.acos(args[0]?.value || 0) };
    }

    if (funcName === 'math.atan') {
      return { type: 'number', value: Math.atan(args[0]?.value || 0) };
    }

    if (funcName === 'math.atan2') {
      return { type: 'number', value: Math.atan2(args[0]?.value || 0, args[1]?.value || 0) };
    }

    if (funcName === 'math.log') {
      return { type: 'number', value: Math.log(args[0]?.value || 0) };
    }

    if (funcName === 'math.log10') {
      return { type: 'number', value: Math.log10(args[0]?.value || 0) };
    }

    if (funcName === 'math.exp') {
      return { type: 'number', value: Math.exp(args[0]?.value || 0) };
    }

    if (funcName === 'math.deg') {
      return { type: 'number', value: (args[0]?.value || 0) * (180 / Math.PI) };
    }

    if (funcName === 'math.rad') {
      return { type: 'number', value: (args[0]?.value || 0) * (Math.PI / 180) };
    }

    if (funcName === 'math.fmod') {
      const x = args[0]?.value || 0;
      const y = args[1]?.value || 1;
      return { type: 'number', value: x % y };
    }

    if (funcName === 'math.modf') {
      const x = args[0]?.value || 0;
      const intPart = Math.trunc(x);
      // Return just the integer part (multiple returns not fully supported)
      return { type: 'number', value: intPart };
    }

    // === String functions ===
    if (funcName === 'string.upper') {
      return { type: 'string', value: String(args[0]?.value || '').toUpperCase() };
    }

    if (funcName === 'string.lower') {
      return { type: 'string', value: String(args[0]?.value || '').toLowerCase() };
    }

    if (funcName === 'string.len') {
      return { type: 'number', value: String(args[0]?.value || '').length };
    }

    if (funcName === 'string.sub') {
      const s = String(args[0]?.value || '');
      let i = (args[1]?.value || 1) as number;
      let j = (args[2]?.value || s.length) as number;
      // Lua uses 1-based indexing, negative indices count from end
      if (i < 0) i = s.length + i + 1;
      if (j < 0) j = s.length + j + 1;
      // Convert to 0-based
      return { type: 'string', value: s.substring(Math.max(0, i - 1), Math.max(0, j)) };
    }

    if (funcName === 'string.find') {
      const s = String(args[0]?.value || '');
      const pattern = String(args[1]?.value || '');
      const init = (args[2]?.value || 1) as number;
      const plain = args[3]?.value || false;
      const startIdx = Math.max(0, init - 1);
      if (plain) {
        const idx = s.indexOf(pattern, startIdx);
        if (idx === -1) return { type: 'nil', value: null };
        return { type: 'number', value: idx + 1 }; // Lua 1-based
      }
      // Simple pattern matching (not full Lua patterns)
      try {
        const regex = new RegExp(pattern);
        const match = s.substring(startIdx).match(regex);
        if (!match) return { type: 'nil', value: null };
        return { type: 'number', value: s.indexOf(match[0], startIdx) + 1 };
      } catch {
        const idx = s.indexOf(pattern, startIdx);
        if (idx === -1) return { type: 'nil', value: null };
        return { type: 'number', value: idx + 1 };
      }
    }

    if (funcName === 'string.match') {
      const s = String(args[0]?.value || '');
      const pattern = String(args[1]?.value || '');
      try {
        const regex = new RegExp(pattern);
        const match = s.match(regex);
        if (!match) return { type: 'nil', value: null };
        return { type: 'string', value: match[0] };
      } catch {
        if (s.includes(pattern)) return { type: 'string', value: pattern };
        return { type: 'nil', value: null };
      }
    }

    if (funcName === 'string.gsub') {
      const s = String(args[0]?.value || '');
      const pattern = String(args[1]?.value || '');
      const repl = String(args[2]?.value || '');
      const n = args[3]?.value as number | undefined;
      try {
        const regex = new RegExp(pattern, 'g');
        let count = 0;
        const result = s.replace(regex, (match) => {
          if (n !== undefined && count >= n) return match;
          count++;
          return repl;
        });
        return { type: 'string', value: result };
      } catch {
        return { type: 'string', value: s.split(pattern).join(repl) };
      }
    }

    if (funcName === 'string.rep') {
      const s = String(args[0]?.value || '');
      const n = (args[1]?.value || 0) as number;
      return { type: 'string', value: s.repeat(Math.max(0, n)) };
    }

    if (funcName === 'string.reverse') {
      const s = String(args[0]?.value || '');
      return { type: 'string', value: s.split('').reverse().join('') };
    }

    if (funcName === 'string.char') {
      const chars = args.map(a => String.fromCharCode(a.value));
      return { type: 'string', value: chars.join('') };
    }

    if (funcName === 'string.byte') {
      const s = String(args[0]?.value || '');
      const i = (args[1]?.value || 1) as number;
      if (i < 1 || i > s.length) return { type: 'nil', value: null };
      return { type: 'number', value: s.charCodeAt(i - 1) };
    }

    if (funcName === 'string.format') {
      const format = String(args[0]?.value || '');
      const values = args.slice(1).map(a => a.value);
      // Simple sprintf-like formatting
      let result = format;
      let idx = 0;
      result = result.replace(/%([+-]?)(\d*)\.?(\d*)([diouxXeEfFgGcspq%])/g, (match, flags, width, precision, specifier) => {
        if (specifier === '%') return '%';
        if (idx >= values.length) return match;
        const val = values[idx++];
        switch (specifier) {
          case 'd':
          case 'i': return String(Math.floor(Number(val)));
          case 'o': return Math.floor(Number(val)).toString(8);
          case 'u': return String(Math.abs(Math.floor(Number(val))));
          case 'x': return Math.floor(Number(val)).toString(16);
          case 'X': return Math.floor(Number(val)).toString(16).toUpperCase();
          case 'e': return Number(val).toExponential(precision ? Number(precision) : undefined);
          case 'E': return Number(val).toExponential(precision ? Number(precision) : undefined).toUpperCase();
          case 'f':
          case 'F': return Number(val).toFixed(precision ? Number(precision) : 6);
          case 'g':
          case 'G': return String(Number(val));
          case 'c': return String.fromCharCode(Number(val));
          case 's': return String(val);
          case 'q': return `"${String(val).replace(/"/g, '\\"')}"`;
          default: return match;
        }
      });
      return { type: 'string', value: result };
    }

    if (funcName === 'string.gmatch') {
      // Returns iterator - simplified: just return nil
      return { type: 'nil', value: null };
    }

    // === Table functions ===
    if (funcName === 'table.insert') {
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to insert (table expected)');
      }
      const t = args[0].value as Record<string, LuaValue>;
      if (args.length === 2) {
        // table.insert(t, value) - insert at end
        let maxKey = 0;
        for (const k of Object.keys(t)) {
          const num = parseInt(k);
          if (!isNaN(num) && num > maxKey) maxKey = num;
        }
        t[String(maxKey + 1)] = args[1];
      } else if (args.length >= 3) {
        // table.insert(t, pos, value) - insert at position
        const pos = args[1].value as number;
        // Shift elements
        const keys = Object.keys(t).filter(k => !isNaN(parseInt(k))).map(k => parseInt(k)).sort((a, b) => b - a);
        for (const k of keys) {
          if (k >= pos) {
            t[String(k + 1)] = t[String(k)];
          }
        }
        t[String(pos)] = args[2];
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'table.remove') {
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to remove (table expected)');
      }
      const t = args[0].value as Record<string, LuaValue>;
      const keys = Object.keys(t).filter(k => !isNaN(parseInt(k))).map(k => parseInt(k)).sort((a, b) => a - b);
      if (keys.length === 0) return { type: 'nil', value: null };

      const pos = args[1]?.value as number || keys[keys.length - 1];
      const removed = t[String(pos)] || { type: 'nil', value: null };
      delete t[String(pos)];

      // Shift elements down
      for (let i = pos; i < keys[keys.length - 1]; i++) {
        if (t[String(i + 1)] !== undefined) {
          t[String(i)] = t[String(i + 1)];
          delete t[String(i + 1)];
        }
      }
      return removed;
    }

    if (funcName === 'table.concat') {
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to concat (table expected)');
      }
      const t = args[0].value as Record<string, LuaValue>;
      const sep = String(args[1]?.value || '');
      const i = (args[2]?.value || 1) as number;
      const keys = Object.keys(t).filter(k => !isNaN(parseInt(k))).map(k => parseInt(k)).sort((a, b) => a - b);
      const j = (args[3]?.value || keys[keys.length - 1] || 0) as number;

      const parts: string[] = [];
      for (let k = i; k <= j; k++) {
        const val = t[String(k)];
        if (val) parts.push(String(val.value));
      }
      return { type: 'string', value: parts.join(sep) };
    }

    if (funcName === 'table.sort') {
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to sort (table expected)');
      }
      const t = args[0].value as Record<string, LuaValue>;
      const keys = Object.keys(t).filter(k => !isNaN(parseInt(k))).map(k => parseInt(k)).sort((a, b) => a - b);
      const values = keys.map(k => t[String(k)]);

      // Sort values
      values.sort((a, b) => {
        if (a.type === 'number' && b.type === 'number') return a.value - b.value;
        return String(a.value).localeCompare(String(b.value));
      });

      // Put back
      keys.forEach((k, i) => {
        t[String(k)] = values[i];
      });
      return { type: 'nil', value: null };
    }

    if (funcName === 'table.maxn') {
      if (args.length === 0 || args[0].type !== 'table') {
        return { type: 'number', value: 0 };
      }
      const t = args[0].value as Record<string, LuaValue>;
      let max = 0;
      for (const k of Object.keys(t)) {
        const num = parseFloat(k);
        if (!isNaN(num) && num > max) max = num;
      }
      return { type: 'number', value: max };
    }

    // Check for user-defined functions
    const userFunc = context.functions.get(funcName);
    if (userFunc) {
      // Create a new local scope for function parameters
      const funcScope = new Map<string, LuaValue>();
      context.localScopes.push(funcScope);

      // Bind parameters to arguments
      for (let i = 0; i < userFunc.params.length; i++) {
        const paramName = userFunc.params[i];
        const argValue = args[i] || { type: 'nil', value: null };
        funcScope.set(paramName, argValue);
      }

      // Execute function body
      try {
        this.executeBlock(userFunc.body, context);
        context.localScopes.pop();
        return { type: 'nil', value: null }; // Default return
      } catch (error) {
        context.localScopes.pop();
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
   * Convert Lua value to string representation
   */
  private luaToString(value: LuaValue): string {
    if (value.type === 'nil') return 'nil';
    if (value.type === 'boolean') return String(value.value);
    if (value.type === 'number') return String(value.value);
    if (value.type === 'string') return value.value;
    if (value.type === 'table') return 'table';
    if (value.type === 'function') return 'function';
    return String(value.value);
  }

  /**
   * Parse function arguments, respecting string literals
   */
  private parseArguments(argsStr: string, context: LuaExecutionContext): LuaValue[] {
    const args: LuaValue[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let depth = 0;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
        current += char;
      } else if (!inString && (char === '(' || char === '{' || char === '[')) {
        depth++;
        current += char;
      } else if (!inString && (char === ')' || char === '}' || char === ']')) {
        depth--;
        current += char;
      } else if (!inString && depth === 0 && char === ',') {
        if (current.trim()) {
          args.push(this.evaluateExpression(current.trim(), context));
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(this.evaluateExpression(current.trim(), context));
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
   * Execute local function definition
   */
  private executeLocalFunction(fullCode: string, context: LuaExecutionContext): void {
    // Parse: local function name(param1, param2, ...) <body> end
    const funcMatch = fullCode.match(/^local\s+function\s+(\w+)\s*\((.*?)\)/);
    if (!funcMatch) {
      throw new Error('Invalid local function syntax');
    }

    const funcName = funcMatch[1];
    const paramsStr = funcMatch[2].trim();
    const params = paramsStr ? paramsStr.split(',').map(p => p.trim()) : [];

    // Extract body using depth tracking
    const afterParams = fullCode.substring(funcMatch[0].length).trim();
    const lines = afterParams.split('\n');
    let depth = 1;
    const bodyLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

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

    // Store function in current local scope if exists, otherwise global
    context.functions.set(funcName, { params, body });
  }

  /**
   * Execute local variable assignment
   */
  private executeLocalAssignment(statement: string, context: LuaExecutionContext): void {
    // Parse: local var = expr  OR  local var
    const withoutLocal = statement.substring(6).trim(); // Remove 'local '

    // Check if there's an assignment
    const equalIndex = withoutLocal.indexOf('=');
    if (equalIndex === -1) {
      // Just declaration: local x
      const varName = withoutLocal.trim();
      // Add to current local scope or create one
      if (context.localScopes.length === 0) {
        context.localScopes.push(new Map());
      }
      context.localScopes[context.localScopes.length - 1].set(varName, { type: 'nil', value: null });
      return;
    }

    // Declaration with assignment: local x = expr
    const varName = withoutLocal.substring(0, equalIndex).trim();
    const expression = withoutLocal.substring(equalIndex + 1).trim();
    const value = this.evaluateExpression(expression, context);

    // Add to current local scope or create one
    if (context.localScopes.length === 0) {
      context.localScopes.push(new Map());
    }
    context.localScopes[context.localScopes.length - 1].set(varName, value);
  }

  /**
   * Execute generic for loop (for k,v in pairs(t) do ... end)
   */
  private executeGenericFor(fullCode: string, context: LuaExecutionContext): void {
    // Parse: for var1 [, var2] in iterator(t) do <body> end
    const forMatch = fullCode.match(/^for\s+(\w+)(?:\s*,\s*(\w+))?\s+in\s+(.+?)\s+do/);
    if (!forMatch) {
      throw new Error('Invalid generic for loop syntax');
    }

    const keyVar = forMatch[1];
    const valueVar = forMatch[2]; // May be undefined
    const iteratorExpr = forMatch[3].trim();

    // Extract body
    const doIndex = fullCode.indexOf(' do');
    const afterDo = fullCode.substring(doIndex + 3).trim();
    const lines = afterDo.split('\n');
    let depth = 1;
    const bodyLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (/^(while|for|if|function|repeat)\s/.test(trimmed)) {
        depth++;
      }

      if (trimmed === 'end' || trimmed.startsWith('end ')) {
        depth--;
        if (depth === 0) break;
      }

      bodyLines.push(line);
    }

    const body = bodyLines.join('\n').trim();

    // Evaluate the iterator expression
    const iteratorResult = this.evaluateExpression(iteratorExpr, context);

    // Handle pairs() result
    if (iteratorResult.type === 'table' && iteratorResult.value.__pairs) {
      const table = iteratorResult.value.table as Record<string, LuaValue>;
      const keys = Object.keys(table);

      const MAX_ITERATIONS = 10000;
      let iterations = 0;

      // Create local scope for loop variables
      const loopScope = new Map<string, LuaValue>();
      context.localScopes.push(loopScope);

      try {
        for (const key of keys) {
          if (iterations++ >= MAX_ITERATIONS) {
            throw new Error('Generic for loop exceeded maximum iterations');
          }

          loopScope.set(keyVar, { type: 'string', value: key });
          if (valueVar) {
            loopScope.set(valueVar, table[key]);
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
      } finally {
        context.localScopes.pop();
      }
      return;
    }

    // Handle ipairs() result
    if (iteratorResult.type === 'table' && iteratorResult.value.__ipairs) {
      const table = iteratorResult.value.table as Record<string, LuaValue>;

      const MAX_ITERATIONS = 10000;
      let iterations = 0;
      let index = 1;

      // Create local scope for loop variables
      const loopScope = new Map<string, LuaValue>();
      context.localScopes.push(loopScope);

      try {
        while (table[String(index)] !== undefined && iterations++ < MAX_ITERATIONS) {
          loopScope.set(keyVar, { type: 'number', value: index });
          if (valueVar) {
            loopScope.set(valueVar, table[String(index)]);
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
      } finally {
        context.localScopes.pop();
      }
      return;
    }

    throw new Error('Generic for loop requires pairs() or ipairs() iterator');
  }

  /**
   * Execute repeat-until loop
   */
  private executeRepeatUntil(fullCode: string, context: LuaExecutionContext): void {
    // Parse: repeat <body> until <condition>
    // Find 'until' keyword at the same nesting level
    const lines = fullCode.split('\n');
    let depth = 1;
    const bodyLines: string[] = [];
    let condition = '';
    let foundUntil = false;

    // Skip 'repeat' keyword
    const firstLine = lines[0].trim();
    if (firstLine === 'repeat') {
      lines.shift();
    } else if (firstLine.startsWith('repeat ')) {
      lines[0] = firstLine.substring(7);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for nested blocks
      if (/^(while|for|if|function|repeat)\s/.test(line) || line === 'repeat') {
        depth++;
      }

      // Check for 'until' at our depth
      if (line.startsWith('until ') && depth === 1) {
        condition = line.substring(6).trim();
        foundUntil = true;
        break;
      }

      if (line === 'end' || line.startsWith('end ')) {
        depth--;
      }

      bodyLines.push(lines[i]);
    }

    if (!foundUntil) {
      throw new Error('Invalid repeat-until syntax. Missing until keyword');
    }

    const body = bodyLines.join('\n').trim();

    // Infinite loop protection
    const MAX_ITERATIONS = 10000;
    let iterations = 0;

    do {
      if (iterations++ >= MAX_ITERATIONS) {
        throw new Error('Repeat-until loop exceeded maximum iterations');
      }

      try {
        this.executeBlock(body, context);
      } catch (error) {
        if (error instanceof Error && error.message === 'break') {
          break;
        }
        throw error;
      }

      const conditionValue = this.evaluateExpression(condition, context);
      if (this.isTruthy(conditionValue)) {
        break; // repeat-until exits when condition is TRUE
      }
    } while (true);
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

  private power(a: LuaValue, b: LuaValue): LuaValue {
    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: Math.pow(a.value, b.value) };
    }
    throw new Error('Cannot exponentiate non-numbers');
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
    let inRepeat = false;

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

      // Check for repeat-until block start
      if ((line === 'repeat' || line.startsWith('repeat ')) && !inBlock) {
        inBlock = true;
        inRepeat = true;
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
        if (line === 'repeat' || line.startsWith('repeat ')) {
          blockDepth++;
        }

        // Check for block end
        if (inRepeat) {
          // For repeat-until, look for 'until'
          if (line.startsWith('until ')) {
            blockDepth--;
            if (blockDepth === 0) {
              statements.push(currentStatement);
              currentStatement = '';
              inBlock = false;
              inRepeat = false;
            }
          }
          if (line.includes('end')) {
            blockDepth--;
          }
        } else {
          if (line.includes('end')) {
            blockDepth--;
            if (blockDepth === 0) {
              statements.push(currentStatement);
              currentStatement = '';
              inBlock = false;
            }
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
