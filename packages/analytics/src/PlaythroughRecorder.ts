/**
 * PlaythroughRecorder - Records player playthroughs for analytics
 *
 * Manages recording, storage, and retrieval of playthrough data.
 * Supports session-based recording with automatic persistence.
 */

import type { Logger, StorageAdapter } from './types';

/**
 * Playthrough step data
 */
export interface PlaythroughStepData {
  passageId: string;
  passageTitle: string;
  timestamp: string;
  choiceIndex?: number;
  choiceText?: string;
  variables?: Record<string, any>;
  timeSpent?: number;
}

/**
 * Playthrough data structure
 */
export interface PlaythroughData {
  id: string;
  storyId: string;
  storyTitle: string;
  startTime: string;
  endTime?: string;
  completed: boolean;
  steps: PlaythroughStepData[];
  finalVariables?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Playthrough recording configuration
 */
export interface PlaythroughRecorderConfig {
  /** Storage key prefix for playthroughs */
  storageKeyPrefix?: string;
  /** Maximum playthroughs to keep per story */
  maxPlaythroughsPerStory?: number;
  /** Auto-save interval in milliseconds (0 = disabled) */
  autoSaveInterval?: number;
}

/**
 * Playthrough interface for external use
 */
export interface Playthrough {
  id: string;
  storyId: string;
  storyTitle: string;
  startTime: string;
  endTime?: string;
  completed: boolean;
  steps: PlaythroughStepData[];
  finalVariables?: Record<string, any>;
  metadata?: Record<string, any>;
  getDuration(): number;
  getPath(): string[];
  getUniquePassages(): string[];
}

/**
 * PlaythroughRecorder class
 */
export class PlaythroughRecorder {
  private playthroughs: Map<string, PlaythroughData> = new Map();
  private storyIndex: Map<string, string[]> = new Map(); // storyId -> playthroughIds
  private config: Required<PlaythroughRecorderConfig>;
  private storage?: StorageAdapter;
  private logger?: Logger;
  private autoSaveTimer?: ReturnType<typeof setInterval>;

  constructor(
    config?: PlaythroughRecorderConfig,
    storage?: StorageAdapter,
    logger?: Logger
  ) {
    this.config = {
      storageKeyPrefix: config?.storageKeyPrefix ?? 'whisker_playthrough_',
      maxPlaythroughsPerStory: config?.maxPlaythroughsPerStory ?? 100,
      autoSaveInterval: config?.autoSaveInterval ?? 0,
    };
    this.storage = storage;
    this.logger = logger;

    // Setup auto-save if configured
    if (this.config.autoSaveInterval > 0 && storage) {
      this.autoSaveTimer = setInterval(() => {
        this.persistAll();
      }, this.config.autoSaveInterval);
    }
  }

  /**
   * Start a new playthrough
   */
  startPlaythrough(
    storyId: string,
    storyTitle: string,
    metadata?: Record<string, any>
  ): Playthrough {
    const id = this.generateId();
    const now = new Date().toISOString();

    const data: PlaythroughData = {
      id,
      storyId,
      storyTitle,
      startTime: now,
      completed: false,
      steps: [],
      metadata,
    };

    this.playthroughs.set(id, data);

    // Index by story
    const storyPlaythroughs = this.storyIndex.get(storyId) || [];
    storyPlaythroughs.push(id);
    this.storyIndex.set(storyId, storyPlaythroughs);

    // Enforce max playthroughs per story
    this.pruneOldPlaythroughs(storyId);

    this.logger?.info?.(`Started playthrough ${id} for story ${storyId}`);

    return this.wrapPlaythrough(data);
  }

  /**
   * Record a passage visit
   */
  recordPassage(
    playthroughId: string,
    passageId: string,
    passageTitle: string,
    variables?: Record<string, any>
  ): void {
    const playthrough = this.playthroughs.get(playthroughId);
    if (!playthrough) {
      this.logger?.warn?.(`Playthrough ${playthroughId} not found`);
      return;
    }

    const lastStep = playthrough.steps[playthrough.steps.length - 1];
    const now = new Date().toISOString();

    // Calculate time spent on previous passage
    if (lastStep) {
      lastStep.timeSpent = Date.parse(now) - Date.parse(lastStep.timestamp);
    }

    playthrough.steps.push({
      passageId,
      passageTitle,
      timestamp: now,
      variables: variables ? { ...variables } : undefined,
    });
  }

  /**
   * Record a choice made
   */
  recordChoice(
    playthroughId: string,
    passageId: string,
    passageTitle: string,
    choiceIndex: number,
    choiceText: string,
    variables?: Record<string, any>
  ): void {
    const playthrough = this.playthroughs.get(playthroughId);
    if (!playthrough) {
      this.logger?.warn?.(`Playthrough ${playthroughId} not found`);
      return;
    }

    const lastStep = playthrough.steps[playthrough.steps.length - 1];
    const now = new Date().toISOString();

    // Calculate time spent on previous passage
    if (lastStep) {
      lastStep.timeSpent = Date.parse(now) - Date.parse(lastStep.timestamp);
    }

    playthrough.steps.push({
      passageId,
      passageTitle,
      timestamp: now,
      choiceIndex,
      choiceText,
      variables: variables ? { ...variables } : undefined,
    });
  }

  /**
   * End a playthrough
   */
  endPlaythrough(
    playthroughId: string,
    completed: boolean = true,
    finalVariables?: Record<string, any>
  ): void {
    const playthrough = this.playthroughs.get(playthroughId);
    if (!playthrough) {
      this.logger?.warn?.(`Playthrough ${playthroughId} not found`);
      return;
    }

    playthrough.endTime = new Date().toISOString();
    playthrough.completed = completed;
    if (finalVariables) {
      playthrough.finalVariables = { ...finalVariables };
    }

    // Calculate final step time
    const lastStep = playthrough.steps[playthrough.steps.length - 1];
    if (lastStep && playthrough.endTime) {
      lastStep.timeSpent = Date.parse(playthrough.endTime) - Date.parse(lastStep.timestamp);
    }

    this.logger?.info?.(
      `Ended playthrough ${playthroughId} (completed: ${completed})`
    );

    // Persist if storage available
    if (this.storage) {
      this.persistPlaythrough(playthroughId);
    }
  }

  /**
   * Get a playthrough by ID
   */
  getPlaythrough(playthroughId: string): Playthrough | undefined {
    const data = this.playthroughs.get(playthroughId);
    return data ? this.wrapPlaythrough(data) : undefined;
  }

  /**
   * Get all playthroughs for a story
   */
  getPlaythroughsByStory(storyId: string): Playthrough[] {
    const ids = this.storyIndex.get(storyId) || [];
    return ids
      .map(id => this.playthroughs.get(id))
      .filter((p): p is PlaythroughData => p !== undefined)
      .map(data => this.wrapPlaythrough(data));
  }

  /**
   * Get all playthroughs
   */
  getAllPlaythroughs(): Playthrough[] {
    return Array.from(this.playthroughs.values()).map(data =>
      this.wrapPlaythrough(data)
    );
  }

  /**
   * Delete a playthrough
   */
  deletePlaythrough(playthroughId: string): boolean {
    const playthrough = this.playthroughs.get(playthroughId);
    if (!playthrough) {
      return false;
    }

    // Remove from story index
    const storyPlaythroughs = this.storyIndex.get(playthrough.storyId);
    if (storyPlaythroughs) {
      const idx = storyPlaythroughs.indexOf(playthroughId);
      if (idx !== -1) {
        storyPlaythroughs.splice(idx, 1);
      }
    }

    this.playthroughs.delete(playthroughId);

    // Remove from storage if available
    if (this.storage) {
      const key = this.config.storageKeyPrefix + playthroughId;
      this.storage.remove?.(key);
    }

    return true;
  }

  /**
   * Delete all playthroughs for a story
   */
  deletePlaythroughsByStory(storyId: string): number {
    const ids = this.storyIndex.get(storyId) || [];
    let count = 0;

    for (const id of ids) {
      if (this.deletePlaythrough(id)) {
        count++;
      }
    }

    this.storyIndex.delete(storyId);
    return count;
  }

  /**
   * Clear all playthroughs
   */
  clear(): void {
    this.playthroughs.clear();
    this.storyIndex.clear();
  }

  /**
   * Export playthrough data
   */
  exportPlaythrough(playthroughId: string): PlaythroughData | undefined {
    return this.playthroughs.get(playthroughId);
  }

  /**
   * Export all playthroughs for a story
   */
  exportStoryPlaythroughs(storyId: string): PlaythroughData[] {
    const ids = this.storyIndex.get(storyId) || [];
    return ids
      .map(id => this.playthroughs.get(id))
      .filter((p): p is PlaythroughData => p !== undefined);
  }

  /**
   * Import a playthrough
   */
  importPlaythrough(data: PlaythroughData): void {
    this.playthroughs.set(data.id, data);

    // Update story index
    const storyPlaythroughs = this.storyIndex.get(data.storyId) || [];
    if (!storyPlaythroughs.includes(data.id)) {
      storyPlaythroughs.push(data.id);
      this.storyIndex.set(data.storyId, storyPlaythroughs);
    }
  }

  /**
   * Persist a single playthrough to storage
   */
  private persistPlaythrough(playthroughId: string): void {
    if (!this.storage) return;

    const playthrough = this.playthroughs.get(playthroughId);
    if (!playthrough) return;

    const key = this.config.storageKeyPrefix + playthroughId;
    try {
      this.storage.set?.(key, playthrough);
    } catch (error) {
      this.logger?.error?.(`Failed to persist playthrough ${playthroughId}`, error);
    }
  }

  /**
   * Persist all playthroughs to storage
   */
  private persistAll(): void {
    for (const id of this.playthroughs.keys()) {
      this.persistPlaythrough(id);
    }
  }

  /**
   * Prune old playthroughs to stay within limit
   */
  private pruneOldPlaythroughs(storyId: string): void {
    const ids = this.storyIndex.get(storyId);
    if (!ids || ids.length <= this.config.maxPlaythroughsPerStory) {
      return;
    }

    // Sort by start time, oldest first
    const sorted = ids
      .map(id => ({ id, data: this.playthroughs.get(id) }))
      .filter(item => item.data !== undefined)
      .sort((a, b) => {
        const timeA = Date.parse(a.data!.startTime);
        const timeB = Date.parse(b.data!.startTime);
        return timeA - timeB;
      });

    // Remove oldest until within limit
    while (sorted.length > this.config.maxPlaythroughsPerStory) {
      const oldest = sorted.shift();
      if (oldest) {
        this.deletePlaythrough(oldest.id);
      }
    }
  }

  /**
   * Wrap PlaythroughData with helper methods
   */
  private wrapPlaythrough(data: PlaythroughData): Playthrough {
    return {
      ...data,
      getDuration(): number {
        if (!data.endTime) {
          return Date.now() - Date.parse(data.startTime);
        }
        return Date.parse(data.endTime) - Date.parse(data.startTime);
      },
      getPath(): string[] {
        return data.steps.map(step => step.passageTitle);
      },
      getUniquePassages(): string[] {
        const unique = new Set(data.steps.map(step => step.passageId));
        return Array.from(unique);
      },
    };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `pt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Dispose the recorder
   */
  dispose(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.persistAll();
  }

  /**
   * Factory method
   */
  static create(
    config?: PlaythroughRecorderConfig,
    storage?: StorageAdapter,
    logger?: Logger
  ): PlaythroughRecorder {
    return new PlaythroughRecorder(config, storage, logger);
  }
}

// Singleton instance
let defaultRecorder: PlaythroughRecorder | null = null;

/**
 * Get the default playthrough recorder instance
 */
export function getPlaythroughRecorder(): PlaythroughRecorder {
  if (!defaultRecorder) {
    defaultRecorder = new PlaythroughRecorder();
  }
  return defaultRecorder;
}

/**
 * Set the default playthrough recorder instance
 */
export function setPlaythroughRecorder(recorder: PlaythroughRecorder): void {
  defaultRecorder = recorder;
}
