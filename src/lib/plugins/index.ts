/**
 * Plugin System
 * Central exports for the Whisker plugin architecture
 */

export { PluginManager, pluginManager } from './PluginManager';
export type {
  EditorPlugin,
  PluginRegistryEntry,
  PassageType,
  CustomAction,
  CustomCondition,
  ActionContext,
  ConditionContext,
  PluginUIExtensions,
  PluginRuntimeHooks,
  RuntimeContext,
} from './types';
