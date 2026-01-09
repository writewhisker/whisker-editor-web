/**
 * External Function Binding
 *
 * Allows stories to call functions provided by the host application.
 * Functions can be registered by the host and declared in stories
 * for type checking.
 */

/**
 * Type for external function implementations
 */
export type ExternalFunction = (...args: unknown[]) => unknown | Promise<unknown>;

/**
 * Type definition for a function parameter
 */
export interface FunctionParameter {
  /** Parameter name */
  name: string;
  /** Parameter type (string, number, boolean, any) */
  type: 'string' | 'number' | 'boolean' | 'any';
  /** Whether the parameter is optional */
  optional?: boolean;
}

/**
 * Declaration of an external function's signature
 */
export interface FunctionDeclaration {
  /** Function name */
  name: string;
  /** Function parameters */
  params: FunctionParameter[];
  /** Return type (undefined means void) */
  returnType?: 'string' | 'number' | 'boolean' | 'any' | 'void';
}

/**
 * Result of a function call
 */
export interface CallResult {
  /** Whether the call succeeded */
  success: boolean;
  /** Return value if successful */
  value?: unknown;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for the ExternalFunctionRegistry
 */
export interface RegistryOptions {
  /** Whether to allow calling undeclared functions */
  allowUndeclared?: boolean;
  /** Whether to validate argument types */
  validateTypes?: boolean;
  /** Custom error handler */
  onError?: (name: string, error: Error) => void;
}

/**
 * Registry for external functions that can be called from stories.
 *
 * Host applications register functions, and stories can declare
 * expected signatures for type checking.
 *
 * @example
 * ```typescript
 * const registry = new ExternalFunctionRegistry();
 *
 * // Host registers functions
 * registry.register('playSound', (id: string) => {
 *   audioManager.play(id);
 * });
 *
 * registry.register('getUserName', () => currentUser.name);
 *
 * // Story calls functions
 * await registry.call('playSound', ['fanfare']);
 * const name = await registry.call('getUserName', []);
 * ```
 */
export class ExternalFunctionRegistry {
  private functions: Map<string, ExternalFunction> = new Map();
  private declarations: Map<string, FunctionDeclaration> = new Map();
  private options: Required<RegistryOptions>;

  constructor(options: RegistryOptions = {}) {
    this.options = {
      allowUndeclared: options.allowUndeclared ?? true,
      validateTypes: options.validateTypes ?? true,
      onError: options.onError ?? (() => {}),
    };
  }

  /**
   * Register an external function implementation
   * @param name Function name
   * @param fn Function implementation
   */
  register(name: string, fn: ExternalFunction): void {
    if (typeof fn !== 'function') {
      throw new Error(`External function '${name}' must be a function`);
    }
    this.functions.set(name, fn);
  }

  /**
   * Unregister an external function
   * @param name Function name
   * @returns Whether the function was found and removed
   */
  unregister(name: string): boolean {
    return this.functions.delete(name);
  }

  /**
   * Declare a function's signature for type checking
   * @param decl Function declaration
   */
  declare(decl: FunctionDeclaration): void {
    if (!decl.name || typeof decl.name !== 'string') {
      throw new Error('Function declaration must have a name');
    }
    this.declarations.set(decl.name, decl);
  }

  /**
   * Remove a function declaration
   * @param name Function name
   * @returns Whether the declaration was found and removed
   */
  undeclare(name: string): boolean {
    return this.declarations.delete(name);
  }

  /**
   * Check if a function is registered
   * @param name Function name
   */
  isRegistered(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Check if a function is declared
   * @param name Function name
   */
  isDeclared(name: string): boolean {
    return this.declarations.has(name);
  }

  /**
   * Get a function declaration
   * @param name Function name
   */
  getDeclaration(name: string): FunctionDeclaration | undefined {
    return this.declarations.get(name);
  }

  /**
   * Get all registered function names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Get all declared function names
   */
  getDeclaredNames(): string[] {
    return Array.from(this.declarations.keys());
  }

  /**
   * Call an external function
   * @param name Function name
   * @param args Arguments to pass
   * @returns The function's return value
   * @throws If function is not registered or type validation fails
   */
  async call(name: string, args: unknown[] = []): Promise<unknown> {
    const fn = this.functions.get(name);

    if (!fn) {
      const error = new Error(`External function not registered: ${name}`);
      this.options.onError(name, error);
      throw error;
    }

    // Validate arguments if declaration exists and validation enabled
    const decl = this.declarations.get(name);
    if (decl && this.options.validateTypes) {
      this.validateArgs(name, decl, args);
    }

    try {
      const result = fn(...args);
      return result instanceof Promise ? await result : result;
    } catch (error) {
      const wrappedError =
        error instanceof Error ? error : new Error(String(error));
      this.options.onError(name, wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Call a function and return a result object instead of throwing
   * @param name Function name
   * @param args Arguments to pass
   * @returns Result object with success/value/error
   */
  async callSafe(name: string, args: unknown[] = []): Promise<CallResult> {
    try {
      const value = await this.call(name, args);
      return { success: true, value };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate arguments against a declaration
   */
  private validateArgs(
    name: string,
    decl: FunctionDeclaration,
    args: unknown[]
  ): void {
    const requiredCount = decl.params.filter((p) => !p.optional).length;

    if (args.length < requiredCount) {
      throw new Error(
        `External function '${name}' requires at least ${requiredCount} ` +
          `argument(s), got ${args.length}`
      );
    }

    if (args.length > decl.params.length) {
      throw new Error(
        `External function '${name}' accepts at most ${decl.params.length} ` +
          `argument(s), got ${args.length}`
      );
    }

    for (let i = 0; i < args.length; i++) {
      const param = decl.params[i];
      const arg = args[i];

      if (param.type !== 'any' && arg !== undefined && arg !== null) {
        const actualType = typeof arg;
        if (actualType !== param.type) {
          throw new Error(
            `External function '${name}' parameter '${param.name}' ` +
              `expected ${param.type}, got ${actualType}`
          );
        }
      }
    }
  }

  /**
   * Validate that all declared functions are registered
   * @returns List of declared but unregistered function names
   */
  validateDeclarations(): string[] {
    const missing: string[] = [];
    for (const name of this.declarations.keys()) {
      if (!this.functions.has(name)) {
        missing.push(name);
      }
    }
    return missing;
  }

  /**
   * Clear all registered functions and declarations
   */
  clear(): void {
    this.functions.clear();
    this.declarations.clear();
  }

  /**
   * Get statistics about the registry
   */
  getStats(): { registered: number; declared: number; validated: number } {
    const registered = this.functions.size;
    const declared = this.declarations.size;
    let validated = 0;

    for (const name of this.declarations.keys()) {
      if (this.functions.has(name)) {
        validated++;
      }
    }

    return { registered, declared, validated };
  }
}

/**
 * Parse an EXTERNAL declaration string
 * @param declaration The declaration string (e.g., "playSound(id: string)")
 * @returns Parsed function declaration
 *
 * @example
 * ```typescript
 * parseExternalDeclaration("playSound(id: string)")
 * // => { name: "playSound", params: [{ name: "id", type: "string" }] }
 *
 * parseExternalDeclaration("getUserName(): string")
 * // => { name: "getUserName", params: [], returnType: "string" }
 * ```
 */
export function parseExternalDeclaration(
  declaration: string
): FunctionDeclaration {
  // Match: name(params): returnType or name(params)
  const match = declaration.match(
    /^\s*(\w+)\s*\(\s*(.*?)\s*\)\s*(?::\s*(\w+))?\s*$/
  );

  if (!match) {
    throw new Error(`Invalid EXTERNAL declaration: ${declaration}`);
  }

  const [, name, paramsStr, returnType] = match;

  const params: FunctionParameter[] = [];

  if (paramsStr.trim()) {
    const paramParts = paramsStr.split(',');

    for (const part of paramParts) {
      const paramMatch = part.trim().match(/^(\w+)(\?)?\s*:\s*(\w+)$/);
      if (!paramMatch) {
        throw new Error(`Invalid parameter in declaration: ${part.trim()}`);
      }

      const [, paramName, optional, paramType] = paramMatch;

      if (!['string', 'number', 'boolean', 'any'].includes(paramType)) {
        throw new Error(`Invalid parameter type: ${paramType}`);
      }

      params.push({
        name: paramName,
        type: paramType as FunctionParameter['type'],
        optional: optional === '?',
      });
    }
  }

  const decl: FunctionDeclaration = { name, params };

  if (returnType) {
    if (!['string', 'number', 'boolean', 'any', 'void'].includes(returnType)) {
      throw new Error(`Invalid return type: ${returnType}`);
    }
    decl.returnType = returnType as FunctionDeclaration['returnType'];
  }

  return decl;
}

/**
 * Create a new external function registry
 */
export function createExternalFunctionRegistry(
  options?: RegistryOptions
): ExternalFunctionRegistry {
  return new ExternalFunctionRegistry(options);
}
