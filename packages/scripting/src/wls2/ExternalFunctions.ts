/**
 * External Functions
 *
 * Allows stories to call host application functions with type checking and validation.
 * Supports function registration, declaration parsing, and argument validation.
 *
 * Reference: whisker-core/lib/whisker/wls2/external_functions.lua
 */

import type {
  ExternalParameter,
  ExternalParamType,
  ExternalDeclaration,
  ExternalFunction,
  ExternalFunctionEntry,
  ExternalFunctionsOptions,
  ValidationResult,
} from './types';

/**
 * Parse a function declaration string
 * Format: "playSound(id: string, loop?: boolean): void"
 */
export function parseDeclaration(declaration: string): ExternalDeclaration {
  const trimmed = declaration.trim();

  // Match function name and parameters
  const match = trimmed.match(
    /^(\w+)\s*\(([^)]*)\)\s*(?::\s*(\w+))?$/
  );

  if (!match) {
    throw new Error(`Invalid declaration format: ${declaration}`);
  }

  const name = match[1];
  const paramsStr = match[2].trim();
  const returnType = match[3] || 'void';

  const params: ExternalParameter[] = [];

  if (paramsStr) {
    const paramParts = paramsStr.split(',');

    for (const part of paramParts) {
      const param = parseParameter(part.trim());
      params.push(param);
    }
  }

  return {
    name,
    params,
    returnType,
  };
}

/**
 * Parse a single parameter definition
 * Format: "name: type" or "name?: type" (optional)
 */
function parseParameter(paramStr: string): ExternalParameter {
  const match = paramStr.match(/^(\w+)(\?)?:\s*(\w+)$/);

  if (!match) {
    throw new Error(`Invalid parameter format: ${paramStr}`);
  }

  const name = match[1];
  const optional = match[2] === '?';
  const typeStr = match[3].toLowerCase();

  // Validate type
  const validTypes: ExternalParamType[] = ['string', 'number', 'boolean', 'any'];
  const type = validTypes.includes(typeStr as ExternalParamType)
    ? (typeStr as ExternalParamType)
    : 'any';

  return {
    name,
    type,
    optional,
  };
}

/**
 * Get JavaScript typeof for a value
 */
function getJsType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Check if a value matches an expected type
 */
function typeMatches(value: unknown, expectedType: ExternalParamType): boolean {
  if (expectedType === 'any') {
    return true;
  }

  const jsType = getJsType(value);
  return jsType === expectedType;
}

export class ExternalFunctions {
  private functions: Map<string, ExternalFunctionEntry> = new Map();
  private options: Required<ExternalFunctionsOptions>;

  constructor(options: ExternalFunctionsOptions = {}) {
    this.options = {
      strictTypeChecking: options.strictTypeChecking ?? true,
    };
  }

  /**
   * Register a function
   */
  register(name: string, fn: ExternalFunction): void {
    const existing = this.functions.get(name);

    if (existing) {
      // Update existing entry, preserving declaration if present
      existing.fn = fn;
    } else {
      this.functions.set(name, { fn });
    }
  }

  /**
   * Declare a function's signature (for type checking)
   * Can be a string or ExternalDeclaration object
   */
  declare(declaration: string | ExternalDeclaration): void {
    const decl =
      typeof declaration === 'string'
        ? parseDeclaration(declaration)
        : declaration;

    const existing = this.functions.get(decl.name);

    if (existing) {
      existing.declaration = decl;
    } else {
      this.functions.set(decl.name, {
        fn: () => {
          throw new Error(`Function ${decl.name} is declared but not registered`);
        },
        declaration: decl,
      });
    }
  }

  /**
   * Check if a function is registered
   */
  has(name: string): boolean {
    const entry = this.functions.get(name);
    return entry !== undefined && entry.fn !== undefined;
  }

  /**
   * Validate arguments against a function's declaration
   * Returns { valid: true } or { valid: false, error: string }
   */
  validateArgs(name: string, args: unknown[]): ValidationResult {
    const entry = this.functions.get(name);

    if (!entry) {
      return { valid: false, error: `Function '${name}' is not registered` };
    }

    const decl = entry.declaration;

    // If no declaration, accept any arguments
    if (!decl) {
      return { valid: true };
    }

    // Count required parameters
    const requiredCount = decl.params.filter((p) => !p.optional).length;
    const totalCount = decl.params.length;

    // Check argument count
    if (args.length < requiredCount) {
      return {
        valid: false,
        error: `Function '${name}' requires at least ${requiredCount} argument(s), got ${args.length}`,
      };
    }

    if (args.length > totalCount) {
      return {
        valid: false,
        error: `Function '${name}' accepts at most ${totalCount} argument(s), got ${args.length}`,
      };
    }

    // Check argument types
    if (this.options.strictTypeChecking) {
      for (let i = 0; i < args.length; i++) {
        const param = decl.params[i];
        const arg = args[i];

        // Skip undefined optional arguments
        if (arg === undefined && param.optional) {
          continue;
        }

        if (!typeMatches(arg, param.type)) {
          return {
            valid: false,
            error: `Argument '${param.name}' expects ${param.type}, got ${getJsType(arg)}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Call a registered function with validation
   */
  call(name: string, args: unknown[] = []): unknown {
    const entry = this.functions.get(name);

    if (!entry) {
      throw new Error(`Function '${name}' is not registered`);
    }

    // Validate arguments
    const validation = this.validateArgs(name, args);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Call the function with unpacked arguments
    return entry.fn(...args);
  }

  /**
   * Get all registered function names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.functions.keys()).filter((name) => {
      const entry = this.functions.get(name);
      return entry && entry.fn;
    });
  }

  /**
   * Get a function's declaration
   */
  getDeclaration(name: string): ExternalDeclaration | undefined {
    const entry = this.functions.get(name);
    return entry?.declaration;
  }

  /**
   * Unregister a function
   */
  unregister(name: string): boolean {
    return this.functions.delete(name);
  }

  /**
   * Clear all registered functions
   */
  clear(): void {
    this.functions.clear();
  }

  /**
   * Reset the external functions manager
   */
  reset(): void {
    this.clear();
  }

  /**
   * Get all function entries (for introspection)
   */
  getAll(): Map<string, ExternalFunctionEntry> {
    return new Map(this.functions);
  }

  /**
   * Register multiple functions at once
   */
  registerMany(functions: Record<string, ExternalFunction>): void {
    for (const [name, fn] of Object.entries(functions)) {
      this.register(name, fn);
    }
  }

  /**
   * Declare multiple functions at once
   */
  declareMany(declarations: (string | ExternalDeclaration)[]): void {
    for (const decl of declarations) {
      this.declare(decl);
    }
  }
}

/**
 * Factory function to create an ExternalFunctions manager
 */
export function createExternalFunctions(
  options?: ExternalFunctionsOptions
): ExternalFunctions {
  return new ExternalFunctions(options);
}
