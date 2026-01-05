/**
 * Privacy Filter - Consent-aware event filtering and PII removal
 */

import type { AnalyticsEvent, EventMetadata } from './types';
import { ConsentLevel } from './types';
import type { ConsentManager } from './ConsentManager';

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
 * Simple hash function (for anonymization, not cryptographic)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 31) + str.charCodeAt(i)) % 1000000;
  }
  return hash.toString();
}

/**
 * Deep copy object
 */
function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepCopy) as unknown as T;
  }
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    copy[key] = deepCopy(value);
  }
  return copy as T;
}

/**
 * Essential event whitelist (ESSENTIAL consent level)
 */
const ESSENTIAL_EVENTS: Set<string> = new Set([
  'error.script',
  'error.resource',
  'error.state',
  'save.create',
  'save.load',
]);

/**
 * PII field patterns
 */
const PII_FIELDS: string[] = [
  'userName',
  'userEmail',
  'userId',
  'ipAddress',
  'deviceId',
  'location',
  'gpsCoordinates',
  'saveName',
  'feedbackText',
  'customData',
];

/**
 * Essential metadata fields per event type
 */
const ESSENTIAL_METADATA: Record<string, string[]> = {
  'error.script': ['errorType', 'errorMessage', 'stackTrace', 'passageId', 'scriptLine', 'severity'],
  'error.resource': ['resourceType', 'resourceUrl', 'errorCode', 'retryCount'],
  'error.state': ['errorType', 'attemptedPassage', 'currentPassage', 'recoveryAction'],
  'save.create': ['saveId', 'currentPassage', 'autoSave'],
  'save.load': ['saveId', 'loadedPassage'],
};

/**
 * Allowed categories at ANALYTICS level
 */
const ANALYTICS_CATEGORIES: string[] = ['story', 'passage', 'choice', 'save', 'error'];

/**
 * Privacy Filter class
 */
export class PrivacyFilter {
  private consentManager?: ConsentManager;
  private currentSessionId: string | null = null;

  constructor(consentManager?: ConsentManager) {
    this.consentManager = consentManager;
  }

  /**
   * Factory method
   */
  static create(consentManager?: ConsentManager): PrivacyFilter {
    return new PrivacyFilter(consentManager);
  }

  /**
   * Set consent manager
   */
  setConsentManager(consentManager: ConsentManager): void {
    this.consentManager = consentManager;
  }

  /**
   * Get current consent level
   */
  private getConsentLevel(): ConsentLevel {
    if (this.consentManager) {
      return this.consentManager.getConsentLevel();
    }
    return ConsentLevel.NONE;
  }

  /**
   * Apply privacy filter to event
   */
  apply(event: AnalyticsEvent): AnalyticsEvent | null {
    const consentLevel = this.getConsentLevel();

    switch (consentLevel) {
      case ConsentLevel.NONE:
        return null;
      case ConsentLevel.ESSENTIAL:
        return this.filterEssential(event);
      case ConsentLevel.ANALYTICS:
        return this.filterAnalytics(event);
      case ConsentLevel.FULL:
        return this.filterFull(event);
      default:
        return null;
    }
  }

  /**
   * Copy base event fields
   */
  private copyEventBase(event: AnalyticsEvent): AnalyticsEvent {
    return {
      category: event.category,
      action: event.action,
      timestamp: event.timestamp,
      sessionId: event.sessionId,
      storyId: event.storyId,
      storyVersion: event.storyVersion,
      storyTitle: event.storyTitle,
      sessionStart: event.sessionStart,
    };
  }

  /**
   * Filter for ESSENTIAL consent level
   */
  private filterEssential(event: AnalyticsEvent): AnalyticsEvent | null {
    const eventType = `${event.category}.${event.action}`;

    // Check if event is in essential whitelist
    if (!ESSENTIAL_EVENTS.has(eventType)) {
      return null;
    }

    // Strip all non-essential metadata
    const filteredEvent = this.copyEventBase(event);
    filteredEvent.metadata = this.stripNonEssentialMetadata(event.metadata || {}, eventType);

    // Remove user ID
    delete filteredEvent.userId;

    return filteredEvent;
  }

  /**
   * Filter for ANALYTICS consent level
   */
  private filterAnalytics(event: AnalyticsEvent): AnalyticsEvent | null {
    // Check if category is allowed
    if (!ANALYTICS_CATEGORIES.includes(event.category)) {
      return null;
    }

    // Copy event
    const filteredEvent = this.copyEventBase(event);

    // Remove PII from metadata
    filteredEvent.metadata = this.removePII(event.metadata || {});

    // Remove persistent user ID
    delete filteredEvent.userId;

    // Use session-scoped ID
    filteredEvent.sessionId = this.getSessionScopedId();

    return filteredEvent;
  }

  /**
   * Filter for FULL consent level
   */
  private filterFull(event: AnalyticsEvent): AnalyticsEvent {
    const filteredEvent = this.copyEventBase(event);
    filteredEvent.metadata = deepCopy(event.metadata || {});

    // Add persistent user ID
    if (this.consentManager) {
      const userId = this.consentManager.getUserId();
      if (userId) {
        filteredEvent.userId = userId;
      }
    }

    return filteredEvent;
  }

  /**
   * Strip non-essential metadata
   */
  private stripNonEssentialMetadata(
    metadata: EventMetadata,
    eventType: string
  ): EventMetadata {
    const fields = ESSENTIAL_METADATA[eventType] || [];
    const stripped: EventMetadata = {};

    for (const field of fields) {
      if (metadata[field] !== undefined) {
        stripped[field] = metadata[field];
      }
    }

    return stripped;
  }

  /**
   * Remove PII from metadata
   */
  private removePII(metadata: EventMetadata): EventMetadata {
    const cleaned = deepCopy(metadata);

    // Anonymize save names
    if (typeof cleaned.saveName === 'string') {
      cleaned.saveName = this.anonymizeSaveName(cleaned.saveName);
    }

    // Redact feedback text
    if (metadata.feedbackText !== undefined) {
      cleaned.feedbackText = '[redacted]';
    }

    // Remove known PII fields
    for (const field of PII_FIELDS) {
      if (field !== 'saveName' && field !== 'feedbackText') {
        delete cleaned[field];
      }
    }

    return cleaned;
  }

  /**
   * Anonymize save name
   */
  private anonymizeSaveName(saveName: string): string {
    return `Save_${simpleHash(saveName)}`;
  }

  /**
   * Get session-scoped ID
   */
  private getSessionScopedId(): string {
    if (!this.currentSessionId) {
      this.currentSessionId = generateUUID();
    }
    return this.currentSessionId;
  }

  /**
   * Start new session
   */
  startNewSession(): string {
    this.currentSessionId = generateUUID();
    return this.currentSessionId;
  }

  /**
   * Apply consent change to queued events
   */
  applyConsentChangeToQueue(
    queue: AnalyticsEvent[],
    newConsentLevel: ConsentLevel
  ): AnalyticsEvent[] {
    const filteredQueue: AnalyticsEvent[] = [];

    // Create temporary mock consent manager
    const originalManager = this.consentManager;
    const mockManager = {
      getConsentLevel: () => newConsentLevel,
      getUserId: () => originalManager?.getUserId() ?? null,
    } as ConsentManager;

    this.consentManager = mockManager;

    for (const event of queue) {
      const filtered = this.apply(event);
      if (filtered) {
        filteredQueue.push(filtered);
      }
    }

    // Restore original
    this.consentManager = originalManager;

    return filteredQueue;
  }

  /**
   * Validate event for privacy compliance
   */
  validateCompliance(
    event: AnalyticsEvent,
    consentLevel: ConsentLevel
  ): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check for PII at lower consent levels
    if (consentLevel < ConsentLevel.FULL) {
      if (event.userId) {
        violations.push(`Persistent userId present at consent level ${consentLevel}`);
      }

      for (const field of PII_FIELDS) {
        if (event.metadata && event.metadata[field] !== undefined) {
          violations.push(`PII field '${field}' present at consent level ${consentLevel}`);
        }
      }
    }

    // Check event is allowed at consent level
    if (consentLevel === ConsentLevel.ESSENTIAL) {
      const eventType = `${event.category}.${event.action}`;
      if (!ESSENTIAL_EVENTS.has(eventType)) {
        violations.push(`Non-essential event '${eventType}' at ESSENTIAL consent level`);
      }
    }

    if (consentLevel === ConsentLevel.ANALYTICS) {
      if (!ANALYTICS_CATEGORIES.includes(event.category)) {
        violations.push(`Category '${event.category}' not allowed at ANALYTICS consent level`);
      }
    }

    return { compliant: violations.length === 0, violations };
  }

  /**
   * Check if event would be allowed at consent level
   */
  isEventAllowed(category: string, action: string, consentLevel: ConsentLevel): boolean {
    if (consentLevel === ConsentLevel.NONE) {
      return false;
    }

    if (consentLevel === ConsentLevel.ESSENTIAL) {
      const eventType = `${category}.${action}`;
      return ESSENTIAL_EVENTS.has(eventType);
    }

    if (consentLevel === ConsentLevel.ANALYTICS) {
      return ANALYTICS_CATEGORIES.includes(category);
    }

    // FULL allows everything
    return true;
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.currentSessionId = null;
    this.consentManager = undefined;
  }
}
