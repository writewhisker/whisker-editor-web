import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRecentFiles,
  addRecentFile,
  removeRecentFile,
  clearRecentFiles,
  formatLastOpened,
  type RecentFile,
} from './recentFiles';

describe('recentFiles', () => {
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

  describe('getRecentFiles', () => {
    it('should return empty array when no files saved', () => {
      const files = getRecentFiles();
      expect(files).toEqual([]);
    });

    it('should return saved files from localStorage', () => {
      const testFiles: RecentFile[] = [
        { name: 'story1.whisker', lastOpened: Date.now(), storyTitle: 'Story 1' },
        { name: 'story2.whisker', lastOpened: Date.now() - 1000, storyTitle: 'Story 2' },
      ];
      localStorageMock['whisker-recent-files'] = JSON.stringify(testFiles);

      const files = getRecentFiles();

      expect(files).toEqual(testFiles);
    });

    it('should limit results to MAX_RECENT_FILES (5)', () => {
      const testFiles: RecentFile[] = Array.from({ length: 10 }, (_, i) => ({
        name: `story${i}.whisker`,
        lastOpened: Date.now() - i * 1000,
        storyTitle: `Story ${i}`,
      }));
      localStorageMock['whisker-recent-files'] = JSON.stringify(testFiles);

      const files = getRecentFiles();

      expect(files).toHaveLength(5);
      expect(files).toEqual(testFiles.slice(0, 5));
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

      const files = getRecentFiles();

      expect(files).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle JSON parse errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock['whisker-recent-files'] = 'invalid json';

      const files = getRecentFiles();

      expect(files).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('addRecentFile', () => {
    it('should add file to recent files list', () => {
      const file = { name: 'test.whisker', storyTitle: 'Test Story' };

      addRecentFile(file);

      const saved = getRecentFiles();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('test.whisker');
      expect(saved[0].storyTitle).toBe('Test Story');
      expect(saved[0].lastOpened).toBeDefined();
    });

    it('should add file to beginning of list', () => {
      const file1 = { name: 'first.whisker', storyTitle: 'First' };
      const file2 = { name: 'second.whisker', storyTitle: 'Second' };

      addRecentFile(file1);
      addRecentFile(file2);

      const saved = getRecentFiles();
      expect(saved[0].name).toBe('second.whisker');
      expect(saved[1].name).toBe('first.whisker');
    });

    it('should move existing file to top when re-added', () => {
      const file1 = { name: 'first.whisker', storyTitle: 'First' };
      const file2 = { name: 'second.whisker', storyTitle: 'Second' };

      addRecentFile(file1);
      addRecentFile(file2);
      addRecentFile(file1); // Re-add first file

      const saved = getRecentFiles();
      expect(saved).toHaveLength(2);
      expect(saved[0].name).toBe('first.whisker');
      expect(saved[1].name).toBe('second.whisker');
    });

    it('should trim list to MAX_RECENT_FILES (5)', () => {
      for (let i = 0; i < 7; i++) {
        addRecentFile({ name: `file${i}.whisker`, storyTitle: `File ${i}` });
      }

      const saved = getRecentFiles();
      expect(saved).toHaveLength(5);
      expect(saved[0].name).toBe('file6.whisker'); // Most recent
      expect(saved[4].name).toBe('file2.whisker'); // 5th most recent
    });

    it('should update timestamp when re-adding existing file', async () => {
      const file = { name: 'test.whisker', storyTitle: 'Test' };

      addRecentFile(file);
      const firstTimestamp = getRecentFiles()[0].lastOpened;

      await new Promise(resolve => setTimeout(resolve, 10));

      addRecentFile(file);
      const secondTimestamp = getRecentFiles()[0].lastOpened;

      expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
    });

    it('should include optional path field', () => {
      const file = { name: 'test.whisker', path: '/path/to/test.whisker', storyTitle: 'Test' };

      addRecentFile(file);

      const saved = getRecentFiles();
      expect(saved[0].path).toBe('/path/to/test.whisker');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => '[]'),
          setItem: vi.fn(() => { throw new Error('Storage error'); }),
        },
        writable: true,
        configurable: true,
      });

      expect(() => addRecentFile({ name: 'test.whisker' })).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should preserve all file properties', () => {
      const file = {
        name: 'test.whisker',
        path: '/path/to/file',
        storyTitle: 'My Story',
      };

      addRecentFile(file);

      const saved = getRecentFiles()[0];
      expect(saved.name).toBe(file.name);
      expect(saved.path).toBe(file.path);
      expect(saved.storyTitle).toBe(file.storyTitle);
    });
  });

  describe('removeRecentFile', () => {
    it('should remove file from recent files list', () => {
      addRecentFile({ name: 'test.whisker', storyTitle: 'Test' });
      addRecentFile({ name: 'other.whisker', storyTitle: 'Other' });

      removeRecentFile('test.whisker');

      const saved = getRecentFiles();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('other.whisker');
    });

    it('should do nothing if file not found', () => {
      addRecentFile({ name: 'test.whisker', storyTitle: 'Test' });

      removeRecentFile('nonexistent.whisker');

      const saved = getRecentFiles();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('test.whisker');
    });

    it('should handle empty list', () => {
      expect(() => removeRecentFile('test.whisker')).not.toThrow();
      expect(getRecentFiles()).toEqual([]);
    });

    it('should remove all instances of file name', () => {
      // Manually create duplicate (shouldn't happen normally due to addRecentFile logic)
      const testFiles: RecentFile[] = [
        { name: 'dup.whisker', lastOpened: Date.now(), storyTitle: 'Dup 1' },
        { name: 'other.whisker', lastOpened: Date.now() - 1000, storyTitle: 'Other' },
        { name: 'dup.whisker', lastOpened: Date.now() - 2000, storyTitle: 'Dup 2' },
      ];
      localStorageMock['whisker-recent-files'] = JSON.stringify(testFiles);

      removeRecentFile('dup.whisker');

      const saved = getRecentFiles();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('other.whisker');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => '[]'),
          setItem: vi.fn(() => { throw new Error('Storage error'); }),
        },
        writable: true,
        configurable: true,
      });

      expect(() => removeRecentFile('test.whisker')).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearRecentFiles', () => {
    it('should clear all recent files', () => {
      addRecentFile({ name: 'test1.whisker', storyTitle: 'Test 1' });
      addRecentFile({ name: 'test2.whisker', storyTitle: 'Test 2' });

      clearRecentFiles();

      expect(localStorage.removeItem).toHaveBeenCalledWith('whisker-recent-files');
      expect(localStorageMock['whisker-recent-files']).toBeUndefined();
      expect(getRecentFiles()).toEqual([]);
    });

    it('should handle empty list', () => {
      expect(() => clearRecentFiles()).not.toThrow();
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

      expect(() => clearRecentFiles()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('formatLastOpened', () => {
    it('should format "just now" for recent timestamps', () => {
      const now = Date.now();
      expect(formatLastOpened(now)).toBe('just now');
      expect(formatLastOpened(now - 30000)).toBe('just now'); // 30 seconds ago
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      expect(formatLastOpened(fiveMinutesAgo)).toBe('5 minutes ago');

      const oneMinuteAgo = Date.now() - (1 * 60 * 1000);
      expect(formatLastOpened(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should format hours ago', () => {
      const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
      expect(formatLastOpened(threeHoursAgo)).toBe('3 hours ago');

      const oneHourAgo = Date.now() - (1 * 60 * 60 * 1000);
      expect(formatLastOpened(oneHourAgo)).toBe('1 hour ago');
    });

    it('should format "yesterday" for 1 day ago', () => {
      const oneDayAgo = Date.now() - (1 * 24 * 60 * 60 * 1000);
      expect(formatLastOpened(oneDayAgo)).toBe('yesterday');
    });

    it('should format "X days ago" for recent days', () => {
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      expect(formatLastOpened(threeDaysAgo)).toBe('3 days ago');

      const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);
      expect(formatLastOpened(sixDaysAgo)).toBe('6 days ago');
    });

    it('should format absolute date for old timestamps (7+ days)', () => {
      const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
      const formatted = formatLastOpened(eightDaysAgo);

      // Should be a locale date string
      expect(formatted).toContain('/');
      expect(formatted).not.toBe('8 days ago');
    });

    it('should use singular for 1 unit', () => {
      expect(formatLastOpened(Date.now() - 60000)).toBe('1 minute ago');
      expect(formatLastOpened(Date.now() - 3600000)).toBe('1 hour ago');
      expect(formatLastOpened(Date.now() - 86400000)).toBe('yesterday');
    });

    it('should use plural for multiple units', () => {
      expect(formatLastOpened(Date.now() - 120000)).toBe('2 minutes ago');
      expect(formatLastOpened(Date.now() - 7200000)).toBe('2 hours ago');
      expect(formatLastOpened(Date.now() - 172800000)).toBe('2 days ago');
    });

    it('should handle boundary conditions', () => {
      // Just under 1 minute
      expect(formatLastOpened(Date.now() - 59000)).toBe('just now');

      // Just over 1 minute
      expect(formatLastOpened(Date.now() - 61000)).toBe('1 minute ago');

      // Just under 1 hour
      expect(formatLastOpened(Date.now() - (59 * 60 * 1000))).toBe('59 minutes ago');

      // Just over 1 hour
      expect(formatLastOpened(Date.now() - (61 * 60 * 1000))).toBe('1 hour ago');
    });
  });

  describe('integration', () => {
    it('should maintain chronological order', () => {
      const files = [
        { name: 'first.whisker', storyTitle: 'First' },
        { name: 'second.whisker', storyTitle: 'Second' },
        { name: 'third.whisker', storyTitle: 'Third' },
      ];

      // Add in order
      files.forEach(file => addRecentFile(file));

      const saved = getRecentFiles();

      // Should be in reverse order (most recent first)
      expect(saved[0].name).toBe('third.whisker');
      expect(saved[1].name).toBe('second.whisker');
      expect(saved[2].name).toBe('first.whisker');
    });

    it('should persist across multiple operations', () => {
      addRecentFile({ name: 'file1.whisker', storyTitle: 'File 1' });
      addRecentFile({ name: 'file2.whisker', storyTitle: 'File 2' });

      removeRecentFile('file1.whisker');

      addRecentFile({ name: 'file3.whisker', storyTitle: 'File 3' });

      const saved = getRecentFiles();
      expect(saved).toHaveLength(2);
      expect(saved[0].name).toBe('file3.whisker');
      expect(saved[1].name).toBe('file2.whisker');
    });
  });
});
