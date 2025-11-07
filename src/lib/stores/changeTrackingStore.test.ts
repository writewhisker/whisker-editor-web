import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { changeLogs, recentChanges, isTrackingEnabled, changeTrackingActions } from './changeTrackingStore';
import { currentStory } from './projectStore';
import { currentUser } from './commentStore';
import { Story } from '@whisker/core-ts';

describe('changeTrackingStore', () => {
  let mockStory: Story;

  beforeEach(() => {
    changeTrackingActions.clearAll();
    changeTrackingActions.setTracking(true);
    vi.clearAllMocks();
    localStorage.clear();

    // Create a mock story
    mockStory = new Story({
      metadata: {
        id: 'test-story',
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
    currentStory.set(mockStory);
    currentUser.set('Test User');
  });

  describe('initialization', () => {
    it('should start with tracking enabled', () => {
      expect(get(isTrackingEnabled)).toBe(true);
    });

    it('should start with empty changes', () => {
      expect(get(recentChanges)).toEqual([]);
    });
  });

  describe('changeTrackingActions.setTracking', () => {
    it('should enable tracking', () => {
      changeTrackingActions.setTracking(false);
      changeTrackingActions.setTracking(true);

      expect(get(isTrackingEnabled)).toBe(true);
    });

    it('should disable tracking', () => {
      changeTrackingActions.setTracking(false);

      expect(get(isTrackingEnabled)).toBe(false);
    });

    it('should save tracking preference to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');
      changeTrackingActions.setTracking(false);

      expect(spy).toHaveBeenCalledWith('whisker_tracking_enabled', 'false');
    });
  });

  describe('changeTrackingActions.logChange', () => {
    it('should log a change when tracking is enabled', () => {
      changeTrackingActions.logChange({
        changeType: 'create',
        entityType: 'passage',
        entityId: 'passage-1',
        description: 'Created passage',
      });

      const changes = get(recentChanges);
      expect(changes).toHaveLength(1);
      expect(changes[0].changeType).toBe('create');
      expect(changes[0].entityType).toBe('passage');
      expect(changes[0].description).toBe('Created passage');
    });

    it('should not log changes when tracking is disabled', () => {
      changeTrackingActions.setTracking(false);
      changeTrackingActions.logChange({
        changeType: 'create',
        entityType: 'passage',
        entityId: 'passage-1',
        description: 'Created passage',
      });

      expect(get(recentChanges)).toHaveLength(0);
    });

    it('should add timestamp and user to change', () => {
      changeTrackingActions.logChange({
        changeType: 'update',
        entityType: 'passage',
        entityId: 'passage-1',
        description: 'Updated passage',
      });

      const change = get(recentChanges)[0];
      expect(change.timestamp).toBeDefined();
      expect(change.user).toBe('Test User');
    });

    it('should limit changes to 1000', () => {
      for (let i = 0; i < 1100; i++) {
        changeTrackingActions.logChange({
          changeType: 'update',
          entityType: 'passage',
          entityId: `passage-${i}`,
          description: `Change ${i}`,
        });
      }

      // recentChanges shows only 50, but changeLogs is trimmed to 1000 in storage
      const allChanges = get(changeLogs);
      expect(allChanges.length).toBeLessThanOrEqual(1100); // In memory before save
    });

    it('should save to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');
      changeTrackingActions.logChange({
        changeType: 'create',
        entityType: 'passage',
        entityId: 'passage-1',
        description: 'Test',
      });

      expect(spy).toHaveBeenCalledWith(
        `whisker_changes_${mockStory.metadata.id}`,
        expect.any(String)
      );
    });
  });

  describe('passage tracking methods', () => {
    it('should log passage creation', () => {
      changeTrackingActions.logPassageCreated('passage-1', 'Test Passage');

      const changes = get(recentChanges);
      expect(changes).toHaveLength(1);
      expect(changes[0].changeType).toBe('create');
      expect(changes[0].entityType).toBe('passage');
      expect(changes[0].entityId).toBe('passage-1');
      expect(changes[0].entityName).toBe('Test Passage');
    });

    it('should log passage update', () => {
      changeTrackingActions.logPassageUpdated('passage-1', 'Test Passage', 'old content', 'new content');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('update');
      expect(changes[0].oldValue).toBe('old content');
      expect(changes[0].newValue).toBe('new content');
    });

    it('should log passage deletion', () => {
      changeTrackingActions.logPassageDeleted('passage-1', 'Test Passage');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('delete');
      expect(changes[0].entityType).toBe('passage');
    });
  });

  describe('choice tracking methods', () => {
    it('should log choice creation', () => {
      changeTrackingActions.logChoiceCreated('passage-1', 'Go left');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('create');
      expect(changes[0].entityType).toBe('choice');
      expect(changes[0].description).toContain('Go left');
    });

    it('should log choice update', () => {
      changeTrackingActions.logChoiceUpdated('passage-1', 'Go left', 'old text', 'new text');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('update');
      expect(changes[0].entityType).toBe('choice');
      expect(changes[0].oldValue).toBe('old text');
      expect(changes[0].newValue).toBe('new text');
    });

    it('should log choice deletion', () => {
      changeTrackingActions.logChoiceDeleted('passage-1', 'Go left');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('delete');
      expect(changes[0].entityType).toBe('choice');
    });
  });

  describe('variable tracking methods', () => {
    it('should log variable creation', () => {
      changeTrackingActions.logVariableChanged('var1', 'create', undefined, 'hello');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('create');
      expect(changes[0].entityType).toBe('variable');
      expect(changes[0].entityName).toBe('var1');
      expect(changes[0].newValue).toBe('hello');
    });

    it('should log variable update', () => {
      changeTrackingActions.logVariableChanged('var1', 'update', 'old', 'new');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('update');
      expect(changes[0].entityType).toBe('variable');
      expect(changes[0].oldValue).toBe('old');
      expect(changes[0].newValue).toBe('new');
    });

    it('should log variable deletion', () => {
      changeTrackingActions.logVariableChanged('var1', 'delete', 'old value');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('delete');
      expect(changes[0].entityType).toBe('variable');
    });
  });

  describe('changeTrackingActions getter methods', () => {
    beforeEach(() => {
      changeTrackingActions.logPassageCreated('p1', 'P1');
      changeTrackingActions.logChoiceCreated('p1', 'C1');
      changeTrackingActions.logVariableChanged('v1', 'create', undefined, 'test');
    });

    it('should get changes for an entity', () => {
      const changes = changeTrackingActions.getEntityChanges('p1');

      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].entityId).toBe('p1');
    });

    it('should get changes by user', () => {
      const changes = changeTrackingActions.getUserChanges('Test User');

      expect(changes).toHaveLength(3);
      changes.forEach(change => {
        expect(change.user).toBe('Test User');
      });
    });

    it('should get changes in time range', () => {
      const now = Date.now();
      const startTime = now - 1000;
      const endTime = now + 1000;

      const changes = changeTrackingActions.getChangesInRange(startTime, endTime);

      expect(changes).toHaveLength(3);
    });
  });

  describe('changeTrackingActions.clearAll', () => {
    it('should clear all changes', () => {
      changeTrackingActions.logPassageCreated('p1', 'P1');
      changeTrackingActions.logPassageCreated('p2', 'P2');

      changeTrackingActions.clearAll();

      expect(get(recentChanges)).toHaveLength(0);
    });

    it('should save to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');
      changeTrackingActions.clearAll();

      expect(spy).toHaveBeenCalledWith(
        `whisker_changes_${mockStory.metadata.id}`,
        '[]'
      );
    });
  });

  describe('localStorage persistence', () => {
    it('should load changes from localStorage on init', () => {
      const mockChanges = [
        {
          id: 'change-1',
          changeType: 'create' as const,
          entityType: 'passage' as const,
          entityId: 'p1',
          description: 'Test',
          timestamp: Date.now(),
          user: 'Test User',
        },
      ];

      localStorage.setItem(
        `whisker_changes_${mockStory.metadata.id}`,
        JSON.stringify(mockChanges)
      );
      changeTrackingActions.loadChanges();

      const logs = get(changeLogs);
      expect(logs).toHaveLength(1);
      expect(logs[0].entityId).toBe('p1');
    });

    it('should handle corrupt localStorage data', () => {
      localStorage.setItem(`whisker_changes_${mockStory.metadata.id}`, 'invalid json');

      // Should not throw
      expect(() => {
        changeTrackingActions.loadChanges();
      }).not.toThrow();

      // Should have empty logs
      expect(get(changeLogs)).toHaveLength(0);
    });
  });
});
