# Whisker Package Dependency Audit

**Date**: November 20, 2025
**Purpose**: Phase 5C - Package Dependency Cleanup

## Package Dependency Overview

### Core Package (`core-ts`)
**Dependencies**:
- `nanoid` - ID generation
**Peer Dependencies**: None
**Status**: ✅ Clean - minimal dependencies

---

### UI/Framework Packages

#### `editor-base`
**Dependencies**:
- `@writewhisker/*`: analytics, audio, core-ts, export, github, import, scripting, storage
- `@xyflow/svelte` - Flow diagram library
- `dagre` - Graph layout
- `isomorphic-dompurify` - HTML sanitization
- `jszip` - ZIP file handling
- `marked` - Markdown parsing
- `nanoid` - ID generation
- ⚠️ `svelte` - **Should be peer dependency**
- `svelte-virtual-list` - Virtual scrolling

**Issues**:
- ❌ `svelte` should be peer dependency (not regular)
- ❌ `@xyflow/svelte` requires svelte as peer
- ❌ `svelte-virtual-list` requires svelte as peer

**Recommendation**:
```json
{
  "dependencies": {
    // Keep all except svelte
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  }
}
```

#### `github`
**Dependencies**:
- `@octokit/rest` - GitHub API
- `@writewhisker/storage` - Token storage
- ⚠️ `svelte` - **Should be peer dependency**

**Issues**:
- ❌ `svelte` should be peer dependency

**Recommendation**:
```json
{
  "dependencies": {
    "@octokit/rest": "^21.0.0",
    "@writewhisker/storage": "workspace:*"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  }
}
```

#### `shared-ui`
**Dependencies**: None
**Peer Dependencies**: `svelte`
**Status**: ✅ Correct - svelte as peer only

#### `player-ui`
**Dependencies**: `@writewhisker/core-ts`
**Status**: ✅ Clean - no UI framework dependencies

---

### Feature Packages

#### `analytics`
**Dependencies**: `@writewhisker/core-ts`
**Status**: ✅ Clean

#### `audio`
**Dependencies**: None
**Status**: ✅ Clean - uses Web Audio API

#### `export`
**Dependencies**:
- `@writewhisker/core-ts`
- `html2canvas` - HTML to canvas
- `isomorphic-dompurify` - HTML sanitization
- `jspdf` - PDF generation
- `jszip` - ZIP files
- `marked` - Markdown
- `nanoid` - IDs

**Status**: ✅ Clean - all necessary

#### `game-systems`
**Dependencies**:
- `@writewhisker/core-ts`
- `nanoid`

**Status**: ✅ Clean

#### `import`
**Dependencies**:
- `@writewhisker/core-ts`
- `nanoid`

**Status**: ✅ Clean

#### `macros`
**Dependencies**: `@writewhisker/core-ts`
**Status**: ✅ Clean

#### `publishing`
**Dependencies**: `@writewhisker/core-ts`
**Peer Dependencies**: `@writewhisker/editor-base`
**Status**: ✅ Correct peer dependency usage

#### `scripting`
**Dependencies**:
- `@writewhisker/core-ts`
- `wasmoon` - Lua VM

**Peer Dependencies**: `monaco-editor`
**Status**: ✅ Correct - monaco as peer

#### `storage`
**Dependencies**:
- `@writewhisker/core-ts`
- `eventemitter3` - Event system
- `idb` - IndexedDB wrapper

**Status**: ✅ Clean

#### `validation`
**Dependencies**:
- `@writewhisker/core-ts`
- `chalk` - Terminal colors
- `commander` - CLI framework
- `glob` - File matching

**Status**: ✅ Clean - CLI dependencies appropriate

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                           core-ts                                │
│                         (nanoid only)                            │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ (Used by all packages)
         │
    ┌────┴─────┬──────────┬──────────┬──────────┬──────────┬──────┐
    ↓          ↓          ↓          ↓          ↓          ↓      ↓
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐ ...
│analytics│ │ audio  │ │ export │ │ import │ │macros │ │storage │
└────────┘ └────────┘ └────────┘ └────────┘ └───────┘ └────┬───┘
                                                             │
    ┌────────────────────────────────────────────────────────┘
    │
    ↓
┌─────────┐
│ github  │ (uses storage)
│(+ svelte)│
└─────┬───┘
      │
      │
┌─────┴──────────────────────────────────────────────┐
│                  editor-base                        │
│  (aggregates: analytics, audio, export, github,    │
│   import, scripting, storage)                      │
│  (+ svelte, flow libs, markdown, zip)              │
└────────────────────────────────────────────────────┘
                     ↑
                     │ (peer dep)
                     │
                ┌────┴─────┐
                │publishing│
                └──────────┘
```

---

## Issues Found

### Critical

1. **Svelte as Regular Dependency**
   - **Packages**: `editor-base`, `github`
   - **Issue**: Svelte should be peer dependency to avoid version conflicts
   - **Impact**: High - can cause bundle duplication
   - **Fix Priority**: 🔴 High

### Warnings

2. **Circular Dependency (Fixed)**
   - **Packages**: `editor-base` ↔ `publishing`
   - **Status**: ✅ Fixed (removed publishing from editor-base deps)

---

## Recommendations

### 1. Move Svelte to Peer Dependencies

**editor-base/package.json**:
```json
{
  "dependencies": {
    "@writewhisker/analytics": "workspace:*",
    "@writewhisker/audio": "workspace:*",
    "@writewhisker/core-ts": "workspace:*",
    "@writewhisker/export": "workspace:*",
    "@writewhisker/github": "workspace:*",
    "@writewhisker/import": "workspace:*",
    "@writewhisker/scripting": "workspace:*",
    "@writewhisker/storage": "workspace:*",
    "@xyflow/svelte": "^1.4.1",
    "dagre": "^0.8.5",
    "isomorphic-dompurify": "^2.0.0",
    "jszip": "^3.10.0",
    "marked": "^12.0.0",
    "nanoid": "^5.0.0",
    "svelte-virtual-list": "^0.4.2"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  }
}
```

**github/package.json**:
```json
{
  "dependencies": {
    "@octokit/rest": "^21.0.0",
    "@writewhisker/storage": "workspace:*"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  }
}
```

### 2. Optional Dependencies

Consider marking these as optional:
- `monaco-editor` in scripting (already peer)
- `jspdf` in export (for PDF export only)
- `html2canvas` in export (for screenshot only)

### 3. Tree-Shaking Configuration

Ensure all packages have proper `sideEffects`:

```json
{
  "sideEffects": false
}
```

This allows bundlers to tree-shake unused code.

---

## Bundle Size Analysis

### Current Sizes (Estimated)

| Package | Size (gzipped) | Dependencies |
|---------|----------------|--------------|
| core-ts | ~50KB | 1 |
| analytics | ~5KB | 1 |
| audio | ~3KB | 0 |
| storage | ~15KB | 3 |
| scripting | ~200KB | 2 (Lua VM) |
| export | ~150KB | 7 (PDF, canvas) |
| import | ~10KB | 2 |
| github | ~80KB | 2 |
| game-systems | ~20KB | 2 |
| macros | ~5KB | 1 |
| validation | ~30KB | 4 |
| player-ui | ~10KB | 1 |
| shared-ui | ~2KB | 0 |
| publishing | ~5KB | 1 |
| **editor-base** | **~600KB** | **8 + heavy deps** |

### Optimization Opportunities

1. **Lazy Loading** - Export could lazy-load PDF/canvas libraries
2. **Code Splitting** - editor-base could split by feature
3. **Dynamic Imports** - Lua VM could be dynamically imported
4. **Remove Duplicates** - Ensure single svelte instance

---

## Action Items

### High Priority
- [ ] Move svelte to peer dependency in editor-base
- [ ] Move svelte to peer dependency in github
- [ ] Add sideEffects: false to all packages
- [ ] Test builds after changes

### Medium Priority
- [ ] Mark jspdf and html2canvas as optional in export
- [ ] Add bundle size reports to CI
- [ ] Document bundle sizes in each package README

### Low Priority
- [ ] Investigate lazy loading for large dependencies
- [ ] Consider splitting editor-base into features
- [ ] Add dependency visualization tool

---

## Verification Steps

After making changes:

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Build All Packages**
   ```bash
   pnpm build
   ```

3. **Run Tests**
   ```bash
   pnpm test
   ```

4. **Check Bundle Sizes**
   ```bash
   pnpm --filter @writewhisker/editor-base run build
   # Check dist/ sizes
   ```

5. **Verify No Circular Dependencies**
   ```bash
   pnpm test # Should not error about cycles
   ```

---

## Dependencies by Category

### Zero External Dependencies
- `audio` - Uses Web Audio API

### Minimal (1-2 deps)
- `core-ts` (1: nanoid)
- `analytics` (1: core-ts)
- `macros` (1: core-ts)
- `player-ui` (1: core-ts)
- `publishing` (1: core-ts + peer)

### Moderate (3-5 deps)
- `game-systems` (2: core-ts, nanoid)
- `import` (2: core-ts, nanoid)
- `storage` (3: core-ts, eventemitter3, idb)
- `github` (2: octokit, storage + svelte)
- `validation` (4: core-ts, chalk, commander, glob)

### Heavy (6+ deps)
- `export` (7: core-ts, canvas, pdf, zip, markdown, etc.)
- `scripting` (2: core-ts, wasmoon - but Lua VM is large)
- `editor-base` (8+ workspace deps + UI libs)

---

## Conclusion

The dependency structure is generally clean with a few critical issues:

1. **Svelte should be peer dependency** in editor-base and github
2. **Circular dependency resolved** between editor-base and publishing
3. **Most packages have minimal dependencies** which is good

After fixing the Svelte peer dependency issues, the architecture will be solid and maintainable.
