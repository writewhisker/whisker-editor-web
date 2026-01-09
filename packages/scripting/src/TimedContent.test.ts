/**
 * TimedContent Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TimedContent,
  createTimedContent,
  parseTimeString,
} from './TimedContent';

describe('parseTimeString', () => {
  it('parses numeric values as milliseconds', () => {
    expect(parseTimeString(500)).toBe(500);
    expect(parseTimeString('500')).toBe(500);
  });

  it('parses milliseconds suffix', () => {
    expect(parseTimeString('500ms')).toBe(500);
    expect(parseTimeString('1000ms')).toBe(1000);
  });

  it('parses seconds suffix', () => {
    expect(parseTimeString('2s')).toBe(2000);
    expect(parseTimeString('0.5s')).toBe(500);
  });

  it('parses minutes suffix', () => {
    expect(parseTimeString('1m')).toBe(60000);
    expect(parseTimeString('2m')).toBe(120000);
  });

  it('parses hours suffix', () => {
    expect(parseTimeString('1h')).toBe(3600000);
  });

  it('handles whitespace', () => {
    expect(parseTimeString('  500ms  ')).toBe(500);
  });

  it('is case insensitive', () => {
    expect(parseTimeString('500MS')).toBe(500);
    expect(parseTimeString('2S')).toBe(2000);
  });

  it('throws on invalid format', () => {
    expect(() => parseTimeString('invalid')).toThrow('Invalid time string');
    expect(() => parseTimeString('abc123')).toThrow('Invalid time string');
  });
});

describe('TimedContent', () => {
  let timedContent: TimedContent;

  beforeEach(() => {
    timedContent = createTimedContent();
  });

  describe('schedule (one-shot timer)', () => {
    it('creates a one-shot timer', () => {
      const id = timedContent.schedule('500ms', 'hello');

      expect(id).toMatch(/^timer_\d+$/);

      const timer = timedContent.getTimer(id!);
      expect(timer).toBeDefined();
      expect(timer!.type).toBe('oneshot');
      expect(timer!.delay).toBe(500);
      expect(timer!.content).toBe('hello');
      expect(timer!.state).toBe('pending');
    });

    it('accepts numeric delay', () => {
      const id = timedContent.schedule(1000, 'test');
      const timer = timedContent.getTimer(id!);

      expect(timer!.delay).toBe(1000);
    });

    it('returns null when max timers reached', () => {
      const limited = createTimedContent({ maxTimers: 2 });
      limited.schedule('100ms', 'a');
      limited.schedule('100ms', 'b');
      const third = limited.schedule('100ms', 'c');

      expect(third).toBeNull();
    });
  });

  describe('every (repeating timer)', () => {
    it('creates a repeating timer', () => {
      const id = timedContent.every('1s', 'tick');

      const timer = timedContent.getTimer(id!);
      expect(timer!.type).toBe('repeating');
      expect(timer!.delay).toBe(1000);
    });

    it('accepts maxFires limit', () => {
      const id = timedContent.every('100ms', 'tick', 5);

      const timer = timedContent.getTimer(id!);
      expect(timer!.maxFires).toBe(5);
    });
  });

  describe('update', () => {
    it('fires one-shot timer after delay', () => {
      timedContent.schedule('500ms', 'hello');

      let fired = timedContent.update(400);
      expect(fired).toHaveLength(0);

      fired = timedContent.update(100);
      expect(fired).toHaveLength(1);
      expect(fired[0].content).toBe('hello');
      expect(fired[0].fireCount).toBe(1);
    });

    it('marks one-shot timer as completed after firing', () => {
      const id = timedContent.schedule('100ms', 'test');

      timedContent.update(100);

      const timer = timedContent.getTimer(id!);
      expect(timer!.state).toBe('completed');
    });

    it('fires repeating timer multiple times', () => {
      timedContent.every('100ms', 'tick');

      const fired1 = timedContent.update(100);
      expect(fired1).toHaveLength(1);

      const fired2 = timedContent.update(100);
      expect(fired2).toHaveLength(1);

      const fired3 = timedContent.update(100);
      expect(fired3).toHaveLength(1);
    });

    it('respects maxFires for repeating timer', () => {
      const id = timedContent.every('100ms', 'tick', 2);

      timedContent.update(100);
      timedContent.update(100);

      const timer = timedContent.getTimer(id!);
      expect(timer!.state).toBe('completed');
      expect(timer!.fireCount).toBe(2);
    });

    it('fires multiple times in single update if enough time passed', () => {
      timedContent.every('100ms', 'tick');

      const fired = timedContent.update(350);

      expect(fired).toHaveLength(3);
    });

    it('calls callback when timer fires', () => {
      const callback = vi.fn();
      timedContent.schedule('100ms', 'test', callback);

      timedContent.update(100);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'test',
          state: 'completed',
        })
      );
    });

    it('does not update when globally paused', () => {
      timedContent.schedule('100ms', 'test');
      timedContent.pause();

      const fired = timedContent.update(200);

      expect(fired).toHaveLength(0);
    });
  });

  describe('cancel', () => {
    it('cancels a timer', () => {
      const id = timedContent.schedule('500ms', 'test');

      const result = timedContent.cancel(id!);

      expect(result).toBe(true);

      const timer = timedContent.getTimer(id!);
      expect(timer!.state).toBe('cancelled');
    });

    it('returns false for non-existent timer', () => {
      const result = timedContent.cancel('non-existent');

      expect(result).toBe(false);
    });

    it('cancelled timer does not fire', () => {
      const id = timedContent.schedule('100ms', 'test');
      timedContent.cancel(id!);

      const fired = timedContent.update(200);

      expect(fired).toHaveLength(0);
    });
  });

  describe('pauseTimer / resumeTimer', () => {
    it('pauses individual timer', () => {
      const id = timedContent.schedule('500ms', 'test');

      timedContent.pauseTimer(id!);

      const timer = timedContent.getTimer(id!);
      expect(timer!.state).toBe('paused');
    });

    it('paused timer does not accumulate time', () => {
      const id = timedContent.schedule('100ms', 'test');
      timedContent.update(50); // Start running
      timedContent.pauseTimer(id!);

      timedContent.update(100);

      const timer = timedContent.getTimer(id!);
      expect(timer!.elapsed).toBe(50); // Should not have changed
    });

    it('resumes paused timer', () => {
      const id = timedContent.schedule('100ms', 'test');
      timedContent.pauseTimer(id!);
      timedContent.resumeTimer(id!);

      const fired = timedContent.update(100);

      expect(fired).toHaveLength(1);
    });

    it('returns false for completed/cancelled timer', () => {
      const id = timedContent.schedule('100ms', 'test');
      timedContent.update(100); // Complete it

      const result = timedContent.pauseTimer(id!);

      expect(result).toBe(false);
    });
  });

  describe('global pause / resume', () => {
    it('pauses all timers', () => {
      timedContent.schedule('100ms', 'a');
      timedContent.schedule('200ms', 'b');
      timedContent.pause();

      expect(timedContent.isPaused()).toBe(true);

      const fired = timedContent.update(300);
      expect(fired).toHaveLength(0);
    });

    it('resumes all timers', () => {
      timedContent.schedule('100ms', 'test');
      timedContent.pause();
      timedContent.resume();

      expect(timedContent.isPaused()).toBe(false);

      const fired = timedContent.update(100);
      expect(fired).toHaveLength(1);
    });
  });

  describe('getActiveTimers', () => {
    it('returns pending, running, and paused timers', () => {
      timedContent.schedule('100ms', 'a');
      timedContent.schedule('200ms', 'b');
      const pausedId = timedContent.schedule('300ms', 'c');
      timedContent.pauseTimer(pausedId!);

      const active = timedContent.getActiveTimers();

      expect(active).toHaveLength(3);
    });

    it('excludes completed and cancelled timers', () => {
      const completedId = timedContent.schedule('100ms', 'a');
      const cancelledId = timedContent.schedule('200ms', 'b');
      timedContent.schedule('300ms', 'c');

      timedContent.update(100); // Complete first
      timedContent.cancel(cancelledId!);

      const active = timedContent.getActiveTimers();

      expect(active).toHaveLength(1);
    });
  });

  describe('getTimerCounts', () => {
    it('counts timers by state', () => {
      timedContent.schedule('100ms', 'a');
      const pausedId = timedContent.schedule('200ms', 'b');
      const cancelledId = timedContent.schedule('300ms', 'c');
      timedContent.schedule('50ms', 'd');

      timedContent.update(50); // Complete d, others transition to 'running'
      timedContent.pauseTimer(pausedId!);
      timedContent.cancel(cancelledId!);

      const counts = timedContent.getTimerCounts();

      expect(counts.running).toBe(1); // a (transitioned from pending after update)
      expect(counts.paused).toBe(1); // b
      expect(counts.cancelled).toBe(1); // c
      expect(counts.completed).toBe(1); // d
    });
  });

  describe('getElapsed', () => {
    it('tracks total elapsed time', () => {
      timedContent.update(100);
      timedContent.update(200);
      timedContent.update(50);

      expect(timedContent.getElapsed()).toBe(350);
    });

    it('does not accumulate when paused', () => {
      timedContent.update(100);
      timedContent.pause();
      timedContent.update(200);

      expect(timedContent.getElapsed()).toBe(100);
    });
  });

  describe('cancelAll', () => {
    it('cancels all active timers', () => {
      timedContent.schedule('100ms', 'a');
      timedContent.schedule('200ms', 'b');
      timedContent.schedule('300ms', 'c');

      timedContent.cancelAll();

      const counts = timedContent.getTimerCounts();
      expect(counts.cancelled).toBe(3);
    });

    it('does not affect already completed timers', () => {
      timedContent.schedule('50ms', 'a');
      timedContent.update(50); // Complete a

      timedContent.cancelAll();

      const counts = timedContent.getTimerCounts();
      expect(counts.completed).toBe(1);
    });
  });

  describe('clear / reset', () => {
    it('removes all timers', () => {
      timedContent.schedule('100ms', 'a');
      timedContent.schedule('200ms', 'b');
      timedContent.update(100);

      timedContent.clear();

      expect(timedContent.getAllTimers()).toEqual([]);
      expect(timedContent.getElapsed()).toBe(0);
    });

    it('reset is alias for clear', () => {
      timedContent.schedule('100ms', 'a');
      timedContent.reset();

      expect(timedContent.getAllTimers()).toEqual([]);
    });
  });

  describe('serialization', () => {
    it('serializes timer state', () => {
      timedContent.schedule('100ms', 'a');
      timedContent.every('200ms', 'b', 5);
      timedContent.update(50);

      const serialized = timedContent.serialize();

      expect(serialized).toHaveLength(2);
      expect(serialized[0].content).toBe('a');
      expect(serialized[0].elapsed).toBe(50);
      expect(serialized[1].type).toBe('repeating');
    });

    it('excludes callbacks from serialization', () => {
      const callback = vi.fn();
      timedContent.schedule('100ms', 'test', callback);

      const serialized = timedContent.serialize();

      expect(serialized[0].callback).toBeUndefined();
    });

    it('deserializes timer state', () => {
      timedContent.schedule('100ms', 'a');
      timedContent.update(50);

      const serialized = timedContent.serialize();

      const newTimedContent = createTimedContent();
      newTimedContent.deserialize(serialized);

      const timers = newTimedContent.getAllTimers();
      expect(timers).toHaveLength(1);
      expect(timers[0].elapsed).toBe(50);
    });
  });
});
