/**
 * Session Manager - Manages analytics sessions with timeout and cross-tab coordination
 */

import type { Logger, StorageAdapter } from './types';

/**
 * Session state
 */
export interface SessionState {
  sessionId: string;
  startTime: number;
  lastActivityTime: number;
  isActive: boolean;
  pageViews: number;
  events: number;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /** Session timeout in milliseconds (default: 30 minutes) */
  sessionTimeout?: number;
  /** Storage key for session data */
  storageKey?: string;
  /** Enable cross-tab session coordination */
  enableCrossTab?: boolean;
  /** Heartbeat interval for activity tracking (default: 5 seconds) */
  heartbeatInterval?: number;
}

/**
 * Session event types
 */
export const SESSION_EVENTS = {
  SESSION_START: 'session:start',
  SESSION_END: 'session:end',
  SESSION_TIMEOUT: 'session:timeout',
  SESSION_RESUME: 'session:resume',
} as const;

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

/**
 * SessionManager class
 * Manages session lifecycle, timeout, and cross-tab coordination
 */
export class SessionManager {
  private config: Required<SessionConfig>;
  private state: SessionState;
  private storage?: StorageAdapter;
  private log?: Logger;
  private heartbeatTimer?: unknown;
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();
  private storageEventHandler?: (event: StorageEvent) => void;

  constructor(config?: SessionConfig, storage?: StorageAdapter, logger?: Logger) {
    this.config = {
      sessionTimeout: config?.sessionTimeout || 30 * 60 * 1000, // 30 minutes
      storageKey: config?.storageKey || 'whisker_session',
      enableCrossTab: config?.enableCrossTab ?? true,
      heartbeatInterval: config?.heartbeatInterval || 5000, // 5 seconds
    };
    this.storage = storage;
    this.log = logger;

    // Initialize empty state
    this.state = {
      sessionId: '',
      startTime: 0,
      lastActivityTime: 0,
      isActive: false,
      pageViews: 0,
      events: 0,
    };
  }

  /**
   * Factory method
   */
  static create(config?: SessionConfig, storage?: StorageAdapter, logger?: Logger): SessionManager {
    return new SessionManager(config, storage, logger);
  }

  /**
   * Initialize session manager
   */
  initialize(): void {
    // Try to restore existing session
    const restored = this.restoreSession();

    if (restored) {
      // Check if session is still valid (not timed out)
      const now = Date.now();
      if (now - this.state.lastActivityTime > this.config.sessionTimeout) {
        // Session timed out, start new
        this.endSession('timeout');
        this.startSession();
      } else {
        // Resume session
        this.state.isActive = true;
        this.emit(SESSION_EVENTS.SESSION_RESUME, { sessionId: this.state.sessionId });
        this.log?.debug(`Session resumed: ${this.state.sessionId}`);
      }
    } else {
      // Start new session
      this.startSession();
    }

    // Start heartbeat
    this.startHeartbeat();

    // Setup cross-tab coordination
    if (this.config.enableCrossTab && typeof window !== 'undefined') {
      this.setupCrossTabCoordination();
    }
  }

  /**
   * Shutdown session manager
   */
  shutdown(): void {
    this.stopHeartbeat();
    this.removeCrossTabCoordination();
    this.persistSession();
  }

  /**
   * Start a new session
   */
  startSession(): void {
    const now = Date.now();
    this.state = {
      sessionId: generateSessionId(),
      startTime: now,
      lastActivityTime: now,
      isActive: true,
      pageViews: 1,
      events: 0,
    };
    this.persistSession();
    this.emit(SESSION_EVENTS.SESSION_START, { sessionId: this.state.sessionId });
    this.log?.debug(`Session started: ${this.state.sessionId}`);
  }

  /**
   * End current session
   */
  endSession(reason: 'timeout' | 'manual' | 'tab_close' = 'manual'): void {
    if (!this.state.isActive) return;

    this.state.isActive = false;
    this.emit(SESSION_EVENTS.SESSION_END, {
      sessionId: this.state.sessionId,
      reason,
      duration: Date.now() - this.state.startTime,
      pageViews: this.state.pageViews,
      events: this.state.events,
    });
    this.log?.debug(`Session ended: ${this.state.sessionId} (${reason})`);
    this.clearStoredSession();
  }

  /**
   * Record activity (extends session)
   */
  recordActivity(): void {
    if (!this.state.isActive) {
      // Session was inactive, start new one
      this.startSession();
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - this.state.lastActivityTime;

    // Check for timeout
    if (timeSinceLastActivity > this.config.sessionTimeout) {
      this.endSession('timeout');
      this.startSession();
      return;
    }

    this.state.lastActivityTime = now;
    this.persistSession();
  }

  /**
   * Record a page view
   */
  recordPageView(): void {
    this.recordActivity();
    this.state.pageViews++;
    this.persistSession();
  }

  /**
   * Record an event
   */
  recordEvent(): void {
    this.recordActivity();
    this.state.events++;
    this.persistSession();
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.state.sessionId;
  }

  /**
   * Get session state
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get session duration
   */
  getDuration(): number {
    if (!this.state.isActive) return 0;
    return Date.now() - this.state.startTime;
  }

  /**
   * Subscribe to session events
   */
  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit session event
   */
  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (error) {
          this.log?.warn(`Session event handler error: ${error}`);
        }
      }
    }
  }

  /**
   * Persist session to storage
   */
  private persistSession(): void {
    if (this.storage) {
      try {
        this.storage.set(this.config.storageKey, JSON.stringify(this.state));
      } catch (error) {
        this.log?.warn('Failed to persist session', error);
      }
    }
  }

  /**
   * Restore session from storage
   */
  private restoreSession(): boolean {
    if (this.storage) {
      try {
        const stored = this.storage.get<string>(this.config.storageKey);
        if (stored && typeof stored === 'string') {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.sessionId) {
            this.state = parsed;
            return true;
          }
        }
      } catch (error) {
        this.log?.warn('Failed to restore session', error);
      }
    }
    return false;
  }

  /**
   * Clear stored session
   */
  private clearStoredSession(): void {
    if (this.storage) {
      try {
        this.storage.remove(this.config.storageKey);
      } catch (error) {
        this.log?.warn('Failed to clear stored session', error);
      }
    }
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    if (typeof setInterval !== 'undefined') {
      this.heartbeatTimer = setInterval(() => {
        this.checkTimeout();
      }, this.config.heartbeatInterval);
    }
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer && typeof clearInterval !== 'undefined') {
      clearInterval(this.heartbeatTimer as number);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Check for session timeout
   */
  private checkTimeout(): void {
    if (!this.state.isActive) return;

    const now = Date.now();
    if (now - this.state.lastActivityTime > this.config.sessionTimeout) {
      this.emit(SESSION_EVENTS.SESSION_TIMEOUT, { sessionId: this.state.sessionId });
      this.endSession('timeout');
    }
  }

  /**
   * Setup cross-tab session coordination
   */
  private setupCrossTabCoordination(): void {
    if (typeof window !== 'undefined' && typeof window.addEventListener !== 'undefined') {
      this.storageEventHandler = (event: StorageEvent) => {
        if (event.key === this.config.storageKey && event.newValue) {
          try {
            const newState = JSON.parse(event.newValue);
            if (newState && newState.sessionId !== this.state.sessionId) {
              // Session changed in another tab, sync
              this.state = newState;
              this.log?.debug('Session synced from another tab');
            }
          } catch {
            // Ignore parse errors
          }
        }
      };
      window.addEventListener('storage', this.storageEventHandler);
    }
  }

  /**
   * Remove cross-tab coordination
   */
  private removeCrossTabCoordination(): void {
    if (typeof window !== 'undefined' && this.storageEventHandler) {
      window.removeEventListener('storage', this.storageEventHandler);
      this.storageEventHandler = undefined;
    }
  }

  /**
   * Reset session manager (for testing)
   */
  reset(): void {
    this.stopHeartbeat();
    this.removeCrossTabCoordination();
    this.state = {
      sessionId: '',
      startTime: 0,
      lastActivityTime: 0,
      isActive: false,
      pageViews: 0,
      events: 0,
    };
    this.clearStoredSession();
    this.listeners.clear();
  }
}
