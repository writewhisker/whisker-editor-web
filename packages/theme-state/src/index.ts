/**
 * Theme State
 *
 * Manages application theme with system preference detection.
 * Can be used in any Svelte application for dark/light mode support.
 *
 * Note: This is a standalone version that uses localStorage directly.
 * For integration with preference services, wrap the storage calls.
 */

import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'auto';

const THEME_KEY = 'app-theme';

/**
 * Storage adapter interface for custom storage backends
 */
export interface ThemeStorage {
  get(key: string, defaultValue: Theme): Theme;
  set(key: string, value: Theme): void;
}

/**
 * Default localStorage adapter
 */
const defaultStorage: ThemeStorage = {
  get(key: string, defaultValue: Theme): Theme {
    if (typeof window === 'undefined') return defaultValue;

    const stored = localStorage.getItem(key);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
    return defaultValue;
  },
  set(key: string, value: Theme): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
};

// Allow custom storage adapter
let storage: ThemeStorage = defaultStorage;

/**
 * Configure custom storage adapter
 */
export function configureThemeStorage(adapter: ThemeStorage): void {
  storage = adapter;
}

// Get initial theme or default to 'auto'
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'auto';
  return storage.get(THEME_KEY, 'auto');
}

// Detect system preference
function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

// Create theme stores
export const theme = writable<Theme>('auto');
export const effectiveTheme = writable<'light' | 'dark'>('light');

// Track cleanup functions
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
let mediaQueryList: MediaQueryList | null = null;

// Apply theme to document
export function applyTheme(t: Theme) {
  const actualTheme = t === 'auto' ? getSystemPreference() : t;

  if (typeof window !== 'undefined' && document.documentElement) {
    if (actualTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  effectiveTheme.set(actualTheme);
}

// Set theme and persist
export function setTheme(t: Theme) {
  theme.set(t);
  if (typeof window !== 'undefined') {
    storage.set(THEME_KEY, t);
  }
  applyTheme(t);
}

// Initialize theme (call this once from your app root)
export function initTheme(): void {
  if (typeof window === 'undefined') return;

  // Load and apply initial theme
  const initialTheme = getInitialTheme();
  theme.set(initialTheme);
  applyTheme(initialTheme);

  // Listen for system theme changes
  if (window.matchMedia) {
    mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryListener = () => {
      const currentTheme = theme;
      let themeValue: Theme = 'auto';
      const unsubscribe = currentTheme.subscribe(t => {
        themeValue = t;
      });
      unsubscribe();

      if (themeValue === 'auto') {
        applyTheme('auto');
      }
    };
    mediaQueryList.addEventListener('change', mediaQueryListener);
  }
}

// Clean up listeners (useful for tests)
export function disposeTheme(): void {
  if (mediaQueryList && mediaQueryListener) {
    mediaQueryList.removeEventListener('change', mediaQueryListener);
    mediaQueryList = null;
    mediaQueryListener = null;
  }
}

// Export actions
export const themeActions = {
  setLight: () => setTheme('light'),
  setDark: () => setTheme('dark'),
  setAuto: () => setTheme('auto'),
  toggle: () => {
    let currentTheme: Theme = 'auto';
    const unsubscribe = theme.subscribe(t => {
      currentTheme = t;
    });
    unsubscribe();

    if (currentTheme === 'auto') {
      const system = getSystemPreference();
      setTheme(system === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }
  }
};

// Auto-initialize in browser (but not in tests)
if (typeof window !== 'undefined' && typeof process === 'undefined') {
  initTheme();
}
