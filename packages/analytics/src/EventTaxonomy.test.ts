/**
 * Tests for EventTaxonomy
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventTaxonomy, getEventTypes, getCategories, eventTypeExists } from './EventTaxonomy';
import type { AnalyticsEvent } from './types';

describe('EventTaxonomy', () => {
  let taxonomy: EventTaxonomy;

  beforeEach(() => {
    taxonomy = EventTaxonomy.create();
  });

  afterEach(() => {
    taxonomy.resetCustomEvents();
  });

  describe('factory method', () => {
    it('creates instance', () => {
      const instance = EventTaxonomy.create();
      expect(instance).toBeInstanceOf(EventTaxonomy);
    });
  });

  describe('core categories', () => {
    it('has story category with actions', () => {
      const actions = taxonomy.getActions('story');
      expect(actions).toContain('start');
      expect(actions).toContain('complete');
      expect(actions).toContain('restart');
    });

    it('has passage category with actions', () => {
      const actions = taxonomy.getActions('passage');
      expect(actions).toContain('view');
      expect(actions).toContain('exit');
      expect(actions).toContain('reread');
    });

    it('has choice category with actions', () => {
      const actions = taxonomy.getActions('choice');
      expect(actions).toContain('presented');
      expect(actions).toContain('selected');
      expect(actions).toContain('hover');
    });

    it('has save category with actions', () => {
      const actions = taxonomy.getActions('save');
      expect(actions).toContain('create');
      expect(actions).toContain('load');
      expect(actions).toContain('delete');
    });

    it('has error category with actions', () => {
      const actions = taxonomy.getActions('error');
      expect(actions).toContain('script');
      expect(actions).toContain('resource');
      expect(actions).toContain('state');
    });

    it('has user category with actions', () => {
      const actions = taxonomy.getActions('user');
      expect(actions).toContain('consent_change');
      expect(actions).toContain('setting_change');
      expect(actions).toContain('feedback');
    });

    it('has test category with actions', () => {
      const actions = taxonomy.getActions('test');
      expect(actions).toContain('exposure');
      expect(actions).toContain('conversion');
    });
  });

  describe('eventTypeExists', () => {
    it('returns true for valid event types', () => {
      expect(taxonomy.eventTypeExists('story', 'start')).toBe(true);
      expect(taxonomy.eventTypeExists('passage', 'view')).toBe(true);
      expect(taxonomy.eventTypeExists('choice', 'selected')).toBe(true);
    });

    it('returns false for invalid event types', () => {
      expect(taxonomy.eventTypeExists('story', 'invalid_action')).toBe(false);
      expect(taxonomy.eventTypeExists('invalid_category', 'start')).toBe(false);
    });
  });

  describe('getEventTypes', () => {
    it('returns all event types as strings', () => {
      const types = taxonomy.getEventTypes();
      expect(types).toContain('story.start');
      expect(types).toContain('story.complete');
      expect(types).toContain('passage.view');
      expect(types).toContain('choice.selected');
      expect(types).toContain('error.script');
    });
  });

  describe('getCategories', () => {
    it('returns all categories', () => {
      const categories = taxonomy.getCategories();
      expect(categories).toContain('story');
      expect(categories).toContain('passage');
      expect(categories).toContain('choice');
      expect(categories).toContain('save');
      expect(categories).toContain('error');
      expect(categories).toContain('user');
    });
  });

  describe('registerCustomEvent', () => {
    it('registers a custom event', () => {
      taxonomy.registerCustomEvent({
        category: 'custom',
        actions: ['action1', 'action2'],
      });

      expect(taxonomy.eventTypeExists('custom', 'action1')).toBe(true);
      expect(taxonomy.eventTypeExists('custom', 'action2')).toBe(true);
    });

    it('adds actions to existing category', () => {
      taxonomy.registerCustomEvent({
        category: 'story',
        actions: ['custom_action'],
      });

      expect(taxonomy.eventTypeExists('story', 'custom_action')).toBe(true);
      expect(taxonomy.eventTypeExists('story', 'start')).toBe(true); // Still has core actions
    });

    it('stores metadata schema', () => {
      taxonomy.registerCustomEvent({
        category: 'custom',
        actions: ['tracked'],
        metadataSchema: {
          value: 'number',
          label: 'string',
        },
      });

      const schema = taxonomy.getMetadataSchema('custom.tracked');
      expect(schema).toEqual({
        value: 'number',
        label: 'string',
      });
    });
  });

  describe('validateEvent', () => {
    it('validates correct event', () => {
      const event: AnalyticsEvent = {
        category: 'story',
        action: 'start',
        timestamp: Date.now(),
        sessionId: 'test-session',
        storyId: 'test-story',
        metadata: {
          isFirstLaunch: true,
          restoreFromSave: false,
          initialPassage: 'intro',
        },
      };

      const result = taxonomy.validateEvent(event);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing required fields', () => {
      const event = {
        category: 'story',
        action: 'start',
      } as AnalyticsEvent;

      const result = taxonomy.validateEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('timestamp'))).toBe(true);
    });

    it('warns about unknown event type by default', () => {
      const event: AnalyticsEvent = {
        category: 'unknown',
        action: 'action',
        timestamp: Date.now(),
        sessionId: 'test',
        storyId: 'test',
      };

      const result = taxonomy.validateEvent(event);
      expect(result.valid).toBe(true); // Still valid, just warns
      expect(result.warnings.some((w) => w.includes('Unknown event type'))).toBe(true);
    });

    it('validates metadata schema when present', () => {
      taxonomy.registerCustomEvent({
        category: 'custom',
        actions: ['tracked'],
        metadataSchema: {
          value: 'number',
          required: 'string',
        },
      });

      const validEvent: AnalyticsEvent = {
        category: 'custom',
        action: 'tracked',
        timestamp: Date.now(),
        sessionId: 'test',
        storyId: 'test',
        metadata: {
          value: 42,
          required: 'yes',
        },
      };

      const validResult = taxonomy.validateEvent(validEvent);
      expect(validResult.valid).toBe(true);

      const invalidEvent: AnalyticsEvent = {
        category: 'custom',
        action: 'tracked',
        timestamp: Date.now(),
        sessionId: 'test',
        storyId: 'test',
        metadata: {
          value: 'not a number', // Wrong type
        },
      };

      const invalidResult = taxonomy.validateEvent(invalidEvent);
      expect(invalidResult.errors.some((e) => e.includes('value'))).toBe(true);
    });
  });

  describe('module-level functions', () => {
    it('getEventTypes returns event types', () => {
      const types = getEventTypes();
      expect(types).toContain('story.start');
    });

    it('getCategories returns categories', () => {
      const categories = getCategories();
      expect(categories).toContain('story');
    });

    it('eventTypeExists checks validity', () => {
      expect(eventTypeExists('story', 'start')).toBe(true);
      expect(eventTypeExists('invalid', 'action')).toBe(false);
    });
  });
});
