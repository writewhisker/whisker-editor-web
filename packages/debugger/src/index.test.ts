/**
 * Tests for Story Debugger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Story, Passage } from '@writewhisker/story-models';
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

const mockStory: Story = {
  id: 'test-story',
  name: 'Test Story',
  ifid: 'test-ifid',
  startPassage: 'Start',
  tagColors: {},
  zoom: 1,
  passages: [
    {
      id: 'passage-1',
      title: 'Start',
      tags: [],
      content: 'Start of the story.\n\n[[Go to Middle|Middle]]\n[[Go to End|End]]',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    },
    {
      id: 'passage-2',
      title: 'Middle',
      tags: [],
      content: 'Middle of the story.\n\n[[Continue|End]]',
      position: { x: 200, y: 0 },
      size: { width: 100, height: 100 },
    },
    {
      id: 'passage-3',
      title: 'End',
      tags: [],
      content: 'The end.',
      position: { x: 400, y: 0 },
      size: { width: 100, height: 100 },
    },
    {
      id: 'passage-4',
      title: 'Orphan',
      tags: [],
      content: 'This passage has no links to it.',
      position: { x: 0, y: 200 },
      size: { width: 100, height: 100 },
    },
  ],
};

describe('StoryDebugger', () => {
  let debugger: StoryDebugger;

  beforeEach(() => {
    debugger = new StoryDebugger(mockStory);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with story', () => {
      expect(debugger).toBeInstanceOf(StoryDebugger);
    });

    it('should set initial state', () => {
      const state = debugger.getState();

      expect(state.currentPassage).toBe('Start');
      expect(state.visitedPassages).toEqual([]);
      expect(state.variables).toEqual({});
      expect(state.callStack).toEqual([]);
      expect(state.breakpoints).toEqual([]);
    });

    it('should handle story without start passage', () => {
      const storyNoStart = { ...mockStory, startPassage: '' };
      const debuggerNoStart = new StoryDebugger(storyNoStart);

      expect(debuggerNoStart.getState().currentPassage).toBeNull();
    });
  });

  describe('navigateTo', () => {
    it('should navigate to passage', () => {
      const listener = vi.fn();
      debugger.on('navigate', listener);

      debugger.navigateTo('Middle');

      const state = debugger.getState();
      expect(state.currentPassage).toBe('Middle');
      expect(state.visitedPassages).toContain('Middle');
      expect(state.callStack).toContain('Middle');
      expect(listener).toHaveBeenCalledWith({ passage: 'Middle' });
    });

    it('should log error for non-existent passage', () => {
      const logSpy = vi.spyOn(debugger, 'log');

      debugger.navigateTo('NonExistent');

      expect(logSpy).toHaveBeenCalledWith('error', 'Passage not found: NonExistent');
    });

    it('should hit breakpoint when navigating to passage', () => {
      debugger.addBreakpoint('passage-2');

      debugger.navigateTo('Middle');

      expect(debugger.isPaused()).toBe(true);
    });

    it('should not hit disabled breakpoint', () => {
      const breakpoint = debugger.addBreakpoint('passage-2');
      debugger.toggleBreakpoint(breakpoint.id);

      debugger.navigateTo('Middle');

      expect(debugger.isPaused()).toBe(false);
    });

    it('should evaluate breakpoint condition', () => {
      debugger.setVariable('test', 42);
      debugger.addBreakpoint('passage-2', 'test === 42');

      debugger.navigateTo('Middle');

      expect(debugger.isPaused()).toBe(true);
    });

    it('should not hit breakpoint when condition is false', () => {
      debugger.setVariable('test', 10);
      debugger.addBreakpoint('passage-2', 'test === 42');

      debugger.navigateTo('Middle');

      expect(debugger.isPaused()).toBe(false);
    });

    it('should pause in step mode', () => {
      debugger.step();

      debugger.navigateTo('Middle');

      expect(debugger.isPaused()).toBe(true);
    });

    it('should track visited passages', () => {
      debugger.navigateTo('Middle');
      debugger.navigateTo('End');

      const state = debugger.getState();
      expect(state.visitedPassages).toEqual(['Middle', 'End']);
    });

    it('should update call stack', () => {
      debugger.navigateTo('Middle');
      debugger.navigateTo('End');

      const state = debugger.getState();
      expect(state.callStack).toEqual(['Middle', 'End']);
    });
  });

  describe('variables', () => {
    it('should set variable', () => {
      const listener = vi.fn();
      debugger.on('variable', listener);

      debugger.setVariable('health', 100);

      expect(debugger.getVariable('health')).toBe(100);
      expect(listener).toHaveBeenCalledWith({ name: 'health', value: 100 });
    });

    it('should get variable', () => {
      debugger.setVariable('score', 42);

      expect(debugger.getVariable('score')).toBe(42);
    });

    it('should return undefined for non-existent variable', () => {
      expect(debugger.getVariable('nonExistent')).toBeUndefined();
    });

    it('should support complex variable values', () => {
      const complexValue = { nested: { array: [1, 2, 3] } };

      debugger.setVariable('complex', complexValue);

      expect(debugger.getVariable('complex')).toEqual(complexValue);
    });

    it('should log variable changes', () => {
      const logSpy = vi.spyOn(debugger, 'log');

      debugger.setVariable('test', 'value');

      expect(logSpy).toHaveBeenCalledWith(
        'debug',
        'Variable set: test = "value"'
      );
    });
  });

  describe('breakpoints', () => {
    it('should add breakpoint', () => {
      const listener = vi.fn();
      debugger.on('breakpoint-add', listener);

      const breakpoint = debugger.addBreakpoint('passage-2');

      expect(breakpoint).toHaveProperty('id');
      expect(breakpoint.passageId).toBe('passage-2');
      expect(breakpoint.enabled).toBe(true);
      expect(listener).toHaveBeenCalledWith(breakpoint);
    });

    it('should add breakpoint with condition', () => {
      const breakpoint = debugger.addBreakpoint('passage-2', 'x > 10');

      expect(breakpoint.condition).toBe('x > 10');
    });

    it('should remove breakpoint', () => {
      const listener = vi.fn();
      debugger.on('breakpoint-remove', listener);

      const breakpoint = debugger.addBreakpoint('passage-2');
      debugger.removeBreakpoint(breakpoint.id);

      const state = debugger.getState();
      expect(state.breakpoints).not.toContain(breakpoint);
      expect(listener).toHaveBeenCalledWith({ id: breakpoint.id });
    });

    it('should toggle breakpoint', () => {
      const listener = vi.fn();
      debugger.on('breakpoint-toggle', listener);

      const breakpoint = debugger.addBreakpoint('passage-2');
      debugger.toggleBreakpoint(breakpoint.id);

      const state = debugger.getState();
      const updated = state.breakpoints.find(bp => bp.id === breakpoint.id);

      expect(updated?.enabled).toBe(false);
      expect(listener).toHaveBeenCalled();
    });

    it('should toggle breakpoint back on', () => {
      const breakpoint = debugger.addBreakpoint('passage-2');

      debugger.toggleBreakpoint(breakpoint.id);
      debugger.toggleBreakpoint(breakpoint.id);

      const state = debugger.getState();
      const updated = state.breakpoints.find(bp => bp.id === breakpoint.id);

      expect(updated?.enabled).toBe(true);
    });

    it('should handle toggling non-existent breakpoint', () => {
      expect(() => debugger.toggleBreakpoint('non-existent')).not.toThrow();
    });

    it('should generate unique breakpoint IDs', () => {
      const bp1 = debugger.addBreakpoint('passage-1');
      const bp2 = debugger.addBreakpoint('passage-2');

      expect(bp1.id).not.toBe(bp2.id);
    });
  });

  describe('execution control', () => {
    it('should pause execution', () => {
      const listener = vi.fn();
      debugger.on('pause', listener);

      debugger.pause();

      expect(debugger.isPaused()).toBe(true);
      expect(listener).toHaveBeenCalledWith(debugger.getState());
    });

    it('should resume execution', () => {
      const listener = vi.fn();
      debugger.on('resume', listener);

      debugger.pause();
      debugger.resume();

      expect(debugger.isPaused()).toBe(false);
      expect(listener).toHaveBeenCalledWith(debugger.getState());
    });

    it('should step to next passage', () => {
      debugger.step();

      expect(debugger.isPaused()).toBe(false);
      // Step mode is internal state
    });

    it('should resume disables step mode', () => {
      debugger.step();
      debugger.resume();

      // Subsequent navigation should not pause
      debugger.navigateTo('Middle');
      expect(debugger.isPaused()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset debug session', () => {
      const listener = vi.fn();
      debugger.on('reset', listener);

      debugger.navigateTo('Middle');
      debugger.setVariable('test', 42);
      debugger.addBreakpoint('passage-2');

      debugger.reset();

      const state = debugger.getState();
      expect(state.currentPassage).toBe('Start');
      expect(state.visitedPassages).toEqual([]);
      expect(state.variables).toEqual({});
      expect(state.callStack).toEqual([]);
      expect(listener).toHaveBeenCalled();
    });

    it('should preserve breakpoints on reset', () => {
      const breakpoint = debugger.addBreakpoint('passage-2');

      debugger.reset();

      const state = debugger.getState();
      expect(state.breakpoints).toContainEqual(breakpoint);
    });

    it('should clear paused state', () => {
      debugger.pause();
      debugger.reset();

      expect(debugger.isPaused()).toBe(false);
    });

    it('should clear step mode', () => {
      debugger.step();
      debugger.reset();

      // Should not be in step mode after reset
      expect(debugger.isPaused()).toBe(false);
    });

    it('should clear logs on reset', () => {
      debugger.log('info', 'Test message');
      debugger.reset();

      // Logs cleared, but reset itself adds a log
      const logs = debugger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Debug session reset');
    });
  });

  describe('logging', () => {
    it('should log messages', () => {
      const listener = vi.fn();
      debugger.on('log', listener);

      debugger.log('info', 'Test message');

      const logs = debugger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1]).toMatchObject({
        level: 'info',
        message: 'Test message',
        timestamp: expect.any(Number),
      });
      expect(listener).toHaveBeenCalled();
    });

    it('should log with data', () => {
      debugger.log('debug', 'Debug info', { foo: 'bar' });

      const logs = debugger.getLogs();
      const lastLog = logs[logs.length - 1];

      expect(lastLog.data).toEqual({ foo: 'bar' });
    });

    it('should add stack trace for errors', () => {
      debugger.log('error', 'Error message');

      const logs = debugger.getLogs();
      const lastLog = logs[logs.length - 1];

      expect(lastLog.stackTrace).toBeDefined();
    });

    it('should log to console', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      debugger.log('info', 'Console message');

      expect(consoleSpy).toHaveBeenCalledWith('Console message', undefined);

      consoleSpy.mockRestore();
    });

    it('should support all log levels', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

      for (const level of levels) {
        debugger.log(level, `${level} message`);
      }

      const logs = debugger.getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(4);
    });

    it('should clear logs', () => {
      const listener = vi.fn();
      debugger.on('logs-clear', listener);

      debugger.log('info', 'Test');
      debugger.clearLogs();

      expect(debugger.getLogs()).toEqual([]);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('should register event listener', () => {
      const listener = vi.fn();

      debugger.on('navigate', listener);
      debugger.navigateTo('Middle');

      expect(listener).toHaveBeenCalled();
    });

    it('should remove event listener', () => {
      const listener = vi.fn();

      debugger.on('navigate', listener);
      debugger.off('navigate', listener);

      debugger.navigateTo('Middle');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      debugger.on('navigate', listener1);
      debugger.on('navigate', listener2);

      debugger.navigateTo('Middle');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should handle removing non-existent listener', () => {
      const listener = vi.fn();

      expect(() => debugger.off('navigate', listener)).not.toThrow();
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
        debugger.on(event, listener);
      });

      debugger.navigateTo('Middle');
      debugger.setVariable('test', 1);
      const bp = debugger.addBreakpoint('passage-1');
      debugger.toggleBreakpoint(bp.id);
      debugger.removeBreakpoint(bp.id);
      debugger.pause();
      debugger.resume();
      debugger.clearLogs();
      debugger.reset();

      Object.values(listeners).forEach(listener => {
        expect(listener).toHaveBeenCalled();
      });
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      debugger.navigateTo('Middle');
      debugger.setVariable('health', 100);

      const state = debugger.getState();

      expect(state.currentPassage).toBe('Middle');
      expect(state.variables).toEqual({ health: 100 });
    });

    it('should return copy of state', () => {
      const state1 = debugger.getState();
      state1.variables.test = 'modified';

      const state2 = debugger.getState();

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
    const storyWithCycle: Story = {
      ...mockStory,
      passages: [
        {
          id: 'p1',
          title: 'A',
          tags: [],
          content: '[[B]]',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        },
        {
          id: 'p2',
          title: 'B',
          tags: [],
          content: '[[C]]',
          position: { x: 200, y: 0 },
          size: { width: 100, height: 100 },
        },
        {
          id: 'p3',
          title: 'C',
          tags: [],
          content: '[[A]]',
          position: { x: 400, y: 0 },
          size: { width: 100, height: 100 },
        },
      ],
    };

    const inspection = inspectStory(storyWithCycle);

    expect(inspection.cycles.length).toBeGreaterThan(0);
  });

  it('should handle empty story', () => {
    const emptyStory: Story = {
      ...mockStory,
      passages: [],
      startPassage: '',
    };

    const inspection = inspectStory(emptyStory);

    expect(inspection.passages).toBe(0);
    expect(inspection.links).toBe(0);
    expect(inspection.orphans).toEqual([]);
    expect(inspection.deadEnds).toEqual([]);
    expect(inspection.unreachable).toEqual([]);
  });

  it('should handle links with display text', () => {
    const story: Story = {
      ...mockStory,
      passages: [
        {
          id: 'p1',
          title: 'Start',
          tags: [],
          content: '[[Click here|Next]]',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        },
        {
          id: 'p2',
          title: 'Next',
          tags: [],
          content: 'Next passage',
          position: { x: 200, y: 0 },
          size: { width: 100, height: 100 },
        },
      ],
    };

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
    const debugger = new StoryDebugger(mockStory);

    debugger.setVariable('score', 50);
    debugger.addBreakpoint('passage-2', 'score === 50');

    debugger.navigateTo('Middle');

    expect(debugger.isPaused()).toBe(true);
  });

  it('should handle invalid breakpoint conditions', () => {
    const debugger = new StoryDebugger(mockStory);

    debugger.addBreakpoint('passage-2', 'invalid condition syntax');

    debugger.navigateTo('Middle');

    // Should not crash, condition evaluates to false
    expect(debugger.isPaused()).toBe(false);
  });

  it('should handle rapid navigation', () => {
    const debugger = new StoryDebugger(mockStory);

    for (let i = 0; i < 100; i++) {
      debugger.navigateTo('Middle');
      debugger.navigateTo('End');
    }

    const state = debugger.getState();
    expect(state.visitedPassages.length).toBe(200);
  });

  it('should handle many breakpoints', () => {
    const debugger = new StoryDebugger(mockStory);

    for (let i = 0; i < 100; i++) {
      debugger.addBreakpoint('passage-1');
    }

    const state = debugger.getState();
    expect(state.breakpoints.length).toBe(100);
  });

  it('should handle large variable values', () => {
    const debugger = new StoryDebugger(mockStory);

    const largeArray = new Array(10000).fill(0);
    debugger.setVariable('large', largeArray);

    expect(debugger.getVariable('large')).toBe(largeArray);
  });

  it('should handle story with complex link patterns', () => {
    const story: Story = {
      ...mockStory,
      passages: [
        {
          id: 'p1',
          title: 'Test',
          tags: [],
          content: '[[Link 1|Target]] text [[Link 2|Target]] more [[Link 3|Other]]',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        },
      ],
    };

    const inspection = inspectStory(story);

    expect(inspection.links).toBe(3);
  });

  it('should handle self-referencing passages', () => {
    const story: Story = {
      ...mockStory,
      passages: [
        {
          id: 'p1',
          title: 'Self',
          tags: [],
          content: '[[Self]]',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        },
      ],
    };

    const inspection = inspectStory(story);

    expect(inspection.cycles.length).toBeGreaterThan(0);
  });
});
