/**
 * Tests for Story Debugger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Story } from '@writewhisker/story-models';
import {
  StoryDebugger,
  createDebugger,
  inspectStory,
  traceExecution,
  formatDebugOutput,
  type DebugState,
  type LogLevel,
  type LogEntry,
  type Breakpoint,
} from './index';

// Helper to create a test story
function createMockStory(): Story {
  const story = new Story({
    metadata: {
      title: 'Test Story',
      author: 'Test',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    startPassage: 'passage-1', // Use ID, not title
    passages: {
      'passage-1': {
        id: 'passage-1',
        title: 'Start',
        tags: [],
        content: 'Start of the story.\n\n[[Go to Middle|Middle]]\n[[Go to End|End]]',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      },
      'passage-2': {
        id: 'passage-2',
        title: 'Middle',
        tags: [],
        content: 'Middle of the story.\n\n[[Continue|End]]',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 100 },
      },
      'passage-3': {
        id: 'passage-3',
        title: 'End',
        tags: [],
        content: 'The end.',
        position: { x: 400, y: 0 },
        size: { width: 100, height: 100 },
      },
      'passage-4': {
        id: 'passage-4',
        title: 'Orphan',
        tags: [],
        content: 'This passage has no links to it.',
        position: { x: 0, y: 200 },
        size: { width: 100, height: 100 },
      },
    },
    variables: {},
  });
  return story;
}

const mockStory = createMockStory();

// Helper to create a story with custom passages
function createStoryWithPassages(
  passages: Array<{ id: string; title: string; content: string }>,
  startPassage = 'Start'
): Story {
  const passagesRecord: Record<string, any> = {};
  passages.forEach(p => {
    passagesRecord[p.id] = {
      id: p.id,
      title: p.title,
      tags: [],
      content: p.content,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    };
  });
  return new Story({
    metadata: { title: 'Test', author: '', version: '1.0.0', created: '', modified: '' },
    startPassage,
    passages: passagesRecord,
    variables: {},
  });
}

describe('StoryDebugger', () => {
  let dbg: StoryDebugger;

  beforeEach(() => {
    dbg = new StoryDebugger(mockStory);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with story', () => {
      expect(dbg).toBeInstanceOf(StoryDebugger);
    });

    it('should set initial state', () => {
      const state = dbg.getState();

      expect(state.currentPassage).toBe('Start');
      expect(state.visitedPassages).toEqual([]);
      expect(state.variables).toEqual({});
      expect(state.callStack).toEqual([]);
      expect(state.breakpoints).toEqual([]);
    });

    it('should handle story with default passage', () => {
      // Story always creates a default "Start" passage when none provided
      const storyDefault = new Story({
        metadata: { title: 'Default Story', author: '', version: '1.0.0', created: '', modified: '' },
        startPassage: '',
        passages: {},
        variables: {},
      });
      const debuggerDefault = new StoryDebugger(storyDefault);

      // Story creates a default start passage, so currentPassage is set to its ID
      expect(debuggerDefault.getState().currentPassage).not.toBeNull();
    });
  });

  describe('navigateTo', () => {
    it('should navigate to passage', () => {
      const listener = vi.fn();
      dbg.on('navigate', listener);

      dbg.navigateTo('Middle');

      const state = dbg.getState();
      expect(state.currentPassage).toBe('Middle');
      expect(state.visitedPassages).toContain('Middle');
      expect(state.callStack).toContain('Middle');
      expect(listener).toHaveBeenCalledWith({ passage: 'Middle' });
    });

    it('should log error for non-existent passage', () => {
      const logSpy = vi.spyOn(dbg, 'log');

      dbg.navigateTo('NonExistent');

      expect(logSpy).toHaveBeenCalledWith('error', 'Passage not found: NonExistent');
    });

    it('should hit breakpoint when navigating to passage', () => {
      dbg.addBreakpoint('passage-2');

      dbg.navigateTo('Middle');

      expect(dbg.isPaused()).toBe(true);
    });

    it('should not hit disabled breakpoint', () => {
      const breakpoint = dbg.addBreakpoint('passage-2');
      dbg.toggleBreakpoint(breakpoint.id);

      dbg.navigateTo('Middle');

      expect(dbg.isPaused()).toBe(false);
    });

    it('should evaluate breakpoint condition', () => {
      dbg.setVariable('test', 42);
      dbg.addBreakpoint('passage-2', 'test === 42');

      dbg.navigateTo('Middle');

      expect(dbg.isPaused()).toBe(true);
    });

    it('should not hit breakpoint when condition is false', () => {
      dbg.setVariable('test', 10);
      dbg.addBreakpoint('passage-2', 'test === 42');

      dbg.navigateTo('Middle');

      expect(dbg.isPaused()).toBe(false);
    });

    it('should pause in step mode', () => {
      dbg.step();

      dbg.navigateTo('Middle');

      expect(dbg.isPaused()).toBe(true);
    });

    it('should track visited passages', () => {
      dbg.navigateTo('Middle');
      dbg.navigateTo('End');

      const state = dbg.getState();
      expect(state.visitedPassages).toEqual(['Middle', 'End']);
    });

    it('should update call stack', () => {
      dbg.navigateTo('Middle');
      dbg.navigateTo('End');

      const state = dbg.getState();
      expect(state.callStack).toEqual(['Middle', 'End']);
    });
  });

  describe('variables', () => {
    it('should set variable', () => {
      const listener = vi.fn();
      dbg.on('variable', listener);

      dbg.setVariable('health', 100);

      expect(dbg.getVariable('health')).toBe(100);
      expect(listener).toHaveBeenCalledWith({ name: 'health', value: 100 });
    });

    it('should get variable', () => {
      dbg.setVariable('score', 42);

      expect(dbg.getVariable('score')).toBe(42);
    });

    it('should return undefined for non-existent variable', () => {
      expect(dbg.getVariable('nonExistent')).toBeUndefined();
    });

    it('should support complex variable values', () => {
      const complexValue = { nested: { array: [1, 2, 3] } };

      dbg.setVariable('complex', complexValue);

      expect(dbg.getVariable('complex')).toEqual(complexValue);
    });

    it('should log variable changes', () => {
      const logSpy = vi.spyOn(dbg, 'log');

      dbg.setVariable('test', 'value');

      expect(logSpy).toHaveBeenCalledWith(
        'debug',
        'Variable set: test = "value"'
      );
    });
  });

  describe('breakpoints', () => {
    it('should add breakpoint', () => {
      const listener = vi.fn();
      dbg.on('breakpoint-add', listener);

      const breakpoint = dbg.addBreakpoint('passage-2');

      expect(breakpoint).toHaveProperty('id');
      expect(breakpoint.passageId).toBe('passage-2');
      expect(breakpoint.enabled).toBe(true);
      expect(listener).toHaveBeenCalledWith(breakpoint);
    });

    it('should add breakpoint with condition', () => {
      const breakpoint = dbg.addBreakpoint('passage-2', 'x > 10');

      expect(breakpoint.condition).toBe('x > 10');
    });

    it('should remove breakpoint', () => {
      const listener = vi.fn();
      dbg.on('breakpoint-remove', listener);

      const breakpoint = dbg.addBreakpoint('passage-2');
      dbg.removeBreakpoint(breakpoint.id);

      const state = dbg.getState();
      expect(state.breakpoints).not.toContain(breakpoint);
      expect(listener).toHaveBeenCalledWith({ id: breakpoint.id });
    });

    it('should toggle breakpoint', () => {
      const listener = vi.fn();
      dbg.on('breakpoint-toggle', listener);

      const breakpoint = dbg.addBreakpoint('passage-2');
      dbg.toggleBreakpoint(breakpoint.id);

      const state = dbg.getState();
      const updated = state.breakpoints.find(bp => bp.id === breakpoint.id);

      expect(updated?.enabled).toBe(false);
      expect(listener).toHaveBeenCalled();
    });

    it('should toggle breakpoint back on', () => {
      const breakpoint = dbg.addBreakpoint('passage-2');

      dbg.toggleBreakpoint(breakpoint.id);
      dbg.toggleBreakpoint(breakpoint.id);

      const state = dbg.getState();
      const updated = state.breakpoints.find(bp => bp.id === breakpoint.id);

      expect(updated?.enabled).toBe(true);
    });

    it('should handle toggling non-existent breakpoint', () => {
      expect(() => dbg.toggleBreakpoint('non-existent')).not.toThrow();
    });

    it('should generate unique breakpoint IDs', () => {
      const bp1 = dbg.addBreakpoint('passage-1');
      const bp2 = dbg.addBreakpoint('passage-2');

      expect(bp1.id).not.toBe(bp2.id);
    });
  });

  describe('execution control', () => {
    it('should pause execution', () => {
      const listener = vi.fn();
      dbg.on('pause', listener);

      dbg.pause();

      expect(dbg.isPaused()).toBe(true);
      expect(listener).toHaveBeenCalledWith(dbg.getState());
    });

    it('should resume execution', () => {
      const listener = vi.fn();
      dbg.on('resume', listener);

      dbg.pause();
      dbg.resume();

      expect(dbg.isPaused()).toBe(false);
      expect(listener).toHaveBeenCalledWith(dbg.getState());
    });

    it('should step to next passage', () => {
      dbg.step();

      expect(dbg.isPaused()).toBe(false);
      // Step mode is internal state
    });

    it('should resume disables step mode', () => {
      dbg.step();
      dbg.resume();

      // Subsequent navigation should not pause
      dbg.navigateTo('Middle');
      expect(dbg.isPaused()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset debug session', () => {
      const listener = vi.fn();
      dbg.on('reset', listener);

      dbg.navigateTo('Middle');
      dbg.setVariable('test', 42);
      dbg.addBreakpoint('passage-2');

      dbg.reset();

      const state = dbg.getState();
      expect(state.currentPassage).toBe('Start');
      expect(state.visitedPassages).toEqual([]);
      expect(state.variables).toEqual({});
      expect(state.callStack).toEqual([]);
      expect(listener).toHaveBeenCalled();
    });

    it('should preserve breakpoints on reset', () => {
      const breakpoint = dbg.addBreakpoint('passage-2');

      dbg.reset();

      const state = dbg.getState();
      expect(state.breakpoints).toContainEqual(breakpoint);
    });

    it('should clear paused state', () => {
      dbg.pause();
      dbg.reset();

      expect(dbg.isPaused()).toBe(false);
    });

    it('should clear step mode', () => {
      dbg.step();
      dbg.reset();

      // Should not be in step mode after reset
      expect(dbg.isPaused()).toBe(false);
    });

    it('should clear logs on reset', () => {
      dbg.log('info', 'Test message');
      dbg.reset();

      // Logs cleared, but reset itself adds a log
      const logs = dbg.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Debug session reset');
    });
  });

  describe('logging', () => {
    it('should log messages', () => {
      const listener = vi.fn();
      dbg.on('log', listener);

      dbg.log('info', 'Test message');

      const logs = dbg.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1]).toMatchObject({
        level: 'info',
        message: 'Test message',
        timestamp: expect.any(Number),
      });
      expect(listener).toHaveBeenCalled();
    });

    it('should log with data', () => {
      dbg.log('debug', 'Debug info', { foo: 'bar' });

      const logs = dbg.getLogs();
      const lastLog = logs[logs.length - 1];

      expect(lastLog.data).toEqual({ foo: 'bar' });
    });

    it('should add stack trace for errors', () => {
      dbg.log('error', 'Error message');

      const logs = dbg.getLogs();
      const lastLog = logs[logs.length - 1];

      expect(lastLog.stackTrace).toBeDefined();
    });

    it('should log to console', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      dbg.log('info', 'Console message');

      expect(consoleSpy).toHaveBeenCalledWith('Console message', undefined);

      consoleSpy.mockRestore();
    });

    it('should support all log levels', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

      for (const level of levels) {
        dbg.log(level, `${level} message`);
      }

      const logs = dbg.getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(4);
    });

    it('should clear logs', () => {
      const listener = vi.fn();
      dbg.on('logs-clear', listener);

      dbg.log('info', 'Test');
      dbg.clearLogs();

      expect(dbg.getLogs()).toEqual([]);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('should register event listener', () => {
      const listener = vi.fn();

      dbg.on('navigate', listener);
      dbg.navigateTo('Middle');

      expect(listener).toHaveBeenCalled();
    });

    it('should remove event listener', () => {
      const listener = vi.fn();

      dbg.on('navigate', listener);
      dbg.off('navigate', listener);

      dbg.navigateTo('Middle');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      dbg.on('navigate', listener1);
      dbg.on('navigate', listener2);

      dbg.navigateTo('Middle');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should handle removing non-existent listener', () => {
      const listener = vi.fn();

      expect(() => dbg.off('navigate', listener)).not.toThrow();
    });

    it('should emit all event types', () => {
      const listeners = {
        navigate: vi.fn(),
        variable: vi.fn(),
        'breakpoint-add': vi.fn(),
        'breakpoint-remove': vi.fn(),
        'breakpoint-toggle': vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        reset: vi.fn(),
        log: vi.fn(),
        'logs-clear': vi.fn(),
      };

      Object.entries(listeners).forEach(([event, listener]) => {
        dbg.on(event, listener);
      });

      dbg.navigateTo('Middle');
      dbg.setVariable('test', 1);
      const bp = dbg.addBreakpoint('passage-1');
      dbg.toggleBreakpoint(bp.id);
      dbg.removeBreakpoint(bp.id);
      dbg.pause();
      dbg.resume();
      dbg.clearLogs();
      dbg.reset();

      Object.values(listeners).forEach(listener => {
        expect(listener).toHaveBeenCalled();
      });
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      dbg.navigateTo('Middle');
      dbg.setVariable('health', 100);

      const state = dbg.getState();

      expect(state.currentPassage).toBe('Middle');
      expect(state.variables).toEqual({ health: 100 });
    });

    it('should return copy of state', () => {
      const state1 = dbg.getState();
      state1.variables.test = 'modified';

      const state2 = dbg.getState();

      expect(state2.variables.test).toBeUndefined();
    });
  });

  describe('createDebugger', () => {
    it('should create debugger instance', () => {
      const instance = createDebugger(mockStory);

      expect(instance).toBeInstanceOf(StoryDebugger);
    });
  });
});

describe('inspectStory', () => {
  it('should count passages', () => {
    const inspection = inspectStory(mockStory);

    expect(inspection.passages).toBe(4);
  });

  it('should count links', () => {
    const inspection = inspectStory(mockStory);

    expect(inspection.links).toBe(3);
  });

  it('should find orphan passages', () => {
    const inspection = inspectStory(mockStory);

    expect(inspection.orphans).toContain('Orphan');
  });

  it('should not consider start passage as orphan', () => {
    const inspection = inspectStory(mockStory);

    expect(inspection.orphans).not.toContain('Start');
  });

  it('should find dead ends', () => {
    const inspection = inspectStory(mockStory);

    expect(inspection.deadEnds).toContain('End');
    expect(inspection.deadEnds).toContain('Orphan');
  });

  it('should find unreachable passages', () => {
    const inspection = inspectStory(mockStory);

    expect(inspection.unreachable).toContain('Orphan');
  });

  it('should find cycles', () => {
    const storyWithCycle = createStoryWithPassages([
      { id: 'p1', title: 'A', content: '[[B]]' },
      { id: 'p2', title: 'B', content: '[[C]]' },
      { id: 'p3', title: 'C', content: '[[A]]' },
    ], 'A');

    const inspection = inspectStory(storyWithCycle);

    expect(inspection.cycles.length).toBeGreaterThan(0);
  });

  it('should handle minimal story', () => {
    // Story always creates a default "Start" passage if none provided
    const minimalStory = createStoryWithPassages([], '');

    const inspection = inspectStory(minimalStory);

    // Story creates a default "Start" passage
    expect(inspection.passages).toBe(1);
    expect(inspection.links).toBe(0);
    expect(inspection.orphans).toEqual([]);
    // Start passage is a dead end (no outgoing links)
    expect(inspection.deadEnds).toContain('Start');
    expect(inspection.unreachable).toEqual([]);
  });

  it('should handle links with display text', () => {
    const story = createStoryWithPassages([
      { id: 'p1', title: 'Start', content: '[[Click here|Next]]' },
      { id: 'p2', title: 'Next', content: 'Next passage' },
    ]);

    const inspection = inspectStory(story);

    expect(inspection.links).toBe(1);
  });
});

describe('traceExecution', () => {
  it('should trace execution path', () => {
    const result = traceExecution(mockStory, 'Start', ['Middle', 'End']);

    expect(result.path).toEqual(['Start', 'Middle', 'End']);
    expect(result.errors).toEqual([]);
  });

  it('should detect invalid passage', () => {
    const result = traceExecution(mockStory, 'NonExistent', []);

    expect(result.errors).toContain('Passage not found: NonExistent');
  });

  it('should detect invalid choice', () => {
    const result = traceExecution(mockStory, 'Start', ['InvalidChoice']);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Invalid choice');
  });

  it('should stop on first error', () => {
    const result = traceExecution(mockStory, 'Start', ['InvalidChoice', 'Middle']);

    expect(result.path).toEqual(['Start']);
  });

  it('should handle empty choices', () => {
    const result = traceExecution(mockStory, 'Start', []);

    expect(result.path).toEqual(['Start']);
    expect(result.errors).toEqual([]);
  });

  it('should return variables object', () => {
    const result = traceExecution(mockStory, 'Start', []);

    expect(result.variables).toBeDefined();
    expect(typeof result.variables).toBe('object');
  });
});

describe('formatDebugOutput', () => {
  it('should format debug state', () => {
    const state: DebugState = {
      currentPassage: 'Middle',
      visitedPassages: ['Start', 'Middle'],
      variables: { health: 100, score: 42 },
      callStack: ['Start', 'Middle'],
      breakpoints: [],
    };

    const output = formatDebugOutput(state);

    expect(output).toContain('Debug State');
    expect(output).toContain('Current Passage: Middle');
    expect(output).toContain('Visited: 2 passages');
  });

  it('should format variables', () => {
    const state: DebugState = {
      currentPassage: 'Start',
      visitedPassages: [],
      variables: { health: 100, name: 'Player' },
      callStack: [],
      breakpoints: [],
    };

    const output = formatDebugOutput(state);

    expect(output).toContain('Variables');
    expect(output).toContain('health: 100');
    expect(output).toContain('name: "Player"');
  });

  it('should format call stack', () => {
    const state: DebugState = {
      currentPassage: 'End',
      visitedPassages: [],
      variables: {},
      callStack: ['Start', 'Middle', 'End'],
      breakpoints: [],
    };

    const output = formatDebugOutput(state);

    expect(output).toContain('Call Stack');
    expect(output).toContain('End');
    expect(output).toContain('Middle');
    expect(output).toContain('Start');
  });

  it('should format breakpoints', () => {
    const state: DebugState = {
      currentPassage: 'Start',
      visitedPassages: [],
      variables: {},
      callStack: [],
      breakpoints: [
        {
          id: 'bp1',
          passageId: 'passage-1',
          enabled: true,
        },
        {
          id: 'bp2',
          passageId: 'passage-2',
          condition: 'x > 10',
          enabled: false,
        },
      ],
    };

    const output = formatDebugOutput(state);

    expect(output).toContain('Breakpoints');
    expect(output).toContain('passage-1');
    expect(output).toContain('passage-2');
    expect(output).toContain('x > 10');
  });

  it('should handle null current passage', () => {
    const state: DebugState = {
      currentPassage: null,
      visitedPassages: [],
      variables: {},
      callStack: [],
      breakpoints: [],
    };

    const output = formatDebugOutput(state);

    expect(output).toContain('Current Passage: None');
  });

  it('should handle empty state', () => {
    const state: DebugState = {
      currentPassage: null,
      visitedPassages: [],
      variables: {},
      callStack: [],
      breakpoints: [],
    };

    const output = formatDebugOutput(state);

    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
  });
});

describe('Edge Cases', () => {
  it('should handle complex breakpoint conditions', () => {
    const storyDbg = new StoryDebugger(mockStory);

    storyDbg.setVariable('score', 50);
    storyDbg.addBreakpoint('passage-2', 'score === 50');

    storyDbg.navigateTo('Middle');

    expect(storyDbg.isPaused()).toBe(true);
  });

  it('should handle invalid breakpoint conditions', () => {
    const storyDbg = new StoryDebugger(mockStory);

    storyDbg.addBreakpoint('passage-2', 'invalid condition syntax');

    storyDbg.navigateTo('Middle');

    // Should not crash, condition evaluates to false
    expect(storyDbg.isPaused()).toBe(false);
  });

  it('should handle rapid navigation', () => {
    const storyDbg = new StoryDebugger(mockStory);

    for (let i = 0; i < 100; i++) {
      storyDbg.navigateTo('Middle');
      storyDbg.navigateTo('End');
    }

    const state = storyDbg.getState();
    expect(state.visitedPassages.length).toBe(200);
  });

  it('should handle many breakpoints', () => {
    const storyDbg = new StoryDebugger(mockStory);

    for (let i = 0; i < 100; i++) {
      storyDbg.addBreakpoint('passage-1');
    }

    const state = storyDbg.getState();
    expect(state.breakpoints.length).toBe(100);
  });

  it('should handle large variable values', () => {
    const storyDbg = new StoryDebugger(mockStory);

    const largeArray = new Array(10000).fill(0);
    storyDbg.setVariable('large', largeArray);

    expect(storyDbg.getVariable('large')).toBe(largeArray);
  });

  it('should handle story with complex link patterns', () => {
    const story = createStoryWithPassages([
      {
        id: 'p1',
        title: 'Test',
        content: '[[Link 1|Target]] text [[Link 2|Target]] more [[Link 3|Other]]',
      },
    ], 'Test');

    const inspection = inspectStory(story);

    expect(inspection.links).toBe(3);
  });

  it('should handle self-referencing passages', () => {
    const story = createStoryWithPassages([
      {
        id: 'p1',
        title: 'Self',
        content: '[[Self]]',
      },
    ], 'Self');

    const inspection = inspectStory(story);

    expect(inspection.cycles.length).toBeGreaterThan(0);
  });
});
