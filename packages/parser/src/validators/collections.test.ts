import { describe, it, expect } from 'vitest';
import { validateCollections } from './collections';
import { parse } from '../parser';
import { WLS_ERROR_CODES } from '../ast';

describe('Collection Validation', () => {
  describe('LIST Validation', () => {
    it('should detect duplicate values in LIST', () => {
      const result = parse(`LIST moods = happy, sad, happy

:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateCollections(result.ast!);
      const duplicates = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.DUPLICATE_LIST_VALUE
      );
      expect(duplicates.length).toBe(1);
      expect(duplicates[0].severity).toBe('error');
    });

    it('should not flag unique values', () => {
      const result = parse(`LIST moods = happy, sad, angry

:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateCollections(result.ast!);
      const duplicates = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.DUPLICATE_LIST_VALUE
      );
      expect(duplicates.length).toBe(0);
    });

    it('should collect LIST info', () => {
      const result = parse(`LIST colors = red, green, blue

:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateCollections(result.ast!);
      const listInfo = validation.collections.find(c => c.name === 'colors');
      expect(listInfo).toBeDefined();
      expect(listInfo?.type).toBe('list');
      expect(listInfo?.size).toBe(3);
    });
  });

  describe('ARRAY Validation', () => {
    it('should validate ARRAY declaration', () => {
      const result = parse(`ARRAY numbers = [1, 2, 3, 4, 5]

:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateCollections(result.ast!);
      expect(Array.isArray(validation.diagnostics)).toBe(true);
    });

    it('should collect ARRAY info', () => {
      const result = parse(`ARRAY items = [1, 2, 3]

:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateCollections(result.ast!);
      const arrayInfo = validation.collections.find(c => c.name === 'items');
      expect(arrayInfo).toBeDefined();
      expect(arrayInfo?.type).toBe('array');
    });
  });

  describe('Validation Result', () => {
    it('should return valid: true when no errors', () => {
      const result = parse(`LIST items = a, b, c

:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateCollections(result.ast!);
      expect(validation.valid).toBe(true);
    });

    it('should return valid: false with duplicate values', () => {
      const result = parse(`LIST items = a, b, a

:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateCollections(result.ast!);
      expect(validation.valid).toBe(false);
    });

    it('should return collections array', () => {
      const result = parse(`:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateCollections(result.ast!);
      expect(Array.isArray(validation.collections)).toBe(true);
    });
  });
});
