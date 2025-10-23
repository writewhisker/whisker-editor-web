import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  viewMode,
  panelVisibility,
  panelSizes,
  focusMode,
  viewPreferencesActions,
} from '../src/lib/stores/viewPreferencesStore';

describe('View Preferences Store', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset to defaults
    viewPreferencesActions.reset();
  });

  describe('viewMode', () => {
    it('should default to list view', () => {
      expect(get(viewMode)).toBe('list');
    });

    it('should update view mode', () => {
      viewPreferencesActions.setViewMode('graph');
      expect(get(viewMode)).toBe('graph');
    });

    it('should save global view mode', () => {
      viewPreferencesActions.setViewMode('split', true);
      expect(localStorage.getItem('whisker-global-view-mode')).toBe('split');
    });

    it('should not save global when updateGlobal is false', () => {
      viewPreferencesActions.setViewMode('graph', false);
      // Should be 'split' from previous test or null
      const stored = localStorage.getItem('whisker-global-view-mode');
      expect(stored).not.toBe('graph');
    });
  });

  describe('panelVisibility', () => {
    it('should default to all panels visible', () => {
      const visibility = get(panelVisibility);
      expect(visibility.passageList).toBe(true);
      expect(visibility.properties).toBe(true);
      expect(visibility.variables).toBe(true);
    });

    it('should toggle individual panel', () => {
      viewPreferencesActions.togglePanel('passageList');
      expect(get(panelVisibility).passageList).toBe(false);

      viewPreferencesActions.togglePanel('passageList');
      expect(get(panelVisibility).passageList).toBe(true);
    });

    it('should set multiple panels at once', () => {
      viewPreferencesActions.setPanelVisibility({
        passageList: false,
        variables: false,
      });

      const visibility = get(panelVisibility);
      expect(visibility.passageList).toBe(false);
      expect(visibility.properties).toBe(true); // Unchanged
      expect(visibility.variables).toBe(false);
    });
  });

  describe('panelSizes', () => {
    it('should have default sizes', () => {
      const sizes = get(panelSizes);
      expect(sizes.passageListWidth).toBe(256);
      expect(sizes.propertiesWidth).toBe(384);
      expect(sizes.variablesWidth).toBe(320);
      expect(sizes.variablesHeight).toBe(256);
    });

    it('should update individual panel size', () => {
      viewPreferencesActions.setPanelSize('passageListWidth', 300);
      expect(get(panelSizes).passageListWidth).toBe(300);
    });

    it('should preserve other sizes when updating one', () => {
      viewPreferencesActions.setPanelSize('variablesHeight', 400);

      const sizes = get(panelSizes);
      expect(sizes.variablesHeight).toBe(400);
      expect(sizes.passageListWidth).toBe(256); // Unchanged
      expect(sizes.propertiesWidth).toBe(384); // Unchanged
      expect(sizes.variablesWidth).toBe(320); // Unchanged
    });
  });

  describe('focusMode', () => {
    it('should default to false', () => {
      expect(get(focusMode)).toBe(false);
    });

    it('should enable focus mode', () => {
      viewPreferencesActions.setFocusMode(true);
      expect(get(focusMode)).toBe(true);
    });

    it('should toggle focus mode', () => {
      viewPreferencesActions.toggleFocusMode();
      expect(get(focusMode)).toBe(true);

      viewPreferencesActions.toggleFocusMode();
      expect(get(focusMode)).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should save preferences to localStorage', () => {
      viewPreferencesActions.setViewMode('graph');
      viewPreferencesActions.togglePanel('variables');
      viewPreferencesActions.setFocusMode(true);

      // Check that save was called (indirectly through localStorage)
      const stored = localStorage.getItem('whisker-view-preferences');
      expect(stored).toBeTruthy();
    });

    it('should reset all preferences to defaults', () => {
      // Change everything
      viewPreferencesActions.setViewMode('split');
      viewPreferencesActions.togglePanel('passageList');
      viewPreferencesActions.setPanelSize('variablesHeight', 500);
      viewPreferencesActions.setFocusMode(true);

      // Reset
      viewPreferencesActions.reset();

      // Verify all back to defaults
      expect(get(viewMode)).toBe('list');
      expect(get(panelVisibility).passageList).toBe(true);
      expect(get(panelSizes).variablesHeight).toBe(256);
      expect(get(focusMode)).toBe(false);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple updates in sequence', () => {
      viewPreferencesActions.setViewMode('graph');
      viewPreferencesActions.setPanelVisibility({ properties: false });
      viewPreferencesActions.setFocusMode(true);

      expect(get(viewMode)).toBe('graph');
      expect(get(panelVisibility).properties).toBe(false);
      expect(get(focusMode)).toBe(true);
    });

    it('should maintain consistency across all stores', () => {
      viewPreferencesActions.setViewMode('split');
      viewPreferencesActions.togglePanel('passageList');
      viewPreferencesActions.togglePanel('variables');
      viewPreferencesActions.setPanelSize('propertiesWidth', 500);

      // All stores should reflect changes
      expect(get(viewMode)).toBe('split');
      expect(get(panelVisibility).passageList).toBe(false);
      expect(get(panelVisibility).variables).toBe(false);
      expect(get(panelSizes).propertiesWidth).toBe(500);
    });
  });

  describe('edge cases', () => {
    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('whisker-view-preferences', 'invalid json');

      // Should fallback to defaults without crashing
      viewPreferencesActions.reset();
      expect(get(viewMode)).toBe('list');
    });

    it('should handle missing localStorage keys', () => {
      localStorage.removeItem('whisker-view-preferences');
      localStorage.removeItem('whisker-global-view-mode');

      viewPreferencesActions.reset();
      expect(get(viewMode)).toBe('list');
    });
  });

  describe('localStorage version migration', () => {
    it('should clear old preferences when version changes', () => {
      // Set old version
      localStorage.setItem('whisker-preferences-version', '1');
      localStorage.setItem('whisker-view-preferences', JSON.stringify({
        'test-project': {
          viewMode: 'graph',
          panelVisibility: { passageList: false },
        },
      }));

      // Reset should trigger version check and clear old data
      viewPreferencesActions.reset();

      // After version migration, preferences should be cleared
      const stored = localStorage.getItem('whisker-view-preferences');
      expect(stored).toBeNull();

      // Version should be updated
      const version = localStorage.getItem('whisker-preferences-version');
      expect(version).toBe('2');
    });

    it('should preserve preferences when version matches', () => {
      // Set current version
      localStorage.setItem('whisker-preferences-version', '2');
      const prefs = JSON.stringify({
        'test-project': {
          viewMode: 'split',
          panelVisibility: { passageList: true, properties: true, variables: true, validation: true, statistics: false },
          panelSizes: { passageListWidth: 256, propertiesWidth: 384, variablesWidth: 320, variablesHeight: 256 },
          focusMode: false,
        },
      });
      localStorage.setItem('whisker-view-preferences', prefs);

      // Reset should not clear data when version matches
      viewPreferencesActions.reset();

      // Preferences should still be there
      const stored = localStorage.getItem('whisker-view-preferences');
      expect(stored).toBeTruthy();
    });

    it('should initialize version for first-time users', () => {
      // No version key exists
      localStorage.removeItem('whisker-preferences-version');

      // Reset should set version
      viewPreferencesActions.reset();

      const version = localStorage.getItem('whisker-preferences-version');
      expect(version).toBe('2');
    });
  });
});
