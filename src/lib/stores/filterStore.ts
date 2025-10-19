import { writable, derived } from 'svelte/store';
import { currentStory, passageList } from './projectStore';
import type { Passage } from '../models/Passage';
import { get } from 'svelte/store';

export type PassageTypeFilter = 'start' | 'orphan' | 'dead' | 'normal';

export interface FilterState {
  searchQuery: string;
  selectedTags: string[];
  passageTypes: PassageTypeFilter[];
  includeChoiceText: boolean;
}

// Filter state
export const filterState = writable<FilterState>({
  searchQuery: '',
  selectedTags: [],
  passageTypes: [],
  includeChoiceText: true,
});

// Available tags (derived from all passages)
export const availableTags = derived(passageList, ($passages) => {
  const tagSet = new Set<string>();
  $passages.forEach((passage) => {
    passage.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
});

// Helper functions for passage classification
function isStartPassage(passage: Passage): boolean {
  const story = get(currentStory);
  return story?.startPassage === passage.id;
}

function isOrphanPassage(passage: Passage): boolean {
  const story = get(currentStory);
  if (!story || isStartPassage(passage)) return false;

  // Check if any other passage has a choice pointing to this one
  return !Array.from(story.passages.values()).some((p) =>
    p.choices.some((c) => c.target === passage.id)
  );
}

function isDeadEndPassage(passage: Passage): boolean {
  return passage.choices.length === 0;
}

function isNormalPassage(passage: Passage): boolean {
  return !isStartPassage(passage) && !isOrphanPassage(passage) && !isDeadEndPassage(passage);
}

// Check if passage matches passage type filters
function matchesPassageTypeFilter(passage: Passage, types: PassageTypeFilter[]): boolean {
  if (types.length === 0) return true;

  return types.some((type) => {
    switch (type) {
      case 'start':
        return isStartPassage(passage);
      case 'orphan':
        return isOrphanPassage(passage);
      case 'dead':
        return isDeadEndPassage(passage);
      case 'normal':
        return isNormalPassage(passage);
      default:
        return false;
    }
  });
}

// Check if passage matches tag filters
function matchesTagFilter(passage: Passage, selectedTags: string[]): boolean {
  if (selectedTags.length === 0) return true;

  // Passage must have at least one of the selected tags
  return selectedTags.some((tag) => passage.tags.includes(tag));
}

// Check if passage matches search query
function matchesSearchQuery(passage: Passage, query: string, includeChoices: boolean): boolean {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();

  // Search in title
  if (passage.title.toLowerCase().includes(lowerQuery)) return true;

  // Search in content
  if (passage.content.toLowerCase().includes(lowerQuery)) return true;

  // Search in tags
  if (passage.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))) return true;

  // Search in choice text
  if (includeChoices) {
    if (passage.choices.some((choice) => choice.text.toLowerCase().includes(lowerQuery))) {
      return true;
    }
  }

  return false;
}

// Filtered passages (main derived store)
export const filteredPassages = derived(
  [passageList, filterState],
  ([$passages, $filter]) => {
    return $passages.filter((passage) => {
      // Must match search query
      if (!matchesSearchQuery(passage, $filter.searchQuery, $filter.includeChoiceText)) {
        return false;
      }

      // Must match tag filter
      if (!matchesTagFilter(passage, $filter.selectedTags)) {
        return false;
      }

      // Must match passage type filter
      if (!matchesPassageTypeFilter(passage, $filter.passageTypes)) {
        return false;
      }

      return true;
    });
  }
);

// Filter actions
export const filterActions = {
  setSearchQuery(query: string) {
    filterState.update((state) => ({
      ...state,
      searchQuery: query,
    }));
  },

  toggleTag(tag: string) {
    filterState.update((state) => {
      const selectedTags = state.selectedTags.includes(tag)
        ? state.selectedTags.filter((t) => t !== tag)
        : [...state.selectedTags, tag];
      return { ...state, selectedTags };
    });
  },

  togglePassageType(type: PassageTypeFilter) {
    filterState.update((state) => {
      const passageTypes = state.passageTypes.includes(type)
        ? state.passageTypes.filter((t) => t !== type)
        : [...state.passageTypes, type];
      return { ...state, passageTypes };
    });
  },

  toggleIncludeChoiceText() {
    filterState.update((state) => ({
      ...state,
      includeChoiceText: !state.includeChoiceText,
    }));
  },

  clearAllFilters() {
    filterState.set({
      searchQuery: '',
      selectedTags: [],
      passageTypes: [],
      includeChoiceText: true,
    });
  },

  clearSearchQuery() {
    filterState.update((state) => ({
      ...state,
      searchQuery: '',
    }));
  },

  clearTagFilters() {
    filterState.update((state) => ({
      ...state,
      selectedTags: [],
    }));
  },

  clearPassageTypeFilters() {
    filterState.update((state) => ({
      ...state,
      passageTypes: [],
    }));
  },
};

// Helper computed values
export const hasActiveFilters = derived(filterState, ($filter) => {
  return (
    $filter.searchQuery !== '' ||
    $filter.selectedTags.length > 0 ||
    $filter.passageTypes.length > 0
  );
});

export const filterCount = derived(filterState, ($filter) => {
  let count = 0;
  if ($filter.searchQuery) count++;
  count += $filter.selectedTags.length;
  count += $filter.passageTypes.length;
  return count;
});
