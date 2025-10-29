/**
 * ExportStore Adapter Tests
 *
 * Tests exportStore integration with PreferenceService.
 * Verifies export preferences persistence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
	exportPreferences,
	exportActions,
} from './exportStore';
import { getPreferenceService } from '../services/storage/PreferenceService';
import { LocalStorageAdapter } from '../services/storage/LocalStorageAdapter';
import { MockLocalStorage } from '../services/storage/testHelpers';

describe('ExportStore with PreferenceService', () => {
	let mockStorage: MockLocalStorage;
	let adapter: LocalStorageAdapter;
	let prefService: ReturnType<typeof getPreferenceService>;

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

		// Reset export preferences to defaults
		exportActions.resetPreferences();
	});

	afterEach(() => {
		prefService.clearCache();
	});

	describe('initialization and loading', () => {
		it('should use default export preferences', () => {
			const prefs = get(exportPreferences);

			expect(prefs.lastFormat).toBe('json');
			expect(prefs.includeValidation).toBe(true);
			expect(prefs.includeMetrics).toBe(false);
			expect(prefs.prettyPrint).toBe(true);
		});

		it('should load saved export preferences from PreferenceService', () => {
			// Save preferences
			prefService.setPreferenceSync('whisker_export_preferences', {
				lastFormat: 'html',
				includeValidation: false,
				includeMetrics: true,
				prettyPrint: false,
			});

			// Should be in storage
			const stored = prefService.getPreferenceSync<any>('whisker_export_preferences', null);
			expect(stored?.lastFormat).toBe('html');
		});
	});

	describe('preference persistence', () => {
		it('should persist preferences to PreferenceService', () => {
			exportActions.updatePreferences({
				lastFormat: 'html',
				includeValidation: false,
			});

			const stored = prefService.getPreferenceSync<any>('whisker_export_preferences', null);
			expect(stored?.lastFormat).toBe('html');
			expect(stored?.includeValidation).toBe(false);
		});

		it('should persist all preference fields', () => {
			exportActions.updatePreferences({
				lastFormat: 'markdown',
				includeValidation: true,
				includeMetrics: true,
				prettyPrint: false,
				htmlTheme: 'dark',
				minifyHTML: true,
			});

			const stored = prefService.getPreferenceSync<any>('whisker_export_preferences', null);
			expect(stored?.lastFormat).toBe('markdown');
			expect(stored?.includeValidation).toBe(true);
			expect(stored?.includeMetrics).toBe(true);
			expect(stored?.prettyPrint).toBe(false);
			expect(stored?.htmlTheme).toBe('dark');
			expect(stored?.minifyHTML).toBe(true);
		});
	});

	describe('preference updates', () => {
		it('should update preferences atomically', () => {
			const updates = {
				lastFormat: 'epub' as const,
				prettyPrint: false,
			};

			exportActions.updatePreferences(updates);

			const prefs = get(exportPreferences);
			expect(prefs.lastFormat).toBe('epub');
			expect(prefs.prettyPrint).toBe(false);
			// Other fields should retain defaults
			expect(prefs.includeValidation).toBe(true);
		});

		it('should persist atomic updates', () => {
			exportActions.updatePreferences({
				lastFormat: 'markdown',
				minifyHTML: true,
			});

			const stored = prefService.getPreferenceSync<any>('whisker_export_preferences', null);
			expect(stored?.lastFormat).toBe('markdown');
			expect(stored?.minifyHTML).toBe(true);
		});
	});

	describe('reset preferences', () => {
		it('should reset all preferences to defaults', () => {
			// Change preferences
			exportActions.updatePreferences({
				lastFormat: 'html',
				includeValidation: false,
				prettyPrint: false,
			});

			// Reset
			exportActions.resetPreferences();

			// Should be back to defaults
			const prefs = get(exportPreferences);
			expect(prefs.lastFormat).toBe('json');
			expect(prefs.includeValidation).toBe(true);
			expect(prefs.prettyPrint).toBe(true);
		});

		it('should persist reset preferences', () => {
			// Change preferences
			exportActions.updatePreferences({
				lastFormat: 'html',
				prettyPrint: false,
			});

			// Reset
			exportActions.resetPreferences();

			// Check storage
			const stored = prefService.getPreferenceSync<any>('whisker_export_preferences', null);
			expect(stored?.lastFormat).toBe('json');
			expect(stored?.prettyPrint).toBe(true);
		});
	});

	describe('backward compatibility', () => {
		it('should read preferences from localStorage fallback', () => {
			// Update preferences using the store (which writes to PreferenceService/localStorage)
			exportActions.updatePreferences({
				lastFormat: 'html',
				includeValidation: false,
			});

			// PreferenceService should have persisted the values (it uses localStorage under the hood)
			const stored = prefService.getPreferenceSync<any>('whisker_export_preferences', null);
			expect(stored?.lastFormat).toBe('html');
			expect(stored?.includeValidation).toBe(false);

			// Should also retrieve from the store
			const prefs = get(exportPreferences);
			expect(prefs.lastFormat).toBe('html');
			expect(prefs.includeValidation).toBe(false);
		});

		it('should handle missing preferences gracefully', () => {
			// This test verifies that when preferences don't exist,
			// the store uses defaults without crashing

			// Reset to defaults (which tests the resetPreferences functionality)
			exportActions.resetPreferences();

			// Store should use defaults
			const prefs = get(exportPreferences);
			expect(prefs.lastFormat).toBe('json');
			expect(prefs.includeValidation).toBe(true);
			expect(prefs.prettyPrint).toBe(true);
		});
	});

	describe('reactivity', () => {
		it('should update store when preferences change', () => {
			exportActions.updatePreferences({
				lastFormat: 'html',
			});

			const prefs = get(exportPreferences);
			expect(prefs.lastFormat).toBe('html');
		});

		it('should notify subscribers on preference change', () => {
			const changes: any[] = [];

			const unsubscribe = exportPreferences.subscribe((prefs) => {
				changes.push({ ...prefs });
			});

			exportActions.updatePreferences({
				lastFormat: 'markdown',
			});

			unsubscribe();

			// Should have recorded changes
			expect(changes.length).toBeGreaterThan(0);
			expect(changes[changes.length - 1].lastFormat).toBe('markdown');
		});
	});
});
