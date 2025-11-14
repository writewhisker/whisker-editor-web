# Store Adapter Pattern

**For SaaS application and External Integrations**

## Overview

The Store Adapter Pattern allows Whisker components to work with different state management systems without modification. This enables SaaS application to use Supabase, Redux, or any other state solution while reusing Whisker's UI components.

## Problem Solved

Whisker components are built with Svelte stores. SaaS application uses Supabase realtime. Without adapters, SaaS application would need to:
- Fork all Whisker components
- Manually sync Supabase → Svelte stores
- Maintain duplicate code

With adapters, SaaS application can:
- ✅ Use Whisker components as-is
- ✅ Plug in Supabase directly
- ✅ Get realtime updates automatically
- ✅ No code duplication

---

## Architecture

```
┌─────────────────────────────────────────┐
│          Whisker Components             │
│   (GraphView, MenuBar, PropertiesPanel) │
└────────────────┬────────────────────────┘
                 │
                 │ Uses EditorAdapter interface
                 │
     ┌───────────┴──────────────┐
     │                          │
┌────▼──────────┐    ┌──────────▼──────────┐
│ Svelte        │    │ Supabase            │
│ Adapter       │    │ Adapter             │
│ (Default)     │    │ (SaaS application)       │
└───────────────┘    └─────────────────────┘
```

---

## Basic Usage

### In Whisker (Default - Svelte Stores)

```typescript
import { GraphView } from '@whisker/editor-base/components';
import { createSvelteEditorAdapter } from '@whisker/editor-base/adapters';

// Create default adapter
const adapter = createSvelteEditorAdapter();

// Pass to component (optional - uses default if not provided)
<GraphView adapter={adapter} />
```

### In SaaS application (Supabase)

```typescript
import { GraphView } from '@whisker/editor-base/api';
import { createSupabaseEditorAdapter } from '@whisker/editor-base/adapters';
import { supabase } from './lib/supabase';

// Create Supabase adapter
const adapter = createSupabaseEditorAdapter(
  supabase,
  projectId,
  userId
);

// Use Whisker component with Supabase state
<GraphView adapter={adapter} />
```

Now GraphView automatically syncs with Supabase realtime!

---

## Adapter Interface

### EditorAdapter

Complete adapter for all editor features:

```typescript
interface EditorAdapter {
  story: StoryStateAdapter;      // Required
  history?: HistoryAdapter;      // Optional
  notifications?: NotificationAdapter;
  validation?: ValidationAdapter;
}
```

### StoryStateAdapter

Core story state (required):

```typescript
interface StoryStateAdapter {
  // Readable stores
  currentStory: StoreAdapter<Story | null>;
  passages: StoreAdapter<Map<string, Passage>>;

  // Writable stores
  selectedPassageId: WritableStoreAdapter<string | null>;

  // Optional
  filteredPassages?: StoreAdapter<Map<string, Passage>>;

  // Operations
  updatePassage?: (id: string, updates: Partial<Passage>) => Promise<void>;
  deletePassage?: (id: string) => Promise<void>;
  createPassage?: (passage: Partial<Passage>) => Promise<Passage>;
}
```

### StoreAdapter

Generic store interface (Svelte-compatible):

```typescript
interface StoreAdapter<T> {
  subscribe(run: (value: T) => void): () => void;
}

interface WritableStoreAdapter<T> extends StoreAdapter<T> {
  set(value: T): void;
  update(updater: (value: T) => T): void;
}
```

---

## Creating Custom Adapters

### Example: Redux Adapter

```typescript
import { createEditorAdapter } from '@whisker/editor-base/adapters';
import type { EditorAdapter } from '@whisker/editor-base/adapters';
import { store } from './redux/store';

export function createReduxEditorAdapter(): EditorAdapter {
  return {
    story: {
      currentStory: {
        subscribe: (run) => {
          // Initial value
          run(store.getState().story.current);

          // Listen to changes
          const unsubscribe = store.subscribe(() => {
            run(store.getState().story.current);
          });

          return unsubscribe;
        },
      },

      passages: {
        subscribe: (run) => {
          run(store.getState().story.passages);

          return store.subscribe(() => {
            run(store.getState().story.passages);
          });
        },
      },

      selectedPassageId: {
        subscribe: (run) => {
          run(store.getState().selection.passageId);

          return store.subscribe(() => {
            run(store.getState().selection.passageId);
          });
        },

        set: (value) => {
          store.dispatch({ type: 'SELECT_PASSAGE', payload: value });
        },

        update: (updater) => {
          const current = store.getState().selection.passageId;
          const updated = updater(current);
          store.dispatch({ type: 'SELECT_PASSAGE', payload: updated });
        },
      },

      updatePassage: async (id, updates) => {
        store.dispatch({ type: 'UPDATE_PASSAGE', payload: { id, updates } });
      },
    },

    notifications: {
      show: (message, type) => {
        store.dispatch({ type: 'SHOW_NOTIFICATION', payload: { message, type } });
      },
    },
  };
}
```

### Example: Zustand Adapter

```typescript
import create from 'zustand';
import type { EditorAdapter } from '@whisker/editor-base/adapters';

// Zustand store
const useEditorStore = create((set, get) => ({
  story: null,
  selectedPassageId: null,
  updatePassage: async (id, updates) => {
    const story = get().story;
    const passage = story.passages.get(id);
    Object.assign(passage, updates);
    set({ story });
  },
}));

export function createZustandEditorAdapter(): EditorAdapter {
  return {
    story: {
      currentStory: {
        subscribe: (run) => {
          // Initial value
          run(useEditorStore.getState().story);

          // Listen to changes
          return useEditorStore.subscribe(
            state => state.story,
            run
          );
        },
      },

      selectedPassageId: {
        subscribe: (run) => {
          run(useEditorStore.getState().selectedPassageId);
          return useEditorStore.subscribe(
            state => state.selectedPassageId,
            run
          );
        },
        set: (value) => {
          useEditorStore.setState({ selectedPassageId: value });
        },
        update: (updater) => {
          const current = useEditorStore.getState().selectedPassageId;
          useEditorStore.setState({ selectedPassageId: updater(current) });
        },
      },

      passages: {
        subscribe: (run) => {
          return useEditorStore.subscribe(
            state => state.story?.passages || new Map(),
            run
          );
        },
      },

      updatePassage: useEditorStore.getState().updatePassage,
    },
  };
}
```

---

## SaaS application Integration

### Complete Example

```typescript
// saas-application/src/lib/whiskerAdapter.ts

import type { EditorAdapter } from '@whisker/editor-base/adapters';
import { supabase } from './supabase';
import { writable, derived, type Writable } from 'svelte/store';
import type { Story, Passage } from '@whisker/core-ts';

export function createSaaS applicationAdapter(
  projectId: string,
  userId: string
): EditorAdapter {
  // Local state (reactive)
  const storyStore: Writable<Story | null> = writable(null);
  const selectedPassageIdStore: Writable<string | null> = writable(null);

  // Derived stores
  const passagesStore = derived(storyStore, $story =>
    $story?.passages || new Map()
  );

  // Load initial data
  supabase
    .from('projects')
    .select('story_data')
    .eq('id', projectId)
    .single()
    .then(({ data }) => {
      storyStore.set(data.story_data);
    });

  // Subscribe to realtime changes
  const channel = supabase
    .channel(`project:${projectId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'projects',
      filter: `id=eq.${projectId}`
    }, (payload) => {
      storyStore.set(payload.new.story_data);
    })
    .subscribe();

  // Cleanup function
  const cleanup = () => {
    channel.unsubscribe();
  };

  return {
    story: {
      currentStory: {
        subscribe: storyStore.subscribe,
      },

      passages: {
        subscribe: passagesStore.subscribe,
      },

      selectedPassageId: {
        subscribe: selectedPassageIdStore.subscribe,
        set: selectedPassageIdStore.set,
        update: selectedPassageIdStore.update,
      },

      updatePassage: async (passageId, updates) => {
        storyStore.update(story => {
          if (!story) return story;

          const passage = story.passages.get(passageId);
          if (passage) {
            Object.assign(passage, updates);
          }

          return story;
        });

        // Sync to Supabase
        const story = get(storyStore);
        await supabase
          .from('projects')
          .update({
            story_data: story,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
      },

      deletePassage: async (passageId) => {
        storyStore.update(story => {
          if (!story) return story;
          story.passages.delete(passageId);
          return story;
        });

        const story = get(storyStore);
        await supabase
          .from('projects')
          .update({ story_data: story })
          .eq('id', projectId);
      },

      createPassage: async (passage) => {
        const newPassage = new Passage(passage);

        storyStore.update(story => {
          if (!story) return story;
          story.passages.set(newPassage.id, newPassage);
          return story;
        });

        const story = get(storyStore);
        await supabase
          .from('projects')
          .update({ story_data: story })
          .eq('id', projectId);

        return newPassage;
      },
    },

    notifications: {
      show: (message, type) => {
        // Use SaaS application's toast system
        toast[type](message);
      },
    },

    // Optional: Add SaaS application-specific features
    _cleanup: cleanup,
  };
}
```

### Usage in SaaS application App

```svelte
<!-- saas-application/src/routes/Editor.svelte -->
<script lang="ts">
  import { GraphView, MenuBar, PropertiesPanel } from '@whisker/editor-base/api';
  import { createSaaS applicationAdapter } from '$lib/whiskerAdapter';
  import { onDestroy } from 'svelte';

  let { projectId, userId } = $props();

  // Create adapter
  const adapter = createSaaS applicationAdapter(projectId, userId);

  // Cleanup on unmount
  onDestroy(() => {
    adapter._cleanup?.();
  });
</script>

<div class="saas-application-editor">
  <MenuBar {adapter} />

  <div class="editor-layout">
    <GraphView {adapter} />
    <PropertiesPanel {adapter} />
  </div>
</div>
```

---

## Benefits

### For SaaS application

✅ **No Forking** - Use Whisker components directly
✅ **Realtime Sync** - Supabase updates flow automatically
✅ **Type Safety** - Full TypeScript support
✅ **Easy Updates** - Pull Whisker updates without conflicts
✅ **Custom State** - Full control over state management

### For Whisker

✅ **Backward Compatible** - Existing apps unchanged
✅ **Flexible** - Works with any state system
✅ **Reusable** - Components work in more contexts
✅ **Testable** - Easy to mock state in tests

---

## Migration Guide

### Existing Whisker Apps

No changes needed! Components use default Svelte stores if no adapter provided.

```svelte
<!-- This still works -->
<GraphView />
```

### SaaS application Apps

Add adapter prop:

```svelte
<!-- Add adapter -->
<GraphView adapter={saas-applicationAdapter} />
```

---

## Testing with Adapters

### Mock Adapter for Tests

```typescript
import type { EditorAdapter } from '@whisker/editor-base/adapters';
import { writable } from 'svelte/store';

export function createMockAdapter(initialStory?: Story): EditorAdapter {
  const story = writable(initialStory || null);
  const selectedPassageId = writable<string | null>(null);

  return {
    story: {
      currentStory: story,
      passages: derived(story, $story => $story?.passages || new Map()),
      selectedPassageId,

      updatePassage: vi.fn(async (id, updates) => {
        story.update(s => {
          s?.passages.get(id) && Object.assign(s.passages.get(id), updates);
          return s;
        });
      }),
    },
    notifications: {
      show: vi.fn(),
    },
  };
}
```

### Test Usage

```typescript
import { render } from '@testing-library/svelte';
import { GraphView } from '@whisker/editor-base/components';
import { createMockAdapter } from './test-utils';

test('renders passages', () => {
  const story = new Story();
  story.addPassage(new Passage({ title: 'Start' }));

  const adapter = createMockAdapter(story);

  const { getByText } = render(GraphView, { props: { adapter } });

  expect(getByText('Start')).toBeInTheDocument();
});
```

---

## API Reference

### Exported Functions

```typescript
// Create default Svelte adapter
export function createSvelteEditorAdapter(): EditorAdapter;

// Create Supabase adapter
export function createSupabaseEditorAdapter(
  supabase: any,
  projectId: string,
  userId: string
): EditorAdapter;

// Wrap Svelte store as adapter
export function svelteStoreAdapter<T>(store: Readable<T>): StoreAdapter<T>;
export function svelteStoreAdapter<T>(store: Writable<T>): WritableStoreAdapter<T>;
```

---

## Best Practices

### 1. Always Provide Cleanup

```typescript
export function createMyAdapter() {
  const channel = subscribeToChanges();

  const adapter = { /* ... */ };

  // Provide cleanup method
  adapter._cleanup = () => {
    channel.unsubscribe();
  };

  return adapter;
}
```

### 2. Handle Errors Gracefully

```typescript
updatePassage: async (id, updates) => {
  try {
    await api.update(id, updates);
  } catch (error) {
    console.error('Failed to update passage:', error);
    // Don't throw - let app continue
  }
}
```

### 3. Optimize Subscriptions

```typescript
// Bad - new listener for each subscription
subscribe: (run) => {
  api.on('change', run);  // Leaks!
  return () => {};
}

// Good - manage listeners properly
subscribe: (run) => {
  const listener = (data) => run(data);
  api.on('change', listener);
  return () => api.off('change', listener);
}
```

---

## Future Extensions

Planned features:

- **Conflict Resolution** - Handle concurrent edits
- **Offline Support** - Queue changes when offline
- **Optimistic Updates** - Instant UI updates
- **Undo/Redo Sync** - Cross-device undo/redo

---

## Resources

- [Store Adapter Source](../packages/editor-base/src/adapters/StoreAdapter.ts)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Svelte Store Contract](https://svelte.dev/docs/svelte-store)

---

**Ready to integrate Whisker with any state system!** 🔌✨
