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
});
