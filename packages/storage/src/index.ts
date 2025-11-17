/**
 * @writewhisker/storage
 * Framework-agnostic storage layer for Whisker interactive fiction
 */

// Core service
export { StorageService } from './StorageService.js';

// Interfaces
export type { IStorageBackend, StorageMetadata } from './interfaces/IStorageBackend.js';

// Backend implementations
export { IndexedDBBackend } from './backends/IndexedDBBackend.js';
export { LocalStorageBackend } from './backends/LocalStorageBackend.js';

// Events
export { StorageEventType } from './events/StorageEvents.js';
export type {
  StorageEvent,
  BaseStorageEvent,
  StorySavedEvent,
  StoryLoadedEvent,
  StoryDeletedEvent,
  StoryCreatedEvent,
  StoryUpdatedEvent,
  MetadataUpdatedEvent,
  StorageClearedEvent,
  StorageErrorEvent,
} from './events/StorageEvents.js';

// Extended storage types
export type {
  PreferenceScope,
  PreferenceEntry,
  SyncQueueEntry,
  GitHubAuthToken,
  GitHubUser,
  GitHubTokenData,
} from './types/ExtendedStorage.js';

// Migration utilities
export { LegacyDataMigration } from './migration/LegacyDataMigration.js';
export type { MigrationResult } from './migration/LegacyDataMigration.js';

// Convenience factory functions
import { StorageService } from './StorageService.js';
import { IndexedDBBackend } from './backends/IndexedDBBackend.js';
import { LocalStorageBackend } from './backends/LocalStorageBackend.js';

export function createIndexedDBStorage(): StorageService {
  return new StorageService(new IndexedDBBackend());
}

export function createLocalStorageStorage(): StorageService {
  return new StorageService(new LocalStorageBackend());
}
