/**
 * Tests for SessionManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager, SESSION_EVENTS } from './SessionManager';
import type { StorageAdapter } from './types';

describe('SessionManager', () => {
  let manager: SessionManager;
  let mockStorage: StorageAdapter;
  let storedData: Map<string, unknown>;

  beforeEach(() => {
    storedData = new Map();
    mockStorage = {
      get: vi.fn((key: string) => storedData.get(key) ?? null) as StorageAdapter['get'],
      set: vi.fn((key: string, value: unknown) => storedData.set(key, value)) as StorageAdapter['set'],
      remove: vi.fn((key: string) => storedData.delete(key)),
    };
    manager = SessionManager.create(undefined, mockStorage);
  });

  afterEach(() => {
    manager.reset();
    vi.clearAllMocks();
  });

  describe('factory method', () => {
    it('creates instance without dependencies', () => {
      const instance = SessionManager.create();
      expect(instance).toBeInstanceOf(SessionManager);
    });

    it('creates instance with storage', () => {
      const instance = SessionManager.create(undefined, mockStorage);
      expect(instance).toBeInstanceOf(SessionManager);
    });

    it('creates instance with custom config', () => {
      const instance = SessionManager.create({
        sessionTimeout: 60000,
        storageKey: 'custom_session',
      });
      expect(instance).toBeInstanceOf(SessionManager);
    });
  });

  describe('initialization', () => {
    it('starts new session on initialize', () => {
      manager.initialize();
      expect(manager.getSessionId()).toBeTruthy();
      expect(manager.isActive()).toBe(true);
    });

    it('emits SESSION_START event', () => {
      const handler = vi.fn();
      manager.on(SESSION_EVENTS.SESSION_START, handler);
      manager.initialize();
      expect(handler).toHaveBeenCalled();
    });

    it('generates unique session IDs', () => {
      const manager1 = SessionManager.create();
      const manager2 = SessionManager.create();

      manager1.initialize();
      manager2.initialize();

      expect(manager1.getSessionId()).not.toBe(manager2.getSessionId());

      manager1.reset();
      manager2.reset();
    });
  });

  describe('session lifecycle', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('ends session manually', () => {
      const handler = vi.fn();
      manager.on(SESSION_EVENTS.SESSION_END, handler);

      manager.endSession('manual');

      expect(manager.isActive()).toBe(false);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'manual',
        })
      );
    });

    it('starts new session after ending', () => {
      const oldSessionId = manager.getSessionId();
      manager.endSession('manual');
      manager.startSession();

      expect(manager.getSessionId()).not.toBe(oldSessionId);
      expect(manager.isActive()).toBe(true);
    });
  });

  describe('activity tracking', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('records activity', () => {
      const initialState = manager.getState();
      manager.recordActivity();
      const newState = manager.getState();

      expect(newState.lastActivityTime).toBeGreaterThanOrEqual(initialState.lastActivityTime);
    });

    it('records page views', () => {
      manager.recordPageView();
      const state = manager.getState();
      expect(state.pageViews).toBe(2); // Initial + recorded
    });

    it('records events', () => {
      manager.recordEvent();
      const state = manager.getState();
      expect(state.events).toBe(1);
    });

    it('starts new session on activity if inactive', () => {
      manager.endSession('manual');
      const oldSessionId = manager.getSessionId();

      manager.recordActivity();

      expect(manager.getSessionId()).not.toBe(oldSessionId);
      expect(manager.isActive()).toBe(true);
    });
  });

  describe('session timeout', () => {
    it('detects timeout on activity', () => {
      vi.useFakeTimers();

      manager = SessionManager.create(
        { sessionTimeout: 1000 },
        mockStorage
      );
      manager.initialize();

      const sessionId = manager.getSessionId();

      // Advance time past timeout
      vi.advanceTimersByTime(2000);

      // Record activity should trigger timeout check
      manager.recordActivity();

      expect(manager.getSessionId()).not.toBe(sessionId);

      manager.reset();
      vi.useRealTimers();
    });
  });

  describe('session state', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('returns copy of state', () => {
      const state1 = manager.getState();
      const state2 = manager.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });

    it('calculates duration', () => {
      vi.useFakeTimers();

      const manager2 = SessionManager.create();
      manager2.initialize();

      vi.advanceTimersByTime(5000);

      expect(manager2.getDuration()).toBeGreaterThanOrEqual(5000);

      manager2.reset();
      vi.useRealTimers();
    });

    it('returns 0 duration for inactive session', () => {
      manager.endSession('manual');
      expect(manager.getDuration()).toBe(0);
    });
  });

  describe('event subscription', () => {
    it('allows subscribing to events', () => {
      const handler = vi.fn();
      manager.on(SESSION_EVENTS.SESSION_START, handler);
      manager.initialize();
      expect(handler).toHaveBeenCalled();
    });

    it('allows unsubscribing from events', () => {
      const handler = vi.fn();
      const unsubscribe = manager.on(SESSION_EVENTS.SESSION_START, handler);
      unsubscribe();
      manager.initialize();
      expect(handler).not.toHaveBeenCalled();
    });

    it('emits session end with metadata', () => {
      manager.initialize();
      const handler = vi.fn();
      manager.on(SESSION_EVENTS.SESSION_END, handler);

      manager.recordPageView();
      manager.recordEvent();
      manager.endSession('manual');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          pageViews: 2,
          events: 1,
          reason: 'manual',
        })
      );
    });
  });

  describe('persistence', () => {
    it('persists session to storage', () => {
      manager.initialize();
      manager.recordActivity();

      expect(mockStorage.set).toHaveBeenCalled();
    });

    it('restores session from storage', () => {
      const savedState = {
        sessionId: 'saved-session-123',
        startTime: Date.now() - 1000,
        lastActivityTime: Date.now() - 100,
        isActive: true,
        pageViews: 5,
        events: 10,
      };
      storedData.set('whisker_session', JSON.stringify(savedState));

      const newManager = SessionManager.create(undefined, mockStorage);
      newManager.initialize();

      expect(newManager.getSessionId()).toBe('saved-session-123');
      expect(newManager.getState().pageViews).toBe(5);

      newManager.reset();
    });

    it('starts new session if restored session is timed out', () => {
      const savedState = {
        sessionId: 'old-session',
        startTime: Date.now() - 3600000,
        lastActivityTime: Date.now() - 3600000, // 1 hour ago
        isActive: true,
        pageViews: 5,
        events: 10,
      };
      storedData.set('whisker_session', JSON.stringify(savedState));

      const newManager = SessionManager.create(
        { sessionTimeout: 30 * 60 * 1000 }, // 30 minutes
        mockStorage
      );
      newManager.initialize();

      expect(newManager.getSessionId()).not.toBe('old-session');

      newManager.reset();
    });

    it('clears storage on session end', () => {
      manager.initialize();
      manager.endSession('manual');

      expect(mockStorage.remove).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('persists session on shutdown', () => {
      manager.initialize();
      manager.shutdown();

      expect(mockStorage.set).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears session state', () => {
      manager.initialize();
      expect(manager.getSessionId()).toBeTruthy();

      manager.reset();

      expect(manager.getSessionId()).toBe('');
      expect(manager.isActive()).toBe(false);
    });

    it('clears stored session', () => {
      manager.initialize();
      manager.reset();

      expect(mockStorage.remove).toHaveBeenCalled();
    });

    it('clears event listeners', () => {
      const handler = vi.fn();
      manager.on(SESSION_EVENTS.SESSION_START, handler);
      manager.reset();

      manager.initialize();
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
