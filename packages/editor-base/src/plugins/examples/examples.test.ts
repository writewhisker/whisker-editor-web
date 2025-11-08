import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '../PluginManager';
import { pluginStoreActions } from '../index';
import {
  customPassageTypesPlugin,
  debugLoggerPlugin,
  customActionsPlugin,
  registerExamplePlugins,
} from './index';

describe('Example Plugins', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  describe('customPassageTypesPlugin', () => {
    it('should register with passage types', async () => {
      await pluginStoreActions.register(customPassageTypesPlugin);

      expect(pluginManager.hasPlugin('custom-passage-types')).toBe(true);

      const types = pluginManager.getPassageTypes();
      expect(types.length).toBe(4);
      expect(types.map(t => t.type)).toEqual(['item', 'character', 'location', 'event']);
    });

    it('should have correct metadata', () => {
      expect(customPassageTypesPlugin.name).toBe('custom-passage-types');
      expect(customPassageTypesPlugin.version).toBe('1.0.0');
      expect(customPassageTypesPlugin.author).toBe('Whisker Team');
    });

    it('should have passage types with icons and colors', () => {
      const types = customPassageTypesPlugin.nodeTypes!;

      expect(types[0].icon).toBe('📦');
      expect(types[0].color).toBe('#FF6B6B');

      expect(types[1].icon).toBe('👤');
      expect(types[1].color).toBe('#4ECDC4');
    });
  });

  describe('debugLoggerPlugin', () => {
    it('should register with runtime hooks', async () => {
      await pluginStoreActions.register(debugLoggerPlugin);

      expect(pluginManager.hasPlugin('debug-logger')).toBe(true);

      const plugin = pluginManager.getPlugin('debug-logger');
      expect(plugin?.runtime).toBeDefined();
      expect(plugin?.runtime?.onInit).toBeDefined();
      expect(plugin?.runtime?.onStoryLoad).toBeDefined();
      expect(plugin?.runtime?.onPassageEnter).toBeDefined();
      expect(plugin?.runtime?.onPassageExit).toBeDefined();
      expect(plugin?.runtime?.onVariableChange).toBeDefined();
      expect(plugin?.runtime?.onSave).toBeDefined();
      expect(plugin?.runtime?.onLoad).toBeDefined();
    });

    it('should execute runtime hooks without errors', async () => {
      await pluginStoreActions.register(debugLoggerPlugin);

      const context = {
        storyState: {},
        variables: new Map(),
        currentPassage: null,
        history: [],
      };

      const passage = {
        id: 'test-passage',
        title: 'Test Passage',
        content: 'Test content',
        tags: [],
        position: { x: 0, y: 0 },
        links: [],
      };

      // These should not throw
      await pluginManager.executeHook('onInit', context);
      await pluginManager.executeHook('onStoryLoad', context);
      await pluginManager.executeHook('onPassageEnter', passage, context);
      await pluginManager.executeHook('onPassageExit', passage, context);

      expect(true).toBe(true); // If we get here, hooks executed successfully
    });
  });

  describe('customActionsPlugin', () => {
    it('should register with actions and conditions', async () => {
      await pluginStoreActions.register(customActionsPlugin);

      expect(pluginManager.hasPlugin('custom-actions')).toBe(true);

      const actions = pluginManager.getActions();
      expect(actions.length).toBe(4);
      expect(actions.map(a => a.type)).toEqual([
        'give-item',
        'remove-item',
        'modify-stat',
        'set-flag',
      ]);

      const conditions = pluginManager.getConditions();
      expect(conditions.length).toBe(4);
      expect(conditions.map(c => c.type)).toEqual([
        'has-item',
        'stat-compare',
        'flag-is-set',
        'visited-passage',
      ]);
    });

    it('should execute give-item action', async () => {
      await pluginStoreActions.register(customActionsPlugin);

      const context = {
        storyState: {} as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = customActionsPlugin.actions![0];
      await action.execute(context, { itemId: 'sword', itemName: 'Sword' });

      expect(context.storyState.inventory).toContain('sword');
      expect(context.variables.get('has_sword')).toBe(true);
    });

    it('should execute remove-item action', async () => {
      await pluginStoreActions.register(customActionsPlugin);

      const context = {
        storyState: { inventory: ['sword', 'shield'] } as any,
        variables: new Map([['has_sword', true]]),
        currentPassage: null,
      };

      const action = customActionsPlugin.actions![1];
      await action.execute(context, { itemId: 'sword' });

      expect(context.storyState.inventory).not.toContain('sword');
      expect(context.storyState.inventory).toContain('shield');
      expect(context.variables.get('has_sword')).toBe(false);
    });

    it('should execute modify-stat action', async () => {
      await pluginStoreActions.register(customActionsPlugin);

      const context = {
        storyState: {},
        variables: new Map([['health', 100]]),
        currentPassage: null,
      };

      const action = customActionsPlugin.actions![2];
      await action.execute(context, { stat: 'health', amount: -20 });

      expect(context.variables.get('health')).toBe(80);
    });

    it('should execute set-flag action', async () => {
      await pluginStoreActions.register(customActionsPlugin);

      const context = {
        storyState: {},
        variables: new Map(),
        currentPassage: null,
      };

      const action = customActionsPlugin.actions![3];
      await action.execute(context, { flag: 'quest_completed', value: true });

      expect(context.variables.get('quest_completed')).toBe(true);
    });

    it('should evaluate has-item condition', async () => {
      await pluginStoreActions.register(customActionsPlugin);

      const context = {
        storyState: { inventory: ['sword', 'shield'] },
        variables: new Map(),
        currentPassage: null,
      };

      const condition = customActionsPlugin.conditions![0];

      expect(condition.evaluate(context, { itemId: 'sword' })).toBe(true);
      expect(condition.evaluate(context, { itemId: 'potion' })).toBe(false);
    });

    it('should evaluate stat-compare condition', async () => {
      await pluginStoreActions.register(customActionsPlugin);

      const context = {
        storyState: {},
        variables: new Map([['strength', 10]]),
        currentPassage: null,
      };

      const condition = customActionsPlugin.conditions![1];

      expect(condition.evaluate(context, { stat: 'strength', operator: 'gt', value: 5 })).toBe(
        true
      );
      expect(condition.evaluate(context, { stat: 'strength', operator: 'lt', value: 5 })).toBe(
        false
      );
      expect(condition.evaluate(context, { stat: 'strength', operator: 'eq', value: 10 })).toBe(
        true
      );
    });

    it('should evaluate flag-is-set condition', async () => {
      await pluginStoreActions.register(customActionsPlugin);

      const context = {
        storyState: {},
        variables: new Map([['quest_completed', true]]),
        currentPassage: null,
      };

      const condition = customActionsPlugin.conditions![2];

      expect(condition.evaluate(context, { flag: 'quest_completed' })).toBe(true);
      expect(condition.evaluate(context, { flag: 'quest_failed' })).toBe(false);
    });

    it('should evaluate visited-passage condition', async () => {
      await pluginStoreActions.register(customActionsPlugin);

      const context = {
        storyState: {},
        variables: new Map(),
        currentPassage: null,
        history: ['passage-1', 'passage-2'],
      };

      const condition = customActionsPlugin.conditions![3];

      expect(condition.evaluate(context, { passageId: 'passage-1' })).toBe(true);
      expect(condition.evaluate(context, { passageId: 'passage-3' })).toBe(false);
    });
  });

  describe('registerExamplePlugins', () => {
    it('should register all example plugins', async () => {
      await registerExamplePlugins();

      expect(pluginManager.hasPlugin('custom-passage-types')).toBe(true);
      expect(pluginManager.hasPlugin('debug-logger')).toBe(true);
      expect(pluginManager.hasPlugin('custom-actions')).toBe(true);

      const plugins = pluginManager.getPlugins();
      expect(plugins.length).toBe(3);
    });
  });
});
