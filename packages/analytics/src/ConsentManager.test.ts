/**
 * Tests for ConsentManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsentManager } from './ConsentManager';
import { ConsentLevel } from './types';
import type { StorageAdapter } from './types';

describe('ConsentManager', () => {
  let manager: ConsentManager;

  beforeEach(() => {
    manager = ConsentManager.create();
  });

  describe('factory method', () => {
    it('creates instance with defaults', () => {
      const instance = ConsentManager.create();
      expect(instance).toBeInstanceOf(ConsentManager);
      expect(instance.getConsentLevel()).toBe(ConsentLevel.NONE);
    });

    it('creates instance with custom config', () => {
      const instance = ConsentManager.create({
        defaultConsentLevel: ConsentLevel.ANALYTICS,
      });
      instance.initialize();
      expect(instance.getConsentLevel()).toBe(ConsentLevel.ANALYTICS);
    });
  });

  describe('initialization', () => {
    it('sets default consent level on first init', () => {
      manager.initialize();
      expect(manager.getConsentLevel()).toBe(ConsentLevel.NONE);
    });

    it('uses custom default if specified', () => {
      const custom = ConsentManager.create({
        defaultConsentLevel: ConsentLevel.ESSENTIAL,
      });
      custom.initialize();
      expect(custom.getConsentLevel()).toBe(ConsentLevel.ESSENTIAL);
    });

    it('generates session ID on init', () => {
      manager.initialize();
      const state = manager.getConsentState();
      expect(state.sessionId).toBeTruthy();
      expect(state.sessionId).toMatch(/^[a-f0-9-]+$/);
    });
  });

  describe('consent level management', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('sets consent level', () => {
      manager.setConsentLevel(ConsentLevel.ANALYTICS);
      expect(manager.getConsentLevel()).toBe(ConsentLevel.ANALYTICS);
    });

    it('sets consent level to FULL', () => {
      manager.setConsentLevel(ConsentLevel.FULL);
      expect(manager.getConsentLevel()).toBe(ConsentLevel.FULL);
    });

    it('sets consent level to NONE', () => {
      manager.setConsentLevel(ConsentLevel.ANALYTICS);
      manager.setConsentLevel(ConsentLevel.NONE);
      expect(manager.getConsentLevel()).toBe(ConsentLevel.NONE);
    });

    it('updates timestamp when consent changes', () => {
      const before = Date.now();
      manager.setConsentLevel(ConsentLevel.ANALYTICS);
      const state = manager.getConsentState();
      expect(state.timestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe('hasConsent', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('returns false when consent is NONE', () => {
      manager.setConsentLevel(ConsentLevel.NONE);
      expect(manager.hasConsent()).toBe(false);
    });

    it('returns true when consent is ESSENTIAL or higher', () => {
      manager.setConsentLevel(ConsentLevel.ESSENTIAL);
      expect(manager.hasConsent()).toBe(true);

      manager.setConsentLevel(ConsentLevel.ANALYTICS);
      expect(manager.hasConsent()).toBe(true);

      manager.setConsentLevel(ConsentLevel.FULL);
      expect(manager.hasConsent()).toBe(true);
    });
  });

  describe('user ID management', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('returns null when consent is not FULL', () => {
      manager.setConsentLevel(ConsentLevel.ANALYTICS);
      expect(manager.getUserId()).toBeNull();
    });

    it('generates user ID when consent is FULL', () => {
      manager.setConsentLevel(ConsentLevel.FULL);
      const userId = manager.getUserId();
      expect(userId).toBeTruthy();
      expect(userId).toMatch(/^[a-f0-9-]+$/);
    });

    it('persists user ID on subsequent calls', () => {
      manager.setConsentLevel(ConsentLevel.FULL);
      const userId1 = manager.getUserId();
      const userId2 = manager.getUserId();
      expect(userId1).toBe(userId2);
    });

    it('clears user ID when consent drops below FULL', () => {
      manager.setConsentLevel(ConsentLevel.FULL);
      manager.getUserId(); // Generate user ID
      manager.setConsentLevel(ConsentLevel.ANALYTICS);
      expect(manager.getUserId()).toBeNull();
    });
  });

  describe('consent state', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('returns complete consent state', () => {
      manager.setConsentLevel(ConsentLevel.ANALYTICS);
      const state = manager.getConsentState();

      expect(state.level).toBe(ConsentLevel.ANALYTICS);
      expect(state.levelName).toBe('Analytics');
      expect(state.timestamp).toBeTruthy();
      expect(state.version).toBe('1.0.0');
      expect(state.hasConsent).toBe(true);
      expect(state.sessionId).toBeTruthy();
    });

    it('uses custom version if specified', () => {
      const custom = ConsentManager.create({
        consentVersion: '2.0.0',
      });
      custom.initialize();
      const state = custom.getConsentState();
      expect(state.version).toBe('2.0.0');
    });
  });

  describe('storage persistence', () => {
    it('persists consent to storage', () => {
      const storage: Record<string, unknown> = {};
      const adapter: StorageAdapter = {
        get: <T>(key: string) => (storage[key] as T) ?? null,
        set: <T>(key: string, value: T) => {
          storage[key] = value;
        },
        remove: (key: string) => {
          delete storage[key];
        },
      };

      const m = ConsentManager.create({}, adapter);
      m.initialize();
      m.setConsentLevel(ConsentLevel.ANALYTICS);

      expect(storage['whisker_consent']).toBeTruthy();
    });

    it('restores consent from storage', () => {
      const storage: Record<string, unknown> = {
        whisker_consent: {
          level: ConsentLevel.FULL,
          timestamp: Date.now(),
          version: '1.0.0',
        },
      };
      const adapter: StorageAdapter = {
        get: <T>(key: string) => (storage[key] as T) ?? null,
        set: <T>(key: string, value: T) => {
          storage[key] = value;
        },
        remove: (key: string) => {
          delete storage[key];
        },
      };

      const m = ConsentManager.create({}, adapter);
      m.initialize();

      expect(m.getConsentLevel()).toBe(ConsentLevel.FULL);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      manager.initialize();
      manager.setConsentLevel(ConsentLevel.FULL);
      manager.getUserId();

      manager.reset();

      expect(manager.getConsentLevel()).toBe(ConsentLevel.NONE);
      expect(manager.getUserId()).toBeNull();
    });
  });

  describe('revokeConsent', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('sets consent to NONE', () => {
      manager.setConsentLevel(ConsentLevel.FULL);
      manager.revokeConsent();
      expect(manager.getConsentLevel()).toBe(ConsentLevel.NONE);
    });

    it('clears user ID', () => {
      manager.setConsentLevel(ConsentLevel.FULL);
      manager.getUserId();
      manager.revokeConsent();
      expect(manager.getUserId()).toBeNull();
    });
  });
});
