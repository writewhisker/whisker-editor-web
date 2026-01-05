/**
 * Locale detection and management
 * Based on BCP 47 locale tags and RFC 4647 matching
 */

import type {
  LocaleComponents,
  LocaleConfig,
  PlatformAdapter,
  StorageAdapter,
  LocaleNames,
} from './types';

/**
 * Native locale names for display
 */
const NATIVE_NAMES: LocaleNames = {
  en: 'English',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)',
  es: 'Español',
  'es-ES': 'Español (España)',
  'es-MX': 'Español (México)',
  'es-419': 'Español (Latinoamérica)',
  fr: 'Français',
  'fr-FR': 'Français (France)',
  'fr-CA': 'Français (Canada)',
  de: 'Deutsch',
  'de-DE': 'Deutsch (Deutschland)',
  'de-AT': 'Deutsch (Österreich)',
  'de-CH': 'Deutsch (Schweiz)',
  it: 'Italiano',
  pt: 'Português',
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  nl: 'Nederlands',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  nb: 'Norsk bokmål',
  nn: 'Norsk nynorsk',
  pl: 'Polski',
  ru: 'Русский',
  uk: 'Українська',
  cs: 'Čeština',
  sk: 'Slovenčina',
  sl: 'Slovenščina',
  hr: 'Hrvatski',
  sr: 'Српски',
  bg: 'Български',
  el: 'Ελληνικά',
  hu: 'Magyar',
  ro: 'Română',
  tr: 'Türkçe',
  ar: 'العربية',
  he: 'עברית',
  fa: 'فارسی',
  ur: 'اردو',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  tl: 'Tagalog',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  'zh-CN': '中文（中国大陆）',
  'zh-TW': '中文（台灣）',
  'zh-HK': '中文（香港）',
};

/**
 * Storage key for persisted locale
 */
const STORAGE_KEY = 'whisker.locale';

/**
 * Parse a BCP 47 locale tag into components
 */
export function parseLocale(locale: string): LocaleComponents | null {
  if (!locale || typeof locale !== 'string') {
    return null;
  }

  // Normalize separators: underscore to hyphen
  const normalized = locale.replace(/_/g, '-');

  // BCP 47 pattern: language[-script][-region][-variant...]
  const pattern = /^([a-zA-Z]{2,3})(?:-([a-zA-Z]{4}))?(?:-([a-zA-Z]{2}|\d{3}))?(?:-(.+))?$/;
  const match = normalized.match(pattern);

  if (!match) {
    return null;
  }

  const [, language, script, region, variantStr] = match;

  return {
    language: language.toLowerCase(),
    script: script ? script.charAt(0).toUpperCase() + script.slice(1).toLowerCase() : undefined,
    region: region ? region.toUpperCase() : undefined,
    variants: variantStr ? variantStr.split('-').map((v) => v.toLowerCase()) : [],
  };
}

/**
 * Build a locale tag from components
 */
export function buildLocale(components: LocaleComponents): string {
  const parts: string[] = [components.language.toLowerCase()];

  if (components.script) {
    parts.push(components.script.charAt(0).toUpperCase() + components.script.slice(1).toLowerCase());
  }

  if (components.region) {
    parts.push(components.region.toUpperCase());
  }

  if (components.variants && components.variants.length > 0) {
    parts.push(...components.variants.map((v) => v.toLowerCase()));
  }

  return parts.join('-');
}

/**
 * Normalize a locale tag to BCP 47 format
 */
export function normalizeLocale(locale: string): string {
  const components = parseLocale(locale);
  if (!components) {
    return locale;
  }
  return buildLocale(components);
}

/**
 * Get language code from locale
 */
export function getLanguage(locale: string): string {
  const components = parseLocale(locale);
  return components?.language || locale;
}

/**
 * Get region code from locale
 */
export function getRegion(locale: string): string | undefined {
  const components = parseLocale(locale);
  return components?.region;
}

/**
 * Get script code from locale
 */
export function getScript(locale: string): string | undefined {
  const components = parseLocale(locale);
  return components?.script;
}

/**
 * Check if two locales match (RFC 4647 basic filtering)
 */
export function localesMatch(locale: string, pattern: string): boolean {
  const localeNorm = normalizeLocale(locale).toLowerCase();
  const patternNorm = normalizeLocale(pattern).toLowerCase();

  // Exact match
  if (localeNorm === patternNorm) {
    return true;
  }

  // Pattern is prefix of locale (e.g., "en" matches "en-US")
  if (localeNorm.startsWith(patternNorm + '-')) {
    return true;
  }

  // Locale is prefix of pattern (e.g., "en-US" matches "en")
  if (patternNorm.startsWith(localeNorm + '-')) {
    return true;
  }

  return false;
}

/**
 * Find best matching locale from available list (RFC 4647 lookup)
 */
export function findBestMatch(
  requested: string | string[],
  available: string[],
  defaultLocale?: string
): string | null {
  const requests = Array.isArray(requested) ? requested : [requested];

  for (const req of requests) {
    const reqNorm = normalizeLocale(req);

    // Try exact match first
    const exact = available.find((a) => normalizeLocale(a).toLowerCase() === reqNorm.toLowerCase());
    if (exact) {
      return exact;
    }

    // Try progressively shorter prefixes
    const parts = reqNorm.split('-');
    while (parts.length > 0) {
      const prefix = parts.join('-').toLowerCase();
      const match = available.find((a) => normalizeLocale(a).toLowerCase() === prefix);
      if (match) {
        return match;
      }
      parts.pop();
    }

    // Try if any available locale starts with request language
    const reqLang = getLanguage(req).toLowerCase();
    const langMatch = available.find((a) => getLanguage(a).toLowerCase() === reqLang);
    if (langMatch) {
      return langMatch;
    }
  }

  return defaultLocale || null;
}

/**
 * Get native name for locale
 */
export function getNativeName(locale: string): string {
  // Try exact match
  if (NATIVE_NAMES[locale]) {
    return NATIVE_NAMES[locale];
  }

  // Try normalized
  const normalized = normalizeLocale(locale);
  if (NATIVE_NAMES[normalized]) {
    return NATIVE_NAMES[normalized];
  }

  // Try language only
  const lang = getLanguage(locale);
  if (NATIVE_NAMES[lang]) {
    return NATIVE_NAMES[lang];
  }

  // Return locale as-is
  return locale;
}

/**
 * Get all known native names
 */
export function getAllNativeNames(): LocaleNames {
  return { ...NATIVE_NAMES };
}

/**
 * Browser platform adapter
 */
export class BrowserPlatformAdapter implements PlatformAdapter {
  detect(): string | null {
    if (typeof navigator === 'undefined') {
      return null;
    }

    // Try navigator.languages first (array of preferred languages)
    if (navigator.languages && navigator.languages.length > 0) {
      return normalizeLocale(navigator.languages[0]);
    }

    // Fall back to navigator.language
    if (navigator.language) {
      return normalizeLocale(navigator.language);
    }

    return null;
  }
}

/**
 * LocalStorage adapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string | null): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * In-memory storage adapter (for testing or non-browser environments)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();

  get(key: string): string | null {
    return this.store.get(key) || null;
  }

  set(key: string, value: string | null): void {
    if (value === null) {
      this.store.delete(key);
    } else {
      this.store.set(key, value);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Locale manager class
 */
export class Locale {
  private config: Required<Omit<LocaleConfig, 'storage' | 'onLocaleChange'>> & {
    storage?: StorageAdapter;
    onLocaleChange?: (newLocale: string, oldLocale: string) => void;
  };

  private currentLocale: string;
  private platformAdapter: PlatformAdapter;
  private availableLocales: Set<string> = new Set();

  constructor(config?: LocaleConfig) {
    this.config = {
      defaultLocale: config?.defaultLocale || 'en',
      autoDetect: config?.autoDetect ?? true,
      storage: config?.storage,
      onLocaleChange: config?.onLocaleChange,
    };

    this.platformAdapter = new BrowserPlatformAdapter();
    this.currentLocale = this.config.defaultLocale;

    // Initialize locale
    this.initialize();
  }

  /**
   * Factory method
   */
  static create(config?: LocaleConfig): Locale {
    return new Locale(config);
  }

  /**
   * Initialize locale detection
   */
  private initialize(): void {
    let locale: string | null = null;

    // 1. Try stored preference
    if (this.config.storage) {
      locale = this.config.storage.get(STORAGE_KEY);
    }

    // 2. Try platform detection
    if (!locale && this.config.autoDetect) {
      locale = this.platformAdapter.detect();
    }

    // 3. Fall back to default
    if (!locale) {
      locale = this.config.defaultLocale;
    }

    this.currentLocale = normalizeLocale(locale);
  }

  /**
   * Get current locale
   */
  get(): string {
    return this.currentLocale;
  }

  /**
   * Set current locale
   */
  set(locale: string): void {
    const normalized = normalizeLocale(locale);
    const oldLocale = this.currentLocale;

    if (normalized !== oldLocale) {
      this.currentLocale = normalized;

      // Persist
      if (this.config.storage) {
        this.config.storage.set(STORAGE_KEY, normalized);
      }

      // Notify
      if (this.config.onLocaleChange) {
        this.config.onLocaleChange(normalized, oldLocale);
      }
    }
  }

  /**
   * Clear stored locale preference
   */
  clearPreference(): void {
    if (this.config.storage) {
      this.config.storage.set(STORAGE_KEY, null);
    }
  }

  /**
   * Get language code
   */
  getLanguage(): string {
    return getLanguage(this.currentLocale);
  }

  /**
   * Get region code
   */
  getRegion(): string | undefined {
    return getRegion(this.currentLocale);
  }

  /**
   * Get script code
   */
  getScript(): string | undefined {
    return getScript(this.currentLocale);
  }

  /**
   * Get native name for current locale
   */
  getNativeName(): string {
    return getNativeName(this.currentLocale);
  }

  /**
   * Register available locales
   */
  registerAvailable(locales: string[]): void {
    for (const locale of locales) {
      this.availableLocales.add(normalizeLocale(locale));
    }
  }

  /**
   * Get available locales
   */
  getAvailable(): string[] {
    return Array.from(this.availableLocales).sort();
  }

  /**
   * Check if locale is available
   */
  isAvailable(locale: string): boolean {
    const normalized = normalizeLocale(locale);
    return this.availableLocales.has(normalized);
  }

  /**
   * Find best matching locale from available
   */
  findBestMatch(requested?: string | string[]): string {
    const req = requested || this.platformAdapter.detect() || this.config.defaultLocale;
    const available = this.getAvailable();

    if (available.length === 0) {
      return typeof req === 'string' ? req : req[0];
    }

    return findBestMatch(req, available, this.config.defaultLocale) || this.config.defaultLocale;
  }

  /**
   * Set platform adapter (for testing)
   */
  setPlatformAdapter(adapter: PlatformAdapter): void {
    this.platformAdapter = adapter;
  }

  /**
   * Detect locale from platform
   */
  detectFromPlatform(): string | null {
    return this.platformAdapter.detect();
  }

  /**
   * Parse locale tag
   */
  parse(locale: string): LocaleComponents | null {
    return parseLocale(locale);
  }

  /**
   * Build locale tag from components
   */
  build(components: LocaleComponents): string {
    return buildLocale(components);
  }

  /**
   * Normalize locale tag
   */
  normalize(locale: string): string {
    return normalizeLocale(locale);
  }

  /**
   * Check if two locales match
   */
  matches(locale: string, pattern: string): boolean {
    return localesMatch(locale, pattern);
  }
}
