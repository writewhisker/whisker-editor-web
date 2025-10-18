import { writable, derived } from 'svelte/store';
import { Story } from '../models/Story';
import type { ProjectData } from '../models/types';

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
  },
};
