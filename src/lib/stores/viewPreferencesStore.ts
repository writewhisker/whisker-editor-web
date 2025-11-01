/**
 * View Preferences Store
 *
 * Manages per-project UI state and preferences.
 *
 * Phase 4 refactoring: Uses PreferenceService for storage adapter integration
 */

import { writable, derived } from 'svelte/store';
import { currentStory } from './projectStore';
import { getPreferenceService } from '../services/storage/PreferenceService';

// Get preference service instance
const prefService = getPreferenceService();

export type ViewMode = 'list' | 'graph' | 'split' | 'preview';
export type LayoutAlgorithm = 'manual' | 'hierarchical' | 'force' | 'circular' | 'grid';

export interface PanelVisibility {
  passageList: boolean;
  properties: boolean;
  variables: boolean;
  validation: boolean;
  statistics: boolean;
  tagManager: boolean;
  snippets: boolean;
  characters: boolean;
  wordGoals: boolean;
  collaboration: boolean;
  pacing: boolean;
  accessibility: boolean;
  playtest: boolean;
  dependencies: boolean;
}

export interface PanelSizes {
  passageListWidth: number;
  propertiesWidth: number;
  variablesWidth: number;
  variablesHeight: number; // For split view
}

export interface GraphLayoutPreferences {
  algorithm: LayoutAlgorithm;
  direction: 'TB' | 'LR';
  autoApply: boolean; // Whether to auto-apply layout when adding nodes
}

export interface ViewPreferences {
  viewMode: ViewMode;
  panelVisibility: PanelVisibility;
  panelSizes: PanelSizes;
  focusMode: boolean;
  graphLayout?: GraphLayoutPreferences;
}

interface ProjectViewPreferences {
  [projectPath: string]: ViewPreferences;
}

// Default preferences
const DEFAULT_PREFERENCES: ViewPreferences = {
  viewMode: 'list',
  panelVisibility: {
    passageList: true,
    properties: true,
    variables: true,
    validation: true,
    statistics: false,
    tagManager: false,
    snippets: false,
    characters: false,
    wordGoals: false,
    collaboration: false,
    pacing: false,
    accessibility: false,
    playtest: false,
    dependencies: false,
  },
  panelSizes: {
    passageListWidth: 256, // 64 * 4 (w-64)
    propertiesWidth: 384, // 96 * 4 (w-96)
    variablesWidth: 320, // 80 * 4 (w-80)
    variablesHeight: 256, // 64 * 4 (h-64)
  },
  focusMode: false,
  graphLayout: {
    algorithm: 'manual',
    direction: 'TB',
    autoApply: false,
  },
};

const STORAGE_KEY = 'whisker-view-preferences';
const GLOBAL_VIEW_MODE_KEY = 'whisker-global-view-mode';
const STORAGE_VERSION_KEY = 'whisker-preferences-version';
const CURRENT_VERSION = '2'; // Increment when schema changes

// Check and migrate storage if needed
function checkStorageVersion(): void {
  const storedVersion = prefService.getPreferenceSync<string>(STORAGE_VERSION_KEY, '');
  if (storedVersion !== CURRENT_VERSION) {
    console.log(`Migrating preferences from version ${storedVersion || 'legacy'} to ${CURRENT_VERSION}`);
    // Clear old preferences when version changes
    prefService.setPreferenceSync(STORAGE_KEY, {});
    prefService.setPreferenceSync(STORAGE_VERSION_KEY, CURRENT_VERSION);
  }
}

// Load preferences
function loadPreferences(): ProjectViewPreferences {
  checkStorageVersion(); // Check version before loading
  return prefService.getPreferenceSync<ProjectViewPreferences>(STORAGE_KEY, {});
}

// Save preferences
function savePreferences(prefs: ProjectViewPreferences): void {
  prefService.setPreferenceSync(STORAGE_KEY, prefs);
}

// Load global default view mode
function loadGlobalViewMode(): ViewMode {
  return prefService.getPreferenceSync<ViewMode>(GLOBAL_VIEW_MODE_KEY, 'list');
}

// Save global default view mode
function saveGlobalViewMode(mode: ViewMode): void {
  prefService.setPreferenceSync(GLOBAL_VIEW_MODE_KEY, mode);
}

// Current project preferences key (based on story title)
export const currentProjectKey = derived(currentStory, $story => {
  return $story ? $story.metadata.title : null;
});

// All project preferences
const allPreferences = writable<ProjectViewPreferences>(loadPreferences());

// Current project preferences
export const currentPreferences = derived(
  [currentProjectKey, allPreferences],
  ([$key, $all]) => {
    if (!$key) return DEFAULT_PREFERENCES;

    try {
      const savedPrefs = $all[$key];
      if (!savedPrefs) {
        return { ...DEFAULT_PREFERENCES, viewMode: loadGlobalViewMode() };
      }

      // Merge saved preferences with defaults to ensure all fields are present
      return {
        viewMode: savedPrefs.viewMode || DEFAULT_PREFERENCES.viewMode,
        panelVisibility: {
          ...DEFAULT_PREFERENCES.panelVisibility,
          ...(savedPrefs.panelVisibility && typeof savedPrefs.panelVisibility === 'object' ? savedPrefs.panelVisibility : {})
        },
        panelSizes: {
          ...DEFAULT_PREFERENCES.panelSizes,
          ...(savedPrefs.panelSizes && typeof savedPrefs.panelSizes === 'object' ? savedPrefs.panelSizes : {})
        },
        focusMode: savedPrefs.focusMode !== undefined ? savedPrefs.focusMode : DEFAULT_PREFERENCES.focusMode,
        graphLayout: {
          ...DEFAULT_PREFERENCES.graphLayout!,
          ...(savedPrefs.graphLayout && typeof savedPrefs.graphLayout === 'object' ? savedPrefs.graphLayout : {})
        },
      };
    } catch (error) {
      console.error('Failed to derive current preferences, using defaults:', error);
      return DEFAULT_PREFERENCES;
    }
  }
);

// Individual preference stores for easy binding
export const viewMode = writable<ViewMode>(loadGlobalViewMode());
export const panelVisibility = writable<PanelVisibility>(DEFAULT_PREFERENCES.panelVisibility);
export const panelSizes = writable<PanelSizes>(DEFAULT_PREFERENCES.panelSizes);
export const focusMode = writable<boolean>(false);
export const graphLayout = writable<GraphLayoutPreferences>(DEFAULT_PREFERENCES.graphLayout!);

// Update current preferences when project changes
currentProjectKey.subscribe($key => {
  if ($key) {
    try {
      const prefs = loadPreferences();
      const savedPrefs = prefs[$key] || { ...DEFAULT_PREFERENCES, viewMode: loadGlobalViewMode() };

      // Safely merge saved preferences with defaults, handling corrupted data
      const projectPrefs = {
        viewMode: savedPrefs.viewMode || DEFAULT_PREFERENCES.viewMode,
        panelVisibility: {
          ...DEFAULT_PREFERENCES.panelVisibility,
          ...(savedPrefs.panelVisibility && typeof savedPrefs.panelVisibility === 'object' ? savedPrefs.panelVisibility : {})
        },
        panelSizes: {
          ...DEFAULT_PREFERENCES.panelSizes,
          ...(savedPrefs.panelSizes && typeof savedPrefs.panelSizes === 'object' ? savedPrefs.panelSizes : {})
        },
        focusMode: savedPrefs.focusMode !== undefined ? savedPrefs.focusMode : DEFAULT_PREFERENCES.focusMode,
        graphLayout: {
          ...DEFAULT_PREFERENCES.graphLayout!,
          ...(savedPrefs.graphLayout && typeof savedPrefs.graphLayout === 'object' ? savedPrefs.graphLayout : {})
        },
      };

      viewMode.set(projectPrefs.viewMode);
      panelVisibility.set(projectPrefs.panelVisibility);
      panelSizes.set(projectPrefs.panelSizes);
      focusMode.set(projectPrefs.focusMode);
      graphLayout.set(projectPrefs.graphLayout);
    } catch (error) {
      console.error('Failed to load view preferences, using defaults:', error);
      // Clear corrupted data and use defaults
      localStorage.removeItem(STORAGE_KEY);
      viewMode.set(loadGlobalViewMode());
      panelVisibility.set(DEFAULT_PREFERENCES.panelVisibility);
      panelSizes.set(DEFAULT_PREFERENCES.panelSizes);
      focusMode.set(false);
      graphLayout.set(DEFAULT_PREFERENCES.graphLayout!);
    }
  } else {
    // No project loaded, use defaults
    viewMode.set(loadGlobalViewMode());
    panelVisibility.set(DEFAULT_PREFERENCES.panelVisibility);
    panelSizes.set(DEFAULT_PREFERENCES.panelSizes);
    focusMode.set(false);
    graphLayout.set(DEFAULT_PREFERENCES.graphLayout!);
  }
});

// Actions
export const viewPreferencesActions = {
  setViewMode(mode: ViewMode, updateGlobal: boolean = true) {
    viewMode.set(mode);
    if (updateGlobal) {
      saveGlobalViewMode(mode);
    }
    this.save();
  },

  setPanelVisibility(visibility: Partial<PanelVisibility>) {
    panelVisibility.update(current => ({ ...current, ...visibility }));
    this.save();
  },

  togglePanel(panel: keyof PanelVisibility) {
    panelVisibility.update(current => ({
      ...current,
      [panel]: !current[panel],
    }));
    this.save();
  },

  setPanelSize(panel: keyof PanelSizes, size: number) {
    panelSizes.update(current => ({
      ...current,
      [panel]: size,
    }));
    this.save();
  },

  setFocusMode(enabled: boolean) {
    focusMode.set(enabled);
    this.save();
  },

  toggleFocusMode() {
    focusMode.update(current => !current);
    this.save();
  },

  setGraphLayoutAlgorithm(algorithm: LayoutAlgorithm) {
    graphLayout.update(current => ({ ...current, algorithm }));
    this.save();
  },

  setGraphLayoutDirection(direction: 'TB' | 'LR') {
    graphLayout.update(current => ({ ...current, direction }));
    this.save();
  },

  setGraphLayoutAutoApply(autoApply: boolean) {
    graphLayout.update(current => ({ ...current, autoApply }));
    this.save();
  },

  save() {
    // Get current project key
    let projectKey: string | null = null;
    const unsubscribe = currentProjectKey.subscribe(key => {
      projectKey = key;
    });
    unsubscribe();

    if (!projectKey) return;

    // Get current preferences
    let currentViewMode: ViewMode = 'list';
    let currentPanelVisibility: PanelVisibility = DEFAULT_PREFERENCES.panelVisibility;
    let currentPanelSizes: PanelSizes = DEFAULT_PREFERENCES.panelSizes;
    let currentFocusMode: boolean = false;
    let currentGraphLayout: GraphLayoutPreferences = DEFAULT_PREFERENCES.graphLayout!;

    const unsubViewMode = viewMode.subscribe(v => { currentViewMode = v; });
    const unsubPanelVis = panelVisibility.subscribe(v => { currentPanelVisibility = v; });
    const unsubPanelSizes = panelSizes.subscribe(v => { currentPanelSizes = v; });
    const unsubFocusMode = focusMode.subscribe(v => { currentFocusMode = v; });
    const unsubGraphLayout = graphLayout.subscribe(v => { currentGraphLayout = v; });

    unsubViewMode();
    unsubPanelVis();
    unsubPanelSizes();
    unsubFocusMode();
    unsubGraphLayout();

    // Update all preferences
    allPreferences.update(all => {
      all[projectKey!] = {
        viewMode: currentViewMode,
        panelVisibility: currentPanelVisibility,
        panelSizes: currentPanelSizes,
        focusMode: currentFocusMode,
        graphLayout: currentGraphLayout,
      };
      savePreferences(all);
      return all;
    });
  },

  reset() {
    viewMode.set(DEFAULT_PREFERENCES.viewMode);
    panelVisibility.set(DEFAULT_PREFERENCES.panelVisibility);
    panelSizes.set(DEFAULT_PREFERENCES.panelSizes);
    focusMode.set(DEFAULT_PREFERENCES.focusMode);
    graphLayout.set(DEFAULT_PREFERENCES.graphLayout!);
    this.save();
  },
};
