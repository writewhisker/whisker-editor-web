# Phase 2: Extract Editor Base - Implementation Guide

## Overview

Phase 2 extracts the editor platform into the `@whisker/editor-base` package. This includes stores, components, services, and utilities - everything needed to build an editor UI.

**Prerequisites**: Phase 0 & 1 must be complete

**Timeline**: 2 weeks (Week 7-8)
**PRs**: 5 (PRs #23-27)
**Effort**: 14-20 developer-days

---

# PR #23: Move Stores to @whisker/editor-base

**Goal**: Extract all store files to editor package

**Estimated Effort**: 2-3 days
**Lines Changed**: ~150
**Risk**: LOW

## Package Structure

```
packages/editor-base/
├── src/
│   ├── stores/
│   │   ├── storyStateStore.ts
│   │   ├── selectionStore.ts
│   │   ├── passageOperationsStore.ts
│   │   ├── projectMetadataStore.ts
│   │   ├── fileOperationsStore.ts
│   │   ├── historyStore.ts
│   │   ├── validationStore.ts
│   │   ├── playerStore.ts
│   │   ├── themeStore.ts
│   │   ├── viewPreferencesStore.ts
│   │   ├── keyboardShortcutsStore.ts
│   │   ├── notificationStore.ts
│   │   ├── tagStore.ts
│   │   ├── filterStore.ts
│   │   ├── loadingStore.ts
│   │   ├── testScenarioStore.ts
│   │   ├── exportStore.ts
│   │   └── index.ts
│   └── index.ts
├── tests/
│   └── stores/
│       └── *.test.ts (37 test files)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Package Configuration

### `packages/editor-base/package.json`

```json
{
  "name": "@whisker/editor-base",
  "version": "0.1.0",
  "description": "Editor platform for Whisker - stores, components, and services",
  "license": "AGPL-3.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./stores": {
      "types": "./dist/stores/index.d.ts",
      "import": "./dist/stores/index.js"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build && tsc --emitDeclarationOnly",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "svelte-check && tsc --noEmit"
  },
  "dependencies": {
    "@whisker/core-ts": "workspace:*",
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@testing-library/svelte": "^5.0.0",
    "@types/node": "^20.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/writewhisker/whisker-editor-web.git",
    "directory": "packages/editor-base"
  }
}
```

## Move Stores

```bash
# Move all store files
mv src/lib/stores/* packages/editor-base/src/stores/

# Move store tests
mv src/lib/stores/*.test.ts packages/editor-base/tests/stores/
```

## Update Store Imports

All stores must import from `@whisker/core-ts`:

**Before**:
```typescript
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
```

**After**:
```typescript
import { Story, Passage } from '@whisker/core-ts';
```

## Export Stores

### `packages/editor-base/src/stores/index.ts`

```typescript
/**
 * Editor stores
 */

// Core state
export * from './storyStateStore';
export * from './selectionStore';
export * from './passageOperationsStore';
export * from './projectMetadataStore';
export * from './fileOperationsStore';

// History & validation
export * from './historyStore';
export * from './validationStore';

// Player
export * from './playerStore';
export * from './testScenarioStore';

// UI
export * from './themeStore';
export * from './viewPreferencesStore';
export * from './keyboardShortcutsStore';
export * from './notificationStore';
export * from './tagStore';
export * from './filterStore';
export * from './loadingStore';

// Export
export * from './exportStore';

// Legacy facade (will be deprecated)
export * as projectStore from './projectStore';
```

## Success Criteria

- ✅ All stores moved to @whisker/editor-base
- ✅ All 37 store tests pass
- ✅ Stores import correctly from @whisker/core-ts
- ✅ Package builds successfully

---

# PR #24-25: Move Components to @whisker/editor-base

**Goal**: Extract all component files (2 batches due to size)

**Estimated Effort**: 8-10 days (4-5 days each)
**Lines Changed**: ~800 total (~400 each)
**Risk**: MEDIUM

## Package Structure

```
packages/editor-base/
├── src/
│   ├── components/
│   │   ├── MenuBar.svelte
│   │   ├── Toolbar.svelte
│   │   ├── StatusBar.svelte
│   │   ├── GraphView.svelte
│   │   ├── PassageList.svelte
│   │   ├── PropertiesPanel.svelte
│   │   ├── PreviewPanel.svelte
│   │   ├── PassageEditor.svelte
│   │   ├── MetadataEditor.svelte
│   │   ├── VariableManager.svelte
│   │   ├── TagManager.svelte
│   │   ├── FileDialog.svelte
│   │   ├── SettingsDialog.svelte
│   │   ├── FindReplaceDialog.svelte
│   │   ├── CommandPalette.svelte
│   │   ├── NotificationToast.svelte
│   │   ├── ConfirmDialog.svelte
│   │   ├── LoadingSpinner.svelte
│   │   ├── ErrorBoundary.svelte
│   │   ├── Breadcrumb.svelte
│   │   ├── SearchBar.svelte
│   │   ├── PassagePreview.svelte
│   │   ├── PassageLinkAutocomplete.svelte
│   │   ├── ResizeHandle.svelte
│   │   ├── editor/
│   │   │   ├── MonacoEditor.svelte
│   │   │   ├── ValidationPanel.svelte
│   │   │   └── MetadataEditor.svelte
│   │   ├── graph/
│   │   │   ├── PassageNode.svelte
│   │   │   ├── ConnectionEdge.svelte
│   │   │   ├── GraphViewZoomControl.svelte
│   │   │   └── MobileToolbar.svelte
│   │   ├── preview/
│   │   │   ├── StoryPlayer.svelte
│   │   │   ├── TestScenarioManager.svelte
│   │   │   └── BreakpointPanel.svelte
│   │   ├── export/
│   │   │   ├── ExportPanel.svelte
│   │   │   ├── ExportDialog.svelte
│   │   │   └── ImportDialog.svelte
│   │   ├── onboarding/
│   │   │   ├── OnboardingWizard.svelte
│   │   │   └── TemplateGallery.svelte
│   │   ├── help/
│   │   │   └── QuickShortcutsOverlay.svelte
│   │   └── index.ts
│   └── index.ts
└── tests/
    └── components/
        └── *.test.ts (115 test files)
```

## PR #24: Move Core Components (Batch 1)

### Components to Move:

- MenuBar, Toolbar, StatusBar
- GraphView, PassageList, PropertiesPanel
- PassageEditor, MetadataEditor
- VariableManager, TagManager
- FileDialog, SettingsDialog
- + editor/* subdirectory
- + graph/* subdirectory

**~40-50 components + tests**

## PR #25: Move Remaining Components (Batch 2)

### Components to Move:

- All remaining root components
- preview/* subdirectory
- export/* subdirectory
- onboarding/* subdirectory
- help/* subdirectory
- All other subdirectories

**~60-70 components + tests**

## Update Component Imports

### Before:
```svelte
<script lang="ts">
  import { currentStory, projectActions } from '$lib/stores/projectStore';
  import { Passage } from '$lib/models/Passage';
</script>
```

### After:
```svelte
<script lang="ts">
  import { currentStory } from '@whisker/editor-base/stores';
  import { passageOperations } from '@whisker/editor-base/stores';
  import { Passage } from '@whisker/core-ts';
</script>
```

## Component Migration Pattern

1. Move component file
2. Move test file
3. Update imports in component
4. Update imports in test
5. Test component individually
6. Move to next component

## Export Components

### `packages/editor-base/src/components/index.ts`

```typescript
/**
 * Editor components
 */

// Core UI
export { default as MenuBar } from './MenuBar.svelte';
export { default as Toolbar } from './Toolbar.svelte';
export { default as StatusBar } from './StatusBar.svelte';
export { default as GraphView } from './GraphView.svelte';
export { default as PassageList } from './PassageList.svelte';
export { default as PropertiesPanel } from './PropertiesPanel.svelte';
// ... export all components

// Editor
export { default as MonacoEditor } from './editor/MonacoEditor.svelte';
export { default as ValidationPanel } from './editor/ValidationPanel.svelte';

// Graph
export { default as PassageNode } from './graph/PassageNode.svelte';
export { default as ConnectionEdge } from './graph/ConnectionEdge.svelte';

// ... etc for all subdirectories
```

## Success Criteria

- ✅ All ~116 components moved
- ✅ All 115 component tests pass
- ✅ Components import correctly from stores
- ✅ Full test suite passes (5,442 tests)

---

# PR #26: Move Services & Utils to @whisker/editor-base

**Goal**: Extract editor-specific services and utilities

**Estimated Effort**: 2-3 days
**Lines Changed**: ~150
**Risk**: LOW

## Package Structure

```
packages/editor-base/
├── src/
│   ├── services/
│   │   ├── storage/
│   │   │   ├── StorageServiceFactory.ts
│   │   │   ├── IndexedDBStorageAdapter.ts
│   │   │   ├── LocalStorageAdapter.ts
│   │   │   ├── PreferenceService.ts
│   │   │   ├── migration.ts
│   │   │   ├── typeAdapter.ts
│   │   │   └── types.ts
│   │   ├── github/
│   │   │   ├── GitHubService.ts
│   │   │   └── types.ts
│   │   ├── errorTracking.ts
│   │   └── telemetry.ts
│   ├── utils/
│   │   ├── gridSnap.ts
│   │   ├── colorUtils.ts
│   │   ├── dateUtils.ts
│   │   └── index.ts
│   └── index.ts
└── tests/
    ├── services/ (15 test files)
    └── utils/ (10 test files)
```

## Move Files

```bash
# Services
mv src/lib/services/* packages/editor-base/src/services/

# Editor-specific utils
mv src/lib/utils/gridSnap.ts packages/editor-base/src/utils/
mv src/lib/utils/colorUtils.ts packages/editor-base/src/utils/
# ... other editor-specific utils
```

## Update Imports

Services should import from `@whisker/core-ts` for models.

## Export Services

### `packages/editor-base/src/services/index.ts`

```typescript
/**
 * Editor services
 */

export * from './storage';
export * from './github';
export * from './errorTracking';
export * from './telemetry';
```

---

# PR #27: Move Export/Import to @whisker/editor-base

**Goal**: Extract export and import functionality

**Estimated Effort**: 2-3 days
**Lines Changed**: ~200
**Risk**: LOW

## Package Structure

```
packages/editor-base/
├── src/
│   ├── export/
│   │   ├── formats/
│   │   │   ├── JSONExporter.ts
│   │   │   ├── HTMLExporter.ts
│   │   │   ├── MarkdownExporter.ts
│   │   │   ├── TwineExporter.ts
│   │   │   ├── StaticSiteExporter.ts
│   │   │   └── index.ts
│   │   ├── templates/
│   │   ├── themes/
│   │   ├── utils/
│   │   └── index.ts
│   ├── import/
│   │   ├── formats/
│   │   │   ├── JSONImporter.ts
│   │   │   ├── TwineImporter.ts
│   │   │   ├── InkleImporter.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
└── tests/
    ├── export/ (9 test files)
    └── import/ (3 test files)
```

## Move Files

```bash
mv src/lib/export/* packages/editor-base/src/export/
mv src/lib/import/* packages/editor-base/src/import/
```

**Note**: MinecraftExporter and RobloxExporter will move to kids-mode package later.

## Export from Package

### `packages/editor-base/src/index.ts`

```typescript
/**
 * @whisker/editor-base
 *
 * Editor platform for Whisker.
 * Includes stores, components, services, export/import.
 */

export * from './stores';
export * from './components';
export * from './services';
export * from './export';
export * from './import';
export * from './utils';
export * from './plugins'; // From Phase 0
```

## Success Criteria

- ✅ All export/import files moved
- ✅ All 12 export/import tests pass
- ✅ Exporters can access models from @whisker/core-ts
- ✅ Full test suite passes

---

# Phase 2 Summary

After completing all 5 PRs:

### Package: @whisker/editor-base

**Contains**:
- ✅ Stores (35 stores for editor state)
- ✅ Components (116 Svelte components)
- ✅ Services (storage, GitHub, telemetry)
- ✅ Export/Import (5 exporters, 3 importers)
- ✅ Utils (editor-specific utilities)
- ✅ Plugins (PluginManager from Phase 0)

**Tests**: ~140 test files, ~3000 tests
**Lines**: ~80,000 lines of code
**Dependencies**: @whisker/core-ts, svelte

**Consumers**:
- apps/writewhisker (main editor app)
- @whisker/if-extensions (for game UI)
- External editor projects

### Updated Workspace Structure

```
whisker-editor-web/
├── packages/
│   ├── core-ts/              ✅ COMPLETE
│   │   └── models, validation, player, engine, export, utils
│   └── editor-base/          ✅ COMPLETE
│       └── stores, components, services, export, import
└── apps/
    └── writewhisker/         ⏳ PENDING (Phase 5)
```

### Build and Publish

```bash
# Build all packages
pnpm build

# Test all packages
pnpm test

# Verify no circular dependencies
pnpm exec madge --circular packages/*/src/index.ts
```

### Success Criteria

- ✅ Both packages build successfully
- ✅ All ~3,140 tests pass (400 core + 2,740 editor)
- ✅ Full app test suite passes (5,442 tests)
- ✅ No circular dependencies
- ✅ TypeScript compiles with no errors
- ✅ Components render correctly
- ✅ Stores work as expected
- ✅ Ready to extract IF extensions (Phase 3)

---

**Next**: Phase 3 - Extract IF Extensions
