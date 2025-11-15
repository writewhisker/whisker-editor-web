import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '../PluginManager';
import { pluginStoreActions } from '../index';
import { saveLoadSystem } from './saveLoadSystem';
import { Passage } from '@writewhisker/core-ts';

describe('Save/Load System Plugin', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  const createContext = () => ({
    storyState: {
      stats: { stats: { health: { value: 100 } }, modifiers: [] },
      inventory: { items: { sword: 1 }, equipped: [], capacity: 10, maxCapacity: 100 },
      playtime: 0,
    } as any,
    variables: new Map<string, any>([
      ['health', 100],
      ['has_sword', true],
    ]),
    currentPassage: new Passage({ id: '1', title: 'Start', content: '', tags: [], position: { x: 0, y: 0 } }),
  });

  describe('registration', () => {
    it('should register successfully', async () => {
      await pluginStoreActions.register(saveLoadSystem);
      expect(pluginManager.hasPlugin('saveload-system')).toBe(true);
    });

    it('should provide save/load actions', async () => {
      await pluginStoreActions.register(saveLoadSystem);
      const actions = pluginManager.getActions();

      const actionTypes = actions.map(a => a.type);
      expect(actionTypes).toContain('save.save');
      expect(actionTypes).toContain('save.load');
      expect(actionTypes).toContain('save.delete');
      expect(actionTypes).toContain('save.autoSave');
      expect(actionTypes).toContain('save.quickSave');
      expect(actionTypes).toContain('save.quickLoad');
    });

    it('should provide save conditions', async () => {
      await pluginStoreActions.register(saveLoadSystem);
      const conditions = pluginManager.getConditions();

      const conditionTypes = conditions.map(c => c.type);
      expect(conditionTypes).toContain('save.exists');
      expect(conditionTypes).toContain('save.autoSaveExists');
      expect(conditionTypes).toContain('save.quickSaveExists');
      expect(conditionTypes).toContain('save.hasSaves');
    });
  });

  describe('save action', () => {
    it('should save game to slot', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const context = createContext();
      const action = saveLoadSystem.actions!.find(a => a.type === 'save.save')!;

      await action.execute(context, { slotId: 'slot1', location: 'Start' });

      expect(context.storyState.saveSystem.slots.slot1).toBeDefined();
      expect(context.storyState.saveSystem.slots.slot1.location).toBe('Start');
      expect(context.variables.get('save_slot1_exists')).toBe(true);
    });

    it('should save stats and inventory', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const context = createContext();
      const action = saveLoadSystem.actions!.find(a => a.type === 'save.save')!;

      await action.execute(context, { slotId: 'slot1' });

      const save = context.storyState.saveSystem.slots.slot1;
      expect(save.stats).toBeDefined();
      expect(save.inventory).toBeDefined();
      expect(save.data).toBeDefined();
    });
  });

  describe('load action', () => {
    it('should load game from slot', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const context = createContext();

      // Save first
      const saveAction = saveLoadSystem.actions!.find(a => a.type === 'save.save')!;
      await saveAction.execute(context, { slotId: 'slot1' });

      // Modify state
      context.storyState.stats.stats.health.value = 50;
      context.variables.set('health', 50 as any);

      // Load
      const loadAction = saveLoadSystem.actions!.find(a => a.type === 'save.load')!;
      await loadAction.execute(context, { slotId: 'slot1' });

      expect(context.storyState.stats.stats.health.value).toBe(100);
      expect(context.variables.get('load_success')).toBe(true);
    });

    it('should fail gracefully if slot not found', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const context = createContext();
      context.storyState.saveSystem = { slots: {} };

      const action = saveLoadSystem.actions!.find(a => a.type === 'save.load')!;
      await action.execute(context, { slotId: 'nonexistent' });

      expect(context.variables.get('load_failed')).toBe(true);
    });
  });

  describe('delete action', () => {
    it('should delete save slot', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const context = createContext();

      // Save first
      const saveAction = saveLoadSystem.actions!.find(a => a.type === 'save.save')!;
      await saveAction.execute(context, { slotId: 'slot1' });

      expect(context.storyState.saveSystem.slots.slot1).toBeDefined();

      // Delete
      const deleteAction = saveLoadSystem.actions!.find(a => a.type === 'save.delete')!;
      await deleteAction.execute(context, { slotId: 'slot1' });

      expect(context.storyState.saveSystem.slots.slot1).toBeUndefined();
      expect(context.variables.get('save_slot1_exists')).toBe(false);
    });
  });

  describe('autoSave action', () => {
    it('should create auto-save', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const context = createContext();
      const action = saveLoadSystem.actions!.find(a => a.type === 'save.autoSave')!;

      await action.execute(context, { location: 'Checkpoint' });

      expect(context.storyState.saveSystem.autoSave).toBeDefined();
      expect(context.storyState.saveSystem.autoSave?.location).toBe('Checkpoint');
      expect(context.variables.get('autosave_exists')).toBe(true);
    });
  });

  describe('quickSave/quickLoad actions', () => {
    it('should quick save and load', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const context = createContext();

      // Quick save
      const quickSave = saveLoadSystem.actions!.find(a => a.type === 'save.quickSave')!;
      await quickSave.execute(context, {});

      expect(context.storyState.saveSystem.quickSave).toBeDefined();
      expect(context.variables.get('quicksave_exists')).toBe(true);

      // Modify state
      context.storyState.stats.stats.health.value = 50;

      // Quick load
      const quickLoad = saveLoadSystem.actions!.find(a => a.type === 'save.quickLoad')!;
      await quickLoad.execute(context, {});

      expect(context.storyState.stats.stats.health.value).toBe(100);
      expect(context.variables.get('load_success')).toBe(true);
    });
  });

  describe('exists condition', () => {
    it('should check if save exists', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const context = createContext();
      const condition = saveLoadSystem.conditions!.find(c => c.type === 'save.exists')!;

      expect(condition.evaluate(context, { slotId: 'slot1' })).toBe(false);

      // Create save
      const action = saveLoadSystem.actions!.find(a => a.type === 'save.save')!;
      await action.execute(context, { slotId: 'slot1' });

      expect(condition.evaluate(context, { slotId: 'slot1' })).toBe(true);
    });
  });

  describe('hasSaves condition', () => {
    it('should check if any saves exist', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const context = createContext();
      context.storyState.saveSystem = { slots: {} };

      const condition = saveLoadSystem.conditions!.find(c => c.type === 'save.hasSaves')!;

      expect(condition.evaluate(context, {})).toBe(false);

      // Create save
      const action = saveLoadSystem.actions!.find(a => a.type === 'save.save')!;
      await action.execute(context, { slotId: 'slot1' });

      expect(condition.evaluate(context, {})).toBe(true);
    });
  });

  describe('runtime hooks', () => {
    it('should increment playtime on passage enter', async () => {
      await pluginStoreActions.register(saveLoadSystem);

      const passage = new Passage({
        id: 'test',
        title: 'Test',
        content: '',
        tags: [],
        position: { x: 0, y: 0 },
      });

      const context = createContext();
      context.storyState.playtime = 0;

      await pluginManager.executeHook('onPassageEnter', passage, context);

      expect(context.storyState.playtime).toBe(1);
      expect(context.variables.get('playtime')).toBe(1);
    });
  });
});
