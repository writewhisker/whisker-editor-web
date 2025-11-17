# @writewhisker/storage

Framework-agnostic storage layer for Whisker interactive fiction.

## Features

- **Multiple Backends**: IndexedDB, localStorage, and extensible to filesystem, cloud, and database storage
- **Event-Driven**: Emits events for all storage operations, enabling reactive UIs
- **Framework Agnostic**: Works with any UI framework (Svelte, React, Vue, etc.)
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Async/Await**: Modern async API for all operations

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

## License

MIT
