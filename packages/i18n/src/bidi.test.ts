/**
 * Tests for BiDi support
 */

import { describe, it, expect } from 'vitest';
import {
  BIDI_MARKS,
  getDirection,
  isRTL,
  isLTR,
  wrap,
  isolate,
  mark,
  htmlDir,
  htmlSpan,
  htmlBdi,
  cssDirection,
  cssTextAlign,
  detectFromText,
  stripMarks,
  containsRTL,
  getRTLLanguages,
  isRTLLanguage,
} from './bidi';

describe('BiDi', () => {
  describe('BIDI_MARKS', () => {
    it('should export Unicode control characters', () => {
      expect(BIDI_MARKS.LRM).toBe('\u200E');
      expect(BIDI_MARKS.RLM).toBe('\u200F');
      expect(BIDI_MARKS.LRE).toBe('\u202A');
      expect(BIDI_MARKS.RLE).toBe('\u202B');
      expect(BIDI_MARKS.PDF).toBe('\u202C');
      expect(BIDI_MARKS.LRO).toBe('\u202D');
      expect(BIDI_MARKS.RLO).toBe('\u202E');
      expect(BIDI_MARKS.LRI).toBe('\u2066');
      expect(BIDI_MARKS.RLI).toBe('\u2067');
      expect(BIDI_MARKS.FSI).toBe('\u2068');
      expect(BIDI_MARKS.PDI).toBe('\u2069');
    });
  });

  describe('getDirection', () => {
    it('should return rtl for Arabic', () => {
      expect(getDirection('ar')).toBe('rtl');
      expect(getDirection('ar-SA')).toBe('rtl');
      expect(getDirection('ar-EG')).toBe('rtl');
    });

    it('should return rtl for Hebrew', () => {
      expect(getDirection('he')).toBe('rtl');
      expect(getDirection('he-IL')).toBe('rtl');
      expect(getDirection('iw')).toBe('rtl'); // Old ISO code
    });

    it('should return rtl for Persian', () => {
      expect(getDirection('fa')).toBe('rtl');
      expect(getDirection('fa-IR')).toBe('rtl');
    });

    it('should return rtl for Urdu', () => {
      expect(getDirection('ur')).toBe('rtl');
      expect(getDirection('ur-PK')).toBe('rtl');
    });

    it('should return ltr for English', () => {
      expect(getDirection('en')).toBe('ltr');
      expect(getDirection('en-US')).toBe('ltr');
      expect(getDirection('en-GB')).toBe('ltr');
    });

    it('should return ltr for other LTR languages', () => {
      expect(getDirection('de')).toBe('ltr');
      expect(getDirection('fr')).toBe('ltr');
      expect(getDirection('es')).toBe('ltr');
      expect(getDirection('zh')).toBe('ltr');
      expect(getDirection('ja')).toBe('ltr');
    });

    it('should return ltr for null/undefined', () => {
      expect(getDirection(null)).toBe('ltr');
      expect(getDirection(undefined)).toBe('ltr');
      expect(getDirection('')).toBe('ltr');
    });

    it('should handle case insensitivity', () => {
      expect(getDirection('AR')).toBe('rtl');
      expect(getDirection('Ar')).toBe('rtl');
    });
  });

  describe('isRTL', () => {
    it('should return true for RTL locales', () => {
      expect(isRTL('ar')).toBe(true);
      expect(isRTL('he')).toBe(true);
      expect(isRTL('fa')).toBe(true);
    });

    it('should return false for LTR locales', () => {
      expect(isRTL('en')).toBe(false);
      expect(isRTL('de')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isRTL(null)).toBe(false);
      expect(isRTL(undefined)).toBe(false);
    });
  });

  describe('isLTR', () => {
    it('should return true for LTR locales', () => {
      expect(isLTR('en')).toBe(true);
      expect(isLTR('de')).toBe(true);
    });

    it('should return false for RTL locales', () => {
      expect(isLTR('ar')).toBe(false);
      expect(isLTR('he')).toBe(false);
    });

    it('should return true for null/undefined', () => {
      expect(isLTR(null)).toBe(true);
      expect(isLTR(undefined)).toBe(true);
    });
  });

  describe('wrap', () => {
    it('should wrap text with RTL embedding', () => {
      const result = wrap('مرحبا', 'rtl');
      expect(result).toBe(BIDI_MARKS.RLE + 'مرحبا' + BIDI_MARKS.PDF);
    });

    it('should wrap text with LTR embedding', () => {
      const result = wrap('Hello', 'ltr');
      expect(result).toBe(BIDI_MARKS.LRE + 'Hello' + BIDI_MARKS.PDF);
    });

    it('should accept locale and derive direction', () => {
      const result = wrap('مرحبا', 'ar');
      expect(result).toBe(BIDI_MARKS.RLE + 'مرحبا' + BIDI_MARKS.PDF);
    });

    it('should handle empty/null text', () => {
      expect(wrap('', 'rtl')).toBe('');
      expect(wrap(null, 'rtl')).toBe('');
      expect(wrap(undefined, 'rtl')).toBe('');
    });
  });

  describe('isolate', () => {
    it('should isolate text with RTL isolate', () => {
      const result = isolate('مرحبا', 'rtl');
      expect(result).toBe(BIDI_MARKS.RLI + 'مرحبا' + BIDI_MARKS.PDI);
    });

    it('should isolate text with LTR isolate', () => {
      const result = isolate('Hello', 'ltr');
      expect(result).toBe(BIDI_MARKS.LRI + 'Hello' + BIDI_MARKS.PDI);
    });

    it('should isolate text with auto direction', () => {
      const result = isolate('Hello', 'auto');
      expect(result).toBe(BIDI_MARKS.FSI + 'Hello' + BIDI_MARKS.PDI);
    });

    it('should accept locale and derive direction', () => {
      const result = isolate('שלום', 'he');
      expect(result).toBe(BIDI_MARKS.RLI + 'שלום' + BIDI_MARKS.PDI);
    });

    it('should handle empty/null text', () => {
      expect(isolate('', 'rtl')).toBe('');
      expect(isolate(null, 'rtl')).toBe('');
    });
  });

  describe('mark', () => {
    it('should prepend RTL mark', () => {
      const result = mark('Hello', 'rtl');
      expect(result).toBe(BIDI_MARKS.RLM + 'Hello');
    });

    it('should prepend LTR mark', () => {
      const result = mark('مرحبا', 'ltr');
      expect(result).toBe(BIDI_MARKS.LRM + 'مرحبا');
    });

    it('should handle null/undefined', () => {
      expect(mark(null, 'ltr')).toBe('');
      expect(mark(undefined, 'rtl')).toBe('');
    });
  });

  describe('htmlDir', () => {
    it('should generate dir attribute for RTL', () => {
      expect(htmlDir('ar')).toBe('dir="rtl"');
      expect(htmlDir('he')).toBe('dir="rtl"');
    });

    it('should generate dir attribute for LTR', () => {
      expect(htmlDir('en')).toBe('dir="ltr"');
      expect(htmlDir('de')).toBe('dir="ltr"');
    });
  });

  describe('htmlSpan', () => {
    it('should generate span with direction', () => {
      expect(htmlSpan('Hello', 'en')).toBe('<span dir="ltr">Hello</span>');
      expect(htmlSpan('مرحبا', 'ar')).toBe('<span dir="rtl">مرحبا</span>');
    });

    it('should escape HTML entities', () => {
      expect(htmlSpan('<script>', 'en')).toBe('<span dir="ltr">&lt;script&gt;</span>');
      expect(htmlSpan('a & b', 'en')).toBe('<span dir="ltr">a &amp; b</span>');
    });
  });

  describe('htmlBdi', () => {
    it('should generate bdi element', () => {
      expect(htmlBdi('Hello')).toBe('<bdi>Hello</bdi>');
    });

    it('should generate bdi with direction', () => {
      expect(htmlBdi('מרחבא', 'he')).toBe('<bdi dir="rtl">מרחבא</bdi>');
      expect(htmlBdi('Hello', 'en')).toBe('<bdi dir="ltr">Hello</bdi>');
    });

    it('should escape HTML entities', () => {
      expect(htmlBdi('<test>')).toBe('<bdi>&lt;test&gt;</bdi>');
    });
  });

  describe('cssDirection', () => {
    it('should return CSS direction value', () => {
      expect(cssDirection('ar')).toBe('rtl');
      expect(cssDirection('en')).toBe('ltr');
    });
  });

  describe('cssTextAlign', () => {
    it('should return text-align value', () => {
      expect(cssTextAlign('ar')).toBe('right');
      expect(cssTextAlign('en')).toBe('left');
    });
  });

  describe('detectFromText', () => {
    it('should detect RTL from Arabic text', () => {
      expect(detectFromText('مرحبا')).toBe('rtl');
      expect(detectFromText('العربية')).toBe('rtl');
    });

    it('should detect RTL from Hebrew text', () => {
      expect(detectFromText('שלום')).toBe('rtl');
      expect(detectFromText('עברית')).toBe('rtl');
    });

    it('should detect LTR from Latin text', () => {
      expect(detectFromText('Hello')).toBe('ltr');
      expect(detectFromText('Bonjour')).toBe('ltr');
    });

    it('should return neutral for numbers/punctuation only', () => {
      expect(detectFromText('123')).toBe('neutral');
      expect(detectFromText('...')).toBe('neutral');
      expect(detectFromText(' ')).toBe('neutral');
    });

    it('should return neutral for empty/null', () => {
      expect(detectFromText('')).toBe('neutral');
      expect(detectFromText(null)).toBe('neutral');
      expect(detectFromText(undefined)).toBe('neutral');
    });

    it('should detect based on first strong character', () => {
      expect(detectFromText('123 Hello')).toBe('ltr');
      expect(detectFromText('123 مرحبا')).toBe('rtl');
    });
  });

  describe('stripMarks', () => {
    it('should remove BiDi marks', () => {
      const text = BIDI_MARKS.RLE + 'Hello' + BIDI_MARKS.PDF;
      expect(stripMarks(text)).toBe('Hello');
    });

    it('should remove all mark types', () => {
      let text = BIDI_MARKS.LRM + 'a' + BIDI_MARKS.RLM + 'b' + BIDI_MARKS.LRI + 'c' + BIDI_MARKS.PDI;
      expect(stripMarks(text)).toBe('abc');
    });

    it('should handle null/undefined', () => {
      expect(stripMarks(null)).toBe('');
      expect(stripMarks(undefined)).toBe('');
    });
  });

  describe('containsRTL', () => {
    it('should return true for text with RTL characters', () => {
      expect(containsRTL('Hello مرحبا')).toBe(false); // First strong is LTR
      expect(containsRTL('مرحبا Hello')).toBe(true);
    });

    it('should return false for LTR-only text', () => {
      expect(containsRTL('Hello World')).toBe(false);
    });
  });

  describe('getRTLLanguages', () => {
    it('should return sorted list of RTL languages', () => {
      const languages = getRTLLanguages();
      expect(languages).toContain('ar');
      expect(languages).toContain('he');
      expect(languages).toContain('fa');
      expect(languages).toContain('ur');
      // Should be sorted
      expect(languages).toEqual([...languages].sort());
    });
  });

  describe('isRTLLanguage', () => {
    it('should return true for RTL language codes', () => {
      expect(isRTLLanguage('ar')).toBe(true);
      expect(isRTLLanguage('he')).toBe(true);
      expect(isRTLLanguage('fa')).toBe(true);
    });

    it('should return false for LTR language codes', () => {
      expect(isRTLLanguage('en')).toBe(false);
      expect(isRTLLanguage('de')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isRTLLanguage(null)).toBe(false);
      expect(isRTLLanguage(undefined)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isRTLLanguage('AR')).toBe(true);
      expect(isRTLLanguage('Ar')).toBe(true);
    });
  });
});
