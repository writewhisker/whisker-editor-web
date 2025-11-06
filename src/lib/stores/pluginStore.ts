import { writable, derived, type Readable } from 'svelte/store';
import { pluginManager } from '../plugins/PluginManager';
import type {
  EditorPlugin,
  PluginRegistryEntry,
  PassageType,
  CustomAction,
  CustomCondition,
} from '../plugins/types';

/**
 * Plugin Store - Svelte integration for the plugin system
 *
 * Provides reactive access to plugin features for components
 */

// Trigger for forcing updates
const pluginTrigger = writable(0);

/**
 * Force a refresh of plugin-derived stores
 */
function refreshPlugins(): void {
  pluginTrigger.update(n => n + 1);
}

// Registered plugins (reactive)
export const registeredPlugins: Readable<EditorPlugin[]> = derived(
  pluginTrigger,
  () => pluginManager.getPlugins()
);

// All plugin entries (including disabled)
export const allPluginEntries: Readable<PluginRegistryEntry[]> = derived(
  pluginTrigger,
  () => pluginManager.getAllPluginEntries()
);

// Custom passage types from all plugins
export const passageTypes: Readable<PassageType[]> = derived(
  pluginTrigger,
  () => pluginManager.getPassageTypes()
);

// Custom actions from all plugins
export const customActions: Readable<CustomAction[]> = derived(
  pluginTrigger,
  () => pluginManager.getActions()
);

// Custom conditions from all plugins
export const customConditions: Readable<CustomCondition[]> = derived(
  pluginTrigger,
  () => pluginManager.getConditions()
);

// Plugin initialization status
export const pluginSystemInitialized: Readable<boolean> = derived(
  pluginTrigger,
  () => pluginManager.isInitialized()
);

/**
 * Plugin Store Actions
 */
export const pluginStoreActions = {
  /**
   * Register a plugin
   */
  async register(plugin: EditorPlugin): Promise<void> {
    await pluginManager.register(plugin);
    refreshPlugins();
  },

  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    await pluginManager.unregister(pluginName);
    refreshPlugins();
  },

  /**
   * Enable/disable a plugin
   */
  setEnabled(pluginName: string, enabled: boolean): void {
    pluginManager.setEnabled(pluginName, enabled);
    refreshPlugins();
  },

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): EditorPlugin | null {
    return pluginManager.getPlugin(name);
  },

  /**
   * Check if a plugin is registered
   */
  hasPlugin(name: string): boolean {
    return pluginManager.hasPlugin(name);
  },

  /**
   * Get UI extensions of a specific type
   */
  getUIExtensions(type: keyof NonNullable<EditorPlugin['ui']>): any[] {
    return pluginManager.getUIExtensions(type);
  },

  /**
   * Execute runtime hook across all plugins
   */
  async executeHook(
    hookName: keyof NonNullable<EditorPlugin['runtime']>,
    ...args: any[]
  ): Promise<void> {
    await pluginManager.executeHook(hookName, ...args);
  },

  /**
   * Initialize the plugin system
   */
  async initialize(): Promise<void> {
    await pluginManager.initialize();
    refreshPlugins();
  },

  /**
   * Manual refresh (for development/debugging)
   */
  refresh(): void {
    refreshPlugins();
  },
};
