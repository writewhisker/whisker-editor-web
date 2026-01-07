/**
 * Thread Scheduler
 *
 * Enables parallel narrative execution with multiple concurrent threads.
 * Supports thread spawning, state management, priority-based execution,
 * and synchronization via await.
 *
 * Reference: whisker-core/lib/whisker/wls2/thread_scheduler.lua
 */

import type {
  Thread,
  ThreadState,
  ThreadStepResult,
  ThreadSchedulerOptions,
} from './types';

let threadIdCounter = 0;

function generateThreadId(): string {
  return `thread_${++threadIdCounter}`;
}

export interface ThreadExecutor {
  (thread: Thread): ThreadStepResult;
}

export class ThreadScheduler {
  private threads: Map<string, Thread> = new Map();
  private mainThreadId: string | null = null;
  private options: Required<ThreadSchedulerOptions>;

  constructor(options: ThreadSchedulerOptions = {}) {
    this.options = {
      maxThreads: options.maxThreads ?? 100,
      defaultPriority: options.defaultPriority ?? 0,
    };
  }

  /**
   * Create the main thread for a story
   */
  createThread(passage: string): Thread {
    const id = generateThreadId();
    const thread: Thread = {
      id,
      passage,
      parentId: null,
      children: [],
      state: 'running',
      priority: this.options.defaultPriority,
      variables: new Map(),
      waitingFor: null,
      result: undefined,
      isMain: true,
      createdAt: Date.now(),
    };

    this.threads.set(id, thread);
    this.mainThreadId = id;

    return thread;
  }

  /**
   * Spawn a child thread from an existing thread
   */
  spawnThread(
    passage: string,
    parentId: string,
    priority: number = this.options.defaultPriority
  ): Thread | null {
    if (this.threads.size >= this.options.maxThreads) {
      console.warn(
        `ThreadScheduler: Max threads (${this.options.maxThreads}) reached`
      );
      return null;
    }

    const parent = this.threads.get(parentId);
    if (!parent) {
      console.warn(`ThreadScheduler: Parent thread ${parentId} not found`);
      return null;
    }

    const id = generateThreadId();
    const thread: Thread = {
      id,
      passage,
      parentId,
      children: [],
      state: 'running',
      priority,
      variables: new Map(),
      waitingFor: null,
      result: undefined,
      isMain: false,
      createdAt: Date.now(),
    };

    // Add to parent's children
    parent.children.push(id);

    this.threads.set(id, thread);
    return thread;
  }

  /**
   * Get a thread by ID
   */
  getThread(threadId: string): Thread | undefined {
    return this.threads.get(threadId);
  }

  /**
   * Get the main thread
   */
  getMainThread(): Thread | undefined {
    return this.mainThreadId ? this.threads.get(this.mainThreadId) : undefined;
  }

  /**
   * Get all threads that are ready to execute, sorted by priority (higher first)
   */
  getRunnableThreads(): Thread[] {
    const runnable: Thread[] = [];

    for (const thread of this.threads.values()) {
      if (thread.state === 'running') {
        runnable.push(thread);
      }
    }

    // Sort by priority descending (higher priority runs first)
    runnable.sort((a, b) => b.priority - a.priority);

    return runnable;
  }

  /**
   * Set thread state
   */
  setThreadState(threadId: string, state: ThreadState): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return false;
    }

    thread.state = state;
    return true;
  }

  /**
   * Pause a thread
   */
  pauseThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state !== 'running') {
      return false;
    }

    thread.state = 'paused';
    return true;
  }

  /**
   * Resume a paused thread
   */
  resumeThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state !== 'paused') {
      return false;
    }

    thread.state = 'running';
    return true;
  }

  /**
   * Mark a thread as complete with a result
   */
  completeThread(threadId: string, result?: unknown): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return false;
    }

    thread.state = 'completed';
    thread.result = result;

    // Resume any threads waiting for this one
    for (const other of this.threads.values()) {
      if (other.waitingFor === threadId && other.state === 'waiting') {
        other.state = 'running';
        other.waitingFor = null;
      }
    }

    return true;
  }

  /**
   * Cancel a thread and all its children recursively
   */
  cancelThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return false;
    }

    // Cancel all children first (recursive)
    for (const childId of thread.children) {
      this.cancelThread(childId);
    }

    thread.state = 'cancelled';

    // Resume any threads waiting for this one
    for (const other of this.threads.values()) {
      if (other.waitingFor === threadId && other.state === 'waiting') {
        other.state = 'running';
        other.waitingFor = null;
      }
    }

    return true;
  }

  /**
   * Make a thread wait for another thread to complete
   */
  awaitThread(waiterId: string, targetId: string): boolean {
    const waiter = this.threads.get(waiterId);
    const target = this.threads.get(targetId);

    if (!waiter || !target) {
      return false;
    }

    // If target is already complete, don't wait
    if (target.state === 'completed' || target.state === 'cancelled') {
      return true;
    }

    waiter.state = 'waiting';
    waiter.waitingFor = targetId;

    return true;
  }

  /**
   * Set a thread-local variable
   */
  setThreadVariable(
    threadId: string,
    name: string,
    value: unknown
  ): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return false;
    }

    thread.variables.set(name, value);
    return true;
  }

  /**
   * Get a thread-local variable
   */
  getThreadVariable(threadId: string, name: string): unknown {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return undefined;
    }

    return thread.variables.get(name);
  }

  /**
   * Execute one step for each runnable thread
   * Returns results for each executed thread
   */
  step(executor: ThreadExecutor): ThreadStepResult[] {
    const results: ThreadStepResult[] = [];
    const runnable = this.getRunnableThreads();

    for (const thread of runnable) {
      try {
        const result = executor(thread);
        results.push(result);

        // Update thread state based on result
        if (result.state) {
          thread.state = result.state;
        }
        if (result.result !== undefined) {
          thread.result = result.result;
        }
      } catch (error) {
        results.push({
          threadId: thread.id,
          state: 'completed',
          error: error instanceof Error ? error.message : String(error),
        });
        thread.state = 'completed';
      }
    }

    return results;
  }

  /**
   * Check if all threads are complete (done executing)
   */
  isComplete(): boolean {
    for (const thread of this.threads.values()) {
      if (
        thread.state !== 'completed' &&
        thread.state !== 'cancelled'
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get counts of threads by state
   */
  getThreadCounts(): Record<ThreadState, number> {
    const counts: Record<ThreadState, number> = {
      running: 0,
      waiting: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const thread of this.threads.values()) {
      counts[thread.state]++;
    }

    return counts;
  }

  /**
   * Get all threads
   */
  getAllThreads(): Thread[] {
    return Array.from(this.threads.values());
  }

  /**
   * Get children of a thread
   */
  getChildren(threadId: string): Thread[] {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return [];
    }

    return thread.children
      .map((id) => this.threads.get(id))
      .filter((t): t is Thread => t !== undefined);
  }

  /**
   * Reset the scheduler, clearing all threads
   */
  reset(): void {
    this.threads.clear();
    this.mainThreadId = null;
    threadIdCounter = 0;
  }

  /**
   * Serialize state for saving
   */
  serialize(): Thread[] {
    return Array.from(this.threads.values()).map((thread) => ({
      ...thread,
      variables: new Map(thread.variables),
    }));
  }

  /**
   * Deserialize state for loading
   */
  deserialize(threads: Thread[]): void {
    this.threads.clear();
    this.mainThreadId = null;

    for (const thread of threads) {
      this.threads.set(thread.id, {
        ...thread,
        variables: new Map(thread.variables),
      });

      if (thread.isMain) {
        this.mainThreadId = thread.id;
      }
    }

    // Update thread ID counter
    const maxId = Math.max(
      ...threads.map((t) => {
        const match = t.id.match(/thread_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
    );
    threadIdCounter = maxId;
  }
}

/**
 * Factory function to create a ThreadScheduler
 */
export function createThreadScheduler(
  options?: ThreadSchedulerOptions
): ThreadScheduler {
  return new ThreadScheduler(options);
}
