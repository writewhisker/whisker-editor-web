/**
 * Plugin Registry
 * Central registry for managing plugin lifecycle and registration
 */

import type {
  PluginDefinition,
  PluginMetadata,
  PluginState,
  PluginHooks,
  PluginRegistryConfig,
  Logger,
} from './types';
import { PluginStateMachine, getTransitionHooks } from './PluginLifecycle';
import { HookManager } from './HookManager';
import { PluginContext } from './PluginContext';

/**
 * Registered plugin entry
 */
interface PluginEntry {
  definition: PluginDefinition;
  context: PluginContext;
  stateMachine: PluginStateMachine;
  hookIds: string[];
}

/**
 * PluginRegistry class
 */
export class PluginRegistry {
  private plugins: Map<string, PluginEntry> = new Map();
  private hookManager: HookManager;
  private apis: Map<string, unknown> = new Map();
  private config: PluginRegistryConfig;
  private log?: Logger;

  // Singleton instance
  private static instance: PluginRegistry | undefined;

  constructor(config?: PluginRegistryConfig) {
    this.config = {
      autoInitialize: true,
      autoEnable: true,
      ...config,
    };
    this.log = config?.logger;
    this.hookManager = HookManager.create(this.log);
  }

  /**
   * Factory method
   */
  static create(config?: PluginRegistryConfig): PluginRegistry {
    return new PluginRegistry(config);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Initialize singleton with config
   */
  static initialize(config?: PluginRegistryConfig): PluginRegistry {
    PluginRegistry.instance = new PluginRegistry(config);
    return PluginRegistry.instance;
  }

  /**
   * Reset singleton instance
   */
  static resetInstance(): void {
    if (PluginRegistry.instance) {
      PluginRegistry.instance.destroyAll();
    }
    PluginRegistry.instance = undefined;
  }

  /**
   * Get hook manager
   */
  getHookManager(): HookManager {
    return this.hookManager;
  }

  /**
   * Register a plugin
   */
  async register(definition: PluginDefinition): Promise<{ success: boolean; error?: string }> {
    const name = definition.metadata.name;

    if (this.plugins.has(name)) {
      return { success: false, error: `Plugin already registered: ${name}` };
    }

    // Validate metadata
    if (!name || typeof name !== 'string') {
      return { success: false, error: 'Plugin metadata must have a valid name' };
    }

    // Create state machine
    const stateMachine = PluginStateMachine.create('discovered');

    // Create context
    const context = PluginContext.create(definition.metadata, this.hookManager, {
      logger: this.log,
      apis: this.apis,
      initialConfig: definition.config,
    });

    // Create entry
    const entry: PluginEntry = {
      definition,
      context,
      stateMachine,
      hookIds: [],
    };

    this.plugins.set(name, entry);
    this.log?.info(`Plugin registered: ${name}`);

    // Transition to loaded
    const loadResult = stateMachine.transition('loaded');
    if (!loadResult.success) {
      return { success: false, error: loadResult.error };
    }
    context._setState('loaded');

    // Auto-initialize if configured
    if (this.config.autoInitialize) {
      const initResult = await this.initializePlugin(name);
      if (!initResult.success) {
        return initResult;
      }
    }

    // Auto-enable if configured
    if (this.config.autoEnable) {
      const enableResult = await this.enablePlugin(name);
      if (!enableResult.success) {
        return enableResult;
      }
    }

    return { success: true };
  }

  /**
   * Initialize a plugin
   */
  async initializePlugin(name: string): Promise<{ success: boolean; error?: string }> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return { success: false, error: `Plugin not found: ${name}` };
    }

    const { stateMachine, context, definition } = entry;

    // Check transition is valid
    if (!stateMachine.canTransition('initialized')) {
      return {
        success: false,
        error: `Cannot initialize plugin from state: ${stateMachine.getState()}`,
      };
    }

    try {
      // Execute lifecycle hooks
      const hooks = getTransitionHooks('loaded', 'initialized');
      if (hooks) {
        for (const hookName of hooks) {
          const hookFn = definition.hooks?.[hookName as keyof PluginHooks];
          if (typeof hookFn === 'function') {
            await (hookFn as (ctx: PluginContext) => void | Promise<void>)(context);
          }
        }
      }

      // Transition state
      const result = stateMachine.transition('initialized');
      if (result.success) {
        context._setState('initialized');
        this.log?.info(`Plugin initialized: ${name}`);
      }

      return result;
    } catch (error) {
      stateMachine.transition('error', String(error));
      context._setState('error');
      return { success: false, error: String(error) };
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(name: string): Promise<{ success: boolean; error?: string }> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return { success: false, error: `Plugin not found: ${name}` };
    }

    const { stateMachine, context, definition } = entry;

    // Check transition is valid
    if (!stateMachine.canTransition('enabled')) {
      return {
        success: false,
        error: `Cannot enable plugin from state: ${stateMachine.getState()}`,
      };
    }

    try {
      // Register plugin hooks
      if (definition.hooks) {
        const hookEntries = Object.entries(definition.hooks);
        for (const [event, handler] of hookEntries) {
          if (typeof handler === 'function' && !event.startsWith('on_')) {
            continue; // Skip lifecycle hooks
          }
          if (typeof handler === 'function' && event.startsWith('on_') && !event.startsWith('on_load') && !event.startsWith('on_init') && !event.startsWith('on_enable') && !event.startsWith('on_disable') && !event.startsWith('on_destroy')) {
            const hookId = context.registerHook(event, handler, definition.metadata.priority);
            entry.hookIds.push(hookId);
          }
        }
      }

      // Register APIs
      if (definition.apis) {
        for (const [apiName, api] of Object.entries(definition.apis)) {
          this.registerApi(`${name}.${apiName}`, api);
        }
      }

      // Execute on_enable hook
      const enableHook = definition.hooks?.on_enable;
      if (typeof enableHook === 'function') {
        await enableHook(context);
      }

      // Transition state
      const result = stateMachine.transition('enabled');
      if (result.success) {
        context._setState('enabled');
        this.log?.info(`Plugin enabled: ${name}`);
      }

      return result;
    } catch (error) {
      stateMachine.transition('error', String(error));
      context._setState('error');
      return { success: false, error: String(error) };
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(name: string): Promise<{ success: boolean; error?: string }> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return { success: false, error: `Plugin not found: ${name}` };
    }

    const { stateMachine, context, definition } = entry;

    // Check transition is valid
    if (!stateMachine.canTransition('disabled')) {
      return {
        success: false,
        error: `Cannot disable plugin from state: ${stateMachine.getState()}`,
      };
    }

    try {
      // Execute on_disable hook
      const disableHook = definition.hooks?.on_disable;
      if (typeof disableHook === 'function') {
        await disableHook(context);
      }

      // Unregister hooks
      context.unregisterAllHooks();
      entry.hookIds = [];

      // Transition state
      const result = stateMachine.transition('disabled');
      if (result.success) {
        context._setState('disabled');
        this.log?.info(`Plugin disabled: ${name}`);
      }

      return result;
    } catch (error) {
      stateMachine.transition('error', String(error));
      context._setState('error');
      return { success: false, error: String(error) };
    }
  }

  /**
   * Destroy a plugin
   */
  async destroyPlugin(name: string): Promise<{ success: boolean; error?: string }> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return { success: false, error: `Plugin not found: ${name}` };
    }

    const { stateMachine, context, definition } = entry;
    const currentState = stateMachine.getState();

    // If enabled, disable first
    if (currentState === 'enabled') {
      await this.disablePlugin(name);
    }

    // Check can destroy
    if (!stateMachine.canTransition('destroyed')) {
      return {
        success: false,
        error: `Cannot destroy plugin from state: ${stateMachine.getState()}`,
      };
    }

    try {
      // Execute on_destroy hook
      const destroyHook = definition.hooks?.on_destroy;
      if (typeof destroyHook === 'function') {
        await destroyHook(context);
      }

      // Clean up
      context.reset();

      // Unregister APIs
      if (definition.apis) {
        for (const apiName of Object.keys(definition.apis)) {
          this.unregisterApi(`${name}.${apiName}`);
        }
      }

      // Transition state
      const result = stateMachine.transition('destroyed');
      if (result.success) {
        context._setState('destroyed');
        this.log?.info(`Plugin destroyed: ${name}`);
      }

      // Remove from registry
      this.plugins.delete(name);

      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Destroy all plugins
   */
  async destroyAll(): Promise<void> {
    const names = Array.from(this.plugins.keys());
    for (const name of names) {
      await this.destroyPlugin(name);
    }
  }

  /**
   * Get a plugin entry
   */
  getPlugin(name: string): PluginEntry | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get plugin state
   */
  getPluginState(name: string): PluginState | undefined {
    const entry = this.plugins.get(name);
    return entry?.stateMachine.getState();
  }

  /**
   * Get plugin context
   */
  getPluginContext(name: string): PluginContext | undefined {
    const entry = this.plugins.get(name);
    return entry?.context;
  }

  /**
   * Get all plugin names
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get enabled plugin names
   */
  getEnabledPlugins(): string[] {
    const enabled: string[] = [];
    for (const [name, entry] of this.plugins.entries()) {
      if (entry.stateMachine.isActive()) {
        enabled.push(name);
      }
    }
    return enabled;
  }

  /**
   * Check if plugin exists
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Check if plugin is enabled
   */
  isPluginEnabled(name: string): boolean {
    const entry = this.plugins.get(name);
    return entry?.stateMachine.isActive() ?? false;
  }

  /**
   * Register a global API
   */
  registerApi(name: string, api: unknown): void {
    this.apis.set(name, api);
  }

  /**
   * Unregister a global API
   */
  unregisterApi(name: string): void {
    this.apis.delete(name);
  }

  /**
   * Get a global API
   */
  getApi<T = unknown>(name: string): T | undefined {
    return this.apis.get(name) as T | undefined;
  }

  /**
   * Get all API names
   */
  getApiNames(): string[] {
    return Array.from(this.apis.keys());
  }

  /**
   * Emit a hook event
   */
  emit<T = unknown>(event: string, ...args: unknown[]): { value: T | undefined; results: unknown[] } {
    return this.hookManager.emit<T>(event, ...args);
  }

  /**
   * Reset registry for testing
   */
  reset(): void {
    this.plugins.clear();
    this.apis.clear();
    this.hookManager.reset();
  }
}

export default PluginRegistry;
