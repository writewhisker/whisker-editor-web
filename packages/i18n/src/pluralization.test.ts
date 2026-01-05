/**
 * Tests for Pluralization
 */

import { describe, it, expect } from 'vitest';
import { Pluralization, getCategory, getCategoriesForLanguage } from './pluralization';

describe('Pluralization', () => {
  const pluralization = new Pluralization();

  describe('getCategory', () => {
    describe('English (one/other)', () => {
      it('should return "one" for 1', () => {
        expect(pluralization.getCategory('en', 1)).toBe('one');
        expect(pluralization.getCategory('en-US', 1)).toBe('one');
      });

      it('should return "other" for 0', () => {
        expect(pluralization.getCategory('en', 0)).toBe('other');
      });

      it('should return "other" for > 1', () => {
        expect(pluralization.getCategory('en', 2)).toBe('other');
        expect(pluralization.getCategory('en', 5)).toBe('other');
        expect(pluralization.getCategory('en', 100)).toBe('other');
      });

      it('should handle negative numbers', () => {
        expect(pluralization.getCategory('en', -1)).toBe('one');
        expect(pluralization.getCategory('en', -5)).toBe('other');
      });
    });

    describe('Japanese (other only)', () => {
      it('should always return "other"', () => {
        expect(pluralization.getCategory('ja', 0)).toBe('other');
        expect(pluralization.getCategory('ja', 1)).toBe('other');
        expect(pluralization.getCategory('ja', 2)).toBe('other');
        expect(pluralization.getCategory('ja', 100)).toBe('other');
      });
    });

    describe('Chinese (other only)', () => {
      it('should always return "other"', () => {
        expect(pluralization.getCategory('zh', 0)).toBe('other');
        expect(pluralization.getCategory('zh', 1)).toBe('other');
        expect(pluralization.getCategory('zh-Hans', 1)).toBe('other');
        expect(pluralization.getCategory('zh-TW', 1)).toBe('other');
      });
    });

    describe('French (0-1 is singular)', () => {
      it('should return "one" for 0', () => {
        expect(pluralization.getCategory('fr', 0)).toBe('one');
      });

      it('should return "one" for 1', () => {
        expect(pluralization.getCategory('fr', 1)).toBe('one');
      });

      it('should return "one" for 1.5', () => {
        expect(pluralization.getCategory('fr', 1.5)).toBe('one');
      });

      it('should return "other" for >= 2', () => {
        expect(pluralization.getCategory('fr', 2)).toBe('other');
        expect(pluralization.getCategory('fr', 10)).toBe('other');
      });
    });

    describe('Russian (complex)', () => {
      it('should return "one" for 1, 21, 31...', () => {
        expect(pluralization.getCategory('ru', 1)).toBe('one');
        expect(pluralization.getCategory('ru', 21)).toBe('one');
        expect(pluralization.getCategory('ru', 31)).toBe('one');
        expect(pluralization.getCategory('ru', 101)).toBe('one');
      });

      it('should return "few" for 2-4, 22-24, 32-34...', () => {
        expect(pluralization.getCategory('ru', 2)).toBe('few');
        expect(pluralization.getCategory('ru', 3)).toBe('few');
        expect(pluralization.getCategory('ru', 4)).toBe('few');
        expect(pluralization.getCategory('ru', 22)).toBe('few');
        expect(pluralization.getCategory('ru', 23)).toBe('few');
        expect(pluralization.getCategory('ru', 24)).toBe('few');
      });

      it('should return "many" for 0, 5-20, 25-30...', () => {
        expect(pluralization.getCategory('ru', 0)).toBe('many');
        expect(pluralization.getCategory('ru', 5)).toBe('many');
        expect(pluralization.getCategory('ru', 11)).toBe('many');
        expect(pluralization.getCategory('ru', 12)).toBe('many');
        expect(pluralization.getCategory('ru', 14)).toBe('many');
        expect(pluralization.getCategory('ru', 20)).toBe('many');
        expect(pluralization.getCategory('ru', 25)).toBe('many');
      });
    });

    describe('Polish (complex)', () => {
      it('should return "one" for 1', () => {
        expect(pluralization.getCategory('pl', 1)).toBe('one');
      });

      it('should return "few" for 2-4', () => {
        expect(pluralization.getCategory('pl', 2)).toBe('few');
        expect(pluralization.getCategory('pl', 3)).toBe('few');
        expect(pluralization.getCategory('pl', 4)).toBe('few');
      });

      it('should return "few" for 22-24, 32-34...', () => {
        expect(pluralization.getCategory('pl', 22)).toBe('few');
        expect(pluralization.getCategory('pl', 23)).toBe('few');
        expect(pluralization.getCategory('pl', 24)).toBe('few');
      });

      it('should return "many" for 0, 5-21', () => {
        expect(pluralization.getCategory('pl', 0)).toBe('many');
        expect(pluralization.getCategory('pl', 5)).toBe('many');
        expect(pluralization.getCategory('pl', 11)).toBe('many');
        expect(pluralization.getCategory('pl', 21)).toBe('many');
      });
    });

    describe('Arabic (6 forms)', () => {
      it('should return "zero" for 0', () => {
        expect(pluralization.getCategory('ar', 0)).toBe('zero');
      });

      it('should return "one" for 1', () => {
        expect(pluralization.getCategory('ar', 1)).toBe('one');
      });

      it('should return "two" for 2', () => {
        expect(pluralization.getCategory('ar', 2)).toBe('two');
      });

      it('should return "few" for 3-10', () => {
        expect(pluralization.getCategory('ar', 3)).toBe('few');
        expect(pluralization.getCategory('ar', 10)).toBe('few');
        expect(pluralization.getCategory('ar', 103)).toBe('few');
      });

      it('should return "many" for 11-99', () => {
        expect(pluralization.getCategory('ar', 11)).toBe('many');
        expect(pluralization.getCategory('ar', 99)).toBe('many');
      });

      it('should return "other" for 100, 200...', () => {
        expect(pluralization.getCategory('ar', 100)).toBe('other');
        expect(pluralization.getCategory('ar', 200)).toBe('other');
      });
    });

    describe('Slovenian (4 forms)', () => {
      it('should return "one" for n % 100 === 1', () => {
        expect(pluralization.getCategory('sl', 1)).toBe('one');
        expect(pluralization.getCategory('sl', 101)).toBe('one');
        expect(pluralization.getCategory('sl', 201)).toBe('one');
      });

      it('should return "two" for n % 100 === 2', () => {
        expect(pluralization.getCategory('sl', 2)).toBe('two');
        expect(pluralization.getCategory('sl', 102)).toBe('two');
      });

      it('should return "few" for n % 100 === 3 or 4', () => {
        expect(pluralization.getCategory('sl', 3)).toBe('few');
        expect(pluralization.getCategory('sl', 4)).toBe('few');
        expect(pluralization.getCategory('sl', 103)).toBe('few');
      });

      it('should return "other" for everything else', () => {
        expect(pluralization.getCategory('sl', 0)).toBe('other');
        expect(pluralization.getCategory('sl', 5)).toBe('other');
        expect(pluralization.getCategory('sl', 11)).toBe('other');
        expect(pluralization.getCategory('sl', 100)).toBe('other');
      });
    });

    describe('Unknown language', () => {
      it('should default to English-like rules', () => {
        expect(pluralization.getCategory('unknown', 1)).toBe('one');
        expect(pluralization.getCategory('unknown', 0)).toBe('other');
        expect(pluralization.getCategory('unknown', 2)).toBe('other');
      });
    });

    describe('Edge cases', () => {
      it('should handle NaN', () => {
        expect(pluralization.getCategory('en', NaN)).toBe('other');
      });

      it('should handle Infinity', () => {
        expect(pluralization.getCategory('en', Infinity)).toBe('other');
      });
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return sorted list of supported languages', () => {
      const languages = pluralization.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('ja');
      expect(languages).toContain('ru');
      expect(languages).toContain('ar');
      // Should be sorted
      expect(languages).toEqual([...languages].sort());
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(pluralization.isLanguageSupported('en')).toBe(true);
      expect(pluralization.isLanguageSupported('ja')).toBe(true);
      expect(pluralization.isLanguageSupported('ru')).toBe(true);
    });

    it('should return true for locales with supported language', () => {
      expect(pluralization.isLanguageSupported('en-US')).toBe(true);
      expect(pluralization.isLanguageSupported('zh-Hans')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(pluralization.isLanguageSupported('unknown')).toBe(false);
      expect(pluralization.isLanguageSupported('xyz')).toBe(false);
    });
  });

  describe('getCategoriesForLanguage', () => {
    it('should return ["other"] for Japanese', () => {
      expect(pluralization.getCategoriesForLanguage('ja')).toEqual(['other']);
    });

    it('should return ["one", "other"] for English', () => {
      expect(pluralization.getCategoriesForLanguage('en')).toEqual(['one', 'other']);
    });

    it('should return ["one", "few", "many"] for Russian', () => {
      expect(pluralization.getCategoriesForLanguage('ru')).toEqual(['one', 'few', 'many']);
    });

    it('should return 6 forms for Arabic', () => {
      expect(pluralization.getCategoriesForLanguage('ar')).toEqual([
        'zero',
        'one',
        'two',
        'few',
        'many',
        'other',
      ]);
    });

    it('should handle locales with region codes', () => {
      expect(pluralization.getCategoriesForLanguage('en-US')).toEqual(['one', 'other']);
      expect(pluralization.getCategoriesForLanguage('ru-RU')).toEqual(['one', 'few', 'many']);
    });

    it('should return default for unknown languages', () => {
      expect(pluralization.getCategoriesForLanguage('unknown')).toEqual(['one', 'other']);
    });
  });

  describe('getFormCount', () => {
    it('should return correct form count', () => {
      expect(pluralization.getFormCount('ja')).toBe(1);
      expect(pluralization.getFormCount('en')).toBe(2);
      expect(pluralization.getFormCount('ru')).toBe(3);
      expect(pluralization.getFormCount('sl')).toBe(4);
      expect(pluralization.getFormCount('ga')).toBe(5);
      expect(pluralization.getFormCount('ar')).toBe(6);
    });
  });

  describe('Module-level functions', () => {
    describe('getCategory', () => {
      it('should work as standalone function', () => {
        expect(getCategory('en', 1)).toBe('one');
        expect(getCategory('en', 2)).toBe('other');
        expect(getCategory('ja', 1)).toBe('other');
      });
    });

    describe('getCategoriesForLanguage', () => {
      it('should work as standalone function', () => {
        expect(getCategoriesForLanguage('en')).toEqual(['one', 'other']);
        expect(getCategoriesForLanguage('ar')).toEqual([
          'zero',
          'one',
          'two',
          'few',
          'many',
          'other',
        ]);
      });
    });
  });

  describe('Factory method', () => {
    it('should create instance via factory', () => {
      const instance = Pluralization.create();
      expect(instance).toBeInstanceOf(Pluralization);
      expect(instance.getCategory('en', 1)).toBe('one');
    });
  });
});
