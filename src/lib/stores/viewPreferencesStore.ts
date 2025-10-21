import { writable, derived } from 'svelte/store';
import { currentStory } from './projectStore';

export type ViewMode = 'list' | 'graph' | 'split' | 'preview';

export interface PanelVisibility {
  passageList: boolean;
  properties: boolean;
  variables: boolean;
  validation: boolean;
}

export interface PanelSizes {
  passageListWidth: number;
  propertiesWidth: number;
  variablesWidth: number;
  variablesHeight: number; // For split view
}

export interface ViewPreferences {
  viewMode: ViewMode;
  panelVisibility: PanelVisibility;
  panelSizes: PanelSizes;
  focusMode: boolean;
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
  },
  panelSizes: {
    passageListWidth: 256, // 64 * 4 (w-64)
    propertiesWidth: 384, // 96 * 4 (w-96)
    variablesWidth: 320, // 80 * 4 (w-80)
    variablesHeight: 256, // 64 * 4 (h-64)
  },
  focusMode: false,
};

const STORAGE_KEY = 'whisker-view-preferences';
const GLOBAL_VIEW_MODE_KEY = 'whisker-global-view-mode';

// Load preferences from localStorage
function loadPreferences(): ProjectViewPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn('Failed to load view preferences:', e);
    return {};
  }
}

// Save preferences to localStorage
function savePreferences(prefs: ProjectViewPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save view preferences:', e);
  }
}

// Load global default view mode
function loadGlobalViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(GLOBAL_VIEW_MODE_KEY);
    return (stored as ViewMode) || 'list';
  } catch (e) {
    return 'list';
  }
}

// Save global default view mode
function saveGlobalViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(GLOBAL_VIEW_MODE_KEY, mode);
  } catch (e) {
    console.warn('Failed to save global view mode:', e);
  }
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
    return $all[$key] || { ...DEFAULT_PREFERENCES, viewMode: loadGlobalViewMode() };
  }
);

// Individual preference stores for easy binding
export const viewMode = writable<ViewMode>(loadGlobalViewMode());
export const panelVisibility = writable<PanelVisibility>(DEFAULT_PREFERENCES.panelVisibility);
export const panelSizes = writable<PanelSizes>(DEFAULT_PREFERENCES.panelSizes);
export const focusMode = writable<boolean>(false);

// Update current preferences when project changes
currentProjectKey.subscribe($key => {
  if ($key) {
    const prefs = loadPreferences();
    const projectPrefs = prefs[$key] || { ...DEFAULT_PREFERENCES, viewMode: loadGlobalViewMode() };
    viewMode.set(projectPrefs.viewMode);
    panelVisibility.set(projectPrefs.panelVisibility);
    panelSizes.set(projectPrefs.panelSizes);
    focusMode.set(projectPrefs.focusMode);
  } else {
    // No project loaded, use defaults
    viewMode.set(loadGlobalViewMode());
    panelVisibility.set(DEFAULT_PREFERENCES.panelVisibility);
    panelSizes.set(DEFAULT_PREFERENCES.panelSizes);
    focusMode.set(false);
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

    const unsubViewMode = viewMode.subscribe(v => { currentViewMode = v; });
    const unsubPanelVis = panelVisibility.subscribe(v => { currentPanelVisibility = v; });
    const unsubPanelSizes = panelSizes.subscribe(v => { currentPanelSizes = v; });
    const unsubFocusMode = focusMode.subscribe(v => { currentFocusMode = v; });

    unsubViewMode();
    unsubPanelVis();
    unsubPanelSizes();
    unsubFocusMode();

    // Update all preferences
    allPreferences.update(all => {
      all[projectKey!] = {
        viewMode: currentViewMode,
        panelVisibility: currentPanelVisibility,
        panelSizes: currentPanelSizes,
        focusMode: currentFocusMode,
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
    this.save();
  },
};
