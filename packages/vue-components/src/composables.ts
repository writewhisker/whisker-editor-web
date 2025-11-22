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
    return story.value.findPassage(p => p.title === currentPassage.value) || null;
  });

  function navigateTo(passageTitle: string) {
    currentPassage.value = passageTitle;
    visitedPassages.value.push(passageTitle);
  }

  function updatePassage(passage: Passage) {
    story.value.passages.set(passage.id, passage);
    story.value.updateModified();
  }

  function addPassage(passage: Passage) {
    story.value.addPassage(passage);
  }

  function removePassage(passageId: string) {
    story.value.removePassage(passageId);
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
