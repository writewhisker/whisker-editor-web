import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ThreadScheduler,
  createThreadScheduler,
  Thread,
  ThreadOutput,
} from './ThreadScheduler';

describe('ThreadScheduler', () => {
  let scheduler: ThreadScheduler;

  beforeEach(() => {
    scheduler = new ThreadScheduler();
  });

  describe('createThread', () => {
    it('should create a thread with unique ID', () => {
      const id1 = scheduler.createThread('passage1');
      const id2 = scheduler.createThread('passage2');

      expect(id1).toMatch(/^thread_\d+$/);
      expect(id2).toMatch(/^thread_\d+$/);
      expect(id1).not.toBe(id2);
    });

    it('should initialize thread with correct defaults', () => {
      const id = scheduler.createThread('Start');
      const thread = scheduler.getThread(id);

      expect(thread).toBeDefined();
      expect(thread!.passage).toBe('Start');
      expect(thread!.contentIndex).toBe(0);
      expect(thread!.status).toBe('running');
      expect(thread!.priority).toBe(0);
      expect(thread!.parentId).toBeNull();
      expect(thread!.childIds).toEqual([]);
      expect(thread!.localVariables.size).toBe(0);
    });

    it('should respect custom priority', () => {
      const id = scheduler.createThread('Start', { priority: 5 });
      const thread = scheduler.getThread(id);

      expect(thread!.priority).toBe(5);
    });

    it('should track parent-child relationships', () => {
      const parentId = scheduler.createThread('Parent');
      const childId = scheduler.createThread('Child', { parentId });

      const parent = scheduler.getThread(parentId);
      const child = scheduler.getThread(childId);

      expect(child!.parentId).toBe(parentId);
      expect(parent!.childIds).toContain(childId);
    });

    it('should track main thread', () => {
      const mainId = scheduler.createThread('Start', { isMain: true });

      expect(scheduler.getMainThread()).toBeDefined();
      expect(scheduler.getMainThread()!.id).toBe(mainId);
    });

    it('should enforce maximum thread limit', () => {
      const scheduler = new ThreadScheduler({ maxThreads: 2 });

      scheduler.createThread('one');
      scheduler.createThread('two');

      expect(() => scheduler.createThread('three')).toThrow(
        /Maximum thread limit/
      );
    });
  });

  describe('spawnThread', () => {
    it('should create a new thread with parent reference', () => {
      const parentId = scheduler.createThread('Parent');
      const childId = scheduler.spawnThread('Child', parentId);

      const child = scheduler.getThread(childId);
      expect(child!.parentId).toBe(parentId);
    });
  });

  describe('awaitThread', () => {
    it('should set thread status to waiting', () => {
      const id = scheduler.createThread('Start');
      scheduler.awaitThread(id);

      const thread = scheduler.getThread(id);
      expect(thread!.status).toBe('waiting');
    });

    it('should not affect non-running threads', () => {
      const id = scheduler.createThread('Start');
      scheduler.completeThread(id);
      scheduler.awaitThread(id);

      const thread = scheduler.getThread(id);
      expect(thread!.status).toBe('completed');
    });
  });

  describe('resumeThread', () => {
    it('should resume a waiting thread', () => {
      const id = scheduler.createThread('Start');
      scheduler.awaitThread(id);
      scheduler.resumeThread(id);

      const thread = scheduler.getThread(id);
      expect(thread!.status).toBe('running');
    });
  });

  describe('getActiveThreads', () => {
    it('should return only running threads', () => {
      const running = scheduler.createThread('running');
      const waiting = scheduler.createThread('waiting');
      const completed = scheduler.createThread('completed');

      scheduler.awaitThread(waiting);
      scheduler.completeThread(completed);

      const active = scheduler.getActiveThreads();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(running);
    });

    it('should sort by priority (highest first)', () => {
      scheduler.createThread('low', { priority: 1 });
      scheduler.createThread('high', { priority: 10 });
      scheduler.createThread('medium', { priority: 5 });

      const active = scheduler.getActiveThreads();
      expect(active[0].priority).toBe(10);
      expect(active[1].priority).toBe(5);
      expect(active[2].priority).toBe(1);
    });
  });

  describe('step', () => {
    it('should execute step function for each active thread', () => {
      scheduler.createThread('one');
      scheduler.createThread('two');

      const stepFn = vi.fn().mockReturnValue(['output']);
      const outputs = scheduler.step(stepFn);

      expect(stepFn).toHaveBeenCalledTimes(2);
      expect(outputs).toHaveLength(2);
    });

    it('should return thread outputs', () => {
      const id = scheduler.createThread('Start');
      const stepFn = vi.fn().mockReturnValue(['Hello', 'World']);

      const outputs = scheduler.step(stepFn);

      expect(outputs[0].threadId).toBe(id);
      expect(outputs[0].content).toEqual(['Hello', 'World']);
    });

    it('should handle errors gracefully', () => {
      const id = scheduler.createThread('Start');
      const stepFn = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      scheduler.step(stepFn);

      const thread = scheduler.getThread(id);
      expect(thread!.status).toBe('error');
      expect(thread!.error).toBe('Test error');
    });

    it('should resume threads waiting on completed children', () => {
      const parentId = scheduler.createThread('Parent');
      const childId = scheduler.spawnThread('Child', parentId);

      scheduler.awaitThread(parentId);
      scheduler.completeThread(childId);

      // Step should check waiting threads
      scheduler.step(() => []);

      const parent = scheduler.getThread(parentId);
      expect(parent!.status).toBe('running');
    });
  });

  describe('completeThread', () => {
    it('should mark thread as completed', () => {
      const id = scheduler.createThread('Start');
      scheduler.completeThread(id);

      const thread = scheduler.getThread(id);
      expect(thread!.status).toBe('completed');
    });
  });

  describe('terminateThread', () => {
    it('should remove thread from scheduler', () => {
      const id = scheduler.createThread('Start');
      scheduler.terminateThread(id);

      expect(scheduler.getThread(id)).toBeUndefined();
    });

    it('should terminate child threads recursively', () => {
      const parentId = scheduler.createThread('Parent');
      const childId = scheduler.spawnThread('Child', parentId);
      const grandchildId = scheduler.spawnThread('Grandchild', childId);

      scheduler.terminateThread(parentId);

      expect(scheduler.getThread(parentId)).toBeUndefined();
      expect(scheduler.getThread(childId)).toBeUndefined();
      expect(scheduler.getThread(grandchildId)).toBeUndefined();
    });

    it('should remove child from parent list', () => {
      const parentId = scheduler.createThread('Parent');
      const childId = scheduler.spawnThread('Child', parentId);

      scheduler.terminateThread(childId);

      const parent = scheduler.getThread(parentId);
      expect(parent!.childIds).not.toContain(childId);
    });
  });

  describe('interleaveOutput', () => {
    it('should interleave outputs in round-robin fashion', () => {
      const outputs: ThreadOutput[] = [
        { threadId: 't1', content: ['A', 'B', 'C'], completed: false },
        { threadId: 't2', content: ['1', '2'], completed: false },
      ];

      const result = scheduler.interleaveOutput(outputs);

      expect(result).toEqual(['A', '1', 'B', '2', 'C']);
    });

    it('should concatenate in priority order when round-robin disabled', () => {
      const scheduler = new ThreadScheduler({ roundRobin: false });
      const outputs: ThreadOutput[] = [
        { threadId: 't1', content: ['A', 'B'], completed: false },
        { threadId: 't2', content: ['1', '2'], completed: false },
      ];

      const result = scheduler.interleaveOutput(outputs);

      expect(result).toEqual(['A', 'B', '1', '2']);
    });

    it('should handle empty outputs', () => {
      expect(scheduler.interleaveOutput([])).toEqual([]);
    });
  });

  describe('isComplete', () => {
    it('should return true when all threads complete', () => {
      const id1 = scheduler.createThread('one');
      const id2 = scheduler.createThread('two');

      scheduler.completeThread(id1);
      scheduler.completeThread(id2);

      expect(scheduler.isComplete()).toBe(true);
    });

    it('should return true when scheduler is empty', () => {
      expect(scheduler.isComplete()).toBe(true);
    });

    it('should return false when threads are running', () => {
      scheduler.createThread('one');
      expect(scheduler.isComplete()).toBe(false);
    });

    it('should return true when threads have errors', () => {
      const id = scheduler.createThread('one');
      const thread = scheduler.getThread(id)!;
      thread.status = 'error';

      expect(scheduler.isComplete()).toBe(true);
    });
  });

  describe('thread local variables', () => {
    it('should set and get local variables', () => {
      const id = scheduler.createThread('Start');

      scheduler.setThreadLocal(id, 'counter', 42);
      scheduler.setThreadLocal(id, 'name', 'test');

      expect(scheduler.getThreadLocal(id, 'counter')).toBe(42);
      expect(scheduler.getThreadLocal(id, 'name')).toBe('test');
    });

    it('should return undefined for unknown variables', () => {
      const id = scheduler.createThread('Start');
      expect(scheduler.getThreadLocal(id, 'unknown')).toBeUndefined();
    });
  });

  describe('event listeners', () => {
    it('should emit threadCreated event', () => {
      const listener = vi.fn();
      scheduler.on(listener);

      scheduler.createThread('Start');

      expect(listener).toHaveBeenCalledWith('threadCreated', expect.any(Object));
    });

    it('should emit threadCompleted event', () => {
      const listener = vi.fn();
      scheduler.on(listener);

      const id = scheduler.createThread('Start');
      listener.mockClear();

      scheduler.completeThread(id);

      expect(listener).toHaveBeenCalledWith(
        'threadCompleted',
        expect.any(Object)
      );
    });

    it('should emit threadWaiting event', () => {
      const listener = vi.fn();
      scheduler.on(listener);

      const id = scheduler.createThread('Start');
      listener.mockClear();

      scheduler.awaitThread(id);

      expect(listener).toHaveBeenCalledWith('threadWaiting', expect.any(Object));
    });

    it('should emit threadError event', () => {
      const listener = vi.fn();
      scheduler.on(listener);

      scheduler.createThread('Start');
      listener.mockClear();

      scheduler.step(() => {
        throw new Error('Test');
      });

      expect(listener).toHaveBeenCalledWith('threadError', expect.any(Object));
    });

    it('should allow removing listeners', () => {
      const listener = vi.fn();
      scheduler.on(listener);
      scheduler.off(listener);

      scheduler.createThread('Start');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should clear all threads', () => {
      scheduler.createThread('one');
      scheduler.createThread('two');

      scheduler.reset();

      expect(scheduler.getAllThreads()).toHaveLength(0);
      expect(scheduler.getMainThread()).toBeUndefined();
    });

    it('should reset thread ID counter', () => {
      scheduler.createThread('one');
      scheduler.reset();
      const id = scheduler.createThread('two');

      expect(id).toBe('thread_1');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const scheduler = new ThreadScheduler({ maxThreads: 5 });

      const id1 = scheduler.createThread('one');
      scheduler.createThread('two');
      scheduler.completeThread(id1);

      const stats = scheduler.getStats();

      expect(stats.totalThreads).toBe(2);
      expect(stats.activeThreads).toBe(1);
      expect(stats.completedThreads).toBe(1);
      expect(stats.maxThreads).toBe(5);
    });
  });

  describe('getThreadCounts', () => {
    it('should count threads by status', () => {
      const running = scheduler.createThread('running');
      const waiting = scheduler.createThread('waiting');
      const completed = scheduler.createThread('completed');
      const error = scheduler.createThread('error');

      scheduler.awaitThread(waiting);
      scheduler.completeThread(completed);
      const errorThread = scheduler.getThread(error)!;
      errorThread.status = 'error';

      const counts = scheduler.getThreadCounts();

      expect(counts.running).toBe(1);
      expect(counts.waiting).toBe(1);
      expect(counts.completed).toBe(1);
      expect(counts.error).toBe(1);
    });
  });

  describe('createThreadScheduler factory', () => {
    it('should create a scheduler with options', () => {
      const scheduler = createThreadScheduler({ maxThreads: 3 });

      scheduler.createThread('one');
      scheduler.createThread('two');
      scheduler.createThread('three');

      expect(() => scheduler.createThread('four')).toThrow();
    });
  });

  describe('awaitThreadCompletion', () => {
    it('should return true if target thread is complete', () => {
      const waitingId = scheduler.createThread('waiting');
      const targetId = scheduler.createThread('target');
      scheduler.completeThread(targetId);

      const result = scheduler.awaitThreadCompletion(waitingId, targetId);

      expect(result).toBe(true);
      // Should not block the waiting thread
      expect(scheduler.getThread(waitingId)!.status).toBe('running');
    });

    it('should return true if target thread does not exist', () => {
      const waitingId = scheduler.createThread('waiting');

      const result = scheduler.awaitThreadCompletion(waitingId, 'nonexistent');

      expect(result).toBe(true);
    });

    it('should block waiting thread if target is not complete', () => {
      const waitingId = scheduler.createThread('waiting');
      const targetId = scheduler.createThread('target');

      const result = scheduler.awaitThreadCompletion(waitingId, targetId);

      expect(result).toBe(false);
      expect(scheduler.getThread(waitingId)!.status).toBe('waiting');
    });
  });

  describe('isMainComplete', () => {
    it('should return true when main thread is completed', () => {
      const mainId = scheduler.createThread('Main', { isMain: true });
      scheduler.completeThread(mainId);

      expect(scheduler.isMainComplete()).toBe(true);
    });

    it('should return true when no main thread exists', () => {
      expect(scheduler.isMainComplete()).toBe(true);
    });

    it('should return false when main thread is still running', () => {
      scheduler.createThread('Main', { isMain: true });

      expect(scheduler.isMainComplete()).toBe(false);
    });
  });
});
