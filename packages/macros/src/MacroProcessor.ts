/**
 * Macro Processor
 *
 * Main engine for processing templates with macros.
 * Handles tokenization, macro expansion, and rendering.
 */

import type {
  IMacroProcessor,
  IMacroRegistry,
  MacroContext,
  MacroProcessorOptions,
  MacroResult,
  MacroToken,
  MacroArgs,
} from './types';
import { MacroRegistry } from './MacroRegistry';
import { MacroLexer } from './MacroLexer';
import { getBuiltinMacros } from './builtins';

/**
 * Macro processor implementation
 */
export class MacroProcessor implements IMacroProcessor {
  private registry: MacroRegistry;
  private lexer: MacroLexer;

  constructor() {
    this.registry = new MacroRegistry();
    this.lexer = new MacroLexer();

    // Register built-in macros
    for (const macro of getBuiltinMacros()) {
      this.registry.register(macro);
    }
  }

  /**
   * Get the macro registry
   */
  getRegistry(): IMacroRegistry {
    return this.registry;
  }

  /**
   * Process a template string with macros
   */
  async process(
    template: string,
    context: MacroContext,
    options?: MacroProcessorOptions
  ): Promise<MacroResult> {
    const opts = {
      strict: false,
      maxIterations: 10000,
      maxDepth: 100,
      delimiterStart: '{{',
      delimiterEnd: '}}',
      allowUnsafe: false,
      ...options,
    };

    const errors: string[] = [];

    try {
      // Create lexer with custom delimiters if specified
      const lexer = new MacroLexer(opts.delimiterStart, opts.delimiterEnd);

      // Tokenize template
      const tokens = lexer.tokenize(template);

      // Process tokens
      const output = await this.processTokens(tokens, context, opts, 0, errors);

      return {
        success: errors.length === 0,
        output,
        warnings: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      if (opts.strict) {
        throw error;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        output: opts.strict ? undefined : `[Error: ${error instanceof Error ? error.message : String(error)}]`,
      };
    }
  }

  /**
   * Process a list of tokens
   */
  private async processTokens(
    tokens: MacroToken[],
    context: MacroContext,
    options: Required<MacroProcessorOptions>,
    depth: number,
    errors: string[]
  ): Promise<string> {
    if (depth > options.maxDepth) {
      throw new Error(`Maximum nesting depth exceeded (${options.maxDepth})`);
    }

    const output: string[] = [];
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === 'text') {
        // Plain text - add as-is
        output.push(token.text || '');
        i++;
      } else if (token.type === 'macro') {
        // Macro - process it
        const macroName = token.name!;
        const macro = this.registry.get(macroName);

        if (!macro) {
          const errorMsg = `Unknown macro: ${macroName} at line ${token.line}`;
          if (options.strict) {
            throw new Error(errorMsg);
          }
          errors.push(errorMsg);
          output.push(`[Unknown macro: ${macroName}]`);
          i++;
          continue;
        }

        if (macro.hasEndBlock) {
          // Block macro - find matching end
          const endIndex = MacroLexer.findMatchingEnd(tokens, i);
          const content = MacroLexer.extractContent(tokens, i, endIndex);

          // Create macro args
          const macroArgs: MacroArgs = {
            name: macroName,
            rawArgs: token.args || '',
            args: this.parseArgs(token.args || ''),
            content,
          };

          // Process macro
          const result = await this.processMacro(macro.name, macroArgs, context, options, depth);
          output.push(result);

          // Skip to after end token
          i = endIndex + 1;
        } else {
          // Inline macro
          const macroArgs: MacroArgs = {
            name: macroName,
            rawArgs: token.args || '',
            args: this.parseArgs(token.args || ''),
          };

          const result = await this.processMacro(macro.name, macroArgs, context, options, depth);
          output.push(result);

          i++;
        }
      } else if (token.type === 'end') {
        // End token without matching start
        if (options.strict) {
          throw new Error(`Unexpected {{end}} at line ${token.line}`);
        }
        output.push(`[Unexpected {{end}}]`);
        i++;
      }
    }

    return output.join('');
  }

  /**
   * Process a single macro
   */
  private async processMacro(
    macroName: string,
    args: MacroArgs,
    context: MacroContext,
    options: Required<MacroProcessorOptions>,
    depth: number
  ): Promise<string> {
    const macro = this.registry.get(macroName);
    if (!macro) {
      throw new Error(`Macro "${macroName}" not found`);
    }

    // For block macros, we need to process the content recursively
    if (macro.hasEndBlock && args.content) {
      // Special handling for loop macros
      if (macroName === 'for' || macroName === 'each') {
        return await this.processLoopMacro(macroName, args, context, options, depth);
      }

      // For other block macros, process content first
      const processedContent = await this.process(args.content, context, options);
      args.content = processedContent.output || '';
    }

    // Call macro processor
    const result = await macro.process(args, context);
    return result;
  }

  /**
   * Process loop macros with proper context handling
   */
  private async processLoopMacro(
    macroName: string,
    args: MacroArgs,
    context: MacroContext,
    options: Required<MacroProcessorOptions>,
    depth: number
  ): Promise<string> {
    const macro = this.registry.get(macroName)!;

    // Parse loop parameters
    let loopVar: string;
    let loopVar2: string | undefined;
    let collection: any;

    if (macroName === 'for') {
      // Parse: for i in range(1, 10)
      const match = args.rawArgs.match(/^(\w+)\s+in\s+range\s*\((.+)\)$/);
      if (!match) {
        throw new Error(`Invalid for loop syntax: ${args.rawArgs}`);
      }
      loopVar = match[1];

      // Parse range
      const rangeArgs = match[2].split(',').map(s => s.trim());
      const start = parseInt(rangeArgs[0], 10);
      const end = parseInt(rangeArgs[1], 10);
      const step = rangeArgs[2] ? parseInt(rangeArgs[2], 10) : 1;

      // Generate range
      collection = [];
      if (step > 0) {
        for (let i = start; i <= end; i += step) {
          collection.push(i);
        }
      } else if (step < 0) {
        for (let i = start; i >= end; i += step) {
          collection.push(i);
        }
      }
    } else if (macroName === 'each') {
      // Parse: each item in items or each key,value in items
      const keyValueMatch = args.rawArgs.match(/^(\w+)\s*,\s*(\w+)\s+in\s+(\w+)$/);
      const simpleMatch = args.rawArgs.match(/^(\w+)\s+in\s+(\w+)$/);

      if (keyValueMatch) {
        loopVar = keyValueMatch[1];
        loopVar2 = keyValueMatch[2];
        const collectionName = keyValueMatch[3];
        collection = context.variables.get(collectionName);
      } else if (simpleMatch) {
        loopVar = simpleMatch[1];
        const collectionName = simpleMatch[2];
        collection = context.variables.get(collectionName);
      } else {
        throw new Error(`Invalid each loop syntax: ${args.rawArgs}`);
      }

      if (!collection) {
        throw new Error(`Collection not found: ${args.rawArgs}`);
      }
    } else {
      throw new Error(`Unknown loop macro: ${macroName}`);
    }

    // Process loop iterations
    const output: string[] = [];
    const maxIterations = options.maxIterations || 10000;
    let iterations = 0;

    if (Array.isArray(collection)) {
      for (let i = 0; i < collection.length; i++) {
        if (iterations++ > maxIterations) {
          throw new Error(`Loop exceeded maximum iterations (${maxIterations})`);
        }

        // Create new context with loop variable
        const loopContext: MacroContext = {
          variables: new Map(context.variables),
          functions: context.functions,
          customMacros: context.customMacros,
          parent: context,
        };

        if (loopVar2) {
          loopContext.variables.set(loopVar, i);
          loopContext.variables.set(loopVar2, collection[i]);
        } else {
          loopContext.variables.set(loopVar, collection[i]);
        }

        // Process content with loop context
        const iterationResult = await this.process(args.content || '', loopContext, options);
        output.push(iterationResult.output || '');
      }
    } else if (typeof collection === 'object') {
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

        if (loopVar2) {
          loopContext.variables.set(loopVar, key);
          loopContext.variables.set(loopVar2, value);
        } else {
          loopContext.variables.set(loopVar, value);
        }

        const iterationResult = await this.process(args.content || '', loopContext, options);
        output.push(iterationResult.output || '');
      }
    }

    return output.join('');
  }

  /**
   * Parse macro arguments
   */
  private parseArgs(argsStr: string): any[] {
    if (!argsStr.trim()) {
      return [];
    }

    // Simple comma-separated parsing for now
    return argsStr.split(',').map(arg => arg.trim());
  }
}
