/**
 * Macro System Types
 *
 * Defines the type system for Whisker's macro template engine.
 * Supports loops, function calls, and custom macro registration.
 */

/**
 * Macro execution context with variables and functions
 */
export interface MacroContext {
  /** Story variables available to macros */
  variables: Map<string, any>;

  /** Registered functions callable from macros */
  functions: Map<string, MacroFunction>;

  /** Custom macros registered by plugins */
  customMacros: Map<string, CustomMacro>;

  /** Parent context for nested scopes */
  parent?: MacroContext;
}

/**
 * Function callable from {{call}} macro
 */
export interface MacroFunction {
  /** Function name */
  name: string;

  /** Function implementation */
  execute: (...args: any[]) => any;

  /** Function description */
  description?: string;

  /** Parameter definitions */
  parameters?: MacroParameter[];

  /** Return type hint */
  returnType?: string;
}

/**
 * Parameter definition for macro functions
 */
export interface MacroParameter {
  /** Parameter name */
  name: string;

  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'any';

  /** Is parameter optional? */
  optional?: boolean;

  /** Default value if not provided */
  defaultValue?: any;

  /** Parameter description */
  description?: string;
}

/**
 * Custom macro definition
 */
export interface CustomMacro {
  /** Macro name (e.g., "for", "each", "if") */
  name: string;

  /** Macro type */
  type: 'block' | 'inline';

  /** Process the macro */
  process: (args: MacroArgs, context: MacroContext) => string | Promise<string>;

  /** Macro description */
  description?: string;

  /** Expected arguments */
  expectedArgs?: string[];

  /** Does this macro support an {{end}} block? */
  hasEndBlock?: boolean;
}

/**
 * Arguments passed to macro processor
 */
export interface MacroArgs {
  /** Macro name */
  name: string;

  /** Raw argument string */
  rawArgs: string;

  /** Parsed arguments */
  args: any[];

  /** Content between macro tags (for block macros) */
  content?: string;

  /** Named parameters (key=value syntax) */
  namedParams?: Record<string, any>;
}

/**
 * Result of macro processing
 */
export interface MacroResult {
  /** Success status */
  success: boolean;

  /** Rendered output */
  output?: string;

  /** Error message if failed */
  error?: string;

  /** Warnings during processing */
  warnings?: string[];
}

/**
 * Macro token from lexer
 */
export interface MacroToken {
  /** Token type */
  type: 'macro' | 'text' | 'end';

  /** Macro name (for macro tokens) */
  name?: string;

  /** Arguments (for macro tokens) */
  args?: string;

  /** Text content (for text tokens) */
  text?: string;

  /** Start position in source */
  start: number;

  /** End position in source */
  end: number;

  /** Line number */
  line: number;
}

/**
 * Range specification for loops
 * e.g., range(1, 10) or range(1, 10, 2)
 */
export interface RangeSpec {
  /** Start value (inclusive) */
  start: number;

  /** End value (inclusive) */
  end: number;

  /** Step size (default: 1) */
  step?: number;
}

/**
 * Options for macro processing
 */
export interface MacroProcessorOptions {
  /** Enable strict mode (throw on errors vs. display error text) */
  strict?: boolean;

  /** Maximum loop iterations (protection against infinite loops) */
  maxIterations?: number;

  /** Maximum nesting depth */
  maxDepth?: number;

  /** Custom macro delimiter start (default: "{{") */
  delimiterStart?: string;

  /** Custom macro delimiter end (default: "}}") */
  delimiterEnd?: string;

  /** Allow unsafe operations */
  allowUnsafe?: boolean;
}

/**
 * Macro registry for managing custom macros
 */
export interface IMacroRegistry {
  /** Register a custom macro */
  register(macro: CustomMacro): void;

  /** Unregister a macro by name */
  unregister(name: string): boolean;

  /** Get a macro by name */
  get(name: string): CustomMacro | undefined;

  /** Check if macro is registered */
  has(name: string): boolean;

  /** Get all registered macro names */
  list(): string[];

  /** Clear all registered macros */
  clear(): void;
}

/**
 * Macro processor interface
 */
export interface IMacroProcessor {
  /** Process template string with macros */
  process(template: string, context: MacroContext, options?: MacroProcessorOptions): Promise<MacroResult>;

  /** Get the macro registry */
  getRegistry(): IMacroRegistry;
}
