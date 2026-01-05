/**
 * Tests for main exports and factory functions
 */

import { describe, it, expect } from 'vitest';
import {
  // Factory functions
  createI18nSystem,
  createStringTable,
  createLocale,
  createPluralization,
  // Classes
  I18n,
  StringTable,
  Locale,
  Pluralization,
  // Functions
  getDirection,
  isRTL,
  getCategory,
  normalizeLocale,
  getNativeName,
  // Constants
  I18N_EVENTS,
  BIDI_MARKS,
} from './index';

describe('Main exports', () => {
  describe('createI18nSystem', () => {
    it('should create complete i18n system', () => {
      const system = createI18nSystem();

      expect(system.i18n).toBeInstanceOf(I18n);
      expect(system.locale).toBeInstanceOf(Locale);
      expect(system.stringTable).toBeInstanceOf(StringTable);
      expect(system.pluralization).toBeInstanceOf(Pluralization);
    });

    it('should configure with custom options', () => {
      const system = createI18nSystem({
        defaultLocale: 'de',
        fallbackLocale: 'en',
        autoDetect: false,
      });

      expect(system.i18n.getLocale()).toBe('de');
    });

    it('should share state between components', () => {
      const system = createI18nSystem();

      system.stringTable.load('en', { hello: 'Hello' });
      expect(system.i18n.translate('hello')).toBe('Hello');
    });
  });

  describe('createStringTable', () => {
    it('should create standalone StringTable', () => {
      const table = createStringTable({
        defaultLocale: 'en',
        fallbackLocale: 'en',
      });

      expect(table).toBeInstanceOf(StringTable);

      table.load('en', { test: 'Test' });
      expect(table.lookup('en', 'test')).toBe('Test');
    });
  });

  describe('createLocale', () => {
    it('should create standalone Locale manager', () => {
      const locale = createLocale({
        defaultLocale: 'ja',
        autoDetect: false,
      });

      expect(locale).toBeInstanceOf(Locale);
      expect(locale.get()).toBe('ja');
    });
  });

  describe('createPluralization', () => {
    it('should create standalone Pluralization', () => {
      const plural = createPluralization();

      expect(plural).toBeInstanceOf(Pluralization);
      expect(plural.getCategory('en', 1)).toBe('one');
    });
  });
});

describe('Class exports', () => {
  it('should export I18n class', () => {
    const instance = new I18n();
    expect(instance).toBeInstanceOf(I18n);
  });

  it('should export StringTable class', () => {
    const instance = new StringTable();
    expect(instance).toBeInstanceOf(StringTable);
  });

  it('should export Locale class', () => {
    const instance = new Locale();
    expect(instance).toBeInstanceOf(Locale);
  });

  it('should export Pluralization class', () => {
    const instance = new Pluralization();
    expect(instance).toBeInstanceOf(Pluralization);
  });
});

describe('Function exports', () => {
  describe('BiDi functions', () => {
    it('should export getDirection', () => {
      expect(getDirection('ar')).toBe('rtl');
      expect(getDirection('en')).toBe('ltr');
    });

    it('should export isRTL', () => {
      expect(isRTL('ar')).toBe(true);
      expect(isRTL('en')).toBe(false);
    });
  });

  describe('Pluralization functions', () => {
    it('should export getCategory', () => {
      expect(getCategory('en', 1)).toBe('one');
      expect(getCategory('en', 2)).toBe('other');
    });
  });

  describe('Locale functions', () => {
    it('should export normalizeLocale', () => {
      expect(normalizeLocale('en_US')).toBe('en-US');
    });

    it('should export getNativeName', () => {
      expect(getNativeName('en')).toBe('English');
      expect(getNativeName('ja')).toBe('日本語');
    });
  });
});

describe('Constant exports', () => {
  it('should export I18N_EVENTS', () => {
    expect(I18N_EVENTS.LOCALE_CHANGED).toBeDefined();
    expect(I18N_EVENTS.TRANSLATIONS_LOADED).toBeDefined();
    expect(I18N_EVENTS.MISSING_TRANSLATION).toBeDefined();
  });

  it('should export BIDI_MARKS', () => {
    expect(BIDI_MARKS.LRM).toBeDefined();
    expect(BIDI_MARKS.RLM).toBeDefined();
    expect(BIDI_MARKS.LRI).toBeDefined();
    expect(BIDI_MARKS.RLI).toBeDefined();
  });
});

describe('Integration scenarios', () => {
  it('should handle complete translation workflow', () => {
    const { i18n } = createI18nSystem({
      defaultLocale: 'en',
      autoDetect: false,
    });

    // Load translations
    i18n.loadTranslations('en', {
      greeting: 'Hello, {name}!',
      items_one: 'You have {count} item',
      items_other: 'You have {count} items',
    });

    i18n.loadTranslations('es', {
      greeting: '¡Hola, {name}!',
      items_one: 'Tienes {count} artículo',
      items_other: 'Tienes {count} artículos',
    });

    // Test English
    expect(i18n.t('greeting', { name: 'World' })).toBe('Hello, World!');
    expect(i18n.p('items', 1)).toBe('You have 1 item');
    expect(i18n.p('items', 5)).toBe('You have 5 items');

    // Switch to Spanish
    i18n.setLocale('es');
    expect(i18n.t('greeting', { name: 'Mundo' })).toBe('¡Hola, Mundo!');
    expect(i18n.p('items', 1)).toBe('Tienes 1 artículo');
    expect(i18n.p('items', 5)).toBe('Tienes 5 artículos');
  });

  it('should handle RTL languages correctly', () => {
    const { i18n } = createI18nSystem({
      defaultLocale: 'en',
      autoDetect: false,
    });

    i18n.loadTranslations('ar', {
      greeting: 'مرحبا {name}',
    });

    i18n.setLocale('ar');
    expect(i18n.getDirection()).toBe('rtl');
    expect(i18n.isRTL()).toBe(true);
    expect(i18n.t('greeting', { name: 'عالم' })).toBe('مرحبا عالم');
  });

  it('should handle fallback chain', () => {
    const { i18n } = createI18nSystem({
      defaultLocale: 'en',
      autoDetect: false,
    });

    i18n.loadTranslations('en', {
      common: 'Common text',
      english_only: 'English only',
    });

    i18n.loadTranslations('es', {
      common: 'Texto común',
    });

    i18n.setLocale('es');
    expect(i18n.t('common')).toBe('Texto común');
    expect(i18n.t('english_only')).toBe('English only'); // Falls back to en
  });

  it('should handle complex pluralization', () => {
    const { i18n } = createI18nSystem({
      defaultLocale: 'ru',
      autoDetect: false,
    });

    i18n.loadTranslations('ru', {
      item_one: '{count} элемент',
      item_few: '{count} элемента',
      item_many: '{count} элементов',
    });

    expect(i18n.p('item', 1)).toBe('1 элемент');
    expect(i18n.p('item', 2)).toBe('2 элемента');
    expect(i18n.p('item', 5)).toBe('5 элементов');
    expect(i18n.p('item', 21)).toBe('21 элемент');
    expect(i18n.p('item', 22)).toBe('22 элемента');
    expect(i18n.p('item', 25)).toBe('25 элементов');
  });

  it('should track missing translations', () => {
    const { i18n } = createI18nSystem({
      autoDetect: false,
    });

    i18n.loadTranslations('en', { exists: 'Exists' });
    i18n.t('missing_key');

    const missing = i18n.getMissingTranslations('en') as string[];
    expect(missing).toContain('missing_key');
  });
});
