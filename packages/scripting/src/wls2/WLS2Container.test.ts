/**
 * WLS2Container Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WLS2Container,
  createWLS2Container,
  createTestContainer,
  createLightContainer,
} from './WLS2Container';
import type { ThreadStepResult } from './types';

describe('WLS2Container', () => {
  describe('initialization', () => {
    it('should create container with all features enabled by default', () => {
      const container = new WLS2Container();

      expect(container.hasThreads()).toBe(true);
      expect(container.hasTimers()).toBe(true);
      expect(container.hasExternals()).toBe(true);
      expect(container.hasLists()).toBe(true);
      expect(container.hasTextEffects()).toBe(true);
      expect(container.hasAudioEffects()).toBe(true);
      expect(container.hasParameterizedPassages()).toBe(true);
      expect(container.isInitialized()).toBe(true);
    });

    it('should create container with specific features disabled', () => {
      const container = new WLS2Container({
        enableThreads: false,
        enableAudioEffects: false,
      });

      expect(container.hasThreads()).toBe(false);
      expect(container.hasTimers()).toBe(true);
      expect(container.hasAudioEffects()).toBe(false);
    });

    it('should throw when accessing disabled features', () => {
      const container = new WLS2Container({ enableThreads: false });

      expect(() => container.threads).toThrow('Threads are disabled');
    });

    it('should return null for safe accessors when disabled', () => {
      const container = new WLS2Container({ enableThreads: false });

      expect(container.threadsOrNull).toBeNull();
      expect(container.timersOrNull).not.toBeNull();
    });
  });

  describe('factory functions', () => {
    it('createWLS2Container should create container with options', () => {
      const container = createWLS2Container({ enableTimers: false });

      expect(container.hasTimers()).toBe(false);
      expect(container.hasThreads()).toBe(true);
    });

    it('createTestContainer should create fully enabled container', () => {
      const container = createTestContainer();

      expect(container.hasThreads()).toBe(true);
      expect(container.hasTimers()).toBe(true);
      expect(container.hasExternals()).toBe(true);
      expect(container.hasLists()).toBe(true);
      expect(container.hasTextEffects()).toBe(true);
      expect(container.hasAudioEffects()).toBe(true);
      expect(container.hasParameterizedPassages()).toBe(true);
    });

    it('createLightContainer should create container without effects', () => {
      const container = createLightContainer();

      expect(container.hasThreads()).toBe(true);
      expect(container.hasTimers()).toBe(true);
      expect(container.hasTextEffects()).toBe(false);
      expect(container.hasAudioEffects()).toBe(false);
      expect(container.hasParameterizedPassages()).toBe(false);
    });
  });

  describe('threads', () => {
    let container: WLS2Container;

    beforeEach(() => {
      container = createTestContainer();
    });

    it('should create main thread', () => {
      const thread = container.threads.createThread('Start');

      expect(thread).toBeDefined();
      expect(thread.passage).toBe('Start');
      expect(thread.isMain).toBe(true);
      expect(thread.state).toBe('running');
    });

    it('should spawn child thread', () => {
      const main = container.threads.createThread('Start');
      const child = container.threads.spawnThread('Background', main.id, 5);

      expect(child).toBeDefined();
      expect(child?.parentId).toBe(main.id);
      expect(child?.priority).toBe(5);
    });

    it('should step threads with executor', () => {
      container.threads.createThread('Start');

      const executor = vi.fn().mockReturnValue({
        threadId: 'thread_1',
        state: 'running',
      } as ThreadStepResult);

      const result = container.step(16, executor);

      expect(executor).toHaveBeenCalled();
      expect(result.threadResults).toHaveLength(1);
    });
  });

  describe('timers', () => {
    let container: WLS2Container;

    beforeEach(() => {
      container = createTestContainer();
    });

    it('should schedule one-shot timer', () => {
      const timerId = container.timers.schedule(100, 'content');

      expect(timerId).toBeDefined();
      expect(container.timers.getTimer(timerId!)).toBeDefined();
    });

    it('should schedule repeating timer', () => {
      const timerId = container.timers.every(50, 'tick', 5);

      expect(timerId).toBeDefined();
      const timer = container.timers.getTimer(timerId!);
      expect(timer?.type).toBe('repeating');
      expect(timer?.maxFires).toBe(5);
    });

    it('should fire timers in step', () => {
      container.timers.schedule(50, 'content');

      // Step less than delay
      let result = container.step(30);
      expect(result.firedTimers).toHaveLength(0);

      // Step past delay
      result = container.step(30);
      expect(result.firedTimers).toHaveLength(1);
      expect(result.firedTimers[0].content).toBe('content');
    });

    it('should pause and resume timers', () => {
      container.timers.schedule(50, 'content');

      container.pause();
      expect(container.timers.isPaused()).toBe(true);

      // Step while paused - no firing
      let result = container.step(100);
      expect(result.firedTimers).toHaveLength(0);

      container.resume();
      expect(container.timers.isPaused()).toBe(false);

      // Step after resume - should fire
      result = container.step(100);
      expect(result.firedTimers).toHaveLength(1);
    });
  });

  describe('external functions', () => {
    let container: WLS2Container;

    beforeEach(() => {
      container = createTestContainer();
    });

    it('should register and call function', () => {
      const fn = vi.fn().mockReturnValue(42);
      container.registerFunction('getAnswer', fn);

      const result = container.callFunction('getAnswer');

      expect(fn).toHaveBeenCalled();
      expect(result).toBe(42);
    });

    it('should pass arguments to function', () => {
      const fn = vi.fn((a: number, b: number) => a + b);
      container.registerFunction('add', fn);

      const result = container.callFunction('add', 3, 4);

      expect(fn).toHaveBeenCalledWith(3, 4);
      expect(result).toBe(7);
    });

    it('should throw for unregistered function', () => {
      expect(() => container.callFunction('unknown')).toThrow();
    });
  });

  describe('lists', () => {
    let container: WLS2Container;

    beforeEach(() => {
      container = createTestContainer();
    });

    it('should define exclusive list', () => {
      container.defineExclusiveList('mood', ['happy', 'sad', 'angry'], 'happy');

      const list = container.lists.get('mood');
      expect(list).toBeDefined();
      expect(list?.getValue()).toBe('happy');
    });

    it('should define flags list', () => {
      container.defineFlagsList('items', ['key', 'sword', 'map'], ['key']);

      const list = container.lists.get('items');
      expect(list).toBeDefined();
      expect(list?.contains('key')).toBe(true);
      expect(list?.contains('sword')).toBe(false);
    });

    it('should transition exclusive list', () => {
      container.defineExclusiveList('state', ['idle', 'running', 'jumping']);

      const list = container.lists.get('state')!;
      list.enter('running');

      expect(list.getValue()).toBe('running');
      expect(list.contains('idle')).toBe(false);
    });
  });

  describe('parameterized passages', () => {
    let container: WLS2Container;

    beforeEach(() => {
      container = createTestContainer();
    });

    it('should register passage with parameters', () => {
      container.registerPassage('Describe(item, quality = "normal")');

      expect(container.passages.isRegistered('Describe')).toBe(true);
    });

    it('should bind arguments to passage', () => {
      container.registerPassage('Greet(name)');

      const binding = container.passages.bindArguments('Greet', ['Alice']);

      expect(binding).toBeDefined();
      expect(binding?.bindings.get('name')).toBe('Alice');
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize state', () => {
      const container = createTestContainer();

      // Set up some state
      container.threads.createThread('Start');
      container.defineExclusiveList('mood', ['happy', 'sad'], 'happy');
      container.lists.get('mood')!.enter('sad');

      // Serialize
      const state = container.serialize();

      expect(state.threads).toBeDefined();
      expect(state.threads!.length).toBeGreaterThan(0);
      expect(state.lists).toBeDefined();

      // Create new container and restore
      const newContainer = createTestContainer();
      newContainer.deserialize(state);

      // Verify restored state
      expect(newContainer.threads.getAllThreads().length).toBeGreaterThan(0);
      expect(newContainer.lists.getValue('mood')).toBe('sad');
    });
  });

  describe('reset', () => {
    it('should reset all components', () => {
      const container = createTestContainer();

      // Set up state
      container.threads.createThread('Start');
      container.timers.schedule(100, 'content');
      container.defineExclusiveList('state', ['a', 'b'], 'a');
      container.lists.get('state')!.enter('b');

      // Reset
      container.reset();

      // Verify reset
      expect(container.threads.getAllThreads()).toHaveLength(0);
      expect(container.timers.getActiveTimers()).toHaveLength(0);
      expect(container.lists.get('state')!.isEmpty()).toBe(true);
    });
  });

  describe('isComplete', () => {
    it('should return true when all threads complete and no timers', () => {
      const container = createTestContainer();
      const thread = container.threads.createThread('Start');
      container.threads.completeThread(thread.id);

      expect(container.isComplete()).toBe(true);
    });

    it('should return false with active timers', () => {
      const container = createTestContainer();
      container.timers.schedule(1000, 'content');

      expect(container.isComplete()).toBe(false);
    });

    it('should return false with running threads', () => {
      const container = createTestContainer();
      container.threads.createThread('Start');

      expect(container.isComplete()).toBe(false);
    });
  });

  describe('getOptions', () => {
    it('should return copy of options', () => {
      const container = new WLS2Container({
        enableThreads: true,
        enableTimers: false,
      });

      const options = container.getOptions();

      expect(options.enableThreads).toBe(true);
      expect(options.enableTimers).toBe(false);
    });
  });
});
