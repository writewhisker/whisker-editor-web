/**
 * Parameterized Passages
 *
 * Support for passages that accept parameters for reusable content.
 */

/**
 * Parameter definition for a passage
 */
export interface PassageParameter {
  /** Parameter name */
  name: string;
  /** Default value if not provided */
  defaultValue?: unknown;
  /** Parameter type for validation (optional) */
  type?: 'string' | 'number' | 'boolean' | 'any';
  /** Whether this parameter is required */
  required: boolean;
}

/**
 * Parsed passage definition with parameters
 */
export interface ParameterizedPassage {
  /** Passage name */
  name: string;
  /** Parameter definitions */
  params: PassageParameter[];
  /** Whether this passage has any parameters */
  hasParams: boolean;
}

/**
 * Result of binding arguments to parameters
 */
export interface ParameterBindingResult {
  /** Whether binding was successful */
  success: boolean;
  /** Bound values mapped by parameter name */
  bindings: Map<string, unknown>;
  /** Any errors during binding */
  errors: ParameterBindingError[];
}

/**
 * Error during parameter binding
 */
export interface ParameterBindingError {
  /** Error type */
  type: 'missing_required' | 'type_mismatch' | 'too_many_args';
  /** Parameter name (if applicable) */
  paramName?: string;
  /** Error message */
  message: string;
}

/**
 * Options for the parameter manager
 */
export interface ParameterManagerOptions {
  /** Whether to validate parameter types */
  validateTypes?: boolean;
  /** Whether to allow extra arguments beyond defined parameters */
  allowExtraArgs?: boolean;
}

/**
 * Manager for parameterized passages
 *
 * @example
 * ```typescript
 * const manager = new ParameterizedPassageManager();
 *
 * // Register a parameterized passage
 * manager.registerPassage('Describe', [
 *   { name: 'item', required: true },
 *   { name: 'quality', defaultValue: 'normal', required: false },
 * ]);
 *
 * // Bind arguments when calling
 * const result = manager.bindArguments('Describe', ['sword', 'excellent']);
 * // result.bindings = { item: 'sword', quality: 'excellent' }
 *
 * // With default value
 * const result2 = manager.bindArguments('Describe', ['shield']);
 * // result2.bindings = { item: 'shield', quality: 'normal' }
 * ```
 */
export class ParameterizedPassageManager {
  private passages: Map<string, ParameterizedPassage> = new Map();
  private options: Required<ParameterManagerOptions>;

  constructor(options: ParameterManagerOptions = {}) {
    this.options = {
      validateTypes: options.validateTypes ?? false,
      allowExtraArgs: options.allowExtraArgs ?? false,
    };
  }

  /**
   * Register a passage with parameters
   */
  registerPassage(name: string, params: PassageParameter[]): void {
    this.passages.set(name, {
      name,
      params,
      hasParams: params.length > 0,
    });
  }

  /**
   * Unregister a passage
   */
  unregisterPassage(name: string): boolean {
    return this.passages.delete(name);
  }

  /**
   * Check if a passage is registered
   */
  hasPassage(name: string): boolean {
    return this.passages.has(name);
  }

  /**
   * Get passage definition
   */
  getPassage(name: string): ParameterizedPassage | undefined {
    return this.passages.get(name);
  }

  /**
   * Check if a passage has parameters
   */
  isParameterized(name: string): boolean {
    const passage = this.passages.get(name);
    return passage?.hasParams ?? false;
  }

  /**
   * Get all registered passage names
   */
  getPassageNames(): string[] {
    return Array.from(this.passages.keys());
  }

  /**
   * Bind arguments to parameters
   */
  bindArguments(
    passageName: string,
    args: unknown[]
  ): ParameterBindingResult {
    const passage = this.passages.get(passageName);
    const bindings = new Map<string, unknown>();
    const errors: ParameterBindingError[] = [];

    // If passage not registered, just return empty bindings (success)
    if (!passage) {
      return { success: true, bindings, errors };
    }

    const params = passage.params;

    // Check for too many arguments
    if (!this.options.allowExtraArgs && args.length > params.length) {
      errors.push({
        type: 'too_many_args',
        message: `Passage '${passageName}' expects at most ${params.length} argument(s), got ${args.length}`,
      });
    }

    // Bind each parameter
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const arg = args[i];

      if (arg === undefined) {
        // Use default value or report error if required
        if (param.defaultValue !== undefined) {
          bindings.set(param.name, param.defaultValue);
        } else if (param.required) {
          errors.push({
            type: 'missing_required',
            paramName: param.name,
            message: `Missing required parameter '${param.name}' for passage '${passageName}'`,
          });
        } else {
          bindings.set(param.name, undefined);
        }
      } else {
        // Validate type if enabled
        if (this.options.validateTypes && param.type && param.type !== 'any') {
          const actualType = typeof arg;
          if (actualType !== param.type) {
            errors.push({
              type: 'type_mismatch',
              paramName: param.name,
              message: `Parameter '${param.name}' expected ${param.type}, got ${actualType}`,
            });
          }
        }
        bindings.set(param.name, arg);
      }
    }

    return {
      success: errors.length === 0,
      bindings,
      errors,
    };
  }

  /**
   * Create a scoped variable context from bindings
   * Returns an object that can be merged with existing variables
   */
  createVariableScope(bindings: Map<string, unknown>): Record<string, unknown> {
    const scope: Record<string, unknown> = {};
    for (const [name, value] of bindings) {
      scope[name] = value;
    }
    return scope;
  }

  /**
   * Clear all registered passages
   */
  clear(): void {
    this.passages.clear();
  }
}

/**
 * Parse a passage declaration header to extract parameters
 * Format: "PassageName(param1, param2 = default, param3)"
 */
export function parsePassageHeader(
  header: string
): { name: string; params: PassageParameter[] } {
  // Match: PassageName(params) or just PassageName
  const match = header.match(/^\s*(\w+)\s*(?:\(\s*(.*?)\s*\))?\s*$/);

  if (!match) {
    throw new Error(`Invalid passage header: ${header}`);
  }

  const [, name, paramsStr] = match;
  const params: PassageParameter[] = [];

  if (paramsStr && paramsStr.trim()) {
    const paramParts = splitParams(paramsStr);

    for (const part of paramParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Match: name = default or just name
      const paramMatch = trimmed.match(/^(\w+)(?:\s*=\s*(.+))?$/);
      if (!paramMatch) {
        throw new Error(`Invalid parameter: ${trimmed}`);
      }

      const [, paramName, defaultStr] = paramMatch;

      const param: PassageParameter = {
        name: paramName,
        required: defaultStr === undefined,
      };

      if (defaultStr !== undefined) {
        param.defaultValue = parseDefaultValue(defaultStr);
      }

      params.push(param);
    }
  }

  return { name, params };
}

/**
 * Split parameter string by commas, respecting quotes and parentheses
 */
function splitParams(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      current += char;
      if (char === stringChar && str[i - 1] !== '\\') {
        inString = false;
      }
    } else if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      current += char;
    } else if (char === '(' || char === '[' || char === '{') {
      depth++;
      current += char;
    } else if (char === ')' || char === ']' || char === '}') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

/**
 * Parse a default value string to its actual type
 */
function parseDefaultValue(str: string): unknown {
  const trimmed = str.trim();

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

  // Nil
  if (trimmed === 'nil' || trimmed === 'null') return null;

  // Number
  const num = Number(trimmed);
  if (!isNaN(num)) return num;

  // Return as string if nothing else matches
  return trimmed;
}

/**
 * Parse a passage call to extract target and arguments
 * Format: "PassageName(arg1, arg2, arg3)" or just "PassageName"
 */
export function parsePassageCall(
  call: string
): { target: string; args: unknown[] } {
  // Match: PassageName(args) or just PassageName
  const match = call.match(/^\s*(\w+)\s*(?:\(\s*(.*?)\s*\))?\s*$/);

  if (!match) {
    throw new Error(`Invalid passage call: ${call}`);
  }

  const [, target, argsStr] = match;
  const args: unknown[] = [];

  if (argsStr && argsStr.trim()) {
    const argParts = splitParams(argsStr);

    for (const part of argParts) {
      args.push(parseDefaultValue(part));
    }
  }

  return { target, args };
}

/**
 * Format a passage call for display
 */
export function formatPassageCall(
  name: string,
  args: unknown[]
): string {
  if (args.length === 0) {
    return name;
  }

  const formattedArgs = args
    .map((arg) => {
      if (typeof arg === 'string') {
        return `"${arg}"`;
      }
      return String(arg);
    })
    .join(', ');

  return `${name}(${formattedArgs})`;
}

/**
 * Create a new parameterized passage manager
 */
export function createParameterizedPassageManager(
  options?: ParameterManagerOptions
): ParameterizedPassageManager {
  return new ParameterizedPassageManager(options);
}
