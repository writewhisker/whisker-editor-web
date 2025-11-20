/**
 * Whisker Macro System
 *
 * Template engine for Whisker interactive fiction with support for:
 * - Loop macros ({{for}}, {{each}})
 * - Function calls ({{call}})
 * - Variable interpolation ({{var}})
 * - Conditionals ({{if}})
 * - Custom macro registration
 */

// Export types
export type {
  MacroContext,
  MacroFunction,
  MacroParameter,
  CustomMacro,
  MacroArgs,
  MacroResult,
  MacroToken,
  RangeSpec,
  MacroProcessorOptions,
  IMacroRegistry,
  IMacroProcessor,
} from './types';

// Export classes
export { MacroProcessor } from './MacroProcessor';
export { MacroRegistry } from './MacroRegistry';
export { MacroLexer } from './MacroLexer';

// Export built-in macros
export {
  forMacro,
  eachMacro,
  callMacro,
  varMacro,
  ifMacro,
  getBuiltinMacros,
} from './builtins';

// Export convenience functions
import { MacroProcessor } from './MacroProcessor';
import type { MacroContext, MacroResult, MacroProcessorOptions } from './types';

/**
 * Create a new macro processor instance
 */
export function createMacroProcessor(): MacroProcessor {
  return new MacroProcessor();
}

/**
 * Process a template string (convenience function)
 */
export async function processTemplate(
  template: string,
  variables: Record<string, any> = {},
  functions: Record<string, (...args: any[]) => any> = {},
  options?: MacroProcessorOptions
): Promise<MacroResult> {
  const processor = new MacroProcessor();

  const context: MacroContext = {
    variables: new Map(Object.entries(variables)),
    functions: new Map(
      Object.entries(functions).map(([name, fn]) => [
        name,
        { name, execute: fn },
      ])
    ),
    customMacros: new Map(),
  };

  return processor.process(template, context, options);
}
