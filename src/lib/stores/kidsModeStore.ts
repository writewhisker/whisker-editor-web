/**
 * Kids Mode Store
 *
 * Manages the kids mode feature flag and preferences for child-friendly UI.
 * This is designed to be non-invasive - when disabled, it has zero impact on the app.
 */

import { writable, derived } from 'svelte/store';
import { getPreferenceService } from '../services/storage/PreferenceService';

const KIDS_MODE_KEY = 'whisker-kids-mode-enabled';
const KIDS_THEME_KEY = 'whisker-kids-theme';

// Get preference service instance
const prefService = getPreferenceService();

/**
 * Kids mode themes for Minecraft and Roblox
 */
export type KidsTheme = 'default' | 'minecraft' | 'roblox';

/**
 * Kids mode preferences
 */
export interface KidsModePreferences {
  enabled: boolean;
  theme: KidsTheme;
  soundEffectsEnabled: boolean;
  tutorialCompleted: boolean;
  achievementBadges: string[]; // List of earned achievement IDs
}

/**
 * Default preferences for kids mode
 */
const DEFAULT_PREFERENCES: KidsModePreferences = {
  enabled: false,
  theme: 'default',
  soundEffectsEnabled: false, // Disabled by default to avoid annoying sounds
  tutorialCompleted: false,
  achievementBadges: [],
};

/**
 * Load kids mode preferences from storage
 */
function loadPreferences(): KidsModePreferences {
  try {
    const enabled = prefService.getPreferenceSync<boolean>(KIDS_MODE_KEY, false);
    const theme = prefService.getPreferenceSync<KidsTheme>(KIDS_THEME_KEY, 'default');

    return {
      ...DEFAULT_PREFERENCES,
      enabled,
      theme,
    };
  } catch (error) {
    console.error('Failed to load kids mode preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save kids mode preferences to storage
 */
function savePreferences(prefs: KidsModePreferences): void {
  try {
    prefService.setPreferenceSync(KIDS_MODE_KEY, prefs.enabled);
    prefService.setPreferenceSync(KIDS_THEME_KEY, prefs.theme);
    // Other preferences can be added to storage as needed
  } catch (error) {
    console.error('Failed to save kids mode preferences:', error);
  }
}

// Create the main preferences store
export const kidsModePreferences = writable<KidsModePreferences>(loadPreferences());

// Convenience stores for common values
export const kidsModeEnabled = derived(kidsModePreferences, $prefs => $prefs.enabled);
export const kidsTheme = derived(kidsModePreferences, $prefs => $prefs.theme);

/**
 * Actions for managing kids mode
 */
export const kidsModeActions = {
  /**
   * Enable or disable kids mode
   */
  setEnabled(enabled: boolean) {
    kidsModePreferences.update(prefs => {
      const newPrefs = { ...prefs, enabled };
      savePreferences(newPrefs);
      return newPrefs;
    });
  },

  /**
   * Toggle kids mode on/off
   */
  toggle() {
    kidsModePreferences.update(prefs => {
      const newPrefs = { ...prefs, enabled: !prefs.enabled };
      savePreferences(newPrefs);
      return newPrefs;
    });
  },

  /**
   * Set the kids mode theme (default, minecraft, roblox)
   */
  setTheme(theme: KidsTheme) {
    kidsModePreferences.update(prefs => {
      const newPrefs = { ...prefs, theme };
      savePreferences(newPrefs);
      return newPrefs;
    });
  },

  /**
   * Toggle sound effects
   */
  toggleSoundEffects() {
    kidsModePreferences.update(prefs => ({
      ...prefs,
      soundEffectsEnabled: !prefs.soundEffectsEnabled,
    }));
  },

  /**
   * Mark tutorial as completed
   */
  completeTutorial() {
    kidsModePreferences.update(prefs => ({
      ...prefs,
      tutorialCompleted: true,
    }));
  },

  /**
   * Award an achievement badge
   */
  awardBadge(badgeId: string) {
    kidsModePreferences.update(prefs => {
      if (prefs.achievementBadges.includes(badgeId)) {
        return prefs; // Already earned
      }
      return {
        ...prefs,
        achievementBadges: [...prefs.achievementBadges, badgeId],
      };
    });
  },

  /**
   * Reset all kids mode preferences to defaults
   */
  reset() {
    kidsModePreferences.set(DEFAULT_PREFERENCES);
    savePreferences(DEFAULT_PREFERENCES);
  },
};

/**
 * Kid-friendly terminology mapper
 * Maps technical terms to kid-friendly equivalents
 */
export const terminology = {
  // Core concepts
  passage: 'Story Page',
  passages: 'Story Pages',
  choice: 'Decision',
  choices: 'Decisions',
  variable: 'Game Item',
  variables: 'Game Items',

  // Views
  graph: 'Story Map',
  list: 'Page List',
  preview: 'Play Story',

  // Actions
  export: 'Share',
  import: 'Load',
  validate: 'Check Story',
  delete: 'Remove',
  duplicate: 'Copy',

  // Panels
  properties: 'Editor',
  validation: 'Story Checker',
  statistics: 'Story Stats',

  // Status
  error: 'Uh-oh',
  warning: 'Heads up',
  success: 'Great job',
} as const;

/**
 * Get kid-friendly term for a technical term
 */
export function getKidFriendlyTerm(technicalTerm: string, isKidsMode: boolean): string {
  if (!isKidsMode) return technicalTerm;

  const term = technicalTerm.toLowerCase();
  return terminology[term as keyof typeof terminology] || technicalTerm;
}
