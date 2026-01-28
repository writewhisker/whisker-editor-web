/**
 * WLS CSS Variable Names (GAP-042)
 * Standard CSS custom properties for Whisker themes per WLS spec pres-017
 */

/**
 * Standard WLS CSS variable names
 */
export const CSS_VARIABLES = {
  // Colors
  colorPrimary: '--whisker-color-primary',
  colorSecondary: '--whisker-color-secondary',
  colorBackground: '--whisker-color-background',
  colorSurface: '--whisker-color-surface',
  colorText: '--whisker-color-text',
  colorTextMuted: '--whisker-color-text-muted',
  colorLink: '--whisker-color-link',
  colorLinkVisited: '--whisker-color-link-visited',
  colorError: '--whisker-color-error',
  colorWarning: '--whisker-color-warning',
  colorSuccess: '--whisker-color-success',
  colorInfo: '--whisker-color-info',

  // Typography
  fontFamily: '--whisker-font-family',
  fontFamilyMono: '--whisker-font-family-mono',
  fontSizeBase: '--whisker-font-size-base',
  fontSizeSm: '--whisker-font-size-sm',
  fontSizeLg: '--whisker-font-size-lg',
  fontSizeXl: '--whisker-font-size-xl',
  lineHeight: '--whisker-line-height',

  // Spacing
  spacingXs: '--whisker-spacing-xs',
  spacingSm: '--whisker-spacing-sm',
  spacingMd: '--whisker-spacing-md',
  spacingLg: '--whisker-spacing-lg',
  spacingXl: '--whisker-spacing-xl',

  // Choice/Interactive
  choiceBackground: '--whisker-choice-background',
  choiceText: '--whisker-choice-text',
  choiceHoverBackground: '--whisker-choice-hover-background',
  choiceBorderRadius: '--whisker-choice-border-radius',

  // Animation
  transitionDuration: '--whisker-transition-duration',
  transitionTiming: '--whisker-transition-timing',
} as const;

export type CSSVariableName = typeof CSS_VARIABLES[keyof typeof CSS_VARIABLES];

/**
 * Complete theme definition interface
 */
export interface WhiskerTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    link: string;
    linkVisited: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    fontSizeBase: string;
    fontSizeSm: string;
    fontSizeLg: string;
    fontSizeXl: string;
    lineHeight: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  choice: {
    background: string;
    text: string;
    hoverBackground: string;
    borderRadius: string;
  };
  animation: {
    transitionDuration: string;
    transitionTiming: string;
  };
}

/**
 * Default light theme
 */
export const DEFAULT_LIGHT_THEME: WhiskerTheme = {
  name: 'whisker-light',
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#1f2937',
    textMuted: '#6b7280',
    link: '#2563eb',
    linkVisited: '#7c3aed',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'ui-monospace, monospace',
    fontSizeBase: '1rem',
    fontSizeSm: '0.875rem',
    fontSizeLg: '1.125rem',
    fontSizeXl: '1.25rem',
    lineHeight: '1.5',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  choice: {
    background: '#f3f4f6',
    text: '#1f2937',
    hoverBackground: '#e5e7eb',
    borderRadius: '0.375rem',
  },
  animation: {
    transitionDuration: '200ms',
    transitionTiming: 'ease-in-out',
  },
};

/**
 * Default dark theme
 */
export const DEFAULT_DARK_THEME: WhiskerTheme = {
  name: 'whisker-dark',
  colors: {
    primary: '#60a5fa',
    secondary: '#a78bfa',
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
    textMuted: '#9ca3af',
    link: '#93c5fd',
    linkVisited: '#c4b5fd',
    error: '#f87171',
    warning: '#fbbf24',
    success: '#34d399',
    info: '#60a5fa',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'ui-monospace, monospace',
    fontSizeBase: '1rem',
    fontSizeSm: '0.875rem',
    fontSizeLg: '1.125rem',
    fontSizeXl: '1.25rem',
    lineHeight: '1.5',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  choice: {
    background: '#374151',
    text: '#f9fafb',
    hoverBackground: '#4b5563',
    borderRadius: '0.375rem',
  },
  animation: {
    transitionDuration: '200ms',
    transitionTiming: 'ease-in-out',
  },
};
