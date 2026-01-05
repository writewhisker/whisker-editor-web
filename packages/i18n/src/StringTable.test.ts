/**
 * Tests for StringTable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StringTable } from './StringTable';
import type { Logger } from './types';

describe('StringTable', () => {
  let stringTable: StringTable;

  beforeEach(() => {
    stringTable = new StringTable();
  });

  describe('load', () => {
    it('should load translation data', () => {
      stringTable.load('en', {
        hello: 'Hello',
        world: 'World',
      });

      expect(stringTable.lookup('en', 'hello')).toBe('Hello');
      expect(stringTable.lookup('en', 'world')).toBe('World');
    });

    it('should flatten nested data', () => {
      stringTable.load('en', {
        messages: {
          greeting: 'Hello',
          farewell: 'Goodbye',
        },
      });

      expect(stringTable.lookup('en', 'messages.greeting')).toBe('Hello');
      expect(stringTable.lookup('en', 'messages.farewell')).toBe('Goodbye');
    });

    it('should flatten deeply nested data', () => {
      stringTable.load('en', {
        level1: {
          level2: {
            level3: {
              message: 'Deep',
            },
          },
        },
      });

      expect(stringTable.lookup('en', 'level1.level2.level3.message')).toBe('Deep');
    });

    it('should support lazy loading', () => {
      stringTable.load('en', { hello: 'Hello' }, { lazy: true });

      const meta = stringTable.getMetadata('en');
      expect(meta?.needsIndex).toBe(true);

      // Lookup should trigger index build
      expect(stringTable.lookup('en', 'hello')).toBe('Hello');

      const metaAfter = stringTable.getMetadata('en');
      expect(metaAfter?.needsIndex).toBe(false);
    });

    it('should throw on invalid data (circular reference)', () => {
      const data: Record<string, unknown> = { key: 'value' };
      data.circular = data;

      expect(() => stringTable.load('en', data as never)).toThrow('Circular reference detected');
    });

    it('should track metadata', () => {
      stringTable.load('en', {
        a: '1',
        b: '2',
        c: '3',
      });

      const meta = stringTable.getMetadata('en');
      expect(meta).toBeDefined();
      expect(meta?.keyCount).toBe(3);
      expect(meta?.loadTime).toBeGreaterThan(0);
      expect(meta?.needsIndex).toBe(false);
    });
  });

  describe('lookup', () => {
    beforeEach(() => {
      stringTable.load('en', { hello: 'Hello', world: 'World' });
      stringTable.load('es', { hello: 'Hola' });
    });

    it('should return translation for existing key', () => {
      expect(stringTable.lookup('en', 'hello')).toBe('Hello');
      expect(stringTable.lookup('es', 'hello')).toBe('Hola');
    });

    it('should return null for missing key', () => {
      expect(stringTable.lookup('en', 'missing')).toBeNull();
    });

    it('should return null for unloaded locale without fallback', () => {
      // Create a new table without default/fallback to avoid fallback behavior
      const table = new StringTable();
      expect(table.lookup('fr', 'hello')).toBeNull();
    });
  });

  describe('fallback chain', () => {
    it('should build fallback chain from complex locale', () => {
      const table = new StringTable({
        defaultLocale: 'en',
        fallbackLocale: 'en-US',
      });

      const chain = table.buildFallbackChain('zh-Hant-TW');
      expect(chain).toContain('zh-Hant');
      expect(chain).toContain('zh');
      expect(chain).toContain('en-US');
      expect(chain).toContain('en');
    });

    it('should use fallback for missing keys', () => {
      const table = new StringTable({
        defaultLocale: 'en',
      });

      table.load('en', { hello: 'Hello', only_en: 'English only' });
      table.load('es', { hello: 'Hola' });

      // es should fall back to en for missing key
      expect(table.lookup('es', 'only_en')).toBe('English only');
    });

    it('should try language before default', () => {
      const table = new StringTable({
        defaultLocale: 'en',
      });

      table.load('en', { greeting: 'Hello', specific: 'EN specific' });
      table.load('es', { greeting: 'Hola', specific: 'ES specific' });

      // es-MX should fall back to es first
      expect(table.lookup('es-MX', 'specific')).toBe('ES specific');
    });
  });

  describe('has', () => {
    beforeEach(() => {
      stringTable.load('en', { hello: 'Hello' });
    });

    it('should return true for existing key', () => {
      expect(stringTable.has('en', 'hello')).toBe(true);
    });

    it('should return false for missing key', () => {
      expect(stringTable.has('en', 'missing')).toBe(false);
    });
  });

  describe('getKeys', () => {
    it('should return all keys for locale', () => {
      stringTable.load('en', {
        a: '1',
        b: '2',
        nested: {
          c: '3',
          d: '4',
        },
      });

      const keys = stringTable.getKeys('en');
      expect(keys).toEqual(['a', 'b', 'nested.c', 'nested.d']);
    });

    it('should return empty array for unloaded locale', () => {
      expect(stringTable.getKeys('fr')).toEqual([]);
    });
  });

  describe('getLocales', () => {
    it('should return loaded locales', () => {
      stringTable.load('en', { a: '1' });
      stringTable.load('es', { a: '2' });
      stringTable.load('fr', { a: '3' });

      const locales = stringTable.getLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('es');
      expect(locales).toContain('fr');
    });

    it('should return sorted locales', () => {
      stringTable.load('zh', { a: '1' });
      stringTable.load('ar', { a: '2' });
      stringTable.load('en', { a: '3' });

      const locales = stringTable.getLocales();
      expect(locales).toEqual(['ar', 'en', 'zh']);
    });
  });

  describe('unload', () => {
    it('should remove locale data', () => {
      stringTable.load('en', { hello: 'Hello' });
      expect(stringTable.lookup('en', 'hello')).toBe('Hello');

      stringTable.unload('en');
      expect(stringTable.lookup('en', 'hello')).toBeNull();
      expect(stringTable.getLocales()).not.toContain('en');
    });
  });

  describe('missing key tracking', () => {
    it('should track missing keys', () => {
      stringTable.load('en', { hello: 'Hello' });

      stringTable.lookup('en', 'missing1');
      stringTable.lookup('en', 'missing2');
      stringTable.lookup('en', 'missing1'); // Duplicate

      const missing = stringTable.getMissing('en') as string[];
      expect(missing).toContain('missing1');
      expect(missing).toContain('missing2');
      expect(missing.filter((k) => k === 'missing1').length).toBe(1); // No duplicates
    });

    it('should get all missing across locales', () => {
      stringTable.load('en', { hello: 'Hello' });
      stringTable.load('es', { hola: 'Hola' });

      stringTable.lookup('en', 'missing_en');
      stringTable.lookup('es', 'missing_es');

      const allMissing = stringTable.getMissing() as Map<string, string[]>;
      expect(allMissing.get('en')).toContain('missing_en');
      expect(allMissing.get('es')).toContain('missing_es');
    });

    it('should clear missing tracking', () => {
      stringTable.load('en', { hello: 'Hello' });
      stringTable.lookup('en', 'missing');

      stringTable.clearMissing('en');
      const missing = stringTable.getMissing('en') as string[];
      expect(missing).toEqual([]);
    });

    it('should log missing when configured', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const table = new StringTable({
        logMissing: true,
        logger: mockLogger,
      });

      table.load('en', { hello: 'Hello' });
      table.lookup('en', 'missing');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing translation')
      );
    });
  });

  describe('merge', () => {
    it('should merge additional data', () => {
      stringTable.load('en', { a: '1', b: '2' });
      stringTable.merge('en', { c: '3', d: '4' });

      expect(stringTable.lookup('en', 'a')).toBe('1');
      expect(stringTable.lookup('en', 'c')).toBe('3');
    });

    it('should not overwrite existing keys by default', () => {
      stringTable.load('en', { a: 'original' });
      stringTable.merge('en', { a: 'new' });

      expect(stringTable.lookup('en', 'a')).toBe('original');
    });

    it('should overwrite when specified', () => {
      stringTable.load('en', { a: 'original' });
      stringTable.merge('en', { a: 'new' }, true);

      expect(stringTable.lookup('en', 'a')).toBe('new');
    });

    it('should load data if locale not loaded', () => {
      stringTable.merge('fr', { hello: 'Bonjour' });
      expect(stringTable.lookup('fr', 'hello')).toBe('Bonjour');
    });

    it('should deep merge nested data', () => {
      stringTable.load('en', {
        messages: {
          greeting: 'Hello',
        },
      });

      stringTable.merge('en', {
        messages: {
          farewell: 'Goodbye',
        },
      });

      expect(stringTable.lookup('en', 'messages.greeting')).toBe('Hello');
      expect(stringTable.lookup('en', 'messages.farewell')).toBe('Goodbye');
    });
  });

  describe('clone', () => {
    it('should clone locale data', () => {
      stringTable.load('en', { hello: 'Hello', world: 'World' });
      stringTable.clone('en', 'en-GB');

      expect(stringTable.lookup('en-GB', 'hello')).toBe('Hello');
      expect(stringTable.lookup('en-GB', 'world')).toBe('World');
    });

    it('should create independent copy', () => {
      stringTable.load('en', { hello: 'Hello' });
      stringTable.clone('en', 'en-GB');

      // Modify original
      stringTable.merge('en', { hello: 'Hi' }, true);

      // Clone should be unaffected
      expect(stringTable.lookup('en-GB', 'hello')).toBe('Hello');
    });

    it('should throw if source not loaded', () => {
      expect(() => stringTable.clone('missing', 'target')).toThrow(
        'Source locale not loaded'
      );
    });
  });

  describe('getData', () => {
    it('should return raw hierarchical data', () => {
      const data = {
        messages: {
          greeting: 'Hello',
        },
      };
      stringTable.load('en', data);

      const result = stringTable.getData('en');
      expect(result).toEqual(data);
    });

    it('should return undefined for unloaded locale', () => {
      expect(stringTable.getData('missing')).toBeUndefined();
    });
  });

  describe('getIndex', () => {
    it('should return flattened index', () => {
      stringTable.load('en', {
        a: '1',
        nested: { b: '2' },
      });

      const index = stringTable.getIndex('en');
      expect(index).toEqual({
        a: '1',
        'nested.b': '2',
      });
    });
  });

  describe('flatten', () => {
    it('should flatten nested objects to dot notation', () => {
      const result = stringTable.flatten({
        a: '1',
        b: {
          c: '2',
          d: {
            e: '3',
          },
        },
      });

      expect(result).toEqual({
        a: '1',
        'b.c': '2',
        'b.d.e': '3',
      });
    });

    it('should handle empty objects', () => {
      expect(stringTable.flatten({})).toEqual({});
    });

    it('should skip null/undefined values', () => {
      const result = stringTable.flatten({
        a: '1',
        b: null as unknown as string,
        c: undefined as unknown as string,
      });

      expect(result).toEqual({ a: '1' });
    });

    it('should convert numbers to strings', () => {
      const result = stringTable.flatten({
        count: 42 as unknown as string,
      });

      expect(result).toEqual({ count: '42' });
    });
  });

  describe('validateData', () => {
    it('should pass valid data', () => {
      const result = stringTable.validateData({
        key: 'value',
        nested: { inner: 'value' },
      });
      expect(result.valid).toBe(true);
    });

    it('should pass non-object values', () => {
      expect(stringTable.validateData('string').valid).toBe(true);
      expect(stringTable.validateData(null).valid).toBe(true);
      expect(stringTable.validateData(123).valid).toBe(true);
    });

    it('should fail on circular references', () => {
      const data: Record<string, unknown> = { key: 'value' };
      data.self = data;

      const result = stringTable.validateData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Circular reference');
    });
  });

  describe('Factory method', () => {
    it('should create instance via factory', () => {
      const instance = StringTable.create({ defaultLocale: 'en' });
      expect(instance).toBeInstanceOf(StringTable);
    });
  });
});
