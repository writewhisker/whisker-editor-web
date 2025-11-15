import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '../PluginManager';
import { pluginStoreActions } from '../index';
import { statsSystem } from './statsSystem';
import { Passage } from '@writewhisker/core-ts';

describe('Stats System Plugin', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  describe('registration', () => {
    it('should register successfully', async () => {
      await pluginStoreActions.register(statsSystem);
      expect(pluginManager.hasPlugin('stats-system')).toBe(true);
    });

    it('should provide stats actions', async () => {
      await pluginStoreActions.register(statsSystem);
      const actions = pluginManager.getActions();

      const actionTypes = actions.map(a => a.type);
      expect(actionTypes).toContain('stats.set');
      expect(actionTypes).toContain('stats.modify');
      expect(actionTypes).toContain('stats.create');
      expect(actionTypes).toContain('stats.addModifier');
      expect(actionTypes).toContain('stats.removeModifier');
      expect(actionTypes).toContain('stats.regenerate');
      expect(actionTypes).toContain('stats.reset');
    });

    it('should provide stats conditions', async () => {
      await pluginStoreActions.register(statsSystem);
      const conditions = pluginManager.getConditions();

      const conditionTypes = conditions.map(c => c.type);
      expect(conditionTypes).toContain('stats.compare');
      expect(conditionTypes).toContain('stats.inRange');
      expect(conditionTypes).toContain('stats.hasModifier');
      expect(conditionTypes).toContain('stats.atMax');
      expect(conditionTypes).toContain('stats.atMin');
    });
  });

  describe('initialization', () => {
    it('should initialize with default stats', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {} as any,
        variables: new Map(),
        currentPassage: null,
        history: [],
      };

      await pluginManager.executeHook('onInit', context);

      expect(context.storyState.stats).toBeDefined();
      expect(context.storyState.stats.stats.health).toBeDefined();
      expect(context.storyState.stats.stats.health.value).toBe(100);
      expect(context.storyState.stats.stats.mana).toBeDefined();
      expect(context.storyState.stats.stats.stamina).toBeDefined();
    });
  });

  describe('set action', () => {
    it('should set stat value', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: { stats: {}, modifiers: [] },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = statsSystem.actions!.find(a => a.type === 'stats.set')!;
      await action.execute(context, { stat: 'health', value: 75 });

      expect(context.storyState.stats.stats.health.value).toBe(75);
      expect(context.variables.get('health')).toBe(75);
    });

    it('should respect min/max bounds', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {
              health: { name: 'health', value: 50, min: 0, max: 100 },
            },
            modifiers: [],
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = statsSystem.actions!.find(a => a.type === 'stats.set')!;

      await action.execute(context, { stat: 'health', value: 150 });
      expect(context.storyState.stats.stats.health.value).toBe(100);

      await action.execute(context, { stat: 'health', value: -10 });
      expect(context.storyState.stats.stats.health.value).toBe(0);
    });
  });

  describe('modify action', () => {
    it('should modify stat value', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {
              health: { name: 'health', value: 100, min: 0, max: 100 },
            },
            modifiers: [],
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = statsSystem.actions!.find(a => a.type === 'stats.modify')!;
      await action.execute(context, { stat: 'health', amount: -25 });

      expect(context.storyState.stats.stats.health.value).toBe(75);
      expect(context.variables.get('health')).toBe(75);
    });

    it('should set is_dead when health reaches 0', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {
              health: { name: 'health', value: 10, min: 0, max: 100 },
            },
            modifiers: [],
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = statsSystem.actions!.find(a => a.type === 'stats.modify')!;
      await action.execute(context, { stat: 'health', amount: -20 });

      expect(context.storyState.stats.stats.health.value).toBe(0);
      expect(context.variables.get('is_dead')).toBe(true);
    });
  });

  describe('create action', () => {
    it('should create a new stat', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: { stats: {}, modifiers: [] },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = statsSystem.actions!.find(a => a.type === 'stats.create')!;
      await action.execute(context, {
        name: 'strength',
        value: 10,
        min: 1,
        max: 20,
        regenRate: 0.5,
      });

      const stat = context.storyState.stats.stats.strength;
      expect(stat).toBeDefined();
      expect(stat.value).toBe(10);
      expect(stat.min).toBe(1);
      expect(stat.max).toBe(20);
      expect(stat.regenRate).toBe(0.5);
      expect(context.variables.get('strength')).toBe(10);
    });
  });

  describe('modifier actions', () => {
    it('should add modifier', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: { stats: {}, modifiers: [] },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = statsSystem.actions!.find(a => a.type === 'stats.addModifier')!;
      await action.execute(context, {
        id: 'buff_strength',
        stat: 'strength',
        type: 'add',
        value: 5,
        duration: 3,
      });

      expect(context.storyState.stats.modifiers.length).toBe(1);
      expect(context.storyState.stats.modifiers[0].id).toBe('buff_strength');
      expect(context.variables.get('modifier_buff_strength')).toBe(true);
    });

    it('should remove modifier', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {},
            modifiers: [
              {
                id: 'buff_strength',
                stat: 'strength',
                type: 'add' as const,
                value: 5,
                duration: 3,
              },
            ],
          },
        } as any,
        variables: new Map([['modifier_buff_strength', true]]),
        currentPassage: null,
      };

      const action = statsSystem.actions!.find(a => a.type === 'stats.removeModifier')!;
      await action.execute(context, { id: 'buff_strength' });

      expect(context.storyState.stats.modifiers.length).toBe(0);
      expect(context.variables.get('modifier_buff_strength')).toBe(false);
    });
  });

  describe('regenerate action', () => {
    it('should apply regeneration to stats', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {
              health: { name: 'health', value: 50, min: 0, max: 100, regenRate: 5 },
              mana: { name: 'mana', value: 30, min: 0, max: 100, regenRate: 10 },
            },
            modifiers: [],
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = statsSystem.actions!.find(a => a.type === 'stats.regenerate')!;
      await action.execute(context, {});

      expect(context.storyState.stats.stats.health.value).toBe(55);
      expect(context.storyState.stats.stats.mana.value).toBe(40);
    });
  });

  describe('reset action', () => {
    it('should reset stat to base value', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {
              health: { name: 'health', value: 30, min: 0, max: 100, baseValue: 100 },
            },
            modifiers: [],
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = statsSystem.actions!.find(a => a.type === 'stats.reset')!;
      await action.execute(context, { stat: 'health' });

      expect(context.storyState.stats.stats.health.value).toBe(100);
      expect(context.variables.get('health')).toBe(100);
    });
  });

  describe('compare condition', () => {
    it('should compare stat values', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {
              strength: { name: 'strength', value: 15, min: 0, max: 20 },
            },
            modifiers: [],
          },
        },
        variables: new Map(),
        currentPassage: null,
      };

      const condition = statsSystem.conditions!.find(c => c.type === 'stats.compare')!;

      expect(condition.evaluate(context, { stat: 'strength', operator: 'gt', value: 10 })).toBe(
        true
      );
      expect(condition.evaluate(context, { stat: 'strength', operator: 'lt', value: 10 })).toBe(
        false
      );
      expect(condition.evaluate(context, { stat: 'strength', operator: 'eq', value: 15 })).toBe(
        true
      );
      expect(condition.evaluate(context, { stat: 'strength', operator: 'gte', value: 15 })).toBe(
        true
      );
      expect(condition.evaluate(context, { stat: 'strength', operator: 'lte', value: 15 })).toBe(
        true
      );
    });
  });

  describe('inRange condition', () => {
    it('should check if stat is in range', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {
              health: { name: 'health', value: 50, min: 0, max: 100 },
            },
            modifiers: [],
          },
        },
        variables: new Map(),
        currentPassage: null,
      };

      const condition = statsSystem.conditions!.find(c => c.type === 'stats.inRange')!;

      expect(condition.evaluate(context, { stat: 'health', min: 40, max: 60 })).toBe(true);
      expect(condition.evaluate(context, { stat: 'health', min: 60, max: 80 })).toBe(false);
    });
  });

  describe('hasModifier condition', () => {
    it('should check if has modifier', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {},
            modifiers: [
              { id: 'buff_1', stat: 'strength', type: 'add' as const, value: 5, duration: 3 },
            ],
          },
        },
        variables: new Map(),
        currentPassage: null,
      };

      const condition = statsSystem.conditions!.find(c => c.type === 'stats.hasModifier')!;

      expect(condition.evaluate(context, { id: 'buff_1' })).toBe(true);
      expect(condition.evaluate(context, { id: 'buff_2' })).toBe(false);
    });
  });

  describe('atMax/atMin conditions', () => {
    it('should check if stat is at max', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {
              health: { name: 'health', value: 100, min: 0, max: 100 },
            },
            modifiers: [],
          },
        },
        variables: new Map(),
        currentPassage: null,
      };

      const atMax = statsSystem.conditions!.find(c => c.type === 'stats.atMax')!;
      expect(atMax.evaluate(context, { stat: 'health' })).toBe(true);

      context.storyState.stats.stats.health.value = 50;
      expect(atMax.evaluate(context, { stat: 'health' })).toBe(false);
    });

    it('should check if stat is at min', async () => {
      await pluginStoreActions.register(statsSystem);

      const context = {
        storyState: {
          stats: {
            stats: {
              health: { name: 'health', value: 0, min: 0, max: 100 },
            },
            modifiers: [],
          },
        },
        variables: new Map(),
        currentPassage: null,
      };

      const atMin = statsSystem.conditions!.find(c => c.type === 'stats.atMin')!;
      expect(atMin.evaluate(context, { stat: 'health' })).toBe(true);

      context.storyState.stats.stats.health.value = 50;
      expect(atMin.evaluate(context, { stat: 'health' })).toBe(false);
    });
  });

  describe('runtime hooks', () => {
    it('should expire modifiers on passage enter', async () => {
      await pluginStoreActions.register(statsSystem);

      const passage = new Passage({
        id: 'test',
        title: 'Test',
        content: '',
        tags: [],
        position: { x: 0, y: 0 },
      });

      const context = {
        storyState: {
          stats: {
            stats: {},
            modifiers: [
              { id: 'buff_1', stat: 'strength', type: 'add' as const, value: 5, duration: 1 },
              { id: 'buff_2', stat: 'strength', type: 'add' as const, value: 3, duration: 2 },
            ],
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
        history: [],
      };

      await pluginManager.executeHook('onPassageEnter', passage, context);

      // buff_1 should be expired and removed
      expect(context.storyState.stats.modifiers.length).toBe(1);
      expect(context.storyState.stats.modifiers[0].id).toBe('buff_2');
      expect(context.storyState.stats.modifiers[0].duration).toBe(1);
    });
  });
});
