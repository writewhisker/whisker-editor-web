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
    setStory(prev => {
      prev.passages.set(passage.id, passage);
      prev.updateModified();
      return prev;
    });
  }, []);

  const addPassage = useCallback((passage: Passage) => {
    setStory(prev => {
      prev.addPassage(passage);
      prev.updateModified();
      return prev;
    });
  }, []);

  const removePassage = useCallback((passageId: string) => {
    setStory(prev => {
      prev.removePassage(passageId);
      prev.updateModified();
      return prev;
    });
  }, []);

  const getCurrentPassage = useCallback(() => {
    return story.findPassage((p) => p.title === currentPassage) || null;
  }, [story, currentPassage]);

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
