import { describe, it, expect } from 'vitest';
import * as Module from './index';
import {
  CSS_VARIABLES,
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  generateThemeCSS,
  createTheme,
  validateCSSVariables,
  getAllCSSVariableNames,
  type WhiskerTheme,
} from './index';

describe('@writewhisker/theme-engine', () => {
  describe('module exports', () => {
    it('should export module', () => {
      expect(Module).toBeDefined();
      const exports = Object.keys(Module);
      expect(exports.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GAP-042: Theme CSS Variables Tests
  // ==========================================================================

  describe('CSS Variables (GAP-042)', () => {
    describe('CSS_VARIABLES', () => {
      it('should define all required color variables', () => {
        expect(CSS_VARIABLES.colorPrimary).toBe('--whisker-color-primary');
        expect(CSS_VARIABLES.colorSecondary).toBe('--whisker-color-secondary');
        expect(CSS_VARIABLES.colorBackground).toBe('--whisker-color-background');
        expect(CSS_VARIABLES.colorSurface).toBe('--whisker-color-surface');
        expect(CSS_VARIABLES.colorText).toBe('--whisker-color-text');
        expect(CSS_VARIABLES.colorTextMuted).toBe('--whisker-color-text-muted');
        expect(CSS_VARIABLES.colorLink).toBe('--whisker-color-link');
        expect(CSS_VARIABLES.colorLinkVisited).toBe('--whisker-color-link-visited');
        expect(CSS_VARIABLES.colorError).toBe('--whisker-color-error');
        expect(CSS_VARIABLES.colorWarning).toBe('--whisker-color-warning');
        expect(CSS_VARIABLES.colorSuccess).toBe('--whisker-color-success');
        expect(CSS_VARIABLES.colorInfo).toBe('--whisker-color-info');
      });

      it('should define all required typography variables', () => {
        expect(CSS_VARIABLES.fontFamily).toBe('--whisker-font-family');
        expect(CSS_VARIABLES.fontFamilyMono).toBe('--whisker-font-family-mono');
        expect(CSS_VARIABLES.fontSizeBase).toBe('--whisker-font-size-base');
        expect(CSS_VARIABLES.fontSizeSm).toBe('--whisker-font-size-sm');
        expect(CSS_VARIABLES.fontSizeLg).toBe('--whisker-font-size-lg');
        expect(CSS_VARIABLES.fontSizeXl).toBe('--whisker-font-size-xl');
        expect(CSS_VARIABLES.lineHeight).toBe('--whisker-line-height');
      });

      it('should define all required spacing variables', () => {
        expect(CSS_VARIABLES.spacingXs).toBe('--whisker-spacing-xs');
        expect(CSS_VARIABLES.spacingSm).toBe('--whisker-spacing-sm');
        expect(CSS_VARIABLES.spacingMd).toBe('--whisker-spacing-md');
        expect(CSS_VARIABLES.spacingLg).toBe('--whisker-spacing-lg');
        expect(CSS_VARIABLES.spacingXl).toBe('--whisker-spacing-xl');
      });

      it('should define all required choice variables', () => {
        expect(CSS_VARIABLES.choiceBackground).toBe('--whisker-choice-background');
        expect(CSS_VARIABLES.choiceText).toBe('--whisker-choice-text');
        expect(CSS_VARIABLES.choiceHoverBackground).toBe('--whisker-choice-hover-background');
        expect(CSS_VARIABLES.choiceBorderRadius).toBe('--whisker-choice-border-radius');
      });

      it('should define all required animation variables', () => {
        expect(CSS_VARIABLES.transitionDuration).toBe('--whisker-transition-duration');
        expect(CSS_VARIABLES.transitionTiming).toBe('--whisker-transition-timing');
      });

      it('all variable names should start with --whisker-', () => {
        for (const [, value] of Object.entries(CSS_VARIABLES)) {
          expect(value).toMatch(/^--whisker-/);
        }
      });

      it('should have no duplicate variable names', () => {
        const values = Object.values(CSS_VARIABLES);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
      });
    });

    describe('validateCSSVariables', () => {
      it('should return true for valid CSS custom property names', () => {
        expect(validateCSSVariables()).toBe(true);
      });
    });

    describe('getAllCSSVariableNames', () => {
      it('should return all variable names', () => {
        const names = getAllCSSVariableNames();
        expect(Array.isArray(names)).toBe(true);
        expect(names.length).toBeGreaterThan(25); // At least 30 variables per spec
      });
    });
  });

  describe('Default Themes (GAP-042)', () => {
    describe('DEFAULT_LIGHT_THEME', () => {
      it('should have name whisker-light', () => {
        expect(DEFAULT_LIGHT_THEME.name).toBe('whisker-light');
      });

      it('should have all required color properties', () => {
        expect(DEFAULT_LIGHT_THEME.colors).toBeDefined();
        expect(DEFAULT_LIGHT_THEME.colors.primary).toBeDefined();
        expect(DEFAULT_LIGHT_THEME.colors.secondary).toBeDefined();
        expect(DEFAULT_LIGHT_THEME.colors.background).toBeDefined();
        expect(DEFAULT_LIGHT_THEME.colors.text).toBeDefined();
      });

      it('should have light background color', () => {
        expect(DEFAULT_LIGHT_THEME.colors.background).toBe('#ffffff');
      });
    });

    describe('DEFAULT_DARK_THEME', () => {
      it('should have name whisker-dark', () => {
        expect(DEFAULT_DARK_THEME.name).toBe('whisker-dark');
      });

      it('should have dark background color', () => {
        expect(DEFAULT_DARK_THEME.colors.background).toBe('#111827');
      });

      it('should have light text color', () => {
        expect(DEFAULT_DARK_THEME.colors.text).toBe('#f9fafb');
      });
    });
  });

  describe('Theme Generation (GAP-042)', () => {
    describe('generateThemeCSS', () => {
      it('should produce valid CSS', () => {
        const css = generateThemeCSS(DEFAULT_LIGHT_THEME);
        expect(css).toContain(':root {');
        expect(css).toContain('--whisker-color-primary');
        expect(css).toContain('--whisker-font-family');
      });

      it('should include all variables', () => {
        const css = generateThemeCSS(DEFAULT_LIGHT_THEME);
        const variableNames = getAllCSSVariableNames();
        for (const name of variableNames) {
          expect(css).toContain(name);
        }
      });

      it('should include theme selector', () => {
        const css = generateThemeCSS(DEFAULT_LIGHT_THEME);
        expect(css).toContain('[data-whisker-theme="whisker-light"]');
      });
    });

    describe('createTheme', () => {
      it('should merge overrides with base theme', () => {
        const customTheme = createTheme(DEFAULT_LIGHT_THEME, {
          name: 'custom',
          colors: {
            primary: '#ff0000',
          } as WhiskerTheme['colors'],
        });
        expect(customTheme.name).toBe('custom');
        expect(customTheme.colors.primary).toBe('#ff0000');
        // Other colors should be from base
        expect(customTheme.colors.secondary).toBe(DEFAULT_LIGHT_THEME.colors.secondary);
      });
    });
  });
});
