import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  kidsModePreferences,
  kidsModeEnabled,
  kidsTheme,
  kidsAgeGroup,
  setKidsModeEnabled,
  toggleKidsMode,
  setAgeGroup,
  setChildName,
  setKidsTheme,
  toggleSoundEffects,
  completeTutorial,
  completeSpecificTutorial,
  awardBadge,
  resetKidsModePreferences,
  getKidFriendlyTerm,
  configureKidsModeStorage,
  type KidsModeStorage,
} from './index';

describe('@writewhisker/kids-mode-state', () => {
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map();
    const adapter: KidsModeStorage = {
      getItem: (key) => mockStorage.get(key) || null,
      setItem: (key, value) => mockStorage.set(key, value),
    };
    configureKidsModeStorage(adapter);
    resetKidsModePreferences();
  });

  it('should initialize with kids mode disabled', () => {
    expect(get(kidsModeEnabled)).toBe(false);
  });

  it('should enable kids mode', () => {
    setKidsModeEnabled(true);
    expect(get(kidsModeEnabled)).toBe(true);
  });

  it('should toggle kids mode', () => {
    toggleKidsMode();
    expect(get(kidsModeEnabled)).toBe(true);
    toggleKidsMode();
    expect(get(kidsModeEnabled)).toBe(false);
  });

  it('should set age group', () => {
    setAgeGroup('8-10');
    expect(get(kidsAgeGroup)).toBe('8-10');
  });

  it('should set child name', () => {
    setChildName('Alex');
    const prefs = get(kidsModePreferences);
    expect(prefs.childName).toBe('Alex');
  });

  it('should set kids theme', () => {
    setKidsTheme('minecraft');
    expect(get(kidsTheme)).toBe('minecraft');
  });

  it('should toggle sound effects', () => {
    toggleSoundEffects();
    const prefs = get(kidsModePreferences);
    expect(prefs.soundEffectsEnabled).toBe(true);
  });

  it('should complete tutorial', () => {
    completeTutorial();
    const prefs = get(kidsModePreferences);
    expect(prefs.tutorialCompleted).toBe(true);
  });

  it('should complete specific tutorial', () => {
    completeSpecificTutorial('intro');
    const prefs = get(kidsModePreferences);
    expect(prefs.completedTutorials).toContain('intro');
  });

  it('should award badge', () => {
    awardBadge('first-story');
    const prefs = get(kidsModePreferences);
    expect(prefs.achievementBadges).toContain('first-story');
  });

  it('should get kid-friendly terms', () => {
    expect(getKidFriendlyTerm('passage', true)).toBe('Story Page');
    expect(getKidFriendlyTerm('passage', false)).toBe('passage');
  });

  it('should reset preferences', () => {
    setKidsModeEnabled(true);
    awardBadge('test');
    resetKidsModePreferences();
    const prefs = get(kidsModePreferences);
    expect(prefs.enabled).toBe(false);
    expect(prefs.achievementBadges).toEqual([]);
  });
});
