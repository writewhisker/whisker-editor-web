import { describe, it, expect, beforeEach } from 'vitest';
import { Passage } from './Passage';
import { Choice } from './Choice';

describe('Passage', () => {
  let passage: Passage;

  beforeEach(() => {
    passage = new Passage({
      title: 'Test Passage',
      content: 'This is test content',
      position: { x: 100, y: 200 },
    });
  });

  describe('constructor', () => {
    it('should create a passage with provided data', () => {
      expect(passage.title).toBe('Test Passage');
      expect(passage.content).toBe('This is test content');
      expect(passage.position).toEqual({ x: 100, y: 200 });
      expect(passage.tags).toEqual([]);
      expect(passage.choices).toEqual([]);
    });

    it('should generate a unique id', () => {
      const passage2 = new Passage({ title: 'Another' });
      expect(passage.id).toBeTruthy();
      expect(passage2.id).toBeTruthy();
      expect(passage.id).not.toBe(passage2.id);
    });

    it('should use provided id if given', () => {
      const customPassage = new Passage({
        id: 'custom-id',
        title: 'Custom',
      });
      expect(customPassage.id).toBe('custom-id');
    });

    it('should initialize with default values', () => {
      const minimal = new Passage({ title: 'Minimal' });
      expect(minimal.content).toBe('');
      expect(minimal.position).toEqual({ x: 0, y: 0 });
      expect(minimal.tags).toEqual([]);
      expect(minimal.choices).toEqual([]);
    });
  });

  describe('addChoice', () => {
    it('should add a choice to the passage', () => {
      const choice = new Choice({ text: 'Go north', target: 'north-room' });
      passage.addChoice(choice);
      expect(passage.choices).toHaveLength(1);
      expect(passage.choices[0]).toBe(choice);
    });

    it('should add multiple choices', () => {
      const choice1 = new Choice({ text: 'Option 1', target: 'target1' });
      const choice2 = new Choice({ text: 'Option 2', target: 'target2' });
      passage.addChoice(choice1);
      passage.addChoice(choice2);
      expect(passage.choices).toHaveLength(2);
    });
  });

  describe('removeChoice', () => {
    it('should remove a choice by id', () => {
      const choice = new Choice({ text: 'Test choice', target: 'somewhere' });
      passage.addChoice(choice);
      expect(passage.choices).toHaveLength(1);

      passage.removeChoice(choice.id);
      expect(passage.choices).toHaveLength(0);
    });

    it('should not error when removing non-existent choice', () => {
      expect(() => passage.removeChoice('non-existent-id')).not.toThrow();
    });
  });

  describe('serialize/deserialize', () => {
    it('should serialize to PassageData', () => {
      passage.tags = ['tag1', 'tag2'];
      const choice = new Choice({ text: 'A choice', target: 'dest' });
      passage.addChoice(choice);

      const data = passage.serialize();
      expect(data.id).toBe(passage.id);
      expect(data.title).toBe('Test Passage');
      expect(data.content).toBe('This is test content');
      expect(data.position).toEqual({ x: 100, y: 200 });
      expect(data.tags).toEqual(['tag1', 'tag2']);
      expect(data.choices).toHaveLength(1);
    });

    it('should deserialize from PassageData', () => {
      const data = {
        id: 'test-id',
        title: 'Deserialized',
        content: 'Content here',
        position: { x: 50, y: 75 },
        tags: ['a', 'b'],
        choices: [
          { id: 'c1', text: 'Choice 1', target: 't1' },
        ],
      };

      const deserialized = Passage.deserialize(data);
      expect(deserialized.id).toBe('test-id');
      expect(deserialized.title).toBe('Deserialized');
      expect(deserialized.content).toBe('Content here');
      expect(deserialized.position).toEqual({ x: 50, y: 75 });
      expect(deserialized.tags).toEqual(['a', 'b']);
      expect(deserialized.choices).toHaveLength(1);
      expect(deserialized.choices[0].text).toBe('Choice 1');
    });
  });

  describe('color property', () => {
    it('should accept color in constructor', () => {
      const coloredPassage = new Passage({
        title: 'Colored',
        color: '#FF0000',
      });
      expect(coloredPassage.color).toBe('#FF0000');
    });

    it('should serialize color when set', () => {
      passage.color = '#3B82F6';
      const data = passage.serialize();
      expect(data.color).toBe('#3B82F6');
    });

    it('should not include color in serialized data when undefined', () => {
      const data = passage.serialize();
      expect(data.color).toBeUndefined();
    });

    it('should deserialize color from PassageData', () => {
      const data = {
        id: 'test-id',
        title: 'Test',
        content: 'Content',
        position: { x: 0, y: 0 },
        choices: [],
        color: '#10B981',
      };

      const deserialized = Passage.deserialize(data);
      expect(deserialized.color).toBe('#10B981');
    });

    it('should handle missing color in deserialization', () => {
      const data = {
        id: 'test-id',
        title: 'Test',
        content: 'Content',
        position: { x: 0, y: 0 },
        choices: [],
      };

      const deserialized = Passage.deserialize(data);
      expect(deserialized.color).toBeUndefined();
    });

    it('should preserve color through clone (but with new ID)', () => {
      passage.color = '#EC4899';
      const cloned = passage.clone();
      expect(cloned.color).toBe('#EC4899');
      expect(cloned.id).not.toBe(passage.id);
      expect(cloned.title).toBe('Test Passage (copy)');
    });
  });

  describe('size property', () => {
    it('should have default size of 200x150', () => {
      expect(passage.size).toEqual({ width: 200, height: 150 });
    });

    it('should accept custom size in constructor', () => {
      const customPassage = new Passage({
        title: 'Custom Size',
        size: { width: 300, height: 250 },
      });
      expect(customPassage.size).toEqual({ width: 300, height: 250 });
    });

    it('should serialize size', () => {
      passage.size = { width: 400, height: 300 };
      const data = passage.serialize();
      expect(data.size).toEqual({ width: 400, height: 300 });
    });

    it('should deserialize size from PassageData', () => {
      const data = {
        id: 'test-id',
        title: 'Test',
        content: 'Content',
        position: { x: 0, y: 0 },
        size: { width: 500, height: 400 },
        choices: [],
      };

      const deserialized = Passage.deserialize(data);
      expect(deserialized.size).toEqual({ width: 500, height: 400 });
    });
  });

  describe('metadata property', () => {
    it('should initialize with empty metadata object', () => {
      expect(passage.metadata).toEqual({});
    });

    it('should accept metadata in constructor', () => {
      const passageWithMetadata = new Passage({
        title: 'Test',
        metadata: { customKey: 'customValue', count: 42 },
      });
      expect(passageWithMetadata.metadata).toEqual({ customKey: 'customValue', count: 42 });
    });

    it('should set metadata with setMetadata', () => {
      passage.setMetadata('key1', 'value1');
      expect(passage.metadata.key1).toBe('value1');
    });

    it('should get metadata with getMetadata', () => {
      passage.setMetadata('key2', 'value2');
      expect(passage.getMetadata('key2')).toBe('value2');
    });

    it('should return default value for missing metadata key', () => {
      expect(passage.getMetadata('nonexistent', 'default')).toBe('default');
    });

    it('should check metadata existence with hasMetadata', () => {
      passage.setMetadata('key3', 'value3');
      expect(passage.hasMetadata('key3')).toBe(true);
      expect(passage.hasMetadata('nonexistent')).toBe(false);
    });

    it('should delete metadata with deleteMetadata', () => {
      passage.setMetadata('key4', 'value4');
      expect(passage.hasMetadata('key4')).toBe(true);

      const deleted = passage.deleteMetadata('key4');
      expect(deleted).toBe(true);
      expect(passage.hasMetadata('key4')).toBe(false);
    });

    it('should return false when deleting non-existent metadata', () => {
      const deleted = passage.deleteMetadata('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should serialize metadata', () => {
      passage.setMetadata('author', 'John Doe');
      passage.setMetadata('difficulty', 'hard');
      const data = passage.serialize();
      expect(data.metadata).toEqual({ author: 'John Doe', difficulty: 'hard' });
    });

    it('should deserialize metadata from PassageData', () => {
      const data = {
        id: 'test-id',
        title: 'Test',
        content: 'Content',
        position: { x: 0, y: 0 },
        choices: [],
        metadata: { custom: 'data', numeric: 123 },
      };

      const deserialized = Passage.deserialize(data);
      expect(deserialized.metadata).toEqual({ custom: 'data', numeric: 123 });
    });
  });

  describe('name property', () => {
    it('should return title as name', () => {
      expect(passage.name).toBe('Test Passage');
    });

    it('should set title when setting name', () => {
      passage.name = 'New Name';
      expect(passage.title).toBe('New Name');
      expect(passage.name).toBe('New Name');
    });

    it('should accept name in constructor (as alias for title)', () => {
      const namedPassage = new Passage({
        name: 'Named Passage',
      });
      expect(namedPassage.title).toBe('Named Passage');
      expect(namedPassage.name).toBe('Named Passage');
    });

    it('should prioritize title over name in constructor', () => {
      const passage = new Passage({
        title: 'Title Value',
        name: 'Name Value',
      });
      expect(passage.title).toBe('Title Value');
      expect(passage.name).toBe('Title Value');
    });
  });
});
