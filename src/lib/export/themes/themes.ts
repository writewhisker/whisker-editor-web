/**
 * HTML Export Themes
 *
 * Predefined themes for HTML export with customizable color schemes.
 */

export interface HTMLTheme {
  name: string;
  description: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    accentHover: string;
    border: string;
  };
  fonts?: {
    body?: string;
    heading?: string;
  };
  customStyles?: string;
}

/**
 * Built-in themes
 */
export const BUILTIN_THEMES: Record<string, HTMLTheme> = {
  default: {
    name: 'Default',
    description: 'Clean and modern default theme',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f3f4f6',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      border: '#e5e7eb',
    },
  },

  dark: {
    name: 'Dark',
    description: 'Dark theme for low-light reading',
    colors: {
      bgPrimary: '#1f2937',
      bgSecondary: '#111827',
      textPrimary: '#f9fafb',
      textSecondary: '#9ca3af',
      accent: '#60a5fa',
      accentHover: '#3b82f6',
      border: '#374151',
    },
  },

  sepia: {
    name: 'Sepia',
    description: 'Warm sepia tone for comfortable reading',
    colors: {
      bgPrimary: '#f4ecd8',
      bgSecondary: '#e8dcc3',
      textPrimary: '#5c4a37',
      textSecondary: '#8b7355',
      accent: '#a67c52',
      accentHover: '#8b6440',
      border: '#d4c4a8',
    },
  },

  forest: {
    name: 'Forest',
    description: 'Nature-inspired green theme',
    colors: {
      bgPrimary: '#f0f9f4',
      bgSecondary: '#d1f4e0',
      textPrimary: '#1e4d2b',
      textSecondary: '#4a7c59',
      accent: '#22c55e',
      accentHover: '#16a34a',
      border: '#bbf7d0',
    },
  },

  ocean: {
    name: 'Ocean',
    description: 'Calming blue ocean theme',
    colors: {
      bgPrimary: '#eff6ff',
      bgSecondary: '#dbeafe',
      textPrimary: '#1e3a8a',
      textSecondary: '#3b82f6',
      accent: '#0ea5e9',
      accentHover: '#0284c7',
      border: '#bfdbfe',
    },
  },

  midnight: {
    name: 'Midnight',
    description: 'Deep midnight blue theme',
    colors: {
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      textPrimary: '#e2e8f0',
      textSecondary: '#94a3b8',
      accent: '#818cf8',
      accentHover: '#6366f1',
      border: '#334155',
    },
  },

  sunset: {
    name: 'Sunset',
    description: 'Warm sunset colors',
    colors: {
      bgPrimary: '#fff7ed',
      bgSecondary: '#fed7aa',
      textPrimary: '#7c2d12',
      textSecondary: '#c2410c',
      accent: '#f97316',
      accentHover: '#ea580c',
      border: '#fdba74',
    },
  },

  highContrast: {
    name: 'High Contrast',
    description: 'Maximum contrast for accessibility',
    colors: {
      bgPrimary: '#000000',
      bgSecondary: '#1a1a1a',
      textPrimary: '#ffffff',
      textSecondary: '#cccccc',
      accent: '#00ffff',
      accentHover: '#00cccc',
      border: '#ffffff',
    },
  },

  paper: {
    name: 'Paper',
    description: 'Classic paper and ink',
    colors: {
      bgPrimary: '#fefefe',
      bgSecondary: '#f8f8f8',
      textPrimary: '#1a1a1a',
      textSecondary: '#4a4a4a',
      accent: '#2c5aa0',
      accentHover: '#1e4278',
      border: '#dcdcdc',
    },
  },

  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Neon-inspired futuristic theme',
    colors: {
      bgPrimary: '#0a0e27',
      bgSecondary: '#1a1f3a',
      textPrimary: '#00ffff',
      textSecondary: '#ff00ff',
      accent: '#ff00ff',
      accentHover: '#cc00cc',
      border: '#00ffff',
    },
    customStyles: `
      .choice {
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
        border: 1px solid #ff00ff;
      }
      .choice:hover {
        box-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
      }
    `,
  },
};

/**
 * Generate CSS variables for a theme
 */
export function generateThemeCSS(theme: HTMLTheme): string {
  const { colors, fonts } = theme;
  const cssVars: string[] = [];

  // Color variables
  cssVars.push(`--bg-primary: ${colors.bgPrimary};`);
  cssVars.push(`--bg-secondary: ${colors.bgSecondary};`);
  cssVars.push(`--text-primary: ${colors.textPrimary};`);
  cssVars.push(`--text-secondary: ${colors.textSecondary};`);
  cssVars.push(`--accent: ${colors.accent};`);
  cssVars.push(`--accent-hover: ${colors.accentHover};`);
  cssVars.push(`--border: ${colors.border};`);

  // Font variables
  if (fonts?.body) {
    cssVars.push(`--font-body: ${fonts.body};`);
  }
  if (fonts?.heading) {
    cssVars.push(`--font-heading: ${fonts.heading};`);
  }

  return `:root {\n  ${cssVars.join('\n  ')}\n}`;
}

/**
 * Get theme by name or return default
 */
export function getTheme(themeName: string): HTMLTheme {
  return BUILTIN_THEMES[themeName] || BUILTIN_THEMES.default;
}

/**
 * Get list of available themes
 */
export function getAvailableThemes(): Array<{ id: string; name: string; description: string }> {
  return Object.entries(BUILTIN_THEMES).map(([id, theme]) => ({
    id,
    name: theme.name,
    description: theme.description,
  }));
}
