/**
 * Hot Module Replacement
 *
 * Hot reload functionality for Whisker Editor development.
 */

import type { Story, Passage } from '@writewhisker/story-models';

/**
 * HMR event types
 */
export type HMREventType = 'update' | 'add' | 'remove' | 'error' | 'connected' | 'disconnected';

/**
 * HMR event
 */
export interface HMREvent {
  type: HMREventType;
  path?: string;
  data?: any;
  timestamp: number;
}

/**
 * HMR client configuration
 */
export interface HMRClientConfig {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * HMR client
 */
export class HMRClient {
  private config: HMRClientConfig;
  private eventSource: EventSource | null = null;
  private listeners: Map<HMREventType, Set<(event: HMREvent) => void>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: HMRClientConfig) {
    this.config = {
      reconnect: true,
      reconnectDelay: 1000,
      ...config,
    };
  }

  /**
   * Connect to HMR server
   */
  public connect(): void {
    if (this.eventSource) {
      return;
    }

    this.eventSource = new EventSource(this.config.url);

    this.eventSource.addEventListener('open', () => {
      this.emit({
        type: 'connected',
        timestamp: Date.now(),
      });
    });

    this.eventSource.addEventListener('message', (e) => {
      try {
        const event: HMREvent = JSON.parse(e.data);
        this.handleEvent(event);
      } catch (error) {
        console.error('Failed to parse HMR event:', error);
      }
    });

    this.eventSource.addEventListener('error', () => {
      this.emit({
        type: 'disconnected',
        timestamp: Date.now(),
      });

      if (this.config.reconnect) {
        this.reconnect();
      }
    });
  }

  /**
   * Disconnect from HMR server
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Listen for HMR events
   */
  public on(type: HMREventType, listener: (event: HMREvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  public off(type: HMREventType, listener: (event: HMREvent) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Handle HMR event
   */
  private handleEvent(event: HMREvent): void {
    if (event.type === 'update' && this.config.onUpdate) {
      this.config.onUpdate(event.data);
    }

    if (event.type === 'error' && this.config.onError) {
      this.config.onError(new Error(event.data));
    }

    this.emit(event);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: HMREvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  /**
   * Reconnect to server
   */
  private reconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.disconnect();

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, this.config.reconnectDelay);
  }
}

/**
 * Create HMR client
 */
export function createHMRClient(config: HMRClientConfig): HMRClient {
  return new HMRClient(config);
}

/**
 * Module cache for hot reload
 */
export class ModuleCache {
  private modules: Map<string, any> = new Map();
  private dependencies: Map<string, Set<string>> = new Map();

  /**
   * Register a module
   */
  public register(id: string, module: any, deps: string[] = []): void {
    this.modules.set(id, module);
    this.dependencies.set(id, new Set(deps));
  }

  /**
   * Get a module
   */
  public get(id: string): any {
    return this.modules.get(id);
  }

  /**
   * Update a module
   */
  public update(id: string, module: any): void {
    this.modules.set(id, module);
  }

  /**
   * Invalidate a module and its dependents
   */
  public invalidate(id: string): Set<string> {
    const invalidated = new Set<string>();
    const queue = [id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (invalidated.has(current)) {
        continue;
      }

      invalidated.add(current);

      // Find modules that depend on this one
      for (const [moduleId, deps] of this.dependencies) {
        if (deps.has(current)) {
          queue.push(moduleId);
        }
      }
    }

    return invalidated;
  }

  /**
   * Clear cache
   */
  public clear(): void {
    this.modules.clear();
    this.dependencies.clear();
  }
}

/**
 * Story hot reload manager
 */
export class StoryHotReload {
  private story: Story;
  private cache: ModuleCache;
  private updateCallbacks: Set<(story: Story) => void> = new Set();

  constructor(story: Story) {
    this.story = story;
    this.cache = new ModuleCache();
  }

  /**
   * Update story
   */
  public updateStory(newStory: Story): void {
    const changes = this.detectChanges(this.story, newStory);

    // Apply changes
    this.story = newStory;

    // Invalidate affected modules
    for (const change of changes) {
      this.cache.invalidate(change.id);
    }

    // Notify listeners
    for (const callback of this.updateCallbacks) {
      callback(this.story);
    }
  }

  /**
   * Update passage
   */
  public updatePassage(passage: Passage): void {
    const existingPassage = this.story.getPassage(passage.id);

    if (existingPassage) {
      this.story.passages.set(passage.id, passage);
      this.cache.invalidate(passage.id);

      for (const callback of this.updateCallbacks) {
        callback(this.story);
      }
    }
  }

  /**
   * Add passage
   */
  public addPassage(passage: Passage): void {
    this.story.passages.set(passage.id, passage);

    for (const callback of this.updateCallbacks) {
      callback(this.story);
    }
  }

  /**
   * Remove passage
   */
  public removePassage(passageId: string): void {
    this.story.passages.delete(passageId);
    this.cache.invalidate(passageId);

    for (const callback of this.updateCallbacks) {
      callback(this.story);
    }
  }

  /**
   * On update callback
   */
  public onUpdate(callback: (story: Story) => void): void {
    this.updateCallbacks.add(callback);
  }

  /**
   * Get current story
   */
  public getStory(): Story {
    return this.story;
  }

  /**
   * Detect changes between stories
   */
  private detectChanges(oldStory: Story, newStory: Story): Array<{ id: string; type: 'update' | 'add' | 'remove' }> {
    const changes: Array<{ id: string; type: 'update' | 'add' | 'remove' }> = [];

    const oldPassages = oldStory.passages;
    const newPassages = newStory.passages;

    // Check for updates and removals
    for (const [id, oldPassage] of oldPassages) {
      const newPassage = newPassages.get(id);

      if (!newPassage) {
        changes.push({ id: id as string, type: 'remove' });
      } else if (JSON.stringify(oldPassage) !== JSON.stringify(newPassage)) {
        changes.push({ id: id as string, type: 'update' });
      }
    }

    // Check for additions
    for (const [id] of newPassages) {
      if (!oldPassages.has(id)) {
        changes.push({ id: id as string, type: 'add' });
      }
    }

    return changes;
  }
}

/**
 * Create story hot reload manager
 */
export function createStoryHotReload(story: Story): StoryHotReload {
  return new StoryHotReload(story);
}

/**
 * HMR runtime API
 */
export interface HMRRuntime {
  accept(callback?: () => void): void;
  decline(): void;
  dispose(callback: (data: any) => void): void;
  invalidate(): void;
  data: any;
}

/**
 * Create HMR runtime
 */
export function createHMRRuntime(): HMRRuntime {
  let acceptCallbacks: Array<() => void> = [];
  let disposeCallbacks: Array<(data: any) => void> = [];
  let declined = false;
  const data: any = {};

  return {
    accept(callback?: () => void) {
      declined = false;
      if (callback) {
        acceptCallbacks.push(callback);
      }
    },

    decline() {
      declined = true;
    },

    dispose(callback: (data: any) => void) {
      disposeCallbacks.push(callback);
    },

    invalidate() {
      // Trigger re-evaluation
      for (const callback of disposeCallbacks) {
        callback(data);
      }

      disposeCallbacks = [];
      acceptCallbacks = [];
    },

    data,
  };
}
