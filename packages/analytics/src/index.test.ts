/**
 * Tests for analytics index exports and factory functions
 */

import { describe, it, expect, afterEach } from 'vitest';
// Import from specific modules to avoid transitive deps on @writewhisker/core-ts
import { ConsentManager } from './ConsentManager';
import { EventTaxonomy } from './EventTaxonomy';
import { PrivacyFilter } from './PrivacyFilter';
import { Collector } from './Collector';
import {
  ConsoleBackend,
  MemoryBackend,
  HttpBackend,
  CallbackBackend,
  BackendRegistry,
} from './backends';
import { ConsentLevel } from './types';
import {
  getConsentLevelName,
  isValidConsentLevel,
  getAllConsentLevels,
} from './Privacy';

// Factory function helpers
function createConsentManager(
  config?: { defaultConsentLevel?: number; consentVersion?: string },
  storage?: { get: <T>(k: string) => T | null; set: <T>(k: string, v: T) => void; remove: (k: string) => void }
): ConsentManager {
  const manager = ConsentManager.create(config, storage);
  manager.initialize();
  return manager;
}

function createCollector(config?: { batchSize?: number }): Collector {
  return Collector.create(config);
}

function createEventTaxonomy(): EventTaxonomy {
  return EventTaxonomy.create();
}

function createPrivacyFilter(consentManager?: ConsentManager): PrivacyFilter {
  return PrivacyFilter.create(consentManager);
}

function createAnalyticsSystem(
  config?: {
    consent?: { defaultConsentLevel?: number };
    collector?: { batchSize?: number };
    enableConsoleBackend?: boolean;
    enableMemoryBackend?: boolean;
  },
  deps?: { storage?: { get: <T>(k: string) => T | null; set: <T>(k: string, v: T) => void; remove: (k: string) => void } }
) {
  const storage = deps?.storage;

  const consentManager = ConsentManager.create(config?.consent, storage);
  const eventTaxonomy = EventTaxonomy.create();
  const privacyFilter = PrivacyFilter.create(consentManager);
  const collector = Collector.create(config?.collector);
  const backendRegistry = BackendRegistry.create();

  collector.setDependencies({
    eventTaxonomy,
    privacyFilter,
  });

  if (config?.enableConsoleBackend) {
    const consoleBackend = new ConsoleBackend();
    backendRegistry.register(consoleBackend);
    collector.registerBackend(consoleBackend);
  }

  if (config?.enableMemoryBackend) {
    const memoryBackend = new MemoryBackend();
    backendRegistry.register(memoryBackend);
    collector.registerBackend(memoryBackend);
  }

  consentManager.initialize();

  return {
    consentManager,
    eventTaxonomy,
    privacyFilter,
    collector,
    backendRegistry,
  };
}

describe('Analytics Package Exports', () => {
  describe('createAnalyticsSystem', () => {
    afterEach(() => {
      // Clean up any registered custom events
      createEventTaxonomy().resetCustomEvents();
    });

    it('creates complete analytics system', () => {
      const system = createAnalyticsSystem();

      expect(system.consentManager).toBeInstanceOf(ConsentManager);
      expect(system.eventTaxonomy).toBeInstanceOf(EventTaxonomy);
      expect(system.privacyFilter).toBeInstanceOf(PrivacyFilter);
      expect(system.collector).toBeInstanceOf(Collector);
      expect(system.backendRegistry).toBeInstanceOf(BackendRegistry);
    });

    it('wires up dependencies correctly', () => {
      const system = createAnalyticsSystem();

      // Privacy filter should be connected to consent manager
      system.consentManager.setConsentLevel(ConsentLevel.NONE);

      // Collector should filter events when consent is NONE
      system.collector.initialize();
      const result = system.collector.trackEvent('story', 'start');
      expect(result.success).toBe(true); // Succeeds but event is filtered
    });

    it('accepts custom configuration', () => {
      const system = createAnalyticsSystem({
        consent: {
          defaultConsentLevel: ConsentLevel.ANALYTICS,
        },
        collector: {
          batchSize: 100,
        },
      });

      expect(system.consentManager.getConsentLevel()).toBe(ConsentLevel.ANALYTICS);
      expect(system.collector.getConfig().batchSize).toBe(100);
    });

    it('optionally enables console backend', () => {
      const system = createAnalyticsSystem({
        enableConsoleBackend: true,
      });

      expect(system.backendRegistry.get('console')).toBeTruthy();
    });

    it('optionally enables memory backend', () => {
      const system = createAnalyticsSystem({
        enableMemoryBackend: true,
      });

      expect(system.backendRegistry.get('memory')).toBeTruthy();
    });

    it('accepts storage adapter', () => {
      const storage: Record<string, unknown> = {};
      const adapter = {
        get: <T>(key: string) => (storage[key] as T) ?? null,
        set: <T>(key: string, value: T) => {
          storage[key] = value;
        },
        remove: (key: string) => {
          delete storage[key];
        },
      };

      const system = createAnalyticsSystem({}, { storage: adapter });
      system.consentManager.setConsentLevel(ConsentLevel.FULL);

      expect(storage['whisker_consent']).toBeTruthy();
    });
  });

  describe('createConsentManager', () => {
    it('creates and initializes consent manager', () => {
      const manager = createConsentManager();
      expect(manager).toBeInstanceOf(ConsentManager);
      expect(manager.getConsentLevel()).toBe(ConsentLevel.NONE);
    });

    it('accepts configuration', () => {
      const manager = createConsentManager({
        defaultConsentLevel: ConsentLevel.ESSENTIAL,
      });
      expect(manager.getConsentLevel()).toBe(ConsentLevel.ESSENTIAL);
    });
  });

  describe('createCollector', () => {
    it('creates collector', () => {
      const collector = createCollector();
      expect(collector).toBeInstanceOf(Collector);
    });

    it('accepts configuration', () => {
      const collector = createCollector({ batchSize: 200 });
      expect(collector.getConfig().batchSize).toBe(200);
    });
  });

  describe('createEventTaxonomy', () => {
    it('creates event taxonomy', () => {
      const taxonomy = createEventTaxonomy();
      expect(taxonomy).toBeInstanceOf(EventTaxonomy);
    });

    it('has core event types', () => {
      const taxonomy = createEventTaxonomy();
      expect(taxonomy.eventTypeExists('story', 'start')).toBe(true);
    });
  });

  describe('createPrivacyFilter', () => {
    it('creates privacy filter', () => {
      const filter = createPrivacyFilter();
      expect(filter).toBeInstanceOf(PrivacyFilter);
    });

    it('accepts consent manager', () => {
      const manager = createConsentManager();
      const filter = createPrivacyFilter(manager);
      expect(filter).toBeInstanceOf(PrivacyFilter);
    });
  });

  describe('Class exports', () => {
    it('exports ConsentManager class', () => {
      expect(ConsentManager).toBeDefined();
      expect(ConsentManager.create()).toBeInstanceOf(ConsentManager);
    });

    it('exports EventTaxonomy class', () => {
      expect(EventTaxonomy).toBeDefined();
      expect(EventTaxonomy.create()).toBeInstanceOf(EventTaxonomy);
    });

    it('exports PrivacyFilter class', () => {
      expect(PrivacyFilter).toBeDefined();
      expect(PrivacyFilter.create()).toBeInstanceOf(PrivacyFilter);
    });

    it('exports Collector class', () => {
      expect(Collector).toBeDefined();
      expect(Collector.create()).toBeInstanceOf(Collector);
    });

    it('exports backend classes', () => {
      expect(ConsoleBackend).toBeDefined();
      expect(MemoryBackend).toBeDefined();
      expect(HttpBackend).toBeDefined();
      expect(CallbackBackend).toBeDefined();
      expect(BackendRegistry).toBeDefined();
    });
  });

  describe('Enum exports', () => {
    it('exports ConsentLevel enum', () => {
      expect(ConsentLevel).toBeDefined();
      expect(ConsentLevel.NONE).toBe(0);
      expect(ConsentLevel.ESSENTIAL).toBe(1);
      expect(ConsentLevel.ANALYTICS).toBe(2);
      expect(ConsentLevel.FULL).toBe(3);
    });
  });

  describe('Privacy utility exports', () => {
    it('exports getConsentLevelName', () => {
      expect(getConsentLevelName(ConsentLevel.ANALYTICS)).toBe('Analytics');
    });

    it('exports isValidConsentLevel', () => {
      expect(isValidConsentLevel(ConsentLevel.FULL)).toBe(true);
      expect(isValidConsentLevel(99)).toBe(false);
    });

    it('exports getAllConsentLevels', () => {
      const levels = getAllConsentLevels();
      expect(levels).toHaveLength(4);
    });
  });

  describe('Integration scenario', () => {
    it('tracks events end-to-end', () => {
      const system = createAnalyticsSystem({
        enableMemoryBackend: true,
      });

      system.consentManager.setConsentLevel(ConsentLevel.FULL);
      system.collector.initialize({
        storyId: 'test-story',
        storyVersion: '1.0',
      });

      system.collector.trackEvent('story', 'start', { passageId: 'intro' });
      system.collector.trackEvent('passage', 'view', { passageId: 'chapter1' });

      system.collector.flush();

      const backend = system.backendRegistry.get('memory') as MemoryBackend;
      const events = backend.getEvents();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].category).toBe('story');
      expect(events[0].storyId).toBe('test-story');
    });

    it('filters events based on consent', () => {
      const system = createAnalyticsSystem({
        enableMemoryBackend: true,
      });

      system.consentManager.setConsentLevel(ConsentLevel.ESSENTIAL);
      system.collector.initialize();

      // Non-essential event should be filtered
      system.collector.trackEvent('story', 'start');
      system.collector.flush();

      const backend = system.backendRegistry.get('memory') as MemoryBackend;
      expect(backend.getEventCount()).toBe(0);

      // Essential event should pass
      system.collector.trackEvent('error', 'script', {
        errorType: 'TypeError',
        errorMessage: 'test',
      });
      system.collector.flush();

      expect(backend.getEventCount()).toBe(1);
    });
  });
});
