/**
 * Tests for PluginLoader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginLoader, type PluginManifest } from './PluginLoader';
import type { PluginDefinition } from './types';

describe('PluginLoader', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = PluginLoader.create();
  });

  afterEach(() => {
    loader.unloadAll();
    // Clear built-in plugins
    for (const name of PluginLoader.getBuiltinPlugins()) {
      PluginLoader.unregisterBuiltin(name);
    }
  });

  describe('factory method', () => {
    it('creates instance', () => {
      expect(loader).toBeInstanceOf(PluginLoader);
    });

    it('accepts logger and timeout', () => {
      const logger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      };
      const l = PluginLoader.create({ logger, timeout: 5000 });
      expect(l).toBeInstanceOf(PluginLoader);
    });
  });

  describe('built-in plugins', () => {
    it('registers built-in plugin', () => {
      const definition: PluginDefinition = {
        metadata: { name: 'test-builtin', version: '1.0.0' },
      };
      PluginLoader.registerBuiltin('test-builtin', definition);
      expect(PluginLoader.getBuiltinPlugins()).toContain('test-builtin');
    });

    it('unregisters built-in plugin', () => {
      const definition: PluginDefinition = {
        metadata: { name: 'test-builtin', version: '1.0.0' },
      };
      PluginLoader.registerBuiltin('test-builtin', definition);
      expect(PluginLoader.unregisterBuiltin('test-builtin')).toBe(true);
      expect(PluginLoader.getBuiltinPlugins()).not.toContain('test-builtin');
    });

    it('loads built-in plugin', async () => {
      const definition: PluginDefinition = {
        metadata: { name: 'test-builtin', version: '1.0.0', description: 'Test' },
        hooks: {},
      };
      PluginLoader.registerBuiltin('test-builtin', definition);

      const result = await loader.loadBuiltin('test-builtin');
      expect(result.success).toBe(true);
      expect(result.plugin?.source).toBe('builtin');
      expect(result.plugin?.definition.metadata.name).toBe('test-builtin');
    });

    it('fails to load non-existent built-in', async () => {
      const result = await loader.loadBuiltin('non-existent');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('inline plugins', () => {
    it('loads inline plugin', async () => {
      const definition: PluginDefinition = {
        metadata: { name: 'inline-plugin', version: '1.0.0' },
      };
      const result = await loader.loadInline(definition);
      expect(result.success).toBe(true);
      expect(result.plugin?.source).toBe('inline');
      expect(result.plugin?.location).toBe('inline:inline-plugin');
    });

    it('fails with invalid metadata', async () => {
      const definition: PluginDefinition = {
        metadata: { name: '', version: '1.0.0' },
      };
      const result = await loader.loadInline(definition);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid metadata');
    });
  });

  describe('URL loading', () => {
    it('returns error when fetch fails', async () => {
      // Test with a failing fetch function
      const failingFetch = vi.fn().mockImplementation(() => {
        throw new Error('fetch is not available');
      });
      const result = await loader.loadFromUrl('https://example.com/plugin.js', {
        fetch: failingFetch,
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('fetch is not available');
    });

    it('handles fetch errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await loader.loadFromUrl('https://example.com/plugin.js', {
        fetch: mockFetch,
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Network error');
    });

    it('handles HTTP errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      const result = await loader.loadFromUrl('https://example.com/plugin.js', {
        fetch: mockFetch,
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('404');
    });

    it('loads JSON plugin definition', async () => {
      const pluginJson = JSON.stringify({
        metadata: { name: 'json-plugin', version: '1.0.0' },
      });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(pluginJson),
      });

      const result = await loader.loadFromUrl('https://example.com/plugin.json', {
        fetch: mockFetch,
      });
      expect(result.success).toBe(true);
      expect(result.plugin?.definition.metadata.name).toBe('json-plugin');
    });
  });

  describe('npm loading', () => {
    it('attempts to load from CDN', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              metadata: { name: 'npm-plugin', version: '1.0.0' },
            })
          ),
      });

      const result = await loader.loadFromNpm('npm-plugin', { fetch: mockFetch });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('unpkg.com'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.plugin?.source).toBe('npm');
    });
  });

  describe('plugin management', () => {
    it('checks if plugin is loaded', async () => {
      const definition: PluginDefinition = {
        metadata: { name: 'test-plugin', version: '1.0.0' },
      };
      expect(loader.isLoaded('test-plugin')).toBe(false);

      await loader.loadInline(definition);
      expect(loader.isLoaded('test-plugin')).toBe(true);
    });

    it('gets loaded plugin', async () => {
      const definition: PluginDefinition = {
        metadata: { name: 'test-plugin', version: '1.0.0' },
      };
      await loader.loadInline(definition);

      const plugin = loader.getPlugin('test-plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.definition.metadata.name).toBe('test-plugin');
    });

    it('gets all loaded plugins', async () => {
      await loader.loadInline({
        metadata: { name: 'plugin-a', version: '1.0.0' },
      });
      await loader.loadInline({
        metadata: { name: 'plugin-b', version: '1.0.0' },
      });

      const plugins = loader.getAllPlugins();
      expect(plugins).toHaveLength(2);
    });

    it('unloads plugin', async () => {
      await loader.loadInline({
        metadata: { name: 'test-plugin', version: '1.0.0' },
      });
      expect(loader.isLoaded('test-plugin')).toBe(true);

      expect(loader.unload('test-plugin')).toBe(true);
      expect(loader.isLoaded('test-plugin')).toBe(false);
    });

    it('returns false when unloading non-existent plugin', () => {
      expect(loader.unload('non-existent')).toBe(false);
    });

    it('unloads all plugins', async () => {
      await loader.loadInline({
        metadata: { name: 'plugin-a', version: '1.0.0' },
      });
      await loader.loadInline({
        metadata: { name: 'plugin-b', version: '1.0.0' },
      });

      loader.unloadAll();
      expect(loader.getAllPlugins()).toHaveLength(0);
    });
  });

  describe('loadMultiple', () => {
    it('loads multiple plugins', async () => {
      PluginLoader.registerBuiltin('builtin-a', {
        metadata: { name: 'builtin-a', version: '1.0.0' },
      });
      PluginLoader.registerBuiltin('builtin-b', {
        metadata: { name: 'builtin-b', version: '1.0.0' },
      });

      const results = await loader.loadMultiple([
        { type: 'builtin', location: 'builtin-a' },
        { type: 'builtin', location: 'builtin-b' },
      ]);

      expect(results.size).toBe(2);
      expect(results.get('builtin-a')?.success).toBe(true);
      expect(results.get('builtin-b')?.success).toBe(true);
    });

    it('handles mixed success and failure', async () => {
      PluginLoader.registerBuiltin('builtin-a', {
        metadata: { name: 'builtin-a', version: '1.0.0' },
      });

      const results = await loader.loadMultiple([
        { type: 'builtin', location: 'builtin-a' },
        { type: 'builtin', location: 'non-existent' },
      ]);

      expect(results.get('builtin-a')?.success).toBe(true);
      expect(results.get('non-existent')?.success).toBe(false);
    });
  });

  describe('validateManifest', () => {
    it('validates valid manifest', () => {
      const manifest: PluginManifest = {
        name: 'valid-plugin',
        version: '1.0.0',
      };
      const result = loader.validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing name', () => {
      const manifest: PluginManifest = {
        name: '',
        version: '1.0.0',
      };
      const result = loader.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('name'))).toBe(true);
    });

    it('rejects invalid name characters', () => {
      const manifest: PluginManifest = {
        name: 'invalid name!',
        version: '1.0.0',
      };
      const result = loader.validateManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('rejects missing version', () => {
      const manifest: PluginManifest = {
        name: 'test-plugin',
        version: '',
      };
      const result = loader.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('version'))).toBe(true);
    });

    it('warns on non-semver version', () => {
      const manifest: PluginManifest = {
        name: 'test-plugin',
        version: 'latest',
      };
      const result = loader.validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('semver'))).toBe(true);
    });

    it('rejects non-array dependencies', () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        dependencies: 'not-an-array',
      } as unknown as PluginManifest;
      const result = loader.validateManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('rejects non-number priority', () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        priority: 'high',
      } as unknown as PluginManifest;
      const result = loader.validateManifest(manifest);
      expect(result.valid).toBe(false);
    });
  });

  describe('discoverPlugins', () => {
    it('discovers valid plugins', () => {
      const plugins: PluginManifest[] = [
        { name: 'plugin-a', version: '1.0.0' },
        { name: 'plugin-b', version: '2.0.0' },
      ];
      const result = loader.discoverPlugins(plugins);
      expect(result.success).toBe(true);
      expect(result.plugins).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('filters invalid plugins', () => {
      const plugins = [
        { name: 'valid-plugin', version: '1.0.0' },
        { name: '', version: '1.0.0' }, // Invalid
      ] as PluginManifest[];
      const result = loader.discoverPlugins(plugins);
      expect(result.success).toBe(false);
      expect(result.plugins).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('returns loader statistics', async () => {
      PluginLoader.registerBuiltin('builtin', {
        metadata: { name: 'builtin', version: '1.0.0' },
      });
      await loader.loadBuiltin('builtin');
      await loader.loadInline({
        metadata: { name: 'inline', version: '1.0.0' },
      });

      const stats = loader.getStats();
      expect(stats.loadedCount).toBe(2);
      expect(stats.builtinCount).toBe(1);
      expect(stats.sources.builtin).toBe(1);
      expect(stats.sources.inline).toBe(1);
    });
  });
});
