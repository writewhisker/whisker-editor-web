/**
 * Theme Engine
 *
 * Framework-agnostic color scheme engine.
 * Generate palettes, check contrast, ensure WCAG compliance.
 */

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
  return '#' + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Calculate relative luminance (WCAG formula)
 */
export function getLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors (WCAG)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(hexToRgb(color1));
  const lum2 = getLuminance(hexToRgb(color2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA standard (4.5:1 for normal text)
 */
export function meetsWCAG_AA(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA standard (7:1 for normal text)
 */
export function meetsWCAG_AAA(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 7;
}

/**
 * Lighten a color by a percentage
 */
export function lighten(hex: string, percent: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.l = Math.min(100, hsl.l + percent);
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Darken a color by a percentage
 */
export function darken(hex: string, percent: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.l = Math.max(0, hsl.l - percent);
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Adjust saturation of a color
 */
export function saturate(hex: string, percent: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.s = Math.min(100, Math.max(0, hsl.s + percent));
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Generate a complementary color (opposite on color wheel)
 */
export function complementary(hex: string): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.h = (hsl.h + 180) % 360;
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Generate an analogous color scheme
 */
export function analogous(hex: string, angle: number = 30): string[] {
  const hsl = rgbToHsl(hexToRgb(hex));
  return [
    rgbToHex(hslToRgb({ ...hsl, h: (hsl.h - angle + 360) % 360 })),
    hex,
    rgbToHex(hslToRgb({ ...hsl, h: (hsl.h + angle) % 360 })),
  ];
}

/**
 * Generate a triadic color scheme
 */
export function triadic(hex: string): string[] {
  const hsl = rgbToHsl(hexToRgb(hex));
  return [
    hex,
    rgbToHex(hslToRgb({ ...hsl, h: (hsl.h + 120) % 360 })),
    rgbToHex(hslToRgb({ ...hsl, h: (hsl.h + 240) % 360 })),
  ];
}

/**
 * Generate a full color palette from a base color
 */
export function generatePalette(baseColor: string): ColorPalette {
  const complementaryColor = complementary(baseColor);
  const analogousColors = analogous(baseColor);

  return {
    primary: baseColor,
    secondary: analogousColors[2],
    accent: complementaryColor,
    background: '#ffffff',
    foreground: '#000000',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  };
}

/**
 * Generate a dark mode variant of a palette
 */
export function darkMode(palette: ColorPalette): ColorPalette {
  return {
    ...palette,
    background: '#1a1a1a',
    foreground: '#ffffff',
    primary: lighten(palette.primary, 10),
    secondary: lighten(palette.secondary, 10),
  };
}
