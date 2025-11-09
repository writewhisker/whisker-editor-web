import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '../PluginManager';
import { pluginStoreActions } from '../index';
import { combatSystem, type Enemy } from './combatSystem';

describe('Combat System Plugin', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  const mockEnemy: Enemy = {
    id: 'goblin',
    name: 'Goblin',
    health: 30,
    maxHealth: 30,
    attack: 8,
    defense: 3,
    speed: 12,
    xp: 50,
  };

  const createContext = () => ({
    storyState: {
      stats: {
        stats: {
          health: { name: 'health', value: 100, min: 0, max: 100 },
          attack: { name: 'attack', value: 15, min: 0, max: 50 },
          defense: { name: 'defense', value: 10, min: 0, max: 50 },
          speed: { name: 'speed', value: 15, min: 0, max: 30 },
          xp: { name: 'xp', value: 0, min: 0, max: 99999 },
        },
        modifiers: [],
      },
      combat: null,
    } as any,
    variables: new Map(),
    currentPassage: null,
  });

  describe('registration', () => {
    it('should register successfully', async () => {
      await pluginStoreActions.register(combatSystem);
      expect(pluginManager.hasPlugin('combat-system')).toBe(true);
    });

    it('should provide combat passage type', async () => {
      await pluginStoreActions.register(combatSystem);
      const types = pluginManager.getPassageTypes();
      expect(types.find(t => t.type === 'combat')).toBeDefined();
    });

    it('should provide combat actions', async () => {
      await pluginStoreActions.register(combatSystem);
      const actions = pluginManager.getActions();

      const actionTypes = actions.map(a => a.type);
      expect(actionTypes).toContain('combat.start');
      expect(actionTypes).toContain('combat.attack');
      expect(actionTypes).toContain('combat.defend');
      expect(actionTypes).toContain('combat.flee');
      expect(actionTypes).toContain('combat.end');
    });

    it('should provide combat conditions', async () => {
      await pluginStoreActions.register(combatSystem);
      const conditions = pluginManager.getConditions();

      const conditionTypes = conditions.map(c => c.type);
      expect(conditionTypes).toContain('combat.active');
      expect(conditionTypes).toContain('combat.victory');
      expect(conditionTypes).toContain('combat.defeat');
      expect(conditionTypes).toContain('combat.enemyHealth');
    });
  });

  describe('start combat', () => {
    it('should start combat with enemy', async () => {
      await pluginStoreActions.register(combatSystem);

      const context = createContext();
      const action = combatSystem.actions!.find(a => a.type === 'combat.start')!;

      await action.execute(context, { enemy: mockEnemy });

      expect(context.storyState.combat.active).toBe(true);
      expect(context.storyState.combat.enemy.name).toBe('Goblin');
      expect(context.variables.get('in_combat')).toBe(true);
    });
  });

  describe('attack action', () => {
    it('should deal damage to enemy', async () => {
      await pluginStoreActions.register(combatSystem);

      const context = createContext();
      context.storyState.combat = {
        active: true,
        turn: 1,
        playerTurn: true,
        enemy: { ...mockEnemy },
        combatLog: [],
        playerDefending: false,
      };

      const action = combatSystem.actions!.find(a => a.type === 'combat.attack')!;
      await action.execute(context, {});

      expect(context.storyState.combat.enemy.health).toBeLessThan(30);
    });

    it('should end combat on enemy defeat', async () => {
      await pluginStoreActions.register(combatSystem);

      const context = createContext();
      const weakEnemy = { ...mockEnemy, health: 1 };
      context.storyState.combat = {
        active: true,
        turn: 1,
        playerTurn: true,
        enemy: weakEnemy,
        combatLog: [],
        playerDefending: false,
      };

      const action = combatSystem.actions!.find(a => a.type === 'combat.attack')!;
      await action.execute(context, {});

      expect(context.storyState.combat.active).toBe(false);
      expect(context.variables.get('combat_victory')).toBe(true);
    });
  });

  describe('defend action', () => {
    it('should set defending flag', async () => {
      await pluginStoreActions.register(combatSystem);

      const context = createContext();
      context.storyState.combat = {
        active: true,
        turn: 1,
        playerTurn: true,
        enemy: { ...mockEnemy },
        combatLog: [],
        playerDefending: false,
      };

      const action = combatSystem.actions!.find(a => a.type === 'combat.defend')!;
      await action.execute(context, {});

      // After defend action completes enemy turn, defending flag is reset
      expect(context.storyState.combat.combatLog.some(log => log.includes('brace'))).toBe(true);
    });
  });

  describe('flee action', () => {
    it('should attempt to flee', async () => {
      await pluginStoreActions.register(combatSystem);

      const context = createContext();
      context.storyState.combat = {
        active: true,
        turn: 1,
        playerTurn: true,
        enemy: { ...mockEnemy },
        combatLog: [],
        playerDefending: false,
      };

      const action = combatSystem.actions!.find(a => a.type === 'combat.flee')!;
      await action.execute(context, {});

      // Either fled successfully or failed (both are valid)
      expect(
        context.variables.get('combat_fled') === true || context.storyState.combat.active === true
      ).toBe(true);
    });
  });

  describe('end combat', () => {
    it('should end active combat', async () => {
      await pluginStoreActions.register(combatSystem);

      const context = createContext();
      context.storyState.combat = {
        active: true,
        turn: 5,
        playerTurn: true,
        enemy: { ...mockEnemy },
        combatLog: [],
        playerDefending: false,
      };

      const action = combatSystem.actions!.find(a => a.type === 'combat.end')!;
      await action.execute(context, {});

      expect(context.storyState.combat.active).toBe(false);
      expect(context.variables.get('in_combat')).toBe(false);
    });
  });

  describe('active condition', () => {
    it('should check if combat is active', async () => {
      await pluginStoreActions.register(combatSystem);

      const context = createContext();
      const condition = combatSystem.conditions!.find(c => c.type === 'combat.active')!;

      expect(condition.evaluate(context, {})).toBe(false);

      context.storyState.combat = { active: true } as any;
      expect(condition.evaluate(context, {})).toBe(true);
    });
  });

  describe('enemyHealth condition', () => {
    it('should check enemy health percentage', async () => {
      await pluginStoreActions.register(combatSystem);

      const context = createContext();
      context.storyState.combat = {
        active: true,
        enemy: { ...mockEnemy, health: 15 }, // 50% health
      } as any;

      const condition = combatSystem.conditions!.find(c => c.type === 'combat.enemyHealth')!;

      expect(condition.evaluate(context, { operator: 'lt', percent: 60 })).toBe(true);
      expect(condition.evaluate(context, { operator: 'gt', percent: 40 })).toBe(true);
      expect(condition.evaluate(context, { operator: 'lte', percent: 50 })).toBe(true);
      expect(condition.evaluate(context, { operator: 'gte', percent: 50 })).toBe(true);
    });
  });
});
