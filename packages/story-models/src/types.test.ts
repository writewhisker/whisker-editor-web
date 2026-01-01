import { describe, it, expect } from 'vitest';
import { SpecialTargets, isSpecialTarget } from './types';

describe('WLS 1.0 Types', () => {
  describe('SpecialTargets', () => {
    it('should define END target', () => {
      expect(SpecialTargets.END).toBe('END');
    });

    it('should define BACK target', () => {
      expect(SpecialTargets.BACK).toBe('BACK');
    });

    it('should define RESTART target', () => {
      expect(SpecialTargets.RESTART).toBe('RESTART');
    });
  });

  describe('isSpecialTarget', () => {
    it('should return true for END', () => {
      expect(isSpecialTarget('END')).toBe(true);
    });

    it('should return true for BACK', () => {
      expect(isSpecialTarget('BACK')).toBe(true);
    });

    it('should return true for RESTART', () => {
      expect(isSpecialTarget('RESTART')).toBe(true);
    });

    it('should return false for regular passage names', () => {
      expect(isSpecialTarget('start')).toBe(false);
      expect(isSpecialTarget('intro')).toBe(false);
      expect(isSpecialTarget('chapter-1')).toBe(false);
    });

    it('should return false for lowercase variants', () => {
      expect(isSpecialTarget('end')).toBe(false);
      expect(isSpecialTarget('back')).toBe(false);
      expect(isSpecialTarget('restart')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSpecialTarget('')).toBe(false);
    });

    it('should return false for similar but different strings', () => {
      expect(isSpecialTarget('ENDING')).toBe(false);
      expect(isSpecialTarget('BACKWARDS')).toBe(false);
      expect(isSpecialTarget('RESTARTING')).toBe(false);
    });
  });
});
