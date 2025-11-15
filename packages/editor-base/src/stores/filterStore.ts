import { writable, derived, get } from 'svelte/store';
import { currentStory, passageList } from './storyStateStore';
import { passageOrderState, sortPassages } from './passageOrderStore';
import type { Passage } from '@writewhisker/core-ts';
import type { Story } from '@writewhisker/core-ts';
import { commentsByPassage } from './commentStore';

export type PassageTypeFilter = 'start' | 'orphan' | 'dead' | 'normal' | 'with-comments';

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

// ===== PERFORMANCE OPTIMIZATION: Memoized Passage Metadata =====
// Pre-compute expensive passage classifications (start, orphan, dead-end)
// Only recalculate when the story structure changes, not on every filter update

interface PassageMetadata {
  isStart: boolean;
  isOrphan: boolean;
  isDeadEnd: boolean;
  isNormal: boolean;
}

// Cache for passage metadata - maps passage ID to metadata
let metadataCache = new Map<string, PassageMetadata>();
let lastStoryVersion: Story | null = null;

/**
 * Build reverse index of which passages are targeted by choices
 * This allows O(1) orphan detection instead of O(n²)
 */
function buildTargetedPassagesIndex(story: Story): Set<string> {
  const targeted = new Set<string>();
  for (const passage of story.passages.values()) {
    for (const choice of passage.choices) {
      targeted.add(choice.target);
    }
  }
  return targeted;
}

/**
 * Pre-compute all passage metadata when story changes
 * This converts O(n²) operations into O(n) with caching
 */
function computePassageMetadata(story: Story): Map<string, PassageMetadata> {
  const cache = new Map<string, PassageMetadata>();
  const targeted = buildTargetedPassagesIndex(story);

  for (const passage of story.passages.values()) {
    const isStart = story.startPassage === passage.id;
    const isDeadEnd = passage.choices.length === 0;
    const isOrphan = !isStart && !targeted.has(passage.id);
    const isNormal = !isStart && !isOrphan && !isDeadEnd;

    cache.set(passage.id, { isStart, isOrphan, isDeadEnd, isNormal });
  }

  return cache;
}

/**
 * Get cached metadata for a passage, recomputing if story changed
 */
function getPassageMetadata(passage: Passage, story: Story | null): PassageMetadata {
  // Invalidate cache if story reference changed
  if (story !== lastStoryVersion) {
    if (story) {
      metadataCache = computePassageMetadata(story);
      lastStoryVersion = story;
    } else {
      metadataCache.clear();
      lastStoryVersion = null;
    }
  }

  // Return cached metadata or default
  return metadataCache.get(passage.id) || {
    isStart: false,
    isOrphan: false,
    isDeadEnd: false,
    isNormal: true
  };
}

// Helper functions for passage classification (now using cached metadata)
// Exported for use in other components (e.g., PassageList)
export function isStartPassage(passage: Passage, story: Story | null): boolean {
  return getPassageMetadata(passage, story).isStart;
}

export function isOrphanPassage(passage: Passage, story: Story | null): boolean {
  return getPassageMetadata(passage, story).isOrphan;
}

export function isDeadEndPassage(passage: Passage, story: Story | null): boolean {
  return getPassageMetadata(passage, story).isDeadEnd;
}

export function isNormalPassage(passage: Passage, story: Story | null): boolean {
  return getPassageMetadata(passage, story).isNormal;
}

// Check if passage matches passage type filters
function matchesPassageTypeFilter(passage: Passage, types: PassageTypeFilter[], story: Story | null): boolean {
  if (types.length === 0) return true;

  return types.some((type) => {
    switch (type) {
      case 'start':
        return isStartPassage(passage, story);
      case 'orphan':
        return isOrphanPassage(passage, story);
      case 'dead':
        return isDeadEndPassage(passage, story);
      case 'normal':
        return isNormalPassage(passage, story);
      case 'with-comments':
        const comments = get(commentsByPassage).get(passage.id) || [];
        return comments.some(c => !c.resolved);
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
// Now depends on currentStory to enable metadata caching, passageOrderState for sorting, and commentsByPassage for comment filtering
export const filteredPassages = derived(
  [passageList, filterState, currentStory, passageOrderState, commentsByPassage],
  ([$passages, $filter, $story, $orderState, $comments]) => {
    // First, filter the passages
    const filtered = $passages.filter((passage) => {
      // Must match search query
      if (!matchesSearchQuery(passage, $filter.searchQuery, $filter.includeChoiceText)) {
        return false;
      }

      // Must match tag filter
      if (!matchesTagFilter(passage, $filter.selectedTags)) {
        return false;
      }

      // Must match passage type filter (now with cached metadata)
      if (!matchesPassageTypeFilter(passage, $filter.passageTypes, $story)) {
        return false;
      }

      return true;
    });

    // Then, sort the filtered passages
    return sortPassages(filtered, $orderState);
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
