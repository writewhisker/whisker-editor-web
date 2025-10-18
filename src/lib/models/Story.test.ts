import { describe, it, expect, beforeEach } from 'vitest';
import { Story } from './Story';
import { Passage } from './Passage';
import { Variable } from './Variable';

describe('Story', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
      },
    });
  });

  describe('constructor', () => {
    it('should create a story with metadata', () => {
      expect(story.metadata.title).toBe('Test Story');
      expect(story.metadata.author).toBe('Test Author');
      expect(story.metadata.version).toBe('1.0.0');
    });

    it('should initialize with a start passage', () => {
      expect(story.passages.size).toBe(1);
      expect(story.startPassage).toBeTruthy();
      const startPassage = story.getPassage(story.startPassage!);
      expect(startPassage?.title).toBe('Start');
    });

    it('should initialize with empty variables', () => {
      expect(story.variables.size).toBe(0);
    });
  });

  describe('addPassage', () => {
    it('should add a passage to the story', () => {
      const passage = new Passage({ title: 'New Passage' });
      story.addPassage(passage);
      expect(story.passages.size).toBe(2);
      expect(story.getPassage(passage.id)).toBe(passage);
    });
  });

  describe('removePassage', () => {
    it('should remove a passage from the story', () => {
      const passage = new Passage({ title: 'To Remove' });
      story.addPassage(passage);
      const initialSize = story.passages.size;

      story.removePassage(passage.id);
      expect(story.passages.size).toBe(initialSize - 1);
      expect(story.getPassage(passage.id)).toBeUndefined();
    });
  });

  describe('getPassage', () => {
    it('should retrieve a passage by id', () => {
      const passage = new Passage({ title: 'Find Me' });
      story.addPassage(passage);

      const retrieved = story.getPassage(passage.id);
      expect(retrieved).toBe(passage);
    });

    it('should return undefined for non-existent passage', () => {
      const retrieved = story.getPassage('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('addVariable', () => {
    it('should add a variable to the story', () => {
      const variable = new Variable({
        name: 'health',
        type: 'number',
        initial: 100,
      });

      story.addVariable(variable);
      expect(story.variables.size).toBe(1);
      expect(story.getVariable('health')).toBe(variable);
    });
  });

  describe('removeVariable', () => {
    it('should remove a variable from the story', () => {
      const variable = new Variable({
        name: 'temp',
        type: 'string',
        initial: 'test',
      });

      story.addVariable(variable);
      expect(story.variables.size).toBe(1);

      story.removeVariable('temp');
      expect(story.variables.size).toBe(0);
      expect(story.getVariable('temp')).toBeUndefined();
    });
  });

  describe('getVariable', () => {
    it('should retrieve a variable by name', () => {
      const variable = new Variable({
        name: 'score',
        type: 'number',
        initial: 0,
      });

      story.addVariable(variable);
      const retrieved = story.getVariable('score');
      expect(retrieved).toBe(variable);
    });

    it('should return undefined for non-existent variable', () => {
      const retrieved = story.getVariable('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('updateModified', () => {
    it('should update the modified timestamp', () => {
      const original = story.metadata.modified;

      // Wait a tiny bit to ensure timestamp changes
      setTimeout(() => {
        story.updateModified();
        expect(story.metadata.modified).not.toBe(original);
      }, 10);
    });
  });

  describe('serialize/deserialize', () => {
    it('should serialize story data', () => {
      const passage = new Passage({ title: 'Extra Passage' });
      story.addPassage(passage);

      const variable = new Variable({
        name: 'testVar',
        type: 'string',
        initial: 'value',
      });
      story.addVariable(variable);

      const data = story.serialize();
      expect(data.metadata.title).toBe('Test Story');
      expect(data.startPassage).toBe(story.startPassage);
      expect(Object.keys(data.passages)).toHaveLength(2);
      expect(Object.keys(data.variables)).toHaveLength(1);
    });

    it('should deserialize story data', () => {
      const data = {
        metadata: {
          title: 'Loaded Story',
          author: 'Someone',
          version: '2.0.0',
          created: '2024-06-01T00:00:00.000Z',
          modified: '2024-06-01T00:00:00.000Z',
        },
        startPassage: 'start-id',
        passages: [
          {
            id: 'start-id',
            title: 'Beginning',
            content: 'Start here',
            position: { x: 0, y: 0 },
            tags: [],
            choices: [],
          },
        ],
        variables: [
          {
            name: 'lives',
            type: 'number' as const,
            initial: 3,
          },
        ],
      };

      const loaded = Story.deserialize(data);
      expect(loaded.metadata.title).toBe('Loaded Story');
      expect(loaded.startPassage).toBe('start-id');
      expect(loaded.passages.size).toBe(1);
      expect(loaded.variables.size).toBe(1);
    });

    it('should serialize and deserialize project data', () => {
      const variable = new Variable({
        name: 'playerName',
        type: 'string',
        initial: 'Hero',
      });
      story.addVariable(variable);

      const projectData = story.serializeProject();
      expect(projectData.version).toBe('1.0.0');
      expect(projectData.metadata).toBeDefined();

      const loaded = Story.deserializeProject(projectData);
      expect(loaded.metadata.title).toBe('Test Story');
      expect(loaded.variables.size).toBe(1);
    });
  });
});
