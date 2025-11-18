# @writewhisker/storage

Framework-agnostic storage layer for Whisker interactive fiction.

## Features

- **Multiple Backends**: IndexedDB, localStorage, and extensible to filesystem, cloud, and database storage
- **Event-Driven**: Emits events for all storage operations, enabling reactive UIs
- **Framework Agnostic**: Works with any UI framework (Svelte, React, Vue, etc.)
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Async/Await**: Modern async API for all operations
- **Well-Tested**: 175+ unit tests with 100% coverage of public APIs
- **Migration Tools**: Utilities for migrating legacy Whisker Editor data

## Installation

```bash
pnpm add @writewhisker/storage
```

## Quick Start

```typescript
import { createIndexedDBStorage, StorageEventType } from '@writewhisker/storage';

// Create storage service with IndexedDB backend
const storage = createIndexedDBStorage();

// Initialize
await storage.initialize();

// Listen to events
storage.on(StorageEventType.STORY_SAVED, (event) => {
  console.log('Story saved:', event.storyId, event.title);
});

// Save a story
await storage.saveStory('story-1', {
  id: 'story-1',
  title: 'My First Story',
  passages: [],
  // ... other story data
});

// Load a story
const story = await storage.loadStory('story-1');

// List all stories
const stories = await storage.listStories();
```

##  Core Services

###  PreferenceManager

Framework-agnostic preference management with caching:

```typescript
import { PreferenceManager, IndexedDBBackend } from '@writewhisker/storage';

const backend = new IndexedDBBackend();
await backend.initialize();

const prefs = new PreferenceManager(backend);

// Get preference with default
const theme = await prefs.get('theme', 'light', 'user');

// Set preference
await prefs.set('theme', 'dark', 'user');

// Delete preference
await prefs.delete('theme', 'user');

// List all keys for a scope
const keys = await prefs.list('user');
```

**Preference Scopes:**
- `global`: Application-wide preferences
- `user`: User-specific preferences
- `project`: Project/story-specific preferences

### SyncQueueService

Manages a queue of pending sync operations for offline-first apps:

```typescript
import { SyncQueueService, IndexedDBBackend } from '@writewhisker/storage';

const backend = new IndexedDBBackend();
const queue = new SyncQueueService(backend);

await queue.initialize();

// Add operation to queue
await queue.enqueue({
  operation: 'save',
  storyId: 'my-story',
  data: storyData,
});

// Get pending operations
const pending = await queue.getQueue();

// Process and remove
for (const item of pending) {
  try {
    // ... perform sync
    await queue.dequeue(item.id);
  } catch (error) {
    await queue.incrementRetry(item.id, error.message);
  }
}
```

## Backends

### IndexedDB (Recommended for browsers)

Best for browser environments. No size limitations (unlike localStorage).

```typescript
import { IndexedDBBackend, StorageService } from '@writewhisker/storage';

const storage = new StorageService(new IndexedDBBackend());
await storage.initialize();
```

### localStorage (Simple alternative)

Simple but has ~5-10MB size limit.

```typescript
import { LocalStorageBackend, StorageService } from '@writewhisker/storage';

const storage = new StorageService(new LocalStorageBackend());
await storage.initialize();
```

## Events

The storage service emits events for all operations:

- `STORY_SAVED` - When a story is saved
- `STORY_LOADED` - When a story is loaded
- `STORY_DELETED` - When a story is deleted
- `STORY_CREATED` - When a new story is created
- `STORY_UPDATED` - When an existing story is updated
- `METADATA_UPDATED` - When story metadata is updated
- `STORAGE_CLEARED` - When all storage is cleared
- `ERROR` - When an error occurs

```typescript
storage.on(StorageEventType.STORY_SAVED, (event) => {
  console.log('Story saved:', event);
});

storage.on(StorageEventType.ERROR, (event) => {
  console.error('Storage error:', event.error, event.operation);
});
```

## API Reference

### StorageService

#### Methods

- `initialize(): Promise<void>` - Initialize the backend
- `saveStory(id: string, data: StoryData, isNew?: boolean): Promise<void>` - Save a story
- `loadStory(id: string): Promise<StoryData>` - Load a story
- `deleteStory(id: string): Promise<void>` - Delete a story
- `listStories(): Promise<StorageMetadata[]>` - List all stories
- `hasStory(id: string): Promise<boolean>` - Check if story exists
- `getMetadata(id: string): Promise<StorageMetadata>` - Get story metadata
- `updateMetadata(id: string, metadata: Partial<StorageMetadata>): Promise<void>` - Update metadata
- `exportStory(id: string): Promise<Blob>` - Export story as JSON blob
- `importStory(data: Blob | File): Promise<string>` - Import story from file
- `getStorageUsage(): Promise<number>` - Get storage usage in bytes
- `clear(): Promise<void>` - Clear all storage

## Custom Backends

Implement the `IStorageBackend` interface to create custom backends:

```typescript
import type { IStorageBackend, StorageMetadata } from '@writewhisker/storage';
import type { StoryData } from '@writewhisker/core-ts';

class MyCustomBackend implements IStorageBackend {
  async initialize(): Promise<void> {
    // Initialize your backend
  }

  async saveStory(id: string, data: StoryData): Promise<void> {
    // Save implementation
  }

  // Implement other required methods...
}

const storage = new StorageService(new MyCustomBackend());
```

## Data Migration

### Migrating from Legacy Whisker Editor

The storage package includes `LegacyDataMigration` for migrating data from the old Whisker Editor format.

```typescript
import { LegacyDataMigration } from '@writewhisker/storage';

const migration = new LegacyDataMigration();

// Check if migration is needed
if (await migration.needsMigration()) {
  console.log('Starting migration...');

  const result = await migration.migrate();

  console.log(`✓ Migrated ${result.storiesMigrated} stories`);
  console.log(`✓ Migrated ${result.preferencesMigrated} preferences`);

  if (result.errors.length > 0) {
    console.error('Migration errors:', result.errors);
  }
}
```

### Migration Order

When migrating from legacy Whisker Editor, run migrations in this order:

1. **LegacyDataMigration** (in `@writewhisker/storage`)
   - Migrates IndexedDB `whisker-data` database to new format
   - Handles story data and core preferences
   - **Run FIRST**

2. **StorageMigration** (in `@writewhisker/editor-base`)
   - Migrates localStorage preferences to new format
   - Handles UI preferences, theme, view settings
   - **Run SECOND** (after LegacyDataMigration)

3. **ModernStoryMigration** (in `@writewhisker/editor-base`)
   - Migrates any remaining localStorage story data
   - Handles story format upgrades
   - **Run THIRD** (after StorageMigration)

### Migration API

```typescript
interface MigrationResult {
  success: boolean;
  storiesMigrated: number;
  preferencesMigrated: number;
  errors: Array<{ key: string; error: string }>;
}

// Check if migration is needed
needsMigration(): Promise<boolean>

// Perform migration
migrate(): Promise<MigrationResult>

// Clear migrated data from old storage
clearLegacyData(): Promise<void>
```

## Testing

The package is extensively tested with 175+ unit tests.

### Running Tests

```bash
# Run all tests
pnpm --filter @writewhisker/storage test

# Run with coverage
pnpm --filter @writewhisker/storage test:coverage

# Run in watch mode
pnpm --filter @writewhisker/storage test:watch
```

### Test Coverage

| Component | Tests | Coverage |
|-----------|-------|----------|
| IndexedDBBackend | 43 | 100% |
| LocalStorageBackend | 29 | 100% |
| PreferenceManager | 56 | 100% |
| SyncQueueService | 34 | 100% |
| LegacyDataMigration | 13 | 100% |
| **Total** | **175** | **100%** |

## Architecture

### IStorageBackend vs IStorageAdapter

- **IStorageBackend** (in `@writewhisker/storage`): Low-level storage interface
  - Framework-agnostic
  - Minimal API surface
  - Easy to test and mock
  - Required methods: `initialize`, `saveStory`, `loadStory`, `deleteStory`, `listStories`
  - Optional methods: `savePreference`, `loadPreference`, `addToSyncQueue`, etc.

- **IStorageAdapter** (in `@writewhisker/editor-base`): High-level application interface
  - Editor-specific operations
  - Includes UI concerns (project filtering, search, etc.)
  - Built on top of IStorageBackend

### Why Optional Methods?

Backend methods like `savePreference` are optional because:

1. Not all backends support all features
2. Allows gradual implementation
3. Clear separation of core vs. extended functionality
4. Better type safety (TypeScript knows which methods exist)

## License

MIT
