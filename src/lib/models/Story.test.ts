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

  describe('stylesheet management', () => {
    it('should initialize with empty stylesheets array', () => {
      expect(story.stylesheets).toEqual([]);
    });

    it('should add a stylesheet', () => {
      const index = story.addStylesheet('body { color: red; }');
      expect(index).toBe(0);
      expect(story.stylesheets).toHaveLength(1);
      expect(story.stylesheets[0]).toBe('body { color: red; }');
    });

    it('should remove a stylesheet by index', () => {
      story.addStylesheet('css1');
      story.addStylesheet('css2');
      story.addStylesheet('css3');

      const removed = story.removeStylesheet(1);
      expect(removed).toBe(true);
      expect(story.stylesheets).toHaveLength(2);
      expect(story.stylesheets[0]).toBe('css1');
      expect(story.stylesheets[1]).toBe('css3');
    });

    it('should return false when removing invalid stylesheet index', () => {
      story.addStylesheet('css1');
      expect(story.removeStylesheet(5)).toBe(false);
      expect(story.stylesheets).toHaveLength(1);
    });

    it('should update a stylesheet by index', () => {
      story.addStylesheet('old css');
      const updated = story.updateStylesheet(0, 'new css');
      expect(updated).toBe(true);
      expect(story.stylesheets[0]).toBe('new css');
    });

    it('should return false when updating invalid stylesheet index', () => {
      expect(story.updateStylesheet(0, 'css')).toBe(false);
    });
  });

  describe('script management', () => {
    it('should initialize with empty scripts array', () => {
      expect(story.scripts).toEqual([]);
    });

    it('should add a script', () => {
      const index = story.addScript('function test() {}');
      expect(index).toBe(0);
      expect(story.scripts).toHaveLength(1);
      expect(story.scripts[0]).toBe('function test() {}');
    });

    it('should remove a script by index', () => {
      story.addScript('script1');
      story.addScript('script2');
      story.addScript('script3');

      const removed = story.removeScript(1);
      expect(removed).toBe(true);
      expect(story.scripts).toHaveLength(2);
      expect(story.scripts[0]).toBe('script1');
      expect(story.scripts[1]).toBe('script3');
    });

    it('should return false when removing invalid script index', () => {
      story.addScript('script1');
      expect(story.removeScript(5)).toBe(false);
      expect(story.scripts).toHaveLength(1);
    });

    it('should update a script by index', () => {
      story.addScript('old script');
      const updated = story.updateScript(0, 'new script');
      expect(updated).toBe(true);
      expect(story.scripts[0]).toBe('new script');
    });

    it('should return false when updating invalid script index', () => {
      expect(story.updateScript(0, 'script')).toBe(false);
    });
  });

  describe('asset management', () => {
    it('should initialize with empty assets map', () => {
      expect(story.assets.size).toBe(0);
    });

    it('should add an asset', () => {
      const asset = {
        id: 'asset1',
        name: 'Test Asset',
        path: 'path/to/asset.png',
        mimeType: 'image/png',
      };
      story.addAsset(asset);
      expect(story.assets.size).toBe(1);
      expect(story.getAsset('asset1')).toEqual(asset);
    });

    it('should remove an asset by id', () => {
      const asset1 = { id: 'asset1', name: 'Asset 1', path: 'path1', mimeType: 'image/png' };
      const asset2 = { id: 'asset2', name: 'Asset 2', path: 'path2', mimeType: 'image/png' };
      story.addAsset(asset1);
      story.addAsset(asset2);

      const removed = story.removeAsset('asset1');
      expect(removed).toBe(true);
      expect(story.assets.size).toBe(1);
      expect(story.getAsset('asset1')).toBeUndefined();
      expect(story.getAsset('asset2')).toEqual(asset2);
    });

    it('should return false when removing non-existent asset', () => {
      expect(story.removeAsset('nonexistent')).toBe(false);
    });

    it('should get an asset by id', () => {
      const asset = { id: 'asset1', name: 'Test', path: 'path', mimeType: 'image/png' };
      story.addAsset(asset);
      expect(story.getAsset('asset1')).toEqual(asset);
    });

    it('should return undefined for non-existent asset', () => {
      expect(story.getAsset('nonexistent')).toBeUndefined();
    });

    it('should update an asset', () => {
      const asset = { id: 'asset1', name: 'Original', path: 'path', mimeType: 'image/png' };
      story.addAsset(asset);

      const updated = story.updateAsset('asset1', { name: 'Updated', size: 1024 });
      expect(updated).toBe(true);

      const retrievedAsset = story.getAsset('asset1');
      expect(retrievedAsset?.name).toBe('Updated');
      expect(retrievedAsset?.size).toBe(1024);
      expect(retrievedAsset?.path).toBe('path');
    });

    it('should return false when updating non-existent asset', () => {
      expect(story.updateAsset('nonexistent', { name: 'Test' })).toBe(false);
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

    it('should serialize stylesheets, scripts, and assets', () => {
      story.addStylesheet('body { color: red; }');
      story.addScript('function test() {}');
      story.addAsset({ id: 'asset1', name: 'Asset', path: 'path', mimeType: 'image/png' });

      const data = story.serialize();
      expect(data.stylesheets).toEqual(['body { color: red; }']);
      expect(data.scripts).toEqual(['function test() {}']);
      expect(data.assets).toEqual([{ id: 'asset1', name: 'Asset', path: 'path', mimeType: 'image/png' }]);
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
        passages: {
          'start-id': {
            id: 'start-id',
            title: 'Beginning',
            content: 'Start here',
            position: { x: 0, y: 0 },
            tags: [],
            choices: [],
          },
        },
        variables: {
          'lives': {
            name: 'lives',
            type: 'number' as const,
            initial: 3,
          },
        },
      };

      const loaded = Story.deserialize(data);
      expect(loaded.metadata.title).toBe('Loaded Story');
      expect(loaded.startPassage).toBe('start-id');
      expect(loaded.passages.size).toBe(1);
      expect(loaded.variables.size).toBe(1);
    });

    it('should deserialize stylesheets, scripts, and assets', () => {
      const data = {
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2024-01-01T00:00:00.000Z',
          modified: '2024-01-01T00:00:00.000Z',
        },
        startPassage: 'start-id',
        passages: {
          'start-id': {
            id: 'start-id',
            title: 'Start',
            content: 'Content',
            position: { x: 0, y: 0 },
            tags: [],
            choices: [],
          },
        },
        variables: {},
        stylesheets: ['css1', 'css2'],
        scripts: ['script1', 'script2'],
        assets: [
          { id: 'asset1', name: 'Asset 1', path: 'path1', mimeType: 'image/png' },
          { id: 'asset2', name: 'Asset 2', path: 'path2', mimeType: 'audio/mp3' },
        ],
      };

      const loaded = Story.deserialize(data);
      expect(loaded.stylesheets).toEqual(['css1', 'css2']);
      expect(loaded.scripts).toEqual(['script1', 'script2']);
      expect(loaded.assets.size).toBe(2);
      expect(loaded.getAsset('asset1')).toEqual({ id: 'asset1', name: 'Asset 1', path: 'path1', mimeType: 'image/png' });
      expect(loaded.getAsset('asset2')).toEqual({ id: 'asset2', name: 'Asset 2', path: 'path2', mimeType: 'audio/mp3' });
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
