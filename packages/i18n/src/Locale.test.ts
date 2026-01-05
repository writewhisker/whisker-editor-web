/**
 * Tests for Locale management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
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
  MemoryStorageAdapter,
  BrowserPlatformAdapter,
} from './Locale';
import type { PlatformAdapter } from './types';

describe('Locale parsing', () => {
  describe('parseLocale', () => {
    it('should parse simple language code', () => {
      const result = parseLocale('en');
      expect(result).toEqual({
        language: 'en',
        script: undefined,
        region: undefined,
        variants: [],
      });
    });

    it('should parse language with region', () => {
      const result = parseLocale('en-US');
      expect(result).toEqual({
        language: 'en',
        script: undefined,
        region: 'US',
        variants: [],
      });
    });

    it('should parse language with script', () => {
      const result = parseLocale('zh-Hans');
      expect(result).toEqual({
        language: 'zh',
        script: 'Hans',
        region: undefined,
        variants: [],
      });
    });

    it('should parse language with script and region', () => {
      const result = parseLocale('zh-Hant-TW');
      expect(result).toEqual({
        language: 'zh',
        script: 'Hant',
        region: 'TW',
        variants: [],
      });
    });

    it('should parse with variants', () => {
      const result = parseLocale('de-DE-1996');
      expect(result).toEqual({
        language: 'de',
        script: undefined,
        region: 'DE',
        variants: ['1996'],
      });
    });

    it('should normalize underscores to hyphens', () => {
      const result = parseLocale('en_US');
      expect(result).toEqual({
        language: 'en',
        script: undefined,
        region: 'US',
        variants: [],
      });
    });

    it('should normalize case', () => {
      const result = parseLocale('EN-us');
      expect(result?.language).toBe('en');
      expect(result?.region).toBe('US');
    });

    it('should return null for invalid input', () => {
      expect(parseLocale('')).toBeNull();
      expect(parseLocale(null as unknown as string)).toBeNull();
      expect(parseLocale(undefined as unknown as string)).toBeNull();
    });
  });

  describe('buildLocale', () => {
    it('should build simple language code', () => {
      expect(
        buildLocale({
          language: 'en',
          variants: [],
        })
      ).toBe('en');
    });

    it('should build language with region', () => {
      expect(
        buildLocale({
          language: 'en',
          region: 'US',
          variants: [],
        })
      ).toBe('en-US');
    });

    it('should build language with script', () => {
      expect(
        buildLocale({
          language: 'zh',
          script: 'Hans',
          variants: [],
        })
      ).toBe('zh-Hans');
    });

    it('should build full locale', () => {
      expect(
        buildLocale({
          language: 'zh',
          script: 'Hant',
          region: 'TW',
          variants: [],
        })
      ).toBe('zh-Hant-TW');
    });
  });

  describe('normalizeLocale', () => {
    it('should normalize underscores', () => {
      expect(normalizeLocale('en_US')).toBe('en-US');
    });

    it('should normalize case', () => {
      expect(normalizeLocale('EN-us')).toBe('en-US');
      expect(normalizeLocale('ZH-hans-CN')).toBe('zh-Hans-CN');
    });

    it('should return input for invalid locale', () => {
      expect(normalizeLocale('invalid!!!')).toBe('invalid!!!');
    });
  });

  describe('getLanguage', () => {
    it('should extract language', () => {
      expect(getLanguage('en')).toBe('en');
      expect(getLanguage('en-US')).toBe('en');
      expect(getLanguage('zh-Hans-CN')).toBe('zh');
    });

    it('should return input for unparseable', () => {
      expect(getLanguage('x')).toBe('x');
    });
  });

  describe('getRegion', () => {
    it('should extract region', () => {
      expect(getRegion('en-US')).toBe('US');
      expect(getRegion('zh-Hans-CN')).toBe('CN');
    });

    it('should return undefined if no region', () => {
      expect(getRegion('en')).toBeUndefined();
      expect(getRegion('zh-Hans')).toBeUndefined();
    });
  });

  describe('getScript', () => {
    it('should extract script', () => {
      expect(getScript('zh-Hans')).toBe('Hans');
      expect(getScript('zh-Hant-TW')).toBe('Hant');
    });

    it('should return undefined if no script', () => {
      expect(getScript('en')).toBeUndefined();
      expect(getScript('en-US')).toBeUndefined();
    });
  });
});

describe('Locale matching', () => {
  describe('localesMatch', () => {
    it('should match exact locales', () => {
      expect(localesMatch('en', 'en')).toBe(true);
      expect(localesMatch('en-US', 'en-US')).toBe(true);
    });

    it('should match pattern prefix', () => {
      expect(localesMatch('en-US', 'en')).toBe(true);
      expect(localesMatch('zh-Hans-CN', 'zh')).toBe(true);
      expect(localesMatch('zh-Hans-CN', 'zh-Hans')).toBe(true);
    });

    it('should match locale prefix', () => {
      expect(localesMatch('en', 'en-US')).toBe(true);
    });

    it('should not match unrelated locales', () => {
      expect(localesMatch('en', 'de')).toBe(false);
      expect(localesMatch('en-US', 'en-GB')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(localesMatch('EN-us', 'en-US')).toBe(true);
    });
  });

  describe('findBestMatch', () => {
    const available = ['en', 'en-US', 'en-GB', 'es', 'es-MX', 'fr', 'zh-Hans', 'zh-Hant'];

    it('should find exact match', () => {
      expect(findBestMatch('en-US', available)).toBe('en-US');
      expect(findBestMatch('zh-Hans', available)).toBe('zh-Hans');
    });

    it('should find language fallback', () => {
      expect(findBestMatch('es-AR', available)).toBe('es'); // Falls back to es
      expect(findBestMatch('fr-CA', available)).toBe('fr');
    });

    it('should try multiple requested locales', () => {
      expect(findBestMatch(['de', 'en-US'], available)).toBe('en-US');
      expect(findBestMatch(['de', 'it', 'es'], available)).toBe('es');
    });

    it('should return default if no match', () => {
      expect(findBestMatch('de', available, 'en')).toBe('en');
    });

    it('should return null if no match and no default', () => {
      expect(findBestMatch('de', available)).toBeNull();
    });
  });
});

describe('Native names', () => {
  describe('getNativeName', () => {
    it('should return native name for known locales', () => {
      expect(getNativeName('en')).toBe('English');
      expect(getNativeName('es')).toBe('Español');
      expect(getNativeName('ja')).toBe('日本語');
      expect(getNativeName('zh-Hans')).toBe('简体中文');
    });

    it('should fall back to language name', () => {
      expect(getNativeName('en-AU')).toBe('English (Australia)');
      expect(getNativeName('en-XX')).toBe('English'); // Unknown region falls back
    });

    it('should return locale as-is for unknown', () => {
      expect(getNativeName('unknown')).toBe('unknown');
    });
  });

  describe('getAllNativeNames', () => {
    it('should return all native names', () => {
      const names = getAllNativeNames();
      expect(names.en).toBe('English');
      expect(names.ja).toBe('日本語');
      expect(Object.keys(names).length).toBeGreaterThan(20);
    });
  });
});

describe('Storage adapters', () => {
  describe('MemoryStorageAdapter', () => {
    let storage: MemoryStorageAdapter;

    beforeEach(() => {
      storage = new MemoryStorageAdapter();
    });

    it('should store and retrieve values', () => {
      storage.set('key', 'value');
      expect(storage.get('key')).toBe('value');
    });

    it('should return null for missing keys', () => {
      expect(storage.get('missing')).toBeNull();
    });

    it('should delete on null value', () => {
      storage.set('key', 'value');
      storage.set('key', null);
      expect(storage.get('key')).toBeNull();
    });

    it('should clear all values', () => {
      storage.set('a', '1');
      storage.set('b', '2');
      storage.clear();
      expect(storage.get('a')).toBeNull();
      expect(storage.get('b')).toBeNull();
    });
  });
});

describe('Locale class', () => {
  let locale: Locale;

  beforeEach(() => {
    locale = new Locale({
      defaultLocale: 'en',
      autoDetect: false,
      storage: new MemoryStorageAdapter(),
    });
  });

  describe('get/set', () => {
    it('should get current locale', () => {
      expect(locale.get()).toBe('en');
    });

    it('should set locale', () => {
      locale.set('es');
      expect(locale.get()).toBe('es');
    });

    it('should normalize set locale', () => {
      locale.set('en_US');
      expect(locale.get()).toBe('en-US');
    });
  });

  describe('locale change callback', () => {
    it('should call callback on change', () => {
      const callback = vi.fn();
      const loc = new Locale({
        defaultLocale: 'en',
        autoDetect: false,
        onLocaleChange: callback,
      });

      loc.set('es');

      expect(callback).toHaveBeenCalledWith('es', 'en');
    });

    it('should not call callback if locale unchanged', () => {
      const callback = vi.fn();
      const loc = new Locale({
        defaultLocale: 'en',
        autoDetect: false,
        onLocaleChange: callback,
      });

      loc.set('en'); // Same as default
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getLanguage/getRegion/getScript', () => {
    it('should return components of current locale', () => {
      locale.set('zh-Hans-CN');
      expect(locale.getLanguage()).toBe('zh');
      expect(locale.getRegion()).toBe('CN');
      expect(locale.getScript()).toBe('Hans');
    });
  });

  describe('getNativeName', () => {
    it('should return native name of current locale', () => {
      locale.set('ja');
      expect(locale.getNativeName()).toBe('日本語');
    });
  });

  describe('available locales', () => {
    it('should register available locales', () => {
      locale.registerAvailable(['en', 'es', 'fr']);
      expect(locale.getAvailable()).toEqual(['en', 'es', 'fr']);
    });

    it('should normalize registered locales', () => {
      locale.registerAvailable(['en_US', 'es_MX']);
      expect(locale.getAvailable()).toContain('en-US');
      expect(locale.getAvailable()).toContain('es-MX');
    });

    it('should check availability', () => {
      locale.registerAvailable(['en', 'es']);
      expect(locale.isAvailable('en')).toBe(true);
      expect(locale.isAvailable('de')).toBe(false);
    });
  });

  describe('findBestMatch', () => {
    it('should find best match from available', () => {
      locale.registerAvailable(['en', 'es', 'fr']);
      expect(locale.findBestMatch('es-MX')).toBe('es');
    });

    it('should return default if no available locales', () => {
      const loc = new Locale({ defaultLocale: 'en' });
      expect(loc.findBestMatch('es')).toBe('es');
    });
  });

  describe('platform adapter', () => {
    it('should detect from platform', () => {
      const mockAdapter: PlatformAdapter = {
        detect: vi.fn().mockReturnValue('fr-FR'),
      };

      locale.setPlatformAdapter(mockAdapter);
      expect(locale.detectFromPlatform()).toBe('fr-FR');
    });
  });

  describe('parse/build/normalize', () => {
    it('should expose parsing utilities', () => {
      expect(locale.parse('en-US')).toEqual({
        language: 'en',
        script: undefined,
        region: 'US',
        variants: [],
      });

      expect(
        locale.build({
          language: 'en',
          region: 'GB',
          variants: [],
        })
      ).toBe('en-GB');

      expect(locale.normalize('en_us')).toBe('en-US');
    });
  });

  describe('matches', () => {
    it('should check if locales match', () => {
      expect(locale.matches('en-US', 'en')).toBe(true);
      expect(locale.matches('en-US', 'de')).toBe(false);
    });
  });

  describe('clearPreference', () => {
    it('should clear stored preference', () => {
      const storage = new MemoryStorageAdapter();
      const loc = new Locale({
        defaultLocale: 'en',
        storage,
      });

      loc.set('es'); // This stores 'es'
      loc.clearPreference();

      // Create new instance to check storage
      const loc2 = new Locale({
        defaultLocale: 'en',
        storage,
        autoDetect: false,
      });

      expect(loc2.get()).toBe('en'); // Falls back to default
    });
  });

  describe('Factory method', () => {
    it('should create instance via factory', () => {
      const instance = Locale.create({ defaultLocale: 'ja', autoDetect: false });
      expect(instance).toBeInstanceOf(Locale);
      expect(instance.get()).toBe('ja');
    });
  });

  describe('autoDetect', () => {
    it('should detect from platform when enabled', () => {
      // Mock browser environment
      const originalNavigator = global.navigator;

      Object.defineProperty(global, 'navigator', {
        value: {
          languages: ['fr-FR', 'en-US'],
          language: 'fr-FR',
        },
        writable: true,
        configurable: true,
      });

      const loc = new Locale({
        defaultLocale: 'en',
        autoDetect: true,
        storage: new MemoryStorageAdapter(),
      });

      expect(loc.get()).toBe('fr-FR');

      // Restore
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });
  });
});

describe('BrowserPlatformAdapter', () => {
  const adapter = new BrowserPlatformAdapter();

  it('should return null when navigator not available', () => {
    const original = global.navigator;
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(adapter.detect()).toBeNull();

    Object.defineProperty(global, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('should detect from navigator.languages', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        languages: ['de-DE', 'en-US'],
        language: 'de-DE',
      },
      writable: true,
      configurable: true,
    });

    expect(adapter.detect()).toBe('de-DE');
  });

  it('should fall back to navigator.language', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        languages: [],
        language: 'it-IT',
      },
      writable: true,
      configurable: true,
    });

    expect(adapter.detect()).toBe('it-IT');
  });
});
