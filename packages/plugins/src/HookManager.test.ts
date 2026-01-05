/**
 * Tests for HookManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookManager, DEFAULT_PRIORITY, MIN_PRIORITY, MAX_PRIORITY } from './HookManager';

describe('HookManager', () => {
  let manager: HookManager;

  beforeEach(() => {
    manager = HookManager.create();
  });

  describe('factory method', () => {
    it('creates new instance', () => {
      const m = HookManager.create();
      expect(m).toBeInstanceOf(HookManager);
    });
  });

  describe('registerHook', () => {
    it('registers a hook', () => {
      const callback = vi.fn();
      const hookId = manager.registerHook('test_event', callback);
      expect(hookId).toMatch(/^hook_\d+$/);
    });

    it('throws for invalid event', () => {
      expect(() => manager.registerHook(123 as unknown as string, vi.fn())).toThrow();
    });

    it('throws for invalid callback', () => {
      expect(() => manager.registerHook('test', 'not a function' as unknown as () => void)).toThrow();
    });

    it('uses default priority', () => {
      const callback = vi.fn();
      manager.registerHook('test', callback);
      const hooks = manager.getHooks('test');
      expect(hooks[0].priority).toBe(DEFAULT_PRIORITY);
    });

    it('clamps priority to valid range', () => {
      const callback = vi.fn();
      manager.registerHook('test', callback, -50);
      const hooks = manager.getHooks('test');
      expect(hooks[0].priority).toBe(MIN_PRIORITY);
    });

    it('maintains priority order', () => {
      manager.registerHook('test', vi.fn(), 50, 'middle');
      manager.registerHook('test', vi.fn(), 10, 'first');
      manager.registerHook('test', vi.fn(), 90, 'last');

      const hooks = manager.getHooks('test');
      expect(hooks[0].pluginName).toBe('first');
      expect(hooks[1].pluginName).toBe('middle');
      expect(hooks[2].pluginName).toBe('last');
    });
  });

  describe('unregisterHook', () => {
    it('unregisters a hook', () => {
      const hookId = manager.registerHook('test', vi.fn());
      expect(manager.unregisterHook(hookId)).toBe(true);
      expect(manager.getHookCount('test')).toBe(0);
    });

    it('returns false for unknown hook', () => {
      expect(manager.unregisterHook('unknown')).toBe(false);
    });
  });

  describe('trigger', () => {
    it('calls all registered hooks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.registerHook('test', callback1);
      manager.registerHook('test', callback2);

      manager.trigger('test', 'arg1', 'arg2');

      expect(callback1).toHaveBeenCalledWith('arg1', 'arg2');
      expect(callback2).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('returns results for each hook', () => {
      manager.registerHook('test', () => 'result1');
      manager.registerHook('test', () => 'result2');

      const results = manager.trigger('test');
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('result1');
    });

    it('catches errors', () => {
      manager.registerHook('test', () => {
        throw new Error('Test error');
      });

      const results = manager.trigger('test');
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Test error');
    });

    it('returns empty array when paused', () => {
      manager.registerHook('test', vi.fn());
      manager.pauseEvent('test');

      const results = manager.trigger('test');
      expect(results).toHaveLength(0);
    });
  });

  describe('transform', () => {
    it('transforms value through hooks', () => {
      manager.registerHook('transform', (value: number) => value * 2);
      manager.registerHook('transform', (value: number) => value + 1);

      const { value } = manager.transform('transform', 5);
      expect(value).toBe(11); // (5 * 2) + 1
    });

    it('preserves value if handler returns undefined', () => {
      manager.registerHook('transform', () => undefined);

      const { value } = manager.transform('transform', 'original');
      expect(value).toBe('original');
    });

    it('returns results for each hook', () => {
      manager.registerHook('transform', (v: number) => v * 2);
      manager.registerHook('transform', (v: number) => v + 1);

      const { results } = manager.transform('transform', 5);
      expect(results).toHaveLength(2);
    });
  });

  describe('emit', () => {
    it('uses trigger for observer hooks', () => {
      const callback = vi.fn();
      manager.registerHook('on_story_start', callback);

      manager.emit('on_story_start', 'arg');
      expect(callback).toHaveBeenCalledWith('arg');
    });

    it('uses transform for transform hooks', () => {
      manager.registerHook('on_passage_render', (html: string) => html.toUpperCase());

      const { value } = manager.emit('on_passage_render', 'hello');
      expect(value).toBe('HELLO');
    });
  });

  describe('pause/resume', () => {
    it('pauses specific event', () => {
      const callback = vi.fn();
      manager.registerHook('test', callback);

      manager.pauseEvent('test');
      manager.trigger('test');
      expect(callback).not.toHaveBeenCalled();

      manager.resumeEvent('test');
      manager.trigger('test');
      expect(callback).toHaveBeenCalled();
    });

    it('pauses all events globally', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.registerHook('event1', callback1);
      manager.registerHook('event2', callback2);

      manager.pauseAll();
      manager.trigger('event1');
      manager.trigger('event2');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();

      manager.resumeAll();
      manager.trigger('event1');
      expect(callback1).toHaveBeenCalled();
    });
  });

  describe('clearEvent', () => {
    it('clears all hooks for event', () => {
      manager.registerHook('test', vi.fn());
      manager.registerHook('test', vi.fn());

      const count = manager.clearEvent('test');
      expect(count).toBe(2);
      expect(manager.getHookCount('test')).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('clears all hooks', () => {
      manager.registerHook('event1', vi.fn());
      manager.registerHook('event2', vi.fn());

      const count = manager.clearAll();
      expect(count).toBe(2);
      expect(manager.getTotalHookCount()).toBe(0);
    });
  });

  describe('clearPluginHooks', () => {
    it('clears hooks for specific plugin', () => {
      manager.registerHook('test', vi.fn(), 50, 'plugin1');
      manager.registerHook('test', vi.fn(), 50, 'plugin2');
      manager.registerHook('test', vi.fn(), 50, 'plugin1');

      const count = manager.clearPluginHooks('plugin1');
      expect(count).toBe(2);
      expect(manager.getHookCount('test')).toBe(1);
    });
  });

  describe('getters', () => {
    it('getHooks returns hooks for event', () => {
      manager.registerHook('test', vi.fn());
      const hooks = manager.getHooks('test');
      expect(hooks).toHaveLength(1);
    });

    it('getHookCount returns count', () => {
      manager.registerHook('test', vi.fn());
      manager.registerHook('test', vi.fn());
      expect(manager.getHookCount('test')).toBe(2);
    });

    it('getRegisteredEvents returns events with hooks', () => {
      manager.registerHook('event1', vi.fn());
      manager.registerHook('event2', vi.fn());
      const events = manager.getRegisteredEvents();
      expect(events).toContain('event1');
      expect(events).toContain('event2');
    });

    it('getTotalHookCount returns total', () => {
      manager.registerHook('event1', vi.fn());
      manager.registerHook('event2', vi.fn());
      expect(manager.getTotalHookCount()).toBe(2);
    });

    it('isEventPaused returns pause status', () => {
      expect(manager.isEventPaused('test')).toBe(false);
      manager.pauseEvent('test');
      expect(manager.isEventPaused('test')).toBe(true);
    });

    it('isGloballyPaused returns global pause status', () => {
      expect(manager.isGloballyPaused()).toBe(false);
      manager.pauseAll();
      expect(manager.isGloballyPaused()).toBe(true);
    });
  });

  describe('getPluginHooks', () => {
    it('returns hooks for plugin', () => {
      manager.registerHook('event1', vi.fn(), 50, 'myPlugin');
      manager.registerHook('event2', vi.fn(), 50, 'myPlugin');
      manager.registerHook('event1', vi.fn(), 50, 'otherPlugin');

      const hooks = manager.getPluginHooks('myPlugin');
      expect(hooks).toHaveLength(2);
    });
  });

  describe('registerPluginHooks', () => {
    it('registers multiple hooks from plugin', () => {
      const hookIds = manager.registerPluginHooks('testPlugin', {
        on_story_start: vi.fn(),
        on_passage_enter: vi.fn(),
      });

      expect(hookIds).toHaveLength(2);
      expect(manager.getTotalHookCount()).toBe(2);
    });
  });

  describe('createScope', () => {
    it('creates scope for temporary hooks', () => {
      const scope = manager.createScope();

      scope.register('test', vi.fn());
      scope.register('test', vi.fn());

      expect(scope.getHooks()).toHaveLength(2);
      expect(manager.getHookCount('test')).toBe(2);

      const count = scope.close();
      expect(count).toBe(2);
      expect(manager.getHookCount('test')).toBe(0);
    });
  });

  describe('reset', () => {
    it('resets all state', () => {
      manager.registerHook('test', vi.fn());
      manager.pauseEvent('other');
      manager.pauseAll();

      manager.reset();

      expect(manager.getTotalHookCount()).toBe(0);
      expect(manager.isEventPaused('other')).toBe(false);
      expect(manager.isGloballyPaused()).toBe(false);
    });
  });
});
