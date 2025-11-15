# @writewhisker/storage

Framework-agnostic storage layer with event-driven architecture for Whisker.

## Installation

```bash
npm install @writewhisker/storage
```

## Features

- **Event-Driven**: Emit events instead of directly updating state
- **Framework-Agnostic**: Works with any framework (React, Vue, Svelte, etc.)
- **Multiple Backends**: IndexedDB, localStorage, in-memory
- **TypeScript**: Full type safety
- **Extensible**: Easy to add custom backends

## Quick Start

```typescript
import { StorageService, IndexedDBBackend } from '@writewhisker/storage';

// Create storage with IndexedDB backend
const backend = new IndexedDBBackend('my-app');
const storage = new StorageService(backend);

// Listen to events
storage.on('data-saved', (key, data) => {
  console.log(`Saved ${key}:`, data);
});

// Save data
await storage.save('user', { name: 'Alice', age: 30 });

// Load data
const user = await storage.load('user');
```

## Available Backends

### IndexedDBBackend

Browser IndexedDB storage (recommended for large data).

```typescript
import { IndexedDBBackend } from '@writewhisker/storage';

const backend = new IndexedDBBackend('database-name');
```

### LocalStorageBackend

Browser localStorage (recommended for small data).

```typescript
import { LocalStorageBackend } from '@writewhisker/storage';

const backend = new LocalStorageBackend('app-prefix:');
```

### MemoryBackend

In-memory storage (recommended for testing).

```typescript
import { MemoryBackend } from '@writewhisker/storage';

const backend = new MemoryBackend();
```

## StorageService API

### Methods

```typescript
// Save data
await storage.save(key: string, data: any): Promise<void>

// Load data
const data = await storage.load(key: string): Promise<any | null>

// Delete data
await storage.delete(key: string): Promise<void>

// List all keys
const keys = await storage.list(): Promise<string[]>

// Check if key exists
const exists = await storage.exists(key: string): Promise<boolean>

// Get size (if supported)
const size = await storage.size(key: string): Promise<number | undefined>

// Batch operations
await storage.saveMany(entries: Record<string, any>): Promise<void>
const data = await storage.loadMany(keys: string[]): Promise<Record<string, any>>

// Clear all data
await storage.clear(): Promise<void>
```

### Events

```typescript
storage.on('data-saved', (key: string, data: any) => {
  // Called when data is saved
});

storage.on('data-loaded', (key: string, data: any) => {
  // Called when data is loaded
});

storage.on('data-deleted', (key: string) => {
  // Called when data is deleted
});

storage.on('error', (error: Error) => {
  // Called when an error occurs
});
```

## Framework Integration

### React

```typescript
import { useState, useEffect } from 'react';
import { StorageService, IndexedDBBackend } from '@writewhisker/storage';

const backend = new IndexedDBBackend('my-app');
const storage = new StorageService(backend);

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Load initial data
    storage.load('user').then(setUser);

    // Listen to changes
    const handler = (key, data) => {
      if (key === 'user') setUser(data);
    };
    storage.on('data-saved', handler);
    storage.on('data-loaded', handler);

    return () => {
      storage.off('data-saved', handler);
      storage.off('data-loaded', handler);
    };
  }, []);

  const saveUser = async (userData) => {
    await storage.save('user', userData);
  };

  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={() => saveUser({ name: 'Bob', age: 25 })}>
        Update User
      </button>
    </div>
  );
}
```

### Svelte

```typescript
import { writable } from 'svelte/store';
import { StorageService, IndexedDBBackend } from '@writewhisker/storage';

const backend = new IndexedDBBackend('my-app');
const storage = new StorageService(backend);

// Create Svelte store
const user = writable(null);

// Wire up events to store
storage.on('data-saved', (key, data) => {
  if (key === 'user') user.set(data);
});

storage.on('data-loaded', (key, data) => {
  if (key === 'user') user.set(data);
});

// Load initial data
storage.load('user');

export { storage, user };
```

```svelte
<script>
  import { user, storage } from './storage';

  async function updateUser() {
    await storage.save('user', { name: 'Charlie', age: 35 });
  }
</script>

<h1>{$user?.name}</h1>
<button on:click={updateUser}>Update User</button>
```

### Vue

```typescript
import { ref } from 'vue';
import { StorageService, IndexedDBBackend } from '@writewhisker/storage';

const backend = new IndexedDBBackend('my-app');
const storage = new StorageService(backend);

const user = ref(null);

// Wire up events
storage.on('data-saved', (key, data) => {
  if (key === 'user') user.value = data;
});

storage.on('data-loaded', (key, data) => {
  if (key === 'user') user.value = data;
});

// Load initial data
storage.load('user');

export { storage, user };
```

## Custom Backends

Implement the `IStorageBackend` interface:

```typescript
import type { IStorageBackend } from '@writewhisker/storage';

class MyCustomBackend implements IStorageBackend {
  async save(key: string, data: any): Promise<void> {
    // Your implementation
  }

  async load(key: string): Promise<any | null> {
    // Your implementation
  }

  async delete(key: string): Promise<void> {
    // Your implementation
  }

  async list(): Promise<string[]> {
    // Your implementation
  }

  async exists(key: string): Promise<boolean> {
    // Your implementation
  }
}

const backend = new MyCustomBackend();
const storage = new StorageService(backend);
```

## Testing

Use `MemoryBackend` for tests:

```typescript
import { StorageService, MemoryBackend } from '@writewhisker/storage';

describe('MyComponent', () => {
  let storage;

  beforeEach(() => {
    const backend = new MemoryBackend();
    storage = new StorageService(backend);
  });

  test('saves data', async () => {
    await storage.save('test', { value: 42 });
    const data = await storage.load('test');
    expect(data.value).toBe(42);
  });
});
```

## License

AGPL-3.0
