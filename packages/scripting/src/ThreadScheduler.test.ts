/**
 * ThreadScheduler Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ThreadScheduler,
  createThreadScheduler,
  type ThreadExecutor,
} from './ThreadScheduler';
import type { Thread, ThreadStepResult } from './runtime-types';

describe('ThreadScheduler', () => {
  let scheduler: ThreadScheduler;

  beforeEach(() => {
    scheduler = createThreadScheduler();
  });

  describe('createThread', () => {
    it('creates a main thread', () => {
      const thread = scheduler.createThread('start');

      expect(thread.id).toMatch(/^thread_\d+$/);
      expect(thread.passage).toBe('start');
      expect(thread.isMain).toBe(true);
      expect(thread.state).toBe('running');
      expect(thread.parentId).toBeNull();
      expect(thread.children).toEqual([]);
      expect(thread.priority).toBe(0);
    });

    it('sets main thread as the main thread', () => {
      const thread = scheduler.createThread('start');
      const mainThread = scheduler.getMainThread();

      expect(mainThread).toBe(thread);
    });
  });

  describe('spawnThread', () => {
    it('spawns a child thread from parent', () => {
      const parent = scheduler.createThread('start');
      const child = scheduler.spawnThread('side-passage', parent.id);

      expect(child).not.toBeNull();
      expect(child!.parentId).toBe(parent.id);
      expect(child!.isMain).toBe(false);
      expect(child!.state).toBe('running');
      expect(parent.children).toContain(child!.id);
    });

    it('spawns with custom priority', () => {
      const parent = scheduler.createThread('start');
      const child = scheduler.spawnThread('side-passage', parent.id, 10);

      expect(child!.priority).toBe(10);
    });

    it('returns null if parent does not exist', () => {
      const child = scheduler.spawnThread('side-passage', 'non-existent');

      expect(child).toBeNull();
    });

    it('respects max threads limit', () => {
      const limitedScheduler = createThreadScheduler({ maxThreads: 2 });
      const parent = limitedScheduler.createThread('start');
      const child1 = limitedScheduler.spawnThread('side1', parent.id);
      const child2 = limitedScheduler.spawnThread('side2', parent.id);

      expect(child1).not.toBeNull();
      expect(child2).toBeNull(); // Exceeds limit
    });
  });

  describe('getThread', () => {
    it('returns thread by ID', () => {
      const thread = scheduler.createThread('start');
      const found = scheduler.getThread(thread.id);

      expect(found).toBe(thread);
    });

    it('returns undefined for non-existent ID', () => {
      const found = scheduler.getThread('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('getRunnableThreads', () => {
    it('returns only running threads', () => {
      const main = scheduler.createThread('start');
      const child1 = scheduler.spawnThread('side1', main.id)!;
      const child2 = scheduler.spawnThread('side2', main.id)!;

      scheduler.pauseThread(child1.id);

      const runnable = scheduler.getRunnableThreads();

      expect(runnable).toHaveLength(2);
      expect(runnable.map((t) => t.id)).not.toContain(child1.id);
    });

    it('sorts by priority descending', () => {
      const main = scheduler.createThread('start');
      scheduler.spawnThread('low', main.id, 1);
      scheduler.spawnThread('high', main.id, 10);
      scheduler.spawnThread('medium', main.id, 5);

      const runnable = scheduler.getRunnableThreads();

      expect(runnable[0].priority).toBe(10);
      expect(runnable[1].priority).toBe(5);
      expect(runnable[2].priority).toBe(1);
    });
  });

  describe('pauseThread / resumeThread', () => {
    it('pauses a running thread', () => {
      const thread = scheduler.createThread('start');

      const result = scheduler.pauseThread(thread.id);

      expect(result).toBe(true);
      expect(thread.state).toBe('paused');
    });

    it('resumes a paused thread', () => {
      const thread = scheduler.createThread('start');
      scheduler.pauseThread(thread.id);

      const result = scheduler.resumeThread(thread.id);

      expect(result).toBe(true);
      expect(thread.state).toBe('running');
    });

    it('returns false when pausing non-running thread', () => {
      const thread = scheduler.createThread('start');
      scheduler.completeThread(thread.id);

      const result = scheduler.pauseThread(thread.id);

      expect(result).toBe(false);
    });

    it('returns false when resuming non-paused thread', () => {
      const thread = scheduler.createThread('start');

      const result = scheduler.resumeThread(thread.id);

      expect(result).toBe(false);
    });
  });

  describe('completeThread', () => {
    it('marks thread as completed', () => {
      const thread = scheduler.createThread('start');

      const result = scheduler.completeThread(thread.id, 'done');

      expect(result).toBe(true);
      expect(thread.state).toBe('completed');
      expect(thread.result).toBe('done');
    });

    it('resumes threads waiting for completed thread', () => {
      const main = scheduler.createThread('start');
      const child = scheduler.spawnThread('side', main.id)!;
      scheduler.awaitThread(main.id, child.id);

      expect(main.state).toBe('waiting');

      scheduler.completeThread(child.id);

      expect(main.state).toBe('running');
      expect(main.waitingFor).toBeNull();
    });
  });

  describe('cancelThread', () => {
    it('cancels a thread', () => {
      const thread = scheduler.createThread('start');

      const result = scheduler.cancelThread(thread.id);

      expect(result).toBe(true);
      expect(thread.state).toBe('cancelled');
    });

    it('cancels children recursively', () => {
      const main = scheduler.createThread('start');
      const child = scheduler.spawnThread('side', main.id)!;
      const grandchild = scheduler.spawnThread('sub-side', child.id)!;

      scheduler.cancelThread(child.id);

      expect(child.state).toBe('cancelled');
      expect(grandchild.state).toBe('cancelled');
    });

    it('resumes threads waiting for cancelled thread', () => {
      const main = scheduler.createThread('start');
      const child = scheduler.spawnThread('side', main.id)!;
      scheduler.awaitThread(main.id, child.id);

      scheduler.cancelThread(child.id);

      expect(main.state).toBe('running');
    });
  });

  describe('awaitThread', () => {
    it('makes thread wait for another', () => {
      const main = scheduler.createThread('start');
      const child = scheduler.spawnThread('side', main.id)!;

      const result = scheduler.awaitThread(main.id, child.id);

      expect(result).toBe(true);
      expect(main.state).toBe('waiting');
      expect(main.waitingFor).toBe(child.id);
    });

    it('does not wait if target is already completed', () => {
      const main = scheduler.createThread('start');
      const child = scheduler.spawnThread('side', main.id)!;
      scheduler.completeThread(child.id);

      const result = scheduler.awaitThread(main.id, child.id);

      expect(result).toBe(true);
      expect(main.state).toBe('running'); // Still running, no wait needed
    });

    it('returns false for non-existent threads', () => {
      const main = scheduler.createThread('start');

      const result = scheduler.awaitThread(main.id, 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('thread variables', () => {
    it('sets thread-local variable', () => {
      const thread = scheduler.createThread('start');

      const result = scheduler.setThreadVariable(thread.id, 'count', 42);

      expect(result).toBe(true);
      expect(thread.variables.get('count')).toBe(42);
    });

    it('gets thread-local variable', () => {
      const thread = scheduler.createThread('start');
      scheduler.setThreadVariable(thread.id, 'name', 'test');

      const value = scheduler.getThreadVariable(thread.id, 'name');

      expect(value).toBe('test');
    });

    it('returns undefined for non-existent variable', () => {
      const thread = scheduler.createThread('start');

      const value = scheduler.getThreadVariable(thread.id, 'missing');

      expect(value).toBeUndefined();
    });
  });

  describe('step', () => {
    it('executes one step per runnable thread', () => {
      const main = scheduler.createThread('start');
      scheduler.spawnThread('side', main.id);

      const executor: ThreadExecutor = (thread: Thread): ThreadStepResult => ({
        threadId: thread.id,
        state: 'running',
      });

      const results = scheduler.step(executor);

      expect(results).toHaveLength(2);
    });

    it('updates thread state from result', () => {
      const thread = scheduler.createThread('start');

      const executor: ThreadExecutor = (): ThreadStepResult => ({
        threadId: thread.id,
        state: 'completed',
        result: 'finished',
      });

      scheduler.step(executor);

      expect(thread.state).toBe('completed');
      expect(thread.result).toBe('finished');
    });

    it('handles executor errors gracefully', () => {
      const thread = scheduler.createThread('start');

      const executor: ThreadExecutor = (): ThreadStepResult => {
        throw new Error('Execution failed');
      };

      const results = scheduler.step(executor);

      expect(results[0].error).toBe('Execution failed');
      expect(thread.state).toBe('completed');
    });
  });

  describe('isComplete', () => {
    it('returns true when all threads are done', () => {
      const main = scheduler.createThread('start');
      const child = scheduler.spawnThread('side', main.id)!;

      scheduler.completeThread(main.id);
      scheduler.completeThread(child.id);

      expect(scheduler.isComplete()).toBe(true);
    });

    it('returns false when threads are still running', () => {
      scheduler.createThread('start');

      expect(scheduler.isComplete()).toBe(false);
    });

    it('considers cancelled threads as done', () => {
      const main = scheduler.createThread('start');
      scheduler.cancelThread(main.id);

      expect(scheduler.isComplete()).toBe(true);
    });
  });

  describe('getThreadCounts', () => {
    it('counts threads by state', () => {
      const main = scheduler.createThread('start');
      const child1 = scheduler.spawnThread('side1', main.id)!;
      const child2 = scheduler.spawnThread('side2', main.id)!;
      const child3 = scheduler.spawnThread('side3', main.id)!;

      scheduler.pauseThread(child1.id);
      scheduler.completeThread(child2.id);
      scheduler.cancelThread(child3.id);

      const counts = scheduler.getThreadCounts();

      expect(counts.running).toBe(1); // main
      expect(counts.paused).toBe(1); // child1
      expect(counts.completed).toBe(1); // child2
      expect(counts.cancelled).toBe(1); // child3
      expect(counts.waiting).toBe(0);
    });
  });

  describe('getChildren', () => {
    it('returns child threads', () => {
      const main = scheduler.createThread('start');
      const child1 = scheduler.spawnThread('side1', main.id)!;
      const child2 = scheduler.spawnThread('side2', main.id)!;

      const children = scheduler.getChildren(main.id);

      expect(children).toHaveLength(2);
      expect(children.map((c) => c.id)).toContain(child1.id);
      expect(children.map((c) => c.id)).toContain(child2.id);
    });

    it('returns empty array for thread without children', () => {
      const main = scheduler.createThread('start');

      const children = scheduler.getChildren(main.id);

      expect(children).toEqual([]);
    });
  });

  describe('reset', () => {
    it('clears all threads', () => {
      scheduler.createThread('start');
      scheduler.reset();

      expect(scheduler.getAllThreads()).toEqual([]);
      expect(scheduler.getMainThread()).toBeUndefined();
    });
  });

  describe('serialization', () => {
    it('serializes and deserializes state', () => {
      const main = scheduler.createThread('start');
      scheduler.setThreadVariable(main.id, 'count', 10);
      scheduler.spawnThread('side', main.id, 5);

      const serialized = scheduler.serialize();

      const newScheduler = createThreadScheduler();
      newScheduler.deserialize(serialized);

      const restoredMain = newScheduler.getMainThread();
      expect(restoredMain).toBeDefined();
      expect(restoredMain!.passage).toBe('start');
      expect(restoredMain!.variables.get('count')).toBe(10);

      const allThreads = newScheduler.getAllThreads();
      expect(allThreads).toHaveLength(2);
    });
  });
});
