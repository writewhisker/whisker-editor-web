import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TimedContentManager,
  createTimedContentManager,
  parseTimeString,
  TimedBlock,
} from './TimedContentManager';
import type { ContentNode, TextNode } from '@writewhisker/parser';

// Helper to create a simple text node for testing
function createTextNode(text: string): TextNode {
  return {
    type: 'text',
    value: text,
    location: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: text.length + 1, offset: text.length },
    },
  };
}

describe('TimedContentManager', () => {
  let manager: TimedContentManager;

  beforeEach(() => {
    manager = new TimedContentManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('schedule', () => {
    it('should schedule content with delay', () => {
      const content = [createTextNode('Hello')];
      const id = manager.schedule(1000, content);

      expect(id).toMatch(/^timer_\d+$/);
      expect(manager.isActive(id)).toBe(true);
    });

    it('should return empty array before delay elapses', () => {
      manager.schedule(1000, [createTextNode('Hello')]);

      vi.advanceTimersByTime(500);
      const result = manager.tick();

      expect(result).toHaveLength(0);
    });

    it('should return content after delay elapses', () => {
      manager.schedule(1000, [createTextNode('Hello')]);

      vi.advanceTimersByTime(1000);
      const result = manager.tick();

      expect(result).toHaveLength(1);
      expect((result[0] as TextNode).value).toBe('Hello');
    });

    it('should remove one-shot timer after firing', () => {
      const id = manager.schedule(1000, [createTextNode('Hello')]);

      vi.advanceTimersByTime(1000);
      manager.tick();

      expect(manager.isActive(id)).toBe(false);
    });

    it('should accept custom timer ID', () => {
      const id = manager.schedule(1000, [createTextNode('Hello')], {
        id: 'custom_timer',
      });

      expect(id).toBe('custom_timer');
    });
  });

  describe('every (repeating timer)', () => {
    it('should create repeating timer', () => {
      const id = manager.every(1000, [createTextNode('Tick')]);

      expect(manager.isActive(id)).toBe(true);
    });

    it('should fire multiple times', () => {
      manager.every(1000, [createTextNode('Tick')]);

      vi.advanceTimersByTime(1000);
      expect(manager.tick()).toHaveLength(1);

      vi.advanceTimersByTime(1000);
      expect(manager.tick()).toHaveLength(1);

      vi.advanceTimersByTime(1000);
      expect(manager.tick()).toHaveLength(1);
    });

    it('should respect maxFires limit', () => {
      const id = manager.every(1000, [createTextNode('Tick')], 2);

      vi.advanceTimersByTime(1000);
      manager.tick();
      expect(manager.isActive(id)).toBe(true);

      vi.advanceTimersByTime(1000);
      manager.tick();
      expect(manager.isActive(id)).toBe(false);
    });
  });

  describe('pause/resume', () => {
    it('should pause timer processing', () => {
      manager.schedule(1000, [createTextNode('Hello')]);
      manager.pause();

      vi.advanceTimersByTime(2000);
      const result = manager.tick();

      expect(result).toHaveLength(0);
      expect(manager.isPaused()).toBe(true);
    });

    it('should resume timer processing', () => {
      manager.schedule(1000, [createTextNode('Hello')]);

      vi.advanceTimersByTime(500);
      manager.pause();
      vi.advanceTimersByTime(1000);
      manager.resume();
      vi.advanceTimersByTime(500);

      const result = manager.tick();
      expect(result).toHaveLength(1);
    });

    it('should adjust start times on resume', () => {
      const id = manager.schedule(1000, [createTextNode('Hello')]);

      manager.pause();
      vi.advanceTimersByTime(500);
      manager.resume();

      // Timer should still need ~1000ms from resume, not have 500ms elapsed
      expect(manager.getRemaining(id)).toBeGreaterThan(900);
    });
  });

  describe('cancel', () => {
    it('should cancel specific timer', () => {
      const id = manager.schedule(1000, [createTextNode('Hello')]);
      const canceled = manager.cancel(id);

      expect(canceled).toBe(true);
      expect(manager.isActive(id)).toBe(false);
    });

    it('should return false for unknown timer', () => {
      expect(manager.cancel('unknown')).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('should cancel all timers', () => {
      const id1 = manager.schedule(1000, [createTextNode('Hello')]);
      const id2 = manager.every(500, [createTextNode('Tick')]);

      manager.cancelAll();

      expect(manager.isActive(id1)).toBe(false);
      expect(manager.isActive(id2)).toBe(false);
      expect(manager.getActiveCount()).toBe(0);
    });
  });

  describe('getRemaining', () => {
    it('should return remaining time', () => {
      const id = manager.schedule(1000, [createTextNode('Hello')]);

      vi.advanceTimersByTime(300);

      expect(manager.getRemaining(id)).toBeCloseTo(700, -2);
    });

    it('should return -1 for unknown timer', () => {
      expect(manager.getRemaining('unknown')).toBe(-1);
    });
  });

  describe('getActiveTimers', () => {
    it('should return all active timer IDs', () => {
      const id1 = manager.schedule(1000, [createTextNode('A')]);
      const id2 = manager.schedule(2000, [createTextNode('B')]);

      const active = manager.getActiveTimers();

      expect(active).toContain(id1);
      expect(active).toContain(id2);
      expect(active).toHaveLength(2);
    });
  });

  describe('event listeners', () => {
    it('should emit timerCreated event', () => {
      const listener = vi.fn();
      manager.on(listener);

      manager.schedule(1000, [createTextNode('Hello')]);

      expect(listener).toHaveBeenCalledWith('timerCreated', expect.any(Object));
    });

    it('should emit timerFired event', () => {
      const listener = vi.fn();
      manager.on(listener);

      manager.schedule(1000, [createTextNode('Hello')]);

      vi.advanceTimersByTime(1000);
      manager.tick();

      expect(listener).toHaveBeenCalledWith('timerFired', expect.any(Object));
    });

    it('should emit timerCanceled event', () => {
      const listener = vi.fn();
      manager.on(listener);

      const id = manager.schedule(1000, [createTextNode('Hello')]);
      listener.mockClear();

      manager.cancel(id);

      expect(listener).toHaveBeenCalledWith('timerCanceled', expect.any(Object));
    });

    it('should emit timerPaused event', () => {
      const listener = vi.fn();
      manager.on(listener);

      manager.schedule(1000, [createTextNode('Hello')]);
      listener.mockClear();

      manager.pause();

      expect(listener).toHaveBeenCalledWith('timerPaused', expect.any(Object));
    });

    it('should emit timerResumed event', () => {
      const listener = vi.fn();
      manager.on(listener);

      manager.schedule(1000, [createTextNode('Hello')]);
      manager.pause();
      listener.mockClear();

      manager.resume();

      expect(listener).toHaveBeenCalledWith('timerResumed', expect.any(Object));
    });

    it('should allow removing listeners', () => {
      const listener = vi.fn();
      manager.on(listener);
      manager.off(listener);

      manager.schedule(1000, [createTextNode('Hello')]);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('onFire callback', () => {
    it('should call onFire when timer fires', () => {
      const onFire = vi.fn();
      manager.schedule(1000, [createTextNode('Hello')], { onFire });

      vi.advanceTimersByTime(1000);
      manager.tick();

      expect(onFire).toHaveBeenCalledWith(expect.objectContaining({
        fireCount: 1,
      }));
    });
  });

  describe('reset', () => {
    it('should reset manager to initial state', () => {
      manager.schedule(1000, [createTextNode('Hello')]);
      manager.pause();

      manager.reset();

      expect(manager.getActiveCount()).toBe(0);
      expect(manager.isPaused()).toBe(false);
    });
  });
});

describe('parseTimeString', () => {
  it('should parse milliseconds', () => {
    expect(parseTimeString('500ms')).toBe(500);
    expect(parseTimeString('500')).toBe(500);
  });

  it('should parse seconds', () => {
    expect(parseTimeString('2s')).toBe(2000);
    expect(parseTimeString('1.5s')).toBe(1500);
  });

  it('should parse minutes', () => {
    expect(parseTimeString('1m')).toBe(60000);
  });

  it('should parse hours', () => {
    expect(parseTimeString('1h')).toBe(3600000);
  });

  it('should handle case-insensitive units', () => {
    expect(parseTimeString('2S')).toBe(2000);
    expect(parseTimeString('500MS')).toBe(500);
  });

  it('should throw for invalid format', () => {
    expect(() => parseTimeString('invalid')).toThrow(/Invalid time format/);
  });
});

describe('createTimedContentManager', () => {
  it('should create a new manager instance', () => {
    const manager = createTimedContentManager();
    expect(manager).toBeInstanceOf(TimedContentManager);
  });
});
