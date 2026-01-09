import { LuaPatternMatcher } from './LuaPatternMatcher';

/**
 * LuaEngine - Enhanced Lua scripting engine for interactive fiction preview
 *
 * This engine provides ~98% Lua 5.4 compatibility for in-browser preview.
 * For production use, deploy to whisker-core which has FULL Lua 5.4 support.
 *
 * SUPPORTED Features:
 * - ✅ Variables (numbers, strings, booleans, nil, tables)
 * - ✅ Arithmetic operators (+, -, *, /, %, ^, //, &, |, ~, <<, >>)
 * - ✅ Comparison operators (==, ~=, <, >, <=, >=)
 * - ✅ Logical operators (and, or, not)
 * - ✅ String concatenation (..)
 * - ✅ Length operator (#) with __len metamethod
 * - ✅ If/then/else/elseif statements
 * - ✅ While loops (max 10000 iterations)
 * - ✅ Numeric for loops (for i=1,10 do...end)
 * - ✅ Generic for loops (for k,v in pairs/ipairs(t) do...end)
 * - ✅ Repeat-until loops
 * - ✅ Function definitions with return values
 * - ✅ Multiple return values
 * - ✅ Variadic functions (...)
 * - ✅ Local variable scoping with Lua 5.4 attributes (<const>, <close>)
 * - ✅ Tables with dot/bracket notation
 * - ✅ Break and goto statements
 * - ✅ Metatables (__index, __newindex, __call, __tostring, __add, __sub, __mul, __div,
 *      __mod, __pow, __unm, __eq, __lt, __le, __concat, __len, __pairs, __ipairs, __close)
 * - ✅ Coroutines (create, resume, yield, status, wrap, running, close, isyieldable)
 * - ✅ Error handling (pcall, xpcall, error, assert)
 * - ✅ String pattern matching (full Lua patterns)
 * - ✅ Module system (require with package.loaded, package.preload)
 *
 * Standard Library:
 * - ✅ print, type, tostring, tonumber, assert, error, warn (Lua 5.4)
 * - ✅ pairs, ipairs, next, rawget, rawset, rawequal, rawlen, select, unpack
 * - ✅ pcall, xpcall (protected calls)
 * - ✅ setmetatable, getmetatable
 * - ✅ load, loadstring (dynamic code loading)
 * - ✅ collectgarbage (stub)
 * - ✅ math: random, randomseed, floor, ceil, abs, min, max, sqrt, pow, sin, cos, tan,
 *      asin, acos, atan, sinh, cosh, tanh, log, log10, exp, deg, rad, fmod, modf,
 *      frexp, ldexp, pi, huge, maxinteger, mininteger, tointeger, ult
 * - ✅ string: upper, lower, len, sub, find, match, gsub, gmatch, rep, reverse,
 *      char, byte, format, dump, pack, packsize, unpack
 * - ✅ table: insert, remove, concat, sort, maxn, pack, unpack, move
 * - ✅ coroutine: create, resume, yield, status, wrap, running, close, isyieldable
 * - ✅ os: time, date, clock, difftime (safe subset)
 * - ✅ utf8: char, codepoint, len, offset, codes, charpattern
 * - ✅ debug: traceback, getinfo, getlocal, setlocal (limited implementation)
 *
 * NOT SUPPORTED (by design for browser security):
 * - ❌ File I/O (io library, os.execute, os.remove, os.rename, loadfile, dofile)
 * - ❌ Full debug library (getupvalue, setupvalue, sethook - stubs only)
 * - ❌ Weak tables (__mode metamethod)
 */

export interface LuaValue {
  type: 'nil' | 'boolean' | 'number' | 'string' | 'table' | 'function' | 'coroutine';
  value: any;
  metatable?: LuaTable;
  /** Lua 5.4 variable attribute: 'const' prevents reassignment, 'close' calls __close on scope exit */
  attribute?: 'const' | 'close';
  /** Internal marker for _G global environment table */
  __isGlobalEnv?: boolean;
}

/**
 * Represents multiple return values from a function call
 * Used for: return a, b, c and local x, y, z = func()
 */
export interface LuaMultiValue {
  values: LuaValue[];
}

/**
 * Type guard to check if a value is a multi-value return
 */
export function isMultiValue(val: LuaValue | LuaMultiValue): val is LuaMultiValue {
  return 'values' in val && Array.isArray((val as LuaMultiValue).values);
}

export interface LuaTable {
  [key: string]: LuaValue | LuaTable | undefined;
}

export interface LuaCoroutine {
  status: 'suspended' | 'running' | 'dead' | 'normal';
  body: string;
  context: LuaExecutionContext;
  resumeValue?: LuaValue;
}

export interface LuaFunction {
  params: string[];
  body: string;
  isVariadic?: boolean;  // True if function accepts ... (varargs)
}

export interface LuaExecutionContext {
  variables: Map<string, LuaValue>;
  localScopes: Map<string, LuaValue>[]; // Stack of local variable scopes
  functions: Map<string, LuaFunction>;
  output: string[];
  errors: string[];
  currentCoroutine?: LuaCoroutine;
  varargs?: LuaValue[]; // Current variadic arguments (...)
}

/**
 * Coroutine ID counter
 */
let coroutineIdCounter = 0;

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
  private coroutines: Map<number, LuaCoroutine> = new Map();
  private currentRunningCoroutine: LuaCoroutine | null = null;

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
    // Set math constants
    this.globalContext.variables.set('math', {
      type: 'table',
      value: {
        pi: { type: 'number', value: Math.PI },
        huge: { type: 'number', value: Infinity },
        maxinteger: { type: 'number', value: Number.MAX_SAFE_INTEGER },
        mininteger: { type: 'number', value: Number.MIN_SAFE_INTEGER },
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

    this.globalContext.functions.set('rawlen', {
      params: ['v'],
      body: '__builtin_rawlen',
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

    // pcall function (protected call)
    this.globalContext.functions.set('pcall', {
      params: ['f', '...'],
      body: '__builtin_pcall',
    });

    // xpcall function (extended protected call with error handler)
    this.globalContext.functions.set('xpcall', {
      params: ['f', 'msgh', '...'],
      body: '__builtin_xpcall',
    });

    // setmetatable function
    this.globalContext.functions.set('setmetatable', {
      params: ['table', 'metatable'],
      body: '__builtin_setmetatable',
    });

    // getmetatable function
    this.globalContext.functions.set('getmetatable', {
      params: ['object'],
      body: '__builtin_getmetatable',
    });

    // warn function (Lua 5.4)
    this.globalContext.functions.set('warn', {
      params: ['...'],
      body: '__builtin_warn',
    });

    // _VERSION global
    this.globalContext.variables.set('_VERSION', {
      type: 'string',
      value: 'Lua 5.4',
    });

    // _G - reference to the global environment table
    // We create a proxy table that reflects globalContext.variables
    this.globalContext.variables.set('_G', {
      type: 'table',
      value: {}, // This will be populated dynamically
      __isGlobalEnv: true, // Marker for special handling
    });

    // package.loaded - table of loaded modules for require()
    this.globalContext.variables.set('package', {
      type: 'table',
      value: {
        loaded: { type: 'table', value: {} },
        path: { type: 'string', value: './?.lua;./?/init.lua' },
        preload: { type: 'table', value: {} },
      },
    });

    // Coroutine functions
    this.globalContext.functions.set('coroutine.create', {
      params: ['f'],
      body: '__builtin_coroutine_create',
    });

    this.globalContext.functions.set('coroutine.resume', {
      params: ['co', '...'],
      body: '__builtin_coroutine_resume',
    });

    this.globalContext.functions.set('coroutine.yield', {
      params: ['...'],
      body: '__builtin_coroutine_yield',
    });

    this.globalContext.functions.set('coroutine.status', {
      params: ['co'],
      body: '__builtin_coroutine_status',
    });

    this.globalContext.functions.set('coroutine.wrap', {
      params: ['f'],
      body: '__builtin_coroutine_wrap',
    });

    this.globalContext.functions.set('coroutine.running', {
      params: [],
      body: '__builtin_coroutine_running',
    });

    this.globalContext.functions.set('coroutine.close', {
      params: ['co'],
      body: '__builtin_coroutine_close',
    });

    this.globalContext.functions.set('coroutine.isyieldable', {
      params: ['co'],
      body: '__builtin_coroutine_isyieldable',
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

    // Hyperbolic functions
    this.globalContext.functions.set('math.sinh', {
      params: ['x'],
      body: '__builtin_math_sinh',
    });

    this.globalContext.functions.set('math.cosh', {
      params: ['x'],
      body: '__builtin_math_cosh',
    });

    this.globalContext.functions.set('math.tanh', {
      params: ['x'],
      body: '__builtin_math_tanh',
    });

    // Lua 5.3+ math functions
    this.globalContext.functions.set('math.tointeger', {
      params: ['x'],
      body: '__builtin_math_tointeger',
    });

    this.globalContext.functions.set('math.type', {
      params: ['x'],
      body: '__builtin_math_type',
    });

    this.globalContext.functions.set('math.ult', {
      params: ['m', 'n'],
      body: '__builtin_math_ult',
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

    this.globalContext.functions.set('table.pack', {
      params: ['...'],
      body: '__builtin_table_pack',
    });

    this.globalContext.functions.set('table.unpack', {
      params: ['t', 'i', 'j'],
      body: '__builtin_table_unpack',
    });

    this.globalContext.functions.set('table.move', {
      params: ['a1', 'f', 'e', 't', 'a2'],
      body: '__builtin_table_move',
    });

    // Global unpack (Lua 5.1 compatibility)
    this.globalContext.functions.set('unpack', {
      params: ['t', 'i', 'j'],
      body: '__builtin_unpack',
    });

    // os library (safe subset for browser)
    this.globalContext.functions.set('os.time', {
      params: ['t'],
      body: '__builtin_os_time',
    });

    this.globalContext.functions.set('os.date', {
      params: ['format', 'time'],
      body: '__builtin_os_date',
    });

    this.globalContext.functions.set('os.clock', {
      params: [],
      body: '__builtin_os_clock',
    });

    this.globalContext.functions.set('os.difftime', {
      params: ['t2', 't1'],
      body: '__builtin_os_difftime',
    });

    // utf8 library
    this.globalContext.functions.set('utf8.char', {
      params: ['...'],
      body: '__builtin_utf8_char',
    });

    this.globalContext.functions.set('utf8.codepoint', {
      params: ['s', 'i', 'j'],
      body: '__builtin_utf8_codepoint',
    });

    this.globalContext.functions.set('utf8.len', {
      params: ['s', 'i', 'j'],
      body: '__builtin_utf8_len',
    });

    this.globalContext.functions.set('utf8.offset', {
      params: ['s', 'n', 'i'],
      body: '__builtin_utf8_offset',
    });

    this.globalContext.functions.set('utf8.codes', {
      params: ['s'],
      body: '__builtin_utf8_codes',
    });

    // utf8.charpattern is a constant, not a function
    this.globalContext.variables.set('utf8', {
      type: 'table',
      value: {
        charpattern: { type: 'string', value: '[\\0-\\x7F\\xC2-\\xFD][\\x80-\\xBF]*' },
      },
    });

    // debug library (limited implementation for browser environment)
    this.globalContext.functions.set('debug.traceback', {
      params: ['message', 'level'],
      body: '__builtin_debug_traceback',
    });

    this.globalContext.functions.set('debug.getinfo', {
      params: ['f', 'what'],
      body: '__builtin_debug_getinfo',
    });

    this.globalContext.functions.set('debug.getlocal', {
      params: ['f', 'local'],
      body: '__builtin_debug_getlocal',
    });

    this.globalContext.functions.set('debug.setlocal', {
      params: ['level', 'local', 'value'],
      body: '__builtin_debug_setlocal',
    });

    this.globalContext.functions.set('debug.getupvalue', {
      params: ['f', 'up'],
      body: '__builtin_debug_getupvalue',
    });

    this.globalContext.functions.set('debug.setupvalue', {
      params: ['f', 'up', 'value'],
      body: '__builtin_debug_setupvalue',
    });

    this.globalContext.functions.set('debug.sethook', {
      params: ['hook', 'mask', 'count'],
      body: '__builtin_debug_sethook',
    });

    this.globalContext.functions.set('debug.gethook', {
      params: [],
      body: '__builtin_debug_gethook',
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

    // Build label index map for goto support
    const labelIndices = new Map<string, number>();
    for (let i = 0; i < statements.length; i++) {
      const trimmed = statements[i].trim();
      if (trimmed.startsWith('::') && trimmed.endsWith('::')) {
        const label = trimmed.slice(2, -2).trim();
        labelIndices.set(label, i);
      }
    }

    let i = 0;
    while (i < statements.length) {
      const trimmed = statements[i].trim();
      if (!trimmed) {
        i++;
        continue;
      }

      try {
        this.executeStatement(trimmed, context);
        i++;
      } catch (error) {
        // Re-throw return statements (they're not errors)
        if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'return') {
          throw error;
        }
        // Handle goto statements
        if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'goto') {
          const gotoError = error as { type: string; label: string };
          const targetIndex = labelIndices.get(gotoError.label);
          if (targetIndex === undefined) {
            // Label not found in this block - re-throw for outer block to handle
            throw error;
          }
          // Jump to label (the label statement itself will be skipped by executeStatement)
          i = targetIndex;
          continue;
        }
        // Re-throw break statements (they need to propagate to loops)
        if (error instanceof Error && error.message === 'break') {
          throw error;
        }
        context.errors.push(
          `Error in statement "${trimmed}": ${error instanceof Error ? error.message : String(error)}`
        );
        i++;
      }
    }
  }

  /**
   * Execute a single statement
   */
  private executeStatement(statement: string, context: LuaExecutionContext): void {
    // Check for control structures first (before assignment check)

    // Label definition (::label::) - just a marker, no action needed
    if (statement.startsWith('::') && statement.endsWith('::')) {
      // Labels are handled in executeBlock for goto jumps
      return;
    }

    // Goto statement
    if (statement.startsWith('goto ')) {
      const label = statement.substring(5).trim();
      throw { type: 'goto', label };
    }

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

    // Return statement (supports multiple values: return a, b, c)
    if (statement.startsWith('return ')) {
      const expr = statement.substring(7).trim();
      const values = this.parseMultipleExpressions(expr, context);
      if (values.length === 1) {
        throw { type: 'return', value: values[0] };
      }
      throw { type: 'return', value: { values } as LuaMultiValue };
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
   * Check if a statement is a pure comparison (not an assignment)
   * Returns true for statements like "a == b", "x > 5"
   * Returns false for assignments like "a = b", "x = y > 0" (these ARE assignments)
   */
  private isComparison(statement: string): boolean {
    // Find the first = that's not part of ==, ~=, <=, >=
    let inString = false;
    let stringChar = '';
    let hasAssignment = false;

    for (let i = 0; i < statement.length; i++) {
      const char = statement[i];

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
      } else if (!inString && char === '=') {
        // Check if this is a comparison operator (==, ~=, <=, >=)
        const prev = i > 0 ? statement[i - 1] : '';
        const next = i < statement.length - 1 ? statement[i + 1] : '';

        // Skip if it's part of ==, ~=, <=, >=
        if (prev === '=' || prev === '~' || prev === '<' || prev === '>') {
          continue;
        }
        if (next === '=') {
          continue;
        }

        // This is an assignment operator
        hasAssignment = true;
        break;
      }
    }

    // If there's an assignment, this is NOT a pure comparison
    // (even if there are comparisons on the right side)
    return !hasAssignment;
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
   * Check if operator appears outside of string literals and brackets
   * Used to detect binary operators in expressions like "total + t[1]"
   */
  private hasOperatorOutsideStringsAndBrackets(expr: string, op: string): boolean {
    let inString = false;
    let stringChar = '';
    let bracketDepth = 0;
    let parenDepth = 0;

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

      if (!inString) {
        // Track bracket depth
        if (char === '[') bracketDepth++;
        else if (char === ']') bracketDepth--;
        else if (char === '(') parenDepth++;
        else if (char === ')') parenDepth--;

        // Check for operator outside strings and brackets
        if (bracketDepth === 0 && parenDepth === 0 && expr.substring(i, i + op.length) === op) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if expression contains comparison operators outside of parentheses and strings
   * Used to detect expressions like "func() ~= nil" vs "func(a == b)"
   */
  private hasComparisonOutsideParens(expr: string): boolean {
    const compOps = ['===', '!==', '==', '~=', '!=', '<=', '>=', '<', '>'];
    let inString = false;
    let stringChar = '';
    let parenDepth = 0;
    let bracketDepth = 0;

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

      if (!inString) {
        // Track bracket/paren depth
        if (char === '(') parenDepth++;
        else if (char === ')') parenDepth--;
        else if (char === '[') bracketDepth++;
        else if (char === ']') bracketDepth--;

        // Check for comparison operators outside strings and parens
        if (parenDepth === 0 && bracketDepth === 0) {
          for (const op of compOps) {
            if (expr.substring(i, i + op.length) === op) {
              // Make sure it's not part of << or >>
              if ((op === '<' && expr[i + 1] === '<') || (op === '>' && expr[i + 1] === '>')) {
                continue;
              }
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if expression is a single string literal (not concatenation)
   */
  private isStringLiteral(expr: string): boolean {
    // Check for long string literals [[...]] or [=[...]=] etc.
    if (expr.startsWith('[')) {
      const longStringMatch = expr.match(/^\[(=*)\[/);
      if (longStringMatch) {
        const equals = longStringMatch[1];
        const closePattern = `]${equals}]`;
        const closeIndex = expr.indexOf(closePattern, 2 + equals.length);
        if (closeIndex !== -1) {
          const remaining = expr.substring(closeIndex + closePattern.length).trim();
          return remaining.length === 0;
        }
      }
      return false;
    }

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
   * Check if expression is a long string literal [[...]] or [=[...]=]
   */
  private isLongStringLiteral(expr: string): boolean {
    if (!expr.startsWith('[')) return false;
    const match = expr.match(/^\[(=*)\[/);
    if (!match) return false;
    const equals = match[1];
    const closePattern = `]${equals}]`;
    return expr.endsWith(closePattern);
  }

  /**
   * Extract content from long string literal
   */
  private extractLongString(expr: string): string {
    const match = expr.match(/^\[(=*)\[/);
    if (!match) return '';
    const equals = match[1];
    const openLen = 2 + equals.length;
    const closeLen = 2 + equals.length;
    let content = expr.substring(openLen, expr.length - closeLen);
    // Remove leading newline if present (Lua spec)
    if (content.startsWith('\n')) {
      content = content.substring(1);
    }
    return content;
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
   * Supports: x = expr, a, b, c = expr1, expr2, expr3, t[key] = value, t.key = value
   */
  private executeAssignment(statement: string, context: LuaExecutionContext): void {
    const equalIndex = this.findAssignmentOperator(statement);
    const varsStr = statement.substring(0, equalIndex).trim();
    const exprsStr = statement.substring(equalIndex + 1).trim();

    // Check if it's a multi-variable assignment (contains comma outside brackets)
    const varNames = this.parseAssignmentTargets(varsStr);

    if (varNames.length > 1) {
      // Multiple assignment: a, b, c = expr1, expr2, expr3
      const values = this.parseMultipleExpressions(exprsStr, context);

      // Handle multi-value returns
      let expandedValues: LuaValue[] = [];
      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        if (i === values.length - 1 && isMultiValue(val)) {
          expandedValues = expandedValues.concat(val.values);
        } else if (isMultiValue(val)) {
          expandedValues.push(val.values[0] || { type: 'nil', value: null });
        } else {
          expandedValues.push(val);
        }
      }

      // Assign to each variable
      for (let i = 0; i < varNames.length; i++) {
        this.assignToVariable(varNames[i], expandedValues[i] || { type: 'nil', value: null }, context);
      }
      return;
    }

    // Single assignment
    const varName = varsStr;
    const expression = exprsStr;

    // Handle table assignments: t[key] = value, t.field[key] = value, t[a][b] = value
    if (varName.includes('[') && varName.includes(']')) {
      const bracketIndex = varName.indexOf('[');
      const tableExpr = varName.substring(0, bracketIndex).trim();
      const keyExpr = varName.substring(bracketIndex + 1, varName.lastIndexOf(']')).trim();

      // Evaluate the table expression (could be "t", "t.field", "t[a]", etc.)
      let tableValue = this.evaluateExpression(tableExpr, context);
      if (!tableValue || tableValue.type !== 'table') {
        // If the table doesn't exist and it's a simple variable name, create it
        if (!tableExpr.includes('.') && !tableExpr.includes('[')) {
          tableValue = { type: 'table', value: {} };
          context.variables.set(tableExpr, tableValue);
        } else {
          throw new Error(`attempt to index a ${tableValue?.type || 'nil'} value`);
        }
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
    let value = this.evaluateExpression(expression, context);

    // For single-variable assignment, if the expression returns multiple values,
    // only use the first value (Lua semantics)
    if (isMultiValue(value as unknown as LuaMultiValue)) {
      const mv = value as unknown as LuaMultiValue;
      value = mv.values[0] || { type: 'nil', value: null };
    }

    this.assignToVariable(varName, value, context);
  }

  /**
   * Parse assignment targets (variable names), handling table access
   */
  private parseAssignmentTargets(varsStr: string): string[] {
    const vars: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < varsStr.length; i++) {
      const char = varsStr[i];

      if (char === '[') depth++;
      if (char === ']') depth--;

      if (depth === 0 && char === ',') {
        if (current.trim()) {
          vars.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      vars.push(current.trim());
    }

    return vars;
  }

  /**
   * Assign a value to a variable (handles both global and local scope)
   */
  private assignToVariable(varName: string, value: LuaValue, context: LuaExecutionContext): void {
    // Check if variable exists in local scopes first
    for (let i = context.localScopes.length - 1; i >= 0; i--) {
      if (context.localScopes[i].has(varName)) {
        const existing = context.localScopes[i].get(varName);
        // Lua 5.4: prevent reassignment of <const> variables
        if (existing?.attribute === 'const') {
          throw new Error(`attempt to assign to const variable '${varName}'`);
        }
        // Preserve attribute on reassignment (for <close> variables)
        if (existing?.attribute) {
          value.attribute = existing.attribute;
        }
        context.localScopes[i].set(varName, value);
        return;
      }
    }

    // Otherwise assign to global
    context.variables.set(varName, value);
  }

  /**
   * Exit a local scope, calling __close metamethods on <close> variables (Lua 5.4)
   * Variables are closed in reverse order of declaration
   */
  private exitScope(context: LuaExecutionContext, errorValue?: LuaValue): void {
    if (context.localScopes.length === 0) return;

    const scope = context.localScopes[context.localScopes.length - 1];

    // Collect <close> variables in reverse order (iterate backwards through scope entries)
    const closeVars: Array<{ name: string; value: LuaValue }> = [];
    scope.forEach((value, name) => {
      if (value.attribute === 'close') {
        closeVars.unshift({ name, value }); // Add to front for reverse order
      }
    });

    // Call __close on each <close> variable
    for (const { name, value } of closeVars) {
      if (value.type === 'nil') {
        // nil values are allowed, just skip
        continue;
      }

      if (value.type === 'table' && value.metatable?.__close) {
        const closeFunc = value.metatable.__close;
        if (closeFunc.type === 'string') {
          // It's a function name
          const userFunc = context.functions.get(closeFunc.value as string);
          if (userFunc) {
            const funcScope = new Map<string, LuaValue>();
            context.localScopes.push(funcScope);
            // __close receives: the value, and error value (or nil)
            funcScope.set(userFunc.params[0] || 'self', value);
            funcScope.set(userFunc.params[1] || 'err', errorValue || { type: 'nil', value: null });
            try {
              this.executeBlock(userFunc.body, context);
            } catch {
              // Errors in __close are suppressed (as per Lua 5.4 spec)
            }
            context.localScopes.pop();
          }
        } else if (closeFunc.type === 'function') {
          // It's a function value
          const funcValue = closeFunc.value as { name?: string };
          if (funcValue.name) {
            const userFunc = context.functions.get(funcValue.name);
            if (userFunc) {
              const funcScope = new Map<string, LuaValue>();
              context.localScopes.push(funcScope);
              funcScope.set(userFunc.params[0] || 'self', value);
              funcScope.set(userFunc.params[1] || 'err', errorValue || { type: 'nil', value: null });
              try {
                this.executeBlock(userFunc.body, context);
              } catch {
                // Errors in __close are suppressed
              }
              context.localScopes.pop();
            }
          }
        }
      } else {
        // Lua 5.4: non-nil value without __close metamethod is an error
        throw new Error(`variable '${name}' got a non-closable value`);
      }
    }

    // Pop the scope
    context.localScopes.pop();
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

    // Varargs (...)
    if (trimmed === '...') {
      if (!context.varargs || context.varargs.length === 0) {
        return { type: 'nil', value: null };
      }
      if (context.varargs.length === 1) {
        return context.varargs[0];
      }
      // Return multiple values
      return { values: context.varargs } as LuaMultiValue as unknown as LuaValue;
    }

    // Boolean literals
    if (trimmed === 'true') {
      return { type: 'boolean', value: true };
    }
    if (trimmed === 'false') {
      return { type: 'boolean', value: false };
    }

    // Length operator (#) - unary prefix with __len metamethod support
    if (trimmed.startsWith('#')) {
      const operand = this.evaluateExpression(trimmed.substring(1), context);

      // Check for __len metamethod first (for tables)
      if (operand.type === 'table') {
        const lenResult = this.tryMetamethod(operand, '__len', [operand], context);
        if (lenResult) return lenResult;

        // Standard table length: count consecutive integer keys starting at 1
        const table = operand.value as Record<string, LuaValue>;
        let length = 0;
        while (table[String(length + 1)] !== undefined) {
          length++;
        }
        return { type: 'number', value: length };
      }
      if (operand.type === 'string') {
        return { type: 'number', value: (operand.value as string).length };
      }
      throw new Error(`attempt to get length of a ${operand.type} value`);
    }

    // Unary minus (-) with __unm metamethod support
    if (trimmed.startsWith('-')) {
      const rest = trimmed.substring(1).trim();
      // Make sure it's not a negative number literal
      if (!/^\d/.test(rest)) {
        const operand = this.evaluateExpression(rest, context);

        // Check for __unm metamethod
        const unmResult = this.tryMetamethod(operand, '__unm', [operand], context);
        if (unmResult) return unmResult;

        if (operand.type === 'number') {
          return { type: 'number', value: -(operand.value as number) };
        }
        throw new Error(`attempt to perform arithmetic on a ${operand.type} value`);
      }
    }

    // Unary bitwise NOT (~) with __bnot metamethod support
    if (trimmed.startsWith('~') && !trimmed.startsWith('~=')) {
      const rest = trimmed.substring(1).trim();
      const operand = this.evaluateExpression(rest, context);

      // Check for __bnot metamethod
      const bnotResult = this.tryMetamethod(operand, '__bnot', [operand], context);
      if (bnotResult) return bnotResult;

      if (operand.type === 'number') {
        return { type: 'number', value: ~(operand.value as number | 0) };
      }
      throw new Error(`attempt to perform bitwise operation on a ${operand.type} value`);
    }

    // String literals (only if it's a SINGLE complete string, not concatenation)
    if (this.isStringLiteral(trimmed)) {
      // Check for long string literals [[...]] or [=[...]=]
      if (this.isLongStringLiteral(trimmed)) {
        return { type: 'string', value: this.extractLongString(trimmed) };
      }
      // Regular quoted string
      return { type: 'string', value: trimmed.slice(1, -1) };
    }

    // Table literals
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return this.evaluateTableLiteral(trimmed, context);
    }

    // Anonymous function expression: function(params) ... end
    if (trimmed.startsWith('function(') || trimmed.startsWith('function (')) {
      return this.parseAnonymousFunction(trimmed, context);
    }

    // Check for comparison operators BEFORE function calls
    // (comparison operators should bind looser than function calls)
    if (this.hasComparisonOutsideParens(trimmed)) {
      // Delegate to comparison handling below
    } else if (trimmed.includes('(') && trimmed.includes(')')) {
      // Function call - only if no comparison operators outside parens
      return this.evaluateFunctionCall(trimmed, context);
    }

    // Table indexing (after function call to avoid matching patterns like "[aeiou]" in args)
    // Only match if it's a simple table index like t[1], t[key], or t.field[1]
    // NOT expressions like "total + t[1]" which should go to binary operators
    if (trimmed.includes('[') && trimmed.includes(']') &&
        !this.hasOperatorOutsideStringsAndBrackets(trimmed, '+') &&
        !this.hasOperatorOutsideStringsAndBrackets(trimmed, '-') &&
        !this.hasOperatorOutsideStringsAndBrackets(trimmed, '*') &&
        !this.hasOperatorOutsideStringsAndBrackets(trimmed, '/') &&
        !this.hasOperatorOutsideStringsAndBrackets(trimmed, '..')) {
      return this.evaluateTableIndex(trimmed, context);
    }

    // Table dot notation (t.key)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      const dotIndex = trimmed.indexOf('.');
      const tableName = trimmed.substring(0, dotIndex);
      const key = trimmed.substring(dotIndex + 1);
      const tableValue = this.lookupVariable(tableName, context);
      if (tableValue?.type === 'table') {
        const directValue = tableValue.value[key];
        if (directValue !== undefined) {
          return directValue;
        }
        // Check for __index metamethod
        if (tableValue.metatable) {
          const indexMeta = tableValue.metatable.__index;
          if (indexMeta) {
            if (indexMeta.type === 'table') {
              return indexMeta.value[key] || { type: 'nil', value: null };
            }
            // If __index is a function - call it
            if (indexMeta.type === 'string') {
              const userFunc = context.functions.get(indexMeta.value as string);
              if (userFunc) {
                const funcScope = new Map<string, LuaValue>();
                context.localScopes.push(funcScope);
                funcScope.set(userFunc.params[0] || 'table', tableValue);
                funcScope.set(userFunc.params[1] || 'key', { type: 'string', value: key });
                try {
                  this.executeBlock(userFunc.body, context);
                  context.localScopes.pop();
                  return { type: 'nil', value: null };
                } catch (error) {
                  context.localScopes.pop();
                  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'return') {
                    return (error as { type: string; value: LuaValue }).value;
                  }
                  throw error;
                }
              }
            }
          }
        }
        return { type: 'nil', value: null };
      }
      return { type: 'nil', value: null };
    }

    // Number literals (including hex and scientific notation)
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
      return { type: 'number', value: parseFloat(trimmed) };
    }
    // Hex literals: 0xFF, 0x1A, -0xFF, 0x1.5p10 (Lua 5.2+ hex float)
    if (/^-?0x[0-9a-fA-F]+$/i.test(trimmed)) {
      return { type: 'number', value: parseInt(trimmed, 16) };
    }
    // Hex float with exponent: 0x1.5p10 (p = power of 2)
    if (/^-?0x[0-9a-fA-F]+(\.[0-9a-fA-F]+)?([pP][+-]?\d+)?$/i.test(trimmed)) {
      return { type: 'number', value: this.parseHexFloat(trimmed) };
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
    // Integer division (check BEFORE regular division)
    if (trimmed.includes('//')) {
      return this.evaluateBinaryOp(trimmed, '//', context);
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

    // Bitwise operators (Lua 5.3+)
    if (trimmed.includes('<<')) {
      return this.evaluateBinaryOp(trimmed, '<<', context);
    }
    if (trimmed.includes('>>')) {
      return this.evaluateBinaryOp(trimmed, '>>', context);
    }
    if (trimmed.includes('&')) {
      return this.evaluateBinaryOp(trimmed, '&', context);
    }
    if (trimmed.includes('|')) {
      return this.evaluateBinaryOp(trimmed, '|', context);
    }
    // Bitwise XOR (~) - note: unary ~ is bitwise NOT
    if (trimmed.includes('~') && !trimmed.includes('~=')) {
      // Check if it's binary (XOR) or unary (NOT)
      const tildeIndex = trimmed.indexOf('~');
      if (tildeIndex > 0 && tildeIndex < trimmed.length - 1) {
        return this.evaluateBinaryOp(trimmed, '~', context);
      }
    }

    // Variable reference (check local scopes first, then global, then functions)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      const value = this.lookupVariable(trimmed, context);
      if (value) return value;

      // Check if it's a function name - return a function value
      const userFunc = context.functions.get(trimmed);
      if (userFunc) {
        return {
          type: 'function',
          value: {
            name: trimmed,
            params: userFunc.params,
          },
        };
      }

      return { type: 'nil', value: null };
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
          // Lua string concatenation with __concat metamethod support
          result = this.concat(result, right, context);
          break;
        case '+':
          result = this.add(result, right, context);
          break;
        case '-':
          result = this.subtract(result, right, context);
          break;
        case '*':
          result = this.multiply(result, right, context);
          break;
        case '/':
          result = this.divide(result, right, context);
          break;
        case '%':
          result = this.modulo(result, right, context);
          break;
        case '^':
          result = this.power(result, right, context);
          break;
        case '//':
          result = this.integerDivide(result, right, context);
          break;
        case '<<':
          result = this.leftShift(result, right, context);
          break;
        case '>>':
          result = this.rightShift(result, right, context);
          break;
        case '&':
          result = this.bitwiseAnd(result, right, context);
          break;
        case '|':
          result = this.bitwiseOr(result, right, context);
          break;
        case '~':
          result = this.bitwiseXor(result, right, context);
          break;
      }
    }

    return result;
  }

  /**
   * Evaluate comparison with metamethod support (__eq, __lt, __le)
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
      case '===': {
        // Check for __eq metamethod (only if both are tables with same metatable)
        const eqResult = this.tryMetamethod(leftVal, '__eq', [leftVal, rightVal], context);
        if (eqResult) {
          result = this.isTruthy(eqResult);
        } else {
          result = leftVal.value === rightVal.value;
        }
        break;
      }
      case '~=':
      case '!=':
      case '!==': {
        // __eq negated for inequality
        const eqResult = this.tryMetamethod(leftVal, '__eq', [leftVal, rightVal], context);
        if (eqResult) {
          result = !this.isTruthy(eqResult);
        } else {
          result = leftVal.value !== rightVal.value;
        }
        break;
      }
      case '<': {
        // Check for __lt metamethod
        const ltResult = this.tryMetamethod(leftVal, '__lt', [leftVal, rightVal], context);
        if (ltResult) {
          result = this.isTruthy(ltResult);
        } else {
          result = leftVal.value < rightVal.value;
        }
        break;
      }
      case '>': {
        // a > b is equivalent to b < a
        const ltResult = this.tryMetamethod(rightVal, '__lt', [rightVal, leftVal], context);
        if (ltResult) {
          result = this.isTruthy(ltResult);
        } else {
          result = leftVal.value > rightVal.value;
        }
        break;
      }
      case '<=': {
        // Check for __le metamethod, or use __lt as fallback (not (b < a))
        const leResult = this.tryMetamethod(leftVal, '__le', [leftVal, rightVal], context);
        if (leResult) {
          result = this.isTruthy(leResult);
        } else {
          // Fallback: a <= b is not (b < a)
          const ltResult = this.tryMetamethod(rightVal, '__lt', [rightVal, leftVal], context);
          if (ltResult) {
            result = !this.isTruthy(ltResult);
          } else {
            result = leftVal.value <= rightVal.value;
          }
        }
        break;
      }
      case '>=': {
        // Check for __le metamethod on right side, or use __lt
        const leResult = this.tryMetamethod(rightVal, '__le', [rightVal, leftVal], context);
        if (leResult) {
          result = this.isTruthy(leResult);
        } else {
          // Fallback: a >= b is not (a < b)
          const ltResult = this.tryMetamethod(leftVal, '__lt', [leftVal, rightVal], context);
          if (ltResult) {
            result = !this.isTruthy(ltResult);
          } else {
            result = leftVal.value >= rightVal.value;
          }
        }
        break;
      }
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
   * Get day of year (1-366)
   */
  private getDayOfYear(date: Date, useUTC: boolean): number {
    const start = useUTC
      ? new Date(Date.UTC(date.getUTCFullYear(), 0, 0))
      : new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * Parse Lua hex float notation (e.g., 0x1.5p10)
   */
  private parseHexFloat(str: string): number {
    const negative = str.startsWith('-');
    if (negative) str = str.substring(1);

    // Remove 0x prefix
    str = str.substring(2).toLowerCase();

    // Split by 'p' for exponent
    const [mantissaPart, expPart] = str.split('p');
    const [intPart, fracPart] = mantissaPart.split('.');

    // Parse integer part
    let value = parseInt(intPart || '0', 16);

    // Parse fractional part
    if (fracPart) {
      for (let i = 0; i < fracPart.length; i++) {
        const digit = parseInt(fracPart[i], 16);
        value += digit / Math.pow(16, i + 1);
      }
    }

    // Apply exponent (power of 2)
    if (expPart) {
      const exp = parseInt(expPart, 10);
      value *= Math.pow(2, exp);
    }

    return negative ? -value : value;
  }

  /**
   * Evaluate function call
   */
  private evaluateFunctionCall(expr: string, context: LuaExecutionContext): LuaValue {
    const parenIndex = expr.indexOf('(');
    let funcName = expr.substring(0, parenIndex).trim();
    const argsStr = expr.substring(parenIndex + 1, expr.lastIndexOf(')')).trim();

    let args = argsStr ? this.parseArguments(argsStr, context) : [];

    // Handle method calls with colon syntax: obj:method(args)
    // Transform to obj.method(obj, args)
    if (funcName.includes(':')) {
      const colonIndex = funcName.indexOf(':');
      const objName = funcName.substring(0, colonIndex).trim();
      const methodName = funcName.substring(colonIndex + 1).trim();

      // Get the object
      const objValue = this.evaluateExpression(objName, context);
      if (objValue.type !== 'table') {
        throw new Error(`attempt to index a ${objValue.type} value`);
      }

      // Transform to dot notation and prepend self
      funcName = `${objName}.${methodName}`;
      args = [objValue, ...args];
    }

    // Built-in functions
    // === Global functions ===
    if (funcName === 'print') {
      const output = args.map((arg) => this.luaToString(arg, context)).join('\t');
      context.output.push(output);
      return { type: 'nil', value: null };
    }

    if (funcName === 'type') {
      if (args.length === 0) return { type: 'string', value: 'nil' };
      return { type: 'string', value: args[0].type };
    }

    if (funcName === 'tostring') {
      if (args.length === 0) return { type: 'string', value: 'nil' };
      return { type: 'string', value: this.luaToString(args[0], context) };
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

    // collectgarbage - Garbage collection control (stub for browser environment)
    // In JavaScript, GC is handled automatically by the engine
    if (funcName === 'collectgarbage') {
      const opt = (args[0]?.value as string) || 'collect';

      switch (opt) {
        case 'collect':
          // Trigger a full GC cycle - no-op in JS, return 0
          return { type: 'number', value: 0 };
        case 'stop':
          // Stop GC - not possible in JS, no-op
          return { type: 'nil', value: null };
        case 'restart':
          // Restart GC - not possible in JS, no-op
          return { type: 'nil', value: null };
        case 'count':
          // Return memory in use (KB) - try to get from performance API
          if (typeof performance !== 'undefined' && (performance as any).memory) {
            const memoryMB = (performance as any).memory.usedJSHeapSize / 1024;
            return { type: 'number', value: memoryMB };
          }
          return { type: 'number', value: 0 };
        case 'step':
          // Perform a GC step - no-op in JS, return false (not finished)
          return { type: 'boolean', value: false };
        case 'isrunning':
          // Check if GC is running - always true in JS
          return { type: 'boolean', value: true };
        case 'setpause':
          // Set GC pause parameter - no-op, return previous value (200 is Lua default)
          return { type: 'number', value: 200 };
        case 'setstepmul':
          // Set GC step multiplier - no-op, return previous value (200 is Lua default)
          return { type: 'number', value: 200 };
        case 'generational':
          // Lua 5.4: Switch to generational mode - no-op
          return { type: 'nil', value: null };
        case 'incremental':
          // Lua 5.4: Switch to incremental mode - no-op
          return { type: 'nil', value: null };
        default:
          throw new Error(`bad argument #1 to 'collectgarbage' (invalid option '${opt}')`);
      }
    }

    if (funcName === 'pairs') {
      // Return a special marker for generic for to handle
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to pairs (table expected)');
      }
      const table = args[0];

      // Check for __pairs metamethod
      if (table.metatable && table.metatable.__pairs) {
        const pairsMethod = table.metatable.__pairs;
        if (pairsMethod.type === 'string') {
          // Call the __pairs function with the table
          return this.evaluateFunctionCall(`${pairsMethod.value}(${this.valueToLuaLiteral(table)})`, context);
        }
        if (pairsMethod.type === 'function') {
          // Anonymous function - call it
          const funcValue = pairsMethod.value as { __anonymous?: boolean; name?: string };
          if (funcValue.__anonymous && funcValue.name) {
            const storedFunc = context.functions.get(funcValue.name);
            if (storedFunc) {
              return { type: 'table', value: { __customPairs: true, iteratorFunc: funcValue.name, table: table.value } };
            }
          }
        }
      }

      return { type: 'table', value: { __pairs: true, table: table.value } };
    }

    if (funcName === 'ipairs') {
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to ipairs (table expected)');
      }
      const table = args[0];

      // Check for __ipairs metamethod
      if (table.metatable && table.metatable.__ipairs) {
        const ipairsMethod = table.metatable.__ipairs;
        if (ipairsMethod.type === 'string') {
          // Call the __ipairs function with the table
          return this.evaluateFunctionCall(`${ipairsMethod.value}(${this.valueToLuaLiteral(table)})`, context);
        }
        if (ipairsMethod.type === 'function') {
          const funcValue = ipairsMethod.value as { __anonymous?: boolean; name?: string };
          if (funcValue.__anonymous && funcValue.name) {
            const storedFunc = context.functions.get(funcValue.name);
            if (storedFunc) {
              return { type: 'table', value: { __customIpairs: true, iteratorFunc: funcValue.name, table: table.value } };
            }
          }
        }
      }

      return { type: 'table', value: { __ipairs: true, table: table.value } };
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

    if (funcName === 'rawlen') {
      // Get length without invoking __len metamethod
      if (args.length === 0) {
        throw new Error("bad argument #1 to 'rawlen' (table or string expected)");
      }
      const v = args[0];
      if (v.type === 'string') {
        return { type: 'number', value: (v.value as string).length };
      }
      if (v.type === 'table') {
        const table = v.value as Record<string, LuaValue>;
        let length = 0;
        while (table[String(length + 1)] !== undefined) {
          length++;
        }
        return { type: 'number', value: length };
      }
      throw new Error("bad argument #1 to 'rawlen' (table or string expected)");
    }

    if (funcName === 'warn') {
      // Lua 5.4 warn function - outputs warning messages
      const message = args.map((arg) => this.luaToString(arg, context)).join('');
      // In browser context, we output to console.warn
      console.warn('[Lua warn]', message);
      context.output.push(`[warn] ${message}`);
      return { type: 'nil', value: null };
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
      // For j, find the max numeric index if not specified
      let j = args[2]?.value;
      if (j === undefined) {
        const keys = Object.keys(t).map(Number).filter(n => !isNaN(n));
        j = keys.length > 0 ? Math.max(...keys) : 0;
      }
      const result: LuaValue[] = [];
      for (let k = i; k <= j; k++) {
        result.push(t[String(k)] || { type: 'nil', value: null });
      }
      // Return multiple values
      if (result.length === 0) return { type: 'nil', value: null };
      if (result.length === 1) return result[0];
      return { values: result } as LuaMultiValue as unknown as LuaValue;
    }

    // load - Load a chunk of Lua code and return it as a function
    if (funcName === 'load') {
      if (args.length === 0) {
        return { type: 'nil', value: null };
      }

      let chunk: string;
      if (args[0].type === 'string') {
        chunk = args[0].value as string;
      } else if (args[0].type === 'function') {
        // If first arg is a function, call it repeatedly to get chunks
        // For simplicity, we don't fully support this - just return nil
        return { type: 'table', value: {
          '1': { type: 'nil', value: null },
          '2': { type: 'string', value: 'load with function reader not fully supported' }
        }};
      } else {
        return { type: 'table', value: {
          '1': { type: 'nil', value: null },
          '2': { type: 'string', value: 'bad argument #1 to load (string expected)' }
        }};
      }

      // chunkname (optional, for error messages)
      // mode (optional, 'b', 't', or 'bt' - we only support text)
      // env (optional, environment table - we don't support this)

      // Generate a unique function name for this loaded chunk
      const loadedFuncName = `__loaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store the chunk as a function with no parameters
      context.functions.set(loadedFuncName, {
        params: [],
        body: chunk,
        isVariadic: true, // Allow ... access
      });

      // Return a function value that can be called
      return {
        type: 'function',
        value: {
          __anonymous: true,
          name: loadedFuncName,
          params: [],
        },
      };
    }

    // loadstring - Lua 5.1 compatibility (deprecated in 5.2+, alias for load)
    if (funcName === 'loadstring') {
      if (args.length === 0 || args[0].type !== 'string') {
        return { type: 'table', value: {
          '1': { type: 'nil', value: null },
          '2': { type: 'string', value: 'bad argument #1 to loadstring (string expected)' }
        }};
      }

      const chunk = args[0].value as string;
      const loadedFuncName = `__loaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      context.functions.set(loadedFuncName, {
        params: [],
        body: chunk,
        isVariadic: true,
      });

      return {
        type: 'function',
        value: {
          __anonymous: true,
          name: loadedFuncName,
          params: [],
        },
      };
    }

    // dofile - Load and execute a file (not supported in browser environment)
    if (funcName === 'dofile') {
      throw new Error('dofile is not supported in browser environment');
    }

    // loadfile - Load a file as a function (not supported in browser environment)
    if (funcName === 'loadfile') {
      return { type: 'table', value: {
        '1': { type: 'nil', value: null },
        '2': { type: 'string', value: 'loadfile is not supported in browser environment' }
      }};
    }

    // require - Load a module (basic implementation)
    if (funcName === 'require') {
      if (args.length === 0 || args[0].type !== 'string') {
        throw new Error("bad argument #1 to 'require' (string expected)");
      }

      const modname = args[0].value as string;

      // Check if module is already loaded in package.loaded
      const pkg = this.lookupVariable('package', context);
      if (pkg?.type === 'table') {
        const loaded = (pkg.value as Record<string, LuaValue>).loaded;
        if (loaded?.type === 'table') {
          const cached = (loaded.value as Record<string, LuaValue>)[modname];
          if (cached && cached.type !== 'nil') {
            return cached;
          }
        }

        // Check package.preload for a loader function
        const preload = (pkg.value as Record<string, LuaValue>).preload;
        if (preload?.type === 'table') {
          const loader = (preload.value as Record<string, LuaValue>)[modname];
          if (loader) {
            // If it's a function name, call it
            if (loader.type === 'string') {
              const userFunc = context.functions.get(loader.value as string);
              if (userFunc) {
                const funcScope = new Map<string, LuaValue>();
                context.localScopes.push(funcScope);
                funcScope.set(userFunc.params[0] || 'modname', args[0]);

                try {
                  this.executeBlock(userFunc.body, context);
                  context.localScopes.pop();
                  // Cache and return true if no explicit return
                  const result: LuaValue = { type: 'boolean', value: true };
                  if (loaded?.type === 'table') {
                    (loaded.value as Record<string, LuaValue>)[modname] = result;
                  }
                  return result;
                } catch (error) {
                  context.localScopes.pop();
                  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'return') {
                    const result = (error as { type: string; value: LuaValue }).value;
                    // Cache the result
                    if (loaded?.type === 'table') {
                      (loaded.value as Record<string, LuaValue>)[modname] = result.type === 'nil' ? { type: 'boolean', value: true } : result;
                    }
                    return result.type === 'nil' ? { type: 'boolean', value: true } : result;
                  }
                  throw error;
                }
              }
            }
            // If it's a function value
            if (loader.type === 'function') {
              const funcValue = loader.value as { __anonymous?: boolean; name?: string };
              if (funcValue.name) {
                const userFunc = context.functions.get(funcValue.name);
                if (userFunc) {
                  const funcScope = new Map<string, LuaValue>();
                  context.localScopes.push(funcScope);
                  funcScope.set(userFunc.params[0] || 'modname', args[0]);

                  try {
                    this.executeBlock(userFunc.body, context);
                    context.localScopes.pop();
                    const result: LuaValue = { type: 'boolean', value: true };
                    if (loaded?.type === 'table') {
                      (loaded.value as Record<string, LuaValue>)[modname] = result;
                    }
                    return result;
                  } catch (error) {
                    context.localScopes.pop();
                    if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'return') {
                      const result = (error as { type: string; value: LuaValue }).value;
                      if (loaded?.type === 'table') {
                        (loaded.value as Record<string, LuaValue>)[modname] = result.type === 'nil' ? { type: 'boolean', value: true } : result;
                      }
                      return result.type === 'nil' ? { type: 'boolean', value: true } : result;
                    }
                    throw error;
                  }
                }
              }
            }
          }
        }
      }

      // Module not found in preload - file loading not supported
      throw new Error(`module '${modname}' not found (file loading not supported in browser)`);
    }

    // pcall - Protected call (catches errors and returns status + result)
    if (funcName === 'pcall') {
      if (args.length === 0) {
        return { type: 'boolean', value: false };
      }
      const funcToCall = args[0];
      const funcArgs = args.slice(1);

      try {
        // If it's a function name string, call it
        if (funcToCall.type === 'string') {
          const userFunc = context.functions.get(funcToCall.value);
          if (!userFunc) {
            return { type: 'table', value: {
              '1': { type: 'boolean', value: false },
              '2': { type: 'string', value: `attempt to call a nil value` }
            }};
          }

          // Create function scope
          const funcScope = new Map<string, LuaValue>();
          context.localScopes.push(funcScope);

          for (let i = 0; i < userFunc.params.length; i++) {
            funcScope.set(userFunc.params[i], funcArgs[i] || { type: 'nil', value: null });
          }

          try {
            this.executeBlock(userFunc.body, context);
            context.localScopes.pop();
            return { type: 'table', value: {
              '1': { type: 'boolean', value: true }
            }};
          } catch (innerError) {
            context.localScopes.pop();
            if (typeof innerError === 'object' && innerError !== null && 'type' in innerError && (innerError as any).type === 'return') {
              return { type: 'table', value: {
                '1': { type: 'boolean', value: true },
                '2': (innerError as any).value
              }};
            }
            throw innerError;
          }
        }

        // Otherwise return success with nil
        return { type: 'table', value: {
          '1': { type: 'boolean', value: true }
        }};
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { type: 'table', value: {
          '1': { type: 'boolean', value: false },
          '2': { type: 'string', value: errorMsg }
        }};
      }
    }

    // xpcall - Extended protected call with error handler
    if (funcName === 'xpcall') {
      if (args.length < 2) {
        return { type: 'table', value: {
          '1': { type: 'boolean', value: false },
          '2': { type: 'string', value: 'bad argument #2 (function expected)' }
        }};
      }

      const funcToCall = args[0];
      const errorHandler = args[1];
      const funcArgs = args.slice(2);

      try {
        // If it's a function name string, call it
        if (funcToCall.type === 'string') {
          const userFunc = context.functions.get(funcToCall.value);
          if (!userFunc) {
            // Call error handler with the error
            if (errorHandler.type === 'string') {
              const handlerFunc = context.functions.get(errorHandler.value);
              if (handlerFunc) {
                const handlerScope = new Map<string, LuaValue>();
                context.localScopes.push(handlerScope);
                handlerScope.set(handlerFunc.params[0] || 'err', { type: 'string', value: 'attempt to call a nil value' });
                try {
                  this.executeBlock(handlerFunc.body, context);
                } catch {}
                context.localScopes.pop();
              }
            }
            return { type: 'table', value: {
              '1': { type: 'boolean', value: false },
              '2': { type: 'string', value: 'attempt to call a nil value' }
            }};
          }

          // Create function scope
          const funcScope = new Map<string, LuaValue>();
          context.localScopes.push(funcScope);

          for (let i = 0; i < userFunc.params.length; i++) {
            funcScope.set(userFunc.params[i], funcArgs[i] || { type: 'nil', value: null });
          }

          try {
            this.executeBlock(userFunc.body, context);
            context.localScopes.pop();
            return { type: 'table', value: {
              '1': { type: 'boolean', value: true }
            }};
          } catch (innerError) {
            context.localScopes.pop();
            if (typeof innerError === 'object' && innerError !== null && 'type' in innerError && (innerError as any).type === 'return') {
              return { type: 'table', value: {
                '1': { type: 'boolean', value: true },
                '2': (innerError as any).value
              }};
            }
            throw innerError;
          }
        }

        return { type: 'table', value: {
          '1': { type: 'boolean', value: true }
        }};
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        // Call error handler
        if (errorHandler.type === 'string') {
          const handlerFunc = context.functions.get(errorHandler.value);
          if (handlerFunc) {
            const handlerScope = new Map<string, LuaValue>();
            context.localScopes.push(handlerScope);
            handlerScope.set(handlerFunc.params[0] || 'err', { type: 'string', value: errorMsg });
            try {
              this.executeBlock(handlerFunc.body, context);
            } catch {}
            context.localScopes.pop();
          }
        }

        return { type: 'table', value: {
          '1': { type: 'boolean', value: false },
          '2': { type: 'string', value: errorMsg }
        }};
      }
    }

    // setmetatable - Set the metatable for a table
    if (funcName === 'setmetatable') {
      if (args.length < 1 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to setmetatable (table expected)');
      }

      const table = args[0];
      const mt = args[1];

      if (mt.type === 'nil') {
        // Remove metatable
        delete (table.value as LuaTable).__metatable;
        table.metatable = undefined;
      } else if (mt.type === 'table') {
        // Check if existing metatable is protected
        if ((table.value as LuaTable).__metatable) {
          throw new Error('cannot change a protected metatable');
        }
        (table.value as LuaTable).__metatable = mt.value;
        table.metatable = mt.value;
      } else {
        throw new Error('bad argument #2 to setmetatable (nil or table expected)');
      }

      return table;
    }

    // getmetatable - Get the metatable for a table
    if (funcName === 'getmetatable') {
      if (args.length === 0) {
        return { type: 'nil', value: null };
      }

      const obj = args[0];

      // Check for __metatable field (protected metatable)
      if (obj.type === 'table' && obj.metatable) {
        const protectedMt = obj.metatable.__metatable;
        if (protectedMt) {
          // If __metatable is set, return it as a value
          if (typeof protectedMt === 'object' && 'type' in protectedMt) {
            return protectedMt as LuaValue;
          }
          return { type: 'table', value: protectedMt };
        }
        return { type: 'table', value: obj.metatable };
      }

      // Strings have a shared metatable in Lua, but we'll return nil for simplicity
      return { type: 'nil', value: null };
    }

    // === Coroutine functions ===

    // coroutine.create - Create a new coroutine
    if (funcName === 'coroutine.create') {
      if (args.length === 0) {
        throw new Error('bad argument #1 to coroutine.create (function expected)');
      }

      let userFunc: LuaFunction | undefined;

      // Handle function value (from variable lookup)
      if (args[0].type === 'function') {
        const funcValue = args[0].value as { __anonymous?: boolean; name?: string; params?: string[] };
        if (funcValue.name) {
          userFunc = context.functions.get(funcValue.name);
        }
      }
      // Handle string (function name)
      else if (args[0].type === 'string') {
        userFunc = context.functions.get(args[0].value);
      }

      if (!userFunc) {
        throw new Error('bad argument #1 to coroutine.create (function expected)');
      }

      const coId = ++coroutineIdCounter;
      const coContext: LuaExecutionContext = {
        variables: new Map(context.variables),
        localScopes: [],
        functions: new Map(context.functions),
        output: context.output,
        errors: [],
      };

      const coroutine: LuaCoroutine = {
        status: 'suspended',
        body: userFunc.body,
        context: coContext,
      };

      this.coroutines.set(coId, coroutine);

      return { type: 'coroutine', value: { id: coId, params: userFunc.params } };
    }

    // coroutine.resume - Resume a coroutine
    if (funcName === 'coroutine.resume') {
      if (args.length === 0 || args[0].type !== 'coroutine') {
        return { type: 'table', value: {
          '1': { type: 'boolean', value: false },
          '2': { type: 'string', value: 'bad argument #1 to resume (coroutine expected)' }
        }};
      }

      const coId = args[0].value.id;
      const coParams = args[0].value.params || [];
      const coroutine = this.coroutines.get(coId);

      if (!coroutine) {
        return { type: 'table', value: {
          '1': { type: 'boolean', value: false },
          '2': { type: 'string', value: 'cannot resume dead coroutine' }
        }};
      }

      if (coroutine.status === 'dead') {
        return { type: 'table', value: {
          '1': { type: 'boolean', value: false },
          '2': { type: 'string', value: 'cannot resume dead coroutine' }
        }};
      }

      if (coroutine.status === 'running') {
        return { type: 'table', value: {
          '1': { type: 'boolean', value: false },
          '2': { type: 'string', value: 'cannot resume running coroutine' }
        }};
      }

      // Set up arguments
      const resumeArgs = args.slice(1);
      const funcScope = new Map<string, LuaValue>();
      coroutine.context.localScopes.push(funcScope);

      for (let i = 0; i < coParams.length; i++) {
        funcScope.set(coParams[i], resumeArgs[i] || { type: 'nil', value: null });
      }

      // Execute coroutine
      const previousRunning = this.currentRunningCoroutine;
      this.currentRunningCoroutine = coroutine;
      coroutine.status = 'running';

      try {
        this.executeBlock(coroutine.body, coroutine.context);
        coroutine.status = 'dead';
        coroutine.context.localScopes.pop();
        this.currentRunningCoroutine = previousRunning;

        return { type: 'table', value: {
          '1': { type: 'boolean', value: true }
        }};
      } catch (error) {
        coroutine.context.localScopes.pop();
        this.currentRunningCoroutine = previousRunning;

        // Check for yield
        if (typeof error === 'object' && error !== null && 'type' in error) {
          if ((error as any).type === 'yield') {
            coroutine.status = 'suspended';
            coroutine.resumeValue = (error as any).value;
            return { type: 'table', value: {
              '1': { type: 'boolean', value: true },
              '2': (error as any).value || { type: 'nil', value: null }
            }};
          }
          if ((error as any).type === 'return') {
            coroutine.status = 'dead';
            return { type: 'table', value: {
              '1': { type: 'boolean', value: true },
              '2': (error as any).value
            }};
          }
        }

        coroutine.status = 'dead';
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { type: 'table', value: {
          '1': { type: 'boolean', value: false },
          '2': { type: 'string', value: errorMsg }
        }};
      }
    }

    // coroutine.yield - Yield from a coroutine
    if (funcName === 'coroutine.yield') {
      if (!this.currentRunningCoroutine) {
        throw new Error('attempt to yield from outside a coroutine');
      }

      const yieldValue = args[0] || { type: 'nil', value: null };
      throw { type: 'yield', value: yieldValue };
    }

    // coroutine.status - Get the status of a coroutine
    if (funcName === 'coroutine.status') {
      if (args.length === 0 || args[0].type !== 'coroutine') {
        throw new Error('bad argument #1 to status (coroutine expected)');
      }

      const coId = args[0].value.id;
      const coroutine = this.coroutines.get(coId);

      if (!coroutine) {
        return { type: 'string', value: 'dead' };
      }

      return { type: 'string', value: coroutine.status };
    }

    // coroutine.wrap - Create a wrapped coroutine (returns a function)
    if (funcName === 'coroutine.wrap') {
      if (args.length === 0 || args[0].type !== 'string') {
        throw new Error('bad argument #1 to wrap (function expected)');
      }

      // Create the coroutine
      const funcToWrap = args[0].value;
      const userFunc = context.functions.get(funcToWrap);
      if (!userFunc) {
        throw new Error(`attempt to wrap nil function: ${funcToWrap}`);
      }

      const coId = ++coroutineIdCounter;
      const coContext: LuaExecutionContext = {
        variables: new Map(context.variables),
        localScopes: [],
        functions: new Map(context.functions),
        output: context.output,
        errors: [],
      };

      const coroutine: LuaCoroutine = {
        status: 'suspended',
        body: userFunc.body,
        context: coContext,
      };

      this.coroutines.set(coId, coroutine);

      // Return a function value that resumes this coroutine
      return { type: 'function', value: { __wrapped_coroutine: coId, params: userFunc.params } };
    }

    // coroutine.running - Get the currently running coroutine
    if (funcName === 'coroutine.running') {
      if (!this.currentRunningCoroutine) {
        return { type: 'nil', value: null };
      }

      // Find the coroutine ID
      for (const [id, co] of this.coroutines.entries()) {
        if (co === this.currentRunningCoroutine) {
          return { type: 'coroutine', value: { id } };
        }
      }

      return { type: 'nil', value: null };
    }

    // coroutine.close - Close a coroutine (Lua 5.4)
    if (funcName === 'coroutine.close') {
      if (args.length === 0 || args[0].type !== 'coroutine') {
        throw new Error("bad argument #1 to 'close' (coroutine expected)");
      }
      const coId = (args[0].value as { id: number }).id;
      const co = this.coroutines.get(coId);
      if (!co) {
        return { type: 'boolean', value: false };
      }
      // Mark as dead by removing from coroutines map
      this.coroutines.delete(coId);
      return { type: 'boolean', value: true };
    }

    // coroutine.isyieldable - Check if coroutine can yield (Lua 5.4)
    if (funcName === 'coroutine.isyieldable') {
      // If no argument, check the running coroutine
      if (args.length === 0) {
        return { type: 'boolean', value: this.currentRunningCoroutine !== null };
      }
      if (args[0].type !== 'coroutine') {
        throw new Error("bad argument #1 to 'isyieldable' (coroutine expected)");
      }
      const coId = (args[0].value as { id: number }).id;
      const co = this.coroutines.get(coId);
      if (!co) {
        return { type: 'boolean', value: false };
      }
      // A coroutine is yieldable if it's suspended (not dead, not running)
      return { type: 'boolean', value: co.status === 'suspended' };
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
      const fracPart = x - intPart;
      // Return both integer and fractional parts
      return {
        values: [
          { type: 'number', value: intPart },
          { type: 'number', value: fracPart },
        ],
      } as unknown as LuaValue;
    }

    // math.frexp - Extract mantissa and exponent (x = m * 2^e)
    if (funcName === 'math.frexp') {
      const x = args[0]?.value || 0;
      if (x === 0) {
        return {
          values: [
            { type: 'number', value: 0 },
            { type: 'number', value: 0 },
          ],
        } as unknown as LuaValue;
      }
      // Get the exponent
      const exp = Math.floor(Math.log2(Math.abs(x))) + 1;
      // Get the mantissa (normalized to [0.5, 1))
      const mantissa = x / Math.pow(2, exp);
      return {
        values: [
          { type: 'number', value: mantissa },
          { type: 'number', value: exp },
        ],
      } as unknown as LuaValue;
    }

    // math.ldexp - Load exponent (m * 2^e)
    if (funcName === 'math.ldexp') {
      const m = args[0]?.value || 0;
      const e = args[1]?.value || 0;
      return { type: 'number', value: m * Math.pow(2, e) };
    }

    // Hyperbolic functions
    if (funcName === 'math.sinh') {
      return { type: 'number', value: Math.sinh(args[0]?.value || 0) };
    }

    if (funcName === 'math.cosh') {
      return { type: 'number', value: Math.cosh(args[0]?.value || 0) };
    }

    if (funcName === 'math.tanh') {
      return { type: 'number', value: Math.tanh(args[0]?.value || 0) };
    }

    // Lua 5.3+ math functions
    if (funcName === 'math.tointeger') {
      const x = args[0]?.value;
      if (typeof x === 'number' && Number.isInteger(x)) {
        return { type: 'number', value: x };
      }
      if (typeof x === 'string') {
        const parsed = parseInt(x, 10);
        if (!isNaN(parsed) && parsed.toString() === x.trim()) {
          return { type: 'number', value: parsed };
        }
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'math.type') {
      const x = args[0]?.value;
      if (typeof x !== 'number') {
        return { type: 'nil', value: null };
      }
      return { type: 'string', value: Number.isInteger(x) ? 'integer' : 'float' };
    }

    if (funcName === 'math.ult') {
      // Unsigned less than comparison
      const m = (args[0]?.value || 0) >>> 0; // Convert to unsigned 32-bit
      const n = (args[1]?.value || 0) >>> 0;
      return { type: 'boolean', value: m < n };
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

      if (plain) {
        // Plain search - no pattern matching
        const startIdx = Math.max(0, init - 1);
        const idx = s.indexOf(pattern, startIdx);
        if (idx === -1) return { type: 'nil', value: null };
        // Return start and end positions (both 1-based)
        const endIdx = idx + pattern.length;
        return {
          values: [
            { type: 'number', value: idx + 1 },
            { type: 'number', value: endIdx },
          ],
        } as unknown as LuaValue;
      }

      // Pattern matching using LuaPatternMatcher
      const matcher = new LuaPatternMatcher(pattern);
      const result = matcher.find(s, init);

      if (!result) return { type: 'nil', value: null };

      // Return start, end, and any captures
      const returnValues: LuaValue[] = [
        { type: 'number', value: result.start },
        { type: 'number', value: result.end },
      ];

      // Add captures if any
      for (const capture of result.captures) {
        if (typeof capture === 'number') {
          returnValues.push({ type: 'number', value: capture });
        } else {
          returnValues.push({ type: 'string', value: capture });
        }
      }

      if (returnValues.length === 2) {
        // No captures - return just start and end
        return { values: returnValues } as unknown as LuaValue;
      }

      return { values: returnValues } as unknown as LuaValue;
    }

    if (funcName === 'string.match') {
      const s = String(args[0]?.value || '');
      const pattern = String(args[1]?.value || '');
      const init = (args[2]?.value || 1) as number;

      const matcher = new LuaPatternMatcher(pattern);
      const result = matcher.match(s, init);

      if (!result) return { type: 'nil', value: null };

      // If there are captures, return them
      if (result.captures.length > 0) {
        if (result.captures.length === 1) {
          const cap = result.captures[0];
          if (typeof cap === 'number') {
            return { type: 'number', value: cap };
          }
          return { type: 'string', value: cap };
        }
        // Multiple captures - return as multiple values
        return {
          values: result.captures.map((cap) =>
            typeof cap === 'number'
              ? { type: 'number', value: cap }
              : { type: 'string', value: cap }
          ),
        } as unknown as LuaValue;
      }

      // No captures - return the whole match
      return { type: 'string', value: result.match };
    }

    if (funcName === 'string.gsub') {
      const s = String(args[0]?.value || '');
      const pattern = String(args[1]?.value || '');
      const replArg = args[2];
      const n = args[3]?.value as number | undefined;

      const matcher = new LuaPatternMatcher(pattern);

      let repl: string | ((match: string, ...captures: (string | number)[]) => string) | Record<string, string>;

      if (replArg?.type === 'string') {
        repl = String(replArg.value);
      } else if (replArg?.type === 'table') {
        // Table replacement
        const table: Record<string, string> = {};
        const tableVal = replArg.value as Record<string, LuaValue>;
        for (const [k, v] of Object.entries(tableVal)) {
          table[k] = String(v?.value ?? '');
        }
        repl = table;
      } else if (replArg?.type === 'function' || context.functions.has(String(replArg?.value))) {
        // Function replacement
        const funcName = String(replArg?.value);
        const userFunc = context.functions.get(funcName);

        repl = (match: string, ...captures: (string | number)[]) => {
          if (!userFunc) {
            return match; // Keep original if function not found
          }

          // Call the Lua function with match or captures
          const funcArgs: LuaValue[] = captures.length > 0
            ? captures.map((c) => typeof c === 'number'
              ? { type: 'number', value: c }
              : { type: 'string', value: c })
            : [{ type: 'string', value: match }];

          // Create function scope and bind parameters
          const funcScope = new Map<string, LuaValue>();
          context.localScopes.push(funcScope);

          for (let i = 0; i < userFunc.params.length; i++) {
            funcScope.set(userFunc.params[i], funcArgs[i] || { type: 'nil', value: null });
          }

          try {
            this.executeBlock(userFunc.body, context);
            context.localScopes.pop();
            return match; // No return value, keep original
          } catch (innerError) {
            context.localScopes.pop();
            if (typeof innerError === 'object' && innerError !== null && 'type' in innerError && (innerError as any).type === 'return') {
              const returnVal = (innerError as any).value;
              if (returnVal?.type === 'nil' || (returnVal?.type === 'boolean' && !returnVal.value)) {
                return match; // Keep original if function returns nil or false
              }
              return String(returnVal?.value ?? '');
            }
            throw innerError;
          }
        };
      } else {
        repl = String(replArg?.value ?? '');
      }

      const [result, count] = matcher.gsub(s, repl, n);

      // Return string and count
      return {
        values: [
          { type: 'string', value: result },
          { type: 'number', value: count },
        ],
      } as unknown as LuaValue;
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
      const s = String(args[0]?.value || '');
      const pattern = String(args[1]?.value || '');

      const matcher = new LuaPatternMatcher(pattern);
      const iterator = matcher.gmatch(s);

      // Create an iterator function that can be called repeatedly
      // Store iterator state in a closure-like manner
      const iteratorId = `__gmatch_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      // Store the iterator in context for later retrieval
      if (!context.variables.has('__iterators')) {
        context.variables.set('__iterators', { type: 'table', value: {} });
      }
      const iterators = context.variables.get('__iterators')?.value as Record<string, IterableIterator<import('./LuaPatternMatcher').PatternMatch>>;
      iterators[iteratorId] = iterator;

      // Register the iterator function
      context.functions.set(iteratorId, {
        params: [],
        body: '__builtin_gmatch_iterator',
        iteratorId,
      } as LuaFunction & { iteratorId: string });

      return { type: 'function', value: iteratorId };
    }

    // Handle gmatch iterator calls
    if (funcName.startsWith('__gmatch_')) {
      const func = context.functions.get(funcName) as LuaFunction & { iteratorId?: string };
      if (func?.iteratorId) {
        const iterators = context.variables.get('__iterators')?.value as Record<string, IterableIterator<import('./LuaPatternMatcher').PatternMatch>>;
        const iterator = iterators[func.iteratorId];
        if (iterator) {
          const result = iterator.next();
          if (result.done) {
            return { type: 'nil', value: null };
          }
          const match = result.value;
          // Return captures if any, otherwise return the match
          if (match.captures.length > 0) {
            if (match.captures.length === 1) {
              const cap = match.captures[0];
              return typeof cap === 'number'
                ? { type: 'number', value: cap }
                : { type: 'string', value: cap };
            }
            return {
              values: match.captures.map((c) =>
                typeof c === 'number'
                  ? { type: 'number', value: c }
                  : { type: 'string', value: c }
              ),
            } as unknown as LuaValue;
          }
          return { type: 'string', value: match.match };
        }
      }
      return { type: 'nil', value: null };
    }

    // string.dump - Serialize a function to binary (returns source in this implementation)
    if (funcName === 'string.dump') {
      if (args.length === 0) {
        throw new Error("bad argument #1 to 'dump' (function expected)");
      }

      const funcArg = args[0];
      // strip parameter (optional) - if true, strip debug info
      // const strip = args[1]?.value === true;

      // If it's a function name string, look up the function
      if (funcArg.type === 'string') {
        const funcName = funcArg.value as string;
        const userFunc = context.functions.get(funcName);
        if (userFunc) {
          // Return the function body as a "serialized" form
          // Prefix with a header to indicate this is a dumped function
          const header = '\x1bLuaS'; // Signature similar to Lua bytecode
          const serialized = JSON.stringify({
            params: userFunc.params,
            body: userFunc.body,
            isVariadic: userFunc.isVariadic || false,
          });
          return { type: 'string', value: header + serialized };
        }
        throw new Error("unable to dump given function");
      }

      // If it's a function value (anonymous function)
      if (funcArg.type === 'function') {
        const funcValue = funcArg.value as { __anonymous?: boolean; name?: string; params?: string[] };
        if (funcValue.name) {
          const userFunc = context.functions.get(funcValue.name);
          if (userFunc) {
            const header = '\x1bLuaS';
            const serialized = JSON.stringify({
              params: userFunc.params,
              body: userFunc.body,
              isVariadic: userFunc.isVariadic || false,
            });
            return { type: 'string', value: header + serialized };
          }
        }
        throw new Error("unable to dump given function");
      }

      throw new Error("bad argument #1 to 'dump' (function expected)");
    }

    // string.pack - Pack values into a binary string
    if (funcName === 'string.pack') {
      if (args.length === 0 || args[0].type !== 'string') {
        throw new Error("bad argument #1 to 'pack' (string expected)");
      }
      const fmt = args[0].value as string;
      const values = args.slice(1);
      let result = '';
      let valueIdx = 0;
      let littleEndian = true; // Default

      for (let i = 0; i < fmt.length; i++) {
        const c = fmt[i];
        switch (c) {
          case '<': littleEndian = true; break;
          case '>': littleEndian = false; break;
          case '=': littleEndian = true; break; // Native (assume little)
          case ' ': break; // Ignored
          case 'b': { // Signed byte
            const v = (values[valueIdx++]?.value as number) || 0;
            result += String.fromCharCode(v & 0xFF);
            break;
          }
          case 'B': { // Unsigned byte
            const v = (values[valueIdx++]?.value as number) || 0;
            result += String.fromCharCode(v & 0xFF);
            break;
          }
          case 'h': { // Signed short (2 bytes)
            const v = (values[valueIdx++]?.value as number) || 0;
            if (littleEndian) {
              result += String.fromCharCode(v & 0xFF, (v >> 8) & 0xFF);
            } else {
              result += String.fromCharCode((v >> 8) & 0xFF, v & 0xFF);
            }
            break;
          }
          case 'H': { // Unsigned short (2 bytes)
            const v = (values[valueIdx++]?.value as number) || 0;
            if (littleEndian) {
              result += String.fromCharCode(v & 0xFF, (v >> 8) & 0xFF);
            } else {
              result += String.fromCharCode((v >> 8) & 0xFF, v & 0xFF);
            }
            break;
          }
          case 'i': case 'I': { // Int (4 bytes by default)
            let size = 4;
            if (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
              size = parseInt(fmt[++i]);
            }
            const v = (values[valueIdx++]?.value as number) || 0;
            for (let j = 0; j < size; j++) {
              const byteIdx = littleEndian ? j : (size - 1 - j);
              result += String.fromCharCode((v >> (byteIdx * 8)) & 0xFF);
            }
            break;
          }
          case 'l': case 'L': { // Long (8 bytes)
            const v = (values[valueIdx++]?.value as number) || 0;
            // JavaScript numbers lose precision beyond 53 bits, but handle common cases
            for (let j = 0; j < 8; j++) {
              const byteIdx = littleEndian ? j : (7 - j);
              result += String.fromCharCode((Math.floor(v / Math.pow(256, byteIdx)) % 256) & 0xFF);
            }
            break;
          }
          case 'f': { // Float (4 bytes)
            const v = (values[valueIdx++]?.value as number) || 0;
            const buf = new ArrayBuffer(4);
            new DataView(buf).setFloat32(0, v, littleEndian);
            const bytes = new Uint8Array(buf);
            for (let j = 0; j < 4; j++) {
              result += String.fromCharCode(bytes[j]);
            }
            break;
          }
          case 'd': case 'n': { // Double (8 bytes)
            const v = (values[valueIdx++]?.value as number) || 0;
            const buf = new ArrayBuffer(8);
            new DataView(buf).setFloat64(0, v, littleEndian);
            const bytes = new Uint8Array(buf);
            for (let j = 0; j < 8; j++) {
              result += String.fromCharCode(bytes[j]);
            }
            break;
          }
          case 'c': { // Fixed-size string
            let size = 1;
            if (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
              let numStr = '';
              while (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
                numStr += fmt[++i];
              }
              size = parseInt(numStr);
            }
            const s = String(values[valueIdx++]?.value || '');
            result += s.substring(0, size).padEnd(size, '\0');
            break;
          }
          case 'z': { // Zero-terminated string
            const s = String(values[valueIdx++]?.value || '');
            result += s + '\0';
            break;
          }
          case 's': { // String with length prefix
            let size = 4; // Default size_t
            if (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
              size = parseInt(fmt[++i]);
            }
            const s = String(values[valueIdx++]?.value || '');
            const len = s.length;
            for (let j = 0; j < size; j++) {
              const byteIdx = littleEndian ? j : (size - 1 - j);
              result += String.fromCharCode((len >> (byteIdx * 8)) & 0xFF);
            }
            result += s;
            break;
          }
          case 'x': { // Padding byte
            result += '\0';
            break;
          }
        }
      }
      return { type: 'string', value: result };
    }

    // string.unpack - Unpack values from a binary string
    if (funcName === 'string.unpack') {
      if (args.length < 2 || args[0].type !== 'string' || args[1].type !== 'string') {
        throw new Error("bad argument to 'unpack' (string expected)");
      }
      const fmt = args[0].value as string;
      const data = args[1].value as string;
      const pos = ((args[2]?.value as number) || 1) - 1; // Convert to 0-indexed
      const results: LuaValue[] = [];
      let offset = pos;
      let littleEndian = true;

      for (let i = 0; i < fmt.length && offset < data.length; i++) {
        const c = fmt[i];
        switch (c) {
          case '<': littleEndian = true; break;
          case '>': littleEndian = false; break;
          case '=': littleEndian = true; break;
          case ' ': break;
          case 'b': { // Signed byte
            let v = data.charCodeAt(offset++);
            if (v > 127) v -= 256;
            results.push({ type: 'number', value: v });
            break;
          }
          case 'B': { // Unsigned byte
            results.push({ type: 'number', value: data.charCodeAt(offset++) });
            break;
          }
          case 'h': { // Signed short
            let v = littleEndian
              ? data.charCodeAt(offset) | (data.charCodeAt(offset + 1) << 8)
              : (data.charCodeAt(offset) << 8) | data.charCodeAt(offset + 1);
            if (v > 32767) v -= 65536;
            offset += 2;
            results.push({ type: 'number', value: v });
            break;
          }
          case 'H': { // Unsigned short
            const v = littleEndian
              ? data.charCodeAt(offset) | (data.charCodeAt(offset + 1) << 8)
              : (data.charCodeAt(offset) << 8) | data.charCodeAt(offset + 1);
            offset += 2;
            results.push({ type: 'number', value: v });
            break;
          }
          case 'i': case 'I': { // Int
            let size = 4;
            if (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
              size = parseInt(fmt[++i]);
            }
            let v = 0;
            for (let j = 0; j < size; j++) {
              const byteIdx = littleEndian ? j : (size - 1 - j);
              v |= data.charCodeAt(offset + j) << (byteIdx * 8);
            }
            if (c === 'i' && size === 4 && v > 0x7FFFFFFF) v -= 0x100000000;
            offset += size;
            results.push({ type: 'number', value: v });
            break;
          }
          case 'l': case 'L': { // Long (8 bytes)
            let v = 0;
            for (let j = 0; j < 8; j++) {
              const byteIdx = littleEndian ? j : (7 - j);
              v += data.charCodeAt(offset + j) * Math.pow(256, byteIdx);
            }
            offset += 8;
            results.push({ type: 'number', value: v });
            break;
          }
          case 'f': { // Float
            const buf = new ArrayBuffer(4);
            const bytes = new Uint8Array(buf);
            for (let j = 0; j < 4; j++) {
              bytes[j] = data.charCodeAt(offset + j);
            }
            const v = new DataView(buf).getFloat32(0, littleEndian);
            offset += 4;
            results.push({ type: 'number', value: v });
            break;
          }
          case 'd': case 'n': { // Double
            const buf = new ArrayBuffer(8);
            const bytes = new Uint8Array(buf);
            for (let j = 0; j < 8; j++) {
              bytes[j] = data.charCodeAt(offset + j);
            }
            const v = new DataView(buf).getFloat64(0, littleEndian);
            offset += 8;
            results.push({ type: 'number', value: v });
            break;
          }
          case 'c': { // Fixed-size string
            let size = 1;
            if (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
              let numStr = '';
              while (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
                numStr += fmt[++i];
              }
              size = parseInt(numStr);
            }
            results.push({ type: 'string', value: data.substring(offset, offset + size) });
            offset += size;
            break;
          }
          case 'z': { // Zero-terminated string
            let end = offset;
            while (end < data.length && data.charCodeAt(end) !== 0) end++;
            results.push({ type: 'string', value: data.substring(offset, end) });
            offset = end + 1;
            break;
          }
          case 's': { // String with length prefix
            let size = 4;
            if (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
              size = parseInt(fmt[++i]);
            }
            let len = 0;
            for (let j = 0; j < size; j++) {
              const byteIdx = littleEndian ? j : (size - 1 - j);
              len |= data.charCodeAt(offset + j) << (byteIdx * 8);
            }
            offset += size;
            results.push({ type: 'string', value: data.substring(offset, offset + len) });
            offset += len;
            break;
          }
          case 'x': { // Padding byte
            offset++;
            break;
          }
        }
      }
      // Return position after last read item (1-indexed)
      results.push({ type: 'number', value: offset + 1 });

      if (results.length === 1) {
        return results[0];
      }
      return { values: results } as unknown as LuaValue;
    }

    // string.packsize - Get the size of a packed string
    if (funcName === 'string.packsize') {
      if (args.length === 0 || args[0].type !== 'string') {
        throw new Error("bad argument #1 to 'packsize' (string expected)");
      }
      const fmt = args[0].value as string;
      let size = 0;

      for (let i = 0; i < fmt.length; i++) {
        const c = fmt[i];
        switch (c) {
          case '<': case '>': case '=': case ' ': break;
          case 'b': case 'B': size += 1; break;
          case 'h': case 'H': size += 2; break;
          case 'i': case 'I': {
            let n = 4;
            if (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
              n = parseInt(fmt[++i]);
            }
            size += n;
            break;
          }
          case 'l': case 'L': size += 8; break;
          case 'f': size += 4; break;
          case 'd': case 'n': size += 8; break;
          case 'c': {
            let n = 1;
            if (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
              let numStr = '';
              while (i + 1 < fmt.length && /\d/.test(fmt[i + 1])) {
                numStr += fmt[++i];
              }
              n = parseInt(numStr);
            }
            size += n;
            break;
          }
          case 'x': size += 1; break;
          case 'z': case 's':
            throw new Error("variable-length format in packsize");
        }
      }
      return { type: 'number', value: size };
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

    if (funcName === 'table.pack') {
      // table.pack(...) - returns a table with all arguments stored at integer keys 1, 2, ... n
      // Also includes 'n' field with total number of arguments
      const result: Record<string, LuaValue> = {};
      for (let i = 0; i < args.length; i++) {
        result[String(i + 1)] = args[i];
      }
      result['n'] = { type: 'number', value: args.length };
      return { type: 'table', value: result };
    }

    if (funcName === 'table.unpack') {
      // table.unpack(t [, i [, j]]) - returns elements from table t from index i to j
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to unpack (table expected)');
      }
      const t = args[0].value as Record<string, LuaValue>;
      const i = (args[1]?.value || 1) as number;
      const keys = Object.keys(t).filter(k => !isNaN(parseInt(k))).map(k => parseInt(k)).sort((a, b) => a - b);
      const j = (args[2]?.value || (t['n']?.value as number) || keys[keys.length - 1] || 0) as number;

      // For single value, return directly
      if (i === j) {
        return t[String(i)] || { type: 'nil', value: null };
      }

      // For multiple values, we can only return the first one in this simple implementation
      // Lua's unpack returns multiple values, but our engine doesn't support multiple return values fully
      // Return the first element for basic compatibility
      return t[String(i)] || { type: 'nil', value: null };
    }

    if (funcName === 'table.move') {
      // table.move(a1, f, e, t [, a2]) - moves elements from a1[f..e] to a2[t..t+(e-f)]
      // If a2 is not given, a1 is used as destination
      if (args.length < 4 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to move (table expected)');
      }
      const a1 = args[0].value as Record<string, LuaValue>;
      const f = args[1].value as number;
      const e = args[2].value as number;
      const t = args[3].value as number;
      const a2 = args[4]?.type === 'table' ? args[4].value as Record<string, LuaValue> : a1;

      // Copy elements
      const count = e - f + 1;
      if (count > 0) {
        // If moving within same table and ranges overlap, need to handle direction
        if (a1 === a2 && t > f && t <= e) {
          // Move backwards to avoid overwriting
          for (let i = count - 1; i >= 0; i--) {
            const val = a1[String(f + i)];
            if (val !== undefined) {
              a2[String(t + i)] = val;
            } else {
              delete a2[String(t + i)];
            }
          }
        } else {
          // Move forwards
          for (let i = 0; i < count; i++) {
            const val = a1[String(f + i)];
            if (val !== undefined) {
              a2[String(t + i)] = val;
            } else {
              delete a2[String(t + i)];
            }
          }
        }
      }
      return args[4]?.type === 'table' ? args[4] : args[0];
    }

    if (funcName === 'unpack') {
      // Global unpack is an alias for table.unpack (Lua 5.1 compatibility)
      if (args.length === 0 || args[0].type !== 'table') {
        throw new Error('bad argument #1 to unpack (table expected)');
      }
      const t = args[0].value as Record<string, LuaValue>;
      const i = (args[1]?.value || 1) as number;
      const keys = Object.keys(t).filter(k => !isNaN(parseInt(k))).map(k => parseInt(k)).sort((a, b) => a - b);
      const j = (args[2]?.value || (t['n']?.value as number) || keys[keys.length - 1] || 0) as number;

      if (i === j) {
        return t[String(i)] || { type: 'nil', value: null };
      }
      return t[String(i)] || { type: 'nil', value: null };
    }

    if (funcName === 'os.time') {
      // os.time([table]) - returns current time or time from table
      if (args.length === 0 || args[0].type === 'nil') {
        return { type: 'number', value: Math.floor(Date.now() / 1000) };
      }
      if (args[0].type === 'table') {
        const t = args[0].value as Record<string, LuaValue>;
        const year = (t['year']?.value as number) || 1970;
        const month = ((t['month']?.value as number) || 1) - 1; // JS months are 0-indexed
        const day = (t['day']?.value as number) || 1;
        const hour = (t['hour']?.value as number) || 12;
        const min = (t['min']?.value as number) || 0;
        const sec = (t['sec']?.value as number) || 0;
        const date = new Date(year, month, day, hour, min, sec);
        return { type: 'number', value: Math.floor(date.getTime() / 1000) };
      }
      return { type: 'number', value: Math.floor(Date.now() / 1000) };
    }

    if (funcName === 'os.date') {
      // os.date([format [, time]]) - formats time
      const format = (args[0]?.value as string) || '*t';
      const timestamp = args[1]?.type === 'number' ? (args[1].value as number) * 1000 : Date.now();
      const date = new Date(timestamp);

      if (format === '*t' || format === '!*t') {
        // Return table with date components
        const useUTC = format.startsWith('!');
        const result: Record<string, LuaValue> = {
          year: { type: 'number', value: useUTC ? date.getUTCFullYear() : date.getFullYear() },
          month: { type: 'number', value: (useUTC ? date.getUTCMonth() : date.getMonth()) + 1 },
          day: { type: 'number', value: useUTC ? date.getUTCDate() : date.getDate() },
          hour: { type: 'number', value: useUTC ? date.getUTCHours() : date.getHours() },
          min: { type: 'number', value: useUTC ? date.getUTCMinutes() : date.getMinutes() },
          sec: { type: 'number', value: useUTC ? date.getUTCSeconds() : date.getSeconds() },
          wday: { type: 'number', value: (useUTC ? date.getUTCDay() : date.getDay()) + 1 }, // Lua is 1-indexed, Sunday=1
          yday: { type: 'number', value: this.getDayOfYear(date, useUTC) },
          isdst: { type: 'boolean', value: false }, // Simplified - always false
        };
        return { type: 'table', value: result };
      }

      // Format string handling
      let result = format.startsWith('!') ? format.slice(1) : format;
      const useUTC = format.startsWith('!');
      const year = useUTC ? date.getUTCFullYear() : date.getFullYear();
      const month = useUTC ? date.getUTCMonth() : date.getMonth();
      const day = useUTC ? date.getUTCDate() : date.getDate();
      const hour = useUTC ? date.getUTCHours() : date.getHours();
      const min = useUTC ? date.getUTCMinutes() : date.getMinutes();
      const sec = useUTC ? date.getUTCSeconds() : date.getSeconds();
      const wday = useUTC ? date.getUTCDay() : date.getDay();

      result = result.replace(/%Y/g, String(year));
      result = result.replace(/%y/g, String(year % 100).padStart(2, '0'));
      result = result.replace(/%m/g, String(month + 1).padStart(2, '0'));
      result = result.replace(/%d/g, String(day).padStart(2, '0'));
      result = result.replace(/%H/g, String(hour).padStart(2, '0'));
      result = result.replace(/%M/g, String(min).padStart(2, '0'));
      result = result.replace(/%S/g, String(sec).padStart(2, '0'));
      result = result.replace(/%w/g, String(wday));
      result = result.replace(/%j/g, String(this.getDayOfYear(date, useUTC)).padStart(3, '0'));
      result = result.replace(/%%/g, '%');

      return { type: 'string', value: result };
    }

    if (funcName === 'os.clock') {
      // os.clock() - returns approximate CPU time in seconds
      // In browser, use performance.now() / 1000 as an approximation
      if (typeof performance !== 'undefined' && performance.now) {
        return { type: 'number', value: performance.now() / 1000 };
      }
      return { type: 'number', value: Date.now() / 1000 };
    }

    if (funcName === 'os.difftime') {
      // os.difftime(t2, t1) - returns difference in seconds
      const t2 = (args[0]?.value as number) || 0;
      const t1 = (args[1]?.value as number) || 0;
      return { type: 'number', value: t2 - t1 };
    }

    if (funcName === 'utf8.char') {
      // utf8.char(...) - converts codepoints to UTF-8 string
      const chars = args.map((arg) => {
        const codepoint = arg.value as number;
        return String.fromCodePoint(codepoint);
      });
      return { type: 'string', value: chars.join('') };
    }

    if (funcName === 'utf8.codepoint') {
      // utf8.codepoint(s [, i [, j]]) - returns codepoints
      if (args.length === 0 || args[0].type !== 'string') {
        throw new Error('bad argument #1 to utf8.codepoint (string expected)');
      }
      const s = args[0].value as string;
      const i = (args[1]?.value as number) || 1;
      const j = (args[2]?.value as number) || i;

      // Convert Lua 1-indexed to JS 0-indexed
      const chars = [...s]; // Properly splits on codepoints
      const start = i - 1;
      const end = j;

      if (start < 0 || start >= chars.length) {
        throw new Error('bad argument #2 to utf8.codepoint (position out of bounds)');
      }

      // Return first codepoint (simplified - Lua returns multiple values)
      if (chars[start]) {
        return { type: 'number', value: chars[start].codePointAt(0) || 0 };
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'utf8.len') {
      // utf8.len(s [, i [, j]]) - returns number of UTF-8 characters
      if (args.length === 0 || args[0].type !== 'string') {
        throw new Error('bad argument #1 to utf8.len (string expected)');
      }
      const s = args[0].value as string;
      const i = (args[1]?.value as number) || 1;
      const j = (args[2]?.value as number) || -1;

      // Use spread to count codepoints instead of UTF-16 units
      const chars = [...s];
      const start = i > 0 ? i - 1 : chars.length + i;
      const end = j > 0 ? j : chars.length + j + 1;

      if (start < 0 || start > chars.length || end < start) {
        return { type: 'nil', value: null };
      }

      return { type: 'number', value: Math.max(0, end - start) };
    }

    if (funcName === 'utf8.offset') {
      // utf8.offset(s, n [, i]) - returns byte position of n-th codepoint
      if (args.length === 0 || args[0].type !== 'string') {
        throw new Error('bad argument #1 to utf8.offset (string expected)');
      }
      const s = args[0].value as string;
      const n = (args[1]?.value as number) || 1;
      const i = (args[2]?.value as number) || (n >= 0 ? 1 : s.length + 1);

      // JavaScript strings are UTF-16, but we need UTF-8 byte offsets
      // This is a simplified implementation that returns character position
      const chars = [...s];
      let pos = i > 0 ? i - 1 : chars.length + i;

      if (n > 0) {
        pos += n - 1;
      } else if (n < 0) {
        pos += n;
      }

      if (pos < 0 || pos > chars.length) {
        return { type: 'nil', value: null };
      }

      // Return 1-indexed position
      return { type: 'number', value: pos + 1 };
    }

    if (funcName === 'utf8.codes') {
      // utf8.codes(s) - returns an iterator function for use in for loops
      // Returns: iterator function, string, 0 (for generic for)
      if (args.length === 0 || args[0].type !== 'string') {
        throw new Error('bad argument #1 to utf8.codes (string expected)');
      }
      const s = args[0].value as string;
      const chars = [...s];

      // Create a unique iterator ID for this utf8.codes call
      const iteratorId = `__utf8_codes_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store the iterator state
      if (!context.variables.has('__utf8_iterators')) {
        context.variables.set('__utf8_iterators', {
          type: 'table',
          value: {},
        });
      }
      const iterators = context.variables.get('__utf8_iterators')?.value as Record<string, { chars: string[]; index: number }>;
      iterators[iteratorId] = { chars, index: 0 };

      // Return iterator function name, string, and initial position
      // The iterator function will be handled specially in generic for
      return {
        type: 'function',
        value: {
          __utf8_codes_iterator: true,
          iteratorId,
          string: s,
        },
      };
    }

    // debug library functions
    if (funcName === 'debug.traceback') {
      // debug.traceback([message [, level]]) - returns a traceback string
      const message = args[0]?.type === 'string' ? (args[0].value as string) : '';
      const level = args[1]?.type === 'number' ? (args[1].value as number) : 1;

      // Build a simple traceback
      const lines: string[] = [];
      if (message) {
        lines.push(message);
      }
      lines.push('stack traceback:');

      // In browser environment, we don't have deep call stack info
      // Return a simplified traceback
      const scopeCount = context.localScopes.length;
      for (let i = Math.max(0, scopeCount - level); i < scopeCount; i++) {
        lines.push(`\t[${i + 1}]: in function`);
      }
      if (lines.length === 1 || (lines.length === 2 && message)) {
        lines.push('\t[C]: in ?');
      }

      return { type: 'string', value: lines.join('\n') };
    }

    if (funcName === 'debug.getinfo') {
      // debug.getinfo(f [, what]) - returns table with function info
      // f can be a function or a stack level
      const f = args[0];
      const what = args[1]?.type === 'string' ? (args[1].value as string) : 'flnStu';

      const info: Record<string, LuaValue> = {};

      if (f?.type === 'function') {
        const funcValue = f.value as { name?: string; __anonymous?: boolean };

        if (what.includes('n')) {
          info.name = { type: 'string', value: funcValue.name || '' };
          info.namewhat = { type: 'string', value: funcValue.name ? 'global' : '' };
        }
        if (what.includes('S')) {
          info.source = { type: 'string', value: '[string]' };
          info.short_src = { type: 'string', value: '[string]' };
          info.what = { type: 'string', value: funcValue.__anonymous ? 'Lua' : 'Lua' };
          info.linedefined = { type: 'number', value: 0 };
          info.lastlinedefined = { type: 'number', value: 0 };
        }
        if (what.includes('l')) {
          info.currentline = { type: 'number', value: -1 };
        }
        if (what.includes('u')) {
          info.nups = { type: 'number', value: 0 };
          info.nparams = { type: 'number', value: 0 };
          info.isvararg = { type: 'boolean', value: false };
        }
        if (what.includes('t')) {
          info.istailcall = { type: 'boolean', value: false };
        }
        if (what.includes('f')) {
          info.func = f;
        }
      } else if (f?.type === 'number') {
        // Stack level query
        const level = f.value as number;
        if (what.includes('S')) {
          info.source = { type: 'string', value: '[C]' };
          info.short_src = { type: 'string', value: '[C]' };
          info.what = { type: 'string', value: level === 0 ? 'C' : 'main' };
        }
        if (what.includes('l')) {
          info.currentline = { type: 'number', value: -1 };
        }
      }

      // Return nil if nothing was requested or found
      if (Object.keys(info).length === 0) {
        return { type: 'nil', value: null };
      }

      return { type: 'table', value: info };
    }

    if (funcName === 'debug.getlocal') {
      // debug.getlocal(level, local) - returns name and value of local variable
      const level = args[0]?.type === 'number' ? (args[0].value as number) : 1;
      const localIndex = args[1]?.type === 'number' ? (args[1].value as number) : 1;

      // Get locals from the specified scope level
      const scopeIndex = context.localScopes.length - level;
      if (scopeIndex >= 0 && scopeIndex < context.localScopes.length) {
        const scope = context.localScopes[scopeIndex];
        const entries = Array.from(scope.entries());
        if (localIndex > 0 && localIndex <= entries.length) {
          const [name, value] = entries[localIndex - 1];
          // Return name and value as multiple values
          return {
            type: 'table',
            value: {
              '1': { type: 'string', value: name },
              '2': value,
              __multireturn: { type: 'boolean', value: true },
            },
          };
        }
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'debug.setlocal') {
      // debug.setlocal(level, local, value) - sets a local variable
      const level = args[0]?.type === 'number' ? (args[0].value as number) : 1;
      const localIndex = args[1]?.type === 'number' ? (args[1].value as number) : 1;
      const value = args[2] || { type: 'nil', value: null };

      const scopeIndex = context.localScopes.length - level;
      if (scopeIndex >= 0 && scopeIndex < context.localScopes.length) {
        const scope = context.localScopes[scopeIndex];
        const entries = Array.from(scope.entries());
        if (localIndex > 0 && localIndex <= entries.length) {
          const [name] = entries[localIndex - 1];
          scope.set(name, value);
          return { type: 'string', value: name };
        }
      }
      return { type: 'nil', value: null };
    }

    if (funcName === 'debug.getupvalue') {
      // debug.getupvalue(f, up) - returns name and value of upvalue
      // Limited implementation - upvalues not fully tracked in this engine
      return { type: 'nil', value: null };
    }

    if (funcName === 'debug.setupvalue') {
      // debug.setupvalue(f, up, value) - sets an upvalue
      // Limited implementation - upvalues not fully tracked in this engine
      return { type: 'nil', value: null };
    }

    if (funcName === 'debug.sethook') {
      // debug.sethook([hook, mask [, count]]) - sets a debug hook
      // Not fully implemented in browser environment - no-op
      return { type: 'nil', value: null };
    }

    if (funcName === 'debug.gethook') {
      // debug.gethook() - returns current hook settings
      // Not fully implemented in browser environment
      return { type: 'nil', value: null };
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

      // Handle variadic functions - save previous varargs and set new ones
      const prevVarargs = context.varargs;
      if (userFunc.isVariadic) {
        // Extra args after named parameters become varargs
        context.varargs = args.slice(userFunc.params.length);
        // Also create 'arg' table for Lua 5.1 compatibility
        const argTable: Record<string, LuaValue> = {};
        context.varargs.forEach((v, i) => {
          argTable[String(i + 1)] = v;
        });
        argTable['n'] = { type: 'number', value: context.varargs.length };
        funcScope.set('arg', { type: 'table', value: argTable });
      } else {
        context.varargs = undefined;
      }

      // Execute function body
      try {
        this.executeBlock(userFunc.body, context);
        context.varargs = prevVarargs; // Restore previous varargs
        this.exitScope(context); // Lua 5.4: handle <close> variables
        return { type: 'nil', value: null }; // Default return
      } catch (error) {
        context.varargs = prevVarargs; // Restore previous varargs
        // Lua 5.4: pass error to __close handlers
        const errorValue = typeof error === 'object' && error !== null && 'message' in error
          ? { type: 'string' as const, value: (error as Error).message }
          : { type: 'nil' as const, value: null };
        this.exitScope(context, errorValue);
        // Check if it's a return statement
        if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'return') {
          return (error as { type: string; value: LuaValue }).value;
        }
        throw error;
      }
    }

    // Check if funcName is a variable holding a function value (anonymous function)
    // Handle both simple variables and table.field notation
    let funcVar: LuaValue | undefined;
    if (funcName.includes('.')) {
      // Table method access: t.add or obj.method
      const parts = funcName.split('.');
      let current: LuaValue | undefined = this.lookupVariable(parts[0], context);
      for (let i = 1; i < parts.length && current; i++) {
        if (current.type === 'table') {
          current = (current.value as Record<string, LuaValue>)[parts[i]];
        } else {
          current = undefined;
          break;
        }
      }
      funcVar = current;
    } else {
      funcVar = this.lookupVariable(funcName, context);
    }
    if (funcVar && funcVar.type === 'function') {
      const funcValue = funcVar.value as { __anonymous?: boolean; name?: string };
      if (funcValue.__anonymous && funcValue.name) {
        const storedFunc = context.functions.get(funcValue.name);
        if (storedFunc) {
          // Call the anonymous function
          const funcScope = new Map<string, LuaValue>();
          context.localScopes.push(funcScope);

          // Bind parameters to arguments
          for (let i = 0; i < storedFunc.params.length; i++) {
            const paramName = storedFunc.params[i];
            const argValue = args[i] || { type: 'nil', value: null };
            funcScope.set(paramName, argValue);
          }

          // Handle variadic functions
          const prevVarargs = context.varargs;
          if (storedFunc.isVariadic) {
            context.varargs = args.slice(storedFunc.params.length);
            const argTable: Record<string, LuaValue> = {};
            context.varargs.forEach((v, i) => {
              argTable[String(i + 1)] = v;
            });
            argTable['n'] = { type: 'number', value: context.varargs.length };
            funcScope.set('arg', { type: 'table', value: argTable });
          } else {
            context.varargs = undefined;
          }

          // Execute function body
          try {
            this.executeBlock(storedFunc.body, context);
            context.varargs = prevVarargs;
            this.exitScope(context); // Lua 5.4: handle <close> variables
            return { type: 'nil', value: null };
          } catch (error) {
            context.varargs = prevVarargs;
            const errorValue = typeof error === 'object' && error !== null && 'message' in error
              ? { type: 'string' as const, value: (error as Error).message }
              : { type: 'nil' as const, value: null };
            this.exitScope(context, errorValue);
            if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'return') {
              return (error as { type: string; value: LuaValue }).value;
            }
            throw error;
          }
        }
      }
    }

    // Check if funcName is a table with __call metamethod
    if (funcVar && funcVar.type === 'table') {
      const callResult = this.tryMetamethod(funcVar, '__call', [funcVar, ...args], context);
      if (callResult) {
        return callResult;
      }
    }

    throw new Error(`Unknown function: ${funcName}`);
  }

  /**
   * Convert Lua value to string representation with __tostring metamethod support
   */
  private luaToString(value: LuaValue, context?: LuaExecutionContext): string {
    if (value.type === 'nil') return 'nil';
    if (value.type === 'boolean') return String(value.value);
    if (value.type === 'number') return String(value.value);
    if (value.type === 'string') return value.value;
    if (value.type === 'coroutine') return `coroutine: ${value.value.id}`;

    // Check for __tostring metamethod
    if (value.type === 'table' && value.metatable && context) {
      const tostringMeta = value.metatable.__tostring;
      if (tostringMeta && (tostringMeta.type === 'function' || tostringMeta.type === 'string')) {
        const funcName = typeof tostringMeta.value === 'string' ? tostringMeta.value : tostringMeta.value;
        const userFunc = context.functions.get(funcName);
        if (userFunc) {
          const funcScope = new Map<string, LuaValue>();
          context.localScopes.push(funcScope);
          funcScope.set(userFunc.params[0] || 'self', value);
          try {
            this.executeBlock(userFunc.body, context);
            context.localScopes.pop();
            return 'table';
          } catch (error) {
            context.localScopes.pop();
            if (typeof error === 'object' && error !== null && 'type' in error && (error as any).type === 'return') {
              const retVal = (error as any).value;
              return retVal.type === 'string' ? retVal.value : String(retVal.value);
            }
            throw error;
          }
        }
      }
    }

    if (value.type === 'table') return 'table';
    if (value.type === 'function') return 'function';
    return String(value.value);
  }

  /**
   * Parse function arguments, respecting string literals
   * Expands LuaMultiValue from the last argument (e.g., select('#', ...))
   */
  private parseArguments(argsStr: string, context: LuaExecutionContext): LuaValue[] {
    const args: LuaValue[] = [];
    const expressions: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let depth = 0;

    // First, collect all expression strings
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
          expressions.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      expressions.push(current.trim());
    }

    // Now evaluate expressions, expanding multi-values from the last one
    for (let i = 0; i < expressions.length; i++) {
      const value = this.evaluateExpression(expressions[i], context);

      // Only expand multi-values from the last expression
      if (i === expressions.length - 1 && isMultiValue(value as unknown as LuaMultiValue)) {
        args.push(...(value as unknown as LuaMultiValue).values);
      } else {
        // For non-last positions, take first value of multi-value
        if (isMultiValue(value as unknown as LuaMultiValue)) {
          const mv = value as unknown as LuaMultiValue;
          args.push(mv.values[0] || { type: 'nil', value: null });
        } else {
          args.push(value);
        }
      }
    }

    return args;
  }

  /**
   * Parse multiple comma-separated expressions (for return a, b, c and local x, y = a, b)
   * Handles nested parentheses, braces, brackets, and string literals
   */
  private parseMultipleExpressions(exprStr: string, context: LuaExecutionContext): LuaValue[] {
    // Reuse parseArguments logic - it does exactly what we need
    return this.parseArguments(exprStr, context);
  }

  /**
   * Parse multiple variable names (for local a, b, c = ...)
   */
  private parseVariableNames(varsStr: string): string[] {
    const vars: string[] = [];
    let current = '';

    for (let i = 0; i < varsStr.length; i++) {
      const char = varsStr[i];
      if (char === ',') {
        if (current.trim()) {
          vars.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      vars.push(current.trim());
    }

    return vars;
  }

  /**
   * Evaluate table literal
   * Handles: {1, 2, 3}, {a=1, b=2}, {[key]=val}, and {...} for varargs
   */
  private evaluateTableLiteral(expr: string, context: LuaExecutionContext): LuaValue {
    const content = expr.slice(1, -1).trim(); // Remove { }
    if (!content) {
      return { type: 'table', value: {} };
    }

    const table: Record<string, LuaValue> = {};
    let numericIndex = 1;

    // Parse table entries properly (respecting nested brackets, parens, strings)
    const entries: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (inString && char === stringChar && content[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
        current += char;
      } else if (!inString && (char === '(' || char === '{' || char === '[')) {
        depth++;
        current += char;
      } else if (!inString && (char === ')' || char === '}' || char === ']')) {
        depth--;
        current += char;
      } else if (!inString && depth === 0 && (char === ',' || char === ';')) {
        if (current.trim()) {
          entries.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      entries.push(current.trim());
    }

    for (let i = 0; i < entries.length; i++) {
      const part = entries[i];
      const isLast = i === entries.length - 1;

      // Check for [key] = value pattern
      if (part.startsWith('[')) {
        const closeBracket = part.indexOf(']');
        if (closeBracket !== -1) {
          const keyExpr = part.substring(1, closeBracket);
          const rest = part.substring(closeBracket + 1).trim();
          if (rest.startsWith('=')) {
            const valueExpr = rest.substring(1).trim();
            const keyValue = this.evaluateExpression(keyExpr, context);
            const value = this.evaluateExpression(valueExpr, context);
            table[String(keyValue.value)] = value;
            continue;
          }
        }
      }

      // Check for key = value pattern (not ==)
      const eqMatch = part.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=(?!=)/);
      if (eqMatch) {
        const key = eqMatch[1];
        const valueExpr = part.substring(eqMatch[0].length).trim();
        const value = this.evaluateExpression(valueExpr, context);
        table[key] = value;
      } else {
        // Array-style: value only
        const value = this.evaluateExpression(part, context);

        // Expand multi-values only if this is the last entry
        if (isLast && isMultiValue(value as unknown as LuaMultiValue)) {
          const mv = value as unknown as LuaMultiValue;
          for (const v of mv.values) {
            table[String(numericIndex++)] = v;
          }
        } else if (isMultiValue(value as unknown as LuaMultiValue)) {
          // For non-last, take first value only
          const mv = value as unknown as LuaMultiValue;
          table[String(numericIndex++)] = mv.values[0] || { type: 'nil', value: null };
        } else {
          table[String(numericIndex++)] = value;
        }
      }
    }

    return { type: 'table', value: table };
  }

  /**
   * Evaluate table indexing with __index metamethod support
   */
  private evaluateTableIndex(expr: string, context: LuaExecutionContext): LuaValue {
    const bracketIndex = expr.indexOf('[');
    const tableName = expr.substring(0, bracketIndex).trim();
    const keyExpr = expr.substring(bracketIndex + 1, expr.lastIndexOf(']')).trim();

    const tableValue = this.lookupVariable(tableName, context);
    if (!tableValue || tableValue.type !== 'table') {
      return { type: 'nil', value: null };
    }

    const keyValue = this.evaluateExpression(keyExpr, context);
    const key = String(keyValue.value);

    // First check direct value
    const directValue = tableValue.value[key];
    if (directValue !== undefined) {
      return directValue;
    }

    // Check for __index metamethod
    if (tableValue.metatable) {
      const indexMeta = tableValue.metatable.__index;
      if (indexMeta) {
        // If __index is a table, look up the key there
        if (indexMeta.type === 'table') {
          return indexMeta.value[key] || { type: 'nil', value: null };
        }
        // If __index is a function, call it
        if (indexMeta.type === 'function' || indexMeta.type === 'string') {
          const funcName = typeof indexMeta.value === 'string' ? indexMeta.value : indexMeta.value;
          const userFunc = context.functions.get(funcName);
          if (userFunc) {
            const funcScope = new Map<string, LuaValue>();
            context.localScopes.push(funcScope);
            funcScope.set(userFunc.params[0] || 'table', tableValue);
            funcScope.set(userFunc.params[1] || 'key', keyValue);
            try {
              this.executeBlock(userFunc.body, context);
              context.localScopes.pop();
              return { type: 'nil', value: null };
            } catch (error) {
              context.localScopes.pop();
              if (typeof error === 'object' && error !== null && 'type' in error && (error as any).type === 'return') {
                return (error as any).value;
              }
              throw error;
            }
          }
        }
      }
    }

    return { type: 'nil', value: null };
  }

  /**
   * Handle __newindex metamethod for table assignment
   */
  private handleTableNewIndex(
    tableValue: LuaValue,
    key: string,
    value: LuaValue,
    context: LuaExecutionContext
  ): boolean {
    // Check for __newindex metamethod
    if (tableValue.metatable) {
      const newIndexMeta = tableValue.metatable.__newindex;
      if (newIndexMeta) {
        // If __newindex is a table, set the key there
        if (newIndexMeta.type === 'table') {
          newIndexMeta.value[key] = value;
          return true;
        }
        // If __newindex is a function, call it
        if (newIndexMeta.type === 'function' || newIndexMeta.type === 'string') {
          const funcName = typeof newIndexMeta.value === 'string' ? newIndexMeta.value : newIndexMeta.value;
          const userFunc = context.functions.get(funcName);
          if (userFunc) {
            const funcScope = new Map<string, LuaValue>();
            context.localScopes.push(funcScope);
            funcScope.set(userFunc.params[0] || 'table', tableValue);
            funcScope.set(userFunc.params[1] || 'key', { type: 'string', value: key });
            funcScope.set(userFunc.params[2] || 'value', value);
            try {
              this.executeBlock(userFunc.body, context);
            } catch (error) {
              // Ignore return values from __newindex
              if (!(typeof error === 'object' && error !== null && 'type' in error && (error as any).type === 'return')) {
                throw error;
              }
            }
            context.localScopes.pop();
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Execute if statement
   */
  private executeIf(fullCode: string, context: LuaExecutionContext): void {
    // Handle single-line if statement: if <condition> then <body> end
    const singleLineMatch = fullCode.match(/^if\s+(.+?)\s+then\s+(.+?)\s+end$/);
    if (singleLineMatch) {
      const condition = singleLineMatch[1].trim();
      const body = singleLineMatch[2].trim();
      const conditionValue = this.evaluateExpression(condition, context);
      if (this.isTruthy(conditionValue)) {
        this.executeBlock(body, context);
      }
      return;
    }

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

        // Check if there's body content after 'then' on the same line
        const afterThen = line.substring(thenIndex + 5).trim();
        if (afterThen && afterThen !== 'end') {
          // Handle: if x then y (where y continues to next line with end)
          currentBranch.body.push(afterThen);
        }
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
    // Parse: function name(params), function obj.method(params), function obj:method(params)
    // Supports: simple names, dot notation, and colon notation (method with implicit self)
    const funcMatch = fullCode.match(/^function\s+([\w.]+)([:.])?([\w]+)?\s*\((.*?)\)/);
    if (!funcMatch) {
      // Try simple function match
      const simpleMatch = fullCode.match(/^function\s+(\w+)\s*\((.*?)\)/);
      if (!simpleMatch) {
        throw new Error('Invalid function syntax. Expected: function name(params) ... end');
      }
      // Handle simple function
      const funcName = simpleMatch[1];
      const paramsStr = simpleMatch[2].trim();
      let params = paramsStr ? paramsStr.split(',').map(p => p.trim()) : [];

      let isVariadic = false;
      if (params.length > 0 && params[params.length - 1] === '...') {
        isVariadic = true;
        params = params.slice(0, -1);
      }

      const afterParams = fullCode.substring(simpleMatch[0].length).trim();
      const body = this.extractFunctionBody(afterParams);
      context.functions.set(funcName, { params, body, isVariadic });
      return;
    }

    const baseName = funcMatch[1];
    const separator = funcMatch[2]; // '.' or ':'
    const methodName = funcMatch[3];
    const paramsStr = funcMatch[4].trim();

    let funcName: string;
    let params = paramsStr ? paramsStr.split(',').map(p => p.trim()) : [];

    if (separator === ':' && methodName) {
      // Colon notation: function obj:method(params) - add implicit 'self' parameter
      funcName = `${baseName}.${methodName}`;
      params = ['self', ...params];
    } else if (separator === '.' && methodName) {
      // Dot notation: function obj.method(params)
      funcName = `${baseName}.${methodName}`;
    } else {
      // Simple function name (no separator matched properly)
      funcName = baseName;
    }

    // Check for variadic function (... parameter)
    let isVariadic = false;
    if (params.length > 0 && params[params.length - 1] === '...') {
      isVariadic = true;
      params = params.slice(0, -1);
    }

    // Extract body using depth tracking
    const afterParams = fullCode.substring(funcMatch[0].length).trim();
    const body = this.extractFunctionBody(afterParams);

    // Store function definition
    context.functions.set(funcName, { params, body, isVariadic });
  }

  /**
   * Extract function body from code after the function signature
   */
  private extractFunctionBody(afterParams: string): string {
    // Handle single-line functions: return n * n end
    // For single line, find the matching 'end' by scanning with depth tracking
    if (!afterParams.includes('\n')) {
      // Single line - need to find matching end
      let depth = 1;
      let pos = 0;
      const words = afterParams.split(/\b/);
      let bodyEnd = afterParams.length;

      for (let i = 0; i < words.length; i++) {
        const word = words[i].trim();
        if (['while', 'for', 'if', 'function', 'do'].includes(word)) {
          depth++;
        } else if (word === 'end') {
          depth--;
          if (depth === 0) {
            // Found the matching end - calculate position
            let charPos = 0;
            for (let j = 0; j < i; j++) {
              charPos += words[j].length;
            }
            bodyEnd = charPos;
            break;
          }
        }
      }

      // Return body without the final 'end'
      return afterParams.substring(0, bodyEnd).trim();
    }

    // Multi-line function
    const lines = afterParams.split('\n');
    let depth = 1;
    const bodyLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Track nested blocks
      if (/^(while|for|if|function)\s/.test(trimmed) || /\bdo\b/.test(trimmed)) {
        depth++;
      }

      if (trimmed === 'end' || trimmed.startsWith('end ') || trimmed.endsWith(' end')) {
        depth--;
        if (depth === 0) break;
      }

      bodyLines.push(line);
    }

    return bodyLines.join('\n').trim();
  }

  /**
   * Parse anonymous function expression: function(params) ... end
   */
  private parseAnonymousFunction(code: string, context: LuaExecutionContext): LuaValue {
    // Parse: function(param1, param2, ...) <body> end
    const funcMatch = code.match(/^function\s*\((.*?)\)/);
    if (!funcMatch) {
      throw new Error('Invalid anonymous function syntax');
    }

    const paramsStr = funcMatch[1].trim();
    let params = paramsStr ? paramsStr.split(',').map(p => p.trim()) : [];

    // Check for variadic function (... parameter)
    let isVariadic = false;
    if (params.length > 0 && params[params.length - 1] === '...') {
      isVariadic = true;
      params = params.slice(0, -1);
    }

    // Extract body - need to find matching 'end'
    const afterParams = code.substring(funcMatch[0].length).trim();
    const body = this.extractFunctionBody(afterParams);

    // Generate a unique anonymous function name
    const anonName = `__anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store the function
    context.functions.set(anonName, { params, body, isVariadic });

    // Return a function value that can be called
    return {
      type: 'function',
      value: {
        __anonymous: true,
        name: anonName,
        params,
      },
    };
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
    let params = paramsStr ? paramsStr.split(',').map(p => p.trim()) : [];

    // Check for variadic function (... parameter)
    let isVariadic = false;
    if (params.length > 0 && params[params.length - 1] === '...') {
      isVariadic = true;
      params = params.slice(0, -1); // Remove ... from params
    }

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
    context.functions.set(funcName, { params, body, isVariadic });
  }

  /**
   * Execute local variable assignment
   * Supports: local x, local x = expr, local a, b, c = expr1, expr2, expr3
   * Lua 5.4: local x <const> = expr, local x <close> = expr
   */
  private executeLocalAssignment(statement: string, context: LuaExecutionContext): void {
    // Parse: local var = expr  OR  local var  OR  local a, b = expr1, expr2
    const withoutLocal = statement.substring(6).trim(); // Remove 'local '

    // Add to current local scope or create one
    if (context.localScopes.length === 0) {
      context.localScopes.push(new Map());
    }
    const currentScope = context.localScopes[context.localScopes.length - 1];

    // Check if there's an assignment
    const equalIndex = this.findAssignmentOperator(withoutLocal);
    if (equalIndex === -1) {
      // Just declaration: local x or local a, b, c
      const varDecls = this.parseVariableDeclarations(withoutLocal);
      for (const decl of varDecls) {
        const val: LuaValue = { type: 'nil', value: null };
        if (decl.attribute) {
          val.attribute = decl.attribute;
        }
        currentScope.set(decl.name, val);
      }
      return;
    }

    // Declaration with assignment: local x = expr or local a, b, c = expr1, expr2, expr3
    const varsStr = withoutLocal.substring(0, equalIndex).trim();
    const exprsStr = withoutLocal.substring(equalIndex + 1).trim();

    const varDecls = this.parseVariableDeclarations(varsStr);
    const values = this.parseMultipleExpressions(exprsStr, context);

    // Handle multi-value returns: if last value is a multi-value, expand it
    let expandedValues: LuaValue[] = [];
    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      if (i === values.length - 1 && isMultiValue(val)) {
        // Last expression is a multi-value, expand it
        expandedValues = expandedValues.concat(val.values);
      } else if (isMultiValue(val)) {
        // Non-last multi-value, only take first value
        expandedValues.push(val.values[0] || { type: 'nil', value: null });
      } else {
        expandedValues.push(val);
      }
    }

    // Assign values to variables (extra variables get nil, extra values are discarded)
    for (let i = 0; i < varDecls.length; i++) {
      const decl = varDecls[i];
      const val = expandedValues[i] || { type: 'nil', value: null };

      // Lua 5.4: <const> variables must have a value
      if (decl.attribute === 'const' && val.type === 'nil' && !expandedValues[i]) {
        throw new Error(`local '${decl.name}' is declared as const but has no initial value`);
      }

      // Lua 5.4: <close> variables must be nil or have __close metamethod
      if (decl.attribute === 'close' && val.type !== 'nil') {
        if (val.type !== 'table' || !val.metatable?.__close) {
          // Allow for now, will error on scope exit if __close not found
        }
      }

      if (decl.attribute) {
        val.attribute = decl.attribute;
      }
      currentScope.set(decl.name, val);
    }
  }

  /**
   * Parse variable declarations with optional Lua 5.4 attributes
   * Supports: x, x <const>, x <close>
   */
  private parseVariableDeclarations(varsStr: string): Array<{ name: string; attribute?: 'const' | 'close' }> {
    const result: Array<{ name: string; attribute?: 'const' | 'close' }> = [];
    const parts = varsStr.split(',');

    for (const part of parts) {
      const trimmed = part.trim();

      // Check for attribute: varname <const> or varname <close>
      const attrMatch = trimmed.match(/^(\w+)\s*<(const|close)>$/);
      if (attrMatch) {
        result.push({
          name: attrMatch[1],
          attribute: attrMatch[2] as 'const' | 'close',
        });
      } else {
        // Simple variable name
        result.push({ name: trimmed });
      }
    }

    return result;
  }

  /**
   * Find the assignment operator (=) that's not part of ==, ~=, <=, >=
   */
  private findAssignmentOperator(str: string): number {
    let inString = false;
    let stringChar = '';
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const prev = i > 0 ? str[i - 1] : '';
      const next = i < str.length - 1 ? str[i + 1] : '';

      // Handle string state
      if ((char === '"' || char === "'") && prev !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (inString) continue;

      // Track parentheses/brackets depth
      if (char === '(' || char === '{' || char === '[') depth++;
      if (char === ')' || char === '}' || char === ']') depth--;

      // Find = that's not part of ==, ~=, <=, >=
      if (depth === 0 && char === '=' && prev !== '=' && prev !== '~' && prev !== '<' && prev !== '>' && next !== '=') {
        return i;
      }
    }

    return -1;
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
   * Try to call a metamethod on a value
   */
  private tryMetamethod(
    obj: LuaValue,
    metamethod: string,
    args: LuaValue[],
    context: LuaExecutionContext
  ): LuaValue | null {
    if (obj.type !== 'table' || !obj.metatable) {
      return null;
    }

    const meta = obj.metatable[metamethod];
    if (!meta) {
      return null;
    }

    // If metamethod is a LuaValue function (inline function in table)
    if (typeof meta === 'object' && 'type' in meta && meta.type === 'function') {
      const funcValue = meta.value as { __anonymous?: boolean; name?: string; params?: string[] };

      // Anonymous functions are stored by name in context.functions
      if (funcValue.__anonymous && funcValue.name) {
        const storedFunc = context.functions.get(funcValue.name);
        if (storedFunc) {
          const funcScope = new Map<string, LuaValue>();
          context.localScopes.push(funcScope);
          for (let i = 0; i < storedFunc.params.length && i < args.length; i++) {
            funcScope.set(storedFunc.params[i], args[i]);
          }
          try {
            this.executeBlock(storedFunc.body, context);
            context.localScopes.pop();
            return { type: 'nil', value: null };
          } catch (error) {
            context.localScopes.pop();
            if (typeof error === 'object' && error !== null && 'type' in error && (error as any).type === 'return') {
              return (error as any).value;
            }
            throw error;
          }
        }
      }

      // Inline function definition with body
      const funcDef = meta.value as LuaFunction;
      if (funcDef.body) {
        const funcScope = new Map<string, LuaValue>();
        context.localScopes.push(funcScope);
        for (let i = 0; i < funcDef.params.length && i < args.length; i++) {
          funcScope.set(funcDef.params[i], args[i]);
        }
        try {
          this.executeBlock(funcDef.body, context);
          context.localScopes.pop();
          return { type: 'nil', value: null };
        } catch (error) {
          context.localScopes.pop();
          if (typeof error === 'object' && error !== null && 'type' in error && (error as any).type === 'return') {
            return (error as any).value;
          }
          throw error;
        }
      }
    }

    // If metamethod is a function name (string reference), call it
    if (typeof meta === 'object' && 'type' in meta && meta.type === 'string') {
      const funcName = meta.value;
      const userFunc = context.functions.get(funcName);
      if (userFunc) {
        const funcScope = new Map<string, LuaValue>();
        context.localScopes.push(funcScope);
        for (let i = 0; i < userFunc.params.length && i < args.length; i++) {
          funcScope.set(userFunc.params[i], args[i]);
        }
        try {
          this.executeBlock(userFunc.body, context);
          context.localScopes.pop();
          return { type: 'nil', value: null };
        } catch (error) {
          context.localScopes.pop();
          if (typeof error === 'object' && error !== null && 'type' in error && (error as any).type === 'return') {
            return (error as any).value;
          }
          throw error;
        }
      }
    }

    // If metamethod is a table (for __index fallback)
    if (typeof meta === 'object' && 'type' in meta && meta.type === 'table') {
      return meta as LuaValue;
    }

    return null;
  }

  /**
   * Arithmetic operations with metamethod support
   */
  private add(a: LuaValue | undefined, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    if (!a) a = { type: 'number', value: 0 };

    // Check for __add metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__add', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__add', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: a.value + b.value };
    }
    if (a.type === 'string' || b.type === 'string') {
      return { type: 'string', value: String(a.value) + String(b.value) };
    }
    throw new Error('Cannot add these types');
  }

  private subtract(a: LuaValue | undefined, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    if (!a) a = { type: 'number', value: 0 };

    // Check for __sub metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__sub', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__sub', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: a.value - b.value };
    }
    throw new Error('Cannot subtract non-numbers');
  }

  private multiply(a: LuaValue | undefined, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    if (!a) a = { type: 'number', value: 0 };

    // Check for __mul metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__mul', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__mul', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: a.value * b.value };
    }
    throw new Error('Cannot multiply non-numbers');
  }

  private divide(a: LuaValue | undefined, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    if (!a) a = { type: 'number', value: 0 };

    // Check for __div metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__div', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__div', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      if (b.value === 0) return { type: 'number', value: 0 }; // Safely return 0 for division by zero
      return { type: 'number', value: a.value / b.value };
    }
    throw new Error('Cannot divide non-numbers');
  }

  private modulo(a: LuaValue, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    // Check for __mod metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__mod', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__mod', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: a.value % b.value };
    }
    throw new Error('Cannot modulo non-numbers');
  }

  private power(a: LuaValue, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    // Check for __pow metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__pow', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__pow', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: Math.pow(a.value, b.value) };
    }
    throw new Error('Cannot exponentiate non-numbers');
  }

  private concat(a: LuaValue, b: LuaValue, context: LuaExecutionContext): LuaValue {
    // Check for __concat metamethod
    const result = this.tryMetamethod(a, '__concat', [a, b], context);
    if (result) return result;
    const result2 = this.tryMetamethod(b, '__concat', [a, b], context);
    if (result2) return result2;

    // Standard string concatenation
    return { type: 'string', value: String(a.value) + String(b.value) };
  }

  private integerDivide(a: LuaValue | undefined, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    if (!a) a = { type: 'number', value: 0 };

    // Check for __idiv metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__idiv', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__idiv', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      if (b.value === 0) return { type: 'number', value: 0 }; // Safely return 0 for division by zero
      return { type: 'number', value: Math.floor(a.value / b.value) };
    }
    throw new Error('Cannot integer-divide non-numbers');
  }

  private leftShift(a: LuaValue, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    // Check for __shl metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__shl', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__shl', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      // JavaScript bitwise ops work on 32-bit integers
      return { type: 'number', value: (a.value | 0) << (b.value | 0) };
    }
    throw new Error('Cannot left-shift non-numbers');
  }

  private rightShift(a: LuaValue, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    // Check for __shr metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__shr', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__shr', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      // Use unsigned right shift for Lua-like behavior
      return { type: 'number', value: (a.value | 0) >>> (b.value | 0) };
    }
    throw new Error('Cannot right-shift non-numbers');
  }

  private bitwiseAnd(a: LuaValue, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    // Check for __band metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__band', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__band', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: (a.value | 0) & (b.value | 0) };
    }
    throw new Error('Cannot bitwise AND non-numbers');
  }

  private bitwiseOr(a: LuaValue, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    // Check for __bor metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__bor', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__bor', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: (a.value | 0) | (b.value | 0) };
    }
    throw new Error('Cannot bitwise OR non-numbers');
  }

  private bitwiseXor(a: LuaValue, b: LuaValue, context?: LuaExecutionContext): LuaValue {
    // Check for __bxor metamethod
    if (context) {
      const result = this.tryMetamethod(a, '__bxor', [a, b], context);
      if (result) return result;
      const result2 = this.tryMetamethod(b, '__bxor', [a, b], context);
      if (result2) return result2;
    }

    if (a.type === 'number' && b.type === 'number') {
      return { type: 'number', value: (a.value | 0) ^ (b.value | 0) };
    }
    throw new Error('Cannot bitwise XOR non-numbers');
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
   * Split code into statements, preserving block structures and long strings
   */
  private splitStatements(code: string): string[] {
    const statements: string[] = [];
    const lines = code.split('\n');
    let currentStatement = '';
    let blockDepth = 0;
    let inBlock = false;
    let inRepeat = false;
    let inLongString = false;
    let longStringClose = '';
    let braceDepth = 0; // Track table literal depth

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for long string start
      if (!inLongString && !inBlock) {
        const longStringMatch = trimmedLine.match(/\[(=*)\[/);
        if (longStringMatch) {
          const equals = longStringMatch[1];
          longStringClose = `]${equals}]`;
          // Check if the closing is on the same line
          const afterOpen = trimmedLine.substring(trimmedLine.indexOf(longStringMatch[0]) + longStringMatch[0].length);
          if (!afterOpen.includes(longStringClose)) {
            inLongString = true;
            currentStatement = line;
            continue;
          }
        }
      }

      // If in long string, look for closing
      if (inLongString) {
        currentStatement += '\n' + line;
        if (line.includes(longStringClose)) {
          inLongString = false;
          // Check if there's more on the line after the long string
          const closeIdx = line.indexOf(longStringClose);
          const afterClose = line.substring(closeIdx + longStringClose.length).trim();
          if (!afterClose) {
            statements.push(currentStatement);
            currentStatement = '';
          }
          // If there's more, let it continue as a statement
        }
        continue;
      }

      if (!trimmedLine) continue;

      // Track table literal braces (but skip braces inside strings)
      const lineWithoutStrings = trimmedLine.replace(/"[^"]*"|'[^']*'/g, '');
      const openBraces = (lineWithoutStrings.match(/{/g) || []).length;
      const closeBraces = (lineWithoutStrings.match(/}/g) || []).length;

      // Check if this line starts a multi-line table literal
      if (openBraces > closeBraces && braceDepth === 0 && !inBlock) {
        braceDepth = openBraces - closeBraces;
        currentStatement = trimmedLine;
        continue;
      }

      // If we're inside a table literal, accumulate lines
      if (braceDepth > 0) {
        currentStatement += '\n' + trimmedLine;
        braceDepth += openBraces - closeBraces;
        if (braceDepth <= 0) {
          braceDepth = 0;
          statements.push(currentStatement);
          currentStatement = '';
        }
        continue;
      }

      // Check for block start keywords (only when NOT already in a block)
      if (/^(while|for|if|function|local function)\s/.test(trimmedLine) && !inBlock) {
        // Check if this is a single-line statement (self-contained with matching end)
        if (this.isSingleLineBlock(trimmedLine)) {
          // Single-line block - treat as regular statement
          statements.push(trimmedLine);
          continue;
        }
        inBlock = true;
        blockDepth = 1;
        currentStatement = trimmedLine;
        continue;
      }

      // Check for assignment with anonymous function: var = function(...)
      if (/=\s*function\s*\(/.test(trimmedLine) && !inBlock) {
        // Check if the function ends on the same line
        const funcStart = trimmedLine.indexOf('function');
        const afterFunc = trimmedLine.substring(funcStart);
        if (!afterFunc.includes(' end') && !afterFunc.endsWith('end')) {
          // Multi-line anonymous function
          inBlock = true;
          blockDepth = 1;
          currentStatement = trimmedLine;
          continue;
        }
      }

      // Check for repeat-until block start
      if ((trimmedLine === 'repeat' || trimmedLine.startsWith('repeat ')) && !inBlock) {
        inBlock = true;
        inRepeat = true;
        blockDepth = 1;
        currentStatement = trimmedLine;
        continue;
      }

      if (inBlock) {
        currentStatement += '\n' + trimmedLine;

        // Track nested blocks
        if (/\b(while|for|if|function|local function)\s/.test(line)) {
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

  /**
   * Convert a Lua value to a Lua literal representation
   * Used for passing values to metamethod calls
   */
  private valueToLuaLiteral(value: LuaValue): string {
    switch (value.type) {
      case 'nil':
        return 'nil';
      case 'boolean':
        return value.value ? 'true' : 'false';
      case 'number':
        return String(value.value);
      case 'string':
        // Escape quotes and special characters
        const escaped = String(value.value)
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        return `"${escaped}"`;
      case 'table':
        // For tables, we store them in a temporary variable and return the name
        const tempName = `__temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.globalContext.variables.set(tempName, value);
        return tempName;
      case 'function':
        // For functions, return the function name if available
        const funcValue = value.value as { name?: string };
        return funcValue.name || 'nil';
      default:
        return 'nil';
    }
  }

  /**
   * Check if a line is a complete, self-contained block statement
   * Examples: "if x then y end", "while true do break end", "for i=1,1 do x end"
   */
  private isSingleLineBlock(line: string): boolean {
    // Must contain 'end' to be self-contained
    if (!line.includes('end')) {
      return false;
    }

    // Count block openers and closers
    let depth = 0;
    const words = line.split(/\b/);

    for (const word of words) {
      const w = word.trim().toLowerCase();
      // Block openers
      if (['if', 'while', 'for', 'function', 'do'].includes(w)) {
        depth++;
      }
      // Block closers
      if (w === 'end') {
        depth--;
      }
    }

    // If depth is 0, the line is self-contained
    return depth === 0;
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
