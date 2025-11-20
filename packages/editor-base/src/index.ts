/**
 * @writewhisker/editor-base
 *
 * Editor platform for Whisker.
 * Includes stores, components, services, export/import, and plugin system.
 *
 * This package acts as a central hub, re-exporting functionality from
 * specialized packages for convenient use in full editor applications.
 */

// ============================================================================
// CORE PACKAGES - Pure Re-exports
// ============================================================================

// Core story models and utilities
export * from '@writewhisker/core-ts';

// Storage adapters and persistence
// Note: Avoid duplicates with ./services/storage
export {
  // Core service
  StorageService,

  // Services
  SyncQueueService,
  PreferenceManager,

  // Backend implementations
  IndexedDBBackend,
  LocalStorageBackend,

  // Factory functions
  createIndexedDBStorage,
  createLocalStorageStorage,

  // Events
  StorageEventType,

  // Types (excluding duplicates)
  type IStorageBackend,
  type StorageMetadata,
  type PreferenceScope,
  type PreferenceEntry,
  type SyncQueueEntry,
  type GitHubAuthToken,
  type GitHubUser,
  type GitHubTokenData,

  // Event types
  type StorageEvent,
  type BaseStorageEvent,
  type StorySavedEvent,
  type StoryLoadedEvent,
  type StoryDeletedEvent,
  type StoryCreatedEvent,
  type StoryUpdatedEvent,
  type MetadataUpdatedEvent,
  type StorageClearedEvent,
  type StorageErrorEvent,

  // Migration from storage package (renamed to avoid conflict)
  LegacyDataMigration,
  type MigrationResult as StorageMigrationResult,
  type ErrorHandler,
} from '@writewhisker/storage';

// Import formats
export * from '@writewhisker/import';

// Export formats
// Note: Avoiding wildcard re-export to prevent duplicates with core-ts
// export * from '@writewhisker/export';

// Analytics and metrics
// Note: Avoiding wildcard re-export to prevent duplicates with core-ts
// export * from '@writewhisker/analytics';

// Audio system
// Note: Avoiding wildcard re-export to prevent duplicates with core-ts
// export * from '@writewhisker/audio';

// Scripting (Lua integration)
// Note: Avoiding wildcard re-export to prevent duplicates with core-ts
// export * from '@writewhisker/scripting';

// GitHub integration
// Note: Avoid duplicates with ./utils/errorHandling (RetryOptions, isOnline, withRetry)
export {
  // Auth stores
  githubToken,
  githubUser,
  isAuthenticated as isGitHubAuthenticated,

  // Auth functions
  initializeGitHubAuth,
  startGitHubAuth,
  handleGitHubCallback,
  getAccessToken,
  checkAuthenticated as checkGitHubAuthenticated,
  signOut as signOutGitHub,
  validateToken,

  // API functions
  listRepositories,
  createRepository,
  getFile,
  listFiles,
  saveFile,
  deleteFile,
  getDefaultBranch,
  hasWriteAccess,
  getCommitHistory,
  getFileAtCommit,

  // Types
  type GitHubAuthToken as GitHubAuthTokenType,  // Avoid conflict
  type GitHubUser as GitHubUserType,            // Avoid conflict
  type GitHubRepository,
  type GitHubFile,
  type GitHubCommit,
  type GitHubBranch,
  type CommitOptions,
  type CreateRepositoryOptions,
  type SyncStatus,
  type GitHubSyncMetadata,
  type GitHubError,
  GitHubApiError,

  // Excluding: RetryOptions, isOnline, withRetry (defined in ./utils/errorHandling)
} from '@writewhisker/github';

// ============================================================================
// EDITOR-SPECIFIC EXPORTS
// ============================================================================

// Editor stores (Svelte reactive state)
export * from './stores';

// Editor components (Svelte UI components)
export * from './components';

// Editor services (collaboration, etc.)
export * from './services';

// Editor utilities
export * from './utils';

// Plugin system
export * from './plugins';

// Editor-specific types
export * from './types';
