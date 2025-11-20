# Whisker Package Guide

**When to use which package?**

This guide helps you choose the right Whisker packages for your use case.

## Quick Decision Tree

```
What are you building?

├── 📖 Story Player / Reader
│   └── Use: core-ts + player-ui
│       Size: ~60KB
│       Features: Play stories, no editing
│
├── ✏️ Simple Story Editor
│   └── Use: editor-base
│       Size: ~600KB
│       Features: Full editing, all features
│
├── 🎯 Custom Application
│   └── Pick packages as needed
│       Size: Varies
│       Features: Mix and match
│
└── 🚀 Embedding in Existing App
    └── Use: Specific packages only
        Size: Minimal
        Features: What you need
```

## Use Case Scenarios

### 1. Building a Story Player

**Goal**: Embed a story player in your website

**Packages Needed**:
- `@writewhisker/core-ts` - Story engine
- `@writewhisker/player-ui` - Player component (optional)

**Installation**:
```bash
pnpm add @writewhisker/core-ts @writewhisker/player-ui
```

**Bundle Size**: ~60KB gzipped

**Example**:
```typescript
import { Story, StoryPlayer } from '@writewhisker/core-ts';
import { PlayerUI } from '@writewhisker/player-ui';

// Load story
const story = Story.deserialize(storyData);

// Create player
const player = new StoryPlayer(story);
player.start();

// Render UI
const ui = new PlayerUI(player);
ui.mount(document.getElementById('player'));
```

**When to use**:
- Publishing finished stories
- Embedding stories in blogs/websites
- Mobile story apps
- Minimal bundle size needed

---

### 2. Building a Full Editor

**Goal**: Create a complete story authoring tool

**Package Needed**:
- `@writewhisker/editor-base` - Everything included

**Installation**:
```bash
pnpm add @writewhisker/editor-base svelte
```

**Bundle Size**: ~600KB gzipped

**Example**:
```svelte
<script lang="ts">
  import {
    GraphView,
    PassageEditor,
    Toolbar
  } from '@writewhisker/editor-base/components';
  import { createStoryStore } from '@writewhisker/editor-base/stores';

  const storyStore = createStoryStore();
</script>

<div class="editor">
  <Toolbar />
  <GraphView />
  <PassageEditor />
</div>
```

**When to use**:
- Desktop editor application
- Web-based authoring tool
- Story creation platform
- Need all features

---

### 3. Adding Analytics to Your Game

**Goal**: Track player behavior and choices

**Packages Needed**:
- `@writewhisker/core-ts` - Story engine
- `@writewhisker/analytics` - Analytics tracking

**Installation**:
```bash
pnpm add @writewhisker/core-ts @writewhisker/analytics
```

**Bundle Size**: ~55KB gzipped

**Example**:
```typescript
import { StoryPlayer } from '@writewhisker/core-ts';
import { AnalyticsTracker } from '@writewhisker/analytics';

const player = new StoryPlayer(story);
const tracker = new AnalyticsTracker();

// Track events
player.on('passageEntered', (passage) => {
  tracker.track({
    type: 'passage_visit',
    sessionId: currentSession,
    timestamp: Date.now(),
    passageId: passage.id,
    passageName: passage.name,
  });
});

// Get analytics
const analytics = tracker.getAnalytics(story.id);
console.log('Completion rate:', analytics.completionRate);
```

**When to use**:
- A/B testing story variants
- Understanding player behavior
- Improving story flow
- Data-driven story design

---

### 4. Adding Audio to Your Story

**Goal**: Background music and sound effects

**Packages Needed**:
- `@writewhisker/core-ts` - Story engine
- `@writewhisker/audio` - Audio management

**Installation**:
```bash
pnpm add @writewhisker/core-ts @writewhisker/audio
```

**Bundle Size**: ~53KB gzipped

**Example**:
```typescript
import { StoryPlayer } from '@writewhisker/core-ts';
import { AudioManager } from '@writewhisker/audio';

const player = new StoryPlayer(story);
const audio = new AudioManager();

await audio.initialize();

// Play music on passage tags
player.on('passageEntered', (passage) => {
  const musicTag = passage.tags.find(t => t.startsWith('music:'));
  if (musicTag) {
    const track = musicTag.replace('music:', '');
    audio.playMusic(`${track}.mp3`, { crossfade: 1000 });
  }
});
```

**When to use**:
- Immersive storytelling
- Atmospheric experiences
- Audio-driven narratives
- Sound effect feedback

---

### 5. Exporting Stories to Different Formats

**Goal**: Export to HTML, PDF, Markdown, etc.

**Packages Needed**:
- `@writewhisker/core-ts` - Story engine
- `@writewhisker/export` - Export functionality

**Installation**:
```bash
pnpm add @writewhisker/core-ts @writewhisker/export
```

**Bundle Size**: ~200KB gzipped (with optional PDF deps)

**Example**:
```typescript
import { Story } from '@writewhisker/core-ts';
import { HTMLExporter, PDFExporter } from '@writewhisker/export';

// Export to HTML
const htmlExporter = new HTMLExporter();
const htmlResult = await htmlExporter.export({
  story,
  options: { format: 'html', standalone: true }
});

// Export to PDF
const pdfExporter = new PDFExporter();
const pdfResult = await pdfExporter.export({
  story,
  options: { format: 'pdf', pdfMode: 'playable' }
});
```

**When to use**:
- Publishing to web
- Print-ready manuscripts
- PDF distribution
- Multi-format support

---

### 6. Importing From Other Tools

**Goal**: Import stories from Twine, JSON, etc.

**Packages Needed**:
- `@writewhisker/core-ts` - Story engine
- `@writewhisker/import` - Import functionality

**Installation**:
```bash
pnpm add @writewhisker/core-ts @writewhisker/import
```

**Bundle Size**: ~60KB gzipped

**Example**:
```typescript
import { TwineImporter, JSONImporter } from '@writewhisker/import';

// Import from Twine
const twineImporter = new TwineImporter();
const story = await twineImporter.import({
  content: twineHTMLContent,
  options: { format: 'twine' }
});

// Import from JSON
const jsonImporter = new JSONImporter();
const story2 = await jsonImporter.import({
  content: jsonContent,
  options: { format: 'json' }
});
```

**When to use**:
- Migrating from Twine
- Batch importing stories
- Format conversion
- Data recovery

---

### 7. Adding Lua Scripting

**Goal**: Dynamic story logic with Lua scripts

**Packages Needed**:
- `@writewhisker/core-ts` - Story engine
- `@writewhisker/scripting` - Lua engine

**Installation**:
```bash
pnpm add @writewhisker/core-ts @writewhisker/scripting
```

**Bundle Size**: ~250KB gzipped (with wasmoon)

**Example**:
```typescript
import { Story } from '@writewhisker/core-ts';
import { LuaExecutor } from '@writewhisker/scripting';

const executor = new LuaExecutor(story);

// Execute Lua script
const result = executor.execute(`
  health = health - 10
  if health <= 0 then
    gameOver = true
  end
`);

// Get variables
const health = executor.getVariable('health');
```

**When to use**:
- Complex game logic
- RPG mechanics
- Conditional branching
- Variable manipulation

---

### 8. GitHub Integration

**Goal**: Sync stories with GitHub repositories

**Packages Needed**:
- `@writewhisker/core-ts` - Story engine
- `@writewhisker/storage` - Local storage
- `@writewhisker/github` - GitHub integration

**Installation**:
```bash
pnpm add @writewhisker/core-ts @writewhisker/storage @writewhisker/github svelte
```

**Bundle Size**: ~145KB gzipped

**Example**:
```typescript
import { GitHubAuth, GitHubAPI } from '@writewhisker/github';
import { createIndexedDBStorage } from '@writewhisker/storage';

const storage = createIndexedDBStorage();
const auth = new GitHubAuth(storage);

// Login
await auth.login(clientId);

// Get API
const token = await auth.getAccessToken();
const api = new GitHubAPI(token);

// Push story
await api.createOrUpdateFile({
  owner: 'username',
  repo: 'my-story',
  path: 'story.json',
  content: JSON.stringify(story.serialize()),
  message: 'Update story',
});
```

**When to use**:
- Collaborative editing
- Version control
- Backup and sync
- Open source stories

---

### 9. Story Validation and Linting

**Goal**: Catch errors and improve story quality

**Packages Needed**:
- `@writewhisker/core-ts` - Story engine
- `@writewhisker/validation` - Validation tools

**Installation**:
```bash
pnpm add @writewhisker/core-ts @writewhisker/validation
```

**Bundle Size**: ~80KB gzipped

**Example**:
```typescript
import { Story } from '@writewhisker/core-ts';
import { StoryValidator } from '@writewhisker/validation';

const validator = new StoryValidator();
const issues = validator.validate(story);

issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.message}`);
  console.log(`  Passage: ${issue.passageId}`);
});

// Auto-fix
const fixedCount = validator.autoFix(story, issues);
console.log(`Fixed ${fixedCount} issues`);
```

**When to use**:
- Quality assurance
- Pre-publication checks
- Automated testing
- CI/CD pipelines

---

### 10. Local Data Storage

**Goal**: Save stories to browser storage

**Packages Needed**:
- `@writewhisker/core-ts` - Story engine
- `@writewhisker/storage` - Storage layer

**Installation**:
```bash
pnpm add @writewhisker/core-ts @writewhisker/storage
```

**Bundle Size**: ~65KB gzipped

**Example**:
```typescript
import { Story } from '@writewhisker/core-ts';
import { createIndexedDBStorage } from '@writewhisker/storage';

const storage = createIndexedDBStorage();
await storage.initialize();

// Save story
await storage.saveStory(story.id, story.serialize());

// Load story
const data = await storage.loadStory(storyId);
const story = Story.deserialize(data);

// List stories
const stories = await storage.listStories();

// Delete story
await storage.deleteStory(storyId);
```

**When to use**:
- Offline editing
- Auto-save
- Local backups
- Draft management

---

## Package Comparison

### Bundle Sizes

| Package | Size (gzipped) | Dependencies |
|---------|----------------|--------------|
| core-ts | ~50KB | 1 (nanoid) |
| analytics | ~5KB | 1 (core-ts) |
| audio | ~3KB | 0 (Web Audio) |
| storage | ~15KB | 3 (idb, eventemitter3, core-ts) |
| import | ~10KB | 2 (core-ts, nanoid) |
| export | ~150KB | 7 (jspdf, canvas, etc.) |
| scripting | ~200KB | 2 (wasmoon, core-ts) |
| github | ~80KB | 3 (octokit, storage, core-ts) |
| validation | ~30KB | 4 (chalk, commander, glob, core-ts) |
| player-ui | ~10KB | 1 (core-ts) |
| shared-ui | ~2KB | 0 |
| publishing | ~5KB | 1 (core-ts) |
| game-systems | ~20KB | 2 (core-ts, nanoid) |
| macros | ~5KB | 1 (core-ts) |
| **editor-base** | **~600KB** | **All packages** |

### Feature Matrix

| Feature | Packages Needed | Bundle Size |
|---------|----------------|-------------|
| Play story | core-ts + player-ui | ~60KB |
| Edit story | editor-base | ~600KB |
| Analytics | core-ts + analytics | ~55KB |
| Audio | core-ts + audio | ~53KB |
| Export | core-ts + export | ~200KB |
| Import | core-ts + import | ~60KB |
| Scripting | core-ts + scripting | ~250KB |
| GitHub sync | core-ts + storage + github | ~145KB |
| Validation | core-ts + validation | ~80KB |
| Storage | core-ts + storage | ~65KB |

## Mixing Packages

You can combine packages for custom solutions:

### Example: Analytics Dashboard

```typescript
// Packages: core-ts + analytics + export + storage
import { Story } from '@writewhisker/core-ts';
import { AnalyticsTracker } from '@writewhisker/analytics';
import { HTMLExporter } from '@writewhisker/export';
import { createIndexedDBStorage } from '@writewhisker/storage';

// Track, analyze, export, and save
const tracker = new AnalyticsTracker();
const storage = createIndexedDBStorage();
const exporter = new HTMLExporter();

// Bundle size: ~220KB
```

### Example: Collaborative Editor

```typescript
// Packages: editor-base + github
import { createStoryStore } from '@writewhisker/editor-base/stores';
import { GitHubSync } from '@writewhisker/github';

// Full editor with GitHub sync
const storyStore = createStoryStore();
const sync = new GitHubSync(api, storage);

// Bundle size: ~680KB
```

### Example: Audio Story Player

```typescript
// Packages: core-ts + player-ui + audio + analytics
import { StoryPlayer } from '@writewhisker/core-ts';
import { PlayerUI } from '@writewhisker/player-ui';
import { AudioManager } from '@writewhisker/audio';
import { AnalyticsTracker } from '@writewhisker/analytics';

// Rich player experience with tracking
// Bundle size: ~70KB
```

## Package Selection Tips

### Minimize Bundle Size

1. **Start with core-ts**: Only add features you need
2. **Avoid editor-base for players**: Use core-ts + player-ui instead
3. **Make deps optional**: PDF/canvas libs in export are optional
4. **Use tree-shaking**: Import specific modules

```typescript
// Good: Tree-shakable
import { Story } from '@writewhisker/core-ts';

// Bad: Imports everything
import * as Whisker from '@writewhisker/editor-base';
```

### Maximize Features

1. **Use editor-base**: All features in one package
2. **Add optional packages**: GitHub, validation, etc.
3. **Enable all export formats**: Include PDF/canvas

```bash
# Full-featured installation
pnpm add @writewhisker/editor-base svelte
pnpm add @writewhisker/github @writewhisker/validation
```

### Balance Size and Features

1. **Core + selective features**: core-ts + specific packages
2. **Progressive enhancement**: Add features as needed
3. **Code splitting**: Load heavy features on demand

```typescript
// Lazy load export
const loadExport = async () => {
  const { PDFExporter } = await import('@writewhisker/export');
  return new PDFExporter();
};
```

## Common Mistakes

### ❌ Using editor-base for simple players

```typescript
// DON'T: 600KB bundle for simple playback
import { Story, StoryPlayer } from '@writewhisker/editor-base';
```

```typescript
// DO: 50KB bundle for playback
import { Story, StoryPlayer } from '@writewhisker/core-ts';
```

### ❌ Importing everything

```typescript
// DON'T: Imports all packages
import * as Whisker from '@writewhisker/editor-base';
```

```typescript
// DO: Import specific features
import { Story } from '@writewhisker/core-ts';
import { AudioManager } from '@writewhisker/audio';
```

### ❌ Not using peer dependencies

```typescript
// DON'T: Duplicate Svelte
// (editor-base and github both bundle Svelte)
```

```bash
# DO: Install Svelte as peer dependency
pnpm add svelte @writewhisker/editor-base @writewhisker/github
```

## Recommended Combinations

### Minimal Player (60KB)
- core-ts
- player-ui

### Basic Editor (600KB)
- editor-base

### Analytics Platform (220KB)
- core-ts
- analytics
- export
- storage

### Full-Featured Editor (700KB)
- editor-base
- github
- validation

### Embeddable Player (70KB)
- core-ts
- player-ui
- audio
- analytics

## Need Help?

- 📖 [Architecture Docs](./ARCHITECTURE.md)
- 🔄 [Migration Guide](./MIGRATION_GUIDE.md)
- 💬 [Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)
- 🐛 [Issues](https://github.com/writewhisker/whisker-editor-web/issues)

## Quick Reference

```bash
# Minimal player
pnpm add @writewhisker/core-ts @writewhisker/player-ui

# Full editor
pnpm add @writewhisker/editor-base svelte

# Custom build
pnpm add @writewhisker/core-ts
pnpm add @writewhisker/[feature] # analytics, audio, etc.
```

Remember: **Start small, add features as needed!**
