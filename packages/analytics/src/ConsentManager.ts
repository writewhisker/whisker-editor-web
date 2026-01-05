/**
 * Consent Manager - User consent preferences and persistence
 */

import type {
  ConsentConfig,
  ConsentState,
  StorageAdapter,
  Logger,
} from './types';
import { ConsentLevel } from './types';
import { isValidConsentLevel, getConsentLevelName } from './Privacy';

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ConsentConfig> = {
  storageKey: 'whisker_consent',
  userIdStorageKey: 'whisker_user_id',
  requireConsentOnStart: true,
  defaultConsentLevel: ConsentLevel.NONE,
  consentVersion: '1.0.0',
};

/**
 * Consent Manager class
 */
export class ConsentManager {
  private config: Required<ConsentConfig>;
  private storage?: StorageAdapter;
  private log?: Logger;

  private consentLevel: ConsentLevel;
  private userId: string | null = null;
  private sessionId: string;
  private consentTimestamp: number | null = null;

  private initialized = false;

  constructor(config?: ConsentConfig, storage?: StorageAdapter, logger?: Logger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = storage;
    this.log = logger;

    this.consentLevel = this.config.defaultConsentLevel;
    this.sessionId = generateUUID();
  }

  /**
   * Factory method
   */
  static create(
    config?: ConsentConfig,
    storage?: StorageAdapter,
    logger?: Logger
  ): ConsentManager {
    return new ConsentManager(config, storage, logger);
  }

  /**
   * Initialize consent manager
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Load persisted consent
    this.loadConsent();

    // Initialize user ID if at FULL consent
    if (this.consentLevel >= ConsentLevel.FULL) {
      this.initializeUserId();
    }

    this.initialized = true;
    this.log?.debug('ConsentManager initialized');
  }

  /**
   * Get current consent level
   */
  getConsentLevel(): ConsentLevel {
    return this.consentLevel;
  }

  /**
   * Set consent level
   */
  setConsentLevel(level: ConsentLevel, _source?: string): boolean {
    if (!isValidConsentLevel(level)) {
      this.log?.warn(`Invalid consent level: ${level}`);
      return false;
    }

    const previousLevel = this.consentLevel;
    this.consentLevel = level;
    this.consentTimestamp = Date.now();

    // Persist consent
    this.saveConsent();

    // Handle user ID based on consent level
    if (level < ConsentLevel.FULL) {
      this.clearUserId();
    } else {
      this.initializeUserId();
    }

    this.log?.info(
      `Consent level changed: ${getConsentLevelName(previousLevel)} -> ${getConsentLevelName(level)}`
    );

    return true;
  }

  /**
   * Get user ID (only at FULL consent)
   */
  getUserId(): string | null {
    if (this.consentLevel >= ConsentLevel.FULL) {
      return this.userId;
    }
    return null;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Start new session
   */
  startNewSession(): string {
    this.sessionId = generateUUID();
    return this.sessionId;
  }

  /**
   * Get consent timestamp
   */
  getConsentTimestamp(): number | null {
    return this.consentTimestamp;
  }

  /**
   * Get consent version
   */
  getConsentVersion(): string {
    return this.config.consentVersion;
  }

  /**
   * Check if consent has been given
   */
  hasConsent(): boolean {
    return this.consentLevel > ConsentLevel.NONE;
  }

  /**
   * Check if consent dialog is required
   */
  requiresConsentDialog(): boolean {
    return this.config.requireConsentOnStart && this.consentTimestamp === null;
  }

  /**
   * Get consent state
   */
  getConsentState(): ConsentState {
    return {
      level: this.consentLevel,
      levelName: getConsentLevelName(this.consentLevel),
      timestamp: this.consentTimestamp,
      version: this.config.consentVersion,
      hasConsent: this.hasConsent(),
      userId: this.getUserId(),
      sessionId: this.sessionId,
    };
  }

  /**
   * Export user data
   */
  exportUserData(): Record<string, unknown> {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      consentLevel: this.consentLevel,
      consentTimestamp: this.consentTimestamp,
      consentVersion: this.config.consentVersion,
    };
  }

  /**
   * Revoke consent - sets consent to NONE and clears user data
   */
  revokeConsent(): void {
    this.userId = null;
    this.consentLevel = ConsentLevel.NONE;
    this.consentTimestamp = Date.now();

    if (this.storage) {
      this.storage.remove(this.config.userIdStorageKey);
    }

    this.saveConsent();
    this.log?.info('Consent revoked');
  }

  /**
   * Delete user data
   */
  deleteUserData(): boolean {
    this.userId = null;
    this.consentLevel = ConsentLevel.NONE;
    this.consentTimestamp = null;

    if (this.storage) {
      this.storage.remove(this.config.storageKey);
      this.storage.remove(this.config.userIdStorageKey);
    }

    this.log?.info('User data deleted');
    return true;
  }

  /**
   * Load consent from storage
   */
  private loadConsent(): void {
    if (!this.storage) {
      return;
    }

    const data = this.storage.get<{
      level: number;
      timestamp: number;
      version: string;
    }>(this.config.storageKey);

    if (data && typeof data === 'object') {
      if (isValidConsentLevel(data.level)) {
        this.consentLevel = data.level;
      }
      this.consentTimestamp = data.timestamp ?? null;
    }
  }

  /**
   * Save consent to storage
   */
  private saveConsent(): void {
    if (!this.storage) {
      return;
    }

    this.storage.set(this.config.storageKey, {
      level: this.consentLevel,
      timestamp: this.consentTimestamp,
      version: this.config.consentVersion,
    });
  }

  /**
   * Initialize user ID
   */
  private initializeUserId(): void {
    if (this.userId) {
      return;
    }

    // Try to load from storage
    if (this.storage) {
      const storedId = this.storage.get<string>(this.config.userIdStorageKey);
      if (storedId && typeof storedId === 'string') {
        this.userId = storedId;
        return;
      }
    }

    // Generate new user ID
    this.userId = generateUUID();

    // Persist user ID
    if (this.storage) {
      this.storage.set(this.config.userIdStorageKey, this.userId);
    }
  }

  /**
   * Clear user ID
   */
  private clearUserId(): void {
    this.userId = null;

    if (this.storage) {
      this.storage.remove(this.config.userIdStorageKey);
    }
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.consentLevel = this.config.defaultConsentLevel;
    this.userId = null;
    this.sessionId = generateUUID();
    this.consentTimestamp = null;
    this.initialized = false;
  }
}
