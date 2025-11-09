import { get } from 'svelte/store';
import { currentStory } from './storyStateStore';
import { selectedPassageId, selectionActions } from './selectionStore';
import { Passage } from '@whisker/core-ts';
import { removeConnectionsToPassage } from '../utils/connectionValidator';

/**
 * Passage operations store
 * Handles all CRUD operations for passages
 */
export const passageOperations = {
  /**
   * Add a new passage to the story
   */
  addPassage(title?: string): Passage | null {
    let addedPassage: Passage | null = null;

    currentStory.update(story => {
      if (!story) return story;

      // Check for duplicate titles
      const requestedTitle = title || 'Untitled Passage';
      const existingPassage = Array.from(story.passages.values()).find(
        (p: Passage) => p.title.toLowerCase() === requestedTitle.toLowerCase()
      );

      let finalTitle = requestedTitle;
      if (existingPassage) {
        console.warn(`Warning: A passage with the title "${requestedTitle}" already exists. Creating with modified title.`);
        // Auto-append number to make it unique
        let counter = 2;
        let uniqueTitle = `${requestedTitle} ${counter}`;
        while (Array.from(story.passages.values()).some((p: Passage) => p.title.toLowerCase() === uniqueTitle.toLowerCase())) {
          counter++;
          uniqueTitle = `${requestedTitle} ${counter}`;
        }
        finalTitle = uniqueTitle;
      }

      const passage = new Passage({
        title: finalTitle,
        content: '',
        position: { x: 0, y: 0 },
      });

      story.addPassage(passage);
      addedPassage = passage;

      return story;
    });

    // Select the newly added passage
    if (addedPassage) {
      selectionActions.selectPassage(addedPassage.id);
    }

    return addedPassage;
  },

  /**
   * Update a passage with partial updates
   */
  updatePassage(
    passageId: string,
    updates: Partial<{
      title: string;
      content: string;
      tags: string[];
      position: { x: number; y: number };
      color?: string;
      notes?: string;
    }>
  ): boolean {
    let changeMade = false;

    currentStory.update(story => {
      if (!story) return story;

      const passage = story.getPassage(passageId);
      if (!passage) return story;

      // Check for duplicate title if title is being updated
      if (updates.title !== undefined && updates.title !== passage.title) {
        const existingPassage = Array.from(story.passages.values()).find(
          (p: Passage) => p.id !== passageId && p.title.toLowerCase() === updates.title!.toLowerCase()
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
        if (updates.color !== undefined) passage.color = updates.color;
        if (updates.notes !== undefined) passage.notes = updates.notes;

        // Update modified timestamp
        passage.modified = new Date().toISOString();
        changeMade = true;
      }

      return story;
    });

    return changeMade;
  },

  /**
   * Delete a passage from the story
   */
  deletePassage(passageId: string): number {
    let removedConnections = 0;

    currentStory.update(story => {
      if (!story) return story;

      // Clean up all connections to this passage before deleting
      removedConnections = removeConnectionsToPassage(story, passageId);

      // Log cleanup summary if connections were removed
      if (removedConnections > 0) {
        console.log(
          `Auto-cleanup: Removed ${removedConnections} connection(s) to passage "${story.getPassage(passageId)?.title || passageId}"`
        );
      }

      story.removePassage(passageId);

      return story;
    });

    // Clear selection if deleted passage was selected
    const currentSelection = get(selectedPassageId);
    if (currentSelection === passageId) {
      selectionActions.clearSelection();
    }

    return removedConnections;
  },

  /**
   * Duplicate a passage
   */
  duplicatePassage(passageId: string): Passage | null {
    let duplicatedPassage: Passage | null = null;

    currentStory.update(story => {
      if (!story) return story;

      const passage = story.getPassage(passageId);
      if (!passage) return story;

      // Clone the passage (which automatically offsets position and adds " (Copy)" to title)
      const duplicate = passage.clone();

      // Check for duplicate titles and make unique if necessary
      let finalTitle = duplicate.title;
      let counter = 2;
      while (Array.from(story.passages.values()).some((p: Passage) => p.title.toLowerCase() === finalTitle.toLowerCase())) {
        finalTitle = `${passage.title} (Copy ${counter})`;
        counter++;
      }
      duplicate.title = finalTitle;

      story.addPassage(duplicate);
      duplicatedPassage = duplicate;

      return story;
    });

    // Select the duplicated passage
    if (duplicatedPassage) {
      selectionActions.selectPassage(duplicatedPassage.id);
    }

    return duplicatedPassage;
  },

  /**
   * Get a passage by ID
   */
  getPassage(passageId: string): Passage | null {
    const story = get(currentStory);
    if (!story) return null;
    return story.getPassage(passageId) || null;
  },

  /**
   * Check if a passage exists
   */
  hasPassage(passageId: string): boolean {
    const story = get(currentStory);
    if (!story) return false;
    return story.getPassage(passageId) !== null;
  },

  /**
   * Get all passages
   */
  getAllPassages(): Passage[] {
    const story = get(currentStory);
    if (!story) return [];
    return Array.from(story.passages.values());
  },
};
