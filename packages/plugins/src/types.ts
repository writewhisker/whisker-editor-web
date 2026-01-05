/**
 * Core types for plugin system
 */

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Plugin lifecycle states
 */
export type PluginState =
  | 'discovered'   // Plugin found, metadata extracted
  | 'loaded'       // Plugin module loaded into memory
  | 'initialized'  // on_init hook executed
  | 'enabled'      // on_enable hook executed, actively participating
  | 'disabled'     // on_disable hook executed, temporarily inactive
  | 'destroyed'    // on_destroy hook executed, completely unloaded
  | 'error';       // Plugin encountered error during transition

/**
 * Hook execution modes
 */
export type HookMode = 'observer' | 'transform';

/**
 * Hook categories
 */
export type HookCategory =
  | 'story'
  | 'passage'
  | 'choice'
  | 'variable'
  | 'persistence'
  | 'error'
  | 'custom';

/**
 * Hook event definition
 */
export interface HookEventInfo {
  mode: HookMode;
  category: HookCategory;
}

/**
 * Hook handler function
 */
export type HookHandler = (...args: unknown[]) => unknown;

/**
 * Registered hook entry
 */
export interface HookEntry {
  id: string;
  callback: HookHandler;
  priority: number;
  pluginName?: string;
  registeredAt: number;
}

/**
 * Hook result for each handler
 */
export interface HookResult {
  success: boolean;
  result?: unknown;
  error?: string;
  hookId: string;
  pluginName?: string;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  optionalDependencies?: string[];
  provides?: string[];
  priority?: number;
}

/**
 * Plugin context passed to plugins
 */
export interface PluginContext {
  // Plugin info
  metadata: PluginMetadata;
  state: PluginState;

  // Hook registration
  registerHook(event: string, handler: HookHandler, priority?: number): string;
  unregisterHook(hookId: string): boolean;

  // API access
  getApi<T = unknown>(name: string): T | undefined;

  // Logging
  log: Logger;

  // Configuration
  getConfig<T = unknown>(key: string): T | undefined;
  setConfig<T = unknown>(key: string, value: T): void;

  // Storage
  getData<T = unknown>(key: string): T | undefined;
  setData<T = unknown>(key: string, value: T): void;
}

/**
 * Lifecycle hook function type
 */
export type LifecycleHook = (ctx: PluginContext) => void | Promise<void>;

/**
 * Generic hook function type (for event hooks)
 */
export type EventHookFn = (...args: unknown[]) => unknown;

/**
 * Plugin hooks interface
 */
export interface PluginHooks {
  // Lifecycle hooks
  on_load?: LifecycleHook;
  on_init?: LifecycleHook;
  on_enable?: LifecycleHook;
  on_disable?: LifecycleHook;
  on_destroy?: LifecycleHook;

  // Story hooks
  on_story_start?: EventHookFn;
  on_story_end?: EventHookFn;
  on_story_reset?: EventHookFn;

  // Passage hooks
  on_passage_enter?: EventHookFn;
  on_passage_exit?: EventHookFn;
  on_passage_render?: EventHookFn;

  // Choice hooks
  on_choice_present?: EventHookFn;
  on_choice_select?: EventHookFn;
  on_choice_evaluate?: EventHookFn;

  // Variable hooks
  on_variable_set?: EventHookFn;
  on_variable_get?: EventHookFn;
  on_state_change?: EventHookFn;

  // Persistence hooks
  on_save?: EventHookFn;
  on_load_save?: EventHookFn;
  on_save_list?: EventHookFn;

  // Error hooks
  on_error?: EventHookFn;
}

/**
 * Plugin definition
 */
export interface PluginDefinition {
  metadata: PluginMetadata;
  hooks?: PluginHooks;
  apis?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

/**
 * State transition record
 */
export interface StateTransition {
  from: PluginState;
  to: PluginState;
  timestamp: number;
}

/**
 * Plugin registry configuration
 */
export interface PluginRegistryConfig {
  autoInitialize?: boolean;
  autoEnable?: boolean;
  logger?: Logger;
}
