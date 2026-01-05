/**
 * @writewhisker/i18n
 * Internationalization support - translations, pluralization, RTL/BiDi, locale detection
 */

// Core types
export type {
  EventBus,
  Logger,
  I18nDependencies,
  StorageAdapter,
  I18nConfig,
  TranslationVars,
  TranslationData,
  TranslationIndex,
  TextDirection,
  PluralCategory,
  PluralRule,
  LocaleComponents,
  LocaleConfig,
  PlatformAdapter,
  StringTableConfig,
  StringTableMetadata,
  BiDiMarks,
  LocaleNames,
} from './types';

// Main I18n class
export { I18n, I18N_EVENTS } from './I18n';

// StringTable
export { StringTable } from './StringTable';

// Locale management
export {
  Locale,
  parseLocale,
  buildLocale,
  normalizeLocale,
  getLanguage,
  getRegion,
  getScript,
  localesMatch,
  findBestMatch,
  getNativeName,
  getAllNativeNames,
  BrowserPlatformAdapter,
  LocalStorageAdapter,
  MemoryStorageAdapter,
} from './Locale';

// Pluralization
export {
  Pluralization,
  getCategory,
  getCategoriesForLanguage,
} from './pluralization';

// BiDi support
export {
  BIDI_MARKS,
  getDirection,
  isRTL,
  isLTR,
  wrap,
  isolate,
  mark,
  htmlDir,
  htmlSpan,
  htmlBdi,
  cssDirection,
  cssTextAlign,
  detectFromText,
  stripMarks,
  containsRTL,
  getRTLLanguages,
  isRTLLanguage,
} from './bidi';

// Import classes for factory function
import { I18n } from './I18n';
import { StringTable } from './StringTable';
import { Locale, MemoryStorageAdapter } from './Locale';
import { Pluralization } from './pluralization';
import type { I18nConfig, I18nDependencies } from './types';

/**
 * Factory function to create a complete i18n system
 */
export function createI18nSystem(
  config?: I18nConfig,
  deps?: I18nDependencies
): {
  i18n: I18n;
  locale: Locale;
  stringTable: StringTable;
  pluralization: Pluralization;
} {
  const i18n = I18n.create(config, deps);

  return {
    i18n,
    locale: i18n.getLocaleManager(),
    stringTable: i18n.getStringTable(),
    pluralization: i18n.getPluralization(),
  };
}

/**
 * Create a standalone StringTable
 */
export function createStringTable(config?: {
  defaultLocale?: string;
  fallbackLocale?: string;
}): StringTable {
  return StringTable.create(config);
}

/**
 * Create a standalone Locale manager
 */
export function createLocale(config?: {
  defaultLocale?: string;
  autoDetect?: boolean;
}): Locale {
  return Locale.create({
    ...config,
    storage: new MemoryStorageAdapter(),
  });
}

/**
 * Create a standalone Pluralization instance
 */
export function createPluralization(): Pluralization {
  return Pluralization.create();
}
