/**
 * ThemeStore Adapter Tests
 *
 * Tests themeStore integration with PreferenceService.
 * Verifies theme persistence, loading, and system preference handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { theme, effectiveTheme, setTheme, initTheme, disposeTheme, themeActions } from './themeStore';
import { getPreferenceService } from '../services/storage/PreferenceService';
import { LocalStorageAdapter } from '../services/storage/LocalStorageAdapter';
import { MockLocalStorage } from '../services/storage/testHelpers';

describe('ThemeStore with PreferenceService', () => {
	let mockStorage: MockLocalStorage;
	let adapter: LocalStorageAdapter;
	let prefService: ReturnType<typeof getPreferenceService>;

	beforeEach(async () => {
		// Setup mock localStorage
		mockStorage = new MockLocalStorage();
		global.localStorage = mockStorage as any;

		// Setup mock window.matchMedia
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});

		// Create and initialize adapter
		adapter = new LocalStorageAdapter();
		await adapter.initialize();

		// Get preference service instance
		prefService = getPreferenceService();
		await prefService.initialize();

		// Clear any previous theme settings
		prefService.clearCache();
		mockStorage.clear();

		// Cleanup any previous listeners
		disposeTheme();
	});

	afterEach(() => {
		disposeTheme();
		prefService.clearCache();
	});

	describe('initialization', () => {
		it('should default to auto theme when no preference is stored', () => {
			initTheme();
			expect(get(theme)).toBe('auto');
		});

		it('should load stored theme preference', () => {
			// Set a theme preference
			prefService.setPreferenceSync('whisker-theme', 'dark');

			// Initialize theme
			initTheme();

			expect(get(theme)).toBe('dark');
		});

		it('should handle invalid stored values gracefully', () => {
			// Set invalid theme value
			prefService.setPreferenceSync('whisker-theme', 'invalid-theme');

			// Initialize theme
			initTheme();

			// Should fallback to auto
			expect(get(theme)).toBe('auto');
		});
	});

	describe('theme persistence', () => {
		it('should save theme to PreferenceService when set', () => {
			const spy = vi.spyOn(prefService, 'setPreferenceSync');

			setTheme('dark');

			expect(spy).toHaveBeenCalledWith('whisker-theme', 'dark');
		});

		it('should persist light theme', () => {
			setTheme('light');

			const stored = prefService.getPreferenceSync('whisker-theme', 'auto');
			expect(stored).toBe('light');
		});

		it('should persist dark theme', () => {
			setTheme('dark');

			const stored = prefService.getPreferenceSync('whisker-theme', 'auto');
			expect(stored).toBe('dark');
		});

		it('should persist auto theme', () => {
			setTheme('auto');

			const stored = prefService.getPreferenceSync('whisker-theme', 'auto');
			expect(stored).toBe('auto');
		});
	});

	describe('theme application', () => {
		it('should update theme store when setTheme is called', () => {
			setTheme('dark');
			expect(get(theme)).toBe('dark');

			setTheme('light');
			expect(get(theme)).toBe('light');
		});

		it('should update effectiveTheme when theme is set', () => {
			setTheme('dark');
			expect(get(effectiveTheme)).toBe('dark');

			setTheme('light');
			expect(get(effectiveTheme)).toBe('light');
		});

		it('should apply dark class to document when dark theme', () => {
			setTheme('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});

		it('should remove dark class when light theme', () => {
			setTheme('dark');
			setTheme('light');
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});

		it('should respect system preference when auto theme', () => {
			// Mock dark system preference
			Object.defineProperty(window, 'matchMedia', {
				writable: true,
				value: vi.fn().mockImplementation((query: string) => ({
					matches: query === '(prefers-color-scheme: dark)',
					media: query,
					onchange: null,
					addListener: vi.fn(),
					removeListener: vi.fn(),
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					dispatchEvent: vi.fn(),
				})),
			});

			setTheme('auto');
			expect(get(effectiveTheme)).toBe('dark');
		});
	});

	describe('themeActions', () => {
		it('should set light theme', () => {
			themeActions.setLight();
			expect(get(theme)).toBe('light');
		});

		it('should set dark theme', () => {
			themeActions.setDark();
			expect(get(theme)).toBe('dark');
		});

		it('should set auto theme', () => {
			themeActions.setAuto();
			expect(get(theme)).toBe('auto');
		});

		it('should toggle from light to dark', () => {
			setTheme('light');
			themeActions.toggle();
			expect(get(theme)).toBe('dark');
		});

		it('should toggle from dark to light', () => {
			setTheme('dark');
			themeActions.toggle();
			expect(get(theme)).toBe('light');
		});

		it('should toggle from auto based on system preference', () => {
			// Mock light system preference
			Object.defineProperty(window, 'matchMedia', {
				writable: true,
				value: vi.fn().mockImplementation((query: string) => ({
					matches: false,
					media: query,
					onchange: null,
					addListener: vi.fn(),
					removeListener: vi.fn(),
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					dispatchEvent: vi.fn(),
				})),
			});

			setTheme('auto');
			themeActions.toggle();
			expect(get(theme)).toBe('dark');
		});
	});

	describe('system preference changes', () => {
		it('should listen for system preference changes when auto theme', () => {
			let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

			Object.defineProperty(window, 'matchMedia', {
				writable: true,
				value: vi.fn().mockImplementation((query: string) => ({
					matches: false,
					media: query,
					onchange: null,
					addListener: vi.fn(),
					removeListener: vi.fn(),
					addEventListener: vi.fn((event, handler) => {
						if (event === 'change') {
							changeHandler = handler;
						}
					}),
					removeEventListener: vi.fn(),
					dispatchEvent: vi.fn(),
				})),
			});

			setTheme('auto');
			initTheme();

			expect(changeHandler).not.toBeNull();
		});

		it('should cleanup listeners on dispose', () => {
			const removeEventListenerSpy = vi.fn();

			Object.defineProperty(window, 'matchMedia', {
				writable: true,
				value: vi.fn().mockImplementation((query: string) => ({
					matches: false,
					media: query,
					onchange: null,
					addListener: vi.fn(),
					removeListener: vi.fn(),
					addEventListener: vi.fn(),
					removeEventListener: removeEventListenerSpy,
					dispatchEvent: vi.fn(),
				})),
			});

			initTheme();
			disposeTheme();

			expect(removeEventListenerSpy).toHaveBeenCalled();
		});
	});

	describe('backward compatibility', () => {
		it('should read theme from localStorage fallback', () => {
			// Write directly to localStorage (simulating old format)
			localStorage.setItem('whisker-theme', JSON.stringify('dark'));

			// Should read from localStorage
			const value = prefService.getPreferenceSync('whisker-theme', 'auto');
			expect(value).toBe('dark');
		});

		it('should migrate old theme values on first use', () => {
			// Set old value in localStorage
			localStorage.setItem('whisker-theme', JSON.stringify('light'));

			// Initialize and set new theme
			initTheme();
			setTheme('dark');

			// Should have new value
			const stored = prefService.getPreferenceSync('whisker-theme', 'auto');
			expect(stored).toBe('dark');
		});
	});

	describe('error handling', () => {
		it('should handle missing window gracefully', () => {
			const originalWindow = global.window;
			// @ts-expect-error - Simulating missing window
			delete global.window;

			// Should not throw
			expect(() => setTheme('dark')).not.toThrow();

			global.window = originalWindow;
		});
	});
});
