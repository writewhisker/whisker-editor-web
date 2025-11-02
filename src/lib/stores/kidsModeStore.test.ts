/**
 * Tests for Kids Mode Store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  kidsModePreferences,
  kidsModeEnabled,
  kidsTheme,
  kidsModeActions,
  getKidFriendlyTerm,
  type KidsTheme,
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

    describe('reset', () => {
      it('should reset all preferences to default', () => {
        kidsModeActions.setEnabled(true);
        kidsModeActions.setTheme('minecraft');
        kidsModeActions.toggleSoundEffects();
        kidsModeActions.completeTutorial();
        kidsModeActions.awardBadge('test');

        kidsModeActions.reset();

        const prefs = get(kidsModePreferences);
        expect(prefs.enabled).toBe(false);
        expect(prefs.theme).toBe('default');
        expect(prefs.soundEffectsEnabled).toBe(false);
        expect(prefs.tutorialCompleted).toBe(false);
        expect(prefs.achievementBadges).toEqual([]);
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
    });
  });
});
