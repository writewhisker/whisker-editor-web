/**
 * Bidirectional text support for RTL languages
 */

import type { TextDirection, BiDiMarks } from './types';

/**
 * RTL language codes
 */
const RTL_LANGUAGES: Set<string> = new Set([
  'ar',   // Arabic
  'he',   // Hebrew
  'fa',   // Persian/Farsi
  'ur',   // Urdu
  'yi',   // Yiddish
  'iw',   // Hebrew (old ISO code)
  'ji',   // Yiddish (old ISO code)
  'ps',   // Pashto
  'sd',   // Sindhi
  'ug',   // Uyghur
  'dv',   // Dhivehi
  'ha',   // Hausa (when written in Arabic script)
  'ku',   // Kurdish (when written in Arabic script)
  'ckb',  // Central Kurdish
]);

/**
 * Unicode BiDi control characters
 */
export const BIDI_MARKS: BiDiMarks = {
  // Directional marks
  LRM: '\u200E',  // Left-to-Right Mark
  RLM: '\u200F',  // Right-to-Left Mark

  // Embedding (deprecated in favor of isolates)
  LRE: '\u202A',  // Left-to-Right Embedding
  RLE: '\u202B',  // Right-to-Left Embedding
  PDF: '\u202C',  // Pop Directional Formatting

  // Overrides
  LRO: '\u202D',  // Left-to-Right Override
  RLO: '\u202E',  // Right-to-Left Override

  // Isolates (recommended for modern use)
  LRI: '\u2066',  // Left-to-Right Isolate
  RLI: '\u2067',  // Right-to-Left Isolate
  FSI: '\u2068',  // First Strong Isolate
  PDI: '\u2069',  // Pop Directional Isolate
};

/**
 * Get text direction for locale
 */
export function getDirection(locale: string | null | undefined): TextDirection {
  if (!locale || typeof locale !== 'string') {
    return 'ltr';
  }

  // Extract language code (before hyphen)
  const lang = locale.match(/^([^-]+)/)?.[1]?.toLowerCase();

  if (lang && RTL_LANGUAGES.has(lang)) {
    return 'rtl';
  }

  return 'ltr';
}

/**
 * Check if locale is RTL
 */
export function isRTL(locale: string | null | undefined): boolean {
  return getDirection(locale) === 'rtl';
}

/**
 * Check if locale is LTR
 */
export function isLTR(locale: string | null | undefined): boolean {
  return getDirection(locale) === 'ltr';
}

/**
 * Wrap text with directional embedding markers
 */
export function wrap(text: string | null | undefined, direction: TextDirection | string): string {
  if (!text || text === '') {
    return text || '';
  }

  // If direction is locale code, get actual direction
  let dir: TextDirection = direction as TextDirection;
  if (direction !== 'rtl' && direction !== 'ltr') {
    dir = getDirection(direction);
  }

  if (dir === 'rtl') {
    return BIDI_MARKS.RLE + text + BIDI_MARKS.PDF;
  } else {
    return BIDI_MARKS.LRE + text + BIDI_MARKS.PDF;
  }
}

/**
 * Wrap text with isolation markers (recommended for modern use)
 */
export function isolate(text: string | null | undefined, direction: TextDirection | 'auto' | string): string {
  if (!text || text === '') {
    return text || '';
  }

  let startMark: string;

  if (direction === 'rtl') {
    startMark = BIDI_MARKS.RLI;
  } else if (direction === 'ltr') {
    startMark = BIDI_MARKS.LRI;
  } else if (direction === 'auto') {
    startMark = BIDI_MARKS.FSI;
  } else {
    // Assume it's a locale code
    const dir = getDirection(direction);
    startMark = dir === 'rtl' ? BIDI_MARKS.RLI : BIDI_MARKS.LRI;
  }

  return startMark + text + BIDI_MARKS.PDI;
}

/**
 * Add directional mark before text (for inline use)
 */
export function mark(text: string | null | undefined, direction: TextDirection): string {
  if (!text) {
    return '';
  }

  if (direction === 'rtl') {
    return BIDI_MARKS.RLM + text;
  }

  return BIDI_MARKS.LRM + text;
}

/**
 * Generate HTML dir attribute
 */
export function htmlDir(locale: string): string {
  const direction = getDirection(locale);
  return `dir="${direction}"`;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate HTML span element with direction
 */
export function htmlSpan(text: string, locale: string): string {
  const direction = getDirection(locale);
  const escaped = escapeHtml(text);
  return `<span dir="${direction}">${escaped}</span>`;
}

/**
 * Generate HTML bdi element (bidirectional isolate)
 */
export function htmlBdi(text: string, locale?: string): string {
  const escaped = escapeHtml(text);

  if (locale) {
    const direction = getDirection(locale);
    return `<bdi dir="${direction}">${escaped}</bdi>`;
  }

  return `<bdi>${escaped}</bdi>`;
}

/**
 * Get CSS direction property value
 */
export function cssDirection(locale: string): TextDirection {
  return getDirection(locale);
}

/**
 * Get CSS text-align value for direction
 */
export function cssTextAlign(locale: string): 'left' | 'right' {
  const direction = getDirection(locale);
  return direction === 'rtl' ? 'right' : 'left';
}

/**
 * Detect direction from text content (first strong character)
 */
export function detectFromText(text: string | null | undefined): TextDirection | 'neutral' {
  if (!text || text === '') {
    return 'neutral';
  }

  // Check each character
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // Latin letters (strong LTR)
    if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) {
      return 'ltr';
    }

    // Hebrew range (U+0590-U+05FF)
    if (code >= 0x0590 && code <= 0x05FF) {
      return 'rtl';
    }

    // Arabic range (U+0600-U+06FF)
    if (code >= 0x0600 && code <= 0x06FF) {
      return 'rtl';
    }

    // Arabic Supplement (U+0750-U+077F)
    if (code >= 0x0750 && code <= 0x077F) {
      return 'rtl';
    }

    // Arabic Extended-A (U+08A0-U+08FF)
    if (code >= 0x08A0 && code <= 0x08FF) {
      return 'rtl';
    }

    // Arabic Presentation Forms-A (U+FB50-U+FDFF)
    if (code >= 0xFB50 && code <= 0xFDFF) {
      return 'rtl';
    }

    // Arabic Presentation Forms-B (U+FE70-U+FEFF)
    if (code >= 0xFE70 && code <= 0xFEFF) {
      return 'rtl';
    }
  }

  return 'neutral';
}

/**
 * Strip BiDi control characters from text
 */
export function stripMarks(text: string | null | undefined): string {
  if (!text) {
    return '';
  }

  let result = text;
  for (const markValue of Object.values(BIDI_MARKS)) {
    result = result.split(markValue).join('');
  }

  return result;
}

/**
 * Check if text contains RTL characters
 */
export function containsRTL(text: string | null | undefined): boolean {
  return detectFromText(text) === 'rtl';
}

/**
 * Get list of RTL language codes
 */
export function getRTLLanguages(): string[] {
  return Array.from(RTL_LANGUAGES).sort();
}

/**
 * Check if a language code is RTL
 */
export function isRTLLanguage(lang: string | null | undefined): boolean {
  if (!lang) {
    return false;
  }
  return RTL_LANGUAGES.has(lang.toLowerCase());
}
