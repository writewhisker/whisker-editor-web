/**
 * Tests for Collector
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Collector } from './Collector';
import { MemoryBackend } from './backends';
import { EventTaxonomy } from './EventTaxonomy';
import { PrivacyFilter } from './PrivacyFilter';
import { ConsentManager } from './ConsentManager';
import { ConsentLevel } from './types';
import type { AnalyticsBackend, TimerFunctions } from './types';

describe('Collector', () => {
  let collector: Collector;
  let backend: MemoryBackend;

  // Mock timer functions to avoid real delays
  const mockTimers: TimerFunctions = {
    setTimeout: vi.fn((cb) => {
      cb();
      return 1;
    }),
    clearTimeout: vi.fn(),
    setInterval: vi.fn(() => 2),
    clearInterval: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    collector = Collector.create();
    collector.setTimers(mockTimers);
    backend = new MemoryBackend();
    collector.registerBackend(backend);
    collector.initialize({
      sessionId: 'test-session',
      storyId: 'test-story',
    });
  });

  afterEach(() => {
    collector.reset();
  });

  describe('factory method', () => {
    it('creates instance with defaults', () => {
      const instance = Collector.create();
      expect(instance).toBeInstanceOf(Collector);
      expect(instance.isEnabled()).toBe(true);
    });

    it('creates instance with custom config', () => {
      const instance = Collector.create({
        enabled: false,
        batchSize: 100,
      });
      expect(instance.isEnabled()).toBe(false);
      expect(instance.getConfig().batchSize).toBe(100);
    });
  });

  describe('initialization', () => {
    it('sets session context', () => {
      const c = Collector.create();
      c.setTimers(mockTimers);
      c.initialize({
        storyId: 'story-1',
        storyVersion: '1.0',
        storyTitle: 'My Story',
      });
      const stats = c.getStats();
      expect(stats.queueLimit).toBeGreaterThan(0);
    });

    it('generates session ID if not provided', () => {
      const c = Collector.create();
      c.setTimers(mockTimers);
      c.initialize();
      // Can't directly check sessionId but initialization should succeed
      expect(c.isEnabled()).toBe(true);
    });
  });

  describe('trackEvent', () => {
    it('tracks event successfully', () => {
      const result = collector.trackEvent('story', 'start', { passageId: 'p1' });
      expect(result.success).toBe(true);
    });

    it('adds event to queue', () => {
      collector.trackEvent('story', 'start');
      expect(collector.getQueueSize()).toBeGreaterThan(0);
    });

    it('returns error when disabled', () => {
      collector.setEnabled(false);
      const result = collector.trackEvent('story', 'start');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('increments stats', () => {
      collector.trackEvent('story', 'start');
      collector.trackEvent('passage', 'view');
      const stats = collector.getStats();
      expect(stats.eventsTracked).toBe(2);
    });
  });

  describe('event validation with taxonomy', () => {
    it('allows valid events', () => {
      const taxonomy = EventTaxonomy.create();
      collector.setDependencies({ eventTaxonomy: taxonomy });

      const result = collector.trackEvent('story', 'start');
      expect(result.success).toBe(true);
    });

    it('still tracks unknown events with warning', () => {
      const taxonomy = EventTaxonomy.create();
      collector.setDependencies({ eventTaxonomy: taxonomy });

      const result = collector.trackEvent('unknown', 'action');
      expect(result.success).toBe(true); // Still succeeds
    });
  });

  describe('privacy filtering', () => {
    it('filters events based on consent', () => {
      const consentManager = ConsentManager.create();
      consentManager.initialize();
      consentManager.setConsentLevel(ConsentLevel.NONE);

      const privacyFilter = PrivacyFilter.create(consentManager);
      collector.setDependencies({ privacyFilter });

      collector.trackEvent('story', 'start');
      const stats = collector.getStats();
      expect(stats.eventsFiltered).toBe(1);
      expect(collector.getQueueSize()).toBe(0);
    });

    it('allows events with sufficient consent', () => {
      const consentManager = ConsentManager.create();
      consentManager.initialize();
      consentManager.setConsentLevel(ConsentLevel.ANALYTICS);

      const privacyFilter = PrivacyFilter.create(consentManager);
      collector.setDependencies({ privacyFilter });

      collector.trackEvent('story', 'start');
      const stats = collector.getStats();
      expect(stats.eventsFiltered).toBe(0);
      expect(collector.getQueueSize()).toBeGreaterThan(0);
    });
  });

  describe('batching and flushing', () => {
    it('triggers flush when batch size reached', () => {
      const c = Collector.create({ batchSize: 2 });
      c.setTimers(mockTimers);
      const b = new MemoryBackend();
      c.registerBackend(b);
      c.initialize();

      c.trackEvent('story', 'start');
      c.trackEvent('story', 'end');

      expect(b.getEventCount()).toBe(2);
    });

    it('exports events to backend', () => {
      collector.trackEvent('story', 'start');
      collector.trackEvent('story', 'end');
      collector.flush();

      expect(backend.getEventCount()).toBeGreaterThan(0);
    });

    it('clears queue after successful flush', () => {
      collector.trackEvent('story', 'start');
      collector.flush();

      expect(collector.getQueueSize()).toBe(0);
    });
  });

  describe('backend management', () => {
    it('registers backend', () => {
      const c = Collector.create();
      const b = new MemoryBackend();
      c.registerBackend(b);
      expect(c.getActiveBackends()).toContain(b);
    });

    it('only uses enabled backends', () => {
      const c = Collector.create();
      const b = new MemoryBackend();
      b.enabled = false;
      c.registerBackend(b);
      expect(c.getActiveBackends()).not.toContain(b);
    });

    it('exports to multiple backends', () => {
      const b1 = new MemoryBackend();
      const b2 = new MemoryBackend();
      collector.registerBackend(b1);
      collector.registerBackend(b2);

      collector.trackEvent('story', 'start');
      collector.flush();

      expect(backend.getEventCount()).toBeGreaterThan(0);
      expect(b1.getEventCount()).toBeGreaterThan(0);
      expect(b2.getEventCount()).toBeGreaterThan(0);
    });
  });

  describe('queue management', () => {
    it('respects max queue size', () => {
      const c = Collector.create({ maxQueueSize: 3 });
      c.setTimers({
        ...mockTimers,
        setTimeout: vi.fn(() => 1), // Don't auto-execute
      });
      c.initialize();

      c.trackEvent('story', 'start');
      c.trackEvent('story', 'start');
      c.trackEvent('story', 'start');
      c.trackEvent('story', 'start'); // Should drop oldest

      expect(c.getQueueSize()).toBe(3);
    });

    it('increments failed count when dropping events', () => {
      const c = Collector.create({ maxQueueSize: 2 });
      c.setTimers({
        ...mockTimers,
        setTimeout: vi.fn(() => 1), // Don't auto-execute
      });
      c.initialize();

      c.trackEvent('story', 'start');
      c.trackEvent('story', 'start');
      c.trackEvent('story', 'start'); // Dropped

      const stats = c.getStats();
      expect(stats.eventsFailed).toBe(1);
    });
  });

  describe('session context', () => {
    it('updates session context', () => {
      collector.setSessionContext({
        storyId: 'new-story',
        storyVersion: '2.0',
      });

      collector.trackEvent('story', 'start');
      collector.flush();

      const events = backend.getEvents();
      expect(events[0].storyId).toBe('new-story');
      expect(events[0].storyVersion).toBe('2.0');
    });

    it('starts new session', () => {
      const newSessionId = collector.startNewSession();
      expect(newSessionId).toBeTruthy();
      expect(newSessionId).toMatch(/^[a-f0-9-]+$/);
    });
  });

  describe('statistics', () => {
    it('tracks all stats', () => {
      collector.trackEvent('story', 'start');
      collector.trackEvent('passage', 'view');
      collector.flush();

      const stats = collector.getStats();
      expect(stats.eventsTracked).toBe(2);
      expect(stats.eventsQueued).toBe(2);
      expect(stats.eventsExported).toBe(2);
      expect(stats.batchesExported).toBe(1);
    });

    it('tracks queue size in stats', () => {
      const c = Collector.create();
      c.setTimers({
        ...mockTimers,
        setTimeout: vi.fn(() => 1), // Don't auto-execute
      });
      c.initialize();

      c.trackEvent('story', 'start');
      c.trackEvent('story', 'end');

      const stats = c.getStats();
      expect(stats.queueSize).toBe(2);
    });
  });

  describe('retry on failure', () => {
    it('retries failed exports', () => {
      let attempts = 0;
      const failingBackend: AnalyticsBackend = {
        name: 'failing',
        enabled: true,
        exportBatch: (_events, callback) => {
          attempts++;
          if (attempts < 3) {
            callback(false, 'Network error');
          } else {
            callback(true);
          }
        },
      };

      const c = Collector.create({ maxRetries: 3, initialRetryDelay: 10 });
      c.setTimers({
        setTimeout: vi.fn((cb) => {
          cb();
          return 1;
        }),
        clearTimeout: vi.fn(),
        setInterval: vi.fn(() => 2),
        clearInterval: vi.fn(),
      });
      c.registerBackend(failingBackend);
      c.initialize();

      c.trackEvent('story', 'start');
      c.flush();

      expect(attempts).toBe(3);
    });
  });

  describe('shutdown', () => {
    it('flushes remaining events', () => {
      const c = Collector.create();
      c.setTimers({
        ...mockTimers,
        setTimeout: vi.fn(() => 1), // Don't auto-execute
      });
      const b = new MemoryBackend();
      c.registerBackend(b);
      c.initialize();

      c.trackEvent('story', 'start');
      c.trackEvent('story', 'end');

      expect(b.getEventCount()).toBe(0); // Not flushed yet

      c.shutdown();

      expect(b.getEventCount()).toBe(2); // Flushed on shutdown
    });

    it('stops flush timer', () => {
      collector.shutdown();
      expect(mockTimers.clearInterval).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      collector.trackEvent('story', 'start');

      collector.reset();

      expect(collector.getQueueSize()).toBe(0);
      const stats = collector.getStats();
      expect(stats.eventsTracked).toBe(0);
      expect(stats.eventsQueued).toBe(0);
    });

    it('clears backends', () => {
      collector.reset();
      expect(collector.getActiveBackends()).toHaveLength(0);
    });
  });

  describe('configuration', () => {
    it('returns config copy', () => {
      const config = collector.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.batchSize).toBe(50);
      expect(config.maxQueueSize).toBe(1000);

      // Modifying returned config doesn't affect collector
      config.enabled = false;
      expect(collector.isEnabled()).toBe(true);
    });

    it('enables/disables collector', () => {
      collector.setEnabled(false);
      expect(collector.isEnabled()).toBe(false);

      collector.setEnabled(true);
      expect(collector.isEnabled()).toBe(true);
    });
  });
});
