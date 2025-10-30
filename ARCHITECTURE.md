# Architecture Overview

This document provides a technical overview of the whisker-editor-web architecture, design patterns, and implementation decisions.

> **Note**: This document focuses on whisker-editor-web's internal architecture. For how whisker-editor-web integrates with whisker-core and the broader ecosystem, see [ECOSYSTEM_ARCHITECTURE.md](./ECOSYSTEM_ARCHITECTURE.md).

## System Architecture

### Component Hierarchy

```
App.svelte (Root)
├── ProjectMenu.svelte              # Top-level project operations
├── SearchBar.svelte                # Global search and filtering
├── PassageList.svelte              # Left sidebar - passage navigation
│   └── PassageListItem.svelte      # Individual passage items
├── GraphView.svelte                # Center - visual graph editor
│   ├── PassageNode.svelte          # Custom node component
│   └── ConnectionEdge.svelte       # Custom edge component
├── PropertiesPanel.svelte          # Right sidebar - editing
│   ├── TagInput.svelte             # Tag autocomplete input
│   └── ChoiceEditor.svelte         # Choice management
├── VariableManager.svelte          # Variable management (modal)
└── TagManager.svelte               # Tag management (modal)
```

### Data Flow

```
User Interaction
    ↓
Component Event Handler
    ↓
Store Update (Svelte stores)
    ↓
Derived Stores Recompute
    ↓
Components Re-render (reactive)
```

### State Management Pattern

**Centralized Stores:**
- `projectStore.ts` - Current story, project metadata, save/load
- `historyStore.ts` - Undo/redo stack
- `filterStore.ts` - Search and filter state
- `tagStore.ts` - Tag registry and colors

**Local Component State:**
- UI-specific state (open/closed panels, selected items)
- Form inputs (managed with Svelte `$state` rune)

**Reactive Updates:**
```typescript
// Stores use Svelte's writable/derived pattern
export const currentStory = writable<Story | null>(null);

// Derived stores automatically recompute
export const filteredPassages = derived(
  [currentStory, filterState],
  ([$story, $filter]) => {
    // Compute filtered passages
  }
);

// Components subscribe reactively
$: passages = $filteredPassages;
```

---

## Technology Decisions

### Why Svelte 5?

**Decision:** Use Svelte 5 with runes for the web editor

**Rationale:**
1. **Performance** - Compiled approach eliminates virtual DOM overhead
2. **Bundle Size** - Significantly smaller than React equivalents
3. **Reactivity** - Runes provide cleaner, more powerful reactivity
4. **Developer Experience** - Less boilerplate, more intuitive

**Trade-offs:**
- ✅ Better performance and smaller bundles
- ✅ Simpler component code
- ⚠️ Smaller ecosystem than React
- ⚠️ Testing tools still maturing for Svelte 5

See [whisker-implementation ADR-002](https://github.com/writewhisker/whisker-implementation/blob/main/decisions/002-svelte-over-react.md) for full analysis.

### Why Svelte Flow?

**Decision:** Use `@xyflow/svelte` (Svelte Flow) for node graph visualization

**Rationale:**
1. **Svelte Native** - Built specifically for Svelte, not a React port
2. **Feature Complete** - Handles nodes, edges, layouts, zoom, pan, minimap
3. **Customizable** - Custom node and edge components
4. **Performance** - Handles large graphs smoothly
5. **Active Development** - Well-maintained with regular updates

**Alternatives Considered:**
- `svelvet` - Less mature, fewer features
- Custom implementation - Too much work for needed features

**Trade-offs:**
- ✅ Saves weeks of development time
- ✅ Professional graph interactions out of the box
- ⚠️ External dependency (but well-maintained)

### Why Tailwind CSS 4?

**Decision:** Use Tailwind CSS 4 for styling

**Rationale:**
1. **Utility-First** - Rapid development without context switching
2. **Consistency** - Design system enforced through utilities
3. **Performance** - Unused styles purged automatically
4. **Responsive** - Mobile-first responsive design built-in
5. **Dark Mode** - Easy dark mode support (future)

**Configuration:**
```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Custom color palette
      }
    }
  }
}
```

**Trade-offs:**
- ✅ Extremely fast to style components
- ✅ Consistent spacing and colors
- ⚠️ HTML can get verbose (mitigated with component composition)

---

## Key Patterns

### Store Pattern

**Writable Stores** for mutable state:
```typescript
import { writable } from 'svelte/store';

export const currentStory = writable<Story | null>(null);

// Usage in components:
import { currentStory } from '$lib/stores/projectStore';

// Access value
$: story = $currentStory;

// Update
currentStory.update(s => {
  s?.addPassage(newPassage);
  return s;
});
```

**Derived Stores** for computed state:
```typescript
import { derived } from 'svelte/store';

export const passageCount = derived(
  currentStory,
  $story => $story?.passages.length ?? 0
);
```

**Custom Stores** with methods:
```typescript
function createProjectStore() {
  const { subscribe, set, update } = writable<Story | null>(null);

  return {
    subscribe,
    set,
    update,
    addPassage: (passage: Passage) => update(s => {
      s?.addPassage(passage);
      return s;
    }),
    deletePassage: (id: string) => update(s => {
      s?.deletePassage(id);
      return s;
    })
  };
}

export const projectStore = createProjectStore();
```

### Component Composition

**Container/Presentational Pattern:**
```svelte
<!-- Container: PassageList.svelte -->
<script lang="ts">
  import { filteredPassages } from '$lib/stores/filterStore';
  import PassageListItem from './PassageListItem.svelte';

  $: passages = $filteredPassages;
</script>

{#each passages as passage (passage.id)}
  <PassageListItem {passage} />
{/each}

<!-- Presentational: PassageListItem.svelte -->
<script lang="ts">
  import type { Passage } from '$lib/models/Passage';
  export let passage: Passage;
</script>

<button class="passage-item">
  {passage.title}
</button>
```

**Event-Based Communication:**
```svelte
<!-- Child Component -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{ add: string }>();

  function handleAdd() {
    dispatch('add', tagName);
  }
</script>

<!-- Parent Component -->
<TagInput on:add={handleTagAdd} />
```

### Event Handling

**Store Updates:**
```typescript
function handlePassageSelect(passage: Passage) {
  selectedPassage.set(passage);
  historyStore.addEntry('select', { passageId: passage.id });
}
```

**Optimistic Updates:**
```typescript
function handleChoiceAdd(choice: Choice) {
  // Update immediately
  passage.choices.push(choice);
  currentStory.update(s => s);

  // Add to history for undo
  historyStore.addEntry('addChoice', { passageId, choice });
}
```

**Undo/Redo:**
```typescript
export function undo() {
  const entry = historyStack.pop();
  if (entry) {
    applyHistoryEntry(entry, 'undo');
    redoStack.push(entry);
  }
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

**Models** - Test data structures and business logic:
```typescript
describe('Story', () => {
  it('should add passage', () => {
    const story = new Story({ title: 'Test' });
    const passage = new Passage({ title: 'Passage 1' });
    story.addPassage(passage);
    expect(story.passages).toHaveLength(1);
  });
});
```

**Stores** - Test state management:
```typescript
describe('filterStore', () => {
  it('should filter passages by tag', () => {
    filterStore.setTagFilter(['combat']);
    expect(get(filteredPassages)).toHaveLength(2);
  });
});
```

**Utilities** - Test helper functions:
```typescript
describe('connectionValidator', () => {
  it('should detect orphaned connections', () => {
    const result = validateConnections(story);
    expect(result.orphanedConnections).toHaveLength(1);
  });
});
```

### E2E Tests (Playwright)

**User Workflows** - Test end-to-end features:
```typescript
test('should create connection by dragging', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Graph');
  // Drag from source handle to target node
  await page.dragAndDrop('.source-handle', '.target-node');
  expect(page.locator('.connection-edge')).toBeVisible();
});
```

**Why E2E Over Component Tests:**
- Svelte 5 + @testing-library/svelte has compatibility issues
- E2E tests provide better real-world coverage
- Faster to write and maintain
- Tests actual user workflows

See [TESTING.md](TESTING.md) for detailed testing guide.

### Coverage Goals

- **Unit Tests:** 80%+ coverage for models, stores, utilities
- **E2E Tests:** All critical user workflows
- **Integration:** Key feature combinations

**Current Status:** 137 tests passing (100%)

---

## Project Structure Details

### Source Organization

```
src/
├── lib/
│   ├── components/              # UI components
│   │   ├── graph/               # Graph-specific components
│   │   │   ├── PassageNode.svelte
│   │   │   └── ConnectionEdge.svelte
│   │   ├── PassageList.svelte
│   │   ├── PropertiesPanel.svelte
│   │   ├── TagInput.svelte
│   │   └── TagManager.svelte
│   ├── models/                  # Data models
│   │   ├── Story.ts             # Story model + methods
│   │   ├── Passage.ts           # Passage model + methods
│   │   ├── Choice.ts            # Choice model
│   │   ├── Variable.ts          # Variable model
│   │   └── types.ts             # Shared TypeScript types
│   ├── stores/                  # State management
│   │   ├── projectStore.ts      # Story & project state
│   │   ├── historyStore.ts      # Undo/redo
│   │   ├── filterStore.ts       # Search & filters
│   │   └── tagStore.ts          # Tag registry & colors
│   └── utils/                   # Utilities
│       ├── graphLayout.ts       # Layout algorithms
│       ├── connectionValidator.ts # Validation logic
│       └── colors.ts            # Color utilities
├── App.svelte                   # Root component
└── main.ts                      # App entry point
```

### Test Organization

```
src/lib/
├── models/
│   ├── Story.ts
│   └── Story.test.ts           # Co-located with source
├── stores/
│   ├── tagStore.ts
│   └── tagStore.test.ts        # Co-located with source
└── utils/
    ├── connectionValidator.ts
    └── connectionValidator.test.ts

e2e/
├── tagging.spec.ts             # Tag management workflows
├── connections.spec.ts         # Connection editing workflows
└── README.md                   # E2E testing guide
```

---

## Performance Considerations

### Large Graph Handling

**Current Approach:**
- Svelte Flow handles virtualization automatically
- Only visible nodes rendered
- Smooth performance up to 200+ nodes

**Future Optimizations (Phase 10):**
- Progressive loading for 500+ node graphs
- Viewport-based rendering
- Level-of-detail (LOD) for distant nodes

### State Updates

**Optimization:**
- Batch updates where possible
- Use derived stores to avoid redundant computation
- Debounce expensive operations (search, layout)

**Example:**
```typescript
// Debounce search
const debouncedSearch = debounce((query: string) => {
  filterStore.setSearchQuery(query);
}, 300);
```

### Memory Management

- History limited to 50 levels
- Auto-cleanup of old undo/redo entries
- Lazy loading of passage content (future)

---

## Build Configuration

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '$lib': path.resolve('./src/lib')
    }
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['svelte', '@xyflow/svelte'],
          'models': ['./src/lib/models']
        }
      }
    }
  }
});
```

### TypeScript Configuration

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "strict": true,
    "paths": {
      "$lib/*": ["./src/lib/*"]
    }
  }
}
```

---

## Future Architecture Improvements

### Planned Enhancements

1. **Web Workers** - Offload heavy computations (graph layout, validation)
2. **IndexedDB** - Better offline storage than localStorage
3. **Service Worker** - Offline support and caching
4. **Code Splitting** - Lazy load TagManager, VariableManager
5. **Virtualization** - Virtual scrolling for passage list (Phase 10)

### Scalability Targets

- **Passages:** Support 500+ passages smoothly
- **Connections:** Handle complex branching (1000+ edges)
- **Performance:** Maintain 60fps interactions
- **Load Time:** < 3 seconds for large projects

---

## Related Documentation

- **[ECOSYSTEM_ARCHITECTURE.md](ECOSYSTEM_ARCHITECTURE.md)** - How whisker-core and whisker-editor-web integrate
- **[TESTING.md](TESTING.md)** - Testing strategy and guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development workflow
- **[e2e/README.md](e2e/README.md)** - E2E testing details
- **[whisker-implementation](https://github.com/writewhisker/whisker-implementation)** - Planning and design docs
- **[whisker-core](https://github.com/writewhisker/whisker-core)** - Runtime engine repository

---

## Questions & Feedback

For architecture discussions or questions:
- **Issues:** [GitHub Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- **Discussions:** [GitHub Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)
