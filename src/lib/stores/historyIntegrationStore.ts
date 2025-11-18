import { get } from 'svelte/store';
import { tick } from 'svelte';
import { Story } from '@writewhisker/core-ts';
import { storyStateActions, currentStory } from '@writewhisker/editor-base/stores';
import { projectMetadataActions } from './projectMetadataStore';
import { selectionActions, selectedPassageId } from './selectionStore';
import { historyActions } from './historyStore';

/**
 * History integration store
 * Integrates undo/redo functionality with story state
 */

// Track if an undo/redo operation is in progress to prevent race conditions
let undoInProgress = false;

export const historyIntegration = {
  /**
   * Push the current state to history
   * Call this after making changes to the story
   */
  pushCurrentState() {
    const story = storyStateActions.getStory();
    if (story) {
      historyActions.pushState(story.serialize());
    }
  },

  /**
   * Undo the last change
   */
  async undo() {
    // Prevent concurrent undo operations
    if (undoInProgress) return;

    undoInProgress = true;
    try {
      const previousState = historyActions.undo();
      if (previousState) {
        const story = Story.deserialize(previousState);

        // Force complete UI refresh by setting to null, waiting for DOM update, then setting new story
        currentStory.set(null);

        // Wait for Svelte component updates + DOM rendering
        await tick();
        await new Promise(resolve => setTimeout(resolve, 75));

        currentStory.set(story);

        // Wait for final UI update
        await tick();

        // Update selection if the currently selected passage no longer exists
        const currentSelection = get(selectedPassageId);
        if (currentSelection && !story.getPassage(currentSelection)) {
          const firstPassage = Array.from(story.passages.values())[0];
          if (firstPassage) {
            selectionActions.selectPassage(firstPassage.id);
          } else {
            selectionActions.clearSelection();
          }
        }

        projectMetadataActions.markChanged();
      }
    } finally {
      undoInProgress = false;
    }
  },

  /**
   * Redo the last undone change
   */
  async redo() {
    const nextState = historyActions.redo();
    if (nextState) {
      const story = Story.deserialize(nextState);

      // Use same pattern as undo for consistency
      currentStory.set(null);
      await tick();
      await new Promise(resolve => setTimeout(resolve, 75));

      currentStory.set(story);
      await tick();

      projectMetadataActions.markChanged();
    }
  },

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return historyActions.canUndo();
  },

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return historyActions.canRedo();
  },

  /**
   * Clear history
   */
  clearHistory() {
    historyActions.clear();
  },

  /**
   * Initialize history with current state
   */
  initializeHistory() {
    const story = storyStateActions.getStory();
    if (story) {
      historyActions.setPresent(story.serialize());
    }
  },
};
