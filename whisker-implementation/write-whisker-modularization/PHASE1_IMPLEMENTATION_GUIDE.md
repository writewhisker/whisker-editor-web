# Phase 1: Extract Core Runtime - Implementation Guide

## Overview

Phase 1 extracts the core runtime components into the `@whisker/core-ts` package. This package contains models, validation, player, and utilities - everything needed to create, validate, and run stories without editor UI.

**Prerequisites**: Phase 0 must be complete (projectStore refactored, plugin system built)

**Timeline**: 2 weeks (Week 5-6)
**PRs**: 6 (PRs #17-22)
**Effort**: 12-18 developer-days

---

# PR #17: Move Models to @whisker/core-ts

**Goal**: Extract all model classes and types to core package

**Estimated Effort**: 2-3 days
**Lines Changed**: ~200
**Risk**: LOW

## Package Structure

Create the following structure:

```
packages/core-ts/
├── src/
│   ├── models/
│   │   ├── Story.ts
│   │   ├── Passage.ts
│   │   ├── Choice.ts
│   │   ├── Variable.ts
│   │   ├── LuaFunction.ts
│   │   ├── ScriptBlock.ts
│   │   ├── Playthrough.ts
│   │   ├── ChangeLog.ts
│   │   ├── Comment.ts
│   │   ├── Collaborator.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── whiskerCoreAdapter.ts
│   │   └── index.ts
│   └── index.ts
├── tests/
│   ├── models/
│   │   ├── Story.test.ts
│   │   ├── Passage.test.ts
│   │   ├── Choice.test.ts
│   │   ├── Variable.test.ts
│   │   ├── Playthrough.test.ts
│   │   └── LuaFunction.test.ts
│   └── utils/
│       └── whiskerCoreAdapter.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Step 1: Create Package Configuration

### `packages/core-ts/package.json`

```json
{
  "name": "@whisker/core-ts",
  "version": "0.1.0",
  "description": "Core TypeScript runtime for Whisker story engine",
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
    "./models": {
      "types": "./dist/models/index.d.ts",
      "import": "./dist/models/index.js"
    },
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "import": "./dist/utils/index.js"
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
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
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
    "directory": "packages/core-ts"
  }
}
```

### `packages/core-ts/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `packages/core-ts/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['nanoid'],
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
```

## Step 2: Move Model Files

### Move Files:

```bash
# From whisker-editor-web root:
mv src/lib/models/* packages/core-ts/src/models/
mv src/lib/utils/whiskerCoreAdapter.ts packages/core-ts/src/utils/
```

### Update Imports in Moved Files

**Before** (in Story.ts):
```typescript
import type { StoryData } from './types';
import { Passage } from './Passage';
import { generateIfid, toWhiskerCoreFormat } from '../utils/whiskerCoreAdapter';
```

**After**:
```typescript
import type { StoryData } from './types';
import { Passage } from './Passage';
import { generateIfid, toWhiskerCoreFormat } from '../utils/whiskerCoreAdapter';
```

(Imports stay the same - relative paths still work!)

## Step 3: Create Package Exports

### `packages/core-ts/src/index.ts`

```typescript
/**
 * @whisker/core-ts
 *
 * Core TypeScript runtime for Whisker story engine.
 * Includes models, validation, player, and utilities.
 */

// Models
export * from './models';

// Utils
export * from './utils';
```

### `packages/core-ts/src/models/index.ts`

```typescript
/**
 * Story models and types
 */

export { Story } from './Story';
export { Passage } from './Passage';
export { Choice } from './Choice';
export { Variable } from './Variable';
export { LuaFunction } from './LuaFunction';
export { ScriptBlock } from './ScriptBlock';
export { Playthrough } from './Playthrough';
export { ChangeLog } from './ChangeLog';
export { Comment } from './Comment';
export { Collaborator } from './Collaborator';

export type * from './types';
```

### `packages/core-ts/src/utils/index.ts`

```typescript
/**
 * Utility functions
 */

export * from './whiskerCoreAdapter';
```

## Step 4: Move Tests

```bash
mv src/lib/models/*.test.ts packages/core-ts/tests/models/
```

### Update Test Imports

**Before**:
```typescript
import { Story } from './Story';
import { Passage } from './Passage';
```

**After**:
```typescript
import { Story } from '../src/models/Story';
import { Passage } from '../src/models/Passage';
```

## Step 5: Update Editor Stores to Import from Package

### In `packages/editor-base/src/stores/storyStateStore.ts`

**Before**:
```typescript
import { Story } from '../models/Story';
import type { ProjectData } from '../models/types';
```

**After**:
```typescript
import { Story } from '@whisker/core-ts';
import type { ProjectData } from '@whisker/core-ts';
```

### Update All Stores:

Files to update (search for `from '../models/`):
- storyStateStore.ts
- passageOperationsStore.ts
- fileOperationsStore.ts
- validationStore.ts
- playerStore.ts
- All other stores that import models

## Step 6: Add Package to Workspace

### Update `package.json` (root)

```json
{
  "dependencies": {
    "@whisker/core-ts": "workspace:*"
  }
}
```

### Update `tsconfig.json` (root)

```json
{
  "references": [
    { "path": "./packages/core-ts" }
  ]
}
```

## Step 7: Build and Test

```bash
# Install dependencies
pnpm install

# Build core-ts package
cd packages/core-ts
pnpm build

# Run tests
pnpm test

# Go back to root
cd ../..

# Run full test suite
pnpm test
```

## Step 8: Create README

### `packages/core-ts/README.md`

```markdown
# @whisker/core-ts

Core TypeScript runtime for the Whisker story engine.

## Features

- **Story Models**: Story, Passage, Choice, Variable
- **Serialization**: JSON import/export
- **Validation**: Type-safe story structures
- **whisker-core Compatibility**: Export to whisker-core format

## Installation

\`\`\`bash
npm install @whisker/core-ts
\`\`\`

## Usage

\`\`\`typescript
import { Story, Passage, Choice } from '@whisker/core-ts';

// Create a new story
const story = new Story({
  metadata: {
    title: 'My Story',
    author: 'Me',
  },
});

// Add a passage
const passage = new Passage({
  title: 'Start',
  content: 'Welcome to my story!',
});

story.addPassage(passage);

// Serialize to JSON
const json = story.serializeProject();
\`\`\`

## API Documentation

See [docs](../../docs/api/core-ts.md) for full API documentation.

## License

AGPL-3.0
```

## Success Criteria

- ✅ All model files moved to @whisker/core-ts
- ✅ Package builds successfully (`pnpm build`)
- ✅ All tests pass (6 model tests)
- ✅ Editor stores can import from @whisker/core-ts
- ✅ Full test suite passes (5,442 tests)
- ✅ No import errors in editor

## Rollback Plan

If issues occur:
1. Revert all import changes in stores
2. Move files back to src/lib/models
3. Delete packages/core-ts
4. Run tests to verify

---

# PR #18: Move Validation to @whisker/core-ts

**Goal**: Extract validation system to core package

**Estimated Effort**: 2 days
**Lines Changed**: ~150
**Risk**: LOW

## Package Structure Updates

```
packages/core-ts/
├── src/
│   ├── validation/
│   │   ├── StoryValidator.ts
│   │   ├── validators/
│   │   │   ├── DeadLinksValidator.ts
│   │   │   ├── EmptyPassagesValidator.ts
│   │   │   ├── MissingStartPassageValidator.ts
│   │   │   ├── UndefinedVariablesValidator.ts
│   │   │   ├── ValidateAssetsValidator.ts
│   │   │   ├── ValidateIFIDValidator.ts
│   │   │   ├── ValidatePassageMetadataValidator.ts
│   │   │   ├── ValidateScriptsValidator.ts
│   │   │   ├── ValidateStylesheetsValidator.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts (update)
└── tests/
    └── validation/
        ├── StoryValidator.test.ts
        └── validators/
            └── *.test.ts (15 files)
```

## Move Files

```bash
mv src/lib/validation/* packages/core-ts/src/validation/
```

## Update Imports

Validation files already import from `../models` which will become `../../models` - update accordingly.

## Export from Package

### `packages/core-ts/src/validation/index.ts`

```typescript
export { StoryValidator } from './StoryValidator';
export * from './validators';
```

### Update `packages/core-ts/src/index.ts`

```typescript
export * from './models';
export * from './utils';
export * from './validation'; // Add this
```

## Update Editor Stores

In `validationStore.ts`:

**Before**:
```typescript
import { StoryValidator } from '../validation/StoryValidator';
```

**After**:
```typescript
import { StoryValidator } from '@whisker/core-ts';
```

## Success Criteria

- ✅ Validation system in @whisker/core-ts
- ✅ All 15 validator tests pass
- ✅ validationStore imports correctly
- ✅ Full test suite passes

---

# PR #19: Move Player to @whisker/core-ts

**Goal**: Extract story player runtime

**Estimated Effort**: 1-2 days
**Lines Changed**: ~100
**Risk**: LOW

## Package Structure

```
packages/core-ts/
├── src/
│   ├── player/
│   │   ├── StoryPlayer.ts
│   │   ├── TestScenarioRunner.ts
│   │   ├── VariableInspector.ts
│   │   ├── BreakpointManager.ts
│   │   └── index.ts
│   └── index.ts (update)
└── tests/
    └── player/
        ├── StoryPlayer.test.ts
        ├── TestScenarioRunner.test.ts
        └── VariableInspector.test.ts
```

## Move and Update

Same pattern as validation - move files, update imports, export from package.

---

# PR #20: Move Utils to @whisker/core-ts

**Goal**: Consolidate core utilities

**Estimated Effort**: 1-2 days
**Lines Changed**: ~100
**Risk**: LOW

## Additional Utils to Move

```bash
mv src/lib/utils/connectionValidator.ts packages/core-ts/src/utils/
mv src/lib/utils/textUtils.ts packages/core-ts/src/utils/
```

Keep editor-specific utils in editor-base.

---

# PR #21: Add StoryEngine to @whisker/core-ts

**Goal**: Implement story runtime engine

**Estimated Effort**: 3-4 days
**Lines Changed**: ~300
**Risk**: MEDIUM

## New Files to Create

### `packages/core-ts/src/engine/StoryEngine.ts`

```typescript
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import type { Choice } from '../models/Choice';

/**
 * StoryEngine - Runtime engine for navigating stories
 */
export class StoryEngine {
  private story: Story;
  private currentPassageId: string | null = null;
  private history: string[] = [];
  private state: Map<string, any> = new Map();

  constructor(story: Story) {
    this.story = story;
    this.currentPassageId = story.startPassage;
  }

  /**
   * Get current passage
   */
  getCurrentPassage(): Passage | null {
    if (!this.currentPassageId) return null;
    return this.story.getPassage(this.currentPassageId);
  }

  /**
   * Navigate to a passage
   */
  navigateTo(passageId: string): void {
    const passage = this.story.getPassage(passageId);
    if (!passage) {
      throw new Error(`Passage "${passageId}" not found`);
    }

    // Add to history
    if (this.currentPassageId) {
      this.history.push(this.currentPassageId);
    }

    this.currentPassageId = passageId;
  }

  /**
   * Navigate by choice
   */
  selectChoice(choice: Choice): void {
    this.navigateTo(choice.targetPassageId);
  }

  /**
   * Go back
   */
  goBack(): boolean {
    if (this.history.length === 0) return false;

    const previousId = this.history.pop()!;
    this.currentPassageId = previousId;
    return true;
  }

  /**
   * Restart story
   */
  restart(): void {
    this.currentPassageId = this.story.startPassage;
    this.history = [];
    this.state.clear();
  }

  /**
   * Get/set state variables
   */
  getVariable(name: string): any {
    return this.state.get(name);
  }

  setVariable(name: string, value: any): void {
    this.state.set(name, value);
  }

  /**
   * Get navigation history
   */
  getHistory(): string[] {
    return [...this.history];
  }

  /**
   * Serialize engine state
   */
  serialize() {
    return {
      currentPassageId: this.currentPassageId,
      history: this.history,
      state: Array.from(this.state.entries()),
    };
  }

  /**
   * Restore engine state
   */
  static deserialize(story: Story, data: any): StoryEngine {
    const engine = new StoryEngine(story);
    engine.currentPassageId = data.currentPassageId;
    engine.history = data.history;
    engine.state = new Map(data.state);
    return engine;
  }
}
```

### `packages/core-ts/src/engine/StateManager.ts`

```typescript
/**
 * StateManager - Manages story state and variables
 */
export class StateManager {
  private variables: Map<string, any> = new Map();
  private metadata: Map<string, any> = new Map();

  /**
   * Set a variable
   */
  set(name: string, value: any): void {
    this.variables.set(name, value);
  }

  /**
   * Get a variable
   */
  get(name: string): any {
    return this.variables.get(name);
  }

  /**
   * Check if variable exists
   */
  has(name: string): boolean {
    return this.variables.has(name);
  }

  /**
   * Delete a variable
   */
  delete(name: string): boolean {
    return this.variables.delete(name);
  }

  /**
   * Clear all variables
   */
  clear(): void {
    this.variables.clear();
  }

  /**
   * Get all variables
   */
  getAll(): Map<string, any> {
    return new Map(this.variables);
  }

  /**
   * Set metadata
   */
  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }

  /**
   * Get metadata
   */
  getMetadata(key: string): any {
    return this.metadata.get(key);
  }

  /**
   * Serialize state
   */
  serialize() {
    return {
      variables: Array.from(this.variables.entries()),
      metadata: Array.from(this.metadata.entries()),
    };
  }

  /**
   * Deserialize state
   */
  static deserialize(data: any): StateManager {
    const manager = new StateManager();
    manager.variables = new Map(data.variables);
    manager.metadata = new Map(data.metadata);
    return manager;
  }
}
```

### `packages/core-ts/src/engine/Evaluator.ts`

```typescript
/**
 * Evaluator - Evaluates conditional expressions
 */
export class Evaluator {
  /**
   * Evaluate a condition
   */
  static evaluate(expression: string, context: Map<string, any>): boolean {
    try {
      // Simple expression evaluation
      // This is a basic implementation - can be enhanced

      // Replace variable names with their values
      let evaluated = expression;
      for (const [key, value] of context.entries()) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluated = evaluated.replace(regex, JSON.stringify(value));
      }

      // Evaluate the expression
      // Using Function is safer than eval for this use case
      const fn = new Function(`return ${evaluated}`);
      return !!fn();
    } catch (err) {
      console.error('Failed to evaluate expression:', expression, err);
      return false;
    }
  }

  /**
   * Check if expression is valid
   */
  static isValid(expression: string): boolean {
    try {
      new Function(`return ${expression}`);
      return true;
    } catch {
      return false;
    }
  }
}
```

### Tests for Engine

Create comprehensive tests (30+ tests) for StoryEngine, StateManager, and Evaluator.

---

# PR #22: Add WhiskerExporter to @whisker/core-ts

**Goal**: Implement whisker-core format exporter

**Estimated Effort**: 2-3 days
**Lines Changed**: ~200
**Risk**: LOW

## Implementation

### `packages/core-ts/src/export/WhiskerExporter.ts`

```typescript
import type { Story } from '../models/Story';
import type { WhiskerCoreFormat, WhiskerFormatV21 } from '../models/types';
import { toWhiskerCoreFormat, toWhiskerFormatV21 } from '../utils/whiskerCoreAdapter';

/**
 * WhiskerExporter - Exports stories to whisker-core JSON format
 */
export class WhiskerExporter {
  /**
   * Export to whisker-core v1.0 format
   */
  static exportV1(story: Story): WhiskerCoreFormat {
    return toWhiskerCoreFormat(story);
  }

  /**
   * Export to whisker-core v2.1 format
   */
  static exportV2(story: Story): WhiskerFormatV21 {
    return toWhiskerFormatV21(story);
  }

  /**
   * Export with auto-version detection
   */
  static export(story: Story, version: '1.0' | '2.1' = '2.1'): WhiskerCoreFormat | WhiskerFormatV21 {
    return version === '1.0' ? this.exportV1(story) : this.exportV2(story);
  }

  /**
   * Validate exported format
   */
  static validate(data: WhiskerCoreFormat | WhiskerFormatV21): boolean {
    // Basic validation
    if (!data.name || !data.startnode) return false;
    if (!data.passages || typeof data.passages !== 'object') return false;

    return true;
  }
}
```

### Tests

Add comprehensive tests for export functionality and format validation.

---

## Phase 1 Summary

After completing all 6 PRs:

### Package: @whisker/core-ts

**Contains**:
- ✅ Models (Story, Passage, Choice, Variable, etc.)
- ✅ Validation (StoryValidator + 16 validators)
- ✅ Player (StoryPlayer, TestScenarioRunner)
- ✅ Engine (StoryEngine, StateManager, Evaluator)
- ✅ Export (WhiskerExporter)
- ✅ Utils (whiskerCoreAdapter, connectionValidator, etc.)

**Tests**: ~30 test files, ~400 tests
**Lines**: ~8,000 lines of code
**Dependencies**: Only nanoid (external)

**Consumers**:
- @whisker/editor-base (for UI)
- @whisker/if-extensions (for game features)
- External projects (OnboardFlow, etc.)

### Success Criteria

- ✅ Package builds successfully
- ✅ All ~400 core tests pass
- ✅ Full app test suite passes (5,442 tests)
- ✅ Editor can import from @whisker/core-ts
- ✅ No circular dependencies
- ✅ TypeScript compiles with no errors
- ✅ Ready for npm publishing

---

**Next**: Phase 2 - Extract Editor Base
