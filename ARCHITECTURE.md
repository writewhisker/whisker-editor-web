# Whisker Editor Architecture

**Version**: 2.0
**Last Updated**: November 20, 2025
**Status**: Production-Ready

## Executive Summary

Whisker Editor is a modern, modular interactive fiction authoring platform built with TypeScript, Svelte 5, and a clean package architecture. The system is designed around three core principles:

1. **Modularity**: Independent packages that can be used separately or together
2. **Type Safety**: Full TypeScript coverage with strict mode
3. **Framework Flexibility**: Core logic framework-agnostic, UI layer uses Svelte

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                    (Svelte 5 + editor-base)                     │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ Uses
             ↓
┌──────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │ Stores       │  │ Components  │  │ Services     │           │
│  │ (State Mgmt) │  │ (UI Library)│  │ (Logic)      │           │
│  └──────────────┘  └─────────────┘  └──────────────┘           │
└────────────┬─────────────────────────────────────────────────────┘
             │
             │ Uses
             ↓
┌──────────────────────────────────────────────────────────────────┐
│                       Feature Packages                           │
│  ┌──────────┐  ┌────────┐  ┌────────┐  ┌──────────┐            │
│  │analytics │  │ audio  │  │ export │  │ import   │            │
│  └──────────┘  └────────┘  └────────┘  └──────────┘            │
│  ┌──────────┐  ┌────────┐  ┌────────┐  ┌──────────┐            │
│  │scripting │  │ github │  │ macros │  │publishing│            │
│  └──────────┘  └────────┘  └────────┘  └──────────┘            │
└────────────┬─────────────────────────────────────────────────────┘
             │
             │ Depends on
             ↓
┌──────────────────────────────────────────────────────────────────┐
│                      Core Layer                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐         │
│  │ core-ts                │  │ storage                │         │
│  │ (Story Engine)         │  │ (Data Persistence)     │         │
│  └────────────────────────┘  └────────────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

## Package Architecture

### Core Packages

#### @writewhisker/core-ts
**Purpose**: Story engine and runtime
**Dependencies**: nanoid (ID generation)
**Bundle Size**: ~50KB gzipped

**Responsibilities**:
- Story data models (Story, Passage, Choice)
- Story player runtime
- Variable system
- Serialization/deserialization
- Basic validation

**Key Classes**:
- `Story`: Root story container
- `Passage`: Individual story passages
- `Choice`: Player choices/links
- `StoryPlayer`: Runtime playback engine
- `Variable`: Story variable management

#### @writewhisker/storage
**Purpose**: Data persistence layer
**Dependencies**: idb, eventemitter3
**Bundle Size**: ~15KB gzipped

**Responsibilities**:
- IndexedDB storage
- Local storage fallback
- Story CRUD operations
- Preference management
- Sync queue for offline support

**Key Classes**:
- `IndexedDBBackend`: Primary storage implementation
- `PreferenceManager`: Settings management
- `SyncQueueService`: Offline sync queue
- `MigrationService`: Data migration utilities

### Feature Packages

#### @writewhisker/analytics
**Purpose**: Playthrough tracking and metrics
**Dependencies**: core-ts
**Bundle Size**: ~5KB gzipped

**Features**:
- Session tracking
- Event recording
- Playthrough analysis
- Choice analytics
- Export to CSV/JSON

#### @writewhisker/audio
**Purpose**: Audio playback management
**Dependencies**: None (Web Audio API)
**Bundle Size**: ~3KB gzipped

**Features**:
- Background music with crossfading
- Sound effects
- Ambient audio layers
- Volume management
- Preloading

#### @writewhisker/export
**Purpose**: Story export in multiple formats
**Dependencies**: jspdf, html2canvas, jszip, marked
**Bundle Size**: ~150KB gzipped

**Formats**:
- JSON (native format)
- HTML (standalone player)
- Markdown (readable text)
- PDF (playable, manuscript, outline)
- Twine (compatibility)
- EPUB (planned)

#### @writewhisker/import
**Purpose**: Import from other formats
**Dependencies**: core-ts, nanoid
**Bundle Size**: ~10KB gzipped

**Formats**:
- JSON (native format)
- Twine HTML
- Plain text (planned)

#### @writewhisker/scripting
**Purpose**: Lua scripting engine
**Dependencies**: wasmoon, core-ts
**Bundle Size**: ~200KB gzipped (with wasmoon)

**Features**:
- Dual execution modes (preview + full Lua)
- Monaco editor integration
- Variable management
- Standard library
- Syntax highlighting

#### @writewhisker/github
**Purpose**: GitHub integration
**Dependencies**: @octokit/rest, storage
**Peer Dependencies**: svelte
**Bundle Size**: ~80KB gzipped

**Features**:
- OAuth authentication
- Repository management
- File sync
- Commit history
- Collaboration support

#### @writewhisker/publishing
**Purpose**: Story publishing and distribution
**Dependencies**: core-ts
**Peer Dependencies**: editor-base
**Bundle Size**: ~5KB gzipped

**Features**:
- Version management
- Release notes
- Publishing workflow
- Distribution channels

### UI Packages

#### @writewhisker/editor-base
**Purpose**: Complete editor platform
**Dependencies**: All Whisker packages + UI libraries
**Peer Dependencies**: svelte
**Bundle Size**: ~600KB gzipped

**Components**:
- Graph view (passage flow)
- Passage editor
- Code editor (Lua scripts)
- Properties panel
- Toolbar
- Modals and dialogs

**Stores**:
- Story store (story state)
- UI store (UI state)
- Editor store (settings)
- Player store (preview)
- Export store (export operations)

**Services**:
- Story service (CRUD)
- Import/Export service
- Validation service
- GitHub service
- Auto-save service

#### @writewhisker/shared-ui
**Purpose**: Reusable UI components
**Dependencies**: None
**Peer Dependencies**: svelte
**Bundle Size**: ~2KB gzipped

**Components**:
- Button
- Input
- Select
- Modal
- Toast notifications
- Loading indicators

#### @writewhisker/player-ui
**Purpose**: Embeddable story player
**Dependencies**: core-ts
**Bundle Size**: ~10KB gzipped

**Features**:
- Standalone player component
- Customizable themes
- Mobile-responsive
- Accessibility support

### Utility Packages

#### @writewhisker/validation
**Purpose**: Story validation and linting
**Dependencies**: core-ts, chalk, commander, glob
**Bundle Size**: ~30KB gzipped

**Features**:
- Dead link detection
- Orphaned passage detection
- Unused variable warnings
- Auto-fix capabilities
- CLI tool

#### @writewhisker/game-systems
**Purpose**: Built-in game mechanics
**Dependencies**: core-ts, nanoid
**Bundle Size**: ~20KB gzipped

**Systems**:
- Inventory management
- Character stats
- Quest tracking
- Achievement system
- Save/load states

#### @writewhisker/macros
**Purpose**: Template macro system
**Dependencies**: core-ts
**Bundle Size**: ~5KB gzipped

**Features**:
- Custom macro definitions
- Template expansion
- Loop macros
- Conditional macros
- Function call macros

## Data Flow

### Story Editing Flow

```
User Action (UI)
  ↓
Component Event
  ↓
Store Update (Svelte Writable)
  ↓
Service Layer
  ↓
Core Package (core-ts)
  ↓
Storage Layer
  ↓
IndexedDB
```

### Story Playback Flow

```
User Starts Story
  ↓
Player Store Initialized
  ↓
StoryPlayer.start()
  ↓
Load Starting Passage
  ↓
Execute onEnterScript (via LuaExecutor)
  ↓
Update Variables
  ↓
Display Passage Content
  ↓
User Makes Choice
  ↓
Execute Choice Script
  ↓
Navigate to Target Passage
  ↓
(Loop)
```

### GitHub Sync Flow

```
User Triggers Sync
  ↓
GitHub Service
  ↓
Check Authentication
  ↓
GitHubAPI (Octokit)
  ↓
Fetch Remote Changes
  ↓
Detect Conflicts
  ↓
Merge or Prompt User
  ↓
Update Local Story
  ↓
Storage Layer
  ↓
Notify UI (Store Update)
```

## State Management

### Svelte Stores Pattern

```typescript
// Store creation
export function createStoryStore() {
  const { subscribe, set, update } = writable<Story | null>(null);

  return {
    subscribe,
    setStory: (story: Story) => set(story),
    updatePassage: (id: string, updates: Partial<Passage>) =>
      update(s => {
        if (!s) return s;
        const passage = s.passages.get(id);
        if (passage) {
          Object.assign(passage, updates);
        }
        return s;
      }),
    // ... other methods
  };
}

// Usage in components
import { storyStore } from './stores';

// Subscribe (auto-unsubscribes)
$: story = $storyStore;

// Update
storyStore.updatePassage(id, { content: 'Updated' });
```

### Derived Stores

```typescript
// Computed values
export const selectedPassage = derived(
  [storyStore, uiStore],
  ([$story, $ui]) => {
    if (!$story || !$ui.selectedPassageId) return null;
    return $story.passages.get($ui.selectedPassageId);
  }
);

// Usage
$: passage = $selectedPassage;
```

### Store Persistence

```typescript
// Auto-save on changes
storyStore.subscribe(async (story) => {
  if (story && autoSaveEnabled) {
    await debounced(async () => {
      await storage.saveStory(story.id, story.serialize());
    });
  }
});
```

## Dependency Graph

### Clean Dependency Flow

```
Core Layer (no dependencies except utilities)
  ↓
Feature Packages (depend on Core)
  ↓
UI Layer (depends on Features + Core)
  ↓
Application (depends on UI)
```

### Package Dependencies

```
core-ts
  ├── nanoid

storage
  ├── core-ts
  ├── idb
  └── eventemitter3

analytics
  └── core-ts

audio
  └── (no deps - Web Audio API)

export
  ├── core-ts
  ├── jspdf (optional)
  ├── html2canvas (optional)
  ├── jszip
  └── marked

import
  ├── core-ts
  └── nanoid

scripting
  ├── core-ts
  └── wasmoon
  └── monaco-editor (peer, optional)

github
  ├── @octokit/rest
  ├── storage
  └── svelte (peer)

editor-base
  ├── ALL feature packages
  ├── @xyflow/svelte
  ├── dagre
  ├── marked
  └── svelte (peer)
```

### Tree-Shaking

All packages have `sideEffects: false`, enabling:
- Dead code elimination
- Smaller bundle sizes
- Import only what you use

```typescript
// Import specific features
import { Story } from '@writewhisker/core-ts';
// Only Story code is bundled

// Import from editor-base
import { createStoryStore } from '@writewhisker/editor-base/stores';
// Only store code is bundled, not components
```

## Build System

### Monorepo Structure

```
whisker-editor-web/
├── packages/
│   ├── core-ts/         # Core engine
│   ├── storage/         # Persistence
│   ├── analytics/       # Analytics
│   ├── audio/           # Audio
│   ├── export/          # Export
│   ├── import/          # Import
│   ├── scripting/       # Lua
│   ├── github/          # GitHub
│   ├── publishing/      # Publishing
│   ├── editor-base/     # Editor
│   ├── shared-ui/       # UI components
│   ├── player-ui/       # Player
│   ├── validation/      # Validation
│   ├── game-systems/    # Game mechanics
│   └── macros/          # Macros
├── examples/            # Example applications
└── templates/           # Project templates
```

### Build Tool: Turbo

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    }
  }
}
```

**Benefits**:
- Parallel builds
- Incremental builds
- Caching
- Dependency-aware execution

### Package Manager: pnpm

**Benefits**:
- Fast installs
- Disk space efficient
- Strict dependency resolution
- Workspace support

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'examples/*'
  - 'templates/*'
```

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// Example: core-ts/Story.test.ts
describe('Story', () => {
  it('should create story with metadata', () => {
    const story = new Story({
      metadata: { title: 'Test' }
    });

    expect(story.metadata.title).toBe('Test');
  });

  it('should add passage', () => {
    story.addPassage({ name: 'Start', content: 'Begin' });
    expect(story.passages.size).toBe(1);
  });
});
```

### Component Tests (Testing Library)

```typescript
// Example: editor-base/PassageEditor.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import PassageEditor from './PassageEditor.svelte';

test('updates passage content', async () => {
  const { getByRole } = render(PassageEditor, {
    props: { passage }
  });

  const textarea = getByRole('textbox');
  await fireEvent.input(textarea, { target: { value: 'New content' } });

  expect(passage.content).toBe('New content');
});
```

### Integration Tests

```typescript
// Example: Full workflow test
test('create, edit, and export story', async () => {
  // Create story
  const story = new Story({ metadata: { title: 'Test' } });

  // Add passages
  story.addPassage({ name: 'Start', content: 'Begin' });
  story.addPassage({ name: 'End', content: 'The End' });

  // Export
  const exporter = new HTMLExporter();
  const result = await exporter.export({ story, options: { format: 'html' } });

  expect(result.success).toBe(true);
  expect(result.content).toContain('Begin');
});
```

## Performance Considerations

### Bundle Size Optimization

1. **Tree-Shaking**: All packages marked `sideEffects: false`
2. **Code Splitting**: Dynamic imports for large features
3. **Lazy Loading**: Load Monaco editor on demand
4. **Optional Dependencies**: PDF/canvas libs optional

### Runtime Performance

1. **Virtual Scrolling**: For large passage lists
2. **Debounced Auto-Save**: Prevent excessive saves
3. **Memoization**: Cache computed values
4. **Web Workers**: Offload heavy computation (planned)

### Storage Performance

1. **Indexed DB**: Fast local storage
2. **Batch Operations**: Group multiple writes
3. **Lazy Loading**: Load stories on demand
4. **Compression**: Compress large stories (planned)

## Security

### XSS Prevention

```typescript
// Sanitize user content
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(userContent);
```

### Script Sandboxing

```typescript
// Lua scripts run in isolated context
const executor = new LuaExecutor(story);
const result = executor.execute(script); // Sandboxed
```

### Token Security

```typescript
// GitHub tokens stored securely
await storage.saveSecureToken(token); // IndexedDB, not localStorage
```

## Extensibility

### Plugin System (Planned)

```typescript
interface Plugin {
  name: string;
  version: string;
  onInit?(context: PluginContext): void;
  onStoryChange?(story: Story): void;
  commands?: Record<string, () => void>;
  ui?: PluginUI;
}

registerPlugin(myPlugin);
```

### Custom Exporters

```typescript
class CustomExporter implements IExporter {
  readonly name = 'My Exporter';
  readonly format = 'custom' as const;

  async export(context: ExportContext): Promise<ExportResult> {
    // Custom export logic
  }
}

registerExporter(new CustomExporter());
```

### Custom Themes

```typescript
registerTheme({
  name: 'my-theme',
  colors: { /* ... */ },
  fonts: { /* ... */ },
});

editorStore.setTheme('my-theme');
```

## Future Architecture

### Planned Improvements

1. **Offline-First PWA**: Full offline editing
2. **Real-Time Collaboration**: WebSocket-based multi-user editing
3. **Cloud Storage**: Optional cloud sync
4. **Plugin Marketplace**: Community extensions
5. **WASM Performance**: Critical paths in WebAssembly
6. **Web Workers**: Background processing
7. **Service Worker**: Caching and offline support

### Scalability Considerations

1. **Large Stories**: Optimize for 1000+ passages
2. **Collaboration**: Conflict resolution and merging
3. **Asset Management**: Images, audio, video
4. **Localization**: i18n support
5. **Accessibility**: WCAG AA compliance

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start dev server
pnpm --filter @writewhisker/editor-base dev
```

### Adding a New Package

1. Create package directory
2. Add `package.json` with workspace deps
3. Implement package
4. Add tests
5. Add to pnpm-workspace.yaml
6. Update turbo.json if needed

### Release Process

1. Update version in package.json
2. Run tests: `pnpm test`
3. Build: `pnpm build`
4. Create changelog
5. Commit and tag
6. Publish to npm: `pnpm publish --filter @writewhisker/*`

## Conclusion

Whisker's architecture prioritizes:
- **Modularity**: Independent, reusable packages
- **Type Safety**: TypeScript throughout
- **Performance**: Tree-shaking, lazy loading, optimization
- **Developer Experience**: Clear APIs, good documentation
- **Extensibility**: Plugins, themes, custom exporters

The system is designed to scale from simple story players to full-featured authoring environments, while maintaining a clean separation of concerns and optimal bundle sizes.
