/**
 * Timed Content
 *
 * Manages delayed and scheduled content delivery with one-shot and repeating timers.
 * Supports time string parsing ("500ms", "2s", "1m") and global/per-timer pause.
 *
 * Reference: whisker-core/lib/whisker/runtime/timed_content.lua
 */

import type {
  Timer,
  TimerType,
  TimerState,
  TimerCallback,
  FiredTimer,
  TimedContentOptions,
} from './runtime-types';

let timerIdCounter = 0;

function generateTimerId(): string {
  return `timer_${++timerIdCounter}`;
}

/**
 * Parse a time string into milliseconds
 * Supports: "500ms", "2s", "1m", "1h", or numeric milliseconds
 */
export function parseTimeString(timeStr: string | number): number {
  if (typeof timeStr === 'number') {
    return timeStr;
  }

  const str = timeStr.trim().toLowerCase();

  // Try to parse as number first
  const num = parseFloat(str);
  if (!isNaN(num) && str === String(num)) {
    return num;
  }

  // Parse with unit suffix
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/);
  if (!match) {
    throw new Error(`Invalid time string: ${timeStr}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || 'ms';

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return value;
  }
}

export class TimedContent {
  private timers: Map<string, Timer> = new Map();
  private totalElapsed: number = 0;
  private globalPaused: boolean = false;
  private options: Required<TimedContentOptions>;

  constructor(options: TimedContentOptions = {}) {
    this.options = {
      maxTimers: options.maxTimers ?? 1000,
    };
  }

  /**
   * Schedule a one-shot timer
   */
  schedule(
    delay: string | number,
    content: unknown,
    callback?: TimerCallback
  ): string | null {
    if (this.timers.size >= this.options.maxTimers) {
      console.warn(
        `TimedContent: Max timers (${this.options.maxTimers}) reached`
      );
      return null;
    }

    const delayMs = parseTimeString(delay);
    const id = generateTimerId();

    const timer: Timer = {
      id,
      type: 'oneshot',
      delay: delayMs,
      elapsed: 0,
      content,
      callback,
      state: 'pending',
      createdAt: Date.now(),
      fireCount: 0,
    };

    this.timers.set(id, timer);
    return id;
  }

  /**
   * Schedule a repeating timer
   */
  every(
    interval: string | number,
    content: unknown,
    maxFires?: number,
    callback?: TimerCallback
  ): string | null {
    if (this.timers.size >= this.options.maxTimers) {
      console.warn(
        `TimedContent: Max timers (${this.options.maxTimers}) reached`
      );
      return null;
    }

    const intervalMs = parseTimeString(interval);
    const id = generateTimerId();

    const timer: Timer = {
      id,
      type: 'repeating',
      delay: intervalMs,
      elapsed: 0,
      content,
      callback,
      state: 'pending',
      createdAt: Date.now(),
      maxFires,
      fireCount: 0,
    };

    this.timers.set(id, timer);
    return id;
  }

  /**
   * Cancel a specific timer
   */
  cancel(timerId: string): boolean {
    const timer = this.timers.get(timerId);
    if (!timer) {
      return false;
    }

    timer.state = 'cancelled';
    return true;
  }

  /**
   * Pause a specific timer
   */
  pauseTimer(timerId: string): boolean {
    const timer = this.timers.get(timerId);
    if (!timer || timer.state === 'completed' || timer.state === 'cancelled') {
      return false;
    }

    timer.state = 'paused';
    return true;
  }

  /**
   * Resume a paused timer
   */
  resumeTimer(timerId: string): boolean {
    const timer = this.timers.get(timerId);
    if (!timer || timer.state !== 'paused') {
      return false;
    }

    timer.state = timer.elapsed > 0 ? 'running' : 'pending';
    return true;
  }

  /**
   * Pause all timers globally
   */
  pause(): void {
    this.globalPaused = true;
  }

  /**
   * Resume all timers globally
   */
  resume(): void {
    this.globalPaused = false;
  }

  /**
   * Check if globally paused
   */
  isPaused(): boolean {
    return this.globalPaused;
  }

  /**
   * Update all timers with delta time
   * Returns array of fired timers
   */
  update(deltaMs: number): FiredTimer[] {
    if (this.globalPaused) {
      return [];
    }

    this.totalElapsed += deltaMs;
    const fired: FiredTimer[] = [];

    for (const timer of this.timers.values()) {
      // Skip completed, cancelled, or paused timers
      if (
        timer.state === 'completed' ||
        timer.state === 'cancelled' ||
        timer.state === 'paused'
      ) {
        continue;
      }

      // Mark as running if pending
      if (timer.state === 'pending') {
        timer.state = 'running';
      }

      // Update elapsed time
      timer.elapsed += deltaMs;

      // Check if timer should fire
      if (timer.type === 'oneshot') {
        if (timer.elapsed >= timer.delay) {
          timer.fireCount = 1;
          timer.state = 'completed';

          fired.push({
            timerId: timer.id,
            content: timer.content,
            fireCount: timer.fireCount,
          });

          // Call callback if provided
          if (timer.callback) {
            try {
              timer.callback(timer);
            } catch (error) {
              console.error(`Timer callback error: ${error}`);
            }
          }
        }
      } else {
        // Repeating timer - can fire multiple times in one update
        while (timer.elapsed >= timer.delay) {
          timer.elapsed -= timer.delay;
          timer.fireCount++;

          fired.push({
            timerId: timer.id,
            content: timer.content,
            fireCount: timer.fireCount,
          });

          // Call callback if provided
          if (timer.callback) {
            try {
              timer.callback(timer);
            } catch (error) {
              console.error(`Timer callback error: ${error}`);
            }
          }

          // Check if max fires reached
          if (timer.maxFires !== undefined && timer.fireCount >= timer.maxFires) {
            timer.state = 'completed';
            break;
          }
        }
      }
    }

    return fired;
  }

  /**
   * Get a timer by ID
   */
  getTimer(timerId: string): Timer | undefined {
    return this.timers.get(timerId);
  }

  /**
   * Get all active timers (pending, running, or paused)
   */
  getActiveTimers(): Timer[] {
    const active: Timer[] = [];

    for (const timer of this.timers.values()) {
      if (
        timer.state === 'pending' ||
        timer.state === 'running' ||
        timer.state === 'paused'
      ) {
        active.push(timer);
      }
    }

    return active;
  }

  /**
   * Get counts of timers by state
   */
  getTimerCounts(): Record<TimerState, number> {
    const counts: Record<TimerState, number> = {
      pending: 0,
      running: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const timer of this.timers.values()) {
      counts[timer.state]++;
    }

    return counts;
  }

  /**
   * Get total elapsed time since creation
   */
  getElapsed(): number {
    return this.totalElapsed;
  }

  /**
   * Cancel all timers
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      if (timer.state !== 'completed' && timer.state !== 'cancelled') {
        timer.state = 'cancelled';
      }
    }
  }

  /**
   * Clear all timers and reset state
   */
  clear(): void {
    this.timers.clear();
    this.totalElapsed = 0;
    this.globalPaused = false;
    timerIdCounter = 0;
  }

  /**
   * Reset the timed content manager
   */
  reset(): void {
    this.clear();
  }

  /**
   * Get all timers
   */
  getAllTimers(): Timer[] {
    return Array.from(this.timers.values());
  }

  /**
   * Serialize state for saving
   */
  serialize(): Timer[] {
    return Array.from(this.timers.values()).map((timer) => ({
      ...timer,
      callback: undefined, // Callbacks cannot be serialized
    }));
  }

  /**
   * Deserialize state for loading
   */
  deserialize(timers: Timer[]): void {
    this.timers.clear();

    for (const timer of timers) {
      this.timers.set(timer.id, { ...timer });
    }

    // Update timer ID counter
    const maxId = Math.max(
      ...timers.map((t) => {
        const match = t.id.match(/timer_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      }),
      0
    );
    timerIdCounter = maxId;
  }
}

/**
 * Factory function to create a TimedContent manager
 */
export function createTimedContent(options?: TimedContentOptions): TimedContent {
  return new TimedContent(options);
}
