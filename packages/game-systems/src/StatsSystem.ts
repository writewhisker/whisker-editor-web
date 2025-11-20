/**
 * Stats System
 *
 * Manages character statistics with support for:
 * - Setting/getting stat values
 * - Stat modifiers (buffs/debuffs)
 * - Min/max value clamping
 * - Stat calculations
 * - Event notifications
 */

import { nanoid } from 'nanoid';
import type { Stat, StatModifier, GameSystemEvent, EventHandler } from './types';

/**
 * Stats system for managing character attributes
 */
export class StatsSystem {
  private stats: Map<string, Stat> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  /**
   * Set a stat value
   */
  setStat(name: string, value: number, maxValue?: number, minValue?: number): void {
    const existing = this.stats.get(name);

    const stat: Stat = {
      name,
      value,
      maxValue: maxValue ?? existing?.maxValue,
      minValue: minValue ?? existing?.minValue,
      baseValue: value,
      modifiers: existing?.modifiers || [],
      metadata: existing?.metadata || {},
    };

    // Clamp value
    stat.value = this.clampValue(stat.value, stat.minValue, stat.maxValue);

    this.stats.set(name, stat);
    this.emit('statSet', { stat });
  }

  /**
   * Get a stat value
   */
  getStat(name: string): number {
    const stat = this.stats.get(name);
    if (!stat) {
      return 0;
    }

    return this.calculateStatValue(stat);
  }

  /**
   * Get stat object
   */
  getStatObject(name: string): Stat | undefined {
    return this.stats.get(name);
  }

  /**
   * Modify a stat by delta
   */
  modifyStat(name: string, delta: number): number {
    const stat = this.stats.get(name);
    if (!stat) {
      // Create stat if it doesn't exist
      this.setStat(name, delta);
      return delta;
    }

    const oldValue = this.calculateStatValue(stat);
    stat.value += delta;
    stat.value = this.clampValue(stat.value, stat.minValue, stat.maxValue);

    this.stats.set(name, stat);

    const newValue = this.calculateStatValue(stat);
    this.emit('statModified', { stat, delta, oldValue, newValue });

    return newValue;
  }

  /**
   * Set base stat value (before modifiers)
   */
  setBaseStat(name: string, baseValue: number): void {
    const stat = this.stats.get(name);
    if (!stat) {
      this.setStat(name, baseValue);
      return;
    }

    stat.baseValue = baseValue;
    stat.value = baseValue;
    stat.value = this.clampValue(stat.value, stat.minValue, stat.maxValue);

    this.stats.set(name, stat);
    this.emit('statBaseChanged', { stat });
  }

  /**
   * Add a stat modifier
   */
  addModifier(statName: string, modifier: Omit<StatModifier, 'id'>): string {
    const stat = this.stats.get(statName);
    if (!stat) {
      // Create stat with default value if it doesn't exist
      this.setStat(statName, 0);
      return this.addModifier(statName, modifier);
    }

    const modifierWithId: StatModifier = {
      ...modifier,
      id: nanoid(),
    };

    if (!stat.modifiers) {
      stat.modifiers = [];
    }

    stat.modifiers.push(modifierWithId);
    this.stats.set(statName, stat);

    this.emit('modifierAdded', { stat, modifier: modifierWithId });

    return modifierWithId.id;
  }

  /**
   * Remove a stat modifier
   */
  removeModifier(statName: string, modifierId: string): boolean {
    const stat = this.stats.get(statName);
    if (!stat || !stat.modifiers) {
      return false;
    }

    const index = stat.modifiers.findIndex(m => m.id === modifierId);
    if (index === -1) {
      return false;
    }

    const removed = stat.modifiers.splice(index, 1)[0];
    this.stats.set(statName, stat);

    this.emit('modifierRemoved', { stat, modifier: removed });

    return true;
  }

  /**
   * Remove all modifiers from a stat
   */
  clearModifiers(statName: string): void {
    const stat = this.stats.get(statName);
    if (!stat) {
      return;
    }

    stat.modifiers = [];
    this.stats.set(statName, stat);

    this.emit('modifiersCleared', { stat });
  }

  /**
   * Get all modifiers for a stat
   */
  getModifiers(statName: string): StatModifier[] {
    const stat = this.stats.get(statName);
    return stat?.modifiers || [];
  }

  /**
   * Update modifier durations (call each turn/tick)
   */
  updateDurations(): void {
    for (const [name, stat] of this.stats.entries()) {
      if (!stat.modifiers || stat.modifiers.length === 0) {
        continue;
      }

      const expiredModifiers: StatModifier[] = [];

      for (const modifier of stat.modifiers) {
        if (modifier.duration !== undefined && modifier.duration > 0) {
          modifier.duration--;
          if (modifier.duration === 0) {
            expiredModifiers.push(modifier);
          }
        }
      }

      // Remove expired modifiers
      if (expiredModifiers.length > 0) {
        stat.modifiers = stat.modifiers.filter(m => !expiredModifiers.includes(m));
        this.stats.set(name, stat);

        for (const expired of expiredModifiers) {
          this.emit('modifierExpired', { stat, modifier: expired });
        }
      }
    }
  }

  /**
   * Calculate final stat value with modifiers
   */
  private calculateStatValue(stat: Stat): number {
    if (!stat.modifiers || stat.modifiers.length === 0) {
      return stat.value;
    }

    let value = stat.baseValue !== undefined ? stat.baseValue : stat.value;

    // Apply additive modifiers first
    for (const modifier of stat.modifiers) {
      if (modifier.type === 'add') {
        value += modifier.value;
      }
    }

    // Apply multiplicative modifiers
    for (const modifier of stat.modifiers) {
      if (modifier.type === 'multiply') {
        value *= modifier.value;
      }
    }

    // Apply set modifiers last (override)
    for (const modifier of stat.modifiers) {
      if (modifier.type === 'set') {
        value = modifier.value;
      }
    }

    return this.clampValue(value, stat.minValue, stat.maxValue);
  }

  /**
   * Clamp value between min and max
   */
  private clampValue(value: number, min?: number, max?: number): number {
    if (min !== undefined) {
      value = Math.max(min, value);
    }
    if (max !== undefined) {
      value = Math.min(max, value);
    }
    return value;
  }

  /**
   * Check if stat exists
   */
  hasStat(name: string): boolean {
    return this.stats.has(name);
  }

  /**
   * Get all stat names
   */
  getStatNames(): string[] {
    return Array.from(this.stats.keys());
  }

  /**
   * Get all stats
   */
  getAllStats(): Map<string, Stat> {
    return new Map(this.stats);
  }

  /**
   * Remove a stat
   */
  removeStat(name: string): boolean {
    const removed = this.stats.delete(name);
    if (removed) {
      this.emit('statRemoved', { name });
    }
    return removed;
  }

  /**
   * Clear all stats
   */
  clear(): void {
    this.stats.clear();
    this.emit('statsCleared', {});
  }

  /**
   * Export stats state
   */
  export(): Record<string, Stat> {
    const exported: Record<string, Stat> = {};
    for (const [name, stat] of this.stats.entries()) {
      exported[name] = { ...stat };
    }
    return exported;
  }

  /**
   * Import stats state
   */
  import(stats: Record<string, Stat>): void {
    this.clear();
    for (const [name, stat] of Object.entries(stats)) {
      this.stats.set(name, { ...stat });
    }
    this.emit('statsImported', { statCount: Object.keys(stats).length });
  }

  /**
   * Compare two stat values
   */
  compare(name: string, operator: '>' | '>=' | '<' | '<=' | '==' | '!=', value: number): boolean {
    const statValue = this.getStat(name);

    switch (operator) {
      case '>': return statValue > value;
      case '>=': return statValue >= value;
      case '<': return statValue < value;
      case '<=': return statValue <= value;
      case '==': return statValue === value;
      case '!=': return statValue !== value;
      default: return false;
    }
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(type: string, data: any): void {
    const event: GameSystemEvent = {
      type,
      data,
      timestamp: Date.now(),
      source: 'stats',
    };

    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }

    // Emit to wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        handler(event);
      }
    }
  }
}
