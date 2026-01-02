/**
 * WLS 2.0 Thread Scheduler
 *
 * Manages parallel narrative threads for concurrent story execution.
 * Threads allow multiple narrative paths to execute simultaneously,
 * with outputs interleaved according to priority.
 */

/**
 * Represents a single narrative thread
 */
export interface Thread {
  /** Unique identifier for this thread */
  id: string;
  /** Current passage being executed */
  passage: string;
  /** Current position within passage content */
  contentIndex: number;
  /** Thread-local variables (not shared with other threads) */
  localVariables: Map<string, unknown>;
  /** Current execution status */
  status: 'running' | 'waiting' | 'completed' | 'error';
  /** Execution priority (higher = executed first) */
  priority: number;
  /** Parent thread ID (null for main thread) */
  parentId: string | null;
  /** Child thread IDs spawned by this thread */
  childIds: string[];
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Output produced by a thread during a step
 */
export interface ThreadOutput {
  /** ID of the thread that produced this output */
  threadId: string;
  /** Content lines produced */
  content: string[];
  /** Whether thread completed during this step */
  completed: boolean;
}

/**
 * Configuration options for the thread scheduler
 */
export interface ThreadSchedulerOptions {
  /** Maximum number of concurrent threads */
  maxThreads?: number;
  /** Default priority for spawned threads */
  defaultPriority?: number;
  /** Whether to use round-robin scheduling (vs priority-only) */
  roundRobin?: boolean;
}

/**
 * Event types emitted by the scheduler
 */
export type ThreadEvent =
  | 'threadCreated'
  | 'threadCompleted'
  | 'threadError'
  | 'threadWaiting'
  | 'allComplete';

/**
 * Callback for thread events
 */
export type ThreadEventCallback = (
  event: ThreadEvent,
  thread: Thread
) => void;

/**
 * Thread scheduler for WLS 2.0 parallel narrative execution
 */
export class ThreadScheduler {
  private threads: Map<string, Thread> = new Map();
  private nextThreadId = 1;
  private mainThreadId: string | null = null;
  private eventListeners: ThreadEventCallback[] = [];
  private options: Required<ThreadSchedulerOptions>;

  constructor(options: ThreadSchedulerOptions = {}) {
    this.options = {
      maxThreads: options.maxThreads ?? 10,
      defaultPriority: options.defaultPriority ?? 0,
      roundRobin: options.roundRobin ?? true,
    };
  }

  /**
   * Create and register a new thread
   */
  createThread(
    passage: string,
    options: {
      priority?: number;
      parentId?: string | null;
      isMain?: boolean;
    } = {}
  ): string {
    if (this.threads.size >= this.options.maxThreads) {
      throw new Error(
        `Maximum thread limit (${this.options.maxThreads}) reached`
      );
    }

    const id = `thread_${this.nextThreadId++}`;
    const thread: Thread = {
      id,
      passage,
      contentIndex: 0,
      localVariables: new Map(),
      status: 'running',
      priority: options.priority ?? this.options.defaultPriority,
      parentId: options.parentId ?? null,
      childIds: [],
    };

    this.threads.set(id, thread);

    // Track as main thread if specified
    if (options.isMain) {
      this.mainThreadId = id;
    }

    // Register as child of parent thread
    if (options.parentId) {
      const parent = this.threads.get(options.parentId);
      if (parent) {
        parent.childIds.push(id);
      }
    }

    this.emit('threadCreated', thread);
    return id;
  }

  /**
   * Spawn a new thread from the current thread (fire and forget)
   */
  spawnThread(passage: string, parentId?: string): string {
    return this.createThread(passage, { parentId });
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
    return this.mainThreadId
      ? this.threads.get(this.mainThreadId)
      : undefined;
  }

  /**
   * Set thread status to waiting (blocked until condition met)
   */
  awaitThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (thread && thread.status === 'running') {
      thread.status = 'waiting';
      this.emit('threadWaiting', thread);
    }
  }

  /**
   * Resume a waiting thread
   */
  resumeThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (thread && thread.status === 'waiting') {
      thread.status = 'running';
    }
  }

  /**
   * Wait for a specific thread to complete
   */
  awaitThreadCompletion(
    waitingThreadId: string,
    targetThreadId: string
  ): boolean {
    const target = this.threads.get(targetThreadId);
    if (!target) {
      return true; // Thread doesn't exist, consider it complete
    }
    if (target.status === 'completed') {
      return true;
    }
    // Block the waiting thread
    this.awaitThread(waitingThreadId);
    return false;
  }

  /**
   * Get all active (running) threads sorted by priority
   */
  getActiveThreads(): Thread[] {
    return Array.from(this.threads.values())
      .filter((t) => t.status === 'running')
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all threads
   */
  getAllThreads(): Thread[] {
    return Array.from(this.threads.values());
  }

  /**
   * Execute one step for each active thread
   */
  step(
    stepFn: (thread: Thread) => string[]
  ): ThreadOutput[] {
    const outputs: ThreadOutput[] = [];
    const activeThreads = this.getActiveThreads();

    for (const thread of activeThreads) {
      try {
        const content = stepFn(thread);
        outputs.push({
          threadId: thread.id,
          content,
          completed: thread.status === 'completed',
        });
      } catch (error) {
        thread.status = 'error';
        thread.error =
          error instanceof Error ? error.message : String(error);
        this.emit('threadError', thread);
      }
    }

    // Check for threads waiting on completed threads
    this.checkWaitingThreads();

    // Check if all threads are complete
    if (this.isComplete()) {
      const main = this.getMainThread();
      if (main) {
        this.emit('allComplete', main);
      }
    }

    return outputs;
  }

  /**
   * Check and resume threads waiting on completed threads
   */
  private checkWaitingThreads(): void {
    for (const thread of this.threads.values()) {
      if (thread.status === 'waiting') {
        // Check if all children are complete
        const allChildrenComplete = thread.childIds.every((childId) => {
          const child = this.threads.get(childId);
          return (
            !child || child.status === 'completed' || child.status === 'error'
          );
        });

        if (allChildrenComplete && thread.childIds.length > 0) {
          thread.status = 'running';
        }
      }
    }
  }

  /**
   * Mark a thread as completed
   */
  completeThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.status = 'completed';
      this.emit('threadCompleted', thread);
    }
  }

  /**
   * Terminate a thread and all its children
   */
  terminateThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    // Terminate children first
    for (const childId of thread.childIds) {
      this.terminateThread(childId);
    }

    // Remove from parent's children list
    if (thread.parentId) {
      const parent = this.threads.get(thread.parentId);
      if (parent) {
        parent.childIds = parent.childIds.filter((id) => id !== threadId);
      }
    }

    this.threads.delete(threadId);
  }

  /**
   * Interleave outputs from multiple threads
   */
  interleaveOutput(outputs: ThreadOutput[]): string[] {
    if (outputs.length === 0) return [];

    if (!this.options.roundRobin) {
      // Priority-only: concatenate in priority order
      return outputs.flatMap((o) => o.content);
    }

    // Round-robin interleaving
    const result: string[] = [];
    const indices = new Map<string, number>();

    // Initialize indices
    for (const output of outputs) {
      indices.set(output.threadId, 0);
    }

    // Interleave content
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const output of outputs) {
        const idx = indices.get(output.threadId)!;
        if (idx < output.content.length) {
          result.push(output.content[idx]);
          indices.set(output.threadId, idx + 1);
          hasMore = true;
        }
      }
    }

    return result;
  }

  /**
   * Check if all threads have completed
   */
  isComplete(): boolean {
    if (this.threads.size === 0) return true;
    return Array.from(this.threads.values()).every(
      (t) => t.status === 'completed' || t.status === 'error'
    );
  }

  /**
   * Check if the main thread has completed
   */
  isMainComplete(): boolean {
    const main = this.getMainThread();
    return (
      !main || main.status === 'completed' || main.status === 'error'
    );
  }

  /**
   * Get count of threads by status
   */
  getThreadCounts(): Record<Thread['status'], number> {
    const counts: Record<Thread['status'], number> = {
      running: 0,
      waiting: 0,
      completed: 0,
      error: 0,
    };

    for (const thread of this.threads.values()) {
      counts[thread.status]++;
    }

    return counts;
  }

  /**
   * Set a local variable for a thread
   */
  setThreadLocal(
    threadId: string,
    name: string,
    value: unknown
  ): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.localVariables.set(name, value);
    }
  }

  /**
   * Get a local variable from a thread
   */
  getThreadLocal(threadId: string, name: string): unknown {
    const thread = this.threads.get(threadId);
    return thread?.localVariables.get(name);
  }

  /**
   * Add an event listener
   */
  on(callback: ThreadEventCallback): void {
    this.eventListeners.push(callback);
  }

  /**
   * Remove an event listener
   */
  off(callback: ThreadEventCallback): void {
    const index = this.eventListeners.indexOf(callback);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: ThreadEvent, thread: Thread): void {
    for (const listener of this.eventListeners) {
      listener(event, thread);
    }
  }

  /**
   * Reset the scheduler to initial state
   */
  reset(): void {
    this.threads.clear();
    this.nextThreadId = 1;
    this.mainThreadId = null;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    totalThreads: number;
    activeThreads: number;
    completedThreads: number;
    maxThreads: number;
  } {
    const counts = this.getThreadCounts();
    return {
      totalThreads: this.threads.size,
      activeThreads: counts.running,
      completedThreads: counts.completed,
      maxThreads: this.options.maxThreads,
    };
  }
}

/**
 * Create a new thread scheduler with default options
 */
export function createThreadScheduler(
  options?: ThreadSchedulerOptions
): ThreadScheduler {
  return new ThreadScheduler(options);
}
