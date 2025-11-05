/**
 * Tests for Kids Mode Store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  kidsModePreferences,
  kidsModeEnabled,
  kidsTheme,
  kidsAgeGroup,
  kidsChildName,
  kidsModeActions,
  getKidFriendlyTerm,
  type KidsTheme,
  type AgeGroup,
} from './kidsModeStore';

describe('kidsModeStore', () => {
  beforeEach(() => {
    // Reset store to default state
    kidsModeActions.reset();
  });

  describe('Default State', () => {
    it('should have kids mode disabled by default', () => {
      const enabled = get(kidsModeEnabled);
      expect(enabled).toBe(false);
    });

    it('should have default theme', () => {
      const theme = get(kidsTheme);
      expect(theme).toBe('default');
    });

    it('should have default preferences', () => {
      const prefs = get(kidsModePreferences);
      expect(prefs.enabled).toBe(false);
      expect(prefs.theme).toBe('default');
      expect(prefs.soundEffectsEnabled).toBe(false);
      expect(prefs.tutorialCompleted).toBe(false);
      expect(prefs.achievementBadges).toEqual([]);
      expect(prefs.ageGroup).toBe(null);
      expect(prefs.childName).toBe(null);
      expect(prefs.completedTutorials).toEqual([]);
    });

    it('should have age group as null by default', () => {
      const ageGroup = get(kidsAgeGroup);
      expect(ageGroup).toBe(null);
    });

    it('should have child name as null by default', () => {
      const name = get(kidsChildName);
      expect(name).toBe(null);
    });
  });

  describe('kidsModeActions', () => {
    describe('setEnabled', () => {
      it('should enable kids mode', () => {
        kidsModeActions.setEnabled(true);
        expect(get(kidsModeEnabled)).toBe(true);
      });

      it('should disable kids mode', () => {
        kidsModeActions.setEnabled(true);
        kidsModeActions.setEnabled(false);
        expect(get(kidsModeEnabled)).toBe(false);
      });
    });

    describe('toggle', () => {
      it('should toggle kids mode on', () => {
        kidsModeActions.toggle();
        expect(get(kidsModeEnabled)).toBe(true);
      });

      it('should toggle kids mode off', () => {
        kidsModeActions.setEnabled(true);
        kidsModeActions.toggle();
        expect(get(kidsModeEnabled)).toBe(false);
      });
    });

    describe('setTheme', () => {
      it('should set Minecraft theme', () => {
        kidsModeActions.setTheme('minecraft');
        expect(get(kidsTheme)).toBe('minecraft');
      });

      it('should set Roblox theme', () => {
        kidsModeActions.setTheme('roblox');
        expect(get(kidsTheme)).toBe('roblox');
      });

      it('should set default theme', () => {
        kidsModeActions.setTheme('minecraft');
        kidsModeActions.setTheme('default');
        expect(get(kidsTheme)).toBe('default');
      });
    });

    describe('toggleSoundEffects', () => {
      it('should toggle sound effects on', () => {
        kidsModeActions.toggleSoundEffects();
        expect(get(kidsModePreferences).soundEffectsEnabled).toBe(true);
      });

      it('should toggle sound effects off', () => {
        kidsModeActions.toggleSoundEffects();
        kidsModeActions.toggleSoundEffects();
        expect(get(kidsModePreferences).soundEffectsEnabled).toBe(false);
      });
    });

    describe('completeTutorial', () => {
      it('should mark tutorial as completed', () => {
        kidsModeActions.completeTutorial();
        expect(get(kidsModePreferences).tutorialCompleted).toBe(true);
      });
    });

    describe('awardBadge', () => {
      it('should award a badge', () => {
        kidsModeActions.awardBadge('first_story');
        const badges = get(kidsModePreferences).achievementBadges;
        expect(badges).toContain('first_story');
      });

      it('should not duplicate badges', () => {
        kidsModeActions.awardBadge('first_story');
        kidsModeActions.awardBadge('first_story');
        const badges = get(kidsModePreferences).achievementBadges;
        expect(badges.filter(b => b === 'first_story').length).toBe(1);
      });

      it('should award multiple badges', () => {
        kidsModeActions.awardBadge('first_story');
        kidsModeActions.awardBadge('first_export');
        kidsModeActions.awardBadge('ten_stories');
        const badges = get(kidsModePreferences).achievementBadges;
        expect(badges).toHaveLength(3);
        expect(badges).toContain('first_story');
        expect(badges).toContain('first_export');
        expect(badges).toContain('ten_stories');
      });
    });

    describe('setAgeGroup', () => {
      it('should set age group to 8-10', () => {
        kidsModeActions.setAgeGroup('8-10');
        expect(get(kidsAgeGroup)).toBe('8-10');
      });

      it('should set age group to 10-13', () => {
        kidsModeActions.setAgeGroup('10-13');
        expect(get(kidsAgeGroup)).toBe('10-13');
      });

      it('should set age group to 13-15', () => {
        kidsModeActions.setAgeGroup('13-15');
        expect(get(kidsAgeGroup)).toBe('13-15');
      });

      it('should update preferences store', () => {
        kidsModeActions.setAgeGroup('10-13');
        const prefs = get(kidsModePreferences);
        expect(prefs.ageGroup).toBe('10-13');
      });
    });

    describe('setChildName', () => {
      it('should set child name', () => {
        kidsModeActions.setChildName('Alex');
        expect(get(kidsChildName)).toBe('Alex');
      });

      it('should update preferences store', () => {
        kidsModeActions.setChildName('Sam');
        const prefs = get(kidsModePreferences);
        expect(prefs.childName).toBe('Sam');
      });

      it('should handle empty string', () => {
        kidsModeActions.setChildName('');
        expect(get(kidsChildName)).toBe('');
      });
    });

    describe('completeSpecificTutorial', () => {
      it('should mark a tutorial as completed', () => {
        kidsModeActions.completeSpecificTutorial('first-story');
        const prefs = get(kidsModePreferences);
        expect(prefs.completedTutorials).toContain('first-story');
      });

      it('should not duplicate tutorial completions', () => {
        kidsModeActions.completeSpecificTutorial('first-story');
        kidsModeActions.completeSpecificTutorial('first-story');
        const prefs = get(kidsModePreferences);
        expect(prefs.completedTutorials.filter(t => t === 'first-story').length).toBe(1);
      });

      it('should track multiple tutorial completions', () => {
        kidsModeActions.completeSpecificTutorial('first-story');
        kidsModeActions.completeSpecificTutorial('add-choices');
        kidsModeActions.completeSpecificTutorial('play-story');
        const prefs = get(kidsModePreferences);
        expect(prefs.completedTutorials).toHaveLength(3);
        expect(prefs.completedTutorials).toContain('first-story');
        expect(prefs.completedTutorials).toContain('add-choices');
        expect(prefs.completedTutorials).toContain('play-story');
      });
    });

    describe('reset', () => {
      it('should reset all preferences to default', () => {
        kidsModeActions.setEnabled(true);
        kidsModeActions.setTheme('minecraft');
        kidsModeActions.toggleSoundEffects();
        kidsModeActions.completeTutorial();
        kidsModeActions.awardBadge('test');
        kidsModeActions.setAgeGroup('10-13');
        kidsModeActions.setChildName('Test');
        kidsModeActions.completeSpecificTutorial('first-story');

        kidsModeActions.reset();

        const prefs = get(kidsModePreferences);
        expect(prefs.enabled).toBe(false);
        expect(prefs.theme).toBe('default');
        expect(prefs.soundEffectsEnabled).toBe(false);
        expect(prefs.tutorialCompleted).toBe(false);
        expect(prefs.achievementBadges).toEqual([]);
        expect(prefs.ageGroup).toBe(null);
        expect(prefs.childName).toBe(null);
        expect(prefs.completedTutorials).toEqual([]);
      });
    });
  });

  describe('getKidFriendlyTerm', () => {
    it('should return kid-friendly term when kids mode is enabled', () => {
      expect(getKidFriendlyTerm('passage', true)).toBe('Story Page');
      expect(getKidFriendlyTerm('passages', true)).toBe('Story Pages');
      expect(getKidFriendlyTerm('choice', true)).toBe('Decision');
      expect(getKidFriendlyTerm('export', true)).toBe('Share');
    });

    it('should return original term when kids mode is disabled', () => {
      expect(getKidFriendlyTerm('passage', false)).toBe('passage');
      expect(getKidFriendlyTerm('choice', false)).toBe('choice');
      expect(getKidFriendlyTerm('export', false)).toBe('export');
    });

    it('should handle case insensitivity', () => {
      expect(getKidFriendlyTerm('Passage', true)).toBe('Story Page');
      expect(getKidFriendlyTerm('CHOICE', true)).toBe('Decision');
    });

    it('should return original term if not in terminology map', () => {
      expect(getKidFriendlyTerm('unknown', true)).toBe('unknown');
    });
  });

  describe('Reactivity', () => {
    it('should update derived stores when preferences change', () => {
      kidsModeActions.setEnabled(true);
      expect(get(kidsModeEnabled)).toBe(true);

      kidsModeActions.setTheme('minecraft');
      expect(get(kidsTheme)).toBe('minecraft');

      kidsModeActions.setAgeGroup('8-10');
      expect(get(kidsAgeGroup)).toBe('8-10');

      kidsModeActions.setChildName('Jordan');
      expect(get(kidsChildName)).toBe('Jordan');
    });
  });

  describe('Age Group Integration', () => {
    it('should work with full onboarding flow', () => {
      // Simulate full onboarding
      kidsModeActions.setEnabled(true);
      kidsModeActions.setAgeGroup('10-13');
      kidsModeActions.setChildName('Alex');
      kidsModeActions.setTheme('minecraft');

      const prefs = get(kidsModePreferences);
      expect(prefs.enabled).toBe(true);
      expect(prefs.ageGroup).toBe('10-13');
      expect(prefs.childName).toBe('Alex');
      expect(prefs.theme).toBe('minecraft');

      expect(get(kidsModeEnabled)).toBe(true);
      expect(get(kidsAgeGroup)).toBe('10-13');
      expect(get(kidsChildName)).toBe('Alex');
      expect(get(kidsTheme)).toBe('minecraft');
    });

    it('should allow changing age group', () => {
      kidsModeActions.setAgeGroup('8-10');
      expect(get(kidsAgeGroup)).toBe('8-10');

      kidsModeActions.setAgeGroup('13-15');
      expect(get(kidsAgeGroup)).toBe('13-15');
    });
  });
});
