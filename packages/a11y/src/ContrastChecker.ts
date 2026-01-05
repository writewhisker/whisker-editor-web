/**
 * Contrast Checker
 * Validates color contrast ratios for WCAG accessibility compliance
 */

import type {
  WCAGLevel,
  TextSize,
  ContrastValidationResult,
  ColorPair,
} from './types';

/**
 * WCAG contrast requirements
 */
const WCAG_REQUIREMENTS: Record<WCAGLevel, Record<TextSize, number>> = {
  AA: { normal: 4.5, large: 3 },
  AAA: { normal: 7, large: 4.5 },
};

/**
 * RGB color tuple
 */
type RGB = [number, number, number];

/**
 * ContrastChecker class
 * Provides color contrast validation for WCAG compliance
 */
export class ContrastChecker {
  constructor() {}

  /**
   * Factory method for DI container
   */
  static create(): ContrastChecker {
    return new ContrastChecker();
  }

  /**
   * Parse a hex color to RGB values
   */
  parseHex(hex: string): RGB {
    // Remove # prefix if present
    hex = hex.replace(/^#/, '');

    // Handle 3-char hex
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return [r, g, b];
  }

  /**
   * Parse an RGB string to values
   */
  parseRgb(rgb: string): RGB {
    const match = rgb.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (!match) {
      throw new Error(`Unable to parse RGB color: ${rgb}`);
    }
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
  }

  /**
   * Parse any color format to RGB
   */
  parseColor(color: string): RGB {
    if (color.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(color) || /^[0-9a-fA-F]{3}$/.test(color)) {
      return this.parseHex(color);
    } else if (color.startsWith('rgb')) {
      return this.parseRgb(color);
    } else {
      throw new Error(`Unable to parse color: ${color}`);
    }
  }

  /**
   * Calculate relative luminance of a color
   * Based on WCAG 2.0 formula
   */
  getLuminance(r: number, g: number, b: number): number {
    const toSrgb = (channel: number): number => {
      const c = channel / 255;
      if (c <= 0.03928) {
        return c / 12.92;
      } else {
        return Math.pow((c + 0.055) / 1.055, 2.4);
      }
    };

    const rs = toSrgb(r);
    const gs = toSrgb(g);
    const bs = toSrgb(b);

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(color1: string, color2: string): number {
    const [r1, g1, b1] = this.parseColor(color1);
    const [r2, g2, b2] = this.parseColor(color2);

    const lum1 = this.getLuminance(r1, g1, b1);
    const lum2 = this.getLuminance(r2, g2, b2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if contrast meets WCAG requirements
   */
  meetsWcag(
    foreground: string,
    background: string,
    level: WCAGLevel = 'AA',
    size: TextSize = 'normal'
  ): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    const required = WCAG_REQUIREMENTS[level][size];
    return ratio >= required;
  }

  /**
   * Get the required contrast ratio for a WCAG level
   */
  getRequiredRatio(level: WCAGLevel = 'AA', size: TextSize = 'normal'): number {
    return WCAG_REQUIREMENTS[level][size];
  }

  /**
   * Validate a color pair and return detailed result
   */
  validate(
    foreground: string,
    background: string,
    level: WCAGLevel = 'AA'
  ): ContrastValidationResult {
    const ratio = this.getContrastRatio(foreground, background);

    return {
      ratio,
      ratioFormatted: `${ratio.toFixed(2)}:1`,
      passesAaNormal: ratio >= WCAG_REQUIREMENTS.AA.normal,
      passesAaLarge: ratio >= WCAG_REQUIREMENTS.AA.large,
      passesAaaNormal: ratio >= WCAG_REQUIREMENTS.AAA.normal,
      passesAaaLarge: ratio >= WCAG_REQUIREMENTS.AAA.large,
      foreground,
      background,
      level,
      passes: ratio >= WCAG_REQUIREMENTS[level].normal,
    };
  }

  /**
   * Suggest a darker or lighter version of a color to improve contrast
   */
  suggestAdjustment(
    color: string,
    background: string,
    targetRatio: number = 4.5
  ): string | null {
    const [r, g, b] = this.parseColor(color);
    const [bgR, bgG, bgB] = this.parseColor(background);
    const bgLum = this.getLuminance(bgR, bgG, bgB);

    // Determine if we need to go lighter or darker
    const colorLum = this.getLuminance(r, g, b);
    const needsDarker = colorLum > bgLum;

    // Iteratively adjust until we meet the target
    for (let step = 1; step <= 255; step++) {
      const factor = needsDarker ? 1 - step / 255 : 1 + step / 255;

      const newR = Math.min(255, Math.max(0, Math.floor(r * factor)));
      const newG = Math.min(255, Math.max(0, Math.floor(g * factor)));
      const newB = Math.min(255, Math.max(0, Math.floor(b * factor)));

      const newColor = `#${newR.toString(16).padStart(2, '0').toUpperCase()}${newG.toString(16).padStart(2, '0').toUpperCase()}${newB.toString(16).padStart(2, '0').toUpperCase()}`;
      const ratio = this.getContrastRatio(newColor, background);

      if (ratio >= targetRatio) {
        return newColor;
      }
    }

    return null;
  }

  /**
   * Get CSS for high contrast mode support
   */
  getHighContrastCss(): string {
    return `@media (forced-colors: active) {
  * {
    background-image: none !important;
  }

  button,
  .choice-button,
  input,
  select,
  textarea {
    border: 2px solid currentColor;
  }

  *:focus {
    outline: 3px solid Highlight;
    outline-offset: 2px;
  }

  a {
    color: LinkText;
    text-decoration: underline;
  }
}

@media (prefers-contrast: more) {
  body {
    color: #000000;
    background: #FFFFFF;
  }

  button,
  .choice-button {
    border-width: 3px;
  }

  *:focus {
    outline-width: 4px;
    outline-offset: 4px;
  }
}

@media (prefers-contrast: less) {
  body {
    color: #333333;
    background: #F5F5F5;
  }
}`;
  }

  /**
   * Validate a list of color pairs
   */
  validateAll(pairs: ColorPair[], level: WCAGLevel = 'AA'): ContrastValidationResult[] {
    return pairs.map((pair) => {
      const result = this.validate(pair.foreground, pair.background, level);
      result.name = pair.name;
      return result;
    });
  }

  /**
   * Get all failing contrast checks
   */
  getFailures(pairs: ColorPair[], level: WCAGLevel = 'AA'): ContrastValidationResult[] {
    return this.validateAll(pairs, level).filter((result) => !result.passes);
  }
}
