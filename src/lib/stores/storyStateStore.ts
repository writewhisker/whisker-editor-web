import { writable, derived, get } from 'svelte/store';
import { Story, Passage, type ProjectData } from '@whisker/core-ts';

/**
 * Core story state store
 * Manages the current story instance
 */
export const currentStory = writable<Story | null>(null);

/**
 * Story state actions
 */
export const storyStateActions = {
  /**
   * Set the current story
   */
  setStory(story: Story | null) {
    currentStory.set(story);
  },

  /**
   * Update the current story
   */
  updateStory(updater: (story: Story | null) => Story | null) {
    currentStory.update(updater);
  },

  /**
   * Get the current story (synchronous)
   */
  getStory(): Story | null {
    return get(currentStory);
  },

  /**
   * Clear the current story
   */
  clearStory() {
    currentStory.set(null);
  },

  /**
   * Create a new story
   */
  createStory(title?: string): Story {
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
    return story;
  },

  /**
   * Load a story from project data
   */
  loadStory(data: ProjectData): Story {
    const story = Story.deserializeProject(data);
    currentStory.set(story);
    return story;
  },

  /**
   * Serialize the current story
   */
  serializeStory(): ProjectData | null {
    const story = get(currentStory);
    if (!story) return null;
    story.updateModified();
    return story.serializeProject();
  },
};

/**
 * Derived stores
 */

// List of all passages
export const passageList = derived(currentStory, $story => {
  if (!$story) return [];
  return Array.from($story.passages.values());
});

// List of all variables
export const variableList = derived(currentStory, $story => {
  if (!$story) return [];
  return Array.from($story.variables.values());
});

// Count of passages
export const passageCount = derived(currentStory, $story => {
  if (!$story) return 0;
  return $story.passages.size;
});

// Story metadata
export const storyMetadata = derived(currentStory, $story => {
  if (!$story) return null;
  return $story.metadata;
});
