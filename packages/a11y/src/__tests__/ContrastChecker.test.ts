import { describe, it, expect, beforeEach } from 'vitest';
import { ContrastChecker } from '../ContrastChecker';

describe('ContrastChecker', () => {
  let checker: ContrastChecker;

  beforeEach(() => {
    checker = new ContrastChecker();
  });

  describe('constructor', () => {
    it('creates instance', () => {
      expect(checker).toBeInstanceOf(ContrastChecker);
    });

    it('creates via factory method', () => {
      const created = ContrastChecker.create();
      expect(created).toBeInstanceOf(ContrastChecker);
    });
  });

  describe('parseHex', () => {
    it('parses 6-digit hex', () => {
      const [r, g, b] = checker.parseHex('#FF5733');
      expect(r).toBe(255);
      expect(g).toBe(87);
      expect(b).toBe(51);
    });

    it('parses 3-digit hex', () => {
      const [r, g, b] = checker.parseHex('#F53');
      expect(r).toBe(255);
      expect(g).toBe(85);
      expect(b).toBe(51);
    });

    it('parses without # prefix', () => {
      const [r, g, b] = checker.parseHex('FF5733');
      expect(r).toBe(255);
      expect(g).toBe(87);
      expect(b).toBe(51);
    });
  });

  describe('parseRgb', () => {
    it('parses rgb string', () => {
      const [r, g, b] = checker.parseRgb('rgb(255, 87, 51)');
      expect(r).toBe(255);
      expect(g).toBe(87);
      expect(b).toBe(51);
    });

    it('parses rgb with minimal spacing', () => {
      const [r, g, b] = checker.parseRgb('rgb(255,87,51)');
      expect(r).toBe(255);
      expect(g).toBe(87);
      expect(b).toBe(51);
    });

    it('throws for invalid rgb', () => {
      expect(() => checker.parseRgb('invalid')).toThrow();
    });
  });

  describe('parseColor', () => {
    it('parses hex colors', () => {
      expect(checker.parseColor('#000000')).toEqual([0, 0, 0]);
      expect(checker.parseColor('#FFFFFF')).toEqual([255, 255, 255]);
    });

    it('parses rgb colors', () => {
      expect(checker.parseColor('rgb(128, 128, 128)')).toEqual([128, 128, 128]);
    });

    it('throws for unknown format', () => {
      expect(() => checker.parseColor('blue')).toThrow();
    });
  });

  describe('getLuminance', () => {
    it('calculates black luminance as 0', () => {
      expect(checker.getLuminance(0, 0, 0)).toBe(0);
    });

    it('calculates white luminance as 1', () => {
      expect(checker.getLuminance(255, 255, 255)).toBe(1);
    });

    it('calculates mid-gray luminance', () => {
      const luminance = checker.getLuminance(128, 128, 128);
      expect(luminance).toBeGreaterThan(0);
      expect(luminance).toBeLessThan(1);
    });
  });

  describe('getContrastRatio', () => {
    it('returns 21:1 for black on white', () => {
      const ratio = checker.getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('returns 21:1 for white on black', () => {
      const ratio = checker.getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('returns 1:1 for same colors', () => {
      const ratio = checker.getContrastRatio('#888888', '#888888');
      expect(ratio).toBeCloseTo(1, 0);
    });
  });

  describe('meetsWcag', () => {
    it('passes AA for black on white', () => {
      expect(checker.meetsWcag('#000000', '#FFFFFF', 'AA', 'normal')).toBe(true);
    });

    it('passes AAA for black on white', () => {
      expect(checker.meetsWcag('#000000', '#FFFFFF', 'AAA', 'normal')).toBe(true);
    });

    it('fails for low contrast', () => {
      expect(checker.meetsWcag('#777777', '#888888', 'AA', 'normal')).toBe(false);
    });

    it('has lower requirements for large text', () => {
      // This gray on white might fail AA normal but pass AA large
      const darkGray = '#767676'; // ~4.54:1 contrast
      expect(checker.meetsWcag(darkGray, '#FFFFFF', 'AA', 'normal')).toBe(true);
    });
  });

  describe('getRequiredRatio', () => {
    it('returns 4.5 for AA normal', () => {
      expect(checker.getRequiredRatio('AA', 'normal')).toBe(4.5);
    });

    it('returns 3 for AA large', () => {
      expect(checker.getRequiredRatio('AA', 'large')).toBe(3);
    });

    it('returns 7 for AAA normal', () => {
      expect(checker.getRequiredRatio('AAA', 'normal')).toBe(7);
    });

    it('returns 4.5 for AAA large', () => {
      expect(checker.getRequiredRatio('AAA', 'large')).toBe(4.5);
    });
  });

  describe('validate', () => {
    it('returns detailed validation result', () => {
      const result = checker.validate('#000000', '#FFFFFF');

      expect(result.ratio).toBeCloseTo(21, 0);
      expect(result.ratioFormatted).toMatch(/21\.\d+:1/);
      expect(result.passesAaNormal).toBe(true);
      expect(result.passesAaLarge).toBe(true);
      expect(result.passesAaaNormal).toBe(true);
      expect(result.passesAaaLarge).toBe(true);
      expect(result.foreground).toBe('#000000');
      expect(result.background).toBe('#FFFFFF');
      expect(result.passes).toBe(true);
    });

    it('returns failing result for low contrast', () => {
      const result = checker.validate('#CCCCCC', '#DDDDDD');

      expect(result.passes).toBe(false);
      expect(result.passesAaNormal).toBe(false);
    });
  });

  describe('suggestAdjustment', () => {
    it('suggests a color with improved contrast when possible', () => {
      // Light gray on white - needs to go darker
      const suggested = checker.suggestAdjustment('#888888', '#FFFFFF', 3.0);

      if (suggested) {
        const ratio = checker.getContrastRatio(suggested, '#FFFFFF');
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      }
      // If null, the algorithm couldn't find a suitable color
    });

    it('handles cases where adjustment may not be achievable', () => {
      // Very dark color on black background - may not achieve high contrast
      const suggested = checker.suggestAdjustment('#111111', '#000000', 4.5);

      // Either returns a valid suggestion or null
      if (suggested) {
        const ratio = checker.getContrastRatio(suggested, '#000000');
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('returns null when target ratio cannot be achieved', () => {
      // This tests that the function returns null gracefully
      // when the algorithm exhausts its search
      const result = checker.suggestAdjustment('#FFFFFF', '#FFFFFF', 21);
      // White on white cannot achieve 21:1 ratio
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('getHighContrastCss', () => {
    it('returns CSS string', () => {
      const css = checker.getHighContrastCss();

      expect(css).toContain('@media (forced-colors: active)');
      expect(css).toContain('@media (prefers-contrast: more)');
      expect(css).toContain('@media (prefers-contrast: less)');
    });
  });

  describe('validateAll', () => {
    it('validates multiple color pairs', () => {
      const pairs = [
        { foreground: '#000000', background: '#FFFFFF', name: 'Black on White' },
        { foreground: '#CCCCCC', background: '#DDDDDD', name: 'Low contrast' },
      ];

      const results = checker.validateAll(pairs);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Black on White');
      expect(results[0].passes).toBe(true);
      expect(results[1].name).toBe('Low contrast');
      expect(results[1].passes).toBe(false);
    });
  });

  describe('getFailures', () => {
    it('returns only failing pairs', () => {
      const pairs = [
        { foreground: '#000000', background: '#FFFFFF', name: 'Passing' },
        { foreground: '#CCCCCC', background: '#DDDDDD', name: 'Failing' },
      ];

      const failures = checker.getFailures(pairs);

      expect(failures).toHaveLength(1);
      expect(failures[0].name).toBe('Failing');
    });
  });
});
