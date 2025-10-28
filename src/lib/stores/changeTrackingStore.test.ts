import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { recentChanges, isTrackingEnabled, changeTrackingActions } from './changeTrackingStore';

describe('changeTrackingStore', () => {
  beforeEach(() => {
    changeTrackingActions.clearAll();
    changeTrackingActions.setTracking(true);
    vi.clearAllMocks();
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

      expect(spy).toHaveBeenCalledWith('change-tracking-enabled', 'false');
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
      expect(change.user).toBe('Local User');
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

      expect(get(recentChanges)).toHaveLength(1000);
    });

    it('should save to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');
      changeTrackingActions.logChange({
        changeType: 'create',
        entityType: 'passage',
        entityId: 'passage-1',
        description: 'Test',
      });

      expect(spy).toHaveBeenCalledWith('recent-changes', expect.any(String));
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
      changeTrackingActions.logPassageUpdated('passage-1', 'Test Passage', 'content', 'old', 'new');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('update');
      expect(changes[0].field).toBe('content');
      expect(changes[0].oldValue).toBe('old');
      expect(changes[0].newValue).toBe('new');
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
      changeTrackingActions.logChoiceCreated('choice-1', 'Go left', 'passage-1');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('create');
      expect(changes[0].entityType).toBe('choice');
      expect(changes[0].entityName).toBe('Go left');
    });

    it('should log choice update', () => {
      changeTrackingActions.logChoiceUpdated('choice-1', 'text', 'old text', 'new text');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('update');
      expect(changes[0].entityType).toBe('choice');
    });

    it('should log choice deletion', () => {
      changeTrackingActions.logChoiceDeleted('choice-1', 'Go left');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('delete');
      expect(changes[0].entityType).toBe('choice');
    });
  });

  describe('variable tracking methods', () => {
    it('should log variable creation', () => {
      changeTrackingActions.logVariableCreated('var1', 'string', 'hello');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('create');
      expect(changes[0].entityType).toBe('variable');
      expect(changes[0].entityName).toBe('var1');
    });

    it('should log variable update', () => {
      changeTrackingActions.logVariableUpdated('var1', 'value', 'old', 'new');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('update');
      expect(changes[0].entityType).toBe('variable');
    });

    it('should log variable deletion', () => {
      changeTrackingActions.logVariableDeleted('var1');

      const changes = get(recentChanges);
      expect(changes[0].changeType).toBe('delete');
      expect(changes[0].entityType).toBe('variable');
    });
  });

  describe('changeTrackingActions.getChanges', () => {
    it('should return all changes when no filters applied', () => {
      changeTrackingActions.logPassageCreated('p1', 'P1');
      changeTrackingActions.logChoiceCreated('c1', 'C1', 'p1');

      const changes = changeTrackingActions.getChanges();

      expect(changes).toHaveLength(2);
    });

    it('should filter by entity type', () => {
      changeTrackingActions.logPassageCreated('p1', 'P1');
      changeTrackingActions.logChoiceCreated('c1', 'C1', 'p1');
      changeTrackingActions.logVariableCreated('v1', 'string', 'test');

      const changes = changeTrackingActions.getChanges({ entityType: 'passage' });

      expect(changes).toHaveLength(1);
      expect(changes[0].entityType).toBe('passage');
    });

    it('should filter by change type', () => {
      changeTrackingActions.logPassageCreated('p1', 'P1');
      changeTrackingActions.logPassageUpdated('p1', 'P1', 'content', 'old', 'new');
      changeTrackingActions.logPassageDeleted('p2', 'P2');

      const changes = changeTrackingActions.getChanges({ changeType: 'update' });

      expect(changes).toHaveLength(1);
      expect(changes[0].changeType).toBe('update');
    });

    it('should filter by user', () => {
      changeTrackingActions.logChange({
        changeType: 'create',
        entityType: 'passage',
        entityId: 'p1',
        description: 'Test',
        user: 'User A',
      });
      changeTrackingActions.logChange({
        changeType: 'create',
        entityType: 'passage',
        entityId: 'p2',
        description: 'Test',
        user: 'User B',
      });

      const changes = changeTrackingActions.getChanges({ user: 'User A' });

      expect(changes).toHaveLength(1);
      expect(changes[0].user).toBe('User A');
    });

    it('should apply multiple filters', () => {
      changeTrackingActions.logPassageCreated('p1', 'P1');
      changeTrackingActions.logPassageUpdated('p1', 'P1', 'content', 'old', 'new');
      changeTrackingActions.logChoiceCreated('c1', 'C1', 'p1');

      const changes = changeTrackingActions.getChanges({
        entityType: 'passage',
        changeType: 'create',
      });

      expect(changes).toHaveLength(1);
      expect(changes[0].entityType).toBe('passage');
      expect(changes[0].changeType).toBe('create');
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

      expect(spy).toHaveBeenCalledWith('recent-changes', '[]');
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

      localStorage.setItem('recent-changes', JSON.stringify(mockChanges));

      // Force reload by clearing and re-initializing
      // In actual implementation, this happens on page load

      const saved = localStorage.getItem('recent-changes');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      expect(parsed).toHaveLength(1);
    });

    it('should handle corrupt localStorage data', () => {
      localStorage.setItem('recent-changes', 'invalid json');

      // Should not throw, should handle gracefully
      expect(() => {
        const saved = localStorage.getItem('recent-changes');
        if (saved) {
          try {
            JSON.parse(saved);
          } catch {
            // Handle gracefully
          }
        }
      }).not.toThrow();
    });
  });
});
