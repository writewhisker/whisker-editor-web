/**
 * Quest System
 *
 * Manages quests and objectives with support for:
 * - Quest tracking
 * - Objective completion
 * - Quest rewards
 * - Quest states (available, active, completed, failed)
 */

import { nanoid } from 'nanoid';
import type { Quest, QuestObjective, QuestReward, GameSystemEvent, EventHandler } from './types';

/**
 * Quest system for managing quests and objectives
 */
export class QuestSystem {
  private quests: Map<string, Quest> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  /**
   * Add a quest
   */
  addQuest(quest: Omit<Quest, 'id' | 'status'> & { id?: string; status?: Quest['status'] }): string {
    const questWithDefaults: Quest = {
      id: quest.id || nanoid(),
      title: quest.title,
      description: quest.description,
      status: quest.status || 'available',
      objectives: quest.objectives || [],
      rewards: quest.rewards,
      giver: quest.giver,
      category: quest.category,
      mainQuest: quest.mainQuest,
      requirements: quest.requirements,
      metadata: quest.metadata,
    };

    this.quests.set(questWithDefaults.id, questWithDefaults);
    this.emit('questAdded', { quest: questWithDefaults });

    return questWithDefaults.id;
  }

  /**
   * Get a quest by ID
   */
  getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }

  /**
   * Get all quests
   */
  getAllQuests(): Quest[] {
    return Array.from(this.quests.values());
  }

  /**
   * Get quests by status
   */
  getQuestsByStatus(status: Quest['status']): Quest[] {
    return this.getAllQuests().filter(q => q.status === status);
  }

  /**
   * Start a quest (mark as active)
   */
  startQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) {
      return false;
    }

    if (quest.status !== 'available') {
      return false;
    }

    quest.status = 'active';
    this.quests.set(questId, quest);
    this.emit('questStarted', { quest });

    return true;
  }

  /**
   * Complete an objective
   */
  completeObjective(questId: string, objectiveId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) {
      return false;
    }

    const objective = quest.objectives.find(o => o.id === objectiveId);
    if (!objective) {
      return false;
    }

    if (objective.completed) {
      return false; // Already completed
    }

    objective.completed = true;
    this.quests.set(questId, quest);
    this.emit('objectiveCompleted', { quest, objective });

    // Check if all objectives are complete
    if (quest.objectives.every(o => o.completed)) {
      this.completeQuest(questId);
    }

    return true;
  }

  /**
   * Update objective progress
   */
  updateObjectiveProgress(questId: string, objectiveId: string, progress: number): boolean {
    const quest = this.quests.get(questId);
    if (!quest) {
      return false;
    }

    const objective = quest.objectives.find(o => o.id === objectiveId);
    if (!objective) {
      return false;
    }

    objective.progress = progress;

    // Auto-complete if progress reaches target
    if (objective.target !== undefined && progress >= objective.target) {
      objective.completed = true;
      this.emit('objectiveCompleted', { quest, objective });

      // Check if all objectives are complete
      if (quest.objectives.every(o => o.completed)) {
        this.completeQuest(questId);
      }
    } else {
      this.emit('objectiveProgressUpdated', { quest, objective, progress });
    }

    this.quests.set(questId, quest);
    return true;
  }

  /**
   * Complete a quest
   */
  completeQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) {
      return false;
    }

    if (quest.status === 'completed') {
      return false; // Already completed
    }

    quest.status = 'completed';
    this.quests.set(questId, quest);
    this.emit('questCompleted', { quest });

    return true;
  }

  /**
   * Fail a quest
   */
  failQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) {
      return false;
    }

    quest.status = 'failed';
    this.quests.set(questId, quest);
    this.emit('questFailed', { quest });

    return true;
  }

  /**
   * Reset a quest
   */
  resetQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) {
      return false;
    }

    quest.status = 'available';
    for (const objective of quest.objectives) {
      objective.completed = false;
      objective.progress = 0;
    }

    this.quests.set(questId, quest);
    this.emit('questReset', { quest });

    return true;
  }

  /**
   * Remove a quest
   */
  removeQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) {
      return false;
    }

    this.quests.delete(questId);
    this.emit('questRemoved', { quest });

    return true;
  }

  /**
   * Get quest progress (0-1)
   */
  getQuestProgress(questId: string): number {
    const quest = this.quests.get(questId);
    if (!quest || quest.objectives.length === 0) {
      return 0;
    }

    const completed = quest.objectives.filter(o => o.completed).length;
    return completed / quest.objectives.length;
  }

  /**
   * Check if quest is completed
   */
  isQuestCompleted(questId: string): boolean {
    const quest = this.quests.get(questId);
    return quest?.status === 'completed';
  }

  /**
   * Clear all quests
   */
  clear(): void {
    this.quests.clear();
    this.emit('questsCleared', {});
  }

  /**
   * Export quests state
   */
  export(): Quest[] {
    return this.getAllQuests().map(quest => ({ ...quest }));
  }

  /**
   * Import quests state
   */
  import(quests: Quest[]): void {
    this.clear();
    for (const quest of quests) {
      this.quests.set(quest.id, quest);
    }
    this.emit('questsImported', { questCount: quests.length });
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
      source: 'quest',
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
