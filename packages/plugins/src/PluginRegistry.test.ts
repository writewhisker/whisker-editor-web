/**
 * Tests for PluginRegistry
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginRegistry } from './PluginRegistry';
import type { PluginDefinition } from './types';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = PluginRegistry.create({
      autoInitialize: false,
      autoEnable: false,
    });
  });

  afterEach(() => {
    PluginRegistry.resetInstance();
  });

  function createTestPlugin(name: string = 'test-plugin'): PluginDefinition {
    return {
      metadata: {
        name,
        version: '1.0.0',
      },
    };
  }

  describe('factory method', () => {
    it('creates new instance', () => {
      const r = PluginRegistry.create();
      expect(r).toBeInstanceOf(PluginRegistry);
    });
  });

  describe('singleton', () => {
    it('returns same instance', () => {
      const r1 = PluginRegistry.getInstance();
      const r2 = PluginRegistry.getInstance();
      expect(r1).toBe(r2);
    });

    it('initialize creates new instance with config', () => {
      const r = PluginRegistry.initialize({ autoEnable: false });
      expect(r).toBeInstanceOf(PluginRegistry);
    });

    it('resetInstance clears singleton', () => {
      const r1 = PluginRegistry.getInstance();
      PluginRegistry.resetInstance();
      const r2 = PluginRegistry.getInstance();
      expect(r1).not.toBe(r2);
    });
  });

  describe('register', () => {
    it('registers a plugin', async () => {
      const result = await registry.register(createTestPlugin());
      expect(result.success).toBe(true);
      expect(registry.hasPlugin('test-plugin')).toBe(true);
    });

    it('rejects duplicate registration', async () => {
      await registry.register(createTestPlugin());
      const result = await registry.register(createTestPlugin());
      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('rejects invalid metadata', async () => {
      const result = await registry.register({
        metadata: { name: '', version: '1.0.0' },
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('valid name');
    });

    it('sets plugin state to loaded', async () => {
      await registry.register(createTestPlugin());
      expect(registry.getPluginState('test-plugin')).toBe('loaded');
    });
  });

  describe('auto-initialize', () => {
    it('auto-initializes when configured', async () => {
      const autoRegistry = PluginRegistry.create({
        autoInitialize: true,
        autoEnable: false,
      });

      await autoRegistry.register(createTestPlugin());
      expect(autoRegistry.getPluginState('test-plugin')).toBe('initialized');
    });
  });

  describe('auto-enable', () => {
    it('auto-enables when configured', async () => {
      const autoRegistry = PluginRegistry.create({
        autoInitialize: true,
        autoEnable: true,
      });

      await autoRegistry.register(createTestPlugin());
      expect(autoRegistry.getPluginState('test-plugin')).toBe('enabled');
    });
  });

  describe('initializePlugin', () => {
    it('initializes a plugin', async () => {
      await registry.register(createTestPlugin());

      const result = await registry.initializePlugin('test-plugin');

      expect(result.success).toBe(true);
      expect(registry.getPluginState('test-plugin')).toBe('initialized');
    });

    it('calls on_load and on_init hooks', async () => {
      const onLoad = vi.fn();
      const onInit = vi.fn();

      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        hooks: {
          on_load: onLoad,
          on_init: onInit,
        },
      });

      await registry.initializePlugin('test-plugin');

      expect(onLoad).toHaveBeenCalled();
      expect(onInit).toHaveBeenCalled();
    });

    it('fails for unknown plugin', async () => {
      const result = await registry.initializePlugin('unknown');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('handles hook errors', async () => {
      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        hooks: {
          on_init: () => {
            throw new Error('Init failed');
          },
        },
      });

      const result = await registry.initializePlugin('test-plugin');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Init failed');
      expect(registry.getPluginState('test-plugin')).toBe('error');
    });
  });

  describe('enablePlugin', () => {
    it('enables a plugin', async () => {
      await registry.register(createTestPlugin());
      await registry.initializePlugin('test-plugin');

      const result = await registry.enablePlugin('test-plugin');

      expect(result.success).toBe(true);
      expect(registry.getPluginState('test-plugin')).toBe('enabled');
    });

    it('calls on_enable hook', async () => {
      const onEnable = vi.fn();

      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        hooks: { on_enable: onEnable },
      });
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');

      expect(onEnable).toHaveBeenCalled();
    });

    it('registers event hooks', async () => {
      const onStoryStart = vi.fn();

      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        hooks: { on_story_start: onStoryStart },
      });
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');

      const hookManager = registry.getHookManager();
      expect(hookManager.getHookCount('on_story_start')).toBe(1);
    });

    it('registers APIs', async () => {
      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        apis: { myApi: { foo: 'bar' } },
      });
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');

      const api = registry.getApi<{ foo: string }>('test-plugin.myApi');
      expect(api?.foo).toBe('bar');
    });
  });

  describe('disablePlugin', () => {
    it('disables a plugin', async () => {
      await registry.register(createTestPlugin());
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');

      const result = await registry.disablePlugin('test-plugin');

      expect(result.success).toBe(true);
      expect(registry.getPluginState('test-plugin')).toBe('disabled');
    });

    it('calls on_disable hook', async () => {
      const onDisable = vi.fn();

      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        hooks: { on_disable: onDisable },
      });
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');
      await registry.disablePlugin('test-plugin');

      expect(onDisable).toHaveBeenCalled();
    });

    it('unregisters hooks', async () => {
      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        hooks: { on_story_start: vi.fn() },
      });
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');

      const hookManager = registry.getHookManager();
      expect(hookManager.getHookCount('on_story_start')).toBe(1);

      await registry.disablePlugin('test-plugin');
      expect(hookManager.getHookCount('on_story_start')).toBe(0);
    });
  });

  describe('destroyPlugin', () => {
    it('destroys a plugin', async () => {
      await registry.register(createTestPlugin());
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');
      await registry.disablePlugin('test-plugin');

      const result = await registry.destroyPlugin('test-plugin');

      expect(result.success).toBe(true);
      expect(registry.hasPlugin('test-plugin')).toBe(false);
    });

    it('auto-disables before destroying enabled plugin', async () => {
      const onDisable = vi.fn();

      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        hooks: { on_disable: onDisable },
      });
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');

      await registry.destroyPlugin('test-plugin');

      expect(onDisable).toHaveBeenCalled();
    });

    it('calls on_destroy hook', async () => {
      const onDestroy = vi.fn();

      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        hooks: { on_destroy: onDestroy },
      });
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');
      await registry.disablePlugin('test-plugin');
      await registry.destroyPlugin('test-plugin');

      expect(onDestroy).toHaveBeenCalled();
    });

    it('unregisters APIs', async () => {
      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        apis: { myApi: { value: 1 } },
      });
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');

      expect(registry.getApi('test-plugin.myApi')).toBeDefined();

      await registry.destroyPlugin('test-plugin');
      expect(registry.getApi('test-plugin.myApi')).toBeUndefined();
    });
  });

  describe('destroyAll', () => {
    it('destroys all plugins', async () => {
      await registry.register(createTestPlugin('plugin1'));
      await registry.register(createTestPlugin('plugin2'));
      await registry.initializePlugin('plugin1');
      await registry.initializePlugin('plugin2');
      await registry.enablePlugin('plugin1');
      await registry.enablePlugin('plugin2');

      await registry.destroyAll();

      expect(registry.getPluginNames()).toHaveLength(0);
    });
  });

  describe('getters', () => {
    it('getPlugin returns entry', async () => {
      await registry.register(createTestPlugin());
      const entry = registry.getPlugin('test-plugin');
      expect(entry?.definition.metadata.name).toBe('test-plugin');
    });

    it('getPluginState returns state', async () => {
      await registry.register(createTestPlugin());
      expect(registry.getPluginState('test-plugin')).toBe('loaded');
    });

    it('getPluginContext returns context', async () => {
      await registry.register(createTestPlugin());
      const ctx = registry.getPluginContext('test-plugin');
      expect(ctx?.metadata.name).toBe('test-plugin');
    });

    it('getPluginNames returns all names', async () => {
      await registry.register(createTestPlugin('a'));
      await registry.register(createTestPlugin('b'));
      const names = registry.getPluginNames();
      expect(names).toContain('a');
      expect(names).toContain('b');
    });

    it('getEnabledPlugins returns only enabled', async () => {
      await registry.register(createTestPlugin('a'));
      await registry.register(createTestPlugin('b'));
      await registry.initializePlugin('a');
      await registry.enablePlugin('a');

      const enabled = registry.getEnabledPlugins();
      expect(enabled).toContain('a');
      expect(enabled).not.toContain('b');
    });

    it('hasPlugin checks existence', async () => {
      await registry.register(createTestPlugin());
      expect(registry.hasPlugin('test-plugin')).toBe(true);
      expect(registry.hasPlugin('unknown')).toBe(false);
    });

    it('isPluginEnabled checks state', async () => {
      await registry.register(createTestPlugin());
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');

      expect(registry.isPluginEnabled('test-plugin')).toBe(true);
    });
  });

  describe('API management', () => {
    it('registers and gets APIs', () => {
      registry.registerApi('test', { value: 42 });
      expect(registry.getApi<{ value: number }>('test')?.value).toBe(42);
    });

    it('unregisters APIs', () => {
      registry.registerApi('test', { value: 42 });
      registry.unregisterApi('test');
      expect(registry.getApi('test')).toBeUndefined();
    });

    it('getApiNames returns all API names', () => {
      registry.registerApi('api1', {});
      registry.registerApi('api2', {});
      const names = registry.getApiNames();
      expect(names).toContain('api1');
      expect(names).toContain('api2');
    });
  });

  describe('emit', () => {
    it('emits through hook manager', async () => {
      const handler = vi.fn(() => 'transformed');

      await registry.register({
        metadata: { name: 'test-plugin', version: '1.0.0' },
        hooks: { on_passage_render: handler },
      });
      await registry.initializePlugin('test-plugin');
      await registry.enablePlugin('test-plugin');

      const { value } = registry.emit<string>('on_passage_render', 'original');
      expect(value).toBe('transformed');
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      await registry.register(createTestPlugin());
      registry.registerApi('test', {});

      registry.reset();

      expect(registry.getPluginNames()).toHaveLength(0);
      expect(registry.getApiNames()).toHaveLength(0);
    });
  });
});
