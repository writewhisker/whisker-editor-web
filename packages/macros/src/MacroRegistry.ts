/**
 * Macro Registry
 *
 * Central registry for managing custom macros.
 * Allows plugins to register their own macro handlers.
 */

import type { CustomMacro, IMacroRegistry } from './types';

/**
 * Macro registry implementation
 */
export class MacroRegistry implements IMacroRegistry {
  private macros: Map<string, CustomMacro> = new Map();

  /**
   * Register a custom macro
   */
  register(macro: CustomMacro): void {
    if (!macro.name) {
      throw new Error('Macro must have a name');
    }

    if (!macro.process) {
      throw new Error(`Macro "${macro.name}" must have a process function`);
    }

    if (this.macros.has(macro.name)) {
      throw new Error(`Macro "${macro.name}" is already registered`);
    }

    this.macros.set(macro.name, macro);
  }

  /**
   * Unregister a macro by name
   */
  unregister(name: string): boolean {
    return this.macros.delete(name);
  }

  /**
   * Get a macro by name
   */
  get(name: string): CustomMacro | undefined {
    return this.macros.get(name);
  }

  /**
   * Check if macro is registered
   */
  has(name: string): boolean {
    return this.macros.has(name);
  }

  /**
   * Get all registered macro names
   */
  list(): string[] {
    return Array.from(this.macros.keys());
  }

  /**
   * Clear all registered macros
   */
  clear(): void {
    this.macros.clear();
  }

  /**
   * Get number of registered macros
   */
  get size(): number {
    return this.macros.size;
  }
}
