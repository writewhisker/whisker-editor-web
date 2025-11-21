/**
 * Editor State
 *
 * Generic core editor state management for Svelte applications.
 * Handles selection, focus, undo/redo, and general UI state.
 */

import { writable, derived } from 'svelte/store';

// Selection state
export interface SelectionState {
  selectedIds: string[];
  activeId: string | null;
  focusedId: string | null;
}

// History state for undo/redo
export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  data: any;
}

export interface HistoryState {
  past: HistoryEntry[];
  present: HistoryEntry | null;
  future: HistoryEntry[];
}

// View preferences
export interface ViewPreferences {
  zoom: number;
  panX: number;
  panY: number;
  viewMode: string;
  sidebarOpen: boolean;
  panelOpen: boolean;
}

// Filter state
export interface FilterState {
  searchQuery: string;
  tags: string[];
  categories: string[];
  showArchived: boolean;
}

// Storage adapter
export interface EditorStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const defaultStorage: EditorStorage = {
  getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
};

let storage: EditorStorage = defaultStorage;

export function configureEditorStorage(adapter: EditorStorage): void {
  storage = adapter;
}

// Load view preferences
function loadViewPreferences(): ViewPreferences {
  try {
    const saved = storage.getItem('view-preferences');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load view preferences:', error);
  }
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    viewMode: 'graph',
    sidebarOpen: true,
    panelOpen: true,
  };
}

// Selection store
export const selectionState = writable<SelectionState>({
  selectedIds: [],
  activeId: null,
  focusedId: null,
});

// History store
export const historyState = writable<HistoryState>({
  past: [],
  present: null,
  future: [],
});

// View preferences store
export const viewPreferences = writable<ViewPreferences>(loadViewPreferences());

// Filter store
export const filterState = writable<FilterState>({
  searchQuery: '',
  tags: [],
  categories: [],
  showArchived: false,
});

// Derived stores
export const hasSelection = derived(selectionState, $state => $state.selectedIds.length > 0);
export const selectionCount = derived(selectionState, $state => $state.selectedIds.length);
export const canUndo = derived(historyState, $state => $state.past.length > 0);
export const canRedo = derived(historyState, $state => $state.future.length > 0);
export const hasActiveFilters = derived(filterState, $state =>
  $state.searchQuery !== '' || $state.tags.length > 0 || $state.categories.length > 0
);

/**
 * Selection actions
 */
export function selectIds(ids: string[]): void {
  selectionState.update(state => ({
    ...state,
    selectedIds: ids,
    activeId: ids.length > 0 ? ids[ids.length - 1] : null,
  }));
}

export function selectId(id: string): void {
  selectIds([id]);
}

export function toggleSelection(id: string): void {
  selectionState.update(state => {
    const isSelected = state.selectedIds.includes(id);
    if (isSelected) {
      const newIds = state.selectedIds.filter(i => i !== id);
      return {
        ...state,
        selectedIds: newIds,
        activeId: newIds.length > 0 ? newIds[newIds.length - 1] : null,
      };
    } else {
      const newIds = [...state.selectedIds, id];
      return {
        ...state,
        selectedIds: newIds,
        activeId: id,
      };
    }
  });
}

export function clearSelection(): void {
  selectionState.set({
    selectedIds: [],
    activeId: null,
    focusedId: null,
  });
}

export function setFocusedId(id: string | null): void {
  selectionState.update(state => ({
    ...state,
    focusedId: id,
  }));
}

/**
 * History actions
 */
export function pushHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
  historyState.update(state => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    return {
      past: state.present ? [...state.past, state.present] : state.past,
      present: newEntry,
      future: [], // Clear future on new action
    };
  });
}

export function undo(): HistoryEntry | null {
  let undoneEntry: HistoryEntry | null = null;

  historyState.update(state => {
    if (state.past.length === 0) return state;

    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);

    undoneEntry = state.present;

    return {
      past: newPast,
      present: previous,
      future: state.present ? [state.present, ...state.future] : state.future,
    };
  });

  return undoneEntry;
}

export function redo(): HistoryEntry | null {
  let redoneEntry: HistoryEntry | null = null;

  historyState.update(state => {
    if (state.future.length === 0) return state;

    const next = state.future[0];
    const newFuture = state.future.slice(1);

    redoneEntry = next;

    return {
      past: state.present ? [...state.past, state.present] : state.past,
      present: next,
      future: newFuture,
    };
  });

  return redoneEntry;
}

export function clearHistory(): void {
  historyState.set({
    past: [],
    present: null,
    future: [],
  });
}

/**
 * View preference actions
 */
export function setViewMode(mode: string): void {
  viewPreferences.update(prefs => {
    const newPrefs = { ...prefs, viewMode: mode };
    storage.setItem('view-preferences', JSON.stringify(newPrefs));
    return newPrefs;
  });
}

export function setZoom(zoom: number): void {
  viewPreferences.update(prefs => {
    const newPrefs = { ...prefs, zoom };
    storage.setItem('view-preferences', JSON.stringify(newPrefs));
    return newPrefs;
  });
}

export function setPan(x: number, y: number): void {
  viewPreferences.update(prefs => {
    const newPrefs = { ...prefs, panX: x, panY: y };
    storage.setItem('view-preferences', JSON.stringify(newPrefs));
    return newPrefs;
  });
}

export function toggleSidebar(): void {
  viewPreferences.update(prefs => {
    const newPrefs = { ...prefs, sidebarOpen: !prefs.sidebarOpen };
    storage.setItem('view-preferences', JSON.stringify(newPrefs));
    return newPrefs;
  });
}

export function togglePanel(): void {
  viewPreferences.update(prefs => {
    const newPrefs = { ...prefs, panelOpen: !prefs.panelOpen };
    storage.setItem('view-preferences', JSON.stringify(newPrefs));
    return newPrefs;
  });
}

/**
 * Filter actions
 */
export function setSearchQuery(query: string): void {
  filterState.update(state => ({ ...state, searchQuery: query }));
}

export function setFilterTags(tags: string[]): void {
  filterState.update(state => ({ ...state, tags }));
}

export function setFilterCategories(categories: string[]): void {
  filterState.update(state => ({ ...state, categories }));
}

export function toggleShowArchived(): void {
  filterState.update(state => ({ ...state, showArchived: !state.showArchived }));
}

export function clearFilters(): void {
  filterState.set({
    searchQuery: '',
    tags: [],
    categories: [],
    showArchived: false,
  });
}

// Save view preferences when they change
viewPreferences.subscribe(prefs => {
  storage.setItem('view-preferences', JSON.stringify(prefs));
});
