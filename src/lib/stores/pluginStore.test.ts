import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  registeredPlugins,
  allPluginEntries,
  passageTypes,
  customActions,
  customConditions,
  pluginSystemInitialized,
  pluginStoreActions,
} from './pluginStore';
import { pluginManager } from '../plugins/PluginManager';
import type { EditorPlugin } from '../plugins/types';

describe('pluginStore', () => {
  beforeEach(() => {
    // Reset plugin manager before each test
    pluginManager.reset();
  });

  describe('reactive stores', () => {
    it('should update registeredPlugins when plugins are registered', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
      };

      // Initially empty
      expect(get(registeredPlugins)).toEqual([]);

      // Register plugin
      await pluginStoreActions.register(plugin);

      // Should now include the plugin
      const plugins = get(registeredPlugins);
      expect(plugins.length).toBe(1);
      expect(plugins[0].name).toBe('test-plugin');
    });

    it('should update when plugins are unregistered', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      await pluginStoreActions.register(plugin);
      expect(get(registeredPlugins).length).toBe(1);

      await pluginStoreActions.unregister('test-plugin');
      expect(get(registeredPlugins).length).toBe(0);
    });

    it('should update when plugins are enabled/disabled', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      await pluginStoreActions.register(plugin);
      expect(get(registeredPlugins).length).toBe(1);

      pluginStoreActions.setEnabled('test-plugin', false);
      expect(get(registeredPlugins).length).toBe(0);

      pluginStoreActions.setEnabled('test-plugin', true);
      expect(get(registeredPlugins).length).toBe(1);
    });
  });

  describe('allPluginEntries', () => {
    it('should include disabled plugins', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      await pluginStoreActions.register(plugin);
      pluginStoreActions.setEnabled('test-plugin', false);

      expect(get(registeredPlugins).length).toBe(0);
      expect(get(allPluginEntries).length).toBe(1);
      expect(get(allPluginEntries)[0].enabled).toBe(false);
    });
  });

  describe('passageTypes', () => {
    it('should aggregate passage types from all plugins', async () => {
      const plugin1: EditorPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        nodeTypes: [{ type: 'item', label: 'Item', icon: '📦', color: '#ff0000' }],
      };

      const plugin2: EditorPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        nodeTypes: [{ type: 'character', label: 'Character', icon: '👤', color: '#00ff00' }],
      };

      await pluginStoreActions.register(plugin1);
      await pluginStoreActions.register(plugin2);

      const types = get(passageTypes);
      expect(types.length).toBe(2);
      expect(types[0].type).toBe('item');
      expect(types[1].type).toBe('character');
    });

    it('should update when plugins with passage types are disabled', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        nodeTypes: [{ type: 'item', label: 'Item', icon: '📦', color: '#ff0000' }],
      };

      await pluginStoreActions.register(plugin);
      expect(get(passageTypes).length).toBe(1);

      pluginStoreActions.setEnabled('test-plugin', false);
      expect(get(passageTypes).length).toBe(0);
    });
  });

  describe('customActions', () => {
    it('should aggregate actions from all plugins', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        actions: [
          {
            type: 'test-action',
            label: 'Test Action',
            execute: async () => {},
          },
        ],
      };

      await pluginStoreActions.register(plugin);

      const actions = get(customActions);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('test-action');
    });
  });

  describe('customConditions', () => {
    it('should aggregate conditions from all plugins', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        conditions: [
          {
            type: 'test-condition',
            label: 'Test Condition',
            evaluate: () => true,
          },
        ],
      };

      await pluginStoreActions.register(plugin);

      const conditions = get(customConditions);
      expect(conditions.length).toBe(1);
      expect(conditions[0].type).toBe('test-condition');
    });
  });

  describe('pluginSystemInitialized', () => {
    it('should track initialization status', async () => {
      expect(get(pluginSystemInitialized)).toBe(false);

      await pluginStoreActions.initialize();

      expect(get(pluginSystemInitialized)).toBe(true);
    });
  });

  describe('pluginStoreActions', () => {
    it('should provide access to plugin by name', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      await pluginStoreActions.register(plugin);

      const retrieved = pluginStoreActions.getPlugin('test-plugin');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-plugin');
    });

    it('should check if plugin exists', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      expect(pluginStoreActions.hasPlugin('test-plugin')).toBe(false);

      await pluginStoreActions.register(plugin);

      expect(pluginStoreActions.hasPlugin('test-plugin')).toBe(true);
    });

    it('should get UI extensions by type', async () => {
      const MockComponent = {} as any;

      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        ui: {
          sidebar: MockComponent,
        },
      };

      await pluginStoreActions.register(plugin);

      const extensions = pluginStoreActions.getUIExtensions('sidebar');
      expect(extensions.length).toBe(1);
      expect(extensions[0].pluginName).toBe('test-plugin');
      expect(extensions[0].component).toBe(MockComponent);
    });

    it('should execute hooks across all plugins', async () => {
      const calls: string[] = [];

      const plugin1: EditorPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        runtime: {
          onStoryLoad: () => {
            calls.push('plugin1');
          },
        },
      };

      const plugin2: EditorPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        runtime: {
          onStoryLoad: () => {
            calls.push('plugin2');
          },
        },
      };

      await pluginStoreActions.register(plugin1);
      await pluginStoreActions.register(plugin2);

      await pluginStoreActions.executeHook('onStoryLoad', {});

      expect(calls).toEqual(['plugin1', 'plugin2']);
    });

    it('should manually refresh stores', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      // Register through store actions
      await pluginStoreActions.register(plugin);
      expect(get(registeredPlugins).length).toBe(1);

      // Manually disable through pluginManager (bypassing store actions)
      pluginManager.setEnabled('test-plugin', false);

      // Derived store will still show 1 until we force refresh
      // (because trigger hasn't changed)

      // Manual refresh forces update
      pluginStoreActions.refresh();

      // Now it should reflect the disabled state
      expect(get(registeredPlugins).length).toBe(0);
    });
  });
});
