/**
 * Core types for analytics module
 */

/**
 * Event bus interface for decoupled communication
 */
export interface EventBus {
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (data: unknown) => void): () => void;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Dependencies container
 */
export interface AnalyticsDependencies {
  eventBus?: EventBus;
  logger?: Logger;
}

/**
 * Storage adapter for persistence
 */
export interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

/**
 * Consent levels
 */
export enum ConsentLevel {
  NONE = 0,      // No tracking whatsoever
  ESSENTIAL = 1, // Only critical technical events
  ANALYTICS = 2, // Behavioral analytics without user identification
  FULL = 3,      // Complete analytics with cross-session tracking
}

/**
 * Consent level info
 */
export interface ConsentLevelInfo {
  level: ConsentLevel;
  name: string;
  description: string;
}

/**
 * Consent state
 */
export interface ConsentState {
  level: ConsentLevel;
  levelName: string;
  timestamp: number | null;
  version: string;
  hasConsent: boolean;
  userId: string | null;
  sessionId: string;
}

/**
 * Consent manager configuration
 */
export interface ConsentConfig {
  storageKey?: string;
  userIdStorageKey?: string;
  requireConsentOnStart?: boolean;
  defaultConsentLevel?: ConsentLevel;
  consentVersion?: string;
}

/**
 * Event category
 */
export type EventCategory =
  | 'story'
  | 'passage'
  | 'choice'
  | 'save'
  | 'error'
  | 'user'
  | 'test'
  | string;

/**
 * Event metadata
 */
export type EventMetadata = Record<string, unknown>;

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  category: EventCategory;
  action: string;
  timestamp: number;
  sessionId: string;
  storyId: string;
  storyVersion?: string;
  storyTitle?: string;
  sessionStart?: number;
  userId?: string;
  metadata?: EventMetadata;
}

/**
 * Event taxonomy action list
 */
export type EventActions = string[];

/**
 * Event categories map
 */
export type EventCategories = Record<EventCategory, EventActions>;

/**
 * Metadata field type
 */
export type MetadataFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'table'
  | 'any'
  | 'string?'
  | 'number?'
  | 'boolean?'
  | 'table?'
  | 'any?';

/**
 * Metadata schema
 */
export type MetadataSchema = Record<string, MetadataFieldType>;

/**
 * Event definition for custom events
 */
export interface EventDefinition {
  category: string;
  actions: string[];
  metadataSchema?: MetadataSchema;
}

/**
 * Collector configuration
 */
export interface CollectorConfig {
  enabled?: boolean;
  batchSize?: number;
  flushInterval?: number;
  maxQueueSize?: number;
  maxRetries?: number;
  retryBackoff?: number;
  initialRetryDelay?: number;
  /** Enable queue persistence to localStorage */
  persistQueue?: boolean;
  /** Storage key for persisted queue */
  queueStorageKey?: string;
  /** Use sendBeacon API for page unload flush */
  useSendBeacon?: boolean;
  /** Endpoint for sendBeacon flush */
  beaconEndpoint?: string;
}

/**
 * Collector statistics
 */
export interface CollectorStats {
  eventsTracked: number;
  eventsQueued: number;
  eventsExported: number;
  eventsFiltered: number;
  eventsFailed: number;
  batchesExported: number;
  batchesFailed: number;
  queueSize: number;
  queueLimit: number;
  processing: boolean;
  lastFlushTime: number;
}

/**
 * Timer functions interface
 */
export interface TimerFunctions {
  setTimeout: (callback: () => void, delay: number) => unknown;
  clearTimeout: (id: unknown) => void;
  setInterval: (callback: () => void, interval: number) => unknown;
  clearInterval: (id: unknown) => void;
}

/**
 * Analytics backend interface
 */
export interface AnalyticsBackend {
  name: string;
  enabled: boolean;
  initialize?(config?: Record<string, unknown>): void;
  shutdown?(): void;
  exportBatch(events: AnalyticsEvent[], callback: (success: boolean, error?: string) => void): void;
}

/**
 * Backend registry configuration
 */
export interface BackendConfig {
  name: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

// ============================================================================
// Story Analytics Types (existing)
// ============================================================================

/**
 * Story metrics from structural analysis
 */
export interface StoryMetrics {
  // Basic counts
  totalPassages: number;
  totalChoices: number;
  totalVariables: number;

  // Structure metrics
  avgChoicesPerPassage: number;
  maxDepth: number; // Longest path from start
  maxBreadth: number; // Maximum branching factor

  // Complexity
  complexityScore: number; // 0-100
  estimatedReadingTime: number; // minutes

  // Reachability
  reachablePassages: number;
  unreachablePassages: number;
  deadEnds: number;

  // Warnings
  issues: AnalyticsIssue[];
}

/**
 * Analytics issue/warning
 */
export interface AnalyticsIssue {
  severity: 'error' | 'warning' | 'info';
  type: 'dead-end' | 'unreachable' | 'circular' | 'missing-choice' | 'broken-link';
  passageId?: string;
  passageName?: string;
  message: string;
  suggestion?: string;
}

/**
 * Passage visit data from simulation
 */
export interface PassageVisitData {
  passageId: string;
  passageName: string;
  visitCount: number;
  percentage: number; // % of simulations that visited
}

/**
 * Playthrough simulation data
 */
export interface PlaythroughData {
  totalSimulations: number;
  averagePathLength: number;
  mostVisitedPassages: PassageVisitData[];
  leastVisitedPassages: PassageVisitData[];
  criticalPath: string[]; // Passage IDs on critical path
  branchingFactor: number;
  playerAgency: number; // 0-1, how much choice matters
}

/**
 * Complete analytics report
 */
export interface AnalyticsReport {
  storyId: string;
  storyTitle: string;
  generatedAt: number;
  metrics: StoryMetrics;
  playthrough?: PlaythroughData;
}
