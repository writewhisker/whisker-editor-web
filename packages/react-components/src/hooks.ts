/**
 * React Hooks
 */

import { useState, useCallback, useEffect } from 'react';
import type { Story, Passage } from '@writewhisker/story-models';

/**
 * Story state hook
 */
export function useStory(initialStory: Story) {
  const [story, setStory] = useState<Story>(initialStory);
  const [currentPassage, setCurrentPassage] = useState<string>(initialStory.startPassage || '');
  const [visitedPassages, setVisitedPassages] = useState<string[]>([]);

  const navigateTo = useCallback((passageTitle: string) => {
    setCurrentPassage(passageTitle);
    setVisitedPassages(prev => [...prev, passageTitle]);
  }, []);

  const updatePassage = useCallback((passage: Passage) => {
    setStory(prev => ({
      ...prev,
      passages: prev.passages.map(p => p.id === passage.id ? passage : p),
    }));
  }, []);

  const addPassage = useCallback((passage: Passage) => {
    setStory(prev => ({
      ...prev,
      passages: [...prev.passages, passage],
    }));
  }, []);

  const removePassage = useCallback((passageId: string) => {
    setStory(prev => ({
      ...prev,
      passages: prev.passages.filter(p => p.id !== passageId),
    }));
  }, []);

  const getCurrentPassage = useCallback(() => {
    return story.passages.find(p => p.title === currentPassage) || null;
  }, [story.passages, currentPassage]);

  return {
    story,
    currentPassage,
    visitedPassages,
    navigateTo,
    updatePassage,
    addPassage,
    removePassage,
    getCurrentPassage,
  };
}
