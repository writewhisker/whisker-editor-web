/**
 * Export Store
 *
 * State management for story export and import functionality.
 */

import { writable, derived, get } from 'svelte/store';
import type { ExportFormat, ExportOptions, ExportHistoryEntry } from '../export/types';
import type { ImportFormat, ImportHistoryEntry } from '../import/types';
import { JSONExporter } from '../export/formats/JSONExporter';
import { HTMLExporter } from '../export/formats/HTMLExporter';
import { MarkdownExporter } from '../export/formats/MarkdownExporter';
import { EPUBExporter } from '../export/formats/EPUBExporter';
import { JSONImporter } from '../import/formats/JSONImporter';
import type { Story } from '../models/Story';

/**
 * Export preferences
 */
interface ExportPreferences {
  lastFormat: ExportFormat;
  lastOptions: Partial<ExportOptions>;
  includeValidation: boolean;
  includeMetrics: boolean;
  includeTestScenarios: boolean;
  prettyPrint: boolean;
  htmlTheme: 'light' | 'dark' | 'auto';
  minifyHTML: boolean;
}

/**
 * Default export preferences
 */
const DEFAULT_PREFERENCES: ExportPreferences = {
  lastFormat: 'json',
  lastOptions: {},
  includeValidation: true,
  includeMetrics: false,
  includeTestScenarios: false,
  prettyPrint: true,
  htmlTheme: 'auto',
  minifyHTML: false,
};

/**
 * Load preferences from localStorage
 */
function loadPreferences(): ExportPreferences {
  try {
    const stored = localStorage.getItem('whisker_export_preferences');
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load export preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save preferences to localStorage
 */
function savePreferences(prefs: ExportPreferences): void {
  try {
    localStorage.setItem('whisker_export_preferences', JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save export preferences:', error);
  }
}

/**
 * Load export history from localStorage
 */
function loadExportHistory(): ExportHistoryEntry[] {
  try {
    const stored = localStorage.getItem('whisker_export_history');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load export history:', error);
  }
  return [];
}

/**
 * Save export history to localStorage
 */
function saveExportHistory(history: ExportHistoryEntry[]): void {
  try {
    // Keep only last 50 entries
    const trimmed = history.slice(0, 50);
    localStorage.setItem('whisker_export_history', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save export history:', error);
  }
}

/**
 * Load import history from localStorage
 */
function loadImportHistory(): ImportHistoryEntry[] {
  try {
    const stored = localStorage.getItem('whisker_import_history');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load import history:', error);
  }
  return [];
}

/**
 * Save import history to localStorage
 */
function saveImportHistory(history: ImportHistoryEntry[]): void {
  try {
    // Keep only last 50 entries
    const trimmed = history.slice(0, 50);
    localStorage.setItem('whisker_import_history', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save import history:', error);
  }
}

// Stores
export const exportPreferences = writable<ExportPreferences>(loadPreferences());
export const exportHistory = writable<ExportHistoryEntry[]>(loadExportHistory());
export const importHistory = writable<ImportHistoryEntry[]>(loadImportHistory());
export const isExporting = writable<boolean>(false);
export const isImporting = writable<boolean>(false);
export const exportError = writable<string | null>(null);
export const importError = writable<string | null>(null);

// Persist preferences when changed
exportPreferences.subscribe(savePreferences);
exportHistory.subscribe(saveExportHistory);
importHistory.subscribe(saveImportHistory);

// Derived stores
export const recentExports = derived(exportHistory, ($history) => {
  return $history.slice(0, 10);
});

export const recentImports = derived(importHistory, ($history) => {
  return $history.slice(0, 10);
});

/**
 * Export actions
 */
export const exportActions = {
  /**
   * Export story to specified format
   */
  async exportStory(
    story: Story,
    format: ExportFormat,
    options: Partial<ExportOptions> = {}
  ): Promise<boolean> {
    isExporting.set(true);
    exportError.set(null);

    try {
      const prefs = get(exportPreferences);

      // Build full export options
      const fullOptions: ExportOptions = {
        format,
        includeValidation: options.includeValidation ?? prefs.includeValidation,
        includeMetrics: options.includeMetrics ?? prefs.includeMetrics,
        includeTestScenarios: options.includeTestScenarios ?? prefs.includeTestScenarios,
        prettyPrint: options.prettyPrint ?? prefs.prettyPrint,
        theme: options.theme ?? prefs.htmlTheme,
        minifyHTML: options.minifyHTML ?? prefs.minifyHTML,
        ...options,
      };

      // Get appropriate exporter
      let exporter;
      switch (format) {
        case 'json':
          exporter = new JSONExporter();
          break;
        case 'html':
          exporter = new HTMLExporter();
          break;
        case 'markdown':
          exporter = new MarkdownExporter();
          break;
        case 'epub':
          exporter = new EPUBExporter();
          break;
        default:
          throw new Error(`Unknown export format: ${format}`);
      }

      // Export story
      const result = await exporter.export({
        story,
        options: fullOptions,
      });

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      // Download file
      const content = result.content;
      let blob: Blob;

      if (content instanceof Blob) {
        blob = content;
      } else {
        blob = new Blob([content as string], { type: result.mimeType });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Use custom filename from options if provided, otherwise use result.filename or fallback
      a.download = options.filename || result.filename || 'story.export';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Add to history
      const historyEntry: ExportHistoryEntry = {
        id: `export_${Date.now()}`,
        timestamp: Date.now(),
        format,
        storyTitle: story.metadata.title,
        size: result.size || 0,
        success: true,
      };
      exportHistory.update((h) => [historyEntry, ...h]);

      // Update preferences
      exportPreferences.update((p) => ({
        ...p,
        lastFormat: format,
        lastOptions: fullOptions,
      }));

      isExporting.set(false);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      exportError.set(message);
      console.error('Export failed:', error);

      // Add failed entry to history
      const historyEntry: ExportHistoryEntry = {
        id: `export_${Date.now()}`,
        timestamp: Date.now(),
        format,
        storyTitle: story.metadata?.title || 'Unknown',
        size: 0,
        success: false,
        error: message,
      };
      exportHistory.update((h) => [historyEntry, ...h]);

      isExporting.set(false);
      return false;
    }
  },

  /**
   * Import story from file
   */
  async importStory(file: File): Promise<Story | null> {
    isImporting.set(true);
    importError.set(null);

    try {
      // Read file
      const content = await file.text();

      // Try JSON importer first
      const importer = new JSONImporter();

      if (!importer.canImport(content)) {
        throw new Error('Unsupported file format');
      }

      // Import story
      const result = await importer.import({
        data: content,
        options: {},
        filename: file.name,
      });

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      // Add to history
      const historyEntry: ImportHistoryEntry = {
        id: `import_${Date.now()}`,
        timestamp: Date.now(),
        format: 'json',
        storyTitle: result.story?.metadata.title || 'Unknown',
        passageCount: result.passageCount || 0,
        success: true,
        filename: file.name,
      };
      importHistory.update((h) => [historyEntry, ...h]);

      isImporting.set(false);
      return result.story || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      importError.set(message);
      console.error('Import failed:', error);

      // Add failed entry to history
      const historyEntry: ImportHistoryEntry = {
        id: `import_${Date.now()}`,
        timestamp: Date.now(),
        format: 'json',
        storyTitle: 'Unknown',
        passageCount: 0,
        success: false,
        error: message,
        filename: file.name,
      };
      importHistory.update((h) => [historyEntry, ...h]);

      isImporting.set(false);
      return null;
    }
  },

  /**
   * Update export preferences
   */
  updatePreferences(updates: Partial<ExportPreferences>): void {
    exportPreferences.update((p) => ({ ...p, ...updates }));
  },

  /**
   * Clear export history
   */
  clearExportHistory(): void {
    exportHistory.set([]);
  },

  /**
   * Clear import history
   */
  clearImportHistory(): void {
    importHistory.set([]);
  },

  /**
   * Reset preferences to defaults
   */
  resetPreferences(): void {
    exportPreferences.set(DEFAULT_PREFERENCES);
  },
};
