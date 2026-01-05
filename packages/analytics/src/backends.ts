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
