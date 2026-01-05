/**
 * Analytics Backends - Export destinations for analytics events
 */

import type { AnalyticsEvent, AnalyticsBackend, Logger } from './types';

/**
 * Console backend - logs events to console (for development)
 */
export class ConsoleBackend implements AnalyticsBackend {
  name = 'console';
  enabled = true;
  private log?: Logger;

  constructor(logger?: Logger) {
    this.log = logger;
  }

  exportBatch(
    events: AnalyticsEvent[],
    callback: (success: boolean, error?: string) => void
  ): void {
    try {
      for (const event of events) {
        const msg = `[Analytics] ${event.category}.${event.action}`;
        if (this.log) {
          this.log.debug(msg, event);
        } else {
          console.log(msg, event);
        }
      }
      callback(true);
    } catch (error) {
      callback(false, String(error));
    }
  }
}

/**
 * Memory backend - stores events in memory (for testing)
 */
export class MemoryBackend implements AnalyticsBackend {
  name = 'memory';
  enabled = true;
  private events: AnalyticsEvent[] = [];

  exportBatch(
    events: AnalyticsEvent[],
    callback: (success: boolean, error?: string) => void
  ): void {
    this.events.push(...events);
    callback(true);
  }

  /**
   * Get stored events
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Clear stored events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Find events by category
   */
  findByCategory(category: string): AnalyticsEvent[] {
    return this.events.filter((e) => e.category === category);
  }

  /**
   * Find events by action
   */
  findByAction(action: string): AnalyticsEvent[] {
    return this.events.filter((e) => e.action === action);
  }

  /**
   * Find events by category and action
   */
  findByType(category: string, action: string): AnalyticsEvent[] {
    return this.events.filter((e) => e.category === category && e.action === action);
  }
}

/**
 * HTTP backend configuration
 */
export interface HttpBackendConfig {
  endpoint: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  timeout?: number;
  retryOnFail?: boolean;
}

/**
 * HTTP backend - sends events to HTTP endpoint
 */
export class HttpBackend implements AnalyticsBackend {
  name = 'http';
  enabled = true;
  private config: Required<HttpBackendConfig>;
  private log?: Logger;

  constructor(config: HttpBackendConfig, logger?: Logger) {
    this.config = {
      endpoint: config.endpoint,
      method: config.method || 'POST',
      headers: config.headers || { 'Content-Type': 'application/json' },
      timeout: config.timeout || 30000,
      retryOnFail: config.retryOnFail ?? true,
    };
    this.log = logger;
  }

  initialize(): void {
    this.log?.debug(`HttpBackend initialized: ${this.config.endpoint}`);
  }

  shutdown(): void {
    this.log?.debug('HttpBackend shutdown');
  }

  exportBatch(
    events: AnalyticsEvent[],
    callback: (success: boolean, error?: string) => void
  ): void {
    if (typeof fetch === 'undefined') {
      this.log?.warn('fetch not available');
      callback(false, 'fetch not available');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    fetch(this.config.endpoint, {
      method: this.config.method,
      headers: this.config.headers,
      body: JSON.stringify({ events }),
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (response.ok) {
          callback(true);
        } else {
          callback(false, `HTTP ${response.status}: ${response.statusText}`);
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        callback(false, String(error));
      });
  }
}

/**
 * Callback backend - calls custom function with events
 */
export class CallbackBackend implements AnalyticsBackend {
  name = 'callback';
  enabled = true;
  private callback: (events: AnalyticsEvent[]) => Promise<void> | void;

  constructor(
    callback: (events: AnalyticsEvent[]) => Promise<void> | void,
    name?: string
  ) {
    this.callback = callback;
    if (name) {
      this.name = name;
    }
  }

  exportBatch(
    events: AnalyticsEvent[],
    callback: (success: boolean, error?: string) => void
  ): void {
    try {
      const result = this.callback(events);
      if (result && typeof result.then === 'function') {
        result
          .then(() => callback(true))
          .catch((error) => callback(false, String(error)));
      } else {
        callback(true);
      }
    } catch (error) {
      callback(false, String(error));
    }
  }
}

/**
 * Null backend - discards all events (for disabled/development)
 */
export class NullBackend implements AnalyticsBackend {
  name = 'null';
  enabled = true;
  private stats = { eventsExported: 0, batchesExported: 0 };

  exportBatch(
    events: AnalyticsEvent[],
    callback: (success: boolean, error?: string) => void
  ): void {
    this.stats.eventsExported += events.length;
    this.stats.batchesExported += 1;
    callback(true);
  }

  /**
   * Get export statistics
   */
  getStats(): { eventsExported: number; batchesExported: number } {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { eventsExported: 0, batchesExported: 0 };
  }
}

/**
 * LocalStorage backend configuration
 */
export interface LocalStorageBackendConfig {
  storageKey?: string;
  maxEvents?: number;
  storage?: Storage;
}

/**
 * LocalStorage backend - persists events to browser localStorage
 */
export class LocalStorageBackend implements AnalyticsBackend {
  name = 'local-storage';
  enabled = true;
  private config: Required<Omit<LocalStorageBackendConfig, 'storage'>> & { storage?: Storage };
  private events: AnalyticsEvent[] = [];
  private stats = { eventsExported: 0, batchesExported: 0 };
  private log?: Logger;

  constructor(config?: LocalStorageBackendConfig, logger?: Logger) {
    this.config = {
      storageKey: config?.storageKey || 'whisker_analytics_events',
      maxEvents: config?.maxEvents || 10000,
      storage: config?.storage,
    };
    this.log = logger;
  }

  initialize(): void {
    // Try to load existing events from storage
    const storage = this.config.storage || this.getLocalStorage();
    if (storage) {
      try {
        const stored = storage.getItem(this.config.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.events = parsed;
          }
        }
      } catch (error) {
        this.log?.warn('Failed to load stored events', error);
      }
    }
    this.log?.debug(`LocalStorageBackend initialized with ${this.events.length} stored events`);
  }

  shutdown(): void {
    this.persistEvents();
    this.log?.debug('LocalStorageBackend shutdown');
  }

  private getLocalStorage(): Storage | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    return null;
  }

  private persistEvents(): void {
    const storage = this.config.storage || this.getLocalStorage();
    if (storage) {
      try {
        storage.setItem(this.config.storageKey, JSON.stringify(this.events));
      } catch (error) {
        this.log?.warn('Failed to persist events', error);
      }
    }
  }

  exportBatch(
    events: AnalyticsEvent[],
    callback: (success: boolean, error?: string) => void
  ): void {
    try {
      // Add events to storage
      this.events.push(...events);

      // Limit storage size
      while (this.events.length > this.config.maxEvents) {
        this.events.shift();
      }

      // Persist to storage
      this.persistEvents();

      this.stats.eventsExported += events.length;
      this.stats.batchesExported += 1;
      callback(true);
    } catch (error) {
      callback(false, String(error));
    }
  }

  /**
   * Get stored events
   */
  getStoredEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Clear stored events
   */
  clearStoredEvents(): void {
    this.events = [];
    const storage = this.config.storage || this.getLocalStorage();
    if (storage) {
      try {
        storage.removeItem(this.config.storageKey);
      } catch (error) {
        this.log?.warn('Failed to clear stored events', error);
      }
    }
  }

  /**
   * Get export statistics
   */
  getStats(): { eventsExported: number; batchesExported: number; storedEvents: number } {
    return {
      ...this.stats,
      storedEvents: this.events.length,
    };
  }
}

/**
 * Google Analytics 4 backend configuration
 */
export interface GoogleAnalytics4BackendConfig {
  measurementId: string;
  apiSecret: string;
  batchSize?: number;
  debug?: boolean;
}

/**
 * Google Analytics 4 backend - sends events to GA4 Measurement Protocol
 */
export class GoogleAnalytics4Backend implements AnalyticsBackend {
  name = 'google-analytics';
  enabled = true;
  private config: Required<GoogleAnalytics4BackendConfig>;
  private endpoint: string;
  private stats = { eventsExported: 0, batchesExported: 0, failedBatches: 0 };
  private log?: Logger;

  constructor(config: GoogleAnalytics4BackendConfig, logger?: Logger) {
    this.config = {
      measurementId: config.measurementId,
      apiSecret: config.apiSecret,
      batchSize: config.batchSize || 25, // GA4 recommends max 25 events per request
      debug: config.debug || false,
    };

    // Build endpoint URL
    const baseUrl = this.config.debug
      ? 'https://www.google-analytics.com/debug/mp/collect'
      : 'https://www.google-analytics.com/mp/collect';
    this.endpoint = `${baseUrl}?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`;

    this.log = logger;
  }

  initialize(): void {
    this.log?.debug(`GoogleAnalytics4Backend initialized: ${this.config.measurementId}`);
  }

  shutdown(): void {
    this.log?.debug('GoogleAnalytics4Backend shutdown');
  }

  /**
   * Convert whisker event to GA4 event format
   */
  private convertToGA4Event(event: AnalyticsEvent): {
    name: string;
    params: Record<string, string | number | boolean>;
  } {
    // Create GA4 event name from category and action
    const name = `${event.category}_${event.action}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Build params
    const params: Record<string, string | number | boolean> = {
      engagement_time_msec: 100, // Required by GA4
    };

    // Add session and story IDs if available
    if (event.sessionId) {
      params.session_id = event.sessionId;
    }
    if (event.storyId) {
      params.story_id = event.storyId;
    }

    // Add metadata as params (sanitize keys for GA4)
    if (event.metadata) {
      for (const [key, value] of Object.entries(event.metadata)) {
        // GA4 param names must be alphanumeric with underscores
        const paramName = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          params[paramName] = value;
        }
      }
    }

    return { name, params };
  }

  exportBatch(
    events: AnalyticsEvent[],
    callback: (success: boolean, error?: string) => void
  ): void {
    if (typeof fetch === 'undefined') {
      this.stats.failedBatches += 1;
      callback(false, 'fetch not available');
      return;
    }

    // Convert events to GA4 format
    const ga4Events = events.map((e) => this.convertToGA4Event(e));

    if (ga4Events.length === 0) {
      callback(true);
      return;
    }

    // Build GA4 payload
    const payload: {
      client_id: string;
      user_id?: string;
      events: { name: string; params: Record<string, string | number | boolean> }[];
    } = {
      client_id: events[0].sessionId || 'unknown',
      events: ga4Events,
    };

    // Add user_id if available
    if (events[0].userId) {
      payload.user_id = events[0].userId;
    }

    fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (response.ok || response.status === 204) {
          this.stats.eventsExported += events.length;
          this.stats.batchesExported += 1;
          callback(true);
        } else {
          this.stats.failedBatches += 1;
          callback(false, `HTTP ${response.status}: ${response.statusText}`);
        }
      })
      .catch((error) => {
        this.stats.failedBatches += 1;
        callback(false, String(error));
      });
  }

  /**
   * Get export statistics
   */
  getStats(): { eventsExported: number; batchesExported: number; failedBatches: number } {
    return { ...this.stats };
  }

  /**
   * Test backend configuration
   */
  test(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.config.measurementId) {
      errors.push('Missing measurementId');
    }
    if (!this.config.apiSecret) {
      errors.push('Missing apiSecret');
    }
    return { valid: errors.length === 0, errors };
  }
}

/**
 * Backend registry for managing multiple backends
 */
export class BackendRegistry {
  private backends: Map<string, AnalyticsBackend> = new Map();
  private log?: Logger;

  constructor(logger?: Logger) {
    this.log = logger;
  }

  /**
   * Factory method
   */
  static create(logger?: Logger): BackendRegistry {
    return new BackendRegistry(logger);
  }

  /**
   * Register a backend
   */
  register(backend: AnalyticsBackend): void {
    this.backends.set(backend.name, backend);
    this.log?.debug(`Registered backend: ${backend.name}`);
  }

  /**
   * Unregister a backend
   */
  unregister(name: string): void {
    const backend = this.backends.get(name);
    if (backend) {
      backend.shutdown?.();
      this.backends.delete(name);
      this.log?.debug(`Unregistered backend: ${name}`);
    }
  }

  /**
   * Get a backend by name
   */
  get(name: string): AnalyticsBackend | undefined {
    return this.backends.get(name);
  }

  /**
   * Get all backends
   */
  getAll(): AnalyticsBackend[] {
    return Array.from(this.backends.values());
  }

  /**
   * Get active (enabled) backends
   */
  getActive(): AnalyticsBackend[] {
    return this.getAll().filter((b) => b.enabled);
  }

  /**
   * Enable a backend
   */
  enable(name: string): void {
    const backend = this.backends.get(name);
    if (backend) {
      backend.enabled = true;
    }
  }

  /**
   * Disable a backend
   */
  disable(name: string): void {
    const backend = this.backends.get(name);
    if (backend) {
      backend.enabled = false;
    }
  }

  /**
   * Initialize all backends
   */
  initializeAll(): void {
    for (const backend of Array.from(this.backends.values())) {
      backend.initialize?.();
    }
  }

  /**
   * Shutdown all backends
   */
  shutdownAll(): void {
    for (const backend of Array.from(this.backends.values())) {
      backend.shutdown?.();
    }
  }

  /**
   * Clear all backends
   */
  clear(): void {
    this.shutdownAll();
    this.backends.clear();
  }
}
