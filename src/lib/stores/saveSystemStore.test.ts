import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  saveSystemStore,
  storageType,
  slots,
  metadata,
  persistAll,
  type SaveStorageType,
  type SaveSlotType,
  type SaveMetadata,
} from './saveSystemStore';
import type { Story, Variable } from '@whisker/core-ts';

describe('saveSystemStore', () => {
  let story: Story;

  beforeEach(() => {
    story = {
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
      },
      variables: [
        { name: 'health', type: 'number', initialValue: 100 },
        { name: 'score', type: 'number', initialValue: 0 },
        { name: 'playerName', type: 'string', initialValue: '' },
        { name: 'isAlive', type: 'boolean', initialValue: true },
      ] as unknown as Variable[],
      passages: [],
      startPassage: '',
    } as unknown as Story;

    saveSystemStore.reset();
  });

  afterEach(() => {
    saveSystemStore.reset();
  });

  describe('initial state', () => {
    it('should initialize with localStorage as default storage type', () => {
      expect(get(storageType)).toBe('localStorage');
    });

    it('should initialize with default slot configuration', () => {
      const slotConfig = get(slots);

      expect(slotConfig).toHaveLength(3);
      expect(slotConfig.find(s => s.type === 'manual')?.count).toBe(3);
      expect(slotConfig.find(s => s.type === 'auto')?.count).toBe(1);
      expect(slotConfig.find(s => s.type === 'quick')?.enabled).toBe(false);
    });

    it('should initialize with default metadata settings', () => {
      const meta = get(metadata);

      expect(meta.includeTimestamp).toBe(true);
      expect(meta.includePlaytime).toBe(true);
      expect(meta.includeScreenshot).toBe(false);
      expect(meta.includePassageTitle).toBe(true);
      expect(meta.includeStoryProgress).toBe(true);
      expect(meta.customFields).toEqual([]);
    });

    it('should initialize with persistAll enabled', () => {
      expect(get(persistAll)).toBe(true);
    });

    it('should initialize with compression disabled', () => {
      const state = get(saveSystemStore);
      expect(state.compression).toBe(false);
    });

    it('should initialize with encryption disabled', () => {
      const state = get(saveSystemStore);
      expect(state.encryption).toBe(false);
    });

    it('should initialize with version tracking enabled', () => {
      const state = get(saveSystemStore);
      expect(state.versionTracking).toBe(true);
    });
  });

  describe('setStorageType', () => {
    it('should set storage type to localStorage', () => {
      saveSystemStore.setStorageType('localStorage');
      expect(get(storageType)).toBe('localStorage');
    });

    it('should set storage type to indexedDB', () => {
      saveSystemStore.setStorageType('indexedDB');
      expect(get(storageType)).toBe('indexedDB');
    });

    it('should set storage type to json', () => {
      saveSystemStore.setStorageType('json');
      expect(get(storageType)).toBe('json');
    });

    it('should set storage type to custom', () => {
      saveSystemStore.setStorageType('custom');
      expect(get(storageType)).toBe('custom');
    });
  });

  describe('updateSlot', () => {
    it('should update manual slot count', () => {
      saveSystemStore.updateSlot('manual', { count: 5 });

      const slotConfig = get(slots);
      const manualSlot = slotConfig.find(s => s.type === 'manual');
      expect(manualSlot?.count).toBe(5);
    });

    it('should update auto slot label', () => {
      saveSystemStore.updateSlot('auto', { label: 'Auto Save Slot' });

      const slotConfig = get(slots);
      const autoSlot = slotConfig.find(s => s.type === 'auto');
      expect(autoSlot?.label).toBe('Auto Save Slot');
    });

    it('should enable quick save slot', () => {
      saveSystemStore.updateSlot('quick', { enabled: true });

      const slotConfig = get(slots);
      const quickSlot = slotConfig.find(s => s.type === 'quick');
      expect(quickSlot?.enabled).toBe(true);
    });

    it('should preserve other slot properties when updating', () => {
      saveSystemStore.updateSlot('manual', { count: 10 });

      const slotConfig = get(slots);
      const manualSlot = slotConfig.find(s => s.type === 'manual');
      expect(manualSlot?.label).toBeDefined();
      expect(manualSlot?.enabled).toBeDefined();
    });

    it('should not affect other slot types', () => {
      saveSystemStore.updateSlot('manual', { count: 5 });

      const slotConfig = get(slots);
      const autoSlot = slotConfig.find(s => s.type === 'auto');
      expect(autoSlot?.count).toBe(1);
    });
  });

  describe('updateMetadata', () => {
    it('should toggle timestamp inclusion', () => {
      saveSystemStore.updateMetadata({ includeTimestamp: false });

      const meta = get(metadata);
      expect(meta.includeTimestamp).toBe(false);
    });

    it('should toggle playtime inclusion', () => {
      saveSystemStore.updateMetadata({ includePlaytime: false });

      const meta = get(metadata);
      expect(meta.includePlaytime).toBe(false);
    });

    it('should toggle screenshot inclusion', () => {
      saveSystemStore.updateMetadata({ includeScreenshot: true });

      const meta = get(metadata);
      expect(meta.includeScreenshot).toBe(true);
    });

    it('should toggle passage title inclusion', () => {
      saveSystemStore.updateMetadata({ includePassageTitle: false });

      const meta = get(metadata);
      expect(meta.includePassageTitle).toBe(false);
    });

    it('should toggle story progress inclusion', () => {
      saveSystemStore.updateMetadata({ includeStoryProgress: false });

      const meta = get(metadata);
      expect(meta.includeStoryProgress).toBe(false);
    });

    it('should preserve other metadata settings when updating', () => {
      saveSystemStore.updateMetadata({ includeTimestamp: false });

      const meta = get(metadata);
      expect(meta.includePlaytime).toBe(true);
      expect(meta.includePassageTitle).toBe(true);
    });
  });

  describe('addCustomField', () => {
    it('should add string custom field', () => {
      saveSystemStore.addCustomField('playerAge', 'Player Age', 'string');

      const meta = get(metadata);
      expect(meta.customFields).toHaveLength(1);
      expect(meta.customFields[0]).toEqual({
        key: 'playerAge',
        label: 'Player Age',
        type: 'string',
      });
    });

    it('should add number custom field', () => {
      saveSystemStore.addCustomField('attempts', 'Attempt Count', 'number');

      const meta = get(metadata);
      const field = meta.customFields.find(f => f.key === 'attempts');
      expect(field?.type).toBe('number');
    });

    it('should add boolean custom field', () => {
      saveSystemStore.addCustomField('hardMode', 'Hard Mode', 'boolean');

      const meta = get(metadata);
      const field = meta.customFields.find(f => f.key === 'hardMode');
      expect(field?.type).toBe('boolean');
    });

    it('should add multiple custom fields', () => {
      saveSystemStore.addCustomField('field1', 'Field 1', 'string');
      saveSystemStore.addCustomField('field2', 'Field 2', 'number');

      const meta = get(metadata);
      expect(meta.customFields).toHaveLength(2);
    });
  });

  describe('removeCustomField', () => {
    it('should remove custom field by key', () => {
      saveSystemStore.addCustomField('testField', 'Test', 'string');
      saveSystemStore.removeCustomField('testField');

      const meta = get(metadata);
      expect(meta.customFields).toHaveLength(0);
    });

    it('should not affect other custom fields', () => {
      saveSystemStore.addCustomField('field1', 'Field 1', 'string');
      saveSystemStore.addCustomField('field2', 'Field 2', 'string');

      saveSystemStore.removeCustomField('field1');

      const meta = get(metadata);
      expect(meta.customFields).toHaveLength(1);
      expect(meta.customFields[0].key).toBe('field2');
    });

    it('should handle removing non-existent field', () => {
      saveSystemStore.removeCustomField('nonExistent');

      const meta = get(metadata);
      expect(meta.customFields).toEqual([]);
    });
  });

  describe('setPersistVariables', () => {
    it('should set specific variables to persist', () => {
      saveSystemStore.setPersistVariables(['health', 'score']);

      const state = get(saveSystemStore);
      expect(state.persistVariables).toEqual(['health', 'score']);
    });

    it('should replace existing persist list', () => {
      saveSystemStore.setPersistVariables(['health']);
      saveSystemStore.setPersistVariables(['score']);

      const state = get(saveSystemStore);
      expect(state.persistVariables).toEqual(['score']);
    });

    it('should accept empty array', () => {
      saveSystemStore.setPersistVariables([]);

      const state = get(saveSystemStore);
      expect(state.persistVariables).toEqual([]);
    });
  });

  describe('setExcludeVariables', () => {
    it('should set variables to exclude', () => {
      saveSystemStore.setExcludeVariables(['tempVar', 'debugFlag']);

      const state = get(saveSystemStore);
      expect(state.excludeVariables).toEqual(['tempVar', 'debugFlag']);
    });

    it('should replace existing exclude list', () => {
      saveSystemStore.setExcludeVariables(['var1']);
      saveSystemStore.setExcludeVariables(['var2']);

      const state = get(saveSystemStore);
      expect(state.excludeVariables).toEqual(['var2']);
    });
  });

  describe('togglePersistAll', () => {
    it('should toggle persistAll from true to false', () => {
      expect(get(persistAll)).toBe(true);

      saveSystemStore.togglePersistAll();

      expect(get(persistAll)).toBe(false);
    });

    it('should toggle persistAll from false to true', () => {
      saveSystemStore.togglePersistAll(); // to false
      saveSystemStore.togglePersistAll(); // back to true

      expect(get(persistAll)).toBe(true);
    });
  });

  describe('setCompression', () => {
    it('should enable compression', () => {
      saveSystemStore.setCompression(true);

      const state = get(saveSystemStore);
      expect(state.compression).toBe(true);
    });

    it('should disable compression', () => {
      saveSystemStore.setCompression(true);
      saveSystemStore.setCompression(false);

      const state = get(saveSystemStore);
      expect(state.compression).toBe(false);
    });
  });

  describe('setEncryption', () => {
    it('should enable encryption', () => {
      saveSystemStore.setEncryption(true);

      const state = get(saveSystemStore);
      expect(state.encryption).toBe(true);
    });

    it('should disable encryption', () => {
      saveSystemStore.setEncryption(true);
      saveSystemStore.setEncryption(false);

      const state = get(saveSystemStore);
      expect(state.encryption).toBe(false);
    });
  });

  describe('setVersionTracking', () => {
    it('should enable version tracking', () => {
      saveSystemStore.setVersionTracking(true);

      const state = get(saveSystemStore);
      expect(state.versionTracking).toBe(true);
    });

    it('should disable version tracking', () => {
      saveSystemStore.setVersionTracking(false);

      const state = get(saveSystemStore);
      expect(state.versionTracking).toBe(false);
    });
  });

  describe('setMaxSaveSize', () => {
    it('should set max save size', () => {
      saveSystemStore.setMaxSaveSize(1024);

      const state = get(saveSystemStore);
      expect(state.maxSaveSize).toBe(1024);
    });

    it('should allow unlimited size with 0', () => {
      saveSystemStore.setMaxSaveSize(0);

      const state = get(saveSystemStore);
      expect(state.maxSaveSize).toBe(0);
    });
  });

  describe('generateCode - basic functionality', () => {
    it('should generate save system code', () => {
      const code = saveSystemStore.generateCode(story);

      expect(code).toBeDefined();
      expect(code.types).toBeDefined();
      expect(code.saveFunction).toBeDefined();
      expect(code.loadFunction).toBeDefined();
      expect(code.deleteFunction).toBeDefined();
      expect(code.listFunction).toBeDefined();
      expect(code.utilities).toBeDefined();
    });

    it('should generate TypeScript types', () => {
      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('SaveData');
      expect(code.types).toContain('SaveSlot');
      expect(code.types).toContain('export interface');
    });

    it('should include story version in types', () => {
      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('version: string');
    });

    it('should include variable types in SaveData', () => {
      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('health: number');
      expect(code.types).toContain('score: number');
      expect(code.types).toContain('playerName: string');
      expect(code.types).toContain('isAlive: boolean');
    });
  });

  describe('generateCode - metadata options', () => {
    it('should include timestamp when enabled', () => {
      saveSystemStore.updateMetadata({ includeTimestamp: true });

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('timestamp: number');
      expect(code.saveFunction).toContain('timestamp: Date.now()');
    });

    it('should include playtime when enabled', () => {
      saveSystemStore.updateMetadata({ includePlaytime: true });

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('playtime: number');
    });

    it('should include screenshot when enabled', () => {
      saveSystemStore.updateMetadata({ includeScreenshot: true });

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('screenshot?: string');
    });

    it('should include passage title when enabled', () => {
      saveSystemStore.updateMetadata({ includePassageTitle: true });

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('passageTitle: string');
    });

    it('should include story progress when enabled', () => {
      saveSystemStore.updateMetadata({ includeStoryProgress: true });

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('progress: number');
    });

    it('should include custom fields', () => {
      saveSystemStore.addCustomField('playerAge', 'Player Age', 'number');

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('playerAge: number');
    });
  });

  describe('generateCode - variable persistence', () => {
    it('should include all variables when persistAll is true', () => {
      saveSystemStore.togglePersistAll(); // Ensure it's true
      if (!get(persistAll)) saveSystemStore.togglePersistAll();

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('health: number');
      expect(code.types).toContain('score: number');
    });

    it('should exclude specific variables', () => {
      saveSystemStore.setExcludeVariables(['score']);

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('health: number');
      expect(code.types).not.toContain('score: number');
    });

    it('should only include specified variables when persistAll is false', () => {
      saveSystemStore.togglePersistAll(); // Set to false
      saveSystemStore.setPersistVariables(['health']);

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('health: number');
      expect(code.types).not.toContain('score: number');
    });
  });

  describe('generateCode - storage type specific code', () => {
    it('should generate localStorage code', () => {
      saveSystemStore.setStorageType('localStorage');

      const code = saveSystemStore.generateCode(story);

      expect(code.saveFunction).toContain('localStorage.setItem');
      expect(code.loadFunction).toContain('localStorage.getItem');
      expect(code.deleteFunction).toContain('localStorage.removeItem');
    });

    it('should generate indexedDB code', () => {
      saveSystemStore.setStorageType('indexedDB');

      const code = saveSystemStore.generateCode(story);

      expect(code.saveFunction).toContain('saveToIndexedDB');
      expect(code.loadFunction).toContain('loadFromIndexedDB');
      expect(code.utilities).toContain('indexedDB.open');
    });

    it('should generate JSON export code', () => {
      saveSystemStore.setStorageType('json');

      const code = saveSystemStore.generateCode(story);

      expect(code.saveFunction).toContain('downloadJSON');
      expect(code.utilities).toContain('Blob');
    });
  });

  describe('generateCode - compression and encryption', () => {
    it('should include compression code when enabled', () => {
      saveSystemStore.setCompression(true);

      const code = saveSystemStore.generateCode(story);

      expect(code.saveFunction).toContain('compressData');
      expect(code.utilities).toContain('function compressData');
      expect(code.utilities).toContain('function decompressData');
    });

    it('should include encryption code when enabled', () => {
      saveSystemStore.setEncryption(true);

      const code = saveSystemStore.generateCode(story);

      expect(code.saveFunction).toContain('encryptData');
      expect(code.utilities).toContain('function encryptData');
      expect(code.utilities).toContain('function decryptData');
    });

    it('should combine compression and encryption', () => {
      saveSystemStore.setCompression(true);
      saveSystemStore.setEncryption(true);

      const code = saveSystemStore.generateCode(story);

      expect(code.saveFunction).toContain('compressData');
      expect(code.saveFunction).toContain('encryptData');
    });
  });

  describe('generateCode - version tracking', () => {
    it('should include version check when enabled', () => {
      saveSystemStore.setVersionTracking(true);

      const code = saveSystemStore.generateCode(story);

      expect(code.loadFunction).toContain('version');
      expect(code.loadFunction).toContain(story.metadata.version || '1.0.0');
    });

    it('should exclude version check when disabled', () => {
      saveSystemStore.setVersionTracking(false);

      const code = saveSystemStore.generateCode(story);

      expect(code.loadFunction).not.toContain('Check version compatibility');
    });
  });

  describe('generateCode - size limit', () => {
    it('should include size check when max size is set', () => {
      saveSystemStore.setMaxSaveSize(1024);

      const code = saveSystemStore.generateCode(story);

      expect(code.saveFunction).toContain('Check size limit');
      expect(code.saveFunction).toContain('1024');
    });

    it('should not include size check when max size is 0', () => {
      saveSystemStore.setMaxSaveSize(0);

      const code = saveSystemStore.generateCode(story);

      expect(code.saveFunction).not.toContain('Check size limit');
    });
  });

  describe('reset', () => {
    it('should reset to default configuration', () => {
      saveSystemStore.setStorageType('indexedDB');
      saveSystemStore.setCompression(true);
      saveSystemStore.setEncryption(true);
      saveSystemStore.updateMetadata({ includeScreenshot: true });
      saveSystemStore.addCustomField('test', 'Test', 'string');

      saveSystemStore.reset();

      expect(get(storageType)).toBe('localStorage');
      expect(get(saveSystemStore).compression).toBe(false);
      expect(get(saveSystemStore).encryption).toBe(false);
      expect(get(metadata).includeScreenshot).toBe(false);
      expect(get(metadata).customFields).toEqual([]);
    });
  });

  describe('derived stores', () => {
    it('should update storageType derived store', () => {
      saveSystemStore.setStorageType('indexedDB');

      expect(get(storageType)).toBe('indexedDB');
    });

    it('should update slots derived store', () => {
      saveSystemStore.updateSlot('manual', { count: 10 });

      const slotConfig = get(slots);
      const manualSlot = slotConfig.find(s => s.type === 'manual');
      expect(manualSlot?.count).toBe(10);
    });

    it('should update metadata derived store', () => {
      saveSystemStore.updateMetadata({ includeScreenshot: true });

      expect(get(metadata).includeScreenshot).toBe(true);
    });

    it('should update persistAll derived store', () => {
      saveSystemStore.togglePersistAll();

      const currentValue = get(persistAll);
      expect(typeof currentValue).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle story with no variables', () => {
      const emptyStory: Story = {
        variables: [],
        metadata: story.metadata,
        startPassage: story.startPassage,
        passages: new Map(),
        settings: {},
        stylesheets: [],
        scripts: [],
        assets: new Map(),
        luaFunctions: new Map(),
      } as unknown as Story;

      const code = saveSystemStore.generateCode(emptyStory);

      expect(code.types).toContain('variables: {');
      expect(code.types).toContain('}');
    });

    it('should handle story with special characters in title', () => {
      const specialStory: Story = {
        metadata: {
          title: 'Story "with" <special> & characters',
          id: story.metadata.id,
          author: story.metadata.author,
          version: story.metadata.version,
          created: story.metadata.created,
          modified: story.metadata.modified,
        },
        startPassage: story.startPassage,
        passages: new Map(),
        variables: new Map(),
        settings: {},
        stylesheets: [],
        scripts: [],
        assets: new Map(),
        luaFunctions: new Map(),
      } as unknown as Story;

      const code = saveSystemStore.generateCode(specialStory);

      expect(code).toBeDefined();
    });

    it('should handle multiple custom fields of different types', () => {
      saveSystemStore.addCustomField('field1', 'Field 1', 'string');
      saveSystemStore.addCustomField('field2', 'Field 2', 'number');
      saveSystemStore.addCustomField('field3', 'Field 3', 'boolean');

      const code = saveSystemStore.generateCode(story);

      expect(code.types).toContain('field1: string');
      expect(code.types).toContain('field2: number');
      expect(code.types).toContain('field3: boolean');
    });
  });
});
