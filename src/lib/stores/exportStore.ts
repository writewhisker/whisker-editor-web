/**
 * Export Store
 *
 * State management for story export and import functionality.
 *
 * Phase 4 refactoring: Uses PreferenceService for storage adapter integration
 */

import { writable, derived, get } from 'svelte/store';
import type { ExportFormat, ExportOptions, ExportHistoryEntry } from '../export/types';
import type { ImportFormat, ImportHistoryEntry } from '../import/types';
import { JSONExporter } from '../export/formats/JSONExporter';
import { HTMLExporter } from '../export/formats/HTMLExporter';
import { MarkdownExporter } from '../export/formats/MarkdownExporter';
import { TwineExporter } from '../export/formats/TwineExporter';
import { EPUBExporter } from '../export/formats/EPUBExporter';
import { JSONImporter } from '../import/formats/JSONImporter';
import { TwineImporter } from '../import/formats/TwineImporter';
import type { Story } from '../models/Story';
import { getPreferenceService } from '../services/storage/PreferenceService';

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

// Get preference service instance
const prefService = getPreferenceService();

/**
 * Load preferences (synchronously for initialization)
 */
function loadPreferences(): ExportPreferences {
  // Use sync method for initial load (with localStorage fallback)
  const prefs = prefService.getPreferenceSync<ExportPreferences>(
    'whisker_export_preferences',
    DEFAULT_PREFERENCES
  );
  return { ...DEFAULT_PREFERENCES, ...prefs };
}

/**
 * Save preferences
 */
function savePreferences(prefs: ExportPreferences): void {
  // Use sync method for backward compatibility
  prefService.setPreferenceSync('whisker_export_preferences', prefs);
}

/**
 * Load export history
 */
function loadExportHistory(): ExportHistoryEntry[] {
  const history = prefService.getPreferenceSync<ExportHistoryEntry[]>(
    'whisker_export_history',
    []
  );
  return history;
}

/**
 * Save export history
 */
function saveExportHistory(history: ExportHistoryEntry[]): void {
  // Keep only last 50 entries
  const trimmed = history.slice(0, 50);
  prefService.setPreferenceSync('whisker_export_history', trimmed);
}

/**
 * Load import history
 */
function loadImportHistory(): ImportHistoryEntry[] {
  const history = prefService.getPreferenceSync<ImportHistoryEntry[]>(
    'whisker_import_history',
    []
  );
  return history;
}

/**
 * Save import history
 */
function saveImportHistory(history: ImportHistoryEntry[]): void {
  // Keep only last 50 entries
  const trimmed = history.slice(0, 50);
  prefService.setPreferenceSync('whisker_import_history', trimmed);
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
        case 'twine':
          exporter = new TwineExporter();
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
   * Import story from file (returns full result with loss reporting)
   */
  async importStoryWithResult(file: File, conversionOptions?: any) {
    isImporting.set(true);
    importError.set(null);

    try {
      // Read file
      const content = await file.text();

      // Try importers in order
      const importers = [
        new JSONImporter(),
        new TwineImporter(),
      ];

      let selectedImporter = null;
      let detectedFormat: ImportFormat = 'json';

      for (const importer of importers) {
        if (importer.canImport(content)) {
          selectedImporter = importer;
          detectedFormat = importer.format;
          break;
        }
      }

      if (!selectedImporter) {
        throw new Error('Unsupported file format - please use JSON or Twine HTML files');
      }

      // Import story (pass conversion options)
      const result = await selectedImporter.import({
        data: content,
        options: {
          conversionOptions,
        },
        filename: file.name,
      });

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      // Note: Don't add to history yet - wait for user confirmation
      isImporting.set(false);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      importError.set(message);
      console.error('Import failed:', error);

      isImporting.set(false);
      return null;
    }
  },

  /**
   * Import story from file (returns story only, for backward compatibility)
   */
  async importStory(file: File): Promise<Story | null> {
    isImporting.set(true);
    importError.set(null);

    try {
      // Read file
      const content = await file.text();

      // Try importers in order
      const importers = [
        new JSONImporter(),
        new TwineImporter(),
      ];

      let selectedImporter = null;
      let detectedFormat: ImportFormat = 'json';

      for (const importer of importers) {
        if (importer.canImport(content)) {
          selectedImporter = importer;
          detectedFormat = importer.format;
          break;
        }
      }

      if (!selectedImporter) {
        throw new Error('Unsupported file format - please use JSON or Twine HTML files');
      }

      // Import story
      const result = await selectedImporter.import({
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
        format: detectedFormat,
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
        format: 'json', // Default to json for failed imports
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
