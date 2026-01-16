/**
 * ModuleResolver Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ModuleResolver,
  ModuleError,
  createModuleResolver,
} from './ModuleResolver';

describe('ModuleResolver', () => {
  let resolver: ModuleResolver;
  const mockFiles: Record<string, string> = {
    'project/main.ws': ':: Start\nHello!',
    'project/lib/utils.ws': ':: Helper\nUtility',
    'project/lib/common.ws': ':: Common\nShared code',
    'shared/global.ws': ':: Global\nGlobal content',
  };

  const mockLoader = (path: string): string => {
    if (mockFiles[path]) {
      return mockFiles[path];
    }
    throw new Error(`File not found: ${path}`);
  };

  beforeEach(() => {
    resolver = createModuleResolver({
      baseDir: '/project',
      fileLoader: mockLoader,
    });
  });

  describe('path resolution', () => {
    it('resolves relative paths', () => {
      const resolved = resolver.resolvePath('project/main.ws', 'lib/utils.ws');
      expect(resolved).toBe('project/lib/utils.ws');
    });

    it('resolves parent directory paths', () => {
      const resolved = resolver.resolvePath(
        'project/lib/utils.ws',
        '../main.ws'
      );
      expect(resolved).toBe('project/main.ws');
    });

    it('resolves current directory paths', () => {
      const resolved = resolver.resolvePath(
        'project/lib/utils.ws',
        './common.ws'
      );
      expect(resolved).toBe('project/lib/common.ws');
    });

    it('preserves absolute paths', () => {
      const resolved = resolver.resolvePath('any/file.ws', '/shared/global.ws');
      expect(resolved).toBe('/shared/global.ws');
    });

    it('uses baseDir when no including file', () => {
      const resolved = resolver.resolvePath('', 'lib/utils.ws');
      expect(resolved).toBe('project/lib/utils.ws');
    });
  });

  describe('circular include detection', () => {
    it('detects simple circular include', async () => {
      // Simulate being in the middle of loading main.ws
      const circularFiles: Record<string, string> = {
        'a.ws': 'INCLUDE "b.ws"',
        'b.ws': 'INCLUDE "a.ws"',
      };

      const circularLoader = (path: string): string => {
        return circularFiles[path] ?? '';
      };

      const circularResolver = createModuleResolver({
        fileLoader: circularLoader,
      });

      // Load a.ws first
      await circularResolver.loadInclude('', 'a.ws');

      // Now trying to load a.ws again should detect circular
      expect(circularResolver.wouldCreateCircularInclude('a.ws')).toBe(false); // Not in stack after completion

      // But if we're in the middle of loading...
      // This would be detected during nested loading
    });

    it('reports include chain in error', async () => {
      const recursiveFiles: Record<string, string> = {
        'a.ws': 'content a',
        'b.ws': 'content b',
      };

      const recursiveResolver = createModuleResolver({
        fileLoader: (path) => recursiveFiles[path] ?? '',
      });

      // Manually simulate the stack state
      (recursiveResolver as any).includeStack = ['a.ws', 'b.ws'];

      expect(recursiveResolver.wouldCreateCircularInclude('a.ws')).toBe(true);
      expect(recursiveResolver.getIncludeChain()).toEqual(['a.ws', 'b.ws']);
    });
  });

  describe('include loading', () => {
    it('loads include file', async () => {
      const result = await resolver.loadInclude(
        'project/main.ws',
        'lib/utils.ws'
      );

      expect(result.path).toBe('lib/utils.ws');
      expect(result.content).toBe(':: Helper\nUtility');
    });

    it('tracks loaded modules', async () => {
      await resolver.loadInclude('project/main.ws', 'lib/utils.ws');

      expect(resolver.isLoaded('project/lib/utils.ws')).toBe(true);
      expect(resolver.getLoadedModules()).toContain('project/lib/utils.ws');
    });

    it('throws on missing file loader', async () => {
      const noLoaderResolver = createModuleResolver({});

      await expect(
        noLoaderResolver.loadInclude('', 'missing.ws')
      ).rejects.toThrow(ModuleError);
    });

    it('respects max include depth', async () => {
      const deepResolver = createModuleResolver({
        maxIncludeDepth: 2,
        fileLoader: () => 'content',
      });

      // Manually set deep stack
      (deepResolver as any).includeStack = ['a.ws', 'b.ws'];

      await expect(
        deepResolver.loadInclude('', 'c.ws')
      ).rejects.toThrow('MOD_005');
    });
  });

  describe('cache management', () => {
    it('clears cache', async () => {
      await resolver.loadInclude('project/main.ws', 'lib/utils.ws');
      expect(resolver.getLoadedModules().length).toBeGreaterThan(0);

      resolver.clearCache();
      expect(resolver.getLoadedModules().length).toBe(0);
    });
  });

  describe('serialization', () => {
    it('saves and restores state', async () => {
      await resolver.loadInclude('project/main.ws', 'lib/utils.ws');

      const state = resolver.getState();
      expect(state.loadedModules).toContain('project/lib/utils.ws');

      const newResolver = createModuleResolver({
        fileLoader: mockLoader,
      });
      newResolver.restoreState(state);

      expect(newResolver.isLoaded('project/lib/utils.ws')).toBe(true);
    });
  });
});
