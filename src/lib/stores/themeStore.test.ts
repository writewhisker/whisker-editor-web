import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

describe('themeStore', () => {
  let localStorageMock: { [key: string]: string };
  let matchMediaMock: any;
  let documentClassListMock: any;
  let classListSet: Set<string>;

  beforeEach(() => {
    // Setup localStorage mock
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

    // Setup matchMedia mock
    matchMediaMock = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => matchMediaMock),
    });

    // Setup document.documentElement.classList mock
    classListSet = new Set<string>();
    documentClassListMock = {
      add: vi.fn((className: string) => classListSet.add(className)),
      remove: vi.fn((className: string) => classListSet.delete(className)),
      contains: vi.fn((className: string) => classListSet.has(className)),
      toggle: vi.fn(),
      replace: vi.fn(),
    };
    Object.defineProperty(document.documentElement, 'classList', {
      value: documentClassListMock,
      writable: true,
      configurable: true,
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up theme listeners after each test
    const { disposeTheme } = await import('./themeStore');
    disposeTheme();
  });

  describe('stores', () => {
    it('should export theme store', async () => {
      const { theme } = await import('./themeStore');
      expect(theme).toBeTruthy();
      expect(typeof theme.subscribe).toBe('function');
    });

    it('should export effectiveTheme store', async () => {
      const { effectiveTheme } = await import('./themeStore');
      expect(effectiveTheme).toBeTruthy();
      expect(typeof effectiveTheme.subscribe).toBe('function');
    });

    it('should default theme to auto', async () => {
      const { theme } = await import('./themeStore');
      const currentTheme = get(theme);
      expect(currentTheme).toBe('auto');
    });
  });

  describe('applyTheme', () => {
    it('should add dark class for dark theme', async () => {
      const { applyTheme } = await import('./themeStore');

      applyTheme('dark');

      expect(documentClassListMock.add).toHaveBeenCalledWith('dark');
    });

    it('should remove dark class for light theme', async () => {
      const { applyTheme } = await import('./themeStore');

      applyTheme('light');

      expect(documentClassListMock.remove).toHaveBeenCalledWith('dark');
    });

    it('should handle auto theme with dark system preference', async () => {
      matchMediaMock.matches = true;
      const { applyTheme } = await import('./themeStore');

      applyTheme('auto');

      expect(documentClassListMock.add).toHaveBeenCalledWith('dark');
    });

    it('should handle auto theme with light system preference', async () => {
      matchMediaMock.matches = false;
      const { applyTheme } = await import('./themeStore');

      applyTheme('auto');

      expect(documentClassListMock.remove).toHaveBeenCalledWith('dark');
    });

    it('should update effectiveTheme store', async () => {
      const { applyTheme, effectiveTheme } = await import('./themeStore');

      applyTheme('dark');
      expect(get(effectiveTheme)).toBe('dark');

      applyTheme('light');
      expect(get(effectiveTheme)).toBe('light');
    });
  });

  describe('setTheme', () => {
    it('should update theme store', async () => {
      const { setTheme, theme } = await import('./themeStore');

      setTheme('dark');
      expect(get(theme)).toBe('dark');
    });

    it('should persist to localStorage', async () => {
      const { setTheme } = await import('./themeStore');

      setTheme('dark');

      expect(localStorage.setItem).toHaveBeenCalledWith('whisker-theme', 'dark');
      expect(localStorageMock['whisker-theme']).toBe('dark');
    });

    it('should apply theme to document', async () => {
      const { setTheme } = await import('./themeStore');

      setTheme('dark');

      expect(documentClassListMock.add).toHaveBeenCalledWith('dark');
    });

    it('should handle all theme types', async () => {
      const { setTheme, theme } = await import('./themeStore');

      setTheme('light');
      expect(get(theme)).toBe('light');

      setTheme('dark');
      expect(get(theme)).toBe('dark');

      setTheme('auto');
      expect(get(theme)).toBe('auto');
    });
  });

  describe('initTheme', () => {
    it('should load theme from localStorage', async () => {
      localStorageMock['whisker-theme'] = 'dark';
      const { initTheme, theme } = await import('./themeStore');

      initTheme();

      expect(get(theme)).toBe('dark');
    });

    it('should apply initial theme', async () => {
      localStorageMock['whisker-theme'] = 'light';
      const { initTheme } = await import('./themeStore');

      initTheme();

      expect(documentClassListMock.remove).toHaveBeenCalledWith('dark');
    });

    it('should register matchMedia listener', async () => {
      const { initTheme } = await import('./themeStore');

      initTheme();

      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(matchMediaMock.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should not throw when window is undefined', async () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const { initTheme } = await import('./themeStore');
      expect(() => initTheme()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('disposeTheme', () => {
    it('should remove matchMedia listener', async () => {
      const { initTheme, disposeTheme } = await import('./themeStore');

      initTheme();
      disposeTheme();

      expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should be idempotent', async () => {
      const { initTheme, disposeTheme } = await import('./themeStore');

      initTheme();
      disposeTheme();
      expect(() => disposeTheme()).not.toThrow();
    });
  });

  describe('themeActions', () => {
    it('should have setLight action', async () => {
      const { themeActions, theme } = await import('./themeStore');

      themeActions.setLight();

      expect(get(theme)).toBe('light');
      expect(localStorageMock['whisker-theme']).toBe('light');
    });

    it('should have setDark action', async () => {
      const { themeActions, theme } = await import('./themeStore');

      themeActions.setDark();

      expect(get(theme)).toBe('dark');
      expect(localStorageMock['whisker-theme']).toBe('dark');
    });

    it('should have setAuto action', async () => {
      const { themeActions, theme } = await import('./themeStore');

      themeActions.setAuto();

      expect(get(theme)).toBe('auto');
      expect(localStorageMock['whisker-theme']).toBe('auto');
    });

    it('should toggle from light to dark', async () => {
      const { themeActions, setTheme, theme } = await import('./themeStore');

      setTheme('light');
      themeActions.toggle();

      expect(get(theme)).toBe('dark');
    });

    it('should toggle from dark to light', async () => {
      const { themeActions, setTheme, theme } = await import('./themeStore');

      setTheme('dark');
      themeActions.toggle();

      expect(get(theme)).toBe('light');
    });

    it('should toggle from auto based on system preference', async () => {
      matchMediaMock.matches = true; // System is dark
      const { themeActions, setTheme, theme } = await import('./themeStore');

      setTheme('auto');
      themeActions.toggle();

      // Should toggle to opposite of system (light)
      expect(get(theme)).toBe('light');
    });
  });

  describe('localStorage persistence', () => {
    it('should handle invalid localStorage values', async () => {
      localStorageMock['whisker-theme'] = 'invalid-theme';
      const { initTheme, theme } = await import('./themeStore');

      initTheme();

      // Should default to auto for invalid values
      expect(get(theme)).toBe('auto');
    });

    it('should persist theme changes', async () => {
      const { setTheme } = await import('./themeStore');

      setTheme('dark');
      expect(localStorageMock['whisker-theme']).toBe('dark');

      setTheme('light');
      expect(localStorageMock['whisker-theme']).toBe('light');
    });
  });

  describe('effectiveTheme', () => {
    it('should reflect actual applied theme', async () => {
      const { setTheme, effectiveTheme } = await import('./themeStore');

      setTheme('dark');
      expect(get(effectiveTheme)).toBe('dark');

      setTheme('light');
      expect(get(effectiveTheme)).toBe('light');
    });

    it('should resolve auto to system preference', async () => {
      matchMediaMock.matches = true;
      const { setTheme, effectiveTheme } = await import('./themeStore');

      setTheme('auto');
      expect(get(effectiveTheme)).toBe('dark');
    });
  });

  describe('edge cases', () => {
    it('should handle rapid theme changes', async () => {
      const { setTheme, theme } = await import('./themeStore');

      setTheme('light');
      setTheme('dark');
      setTheme('auto');
      setTheme('light');

      expect(get(theme)).toBe('light');
    });

    it('should handle same theme set multiple times', async () => {
      const { setTheme, theme } = await import('./themeStore');

      setTheme('dark');
      setTheme('dark');
      setTheme('dark');

      expect(get(theme)).toBe('dark');
      expect(localStorage.setItem).toHaveBeenCalledTimes(3);
    });

    it('should work without matchMedia support', async () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      const { initTheme } = await import('./themeStore');

      expect(() => initTheme()).not.toThrow();
    });
  });
});
