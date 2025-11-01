/**
 * Word Count Goals Store
 *
 * Manages word count goals and tracks writing progress.
 */

import { writable, derived, get } from 'svelte/store';
import type { Story } from '../models/Story';

export type GoalType = 'daily' | 'weekly' | 'monthly' | 'total';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'exceeded';

export interface WordGoal {
  id: string;
  type: GoalType;
  target: number; // Word count target
  current: number; // Current word count
  startDate: string;
  endDate?: string; // Optional for total goals
  created: string;
  modified: string;
}

export interface WritingSession {
  id: string;
  startTime: string;
  endTime: string;
  wordsWritten: number;
  passagesModified: string[]; // Passage IDs
}

export interface WordGoalStoreState {
  goals: WordGoal[];
  sessions: WritingSession[];
  currentSessionId: string | null;
  currentSessionStart: string | null;
  selectedGoalId: string | null;
}

const STORAGE_KEY = 'whisker-word-goals';

// Create writable store
const createWordGoalStore = () => {
  const { subscribe, set, update } = writable<WordGoalStoreState>({
    goals: [],
    sessions: [],
    currentSessionId: null,
    currentSessionStart: null,
    selectedGoalId: null,
  });

  return {
    subscribe,

    /**
     * Load goals and sessions from story metadata
     */
    loadGoals: (story: Story) => {
      const savedGoals = story.settings.wordGoals;
      const savedSessions = story.settings.writingSessions;

      if (savedGoals && Array.isArray(savedGoals)) {
        update(state => ({
          ...state,
          goals: savedGoals,
        }));
      } else {
        update(state => ({
          ...state,
          goals: [],
        }));
      }

      if (savedSessions && Array.isArray(savedSessions)) {
        update(state => ({
          ...state,
          sessions: savedSessions,
        }));
      } else {
        update(state => ({
          ...state,
          sessions: [],
        }));
      }
    },

    /**
     * Save goals and sessions to story metadata
     */
    saveGoals: (story: Story) => {
      const state = get({ subscribe });
      story.settings.wordGoals = state.goals;
      story.settings.writingSessions = state.sessions;
    },

    /**
     * Add a new goal
     */
    addGoal: (goal: Omit<WordGoal, 'id' | 'created' | 'modified' | 'current'>) => {
      update(state => {
        const now = new Date().toISOString();
        const newGoal: WordGoal = {
          ...goal,
          id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          current: 0,
          created: now,
          modified: now,
        };
        return {
          ...state,
          goals: [...state.goals, newGoal],
          selectedGoalId: newGoal.id,
        };
      });
    },

    /**
     * Update an existing goal
     */
    updateGoal: (id: string, updates: Partial<Omit<WordGoal, 'id' | 'created'>>) => {
      update(state => ({
        ...state,
        goals: state.goals.map(goal =>
          goal.id === id
            ? { ...goal, ...updates, modified: new Date().toISOString() }
            : goal
        ),
      }));
    },

    /**
     * Delete a goal
     */
    deleteGoal: (id: string) => {
      update(state => ({
        ...state,
        goals: state.goals.filter(goal => goal.id !== id),
        selectedGoalId: state.selectedGoalId === id ? null : state.selectedGoalId,
      }));
    },

    /**
     * Select a goal
     */
    selectGoal: (id: string | null) => {
      update(state => ({
        ...state,
        selectedGoalId: id,
      }));
    },

    /**
     * Update goal progress based on current story word count
     */
    updateProgress: (story: Story) => {
      const totalWords = Array.from(story.passages.values())
        .reduce((sum, passage) => sum + (passage.content?.split(/\s+/).filter(w => w.length > 0).length || 0), 0);

      update(state => {
        const now = new Date();
        const updatedGoals = state.goals.map(goal => {
          // Check if goal is still active
          const startDate = new Date(goal.startDate);
          const endDate = goal.endDate ? new Date(goal.endDate) : null;

          if (now < startDate || (endDate && now > endDate)) {
            return goal; // Goal not active yet or expired
          }

          // Update current progress
          return {
            ...goal,
            current: totalWords,
            modified: new Date().toISOString(),
          };
        });

        return {
          ...state,
          goals: updatedGoals,
        };
      });
    },

    /**
     * Start a new writing session
     */
    startSession: () => {
      update(state => {
        const now = new Date().toISOString();
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return {
          ...state,
          currentSessionId: sessionId,
          currentSessionStart: now,
        };
      });
    },

    /**
     * End current writing session
     */
    endSession: (story: Story) => {
      update(state => {
        if (!state.currentSessionId || !state.currentSessionStart) {
          return state;
        }

        const now = new Date().toISOString();
        const totalWords = Array.from(story.passages.values())
          .reduce((sum, passage) => sum + (passage.content?.split(/\s+/).filter(w => w.length > 0).length || 0), 0);

        // Calculate words written during session
        // This is a simplified calculation - in a real app, we'd track the starting word count
        const wordsWritten = 0; // Would need to track initial word count

        const newSession: WritingSession = {
          id: state.currentSessionId,
          startTime: state.currentSessionStart,
          endTime: now,
          wordsWritten,
          passagesModified: [], // Would need to track modified passages
        };

        return {
          ...state,
          sessions: [...state.sessions, newSession],
          currentSessionId: null,
          currentSessionStart: null,
        };
      });
    },

    /**
     * Get goal status
     */
    getGoalStatus: (goal: WordGoal): GoalStatus => {
      if (goal.current === 0) {
        return 'not_started';
      } else if (goal.current < goal.target) {
        return 'in_progress';
      } else if (goal.current === goal.target) {
        return 'completed';
      } else {
        return 'exceeded';
      }
    },

    /**
     * Clear all goals and sessions
     */
    clear: () => {
      set({
        goals: [],
        sessions: [],
        currentSessionId: null,
        currentSessionStart: null,
        selectedGoalId: null,
      });
    },
  };
};

export const wordGoalStore = createWordGoalStore();

// Derived stores
export const goals = derived(wordGoalStore, $store => $store.goals);
export const sessions = derived(wordGoalStore, $store => $store.sessions);
export const selectedGoalId = derived(wordGoalStore, $store => $store.selectedGoalId);
export const selectedGoal = derived(
  wordGoalStore,
  $store => $store.goals.find(g => g.id === $store.selectedGoalId) || null
);
export const currentSessionId = derived(wordGoalStore, $store => $store.currentSessionId);
export const isSessionActive = derived(wordGoalStore, $store => $store.currentSessionId !== null);

// Goal type counts
export const goalCounts = derived(goals, $goals => ({
  daily: $goals.filter(g => g.type === 'daily').length,
  weekly: $goals.filter(g => g.type === 'weekly').length,
  monthly: $goals.filter(g => g.type === 'monthly').length,
  total: $goals.filter(g => g.type === 'total').length,
  totalGoals: $goals.length,
}));

// Active goals (within date range)
export const activeGoals = derived(goals, $goals => {
  const now = new Date();
  return $goals.filter(goal => {
    const startDate = new Date(goal.startDate);
    const endDate = goal.endDate ? new Date(goal.endDate) : null;
    return now >= startDate && (!endDate || now <= endDate);
  });
});
