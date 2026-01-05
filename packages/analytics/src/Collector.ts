/**
 * Analytics Collector - Event collection pipeline with queuing and batching
 */

import type {
  AnalyticsEvent,
  CollectorConfig,
  CollectorStats,
  TimerFunctions,
  AnalyticsBackend,
  EventMetadata,
  Logger,
  StorageAdapter,
} from './types';
import type { EventTaxonomy } from './EventTaxonomy';
import type { PrivacyFilter } from './PrivacyFilter';

/**
 * Deep copy object
 */
function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<CollectorConfig> = {
  enabled: true,
  batchSize: 50,
  flushInterval: 30000,
  maxQueueSize: 1000,
  maxRetries: 3,
  retryBackoff: 2,
  initialRetryDelay: 1000,
  persistQueue: false,
  queueStorageKey: 'whisker_analytics_queue',
  useSendBeacon: true,
  beaconEndpoint: '',
};

/**
 * Collector class
 */
export class Collector {
  private config: Required<CollectorConfig>;
  private log?: Logger;
  private storage?: StorageAdapter;

  private eventTaxonomy?: EventTaxonomy;
  private privacyFilter?: PrivacyFilter;
  private backends: AnalyticsBackend[] = [];

  private queue: AnalyticsEvent[] = [];
  private processing = false;
  private initialized = false;
  private _lastFlushTime = 0;
  private flushTimerId: unknown = null;
  private visibilityHandler?: () => void;
  private beforeUnloadHandler?: () => void;

  private timers: TimerFunctions = {
    setTimeout: (cb, delay) => setTimeout(cb, delay),
    clearTimeout: (id) => clearTimeout(id as number),
    setInterval: (cb, interval) => setInterval(cb, interval),
    clearInterval: (id) => clearInterval(id as number),
  };

  private stats: CollectorStats = {
    eventsTracked: 0,
    eventsQueued: 0,
    eventsExported: 0,
    eventsFiltered: 0,
    eventsFailed: 0,
    batchesExported: 0,
    batchesFailed: 0,
    queueSize: 0,
    queueLimit: 0,
    processing: false,
    lastFlushTime: 0,
  };

  // Session context
  private sessionId = '';
  private sessionStart = 0;
  private storyId = '';
  private storyVersion?: string;
  private storyTitle?: string;

  constructor(config?: CollectorConfig, logger?: Logger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log = logger;
    this.stats.queueLimit = this.config.maxQueueSize;
  }

  /**
   * Factory method
   */
  static create(config?: CollectorConfig, logger?: Logger): Collector {
    return new Collector(config, logger);
  }

  /**
   * Set dependencies
   */
  setDependencies(deps: {
    eventTaxonomy?: EventTaxonomy;
    privacyFilter?: PrivacyFilter;
    storage?: StorageAdapter;
  }): void {
    if (deps.eventTaxonomy) {
      this.eventTaxonomy = deps.eventTaxonomy;
    }
    if (deps.privacyFilter) {
      this.privacyFilter = deps.privacyFilter;
    }
    if (deps.storage) {
      this.storage = deps.storage;
    }
  }

  /**
   * Set storage adapter
   */
  setStorage(storage: StorageAdapter): void {
    this.storage = storage;
  }

  /**
   * Set timer functions
   */
  setTimers(timers: Partial<TimerFunctions>): void {
    this.timers = { ...this.timers, ...timers };
  }

  /**
   * Register a backend
   */
  registerBackend(backend: AnalyticsBackend): void {
    this.backends.push(backend);
    this.log?.debug(`Registered backend: ${backend.name}`);
  }

  /**
   * Get active backends
   */
  getActiveBackends(): AnalyticsBackend[] {
    return this.backends.filter((b) => b.enabled);
  }

  /**
   * Initialize collector
   */
  initialize(context?: {
    sessionId?: string;
    storyId?: string;
    storyVersion?: string;
    storyTitle?: string;
  }): void {
    if (this.initialized) {
      return;
    }

    if (context) {
      this.sessionId = context.sessionId || this.generateId();
      this.storyId = context.storyId || 'unknown';
      this.storyVersion = context.storyVersion;
      this.storyTitle = context.storyTitle;
    } else {
      this.sessionId = this.generateId();
      this.storyId = 'unknown';
    }

    this.sessionStart = Date.now();
    this._lastFlushTime = Date.now();

    // Load persisted queue if enabled
    if (this.config.persistQueue) {
      this.loadPersistedQueue();
    }

    // Setup page unload handlers
    this.setupUnloadHandlers();

    // Start periodic flush timer
    this.startFlushTimer();

    this.initialized = true;
    this.log?.debug('Collector initialized');
  }

  /**
   * Shutdown collector
   */
  shutdown(): void {
    this.stopFlushTimer();
    this.removeUnloadHandlers();
    this.flushSync();

    // Persist remaining queue if enabled
    if (this.config.persistQueue) {
      this.persistQueue();
    }

    this.initialized = false;
    this.log?.debug('Collector shutdown');
  }

  /**
   * Track an event
   */
  trackEvent(
    category: string,
    action: string,
    metadata?: EventMetadata
  ): { success: boolean; error?: string } {
    if (!this.config.enabled) {
      return { success: false, error: 'Analytics disabled' };
    }

    this.stats.eventsTracked++;

    // Build event
    const event: AnalyticsEvent = {
      category,
      action,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      sessionStart: this.sessionStart,
      storyId: this.storyId,
      storyVersion: this.storyVersion,
      storyTitle: this.storyTitle,
      metadata: metadata || {},
    };

    // Validate event if taxonomy available
    if (this.eventTaxonomy) {
      const validation = this.eventTaxonomy.validateEvent(event);
      if (!validation.valid) {
        this.log?.warn(`Invalid event: ${validation.errors.join(', ')}`);
        // Continue anyway for flexibility
      }
    }

    // Apply privacy filter if available
    let filteredEvent: AnalyticsEvent | null = event;
    if (this.privacyFilter) {
      filteredEvent = this.privacyFilter.apply(event);
      if (!filteredEvent) {
        this.stats.eventsFiltered++;
        return { success: true }; // Success, just filtered
      }
    }

    // Add to queue
    return this.enqueue(filteredEvent);
  }

  /**
   * Add event to queue
   */
  private enqueue(event: AnalyticsEvent): { success: boolean; error?: string } {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Drop oldest event
      this.queue.shift();
      this.stats.eventsFailed++;
    }

    this.queue.push(event);
    this.stats.eventsQueued++;
    this.stats.queueSize = this.queue.length;

    // Check if batch size reached
    if (this.queue.length >= this.config.batchSize) {
      this.triggerFlush('batch_size_reached');
    }

    return { success: true };
  }

  /**
   * Flush events to backends (async)
   */
  flush(_reason?: string): void {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    this.stats.processing = true;
    this._lastFlushTime = Date.now();

    // Create batch
    const batchSize = Math.min(this.queue.length, this.config.batchSize);
    const batch = this.queue.slice(0, batchSize);

    this.exportBatch(batch, 0, (success) => {
      this.processing = false;
      this.stats.processing = false;

      if (success) {
        // Remove exported events
        this.queue.splice(0, batch.length);
        this.stats.queueSize = this.queue.length;
        this.stats.eventsExported += batch.length;
        this.stats.batchesExported++;

        // If more events, schedule another flush
        if (this.queue.length > 0) {
          this.triggerFlush('remaining_events');
        }
      } else {
        this.stats.batchesFailed++;
      }
    });
  }

  /**
   * Flush synchronously (for shutdown)
   */
  flushSync(): void {
    if (this.queue.length === 0) {
      return;
    }

    const batch = [...this.queue];
    const backends = this.getActiveBackends();

    if (backends.length === 0) {
      return;
    }

    // Export synchronously to each backend
    for (const backend of backends) {
      backend.exportBatch(batch, () => {});
    }

    this.queue = [];
    this.stats.queueSize = 0;
    this.stats.eventsExported += batch.length;
    this.stats.batchesExported++;
  }

  /**
   * Export batch to backends with retry
   */
  private exportBatch(
    batch: AnalyticsEvent[],
    retryCount: number,
    callback: (success: boolean, error?: string) => void
  ): void {
    const backends = this.getActiveBackends();

    if (backends.length === 0) {
      callback(true);
      return;
    }

    let completedBackends = 0;
    let anySuccess = false;
    let lastError: string | undefined;

    for (const backend of backends) {
      backend.exportBatch(batch, (success, error) => {
        completedBackends++;

        if (success) {
          anySuccess = true;
        } else {
          lastError = error;
        }

        if (completedBackends >= backends.length) {
          if (anySuccess) {
            callback(true);
          } else if (retryCount < this.config.maxRetries) {
            // Retry with exponential backoff
            const delay =
              this.config.initialRetryDelay * Math.pow(this.config.retryBackoff, retryCount);

            this.timers.setTimeout(() => {
              this.exportBatch(batch, retryCount + 1, callback);
            }, delay);
          } else {
            this.stats.eventsFailed += batch.length;
            callback(false, lastError);
          }
        }
      });
    }
  }

  /**
   * Trigger flush async
   */
  private triggerFlush(reason: string): void {
    if (this.processing) {
      return;
    }

    this.timers.setTimeout(() => {
      this.flush(reason);
    }, 0);
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimerId) {
      return;
    }

    this.flushTimerId = this.timers.setInterval(() => {
      if (this.queue.length > 0) {
        this.triggerFlush('flush_interval');
      }
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimerId) {
      this.timers.clearInterval(this.flushTimerId);
      this.flushTimerId = null;
    }
  }

  /**
   * Persist queue to storage
   */
  private persistQueue(): void {
    if (!this.storage || !this.config.persistQueue) {
      return;
    }

    try {
      this.storage.set(this.config.queueStorageKey, this.queue);
      this.log?.debug(`Persisted ${this.queue.length} events to storage`);
    } catch (error) {
      this.log?.warn('Failed to persist queue', error);
    }
  }

  /**
   * Load persisted queue from storage
   */
  private loadPersistedQueue(): void {
    if (!this.storage || !this.config.persistQueue) {
      return;
    }

    try {
      const stored = this.storage.get<AnalyticsEvent[]>(this.config.queueStorageKey);
      if (stored && Array.isArray(stored)) {
        this.queue = stored;
        this.stats.queueSize = this.queue.length;
        this.log?.debug(`Loaded ${this.queue.length} events from storage`);

        // Clear stored queue after loading
        this.storage.remove(this.config.queueStorageKey);

        // Trigger flush if there are restored events
        if (this.queue.length > 0) {
          this.triggerFlush('queue_restored');
        }
      }
    } catch (error) {
      this.log?.warn('Failed to load persisted queue', error);
    }
  }

  /**
   * Setup page unload handlers
   */
  private setupUnloadHandlers(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Handle visibility change (tab hidden)
    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.handlePageHide();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Handle page unload
    this.beforeUnloadHandler = () => {
      this.handlePageHide();
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * Remove page unload handlers
   */
  private removeUnloadHandlers(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = undefined;
    }

    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = undefined;
    }
  }

  /**
   * Handle page hide/unload
   */
  private handlePageHide(): void {
    // Try sendBeacon first if enabled and endpoint configured
    if (this.config.useSendBeacon && this.config.beaconEndpoint && this.queue.length > 0) {
      this.flushWithBeacon();
    }

    // Persist remaining queue
    if (this.config.persistQueue) {
      this.persistQueue();
    }
  }

  /**
   * Flush queue using sendBeacon API
   */
  private flushWithBeacon(): void {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
      this.log?.debug('sendBeacon not available');
      return;
    }

    if (this.queue.length === 0 || !this.config.beaconEndpoint) {
      return;
    }

    try {
      const payload = JSON.stringify({ events: this.queue });
      const blob = new Blob([payload], { type: 'application/json' });
      const success = navigator.sendBeacon(this.config.beaconEndpoint, blob);

      if (success) {
        this.stats.eventsExported += this.queue.length;
        this.stats.batchesExported++;
        this.queue = [];
        this.stats.queueSize = 0;
        this.log?.debug('Events sent via sendBeacon');
      } else {
        this.log?.warn('sendBeacon returned false');
      }
    } catch (error) {
      this.log?.warn('Failed to send via sendBeacon', error);
    }
  }

  /**
   * Apply consent change to queued events (retroactive filtering)
   */
  applyConsentChange(): void {
    if (!this.privacyFilter || this.queue.length === 0) {
      return;
    }

    const originalLength = this.queue.length;
    const filteredQueue: AnalyticsEvent[] = [];

    for (const event of this.queue) {
      const filtered = this.privacyFilter.apply(event);
      if (filtered) {
        filteredQueue.push(filtered);
      }
    }

    const removedCount = originalLength - filteredQueue.length;
    if (removedCount > 0) {
      this.stats.eventsFiltered += removedCount;
      this.log?.debug(`Retroactively filtered ${removedCount} events from queue`);
    }

    this.queue = filteredQueue;
    this.stats.queueSize = this.queue.length;

    // Persist updated queue
    if (this.config.persistQueue) {
      this.persistQueue();
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get statistics
   */
  getStats(): CollectorStats {
    return {
      ...this.stats,
      queueSize: this.queue.length,
      processing: this.processing,
      lastFlushTime: this._lastFlushTime,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): Required<CollectorConfig> {
    return deepCopy(this.config);
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Set enabled state
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Update session context
   */
  setSessionContext(context: {
    sessionId?: string;
    storyId?: string;
    storyVersion?: string;
    storyTitle?: string;
  }): void {
    if (context.sessionId) this.sessionId = context.sessionId;
    if (context.storyId) this.storyId = context.storyId;
    if (context.storyVersion !== undefined) this.storyVersion = context.storyVersion;
    if (context.storyTitle !== undefined) this.storyTitle = context.storyTitle;
  }

  /**
   * Start new session
   */
  startNewSession(): string {
    this.sessionId = this.generateId();
    this.sessionStart = Date.now();
    return this.sessionId;
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.stopFlushTimer();
    this.removeUnloadHandlers();
    this.queue = [];
    this.processing = false;
    this.initialized = false;
    this._lastFlushTime = 0;
    this.stats = {
      eventsTracked: 0,
      eventsQueued: 0,
      eventsExported: 0,
      eventsFiltered: 0,
      eventsFailed: 0,
      batchesExported: 0,
      batchesFailed: 0,
      queueSize: 0,
      queueLimit: this.config.maxQueueSize,
      processing: false,
      lastFlushTime: 0,
    };
    this.backends = [];
  }

  /**
   * Get the current queue (for testing)
   */
  getQueue(): AnalyticsEvent[] {
    return [...this.queue];
  }
}
