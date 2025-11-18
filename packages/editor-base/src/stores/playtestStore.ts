/**
 * Playtest Session Recording Store
 *
 * Records and analyzes playtest sessions including:
 * - Player choices and paths taken
 * - Time spent on each passage
 * - Variable state changes
 * - Session replay capability
 * - Heatmap data (popular paths, dead ends hit)
 * - Analytics (completion rate, average session time, choice distribution)
 */

import { writable, derived } from 'svelte/store';
import type { Story } from '@writewhisker/core-ts';

export interface PlaytestAction {
  type: 'passage_view' | 'choice_select' | 'variable_change' | 'restart' | 'end';
  timestamp: number;
  passageId?: string;
  passageTitle?: string;
  choiceId?: string;
  choiceText?: string;
  targetPassageId?: string;
  variableName?: string;
  variableOldValue?: any;
  variableNewValue?: any;
  timeSpentMs?: number; // Time spent on previous passage
}

export interface PlaytestSession {
  id: string;
  storyTitle: string;
  storyVersion?: string;
  startTime: string;
  endTime?: string;
  duration?: number; // Total session time in ms
  completed: boolean;
  actions: PlaytestAction[];
  finalVariables?: Record<string, any>;
  passagesVisited: string[]; // Ordered list of passage IDs
  choicesMade: number;
  metadata?: {
    playerName?: string;
    notes?: string;
    tags?: string[];
  };
}

export interface PassageHeatmapData {
  passageId: string;
  passageTitle: string;
  visits: number;
  totalTimeMs: number;
  avgTimeMs: number;
  exitPaths: Map<string, number>; // choiceId -> count
}

export interface PlaytestAnalytics {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  avgSessionDuration: number; // ms
  avgChoicesPerSession: number;
  avgPassagesPerSession: number;
  popularPaths: string[][]; // Array of passage ID paths
  deadEnds: { passageId: string; passageTitle: string; hits: number }[];
  choiceDistribution: Map<string, { choiceText: string; selectionCount: number }>;
  passageHeatmap: PassageHeatmapData[];
  dropoffPoints: { passageId: string; passageTitle: string; dropoffs: number }[];
}

export interface PlaytestStoreState {
  sessions: PlaytestSession[];
  currentSession: PlaytestSession | null;
  isRecording: boolean;
  analytics: PlaytestAnalytics | null;
  lastAnalyzed: string | null;
}

// Generate unique session ID
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate session duration
function calculateDuration(session: PlaytestSession): number {
  if (!session.endTime) return Date.now() - new Date(session.startTime).getTime();
  return new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
}

// Analyze sessions for analytics
function analyzeSessions(sessions: PlaytestSession[]): PlaytestAnalytics {
  const completedSessions = sessions.filter(s => s.completed);
  const totalSessions = sessions.length;
  const completionRate = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;

  // Calculate averages
  let totalDuration = 0;
  let totalChoices = 0;
  let totalPassages = 0;

  for (const session of sessions) {
    totalDuration += session.duration || calculateDuration(session);
    totalChoices += session.choicesMade;
    totalPassages += session.passagesVisited.length;
  }

  const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
  const avgChoicesPerSession = totalSessions > 0 ? totalChoices / totalSessions : 0;
  const avgPassagesPerSession = totalSessions > 0 ? totalPassages / totalSessions : 0;

  // Build passage heatmap
  const passageData = new Map<string, {
    title: string;
    visits: number;
    totalTime: number;
    exitPaths: Map<string, number>;
  }>();

  for (const session of sessions) {
    for (let i = 0; i < session.actions.length; i++) {
      const action = session.actions[i];

      if (action.type === 'passage_view' && action.passageId) {
        const data = passageData.get(action.passageId) || {
          title: action.passageTitle || 'Untitled',
          visits: 0,
          totalTime: 0,
          exitPaths: new Map(),
        };

        data.visits++;

        if (action.timeSpentMs) {
          data.totalTime += action.timeSpentMs;
        }

        // Track exit path
        const nextAction = session.actions[i + 1];
        if (nextAction?.type === 'choice_select' && nextAction.choiceId) {
          const exitCount = data.exitPaths.get(nextAction.choiceId) || 0;
          data.exitPaths.set(nextAction.choiceId, exitCount + 1);
        }

        passageData.set(action.passageId, data);
      }
    }
  }

  const passageHeatmap: PassageHeatmapData[] = Array.from(passageData.entries())
    .map(([passageId, data]) => ({
      passageId,
      passageTitle: data.title,
      visits: data.visits,
      totalTimeMs: data.totalTime,
      avgTimeMs: data.visits > 0 ? data.totalTime / data.visits : 0,
      exitPaths: data.exitPaths,
    }))
    .sort((a, b) => b.visits - a.visits);

  // Find popular paths (sequences of 3+ passages)
  const pathCounts = new Map<string, number>();
  for (const session of completedSessions) {
    for (let i = 0; i < session.passagesVisited.length - 2; i++) {
      const path = session.passagesVisited.slice(i, i + 3);
      const pathKey = path.join('->');
      pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1);
    }
  }

  const popularPaths = Array.from(pathCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pathKey]) => pathKey.split('->'));

  // Find dead ends (passages where sessions ended without completion)
  const deadEndCounts = new Map<string, { title: string; count: number }>();
  for (const session of sessions.filter(s => !s.completed)) {
    const lastPassage = session.passagesVisited[session.passagesVisited.length - 1];
    if (lastPassage) {
      const lastAction = session.actions
        .slice()
        .reverse()
        .find(a => a.type === 'passage_view' && a.passageId === lastPassage);

      const data = deadEndCounts.get(lastPassage) || {
        title: lastAction?.passageTitle || 'Untitled',
        count: 0,
      };
      data.count++;
      deadEndCounts.set(lastPassage, data);
    }
  }

  const deadEnds = Array.from(deadEndCounts.entries())
    .map(([passageId, data]) => ({
      passageId,
      passageTitle: data.title,
      hits: data.count,
    }))
    .sort((a, b) => b.hits - a.hits);

  // Choice distribution
  const choiceCounts = new Map<string, { text: string; count: number }>();
  for (const session of sessions) {
    for (const action of session.actions) {
      if (action.type === 'choice_select' && action.choiceId) {
        const data = choiceCounts.get(action.choiceId) || {
          text: action.choiceText || 'Unknown',
          count: 0,
        };
        data.count++;
        choiceCounts.set(action.choiceId, data);
      }
    }
  }

  const choiceDistribution = new Map(
    Array.from(choiceCounts.entries()).map(([id, data]) => [
      id,
      { choiceText: data.text, selectionCount: data.count },
    ])
  );

  // Dropoff points (where players stopped but didn't complete)
  const dropoffPoints = deadEnds.slice(0, 5).map(de => ({
    passageId: de.passageId,
    passageTitle: de.passageTitle,
    dropoffs: de.hits
  }));

  return {
    totalSessions,
    completedSessions: completedSessions.length,
    completionRate,
    avgSessionDuration,
    avgChoicesPerSession,
    avgPassagesPerSession,
    popularPaths,
    deadEnds,
    choiceDistribution,
    passageHeatmap,
    dropoffPoints,
  };
}

// Create playtest store
const createPlaytestStore = () => {
  const { subscribe, set, update } = writable<PlaytestStoreState>({
    sessions: [],
    currentSession: null,
    isRecording: false,
    analytics: null,
    lastAnalyzed: null,
  });

  return {
    subscribe,

    /**
     * Start a new playtest session
     */
    startSession: (story: Story, metadata?: PlaytestSession['metadata']) => {
      const session: PlaytestSession = {
        id: generateSessionId(),
        storyTitle: story.metadata.title,
        storyVersion: story.metadata.version,
        startTime: new Date().toISOString(),
        completed: false,
        actions: [],
        passagesVisited: [],
        choicesMade: 0,
        metadata,
      };

      update(state => ({
        ...state,
        currentSession: session,
        isRecording: true,
      }));
    },

    /**
     * Record a passage view
     */
    recordPassageView: (passageId: string, passageTitle: string, timeSpentMs?: number) => {
      update(state => {
        if (!state.currentSession || !state.isRecording) return state;

        const action: PlaytestAction = {
          type: 'passage_view',
          timestamp: Date.now(),
          passageId,
          passageTitle,
          timeSpentMs,
        };

        const updatedSession = {
          ...state.currentSession,
          actions: [...state.currentSession.actions, action],
          passagesVisited: [...state.currentSession.passagesVisited, passageId],
        };

        return {
          ...state,
          currentSession: updatedSession,
        };
      });
    },

    /**
     * Record a choice selection
     */
    recordChoice: (choiceId: string, choiceText: string, targetPassageId?: string) => {
      update(state => {
        if (!state.currentSession || !state.isRecording) return state;

        const action: PlaytestAction = {
          type: 'choice_select',
          timestamp: Date.now(),
          choiceId,
          choiceText,
          targetPassageId,
        };

        const updatedSession = {
          ...state.currentSession,
          actions: [...state.currentSession.actions, action],
          choicesMade: state.currentSession.choicesMade + 1,
        };

        return {
          ...state,
          currentSession: updatedSession,
        };
      });
    },

    /**
     * Record a variable change
     */
    recordVariableChange: (variableName: string, oldValue: any, newValue: any) => {
      update(state => {
        if (!state.currentSession || !state.isRecording) return state;

        const action: PlaytestAction = {
          type: 'variable_change',
          timestamp: Date.now(),
          variableName,
          variableOldValue: oldValue,
          variableNewValue: newValue,
        };

        const updatedSession = {
          ...state.currentSession,
          actions: [...state.currentSession.actions, action],
        };

        return {
          ...state,
          currentSession: updatedSession,
        };
      });
    },

    /**
     * Record session restart
     */
    recordRestart: () => {
      update(state => {
        if (!state.currentSession || !state.isRecording) return state;

        const action: PlaytestAction = {
          type: 'restart',
          timestamp: Date.now(),
        };

        const updatedSession = {
          ...state.currentSession,
          actions: [...state.currentSession.actions, action],
        };

        return {
          ...state,
          currentSession: updatedSession,
        };
      });
    },

    /**
     * End the current session
     */
    endSession: (completed: boolean = false, finalVariables?: Record<string, any>) => {
      update(state => {
        if (!state.currentSession) return state;

        const endTime = new Date().toISOString();
        const duration = calculateDuration({ ...state.currentSession, endTime });

        const action: PlaytestAction = {
          type: 'end',
          timestamp: Date.now(),
        };

        const finalSession: PlaytestSession = {
          ...state.currentSession,
          endTime,
          duration,
          completed,
          finalVariables,
          actions: [...state.currentSession.actions, action],
        };

        return {
          ...state,
          sessions: [...state.sessions, finalSession],
          currentSession: null,
          isRecording: false,
        };
      });
    },

    /**
     * Cancel current session without saving
     */
    cancelSession: () => {
      update(state => ({
        ...state,
        currentSession: null,
        isRecording: false,
      }));
    },

    /**
     * Analyze all sessions
     */
    analyze: () => {
      update(state => ({
        ...state,
        analytics: analyzeSessions(state.sessions),
        lastAnalyzed: new Date().toISOString(),
      }));
    },

    /**
     * Delete a session
     */
    deleteSession: (sessionId: string) => {
      update(state => ({
        ...state,
        sessions: state.sessions.filter(s => s.id !== sessionId),
      }));
    },

    /**
     * Clear all sessions
     */
    clearAllSessions: () => {
      update(state => ({
        ...state,
        sessions: [],
        analytics: null,
        lastAnalyzed: null,
      }));
    },

    /**
     * Export session data
     */
    exportSessions: (): string => {
      let sessions: PlaytestSession[] = [];
      const unsubscribe = subscribe(state => {
        sessions = state.sessions;
      });
      unsubscribe();

      return JSON.stringify(sessions, null, 2);
    },

    /**
     * Import session data
     */
    importSessions: (jsonData: string) => {
      try {
        const importedSessions: PlaytestSession[] = JSON.parse(jsonData);
        update(state => ({
          ...state,
          sessions: [...state.sessions, ...importedSessions],
        }));
      } catch (error) {
        console.error('Failed to import sessions:', error);
        throw new Error('Invalid session data format');
      }
    },
  };
};

export const playtestStore = createPlaytestStore();

// Derived stores
export const sessions = derived(playtestStore, $store => $store.sessions);
export const currentSession = derived(playtestStore, $store => $store.currentSession);
export const isRecording = derived(playtestStore, $store => $store.isRecording);
export const analytics = derived(playtestStore, $store => $store.analytics);
export const sessionCount = derived(sessions, $sessions => $sessions.length);
