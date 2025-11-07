import { writable, get } from 'svelte/store';

/**
 * Project metadata store
 * Manages file path and unsaved changes state
 */
export const currentFilePath = writable<string | null>(null);
export const unsavedChanges = writable<boolean>(false);

/**
 * Project metadata actions
 */
export const projectMetadataActions = {
  /**
   * Set the current file path
   */
  setFilePath(path: string | null) {
    currentFilePath.set(path);
  },

  /**
   * Get the current file path
   */
  getFilePath(): string | null {
    return get(currentFilePath);
  },

  /**
   * Clear the file path
   */
  clearFilePath() {
    currentFilePath.set(null);
  },

  /**
   * Mark the project as having unsaved changes
   */
  markChanged() {
    unsavedChanges.set(true);
  },

  /**
   * Mark the project as saved (no unsaved changes)
   */
  markSaved() {
    unsavedChanges.set(false);
  },

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return get(unsavedChanges);
  },

  /**
   * Clear all metadata
   */
  clearMetadata() {
    currentFilePath.set(null);
    unsavedChanges.set(false);
  },
};
