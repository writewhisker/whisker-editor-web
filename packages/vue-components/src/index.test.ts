/**
 * Vue Components Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStory } from './composables.js';
import type { Story, Passage } from '@writewhisker/story-models';

describe('useStory', () => {
  let mockStory: Story;

  beforeEach(() => {
    mockStory = {
      id: 'story-1',
      name: 'Test Story',
      author: 'Test Author',
      startPassage: 'Start',
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          content: 'Start passage',
          position: { x: 0, y: 0 }
        },
        {
          id: 'passage-2',
          title: 'Second',
          content: 'Second passage',
          position: { x: 100, y: 0 }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  it('should initialize with story and start passage', () => {
    const composable = useStory(mockStory);
    expect(composable.story.value).toEqual(mockStory);
    expect(composable.currentPassage.value).toBe('Start');
    expect(composable.visitedPassages.value).toEqual([]);
  });

  it('should navigate to a passage', () => {
    const composable = useStory(mockStory);
    composable.navigateTo('Second');
    expect(composable.currentPassage.value).toBe('Second');
    expect(composable.visitedPassages.value).toEqual(['Second']);
  });

  it('should track visited passages', () => {
    const composable = useStory(mockStory);
    composable.navigateTo('Second');
    composable.navigateTo('Start');
    composable.navigateTo('Second');
    expect(composable.visitedPassages.value).toEqual(['Second', 'Start', 'Second']);
  });

  it('should get current passage via computed', () => {
    const composable = useStory(mockStory);
    expect(composable.getCurrentPassage.value).toEqual(mockStory.passages[0]);
    composable.navigateTo('Second');
    expect(composable.getCurrentPassage.value).toEqual(mockStory.passages[1]);
  });

  it('should return null for non-existent passage', () => {
    const composable = useStory(mockStory);
    composable.navigateTo('NonExistent');
    expect(composable.getCurrentPassage.value).toBeNull();
  });

  it('should update a passage', () => {
    const composable = useStory(mockStory);
    const updatedPassage: Passage = {
      ...mockStory.passages[0],
      title: 'Updated Title',
      content: 'Updated content'
    };
    composable.updatePassage(updatedPassage);
    expect(composable.story.value.passages[0].title).toBe('Updated Title');
    expect(composable.story.value.passages[0].content).toBe('Updated content');
  });

  it('should not update passage with different id', () => {
    const composable = useStory(mockStory);
    const updatedPassage: Passage = {
      id: 'non-existent',
      title: 'Updated Title',
      content: 'Updated content',
      position: { x: 0, y: 0 }
    };
    composable.updatePassage(updatedPassage);
    expect(composable.story.value.passages[0].title).toBe('Start');
  });

  it('should add a new passage', () => {
    const composable = useStory(mockStory);
    const newPassage: Passage = {
      id: 'passage-3',
      title: 'New Passage',
      content: 'New content',
      position: { x: 200, y: 0 }
    };
    composable.addPassage(newPassage);
    expect(composable.story.value.passages).toHaveLength(3);
    expect(composable.story.value.passages[2]).toEqual(newPassage);
  });

  it('should remove a passage', () => {
    const composable = useStory(mockStory);
    composable.removePassage('passage-2');
    expect(composable.story.value.passages).toHaveLength(1);
    expect(composable.story.value.passages[0].id).toBe('passage-1');
  });

  it('should not remove non-existent passage', () => {
    const composable = useStory(mockStory);
    composable.removePassage('non-existent');
    expect(composable.story.value.passages).toHaveLength(2);
  });

  it('should handle story without start passage', () => {
    const storyNoStart = { ...mockStory, startPassage: '' };
    const composable = useStory(storyNoStart);
    expect(composable.currentPassage.value).toBe('');
  });

  it('should preserve story metadata on passage updates', () => {
    const composable = useStory(mockStory);
    const updatedPassage: Passage = {
      ...mockStory.passages[0],
      title: 'Updated'
    };
    composable.updatePassage(updatedPassage);
    expect(composable.story.value.name).toBe('Test Story');
    expect(composable.story.value.author).toBe('Test Author');
    expect(composable.story.value.startPassage).toBe('Start');
  });

  it('should handle multiple passage additions', () => {
    const composable = useStory(mockStory);
    const newPassage1: Passage = {
      id: 'passage-3',
      title: 'Third',
      content: 'Third passage',
      position: { x: 200, y: 0 }
    };
    const newPassage2: Passage = {
      id: 'passage-4',
      title: 'Fourth',
      content: 'Fourth passage',
      position: { x: 300, y: 0 }
    };
    composable.addPassage(newPassage1);
    composable.addPassage(newPassage2);
    expect(composable.story.value.passages).toHaveLength(4);
  });

  it('should handle multiple passage removals', () => {
    const composable = useStory(mockStory);
    composable.removePassage('passage-1');
    composable.removePassage('passage-2');
    expect(composable.story.value.passages).toHaveLength(0);
  });

  it('should update current passage when passages change', () => {
    const composable = useStory(mockStory);
    composable.navigateTo('Second');
    const updatedPassage: Passage = {
      ...mockStory.passages[1],
      content: 'Updated content'
    };
    composable.updatePassage(updatedPassage);
    expect(composable.getCurrentPassage.value?.content).toBe('Updated content');
  });

  it('should handle navigation to removed passage', () => {
    const composable = useStory(mockStory);
    composable.navigateTo('Second');
    expect(composable.getCurrentPassage.value).toBeDefined();
    composable.removePassage('passage-2');
    expect(composable.getCurrentPassage.value).toBeNull();
  });

  it('should maintain visited passages across operations', () => {
    const composable = useStory(mockStory);
    composable.navigateTo('Second');
    const newPassage: Passage = {
      id: 'passage-3',
      title: 'Third',
      content: 'Third passage',
      position: { x: 200, y: 0 }
    };
    composable.addPassage(newPassage);
    composable.navigateTo('Third');
    expect(composable.visitedPassages.value).toEqual(['Second', 'Third']);
  });

  it('should work with empty passages array', () => {
    const emptyStory: Story = {
      ...mockStory,
      passages: [],
      startPassage: ''
    };
    const composable = useStory(emptyStory);
    expect(composable.story.value.passages).toEqual([]);
    expect(composable.getCurrentPassage.value).toBeNull();
  });

  it('should allow adding first passage to empty story', () => {
    const emptyStory: Story = {
      ...mockStory,
      passages: [],
      startPassage: ''
    };
    const composable = useStory(emptyStory);
    const firstPassage: Passage = {
      id: 'passage-1',
      title: 'First',
      content: 'First passage',
      position: { x: 0, y: 0 }
    };
    composable.addPassage(firstPassage);
    expect(composable.story.value.passages).toHaveLength(1);
    composable.navigateTo('First');
    expect(composable.getCurrentPassage.value).toEqual(firstPassage);
  });

  it('should handle complex story structures', () => {
    const complexStory: Story = {
      ...mockStory,
      passages: [
        { id: '1', title: 'A', content: 'Content A', position: { x: 0, y: 0 } },
        { id: '2', title: 'B', content: 'Content B', position: { x: 100, y: 0 } },
        { id: '3', title: 'C', content: 'Content C', position: { x: 200, y: 0 } },
        { id: '4', title: 'D', content: 'Content D', position: { x: 0, y: 100 } },
        { id: '5', title: 'E', content: 'Content E', position: { x: 100, y: 100 } }
      ],
      startPassage: 'A'
    };
    const composable = useStory(complexStory);
    expect(composable.story.value.passages).toHaveLength(5);
    composable.navigateTo('C');
    composable.navigateTo('E');
    composable.navigateTo('A');
    expect(composable.visitedPassages.value).toEqual(['C', 'E', 'A']);
    expect(composable.getCurrentPassage.value?.title).toBe('A');
  });

  it('should update passages immutably', () => {
    const composable = useStory(mockStory);
    const originalPassages = composable.story.value.passages;
    const updatedPassage: Passage = {
      ...mockStory.passages[0],
      title: 'Updated'
    };
    composable.updatePassage(updatedPassage);
    // Check that a new array was created
    expect(composable.story.value.passages).not.toBe(originalPassages);
  });

  it('should add passages immutably', () => {
    const composable = useStory(mockStory);
    const originalPassages = composable.story.value.passages;
    const newPassage: Passage = {
      id: 'passage-3',
      title: 'New',
      content: 'New content',
      position: { x: 200, y: 0 }
    };
    composable.addPassage(newPassage);
    // Check that a new array was created
    expect(composable.story.value.passages).not.toBe(originalPassages);
  });

  it('should remove passages immutably', () => {
    const composable = useStory(mockStory);
    const originalPassages = composable.story.value.passages;
    composable.removePassage('passage-2');
    // Check that a new array was created
    expect(composable.story.value.passages).not.toBe(originalPassages);
  });
});
