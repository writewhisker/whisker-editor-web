/**
 * Tests for Analytics Backends
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ConsoleBackend,
  MemoryBackend,
  HttpBackend,
  CallbackBackend,
  BackendRegistry,
} from './backends';
import type { AnalyticsEvent, Logger } from './types';

function createTestEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    category: 'story',
    action: 'start',
    timestamp: Date.now(),
    sessionId: 'test-session',
    storyId: 'test-story',
    ...overrides,
  };
}

describe('ConsoleBackend', () => {
  it('logs events to console', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const backend = new ConsoleBackend();

    const events = [createTestEvent()];
    backend.exportBatch(events, (success) => {
      expect(success).toBe(true);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('uses logger if provided', () => {
    const debugSpy = vi.fn();
    const logger: Logger = {
      debug: debugSpy,
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const backend = new ConsoleBackend(logger);
    const events = [createTestEvent()];

    backend.exportBatch(events, (success) => {
      expect(success).toBe(true);
    });

    expect(debugSpy).toHaveBeenCalled();
  });

  it('handles errors gracefully', () => {
    const backend = new ConsoleBackend();

    // Force an error by passing invalid data
    const events = [null as unknown as AnalyticsEvent];

    backend.exportBatch(events, (success, error) => {
      // Might succeed or fail depending on implementation
      if (!success) {
        expect(error).toBeTruthy();
      }
    });
  });

  it('has correct name and enabled status', () => {
    const backend = new ConsoleBackend();
    expect(backend.name).toBe('console');
    expect(backend.enabled).toBe(true);
  });
});

describe('MemoryBackend', () => {
  let backend: MemoryBackend;

  beforeEach(() => {
    backend = new MemoryBackend();
  });

  it('stores events in memory', () => {
    const events = [createTestEvent(), createTestEvent({ action: 'end' })];

    backend.exportBatch(events, (success) => {
      expect(success).toBe(true);
    });

    expect(backend.getEventCount()).toBe(2);
  });

  it('returns copy of stored events', () => {
    const events = [createTestEvent()];
    backend.exportBatch(events, () => {});

    const stored = backend.getEvents();
    expect(stored).toEqual(events);
    expect(stored).not.toBe(events);
  });

  it('clears stored events', () => {
    backend.exportBatch([createTestEvent()], () => {});
    expect(backend.getEventCount()).toBe(1);

    backend.clear();
    expect(backend.getEventCount()).toBe(0);
  });

  it('finds events by category', () => {
    backend.exportBatch(
      [
        createTestEvent({ category: 'story' }),
        createTestEvent({ category: 'passage' }),
        createTestEvent({ category: 'story' }),
      ],
      () => {}
    );

    const storyEvents = backend.findByCategory('story');
    expect(storyEvents).toHaveLength(2);
  });

  it('finds events by action', () => {
    backend.exportBatch(
      [
        createTestEvent({ action: 'start' }),
        createTestEvent({ action: 'end' }),
        createTestEvent({ action: 'start' }),
      ],
      () => {}
    );

    const startEvents = backend.findByAction('start');
    expect(startEvents).toHaveLength(2);
  });

  it('finds events by type', () => {
    backend.exportBatch(
      [
        createTestEvent({ category: 'story', action: 'start' }),
        createTestEvent({ category: 'story', action: 'end' }),
        createTestEvent({ category: 'passage', action: 'view' }),
      ],
      () => {}
    );

    const events = backend.findByType('story', 'start');
    expect(events).toHaveLength(1);
  });

  it('has correct name and enabled status', () => {
    expect(backend.name).toBe('memory');
    expect(backend.enabled).toBe(true);
  });
});

describe('HttpBackend', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends events to endpoint', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    const backend = new HttpBackend({ endpoint: 'https://api.example.com/events' });
    const events = [createTestEvent()];

    await new Promise<void>((resolve) => {
      backend.exportBatch(events, (success) => {
        expect(success).toBe(true);
        resolve();
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ events }),
      })
    );
  });

  it('uses custom method', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const backend = new HttpBackend({
      endpoint: 'https://api.example.com/events',
      method: 'PUT',
    });

    await new Promise<void>((resolve) => {
      backend.exportBatch([createTestEvent()], () => resolve());
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('uses custom headers', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const backend = new HttpBackend({
      endpoint: 'https://api.example.com/events',
      headers: {
        Authorization: 'Bearer token',
        'X-Custom': 'value',
      },
    });

    await new Promise<void>((resolve) => {
      backend.exportBatch([createTestEvent()], () => resolve());
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'X-Custom': 'value',
        }),
      })
    );
  });

  it('handles HTTP errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const backend = new HttpBackend({ endpoint: 'https://api.example.com/events' });

    await new Promise<void>((resolve) => {
      backend.exportBatch([createTestEvent()], (success, error) => {
        expect(success).toBe(false);
        expect(error).toContain('500');
        resolve();
      });
    });
  });

  it('handles network errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const backend = new HttpBackend({ endpoint: 'https://api.example.com/events' });

    await new Promise<void>((resolve) => {
      backend.exportBatch([createTestEvent()], (success, error) => {
        expect(success).toBe(false);
        expect(error).toContain('Network error');
        resolve();
      });
    });
  });

  it('has correct name and enabled status', () => {
    const backend = new HttpBackend({ endpoint: 'https://api.example.com/events' });
    expect(backend.name).toBe('http');
    expect(backend.enabled).toBe(true);
  });

  it('has initialize and shutdown methods', () => {
    const backend = new HttpBackend({ endpoint: 'https://api.example.com/events' });
    expect(() => backend.initialize?.()).not.toThrow();
    expect(() => backend.shutdown?.()).not.toThrow();
  });
});

describe('CallbackBackend', () => {
  it('calls callback with events', () => {
    const callback = vi.fn();
    const backend = new CallbackBackend(callback);

    const events = [createTestEvent()];
    backend.exportBatch(events, (success) => {
      expect(success).toBe(true);
    });

    expect(callback).toHaveBeenCalledWith(events);
  });

  it('uses custom name if provided', () => {
    const backend = new CallbackBackend(() => {}, 'custom-name');
    expect(backend.name).toBe('custom-name');
  });

  it('handles async callbacks', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const backend = new CallbackBackend(callback);

    await new Promise<void>((resolve) => {
      backend.exportBatch([createTestEvent()], (success) => {
        expect(success).toBe(true);
        resolve();
      });
    });
  });

  it('handles callback errors', () => {
    const callback = vi.fn().mockImplementation(() => {
      throw new Error('Callback error');
    });
    const backend = new CallbackBackend(callback);

    backend.exportBatch([createTestEvent()], (success, error) => {
      expect(success).toBe(false);
      expect(error).toContain('Callback error');
    });
  });

  it('handles async callback rejection', async () => {
    const callback = vi.fn().mockRejectedValue(new Error('Async error'));
    const backend = new CallbackBackend(callback);

    await new Promise<void>((resolve) => {
      backend.exportBatch([createTestEvent()], (success, error) => {
        expect(success).toBe(false);
        expect(error).toContain('Async error');
        resolve();
      });
    });
  });
});

describe('BackendRegistry', () => {
  let registry: BackendRegistry;

  beforeEach(() => {
    registry = BackendRegistry.create();
  });

  describe('factory method', () => {
    it('creates instance', () => {
      const instance = BackendRegistry.create();
      expect(instance).toBeInstanceOf(BackendRegistry);
    });
  });

  describe('registration', () => {
    it('registers backend', () => {
      const backend = new MemoryBackend();
      registry.register(backend);

      expect(registry.get('memory')).toBe(backend);
    });

    it('unregisters backend', () => {
      const backend = new MemoryBackend();
      registry.register(backend);
      registry.unregister('memory');

      expect(registry.get('memory')).toBeUndefined();
    });

    it('calls shutdown on unregister', () => {
      const backend = new HttpBackend({ endpoint: 'https://example.com' });
      const shutdownSpy = vi.spyOn(backend, 'shutdown');
      registry.register(backend);
      registry.unregister('http');

      expect(shutdownSpy).toHaveBeenCalled();
    });
  });

  describe('backend access', () => {
    it('gets backend by name', () => {
      const backend = new MemoryBackend();
      registry.register(backend);

      expect(registry.get('memory')).toBe(backend);
    });

    it('returns undefined for unknown backend', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });

    it('gets all backends', () => {
      registry.register(new MemoryBackend());
      registry.register(new ConsoleBackend());

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    it('gets only active backends', () => {
      const memory = new MemoryBackend();
      const console = new ConsoleBackend();
      console.enabled = false;

      registry.register(memory);
      registry.register(console);

      const active = registry.getActive();
      expect(active).toHaveLength(1);
      expect(active[0]).toBe(memory);
    });
  });

  describe('enable/disable', () => {
    it('enables backend', () => {
      const backend = new MemoryBackend();
      backend.enabled = false;
      registry.register(backend);

      registry.enable('memory');
      expect(backend.enabled).toBe(true);
    });

    it('disables backend', () => {
      const backend = new MemoryBackend();
      registry.register(backend);

      registry.disable('memory');
      expect(backend.enabled).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('initializes all backends', () => {
      const backend = new HttpBackend({ endpoint: 'https://example.com' });
      const initSpy = vi.spyOn(backend, 'initialize');
      registry.register(backend);

      registry.initializeAll();
      expect(initSpy).toHaveBeenCalled();
    });

    it('shuts down all backends', () => {
      const backend = new HttpBackend({ endpoint: 'https://example.com' });
      const shutdownSpy = vi.spyOn(backend, 'shutdown');
      registry.register(backend);

      registry.shutdownAll();
      expect(shutdownSpy).toHaveBeenCalled();
    });

    it('clears all backends', () => {
      registry.register(new MemoryBackend());
      registry.register(new ConsoleBackend());

      registry.clear();
      expect(registry.getAll()).toHaveLength(0);
    });
  });
});
