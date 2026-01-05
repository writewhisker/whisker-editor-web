/**
 * Tests for Privacy module
 */

import { describe, it, expect } from 'vitest';
import {
  CONSENT_LEVEL_NAMES,
  CONSENT_LEVEL_DESCRIPTIONS,
  getConsentLevelName,
  getConsentLevelDescription,
  isValidConsentLevel,
  getAllConsentLevels,
  compareConsentLevels,
  meetsConsentLevel,
} from './Privacy';
import { ConsentLevel } from './types';

describe('Privacy Module', () => {
  describe('CONSENT_LEVEL_NAMES', () => {
    it('has name for each consent level', () => {
      expect(CONSENT_LEVEL_NAMES[ConsentLevel.NONE]).toBe('None');
      expect(CONSENT_LEVEL_NAMES[ConsentLevel.ESSENTIAL]).toBe('Essential');
      expect(CONSENT_LEVEL_NAMES[ConsentLevel.ANALYTICS]).toBe('Analytics');
      expect(CONSENT_LEVEL_NAMES[ConsentLevel.FULL]).toBe('Full');
    });
  });

  describe('CONSENT_LEVEL_DESCRIPTIONS', () => {
    it('has description for each consent level', () => {
      expect(CONSENT_LEVEL_DESCRIPTIONS[ConsentLevel.NONE]).toBeTruthy();
      expect(CONSENT_LEVEL_DESCRIPTIONS[ConsentLevel.ESSENTIAL]).toBeTruthy();
      expect(CONSENT_LEVEL_DESCRIPTIONS[ConsentLevel.ANALYTICS]).toBeTruthy();
      expect(CONSENT_LEVEL_DESCRIPTIONS[ConsentLevel.FULL]).toBeTruthy();
    });
  });

  describe('getConsentLevelName', () => {
    it('returns correct name for valid levels', () => {
      expect(getConsentLevelName(ConsentLevel.NONE)).toBe('None');
      expect(getConsentLevelName(ConsentLevel.ESSENTIAL)).toBe('Essential');
      expect(getConsentLevelName(ConsentLevel.ANALYTICS)).toBe('Analytics');
      expect(getConsentLevelName(ConsentLevel.FULL)).toBe('Full');
    });

    it('returns Unknown for invalid levels', () => {
      expect(getConsentLevelName(999 as ConsentLevel)).toBe('Unknown');
      expect(getConsentLevelName(-1 as ConsentLevel)).toBe('Unknown');
    });
  });

  describe('getConsentLevelDescription', () => {
    it('returns correct description for valid levels', () => {
      const desc = getConsentLevelDescription(ConsentLevel.NONE);
      expect(desc).toContain('No analytics tracking');
    });

    it('returns Unknown for invalid levels', () => {
      expect(getConsentLevelDescription(999 as ConsentLevel)).toBe('Unknown consent level');
    });
  });

  describe('isValidConsentLevel', () => {
    it('returns true for valid levels', () => {
      expect(isValidConsentLevel(ConsentLevel.NONE)).toBe(true);
      expect(isValidConsentLevel(ConsentLevel.ESSENTIAL)).toBe(true);
      expect(isValidConsentLevel(ConsentLevel.ANALYTICS)).toBe(true);
      expect(isValidConsentLevel(ConsentLevel.FULL)).toBe(true);
    });

    it('returns false for invalid levels', () => {
      expect(isValidConsentLevel(999)).toBe(false);
      expect(isValidConsentLevel(-1)).toBe(false);
      expect(isValidConsentLevel(4)).toBe(false);
    });
  });

  describe('getAllConsentLevels', () => {
    it('returns all consent levels with info', () => {
      const levels = getAllConsentLevels();
      expect(levels).toHaveLength(4);
      expect(levels[0].level).toBe(ConsentLevel.NONE);
      expect(levels[1].level).toBe(ConsentLevel.ESSENTIAL);
      expect(levels[2].level).toBe(ConsentLevel.ANALYTICS);
      expect(levels[3].level).toBe(ConsentLevel.FULL);
    });

    it('includes name and description for each level', () => {
      const levels = getAllConsentLevels();
      for (const info of levels) {
        expect(info.name).toBeTruthy();
        expect(info.description).toBeTruthy();
      }
    });
  });

  describe('compareConsentLevels', () => {
    it('returns negative when first is less than second', () => {
      expect(compareConsentLevels(ConsentLevel.NONE, ConsentLevel.FULL)).toBeLessThan(0);
      expect(compareConsentLevels(ConsentLevel.ESSENTIAL, ConsentLevel.ANALYTICS)).toBeLessThan(0);
    });

    it('returns positive when first is greater than second', () => {
      expect(compareConsentLevels(ConsentLevel.FULL, ConsentLevel.NONE)).toBeGreaterThan(0);
      expect(compareConsentLevels(ConsentLevel.ANALYTICS, ConsentLevel.ESSENTIAL)).toBeGreaterThan(0);
    });

    it('returns zero when levels are equal', () => {
      expect(compareConsentLevels(ConsentLevel.ANALYTICS, ConsentLevel.ANALYTICS)).toBe(0);
      expect(compareConsentLevels(ConsentLevel.NONE, ConsentLevel.NONE)).toBe(0);
    });
  });

  describe('meetsConsentLevel', () => {
    it('returns true when current meets required', () => {
      expect(meetsConsentLevel(ConsentLevel.FULL, ConsentLevel.ANALYTICS)).toBe(true);
      expect(meetsConsentLevel(ConsentLevel.ANALYTICS, ConsentLevel.ESSENTIAL)).toBe(true);
      expect(meetsConsentLevel(ConsentLevel.ESSENTIAL, ConsentLevel.NONE)).toBe(true);
    });

    it('returns true when current equals required', () => {
      expect(meetsConsentLevel(ConsentLevel.ANALYTICS, ConsentLevel.ANALYTICS)).toBe(true);
      expect(meetsConsentLevel(ConsentLevel.FULL, ConsentLevel.FULL)).toBe(true);
    });

    it('returns false when current is less than required', () => {
      expect(meetsConsentLevel(ConsentLevel.NONE, ConsentLevel.ESSENTIAL)).toBe(false);
      expect(meetsConsentLevel(ConsentLevel.ESSENTIAL, ConsentLevel.ANALYTICS)).toBe(false);
      expect(meetsConsentLevel(ConsentLevel.ANALYTICS, ConsentLevel.FULL)).toBe(false);
    });
  });
});
