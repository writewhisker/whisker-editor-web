/**
 * Tests for DateTimeFormatter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DateTimeFormatter } from './DateTimeFormatter';

describe('DateTimeFormatter', () => {
  let formatter: DateTimeFormatter;
  const testDate = new Date('2024-03-15T14:30:45.123Z');

  beforeEach(() => {
    formatter = DateTimeFormatter.create('en-US');
  });

  describe('factory method', () => {
    it('creates instance with default locale', () => {
      const f = DateTimeFormatter.create();
      expect(f.getLocale()).toBe('en');
    });

    it('creates instance with custom locale', () => {
      const f = DateTimeFormatter.create('fr-FR');
      expect(f.getLocale()).toBe('fr-FR');
    });
  });

  describe('format', () => {
    it('formats date with default style', () => {
      const result = formatter.format(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats date with short style', () => {
      const result = formatter.format(testDate, 'short');
      expect(result).toBeTruthy();
    });

    it('formats date with long style', () => {
      const result = formatter.format(testDate, 'long');
      expect(result).toBeTruthy();
    });

    it('handles number timestamp', () => {
      const result = formatter.format(testDate.getTime());
      expect(result).toBeTruthy();
    });

    it('handles string date', () => {
      const result = formatter.format('2024-03-15');
      expect(result).toBeTruthy();
    });
  });

  describe('formatTime', () => {
    it('formats time with short style', () => {
      const result = formatter.formatTime(testDate, 'short');
      expect(result).toBeTruthy();
    });

    it('formats time with medium style', () => {
      const result = formatter.formatTime(testDate, 'medium');
      expect(result).toBeTruthy();
    });
  });

  describe('formatDateTime', () => {
    it('formats both date and time', () => {
      const result = formatter.formatDateTime(testDate, 'medium', 'short');
      expect(result).toBeTruthy();
    });
  });

  describe('formatPattern', () => {
    it('formats with custom pattern', () => {
      const result = formatter.formatPattern(testDate, 'YYYY-MM-DD');
      expect(result).toBe('2024-03-15');
    });

    it('formats time pattern', () => {
      const result = formatter.formatPattern(testDate, 'HH:mm:ss');
      // Time depends on timezone, just check format
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('formats mixed pattern', () => {
      const result = formatter.formatPattern(testDate, 'YYYY/MM/DD HH:mm');
      expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    });
  });

  describe('formatRelative', () => {
    it('formats past time', () => {
      const past = new Date(Date.now() - 3600000); // 1 hour ago
      const result = formatter.formatRelativeFromNow(past);
      expect(result).toBeTruthy();
    });

    it('formats future time', () => {
      const future = new Date(Date.now() + 86400000); // 1 day from now
      const result = formatter.formatRelativeFromNow(future);
      expect(result).toBeTruthy();
    });

    it('formats relative with custom base', () => {
      const date = new Date('2024-03-15');
      const base = new Date('2024-03-10');
      const result = formatter.formatRelative(date, base);
      expect(result).toBeTruthy();
    });
  });

  describe('formatOrdinal', () => {
    it('formats 1st', () => {
      const result = formatter.formatOrdinal(1);
      expect(result).toBe('1st');
    });

    it('formats 2nd', () => {
      const result = formatter.formatOrdinal(2);
      expect(result).toBe('2nd');
    });

    it('formats 3rd', () => {
      const result = formatter.formatOrdinal(3);
      expect(result).toBe('3rd');
    });

    it('formats 4th', () => {
      const result = formatter.formatOrdinal(4);
      expect(result).toBe('4th');
    });

    it('formats 11th (special case)', () => {
      const result = formatter.formatOrdinal(11);
      expect(result).toBe('11th');
    });

    it('formats 21st', () => {
      const result = formatter.formatOrdinal(21);
      expect(result).toBe('21st');
    });
  });

  describe('getDayName', () => {
    it('gets long day name', () => {
      const result = formatter.getDayName(testDate, 'long');
      expect(result).toBeTruthy();
    });

    it('gets short day name', () => {
      const result = formatter.getDayName(testDate, 'short');
      expect(result).toBeTruthy();
    });
  });

  describe('getMonthName', () => {
    it('gets long month name', () => {
      const result = formatter.getMonthName(testDate, 'long');
      expect(result).toBeTruthy();
    });

    it('gets short month name', () => {
      const result = formatter.getMonthName(testDate, 'short');
      expect(result).toBeTruthy();
    });
  });

  describe('locale switching', () => {
    it('changes locale', () => {
      formatter.setLocale('de-DE');
      expect(formatter.getLocale()).toBe('de-DE');
    });
  });

  describe('static methods', () => {
    it('checks if DateTimeFormat is supported', () => {
      expect(typeof DateTimeFormatter.isSupported()).toBe('boolean');
    });

    it('checks if RelativeTimeFormat is supported', () => {
      expect(typeof DateTimeFormatter.isRelativeTimeSupported()).toBe('boolean');
    });
  });

  describe('invalid input handling', () => {
    it('handles invalid date string', () => {
      const result = formatter.format('not-a-date');
      expect(result).toBe('not-a-date');
    });
  });
});
