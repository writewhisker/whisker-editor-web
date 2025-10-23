import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'auto';

const THEME_KEY = 'whisker-theme';

// Get initial theme from localStorage or default to 'auto'
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'auto';

  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored;
  }

  return 'auto';
}

// Detect system preference
function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

// Create theme store
export const theme = writable<Theme>(getInitialTheme());
export const effectiveTheme = writable<'light' | 'dark'>('light');

// Apply theme to document
export function applyTheme(t: Theme) {
  const actualTheme = t === 'auto' ? getSystemPreference() : t;

  if (actualTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  effectiveTheme.set(actualTheme);
}

// Set theme and persist
export function setTheme(t: Theme) {
  theme.set(t);
  localStorage.setItem(THEME_KEY, t);
  applyTheme(t);
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme());

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    theme.subscribe(t => {
      if (t === 'auto') {
        applyTheme('auto');
      }
    })();
  });
}

// Export actions
export const themeActions = {
  setLight: () => setTheme('light'),
  setDark: () => setTheme('dark'),
  setAuto: () => setTheme('auto'),
  toggle: () => {
    theme.subscribe(t => {
      if (t === 'auto') {
        const system = getSystemPreference();
        setTheme(system === 'dark' ? 'light' : 'dark');
      } else {
        setTheme(t === 'dark' ? 'light' : 'dark');
      }
    })();
  }
};
