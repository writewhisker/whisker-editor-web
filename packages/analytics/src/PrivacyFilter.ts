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
 * SHA-256 hash function (sync implementation for anonymization)
 * This is a JavaScript implementation of SHA-256 for environments where
 * crypto.subtle is not available synchronously.
 */
function sha256Sync(str: string): string {
  // K constants for SHA-256
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // Initial hash values
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  // Helper functions
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const ch = (x: number, y: number, z: number) => (x & y) ^ (~x & z);
  const maj = (x: number, y: number, z: number) => (x & y) ^ (x & z) ^ (y & z);
  const sigma0 = (x: number) => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
  const sigma1 = (x: number) => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
  const gamma0 = (x: number) => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
  const gamma1 = (x: number) => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);

  // Convert string to bytes
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  // Padding
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  // Append length (big-endian 64-bit)
  for (let i = 56; i >= 0; i -= 8) {
    bytes.push((bitLength >>> i) & 0xff);
  }

  // Process each 64-byte block
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const W: number[] = new Array(64);

    // Copy block into first 16 words
    for (let i = 0; i < 16; i++) {
      W[i] =
        (bytes[offset + i * 4] << 24) |
        (bytes[offset + i * 4 + 1] << 16) |
        (bytes[offset + i * 4 + 2] << 8) |
        bytes[offset + i * 4 + 3];
    }

    // Extend to 64 words
    for (let i = 16; i < 64; i++) {
      W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) >>> 0;
    }

    // Initialize working variables
    let [a, b, c, d, e, f, g, h] = H;

    // Main loop
    for (let i = 0; i < 64; i++) {
      const T1 = (h + sigma1(e) + ch(e, f, g) + K[i] + W[i]) >>> 0;
      const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + T1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (T1 + T2) >>> 0;
    }

    // Add to hash
    H = [
      (H[0] + a) >>> 0,
      (H[1] + b) >>> 0,
      (H[2] + c) >>> 0,
      (H[3] + d) >>> 0,
      (H[4] + e) >>> 0,
      (H[5] + f) >>> 0,
      (H[6] + g) >>> 0,
      (H[7] + h) >>> 0,
    ];
  }

  // Convert to hex string
  return H.map((n) => n.toString(16).padStart(8, '0')).join('');
}

/**
 * Async SHA-256 using Web Crypto API (when available)
 */
async function sha256Async(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback to sync implementation
  return sha256Sync(str);
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
   * Anonymize save name using SHA-256
   */
  private anonymizeSaveName(saveName: string): string {
    const hash = sha256Sync(saveName);
    // Use first 12 characters of hash for readability
    return `Save_${hash.substring(0, 12)}`;
  }

  /**
   * Hash a value using SHA-256 (sync)
   */
  hashValue(value: string): string {
    return sha256Sync(value);
  }

  /**
   * Hash a value using SHA-256 (async, uses Web Crypto when available)
   */
  async hashValueAsync(value: string): Promise<string> {
    return sha256Async(value);
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
