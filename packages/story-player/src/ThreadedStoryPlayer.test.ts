import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ThreadedStoryPlayer,
  createThreadedStoryPlayer,
} from './ThreadedStoryPlayer';
import { Story, Passage, Choice, Variable } from '@writewhisker/story-models';

describe('ThreadedStoryPlayer', () => {
  let player: ThreadedStoryPlayer;
  let story: Story;
  let startPassage: Passage;
  let secondPassage: Passage;
  let threadPassage: Passage;

  beforeEach(() => {
    // Create test story
    story = new Story({
      metadata: { title: 'Test Story' },
    });

    // Create passages
    startPassage = new Passage({
      title: 'Start',
      content: 'Welcome to the story.',
    });

    secondPassage = new Passage({
      title: 'Second',
      content: 'This is the second passage.',
    });

    threadPassage = new Passage({
      title: 'Thread Passage',
      content: 'This runs in a parallel thread.',
    });

    // Add choice to start passage
    startPassage.addChoice(
      new Choice({
        text: 'Continue',
        target: secondPassage.id,
      })
    );

    // Add passages to story
    story.addPassage(startPassage);
    story.addPassage(secondPassage);
    story.addPassage(threadPassage);
    story.startPassage = startPassage.id;

    // Add a variable
    story.addVariable(
      new Variable({
        name: 'counter',
        type: 'number',
        initial: 0,
      })
    );

    // Create player
    player = new ThreadedStoryPlayer();
    player.loadStory(story);
  });

  describe('construction', () => {
    it('should create with default options', () => {
      const p = createThreadedStoryPlayer();
      expect(p).toBeInstanceOf(ThreadedStoryPlayer);
    });

    it('should create with custom options', () => {
      const p = createThreadedStoryPlayer({
        maxThreads: 20,
        defaultPriority: 5,
        roundRobin: false,
        executionTimeout: 10000,
      });
      expect(p).toBeInstanceOf(ThreadedStoryPlayer);
    });
  });

  describe('start()', () => {
    it('should create main thread when starting', () => {
      player.start();

      const mainThread = player.getMainThread();
      expect(mainThread).toBeDefined();
      expect(mainThread?.passage).toBe(startPassage.id);
      expect(mainThread?.status).toBe('running');
    });

    it('should start from specific passage', () => {
      player.start(secondPassage.id);

      const mainThread = player.getMainThread();
      expect(mainThread?.passage).toBe(secondPassage.id);
    });
  });

  describe('reset()', () => {
    it('should reset scheduler when resetting player', () => {
      player.start();
      player.spawnThread(threadPassage.id);

      expect(player.getAllThreads().length).toBe(2);

      player.reset();

      expect(player.getAllThreads().length).toBe(0);
      expect(player.getActiveThreadId()).toBeNull();
    });
  });

  describe('spawnThread()', () => {
    it('should spawn a new thread', () => {
      player.start();

      const threadId = player.spawnThread(threadPassage.id);

      expect(threadId).toBeDefined();
      expect(player.getAllThreads().length).toBe(2);
    });

    it('should spawn thread with custom priority', () => {
      player.start();

      const threadId = player.spawnThread(threadPassage.id, { priority: 50 });
      const thread = player.getThread(threadId);

      expect(thread?.priority).toBe(50);
    });

    it('should set parent thread for spawned threads', () => {
      player.start();
      const mainThread = player.getMainThread();

      const threadId = player.spawnThread(threadPassage.id);
      const thread = player.getThread(threadId);

      expect(thread?.parentId).toBe(mainThread?.id);
    });
  });

  describe('thread state', () => {
    it('should track active thread', () => {
      player.start();

      expect(player.getActiveThreadId()).toBe(player.getMainThread()?.id);
    });

    it('should get all threads', () => {
      player.start();
      player.spawnThread(threadPassage.id);
      player.spawnThread(secondPassage.id);

      const threads = player.getAllThreads();
      expect(threads.length).toBe(3);
    });

    it('should get active threads', () => {
      player.start();
      player.spawnThread(threadPassage.id);

      const activeThreads = player.getActiveThreads();
      expect(activeThreads.length).toBeGreaterThanOrEqual(1);
    });

    it('should get thread by ID', () => {
      player.start();
      const mainThread = player.getMainThread();

      const thread = player.getThread(mainThread!.id);
      expect(thread).toBe(mainThread);
    });
  });

  describe('thread variables', () => {
    it('should set thread-local variable', () => {
      player.start();
      const mainThread = player.getMainThread();

      player.setThreadVariable(mainThread!.id, 'localVar', 42);

      expect(player.getThreadVariable(mainThread!.id, 'localVar')).toBe(42);
    });

    it('should isolate thread-local variables', () => {
      player.start();
      const mainThread = player.getMainThread();
      const threadId = player.spawnThread(threadPassage.id);

      player.setThreadVariable(mainThread!.id, 'localVar', 'main');
      player.setThreadVariable(threadId, 'localVar', 'spawned');

      expect(player.getThreadVariable(mainThread!.id, 'localVar')).toBe('main');
      expect(player.getThreadVariable(threadId, 'localVar')).toBe('spawned');
    });
  });

  describe('terminateThread()', () => {
    it('should terminate a specific thread', () => {
      player.start();
      const threadId = player.spawnThread(threadPassage.id);

      expect(player.getThread(threadId)).toBeDefined();

      player.terminateThread(threadId);

      expect(player.getThread(threadId)).toBeUndefined();
    });
  });

  describe('thread statistics', () => {
    it('should return thread stats', () => {
      player.start();
      player.spawnThread(threadPassage.id);

      const stats = player.getThreadStats();

      expect(stats.totalThreads).toBe(2);
      expect(stats.activeThreads).toBeGreaterThanOrEqual(1);
      expect(stats.maxThreads).toBe(10);
    });
  });

  describe('areAllThreadsComplete()', () => {
    it('should return false when threads are running', () => {
      player.start();

      expect(player.areAllThreadsComplete()).toBe(false);
    });
  });

  describe('getThreadedState()', () => {
    it('should return extended state with thread info', () => {
      player.start();
      player.spawnThread(threadPassage.id);

      const state = player.getThreadedState();

      expect(state.threads).toBeDefined();
      expect(state.threads.length).toBe(2);
      expect(state.activeThreadId).toBeDefined();
    });

    it('should serialize thread state correctly', () => {
      player.start();
      const mainThread = player.getMainThread();
      player.setThreadVariable(mainThread!.id, 'testVar', 'testValue');

      const state = player.getThreadedState();
      const threadState = state.threads.find((t) => t.id === mainThread!.id);

      expect(threadState?.localVariables.testVar).toBe('testValue');
    });
  });

  describe('restoreThreadedState()', () => {
    it('should restore thread state', () => {
      player.start();
      player.spawnThread(threadPassage.id);
      player.setThreadVariable(player.getMainThread()!.id, 'preserved', true);

      const savedState = player.getThreadedState();

      // Reset and restore
      player.reset();
      expect(player.getAllThreads().length).toBe(0);

      player.restoreThreadedState(savedState);

      expect(player.getAllThreads().length).toBe(2);
    });
  });

  describe('thread events', () => {
    it('should emit threadSpawned event', () => {
      const callback = vi.fn();
      player.onThread('threadSpawned', callback);

      player.start();

      expect(callback).toHaveBeenCalled();
    });

    it('should remove thread event listener', () => {
      const callback = vi.fn();
      player.onThread('threadSpawned', callback);
      player.offThread('threadSpawned', callback);

      player.start();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getScheduler()', () => {
    it('should return the underlying scheduler', () => {
      const scheduler = player.getScheduler();
      expect(scheduler).toBeDefined();
      expect(typeof scheduler.createThread).toBe('function');
    });
  });

  describe('stepAllThreads()', () => {
    it('should execute step for all active threads', () => {
      player.start();
      player.spawnThread(secondPassage.id);

      const result = player.stepAllThreads();

      expect(result.outputs).toBeDefined();
      expect(Array.isArray(result.interleavedContent)).toBe(true);
      expect(typeof result.allComplete).toBe('boolean');
      expect(typeof result.waitingForInput).toBe('boolean');
    });
  });

  describe('awaitThread()', () => {
    it('should resolve immediately for non-existent thread', async () => {
      player.start();

      await expect(
        player.awaitThread('non-existent')
      ).resolves.toBeUndefined();
    });

    it('should resolve immediately for completed thread', async () => {
      player.start();
      const threadId = player.spawnThread(secondPassage.id);

      // Mark thread as completed
      const thread = player.getThread(threadId);
      if (thread) {
        thread.status = 'completed';
      }

      await expect(player.awaitThread(threadId)).resolves.toBeUndefined();
    });
  });
});
