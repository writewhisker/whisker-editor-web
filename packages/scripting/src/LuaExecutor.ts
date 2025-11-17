/**
 * Lua Execution Engine
 *
 * Executes Lua scripts in a sandboxed WebAssembly environment using wasmoon.
 * Provides Story API bindings for interacting with game state, passages, and variables.
 */

import { LuaFactory, type LuaEngine } from 'wasmoon';
import type { Story } from '@writewhisker/core-ts';
import type { Passage } from '@writewhisker/core-ts';

/**
 * Execution context for Lua scripts
 */
export interface LuaExecutionContext {
  /** Current story */
  story: Story;

  /** Current passage ID */
  currentPassageId?: string;

  /** Game state variables */
  variables: Record<string, any>;

  /** Execution history */
  history: string[];
}

/**
 * Execution result
 */
export interface LuaExecutionResult {
  /** Success flag */
  success: boolean;

  /** Return value from script */
  value?: any;

  /** Error message if failed */
  error?: string;

  /** Modified variables */
  variables?: Record<string, any>;

  /** Console output */
  output: string[];
}

/**
 * Lua Executor
 *
 * Executes Lua scripts with Story API bindings in a sandboxed environment.
 */
export class LuaExecutor {
  private factory: LuaFactory;
  private engine?: LuaEngine;

  constructor() {
    this.factory = new LuaFactory();
  }

  /**
   * Initialize the Lua engine
   */
  async initialize(): Promise<void> {
    if (this.engine) return;
    this.engine = await this.factory.createEngine();
  }

  /**
   * Execute a Lua script
   */
  async execute(
    script: string,
    context: LuaExecutionContext
  ): Promise<LuaExecutionResult> {
    await this.initialize();

    if (!this.engine) {
      return {
        success: false,
        error: 'Lua engine not initialized',
        output: [],
      };
    }

    const output: string[] = [];

    try {
      // Setup sandbox and Story API
      await this.setupSandbox(this.engine, context, output);

      // Execute the script
      const result = await this.engine.doString(script);

      // Get modified variables
      const variables = await this.extractVariables(this.engine);

      return {
        success: true,
        value: result,
        variables,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        output,
      };
    }
  }

  /**
   * Setup sandbox environment with Story API
   */
  private async setupSandbox(
    engine: LuaEngine,
    context: LuaExecutionContext,
    output: string[]
  ): Promise<void> {
    // Create game_state API
    engine.global.set('game_state', {
      get: (name: string) => {
        return context.variables[name];
      },

      set: (name: string, value: any) => {
        context.variables[name] = value;
      },

      exists: (name: string) => {
        return name in context.variables;
      },

      delete: (name: string) => {
        delete context.variables[name];
      },

      list: () => {
        return Object.keys(context.variables);
      },
    });

    // Create passages API
    engine.global.set('passages', {
      get: (id: string): Passage | null => {
        return context.story.passages.get(id) || null;
      },

      current: (): Passage | null => {
        if (!context.currentPassageId) return null;
        return context.story.passages.get(context.currentPassageId) || null;
      },

      goto: (id: string): void => {
        // This would trigger navigation in the runtime
        context.currentPassageId = id;
        context.history.push(id);
      },

      list: (): Passage[] => {
        return Array.from(context.story.passages.values());
      },

      count: (): number => {
        return context.story.passages.size;
      },
    });

    // Create history API
    engine.global.set('history', {
      length: context.history.length,

      back: (): void => {
        if (context.history.length > 1) {
          context.history.pop();
          context.currentPassageId = context.history[context.history.length - 1];
        }
      },

      get: (index: number): string | null => {
        if (index >= 0 && index < context.history.length) {
          return context.history[index];
        }
        return null;
      },

      list: (): string[] => {
        return [...context.history];
      },

      clear: (): void => {
        context.history = [];
      },
    });

    // Create tags API
    engine.global.set('tags', {
      has: (tag: string): boolean => {
        if (!context.currentPassageId) return false;
        const passage = context.story.passages.get(context.currentPassageId);
        return passage?.tags.includes(tag) || false;
      },

      list: (): string[] => {
        if (!context.currentPassageId) return [];
        const passage = context.story.passages.get(context.currentPassageId);
        return passage?.tags || [];
      },
    });

    // Override print function to capture output
    engine.global.set('print', (...args: any[]) => {
      const message = args.map(arg => String(arg)).join('\t');
      output.push(message);
    });

    // Helper functions
    engine.global.set('random', (min: number, max: number): number => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    });

    engine.global.set('choice', (arr: any[]): any => {
      if (!Array.isArray(arr) || arr.length === 0) return null;
      return arr[Math.floor(Math.random() * arr.length)];
    });

    engine.global.set('format', (template: string, ...args: any[]): string => {
      return template.replace(/{(\d+)}/g, (match, index) => {
        return typeof args[index] !== 'undefined' ? String(args[index]) : match;
      });
    });

    // Initialize variables in Lua global space
    for (const [key, value] of Object.entries(context.variables)) {
      engine.global.set(key, value);
    }
  }

  /**
   * Extract modified variables from Lua global space
   */
  private async extractVariables(engine: LuaEngine): Promise<Record<string, any>> {
    const variables: Record<string, any> = {};

    // Get all global variables (this is a simplified version)
    // In production, you'd want to track which variables were explicitly set
    try {
      const globals = engine.global;
      // Note: wasmoon doesn't provide easy enumeration of globals
      // You might need to maintain a list of known variables
      return variables;
    } catch (error) {
      console.error('Error extracting variables:', error);
      return variables;
    }
  }

  /**
   * Validate Lua syntax without executing
   */
  async validate(script: string): Promise<{ valid: boolean; error?: string }> {
    await this.initialize();

    if (!this.engine) {
      return {
        valid: false,
        error: 'Lua engine not initialized',
      };
    }

    try {
      // Try to load the script without executing
      await this.engine.doString(`return function() ${script} end`);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.engine) {
      this.engine.global.close();
      this.engine = undefined;
    }
  }
}

/**
 * Singleton instance
 */
let luaExecutorInstance: LuaExecutor | null = null;

/**
 * Get the Lua executor instance
 */
export function getLuaExecutor(): LuaExecutor {
  if (!luaExecutorInstance) {
    luaExecutorInstance = new LuaExecutor();
  }
  return luaExecutorInstance;
}
