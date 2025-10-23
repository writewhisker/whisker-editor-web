import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  exportPreferences,
  exportHistory,
  importHistory,
  isExporting,
  isImporting,
  exportError,
  importError,
  recentExports,
  recentImports,
  exportActions,
} from './exportStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL methods globally
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

describe('exportStore', () => {
  let testStory: Story;

  beforeEach(() => {
    // Clear localStorage
    localStorageMock.clear();

    // Reset stores
    exportActions.resetPreferences();
    exportActions.clearExportHistory();
    exportActions.clearImportHistory();

    // Create test story
    testStory = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    const passage = new Passage({ title: 'Start' });
    passage.content = 'Test content';
    testStory.addPassage(passage);
    testStory.startPassage = passage.id;
  });

  describe('exportPreferences', () => {
    it('should initialize with default preferences', () => {
      const prefs = get(exportPreferences);
      expect(prefs.lastFormat).toBe('json');
      expect(prefs.includeValidation).toBe(true);
      expect(prefs.prettyPrint).toBe(true);
      expect(prefs.htmlTheme).toBe('auto');
    });

    it('should update preferences', () => {
      exportActions.updatePreferences({ lastFormat: 'html' });
      const prefs = get(exportPreferences);
      expect(prefs.lastFormat).toBe('html');
    });

    it('should persist preferences to localStorage', () => {
      exportActions.updatePreferences({ lastFormat: 'markdown' });
      const stored = localStorageMock.getItem('whisker_export_preferences');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).lastFormat).toBe('markdown');
    });

    it('should reset preferences to defaults', () => {
      exportActions.updatePreferences({ lastFormat: 'html', includeValidation: false });
      exportActions.resetPreferences();
      const prefs = get(exportPreferences);
      expect(prefs.lastFormat).toBe('json');
      expect(prefs.includeValidation).toBe(true);
    });
  });

  describe('exportHistory', () => {
    it('should initialize with empty history', () => {
      const history = get(exportHistory);
      expect(history).toEqual([]);
    });

    it('should add entries to history after export', async () => {
      // Mock file download
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };

      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return mockLink as any;
        return {} as any;
      });
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      await exportActions.exportStory(testStory, 'json');

      const history = get(exportHistory);
      expect(history.length).toBe(1);
      expect(history[0].format).toBe('json');
      expect(history[0].storyTitle).toBe('Test Story');
      expect(history[0].success).toBe(true);

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should clear history', () => {
      exportHistory.set([
        {
          id: 'test',
          timestamp: Date.now(),
          format: 'json',
          storyTitle: 'Test',
          size: 100,
          success: true,
        },
      ]);

      exportActions.clearExportHistory();
      const history = get(exportHistory);
      expect(history).toEqual([]);
    });

    it('should persist history to localStorage', () => {
      exportHistory.set([
        {
          id: 'test',
          timestamp: Date.now(),
          format: 'json',
          storyTitle: 'Test',
          size: 100,
          success: true,
        },
      ]);

      const stored = localStorageMock.getItem('whisker_export_history');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toHaveLength(1);
    });
  });

  describe('importHistory', () => {
    it('should initialize with empty history', () => {
      const history = get(importHistory);
      expect(history).toEqual([]);
    });

    it('should clear history', () => {
      importHistory.set([
        {
          id: 'test',
          timestamp: Date.now(),
          format: 'json',
          storyTitle: 'Test',
          passageCount: 5,
          success: true,
          filename: 'test.json',
        },
      ]);

      exportActions.clearImportHistory();
      const history = get(importHistory);
      expect(history).toEqual([]);
    });
  });

  describe('derived stores', () => {
    it('should derive recent exports', () => {
      const entries = Array.from({ length: 15 }, (_, i) => ({
        id: `export_${i}`,
        timestamp: Date.now() - i * 1000,
        format: 'json' as const,
        storyTitle: `Story ${i}`,
        size: 100,
        success: true,
      }));

      exportHistory.set(entries);

      const recent = get(recentExports);
      expect(recent).toHaveLength(10);
      expect(recent[0].id).toBe('export_0');
    });

    it('should derive recent imports', () => {
      const entries = Array.from({ length: 15 }, (_, i) => ({
        id: `import_${i}`,
        timestamp: Date.now() - i * 1000,
        format: 'json' as const,
        storyTitle: `Story ${i}`,
        passageCount: 5,
        success: true,
        filename: `story_${i}.json`,
      }));

      importHistory.set(entries);

      const recent = get(recentImports);
      expect(recent).toHaveLength(10);
      expect(recent[0].id).toBe('import_0');
    });
  });

  describe('exportActions.exportStory', () => {
    let createElementSpy: any;
    let appendChildSpy: any;
    let removeChildSpy: any;

    beforeEach(() => {
      // Mock DOM methods for file download
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };

      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return mockLink as any;
        }
        return {} as any;
      });

      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    });

    afterEach(() => {
      createElementSpy?.mockRestore();
      appendChildSpy?.mockRestore();
      removeChildSpy?.mockRestore();
    });

    it('should export story to JSON', async () => {
      const result = await exportActions.exportStory(testStory, 'json');

      expect(result).toBe(true);
      expect(get(isExporting)).toBe(false);
      expect(get(exportError)).toBeNull();

      const history = get(exportHistory);
      expect(history.length).toBe(1);
      expect(history[0].format).toBe('json');
    });

    it('should export story to HTML', async () => {
      const result = await exportActions.exportStory(testStory, 'html');

      expect(result).toBe(true);
      expect(get(exportError)).toBeNull();

      const history = get(exportHistory);
      expect(history[0].format).toBe('html');
    });

    it('should export story to Markdown', async () => {
      const result = await exportActions.exportStory(testStory, 'markdown');

      expect(result).toBe(true);
      expect(get(exportError)).toBeNull();

      const history = get(exportHistory);
      expect(history[0].format).toBe('markdown');
    });

    it('should use export preferences', async () => {
      exportActions.updatePreferences({
        includeValidation: false,
        prettyPrint: false,
      });

      await exportActions.exportStory(testStory, 'json');

      const prefs = get(exportPreferences);
      expect(prefs.lastFormat).toBe('json');
    });

    it('should update preferences after export', async () => {
      await exportActions.exportStory(testStory, 'html', { theme: 'dark' });

      const prefs = get(exportPreferences);
      expect(prefs.lastFormat).toBe('html');
    });

    it('should handle export errors', async () => {
      // Create invalid story that will fail export
      const badStory = {
        serialize: () => {
          throw new Error('Export error');
        },
        metadata: {
          title: 'Bad Story',
        },
      } as any;

      const result = await exportActions.exportStory(badStory, 'json');

      expect(result).toBe(false);
      expect(get(exportError)).toBe('Export error');

      const history = get(exportHistory);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].success).toBe(false);
      expect(history[0].error).toBe('Export error');
    });

    it('should set isExporting during export', async () => {
      let wasExporting = false;

      const unsubscribe = isExporting.subscribe((value) => {
        if (value) wasExporting = true;
      });

      await exportActions.exportStory(testStory, 'json');

      expect(wasExporting).toBe(true);
      expect(get(isExporting)).toBe(false);

      unsubscribe();
    });
  });

  describe('exportActions.importStory', () => {
    it('should import story from JSON file', async () => {
      // Create mock file with exported story data
      const exportedData = JSON.stringify({
        metadata: {
          exportDate: new Date().toISOString(),
          editorVersion: '1.0.0',
          formatVersion: '1.0.0',
        },
        story: testStory.serialize(),
      });

      // Mock File with text() method
      const mockFile = {
        name: 'test.json',
        text: async () => exportedData,
      } as File;

      const story = await exportActions.importStory(mockFile);

      expect(story).toBeTruthy();
      expect(story?.metadata.title).toBe('Test Story');
      expect(get(importError)).toBeNull();

      const history = get(importHistory);
      expect(history.length).toBe(1);
      expect(history[0].success).toBe(true);
      expect(history[0].filename).toBe('test.json');
    });

    it('should handle import errors', async () => {
      const mockFile = {
        name: 'test.json',
        text: async () => 'invalid json {',
      } as File;

      const story = await exportActions.importStory(mockFile);

      expect(story).toBeNull();
      expect(get(importError)).toBeTruthy();

      const history = get(importHistory);
      expect(history[0].success).toBe(false);
    });

    it('should reject unsupported formats', async () => {
      const mockFile = {
        name: 'test.txt',
        text: async () => 'not a story',
      } as File;

      const story = await exportActions.importStory(mockFile);

      expect(story).toBeNull();
      expect(get(importError)).toContain('Unsupported file format');
    });

    it('should set isImporting during import', async () => {
      let wasImporting = false;

      const unsubscribe = isImporting.subscribe((value) => {
        if (value) wasImporting = true;
      });

      const exportedData = JSON.stringify({
        story: testStory.serialize(),
        metadata: {},
      });

      const mockFile = {
        name: 'test.json',
        text: async () => exportedData,
      } as File;

      await exportActions.importStory(mockFile);

      expect(wasImporting).toBe(true);
      expect(get(isImporting)).toBe(false);

      unsubscribe();
    });
  });
});
