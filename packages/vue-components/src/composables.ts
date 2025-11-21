/**
 * Vue Composables
 */

import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { Story, Passage } from '@writewhisker/story-models';

/**
 * Story state composable
 */
export function useStory(initialStory: Story) {
  const story = ref<Story>(initialStory) as Ref<Story>;
  const currentPassage = ref<string>(initialStory.startPassage || '');
  const visitedPassages = ref<string[]>([]);

  const getCurrentPassage = computed(() => {
    return story.value.passages.find(p => p.title === currentPassage.value) || null;
  });

  function navigateTo(passageTitle: string) {
    currentPassage.value = passageTitle;
    visitedPassages.value.push(passageTitle);
  }

  function updatePassage(passage: Passage) {
    story.value = {
      ...story.value,
      passages: story.value.passages.map(p => p.id === passage.id ? passage : p),
    };
  }

  function addPassage(passage: Passage) {
    story.value = {
      ...story.value,
      passages: [...story.value.passages, passage],
    };
  }

  function removePassage(passageId: string) {
    story.value = {
      ...story.value,
      passages: story.value.passages.filter(p => p.id !== passageId),
    };
  }

  return {
    story,
    currentPassage,
    visitedPassages,
    getCurrentPassage,
    navigateTo,
    updatePassage,
    addPassage,
    removePassage,
  };
}
