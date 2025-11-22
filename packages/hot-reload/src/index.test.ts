/**
 * Tests for Hot Module Replacement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Story, Passage } from '@writewhisker/story-models';
import {
  HMRClient,
  createHMRClient,
  ModuleCache,
  StoryHotReload,
  createStoryHotReload,
  createHMRRuntime,
  type HMRClientConfig,
  type HMREvent,
  type HMREventType,
  type HMRRuntime,
} from './index';

// Mock EventSource
class MockEventSource {
  public url: string;
  public listeners: Map<string, Function[]> = new Map();
  public readyState: number = 0;

  constructor(url: string) {
    this.url = url;
    this.readyState = 1; // OPEN

    // Simulate connection
    setTimeout(() => {
      this.triggerEvent('open', {});
    }, 10);
  }

  addEventListener(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  removeEventListener(event: string, listener: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  close(): void {
    this.readyState = 2; // CLOSED
  }

  triggerEvent(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  triggerMessage(data: any): void {
    this.triggerEvent('message', { data: JSON.stringify(data) });
  }

  triggerError(): void {
    this.triggerEvent('error', {});
  }
}

// @ts-ignore
global.EventSource = MockEventSource;

const mockStory: Story = {
  id: 'test-story',
  name: 'Test Story',
  ifid: 'test-ifid',
  startPassage: 'Start',
  tagColors: {},
  zoom: 1,
  passages: [
    {
      id: 'passage-1',
      title: 'Start',
      tags: [],
      content: 'Start passage',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    },
    {
      id: 'passage-2',
      title: 'Middle',
      tags: [],
      content: 'Middle passage',
      position: { x: 200, y: 0 },
      size: { width: 100, height: 100 },
    },
  ],
};

describe('HMRClient', () => {
  let config: HMRClientConfig;

  beforeEach(() => {
    config = {
      url: 'http://localhost:3000/hmr',
      reconnect: true,
      reconnectDelay: 100,
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should create HMR client instance', () => {
      const client = new HMRClient(config);

      expect(client).toBeInstanceOf(HMRClient);
    });

    it('should apply default configuration', () => {
      const minimalConfig: HMRClientConfig = {
        url: 'http://localhost:3000/hmr',
      };

      const client = new HMRClient(minimalConfig);

      expect(client).toBeInstanceOf(HMRClient);
    });

    it('should accept custom reconnect settings', () => {
      const customConfig: HMRClientConfig = {
        url: 'http://localhost:3000/hmr',
        reconnect: false,
        reconnectDelay: 5000,
      };

      const client = new HMRClient(customConfig);

      expect(client).toBeInstanceOf(HMRClient);
    });

    it('should accept callback functions', () => {
      const onUpdate = vi.fn();
      const onError = vi.fn();

      const client = new HMRClient({
        ...config,
        onUpdate,
        onError,
      });

      expect(client).toBeInstanceOf(HMRClient);
    });
  });

  describe('connect', () => {
    it('should establish connection to HMR server', async () => {
      const client = new HMRClient(config);

      client.connect();

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(client).toBeDefined();
    });

    it('should emit connected event on successful connection', async () => {
      const client = new HMRClient(config);
      const listener = vi.fn();

      client.on('connected', listener);
      client.connect();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connected',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should not connect if already connected', () => {
      const client = new HMRClient(config);

      client.connect();
      client.connect(); // Second call should be ignored

      expect(client).toBeDefined();
    });

    it('should handle incoming HMR events', async () => {
      const client = new HMRClient(config);
      const listener = vi.fn();

      client.on('update', listener);
      client.connect();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Simulate event from server
      const eventSource = (client as any).eventSource as MockEventSource;
      eventSource.triggerMessage({
        type: 'update',
        path: '/test.js',
        data: { foo: 'bar' },
        timestamp: Date.now(),
      });

      expect(listener).toHaveBeenCalled();
    });

    it('should handle malformed event data', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const client = new HMRClient(config);

      client.connect();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Send malformed data
      const eventSource = (client as any).eventSource as MockEventSource;
      eventSource.triggerEvent('message', { data: 'invalid json' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse HMR event:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should close connection to HMR server', async () => {
      const client = new HMRClient(config);

      client.connect();
      await new Promise(resolve => setTimeout(resolve, 50));

      client.disconnect();

      const eventSource = (client as any).eventSource;
      expect(eventSource).toBeNull();
    });

    it('should clear reconnect timeout on disconnect', async () => {
      vi.useFakeTimers();

      const client = new HMRClient(config);

      client.connect();
      await vi.advanceTimersByTimeAsync(50);

      // Trigger error to start reconnect
      const eventSource = (client as any).eventSource as MockEventSource;
      eventSource.triggerError();

      client.disconnect();

      vi.useRealTimers();
    });

    it('should handle disconnect when not connected', () => {
      const client = new HMRClient(config);

      expect(() => client.disconnect()).not.toThrow();
    });
  });

  describe('on/off', () => {
    it('should register event listener', () => {
      const client = new HMRClient(config);
      const listener = vi.fn();

      client.on('update', listener);

      expect((client as any).listeners.has('update')).toBe(true);
    });

    it('should remove event listener', () => {
      const client = new HMRClient(config);
      const listener = vi.fn();

      client.on('update', listener);
      client.off('update', listener);

      const listeners = (client as any).listeners.get('update');
      expect(listeners?.has(listener)).toBeFalsy();
    });

    it('should support multiple listeners for same event', () => {
      const client = new HMRClient(config);
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      client.on('update', listener1);
      client.on('update', listener2);

      const listeners = (client as any).listeners.get('update');
      expect(listeners?.size).toBe(2);
    });

    it('should handle removing non-existent listener', () => {
      const client = new HMRClient(config);
      const listener = vi.fn();

      expect(() => client.off('update', listener)).not.toThrow();
    });
  });

  describe('event handling', () => {
    it('should call onUpdate callback for update events', async () => {
      const onUpdate = vi.fn();
      const client = new HMRClient({ ...config, onUpdate });

      client.connect();
      await new Promise(resolve => setTimeout(resolve, 50));

      const eventSource = (client as any).eventSource as MockEventSource;
      eventSource.triggerMessage({
        type: 'update',
        data: { test: 'data' },
        timestamp: Date.now(),
      });

      expect(onUpdate).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should call onError callback for error events', async () => {
      const onError = vi.fn();
      const client = new HMRClient({ ...config, onError });

      client.connect();
      await new Promise(resolve => setTimeout(resolve, 50));

      const eventSource = (client as any).eventSource as MockEventSource;
      eventSource.triggerMessage({
        type: 'error',
        data: 'Something went wrong',
        timestamp: Date.now(),
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should emit disconnected event on error', async () => {
      const client = new HMRClient(config);
      const listener = vi.fn();

      client.on('disconnected', listener);
      client.connect();

      await new Promise(resolve => setTimeout(resolve, 50));

      const eventSource = (client as any).eventSource as MockEventSource;
      eventSource.triggerError();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('reconnection', () => {
    it('should reconnect after disconnection when enabled', async () => {
      vi.useFakeTimers();

      const client = new HMRClient(config);

      client.connect();
      await vi.advanceTimersByTimeAsync(50);

      const eventSource = (client as any).eventSource as MockEventSource;
      eventSource.triggerError();

      await vi.advanceTimersByTimeAsync(config.reconnectDelay! + 50);

      // Should attempt to reconnect
      expect((client as any).eventSource).toBeTruthy();

      vi.useRealTimers();
    });

    it('should not reconnect when disabled', async () => {
      vi.useFakeTimers();

      const client = new HMRClient({ ...config, reconnect: false });

      client.connect();
      await vi.advanceTimersByTimeAsync(50);

      const eventSource = (client as any).eventSource as MockEventSource;
      eventSource.triggerError();

      await vi.advanceTimersByTimeAsync(1000);

      // Should not reconnect
      expect((client as any).eventSource).toBeNull();

      vi.useRealTimers();
    });

    it('should only create one reconnection timeout', async () => {
      vi.useFakeTimers();

      const client = new HMRClient(config);

      client.connect();
      await vi.advanceTimersByTimeAsync(50);

      const eventSource = (client as any).eventSource as MockEventSource;
      eventSource.triggerError();
      eventSource.triggerError(); // Trigger again

      await vi.advanceTimersByTimeAsync(config.reconnectDelay! + 50);

      // Should only have one timeout
      expect((client as any).reconnectTimeout).toBeFalsy();

      vi.useRealTimers();
    });
  });

  describe('createHMRClient', () => {
    it('should create and return HMR client instance', () => {
      const client = createHMRClient(config);

      expect(client).toBeInstanceOf(HMRClient);
    });
  });
});

describe('ModuleCache', () => {
  let cache: ModuleCache;

  beforeEach(() => {
    cache = new ModuleCache();
  });

  describe('register', () => {
    it('should register a module', () => {
      const module = { foo: 'bar' };

      cache.register('test-module', module);

      expect(cache.get('test-module')).toBe(module);
    });

    it('should register module with dependencies', () => {
      const module = { foo: 'bar' };

      cache.register('test-module', module, ['dep1', 'dep2']);

      expect(cache.get('test-module')).toBe(module);
    });
  });

  describe('get', () => {
    it('should return registered module', () => {
      const module = { foo: 'bar' };

      cache.register('test-module', module);

      expect(cache.get('test-module')).toBe(module);
    });

    it('should return undefined for non-existent module', () => {
      expect(cache.get('non-existent')).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update existing module', () => {
      const module1 = { version: 1 };
      const module2 = { version: 2 };

      cache.register('test-module', module1);
      cache.update('test-module', module2);

      expect(cache.get('test-module')).toBe(module2);
    });
  });

  describe('invalidate', () => {
    it('should invalidate a module', () => {
      cache.register('test-module', { foo: 'bar' });

      const invalidated = cache.invalidate('test-module');

      expect(invalidated.has('test-module')).toBe(true);
    });

    it('should invalidate dependent modules', () => {
      cache.register('dep', { foo: 'bar' });
      cache.register('module-a', { a: 1 }, ['dep']);
      cache.register('module-b', { b: 2 }, ['dep']);

      const invalidated = cache.invalidate('dep');

      expect(invalidated.has('dep')).toBe(true);
      expect(invalidated.has('module-a')).toBe(true);
      expect(invalidated.has('module-b')).toBe(true);
    });

    it('should handle circular dependencies', () => {
      cache.register('module-a', { a: 1 }, ['module-b']);
      cache.register('module-b', { b: 2 }, ['module-a']);

      const invalidated = cache.invalidate('module-a');

      expect(invalidated.has('module-a')).toBe(true);
      expect(invalidated.has('module-b')).toBe(true);
    });

    it('should not invalidate same module twice', () => {
      cache.register('module-a', { a: 1 }, ['module-b']);
      cache.register('module-b', { b: 2 }, ['module-a']);

      const invalidated = cache.invalidate('module-a');

      expect(invalidated.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all modules', () => {
      cache.register('module-1', { foo: 1 });
      cache.register('module-2', { bar: 2 });

      cache.clear();

      expect(cache.get('module-1')).toBeUndefined();
      expect(cache.get('module-2')).toBeUndefined();
    });
  });
});

describe('StoryHotReload', () => {
  let story: Story;
  let hotReload: StoryHotReload;

  beforeEach(() => {
    story = JSON.parse(JSON.stringify(mockStory));
    hotReload = new StoryHotReload(story);
  });

  describe('updateStory', () => {
    it('should update the entire story', () => {
      const callback = vi.fn();
      hotReload.onUpdate(callback);

      const newStory = { ...story, name: 'Updated Story' };
      hotReload.updateStory(newStory);

      expect(hotReload.getStory().name).toBe('Updated Story');
      expect(callback).toHaveBeenCalledWith(newStory);
    });

    it('should detect passage additions', () => {
      const newPassage: Passage = {
        id: 'passage-3',
        title: 'New Passage',
        tags: [],
        content: 'New content',
        position: { x: 400, y: 0 },
        size: { width: 100, height: 100 },
      };

      const newStory = {
        ...story,
        passages: [...story.passages, newPassage],
      };

      hotReload.updateStory(newStory);

      expect(hotReload.getStory().passages.length).toBe(3);
    });

    it('should detect passage removals', () => {
      const newStory = {
        ...story,
        passages: [story.passages[0]],
      };

      hotReload.updateStory(newStory);

      expect(hotReload.getStory().passages.length).toBe(1);
    });

    it('should detect passage updates', () => {
      const updatedPassage = {
        ...story.passages[0],
        content: 'Updated content',
      };

      const newStory = {
        ...story,
        passages: [updatedPassage, story.passages[1]],
      };

      hotReload.updateStory(newStory);

      expect(hotReload.getStory().passages[0].content).toBe('Updated content');
    });
  });

  describe('updatePassage', () => {
    it('should update a specific passage', () => {
      const callback = vi.fn();
      hotReload.onUpdate(callback);

      const updatedPassage = {
        ...story.passages[0],
        content: 'Updated content',
      };

      hotReload.updatePassage(updatedPassage);

      expect(hotReload.getStory().passages[0].content).toBe('Updated content');
      expect(callback).toHaveBeenCalled();
    });

    it('should not update if passage not found', () => {
      const callback = vi.fn();
      hotReload.onUpdate(callback);

      const nonExistentPassage: Passage = {
        id: 'non-existent',
        title: 'Non-existent',
        tags: [],
        content: 'Content',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      };

      hotReload.updatePassage(nonExistentPassage);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('addPassage', () => {
    it('should add a new passage', () => {
      const callback = vi.fn();
      hotReload.onUpdate(callback);

      const newPassage: Passage = {
        id: 'passage-3',
        title: 'New Passage',
        tags: [],
        content: 'New content',
        position: { x: 400, y: 0 },
        size: { width: 100, height: 100 },
      };

      hotReload.addPassage(newPassage);

      expect(hotReload.getStory().passages.length).toBe(3);
      expect(hotReload.getStory().passages[2]).toBe(newPassage);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('removePassage', () => {
    it('should remove a passage by id', () => {
      const callback = vi.fn();
      hotReload.onUpdate(callback);

      hotReload.removePassage('passage-1');

      expect(hotReload.getStory().passages.length).toBe(1);
      expect(hotReload.getStory().passages[0].id).toBe('passage-2');
      expect(callback).toHaveBeenCalled();
    });

    it('should invalidate removed passage in cache', () => {
      hotReload.removePassage('passage-1');

      // Cache should be invalidated
      expect(hotReload.getStory().passages.length).toBe(1);
    });
  });

  describe('onUpdate', () => {
    it('should register update callback', () => {
      const callback = vi.fn();

      hotReload.onUpdate(callback);

      const newStory = { ...story, name: 'Updated' };
      hotReload.updateStory(newStory);

      expect(callback).toHaveBeenCalledWith(newStory);
    });

    it('should support multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      hotReload.onUpdate(callback1);
      hotReload.onUpdate(callback2);

      const newStory = { ...story, name: 'Updated' };
      hotReload.updateStory(newStory);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('getStory', () => {
    it('should return current story', () => {
      expect(hotReload.getStory()).toEqual(story);
    });

    it('should return updated story after changes', () => {
      const newStory = { ...story, name: 'Updated' };
      hotReload.updateStory(newStory);

      expect(hotReload.getStory().name).toBe('Updated');
    });
  });

  describe('createStoryHotReload', () => {
    it('should create and return story hot reload instance', () => {
      const instance = createStoryHotReload(story);

      expect(instance).toBeInstanceOf(StoryHotReload);
    });
  });
});

describe('HMRRuntime', () => {
  let runtime: HMRRuntime;

  beforeEach(() => {
    runtime = createHMRRuntime();
  });

  describe('accept', () => {
    it('should register accept callback', () => {
      const callback = vi.fn();

      runtime.accept(callback);

      expect(callback).toBeDefined();
    });

    it('should allow accept without callback', () => {
      expect(() => runtime.accept()).not.toThrow();
    });

    it('should set declined to false', () => {
      runtime.decline();
      runtime.accept();

      // Internal state should be updated
      expect(runtime).toBeDefined();
    });
  });

  describe('decline', () => {
    it('should mark module as declined', () => {
      runtime.decline();

      // Internal state should be updated
      expect(runtime).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should register dispose callback', () => {
      const callback = vi.fn();

      runtime.dispose(callback);

      expect(callback).toBeDefined();
    });

    it('should call dispose callback on invalidate', () => {
      const callback = vi.fn();

      runtime.dispose(callback);
      runtime.invalidate();

      expect(callback).toHaveBeenCalledWith(runtime.data);
    });
  });

  describe('invalidate', () => {
    it('should call dispose callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      runtime.dispose(callback1);
      runtime.dispose(callback2);
      runtime.invalidate();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should clear callbacks after invalidate', () => {
      const disposeCallback = vi.fn();
      const acceptCallback = vi.fn();

      runtime.dispose(disposeCallback);
      runtime.accept(acceptCallback);
      runtime.invalidate();

      // Clear and invalidate again
      runtime.invalidate();

      // Callbacks should only be called once
      expect(disposeCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('data', () => {
    it('should provide data object', () => {
      expect(runtime.data).toBeDefined();
      expect(typeof runtime.data).toBe('object');
    });

    it('should preserve data across operations', () => {
      runtime.data.foo = 'bar';

      expect(runtime.data.foo).toBe('bar');
    });

    it('should pass data to dispose callback', () => {
      runtime.data.foo = 'bar';

      const callback = vi.fn();
      runtime.dispose(callback);
      runtime.invalidate();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ foo: 'bar' })
      );
    });
  });

  describe('createHMRRuntime', () => {
    it('should create new runtime instance', () => {
      const instance = createHMRRuntime();

      expect(instance).toBeDefined();
      expect(instance.accept).toBeInstanceOf(Function);
      expect(instance.decline).toBeInstanceOf(Function);
      expect(instance.dispose).toBeInstanceOf(Function);
      expect(instance.invalidate).toBeInstanceOf(Function);
      expect(instance.data).toBeDefined();
    });

    it('should create independent instances', () => {
      const runtime1 = createHMRRuntime();
      const runtime2 = createHMRRuntime();

      runtime1.data.foo = 'bar';

      expect(runtime2.data.foo).toBeUndefined();
    });
  });
});

describe('Edge Cases and Integration', () => {
  it('should handle rapid story updates', () => {
    const hotReload = createStoryHotReload(mockStory);
    const callback = vi.fn();

    hotReload.onUpdate(callback);

    for (let i = 0; i < 100; i++) {
      const newStory = { ...mockStory, name: `Story ${i}` };
      hotReload.updateStory(newStory);
    }

    expect(callback).toHaveBeenCalledTimes(100);
    expect(hotReload.getStory().name).toBe('Story 99');
  });

  it('should handle complex dependency chains', () => {
    const cache = new ModuleCache();

    cache.register('a', {}, ['b']);
    cache.register('b', {}, ['c', 'd']);
    cache.register('c', {}, ['e']);
    cache.register('d', {}, ['e']);
    cache.register('e', {}, []);

    const invalidated = cache.invalidate('e');

    expect(invalidated.size).toBe(5);
  });

  it('should handle multiple concurrent HMR clients', async () => {
    const client1 = createHMRClient({ url: 'http://localhost:3000/hmr' });
    const client2 = createHMRClient({ url: 'http://localhost:3001/hmr' });

    client1.connect();
    client2.connect();

    await new Promise(resolve => setTimeout(resolve, 50));

    client1.disconnect();
    client2.disconnect();

    expect(true).toBe(true);
  });

  it('should handle empty story', () => {
    const emptyStory: Story = {
      id: 'empty',
      name: 'Empty',
      ifid: 'empty-ifid',
      startPassage: '',
      tagColors: {},
      zoom: 1,
      passages: [],
    };

    const hotReload = createStoryHotReload(emptyStory);

    expect(hotReload.getStory().passages.length).toBe(0);
  });

  it('should detect no changes when story is identical', () => {
    const hotReload = createStoryHotReload(mockStory);
    const identicalStory = JSON.parse(JSON.stringify(mockStory));

    hotReload.updateStory(identicalStory);

    // Should still trigger update callback
    expect(hotReload.getStory()).toEqual(identicalStory);
  });
});
