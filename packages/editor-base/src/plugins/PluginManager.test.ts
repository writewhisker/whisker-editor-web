import { describe, it, expect, beforeEach } from 'vitest';
import { PluginManager } from './PluginManager';
import type { EditorPlugin } from './types';

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
  });

  describe('registration', () => {
    it('should register a plugin', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
      };

      await manager.register(plugin);

      expect(manager.hasPlugin('test-plugin')).toBe(true);
      expect(manager.getPlugin('test-plugin')).toEqual(plugin);
    });

    it('should not register duplicate plugins', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      await manager.register(plugin);
      await manager.register(plugin); // Try to register again

      const plugins = manager.getPlugins();
      expect(plugins.length).toBe(1);
    });

    it('should call onRegister hook', async () => {
      let called = false;
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onRegister: () => {
          called = true;
        },
      };

      await manager.register(plugin);
      expect(called).toBe(true);
    });
  });

  describe('unregistration', () => {
    it('should unregister a plugin', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      await manager.register(plugin);
      expect(manager.hasPlugin('test-plugin')).toBe(true);

      await manager.unregister('test-plugin');
      expect(manager.hasPlugin('test-plugin')).toBe(false);
    });

    it('should call onUnregister hook', async () => {
      let called = false;
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onUnregister: () => {
          called = true;
        },
      };

      await manager.register(plugin);
      await manager.unregister('test-plugin');
      expect(called).toBe(true);
    });
  });

  describe('enable/disable', () => {
    it('should disable a plugin', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      await manager.register(plugin);
      manager.setEnabled('test-plugin', false);

      expect(manager.getPlugin('test-plugin')).toBe(null);
      expect(manager.getPlugins().length).toBe(0);
    });

    it('should re-enable a plugin', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      await manager.register(plugin);
      manager.setEnabled('test-plugin', false);
      manager.setEnabled('test-plugin', true);

      expect(manager.getPlugin('test-plugin')).toEqual(plugin);
    });
  });

  describe('passage types', () => {
    it('should collect passage types from all plugins', async () => {
      const plugin1: EditorPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        nodeTypes: [
          { type: 'item', label: 'Item', icon: '📦', color: '#ff0000' },
        ],
      };

      const plugin2: EditorPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        nodeTypes: [
          { type: 'character', label: 'Character', icon: '👤', color: '#00ff00' },
        ],
      };

      await manager.register(plugin1);
      await manager.register(plugin2);

      const types = manager.getPassageTypes();
      expect(types.length).toBe(2);
      expect(types[0].type).toBe('item');
      expect(types[1].type).toBe('character');
    });
  });

  describe('actions and conditions', () => {
    it('should collect custom actions', async () => {
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

      await manager.register(plugin);

      const actions = manager.getActions();
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('test-action');
    });

    it('should collect custom conditions', async () => {
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

      await manager.register(plugin);

      const conditions = manager.getConditions();
      expect(conditions.length).toBe(1);
      expect(conditions[0].type).toBe('test-condition');
    });
  });

  describe('initialization', () => {
    it('should initialize plugins', async () => {
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await manager.initialize();
      await manager.initialize(); // Should warn but not error
      expect(manager.isInitialized()).toBe(true);
    });

    it('should call onInit hooks', async () => {
      let called = false;
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        runtime: {
          onInit: () => {
            called = true;
          },
        },
      };

      await manager.register(plugin);
      await manager.initialize();
      expect(called).toBe(true);
    });
  });

  describe('runtime hooks', () => {
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

      await manager.register(plugin1);
      await manager.register(plugin2);

      await manager.executeHook('onStoryLoad', {});

      expect(calls).toEqual(['plugin1', 'plugin2']);
    });

    it('should handle hook errors gracefully', async () => {
      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        runtime: {
          onStoryLoad: () => {
            throw new Error('Test error');
          },
        },
      };

      await manager.register(plugin);

      // Should not throw
      await expect(manager.executeHook('onStoryLoad', {})).resolves.toBeUndefined();
    });
  });

  describe('UI extensions', () => {
    it('should collect UI extensions', async () => {
      const MockComponent = {} as any;

      const plugin: EditorPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        ui: {
          sidebar: MockComponent,
        },
      };

      await manager.register(plugin);

      const extensions = manager.getUIExtensions('sidebar');
      expect(extensions.length).toBe(1);
      expect(extensions[0].pluginName).toBe('test-plugin');
      expect(extensions[0].component).toBe(MockComponent);
    });
  });
});
