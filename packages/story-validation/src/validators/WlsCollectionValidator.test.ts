/**
 * WLS Collection Validator Tests
 */

import { describe, it, expect } from 'vitest';
import { WlsCollectionValidator } from './WlsCollectionValidator';
import { Story } from '@writewhisker/story-models';

describe('WlsCollectionValidator', () => {
  const validator = new WlsCollectionValidator();

  describe('metadata', () => {
    it('should have correct name and category', () => {
      expect(validator.name).toBe('wls_collections');
      expect(validator.category).toBe('collections');
    });
  });

  describe('validate empty story', () => {
    it('should return empty issues for story without collections', () => {
      const story = new Story();
      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });
  });

  describe('LIST validation', () => {
    it('should return empty issues for valid LIST', () => {
      const story = {
        lists: [
          { name: 'moods', values: [{ value: 'happy', active: true }, { value: 'sad', active: false }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should detect empty LIST', () => {
      const story = {
        lists: [{ name: 'emptyList', values: [] }]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe('WLS-COL-002');
    });

    it('should detect duplicate values in LIST', () => {
      const story = {
        lists: [
          { name: 'moods', values: [{ value: 'happy', active: true }, { value: 'happy', active: false }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe('WLS-COL-001');
    });

    it('should detect invalid identifiers in LIST', () => {
      const story = {
        lists: [
          { name: 'invalid', values: [{ value: '123invalid', active: true }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe('WLS-COL-003');
    });

    it('should handle lists as undefined', () => {
      const story = { lists: undefined } as unknown as Story;
      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should handle non-array lists', () => {
      const story = { lists: 'not-an-array' } as unknown as Story;
      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should handle list values as plain strings', () => {
      const story = {
        lists: [
          { name: 'moods', values: ['happy', 'sad'] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should handle undefined values array', () => {
      const story = {
        lists: [{ name: 'noValues', values: undefined }]
      } as unknown as Story;

      const issues = validator.validate(story);
      // Empty list check should handle this gracefully
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('ARRAY validation', () => {
    it('should return empty issues for valid ARRAY', () => {
      const story = {
        arrays: [
          { name: 'numbers', elements: [{ index: 0, value: 1 }, { index: 1, value: 2 }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should detect negative index in ARRAY', () => {
      const story = {
        arrays: [
          { name: 'numbers', elements: [{ index: -1, value: 1 }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe('WLS-COL-005');
    });

    it('should detect duplicate indices in ARRAY', () => {
      const story = {
        arrays: [
          { name: 'numbers', elements: [{ index: 0, value: 1 }, { index: 0, value: 2 }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe('WLS-COL-004');
    });

    it('should handle arrays as undefined', () => {
      const story = { arrays: undefined } as unknown as Story;
      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should handle non-array arrays', () => {
      const story = { arrays: 'not-an-array' } as unknown as Story;
      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should handle undefined elements array', () => {
      const story = {
        arrays: [{ name: 'empty', elements: undefined }]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle elements without explicit index', () => {
      const story = {
        arrays: [
          { name: 'numbers', elements: [{ value: 1 }, { value: 2 }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should handle elements with null index', () => {
      const story = {
        arrays: [
          { name: 'numbers', elements: [{ index: null, value: 1 }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });
  });

  describe('MAP validation', () => {
    it('should return empty issues for valid MAP', () => {
      const story = {
        maps: [
          { name: 'data', entries: [{ key: 'name', value: 'Alice' }, { key: 'age', value: 30 }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should detect duplicate keys in MAP', () => {
      const story = {
        maps: [
          { name: 'data', entries: [{ key: 'name', value: 'Alice' }, { key: 'name', value: 'Bob' }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe('WLS-COL-006');
    });

    it('should detect invalid key type in MAP', () => {
      const story = {
        maps: [
          { name: 'data', entries: [{ key: 123, value: 'value' }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe('WLS-COL-007');
    });

    it('should handle maps as undefined', () => {
      const story = { maps: undefined } as unknown as Story;
      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should handle non-array maps', () => {
      const story = { maps: 'not-an-array' } as unknown as Story;
      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should handle undefined entries array', () => {
      const story = {
        maps: [{ name: 'empty', entries: undefined }]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('combined validation', () => {
    it('should validate story with all collection types', () => {
      const story = {
        lists: [
          { name: 'moods', values: [{ value: 'happy', active: true }] }
        ],
        arrays: [
          { name: 'numbers', elements: [{ index: 0, value: 1 }] }
        ],
        maps: [
          { name: 'data', entries: [{ key: 'name', value: 'Alice' }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues).toHaveLength(0);
    });

    it('should report all issues from all collection types', () => {
      const story = {
        lists: [
          { name: 'emptyList', values: [] }
        ],
        arrays: [
          { name: 'badArray', elements: [{ index: -1, value: 1 }] }
        ],
        maps: [
          { name: 'badMap', entries: [{ key: 'dup', value: 1 }, { key: 'dup', value: 2 }] }
        ]
      } as unknown as Story;

      const issues = validator.validate(story);
      expect(issues.length).toBe(3);
    });
  });
});
