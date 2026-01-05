/**
 * Tests for NumberFormatter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NumberFormatter } from './NumberFormatter';

describe('NumberFormatter', () => {
  let formatter: NumberFormatter;

  beforeEach(() => {
    formatter = NumberFormatter.create('en-US');
  });

  describe('factory method', () => {
    it('creates instance with default locale', () => {
      const f = NumberFormatter.create();
      expect(f.getLocale()).toBe('en');
    });

    it('creates instance with custom locale', () => {
      const f = NumberFormatter.create('de-DE');
      expect(f.getLocale()).toBe('de-DE');
    });
  });

  describe('format', () => {
    it('formats integer', () => {
      const result = formatter.format(1234);
      expect(result).toBe('1,234');
    });

    it('formats decimal', () => {
      const result = formatter.format(1234.56);
      expect(result).toMatch(/1,234\.56/);
    });

    it('formats negative number', () => {
      const result = formatter.format(-1234);
      expect(result).toBe('-1,234');
    });

    it('formats zero', () => {
      const result = formatter.format(0);
      expect(result).toBe('0');
    });
  });

  describe('formatInteger', () => {
    it('removes decimal places', () => {
      const result = formatter.formatInteger(1234.56);
      expect(result).toBe('1,235'); // Rounded
    });
  });

  describe('formatDecimal', () => {
    it('formats with fixed decimal places', () => {
      const result = formatter.formatDecimal(1234.5, 2);
      expect(result).toBe('1,234.50');
    });

    it('formats with default 2 decimal places', () => {
      const result = formatter.formatDecimal(1234);
      expect(result).toBe('1,234.00');
    });
  });

  describe('formatCurrency', () => {
    it('formats USD', () => {
      const result = formatter.formatCurrency(1234.56, 'USD');
      expect(result).toMatch(/\$1,234\.56/);
    });

    it('formats EUR', () => {
      const result = formatter.formatCurrency(1234.56, 'EUR');
      expect(result).toContain('1,234.56');
    });

    it('formats with name display', () => {
      const result = formatter.formatCurrency(1234.56, 'USD', 'name');
      expect(result).toContain('dollar');
    });
  });

  describe('formatPercent', () => {
    it('formats as percent', () => {
      const result = formatter.formatPercent(0.1234);
      expect(result).toBe('12%');
    });

    it('formats with decimal places', () => {
      const result = formatter.formatPercent(0.1234, 2);
      expect(result).toBe('12.34%');
    });
  });

  describe('formatUnit', () => {
    it('formats kilometers', () => {
      const result = formatter.formatUnit(5, 'kilometer');
      expect(result).toMatch(/5\s*km/);
    });

    it('formats with long display', () => {
      const result = formatter.formatUnit(5, 'kilometer', 'long');
      expect(result).toMatch(/5\s*kilometers/);
    });

    it('formats bytes', () => {
      const result = formatter.formatUnit(1024, 'byte');
      expect(result).toBeTruthy();
    });
  });

  describe('formatCompact', () => {
    it('formats thousands', () => {
      const result = formatter.formatCompact(1234);
      expect(result).toMatch(/1\.2K|1K/);
    });

    it('formats millions', () => {
      const result = formatter.formatCompact(1234567);
      expect(result).toMatch(/1\.2M|1M/);
    });

    it('formats billions', () => {
      const result = formatter.formatCompact(1234567890);
      expect(result).toMatch(/1\.2B|1B/);
    });

    it('formats with long display', () => {
      const result = formatter.formatCompact(1234567, 'long');
      expect(result).toMatch(/million/i);
    });
  });

  describe('formatScientific', () => {
    it('formats in scientific notation', () => {
      const result = formatter.formatScientific(1234567);
      expect(result).toMatch(/1\.23.*E.*6/i);
    });
  });

  describe('formatEngineering', () => {
    it('formats in engineering notation', () => {
      const result = formatter.formatEngineering(1234567);
      expect(result).toMatch(/E/i);
    });
  });

  describe('formatSigned', () => {
    it('shows plus for positive', () => {
      const result = formatter.formatSigned(123);
      expect(result).toMatch(/\+123/);
    });

    it('shows minus for negative', () => {
      const result = formatter.formatSigned(-123);
      expect(result).toMatch(/-123/);
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      const result = formatter.formatFileSize(500);
      expect(result).toBeTruthy();
    });

    it('formats kilobytes', () => {
      const result = formatter.formatFileSize(1500);
      expect(result).toMatch(/1\.5|2/);
    });

    it('formats megabytes', () => {
      const result = formatter.formatFileSize(1500000);
      expect(result).toBeTruthy();
    });

    it('formats gigabytes', () => {
      const result = formatter.formatFileSize(1500000000);
      expect(result).toBeTruthy();
    });

    it('handles zero', () => {
      const result = formatter.formatFileSize(0);
      expect(result).toBeTruthy();
    });
  });

  describe('formatDuration', () => {
    it('formats seconds', () => {
      const result = formatter.formatDuration(45);
      expect(result).toMatch(/45\s*sec/i);
    });

    it('formats minutes', () => {
      const result = formatter.formatDuration(120);
      expect(result).toMatch(/2\s*min/i);
    });

    it('formats hours', () => {
      const result = formatter.formatDuration(7200);
      expect(result).toMatch(/2\s*h/i);
    });

    it('formats days', () => {
      const result = formatter.formatDuration(172800);
      expect(result).toMatch(/2\s*day/i);
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

    it('formats 11th', () => {
      const result = formatter.formatOrdinal(11);
      expect(result).toBe('11th');
    });
  });

  describe('formatRange', () => {
    it('formats number range', () => {
      const result = formatter.formatRange(1, 5);
      expect(result).toMatch(/1.*5/);
    });
  });

  describe('parse', () => {
    it('parses formatted number', () => {
      const result = formatter.parse('1,234.56');
      expect(result).toBe(1234.56);
    });

    it('parses integer', () => {
      const result = formatter.parse('1,234');
      expect(result).toBe(1234);
    });

    it('returns null for invalid input', () => {
      const result = formatter.parse('not a number');
      expect(result).toBeNull();
    });
  });

  describe('getDecimalSeparator', () => {
    it('returns decimal separator for en-US', () => {
      const result = formatter.getDecimalSeparator();
      expect(result).toBe('.');
    });

    it('returns comma for de-DE', () => {
      const deFormatter = NumberFormatter.create('de-DE');
      const result = deFormatter.getDecimalSeparator();
      expect(result).toBe(',');
    });
  });

  describe('getGroupingSeparator', () => {
    it('returns grouping separator for en-US', () => {
      const result = formatter.getGroupingSeparator();
      expect(result).toBe(',');
    });

    it('returns period for de-DE', () => {
      const deFormatter = NumberFormatter.create('de-DE');
      const result = deFormatter.getGroupingSeparator();
      expect(result).toBe('.');
    });
  });

  describe('getCurrencySymbol', () => {
    it('returns $ for USD', () => {
      const result = formatter.getCurrencySymbol('USD');
      expect(result).toBe('$');
    });

    it('returns € for EUR', () => {
      const result = formatter.getCurrencySymbol('EUR');
      expect(result).toBe('€');
    });
  });

  describe('locale switching', () => {
    it('changes locale', () => {
      formatter.setLocale('fr-FR');
      expect(formatter.getLocale()).toBe('fr-FR');
    });
  });

  describe('static methods', () => {
    it('checks if NumberFormat is supported', () => {
      expect(NumberFormatter.isSupported()).toBe(true);
    });
  });
});
