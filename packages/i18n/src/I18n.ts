/**
 * Main I18n class - Translation engine with interpolation and pluralization
 */

import type {
  I18nConfig,
  I18nDependencies,
  TranslationData,
  TranslationVars,
  Logger,
  EventBus,
  TextDirection,
  PluralCategory,
} from './types';

import { StringTable } from './StringTable';
import { Locale, MemoryStorageAdapter } from './Locale';
import { Pluralization, getCategory } from './pluralization';
import { getDirection, isRTL } from './bidi';

/**
 * I18n events
 */
export const I18N_EVENTS = {
  LOCALE_CHANGED: 'i18n:locale:changed',
  TRANSLATIONS_LOADED: 'i18n:translations:loaded',
  MISSING_TRANSLATION: 'i18n:translation:missing',
} as const;

/**
 * Interpolation pattern: {varName} or {varName, type, format}
 */
const INTERPOLATION_PATTERN = /\{([^}]+)\}/g;

/**
 * Plural key suffix pattern: _zero, _one, _two, _few, _many, _other
 */
const PLURAL_SUFFIXES: PluralCategory[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * Main I18n class
 */
export class I18n {
  private config: Required<Omit<I18nConfig, 'onMissingTranslation'>> & {
    onMissingTranslation?: (locale: string, key: string, vars?: TranslationVars) => string;
  };

  private log?: Logger;
  private eventBus?: EventBus;

  private stringTable: StringTable;
  private locale: Locale;
  private pluralization: Pluralization;

  constructor(config?: I18nConfig, deps?: I18nDependencies) {
    this.config = {
      defaultLocale: config?.defaultLocale || 'en',
      fallbackLocale: config?.fallbackLocale,
      loadPath: config?.loadPath || '/locales/{locale}.json',
      autoDetect: config?.autoDetect ?? true,
      logMissing: config?.logMissing ?? false,
      strictMode: config?.strictMode ?? false,
      preload: config?.preload || [],
      onMissingTranslation: config?.onMissingTranslation,
    };

    this.log = deps?.logger;
    this.eventBus = deps?.eventBus;

    // Initialize sub-modules
    this.stringTable = new StringTable({
      defaultLocale: this.config.defaultLocale,
      fallbackLocale: this.config.fallbackLocale,
      logMissing: this.config.logMissing,
      logger: this.log,
    });

    this.locale = new Locale({
      defaultLocale: this.config.defaultLocale,
      autoDetect: this.config.autoDetect,
      storage: new MemoryStorageAdapter(),
      onLocaleChange: (newLocale, oldLocale) => {
        this.emitEvent(I18N_EVENTS.LOCALE_CHANGED, { newLocale, oldLocale });
      },
    });

    this.pluralization = new Pluralization();
  }

  /**
   * Factory method for DI container
   */
  static create(config?: I18nConfig, deps?: I18nDependencies): I18n {
    return new I18n(config, deps);
  }

  /**
   * Emit event through event bus
   */
  private emitEvent(event: string, data: unknown): void {
    if (this.eventBus) {
      this.eventBus.emit(event, data);
    }
  }

  /**
   * Get current locale
   */
  getLocale(): string {
    return this.locale.get();
  }

  /**
   * Set current locale
   */
  setLocale(localeCode: string): void {
    const oldLocale = this.locale.get();
    this.locale.set(localeCode);

    this.log?.info(`Locale changed: ${oldLocale} -> ${localeCode}`);
  }

  /**
   * Get text direction for current or specified locale
   */
  getDirection(localeCode?: string): TextDirection {
    return getDirection(localeCode || this.locale.get());
  }

  /**
   * Check if locale is RTL
   */
  isRTL(localeCode?: string): boolean {
    return isRTL(localeCode || this.locale.get());
  }

  /**
   * Load translations for a locale
   */
  loadTranslations(localeCode: string, data: TranslationData): void {
    this.stringTable.load(localeCode, data);
    this.locale.registerAvailable([localeCode]);

    this.emitEvent(I18N_EVENTS.TRANSLATIONS_LOADED, {
      locale: localeCode,
      keyCount: this.stringTable.getMetadata(localeCode)?.keyCount || 0,
    });

    this.log?.debug(`Loaded translations for ${localeCode}`);
  }

  /**
   * Unload translations for a locale
   */
  unloadTranslations(localeCode: string): void {
    this.stringTable.unload(localeCode);
    this.log?.debug(`Unloaded translations for ${localeCode}`);
  }

  /**
   * Translate a key with optional interpolation
   */
  t(key: string, vars?: TranslationVars): string {
    return this.translate(key, vars);
  }

  /**
   * Translate a key with optional interpolation (full method name)
   */
  translate(key: string, vars?: TranslationVars, localeCode?: string): string {
    const locale = localeCode || this.locale.get();

    // Look up translation
    let text = this.stringTable.lookup(locale, key);

    if (text === null) {
      // Handle missing translation
      return this.handleMissing(locale, key, vars);
    }

    // Interpolate variables
    if (vars) {
      text = this.interpolate(text, vars, locale);
    }

    return text;
  }

  /**
   * Translate with pluralization
   */
  p(key: string, count: number, vars?: TranslationVars): string {
    return this.pluralize(key, count, vars);
  }

  /**
   * Translate with pluralization (full method name)
   */
  pluralize(key: string, count: number, vars?: TranslationVars, localeCode?: string): string {
    const locale = localeCode || this.locale.get();

    // Get plural category
    const category = getCategory(locale, count);

    // Build pluralized key (e.g., "items_one", "items_other")
    const pluralKey = `${key}_${category}`;

    // Try pluralized key first
    let text = this.stringTable.lookup(locale, pluralKey);

    // Fall back to _other
    if (text === null && category !== 'other') {
      text = this.stringTable.lookup(locale, `${key}_other`);
    }

    // Fall back to base key
    if (text === null) {
      text = this.stringTable.lookup(locale, key);
    }

    if (text === null) {
      return this.handleMissing(locale, key, { ...vars, count });
    }

    // Merge count into vars
    const allVars = { count, ...vars };

    // Interpolate
    return this.interpolate(text, allVars, locale);
  }

  /**
   * Check if a translation key exists
   */
  exists(key: string, localeCode?: string): boolean {
    const locale = localeCode || this.locale.get();
    return this.stringTable.has(locale, key);
  }

  /**
   * Get all translation keys for a locale
   */
  getKeys(localeCode?: string): string[] {
    const locale = localeCode || this.locale.get();
    return this.stringTable.getKeys(locale);
  }

  /**
   * Get loaded locales
   */
  getLoadedLocales(): string[] {
    return this.stringTable.getLocales();
  }

  /**
   * Get available locales (registered)
   */
  getAvailableLocales(): string[] {
    return this.locale.getAvailable();
  }

  /**
   * Get missing translations
   */
  getMissingTranslations(localeCode?: string): string[] | Map<string, string[]> {
    if (localeCode) {
      return this.stringTable.getMissing(localeCode) as string[];
    }
    return this.stringTable.getMissing() as Map<string, string[]>;
  }

  /**
   * Clear missing translation tracking
   */
  clearMissingTracking(localeCode?: string): void {
    this.stringTable.clearMissing(localeCode);
  }

  /**
   * Get plural category for count
   */
  getPluralCategory(count: number, localeCode?: string): PluralCategory {
    const locale = localeCode || this.locale.get();
    return getCategory(locale, count);
  }

  /**
   * Get plural categories for locale
   */
  getPluralCategories(localeCode?: string): PluralCategory[] {
    const locale = localeCode || this.locale.get();
    return this.pluralization.getCategoriesForLanguage(locale);
  }

  /**
   * Interpolate variables into text
   */
  private interpolate(text: string, vars: TranslationVars, locale: string): string {
    return text.replace(INTERPOLATION_PATTERN, (match, content) => {
      const parts = content.split(',').map((p: string) => p.trim());
      const varName = parts[0];

      if (!(varName in vars)) {
        return match; // Leave placeholder as-is if var not provided
      }

      const value = vars[varName];

      // Check for formatting options
      if (parts.length > 1) {
        return this.formatValue(value, parts.slice(1), locale);
      }

      return String(value);
    });
  }

  /**
   * Format a value with type and options
   */
  private formatValue(value: string | number | boolean, options: string[], locale: string): string {
    const type = options[0];

    switch (type) {
      case 'number':
        return this.formatNumber(Number(value), options.slice(1), locale);

      case 'date':
        return this.formatDate(value, options.slice(1), locale);

      case 'currency':
        return this.formatCurrency(Number(value), options.slice(1), locale);

      case 'percent':
        return this.formatPercent(Number(value), locale);

      default:
        return String(value);
    }
  }

  /**
   * Format number
   */
  private formatNumber(value: number, options: string[], locale: string): string {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      try {
        const style = options[0] || 'decimal';
        return new Intl.NumberFormat(locale, {
          style: style as 'decimal' | 'percent' | 'currency',
          minimumFractionDigits: options[1] ? parseInt(options[1], 10) : undefined,
          maximumFractionDigits: options[2] ? parseInt(options[2], 10) : undefined,
        }).format(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  /**
   * Format date
   */
  private formatDate(
    value: string | number | boolean,
    options: string[],
    locale: string
  ): string {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      try {
        const date = new Date(String(value));
        const style = options[0] || 'medium';

        const styleMap: Record<string, Intl.DateTimeFormatOptions> = {
          short: { dateStyle: 'short' },
          medium: { dateStyle: 'medium' },
          long: { dateStyle: 'long' },
          full: { dateStyle: 'full' },
        };

        return new Intl.DateTimeFormat(locale, styleMap[style] || styleMap.medium).format(date);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  /**
   * Format currency
   */
  private formatCurrency(value: number, options: string[], locale: string): string {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      try {
        const currency = options[0] || 'USD';
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
        }).format(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  /**
   * Format percent
   */
  private formatPercent(value: number, locale: string): string {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'percent',
        }).format(value);
      } catch {
        return String(value);
      }
    }
    return `${value * 100}%`;
  }

  /**
   * Handle missing translation
   */
  private handleMissing(locale: string, key: string, vars?: TranslationVars): string {
    // Emit event
    this.emitEvent(I18N_EVENTS.MISSING_TRANSLATION, { locale, key, vars });

    // Log if configured
    if (this.config.logMissing && this.log) {
      this.log.warn(`Missing translation: ${locale}:${key}`);
    }

    // Use custom handler if provided
    if (this.config.onMissingTranslation) {
      return this.config.onMissingTranslation(locale, key, vars);
    }

    // Strict mode throws error
    if (this.config.strictMode) {
      throw new Error(`Missing translation: ${locale}:${key}`);
    }

    // Return key as fallback
    return key;
  }

  /**
   * Merge additional translations into a locale
   */
  mergeTranslations(localeCode: string, data: TranslationData, overwrite: boolean = false): void {
    this.stringTable.merge(localeCode, data, overwrite);
    this.log?.debug(`Merged translations for ${localeCode}`);
  }

  /**
   * Clone translations from one locale to another
   */
  cloneTranslations(fromLocale: string, toLocale: string): void {
    this.stringTable.clone(fromLocale, toLocale);
    this.locale.registerAvailable([toLocale]);
    this.log?.debug(`Cloned translations from ${fromLocale} to ${toLocale}`);
  }

  /**
   * Get raw translation data for a locale
   */
  getRawTranslations(localeCode: string): TranslationData | undefined {
    return this.stringTable.getData(localeCode);
  }

  /**
   * Get Locale manager instance
   */
  getLocaleManager(): Locale {
    return this.locale;
  }

  /**
   * Get StringTable instance
   */
  getStringTable(): StringTable {
    return this.stringTable;
  }

  /**
   * Get Pluralization instance
   */
  getPluralization(): Pluralization {
    return this.pluralization;
  }
}
