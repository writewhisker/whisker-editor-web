import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAutoSaveInterval,
  setAutoSaveInterval,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  hasRecentAutoSave,
  formatAutoSaveTime,
  AutoSaveManager,
  type AutoSaveData,
} from './autoSave';

// Mock Story class
const createMockStory = (title = 'Test Story') => ({
  metadata: { title },
  serialize: vi.fn(() => ({
    metadata: { title },
    passages: [],
    variables: [],
    startPassage: null,
  })),
});

describe('autoSave', () => {
  let localStorageMock: { [key: string]: string };

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

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAutoSaveInterval', () => {
    it('should return default interval when no value saved', () => {
      expect(getAutoSaveInterval()).toBe(30000);
    });

    it('should return saved interval from localStorage', () => {
      localStorageMock['whisker-autosave-interval'] = '60000';
      expect(getAutoSaveInterval()).toBe(60000);
    });

    it('should return default for invalid interval (too small)', () => {
      localStorageMock['whisker-autosave-interval'] = '5000'; // Less than 10 seconds
      expect(getAutoSaveInterval()).toBe(30000);
    });

    it('should return default for invalid interval (too large)', () => {
      localStorageMock['whisker-autosave-interval'] = '700000'; // More than 10 minutes
      expect(getAutoSaveInterval()).toBe(30000);
    });

    it('should accept minimum valid interval (10 seconds)', () => {
      localStorageMock['whisker-autosave-interval'] = '10000';
      expect(getAutoSaveInterval()).toBe(10000);
    });

    it('should accept maximum valid interval (10 minutes)', () => {
      localStorageMock['whisker-autosave-interval'] = '600000';
      expect(getAutoSaveInterval()).toBe(600000);
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('Storage error'); }),
        },
        writable: true,
        configurable: true,
      });

      expect(getAutoSaveInterval()).toBe(30000);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-numeric values', () => {
      localStorageMock['whisker-autosave-interval'] = 'invalid';
      expect(getAutoSaveInterval()).toBe(30000);
    });
  });

  describe('setAutoSaveInterval', () => {
    it('should save valid interval to localStorage', () => {
      setAutoSaveInterval(45000);
      expect(localStorageMock['whisker-autosave-interval']).toBe('45000');
    });

    it('should accept minimum valid interval', () => {
      setAutoSaveInterval(10000);
      expect(localStorageMock['whisker-autosave-interval']).toBe('10000');
    });

    it('should accept maximum valid interval', () => {
      setAutoSaveInterval(600000);
      expect(localStorageMock['whisker-autosave-interval']).toBe('600000');
    });

    it('should throw error for interval too small', () => {
      expect(() => setAutoSaveInterval(5000)).toThrow('Interval must be between 10 seconds and 10 minutes');
    });

    it('should throw error for interval too large', () => {
      expect(() => setAutoSaveInterval(700000)).toThrow('Interval must be between 10 seconds and 10 minutes');
    });

    it('should not save invalid interval', () => {
      try {
        setAutoSaveInterval(5000);
      } catch (e) {
        // Expected
      }
      expect(localStorageMock['whisker-autosave-interval']).toBeUndefined();
    });

    it('should handle localStorage errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          setItem: vi.fn(() => { throw new Error('Storage error'); }),
        },
        writable: true,
        configurable: true,
      });

      expect(() => setAutoSaveInterval(45000)).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveToLocalStorage', () => {
    it('should save story to localStorage', () => {
      const mockStory = createMockStory('My Story');
      const beforeSave = Date.now();

      saveToLocalStorage(mockStory as any);

      expect(localStorage.setItem).toHaveBeenCalledWith('whisker-autosave', expect.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('whisker-autosave-timestamp', expect.any(String));

      const saved = JSON.parse(localStorageMock['whisker-autosave']) as AutoSaveData;
      expect(saved.storyTitle).toBe('My Story');
      expect(saved.timestamp).toBeGreaterThanOrEqual(beforeSave);
      expect(mockStory.serialize).toHaveBeenCalled();
    });

    it('should use "Untitled Story" for story without title', () => {
      const mockStory = createMockStory('');
      mockStory.metadata.title = '';

      saveToLocalStorage(mockStory as any);

      const saved = JSON.parse(localStorageMock['whisker-autosave']) as AutoSaveData;
      expect(saved.storyTitle).toBe('Untitled Story');
    });

    it('should handle localStorage errors gracefully without throwing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          setItem: vi.fn(() => { throw new Error('Storage error'); }),
        },
        writable: true,
        configurable: true,
      });

      const mockStory = createMockStory();

      // Should not throw
      expect(() => saveToLocalStorage(mockStory as any)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should save serialized story data', () => {
      const mockStory = createMockStory('Test');
      const serializedData = { metadata: { title: 'Test' }, passages: ['p1'], variables: [], startPassage: 'p1' };
      mockStory.serialize.mockReturnValue(serializedData);

      saveToLocalStorage(mockStory as any);

      const saved = JSON.parse(localStorageMock['whisker-autosave']) as AutoSaveData;
      expect(saved.story).toEqual(serializedData);
    });
  });

  describe('loadFromLocalStorage', () => {
    it('should load saved story from localStorage', () => {
      const testData: AutoSaveData = {
        story: { metadata: { title: 'Loaded Story' }, passages: [], variables: [], startPassage: null },
        timestamp: Date.now(),
        storyTitle: 'Loaded Story',
      };
      localStorageMock['whisker-autosave'] = JSON.stringify(testData);

      const loaded = loadFromLocalStorage();

      expect(loaded).toEqual(testData);
    });

    it('should return null when no data saved', () => {
      const loaded = loadFromLocalStorage();
      expect(loaded).toBeNull();
    });

    it('should clear and return null for invalid data (missing story)', () => {
      localStorageMock['whisker-autosave'] = JSON.stringify({
        timestamp: Date.now(),
        storyTitle: 'Test',
      });

      const loaded = loadFromLocalStorage();

      expect(loaded).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('whisker-autosave');
      expect(localStorage.removeItem).toHaveBeenCalledWith('whisker-autosave-timestamp');
    });

    it('should clear and return null for invalid data (missing timestamp)', () => {
      localStorageMock['whisker-autosave'] = JSON.stringify({
        story: { metadata: {} },
        storyTitle: 'Test',
      });

      const loaded = loadFromLocalStorage();

      expect(loaded).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('should handle JSON parse errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock['whisker-autosave'] = 'invalid json';

      const loaded = loadFromLocalStorage();

      expect(loaded).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(localStorage.removeItem).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle localStorage errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('Storage error'); }),
          removeItem: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      const loaded = loadFromLocalStorage();

      expect(loaded).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearLocalStorage', () => {
    it('should remove auto-save data from localStorage', () => {
      localStorageMock['whisker-autosave'] = 'data';
      localStorageMock['whisker-autosave-timestamp'] = '12345';

      clearLocalStorage();

      expect(localStorage.removeItem).toHaveBeenCalledWith('whisker-autosave');
      expect(localStorage.removeItem).toHaveBeenCalledWith('whisker-autosave-timestamp');
      expect(localStorageMock['whisker-autosave']).toBeUndefined();
      expect(localStorageMock['whisker-autosave-timestamp']).toBeUndefined();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          removeItem: vi.fn(() => { throw new Error('Storage error'); }),
        },
        writable: true,
        configurable: true,
      });

      expect(() => clearLocalStorage()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('hasRecentAutoSave', () => {
    it('should return true for recent auto-save (within 24 hours)', () => {
      const recentTimestamp = Date.now() - (1000 * 60 * 60); // 1 hour ago
      localStorageMock['whisker-autosave-timestamp'] = recentTimestamp.toString();

      expect(hasRecentAutoSave()).toBe(true);
    });

    it('should return false for old auto-save (older than 24 hours)', () => {
      const oldTimestamp = Date.now() - (1000 * 60 * 60 * 25); // 25 hours ago
      localStorageMock['whisker-autosave-timestamp'] = oldTimestamp.toString();

      expect(hasRecentAutoSave()).toBe(false);
    });

    it('should return false when no timestamp saved', () => {
      expect(hasRecentAutoSave()).toBe(false);
    });

    it('should return false for invalid timestamp', () => {
      localStorageMock['whisker-autosave-timestamp'] = 'invalid';
      expect(hasRecentAutoSave()).toBe(false);
    });

    it('should handle localStorage errors gracefully', () => {
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('Storage error'); }),
        },
        writable: true,
        configurable: true,
      });

      expect(hasRecentAutoSave()).toBe(false);
    });

    it('should return true for auto-save exactly at 24 hour boundary', () => {
      const timestamp = Date.now() - (24 * 60 * 60 * 1000) + 1000; // Just under 24 hours
      localStorageMock['whisker-autosave-timestamp'] = timestamp.toString();

      expect(hasRecentAutoSave()).toBe(true);
    });
  });

  describe('formatAutoSaveTime', () => {
    it('should format "just now" for recent timestamps', () => {
      const now = Date.now();
      expect(formatAutoSaveTime(now)).toBe('just now');
      expect(formatAutoSaveTime(now - 30000)).toBe('just now'); // 30 seconds ago
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      expect(formatAutoSaveTime(fiveMinutesAgo)).toBe('5 minutes ago');

      const oneMinuteAgo = Date.now() - (1 * 60 * 1000);
      expect(formatAutoSaveTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should format hours ago', () => {
      const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
      expect(formatAutoSaveTime(threeHoursAgo)).toBe('3 hours ago');

      const oneHourAgo = Date.now() - (1 * 60 * 60 * 1000);
      expect(formatAutoSaveTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('should format days ago', () => {
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      expect(formatAutoSaveTime(threeDaysAgo)).toBe('3 days ago');

      const oneDayAgo = Date.now() - (1 * 24 * 60 * 60 * 1000);
      expect(formatAutoSaveTime(oneDayAgo)).toBe('1 day ago');
    });

    it('should use singular for 1 unit', () => {
      expect(formatAutoSaveTime(Date.now() - 60000)).toBe('1 minute ago');
      expect(formatAutoSaveTime(Date.now() - 3600000)).toBe('1 hour ago');
      expect(formatAutoSaveTime(Date.now() - 86400000)).toBe('1 day ago');
    });

    it('should use plural for multiple units', () => {
      expect(formatAutoSaveTime(Date.now() - 120000)).toBe('2 minutes ago');
      expect(formatAutoSaveTime(Date.now() - 7200000)).toBe('2 hours ago');
      expect(formatAutoSaveTime(Date.now() - 172800000)).toBe('2 days ago');
    });
  });

  describe('AutoSaveManager', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create an instance', () => {
      const manager = new AutoSaveManager();
      expect(manager).toBeInstanceOf(AutoSaveManager);
    });

    it('should start auto-saving with callback', () => {
      localStorageMock['whisker-autosave-interval'] = '30000';

      const manager = new AutoSaveManager();
      const callback = vi.fn();

      manager.start(callback);

      // Fast-forward time by interval
      vi.advanceTimersByTime(30000);
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(30000);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should use custom interval', () => {
      localStorageMock['whisker-autosave-interval'] = '60000';

      const manager = new AutoSaveManager();
      const callback = vi.fn();

      manager.start(callback);

      vi.advanceTimersByTime(30000);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(30000);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should stop auto-saving', () => {
      const manager = new AutoSaveManager();
      const callback = vi.fn();

      manager.start(callback);
      manager.stop();

      vi.advanceTimersByTime(60000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear existing interval when starting again', () => {
      const manager = new AutoSaveManager();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.start(callback1);
      manager.start(callback2);

      vi.advanceTimersByTime(30000);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should save now immediately', () => {
      const manager = new AutoSaveManager();
      const callback = vi.fn();

      manager.start(callback);
      manager.saveNow();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not throw when saveNow called without callback', () => {
      const manager = new AutoSaveManager();
      expect(() => manager.saveNow()).not.toThrow();
    });

    it('should update interval and restart', () => {
      const manager = new AutoSaveManager();
      const callback = vi.fn();

      manager.start(callback);

      // Update to 45 seconds
      manager.updateInterval(45000);

      vi.advanceTimersByTime(30000);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(15000);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not restart when updating interval while stopped', () => {
      const manager = new AutoSaveManager();
      const callback = vi.fn();

      manager.updateInterval(45000);

      vi.advanceTimersByTime(60000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should get current interval', () => {
      localStorageMock['whisker-autosave-interval'] = '45000';

      const manager = new AutoSaveManager();
      expect(manager.getInterval()).toBe(45000);
    });

    it('should handle multiple stop calls', () => {
      const manager = new AutoSaveManager();
      const callback = vi.fn();

      manager.start(callback);
      manager.stop();
      expect(() => manager.stop()).not.toThrow();
    });
  });

  describe('autoSaveManager singleton', () => {
    it('should export a singleton instance', async () => {
      const { autoSaveManager } = await import('./autoSave');
      expect(autoSaveManager).toBeInstanceOf(AutoSaveManager);
    });
  });
});
