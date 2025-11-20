/**
 * Built-in Macros
 *
 * Standard macros provided by Whisker:
 * - {{for}} - Numeric for loops
 * - {{each}} - Iteration over collections
 * - {{call}} - Function calls
 * - {{if}} - Conditionals (basic support)
 * - {{var}} - Variable interpolation
 */

import type { CustomMacro, MacroContext, MacroArgs, RangeSpec } from './types';

/**
 * Parse range specification
 * Supports: range(1, 10), range(1, 10, 2)
 */
function parseRange(spec: string): RangeSpec {
  const match = spec.match(/range\s*\(\s*(-?\d+)\s*,\s*(-?\d+)(?:\s*,\s*(-?\d+))?\s*\)/);
  if (!match) {
    throw new Error(`Invalid range specification: ${spec}`);
  }

  return {
    start: parseInt(match[1], 10),
    end: parseInt(match[2], 10),
    step: match[3] ? parseInt(match[3], 10) : 1,
  };
}

/**
 * Parse "for" loop syntax
 * Supports: for i in range(1, 10)
 */
function parseForLoop(args: string): { varName: string; range: RangeSpec } {
  const match = args.match(/^(\w+)\s+in\s+(.+)$/);
  if (!match) {
    throw new Error(`Invalid for loop syntax: ${args}. Expected: "varName in range(start, end)"`);
  }

  const varName = match[1];
  const rangeSpec = match[2].trim();

  return {
    varName,
    range: parseRange(rangeSpec),
  };
}

/**
 * Parse "each" loop syntax
 * Supports: each item in items, each key,value in items
 */
function parseEachLoop(args: string): { varName: string; valueName?: string; collectionName: string } {
  // Try key,value syntax first
  const keyValueMatch = args.match(/^(\w+)\s*,\s*(\w+)\s+in\s+(\w+)$/);
  if (keyValueMatch) {
    return {
      varName: keyValueMatch[1],
      valueName: keyValueMatch[2],
      collectionName: keyValueMatch[3],
    };
  }

  // Try simple syntax
  const simpleMatch = args.match(/^(\w+)\s+in\s+(\w+)$/);
  if (simpleMatch) {
    return {
      varName: simpleMatch[1],
      collectionName: simpleMatch[2],
    };
  }

  throw new Error(`Invalid each loop syntax: ${args}. Expected: "item in items" or "key,value in items"`);
}

/**
 * Parse function call syntax
 * Supports: call functionName(arg1, arg2, ...)
 */
function parseFunctionCall(argsString: string): { functionName: string; args: string[] } {
  const match = argsString.match(/^(\w+)\s*\((.*)\)$/);
  if (!match) {
    // Try without parentheses
    const simpleMatch = argsString.match(/^(\w+)$/);
    if (simpleMatch) {
      return { functionName: simpleMatch[1], args: [] };
    }
    throw new Error(`Invalid function call syntax: ${argsString}. Expected: "functionName(arg1, arg2, ...)"`);
  }

  const functionName = match[1];
  const argsStr = match[2].trim();

  if (!argsStr) {
    return { functionName, args: [] };
  }

  // Parse arguments (simple comma-separated for now)
  const parsedArgs = argsStr.split(',').map(arg => arg.trim());

  return { functionName, args: parsedArgs };
}

/**
 * Evaluate an expression in context
 */
function evaluateExpression(expr: string, context: MacroContext): any {
  expr = expr.trim();

  // Check for string literal
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1);
  }

  // Check for number
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return parseFloat(expr);
  }

  // Check for boolean
  if (expr === 'true') return true;
  if (expr === 'false') return false;
  if (expr === 'null') return null;

  // Check for variable
  if (context.variables.has(expr)) {
    return context.variables.get(expr);
  }

  // Check for property access (e.g., item.name)
  if (expr.includes('.')) {
    const parts = expr.split('.');
    let value: any = context.variables.get(parts[0]);

    for (let i = 1; i < parts.length && value !== undefined; i++) {
      value = value[parts[i]];
    }

    return value;
  }

  throw new Error(`Undefined variable: ${expr}`);
}

/**
 * {{for}} macro - Numeric for loops
 *
 * Syntax: {{for i in range(1, 10)}} ... {{end}}
 */
export const forMacro: CustomMacro = {
  name: 'for',
  type: 'block',
  hasEndBlock: true,
  description: 'Numeric for loop with range',
  expectedArgs: ['varName in range(start, end, step?)'],

  async process(args: MacroArgs, context: MacroContext): Promise<string> {
    const { varName, range } = parseForLoop(args.rawArgs);

    const output: string[] = [];
    const { start, end, step = 1 } = range;

    // Safety check
    const maxIterations = 10000;
    let iterations = 0;

    if (step > 0) {
      for (let i = start; i <= end; i += step) {
        if (iterations++ > maxIterations) {
          throw new Error(`Loop exceeded maximum iterations (${maxIterations})`);
        }

        // Create new scope with loop variable
        const loopContext: MacroContext = {
          variables: new Map(context.variables),
          functions: context.functions,
          customMacros: context.customMacros,
          parent: context,
        };
        loopContext.variables.set(varName, i);

        // Process content with loop context
        // Note: This will be called by the processor
        output.push(args.content || '');
      }
    } else if (step < 0) {
      for (let i = start; i >= end; i += step) {
        if (iterations++ > maxIterations) {
          throw new Error(`Loop exceeded maximum iterations (${maxIterations})`);
        }

        const loopContext: MacroContext = {
          variables: new Map(context.variables),
          functions: context.functions,
          customMacros: context.customMacros,
          parent: context,
        };
        loopContext.variables.set(varName, i);

        output.push(args.content || '');
      }
    }

    return output.join('');
  },
};

/**
 * {{each}} macro - Iterate over collections
 *
 * Syntax: {{each item in items}} ... {{end}}
 * Syntax: {{each key,value in items}} ... {{end}}
 */
export const eachMacro: CustomMacro = {
  name: 'each',
  type: 'block',
  hasEndBlock: true,
  description: 'Iterate over collections (arrays, objects)',
  expectedArgs: ['item in collection', 'key,value in collection'],

  async process(args: MacroArgs, context: MacroContext): Promise<string> {
    const { varName, valueName, collectionName } = parseEachLoop(args.rawArgs);

    const collection = context.variables.get(collectionName);
    if (!collection) {
      throw new Error(`Collection "${collectionName}" not found`);
    }

    const output: string[] = [];
    const maxIterations = 10000;
    let iterations = 0;

    if (Array.isArray(collection)) {
      // Iterate over array
      for (let i = 0; i < collection.length; i++) {
        if (iterations++ > maxIterations) {
          throw new Error(`Loop exceeded maximum iterations (${maxIterations})`);
        }

        const loopContext: MacroContext = {
          variables: new Map(context.variables),
          functions: context.functions,
          customMacros: context.customMacros,
          parent: context,
        };

        if (valueName) {
          // key,value syntax for arrays uses index as key
          loopContext.variables.set(varName, i);
          loopContext.variables.set(valueName, collection[i]);
        } else {
          loopContext.variables.set(varName, collection[i]);
        }

        output.push(args.content || '');
      }
    } else if (typeof collection === 'object') {
      // Iterate over object
      for (const [key, value] of Object.entries(collection)) {
        if (iterations++ > maxIterations) {
          throw new Error(`Loop exceeded maximum iterations (${maxIterations})`);
        }

        const loopContext: MacroContext = {
          variables: new Map(context.variables),
          functions: context.functions,
          customMacros: context.customMacros,
          parent: context,
        };

        if (valueName) {
          loopContext.variables.set(varName, key);
          loopContext.variables.set(valueName, value);
        } else {
          loopContext.variables.set(varName, value);
        }

        output.push(args.content || '');
      }
    } else {
      throw new Error(`"${collectionName}" is not iterable (must be array or object)`);
    }

    return output.join('');
  },
};

/**
 * {{call}} macro - Call registered functions
 *
 * Syntax: {{call functionName(arg1, arg2)}}
 */
export const callMacro: CustomMacro = {
  name: 'call',
  type: 'inline',
  hasEndBlock: false,
  description: 'Call a registered function',
  expectedArgs: ['functionName(arg1, arg2, ...)'],

  async process(args: MacroArgs, context: MacroContext): Promise<string> {
    const { functionName, args: functionArgs } = parseFunctionCall(args.rawArgs);

    const func = context.functions.get(functionName);
    if (!func) {
      throw new Error(`Function "${functionName}" not found`);
    }

    // Evaluate arguments
    const evaluatedArgs = functionArgs.map(arg => evaluateExpression(arg, context));

    // Call function
    const result = await Promise.resolve(func.execute(...evaluatedArgs));

    // Convert result to string
    return result !== undefined && result !== null ? String(result) : '';
  },
};

/**
 * {{var}} macro - Variable interpolation
 *
 * Syntax: {{var variableName}}
 */
export const varMacro: CustomMacro = {
  name: 'var',
  type: 'inline',
  hasEndBlock: false,
  description: 'Insert variable value',
  expectedArgs: ['variableName'],

  async process(args: MacroArgs, context: MacroContext): Promise<string> {
    const varName = args.rawArgs.trim();

    // Support property access (e.g., {{var item.name}})
    const value = evaluateExpression(varName, context);

    return value !== undefined && value !== null ? String(value) : '';
  },
};

/**
 * {{if}} macro - Conditional rendering
 *
 * Syntax: {{if condition}} ... {{end}}
 */
export const ifMacro: CustomMacro = {
  name: 'if',
  type: 'block',
  hasEndBlock: true,
  description: 'Conditional rendering',
  expectedArgs: ['condition'],

  async process(args: MacroArgs, context: MacroContext): Promise<string> {
    const condition = args.rawArgs.trim();

    // Evaluate condition
    let result: boolean;

    try {
      const value = evaluateExpression(condition, context);

      // Truthy check
      result = !!value;
    } catch (error) {
      // If evaluation fails, treat as false
      result = false;
    }

    return result ? (args.content || '') : '';
  },
};

/**
 * Get all built-in macros
 */
export function getBuiltinMacros(): CustomMacro[] {
  return [
    forMacro,
    eachMacro,
    callMacro,
    varMacro,
    ifMacro,
  ];
}
