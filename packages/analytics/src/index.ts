/**
 * @writewhisker/analytics
 * Analytics infrastructure - event collection, consent management, privacy filtering
 */

// Core types
export type {
  EventBus,
  Logger,
  AnalyticsDependencies,
  StorageAdapter,
  ConsentLevelInfo,
  ConsentState,
  ConsentConfig,
  EventCategory,
  EventMetadata,
  AnalyticsEvent,
  EventActions,
  EventCategories,
  MetadataFieldType,
  MetadataSchema,
  EventDefinition,
  CollectorConfig,
  CollectorStats,
  TimerFunctions,
  AnalyticsBackend,
  BackendConfig,
} from './types';

export { ConsentLevel } from './types';

// Privacy module
export {
  CONSENT_LEVEL_NAMES,
  CONSENT_LEVEL_DESCRIPTIONS,
  getConsentLevelName,
  getConsentLevelDescription,
  isValidConsentLevel,
  getAllConsentLevels,
  compareConsentLevels,
  meetsConsentLevel,
} from './Privacy';

// Consent Manager
export { ConsentManager } from './ConsentManager';

// Event Taxonomy
export {
  EventTaxonomy,
  getEventTypes,
  getCategories,
  eventTypeExists,
} from './EventTaxonomy';

// Privacy Filter
export { PrivacyFilter } from './PrivacyFilter';

// Collector
export { Collector } from './Collector';

// Backends
export {
  ConsoleBackend,
  MemoryBackend,
  HttpBackend,
  CallbackBackend,
  NullBackend,
  LocalStorageBackend,
  GoogleAnalytics4Backend,
  BackendRegistry,
} from './backends';
export type {
  HttpBackendConfig,
  LocalStorageBackendConfig,
  GoogleAnalytics4BackendConfig,
} from './backends';

// Session Manager
export { SessionManager, SESSION_EVENTS } from './SessionManager';
export type { SessionState, SessionConfig } from './SessionManager';

// Playthrough Recorder
export {
  PlaythroughRecorder,
  getPlaythroughRecorder,
  setPlaythroughRecorder,
} from './PlaythroughRecorder';
export type {
  PlaythroughStepData,
  PlaythroughData as PlaythroughRecordData,
  PlaythroughRecorderConfig,
  Playthrough,
} from './PlaythroughRecorder';

// Playthrough Analytics
export { PlaythroughAnalytics } from './PlaythroughAnalytics';
export type {
  PassageAnalytics,
  ChoiceAnalytics,
  PathAnalytics,
  PlaythroughAnalyticsData,
} from './PlaythroughAnalytics';

// Story Simulator
export { StorySimulator } from './StorySimulator';
export type {
  SimulatableStory,
  SimulatablePassage,
  SimulatableChoice,
  SimulationOptions,
  SimulationRun,
  SimulationResult,
} from './StorySimulator';

// Story Analytics
export { StoryAnalytics } from './StoryAnalytics';
export type { StoryAnalyticsOptions } from './StoryAnalytics';

// Story analytics types (from types.ts)
export type {
  StoryMetrics,
  AnalyticsIssue,
  PassageVisitData,
  PlaythroughData,
  AnalyticsReport,
} from './types';

// Import classes for factory function
import { ConsentManager } from './ConsentManager';
import { EventTaxonomy } from './EventTaxonomy';
import { PrivacyFilter } from './PrivacyFilter';
import { Collector } from './Collector';
import { BackendRegistry, ConsoleBackend, MemoryBackend } from './backends';
import type {
  ConsentConfig,
  CollectorConfig,
  StorageAdapter,
  Logger,
} from './types';

/**
 * Analytics system configuration
 */
export interface AnalyticsSystemConfig {
  consent?: ConsentConfig;
  collector?: CollectorConfig;
  enableConsoleBackend?: boolean;
  enableMemoryBackend?: boolean;
}

/**
 * Factory function to create a complete analytics system
 */
export function createAnalyticsSystem(
  config?: AnalyticsSystemConfig,
  deps?: { storage?: StorageAdapter; logger?: Logger }
): {
  consentManager: ConsentManager;
  eventTaxonomy: EventTaxonomy;
  privacyFilter: PrivacyFilter;
  collector: Collector;
  backendRegistry: BackendRegistry;
} {
  const logger = deps?.logger;
  const storage = deps?.storage;

  // Create components
  const consentManager = ConsentManager.create(config?.consent, storage, logger);
  const eventTaxonomy = EventTaxonomy.create();
  const privacyFilter = PrivacyFilter.create(consentManager);
  const collector = Collector.create(config?.collector, logger);
  const backendRegistry = BackendRegistry.create(logger);

  // Wire up dependencies
  collector.setDependencies({
    eventTaxonomy,
    privacyFilter,
  });

  // Register default backends
  if (config?.enableConsoleBackend) {
    const consoleBackend = new ConsoleBackend(logger);
    backendRegistry.register(consoleBackend);
    collector.registerBackend(consoleBackend);
  }

  if (config?.enableMemoryBackend) {
    const memoryBackend = new MemoryBackend();
    backendRegistry.register(memoryBackend);
    collector.registerBackend(memoryBackend);
  }

  // Initialize
  consentManager.initialize();

  return {
    consentManager,
    eventTaxonomy,
    privacyFilter,
    collector,
    backendRegistry,
  };
}

/**
 * Create a standalone consent manager
 */
export function createConsentManager(
  config?: ConsentConfig,
  storage?: StorageAdapter,
  logger?: Logger
): ConsentManager {
  const manager = ConsentManager.create(config, storage, logger);
  manager.initialize();
  return manager;
}

/**
 * Create a standalone collector
 */
export function createCollector(config?: CollectorConfig, logger?: Logger): Collector {
  return Collector.create(config, logger);
}

/**
 * Create a standalone event taxonomy
 */
export function createEventTaxonomy(): EventTaxonomy {
  return EventTaxonomy.create();
}

/**
 * Create a standalone privacy filter
 */
export function createPrivacyFilter(consentManager?: ConsentManager): PrivacyFilter {
  return PrivacyFilter.create(consentManager);
}

// Import SessionManager for factory function
import { SessionManager } from './SessionManager';
import type { SessionConfig } from './SessionManager';

/**
 * Create a standalone session manager
 */
export function createSessionManager(
  config?: SessionConfig,
  storage?: StorageAdapter,
  logger?: Logger
): SessionManager {
  const manager = SessionManager.create(config, storage, logger);
  manager.initialize();
  return manager;
}
