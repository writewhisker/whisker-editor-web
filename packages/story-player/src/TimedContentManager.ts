/**
 * WLS 2.0 Timed Content Manager
 *
 * Manages delayed and scheduled content delivery for narrative timing.
 * Supports @delay, @every, and programmatic timer control.
 */

import type { ContentNode } from '@writewhisker/parser';

/**
 * Represents a scheduled timed block
 */
export interface TimedBlock {
  /** Unique identifier for this timer */
  id: string;
  /** Delay in milliseconds */
  delay: number;
  /** Content to display when timer fires */
  content: ContentNode[];
  /** When this timer was started/restarted */
  startTime: number;
  /** Whether this timer repeats */
  repeat: boolean;
  /** Number of times this timer has fired */
  fireCount: number;
  /** Maximum number of times to fire (0 = unlimited) */
  maxFires: number;
  /** Optional callback when timer fires */
  onFire?: (block: TimedBlock) => void;
  /** Whether this timer is currently active */
  active: boolean;
}

/**
 * Options for scheduling a timed block
 */
export interface ScheduleOptions {
  /** Whether timer repeats */
  repeat?: boolean;
  /** Maximum number of fires for repeating timer */
  maxFires?: number;
  /** Callback when timer fires */
  onFire?: (block: TimedBlock) => void;
  /** Custom timer ID */
  id?: string;
}

/**
 * Event types emitted by the timed content manager
 */
export type TimerEvent =
  | 'timerCreated'
  | 'timerFired'
  | 'timerCanceled'
  | 'timerPaused'
  | 'timerResumed';

/**
 * Callback for timer events
 */
export type TimerEventCallback = (
  event: TimerEvent,
  block: TimedBlock
) => void;

/**
 * Manages timed content for WLS 2.0 narratives
 */
export class TimedContentManager {
  private blocks: Map<string, TimedBlock> = new Map();
  private paused = false;
  private pauseTime = 0;
  private nextId = 1;
  private eventListeners: TimerEventCallback[] = [];

  /**
   * Schedule content to be displayed after a delay
   * @param delay Delay in milliseconds
   * @param content Content nodes to display
   * @param options Scheduling options
   * @returns Timer ID
   */
  schedule(
    delay: number,
    content: ContentNode[],
    options: ScheduleOptions = {}
  ): string {
    const id = options.id || `timer_${this.nextId++}`;

    const block: TimedBlock = {
      id,
      delay,
      content,
      startTime: Date.now(),
      repeat: options.repeat ?? false,
      fireCount: 0,
      maxFires: options.maxFires ?? 0,
      onFire: options.onFire,
      active: true,
    };

    this.blocks.set(id, block);
    this.emit('timerCreated', block);

    return id;
  }

  /**
   * Schedule repeating content
   * @param interval Interval in milliseconds
   * @param content Content nodes to display
   * @param maxFires Maximum fires (0 = unlimited)
   * @returns Timer ID
   */
  every(
    interval: number,
    content: ContentNode[],
    maxFires = 0
  ): string {
    return this.schedule(interval, content, {
      repeat: true,
      maxFires,
    });
  }

  /**
   * Process timers and return any ready content
   * Should be called regularly (e.g., every frame or on a setInterval)
   * @returns Array of content nodes ready to be displayed
   */
  tick(): ContentNode[] {
    if (this.paused) return [];

    const now = Date.now();
    const ready: ContentNode[] = [];

    for (const block of this.blocks.values()) {
      if (!block.active) continue;

      const elapsed = now - block.startTime;

      if (elapsed >= block.delay) {
        // Timer has fired
        ready.push(...block.content);
        block.fireCount++;
        block.onFire?.(block);
        this.emit('timerFired', block);

        if (block.repeat) {
          // Check if we've hit max fires
          if (block.maxFires > 0 && block.fireCount >= block.maxFires) {
            block.active = false;
            this.blocks.delete(block.id);
          } else {
            // Restart the timer
            block.startTime = now;
          }
        } else {
          // One-shot timer, remove it
          block.active = false;
          this.blocks.delete(block.id);
        }
      }
    }

    return ready;
  }

  /**
   * Pause all timers
   */
  pause(): void {
    if (!this.paused) {
      this.paused = true;
      this.pauseTime = Date.now();

      // Emit pause event for all active timers
      for (const block of this.blocks.values()) {
        if (block.active) {
          this.emit('timerPaused', block);
        }
      }
    }
  }

  /**
   * Resume all paused timers
   */
  resume(): void {
    if (this.paused) {
      const pauseDuration = Date.now() - this.pauseTime;

      // Adjust start times to account for pause duration
      for (const block of this.blocks.values()) {
        if (block.active) {
          block.startTime += pauseDuration;
          this.emit('timerResumed', block);
        }
      }

      this.paused = false;
      this.pauseTime = 0;
    }
  }

  /**
   * Cancel a specific timer
   * @param id Timer ID to cancel
   * @returns Whether the timer was found and canceled
   */
  cancel(id: string): boolean {
    const block = this.blocks.get(id);
    if (block) {
      block.active = false;
      this.blocks.delete(id);
      this.emit('timerCanceled', block);
      return true;
    }
    return false;
  }

  /**
   * Cancel all timers
   */
  cancelAll(): void {
    for (const block of this.blocks.values()) {
      block.active = false;
      this.emit('timerCanceled', block);
    }
    this.blocks.clear();
  }

  /**
   * Get time remaining for a timer in milliseconds
   * @param id Timer ID
   * @returns Time remaining in ms, or -1 if not found
   */
  getRemaining(id: string): number {
    const block = this.blocks.get(id);
    if (!block || !block.active) return -1;

    const elapsed = (this.paused ? this.pauseTime : Date.now()) - block.startTime;
    return Math.max(0, block.delay - elapsed);
  }

  /**
   * Check if a timer exists and is active
   * @param id Timer ID
   */
  isActive(id: string): boolean {
    const block = this.blocks.get(id);
    return block?.active ?? false;
  }

  /**
   * Check if the manager is currently paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get all active timer IDs
   */
  getActiveTimers(): string[] {
    return Array.from(this.blocks.values())
      .filter((b) => b.active)
      .map((b) => b.id);
  }

  /**
   * Get count of active timers
   */
  getActiveCount(): number {
    return Array.from(this.blocks.values()).filter((b) => b.active).length;
  }

  /**
   * Add an event listener
   */
  on(callback: TimerEventCallback): void {
    this.eventListeners.push(callback);
  }

  /**
   * Remove an event listener
   */
  off(callback: TimerEventCallback): void {
    const index = this.eventListeners.indexOf(callback);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: TimerEvent, block: TimedBlock): void {
    for (const listener of this.eventListeners) {
      listener(event, block);
    }
  }

  /**
   * Reset the manager to initial state
   */
  reset(): void {
    this.cancelAll();
    this.paused = false;
    this.pauseTime = 0;
    this.nextId = 1;
  }
}

/**
 * Parse a time string like "2s", "500ms", "1.5s" into milliseconds
 */
export function parseTimeString(timeStr: string): number {
  const match = timeStr.match(/^([\d.]+)\s*(s|ms|m|h)?$/i);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();

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

/**
 * Create a new timed content manager
 */
export function createTimedContentManager(): TimedContentManager {
  return new TimedContentManager();
}
