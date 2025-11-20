/**
 * Achievement System
 *
 * Manages achievements and unlocks with support for:
 * - Achievement tracking
 * - Progress tracking
 * - Hidden achievements
 * - Achievement categories
 * - Points system
 * - Event notifications
 */

import { nanoid } from 'nanoid';
import type { Achievement, GameSystemEvent, EventHandler } from './types';

/**
 * Achievement system for managing player achievements
 */
export class AchievementSystem {
  private achievements: Map<string, Achievement> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  /**
   * Add an achievement
   */
  addAchievement(achievement: Omit<Achievement, 'id' | 'unlocked'> & { id?: string }): string {
    const achievementWithDefaults: Achievement = {
      id: achievement.id || nanoid(),
      name: achievement.name,
      description: achievement.description,
      unlocked: false,
      icon: achievement.icon,
      category: achievement.category,
      rarity: achievement.rarity,
      points: achievement.points,
      hidden: achievement.hidden,
      requirements: achievement.requirements,
      progress: achievement.progress,
      target: achievement.target,
      metadata: achievement.metadata,
    };

    this.achievements.set(achievementWithDefaults.id, achievementWithDefaults);
    this.emit('achievementAdded', { achievement: achievementWithDefaults });

    return achievementWithDefaults.id;
  }

  /**
   * Get an achievement by ID
   */
  getAchievement(achievementId: string): Achievement | undefined {
    const achievement = this.achievements.get(achievementId);

    // Don't reveal hidden achievements until unlocked
    if (achievement?.hidden && !achievement.unlocked) {
      return {
        ...achievement,
        name: '???',
        description: 'Hidden achievement',
      };
    }

    return achievement;
  }

  /**
   * Get all achievements (respects hidden flag)
   */
  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).map(a => {
      if (a.hidden && !a.unlocked) {
        return {
          ...a,
          name: '???',
          description: 'Hidden achievement',
        };
      }
      return a;
    });
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(category: string): Achievement[] {
    return this.getAllAchievements().filter(a => a.category === category);
  }

  /**
   * Get achievements by rarity
   */
  getAchievementsByRarity(rarity: Achievement['rarity']): Achievement[] {
    return this.getAllAchievements().filter(a => a.rarity === rarity);
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.unlocked);
  }

  /**
   * Get locked achievements (not hidden ones)
   */
  getLockedAchievements(): Achievement[] {
    return this.getAllAchievements().filter(a => !a.unlocked && !a.hidden);
  }

  /**
   * Unlock an achievement
   */
  unlock(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      return false;
    }

    if (achievement.unlocked) {
      return false; // Already unlocked
    }

    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    this.achievements.set(achievementId, achievement);

    this.emit('achievementUnlocked', { achievement });

    return true;
  }

  /**
   * Update achievement progress
   */
  updateProgress(achievementId: string, progress: number): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      return false;
    }

    if (achievement.unlocked) {
      return false; // Already unlocked
    }

    const oldProgress = achievement.progress || 0;
    achievement.progress = progress;

    // Auto-unlock if target reached
    if (achievement.target !== undefined && progress >= achievement.target) {
      achievement.unlocked = true;
      achievement.unlockedAt = Date.now();
      this.emit('achievementUnlocked', { achievement });
    } else {
      this.emit('achievementProgressUpdated', { achievement, oldProgress, progress });
    }

    this.achievements.set(achievementId, achievement);
    return true;
  }

  /**
   * Increment achievement progress
   */
  incrementProgress(achievementId: string, delta: number = 1): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      return false;
    }

    const currentProgress = achievement.progress || 0;
    return this.updateProgress(achievementId, currentProgress + delta);
  }

  /**
   * Check if achievement is unlocked
   */
  isUnlocked(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    return achievement?.unlocked || false;
  }

  /**
   * Get achievement progress (0-1)
   */
  getProgress(achievementId: string): number {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || !achievement.target) {
      return 0;
    }

    const progress = achievement.progress || 0;
    return Math.min(progress / achievement.target, 1);
  }

  /**
   * Get total points earned
   */
  getTotalPoints(): number {
    return this.getUnlockedAchievements().reduce((sum, a) => sum + (a.points || 0), 0);
  }

  /**
   * Get maximum possible points
   */
  getMaxPoints(): number {
    return Array.from(this.achievements.values()).reduce((sum, a) => sum + (a.points || 0), 0);
  }

  /**
   * Get unlock percentage
   */
  getUnlockPercentage(): number {
    const total = this.achievements.size;
    if (total === 0) {
      return 0;
    }

    const unlocked = this.getUnlockedAchievements().length;
    return (unlocked / total) * 100;
  }

  /**
   * Remove an achievement
   */
  removeAchievement(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      return false;
    }

    this.achievements.delete(achievementId);
    this.emit('achievementRemoved', { achievement });

    return true;
  }

  /**
   * Reset an achievement
   */
  resetAchievement(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      return false;
    }

    achievement.unlocked = false;
    achievement.unlockedAt = undefined;
    achievement.progress = 0;

    this.achievements.set(achievementId, achievement);
    this.emit('achievementReset', { achievement });

    return true;
  }

  /**
   * Clear all achievements
   */
  clear(): void {
    this.achievements.clear();
    this.emit('achievementsCleared', {});
  }

  /**
   * Export achievements state
   */
  export(): Achievement[] {
    return Array.from(this.achievements.values()).map(a => ({ ...a }));
  }

  /**
   * Import achievements state
   */
  import(achievements: Achievement[]): void {
    this.clear();
    for (const achievement of achievements) {
      this.achievements.set(achievement.id, achievement);
    }
    this.emit('achievementsImported', { achievementCount: achievements.length });
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
      source: 'achievements',
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
