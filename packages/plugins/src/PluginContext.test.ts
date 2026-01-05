/**
 * Tests for PluginContext
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginContext } from './PluginContext';
import { HookManager } from './HookManager';
import type { PluginMetadata, Logger } from './types';

describe('PluginContext', () => {
  let hookManager: HookManager;
  let metadata: PluginMetadata;

  beforeEach(() => {
    hookManager = HookManager.create();
    metadata = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      priority: 50,
    };
  });

  describe('factory method', () => {
    it('creates new instance', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      expect(ctx).toBeInstanceOf(PluginContext);
    });

    it('initializes with discovered state', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      expect(ctx.state).toBe('discovered');
    });
  });

  describe('metadata', () => {
    it('returns plugin metadata', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      expect(ctx.metadata.name).toBe('test-plugin');
      expect(ctx.metadata.version).toBe('1.0.0');
    });

    it('returns copy of metadata', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      const m1 = ctx.metadata;
      const m2 = ctx.metadata;
      expect(m1).not.toBe(m2);
      expect(m1).toEqual(m2);
    });
  });

  describe('state', () => {
    it('returns current state', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      expect(ctx.state).toBe('discovered');
    });

    it('can be updated internally', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      ctx._setState('enabled');
      expect(ctx.state).toBe('enabled');
    });
  });

  describe('logger', () => {
    it('provides prefixed logger', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const ctx = PluginContext.create(metadata, hookManager, { logger: mockLogger });
      ctx.log.info('test message');

      expect(mockLogger.info).toHaveBeenCalledWith('[Plugin:test-plugin] test message');
    });

    it('uses null logger when none provided', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      // Should not throw
      expect(() => ctx.log.info('test')).not.toThrow();
    });
  });

  describe('registerHook', () => {
    it('registers hook with manager', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      const callback = vi.fn();

      const hookId = ctx.registerHook('test_event', callback);

      expect(hookId).toMatch(/^hook_\d+$/);
      expect(hookManager.getHookCount('test_event')).toBe(1);
    });

    it('uses plugin priority as default', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      ctx.registerHook('test', vi.fn());

      const hooks = hookManager.getHooks('test');
      expect(hooks[0].priority).toBe(50);
    });

    it('tracks registered hooks', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      ctx.registerHook('test', vi.fn());
      ctx.registerHook('test', vi.fn());

      expect(ctx.getRegisteredHooks()).toHaveLength(2);
    });
  });

  describe('unregisterHook', () => {
    it('unregisters hook from manager', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      const hookId = ctx.registerHook('test', vi.fn());

      const result = ctx.unregisterHook(hookId);

      expect(result).toBe(true);
      expect(hookManager.getHookCount('test')).toBe(0);
    });

    it('removes from tracked hooks', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      const hookId = ctx.registerHook('test', vi.fn());

      ctx.unregisterHook(hookId);

      expect(ctx.getRegisteredHooks()).toHaveLength(0);
    });
  });

  describe('unregisterAllHooks', () => {
    it('unregisters all hooks', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      ctx.registerHook('event1', vi.fn());
      ctx.registerHook('event2', vi.fn());

      const count = ctx.unregisterAllHooks();

      expect(count).toBe(2);
      expect(ctx.getRegisteredHooks()).toHaveLength(0);
    });
  });

  describe('getApi', () => {
    it('returns registered API', () => {
      const apis = new Map<string, unknown>();
      apis.set('myApi', { foo: 'bar' });

      const ctx = PluginContext.create(metadata, hookManager, { apis });
      const api = ctx.getApi<{ foo: string }>('myApi');

      expect(api?.foo).toBe('bar');
    });

    it('returns undefined for unknown API', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      expect(ctx.getApi('unknown')).toBeUndefined();
    });
  });

  describe('_registerApi', () => {
    it('registers API internally', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      ctx._registerApi('testApi', { value: 123 });

      expect(ctx.getApi<{ value: number }>('testApi')?.value).toBe(123);
    });
  });

  describe('configuration', () => {
    it('gets and sets config values', () => {
      const ctx = PluginContext.create(metadata, hookManager);

      ctx.setConfig('key1', 'value1');
      ctx.setConfig('key2', 42);

      expect(ctx.getConfig<string>('key1')).toBe('value1');
      expect(ctx.getConfig<number>('key2')).toBe(42);
    });

    it('returns undefined for missing config', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      expect(ctx.getConfig('missing')).toBeUndefined();
    });

    it('initializes with provided config', () => {
      const ctx = PluginContext.create(metadata, hookManager, {
        initialConfig: {
          setting1: true,
          setting2: 'test',
        },
      });

      expect(ctx.getConfig('setting1')).toBe(true);
      expect(ctx.getConfig('setting2')).toBe('test');
    });

    it('gets all config', () => {
      const ctx = PluginContext.create(metadata, hookManager, {
        initialConfig: {
          a: 1,
          b: 2,
        },
      });

      const allConfig = ctx.getAllConfig();
      expect(allConfig).toEqual({ a: 1, b: 2 });
    });
  });

  describe('data storage', () => {
    it('gets and sets data values', () => {
      const ctx = PluginContext.create(metadata, hookManager);

      ctx.setData('count', 10);
      ctx.setData('items', ['a', 'b']);

      expect(ctx.getData<number>('count')).toBe(10);
      expect(ctx.getData<string[]>('items')).toEqual(['a', 'b']);
    });

    it('returns undefined for missing data', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      expect(ctx.getData('missing')).toBeUndefined();
    });

    it('gets all data', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      ctx.setData('x', 1);
      ctx.setData('y', 2);

      const allData = ctx.getAllData();
      expect(allData).toEqual({ x: 1, y: 2 });
    });

    it('clears all data', () => {
      const ctx = PluginContext.create(metadata, hookManager);
      ctx.setData('x', 1);
      ctx.setData('y', 2);

      ctx.clearData();

      expect(ctx.getAllData()).toEqual({});
    });
  });

  describe('reset', () => {
    it('resets all state', () => {
      const ctx = PluginContext.create(metadata, hookManager);

      ctx.registerHook('test', vi.fn());
      ctx.setConfig('key', 'value');
      ctx.setData('data', 123);
      ctx._setState('enabled');

      ctx.reset();

      expect(ctx.getRegisteredHooks()).toHaveLength(0);
      expect(ctx.getAllConfig()).toEqual({});
      expect(ctx.getAllData()).toEqual({});
      expect(ctx.state).toBe('discovered');
    });
  });
});
