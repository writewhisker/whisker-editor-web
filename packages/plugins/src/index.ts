/**
 * @writewhisker/plugins
 * Plugin infrastructure - lifecycle management, hook system, and registry
 */

// Core types
export type {
  Logger,
  PluginState,
  HookMode,
  HookCategory,
  HookEventInfo,
  HookHandler,
  HookEntry,
  HookResult,
  PluginMetadata,
  PluginContext as IPluginContext,
  PluginHooks,
  PluginDefinition,
  StateTransition,
  PluginRegistryConfig,
} from './types';

// Plugin Lifecycle
export {
  PluginLifecycle,
  PluginStateMachine,
  STATES,
  TRANSITIONS,
  TRANSITION_HOOKS,
  isValidState,
  isValidTransition,
  getAllowedTransitions,
  getTransitionHooks,
  isTerminalState,
  isActiveState,
  canDestroy,
  getTransitionPath,
} from './PluginLifecycle';

// Hook Types
export {
  HookTypes,
  MODE,
  STORY,
  PASSAGE,
  CHOICE,
  VARIABLE,
  PERSISTENCE,
  ERROR,
  ALL_EVENTS,
  getAllEvents,
  getMode,
  getCategory,
  isTransformHook,
  isObserverHook,
  isKnownEvent,
  getEventsByCategory,
  getCategories,
} from './HookTypes';

// Hook Manager
export {
  HookManager,
  DEFAULT_PRIORITY,
  MIN_PRIORITY,
  MAX_PRIORITY,
} from './HookManager';
export type { HookScope } from './HookManager';

// Plugin Context
export { PluginContext } from './PluginContext';

// Plugin Registry
export { PluginRegistry } from './PluginRegistry';

// Factory functions
import { HookManager } from './HookManager';
import { PluginContext } from './PluginContext';
import { PluginRegistry } from './PluginRegistry';
import type { PluginMetadata, PluginRegistryConfig, Logger } from './types';

/**
 * Create a hook manager
 */
export function createHookManager(logger?: Logger): HookManager {
  return HookManager.create(logger);
}

/**
 * Create a plugin context
 */
export function createPluginContext(
  metadata: PluginMetadata,
  hookManager: HookManager,
  options?: {
    logger?: Logger;
    apis?: Map<string, unknown>;
    initialConfig?: Record<string, unknown>;
  }
): PluginContext {
  return PluginContext.create(metadata, hookManager, options);
}

/**
 * Create a plugin registry
 */
export function createPluginRegistry(config?: PluginRegistryConfig): PluginRegistry {
  return PluginRegistry.create(config);
}

/**
 * Get the singleton plugin registry instance
 */
export function getPluginRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}

/**
 * Initialize the plugin system with configuration
 */
export function initializePluginSystem(config?: PluginRegistryConfig): PluginRegistry {
  return PluginRegistry.initialize(config);
}

/**
 * Shutdown the plugin system
 */
export async function shutdownPluginSystem(): Promise<void> {
  const registry = PluginRegistry.getInstance();
  await registry.destroyAll();
  PluginRegistry.resetInstance();
}
