import { writable, derived, get } from 'svelte/store';
import { currentStory } from '@whisker/editor-base/stores';
import type { Passage } from '@whisker/core-ts';

/**
 * Selection state store
 * Manages which passage is currently selected for editing
 */
export const selectedPassageId = writable<string | null>(null);

/**
 * Selection actions
 */
export const selectionActions = {
  /**
   * Select a passage by ID
   */
  selectPassage(passageId: string | null) {
    selectedPassageId.set(passageId);
  },

  /**
   * Clear selection
   */
  clearSelection() {
    selectedPassageId.set(null);
  },

  /**
   * Get the currently selected passage ID
   */
  getSelectedId(): string | null {
    return get(selectedPassageId);
  },

  /**
   * Select the start passage of the current story
   */
  selectStartPassage() {
    const story = get(currentStory);
    if (story && story.startPassage) {
      selectedPassageId.set(story.startPassage);
    }
  },

  /**
   * Select the first passage in the story
   */
  selectFirstPassage() {
    const story = get(currentStory);
    if (story) {
      const firstPassage = Array.from(story.passages.values())[0];
      if (firstPassage) {
        selectedPassageId.set(firstPassage.id);
      }
    }
  },

  /**
   * Check if a passage is selected
   */
  isSelected(passageId: string): boolean {
    return get(selectedPassageId) === passageId;
  },

  /**
   * Clear selection if the selected passage no longer exists
   */
  validateSelection() {
    const story = get(currentStory);
    const currentSelection = get(selectedPassageId);

    if (currentSelection && story && !story.getPassage(currentSelection)) {
      // Selected passage doesn't exist, select first available passage
      const firstPassage = Array.from(story.passages.values())[0];
      if (firstPassage) {
        selectedPassageId.set(firstPassage.id);
      } else {
        selectedPassageId.set(null);
      }
    }
  },
};

/**
 * Derived store for the currently selected passage
 */
export const selectedPassage = derived(
  [currentStory, selectedPassageId],
  ([$story, $selectedId]) => {
    if (!$story || !$selectedId) return null;
    return $story.getPassage($selectedId) || null;
  }
);

/**
 * Derived store that indicates if a passage is selected
 */
export const hasSelection = derived(
  selectedPassageId,
  $selectedId => $selectedId !== null
);
