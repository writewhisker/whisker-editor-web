/**
 * Core types for i18n module
 */

/**
 * Event bus interface for decoupled communication
 */
export interface EventBus {
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (data: unknown) => void): () => void;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Dependencies container for module instantiation
 */
export interface I18nDependencies {
  eventBus?: EventBus;
  logger?: Logger;
}

/**
 * Storage adapter for persistence
 */
export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string | null): void;
}

/**
 * I18n configuration
 */
export interface I18nConfig {
  defaultLocale?: string;
  fallbackLocale?: string;
  loadPath?: string;
  autoDetect?: boolean;
  logMissing?: boolean;
  strictMode?: boolean;
  preload?: string[];
  onMissingTranslation?: (locale: string, key: string, vars?: TranslationVars) => string;
}

/**
 * Translation variables for interpolation
 */
export type TranslationVars = Record<string, string | number | boolean>;

/**
 * Hierarchical translation data
 */
export type TranslationData = {
  [key: string]: string | TranslationData;
};

/**
 * Flattened translation index
 */
export type TranslationIndex = Record<string, string>;

/**
 * Text direction
 */
export type TextDirection = 'ltr' | 'rtl';

/**
 * Plural category (CLDR)
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Plural rule function
 */
export type PluralRule = (n: number) => PluralCategory;

/**
 * Locale components
 */
export interface LocaleComponents {
  language: string;
  script?: string;
  region?: string;
  variants: string[];
}

/**
 * Locale configuration
 */
export interface LocaleConfig {
  defaultLocale?: string;
  autoDetect?: boolean;
  storage?: StorageAdapter;
  onLocaleChange?: (newLocale: string, oldLocale: string) => void;
}

/**
 * Platform detection adapter
 */
export interface PlatformAdapter {
  detect(): string | null;
}

/**
 * String table configuration
 */
export interface StringTableConfig {
  defaultLocale?: string;
  fallbackLocale?: string;
  strictMode?: boolean;
  logMissing?: boolean;
  logger?: Logger;
}

/**
 * String table metadata
 */
export interface StringTableMetadata {
  loadTime: number;
  keyCount: number;
  needsIndex: boolean;
}

/**
 * BiDi marks
 */
export interface BiDiMarks {
  LRM: string;
  RLM: string;
  LRE: string;
  RLE: string;
  PDF: string;
  LRO: string;
  RLO: string;
  LRI: string;
  RLI: string;
  FSI: string;
  PDI: string;
}

/**
 * Native locale names
 */
export type LocaleNames = Record<string, string>;
