/**
 * Pluralization engine for i18n
 * Based on CLDR plural rules
 */

import type { PluralCategory, PluralRule } from './types';

/**
 * Plural rules indexed by language code
 * Based on CLDR plural rules
 */
const PLURAL_RULES: Record<string, PluralRule> = {
  // East Asian languages - no plural forms
  ja: () => 'other',
  zh: () => 'other',
  ko: () => 'other',
  vi: () => 'other',
  th: () => 'other',
  id: () => 'other',
  ms: () => 'other',

  // Languages with "one" and "other" forms
  en: (n) => (n === 1 ? 'one' : 'other'),
  de: (n) => (n === 1 ? 'one' : 'other'),
  es: (n) => (n === 1 ? 'one' : 'other'),
  it: (n) => (n === 1 ? 'one' : 'other'),
  nl: (n) => (n === 1 ? 'one' : 'other'),
  sv: (n) => (n === 1 ? 'one' : 'other'),
  da: (n) => (n === 1 ? 'one' : 'other'),
  fi: (n) => (n === 1 ? 'one' : 'other'),
  el: (n) => (n === 1 ? 'one' : 'other'),
  hu: (n) => (n === 1 ? 'one' : 'other'),
  tr: (n) => (n === 1 ? 'one' : 'other'),
  hi: (n) => (n === 0 || n === 1 ? 'one' : 'other'),
  fa: (n) => (n === 0 || n === 1 ? 'one' : 'other'),
  ur: (n) => (n === 1 ? 'one' : 'other'),

  // Portuguese: special case for 0-1
  pt: (n) => (n >= 0 && n <= 1 ? 'one' : 'other'),

  // French: 0-1 is singular
  fr: (n) => (n >= 0 && n < 2 ? 'one' : 'other'),

  // Slavic languages with complex rules
  ru: (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  },

  uk: (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  },

  pl: (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (n === 1) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  },

  cs: (n) => {
    if (n === 1) return 'one';
    if (n >= 2 && n <= 4) return 'few';
    return 'many';
  },

  sk: (n) => {
    if (n === 1) return 'one';
    if (n >= 2 && n <= 4) return 'few';
    return 'many';
  },

  // Baltic languages
  lt: (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if (mod10 >= 2 && mod10 <= 9 && (mod100 < 11 || mod100 > 19)) return 'few';
    return 'other';
  },

  lv: (n) => {
    if (n === 0) return 'zero';
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    return 'other';
  },

  // Romanian
  ro: (n) => {
    if (n === 1) return 'one';
    const mod100 = n % 100;
    if (n === 0 || (mod100 >= 1 && mod100 <= 19)) return 'few';
    return 'other';
  },

  // Slovenian
  sl: (n) => {
    const mod100 = n % 100;
    if (mod100 === 1) return 'one';
    if (mod100 === 2) return 'two';
    if (mod100 === 3 || mod100 === 4) return 'few';
    return 'other';
  },

  // Hebrew
  he: (n) => {
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n >= 11 && n % 10 === 0) return 'many';
    return 'other';
  },

  // Maltese
  mt: (n) => {
    if (n === 1) return 'one';
    const mod100 = n % 100;
    if (n === 0 || (mod100 >= 2 && mod100 <= 10)) return 'few';
    if (mod100 >= 11 && mod100 <= 19) return 'many';
    return 'other';
  },

  // Irish
  ga: (n) => {
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n >= 3 && n <= 6) return 'few';
    if (n >= 7 && n <= 10) return 'many';
    return 'other';
  },

  // Arabic - most complex
  ar: (n) => {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    const mod100 = n % 100;
    if (mod100 >= 3 && mod100 <= 10) return 'few';
    if (mod100 >= 11 && mod100 <= 99) return 'many';
    return 'other';
  },

  // Welsh
  cy: (n) => {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n === 3) return 'few';
    if (n === 6) return 'many';
    return 'other';
  },
};

/**
 * Category mapping by language
 */
const CATEGORY_MAP: Record<string, PluralCategory[]> = {
  // 1 form: other only
  ja: ['other'],
  zh: ['other'],
  ko: ['other'],
  vi: ['other'],
  th: ['other'],
  id: ['other'],
  ms: ['other'],

  // 2 forms: one, other
  en: ['one', 'other'],
  de: ['one', 'other'],
  es: ['one', 'other'],
  it: ['one', 'other'],
  nl: ['one', 'other'],
  sv: ['one', 'other'],
  da: ['one', 'other'],
  fi: ['one', 'other'],
  el: ['one', 'other'],
  hu: ['one', 'other'],
  tr: ['one', 'other'],
  pt: ['one', 'other'],
  fr: ['one', 'other'],
  hi: ['one', 'other'],
  fa: ['one', 'other'],
  ur: ['one', 'other'],

  // 3 forms
  ru: ['one', 'few', 'many'],
  uk: ['one', 'few', 'many'],
  pl: ['one', 'few', 'many'],
  cs: ['one', 'few', 'many'],
  sk: ['one', 'few', 'many'],
  lt: ['one', 'few', 'other'],
  lv: ['zero', 'one', 'other'],
  ro: ['one', 'few', 'other'],

  // 4 forms
  sl: ['one', 'two', 'few', 'other'],
  he: ['one', 'two', 'many', 'other'],
  mt: ['one', 'few', 'many', 'other'],

  // 5 forms
  ga: ['one', 'two', 'few', 'many', 'other'],

  // 6 forms
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
  cy: ['zero', 'one', 'two', 'few', 'many', 'other'],
};

/**
 * Pluralization class
 */
export class Pluralization {
  /**
   * Factory method
   */
  static create(): Pluralization {
    return new Pluralization();
  }

  /**
   * Get plural category for count in locale
   */
  getCategory(locale: string, count: number): PluralCategory {
    // Handle invalid count
    if (typeof count !== 'number' || isNaN(count)) {
      count = 0;
    }

    // Use absolute value for negative numbers
    count = Math.abs(count);

    // Extract language from locale (en-US -> en)
    const lang = locale.match(/^([^-]+)/)?.[1]?.toLowerCase();

    if (!lang) {
      return 'other';
    }

    // Get rule function for language
    const ruleFn = PLURAL_RULES[lang];

    if (!ruleFn) {
      // Unknown language: default English-like rules
      return count === 1 ? 'one' : 'other';
    }

    return ruleFn(count);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return Object.keys(PLURAL_RULES).sort();
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(lang: string): boolean {
    const baseLang = lang.match(/^([^-]+)/)?.[1]?.toLowerCase();
    return baseLang ? PLURAL_RULES[baseLang] !== undefined : false;
  }

  /**
   * Get plural categories available for a language
   */
  getCategoriesForLanguage(locale: string): PluralCategory[] {
    const lang = locale.match(/^([^-]+)/)?.[1]?.toLowerCase();
    return CATEGORY_MAP[lang || ''] || ['one', 'other'];
  }

  /**
   * Get the number of plural forms for a language
   */
  getFormCount(locale: string): number {
    return this.getCategoriesForLanguage(locale).length;
  }
}

/**
 * Module-level function for quick access
 */
export function getCategory(locale: string, count: number): PluralCategory {
  const pluralization = new Pluralization();
  return pluralization.getCategory(locale, count);
}

/**
 * Get categories for a language
 */
export function getCategoriesForLanguage(locale: string): PluralCategory[] {
  const pluralization = new Pluralization();
  return pluralization.getCategoriesForLanguage(locale);
}
