/**
 * Lua Runtime for Story Player
 *
 * A lightweight Lua interpreter implementation for executing story scripts.
 * Supports basic Lua operations needed for story logic.
 */

interface LuaValue {
  type: 'number' | 'string' | 'boolean' | 'nil' | 'function';
  value: any;
}

interface LuaExecutionResult {
  success: boolean;
  value?: any;
  error?: string;
}

/**
 * Simple Lua Runtime for story execution
 */
export class LuaRuntime {
  private globalScope: Map<string, any>;
  private enabled: boolean;

  constructor() {
    this.enabled = true;
    this.globalScope = new Map();
    this.initializeStandardLibrary();
  }

  /**
   * Initialize standard Lua library functions
   */
  private initializeStandardLibrary(): void {
    // Math library
    this.globalScope.set('math', {
      abs: Math.abs,
      ceil: Math.ceil,
      floor: Math.floor,
      max: Math.max,
      min: Math.min,
      random: Math.random,
      sqrt: Math.sqrt,
      pow: Math.pow,
      pi: Math.PI,
    });

    // String library basics
    this.globalScope.set('string', {
      len: (s: string) => s.length,
      upper: (s: string) => s.toUpperCase(),
      lower: (s: string) => s.toLowerCase(),
      sub: (s: string, i: number, j?: number) => s.substring(i - 1, j),
    });

    // Print function
    this.globalScope.set('print', (...args: any[]) => {
      console.log(...args);
    });
  }

  /**
   * Sync JavaScript variables to Lua globals
   */
  syncVariablesToLua(variables: Map<string, any>): void {
    if (!this.enabled) return;

    variables.forEach((value, name) => {
      this.globalScope.set(name, value);
    });
  }

  /**
   * Sync Lua globals back to JavaScript variables
   */
  syncVariablesFromLua(variables: Map<string, any>): void {
    if (!this.enabled) return;

    variables.forEach((value, name) => {
      if (this.globalScope.has(name)) {
        const luaValue = this.globalScope.get(name);
        if (luaValue !== value) {
          variables.set(name, luaValue);
        }
      }
    });
  }

  /**
   * Execute Lua code
   */
  execute(code: string): LuaExecutionResult {
    if (!this.enabled) {
      return { success: false, error: 'Lua runtime not available' };
    }

    try {
      // Parse and execute the Lua code
      const result = this.evaluateExpression(code);
      return { success: true, value: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Evaluate a Lua condition expression
   */
  evaluateCondition(condition: string): boolean {
    if (!this.enabled || !condition || condition.trim() === '') {
      return true;
    }

    try {
      const result = this.evaluateExpression(condition);
      return Boolean(result);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Execute a passage script with context
   */
  executePassageScript(script: string, passageId: string, passageTitle: string): LuaExecutionResult {
    if (!this.enabled || !script || script.trim() === '') {
      return { success: true };
    }

    try {
      // Set passage context
      this.globalScope.set('currentPassageId', passageId);
      this.globalScope.set('currentPassageTitle', passageTitle);

      return this.execute(script);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Evaluate a Lua expression
   * This is a simplified evaluator that handles common story logic patterns
   */
  private evaluateExpression(expr: string): any {
    const trimmed = expr.trim();

    // Handle return statements
    if (trimmed.startsWith('return ')) {
      const returnExpr = trimmed.substring(7).trim();
      // Remove parentheses if wrapped
      const unwrapped = returnExpr.startsWith('(') && returnExpr.endsWith(')')
        ? returnExpr.slice(1, -1)
        : returnExpr;
      return this.evaluateExpression(unwrapped);
    }

    // Handle assignment
    if (trimmed.includes('=') && !this.isComparison(trimmed)) {
      return this.handleAssignment(trimmed);
    }

    // Handle comparison operators
    if (this.hasComparisonOperator(trimmed)) {
      return this.evaluateComparison(trimmed);
    }

    // Handle logical operators
    if (trimmed.includes(' and ') || trimmed.includes(' or ') || trimmed.startsWith('not ')) {
      return this.evaluateLogical(trimmed);
    }

    // Handle arithmetic
    if (this.hasArithmeticOperator(trimmed)) {
      return this.evaluateArithmetic(trimmed);
    }

    // Handle string concatenation
    if (trimmed.includes('..')) {
      return this.evaluateStringConcat(trimmed);
    }

    // Handle literals and variables
    return this.evaluateLiteral(trimmed);
  }

  private isComparison(expr: string): boolean {
    return /[<>!=]=|[<>]/.test(expr);
  }

  private hasComparisonOperator(expr: string): boolean {
    return /==|~=|<=|>=|<|>/.test(expr);
  }

  private hasArithmeticOperator(expr: string): boolean {
    return /[+\-*/%]/.test(expr);
  }

  private handleAssignment(expr: string): any {
    const parts = expr.split('=').map(p => p.trim());
    if (parts.length !== 2) {
      throw new Error('Invalid assignment');
    }

    const [varName, valueExpr] = parts;
    const value = this.evaluateExpression(valueExpr);
    this.globalScope.set(varName, value);
    return value;
  }

  private evaluateComparison(expr: string): boolean {
    // Handle == operator
    if (expr.includes('==')) {
      const [left, right] = expr.split('==').map(p => this.evaluateExpression(p.trim()));
      return left === right;
    }

    // Handle ~= (not equal) operator
    if (expr.includes('~=')) {
      const [left, right] = expr.split('~=').map(p => this.evaluateExpression(p.trim()));
      return left !== right;
    }

    // Handle <= operator
    if (expr.includes('<=')) {
      const [left, right] = expr.split('<=').map(p => this.evaluateExpression(p.trim()));
      return Number(left) <= Number(right);
    }

    // Handle >= operator
    if (expr.includes('>=')) {
      const [left, right] = expr.split('>=').map(p => this.evaluateExpression(p.trim()));
      return Number(left) >= Number(right);
    }

    // Handle < operator
    if (expr.includes('<')) {
      const [left, right] = expr.split('<').map(p => this.evaluateExpression(p.trim()));
      return Number(left) < Number(right);
    }

    // Handle > operator
    if (expr.includes('>')) {
      const [left, right] = expr.split('>').map(p => this.evaluateExpression(p.trim()));
      return Number(left) > Number(right);
    }

    throw new Error('Unknown comparison operator');
  }

  private evaluateLogical(expr: string): boolean {
    // Handle 'not' operator
    if (expr.startsWith('not ')) {
      const operand = expr.substring(4).trim();
      return !this.evaluateExpression(operand);
    }

    // Handle 'and' operator
    if (expr.includes(' and ')) {
      const parts = expr.split(' and ');
      return parts.every(p => Boolean(this.evaluateExpression(p.trim())));
    }

    // Handle 'or' operator
    if (expr.includes(' or ')) {
      const parts = expr.split(' or ');
      return parts.some(p => Boolean(this.evaluateExpression(p.trim())));
    }

    return Boolean(this.evaluateExpression(expr));
  }

  private evaluateArithmetic(expr: string): number {
    // Safe arithmetic evaluation without Function constructor
    // Tokenize and evaluate expression safely
    const tokens = this.tokenizeArithmetic(expr);
    return this.evaluateArithmeticTokens(tokens);
  }

  private tokenizeArithmetic(expr: string): Array<string | number> {
    const tokens: Array<string | number> = [];
    let current = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];

      if (char === ' ') {
        if (current) {
          tokens.push(this.resolveArithmeticToken(current));
          current = '';
        }
        continue;
      }

      if (['+', '-', '*', '/', '%', '(', ')'].includes(char)) {
        if (current) {
          tokens.push(this.resolveArithmeticToken(current));
          current = '';
        }
        tokens.push(char);
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(this.resolveArithmeticToken(current));
    }

    return tokens;
  }

  private resolveArithmeticToken(token: string): string | number {
    // Handle numbers
    if (/^-?\d+\.?\d*$/.test(token)) {
      return parseFloat(token);
    }

    // Handle variable lookup
    if (this.globalScope.has(token)) {
      const val = this.globalScope.get(token);
      return typeof val === 'number' ? val : 0;
    }

    return token;
  }

  private evaluateArithmeticTokens(tokens: Array<string | number>): number {
    // Simple left-to-right evaluation with operator precedence
    // First pass: handle * / %
    let result: Array<string | number> = [];
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token === '*' || token === '/' || token === '%') {
        const left = result.pop() as number;
        const right = tokens[++i] as number;
        if (token === '*') result.push(left * right);
        else if (token === '/') result.push(right !== 0 ? left / right : 0);
        else result.push(left % right);
      } else {
        result.push(token);
      }
      i++;
    }

    // Second pass: handle + -
    let value = typeof result[0] === 'number' ? result[0] : 0;
    i = 1;

    while (i < result.length) {
      const op = result[i] as string;
      const right = result[++i] as number;

      if (op === '+') value += right;
      else if (op === '-') value -= right;
      i++;
    }

    return value;
  }

  private evaluateStringConcat(expr: string): string {
    const parts = expr.split('..').map(p => {
      const val = this.evaluateExpression(p.trim());
      return String(val);
    });
    return parts.join('');
  }

  private evaluateLiteral(expr: string): any {
    // Handle nil
    if (expr === 'nil') {
      return null;
    }

    // Handle true/false
    if (expr === 'true') {
      return true;
    }
    if (expr === 'false') {
      return false;
    }

    // Handle numbers
    if (/^-?\d+\.?\d*$/.test(expr)) {
      return parseFloat(expr);
    }

    // Handle strings
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Handle table/property access (e.g., math.random)
    if (expr.includes('.')) {
      const parts = expr.split('.');
      let current: any = this.globalScope.get(parts[0]);

      for (let i = 1; i < parts.length; i++) {
        if (current && typeof current === 'object') {
          current = current[parts[i]];
        } else {
          return undefined;
        }
      }

      return current;
    }

    // Handle function calls
    if (expr.includes('(') && expr.includes(')')) {
      return this.evaluateFunctionCall(expr);
    }

    // Handle variable lookup
    if (this.globalScope.has(expr)) {
      return this.globalScope.get(expr);
    }

    // Unknown identifier
    return undefined;
  }

  private evaluateFunctionCall(expr: string): any {
    const openParen = expr.indexOf('(');
    const closeParen = expr.lastIndexOf(')');

    if (openParen === -1 || closeParen === -1) {
      throw new Error('Invalid function call syntax');
    }

    const funcName = expr.substring(0, openParen).trim();
    const argsStr = expr.substring(openParen + 1, closeParen).trim();

    // Get the function
    let func: any;
    if (funcName.includes('.')) {
      // Handle method calls like math.random()
      func = this.evaluateLiteral(funcName);
    } else {
      func = this.globalScope.get(funcName);
    }

    if (typeof func !== 'function') {
      throw new Error(`${funcName} is not a function`);
    }

    // Parse arguments
    const args = argsStr ? argsStr.split(',').map(arg => this.evaluateExpression(arg.trim())) : [];

    // Call the function
    return func(...args);
  }

  /**
   * Get a variable value
   */
  getVariable(name: string): any {
    return this.globalScope.get(name);
  }

  /**
   * Set a variable value
   */
  setVariable(name: string, value: any): void {
    this.globalScope.set(name, value);
  }

  /**
   * Check if runtime is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
