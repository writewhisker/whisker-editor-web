/**
 * UserFunctionRegistry - User-Defined Function Management
 *
 * Manages functions declared via FUNCTION...END blocks in WLS stories.
 * Supports parameter binding, local scoping, and recursion limits.
 *
 * Reference: WLS Chapter 12 - Module System
 */

import { ModuleError, MODULE_ERROR_CODES } from './ModuleResolver';

export interface FunctionParameter {
  name: string;
  defaultValue?: unknown;
}

export interface UserFunction {
  name: string;
  parameters: FunctionParameter[];
  body: string;
  namespace?: string;
  exported?: boolean;
  sourceFile?: string;
}

export interface UserFunctionRegistryOptions {
  /**
   * Maximum recursion depth for function calls
   */
  maxRecursionDepth?: number;

  /**
   * Whether to allow function redefinition
   */
  allowRedefinition?: boolean;
}

export interface FunctionCallContext {
  /** Current recursion depth */
  depth: number;
  /** Local variables for this call */
  locals: Map<string, unknown>;
  /** Call stack for debugging */
  callStack: string[];
}

export interface UserFunctionRegistryState {
  functions: Record<string, UserFunction>;
}

const DEFAULT_OPTIONS: Required<UserFunctionRegistryOptions> = {
  maxRecursionDepth: 100,
  allowRedefinition: false,
};

/**
 * UserFunctionRegistry - Manages user-defined WLS functions
 */
export class UserFunctionRegistry {
  private functions: Map<string, UserFunction> = new Map();
  private options: Required<UserFunctionRegistryOptions>;
  private currentContext: FunctionCallContext | null = null;

  constructor(options: UserFunctionRegistryOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ==========================================================================
  // Function Registration
  // ==========================================================================

  /**
   * Register a user-defined function
   * @throws ModuleError if function already exists (unless allowRedefinition)
   */
  register(fn: UserFunction): void {
    const qualifiedName = this.getQualifiedName(fn.name, fn.namespace);

    if (this.functions.has(qualifiedName) && !this.options.allowRedefinition) {
      throw new ModuleError(
        'MOD_004',
        `Function already defined: ${qualifiedName}`
      );
    }

    this.functions.set(qualifiedName, fn);
  }

  /**
   * Register multiple functions at once
   */
  registerAll(functions: UserFunction[]): void {
    for (const fn of functions) {
      this.register(fn);
    }
  }

  /**
   * Check if a function is registered
   */
  has(name: string, namespace?: string): boolean {
    const qualifiedName = this.getQualifiedName(name, namespace);
    return this.functions.has(qualifiedName);
  }

  /**
   * Get a registered function
   */
  get(name: string, namespace?: string): UserFunction | undefined {
    const qualifiedName = this.getQualifiedName(name, namespace);
    return this.functions.get(qualifiedName);
  }

  /**
   * Remove a function registration
   */
  unregister(name: string, namespace?: string): boolean {
    const qualifiedName = this.getQualifiedName(name, namespace);
    return this.functions.delete(qualifiedName);
  }

  /**
   * Get all registered function names
   */
  getNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Get all registered functions
   */
  getAll(): UserFunction[] {
    return Array.from(this.functions.values());
  }

  /**
   * Clear all registered functions
   */
  clear(): void {
    this.functions.clear();
  }

  // ==========================================================================
  // Function Invocation
  // ==========================================================================

  /**
   * Prepare a function call context
   * @throws ModuleError if function not found or recursion limit exceeded
   */
  prepareCall(
    name: string,
    args: unknown[],
    namespace?: string
  ): { fn: UserFunction; context: FunctionCallContext } {
    const fn = this.get(name, namespace);

    if (!fn) {
      throw new ModuleError('MOD_003', `Undefined function: ${name}`);
    }

    // Check recursion depth
    const currentDepth = this.currentContext?.depth ?? 0;
    if (currentDepth >= this.options.maxRecursionDepth) {
      throw new ModuleError(
        'MOD_005',
        `Stack overflow: recursion depth exceeded (max: ${this.options.maxRecursionDepth})`
      );
    }

    // Create local variable bindings
    const locals = new Map<string, unknown>();
    for (let i = 0; i < fn.parameters.length; i++) {
      const param = fn.parameters[i];
      const value = args[i] ?? param.defaultValue;
      locals.set(param.name, value);
    }

    // Build call stack
    const callStack = this.currentContext?.callStack ?? [];
    callStack.push(fn.name);

    const context: FunctionCallContext = {
      depth: currentDepth + 1,
      locals,
      callStack: [...callStack],
    };

    return { fn, context };
  }

  /**
   * Enter a function call context
   */
  enterCall(context: FunctionCallContext): void {
    this.currentContext = context;
  }

  /**
   * Exit the current function call context
   */
  exitCall(): void {
    if (this.currentContext) {
      this.currentContext.callStack.pop();
      if (this.currentContext.depth > 1) {
        this.currentContext.depth--;
      } else {
        this.currentContext = null;
      }
    }
  }

  /**
   * Get current call context
   */
  getCurrentContext(): FunctionCallContext | null {
    return this.currentContext;
  }

  /**
   * Get a local variable from current context
   */
  getLocal(name: string): unknown {
    return this.currentContext?.locals.get(name);
  }

  /**
   * Set a local variable in current context
   */
  setLocal(name: string, value: unknown): void {
    if (this.currentContext) {
      this.currentContext.locals.set(name, value);
    }
  }

  /**
   * Check if a local variable exists in current context
   */
  hasLocal(name: string): boolean {
    return this.currentContext?.locals.has(name) ?? false;
  }

  // ==========================================================================
  // Namespace Support
  // ==========================================================================

  /**
   * Get qualified function name with namespace
   */
  private getQualifiedName(name: string, namespace?: string): string {
    if (!namespace) {
      return name;
    }
    return `${namespace}::${name}`;
  }

  /**
   * Get all functions in a namespace
   */
  getNamespaceFunctions(namespace: string): UserFunction[] {
    const prefix = `${namespace}::`;
    const results: UserFunction[] = [];

    for (const [name, fn] of this.functions) {
      if (name.startsWith(prefix)) {
        results.push(fn);
      }
    }

    return results;
  }

  /**
   * Resolve a function reference from a namespace context
   * Tries: 1) current namespace, 2) parent namespaces, 3) global
   */
  resolveFunction(
    name: string,
    currentNamespace?: string
  ): UserFunction | undefined {
    // If already qualified, look up directly
    if (name.includes('::')) {
      return this.functions.get(name);
    }

    // Try current namespace
    if (currentNamespace) {
      const qualified = `${currentNamespace}::${name}`;
      const fn = this.functions.get(qualified);
      if (fn) return fn;

      // Try parent namespaces
      const parts = currentNamespace.split('::');
      for (let i = parts.length - 1; i >= 0; i--) {
        const partial = [...parts.slice(0, i), name].join('::');
        const parentFn = this.functions.get(partial);
        if (parentFn) return parentFn;
      }
    }

    // Try global
    return this.functions.get(name);
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Get state for serialization
   */
  getState(): UserFunctionRegistryState {
    const functions: Record<string, UserFunction> = {};
    for (const [name, fn] of this.functions) {
      functions[name] = fn;
    }
    return { functions };
  }

  /**
   * Restore state from serialization
   */
  restoreState(state: UserFunctionRegistryState): void {
    this.functions.clear();
    for (const [name, fn] of Object.entries(state.functions)) {
      this.functions.set(name, fn);
    }
  }

  /**
   * Clone this registry
   */
  clone(): UserFunctionRegistry {
    const cloned = new UserFunctionRegistry(this.options);
    for (const [name, fn] of this.functions) {
      cloned.functions.set(name, { ...fn });
    }
    return cloned;
  }
}

/**
 * Factory function to create a UserFunctionRegistry
 */
export function createUserFunctionRegistry(
  options?: UserFunctionRegistryOptions
): UserFunctionRegistry {
  return new UserFunctionRegistry(options);
}
