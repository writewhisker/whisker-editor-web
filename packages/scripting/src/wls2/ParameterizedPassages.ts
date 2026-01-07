/**
 * Parameterized Passages
 *
 * Enables reusable passages with parameters. Supports parsing passage headers
 * with parameter definitions and calls with arguments.
 *
 * Reference: whisker-core/lib/whisker/wls2/parameterized_passages.lua
 */

import type {
  PassageParameter,
  PassageHeader,
  PassageArgument,
  VariableRef,
  ExpressionRef,
  PassageCall,
  PassageArgBinding,
} from './types';

// =============================================================================
// Type Guards
// =============================================================================

export function isVariableRef(arg: PassageArgument): arg is VariableRef {
  return typeof arg === 'object' && arg !== null && arg._type === 'variable_ref';
}

export function isExpressionRef(arg: PassageArgument): arg is ExpressionRef {
  return typeof arg === 'object' && arg !== null && arg._type === 'expression';
}

// =============================================================================
// Parsing Functions
// =============================================================================

/**
 * Parse a passage header with parameters
 * Format: "PassageName(param1, param2 = "default")"
 */
export function parsePassageHeader(header: string): PassageHeader {
  const trimmed = header.trim();

  // Check for parameterized format
  const match = trimmed.match(/^(\w+)\s*\(([^)]*)\)$/);

  if (!match) {
    // Simple passage name, no parameters
    return {
      name: trimmed,
      params: [],
    };
  }

  const name = match[1];
  const paramsStr = match[2].trim();
  const params: PassageParameter[] = [];

  if (paramsStr) {
    const paramParts = splitParams(paramsStr);

    for (const part of paramParts) {
      const param = parseParameter(part.trim());
      params.push(param);
    }
  }

  return { name, params };
}

/**
 * Split parameter string respecting quotes
 */
function splitParams(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar && str[i - 1] !== '\\') {
      inString = false;
      current += char;
    } else if (!inString && char === '(') {
      depth++;
      current += char;
    } else if (!inString && char === ')') {
      depth--;
      current += char;
    } else if (!inString && depth === 0 && char === ',') {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Parse a single parameter definition
 * Format: "param" or "param = default"
 */
function parseParameter(paramStr: string): PassageParameter {
  // Check for default value
  const eqIndex = findAssignmentIndex(paramStr);

  if (eqIndex >= 0) {
    const name = paramStr.substring(0, eqIndex).trim();
    const defaultStr = paramStr.substring(eqIndex + 1).trim();
    const defaultValue = parseValue(defaultStr);

    return { name, default: defaultValue };
  }

  return { name: paramStr.trim() };
}

/**
 * Find the index of assignment operator (not inside quotes)
 */
function findAssignmentIndex(str: string): number {
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && str[i - 1] !== '\\') {
      inString = false;
    } else if (!inString && char === '=') {
      return i;
    }
  }

  return -1;
}

/**
 * Parse a value (string, number, boolean, or variable reference)
 */
function parseValue(valueStr: string): PassageArgument {
  const trimmed = valueStr.trim();

  // String literal
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Number
  const num = parseFloat(trimmed);
  if (!isNaN(num) && String(num) === trimmed) {
    return num;
  }

  // Variable reference (starts with $)
  if (trimmed.startsWith('$')) {
    return {
      _type: 'variable_ref',
      name: trimmed.substring(1),
    };
  }

  // Expression (wrapped in {})
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return {
      _type: 'expression',
      expr: trimmed.slice(1, -1),
    };
  }

  // Default to string
  return trimmed;
}

/**
 * Parse a passage call with arguments
 * Format: "PassageName(arg1, "arg2", $variable)"
 */
export function parsePassageCall(callStr: string): PassageCall {
  const trimmed = callStr.trim();

  // Check for parameterized format
  const match = trimmed.match(/^(\w+)\s*\(([^)]*)\)$/);

  if (!match) {
    // Simple passage name, no arguments
    return {
      target: trimmed,
      args: [],
    };
  }

  const target = match[1];
  const argsStr = match[2].trim();
  const args: PassageArgument[] = [];

  if (argsStr) {
    const argParts = splitParams(argsStr);

    for (const part of argParts) {
      const arg = parseValue(part.trim());
      args.push(arg);
    }
  }

  return { target, args };
}

// =============================================================================
// Parameterized Passages Manager
// =============================================================================

export class ParameterizedPassages {
  private registeredPassages: Map<string, PassageHeader> = new Map();

  /**
   * Register a parameterized passage
   */
  registerPassage(header: string | PassageHeader): void {
    const parsed = typeof header === 'string' ? parsePassageHeader(header) : header;
    this.registeredPassages.set(parsed.name, parsed);
  }

  /**
   * Register multiple passages
   */
  registerMany(headers: (string | PassageHeader)[]): void {
    for (const header of headers) {
      this.registerPassage(header);
    }
  }

  /**
   * Check if a passage is registered
   */
  isRegistered(name: string): boolean {
    return this.registeredPassages.has(name);
  }

  /**
   * Get passage header
   */
  getPassage(name: string): PassageHeader | undefined {
    return this.registeredPassages.get(name);
  }

  /**
   * Get all registered passage names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.registeredPassages.keys());
  }

  /**
   * Bind arguments to a passage's parameters
   */
  bindArguments(
    passageName: string,
    args: PassageArgument[]
  ): PassageArgBinding | null {
    const header = this.registeredPassages.get(passageName);

    if (!header) {
      console.warn(
        `ParameterizedPassages: Passage '${passageName}' not registered`
      );
      return null;
    }

    const bindings = new Map<string, unknown>();

    for (let i = 0; i < header.params.length; i++) {
      const param = header.params[i];

      if (i < args.length) {
        // Use provided argument
        bindings.set(param.name, args[i]);
      } else if (param.default !== undefined) {
        // Use default value
        bindings.set(param.name, param.default);
      } else {
        // Missing required argument
        console.warn(
          `ParameterizedPassages: Missing required argument '${param.name}' for '${passageName}'`
        );
        return null;
      }
    }

    return {
      passageName,
      bindings,
    };
  }

  /**
   * Resolve variable references in arguments
   */
  resolveArguments(
    args: PassageArgument[],
    variables: Map<string, unknown>,
    evaluator?: (expr: string) => unknown
  ): unknown[] {
    return args.map((arg) => {
      if (isVariableRef(arg)) {
        return variables.get(arg.name);
      }

      if (isExpressionRef(arg)) {
        if (evaluator) {
          try {
            return evaluator(arg.expr);
          } catch (error) {
            console.error(`Expression evaluation error: ${error}`);
            return undefined;
          }
        }
        return undefined;
      }

      return arg;
    });
  }

  /**
   * Create a variable scope from bindings
   */
  createVariableScope(
    bindings: PassageArgBinding,
    variables: Map<string, unknown>,
    evaluator?: (expr: string) => unknown
  ): Map<string, unknown> {
    const scope = new Map<string, unknown>();

    for (const [name, value] of bindings.bindings) {
      if (isVariableRef(value)) {
        scope.set(name, variables.get(value.name));
      } else if (isExpressionRef(value)) {
        if (evaluator) {
          try {
            scope.set(name, evaluator(value.expr));
          } catch (error) {
            console.error(`Expression evaluation error: ${error}`);
            scope.set(name, undefined);
          }
        } else {
          scope.set(name, undefined);
        }
      } else {
        scope.set(name, value);
      }
    }

    return scope;
  }

  /**
   * Validate a passage call against its header
   */
  validateCall(
    passageName: string,
    args: PassageArgument[]
  ): { valid: boolean; error?: string } {
    const header = this.registeredPassages.get(passageName);

    if (!header) {
      return { valid: true }; // Non-parameterized passage
    }

    const requiredCount = header.params.filter(
      (p) => p.default === undefined
    ).length;
    const totalCount = header.params.length;

    if (args.length < requiredCount) {
      return {
        valid: false,
        error: `Passage '${passageName}' requires at least ${requiredCount} argument(s), got ${args.length}`,
      };
    }

    if (args.length > totalCount) {
      return {
        valid: false,
        error: `Passage '${passageName}' accepts at most ${totalCount} argument(s), got ${args.length}`,
      };
    }

    return { valid: true };
  }

  /**
   * Unregister a passage
   */
  unregister(name: string): boolean {
    return this.registeredPassages.delete(name);
  }

  /**
   * Clear all registered passages
   */
  clear(): void {
    this.registeredPassages.clear();
  }

  /**
   * Reset the manager
   */
  reset(): void {
    this.clear();
  }
}

/**
 * Factory function to create a ParameterizedPassages manager
 */
export function createParameterizedPassages(): ParameterizedPassages {
  return new ParameterizedPassages();
}
