import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  playtestStore,
  sessions,
  currentSession,
  isRecording,
  analytics,
  sessionCount,
  type PlaytestSession,
  type PlaytestAction,
} from './playtestStore';
import { Story } from '../models/Story';

describe('playtestStore', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    playtestStore.clearAllSessions();
  });

  afterEach(() => {
    playtestStore.clearAllSessions();
  });

  describe('initial state', () => {
    it('should initialize with empty sessions', () => {
      expect(get(sessions)).toEqual([]);
    });

    it('should initialize with no current session', () => {
      expect(get(currentSession)).toBeNull();
    });

    it('should initialize with isRecording false', () => {
      expect(get(isRecording)).toBe(false);
    });

    it('should initialize with null analytics', () => {
      expect(get(analytics)).toBeNull();
    });

    it('should initialize with sessionCount 0', () => {
      expect(get(sessionCount)).toBe(0);
    });
  });

  describe('startSession', () => {
    it('should start a new playtest session', () => {
      playtestStore.startSession(story);

      expect(get(isRecording)).toBe(true);
      expect(get(currentSession)).not.toBeNull();
    });

    it('should create session with story metadata', () => {
      playtestStore.startSession(story);

      const session = get(currentSession);
      expect(session?.storyTitle).toBe('Test Story');
      expect(session?.storyVersion).toBe('1.0.0');
    });

    it('should initialize session with empty actions', () => {
      playtestStore.startSession(story);

      const session = get(currentSession);
      expect(session?.actions).toEqual([]);
    });

    it('should initialize session as not completed', () => {
      playtestStore.startSession(story);

      const session = get(currentSession);
      expect(session?.completed).toBe(false);
    });

    it('should set session start time', () => {
      const before = Date.now();
      playtestStore.startSession(story);
      const after = Date.now();

      const session = get(currentSession);
      expect(session?.startTime).toBeDefined();
      const startTime = new Date(session!.startTime).getTime();
      expect(startTime).toBeGreaterThanOrEqual(before);
      expect(startTime).toBeLessThanOrEqual(after);
    });

    it('should generate unique session ID', () => {
      playtestStore.startSession(story);
      const session1 = get(currentSession);

      playtestStore.endSession();

      playtestStore.startSession(story);
      const session2 = get(currentSession);

      expect(session1?.id).not.toBe(session2?.id);
    });

    it('should accept optional metadata', () => {
      playtestStore.startSession(story, {
        playerName: 'Test Player',
        notes: 'Test notes',
        tags: ['test'],
      });

      const session = get(currentSession);
      expect(session?.metadata?.playerName).toBe('Test Player');
      expect(session?.metadata?.notes).toBe('Test notes');
      expect(session?.metadata?.tags).toEqual(['test']);
    });
  });

  describe('recordPassageView', () => {
    beforeEach(() => {
      playtestStore.startSession(story);
    });

    it('should record passage view action', () => {
      playtestStore.recordPassageView('passage-1', 'Start Passage');

      const session = get(currentSession);
      expect(session?.actions).toHaveLength(1);
      expect(session?.actions[0].type).toBe('passage_view');
    });

    it('should record passage ID and title', () => {
      playtestStore.recordPassageView('passage-123', 'My Passage');

      const session = get(currentSession);
      const action = session?.actions[0];
      expect(action?.passageId).toBe('passage-123');
      expect(action?.passageTitle).toBe('My Passage');
    });

    it('should record timestamp', () => {
      const before = Date.now();
      playtestStore.recordPassageView('p1', 'Title');
      const after = Date.now();

      const session = get(currentSession);
      const action = session?.actions[0];
      expect(action?.timestamp).toBeGreaterThanOrEqual(before);
      expect(action?.timestamp).toBeLessThanOrEqual(after);
    });

    it('should record time spent on previous passage', () => {
      playtestStore.recordPassageView('p1', 'First', 5000);

      const session = get(currentSession);
      const action = session?.actions[0];
      expect(action?.timeSpentMs).toBe(5000);
    });

    it('should add passage to visited list', () => {
      playtestStore.recordPassageView('p1', 'First');
      playtestStore.recordPassageView('p2', 'Second');

      const session = get(currentSession);
      expect(session?.passagesVisited).toEqual(['p1', 'p2']);
    });

    it('should not record if not recording', () => {
      playtestStore.endSession();

      playtestStore.recordPassageView('p1', 'Title');

      const session = get(currentSession);
      expect(session).toBeNull();
    });
  });

  describe('recordChoice', () => {
    beforeEach(() => {
      playtestStore.startSession(story);
    });

    it('should record choice selection', () => {
      playtestStore.recordChoice('choice-1', 'Continue');

      const session = get(currentSession);
      expect(session?.actions).toHaveLength(1);
      expect(session?.actions[0].type).toBe('choice_select');
    });

    it('should record choice ID and text', () => {
      playtestStore.recordChoice('choice-123', 'Go left');

      const session = get(currentSession);
      const action = session?.actions[0];
      expect(action?.choiceId).toBe('choice-123');
      expect(action?.choiceText).toBe('Go left');
    });

    it('should record target passage ID', () => {
      playtestStore.recordChoice('choice-1', 'Next', 'target-passage');

      const session = get(currentSession);
      const action = session?.actions[0];
      expect(action?.targetPassageId).toBe('target-passage');
    });

    it('should increment choices made counter', () => {
      playtestStore.recordChoice('c1', 'Choice 1');
      playtestStore.recordChoice('c2', 'Choice 2');

      const session = get(currentSession);
      expect(session?.choicesMade).toBe(2);
    });

    it('should not record if not recording', () => {
      playtestStore.endSession();

      playtestStore.recordChoice('c1', 'Text');

      const allSessions = get(sessions);
      const lastSession = allSessions[allSessions.length - 1];
      expect(lastSession.actions.filter(a => a.type === 'choice_select')).toHaveLength(0);
    });
  });

  describe('recordVariableChange', () => {
    beforeEach(() => {
      playtestStore.startSession(story);
    });

    it('should record variable change', () => {
      playtestStore.recordVariableChange('health', 100, 80);

      const session = get(currentSession);
      expect(session?.actions).toHaveLength(1);
      expect(session?.actions[0].type).toBe('variable_change');
    });

    it('should record variable name and values', () => {
      playtestStore.recordVariableChange('score', 0, 10);

      const session = get(currentSession);
      const action = session?.actions[0];
      expect(action?.variableName).toBe('score');
      expect(action?.variableOldValue).toBe(0);
      expect(action?.variableNewValue).toBe(10);
    });

    it('should handle different value types', () => {
      playtestStore.recordVariableChange('isAlive', true, false);

      const session = get(currentSession);
      const action = session?.actions[0];
      expect(action?.variableOldValue).toBe(true);
      expect(action?.variableNewValue).toBe(false);
    });
  });

  describe('recordRestart', () => {
    beforeEach(() => {
      playtestStore.startSession(story);
    });

    it('should record restart action', () => {
      playtestStore.recordRestart();

      const session = get(currentSession);
      expect(session?.actions).toHaveLength(1);
      expect(session?.actions[0].type).toBe('restart');
    });

    it('should record restart timestamp', () => {
      const before = Date.now();
      playtestStore.recordRestart();
      const after = Date.now();

      const session = get(currentSession);
      const action = session?.actions[0];
      expect(action?.timestamp).toBeGreaterThanOrEqual(before);
      expect(action?.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('endSession', () => {
    beforeEach(() => {
      playtestStore.startSession(story);
    });

    it('should end current session', () => {
      playtestStore.endSession();

      expect(get(isRecording)).toBe(false);
      expect(get(currentSession)).toBeNull();
    });

    it('should save session to sessions list', () => {
      playtestStore.endSession();

      expect(get(sessions)).toHaveLength(1);
    });

    it('should set end time', () => {
      playtestStore.endSession();

      const savedSessions = get(sessions);
      expect(savedSessions[0].endTime).toBeDefined();
    });

    it('should calculate session duration', () => {
      playtestStore.endSession();

      const savedSessions = get(sessions);
      expect(savedSessions[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should mark session as completed if requested', () => {
      playtestStore.endSession(true);

      const savedSessions = get(sessions);
      expect(savedSessions[0].completed).toBe(true);
    });

    it('should save final variables if provided', () => {
      const finalVars = { health: 80, score: 1000 };

      playtestStore.endSession(true, finalVars);

      const savedSessions = get(sessions);
      expect(savedSessions[0].finalVariables).toEqual(finalVars);
    });

    it('should add end action to actions list', () => {
      playtestStore.recordPassageView('p1', 'Start');

      playtestStore.endSession();

      const savedSessions = get(sessions);
      const lastAction = savedSessions[0].actions[savedSessions[0].actions.length - 1];
      expect(lastAction.type).toBe('end');
    });

    it('should do nothing if no session is active', () => {
      playtestStore.endSession();
      playtestStore.endSession(); // Second call

      expect(get(sessions)).toHaveLength(1);
    });
  });

  describe('cancelSession', () => {
    it('should cancel current session without saving', () => {
      playtestStore.startSession(story);
      playtestStore.recordPassageView('p1', 'Test');

      playtestStore.cancelSession();

      expect(get(currentSession)).toBeNull();
      expect(get(isRecording)).toBe(false);
      expect(get(sessions)).toHaveLength(0);
    });
  });

  describe('deleteSession', () => {
    it('should delete specific session', () => {
      playtestStore.startSession(story);
      playtestStore.endSession();

      const savedSessions = get(sessions);
      const sessionId = savedSessions[0].id;

      playtestStore.deleteSession(sessionId);

      expect(get(sessions)).toHaveLength(0);
    });

    it('should not affect other sessions', () => {
      playtestStore.startSession(story);
      playtestStore.endSession();

      playtestStore.startSession(story);
      playtestStore.endSession();

      const savedSessions = get(sessions);
      const firstSessionId = savedSessions[0].id;

      playtestStore.deleteSession(firstSessionId);

      expect(get(sessions)).toHaveLength(1);
      expect(get(sessions)[0].id).not.toBe(firstSessionId);
    });
  });

  describe('analyze', () => {
    beforeEach(() => {
      // Create multiple test sessions
      playtestStore.startSession(story);
      playtestStore.recordPassageView('p1', 'Start');
      playtestStore.recordChoice('c1', 'Continue', 'p2');
      playtestStore.recordPassageView('p2', 'Middle');
      playtestStore.endSession(true);

      playtestStore.startSession(story);
      playtestStore.recordPassageView('p1', 'Start');
      playtestStore.recordChoice('c2', 'Quit', 'p3');
      playtestStore.recordPassageView('p3', 'End');
      playtestStore.endSession(false);
    });

    it('should analyze all sessions', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData).not.toBeNull();
    });

    it('should calculate total sessions', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.totalSessions).toBe(2);
    });

    it('should calculate completed sessions', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.completedSessions).toBe(1);
    });

    it('should calculate completion rate', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.completionRate).toBe(50);
    });

    it('should calculate average session duration', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.avgSessionDuration).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average choices per session', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.avgChoicesPerSession).toBe(1);
    });

    it('should calculate average passages per session', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.avgPassagesPerSession).toBe(2);
    });

    it('should build passage heatmap', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.passageHeatmap).toBeDefined();
      expect(analyticsData?.passageHeatmap.length).toBeGreaterThan(0);
    });

    it('should identify popular paths', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.popularPaths).toBeDefined();
      expect(Array.isArray(analyticsData?.popularPaths)).toBe(true);
    });

    it('should identify dead ends', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.deadEnds).toBeDefined();
      expect(Array.isArray(analyticsData?.deadEnds)).toBe(true);
    });

    it('should track choice distribution', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.choiceDistribution).toBeDefined();
      expect(analyticsData?.choiceDistribution.size).toBeGreaterThan(0);
    });

    it('should identify dropoff points', () => {
      playtestStore.analyze();

      const analyticsData = get(analytics);
      expect(analyticsData?.dropoffPoints).toBeDefined();
    });
  });

  describe('exportSessions', () => {
    it('should export sessions as JSON', () => {
      playtestStore.startSession(story);
      playtestStore.recordPassageView('p1', 'Test');
      playtestStore.endSession();

      const exported = playtestStore.exportSessions();

      expect(exported).toBeDefined();
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should include all session data', () => {
      playtestStore.startSession(story);
      playtestStore.recordPassageView('p1', 'Test');
      playtestStore.endSession();

      const exported = playtestStore.exportSessions();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].storyTitle).toBe('Test Story');
      expect(parsed[0].actions).toBeDefined();
    });

    it('should export empty array if no sessions', () => {
      const exported = playtestStore.exportSessions();
      const parsed = JSON.parse(exported);

      expect(parsed).toEqual([]);
    });
  });

  describe('importSessions', () => {
    it('should import sessions from JSON', () => {
      const testSessions: PlaytestSession[] = [
        {
          id: 'test-session-1',
          storyTitle: 'Imported Story',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1000,
          completed: true,
          actions: [],
          passagesVisited: ['p1'],
          choicesMade: 0,
        },
      ];

      const json = JSON.stringify(testSessions);

      playtestStore.importSessions(json);

      expect(get(sessions)).toHaveLength(1);
      expect(get(sessions)[0].id).toBe('test-session-1');
    });

    it('should append to existing sessions', () => {
      playtestStore.startSession(story);
      playtestStore.endSession();

      const testSessions: PlaytestSession[] = [
        {
          id: 'imported-1',
          storyTitle: 'Imported',
          startTime: new Date().toISOString(),
          completed: false,
          actions: [],
          passagesVisited: [],
          choicesMade: 0,
        },
      ];

      playtestStore.importSessions(JSON.stringify(testSessions));

      expect(get(sessions)).toHaveLength(2);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        playtestStore.importSessions('invalid json');
      }).toThrow();
    });

    it('should handle import errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        playtestStore.importSessions('{}');
      }).toThrow('Invalid session data format');

      consoleSpy.mockRestore();
    });
  });

  describe('clearAllSessions', () => {
    it('should clear all sessions', () => {
      playtestStore.startSession(story);
      playtestStore.endSession();

      playtestStore.startSession(story);
      playtestStore.endSession();

      playtestStore.clearAllSessions();

      expect(get(sessions)).toEqual([]);
    });

    it('should reset analytics', () => {
      playtestStore.startSession(story);
      playtestStore.endSession();
      playtestStore.analyze();

      playtestStore.clearAllSessions();

      expect(get(analytics)).toBeNull();
    });
  });

  describe('passage heatmap analysis', () => {
    it('should track passage visit counts', () => {
      playtestStore.startSession(story);
      playtestStore.recordPassageView('p1', 'Start');
      playtestStore.recordPassageView('p1', 'Start');
      playtestStore.endSession();

      playtestStore.analyze();

      const analyticsData = get(analytics);
      const p1Data = analyticsData?.passageHeatmap.find(p => p.passageId === 'p1');
      expect(p1Data?.visits).toBe(2);
    });

    it('should calculate average time per passage', () => {
      playtestStore.startSession(story);
      playtestStore.recordPassageView('p1', 'Start', 5000);
      playtestStore.recordPassageView('p1', 'Start', 3000);
      playtestStore.endSession();

      playtestStore.analyze();

      const analyticsData = get(analytics);
      const p1Data = analyticsData?.passageHeatmap.find(p => p.passageId === 'p1');
      expect(p1Data?.avgTimeMs).toBe(4000);
    });

    it('should sort passages by visit count', () => {
      playtestStore.startSession(story);
      playtestStore.recordPassageView('p1', 'Start');
      playtestStore.recordPassageView('p2', 'Middle');
      playtestStore.recordPassageView('p2', 'Middle');
      playtestStore.recordPassageView('p2', 'Middle');
      playtestStore.endSession();

      playtestStore.analyze();

      const analyticsData = get(analytics);
      const heatmap = analyticsData?.passageHeatmap || [];
      expect(heatmap[0].passageId).toBe('p2'); // Most visited first
    });
  });

  describe('derived stores', () => {
    it('should derive sessionCount', () => {
      playtestStore.startSession(story);
      playtestStore.endSession();

      playtestStore.startSession(story);
      playtestStore.endSession();

      expect(get(sessionCount)).toBe(2);
    });

    it('should update sessions store', () => {
      playtestStore.startSession(story);
      playtestStore.endSession();

      const allSessions = get(sessions);
      expect(allSessions).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle very long sessions', () => {
      playtestStore.startSession(story);

      for (let i = 0; i < 100; i++) {
        playtestStore.recordPassageView(`p${i}`, `Passage ${i}`);
      }

      playtestStore.endSession();

      const savedSessions = get(sessions);
      expect(savedSessions[0].passagesVisited).toHaveLength(100);
    });

    it('should handle sessions with no actions', () => {
      playtestStore.startSession(story);
      playtestStore.endSession();

      const savedSessions = get(sessions);
      expect(savedSessions[0].actions).toHaveLength(1); // Only end action
    });

    it('should handle multiple concurrent imports', () => {
      const sessions1 = [{ id: '1', storyTitle: 'Test', startTime: new Date().toISOString(), completed: false, actions: [], passagesVisited: [], choicesMade: 0 }];
      const sessions2 = [{ id: '2', storyTitle: 'Test', startTime: new Date().toISOString(), completed: false, actions: [], passagesVisited: [], choicesMade: 0 }];

      playtestStore.importSessions(JSON.stringify(sessions1));
      playtestStore.importSessions(JSON.stringify(sessions2));

      expect(get(sessions)).toHaveLength(2);
    });
  });
});
