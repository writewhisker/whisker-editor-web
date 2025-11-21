/**
 * Kids Mode State
 *
 * Generic kids mode and parental controls state management.
 * Provides child-friendly UI settings, age-appropriate features,
 * and gamification (achievements, tutorials).
 */

import { writable, derived } from 'svelte/store';

export type AgeGroup = '8-10' | '10-13' | '13-15';
export type KidsTheme = 'default' | 'minecraft' | 'roblox' | 'custom';

export interface KidsModePreferences {
  enabled: boolean;
  ageGroup: AgeGroup | null;
  childName: string | null;
  theme: KidsTheme;
  soundEffectsEnabled: boolean;
  tutorialCompleted: boolean;
  achievementBadges: string[];
  completedTutorials: string[];
}

// Storage adapter
export interface KidsModeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const defaultStorage: KidsModeStorage = {
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

let storage: KidsModeStorage = defaultStorage;

export function configureKidsModeStorage(adapter: KidsModeStorage): void {
  storage = adapter;
}

const KIDS_MODE_KEY = 'kids-mode-enabled';
const KIDS_THEME_KEY = 'kids-theme';
const KIDS_PREFS_KEY = 'kids-mode-preferences';

const DEFAULT_PREFERENCES: KidsModePreferences = {
  enabled: false,
  ageGroup: null,
  childName: null,
  theme: 'default',
  soundEffectsEnabled: false,
  tutorialCompleted: false,
  achievementBadges: [],
  completedTutorials: [],
};

function loadPreferences(): KidsModePreferences {
  try {
    const saved = storage.getItem(KIDS_PREFS_KEY);
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load kids mode preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: KidsModePreferences): void {
  try {
    storage.setItem(KIDS_PREFS_KEY, JSON.stringify(prefs));
    storage.setItem(KIDS_MODE_KEY, String(prefs.enabled));
    storage.setItem(KIDS_THEME_KEY, prefs.theme);
  } catch (error) {
    console.error('Failed to save kids mode preferences:', error);
  }
}

// Main store
export const kidsModePreferences = writable<KidsModePreferences>(loadPreferences());

// Convenience stores
export const kidsModeEnabled = derived(kidsModePreferences, $prefs => $prefs.enabled);
export const kidsTheme = derived(kidsModePreferences, $prefs => $prefs.theme);
export const kidsAgeGroup = derived(kidsModePreferences, $prefs => $prefs.ageGroup);
export const kidsChildName = derived(kidsModePreferences, $prefs => $prefs.childName);

/**
 * Enable or disable kids mode
 */
export function setKidsModeEnabled(enabled: boolean): void {
  kidsModePreferences.update(prefs => {
    const newPrefs = { ...prefs, enabled };
    savePreferences(newPrefs);
    return newPrefs;
  });
}

/**
 * Toggle kids mode on/off
 */
export function toggleKidsMode(): void {
  kidsModePreferences.update(prefs => {
    const newPrefs = { ...prefs, enabled: !prefs.enabled };
    savePreferences(newPrefs);
    return newPrefs;
  });
}

/**
 * Set the age group
 */
export function setAgeGroup(ageGroup: AgeGroup): void {
  kidsModePreferences.update(prefs => {
    const newPrefs = { ...prefs, ageGroup };
    savePreferences(newPrefs);
    return newPrefs;
  });
}

/**
 * Set child's name
 */
export function setChildName(childName: string): void {
  kidsModePreferences.update(prefs => {
    const newPrefs = { ...prefs, childName };
    savePreferences(newPrefs);
    return newPrefs;
  });
}

/**
 * Set the kids mode theme
 */
export function setKidsTheme(theme: KidsTheme): void {
  kidsModePreferences.update(prefs => {
    const newPrefs = { ...prefs, theme };
    savePreferences(newPrefs);
    return newPrefs;
  });
}

/**
 * Toggle sound effects
 */
export function toggleSoundEffects(): void {
  kidsModePreferences.update(prefs => {
    const newPrefs = { ...prefs, soundEffectsEnabled: !prefs.soundEffectsEnabled };
    savePreferences(newPrefs);
    return newPrefs;
  });
}

/**
 * Mark tutorial as completed
 */
export function completeTutorial(): void {
  kidsModePreferences.update(prefs => {
    const newPrefs = { ...prefs, tutorialCompleted: true };
    savePreferences(newPrefs);
    return newPrefs;
  });
}

/**
 * Mark a specific tutorial as completed
 */
export function completeSpecificTutorial(tutorialId: string): void {
  kidsModePreferences.update(prefs => {
    if (prefs.completedTutorials.includes(tutorialId)) {
      return prefs;
    }
    const newPrefs = {
      ...prefs,
      completedTutorials: [...prefs.completedTutorials, tutorialId],
    };
    savePreferences(newPrefs);
    return newPrefs;
  });
}

/**
 * Award an achievement badge
 */
export function awardBadge(badgeId: string): void {
  kidsModePreferences.update(prefs => {
    if (prefs.achievementBadges.includes(badgeId)) {
      return prefs;
    }
    const newPrefs = {
      ...prefs,
      achievementBadges: [...prefs.achievementBadges, badgeId],
    };
    savePreferences(newPrefs);
    return newPrefs;
  });
}

/**
 * Reset all kids mode preferences to defaults
 */
export function resetKidsModePreferences(): void {
  kidsModePreferences.set(DEFAULT_PREFERENCES);
  savePreferences(DEFAULT_PREFERENCES);
}

/**
 * Kid-friendly terminology mapper
 */
export const terminology: Record<string, string> = {
  passage: 'Story Page',
  passages: 'Story Pages',
  choice: 'Decision',
  choices: 'Decisions',
  variable: 'Game Item',
  variables: 'Game Items',
  graph: 'Story Map',
  list: 'Page List',
  preview: 'Play Story',
  export: 'Share',
  import: 'Load',
  validate: 'Check Story',
  delete: 'Remove',
  duplicate: 'Copy',
  properties: 'Editor',
  validation: 'Story Checker',
  statistics: 'Story Stats',
  error: 'Uh-oh',
  warning: 'Heads up',
  success: 'Great job',
};

/**
 * Get kid-friendly term for a technical term
 */
export function getKidFriendlyTerm(technicalTerm: string, isKidsMode: boolean): string {
  if (!isKidsMode) return technicalTerm;

  const term = technicalTerm.toLowerCase();
  return terminology[term] || technicalTerm;
}

// Save preferences when they change
kidsModePreferences.subscribe(prefs => {
  savePreferences(prefs);
});
