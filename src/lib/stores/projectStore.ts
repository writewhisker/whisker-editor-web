import { writable, derived, get } from 'svelte/store';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import type { ProjectData } from '../models/types';
import { historyActions } from './historyStore';
import { removeConnectionsToPassage } from '../utils/connectionValidator';

// Current project state
export const currentStory = writable<Story | null>(null);
export const currentFilePath = writable<string | null>(null);
export const unsavedChanges = writable<boolean>(false);

// Selected passage for editing
export const selectedPassageId = writable<string | null>(null);

// Derived stores
export const passageList = derived(currentStory, $story => {
  if (!$story) return [];
  return Array.from($story.passages.values());
});

export const variableList = derived(currentStory, $story => {
  if (!$story) return [];
  return Array.from($story.variables.values());
});

export const selectedPassage = derived(
  [currentStory, selectedPassageId],
  ([$story, $selectedId]) => {
    if (!$story || !$selectedId) return null;
    return $story.getPassage($selectedId) || null;
  }
);

// Project actions
export const projectActions = {
  newProject(title?: string) {
    const story = new Story({
      metadata: {
        title: title || 'Untitled Story',
        author: '',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
    currentStory.set(story);
    currentFilePath.set(null);
    unsavedChanges.set(false);

    // Initialize history with the new story state
    historyActions.setPresent(story.serialize());

    // Select the start passage
    const startPassage = Array.from(story.passages.values())[0];
    if (startPassage) {
      selectedPassageId.set(startPassage.id);
    }
  },

  loadProject(data: ProjectData, filePath?: string) {
    const story = Story.deserializeProject(data);
    currentStory.set(story);
    currentFilePath.set(filePath || null);
    unsavedChanges.set(false);

    // Initialize history with the loaded story state
    historyActions.setPresent(story.serialize());

    // Select start passage
    if (story.startPassage) {
      selectedPassageId.set(story.startPassage);
    }
  },

  saveProject(): ProjectData | null {
    let data: ProjectData | null = null;
    currentStory.update(story => {
      if (story) {
        story.updateModified();
        data = story.serializeProject();
        unsavedChanges.set(false);
      }
      return story;
    });
    return data;
  },

  markChanged() {
    unsavedChanges.set(true);
  },

  closeProject() {
    currentStory.set(null);
    currentFilePath.set(null);
    unsavedChanges.set(false);
    selectedPassageId.set(null);
    historyActions.clear();
  },

  // Passage operations
  addPassage(title?: string): Passage | null {
    let addedPassage: Passage | null = null;
    currentStory.update(story => {
      if (!story) return story;

      // Check for duplicate titles
      const requestedTitle = title || 'New Passage';
      const existingPassage = Array.from(story.passages.values()).find(
        p => p.title.toLowerCase() === requestedTitle.toLowerCase()
      );

      if (existingPassage) {
        console.warn(`Warning: A passage with the title "${requestedTitle}" already exists. Creating with modified title.`);
        // Auto-append number to make it unique
        let counter = 2;
        let uniqueTitle = `${requestedTitle} ${counter}`;
        while (Array.from(story.passages.values()).some(p => p.title.toLowerCase() === uniqueTitle.toLowerCase())) {
          counter++;
          uniqueTitle = `${requestedTitle} ${counter}`;
        }
        title = uniqueTitle;
      }

      const passage = new Passage({
        title: title || 'New Passage',
        content: '',
        position: { x: 0, y: 0 },
      });

      story.addPassage(passage);
      selectedPassageId.set(passage.id);
      unsavedChanges.set(true);
      addedPassage = passage;

      return story;
    });

    // Save new state to history AFTER making changes
    const newState = get(currentStory);
    if (newState) {
      historyActions.pushState(newState.serialize());
    }

    return addedPassage;
  },

  updatePassage(passageId: string, updates: Partial<{ title: string; content: string; tags: string[]; position: { x: number; y: number }; color?: string }>) {
    currentStory.update(story => {
      if (!story) return story;

      const passage = story.getPassage(passageId);
      if (!passage) return story;

      // Check for duplicate title if title is being updated
      if (updates.title !== undefined && updates.title !== passage.title) {
        const existingPassage = Array.from(story.passages.values()).find(
          p => p.id !== passageId && p.title.toLowerCase() === updates.title!.toLowerCase()
        );

        if (existingPassage) {
          console.warn(`Warning: Cannot rename to "${updates.title}" - a passage with that title already exists.`);
          // Don't apply the title update
          delete updates.title;
          // Still apply other updates
          if (Object.keys(updates).length === 0) {
            return story;
          }
        }
      }

      // Apply updates only if there are updates to apply
      if (Object.keys(updates).length > 0) {
        // Apply updates
        if (updates.title !== undefined) passage.title = updates.title;
        if (updates.content !== undefined) passage.content = updates.content;
        if (updates.tags !== undefined) passage.tags = updates.tags;
        if (updates.position !== undefined) passage.position = updates.position;

        // Update modified timestamp
        passage.modified = new Date().toISOString();

        unsavedChanges.set(true);
      }

      return story;
    });

    // Save new state to history AFTER making changes
    const newState = get(currentStory);
    if (newState) {
      historyActions.pushState(newState.serialize());
    }
  },

  deletePassage(passageId: string) {
    currentStory.update(story => {
      if (!story) return story;

      // Clean up all connections to this passage before deleting
      const removedConnections = removeConnectionsToPassage(story, passageId);

      // Log cleanup summary if connections were removed
      if (removedConnections > 0) {
        console.log(`Auto-cleanup: Removed ${removedConnections} connection(s) to passage "${story.getPassage(passageId)?.title || passageId}"`);
      }

      story.removePassage(passageId);

      // Clear selection if deleted passage was selected
      selectedPassageId.update(id => id === passageId ? null : id);
      unsavedChanges.set(true);

      return story;
    });

    // Save new state to history AFTER making changes
    const newState = get(currentStory);
    if (newState) {
      historyActions.pushState(newState.serialize());
    }
  },

  // Undo/Redo
  undo() {
    const previousState = historyActions.undo();
    if (previousState) {
      const story = Story.deserialize(previousState);
      currentStory.set(story);
      unsavedChanges.set(true);
    }
  },

  redo() {
    const nextState = historyActions.redo();
    if (nextState) {
      const story = Story.deserialize(nextState);
      currentStory.set(story);
      unsavedChanges.set(true);
    }
  },
};
