import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  selectionState,
  historyState,
  viewPreferences,
  filterState,
  hasSelection,
  selectionCount,
  canUndo,
  canRedo,
  hasActiveFilters,
  selectId,
  selectIds,
  toggleSelection,
  clearSelection,
  setFocusedId,
  pushHistory,
  undo,
  redo,
  clearHistory,
  setViewMode,
  setZoom,
  setPan,
  toggleSidebar,
  togglePanel,
  setSearchQuery,
  setFilterTags,
  setFilterCategories,
  toggleShowArchived,
  clearFilters,
  configureEditorStorage,
  type EditorStorage,
} from './index';

describe('@writewhisker/editor-state', () => {
  let mockStorage: Map<string, string>;
  let storageAdapter: EditorStorage;

  beforeEach(() => {
    mockStorage = new Map();
    storageAdapter = {
      getItem: (key: string) => mockStorage.get(key) || null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
    };
    configureEditorStorage(storageAdapter);

    // Reset all stores
    clearSelection();
    clearHistory();
    clearFilters();
  });

  describe('selection state', () => {
    it('should initialize with empty selection', () => {
      const state = get(selectionState);
      expect(state.selectedIds).toEqual([]);
      expect(state.activeId).toBeNull();
      expect(state.focusedId).toBeNull();
    });

    it('should select a single ID', () => {
      selectId('test-1');
      const state = get(selectionState);
      expect(state.selectedIds).toEqual(['test-1']);
      expect(state.activeId).toBe('test-1');
    });

    it('should select multiple IDs', () => {
      selectIds(['test-1', 'test-2', 'test-3']);
      const state = get(selectionState);
      expect(state.selectedIds).toEqual(['test-1', 'test-2', 'test-3']);
      expect(state.activeId).toBe('test-3');
    });

    it('should toggle selection', () => {
      selectId('test-1');
      toggleSelection('test-2');
      let state = get(selectionState);
      expect(state.selectedIds).toContain('test-1');
      expect(state.selectedIds).toContain('test-2');

      toggleSelection('test-1');
      state = get(selectionState);
      expect(state.selectedIds).not.toContain('test-1');
      expect(state.selectedIds).toContain('test-2');
    });

    it('should clear selection', () => {
      selectIds(['test-1', 'test-2']);
      clearSelection();
      const state = get(selectionState);
      expect(state.selectedIds).toEqual([]);
      expect(state.activeId).toBeNull();
    });

    it('should set focused ID', () => {
      setFocusedId('test-1');
      const state = get(selectionState);
      expect(state.focusedId).toBe('test-1');
    });

    it('should derive hasSelection correctly', () => {
      expect(get(hasSelection)).toBe(false);
      selectId('test-1');
      expect(get(hasSelection)).toBe(true);
    });

    it('should derive selectionCount correctly', () => {
      expect(get(selectionCount)).toBe(0);
      selectIds(['test-1', 'test-2']);
      expect(get(selectionCount)).toBe(2);
    });
  });

  describe('history state', () => {
    it('should initialize with empty history', () => {
      const state = get(historyState);
      expect(state.past).toEqual([]);
      expect(state.present).toBeNull();
      expect(state.future).toEqual([]);
    });

    it('should push history entry', () => {
      pushHistory({ description: 'Test action', data: { test: true } });
      const state = get(historyState);
      expect(state.present).not.toBeNull();
      expect(state.present?.description).toBe('Test action');
    });

    it('should undo action', () => {
      pushHistory({ description: 'Action 1', data: 1 });
      pushHistory({ description: 'Action 2', data: 2 });

      const undone = undo();
      expect(undone).not.toBeNull();
      expect(undone?.description).toBe('Action 2');

      const state = get(historyState);
      expect(state.present?.description).toBe('Action 1');
      expect(state.future).toHaveLength(1);
    });

    it('should redo action', () => {
      pushHistory({ description: 'Action 1', data: 1 });
      pushHistory({ description: 'Action 2', data: 2 });
      undo();

      const redone = redo();
      expect(redone).not.toBeNull();
      expect(redone?.description).toBe('Action 2');

      const state = get(historyState);
      expect(state.present?.description).toBe('Action 2');
    });

    it('should clear future on new action', () => {
      pushHistory({ description: 'Action 1', data: 1 });
      pushHistory({ description: 'Action 2', data: 2 });
      undo();

      const state1 = get(historyState);
      expect(state1.future).toHaveLength(1);

      pushHistory({ description: 'Action 3', data: 3 });

      const state2 = get(historyState);
      expect(state2.future).toEqual([]);
    });

    it('should derive canUndo correctly', () => {
      expect(get(canUndo)).toBe(false);
      pushHistory({ description: 'Test', data: 1 });
      pushHistory({ description: 'Test 2', data: 2 });
      expect(get(canUndo)).toBe(true);
    });

    it('should derive canRedo correctly', () => {
      expect(get(canRedo)).toBe(false);
      pushHistory({ description: 'Test 1', data: 1 });
      pushHistory({ description: 'Test 2', data: 2 });
      undo();
      expect(get(canRedo)).toBe(true);
    });

    it('should clear history', () => {
      pushHistory({ description: 'Test', data: 1 });
      clearHistory();
      const state = get(historyState);
      expect(state.past).toEqual([]);
      expect(state.present).toBeNull();
      expect(state.future).toEqual([]);
    });
  });

  describe('view preferences', () => {
    it('should initialize with default preferences', () => {
      const prefs = get(viewPreferences);
      expect(prefs.zoom).toBe(1);
      expect(prefs.panX).toBe(0);
      expect(prefs.panY).toBe(0);
      expect(prefs.viewMode).toBe('graph');
      expect(prefs.sidebarOpen).toBe(true);
      expect(prefs.panelOpen).toBe(true);
    });

    it('should set view mode', () => {
      setViewMode('list');
      const prefs = get(viewPreferences);
      expect(prefs.viewMode).toBe('list');
    });

    it('should set zoom', () => {
      setZoom(1.5);
      const prefs = get(viewPreferences);
      expect(prefs.zoom).toBe(1.5);
    });

    it('should set pan', () => {
      setPan(100, 200);
      const prefs = get(viewPreferences);
      expect(prefs.panX).toBe(100);
      expect(prefs.panY).toBe(200);
    });

    it('should toggle sidebar', () => {
      const initial = get(viewPreferences).sidebarOpen;
      toggleSidebar();
      const toggled = get(viewPreferences).sidebarOpen;
      expect(toggled).toBe(!initial);
    });

    it('should toggle panel', () => {
      const initial = get(viewPreferences).panelOpen;
      togglePanel();
      const toggled = get(viewPreferences).panelOpen;
      expect(toggled).toBe(!initial);
    });

    it('should persist preferences to storage', () => {
      setZoom(2.0);
      setViewMode('table');

      const saved = mockStorage.get('view-preferences');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      expect(parsed.zoom).toBe(2.0);
      expect(parsed.viewMode).toBe('table');
    });
  });

  describe('filter state', () => {
    it('should initialize with empty filters', () => {
      const filters = get(filterState);
      expect(filters.searchQuery).toBe('');
      expect(filters.tags).toEqual([]);
      expect(filters.categories).toEqual([]);
      expect(filters.showArchived).toBe(false);
    });

    it('should set search query', () => {
      setSearchQuery('test search');
      const filters = get(filterState);
      expect(filters.searchQuery).toBe('test search');
    });

    it('should set filter tags', () => {
      setFilterTags(['tag1', 'tag2']);
      const filters = get(filterState);
      expect(filters.tags).toEqual(['tag1', 'tag2']);
    });

    it('should set filter categories', () => {
      setFilterCategories(['cat1', 'cat2']);
      const filters = get(filterState);
      expect(filters.categories).toEqual(['cat1', 'cat2']);
    });

    it('should toggle show archived', () => {
      toggleShowArchived();
      expect(get(filterState).showArchived).toBe(true);
      toggleShowArchived();
      expect(get(filterState).showArchived).toBe(false);
    });

    it('should clear all filters', () => {
      setSearchQuery('test');
      setFilterTags(['tag1']);
      setFilterCategories(['cat1']);
      toggleShowArchived();

      clearFilters();

      const filters = get(filterState);
      expect(filters.searchQuery).toBe('');
      expect(filters.tags).toEqual([]);
      expect(filters.categories).toEqual([]);
      expect(filters.showArchived).toBe(false);
    });

    it('should derive hasActiveFilters correctly', () => {
      expect(get(hasActiveFilters)).toBe(false);
      setSearchQuery('test');
      expect(get(hasActiveFilters)).toBe(true);

      clearFilters();
      setFilterTags(['tag1']);
      expect(get(hasActiveFilters)).toBe(true);
    });
  });

  describe('storage configuration', () => {
    it('should use configured storage adapter', () => {
      const customStorage = new Map();
      const adapter: EditorStorage = {
        getItem: (key) => customStorage.get(key) || null,
        setItem: (key, value) => customStorage.set(key, value),
      };

      configureEditorStorage(adapter);
      setZoom(3.0);

      expect(customStorage.has('view-preferences')).toBe(true);
    });
  });
});
