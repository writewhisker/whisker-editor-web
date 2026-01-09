/**
 * Threaded Story Player
 *
 * Extends StoryPlayer with parallel narrative thread execution.
 * Integrates ThreadScheduler for spawn/await functionality.
 */

import type { Story, Passage } from '@writewhisker/story-models';
import { StoryPlayer } from './StoryPlayer';
import {
  ThreadScheduler,
  type Thread,
  type ThreadOutput,
  type ThreadSchedulerOptions,
} from './ThreadScheduler';
import type { PlayerState, PlayerEvent, PlayerEventCallback } from './types';

/**
 * Extended player state including thread information
 */
export interface ThreadedPlayerState extends PlayerState {
  threads: ThreadStateInfo[];
  activeThreadId: string | null;
}

/**
 * Thread state information for serialization
 */
export interface ThreadStateInfo {
  id: string;
  passage: string;
  status: Thread['status'];
  priority: number;
  parentId: string | null;
  localVariables: Record<string, unknown>;
}

/**
 * Options for thread execution
 */
export interface ThreadExecutionOptions {
  /** Maximum number of concurrent threads */
  maxThreads?: number;
  /** Default priority for spawned threads */
  defaultPriority?: number;
  /** Whether to use round-robin scheduling */
  roundRobin?: boolean;
  /** Timeout for thread execution (ms) */
  executionTimeout?: number;
}

/**
 * Result of stepping all threads
 */
export interface ThreadStepResult {
  outputs: ThreadOutput[];
  interleavedContent: string[];
  allComplete: boolean;
  waitingForInput: boolean;
}

/**
 * Thread events specific to threaded player
 */
export type ThreadedPlayerEvent =
  | PlayerEvent
  | 'threadSpawned'
  | 'threadCompleted'
  | 'threadsAllComplete'
  | 'threadError';

/**
 * ThreadedStoryPlayer - Story player with parallel execution
 */
export class ThreadedStoryPlayer extends StoryPlayer {
  private scheduler: ThreadScheduler;
  private activeThreadId: string | null = null;
  private threadEventListeners: Map<
    ThreadedPlayerEvent,
    Set<PlayerEventCallback>
  > = new Map();
  private executionTimeout: number;

  constructor(options: ThreadExecutionOptions = {}) {
    super();

    const schedulerOptions: ThreadSchedulerOptions = {
      maxThreads: options.maxThreads ?? 10,
      defaultPriority: options.defaultPriority ?? 0,
      roundRobin: options.roundRobin ?? true,
    };

    this.scheduler = new ThreadScheduler(schedulerOptions);
    this.executionTimeout = options.executionTimeout ?? 5000;

    // Initialize thread-specific event listeners
    this.threadEventListeners.set('threadSpawned', new Set());
    this.threadEventListeners.set('threadCompleted', new Set());
    this.threadEventListeners.set('threadsAllComplete', new Set());
    this.threadEventListeners.set('threadError', new Set());

    // Connect scheduler events to player events
    this.scheduler.on((event, thread) => {
      switch (event) {
        case 'threadCreated':
          this.emitThreadEvent('threadSpawned', { thread });
          break;
        case 'threadCompleted':
          this.emitThreadEvent('threadCompleted', { thread });
          break;
        case 'threadError':
          this.emitThreadEvent('threadError', { thread, error: thread.error });
          break;
        case 'allComplete':
          this.emitThreadEvent('threadsAllComplete', {});
          break;
      }
    });
  }

  /**
   * Start story with threading support
   */
  override start(fromPassageId?: string): void {
    // Reset scheduler
    this.scheduler.reset();

    // Call parent start
    super.start(fromPassageId);

    // Create main thread for the starting passage
    const startId = fromPassageId || this.getStartPassageId();
    if (startId) {
      this.activeThreadId = this.scheduler.createThread(startId, {
        isMain: true,
        priority: 100, // Main thread has highest priority
      });
    }
  }

  /**
   * Reset player and scheduler
   */
  override reset(): void {
    super.reset();
    this.scheduler.reset();
    this.activeThreadId = null;
  }

  /**
   * Spawn a new thread to execute a passage
   */
  spawnThread(passageId: string, options: { priority?: number } = {}): string {
    const parentId = this.activeThreadId ?? undefined;

    const threadId = this.scheduler.spawnThread(passageId, parentId);

    // Set priority if provided
    const thread = this.scheduler.getThread(threadId);
    if (thread && options.priority !== undefined) {
      thread.priority = options.priority;
    }

    return threadId;
  }

  /**
   * Await completion of a specific thread
   * Returns a promise that resolves when the thread completes
   */
  async awaitThread(threadId: string): Promise<void> {
    const thread = this.scheduler.getThread(threadId);
    if (!thread) {
      return; // Thread doesn't exist or already completed
    }

    if (thread.status === 'completed' || thread.status === 'error') {
      return; // Already done
    }

    // Block current thread
    if (this.activeThreadId) {
      this.scheduler.awaitThreadCompletion(this.activeThreadId, threadId);
    }

    // Return promise that resolves when thread completes
    return new Promise((resolve) => {
      const checkComplete = () => {
        const t = this.scheduler.getThread(threadId);
        if (!t || t.status === 'completed' || t.status === 'error') {
          resolve();
        } else {
          setTimeout(checkComplete, 10);
        }
      };
      checkComplete();
    });
  }

  /**
   * Execute one step for all active threads
   */
  stepAllThreads(): ThreadStepResult {
    const outputs = this.scheduler.step((thread) => {
      return this.executeThreadStep(thread);
    });

    const interleavedContent = this.scheduler.interleaveOutput(outputs);

    return {
      outputs,
      interleavedContent,
      allComplete: this.scheduler.isComplete(),
      waitingForInput: this.isWaitingForInput(),
    };
  }

  /**
   * Run all threads until completion or waiting for input
   */
  async runUntilInputNeeded(): Promise<ThreadStepResult> {
    const startTime = Date.now();
    let lastResult: ThreadStepResult = {
      outputs: [],
      interleavedContent: [],
      allComplete: false,
      waitingForInput: false,
    };

    while (!lastResult.allComplete && !lastResult.waitingForInput) {
      // Check timeout
      if (Date.now() - startTime > this.executionTimeout) {
        throw new Error(
          `Thread execution timeout after ${this.executionTimeout}ms`
        );
      }

      lastResult = this.stepAllThreads();

      // Small delay to prevent tight loops
      await new Promise((resolve) => setTimeout(resolve, 1));
    }

    return lastResult;
  }

  /**
   * Execute a single step for a thread
   */
  private executeThreadStep(thread: Thread): string[] {
    const passage = this.getPassageById(thread.passage);
    if (!passage) {
      this.scheduler.completeThread(thread.id);
      return [`[Error: Passage "${thread.passage}" not found]`];
    }

    const content: string[] = [];

    // Render passage content
    if (passage.content) {
      // Process content with variable interpolation
      const renderedContent = this.interpolateVariables(
        passage.content,
        thread
      );
      content.push(renderedContent);
    }

    // Check if passage has choices (waiting for input)
    const availableChoices = passage.choices.filter((c) =>
      this.canMakeChoiceForThread(c.id, thread)
    );

    if (availableChoices.length === 0) {
      // No choices = passage complete, check for auto-navigation
      if (passage.choices.length === 0) {
        // Terminal passage
        this.scheduler.completeThread(thread.id);
      }
    }

    // Advance content index
    thread.contentIndex++;

    return content;
  }

  /**
   * Check if thread is waiting for player input
   */
  private isWaitingForInput(): boolean {
    const activeThreads = this.scheduler.getActiveThreads();

    for (const thread of activeThreads) {
      const passage = this.getPassageById(thread.passage);
      if (passage && passage.choices.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get passage by ID from the loaded story
   */
  private getPassageById(passageId: string): Passage | null {
    const currentPassage = this.getCurrentPassage();
    if (!currentPassage) return null;

    // Access story through parent class
    const state = this.getState();
    if (!state) return null;

    // This is a bit hacky - we need access to the story
    // In a real implementation, we'd have a getter for the story
    return null; // Placeholder - will be fixed in integration
  }

  /**
   * Interpolate variables in content for a specific thread
   */
  private interpolateVariables(content: string, thread: Thread): string {
    // First check thread-local variables, then global
    return content.replace(/\$(\w+)/g, (_match, varName) => {
      // Check thread-local first
      if (thread.localVariables.has(varName)) {
        return String(thread.localVariables.get(varName));
      }
      // Then check global
      const globalValue = this.getVariable(varName);
      return globalValue !== undefined ? String(globalValue) : `$${varName}`;
    });
  }

  /**
   * Check if a choice can be made in the context of a thread
   */
  private canMakeChoiceForThread(choiceId: string, thread: Thread): boolean {
    // Use parent's canMakeChoice with thread-local context
    // This is a simplified version
    return this.canMakeChoice(choiceId);
  }

  /**
   * Make a choice on behalf of a specific thread
   */
  makeThreadChoice(threadId: string, choiceId: string): void {
    const thread = this.scheduler.getThread(threadId);
    if (!thread) {
      throw new Error(`Thread "${threadId}" not found`);
    }

    if (thread.status !== 'running') {
      throw new Error(`Thread "${threadId}" is not running`);
    }

    // Set active thread context
    const previousActive = this.activeThreadId;
    this.activeThreadId = threadId;

    try {
      // Make choice - this will navigate to the target passage
      this.makeChoice(choiceId);

      // Update thread's passage to the new current passage
      const current = this.getCurrentPassage();
      if (current) {
        thread.passage = current.id;
        thread.contentIndex = 0;
      }
    } finally {
      // Restore previous active thread
      this.activeThreadId = previousActive;
    }
  }

  /**
   * Set a thread-local variable
   */
  setThreadVariable(threadId: string, name: string, value: unknown): void {
    this.scheduler.setThreadLocal(threadId, name, value);
  }

  /**
   * Get a thread-local variable
   */
  getThreadVariable(threadId: string, name: string): unknown {
    return this.scheduler.getThreadLocal(threadId, name);
  }

  /**
   * Get the current active thread ID
   */
  getActiveThreadId(): string | null {
    return this.activeThreadId;
  }

  /**
   * Get all threads
   */
  getAllThreads(): Thread[] {
    return this.scheduler.getAllThreads();
  }

  /**
   * Get active (running) threads
   */
  getActiveThreads(): Thread[] {
    return this.scheduler.getActiveThreads();
  }

  /**
   * Get thread by ID
   */
  getThread(threadId: string): Thread | undefined {
    return this.scheduler.getThread(threadId);
  }

  /**
   * Get main thread
   */
  getMainThread(): Thread | undefined {
    return this.scheduler.getMainThread();
  }

  /**
   * Check if all threads are complete
   */
  areAllThreadsComplete(): boolean {
    return this.scheduler.isComplete();
  }

  /**
   * Check if main thread is complete
   */
  isMainThreadComplete(): boolean {
    return this.scheduler.isMainComplete();
  }

  /**
   * Terminate a specific thread
   */
  terminateThread(threadId: string): void {
    this.scheduler.terminateThread(threadId);
  }

  /**
   * Get scheduler statistics
   */
  getThreadStats(): {
    totalThreads: number;
    activeThreads: number;
    completedThreads: number;
    maxThreads: number;
  } {
    return this.scheduler.getStats();
  }

  /**
   * Get extended state including thread information
   */
  getThreadedState(): ThreadedPlayerState {
    const baseState = this.getState();

    const threads: ThreadStateInfo[] = this.scheduler
      .getAllThreads()
      .map((t) => ({
        id: t.id,
        passage: t.passage,
        status: t.status,
        priority: t.priority,
        parentId: t.parentId,
        localVariables: Object.fromEntries(t.localVariables),
      }));

    return {
      ...baseState,
      threads,
      activeThreadId: this.activeThreadId,
    };
  }

  /**
   * Restore extended state including threads
   */
  restoreThreadedState(state: ThreadedPlayerState): void {
    // Restore base state
    this.restoreState(state);

    // Reset scheduler
    this.scheduler.reset();

    // Restore threads
    for (const threadInfo of state.threads) {
      const threadId = this.scheduler.createThread(threadInfo.passage, {
        priority: threadInfo.priority,
        parentId: threadInfo.parentId ?? undefined,
      });

      const thread = this.scheduler.getThread(threadId);
      if (thread) {
        thread.status = threadInfo.status;
        for (const [key, value] of Object.entries(threadInfo.localVariables)) {
          thread.localVariables.set(key, value);
        }
      }
    }

    this.activeThreadId = state.activeThreadId;
  }

  /**
   * Add thread event listener
   */
  onThread(
    event: ThreadedPlayerEvent,
    callback: PlayerEventCallback
  ): void {
    const listeners = this.threadEventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    } else {
      // Fall back to parent event handling
      this.on(event as PlayerEvent, callback);
    }
  }

  /**
   * Remove thread event listener
   */
  offThread(
    event: ThreadedPlayerEvent,
    callback: PlayerEventCallback
  ): void {
    const listeners = this.threadEventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    } else {
      this.off(event as PlayerEvent, callback);
    }
  }

  /**
   * Emit thread-specific event
   */
  private emitThreadEvent(event: ThreadedPlayerEvent, data: any): void {
    const listeners = this.threadEventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Get the underlying scheduler (for advanced usage)
   */
  getScheduler(): ThreadScheduler {
    return this.scheduler;
  }
}

/**
 * Create a new threaded story player
 */
export function createThreadedStoryPlayer(
  options?: ThreadExecutionOptions
): ThreadedStoryPlayer {
  return new ThreadedStoryPlayer(options);
}
