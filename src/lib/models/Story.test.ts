import { describe, it, expect, beforeEach } from 'vitest';
import { Story } from './Story';
import { Passage } from './Passage';
import { Variable } from './Variable';
import { Choice } from './Choice';

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
        type: 'image' as const,
        path: 'path/to/asset.png',
        mimeType: 'image/png',
      };
      story.addAsset(asset);
      expect(story.assets.size).toBe(1);
      expect(story.getAsset('asset1')).toEqual(asset);
    });

    it('should remove an asset by id', () => {
      const asset1 = { id: 'asset1', name: 'Asset 1', type: 'image' as const, path: 'path1', mimeType: 'image/png' };
      const asset2 = { id: 'asset2', name: 'Asset 2', type: 'image' as const, path: 'path2', mimeType: 'image/png' };
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
      const asset = { id: 'asset1', name: 'Test', type: 'image' as const, path: 'path', mimeType: 'image/png' };
      story.addAsset(asset);
      expect(story.getAsset('asset1')).toEqual(asset);
    });

    it('should return undefined for non-existent asset', () => {
      expect(story.getAsset('nonexistent')).toBeUndefined();
    });

    it('should update an asset', () => {
      const asset = { id: 'asset1', name: 'Original', type: 'image' as const, path: 'path', mimeType: 'image/png' };
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
      story.addAsset({ id: 'asset1', name: 'Asset', type: 'image' as const, path: 'path', mimeType: 'image/png' });

      const data = story.serialize();
      expect(data.stylesheets).toEqual(['body { color: red; }']);
      expect(data.scripts).toEqual(['function test() {}']);
      expect(data.assets).toEqual([{ id: 'asset1', name: 'Asset', type: 'image', path: 'path', mimeType: 'image/png' }]);
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
          { id: 'asset1', name: 'Asset 1', type: 'image' as const, path: 'path1', mimeType: 'image/png' },
          { id: 'asset2', name: 'Asset 2', type: 'audio' as const, path: 'path2', mimeType: 'audio/mp3' },
        ],
      };

      const loaded = Story.deserialize(data);
      expect(loaded.stylesheets).toEqual(['css1', 'css2']);
      expect(loaded.scripts).toEqual(['script1', 'script2']);
      expect(loaded.assets.size).toBe(2);
      expect(loaded.getAsset('asset1')).toEqual({ id: 'asset1', name: 'Asset 1', type: 'image', path: 'path1', mimeType: 'image/png' });
      expect(loaded.getAsset('asset2')).toEqual({ id: 'asset2', name: 'Asset 2', type: 'audio', path: 'path2', mimeType: 'audio/mp3' });
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

  // Phase 3: Story Settings Management
  describe('settings management', () => {
    it('should initialize with empty settings', () => {
      expect(story.settings).toEqual({});
      expect(Object.keys(story.settings)).toHaveLength(0);
    });

    it('should set a setting', () => {
      story.setSetting('difficulty', 'medium');
      expect(story.getSetting('difficulty')).toBe('medium');
    });

    it('should throw error for empty key', () => {
      expect(() => story.setSetting('', 'value')).toThrow('Invalid setting key');
    });

    it('should get a setting with default value', () => {
      expect(story.getSetting('nonexistent', 'default')).toBe('default');
    });

    it('should check if setting exists', () => {
      story.setSetting('theme', 'dark');
      expect(story.hasSetting('theme')).toBe(true);
      expect(story.hasSetting('nonexistent')).toBe(false);
    });

    it('should delete a setting', () => {
      story.setSetting('temp', 'value');
      expect(story.hasSetting('temp')).toBe(true);

      const deleted = story.deleteSetting('temp');
      expect(deleted).toBe(true);
      expect(story.hasSetting('temp')).toBe(false);
    });

    it('should return false when deleting non-existent setting', () => {
      expect(story.deleteSetting('nonexistent')).toBe(false);
    });

    it('should get all settings', () => {
      story.setSetting('key1', 'value1');
      story.setSetting('key2', 42);
      story.setSetting('key3', true);

      const allSettings = story.getAllSettings();
      expect(allSettings).toEqual({
        key1: 'value1',
        key2: 42,
        key3: true,
      });
    });

    it('should clear all settings', () => {
      story.setSetting('key1', 'value1');
      story.setSetting('key2', 'value2');
      expect(Object.keys(story.getAllSettings())).toHaveLength(2);

      story.clearSettings();
      expect(story.settings).toEqual({});
      expect(Object.keys(story.getAllSettings())).toHaveLength(0);
    });

    it('should handle various value types', () => {
      story.setSetting('stringVal', 'text');
      story.setSetting('numberVal', 123);
      story.setSetting('boolVal', false);
      story.setSetting('objectVal', { nested: 'data' });
      story.setSetting('arrayVal', [1, 2, 3]);

      expect(story.getSetting('stringVal')).toBe('text');
      expect(story.getSetting('numberVal')).toBe(123);
      expect(story.getSetting('boolVal')).toBe(false);
      expect(story.getSetting('objectVal')).toEqual({ nested: 'data' });
      expect(story.getSetting('arrayVal')).toEqual([1, 2, 3]);
    });

    it('should serialize settings', () => {
      story.setSetting('difficulty', 'hard');
      story.setSetting('autoSave', true);

      const data = story.serialize();
      expect(data.settings).toEqual({
        difficulty: 'hard',
        autoSave: true,
      });
    });

    it('should not serialize empty settings', () => {
      const data = story.serialize();
      expect(data.settings).toBeUndefined();
    });

    it('should deserialize settings', () => {
      const data = {
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2024-01-01T00:00:00.000Z',
          modified: '2024-01-01T00:00:00.000Z',
        },
        startPassage: 'start',
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Content',
            position: { x: 0, y: 0 },
            tags: [],
            choices: [],
          },
        },
        variables: {},
        settings: {
          theme: 'dark',
          volume: 0.8,
          enableHints: true,
        },
      };

      const loaded = Story.deserialize(data);
      expect(loaded.getSetting('theme')).toBe('dark');
      expect(loaded.getSetting('volume')).toBe(0.8);
      expect(loaded.getSetting('enableHints')).toBe(true);
    });
  });

  // Phase 3: Variable Usage Tracking
  describe('variable usage tracking', () => {
    beforeEach(() => {
      // Add some test variables
      story.addVariable(new Variable({ name: 'health', type: 'number', initial: 100 }));
      story.addVariable(new Variable({ name: 'playerName', type: 'string', initial: 'Hero' }));
      story.addVariable(new Variable({ name: 'hasKey', type: 'boolean', initial: false }));
      story.addVariable(new Variable({ name: 'unused', type: 'string', initial: '' }));
    });

    it('should track variable usage in passage content', () => {
      const passage = new Passage({
        title: 'Test Passage',
        content: 'Your health is {{health}}. Welcome, {{playerName}}!',
      });
      story.addPassage(passage);

      const healthUsage = story.getVariableUsage('health');
      expect(healthUsage).toHaveLength(1);
      expect(healthUsage[0].passageId).toBe(passage.id);
      expect(healthUsage[0].passageName).toBe('Test Passage');
      expect(healthUsage[0].locations).toContain('content');

      const nameUsage = story.getVariableUsage('playerName');
      expect(nameUsage).toHaveLength(1);
      expect(nameUsage[0].locations).toContain('content');
    });

    it('should track variable usage in choice conditions', () => {
      const passage = new Passage({
        title: 'Choice Passage',
        content: 'What do you do?',
      });
      passage.choices.push(new Choice({
        id: 'choice1',
        text: 'Open door',
        target: 'next',
        condition: 'hasKey == true',
      }));
      story.addPassage(passage);

      const usage = story.getVariableUsage('hasKey');
      expect(usage).toHaveLength(1);
      expect(usage[0].locations).toContain('choice:0:condition');
    });

    it('should track variable usage in choice actions', () => {
      const passage = new Passage({
        title: 'Action Passage',
        content: 'You find a potion.',
      });
      passage.choices.push(new Choice({
        id: 'choice1',
        text: 'Drink it',
        target: 'next',
        action: 'health = health + 50',
      }));
      story.addPassage(passage);

      const usage = story.getVariableUsage('health');
      expect(usage).toHaveLength(1);
      expect(usage[0].locations).toContain('choice:0:action');
    });

    it('should track variable usage in scripts', () => {
      const passage = new Passage({
        title: 'Script Passage',
        content: 'Enter the room.',
        onEnterScript: 'health = health - 10',
        onExitScript: 'hasKey = true',
      });
      story.addPassage(passage);

      const healthUsage = story.getVariableUsage('health');
      expect(healthUsage).toHaveLength(1);
      expect(healthUsage[0].locations).toContain('script:onEnter');

      const keyUsage = story.getVariableUsage('hasKey');
      expect(keyUsage).toHaveLength(1);
      expect(keyUsage[0].locations).toContain('script:onExit');
    });

    it('should track variable usage in multiple locations within one passage', () => {
      const passage = new Passage({
        title: 'Multi Usage',
        content: 'Health: {{health}}',
        onEnterScript: 'health = 100',
      });
      passage.choices.push(new Choice({
        id: 'choice1',
        text: 'Continue',
        target: 'next',
        condition: 'health > 0',
      }));
      story.addPassage(passage);

      const usage = story.getVariableUsage('health');
      expect(usage).toHaveLength(1);
      expect(usage[0].locations).toContain('content');
      expect(usage[0].locations).toContain('script:onEnter');
      expect(usage[0].locations).toContain('choice:0:condition');
      expect(usage[0].locations.length).toBe(3);
    });

    it('should track variable usage across multiple passages', () => {
      const passage1 = new Passage({
        title: 'Passage 1',
        content: 'Health: {{health}}',
      });
      const passage2 = new Passage({
        title: 'Passage 2',
        content: 'Your health is {{health}}.',
      });
      story.addPassage(passage1);
      story.addPassage(passage2);

      const usage = story.getVariableUsage('health');
      expect(usage).toHaveLength(2);
      expect(usage.map(u => u.passageName)).toContain('Passage 1');
      expect(usage.map(u => u.passageName)).toContain('Passage 2');
    });

    it('should return empty array for unused variable', () => {
      const usage = story.getVariableUsage('unused');
      expect(usage).toHaveLength(0);
    });

    it('should get all variable usage', () => {
      const passage = new Passage({
        title: 'Test',
        content: 'Health: {{health}}, Name: {{playerName}}',
      });
      story.addPassage(passage);

      const allUsage = story.getAllVariableUsage();
      expect(allUsage.size).toBe(4); // All 4 variables
      expect(allUsage.get('health')).toHaveLength(1);
      expect(allUsage.get('playerName')).toHaveLength(1);
      expect(allUsage.get('hasKey')).toHaveLength(0);
      expect(allUsage.get('unused')).toHaveLength(0);
    });

    it('should get unused variables', () => {
      const passage = new Passage({
        title: 'Test',
        content: 'Health: {{health}}',
      });
      story.addPassage(passage);

      const unused = story.getUnusedVariables();
      expect(unused).toContain('unused');
      expect(unused).toContain('playerName');
      expect(unused).toContain('hasKey');
      expect(unused).not.toContain('health');
      expect(unused).toHaveLength(3);
    });

    it('should return empty array when all variables are used', () => {
      const passage = new Passage({
        title: 'Test',
        content: 'Health: {{health}}, Name: {{playerName}}, Key: {{hasKey}}, Unused: {{unused}}',
      });
      story.addPassage(passage);

      const unused = story.getUnusedVariables();
      expect(unused).toHaveLength(0);
    });
  });
});
