/**
 * Tests for index exports and factory functions
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  // Types (just check they're exported)
  HookManager,
  PluginContext,
  PluginRegistry,
  PluginStateMachine,
  // Constants
  STATES,
  TRANSITIONS,
  MODE,
  STORY,
  PASSAGE,
  CHOICE,
  VARIABLE,
  PERSISTENCE,
  ERROR,
  ALL_EVENTS,
  DEFAULT_PRIORITY,
  MIN_PRIORITY,
  MAX_PRIORITY,
  // Functions
  isValidState,
  isValidTransition,
  getAllowedTransitions,
  getTransitionHooks,
  isTerminalState,
  isActiveState,
  canDestroy,
  getTransitionPath,
  getAllEvents,
  getMode,
  getCategory,
  isTransformHook,
  isObserverHook,
  isKnownEvent,
  getEventsByCategory,
  getCategories,
  // Factory functions
  createHookManager,
  createPluginContext,
  createPluginRegistry,
  getPluginRegistry,
  initializePluginSystem,
  shutdownPluginSystem,
  // Namespaces
  PluginLifecycle,
  HookTypes,
} from './index';

describe('index exports', () => {
  afterEach(() => {
    PluginRegistry.resetInstance();
  });

  describe('class exports', () => {
    it('exports HookManager', () => {
      expect(HookManager).toBeDefined();
      expect(typeof HookManager.create).toBe('function');
    });

    it('exports PluginContext', () => {
      expect(PluginContext).toBeDefined();
      expect(typeof PluginContext.create).toBe('function');
    });

    it('exports PluginRegistry', () => {
      expect(PluginRegistry).toBeDefined();
      expect(typeof PluginRegistry.create).toBe('function');
    });

    it('exports PluginStateMachine', () => {
      expect(PluginStateMachine).toBeDefined();
      expect(typeof PluginStateMachine.create).toBe('function');
    });
  });

  describe('constant exports', () => {
    it('exports STATES', () => {
      expect(STATES).toContain('discovered');
      expect(STATES).toContain('enabled');
    });

    it('exports TRANSITIONS', () => {
      expect(TRANSITIONS.discovered).toContain('loaded');
    });

    it('exports hook type constants', () => {
      expect(MODE.OBSERVER).toBe('observer');
      expect(MODE.TRANSFORM).toBe('transform');
    });

    it('exports hook category constants', () => {
      expect(STORY.START).toBe('on_story_start');
      expect(PASSAGE.RENDER).toBe('on_passage_render');
      expect(CHOICE.SELECT).toBe('on_choice_select');
      expect(VARIABLE.SET).toBe('on_variable_set');
      expect(PERSISTENCE.SAVE).toBe('on_save');
      expect(ERROR.ERROR).toBe('on_error');
    });

    it('exports ALL_EVENTS', () => {
      expect(ALL_EVENTS['on_story_start']).toBeDefined();
    });

    it('exports priority constants', () => {
      expect(DEFAULT_PRIORITY).toBe(50);
      expect(MIN_PRIORITY).toBe(0);
      expect(MAX_PRIORITY).toBe(100);
    });
  });

  describe('function exports', () => {
    it('exports lifecycle functions', () => {
      expect(typeof isValidState).toBe('function');
      expect(typeof isValidTransition).toBe('function');
      expect(typeof getAllowedTransitions).toBe('function');
      expect(typeof getTransitionHooks).toBe('function');
      expect(typeof isTerminalState).toBe('function');
      expect(typeof isActiveState).toBe('function');
      expect(typeof canDestroy).toBe('function');
      expect(typeof getTransitionPath).toBe('function');
    });

    it('exports hook type functions', () => {
      expect(typeof getAllEvents).toBe('function');
      expect(typeof getMode).toBe('function');
      expect(typeof getCategory).toBe('function');
      expect(typeof isTransformHook).toBe('function');
      expect(typeof isObserverHook).toBe('function');
      expect(typeof isKnownEvent).toBe('function');
      expect(typeof getEventsByCategory).toBe('function');
      expect(typeof getCategories).toBe('function');
    });
  });

  describe('namespace exports', () => {
    it('exports PluginLifecycle namespace', () => {
      expect(PluginLifecycle.isValidState).toBe(isValidState);
      expect(PluginLifecycle.STATES).toBe(STATES);
    });

    it('exports HookTypes namespace', () => {
      expect(HookTypes.getAllEvents).toBe(getAllEvents);
      expect(HookTypes.MODE).toBe(MODE);
    });
  });

  describe('factory functions', () => {
    it('createHookManager creates HookManager', () => {
      const manager = createHookManager();
      expect(manager).toBeInstanceOf(HookManager);
    });

    it('createPluginContext creates PluginContext', () => {
      const manager = createHookManager();
      const ctx = createPluginContext(
        { name: 'test', version: '1.0.0' },
        manager
      );
      expect(ctx).toBeInstanceOf(PluginContext);
    });

    it('createPluginRegistry creates PluginRegistry', () => {
      const registry = createPluginRegistry();
      expect(registry).toBeInstanceOf(PluginRegistry);
    });

    it('getPluginRegistry returns singleton', () => {
      const r1 = getPluginRegistry();
      const r2 = getPluginRegistry();
      expect(r1).toBe(r2);
    });

    it('initializePluginSystem creates configured registry', () => {
      const registry = initializePluginSystem({ autoEnable: false });
      expect(registry).toBeInstanceOf(PluginRegistry);
    });

    it('shutdownPluginSystem destroys all plugins', async () => {
      const registry = initializePluginSystem({ autoInitialize: false, autoEnable: false });
      await registry.register({
        metadata: { name: 'test', version: '1.0.0' },
      });

      await shutdownPluginSystem();

      // After shutdown, getInstance should return a new instance
      const newRegistry = getPluginRegistry();
      expect(newRegistry.hasPlugin('test')).toBe(false);
    });
  });
});
