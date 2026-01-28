/**
 * NamespaceResolver Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  NamespaceResolver,
  createNamespaceResolver,
} from './NamespaceResolver';

describe('NamespaceResolver', () => {
  let resolver: NamespaceResolver;

  beforeEach(() => {
    resolver = createNamespaceResolver();
  });

  describe('namespace stack management', () => {
    it('enters namespace', () => {
      resolver.enter('Combat');

      expect(resolver.isInNamespace()).toBe(true);
      expect(resolver.getCurrentNamespace()).toBe('Combat');
      expect(resolver.getDepth()).toBe(1);
    });

    it('supports nested namespaces', () => {
      resolver.enter('Game');
      resolver.enter('Combat');
      resolver.enter('Weapons');

      expect(resolver.getCurrentNamespace()).toBe('Game::Combat::Weapons');
      expect(resolver.getDepth()).toBe(3);
      expect(resolver.getStack()).toEqual(['Game', 'Combat', 'Weapons']);
    });

    it('exits namespace', () => {
      resolver.enter('Combat');
      const exited = resolver.exit();

      expect(exited).toBe('Combat');
      expect(resolver.isInNamespace()).toBe(false);
    });

    it('resets stack', () => {
      resolver.enter('A');
      resolver.enter('B');
      resolver.reset();

      expect(resolver.isInNamespace()).toBe(false);
      expect(resolver.getStack()).toEqual([]);
    });
  });

  describe('name qualification', () => {
    it('qualifies name in namespace', () => {
      resolver.enter('Combat');
      const qualified = resolver.qualify('Attack');

      expect(qualified).toBe('Combat::Attack');
    });

    it('qualifies in nested namespace', () => {
      resolver.enter('Game');
      resolver.enter('Combat');
      const qualified = resolver.qualify('Attack');

      expect(qualified).toBe('Game::Combat::Attack');
    });

    it('preserves global reference prefix', () => {
      resolver.enter('Combat');
      const qualified = resolver.qualify('::Start');

      expect(qualified).toBe('Start');
    });

    it('preserves already qualified names', () => {
      resolver.enter('Combat');
      const qualified = resolver.qualify('Other::Passage');

      expect(qualified).toBe('Other::Passage');
    });

    it('returns unqualified when not in namespace', () => {
      const qualified = resolver.qualify('Start');

      expect(qualified).toBe('Start');
    });
  });

  describe('name registration', () => {
    it('registers names in current namespace', () => {
      resolver.enter('Combat');
      const qualified = resolver.registerName('Attack');

      expect(qualified).toBe('Combat::Attack');
      expect(resolver.isRegistered('Combat::Attack')).toBe(true);
    });

    it('registers qualified names directly', () => {
      resolver.registerQualifiedName('Custom::Passage');

      expect(resolver.isRegistered('Custom::Passage')).toBe(true);
    });

    it('lists registered names', () => {
      resolver.registerQualifiedName('Start');
      resolver.registerQualifiedName('Combat::Attack');

      const names = resolver.getRegisteredNames();
      expect(names).toContain('Start');
      expect(names).toContain('Combat::Attack');
    });

    it('clears registered names', () => {
      resolver.registerQualifiedName('Start');
      resolver.clearRegisteredNames();

      expect(resolver.getRegisteredNames().length).toBe(0);
    });
  });

  describe('name resolution', () => {
    beforeEach(() => {
      // Register some passages
      resolver.registerQualifiedName('Start');
      resolver.registerQualifiedName('End');
      resolver.registerQualifiedName('Combat::Attack');
      resolver.registerQualifiedName('Combat::Defend');
      resolver.registerQualifiedName('Combat::Magic::Fireball');
    });

    it('resolves name in current namespace', () => {
      resolver.enter('Combat');
      const result = resolver.resolve('Attack');

      expect(result).not.toBeNull();
      expect(result?.qualified).toBe('Combat::Attack');
      expect(result?.isGlobal).toBe(false);
    });

    it('resolves global reference', () => {
      resolver.enter('Combat');
      const result = resolver.resolve('::Start');

      expect(result).not.toBeNull();
      expect(result?.qualified).toBe('Start');
      expect(result?.isGlobal).toBe(true);
    });

    it('resolves from parent namespace', () => {
      resolver.enter('Combat');
      resolver.enter('Magic');

      // Fireball is in Combat::Magic
      const fireball = resolver.resolve('Fireball');
      expect(fireball?.qualified).toBe('Combat::Magic::Fireball');

      // Attack is in Combat (parent)
      const attack = resolver.resolve('Attack');
      expect(attack?.qualified).toBe('Combat::Attack');
    });

    it('falls back to global', () => {
      resolver.enter('Combat');
      const result = resolver.resolve('End');

      expect(result).not.toBeNull();
      expect(result?.qualified).toBe('End');
    });

    it('resolves qualified reference from anywhere', () => {
      resolver.enter('Other');
      const result = resolver.resolve('Combat::Attack');

      expect(result).not.toBeNull();
      expect(result?.qualified).toBe('Combat::Attack');
    });

    it('returns null for unregistered name', () => {
      const result = resolver.resolve('NonExistent');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // GAP-046: Nested Namespace Resolution
  // ===========================================================================
  describe('nested namespace resolution (GAP-046)', () => {
    beforeEach(() => {
      // Set up a deeply nested structure
      resolver.registerQualifiedName('Start');
      resolver.registerQualifiedName('End');
      resolver.registerQualifiedName('Game::Init');
      resolver.registerQualifiedName('Game::Combat::Attack');
      resolver.registerQualifiedName('Game::Combat::Defend');
      resolver.registerQualifiedName('Game::Combat::Magic::Fireball');
      resolver.registerQualifiedName('Game::Combat::Magic::Ice');
      resolver.registerQualifiedName('Game::Exploration::Search');
      resolver.registerQualifiedName('Combat::Training');  // Another Combat at global level
    });

    it('resolves from deepest level first', () => {
      resolver.enter('Game');
      resolver.enter('Combat');
      resolver.enter('Magic');

      // Should find Fireball in current namespace
      const result = resolver.resolve('Fireball');
      expect(result?.qualified).toBe('Game::Combat::Magic::Fireball');
    });

    it('resolves from parent namespace when not in current', () => {
      resolver.enter('Game');
      resolver.enter('Combat');
      resolver.enter('Magic');

      // Attack is in parent (Combat) level
      const result = resolver.resolve('Attack');
      expect(result?.qualified).toBe('Game::Combat::Attack');
    });

    it('resolves from grandparent namespace', () => {
      resolver.enter('Game');
      resolver.enter('Combat');
      resolver.enter('Magic');

      // Init is at Game level (grandparent)
      const result = resolver.resolve('Init');
      expect(result?.qualified).toBe('Game::Init');
    });

    it('resolves to global when not found in hierarchy', () => {
      resolver.enter('Game');
      resolver.enter('Combat');

      // End is only at global level
      const result = resolver.resolve('End');
      expect(result?.qualified).toBe('End');
      expect(result?.isGlobal).toBe(true);
    });

    it('resolves relative qualified reference within current namespace', () => {
      resolver.enter('Game');

      // Combat::Attack should resolve to Game::Combat::Attack
      const result = resolver.resolve('Combat::Attack');
      expect(result?.qualified).toBe('Game::Combat::Attack');
    });

    it('resolves relative qualified reference from parent namespace', () => {
      resolver.enter('Game');
      resolver.enter('Exploration');

      // Combat::Attack should still resolve to Game::Combat::Attack
      const result = resolver.resolve('Combat::Attack');
      expect(result?.qualified).toBe('Game::Combat::Attack');
    });

    it('resolves explicit global reference', () => {
      resolver.enter('Game');
      resolver.enter('Combat');

      // ::Combat::Training is the global Combat::Training, not Game::Combat::Training
      const result = resolver.resolve('::Combat::Training');
      expect(result?.qualified).toBe('Combat::Training');
      expect(result?.isGlobal).toBe(true);
    });

    it('uses convenience methods', () => {
      resolver.enter('Game');
      resolver.enter('Combat');

      // Test resolveToQualified
      expect(resolver.resolveToQualified('Attack')).toBe('Game::Combat::Attack');
      expect(resolver.resolveToQualified('NonExistent')).toBeNull();

      // Test canResolve
      expect(resolver.canResolve('Attack')).toBe(true);
      expect(resolver.canResolve('NonExistent')).toBe(false);
    });
  });

  describe('find matches', () => {
    beforeEach(() => {
      resolver.registerQualifiedName('Start');
      resolver.registerQualifiedName('Combat::Start');
      resolver.registerQualifiedName('Tutorial::Start');
    });

    it('finds all matching names', () => {
      const matches = resolver.findMatches('Start');

      expect(matches).toContain('Start');
      expect(matches).toContain('Combat::Start');
      expect(matches).toContain('Tutorial::Start');
    });
  });

  describe('namespace utilities', () => {
    it('parses qualified name', () => {
      const { namespace, name } = resolver.parseQualifiedName(
        'Game::Combat::Attack'
      );

      expect(namespace).toEqual(['Game', 'Combat']);
      expect(name).toBe('Attack');
    });

    it('gets parent namespace', () => {
      const parent = resolver.getParentNamespace('Game::Combat::Attack');

      expect(parent).toBe('Game::Combat');
    });

    it('returns null for global parent', () => {
      const parent = resolver.getParentNamespace('Start');

      expect(parent).toBeNull();
    });

    it('checks namespace scope', () => {
      expect(
        resolver.isInNamespaceScope('Combat::Attack', 'Combat')
      ).toBe(true);
      expect(
        resolver.isInNamespaceScope('Other::Attack', 'Combat')
      ).toBe(false);
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      resolver.enter('Combat');
      resolver.registerQualifiedName('Combat::Attack');
    });

    it('saves and restores state', () => {
      const state = resolver.getState();

      expect(state.currentNamespace).toEqual(['Combat']);
      expect(state.registeredNames).toContain('Combat::Attack');

      const newResolver = createNamespaceResolver();
      newResolver.restoreState(state);

      expect(newResolver.getCurrentNamespace()).toBe('Combat');
      expect(newResolver.isRegistered('Combat::Attack')).toBe(true);
    });

    it('clones resolver', () => {
      const cloned = resolver.clone();

      cloned.exit();
      cloned.clearRegisteredNames();

      expect(resolver.isInNamespace()).toBe(true);
      expect(resolver.isRegistered('Combat::Attack')).toBe(true);
      expect(cloned.isInNamespace()).toBe(false);
    });
  });
});
