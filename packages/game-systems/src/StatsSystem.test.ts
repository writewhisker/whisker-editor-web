import { describe, it, expect, beforeEach } from 'vitest';
import { StatsSystem } from './StatsSystem';

describe('StatsSystem', () => {
  let stats: StatsSystem;

  beforeEach(() => {
    stats = new StatsSystem();
  });

  describe('setStat', () => {
    it('should set a stat value', () => {
      stats.setStat('health', 100);
      expect(stats.getStat('health')).toBe(100);
    });

    it('should set stat with min/max values', () => {
      stats.setStat('mana', 50, 100, 0);
      expect(stats.getStat('mana')).toBe(50);

      const stat = stats.getStatObject('mana');
      expect(stat?.maxValue).toBe(100);
      expect(stat?.minValue).toBe(0);
    });

    it('should clamp value to max', () => {
      stats.setStat('strength', 150, 100);
      expect(stats.getStat('strength')).toBe(100);
    });

    it('should clamp value to min', () => {
      stats.setStat('health', -10, undefined, 0);
      expect(stats.getStat('health')).toBe(0);
    });
  });

  describe('getStat', () => {
    it('should return 0 for non-existent stat', () => {
      expect(stats.getStat('nonexistent')).toBe(0);
    });

    it('should return stat value', () => {
      stats.setStat('agility', 25);
      expect(stats.getStat('agility')).toBe(25);
    });
  });

  describe('modifyStat', () => {
    it('should modify stat by delta', () => {
      stats.setStat('health', 100);
      stats.modifyStat('health', -20);
      expect(stats.getStat('health')).toBe(80);
    });

    it('should create stat if it does not exist', () => {
      stats.modifyStat('newStat', 50);
      expect(stats.getStat('newStat')).toBe(50);
    });

    it('should respect min/max when modifying', () => {
      stats.setStat('health', 90, 100, 0);
      stats.modifyStat('health', 20); // Would go to 110
      expect(stats.getStat('health')).toBe(100); // Clamped to max

      stats.modifyStat('health', -200); // Would go to -100
      expect(stats.getStat('health')).toBe(0); // Clamped to min
    });
  });

  describe('setBaseStat', () => {
    it('should set base stat value', () => {
      stats.setBaseStat('strength', 50);
      expect(stats.getStat('strength')).toBe(50);

      const stat = stats.getStatObject('strength');
      expect(stat?.baseValue).toBe(50);
    });
  });

  describe('modifiers', () => {
    beforeEach(() => {
      stats.setStat('attack', 10);
    });

    it('should add additive modifier', () => {
      stats.addModifier('attack', {
        name: 'Weapon Bonus',
        type: 'add',
        value: 5,
      });

      expect(stats.getStat('attack')).toBe(15); // 10 + 5
    });

    it('should add multiplicative modifier', () => {
      stats.addModifier('attack', {
        name: 'Strength Bonus',
        type: 'multiply',
        value: 1.5,
      });

      expect(stats.getStat('attack')).toBe(15); // 10 * 1.5
    });

    it('should add set modifier (override)', () => {
      stats.addModifier('attack', {
        name: 'Fixed Attack',
        type: 'set',
        value: 99,
      });

      expect(stats.getStat('attack')).toBe(99); // Set to 99
    });

    it('should apply modifiers in order: add, multiply, set', () => {
      stats.addModifier('attack', { name: 'Add 5', type: 'add', value: 5 });
      stats.addModifier('attack', { name: 'Multiply 2', type: 'multiply', value: 2 });

      // (10 + 5) * 2 = 30
      expect(stats.getStat('attack')).toBe(30);
    });

    it('should remove modifier by ID', () => {
      const modifierId = stats.addModifier('attack', {
        name: 'Temp Bonus',
        type: 'add',
        value: 10,
      });

      expect(stats.getStat('attack')).toBe(20); // 10 + 10
      stats.removeModifier('attack', modifierId);
      expect(stats.getStat('attack')).toBe(10); // Back to base
    });

    it('should clear all modifiers', () => {
      stats.addModifier('attack', { name: 'Mod 1', type: 'add', value: 5 });
      stats.addModifier('attack', { name: 'Mod 2', type: 'add', value: 5 });

      expect(stats.getStat('attack')).toBe(20); // 10 + 5 + 5
      stats.clearModifiers('attack');
      expect(stats.getStat('attack')).toBe(10); // Back to base
    });

    it('should get all modifiers for a stat', () => {
      stats.addModifier('attack', { name: 'Mod 1', type: 'add', value: 5 });
      stats.addModifier('attack', { name: 'Mod 2', type: 'add', value: 5 });

      const modifiers = stats.getModifiers('attack');
      expect(modifiers).toHaveLength(2);
    });
  });

  describe('duration tracking', () => {
    it('should decrease modifier duration', () => {
      const modifierId = stats.addModifier('defense', {
        name: 'Shield Buff',
        type: 'add',
        value: 10,
        duration: 3,
      });

      stats.setStat('defense', 20);
      expect(stats.getStat('defense')).toBe(30); // 20 + 10

      stats.updateDurations();
      expect(stats.getModifiers('defense')[0].duration).toBe(2);

      stats.updateDurations();
      expect(stats.getModifiers('defense')[0].duration).toBe(1);

      stats.updateDurations();
      expect(stats.getModifiers('defense')).toHaveLength(0); // Expired
      expect(stats.getStat('defense')).toBe(20); // Back to base
    });

    it('should not decrease modifiers without duration', () => {
      stats.addModifier('defense', {
        name: 'Permanent',
        type: 'add',
        value: 5,
      });

      stats.setStat('defense', 20);
      expect(stats.getStat('defense')).toBe(25);

      stats.updateDurations();
      expect(stats.getModifiers('defense')).toHaveLength(1); // Still there
      expect(stats.getStat('defense')).toBe(25);
    });
  });

  describe('compare', () => {
    beforeEach(() => {
      stats.setStat('level', 10);
    });

    it('should compare with > operator', () => {
      expect(stats.compare('level', '>', 5)).toBe(true);
      expect(stats.compare('level', '>', 15)).toBe(false);
    });

    it('should compare with >= operator', () => {
      expect(stats.compare('level', '>=', 10)).toBe(true);
      expect(stats.compare('level', '>=', 11)).toBe(false);
    });

    it('should compare with < operator', () => {
      expect(stats.compare('level', '<', 15)).toBe(true);
      expect(stats.compare('level', '<', 5)).toBe(false);
    });

    it('should compare with <= operator', () => {
      expect(stats.compare('level', '<=', 10)).toBe(true);
      expect(stats.compare('level', '<=', 9)).toBe(false);
    });

    it('should compare with == operator', () => {
      expect(stats.compare('level', '==', 10)).toBe(true);
      expect(stats.compare('level', '==', 9)).toBe(false);
    });

    it('should compare with != operator', () => {
      expect(stats.compare('level', '!=', 9)).toBe(true);
      expect(stats.compare('level', '!=', 10)).toBe(false);
    });
  });

  describe('hasStat and getStatNames', () => {
    it('should check if stat exists', () => {
      stats.setStat('wisdom', 15);
      expect(stats.hasStat('wisdom')).toBe(true);
      expect(stats.hasStat('charisma')).toBe(false);
    });

    it('should get all stat names', () => {
      stats.setStat('str', 10);
      stats.setStat('dex', 12);
      stats.setStat('int', 14);

      const names = stats.getStatNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('str');
      expect(names).toContain('dex');
      expect(names).toContain('int');
    });
  });

  describe('getAllStats', () => {
    it('should get all stats as a Map', () => {
      stats.setStat('hp', 100);
      stats.setStat('mp', 50);

      const allStats = stats.getAllStats();
      expect(allStats.size).toBe(2);
      expect(allStats.get('hp')?.value).toBe(100);
    });
  });

  describe('removeStat', () => {
    it('should remove a stat', () => {
      stats.setStat('temp', 999);
      expect(stats.hasStat('temp')).toBe(true);

      stats.removeStat('temp');
      expect(stats.hasStat('temp')).toBe(false);
    });
  });

  describe('export and import', () => {
    it('should export stats state', () => {
      stats.setStat('health', 100);
      stats.setStat('mana', 50);
      stats.addModifier('health', { name: 'Buff', type: 'add', value: 10 });

      const exported = stats.export();
      expect(exported.health).toBeDefined();
      expect(exported.health.value).toBe(100);
      expect(exported.health.modifiers).toHaveLength(1);
    });

    it('should import stats state', () => {
      const data = {
        health: { name: 'health', value: 80, baseValue: 80, modifiers: [] },
        mana: { name: 'mana', value: 40, baseValue: 40, modifiers: [] },
      };

      stats.import(data);

      expect(stats.getStat('health')).toBe(80);
      expect(stats.getStat('mana')).toBe(40);
    });

    it('should clear existing stats on import', () => {
      stats.setStat('old', 100);

      const data = {
        new: { name: 'new', value: 50, baseValue: 50, modifiers: [] },
      };

      stats.import(data);

      expect(stats.hasStat('old')).toBe(false);
      expect(stats.hasStat('new')).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit statSet event', () => {
      let eventFired = false;

      stats.on('statSet', (event) => {
        expect(event.type).toBe('statSet');
        expect(event.data.stat.name).toBe('test');
        eventFired = true;
      });

      stats.setStat('test', 100);
      expect(eventFired).toBe(true);
    });

    it('should emit statModified event', () => {
      let eventFired = false;
      stats.setStat('test', 100);

      stats.on('statModified', (event) => {
        expect(event.type).toBe('statModified');
        expect(event.data.delta).toBe(10);
        eventFired = true;
      });

      stats.modifyStat('test', 10);
      expect(eventFired).toBe(true);
    });

    it('should emit modifierAdded event', () => {
      let eventFired = false;
      stats.setStat('test', 100);

      stats.on('modifierAdded', (event) => {
        expect(event.type).toBe('modifierAdded');
        eventFired = true;
      });

      stats.addModifier('test', { name: 'Buff', type: 'add', value: 5 });
      expect(eventFired).toBe(true);
    });

    it('should emit modifierExpired event', () => {
      let eventFired = false;
      stats.setStat('test', 100);

      stats.addModifier('test', {
        name: 'Temp',
        type: 'add',
        value: 5,
        duration: 1,
      });

      stats.on('modifierExpired', (event) => {
        expect(event.type).toBe('modifierExpired');
        eventFired = true;
      });

      stats.updateDurations();
      expect(eventFired).toBe(true);
    });

    it('should support wildcard event handlers', () => {
      const events: string[] = [];

      stats.on('*', (event) => {
        events.push(event.type);
      });

      stats.setStat('test', 100);
      stats.modifyStat('test', 10);

      expect(events).toContain('statSet');
      expect(events).toContain('statModified');
    });
  });

  describe('clear', () => {
    it('should remove all stats', () => {
      stats.setStat('stat1', 10);
      stats.setStat('stat2', 20);

      stats.clear();

      expect(stats.getStatNames()).toHaveLength(0);
      expect(stats.getStat('stat1')).toBe(0);
    });
  });
});
