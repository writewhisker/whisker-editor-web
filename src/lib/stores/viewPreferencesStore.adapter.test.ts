/**
 * ViewPreferencesStore Adapter Tests
 *
 * Tests viewPreferencesStore integration with PreferenceService.
 * Verifies per-project view preferences persistence and management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
	viewMode,
	panelVisibility,
	panelSizes,
	focusMode,
	currentPreferences,
	viewPreferencesActions,
	type ViewMode,
	type PanelVisibility,
	type PanelSizes,
} from './viewPreferencesStore';
import { currentStory } from './projectStore';
import { Story } from '@writewhisker/core-ts';
import { getPreferenceService } from '../services/storage/PreferenceService';
import { LocalStorageAdapter } from '../services/storage/LocalStorageAdapter';
import { MockLocalStorage } from '../services/storage/testHelpers';

describe('ViewPreferencesStore with PreferenceService', () => {
	let mockStorage: MockLocalStorage;
	let adapter: LocalStorageAdapter;
	let prefService: ReturnType<typeof getPreferenceService>;
	let testStory: Story;

	beforeEach(async () => {
		// Setup mock localStorage
		mockStorage = new MockLocalStorage();
		global.localStorage = mockStorage as any;

		// Create and initialize adapter
		adapter = new LocalStorageAdapter();
		await adapter.initialize();

		// Get preference service instance
		prefService = getPreferenceService();
		await prefService.initialize();

		// Clear any previous settings
		prefService.clearCache();
		mockStorage.clear();

		// Create test story
		testStory = new Story();
		testStory.metadata.title = 'Test Story';

		// Set as current story
		currentStory.set(testStory);

		// Small delay to allow reactive updates
		await new Promise((resolve) => setTimeout(resolve, 10));
	});

	afterEach(() => {
		currentStory.set(null);
		prefService.clearCache();
	});

	describe('initialization and loading', () => {
		it('should use default preferences for new project', () => {
			const prefs = get(currentPreferences);

			expect(prefs.viewMode).toBe('list');
			expect(prefs.focusMode).toBe(false);
			expect(prefs.panelVisibility.passageList).toBe(true);
			expect(prefs.panelVisibility.properties).toBe(true);
		});

		it('should load saved preferences for existing project', () => {
			// Save preferences
			viewPreferencesActions.setViewMode('graph', false);
			viewPreferencesActions.setFocusMode(true);

			// Simulate reload by clearing stores and reloading story
			currentStory.set(null);
			currentStory.set(testStory);

			const mode = get(viewMode);
			const focus = get(focusMode);

			expect(mode).toBe('graph');
			expect(focus).toBe(true);
		});

		it('should handle corrupted preference data gracefully', () => {
			// Set corrupted data
			prefService.setPreferenceSync('whisker-view-preferences', {
				'Test Story': { invalid: 'data' },
			});

			// Reload story
			currentStory.set(null);
			currentStory.set(testStory);

			// Should fallback to defaults without crashing
			const prefs = get(currentPreferences);
			expect(prefs.viewMode).toBeDefined();
		});
	});

	describe('preference persistence', () => {
		it('should persist view mode to PreferenceService', () => {
			viewPreferencesActions.setViewMode('graph', false);

			const stored = prefService.getPreferenceSync('whisker-view-preferences', {}) as Record<string, any>;
			expect(stored['Test Story']?.viewMode).toBe('graph');
		});

		it('should persist panel visibility to PreferenceService', () => {
			viewPreferencesActions.setPanelVisibility({ passageList: false });

			const stored = prefService.getPreferenceSync('whisker-view-preferences', {}) as Record<string, any>;
			expect(stored['Test Story']?.panelVisibility?.passageList).toBe(false);
		});

		it('should persist panel sizes to PreferenceService', () => {
			viewPreferencesActions.setPanelSize('passageListWidth', 300);

			const stored = prefService.getPreferenceSync('whisker-view-preferences', {}) as Record<string, any>;
			expect(stored['Test Story']?.panelSizes?.passageListWidth).toBe(300);
		});

		it('should persist focus mode to PreferenceService', () => {
			viewPreferencesActions.setFocusMode(true);

			const stored = prefService.getPreferenceSync('whisker-view-preferences', {}) as Record<string, any>;
			expect(stored['Test Story']?.focusMode).toBe(true);
		});
	});

	describe('global view mode', () => {
		it('should persist global default view mode', () => {
			viewPreferencesActions.setViewMode('graph', true);

			const stored = prefService.getPreferenceSync('whisker-global-view-mode', 'list');
			expect(stored).toBe('graph');
		});

		it('should not update global view mode when updateGlobal is false', () => {
			viewPreferencesActions.setViewMode('graph', false);

			const stored = prefService.getPreferenceSync('whisker-global-view-mode', 'list');
			expect(stored).toBe('list');
		});

		it('should apply global view mode to new projects', () => {
			// Set global view mode
			viewPreferencesActions.setViewMode('graph', true);

			// Create new story
			const newStory = new Story();
			newStory.metadata.title = 'New Story';
			currentStory.set(newStory);

			const mode = get(viewMode);
			expect(mode).toBe('graph');
		});
	});

	describe('view mode actions', () => {
		it('should update view mode', () => {
			viewPreferencesActions.setViewMode('graph', false);
			expect(get(viewMode)).toBe('graph');

			viewPreferencesActions.setViewMode('split', false);
			expect(get(viewMode)).toBe('split');
		});

		it('should support all view modes', () => {
			const modes: ViewMode[] = ['list', 'graph', 'split', 'preview'];

			modes.forEach((mode) => {
				viewPreferencesActions.setViewMode(mode, false);
				expect(get(viewMode)).toBe(mode);
			});
		});
	});

	describe('panel visibility actions', () => {
		it('should update panel visibility', () => {
			viewPreferencesActions.setPanelVisibility({
				passageList: false,
				properties: false,
			});

			const visibility = get(panelVisibility);
			expect(visibility.passageList).toBe(false);
			expect(visibility.properties).toBe(false);
		});

		it('should toggle panel visibility', () => {
			const initialVisibility = get(panelVisibility).passageList;

			viewPreferencesActions.togglePanel('passageList');

			const newVisibility = get(panelVisibility).passageList;
			expect(newVisibility).toBe(!initialVisibility);
		});

		it('should toggle multiple panels independently', () => {
			viewPreferencesActions.togglePanel('passageList');
			viewPreferencesActions.togglePanel('properties');

			const visibility = get(panelVisibility);
			expect(visibility.passageList).toBe(false);
			expect(visibility.properties).toBe(false);

			// Others should still be true
			expect(visibility.variables).toBe(true);
		});
	});

	describe('panel size actions', () => {
		it('should update panel size', () => {
			viewPreferencesActions.setPanelSize('passageListWidth', 350);

			const sizes = get(panelSizes);
			expect(sizes.passageListWidth).toBe(350);
		});

		it('should update multiple panel sizes independently', () => {
			viewPreferencesActions.setPanelSize('passageListWidth', 300);
			viewPreferencesActions.setPanelSize('propertiesWidth', 400);

			const sizes = get(panelSizes);
			expect(sizes.passageListWidth).toBe(300);
			expect(sizes.propertiesWidth).toBe(400);
		});
	});

	describe('focus mode actions', () => {
		it('should set focus mode', () => {
			viewPreferencesActions.setFocusMode(true);
			expect(get(focusMode)).toBe(true);

			viewPreferencesActions.setFocusMode(false);
			expect(get(focusMode)).toBe(false);
		});

		it('should toggle focus mode', () => {
			const initial = get(focusMode);

			viewPreferencesActions.toggleFocusMode();
			expect(get(focusMode)).toBe(!initial);

			viewPreferencesActions.toggleFocusMode();
			expect(get(focusMode)).toBe(initial);
		});
	});

	describe('per-project preferences', () => {
		it('should maintain separate preferences for different projects', () => {
			// Set preferences for first project
			viewPreferencesActions.setViewMode('graph', false);
			viewPreferencesActions.setFocusMode(true);

			// Create second project
			const story2 = new Story();
			story2.metadata.title = 'Story 2';
			currentStory.set(story2);

			// Second project should have defaults
			expect(get(viewMode)).toBe('list');
			expect(get(focusMode)).toBe(false);

			// Switch back to first project
			currentStory.set(testStory);

			// First project should retain its preferences
			expect(get(viewMode)).toBe('graph');
			expect(get(focusMode)).toBe(true);
		});

		it('should isolate panel visibility between projects', () => {
			// Set preferences for first project
			viewPreferencesActions.setPanelVisibility({ passageList: false });

			// Create second project
			const story2 = new Story();
			story2.metadata.title = 'Story 2';
			currentStory.set(story2);

			// Second project should have default visibility
			expect(get(panelVisibility).passageList).toBe(true);
		});
	});

	describe('reset preferences', () => {
		it('should reset all preferences to defaults', () => {
			// Change all preferences
			viewPreferencesActions.setViewMode('graph', false);
			viewPreferencesActions.setFocusMode(true);
			viewPreferencesActions.setPanelVisibility({ passageList: false });
			viewPreferencesActions.setPanelSize('passageListWidth', 300);

			// Reset
			viewPreferencesActions.reset();

			// Should be back to defaults
			expect(get(viewMode)).toBe('list');
			expect(get(focusMode)).toBe(false);
			expect(get(panelVisibility).passageList).toBe(true);
			expect(get(panelSizes).passageListWidth).toBe(256);
		});
	});

	describe('storage version migration', () => {
		it('should detect version mismatch', () => {
			// Set old version
			prefService.setPreferenceSync('whisker-preferences-version', '1');

			// Set some preferences
			prefService.setPreferenceSync('whisker-view-preferences', {
				'Test Story': { viewMode: 'graph' },
			});

			// Reload - should trigger migration
			currentStory.set(null);
			currentStory.set(testStory);

			// Version should be updated
			const version = prefService.getPreferenceSync('whisker-preferences-version', '');
			expect(version).toBe('2');
		});

		it('should clear old preferences on version change', () => {
			// Set old version and preferences
			prefService.setPreferenceSync('whisker-preferences-version', '1');
			prefService.setPreferenceSync('whisker-view-preferences', {
				'Test Story': { viewMode: 'graph' },
			});

			// Reload - should trigger migration
			currentStory.set(null);
			currentStory.set(testStory);

			// Old preferences should be cleared
			const prefs = prefService.getPreferenceSync('whisker-view-preferences', {});
			expect(prefs).toEqual({});
		});
	});

	describe('backward compatibility', () => {
		it('should read preferences from localStorage fallback via PreferenceService', () => {
			// Set preferences using PreferenceService (which uses localStorage under the hood)
			prefService.setPreferenceSync('whisker-view-preferences', {
				'Test Story': {
					viewMode: 'graph',
					focusMode: true,
					panelVisibility: {},
					panelSizes: {},
				},
			});

			// Reload story
			currentStory.set(null);
			currentStory.set(testStory);

			// Should read from storage
			expect(get(viewMode)).toBe('graph');
			expect(get(focusMode)).toBe(true);
		});

		it('should handle missing panelVisibility in saved data', () => {
			// Set incomplete data
			prefService.setPreferenceSync('whisker-view-preferences', {
				'Test Story': {
					viewMode: 'graph',
					// panelVisibility missing
				},
			});

			// Reload
			currentStory.set(null);
			currentStory.set(testStory);

			// Should merge with defaults
			const prefs = get(currentPreferences);
			expect(prefs.panelVisibility).toBeDefined();
			expect(prefs.panelVisibility.passageList).toBe(true);
		});

		it('should handle missing panelSizes in saved data', () => {
			// Set incomplete data
			prefService.setPreferenceSync('whisker-view-preferences', {
				'Test Story': {
					viewMode: 'graph',
					// panelSizes missing
				},
			});

			// Reload
			currentStory.set(null);
			currentStory.set(testStory);

			// Should merge with defaults
			const prefs = get(currentPreferences);
			expect(prefs.panelSizes).toBeDefined();
			expect(prefs.panelSizes.passageListWidth).toBe(256);
		});
	});

	describe('error handling', () => {
		it('should handle missing project key gracefully', () => {
			// Clear current story
			currentStory.set(null);

			// Should not throw when saving
			expect(() => viewPreferencesActions.setViewMode('graph', false)).not.toThrow();
		});

		it('should handle invalid panel visibility data', () => {
			// Set invalid data
			prefService.setPreferenceSync('whisker-view-preferences', {
				'Test Story': {
					viewMode: 'graph',
					panelVisibility: 'invalid', // Should be object
				},
			});

			// Reload
			currentStory.set(null);
			currentStory.set(testStory);

			// Should fallback to defaults without crashing
			const prefs = get(currentPreferences);
			expect(typeof prefs.panelVisibility).toBe('object');
			expect(prefs.panelVisibility.passageList).toBe(true);
		});
	});

	describe('reactivity', () => {
		it('should update derived stores when actions are called', () => {
			viewPreferencesActions.setViewMode('graph', false);

			const prefs = get(currentPreferences);
			expect(prefs.viewMode).toBe('graph');
		});

		it('should update when story changes', () => {
			// Set preferences for first story
			viewPreferencesActions.setViewMode('graph', false);

			// Switch to new story
			const story2 = new Story();
			story2.metadata.title = 'Story 2';
			currentStory.set(story2);

			// Should show different preferences
			const prefs = get(currentPreferences);
			expect(prefs.viewMode).toBe('list');
		});
	});
});
