/**
 * VisualScript tests
 */

import { describe, it, expect } from 'vitest';
import { VisualScript, VisualScriptCollection, type VisualScriptData } from './VisualScript';
import { ScriptBlock, createBlock } from './ScriptBlock';

describe('VisualScript', () => {
  describe('constructor', () => {
    it('should create a visual script with default values', () => {
      const vs = new VisualScript({ name: 'Test Script' });

      expect(vs.name).toBe('Test Script');
      expect(vs.description).toBe('');
      expect(vs.context).toBe('global');
      expect(vs.blocks).toEqual([]);
      expect(vs.id).toBeTruthy();
      expect(vs.created).toBeInstanceOf(Date);
      expect(vs.modified).toBeInstanceOf(Date);
    });

    it('should create a visual script with custom data', () => {
      const block1 = createBlock('set_variable');
      const vs = new VisualScript({
        id: 'test-id',
        name: 'My Script',
        description: 'A test script',
        context: 'passage',
        contextId: 'passage-123',
        blocks: [block1.serialize()],
        created: '2025-01-01T00:00:00.000Z',
        modified: '2025-01-02T00:00:00.000Z',
      });

      expect(vs.id).toBe('test-id');
      expect(vs.name).toBe('My Script');
      expect(vs.description).toBe('A test script');
      expect(vs.context).toBe('passage');
      expect(vs.contextId).toBe('passage-123');
      expect(vs.blocks).toHaveLength(1);
      expect(vs.blocks[0]).toBeInstanceOf(ScriptBlock);
    });
  });

  describe('block management', () => {
    it('should add blocks', () => {
      const vs = new VisualScript({ name: 'Test' });
      const block = createBlock('print');

      vs.addBlock(block);

      expect(vs.blocks).toHaveLength(1);
      expect(vs.blocks[0]).toBe(block);
    });

    it('should remove blocks by ID', () => {
      const vs = new VisualScript({ name: 'Test' });
      const block1 = createBlock('print');
      const block2 = createBlock('set_variable');

      vs.addBlock(block1);
      vs.addBlock(block2);

      const removed = vs.removeBlock(block1.id);

      expect(removed).toBe(true);
      expect(vs.blocks).toHaveLength(1);
      expect(vs.blocks[0]).toBe(block2);
    });

    it('should return false when removing non-existent block', () => {
      const vs = new VisualScript({ name: 'Test' });
      const removed = vs.removeBlock('non-existent');

      expect(removed).toBe(false);
    });

    it('should get blocks by ID', () => {
      const vs = new VisualScript({ name: 'Test' });
      const block = createBlock('print');

      vs.addBlock(block);

      const found = vs.getBlock(block.id);

      expect(found).toBe(block);
    });

    it('should replace blocks', () => {
      const vs = new VisualScript({ name: 'Test' });
      const oldBlock = createBlock('print');
      const newBlock = createBlock('set_variable');

      vs.addBlock(oldBlock);
      const replaced = vs.replaceBlock(oldBlock.id, newBlock);

      expect(replaced).toBe(true);
      expect(vs.blocks).toHaveLength(1);
      expect(vs.blocks[0]).toBe(newBlock);
    });

    it('should clear all blocks', () => {
      const vs = new VisualScript({ name: 'Test' });
      vs.addBlock(createBlock('print'));
      vs.addBlock(createBlock('set_variable'));

      vs.clear();

      expect(vs.blocks).toHaveLength(0);
    });
  });

  describe('Lua code generation', () => {
    it('should generate Lua code from blocks', () => {
      const vs = new VisualScript({ name: 'Test' });

      const setBlock = createBlock('set_variable');
      setBlock.parameters[0].value = 'health';
      setBlock.parameters[1].value = '100';

      const printBlock = createBlock('print');
      printBlock.parameters[0].value = '"Hello"';

      vs.addBlock(setBlock);
      vs.addBlock(printBlock);

      const lua = vs.toLua();

      expect(lua).toContain('health = 100');
      expect(lua).toContain('print("Hello")');
    });

    it('should handle empty blocks', () => {
      const vs = new VisualScript({ name: 'Test' });
      const lua = vs.toLua();

      expect(lua).toBe('');
    });
  });

  describe('cloning', () => {
    it('should clone a visual script', () => {
      const original = new VisualScript({ name: 'Original' });
      original.addBlock(createBlock('print'));

      const clone = original.clone();

      expect(clone.id).not.toBe(original.id);
      expect(clone.name).toBe('Original (copy)');
      expect(clone.blocks).toHaveLength(1);
      expect(clone.blocks[0].id).not.toBe(original.blocks[0].id);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const vs = new VisualScript({
        name: 'Test Script',
        description: 'A test',
        context: 'passage',
        contextId: 'pass-1',
      });

      const block = createBlock('set_variable');
      vs.addBlock(block);

      const data = vs.serialize();

      expect(data.id).toBe(vs.id);
      expect(data.name).toBe('Test Script');
      expect(data.description).toBe('A test');
      expect(data.context).toBe('passage');
      expect(data.contextId).toBe('pass-1');
      expect(data.blocks).toHaveLength(1);
      expect(data.generatedLua).toBeTruthy();
      expect(data.created).toBeTruthy();
      expect(data.modified).toBeTruthy();
    });

    it('should deserialize from JSON', () => {
      const data: VisualScriptData = {
        id: 'test-id',
        name: 'Test Script',
        description: 'A test',
        context: 'global',
        blocks: [createBlock('print').serialize()],
        generatedLua: 'print()',
        created: '2025-01-01T00:00:00.000Z',
        modified: '2025-01-02T00:00:00.000Z',
      };

      const vs = VisualScript.deserialize(data);

      expect(vs.id).toBe('test-id');
      expect(vs.name).toBe('Test Script');
      expect(vs.description).toBe('A test');
      expect(vs.blocks).toHaveLength(1);
      expect(vs.blocks[0]).toBeInstanceOf(ScriptBlock);
    });

    it('should round-trip serialize/deserialize', () => {
      const original = new VisualScript({ name: 'Test' });
      original.addBlock(createBlock('print'));
      original.addBlock(createBlock('set_variable'));

      const data = original.serialize();
      const restored = VisualScript.deserialize(data);

      expect(restored.name).toBe(original.name);
      expect(restored.blocks).toHaveLength(2);
      expect(restored.toLua()).toBe(original.toLua());
    });
  });

  describe('Lua import (placeholder)', () => {
    it('should create empty visual script from Lua code', () => {
      const vs = VisualScript.fromLua('Test', 'health = 100\nprint("Hello")');

      expect(vs.name).toBe('Test');
      expect(vs.description).toContain('not parsed');
      expect(vs.blocks).toHaveLength(0);
    });
  });
});

describe('VisualScriptCollection', () => {
  describe('basic operations', () => {
    it('should add visual scripts', () => {
      const collection = new VisualScriptCollection();
      const vs = new VisualScript({ name: 'Test' });

      collection.set(vs);

      expect(collection.size).toBe(1);
      expect(collection.get(vs.id)).toBe(vs);
    });

    it('should check existence', () => {
      const collection = new VisualScriptCollection();
      const vs = new VisualScript({ name: 'Test' });

      collection.set(vs);

      expect(collection.has(vs.id)).toBe(true);
      expect(collection.has('non-existent')).toBe(false);
    });

    it('should delete visual scripts', () => {
      const collection = new VisualScriptCollection();
      const vs = new VisualScript({ name: 'Test' });

      collection.set(vs);
      const deleted = collection.delete(vs.id);

      expect(deleted).toBe(true);
      expect(collection.size).toBe(0);
    });

    it('should get all visual scripts', () => {
      const collection = new VisualScriptCollection();
      const vs1 = new VisualScript({ name: 'Script 1' });
      const vs2 = new VisualScript({ name: 'Script 2' });

      collection.set(vs1);
      collection.set(vs2);

      const all = collection.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContain(vs1);
      expect(all).toContain(vs2);
    });

    it('should clear all visual scripts', () => {
      const collection = new VisualScriptCollection();
      collection.set(new VisualScript({ name: 'Test 1' }));
      collection.set(new VisualScript({ name: 'Test 2' }));

      collection.clear();

      expect(collection.size).toBe(0);
    });
  });

  describe('context filtering', () => {
    it('should get visual scripts by context', () => {
      const collection = new VisualScriptCollection();

      const global1 = new VisualScript({ name: 'Global 1', context: 'global' });
      const global2 = new VisualScript({ name: 'Global 2', context: 'global' });
      const passage1 = new VisualScript({ name: 'Passage 1', context: 'passage', contextId: 'pass-1' });

      collection.set(global1);
      collection.set(global2);
      collection.set(passage1);

      const globals = collection.getByContext('global');

      expect(globals).toHaveLength(2);
      expect(globals).toContain(global1);
      expect(globals).toContain(global2);
    });

    it('should filter by context and contextId', () => {
      const collection = new VisualScriptCollection();

      const passage1 = new VisualScript({ name: 'Passage 1', context: 'passage', contextId: 'pass-1' });
      const passage2 = new VisualScript({ name: 'Passage 2', context: 'passage', contextId: 'pass-2' });

      collection.set(passage1);
      collection.set(passage2);

      const filtered = collection.getByContext('passage', 'pass-1');

      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toBe(passage1);
    });

    it('should get visual scripts for a passage', () => {
      const collection = new VisualScriptCollection();

      const passage = new VisualScript({ name: 'Passage', context: 'passage', contextId: 'pass-1' });
      const onEnter = new VisualScript({ name: 'On Enter', context: 'onEnter', contextId: 'pass-1' });
      const onExit = new VisualScript({ name: 'On Exit', context: 'onExit', contextId: 'pass-1' });
      const other = new VisualScript({ name: 'Other', context: 'passage', contextId: 'pass-2' });

      collection.set(passage);
      collection.set(onEnter);
      collection.set(onExit);
      collection.set(other);

      const forPassage = collection.getForPassage('pass-1');

      expect(forPassage).toHaveLength(3);
      expect(forPassage).toContain(passage);
      expect(forPassage).toContain(onEnter);
      expect(forPassage).toContain(onExit);
      expect(forPassage).not.toContain(other);
    });
  });

  describe('serialization', () => {
    it('should serialize collection', () => {
      const collection = new VisualScriptCollection();

      const vs1 = new VisualScript({ name: 'Script 1' });
      const vs2 = new VisualScript({ name: 'Script 2' });

      collection.set(vs1);
      collection.set(vs2);

      const data = collection.serialize();

      expect(Object.keys(data)).toHaveLength(2);
      expect(data[vs1.id]).toBeDefined();
      expect(data[vs2.id]).toBeDefined();
      expect(data[vs1.id].name).toBe('Script 1');
    });

    it('should deserialize collection', () => {
      const vs1 = new VisualScript({ name: 'Script 1' });
      const vs2 = new VisualScript({ name: 'Script 2' });

      const data = {
        [vs1.id]: vs1.serialize(),
        [vs2.id]: vs2.serialize(),
      };

      const collection = VisualScriptCollection.deserialize(data);

      expect(collection.size).toBe(2);
      expect(collection.get(vs1.id)?.name).toBe('Script 1');
      expect(collection.get(vs2.id)?.name).toBe('Script 2');
    });

    it('should round-trip serialize/deserialize collection', () => {
      const original = new VisualScriptCollection();

      original.set(new VisualScript({ name: 'Script 1', context: 'global' }));
      original.set(new VisualScript({ name: 'Script 2', context: 'passage', contextId: 'pass-1' }));

      const data = original.serialize();
      const restored = VisualScriptCollection.deserialize(data);

      expect(restored.size).toBe(2);
      expect(restored.getByContext('global')).toHaveLength(1);
      expect(restored.getForPassage('pass-1')).toHaveLength(1);
    });
  });
});
