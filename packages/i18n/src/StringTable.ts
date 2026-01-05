/**
 * String Table - Translation storage with flattening and fallback chains
 */

import type {
  Logger,
  TranslationData,
  TranslationIndex,
  StringTableConfig,
  StringTableMetadata,
} from './types';

/**
 * StringTable class
 * Core data structure for translation storage and lookup
 */
export class StringTable {
  private config: Required<Omit<StringTableConfig, 'logger'>> & { logger?: Logger };
  private log?: Logger;

  // Hierarchical storage (as loaded)
  private data: Map<string, TranslationData> = new Map();

  // Flattened index for fast lookup
  private index: Map<string, TranslationIndex> = new Map();

  // Missing key tracking
  private missing: Map<string, string[]> = new Map();

  // Metadata
  private metadata: Map<string, StringTableMetadata> = new Map();

  constructor(config?: StringTableConfig) {
    this.config = {
      defaultLocale: config?.defaultLocale || 'en',
      fallbackLocale: config?.fallbackLocale,
      strictMode: config?.strictMode || false,
      logMissing: config?.logMissing || false,
      logger: config?.logger,
    };
    this.log = config?.logger;
  }

  /**
   * Factory method
   */
  static create(config?: StringTableConfig): StringTable {
    return new StringTable(config);
  }

  /**
   * Validate translation data structure
   */
  validateData(data: unknown, seen: WeakSet<object> = new WeakSet()): { valid: boolean; error?: string } {
    if (typeof data !== 'object' || data === null) {
      return { valid: true }; // Non-object values are valid leaf nodes
    }

    // Check for circular reference
    if (seen.has(data as object)) {
      return { valid: false, error: 'Circular reference detected' };
    }
    seen.add(data as object);

    for (const [key, value] of Object.entries(data)) {
      if (typeof key !== 'string' && typeof key !== 'number') {
        return { valid: false, error: `Non-string/number key: ${String(key)}` };
      }

      if (typeof value === 'object' && value !== null) {
        const result = this.validateData(value, seen);
        if (!result.valid) {
          return result;
        }
      }
    }

    return { valid: true };
  }

  /**
   * Load translation data for a locale
   */
  load(locale: string, data: TranslationData, options?: { lazy?: boolean }): void {
    // Validate data
    const validation = this.validateData(data);
    if (!validation.valid) {
      throw new Error(`Invalid translation data for ${locale}: ${validation.error}`);
    }

    // Store hierarchical data
    this.data.set(locale, data);

    if (options?.lazy) {
      // Mark as needing index build
      this.metadata.set(locale, {
        needsIndex: true,
        loadTime: Date.now(),
        keyCount: 0,
      });
    } else {
      // Build flattened index immediately
      const flatIndex = this.flatten(data);
      this.index.set(locale, flatIndex);

      // Store metadata
      this.metadata.set(locale, {
        loadTime: Date.now(),
        keyCount: Object.keys(flatIndex).length,
        needsIndex: false,
      });
    }

    // Initialize missing tracking
    if (!this.missing.has(locale)) {
      this.missing.set(locale, []);
    }
  }

  /**
   * Ensure index exists for locale (for lazy loading)
   */
  private ensureIndex(locale: string): void {
    const meta = this.metadata.get(locale);

    if (meta && meta.needsIndex) {
      const data = this.data.get(locale);
      if (data) {
        const flatIndex = this.flatten(data);
        this.index.set(locale, flatIndex);
        meta.needsIndex = false;
        meta.keyCount = Object.keys(flatIndex).length;
      }
    }
  }

  /**
   * Unload a locale to free memory
   */
  unload(locale: string): void {
    this.data.delete(locale);
    this.index.delete(locale);
    this.metadata.delete(locale);
    this.missing.delete(locale);
  }

  /**
   * Flatten hierarchical table to dot-notation keys
   */
  flatten(data: TranslationData, prefix: string = ''): TranslationIndex {
    const result: TranslationIndex = {};

    for (const [key, value] of Object.entries(data)) {
      const keyStr = String(key);
      const fullKey = prefix === '' ? keyStr : `${prefix}.${keyStr}`;

      if (typeof value === 'object' && value !== null) {
        // Recurse into nested tables
        const nested = this.flatten(value as TranslationData, fullKey);
        Object.assign(result, nested);
      } else if (value !== undefined && value !== null) {
        // Leaf value: store in flattened index
        result[fullKey] = String(value);
      }
    }

    return result;
  }

  /**
   * Build fallback chain for locale
   */
  buildFallbackChain(locale: string): string[] {
    const chain: string[] = [];
    const added = new Set<string>();

    const addIfNew = (loc: string | undefined) => {
      if (loc && !added.has(loc)) {
        chain.push(loc);
        added.add(loc);
      }
    };

    // 1. Try base language (zh-Hant-TW -> zh-Hant -> zh)
    const parts = locale.split('-');
    if (parts.length > 1) {
      // Remove region: zh-Hant-TW -> zh-Hant
      addIfNew(parts.slice(0, -1).join('-'));

      if (parts.length > 2) {
        // Remove script: zh-Hant -> zh
        addIfNew(parts[0]);
      }
    }

    // 2. Try explicit fallback locale
    if (this.config.fallbackLocale && this.config.fallbackLocale !== locale) {
      addIfNew(this.config.fallbackLocale);
    }

    // 3. Try default locale
    if (this.config.defaultLocale && this.config.defaultLocale !== locale) {
      addIfNew(this.config.defaultLocale);
    }

    return chain;
  }

  /**
   * Look up a translation key with fallback chain
   */
  lookup(locale: string, key: string): string | null {
    // Ensure index is built for locale (for lazy loading)
    this.ensureIndex(locale);

    // Fast path: exact match in index
    const localeIndex = this.index.get(locale);
    if (localeIndex && localeIndex[key]) {
      return localeIndex[key];
    }

    // Fallback chain
    const chain = this.buildFallbackChain(locale);
    for (const fallbackLocale of chain) {
      this.ensureIndex(fallbackLocale);
      const fallbackIndex = this.index.get(fallbackLocale);
      if (fallbackIndex && fallbackIndex[key]) {
        return fallbackIndex[key];
      }
    }

    // Not found - track missing
    this.trackMissing(locale, key);
    return null;
  }

  /**
   * Check if a key exists (with fallback chain)
   */
  has(locale: string, key: string): boolean {
    return this.lookup(locale, key) !== null;
  }

  /**
   * Get all keys for a locale
   */
  getKeys(locale: string): string[] {
    this.ensureIndex(locale);

    const index = this.index.get(locale);
    if (!index) {
      return [];
    }

    return Object.keys(index).sort();
  }

  /**
   * Get loaded locales
   */
  getLocales(): string[] {
    return Array.from(this.data.keys()).sort();
  }

  /**
   * Track missing translation key
   */
  private trackMissing(locale: string, key: string): void {
    let missingKeys = this.missing.get(locale);
    if (!missingKeys) {
      missingKeys = [];
      this.missing.set(locale, missingKeys);
    }

    // Avoid duplicates
    if (!missingKeys.includes(key)) {
      missingKeys.push(key);

      // Log if configured
      if (this.config.logMissing && this.log) {
        this.log.warn(`Missing translation: locale=${locale} key=${key}`);
      }
    }
  }

  /**
   * Get missing translations
   */
  getMissing(locale?: string): string[] | Map<string, string[]> {
    if (locale) {
      return this.missing.get(locale) || [];
    }
    return new Map(this.missing);
  }

  /**
   * Clear missing key tracking
   */
  clearMissing(locale?: string): void {
    if (locale) {
      this.missing.set(locale, []);
    } else {
      this.missing.clear();
    }
  }

  /**
   * Get metadata for a locale
   */
  getMetadata(locale: string): StringTableMetadata | undefined {
    return this.metadata.get(locale);
  }

  /**
   * Clone locale data
   */
  clone(fromLocale: string, toLocale: string): void {
    const sourceData = this.data.get(fromLocale);
    if (!sourceData) {
      throw new Error(`Source locale not loaded: ${fromLocale}`);
    }

    // Deep copy
    const copy = JSON.parse(JSON.stringify(sourceData)) as TranslationData;
    this.load(toLocale, copy);
  }

  /**
   * Merge additional data into an existing locale
   */
  merge(locale: string, data: TranslationData, overwrite: boolean = false): void {
    const existingData = this.data.get(locale);

    if (!existingData) {
      // No existing data, just load
      this.load(locale, data);
      return;
    }

    // Deep merge
    const mergeTables = (target: TranslationData, source: TranslationData) => {
      for (const [key, value] of Object.entries(source)) {
        if (typeof value === 'object' && value !== null && typeof target[key] === 'object' && target[key] !== null) {
          mergeTables(target[key] as TranslationData, value as TranslationData);
        } else if (overwrite || target[key] === undefined) {
          target[key] = value;
        }
      }
    };

    mergeTables(existingData, data);

    // Rebuild index
    const flatIndex = this.flatten(existingData);
    this.index.set(locale, flatIndex);

    const meta = this.metadata.get(locale);
    if (meta) {
      meta.keyCount = Object.keys(flatIndex).length;
    }
  }

  /**
   * Get raw hierarchical data for a locale
   */
  getData(locale: string): TranslationData | undefined {
    return this.data.get(locale);
  }

  /**
   * Get flattened index for a locale
   */
  getIndex(locale: string): TranslationIndex | undefined {
    this.ensureIndex(locale);
    return this.index.get(locale);
  }
}
