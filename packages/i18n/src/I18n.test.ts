/**
 * Tests for main I18n class
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18n, I18N_EVENTS } from './I18n';
import type { Logger, EventBus } from './types';

describe('I18n', () => {
  let i18n: I18n;

  beforeEach(() => {
    i18n = new I18n({ autoDetect: false });
  });

  describe('constructor', () => {
    it('should use default config', () => {
      expect(i18n.getLocale()).toBe('en');
    });

    it('should accept custom config', () => {
      const custom = new I18n({
        defaultLocale: 'fr',
        autoDetect: false,
      });
      expect(custom.getLocale()).toBe('fr');
    });
  });

  describe('locale management', () => {
    it('should get current locale', () => {
      expect(i18n.getLocale()).toBe('en');
    });

    it('should set locale', () => {
      i18n.setLocale('es');
      expect(i18n.getLocale()).toBe('es');
    });

    it('should emit event on locale change', () => {
      const mockEventBus: EventBus = {
        emit: vi.fn(),
        on: vi.fn(() => () => {}),
      };

      const instance = new I18n({ autoDetect: false }, { eventBus: mockEventBus });
      instance.setLocale('de');

      expect(mockEventBus.emit).toHaveBeenCalledWith(I18N_EVENTS.LOCALE_CHANGED, {
        newLocale: 'de',
        oldLocale: 'en',
      });
    });
  });

  describe('direction', () => {
    it('should get direction for current locale', () => {
      expect(i18n.getDirection()).toBe('ltr');
    });

    it('should get direction for specific locale', () => {
      expect(i18n.getDirection('ar')).toBe('rtl');
      expect(i18n.getDirection('en')).toBe('ltr');
    });

    it('should check if RTL', () => {
      expect(i18n.isRTL()).toBe(false);
      expect(i18n.isRTL('ar')).toBe(true);
    });
  });

  describe('loadTranslations', () => {
    it('should load translation data', () => {
      i18n.loadTranslations('en', {
        hello: 'Hello',
        world: 'World',
      });

      expect(i18n.translate('hello')).toBe('Hello');
      expect(i18n.translate('world')).toBe('World');
    });

    it('should emit event on load', () => {
      const mockEventBus: EventBus = {
        emit: vi.fn(),
        on: vi.fn(() => () => {}),
      };

      const instance = new I18n({}, { eventBus: mockEventBus });
      instance.loadTranslations('en', { hello: 'Hello' });

      expect(mockEventBus.emit).toHaveBeenCalledWith(I18N_EVENTS.TRANSLATIONS_LOADED, {
        locale: 'en',
        keyCount: 1,
      });
    });

    it('should register locale as available', () => {
      i18n.loadTranslations('de', { hello: 'Hallo' });
      expect(i18n.getAvailableLocales()).toContain('de');
    });
  });

  describe('translate (t)', () => {
    beforeEach(() => {
      i18n.loadTranslations('en', {
        simple: 'Hello',
        greeting: 'Hello, {name}!',
        complex: 'You have {count} new {type}.',
      });
    });

    it('should translate simple key', () => {
      expect(i18n.t('simple')).toBe('Hello');
      expect(i18n.translate('simple')).toBe('Hello');
    });

    it('should interpolate variables', () => {
      expect(i18n.t('greeting', { name: 'World' })).toBe('Hello, World!');
    });

    it('should interpolate multiple variables', () => {
      expect(i18n.t('complex', { count: 5, type: 'messages' })).toBe(
        'You have 5 new messages.'
      );
    });

    it('should leave placeholder if variable not provided', () => {
      expect(i18n.t('greeting', {})).toBe('Hello, {name}!');
    });

    it('should return key for missing translation', () => {
      expect(i18n.t('missing')).toBe('missing');
    });

    it('should use custom missing handler', () => {
      const instance = new I18n({
        autoDetect: false,
        onMissingTranslation: (locale, key) => `[${locale}:${key}]`,
      });

      expect(instance.t('missing')).toBe('[en:missing]');
    });

    it('should throw in strict mode', () => {
      const instance = new I18n({ strictMode: true, autoDetect: false });
      expect(() => instance.t('missing')).toThrow('Missing translation');
    });

    it('should translate for specific locale', () => {
      i18n.loadTranslations('es', { simple: 'Hola' });
      expect(i18n.translate('simple', undefined, 'es')).toBe('Hola');
    });
  });

  describe('pluralize (p)', () => {
    beforeEach(() => {
      i18n.loadTranslations('en', {
        items_one: 'You have {count} item',
        items_other: 'You have {count} items',
        messages_zero: 'No messages',
        messages_one: 'One message',
        messages_other: '{count} messages',
      });
    });

    it('should pluralize with "one" form', () => {
      expect(i18n.p('items', 1)).toBe('You have 1 item');
    });

    it('should pluralize with "other" form', () => {
      expect(i18n.p('items', 5)).toBe('You have 5 items');
    });

    it('should pluralize with "zero" form', () => {
      // English doesn't have zero, falls back to other
      expect(i18n.p('messages', 0)).toBe('0 messages');
    });

    it('should merge count into vars', () => {
      i18n.loadTranslations('en', {
        file_one: '{count} file in {folder}',
        file_other: '{count} files in {folder}',
      });

      expect(i18n.p('file', 1, { folder: 'Documents' })).toBe(
        '1 file in Documents'
      );
      expect(i18n.p('file', 5, { folder: 'Downloads' })).toBe(
        '5 files in Downloads'
      );
    });

    it('should fall back to _other if specific form missing', () => {
      i18n.loadTranslations('en', {
        thing_other: '{count} things',
      });

      expect(i18n.p('thing', 1)).toBe('1 things'); // Falls back
      expect(i18n.p('thing', 5)).toBe('5 things');
    });

    it('should fall back to base key if no plural forms', () => {
      i18n.loadTranslations('en', {
        simple: '{count} simple',
      });

      expect(i18n.p('simple', 1)).toBe('1 simple');
    });
  });

  describe('exists', () => {
    beforeEach(() => {
      i18n.loadTranslations('en', { hello: 'Hello' });
    });

    it('should return true for existing key', () => {
      expect(i18n.exists('hello')).toBe(true);
    });

    it('should return false for missing key', () => {
      expect(i18n.exists('missing')).toBe(false);
    });

    it('should check specific locale', () => {
      i18n.loadTranslations('es', { hola: 'Hola' });
      expect(i18n.exists('hola', 'es')).toBe(true);
      expect(i18n.exists('hola', 'en')).toBe(false);
    });
  });

  describe('getKeys', () => {
    it('should return all keys for current locale', () => {
      i18n.loadTranslations('en', {
        a: '1',
        b: '2',
        nested: { c: '3' },
      });

      const keys = i18n.getKeys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('nested.c');
    });
  });

  describe('getLoadedLocales', () => {
    it('should return loaded locales', () => {
      i18n.loadTranslations('en', { a: '1' });
      i18n.loadTranslations('es', { a: '2' });

      const locales = i18n.getLoadedLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('es');
    });
  });

  describe('getMissingTranslations', () => {
    it('should track missing translations', () => {
      i18n.loadTranslations('en', { hello: 'Hello' });
      i18n.t('missing1');
      i18n.t('missing2');

      const missing = i18n.getMissingTranslations('en');
      expect(missing).toContain('missing1');
      expect(missing).toContain('missing2');
    });

    it('should clear missing tracking', () => {
      i18n.loadTranslations('en', { hello: 'Hello' });
      i18n.t('missing');
      i18n.clearMissingTracking('en');

      const missing = i18n.getMissingTranslations('en');
      expect(missing).toEqual([]);
    });
  });

  describe('formatters', () => {
    beforeEach(() => {
      i18n.loadTranslations('en', {
        num: 'Value: {value, number}',
        currency: 'Price: {price, currency, USD}',
        date: 'Date: {date, date, short}',
        percent: 'Rate: {rate, percent}',
      });
    });

    it('should format numbers', () => {
      const result = i18n.t('num', { value: 1234.56 });
      expect(result).toMatch(/1.*234/); // Contains formatted number
    });

    it('should format currency', () => {
      const result = i18n.t('currency', { price: 99.99 });
      expect(result).toMatch(/\$|USD/); // Contains currency symbol
    });

    it('should format dates', () => {
      const result = i18n.t('date', { date: '2024-01-15' });
      // The date may vary by timezone, just check it contains some date parts
      expect(result).toMatch(/Date:.*\d+/); // Contains date with numbers
    });

    it('should format percentages', () => {
      const result = i18n.t('percent', { rate: 0.5 });
      expect(result).toMatch(/50.*%/); // Contains percentage
    });
  });

  describe('mergeTranslations', () => {
    it('should merge additional translations', () => {
      i18n.loadTranslations('en', { a: '1' });
      i18n.mergeTranslations('en', { b: '2' });

      expect(i18n.t('a')).toBe('1');
      expect(i18n.t('b')).toBe('2');
    });

    it('should not overwrite by default', () => {
      i18n.loadTranslations('en', { a: 'original' });
      i18n.mergeTranslations('en', { a: 'new' });

      expect(i18n.t('a')).toBe('original');
    });

    it('should overwrite when specified', () => {
      i18n.loadTranslations('en', { a: 'original' });
      i18n.mergeTranslations('en', { a: 'new' }, true);

      expect(i18n.t('a')).toBe('new');
    });
  });

  describe('cloneTranslations', () => {
    it('should clone translations to new locale', () => {
      i18n.loadTranslations('en', { hello: 'Hello' });
      i18n.cloneTranslations('en', 'en-GB');

      expect(i18n.translate('hello', undefined, 'en-GB')).toBe('Hello');
      expect(i18n.getAvailableLocales()).toContain('en-GB');
    });
  });

  describe('getRawTranslations', () => {
    it('should return raw translation data', () => {
      i18n.loadTranslations('en', {
        nested: { key: 'value' },
      });

      const raw = i18n.getRawTranslations('en');
      expect(raw).toEqual({
        nested: { key: 'value' },
      });
    });
  });

  describe('getPluralCategory', () => {
    it('should return plural category for count', () => {
      expect(i18n.getPluralCategory(1)).toBe('one');
      expect(i18n.getPluralCategory(0)).toBe('other');
      expect(i18n.getPluralCategory(5)).toBe('other');
    });

    it('should work for specific locale', () => {
      expect(i18n.getPluralCategory(2, 'ru')).toBe('few');
      expect(i18n.getPluralCategory(5, 'ru')).toBe('many');
    });
  });

  describe('getPluralCategories', () => {
    it('should return categories for current locale', () => {
      expect(i18n.getPluralCategories()).toEqual(['one', 'other']);
    });

    it('should return categories for specific locale', () => {
      expect(i18n.getPluralCategories('ru')).toEqual(['one', 'few', 'many']);
      expect(i18n.getPluralCategories('ar')).toEqual([
        'zero',
        'one',
        'two',
        'few',
        'many',
        'other',
      ]);
    });
  });

  describe('sub-module access', () => {
    it('should expose locale manager', () => {
      const manager = i18n.getLocaleManager();
      expect(manager).toBeDefined();
      expect(manager.get()).toBe('en');
    });

    it('should expose string table', () => {
      const table = i18n.getStringTable();
      expect(table).toBeDefined();
    });

    it('should expose pluralization', () => {
      const plural = i18n.getPluralization();
      expect(plural).toBeDefined();
      expect(plural.getCategory('en', 1)).toBe('one');
    });
  });

  describe('logging', () => {
    it('should log missing translations when configured', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const instance = new I18n(
        { logMissing: true, autoDetect: false },
        { logger: mockLogger }
      );

      instance.t('missing');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing translation')
      );
    });
  });

  describe('Factory method', () => {
    it('should create instance via factory', () => {
      const instance = I18n.create({ defaultLocale: 'de', autoDetect: false });
      expect(instance).toBeInstanceOf(I18n);
      expect(instance.getLocale()).toBe('de');
    });
  });
});

describe('I18N_EVENTS', () => {
  it('should export event constants', () => {
    expect(I18N_EVENTS.LOCALE_CHANGED).toBe('i18n:locale:changed');
    expect(I18N_EVENTS.TRANSLATIONS_LOADED).toBe('i18n:translations:loaded');
    expect(I18N_EVENTS.MISSING_TRANSLATION).toBe('i18n:translation:missing');
  });
});
