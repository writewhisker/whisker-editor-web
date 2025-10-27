import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get, writable } from 'svelte/store';
import type { ViewMode, PanelVisibility, PanelSizes, ViewPreferences } from './viewPreferencesStore';
import { getPreferenceService, resetPreferenceService } from '../services/storage/PreferenceService';

// Mock projectStore before importing
const mockCurrentStory = writable<any>(null);

vi.mock('./projectStore', () => ({
  currentStory: mockCurrentStory,
}));

describe('viewPreferencesStore', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(async () => {
    // Setup localStorage mock FIRST before anything else
    localStorageMock = {};
    const localStorageImpl = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        Object.keys(localStorageMock).forEach(key => delete localStorageMock[key]);
      }),
      key: vi.fn(),
      length: 0,
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageImpl,
      writable: true,
      configurable: true,
    });

    // Set storage version to current (must be JSON stringified)
    localStorageMock['whisker-preferences-version'] = JSON.stringify('2');

    // Reset PreferenceService singleton so next access will create new instance with our localStorage mock
    resetPreferenceService();

    // Reset mock current story
    mockCurrentStory.set(null);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('stores', () => {
    it('should export currentProjectKey derived store', async () => {
      const { currentProjectKey } = await import('./viewPreferencesStore');
      expect(currentProjectKey).toBeTruthy();
      expect(typeof currentProjectKey.subscribe).toBe('function');
    });

    it('should export currentPreferences derived store', async () => {
      const { currentPreferences } = await import('./viewPreferencesStore');
      expect(currentPreferences).toBeTruthy();
      expect(typeof currentPreferences.subscribe).toBe('function');
    });

    it('should export viewMode store', async () => {
      const { viewMode } = await import('./viewPreferencesStore');
      expect(viewMode).toBeTruthy();
      expect(typeof viewMode.subscribe).toBe('function');
    });

    it('should export panelVisibility store', async () => {
      const { panelVisibility } = await import('./viewPreferencesStore');
      expect(panelVisibility).toBeTruthy();
      expect(typeof panelVisibility.subscribe).toBe('function');
    });

    it('should export panelSizes store', async () => {
      const { panelSizes } = await import('./viewPreferencesStore');
      expect(panelSizes).toBeTruthy();
      expect(typeof panelSizes.subscribe).toBe('function');
    });

    it('should export focusMode store', async () => {
      const { focusMode } = await import('./viewPreferencesStore');
      expect(focusMode).toBeTruthy();
      expect(typeof focusMode.subscribe).toBe('function');
    });
  });

  describe('currentProjectKey', () => {
    it('should derive key from currentStory', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { currentProjectKey } = await import('./viewPreferencesStore');

      expect(get(currentProjectKey)).toBe('Test Story');
    });

    it('should return null when no story loaded', async () => {
      mockCurrentStory.set(null);

      const { currentProjectKey } = await import('./viewPreferencesStore');

      expect(get(currentProjectKey)).toBeNull();
    });
  });

  describe('currentPreferences', () => {
    it('should return default preferences when no story loaded', async () => {
      mockCurrentStory.set(null);

      const { currentPreferences } = await import('./viewPreferencesStore');

      const prefs = get(currentPreferences);
      expect(prefs.viewMode).toBe('list');
      expect(prefs.panelVisibility.passageList).toBe(true);
      expect(prefs.panelVisibility.properties).toBe(true);
      expect(prefs.focusMode).toBe(false);
    });

    it('should load saved preferences for project', async () => {
      localStorageMock['whisker-view-preferences'] = JSON.stringify({
        'Test Story': {
          viewMode: 'graph',
          panelVisibility: { passageList: false, properties: true, variables: true, validation: true, statistics: false, tagManager: false },
          panelSizes: { passageListWidth: 256, propertiesWidth: 384, variablesWidth: 320, variablesHeight: 256 },
          focusMode: true,
        },
      });

      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { currentPreferences } = await import('./viewPreferencesStore');

      const prefs = get(currentPreferences);
      expect(prefs.viewMode).toBe('graph');
      expect(prefs.panelVisibility.passageList).toBe(false);
      expect(prefs.focusMode).toBe(true);
    });

    it('should merge saved preferences with defaults', async () => {
      // Partial preferences saved
      localStorageMock['whisker-view-preferences'] = JSON.stringify({
        'Test Story': {
          viewMode: 'graph',
        },
      });

      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { currentPreferences } = await import('./viewPreferencesStore');

      const prefs = get(currentPreferences);
      expect(prefs.viewMode).toBe('graph');
      // Should have defaults for missing fields
      expect(prefs.panelVisibility.passageList).toBe(true);
      expect(prefs.panelSizes.passageListWidth).toBe(256);
      expect(prefs.focusMode).toBe(false);
    });

    it('should handle corrupted preferences gracefully', async () => {
      localStorageMock['whisker-view-preferences'] = JSON.stringify({
        'Test Story': {
          viewMode: 'graph',
          panelVisibility: 'corrupted data', // Should be object
          panelSizes: null, // Should be object
        },
      });

      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { currentPreferences } = await import('./viewPreferencesStore');

      const prefs = get(currentPreferences);
      expect(prefs.viewMode).toBe('graph');
      // Should use defaults for corrupted fields
      expect(prefs.panelVisibility.passageList).toBe(true);
      expect(prefs.panelSizes.passageListWidth).toBe(256);
    });
  });

  describe('storage versioning', () => {
    it('should check storage version on init', async () => {
      localStorageMock['whisker-preferences-version'] = '2';

      await import('./viewPreferencesStore');

      // Should not have cleared preferences
      expect(localStorage.removeItem).not.toHaveBeenCalledWith('whisker-view-preferences');
    });

    it('should clear old preferences when version changes', async () => {
      localStorageMock['whisker-preferences-version'] = JSON.stringify('1'); // Old version
      localStorageMock['whisker-view-preferences'] = JSON.stringify({ 'Old': {} });

      await import('./viewPreferencesStore');

      // When version changes, preferences are cleared by setting to empty object
      expect(localStorage.setItem).toHaveBeenCalledWith('whisker-view-preferences', JSON.stringify({}));
      expect(localStorage.setItem).toHaveBeenCalledWith('whisker-preferences-version', JSON.stringify('2'));
    });

    it('should migrate from legacy (no version) to current', async () => {
      delete localStorageMock['whisker-preferences-version'];
      localStorageMock['whisker-view-preferences'] = JSON.stringify({ 'Legacy': {} });

      await import('./viewPreferencesStore');

      // When migrating from legacy, preferences are cleared by setting to empty object
      expect(localStorage.setItem).toHaveBeenCalledWith('whisker-view-preferences', JSON.stringify({}));
      expect(localStorage.setItem).toHaveBeenCalledWith('whisker-preferences-version', JSON.stringify('2'));
    });

    it('should handle localStorage errors during version check', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('Storage error'); }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      await import('./viewPreferencesStore');

      // Error comes from PreferenceService.getPreferenceSync()
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load preference'), expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe('viewPreferencesActions.setViewMode', () => {
    it('should update viewMode store', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, viewMode } = await import('./viewPreferencesStore');

      viewPreferencesActions.setViewMode('graph');

      expect(get(viewMode)).toBe('graph');
    });

    it('should save to global view mode by default', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions } = await import('./viewPreferencesStore');

      viewPreferencesActions.setViewMode('graph');

      expect(localStorage.setItem).toHaveBeenCalledWith('whisker-preference-global:whisker-global-view-mode', '"graph"');
    });

    it('should not save to global view mode when updateGlobal is false', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions } = await import('./viewPreferencesStore');

      viewPreferencesActions.setViewMode('graph', false);

      expect(localStorage.setItem).not.toHaveBeenCalledWith('whisker-preference-global:whisker-global-view-mode', '"graph"');
    });

    it('should persist to localStorage', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions } = await import('./viewPreferencesStore');

      viewPreferencesActions.setViewMode('graph');

      const saved = JSON.parse(localStorageMock['whisker-view-preferences']);
      expect(saved['Test Story'].viewMode).toBe('graph');
    });
  });

  describe('viewPreferencesActions.setPanelVisibility', () => {
    it('should update panelVisibility store', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, panelVisibility } = await import('./viewPreferencesStore');

      viewPreferencesActions.setPanelVisibility({ passageList: false });

      const visibility = get(panelVisibility);
      expect(visibility.passageList).toBe(false);
      expect(visibility.properties).toBe(true); // Should keep other values
    });

    it('should merge with existing visibility settings', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, panelVisibility } = await import('./viewPreferencesStore');

      viewPreferencesActions.setPanelVisibility({ passageList: false });
      viewPreferencesActions.setPanelVisibility({ properties: false });

      const visibility = get(panelVisibility);
      expect(visibility.passageList).toBe(false);
      expect(visibility.properties).toBe(false);
    });

    it('should persist to localStorage', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions } = await import('./viewPreferencesStore');

      viewPreferencesActions.setPanelVisibility({ passageList: false });

      const saved = JSON.parse(localStorageMock['whisker-view-preferences']);
      expect(saved['Test Story'].panelVisibility.passageList).toBe(false);
    });
  });

  describe('viewPreferencesActions.togglePanel', () => {
    it('should toggle panel visibility', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, panelVisibility } = await import('./viewPreferencesStore');

      const initialValue = get(panelVisibility).passageList;
      viewPreferencesActions.togglePanel('passageList');

      expect(get(panelVisibility).passageList).toBe(!initialValue);
    });

    it('should toggle back and forth', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, panelVisibility } = await import('./viewPreferencesStore');

      viewPreferencesActions.togglePanel('passageList');
      const firstToggle = get(panelVisibility).passageList;

      viewPreferencesActions.togglePanel('passageList');
      const secondToggle = get(panelVisibility).passageList;

      expect(secondToggle).toBe(!firstToggle);
    });

    it('should persist toggle to localStorage', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, panelVisibility } = await import('./viewPreferencesStore');

      viewPreferencesActions.togglePanel('passageList');

      const saved = JSON.parse(localStorageMock['whisker-view-preferences']);
      expect(saved['Test Story'].panelVisibility.passageList).toBe(get(panelVisibility).passageList);
    });
  });

  describe('viewPreferencesActions.setPanelSize', () => {
    it('should update panel size', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, panelSizes } = await import('./viewPreferencesStore');

      viewPreferencesActions.setPanelSize('passageListWidth', 300);

      expect(get(panelSizes).passageListWidth).toBe(300);
    });

    it('should keep other sizes unchanged', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, panelSizes } = await import('./viewPreferencesStore');

      const originalPropertiesWidth = get(panelSizes).propertiesWidth;
      viewPreferencesActions.setPanelSize('passageListWidth', 300);

      expect(get(panelSizes).propertiesWidth).toBe(originalPropertiesWidth);
    });

    it('should persist to localStorage', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions } = await import('./viewPreferencesStore');

      viewPreferencesActions.setPanelSize('passageListWidth', 300);

      const saved = JSON.parse(localStorageMock['whisker-view-preferences']);
      expect(saved['Test Story'].panelSizes.passageListWidth).toBe(300);
    });
  });

  describe('viewPreferencesActions.setFocusMode', () => {
    it('should set focus mode to true', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, focusMode } = await import('./viewPreferencesStore');

      viewPreferencesActions.setFocusMode(true);

      expect(get(focusMode)).toBe(true);
    });

    it('should set focus mode to false', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, focusMode } = await import('./viewPreferencesStore');

      viewPreferencesActions.setFocusMode(true);
      viewPreferencesActions.setFocusMode(false);

      expect(get(focusMode)).toBe(false);
    });

    it('should persist to localStorage', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions } = await import('./viewPreferencesStore');

      viewPreferencesActions.setFocusMode(true);

      const saved = JSON.parse(localStorageMock['whisker-view-preferences']);
      expect(saved['Test Story'].focusMode).toBe(true);
    });
  });

  describe('viewPreferencesActions.toggleFocusMode', () => {
    it('should toggle focus mode', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, focusMode } = await import('./viewPreferencesStore');

      const initialValue = get(focusMode);
      viewPreferencesActions.toggleFocusMode();

      expect(get(focusMode)).toBe(!initialValue);
    });

    it('should toggle back and forth', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, focusMode } = await import('./viewPreferencesStore');

      viewPreferencesActions.toggleFocusMode();
      const firstToggle = get(focusMode);

      viewPreferencesActions.toggleFocusMode();
      const secondToggle = get(focusMode);

      expect(secondToggle).toBe(!firstToggle);
    });
  });

  describe('viewPreferencesActions.reset', () => {
    it('should reset all preferences to defaults', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions, viewMode, panelVisibility, panelSizes, focusMode } = await import('./viewPreferencesStore');

      // Change everything
      viewPreferencesActions.setViewMode('graph', false);
      viewPreferencesActions.setPanelVisibility({ passageList: false });
      viewPreferencesActions.setPanelSize('passageListWidth', 500);
      viewPreferencesActions.setFocusMode(true);

      // Reset
      viewPreferencesActions.reset();

      expect(get(viewMode)).toBe('list');
      expect(get(panelVisibility).passageList).toBe(true);
      expect(get(panelSizes).passageListWidth).toBe(256);
      expect(get(focusMode)).toBe(false);
    });

    it('should persist reset to localStorage', async () => {
      mockCurrentStory.set({
        metadata: { title: 'Test Story' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      const { viewPreferencesActions } = await import('./viewPreferencesStore');

      viewPreferencesActions.setViewMode('graph', false);
      viewPreferencesActions.reset();

      const saved = JSON.parse(localStorageMock['whisker-view-preferences']);
      expect(saved['Test Story'].viewMode).toBe('list');
    });
  });

  describe('project switching', () => {
    it('should load different preferences for different projects', async () => {
      localStorageMock['whisker-view-preferences'] = JSON.stringify({
        'Project A': {
          viewMode: 'graph',
          panelVisibility: { passageList: false, properties: true, variables: true, validation: true, statistics: false, tagManager: false },
          panelSizes: { passageListWidth: 256, propertiesWidth: 384, variablesWidth: 320, variablesHeight: 256 },
          focusMode: false,
        },
        'Project B': {
          viewMode: 'list',
          panelVisibility: { passageList: true, properties: false, variables: true, validation: true, statistics: false, tagManager: false },
          panelSizes: { passageListWidth: 256, propertiesWidth: 384, variablesWidth: 320, variablesHeight: 256 },
          focusMode: true,
        },
      });

      vi.resetModules();
      // Clear PreferenceService cache after resetModules
      const prefService = getPreferenceService();
      await prefService.initialize();
      prefService.clearCache();

      const { viewMode, panelVisibility, focusMode } = await import('./viewPreferencesStore');

      // Load Project A
      mockCurrentStory.set({
        metadata: { title: 'Project A' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      // Wait for subscription to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(get(viewMode)).toBe('graph');
      expect(get(panelVisibility).passageList).toBe(false);
      expect(get(focusMode)).toBe(false);

      // Switch to Project B
      mockCurrentStory.set({
        metadata: { title: 'Project B' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      // Wait for subscription to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(get(viewMode)).toBe('list');
      expect(get(panelVisibility).passageList).toBe(true);
      expect(get(focusMode)).toBe(true);
    });

    it('should use defaults for new projects', async () => {
      localStorageMock['whisker-global-view-mode'] = JSON.stringify('graph');

      vi.resetModules();
      // Clear PreferenceService cache after resetModules
      const prefService = getPreferenceService();
      await prefService.initialize();
      prefService.clearCache();

      const { viewMode, panelVisibility, focusMode } = await import('./viewPreferencesStore');

      mockCurrentStory.set({
        metadata: { title: 'New Project' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      // Wait for subscription to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(get(viewMode)).toBe('graph'); // Uses global default
      expect(get(panelVisibility).passageList).toBe(true); // Uses defaults
      expect(get(focusMode)).toBe(false); // Uses defaults
    });

    it('should handle corrupted data during project switch', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      localStorageMock['whisker-view-preferences'] = JSON.stringify({
        'Corrupted Project': {
          viewMode: 'graph',
          panelVisibility: 'invalid', // Corrupted
          panelSizes: null, // Corrupted
        },
      });

      vi.resetModules();
      const { viewMode, panelVisibility, panelSizes } = await import('./viewPreferencesStore');

      mockCurrentStory.set({
        metadata: { title: 'Corrupted Project' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      // Wait for subscription to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should use defaults for corrupted fields
      expect(get(panelVisibility).passageList).toBe(true);
      expect(get(panelSizes).passageListWidth).toBe(256);

      consoleErrorSpy.mockRestore();
    });

    it('should clear corrupted localStorage and use defaults', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('Storage error'); }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      vi.resetModules();
      const { viewMode, panelVisibility } = await import('./viewPreferencesStore');

      mockCurrentStory.set({
        metadata: { title: 'Test' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      // Wait for subscription to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should use defaults
      expect(get(viewMode)).toBe('list');
      expect(get(panelVisibility).passageList).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('no project loaded', () => {
    it('should not save when no project is loaded', async () => {
      mockCurrentStory.set(null);

      const { viewPreferencesActions } = await import('./viewPreferencesStore');

      const setItemCalls = vi.mocked(localStorage.setItem).mock.calls.length;
      viewPreferencesActions.setViewMode('graph');
      const newSetItemCalls = vi.mocked(localStorage.setItem).mock.calls.length;

      // PreferenceService makes 2 calls per preference (unprefixed and prefixed)
      expect(newSetItemCalls - setItemCalls).toBeLessThanOrEqual(2);
    });

    it('should reset to defaults when project is unloaded', async () => {
      vi.resetModules();
      const { viewMode, panelVisibility, focusMode } = await import('./viewPreferencesStore');

      // Load a project with custom settings
      mockCurrentStory.set({
        metadata: { title: 'Test' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const { viewPreferencesActions } = await import('./viewPreferencesStore');
      viewPreferencesActions.setViewMode('graph', false);
      viewPreferencesActions.setFocusMode(true);

      // Unload project
      mockCurrentStory.set(null);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should reset to defaults (but keep global view mode)
      expect(get(panelVisibility).passageList).toBe(true);
      expect(get(focusMode)).toBe(false);
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage load errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('Storage error'); }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      const { currentPreferences } = await import('./viewPreferencesStore');

      mockCurrentStory.set({
        metadata: { title: 'Test' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      // Should not throw
      expect(() => get(currentPreferences)).not.toThrow();

      consoleWarnSpy.mockRestore();
    });

    it('should handle localStorage save errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(() => { throw new Error('Storage error'); }),
          removeItem: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      vi.resetModules();
      const { viewPreferencesActions } = await import('./viewPreferencesStore');

      mockCurrentStory.set({
        metadata: { title: 'Test' },
        passages: [],
        variables: [],
        startPassage: null,
      });

      // Should not throw
      expect(() => viewPreferencesActions.setViewMode('graph')).not.toThrow();

      consoleWarnSpy.mockRestore();
    });
  });
});
