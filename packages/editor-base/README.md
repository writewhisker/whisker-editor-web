# @writewhisker/editor-base

Complete editor platform for Whisker - integrates all packages into a cohesive authoring environment.

## Features

- **Unified Platform**: Single package aggregating all Whisker functionality
- **Svelte Stores**: Reactive state management for stories, UI, and settings
- **UI Components**: Complete component library for story editing
- **Services Layer**: Business logic and data management
- **Graph Editor**: Visual passage flow editor with @xyflow/svelte
- **Code Editor**: Monaco-powered Lua script editor
- **Re-Exports**: Convenient access to all Whisker packages
- **Type-Safe**: Full TypeScript support throughout
- **Modular**: Use only what you need via tree-shaking

## Installation

```bash
pnpm add @writewhisker/editor-base

# Peer dependencies
pnpm add svelte
```

## Quick Start

### Basic Setup

```typescript
import {
  createStoryStore,
  createUIStore,
  createEditorStore
} from '@writewhisker/editor-base/stores';

// Initialize stores
const storyStore = createStoryStore();
const uiStore = createUIStore();
const editorStore = createEditorStore();

// Load story
import { Story } from '@writewhisker/editor-base';
const story = new Story({
  metadata: {
    title: 'My Interactive Story',
    author: 'Your Name',
  },
});

storyStore.setStory(story);
```

### Using Components

```svelte
<script lang="ts">
  import {
    PassageEditor,
    GraphView,
    PropertiesPanel,
    Toolbar
  } from '@writewhisker/editor-base/components';
  import { storyStore } from './stores';
</script>

<div class="editor">
  <Toolbar />
  <div class="main">
    <GraphView />
    <PassageEditor />
  </div>
  <PropertiesPanel />
</div>
```

## Package Structure

### Re-Exports

editor-base re-exports all Whisker packages for convenience:

```typescript
// All core functionality
export * from '@writewhisker/core-ts';
export * from '@writewhisker/storage';
export * from '@writewhisker/import';
export * from '@writewhisker/export';
export * from '@writewhisker/analytics';
export * from '@writewhisker/audio';
export * from '@writewhisker/scripting';
export * from '@writewhisker/github';

// Editor-specific exports
export * from './stores';
export * from './components';
export * from './services';
export * from './utils';
```

### Subpath Exports

Access specific parts via subpaths:

```typescript
// Stores
import { createStoryStore } from '@writewhisker/editor-base/stores';

// Components
import { PassageEditor } from '@writewhisker/editor-base/components';

// Services
import { StoryService } from '@writewhisker/editor-base/services';

// Utilities
import { debounce } from '@writewhisker/editor-base/utils';

// Re-exported packages
import { Story } from '@writewhisker/editor-base'; // from core-ts
import { AnalyticsTracker } from '@writewhisker/editor-base'; // from analytics
```

## Core Stores

### Story Store

Manages story state and operations:

```typescript
import { createStoryStore } from '@writewhisker/editor-base/stores';

const storyStore = createStoryStore();

// Subscribe to story changes
storyStore.subscribe(story => {
  console.log('Story updated:', story?.metadata.title);
});

// Set story
storyStore.setStory(story);

// Add passage
storyStore.addPassage({
  name: 'Introduction',
  content: 'Welcome to my story!',
});

// Update passage
storyStore.updatePassage(passageId, {
  content: 'Updated content',
});

// Delete passage
storyStore.deletePassage(passageId);

// Undo/Redo
storyStore.undo();
storyStore.redo();
```

### UI Store

Manages UI state (selected passages, panels, etc.):

```typescript
import { createUIStore } from '@writewhisker/editor-base/stores';

const uiStore = createUIStore();

// Select passage
uiStore.selectPassage(passageId);

// Get selected passage
const selected = $uiStore.selectedPassageId;

// Toggle panels
uiStore.togglePanel('properties');
uiStore.togglePanel('preview');

// Set view mode
uiStore.setViewMode('graph'); // or 'list'

// Zoom controls
uiStore.setZoom(1.5);
uiStore.zoomIn();
uiStore.zoomOut();
uiStore.resetZoom();
```

### Editor Store

Manages editor settings and preferences:

```typescript
import { createEditorStore } from '@writewhisker/editor-base/stores';

const editorStore = createEditorStore();

// Editor settings
editorStore.setTheme('dark');
editorStore.setFontSize(14);
editorStore.setTabSize(2);

// Auto-save
editorStore.setAutoSave(true);
editorStore.setAutoSaveInterval(30000); // 30 seconds

// Code editor settings
editorStore.setCodeEditorTheme('vs-dark');
editorStore.setShowMinimap(false);
```

### Player Store

Manages story playback for testing:

```typescript
import { createPlayerStore } from '@writewhisker/editor-base/stores';

const playerStore = createPlayerStore();

// Start playback
playerStore.start(story);

// Make choice
playerStore.makeChoice(choiceIndex);

// Restart
playerStore.restart();

// Get current passage
const currentPassage = $playerStore.currentPassage;

// Get history
const history = $playerStore.history;
```

### Export Store

Manages export operations:

```typescript
import { createExportStore } from '@writewhisker/editor-base/stores';

const exportStore = createExportStore();

// Export story
await exportStore.export(story, {
  format: 'html',
  includeCSS: true,
  standalone: true,
});

// Get export history
const exports = $exportStore.history;

// Download exported file
exportStore.download(exportResult);
```

## Components

### Graph View

Visual node-based passage editor:

```svelte
<script lang="ts">
  import { GraphView } from '@writewhisker/editor-base/components';
  import { storyStore, uiStore } from './stores';
</script>

<GraphView
  story={$storyStore}
  selectedId={$uiStore.selectedPassageId}
  on:selectPassage={(e) => uiStore.selectPassage(e.detail)}
  on:addPassage={(e) => storyStore.addPassage(e.detail)}
  on:deletePassage={(e) => storyStore.deletePassage(e.detail)}
  on:connectPassages={(e) => storyStore.connectPassages(e.detail)}
/>
```

### Passage Editor

Rich text editor for passage content:

```svelte
<script lang="ts">
  import { PassageEditor } from '@writewhisker/editor-base/components';
  import { storyStore, uiStore } from './stores';

  $: passage = $storyStore?.passages.get($uiStore.selectedPassageId);
</script>

{#if passage}
  <PassageEditor
    {passage}
    on:update={(e) => storyStore.updatePassage(passage.id, e.detail)}
    on:addChoice={() => storyStore.addChoice(passage.id)}
  />
{/if}
```

### Properties Panel

Edit passage metadata and settings:

```svelte
<script lang="ts">
  import { PropertiesPanel } from '@writewhisker/editor-base/components';
</script>

<PropertiesPanel
  {passage}
  on:updateName={(e) => updatePassage({ name: e.detail })}
  on:updateTags={(e) => updatePassage({ tags: e.detail })}
  on:updateScript={(e) => updatePassage({ onEnterScript: e.detail })}
/>
```

### Toolbar

Main toolbar with common actions:

```svelte
<script lang="ts">
  import { Toolbar } from '@writewhisker/editor-base/components';
</script>

<Toolbar
  on:new={() => createNewStory()}
  on:open={() => openStory()}
  on:save={() => saveStory()}
  on:export={() => exportStory()}
  on:undo={() => storyStore.undo()}
  on:redo={() => storyStore.redo()}
/>
```

### Code Editor

Monaco-powered Lua script editor:

```svelte
<script lang="ts">
  import { CodeEditor } from '@writewhisker/editor-base/components';
  import { LuaExecutor } from '@writewhisker/editor-base';

  const executor = new LuaExecutor($storyStore);
  let code = '';
</script>

<CodeEditor
  bind:value={code}
  language="lua"
  theme="vs-dark"
  {executor}
  on:execute={(e) => console.log('Result:', e.detail)}
/>
```

### Modal Dialogs

Reusable modal components:

```svelte
<script lang="ts">
  import {
    Modal,
    ConfirmDialog,
    InputDialog,
    ExportDialog
  } from '@writewhisker/editor-base/components';

  let showExport = false;
</script>

<!-- Export dialog -->
<ExportDialog
  bind:open={showExport}
  story={$storyStore}
  on:export={(e) => handleExport(e.detail)}
/>

<!-- Confirm dialog -->
<ConfirmDialog
  title="Delete Passage?"
  message="This action cannot be undone."
  on:confirm={() => deletePassage()}
  on:cancel={() => console.log('Cancelled')}
/>
```

## Services

### Story Service

Business logic for story operations:

```typescript
import { StoryService } from '@writewhisker/editor-base/services';
import { createIndexedDBStorage } from '@writewhisker/editor-base';

const storage = createIndexedDBStorage();
const service = new StoryService(storage);

// Save story
await service.save(story);

// Load story
const loadedStory = await service.load(storyId);

// List stories
const stories = await service.list();

// Delete story
await service.delete(storyId);

// Auto-save
service.enableAutoSave(story, 30000); // Every 30s
service.disableAutoSave();
```

### Import/Export Service

Handle file import and export:

```typescript
import { ImportExportService } from '@writewhisker/editor-base/services';

const service = new ImportExportService();

// Import from JSON
const story = await service.importJSON(jsonFile);

// Import from Twine
const story = await service.importTwine(htmlFile);

// Export to HTML
const html = await service.exportHTML(story, {
  standalone: true,
  includeCSS: true,
});

// Export to PDF
const pdf = await service.exportPDF(story, {
  mode: 'playable',
  format: 'a4',
});
```

### Validation Service

Validate stories for common issues:

```typescript
import { ValidationService } from '@writewhisker/editor-base/services';

const service = new ValidationService();

// Validate story
const issues = service.validate(story);

issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.message}`);
  console.log(`  Passage: ${issue.passageId}`);
});

// Auto-fix issues
const fixed = service.autoFix(story, issues);
console.log(`Fixed ${fixed} issues`);
```

### GitHub Service

Sync stories with GitHub:

```typescript
import { GitHubService } from '@writewhisker/editor-base/services';

const service = new GitHubService(storage);

// Authenticate
await service.login(clientId);

// Initialize repo
await service.initializeRepo(story, {
  owner: 'username',
  repo: 'my-story',
});

// Push changes
await service.push(story, 'Update story');

// Pull changes
await service.pull(story);

// Get status
const status = await service.getStatus(story);
```

## Utilities

### Layout Utilities

Calculate passage positions:

```typescript
import { calculateLayout, autoArrange } from '@writewhisker/editor-base/utils';

// Calculate graph layout
const positions = calculateLayout(story, {
  algorithm: 'dagre',
  direction: 'TB', // Top-to-bottom
  spacing: { x: 200, y: 100 },
});

// Apply positions
positions.forEach((pos, passageId) => {
  storyStore.updatePassage(passageId, { position: pos });
});

// Auto-arrange passages
autoArrange(story);
```

### Search Utilities

Search passages:

```typescript
import { searchPassages, SearchOptions } from '@writewhisker/editor-base/utils';

const results = searchPassages(story, 'dragon', {
  fields: ['name', 'content'],
  caseSensitive: false,
  wholeWord: false,
});

results.forEach(result => {
  console.log(`Found in: ${result.passage.name}`);
  console.log(`  ${result.snippet}`);
});
```

### Export Utilities

Generate filenames and format data:

```typescript
import {
  generateFilename,
  formatFileSize,
  sanitizeFilename
} from '@writewhisker/editor-base/utils';

const filename = generateFilename(story, 'html');
// "my-story-2025-01-20.html"

const size = formatFileSize(1024 * 1024);
// "1.00 MB"

const safe = sanitizeFilename('My Story: Chapter 1');
// "my-story-chapter-1"
```

## Advanced Usage

### Custom Plugins

Extend editor functionality with plugins:

```typescript
import { registerPlugin } from '@writewhisker/editor-base';

registerPlugin({
  name: 'word-counter',
  version: '1.0.0',

  onInit(context) {
    // Initialize plugin
    console.log('Word counter initialized');
  },

  onStoryChange(story) {
    // React to story changes
    const wordCount = countWords(story);
    console.log(`Total words: ${wordCount}`);
  },

  commands: {
    'showWordCount': () => {
      // Custom command
      alert(`Word count: ${countWords(story)}`);
    },
  },

  ui: {
    toolbar: [
      {
        id: 'word-count',
        label: 'Word Count',
        icon: '📊',
        action: 'showWordCount',
      },
    ],
  },
});
```

### Custom Themes

Create custom editor themes:

```typescript
import { registerTheme } from '@writewhisker/editor-base';

registerTheme({
  name: 'my-theme',
  colors: {
    background: '#1a1a1a',
    foreground: '#ffffff',
    primary: '#4a9eff',
    secondary: '#ff4a9e',
    accent: '#4aff9e',
  },
  fonts: {
    ui: 'Inter, sans-serif',
    code: 'Fira Code, monospace',
    content: 'Merriweather, serif',
  },
  sizes: {
    fontSize: 14,
    lineHeight: 1.6,
    borderRadius: 4,
  },
});

// Apply theme
editorStore.setTheme('my-theme');
```

### Keyboard Shortcuts

Register custom shortcuts:

```typescript
import { registerShortcut } from '@writewhisker/editor-base';

registerShortcut({
  key: 'ctrl+shift+p',
  action: () => {
    // Quick command palette
    showCommandPalette();
  },
});

registerShortcut({
  key: 'ctrl+k',
  action: () => {
    // Quick search
    showSearch();
  },
});
```

## Performance Tips

1. **Use Stores Efficiently**: Subscribe only to needed data
2. **Lazy Load Components**: Load heavy components on demand
3. **Virtualize Large Lists**: Use virtual scrolling for many passages
4. **Debounce Auto-Save**: Don't save on every keystroke
5. **Optimize Graph Rendering**: Limit visible nodes in large stories

```typescript
// Good: Specific subscription
const selectedPassage = derived(
  [storyStore, uiStore],
  ([$story, $ui]) => $story?.passages.get($ui.selectedPassageId)
);

// Bad: Subscribe to entire store
storyStore.subscribe(story => {
  const passage = story?.passages.get(selectedId);
  // Re-runs on any story change
});
```

## API Reference

### Stores

```typescript
// Story management
function createStoryStore(): StoryStore;
function createUIStore(): UIStore;
function createEditorStore(): EditorStore;
function createPlayerStore(): PlayerStore;
function createExportStore(): ExportStore;
```

### Services

```typescript
class StoryService {
  save(story: Story): Promise<void>;
  load(id: string): Promise<Story>;
  list(): Promise<StoryMetadata[]>;
  delete(id: string): Promise<void>;
}

class ImportExportService {
  importJSON(file: File): Promise<Story>;
  importTwine(file: File): Promise<Story>;
  exportHTML(story: Story, options: ExportOptions): Promise<string>;
  exportPDF(story: Story, options: PDFOptions): Promise<Blob>;
}

class ValidationService {
  validate(story: Story): ValidationIssue[];
  autoFix(story: Story, issues: ValidationIssue[]): number;
}
```

## Bundle Size

- **Size**: ~600KB (gzipped)
- **Dependencies**: All Whisker packages + xyflow/svelte, dagre, marked, jszip
- **Peer Dependencies**: svelte
- **Tree-shakable**: Yes - import only what you need

## Testing

```bash
pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm test:coverage # Coverage report
pnpm check         # Type check + Svelte check
```

## Examples

See the [examples](../../examples) directory for complete applications:

- **minimal-player**: Minimal story player
- **full-editor**: Complete editing environment
- **analytics-dashboard**: Analytics visualization
- **embedded-player**: Web component player

## Migrating from Old Editor

See [MIGRATION_GUIDE.md](../../MIGRATION_GUIDE.md) for detailed migration instructions.

## Architecture

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for system design overview.

## License

AGPL-3.0

## Related Packages

All Whisker packages are re-exported:
- [@writewhisker/core-ts](../core-ts)
- [@writewhisker/storage](../storage)
- [@writewhisker/import](../import)
- [@writewhisker/export](../export)
- [@writewhisker/analytics](../analytics)
- [@writewhisker/audio](../audio)
- [@writewhisker/scripting](../scripting)
- [@writewhisker/github](../github)

## Support

- [Documentation](https://github.com/writewhisker/whisker-editor-web)
- [Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- [Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)
