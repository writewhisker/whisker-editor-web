import { writable, derived } from 'svelte/store';
import { currentStory } from './projectStore';

export type ViewMode = 'list' | 'graph' | 'split' | 'preview';

export interface PanelVisibility {
  passageList: boolean;
  properties: boolean;
  variables: boolean;
  validation: boolean;
  statistics: boolean;
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
    statistics: false,
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
const STORAGE_VERSION_KEY = 'whisker-preferences-version';
const CURRENT_VERSION = '2'; // Increment when schema changes

// Check and migrate localStorage if needed
function checkStorageVersion(): void {
  try {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      console.log(`Migrating localStorage from version ${storedVersion || 'legacy'} to ${CURRENT_VERSION}`);
      // Clear old preferences when version changes
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
    }
  } catch (e) {
    console.warn('Failed to check storage version:', e);
  }
}

// Load preferences from localStorage
function loadPreferences(): ProjectViewPreferences {
  try {
    checkStorageVersion(); // Check version before loading
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
      };

      viewMode.set(projectPrefs.viewMode);
      panelVisibility.set(projectPrefs.panelVisibility);
      panelSizes.set(projectPrefs.panelSizes);
      focusMode.set(projectPrefs.focusMode);
    } catch (error) {
      console.error('Failed to load view preferences, using defaults:', error);
      // Clear corrupted data and use defaults
      localStorage.removeItem(STORAGE_KEY);
      viewMode.set(loadGlobalViewMode());
      panelVisibility.set(DEFAULT_PREFERENCES.panelVisibility);
      panelSizes.set(DEFAULT_PREFERENCES.panelSizes);
      focusMode.set(false);
    }
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
