/**
 * Plugin Context
 * Provides the runtime environment for plugins
 */

import type {
  PluginContext as IPluginContext,
  PluginMetadata,
  PluginState,
  HookHandler,
  Logger,
} from './types';
import type { HookManager } from './HookManager';

/**
 * Default logger that does nothing
 */
const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Create a prefixed logger for a plugin
 */
function createPluginLogger(name: string, baseLogger?: Logger): Logger {
  const log = baseLogger || nullLogger;
  const prefix = `[Plugin:${name}]`;
  return {
    debug: (msg, ...args) => log.debug(`${prefix} ${msg}`, ...args),
    info: (msg, ...args) => log.info(`${prefix} ${msg}`, ...args),
    warn: (msg, ...args) => log.warn(`${prefix} ${msg}`, ...args),
    error: (msg, ...args) => log.error(`${prefix} ${msg}`, ...args),
  };
}

/**
 * Plugin context implementation
 */
export class PluginContext implements IPluginContext {
  private _metadata: PluginMetadata;
  private _state: PluginState;
  private _hookManager: HookManager;
  private _hookIds: string[] = [];
  private _config: Map<string, unknown> = new Map();
  private _data: Map<string, unknown> = new Map();
  private _apis: Map<string, unknown> = new Map();
  private _log: Logger;

  constructor(
    metadata: PluginMetadata,
    hookManager: HookManager,
    options?: {
      logger?: Logger;
      apis?: Map<string, unknown>;
      initialConfig?: Record<string, unknown>;
    }
  ) {
    this._metadata = metadata;
    this._state = 'discovered';
    this._hookManager = hookManager;
    this._log = createPluginLogger(metadata.name, options?.logger);

    if (options?.apis) {
      this._apis = options.apis;
    }

    if (options?.initialConfig) {
      for (const [key, value] of Object.entries(options.initialConfig)) {
        this._config.set(key, value);
      }
    }
  }

  /**
   * Factory method
   */
  static create(
    metadata: PluginMetadata,
    hookManager: HookManager,
    options?: {
      logger?: Logger;
      apis?: Map<string, unknown>;
      initialConfig?: Record<string, unknown>;
    }
  ): PluginContext {
    return new PluginContext(metadata, hookManager, options);
  }

  /**
   * Get plugin metadata
   */
  get metadata(): PluginMetadata {
    return { ...this._metadata };
  }

  /**
   * Get plugin state
   */
  get state(): PluginState {
    return this._state;
  }

  /**
   * Get logger
   */
  get log(): Logger {
    return this._log;
  }

  /**
   * Update plugin state (internal use)
   */
  _setState(state: PluginState): void {
    this._state = state;
  }

  /**
   * Register a hook
   */
  registerHook(event: string, handler: HookHandler, priority?: number): string {
    const hookId = this._hookManager.registerHook(
      event,
      handler,
      priority ?? this._metadata.priority,
      this._metadata.name
    );
    this._hookIds.push(hookId);
    return hookId;
  }

  /**
   * Unregister a hook
   */
  unregisterHook(hookId: string): boolean {
    const index = this._hookIds.indexOf(hookId);
    if (index >= 0) {
      this._hookIds.splice(index, 1);
    }
    return this._hookManager.unregisterHook(hookId);
  }

  /**
   * Unregister all hooks for this plugin
   */
  unregisterAllHooks(): number {
    let count = 0;
    for (const hookId of this._hookIds) {
      if (this._hookManager.unregisterHook(hookId)) {
        count++;
      }
    }
    this._hookIds = [];
    return count;
  }

  /**
   * Get registered hook IDs
   */
  getRegisteredHooks(): string[] {
    return [...this._hookIds];
  }

  /**
   * Get an API by name
   */
  getApi<T = unknown>(name: string): T | undefined {
    return this._apis.get(name) as T | undefined;
  }

  /**
   * Register an API (internal use)
   */
  _registerApi(name: string, api: unknown): void {
    this._apis.set(name, api);
  }

  /**
   * Get configuration value
   */
  getConfig<T = unknown>(key: string): T | undefined {
    return this._config.get(key) as T | undefined;
  }

  /**
   * Set configuration value
   */
  setConfig<T = unknown>(key: string, value: T): void {
    this._config.set(key, value);
  }

  /**
   * Get all configuration
   */
  getAllConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    for (const [key, value] of this._config.entries()) {
      config[key] = value;
    }
    return config;
  }

  /**
   * Get data value
   */
  getData<T = unknown>(key: string): T | undefined {
    return this._data.get(key) as T | undefined;
  }

  /**
   * Set data value
   */
  setData<T = unknown>(key: string, value: T): void {
    this._data.set(key, value);
  }

  /**
   * Get all data
   */
  getAllData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of this._data.entries()) {
      data[key] = value;
    }
    return data;
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this._data.clear();
  }

  /**
   * Reset context for testing
   */
  reset(): void {
    this.unregisterAllHooks();
    this._config.clear();
    this._data.clear();
    this._state = 'discovered';
  }
}

export default PluginContext;
