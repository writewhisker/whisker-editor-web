import { describe, it, expect, beforeEach } from 'vitest';
import { QuestSystem } from './QuestSystem';
import type { Quest, QuestObjective } from './types';

describe('QuestSystem', () => {
  let quests: QuestSystem;

  beforeEach(() => {
    quests = new QuestSystem();
  });

  describe('addQuest', () => {
    it('should add a new quest', () => {
      const questId = quests.addQuest({
        title: 'Find the Sword',
        description: 'Locate the legendary sword',
        objectives: [],
      });

      expect(questId).toBeDefined();
      expect(quests.getQuest(questId)).toBeDefined();
    });

    it('should set default status to available', () => {
      const questId = quests.addQuest({
        title: 'Test Quest',
        description: 'Test',
        objectives: [],
      });

      const quest = quests.getQuest(questId);
      expect(quest?.status).toBe('available');
    });

    it('should allow custom quest ID', () => {
      const questId = quests.addQuest({
        id: 'custom-quest-id',
        title: 'Custom Quest',
        description: 'Test',
        objectives: [],
      });

      expect(questId).toBe('custom-quest-id');
    });
  });

  describe('startQuest', () => {
    it('should start an available quest', () => {
      const questId = quests.addQuest({
        title: 'Main Quest',
        description: 'The main storyline',
        objectives: [],
      });

      const result = quests.startQuest(questId);
      expect(result).toBe(true);

      const quest = quests.getQuest(questId);
      expect(quest?.status).toBe('active');
    });

    it('should not start already active quest', () => {
      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives: [],
        status: 'active',
      });

      const result = quests.startQuest(questId);
      expect(result).toBe(false);
    });

    it('should not start completed quest', () => {
      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives: [],
        status: 'completed',
      });

      const result = quests.startQuest(questId);
      expect(result).toBe(false);
    });
  });

  describe('completeObjective', () => {
    it('should complete an objective', () => {
      const objectives: QuestObjective[] = [
        { id: 'obj1', description: 'Kill 10 goblins', completed: false },
      ];

      const questId = quests.addQuest({
        title: 'Goblin Slayer',
        description: 'Defeat goblins',
        objectives,
      });

      const result = quests.completeObjective(questId, 'obj1');
      expect(result).toBe(true);

      const quest = quests.getQuest(questId);
      expect(quest?.objectives[0].completed).toBe(true);
    });

    it('should not complete already completed objective', () => {
      const objectives: QuestObjective[] = [
        { id: 'obj1', description: 'Test', completed: true },
      ];

      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives,
      });

      const result = quests.completeObjective(questId, 'obj1');
      expect(result).toBe(false);
    });

    it('should auto-complete quest when all objectives done', () => {
      const objectives: QuestObjective[] = [
        { id: 'obj1', description: 'Task 1', completed: false },
        { id: 'obj2', description: 'Task 2', completed: false },
      ];

      const questId = quests.addQuest({
        title: 'Multi-task Quest',
        description: 'Complete all tasks',
        objectives,
      });

      quests.completeObjective(questId, 'obj1');
      let quest = quests.getQuest(questId);
      expect(quest?.status).not.toBe('completed');

      quests.completeObjective(questId, 'obj2');
      quest = quests.getQuest(questId);
      expect(quest?.status).toBe('completed');
    });
  });

  describe('updateObjectiveProgress', () => {
    it('should update objective progress', () => {
      const objectives: QuestObjective[] = [
        { id: 'obj1', description: 'Collect 10 items', completed: false, progress: 0, target: 10 },
      ];

      const questId = quests.addQuest({
        title: 'Collection Quest',
        description: 'Collect items',
        objectives,
      });

      quests.updateObjectiveProgress(questId, 'obj1', 5);

      const quest = quests.getQuest(questId);
      expect(quest?.objectives[0].progress).toBe(5);
      expect(quest?.objectives[0].completed).toBe(false);
    });

    it('should auto-complete objective when target reached', () => {
      const objectives: QuestObjective[] = [
        { id: 'obj1', description: 'Collect 10 items', completed: false, progress: 0, target: 10 },
      ];

      const questId = quests.addQuest({
        title: 'Collection Quest',
        description: 'Collect items',
        objectives,
      });

      quests.updateObjectiveProgress(questId, 'obj1', 10);

      const quest = quests.getQuest(questId);
      expect(quest?.objectives[0].completed).toBe(true);
      expect(quest?.status).toBe('completed'); // Quest auto-completes too
    });

    it('should auto-complete quest when all objectives reach target', () => {
      const objectives: QuestObjective[] = [
        { id: 'obj1', description: 'Task 1', completed: false, progress: 0, target: 5 },
        { id: 'obj2', description: 'Task 2', completed: false, progress: 0, target: 3 },
      ];

      const questId = quests.addQuest({
        title: 'Progress Quest',
        description: 'Track progress',
        objectives,
      });

      quests.updateObjectiveProgress(questId, 'obj1', 5);
      let quest = quests.getQuest(questId);
      expect(quest?.status).not.toBe('completed');

      quests.updateObjectiveProgress(questId, 'obj2', 3);
      quest = quests.getQuest(questId);
      expect(quest?.status).toBe('completed');
    });
  });

  describe('completeQuest', () => {
    it('should complete a quest', () => {
      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives: [],
      });

      const result = quests.completeQuest(questId);
      expect(result).toBe(true);

      const quest = quests.getQuest(questId);
      expect(quest?.status).toBe('completed');
    });

    it('should not complete already completed quest', () => {
      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives: [],
        status: 'completed',
      });

      const result = quests.completeQuest(questId);
      expect(result).toBe(false);
    });
  });

  describe('failQuest', () => {
    it('should fail a quest', () => {
      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives: [],
      });

      quests.failQuest(questId);

      const quest = quests.getQuest(questId);
      expect(quest?.status).toBe('failed');
    });
  });

  describe('resetQuest', () => {
    it('should reset quest to available', () => {
      const objectives: QuestObjective[] = [
        { id: 'obj1', description: 'Task', completed: true, progress: 10 },
      ];

      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives,
        status: 'completed',
      });

      quests.resetQuest(questId);

      const quest = quests.getQuest(questId);
      expect(quest?.status).toBe('available');
      expect(quest?.objectives[0].completed).toBe(false);
      expect(quest?.objectives[0].progress).toBe(0);
    });
  });

  describe('getQuestsByStatus', () => {
    beforeEach(() => {
      quests.addQuest({ title: 'Q1', description: 'D1', objectives: [], status: 'available' });
      quests.addQuest({ title: 'Q2', description: 'D2', objectives: [], status: 'active' });
      quests.addQuest({ title: 'Q3', description: 'D3', objectives: [], status: 'completed' });
      quests.addQuest({ title: 'Q4', description: 'D4', objectives: [], status: 'failed' });
    });

    it('should get available quests', () => {
      const available = quests.getQuestsByStatus('available');
      expect(available).toHaveLength(1);
      expect(available[0].title).toBe('Q1');
    });

    it('should get active quests', () => {
      const active = quests.getQuestsByStatus('active');
      expect(active).toHaveLength(1);
      expect(active[0].title).toBe('Q2');
    });

    it('should get completed quests', () => {
      const completed = quests.getQuestsByStatus('completed');
      expect(completed).toHaveLength(1);
      expect(completed[0].title).toBe('Q3');
    });
  });

  describe('getQuestProgress', () => {
    it('should calculate quest progress', () => {
      const objectives: QuestObjective[] = [
        { id: 'obj1', description: 'Task 1', completed: true },
        { id: 'obj2', description: 'Task 2', completed: true },
        { id: 'obj3', description: 'Task 3', completed: false },
        { id: 'obj4', description: 'Task 4', completed: false },
      ];

      const questId = quests.addQuest({
        title: 'Progress Test',
        description: 'Test progress',
        objectives,
      });

      const progress = quests.getQuestProgress(questId);
      expect(progress).toBe(0.5); // 2 out of 4 = 50%
    });

    it('should return 0 for quest with no objectives', () => {
      const questId = quests.addQuest({
        title: 'No Objectives',
        description: 'Test',
        objectives: [],
      });

      expect(quests.getQuestProgress(questId)).toBe(0);
    });
  });

  describe('isQuestCompleted', () => {
    it('should check if quest is completed', () => {
      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives: [],
        status: 'completed',
      });

      expect(quests.isQuestCompleted(questId)).toBe(true);
    });

    it('should return false for incomplete quest', () => {
      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives: [],
        status: 'active',
      });

      expect(quests.isQuestCompleted(questId)).toBe(false);
    });
  });

  describe('removeQuest', () => {
    it('should remove a quest', () => {
      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives: [],
      });

      const result = quests.removeQuest(questId);
      expect(result).toBe(true);
      expect(quests.getQuest(questId)).toBeUndefined();
    });
  });

  describe('export and import', () => {
    it('should export quest state', () => {
      quests.addQuest({ title: 'Q1', description: 'D1', objectives: [] });
      quests.addQuest({ title: 'Q2', description: 'D2', objectives: [] });

      const exported = quests.export();
      expect(exported).toHaveLength(2);
    });

    it('should import quest state', () => {
      const data: Quest[] = [
        {
          id: 'q1',
          title: 'Imported Quest',
          description: 'Test',
          status: 'active',
          objectives: [],
        },
      ];

      quests.import(data);

      expect(quests.getAllQuests()).toHaveLength(1);
      expect(quests.getQuest('q1')?.title).toBe('Imported Quest');
    });

    it('should clear existing quests on import', () => {
      quests.addQuest({ title: 'Old', description: 'Old', objectives: [] });

      const data: Quest[] = [
        {
          id: 'new',
          title: 'New Quest',
          description: 'New',
          status: 'available',
          objectives: [],
        },
      ];

      quests.import(data);

      expect(quests.getAllQuests()).toHaveLength(1);
      expect(quests.getQuest('new')).toBeDefined();
    });
  });

  describe('events', () => {
    it('should emit questAdded event', () => {
      let eventFired = false;

      quests.on('questAdded', (event) => {
        expect(event.type).toBe('questAdded');
        eventFired = true;
      });

      quests.addQuest({ title: 'Test', description: 'Test', objectives: [] });
      expect(eventFired).toBe(true);
    });

    it('should emit questStarted event', () => {
      let eventFired = false;
      const questId = quests.addQuest({ title: 'Test', description: 'Test', objectives: [] });

      quests.on('questStarted', (event) => {
        expect(event.type).toBe('questStarted');
        eventFired = true;
      });

      quests.startQuest(questId);
      expect(eventFired).toBe(true);
    });

    it('should emit objectiveCompleted event', () => {
      let eventFired = false;
      const questId = quests.addQuest({
        title: 'Test',
        description: 'Test',
        objectives: [{ id: 'obj1', description: 'Task', completed: false }],
      });

      quests.on('objectiveCompleted', (event) => {
        expect(event.type).toBe('objectiveCompleted');
        eventFired = true;
      });

      quests.completeObjective(questId, 'obj1');
      expect(eventFired).toBe(true);
    });

    it('should emit questCompleted event', () => {
      let eventFired = false;
      const questId = quests.addQuest({ title: 'Test', description: 'Test', objectives: [] });

      quests.on('questCompleted', (event) => {
        expect(event.type).toBe('questCompleted');
        eventFired = true;
      });

      quests.completeQuest(questId);
      expect(eventFired).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all quests', () => {
      quests.addQuest({ title: 'Q1', description: 'D1', objectives: [] });
      quests.addQuest({ title: 'Q2', description: 'D2', objectives: [] });

      quests.clear();

      expect(quests.getAllQuests()).toHaveLength(0);
    });
  });
});
