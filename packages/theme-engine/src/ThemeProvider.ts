/**
 * Theme Provider (GAP-042)
 * Runtime theme injection and CSS variable management
 */

import { CSS_VARIABLES, type WhiskerTheme } from './variables';

/**
 * Apply theme CSS variables to an HTML element
 * @param theme WhiskerTheme to apply
 * @param root Target element (defaults to document.documentElement if available)
 */
export function applyTheme(theme: WhiskerTheme, root?: HTMLElement): void {
  // Get the root element, defaulting to documentElement in browser environments
  const targetRoot = root ?? (typeof document !== 'undefined' ? document.documentElement : null);

  if (!targetRoot) {
    throw new Error('applyTheme requires a root element or browser document context');
  }

  // Colors
  targetRoot.style.setProperty(CSS_VARIABLES.colorPrimary, theme.colors.primary);
  targetRoot.style.setProperty(CSS_VARIABLES.colorSecondary, theme.colors.secondary);
  targetRoot.style.setProperty(CSS_VARIABLES.colorBackground, theme.colors.background);
  targetRoot.style.setProperty(CSS_VARIABLES.colorSurface, theme.colors.surface);
  targetRoot.style.setProperty(CSS_VARIABLES.colorText, theme.colors.text);
  targetRoot.style.setProperty(CSS_VARIABLES.colorTextMuted, theme.colors.textMuted);
  targetRoot.style.setProperty(CSS_VARIABLES.colorLink, theme.colors.link);
  targetRoot.style.setProperty(CSS_VARIABLES.colorLinkVisited, theme.colors.linkVisited);
  targetRoot.style.setProperty(CSS_VARIABLES.colorError, theme.colors.error);
  targetRoot.style.setProperty(CSS_VARIABLES.colorWarning, theme.colors.warning);
  targetRoot.style.setProperty(CSS_VARIABLES.colorSuccess, theme.colors.success);
  targetRoot.style.setProperty(CSS_VARIABLES.colorInfo, theme.colors.info);

  // Typography
  targetRoot.style.setProperty(CSS_VARIABLES.fontFamily, theme.typography.fontFamily);
  targetRoot.style.setProperty(CSS_VARIABLES.fontFamilyMono, theme.typography.fontFamilyMono);
  targetRoot.style.setProperty(CSS_VARIABLES.fontSizeBase, theme.typography.fontSizeBase);
  targetRoot.style.setProperty(CSS_VARIABLES.fontSizeSm, theme.typography.fontSizeSm);
  targetRoot.style.setProperty(CSS_VARIABLES.fontSizeLg, theme.typography.fontSizeLg);
  targetRoot.style.setProperty(CSS_VARIABLES.fontSizeXl, theme.typography.fontSizeXl);
  targetRoot.style.setProperty(CSS_VARIABLES.lineHeight, theme.typography.lineHeight);

  // Spacing
  targetRoot.style.setProperty(CSS_VARIABLES.spacingXs, theme.spacing.xs);
  targetRoot.style.setProperty(CSS_VARIABLES.spacingSm, theme.spacing.sm);
  targetRoot.style.setProperty(CSS_VARIABLES.spacingMd, theme.spacing.md);
  targetRoot.style.setProperty(CSS_VARIABLES.spacingLg, theme.spacing.lg);
  targetRoot.style.setProperty(CSS_VARIABLES.spacingXl, theme.spacing.xl);

  // Choice/Interactive
  targetRoot.style.setProperty(CSS_VARIABLES.choiceBackground, theme.choice.background);
  targetRoot.style.setProperty(CSS_VARIABLES.choiceText, theme.choice.text);
  targetRoot.style.setProperty(CSS_VARIABLES.choiceHoverBackground, theme.choice.hoverBackground);
  targetRoot.style.setProperty(CSS_VARIABLES.choiceBorderRadius, theme.choice.borderRadius);

  // Animation
  targetRoot.style.setProperty(CSS_VARIABLES.transitionDuration, theme.animation.transitionDuration);
  targetRoot.style.setProperty(CSS_VARIABLES.transitionTiming, theme.animation.transitionTiming);

  // Add theme name as data attribute
  targetRoot.dataset.whiskerTheme = theme.name;
}

/**
 * Generate CSS string from theme
 * Creates a complete :root CSS block with all theme variables
 * @param theme WhiskerTheme to generate CSS for
 * @returns CSS string
 */
export function generateThemeCSS(theme: WhiskerTheme): string {
  return `:root {
  /* Colors */
  ${CSS_VARIABLES.colorPrimary}: ${theme.colors.primary};
  ${CSS_VARIABLES.colorSecondary}: ${theme.colors.secondary};
  ${CSS_VARIABLES.colorBackground}: ${theme.colors.background};
  ${CSS_VARIABLES.colorSurface}: ${theme.colors.surface};
  ${CSS_VARIABLES.colorText}: ${theme.colors.text};
  ${CSS_VARIABLES.colorTextMuted}: ${theme.colors.textMuted};
  ${CSS_VARIABLES.colorLink}: ${theme.colors.link};
  ${CSS_VARIABLES.colorLinkVisited}: ${theme.colors.linkVisited};
  ${CSS_VARIABLES.colorError}: ${theme.colors.error};
  ${CSS_VARIABLES.colorWarning}: ${theme.colors.warning};
  ${CSS_VARIABLES.colorSuccess}: ${theme.colors.success};
  ${CSS_VARIABLES.colorInfo}: ${theme.colors.info};

  /* Typography */
  ${CSS_VARIABLES.fontFamily}: ${theme.typography.fontFamily};
  ${CSS_VARIABLES.fontFamilyMono}: ${theme.typography.fontFamilyMono};
  ${CSS_VARIABLES.fontSizeBase}: ${theme.typography.fontSizeBase};
  ${CSS_VARIABLES.fontSizeSm}: ${theme.typography.fontSizeSm};
  ${CSS_VARIABLES.fontSizeLg}: ${theme.typography.fontSizeLg};
  ${CSS_VARIABLES.fontSizeXl}: ${theme.typography.fontSizeXl};
  ${CSS_VARIABLES.lineHeight}: ${theme.typography.lineHeight};

  /* Spacing */
  ${CSS_VARIABLES.spacingXs}: ${theme.spacing.xs};
  ${CSS_VARIABLES.spacingSm}: ${theme.spacing.sm};
  ${CSS_VARIABLES.spacingMd}: ${theme.spacing.md};
  ${CSS_VARIABLES.spacingLg}: ${theme.spacing.lg};
  ${CSS_VARIABLES.spacingXl}: ${theme.spacing.xl};

  /* Choice/Interactive */
  ${CSS_VARIABLES.choiceBackground}: ${theme.choice.background};
  ${CSS_VARIABLES.choiceText}: ${theme.choice.text};
  ${CSS_VARIABLES.choiceHoverBackground}: ${theme.choice.hoverBackground};
  ${CSS_VARIABLES.choiceBorderRadius}: ${theme.choice.borderRadius};

  /* Animation */
  ${CSS_VARIABLES.transitionDuration}: ${theme.animation.transitionDuration};
  ${CSS_VARIABLES.transitionTiming}: ${theme.animation.transitionTiming};
}

[data-whisker-theme="${theme.name}"] {
  background-color: var(${CSS_VARIABLES.colorBackground});
  color: var(${CSS_VARIABLES.colorText});
  font-family: var(${CSS_VARIABLES.fontFamily});
  font-size: var(${CSS_VARIABLES.fontSizeBase});
  line-height: var(${CSS_VARIABLES.lineHeight});
}`;
}

/**
 * Extract theme values from computed CSS variables
 * @param root Element to read from (defaults to document.documentElement)
 * @returns Partial theme with available values
 */
export function extractTheme(root?: HTMLElement): Partial<WhiskerTheme> {
  const targetRoot = root ?? (typeof document !== 'undefined' ? document.documentElement : null);

  if (!targetRoot || typeof getComputedStyle === 'undefined') {
    return {};
  }

  const styles = getComputedStyle(targetRoot);

  const getVar = (name: string): string => styles.getPropertyValue(name).trim();

  return {
    name: targetRoot.dataset.whiskerTheme,
    colors: {
      primary: getVar(CSS_VARIABLES.colorPrimary),
      secondary: getVar(CSS_VARIABLES.colorSecondary),
      background: getVar(CSS_VARIABLES.colorBackground),
      surface: getVar(CSS_VARIABLES.colorSurface),
      text: getVar(CSS_VARIABLES.colorText),
      textMuted: getVar(CSS_VARIABLES.colorTextMuted),
      link: getVar(CSS_VARIABLES.colorLink),
      linkVisited: getVar(CSS_VARIABLES.colorLinkVisited),
      error: getVar(CSS_VARIABLES.colorError),
      warning: getVar(CSS_VARIABLES.colorWarning),
      success: getVar(CSS_VARIABLES.colorSuccess),
      info: getVar(CSS_VARIABLES.colorInfo),
    },
    typography: {
      fontFamily: getVar(CSS_VARIABLES.fontFamily),
      fontFamilyMono: getVar(CSS_VARIABLES.fontFamilyMono),
      fontSizeBase: getVar(CSS_VARIABLES.fontSizeBase),
      fontSizeSm: getVar(CSS_VARIABLES.fontSizeSm),
      fontSizeLg: getVar(CSS_VARIABLES.fontSizeLg),
      fontSizeXl: getVar(CSS_VARIABLES.fontSizeXl),
      lineHeight: getVar(CSS_VARIABLES.lineHeight),
    },
    spacing: {
      xs: getVar(CSS_VARIABLES.spacingXs),
      sm: getVar(CSS_VARIABLES.spacingSm),
      md: getVar(CSS_VARIABLES.spacingMd),
      lg: getVar(CSS_VARIABLES.spacingLg),
      xl: getVar(CSS_VARIABLES.spacingXl),
    },
    choice: {
      background: getVar(CSS_VARIABLES.choiceBackground),
      text: getVar(CSS_VARIABLES.choiceText),
      hoverBackground: getVar(CSS_VARIABLES.choiceHoverBackground),
      borderRadius: getVar(CSS_VARIABLES.choiceBorderRadius),
    },
    animation: {
      transitionDuration: getVar(CSS_VARIABLES.transitionDuration),
      transitionTiming: getVar(CSS_VARIABLES.transitionTiming),
    },
  };
}

/**
 * Create a partial theme with overrides
 * @param base Base theme to extend
 * @param overrides Partial theme values to override
 * @returns New merged theme
 */
export function createTheme(base: WhiskerTheme, overrides: Partial<WhiskerTheme>): WhiskerTheme {
  return {
    name: overrides.name ?? base.name,
    colors: { ...base.colors, ...overrides.colors },
    typography: { ...base.typography, ...overrides.typography },
    spacing: { ...base.spacing, ...overrides.spacing },
    choice: { ...base.choice, ...overrides.choice },
    animation: { ...base.animation, ...overrides.animation },
  };
}

/**
 * Validate that all required CSS variables are valid names
 * @returns true if all variable names are valid CSS custom property names
 */
export function validateCSSVariables(): boolean {
  const validPattern = /^--[a-zA-Z][a-zA-Z0-9-]*$/;
  return Object.values(CSS_VARIABLES).every(name => validPattern.test(name));
}

/**
 * Get all CSS variable names defined by the theme system
 * @returns Array of all CSS variable names
 */
export function getAllCSSVariableNames(): string[] {
  return Object.values(CSS_VARIABLES);
}
