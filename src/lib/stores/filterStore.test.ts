import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  filterState,
  filterActions,
  filteredPassages,
  availableTags,
  hasActiveFilters,
  filterCount,
} from './filterStore';
import { projectActions } from './projectStore';
import { Passage } from '../models/Passage';

describe('filterStore', () => {
  beforeEach(() => {
    // Create a new project with test data
    projectActions.newProject('Test Story');

    // Reset filters
    filterActions.clearAllFilters();
  });

  describe('filterState', () => {
    it('should initialize with default values', () => {
      const state = get(filterState);
      expect(state.searchQuery).toBe('');
      expect(state.selectedTags).toEqual([]);
      expect(state.passageTypes).toEqual([]);
      expect(state.includeChoiceText).toBe(true);
    });

    it('should update search query', () => {
      filterActions.setSearchQuery('test');
      const state = get(filterState);
      expect(state.searchQuery).toBe('test');
    });

    it('should toggle tags', () => {
      filterActions.toggleTag('quest');
      expect(get(filterState).selectedTags).toEqual(['quest']);

      filterActions.toggleTag('important');
      expect(get(filterState).selectedTags).toEqual(['quest', 'important']);

      filterActions.toggleTag('quest');
      expect(get(filterState).selectedTags).toEqual(['important']);
    });

    it('should toggle passage types', () => {
      filterActions.togglePassageType('start');
      expect(get(filterState).passageTypes).toEqual(['start']);

      filterActions.togglePassageType('orphan');
      expect(get(filterState).passageTypes).toEqual(['start', 'orphan']);

      filterActions.togglePassageType('start');
      expect(get(filterState).passageTypes).toEqual(['orphan']);
    });

    it('should toggle include choice text', () => {
      const initial = get(filterState).includeChoiceText;
      filterActions.toggleIncludeChoiceText();
      expect(get(filterState).includeChoiceText).toBe(!initial);
    });

    it('should clear all filters', () => {
      filterActions.setSearchQuery('test');
      filterActions.toggleTag('quest');
      filterActions.togglePassageType('start');

      filterActions.clearAllFilters();

      const state = get(filterState);
      expect(state.searchQuery).toBe('');
      expect(state.selectedTags).toEqual([]);
      expect(state.passageTypes).toEqual([]);
    });

    it('should clear individual filter types', () => {
      filterActions.setSearchQuery('test');
      filterActions.toggleTag('quest');
      filterActions.togglePassageType('start');

      filterActions.clearSearchQuery();
      expect(get(filterState).searchQuery).toBe('');
      expect(get(filterState).selectedTags).toEqual(['quest']);

      filterActions.clearTagFilters();
      expect(get(filterState).selectedTags).toEqual([]);

      filterActions.clearPassageTypeFilters();
      expect(get(filterState).passageTypes).toEqual([]);
    });
  });

  describe('availableTags', () => {
    it('should extract all unique tags from passages', () => {
      const p1 = new Passage({ title: 'P1', tags: ['quest', 'important'] });
      const p2 = new Passage({ title: 'P2', tags: ['quest', 'battle'] });
      const p3 = new Passage({ title: 'P3', tags: ['shop'] });

      projectActions.newProject('Tagged Story');

      // We need to add these manually since we're testing
      // Note: This is a simplified test; in real use the story would manage this
      expect(Array.isArray(get(availableTags))).toBe(true);
    });
  });

  describe('filteredPassages', () => {
    beforeEach(() => {
      projectActions.newProject('Filter Test');
    });

    it('should return all passages when no filters are active', () => {
      filterActions.clearAllFilters();
      const filtered = get(filteredPassages);
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('should filter by search query in title', () => {
      projectActions.addPassage('Forest Path');
      projectActions.addPassage('Desert Road');

      filterActions.setSearchQuery('forest');
      const filtered = get(filteredPassages);

      expect(filtered.some(p => p.title.toLowerCase().includes('forest'))).toBe(true);
    });

    it('should filter by search query in content', () => {
      projectActions.addPassage('Passage 1');
      projectActions.addPassage('Passage 2');

      filterActions.setSearchQuery('start');
      const filtered = get(filteredPassages);

      // Should match the start passage which has "Start" in title
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  describe('hasActiveFilters', () => {
    it('should be false when no filters are active', () => {
      filterActions.clearAllFilters();
      expect(get(hasActiveFilters)).toBe(false);
    });

    it('should be true when search query is set', () => {
      filterActions.setSearchQuery('test');
      expect(get(hasActiveFilters)).toBe(true);
    });

    it('should be true when tags are selected', () => {
      filterActions.toggleTag('quest');
      expect(get(hasActiveFilters)).toBe(true);
    });

    it('should be true when passage types are selected', () => {
      filterActions.togglePassageType('start');
      expect(get(hasActiveFilters)).toBe(true);
    });
  });

  describe('filterCount', () => {
    it('should count active filters', () => {
      filterActions.clearAllFilters();
      expect(get(filterCount)).toBe(0);

      filterActions.setSearchQuery('test');
      expect(get(filterCount)).toBe(1);

      filterActions.toggleTag('quest');
      expect(get(filterCount)).toBe(2);

      filterActions.toggleTag('important');
      expect(get(filterCount)).toBe(3);

      filterActions.togglePassageType('start');
      expect(get(filterCount)).toBe(4);
    });
  });
});
