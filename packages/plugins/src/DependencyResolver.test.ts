/**
 * Tests for DependencyResolver
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyResolver } from './DependencyResolver';
import type { PluginMetadata } from './types';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = DependencyResolver.create();
  });

  describe('factory method', () => {
    it('creates instance', () => {
      expect(resolver).toBeInstanceOf(DependencyResolver);
    });

    it('accepts logger', () => {
      const logger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      };
      const r = DependencyResolver.create(logger);
      expect(r).toBeInstanceOf(DependencyResolver);
    });
  });

  describe('resolve', () => {
    it('resolves empty plugin map', () => {
      const plugins = new Map<string, PluginMetadata>();
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
      expect(result.loadOrder).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('resolves single plugin with no dependencies', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0' }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
      expect(result.loadOrder).toEqual(['plugin-a']);
    });

    it('resolves multiple plugins with no dependencies', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0' }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0' }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
      expect(result.loadOrder).toHaveLength(2);
      expect(result.loadOrder).toContain('plugin-a');
      expect(result.loadOrder).toContain('plugin-b');
    });

    it('resolves linear dependencies', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0' }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', dependencies: ['plugin-a'] }],
        ['plugin-c', { name: 'plugin-c', version: '1.0.0', dependencies: ['plugin-b'] }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
      expect(result.loadOrder.indexOf('plugin-a')).toBeLessThan(
        result.loadOrder.indexOf('plugin-b')
      );
      expect(result.loadOrder.indexOf('plugin-b')).toBeLessThan(
        result.loadOrder.indexOf('plugin-c')
      );
    });

    it('resolves branching dependencies', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['core', { name: 'core', version: '1.0.0' }],
        ['plugin-a', { name: 'plugin-a', version: '1.0.0', dependencies: ['core'] }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', dependencies: ['core'] }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
      expect(result.loadOrder[0]).toBe('core');
    });

    it('respects priority in load order', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0', priority: 100 }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', priority: 1 }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
      expect(result.loadOrder.indexOf('plugin-b')).toBeLessThan(
        result.loadOrder.indexOf('plugin-a')
      );
    });
  });

  describe('cycle detection', () => {
    it('detects simple cycle', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0', dependencies: ['plugin-b'] }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', dependencies: ['plugin-a'] }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(false);
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Circular dependency'))).toBe(true);
    });

    it('detects longer cycle', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0', dependencies: ['plugin-b'] }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', dependencies: ['plugin-c'] }],
        ['plugin-c', { name: 'plugin-c', version: '1.0.0', dependencies: ['plugin-a'] }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(false);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('detects self-dependency', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0', dependencies: ['plugin-a'] }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(false);
    });
  });

  describe('missing dependencies', () => {
    it('reports missing required dependency', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0', dependencies: ['missing'] }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(false);
      expect(result.missingRequired.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Missing required dependency'))).toBe(true);
    });

    it('reports missing optional dependency as warning', () => {
      const plugins = new Map<string, PluginMetadata>([
        [
          'plugin-a',
          { name: 'plugin-a', version: '1.0.0', optionalDependencies: ['missing'] },
        ],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
      expect(result.missingOptional.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('Missing optional dependency'))).toBe(true);
    });

    it('includes available optional dependencies in load order', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0' }],
        [
          'plugin-b',
          { name: 'plugin-b', version: '1.0.0', optionalDependencies: ['plugin-a'] },
        ],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
      expect(result.loadOrder.indexOf('plugin-a')).toBeLessThan(
        result.loadOrder.indexOf('plugin-b')
      );
    });
  });

  describe('version checking', () => {
    it('accepts matching exact version', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0' }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', dependencies: ['plugin-a@1.0.0'] }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
      expect(result.warnings.filter((w) => w.includes('plugin-a'))).toHaveLength(0);
    });

    it('warns on version mismatch', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '2.0.0' }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', dependencies: ['plugin-a@1.0.0'] }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.warnings.some((w) => w.includes('plugin-a@1.0.0'))).toBe(true);
    });

    it('accepts caret version range', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.2.3' }],
        [
          'plugin-b',
          { name: 'plugin-b', version: '1.0.0', dependencies: ['plugin-a@^1.0.0'] },
        ],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
    });

    it('accepts tilde version range', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.5' }],
        [
          'plugin-b',
          { name: 'plugin-b', version: '1.0.0', dependencies: ['plugin-a@~1.0.0'] },
        ],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.success).toBe(true);
    });
  });

  describe('provides conflicts', () => {
    it('warns when multiple plugins provide same thing', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0', provides: ['feature-x'] }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', provides: ['feature-x'] }],
      ]);
      const result = resolver.resolve(plugins);
      expect(result.warnings.some((w) => w.includes('feature-x'))).toBe(true);
    });
  });

  describe('canLoad', () => {
    it('returns valid for loadable plugins', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0' }],
      ]);
      const result = resolver.canLoad(plugins);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns invalid for cyclic dependencies', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['plugin-a', { name: 'plugin-a', version: '1.0.0', dependencies: ['plugin-b'] }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', dependencies: ['plugin-a'] }],
      ]);
      const result = resolver.canLoad(plugins);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getDependencies', () => {
    it('returns empty for unknown plugin', () => {
      const plugins = new Map<string, PluginMetadata>();
      const deps = resolver.getDependencies('unknown', plugins);
      expect(deps.required).toEqual([]);
      expect(deps.optional).toEqual([]);
    });

    it('returns dependencies for known plugin', () => {
      const plugins = new Map<string, PluginMetadata>([
        [
          'plugin-a',
          {
            name: 'plugin-a',
            version: '1.0.0',
            dependencies: ['dep-a@^1.0.0', 'dep-b'],
            optionalDependencies: ['opt-a'],
          },
        ],
      ]);
      const deps = resolver.getDependencies('plugin-a', plugins);
      expect(deps.required).toEqual(['dep-a', 'dep-b']);
      expect(deps.optional).toEqual(['opt-a']);
    });
  });

  describe('getDependents', () => {
    it('returns dependents for a plugin', () => {
      const plugins = new Map<string, PluginMetadata>([
        ['core', { name: 'core', version: '1.0.0' }],
        ['plugin-a', { name: 'plugin-a', version: '1.0.0', dependencies: ['core'] }],
        ['plugin-b', { name: 'plugin-b', version: '1.0.0', optionalDependencies: ['core'] }],
      ]);
      const dependents = resolver.getDependents('core', plugins);
      expect(dependents.requiredBy).toContain('plugin-a');
      expect(dependents.optionalBy).toContain('plugin-b');
    });
  });

  describe('static methods', () => {
    it('satisfiesVersion for exact match', () => {
      expect(DependencyResolver.satisfiesVersion('1.0.0', '1.0.0')).toBe(true);
      expect(DependencyResolver.satisfiesVersion('1.0.1', '1.0.0')).toBe(false);
    });

    it('satisfiesVersion for caret range', () => {
      expect(DependencyResolver.satisfiesVersion('1.2.3', '^1.0.0')).toBe(true);
      expect(DependencyResolver.satisfiesVersion('2.0.0', '^1.0.0')).toBe(false);
    });

    it('satisfiesVersion for tilde range', () => {
      expect(DependencyResolver.satisfiesVersion('1.0.5', '~1.0.0')).toBe(true);
      expect(DependencyResolver.satisfiesVersion('1.1.0', '~1.0.0')).toBe(false);
    });

    it('satisfiesVersion for wildcard', () => {
      expect(DependencyResolver.satisfiesVersion('1.0.0', '*')).toBe(true);
      expect(DependencyResolver.satisfiesVersion('99.0.0', '*')).toBe(true);
    });

    it('parseDependency extracts name and version', () => {
      expect(DependencyResolver.parseDependency('plugin-a')).toEqual({ name: 'plugin-a' });
      expect(DependencyResolver.parseDependency('plugin-a@^1.0.0')).toEqual({
        name: 'plugin-a',
        versionRange: '^1.0.0',
      });
    });
  });
});
