import type {
  EditorPlugin,
  PluginRegistryEntry,
  PassageType,
  CustomAction,
  CustomCondition,
} from './types';

/**
 * Plugin Manager - Central registry for all editor plugins
 *
 * Manages plugin lifecycle, registration, and provides access to plugin features
 */
export class PluginManager {
  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private initialized = false;

  /**
   * Register a plugin
   */
  async register(plugin: EditorPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered`);
      return;
    }

    console.log(`Registering plugin: ${plugin.name} v${plugin.version}`);

    const entry: PluginRegistryEntry = {
      plugin,
      enabled: true,
      registeredAt: new Date(),
    };

    this.plugins.set(plugin.name, entry);

    // Call plugin's onRegister hook
    if (plugin.onRegister) {
      await plugin.onRegister();
    }

    console.log(`Plugin "${plugin.name}" registered successfully`);
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      console.warn(`Plugin "${pluginName}" is not registered`);
      return;
    }

    // Call plugin's onUnregister hook
    if (entry.plugin.onUnregister) {
      await entry.plugin.onUnregister();
    }

    this.plugins.delete(pluginName);
    console.log(`Plugin "${pluginName}" unregistered`);
  }

  /**
   * Enable/disable a plugin
   */
  setEnabled(pluginName: string, enabled: boolean): void {
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      console.warn(`Plugin "${pluginName}" is not registered`);
      return;
    }

    entry.enabled = enabled;
    console.log(`Plugin "${pluginName}" ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): EditorPlugin[] {
    return Array.from(this.plugins.values())
      .filter(entry => entry.enabled)
      .map(entry => entry.plugin);
  }

  /**
   * Get all plugin entries (including disabled ones)
   */
  getAllPluginEntries(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): EditorPlugin | null {
    const entry = this.plugins.get(name);
    return entry?.enabled ? entry.plugin : null;
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get all passage types from all plugins
   */
  getPassageTypes(): PassageType[] {
    const types: PassageType[] = [];
    for (const plugin of this.getPlugins()) {
      if (plugin.nodeTypes) {
        types.push(...plugin.nodeTypes);
      }
    }
    return types;
  }

  /**
   * Get all custom actions from all plugins
   */
  getActions(): CustomAction[] {
    const actions: CustomAction[] = [];
    for (const plugin of this.getPlugins()) {
      if (plugin.actions) {
        actions.push(...plugin.actions);
      }
    }
    return actions;
  }

  /**
   * Get all custom conditions from all plugins
   */
  getConditions(): CustomCondition[] {
    const conditions: CustomCondition[] = [];
    for (const plugin of this.getPlugins()) {
      if (plugin.conditions) {
        conditions.push(...plugin.conditions);
      }
    }
    return conditions;
  }

  /**
   * Get UI extensions of a specific type
   */
  getUIExtensions(type: keyof NonNullable<EditorPlugin['ui']>): any[] {
    const extensions: any[] = [];
    for (const plugin of this.getPlugins()) {
      if (plugin.ui?.[type]) {
        extensions.push({
          pluginName: plugin.name,
          component: plugin.ui[type],
        });
      }
    }
    return extensions;
  }

  /**
   * Execute runtime hook across all plugins
   */
  async executeHook(
    hookName: keyof NonNullable<EditorPlugin['runtime']>,
    ...args: any[]
  ): Promise<void> {
    for (const plugin of this.getPlugins()) {
      if (plugin.runtime?.[hookName]) {
        try {
          await (plugin.runtime[hookName] as any)(...args);
        } catch (err) {
          console.error(`Error executing hook "${hookName}" in plugin "${plugin.name}":`, err);
        }
      }
    }
  }

  /**
   * Initialize all plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('PluginManager already initialized');
      return;
    }

    console.log('Initializing PluginManager...');

    // Execute onInit for all plugins
    await this.executeHook('onInit', {
      storyState: {},
      variables: new Map(),
      currentPassage: null,
      history: [],
    });

    this.initialized = true;
    console.log(`PluginManager initialized with ${this.plugins.size} plugins`);
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset plugin manager (for testing)
   */
  reset(): void {
    this.plugins.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const pluginManager = new PluginManager();
