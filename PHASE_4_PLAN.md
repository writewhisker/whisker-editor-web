# Phase 4: Whisker-Core Feature Parity & Advanced Export

**Status:** COMPLETE
**Actual Duration:** 3 weeks
**Dependencies:** Phase 3 ✅ Complete
**Completion Date:** November 19, 2025

---

## Executive Summary

Phase 4 focuses on achieving feature parity between the import/export system and whisker-core capabilities, with emphasis on making exported HTML stories fully functional with Lua scripting, asset management, and advanced player features.

### Current State

**What Works:**
- ✅ Import: JSON (full), Twine 2 (good conversion)
- ✅ Export: 6 formats with 14 themes
- ✅ 95%+ test coverage
- ✅ Comprehensive documentation

**What's Missing (from Gap Analysis):**
- ❌ Lua functions not exported/executed
- ❌ Assets not embedded in HTML/EPUB
- ❌ Choice conditions not evaluated in HTML player
- ❌ Passage lifecycle scripts (onEnter/onExit) not executed
- ❌ Story settings (undo, save/load) not implemented in HTML player
- ❌ EditorData (v2.1) not preserved in whisker-core export

---

## Phase 4A: Lua Runtime Integration

**Objective:** Make HTML exports fully scriptable with Lua execution

**Priority:** HIGH
**Estimated Time:** 1 week

### Tasks

#### 1. Add Lua Functions to JSON/WhiskerCore Exporters

**Priority:** High
**Estimated Time:** 2-3 hours

**Location:** `packages/export/src/formats/WhiskerCoreExporter.ts`

**Current Issue:**
```typescript
// Story.luaFunctions exists but is not exported
const storyData = {
  metadata: story.metadata,
  passages: passagesMap,
  variables: variablesMap,
  // Missing: luaFunctions
};
```

**Solution:**
```typescript
export class WhiskerCoreExporter implements IExporter {
  async export(context: ExportContext): Promise<ExportResult> {
    // ... existing code ...

    // Add Lua functions to export
    const luaFunctionsMap: Record<string, LuaFunctionData> = {};
    if (story.luaFunctions && story.luaFunctions.size > 0) {
      for (const [id, func] of story.luaFunctions.entries()) {
        luaFunctionsMap[id] = {
          id: func.id,
          name: func.name,
          description: func.description,
          parameters: func.parameters,
          returnType: func.returnType,
          code: func.code,
        };
      }
    }

    const storyData = {
      metadata: story.metadata,
      passages: passagesMap,
      variables: variablesMap,
      luaFunctions: luaFunctionsMap, // Add this
      settings: story.settings,
      stylesheets: story.stylesheets,
      scripts: story.scripts,
    };
  }
}
```

**Test Coverage:**
- Create story with Lua functions
- Export to JSON
- Verify luaFunctions in output
- Round-trip test (export → import → export)

**Deliverable:** Lua functions preserved in JSON exports

---

#### 2. Integrate Fengari Lua Runtime in HTML Player

**Priority:** High
**Estimated Time:** 1-2 days

**Location:** `packages/export/src/formats/HTMLExporter.ts`

**Current Template:** Static HTML with no scripting
**Goal:** Add Lua runtime for dynamic behavior

**Implementation Plan:**

**Step 1: Add Fengari dependency**
```bash
pnpm --filter @writewhisker/export add fengari-web
```

**Step 2: Update HTML template to include Lua runtime**
```typescript
// In HTMLExporter.ts
private generateHTML(story: Story, theme: HTMLTheme, options: ExportOptions): string {
  const luaRuntime = this.generateLuaRuntime(story);

  return `<!DOCTYPE html>
<html lang="${options.language || 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${story.metadata.title}</title>
  ${this.generateStyles(theme, options)}

  <!-- Lua Runtime -->
  <script src="https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js"></script>
  <script>
    ${luaRuntime}
  </script>
</head>
<body>
  ${this.generatePlayerHTML(story)}
  ${this.generateScripts(story, options)}
</body>
</html>`;
}

private generateLuaRuntime(story: Story): string {
  // Embed Lua functions
  const luaFunctions = Array.from(story.luaFunctions?.values() || [])
    .map(func => func.code)
    .join('\n\n');

  // Embed story scripts
  const storyScripts = story.scripts?.join('\n\n') || '';

  return `
    // Initialize Lua environment
    const L = fengari.lauxlib.luaL_newstate();
    fengari.lualib.luaL_openlibs(L);

    // Load story functions
    const luaCode = \`
      ${luaFunctions}

      ${storyScripts}
    \`;

    fengari.lauxlib.luaL_dostring(L, fengari.to_luastring(luaCode));

    // Helper to evaluate Lua expressions
    function evalLua(expression) {
      try {
        const result = fengari.lauxlib.luaL_dostring(
          L,
          fengari.to_luastring('return ' + expression)
        );
        if (result === fengari.lua.LUA_OK) {
          const value = fengari.lua.lua_toboolean(L, -1);
          fengari.lua.lua_pop(L, 1);
          return value;
        }
        return false;
      } catch (e) {
        console.error('Lua evaluation error:', e);
        return false;
      }
    }

    // Helper to call Lua functions
    function callLua(functionName, ...args) {
      try {
        fengari.lua.lua_getglobal(L, fengari.to_luastring(functionName));
        args.forEach(arg => {
          if (typeof arg === 'number') {
            fengari.lua.lua_pushnumber(L, arg);
          } else if (typeof arg === 'string') {
            fengari.lua.lua_pushstring(L, fengari.to_luastring(arg));
          } else if (typeof arg === 'boolean') {
            fengari.lua.lua_pushboolean(L, arg);
          }
        });
        fengari.lua.lua_call(L, args.length, 1);
        const result = fengari.lua.lua_tostring(L, -1);
        fengari.lua.lua_pop(L, 1);
        return fengari.to_jsstring(result);
      } catch (e) {
        console.error('Lua call error:', e);
        return null;
      }
    }
  `;
}
```

**Step 3: Update player to evaluate choice conditions**
```typescript
private generateScripts(story: Story, options: ExportOptions): string {
  return `
  <script>
    // Story state
    let currentPassage = null;
    const variables = ${JSON.stringify(this.serializeVariables(story.variables))};
    const history = [];

    // Navigate to passage
    function navigateToPassage(passageId) {
      const passage = passages[passageId];
      if (!passage) return;

      // Call onExit script for current passage
      if (currentPassage?.onExitScript) {
        try {
          callLua(currentPassage.onExitScript);
        } catch (e) {
          console.error('Exit script error:', e);
        }
      }

      // Update history
      history.push(currentPassage?.id);
      currentPassage = passage;

      // Call onEnter script
      if (passage.onEnterScript) {
        try {
          callLua(passage.onEnterScript);
        } catch (e) {
          console.error('Enter script error:', e);
        }
      }

      // Render passage
      renderPassage(passage);
    }

    // Render passage with conditional choices
    function renderPassage(passage) {
      const container = document.getElementById('passage-container');
      container.innerHTML = \`
        <div class="passage">
          <h2>\${passage.title}</h2>
          <div class="content">\${passage.content}</div>
          <div class="choices">
            \${renderChoices(passage.choices)}
          </div>
        </div>
      \`;
    }

    // Render choices with condition evaluation
    function renderChoices(choices) {
      return choices
        .filter(choice => {
          // Evaluate condition if present
          if (choice.condition) {
            return evalLua(choice.condition);
          }
          return true;
        })
        .map(choice => \`
          <button class="choice" onclick="navigateToPassage('\${choice.target}')">
            \${choice.text}
          </button>
        \`)
        .join('');
    }

    // Initialize
    const passages = ${this.serializePassages(story.passages)};
    navigateToPassage('${story.startPassage}');
  </script>
  `;
}
```

**Test Coverage:**
- Test Lua function execution
- Test choice condition evaluation (with/without conditions)
- Test passage lifecycle scripts (onEnter/onExit)
- Test Lua error handling
- Test variable access from Lua

**Deliverable:** HTML player with full Lua scripting support

---

#### 3. Add Story Scripts & Stylesheets to HTML Export

**Priority:** Medium
**Estimated Time:** 3-4 hours

**Current Issue:** Story-level scripts and stylesheets are ignored

**Solution:**
```typescript
private generateStyles(theme: HTMLTheme, options: ExportOptions): string {
  const themeCSS = generateThemeCSS(theme);
  const customCSS = options.customCSS || '';

  // Add story stylesheets
  const storyStylesheets = this.context.story.stylesheets?.join('\n') || '';

  return `
    <style>
      ${themeCSS}
      ${theme.customStyles || ''}
      ${storyStylesheets}
      ${customCSS}
    </style>
  `;
}
```

**Deliverable:** Story scripts and stylesheets applied in HTML exports

---

### Phase 4A Deliverables Summary

- ✅ Lua functions exported in JSON/WhiskerCore formats
- ✅ Fengari Lua runtime integrated in HTML player
- ✅ Choice conditions evaluated dynamically
- ✅ Passage lifecycle scripts (onEnter/onExit) executed
- ✅ Story scripts and stylesheets applied
- ✅ Test coverage for all Lua features

**Status:** COMPLETE (PR #139)
**Actual Time:** 1 week

---

## Phase 4B: Asset Management & Embedding

**Objective:** Embed assets in HTML/EPUB exports for standalone distribution

**Priority:** HIGH
**Estimated Time:** 4-5 days

### Tasks

#### 1. Implement Asset Embedding in HTML Exporter

**Priority:** High
**Estimated Time:** 2-3 days

**Location:** `packages/export/src/formats/HTMLExporter.ts`

**Current Issue:** Asset references point to external URLs that may break

**Solution:**

**Step 1: Add asset processing to export context**
```typescript
export interface ExportOptions {
  // ... existing options ...

  /** Embed assets as base64 */
  embedAssets?: boolean;

  /** Maximum asset size for embedding (bytes) */
  maxEmbedSize?: number; // Default: 1MB

  /** Asset processing mode */
  assetMode?: 'embed' | 'bundle' | 'external';
}

interface ProcessedAsset {
  id: string;
  type: 'image' | 'audio' | 'video' | 'font';
  originalUrl: string;
  embeddedData?: string; // Base64
  bundledPath?: string;  // For multi-file exports
  size: number;
}
```

**Step 2: Create asset processor**
```typescript
// packages/export/src/utils/assetProcessor.ts

export class AssetProcessor {
  /**
   * Process assets for export
   */
  async processAssets(
    assets: Map<string, AssetReference>,
    mode: 'embed' | 'bundle' | 'external',
    maxEmbedSize: number = 1024 * 1024 // 1MB
  ): Promise<ProcessedAsset[]> {
    const processed: ProcessedAsset[] = [];

    for (const [id, asset] of assets.entries()) {
      if (mode === 'embed') {
        // Embed as base64 if size permits
        if (asset.data) {
          processed.push({
            id: asset.id,
            type: asset.type,
            originalUrl: asset.url,
            embeddedData: asset.data,
            size: this.getBase64Size(asset.data),
          });
        } else if (this.isDataUrl(asset.url)) {
          // Already embedded
          processed.push({
            id: asset.id,
            type: asset.type,
            originalUrl: asset.url,
            embeddedData: asset.url,
            size: asset.metadata?.size || 0,
          });
        } else {
          // Fetch and embed if size permits
          const fetched = await this.fetchAsset(asset.url);
          if (fetched.size <= maxEmbedSize) {
            processed.push({
              id: asset.id,
              type: asset.type,
              originalUrl: asset.url,
              embeddedData: this.toBase64(fetched.data, asset.type),
              size: fetched.size,
            });
          } else {
            // Too large, keep as external reference
            processed.push({
              id: asset.id,
              type: asset.type,
              originalUrl: asset.url,
              size: fetched.size,
            });
          }
        }
      } else if (mode === 'bundle') {
        // Bundle as separate file
        const filename = `assets/${asset.type}s/${asset.id}${this.getExtension(asset.url)}`;
        processed.push({
          id: asset.id,
          type: asset.type,
          originalUrl: asset.url,
          bundledPath: filename,
          size: asset.metadata?.size || 0,
        });
      } else {
        // Keep external references
        processed.push({
          id: asset.id,
          type: asset.type,
          originalUrl: asset.url,
          size: asset.metadata?.size || 0,
        });
      }
    }

    return processed;
  }

  private toBase64(data: ArrayBuffer, type: string): string {
    const mimeType = this.getMimeType(type);
    const base64 = btoa(
      new Uint8Array(data).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    return `data:${mimeType};base64,${base64}`;
  }

  private getMimeType(type: string): string {
    const mimeTypes: Record<string, string> = {
      image: 'image/png',
      audio: 'audio/mpeg',
      video: 'video/mp4',
      font: 'font/woff2',
    };
    return mimeTypes[type] || 'application/octet-stream';
  }

  private async fetchAsset(url: string): Promise<{ data: ArrayBuffer; size: number }> {
    // Implementation depends on environment (browser vs Node)
    // For Node: use fetch or fs
    // For browser: use fetch API
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    return { data, size: data.byteLength };
  }

  private getBase64Size(base64: string): number {
    const base64Data = base64.split(',')[1] || base64;
    return (base64Data.length * 3) / 4;
  }

  private isDataUrl(url: string): boolean {
    return url.startsWith('data:');
  }

  private getExtension(url: string): string {
    const match = url.match(/\.([^./?#]+)(?:[?#]|$)/);
    return match ? `.${match[1]}` : '';
  }
}
```

**Step 3: Update HTML exporter to use asset processor**
```typescript
export class HTMLExporter implements IExporter {
  private assetProcessor = new AssetProcessor();

  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const { story, options } = context;

    try {
      // Process assets
      const assetMode = options.assetMode || (options.embedAssets ? 'embed' : 'external');
      const processedAssets = await this.assetProcessor.processAssets(
        story.assets || new Map(),
        assetMode,
        options.maxEmbedSize
      );

      // Generate HTML with embedded assets
      const html = this.generateHTML(story, theme, options, processedAssets);

      // Calculate size
      const size = new Blob([html]).size;

      return {
        success: true,
        content: html,
        format: 'html-standalone',
        filename: `${story.metadata.title}.html`,
        mimeType: 'text/html',
        size,
        duration: Date.now() - startTime,
        warnings: this.generateAssetWarnings(processedAssets),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  private generateAssetWarnings(assets: ProcessedAsset[]): string[] | undefined {
    const warnings: string[] = [];

    const externalAssets = assets.filter(a => !a.embeddedData && !a.bundledPath);
    if (externalAssets.length > 0) {
      warnings.push(
        `${externalAssets.length} asset(s) kept as external references (too large to embed). ` +
        `Exported HTML may not work offline.`
      );
    }

    const totalEmbeddedSize = assets
      .filter(a => a.embeddedData)
      .reduce((sum, a) => sum + a.size, 0);

    if (totalEmbeddedSize > 5 * 1024 * 1024) { // > 5MB
      warnings.push(
        `Embedded assets total ${(totalEmbeddedSize / 1024 / 1024).toFixed(2)}MB. ` +
        `Large HTML file may be slow to load.`
      );
    }

    return warnings.length > 0 ? warnings : undefined;
  }

  private updateContentWithAssets(content: string, assets: ProcessedAsset[]): string {
    let updatedContent = content;

    // Replace asset references with embedded data
    for (const asset of assets) {
      if (asset.embeddedData) {
        // Replace URL references with embedded data
        updatedContent = updatedContent.replace(
          new RegExp(this.escapeRegex(asset.originalUrl), 'g'),
          asset.embeddedData
        );
      } else if (asset.bundledPath) {
        // Replace with bundled path
        updatedContent = updatedContent.replace(
          new RegExp(this.escapeRegex(asset.originalUrl), 'g'),
          asset.bundledPath
        );
      }
    }

    return updatedContent;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
```

**Test Coverage:**
- Test embedding small images (<1MB)
- Test skipping large assets (>maxEmbedSize)
- Test base64 encoding/decoding
- Test asset URL replacement in content
- Test warning generation for external assets

**Deliverable:** HTML exports with embedded assets

---

#### 2. Implement Asset Embedding in EPUB Exporter

**Priority:** Medium
**Estimated Time:** 2 days

**Location:** `packages/export/src/formats/EPUBExporter.ts`

**Current Issue:** EPUB doesn't include referenced assets

**Solution:**

EPUB supports bundled assets natively (it's a ZIP with manifest).

```typescript
export class EPUBExporter implements IExporter {
  private assetProcessor = new AssetProcessor();

  async export(context: ExportContext): Promise<ExportResult> {
    const { story, options } = context;

    // Process assets for bundling
    const processedAssets = await this.assetProcessor.processAssets(
      story.assets || new Map(),
      'bundle', // EPUB always bundles
      Infinity  // No size limit for bundling
    );

    // Generate EPUB structure
    const epub = await this.generateEPUB(story, options, processedAssets);

    return {
      success: true,
      content: epub.buffer,
      format: 'epub',
      filename: `${story.metadata.title}.epub`,
      mimeType: 'application/epub+zip',
      size: epub.buffer.byteLength,
      duration: Date.now() - startTime,
    };
  }

  private async generateEPUB(
    story: Story,
    options: ExportOptions,
    assets: ProcessedAsset[]
  ): Promise<{ buffer: Buffer }> {
    const JSZip = require('jszip');
    const zip = new JSZip();

    // Add EPUB metadata files
    zip.file('mimetype', 'application/epub+zip');
    zip.file('META-INF/container.xml', this.generateContainerXML());
    zip.file('OEBPS/content.opf', this.generateContentOPF(story, assets));
    zip.file('OEBPS/toc.ncx', this.generateTOC(story));

    // Add story content
    for (const passage of story.passages.values()) {
      const filename = `OEBPS/${passage.id}.xhtml`;
      zip.file(filename, this.generatePassageXHTML(passage, story));
    }

    // Add assets to EPUB
    for (const asset of assets) {
      if (asset.bundledPath) {
        // Fetch asset data
        const assetData = await this.fetchAssetData(asset.originalUrl);
        zip.file(`OEBPS/${asset.bundledPath}`, assetData);
      }
    }

    // Generate ZIP
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    return { buffer };
  }

  private generateContentOPF(story: Story, assets: ProcessedAsset[]): string {
    const assetItems = assets.map(asset => {
      const mediaType = this.getMediaType(asset.type);
      return `<item id="${asset.id}" href="${asset.bundledPath}" media-type="${mediaType}"/>`;
    }).join('\n    ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata>
    <dc:title>${story.metadata.title}</dc:title>
    <dc:creator>${story.metadata.author}</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${assetItems}
    ${Array.from(story.passages.keys()).map((id, i) =>
      `<item id="passage-${i}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`
    ).join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${Array.from(story.passages.keys()).map((id, i) =>
      `<itemref idref="passage-${i}"/>`
    ).join('\n    ')}
  </spine>
</package>`;
  }
}
```

**Deliverable:** EPUB exports with bundled assets

---

### Phase 4B Deliverables Summary

- ✅ Asset embedding in HTML exports (base64)
- ✅ Asset bundling in EPUB exports
- ✅ Asset size warnings
- ✅ Configurable embedding thresholds
- ✅ Test coverage for asset processing

**Status:** COMPLETE (PR #140)
**Actual Time:** 5 days

---

## Phase 4C: Advanced Player Features

**Objective:** Implement story settings (undo, save/load) in HTML player

**Priority:** MEDIUM
**Estimated Time:** 1 week

### Tasks

#### 1. Implement Undo/Redo System

**Priority:** Medium
**Estimated Time:** 2 days

**Location:** `packages/export/src/templates/player.js`

**Implementation:**
```typescript
// In HTML player script
class StoryPlayer {
  constructor() {
    this.history = [];
    this.historyIndex = -1;
    this.maxUndoSteps = 50; // From story.settings.maxUndoSteps
    this.allowUndo = true;  // From story.settings.allowUndo
  }

  navigateToPassage(passageId, saveHistory = true) {
    if (saveHistory && this.allowUndo) {
      // Clear forward history when navigating from middle of history
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }

      // Save current state
      this.history.push({
        passageId: this.currentPassage?.id,
        variables: JSON.parse(JSON.stringify(this.variables)),
        timestamp: Date.now(),
      });

      // Limit history size
      if (this.history.length > this.maxUndoSteps) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }
    }

    // Navigate to passage
    this.currentPassage = this.passages[passageId];
    this.renderPassage(this.currentPassage);
  }

  undo() {
    if (!this.allowUndo || this.historyIndex <= 0) return;

    this.historyIndex--;
    const state = this.history[this.historyIndex];

    // Restore state
    this.variables = JSON.parse(JSON.stringify(state.variables));
    this.navigateToPassage(state.passageId, false);
  }

  redo() {
    if (!this.allowUndo || this.historyIndex >= this.history.length - 1) return;

    this.historyIndex++;
    const state = this.history[this.historyIndex];

    // Restore state
    this.variables = JSON.parse(JSON.stringify(state.variables));
    this.navigateToPassage(state.passageId, false);
  }

  canUndo() {
    return this.allowUndo && this.historyIndex > 0;
  }

  canRedo() {
    return this.allowUndo && this.historyIndex < this.history.length - 1;
  }
}
```

**UI Controls:**
```html
<div class="player-controls">
  <button id="undo-btn" onclick="player.undo()" disabled>
    ← Undo
  </button>
  <button id="redo-btn" onclick="player.redo()" disabled>
    Redo →
  </button>
</div>
```

**Deliverable:** Functional undo/redo in HTML player

---

#### 2. Implement Save/Load System

**Priority:** Medium
**Estimated Time:** 3 days

**Implementation:**
```typescript
class StoryPlayer {
  constructor() {
    this.saveSlots = 3; // From story.settings.saveSlots
    this.autoSave = true; // From story.settings.autoSave
  }

  saveGame(slot: number) {
    const saveData = {
      passageId: this.currentPassage.id,
      variables: this.variables,
      history: this.history,
      historyIndex: this.historyIndex,
      timestamp: Date.now(),
      storyTitle: this.storyTitle,
      storyVersion: this.storyVersion,
    };

    localStorage.setItem(`whisker-save-${this.storyId}-${slot}`, JSON.stringify(saveData));
    return true;
  }

  loadGame(slot: number) {
    const saved = localStorage.getItem(`whisker-save-${this.storyId}-${slot}`);
    if (!saved) return false;

    try {
      const saveData = JSON.parse(saved);

      // Validate save data
      if (saveData.storyTitle !== this.storyTitle) {
        throw new Error('Save file is for a different story');
      }

      // Restore state
      this.variables = saveData.variables;
      this.history = saveData.history;
      this.historyIndex = saveData.historyIndex;
      this.navigateToPassage(saveData.passageId, false);

      return true;
    } catch (e) {
      console.error('Failed to load game:', e);
      return false;
    }
  }

  getSaveSlots() {
    const slots = [];
    for (let i = 0; i < this.saveSlots; i++) {
      const saved = localStorage.getItem(`whisker-save-${this.storyId}-${i}`);
      if (saved) {
        const data = JSON.parse(saved);
        slots.push({
          slot: i,
          timestamp: data.timestamp,
          passageId: data.passageId,
          exists: true,
        });
      } else {
        slots.push({
          slot: i,
          exists: false,
        });
      }
    }
    return slots;
  }

  autoSaveGame() {
    if (this.autoSave) {
      this.saveGame(0); // Auto-save to slot 0
    }
  }
}
```

**UI for Save/Load:**
```html
<div class="save-menu" style="display: none;">
  <h3>Save Game</h3>
  <div id="save-slots"></div>
</div>

<script>
function showSaveMenu() {
  const menu = document.querySelector('.save-menu');
  const slotsContainer = document.getElementById('save-slots');

  const slots = player.getSaveSlots();
  slotsContainer.innerHTML = slots.map(slot => `
    <div class="save-slot">
      <button onclick="player.saveGame(${slot.slot})">
        Slot ${slot.slot + 1}
        ${slot.exists ? `<br><small>${new Date(slot.timestamp).toLocaleString()}</small>` : '<br><small>Empty</small>'}
      </button>
      ${slot.exists ? `<button onclick="player.loadGame(${slot.slot})">Load</button>` : ''}
    </div>
  `).join('');

  menu.style.display = 'block';
}
</script>
```

**Deliverable:** Save/load system with multiple slots

---

#### 3. Implement Debug Mode

**Priority:** Low
**Estimated Time:** 1 day

**Implementation:**
```typescript
class StoryPlayer {
  constructor() {
    this.debugMode = false; // From story.settings.debugMode
  }

  enableDebugMode() {
    if (!this.debugMode) return;

    // Show debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.innerHTML = `
      <h4>Debug Panel</h4>
      <div>
        <strong>Current Passage:</strong> ${this.currentPassage?.id}
      </div>
      <div>
        <strong>Variables:</strong>
        <pre>${JSON.stringify(this.variables, null, 2)}</pre>
      </div>
      <div>
        <strong>History:</strong> ${this.history.length} steps
      </div>
      <button onclick="player.logState()">Log State</button>
    `;
    document.body.appendChild(debugPanel);
  }

  logState() {
    console.log({
      passage: this.currentPassage,
      variables: this.variables,
      history: this.history,
    });
  }
}
```

**Deliverable:** Debug mode for HTML player

---

### Phase 4C Deliverables Summary

- ✅ Undo/redo system with configurable history size
- ✅ Save/load system with multiple slots
- ✅ Auto-save functionality
- ✅ Debug mode for development
- ✅ UI controls for player features

**Status:** COMPLETE (PR #141)
**Actual Time:** 1 week

---

## Phase 4D: EditorData & Format v2.1 Support

**Objective:** Preserve editor-specific data in whisker-core exports

**Priority:** LOW
**Estimated Time:** 2-3 days

### Tasks

#### 1. Add EditorData Support to WhiskerCoreExporter

**Priority:** Low
**Estimated Time:** 1 day

**Location:** `packages/export/src/formats/WhiskerCoreExporter.ts`

**Current Issue:** v2.1 EditorData not exported

**Solution:**
```typescript
export class WhiskerCoreExporter implements IExporter {
  async export(context: ExportContext): Promise<ExportResult> {
    const { story, options } = context;

    const version = options.whiskerCoreVersion || '2.0';

    if (version === '2.1') {
      return this.exportV21(context);
    } else {
      return this.exportV20(context);
    }
  }

  private async exportV21(context: ExportContext): Promise<ExportResult> {
    const { story, options, testScenarios } = context;

    const storyData = {
      metadata: story.metadata,
      passages: this.serializePassages(story.passages),
      variables: this.serializeVariables(story.variables),
      luaFunctions: this.serializeLuaFunctions(story.luaFunctions),
      settings: story.settings,
      stylesheets: story.stylesheets,
      scripts: story.scripts,
    };

    // Add EditorData if available
    const editorData: any = {};

    if (testScenarios && testScenarios.length > 0) {
      editorData.testScenarios = testScenarios;
    }

    // Include playthroughs if available
    if (story.editorData?.playthroughs) {
      editorData.playthroughs = story.editorData.playthroughs;
    }

    // Include UI state if available
    if (story.editorData?.uiState && !options.stripExtensions) {
      editorData.uiState = story.editorData.uiState;
    }

    const exportData: WhiskerFormatV21 = {
      version: '2.1',
      story: storyData,
      editorData: Object.keys(editorData).length > 0 ? editorData : undefined,
    };

    const json = options.prettyPrint
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    return {
      success: true,
      content: json,
      format: 'whisker-core',
      filename: `${story.metadata.title}.whisker.json`,
      mimeType: 'application/json',
      size: new Blob([json]).size,
    };
  }
}
```

**Deliverable:** v2.1 export with EditorData preservation

---

### Phase 4D Deliverables Summary

- ✅ WhiskerCore v2.1 export support
- ✅ EditorData preservation (playthroughs, test scenarios, UI state)
- ✅ Configurable EditorData stripping
- ✅ Round-trip fidelity for editor data

**Status:** COMPLETE (PR #141)
**Actual Time:** 2 days

---

## Phase 4E: Documentation & Testing

**Objective:** Document new features and ensure comprehensive testing

**Priority:** HIGH
**Estimated Time:** 3-4 days

### Tasks

#### 1. Update IMPORT_EXPORT_MATRIX.md

**Priority:** High
**Estimated Time:** 2 hours

Add new capabilities:
- Lua scripting support in HTML exports
- Asset embedding support
- Player features (undo/save/load)
- v2.1 format support

#### 2. Create Lua Integration Guide

**Priority:** High
**Estimated Time:** 3 hours

**Location:** `/docs/LUA_INTEGRATION.md`

Topics:
- Writing Lua functions for Whisker
- Choice conditions syntax
- Passage lifecycle scripts
- Accessing variables from Lua
- Lua limitations in HTML player

#### 3. Create Asset Management Guide

**Priority:** Medium
**Estimated Time:** 2 hours

**Location:** `/docs/ASSET_MANAGEMENT.md`

Topics:
- Adding assets to stories
- Asset embedding options
- Size considerations
- EPUB vs HTML bundling

#### 4. Add Integration Tests

**Priority:** High
**Estimated Time:** 2 days

Test scenarios:
- Export story with Lua functions → verify execution in HTML
- Export story with assets → verify embedding
- Test undo/redo functionality
- Test save/load persistence
- Test v2.1 round-trip

#### 5. Update Package READMEs

**Priority:** Medium
**Estimated Time:** 2 hours

Update export README with:
- Lua scripting capabilities
- Asset embedding options
- Player feature documentation

---

## Implementation Strategy

### Week 1: Lua Runtime (Phase 4A)
- Days 1-2: Integrate Fengari, implement Lua execution
- Day 3: Implement choice conditions and lifecycle scripts
- Day 4: Add story scripts/stylesheets support
- Day 5: Testing and bug fixes

### Week 2: Assets & Player (Phase 4B + 4C)
- Days 1-2: Implement asset embedding (HTML + EPUB)
- Day 3: Implement undo/redo system
- Days 4-5: Implement save/load system

### Week 3: EditorData & Polish (Phase 4D + 4E)
- Day 1: Add v2.1 EditorData support
- Days 2-3: Integration testing
- Days 4-5: Documentation updates

---

## Success Criteria

### Must Have
- ✅ Lua functions exported and executed in HTML player
- ✅ Choice conditions evaluated dynamically
- ✅ Passage lifecycle scripts (onEnter/onExit) executed
- ✅ Assets embedded in HTML exports (configurable)
- ✅ Assets bundled in EPUB exports
- ✅ All existing tests passing
- ✅ 90%+ test coverage maintained

### Should Have
- ✅ Undo/redo system working
- ✅ Save/load system with multiple slots
- ✅ v2.1 format export with EditorData
- ✅ Comprehensive Lua integration guide
- ✅ Asset management guide

### Nice to Have
- ⚠️ Debug mode for HTML player
- ⚠️ Auto-save functionality
- ⚠️ Visual asset browser in editor

---

## Risks & Mitigation

**Risk 1:** Fengari adds significant file size to HTML exports
- **Mitigation:** Use CDN for Fengari, offer "with/without scripting" export modes
- **Impact:** Medium

**Risk 2:** Lua execution security concerns in exported HTML
- **Mitigation:** Document security considerations, sandbox Lua environment
- **Impact:** Low (user-created content)

**Risk 3:** Asset embedding creates very large HTML files
- **Mitigation:** Configurable size limits, warnings for large files
- **Impact:** Low (user choice)

**Risk 4:** Browser localStorage limits for save games
- **Mitigation:** Document limits (5-10MB typical), offer export save feature
- **Impact:** Low

---

## Dependencies

**Required:**
- Phase 3 ✅ Complete
- fengari-web package (Lua runtime)
- jszip package (for EPUB bundling)

**Optional:**
- User feedback on Lua syntax preferences
- Real-world stories with Lua scripting for testing

---

## Out of Scope for Phase 4

❌ **Not Included:**
1. PDF export (defer to Phase 5)
2. Visual Lua script editor (defer to UI improvements)
3. Asset optimization/compression (defer to performance phase)
4. Multiplayer/cloud save (out of scope for static exports)
5. Advanced Lua debugging tools (defer to future)
6. Mobile/Desktop app templates (defer to Phase 5+)

---

## Deliverables Checklist

### Phase 4A: Lua Runtime (PR #139)
- ✅ Lua functions exported in JSON/WhiskerCore
- ✅ Fengari integrated in HTML template
- ✅ Choice conditions evaluated
- ✅ Passage lifecycle scripts executed
- ✅ Story scripts/stylesheets applied
- ✅ Tests for Lua features

### Phase 4B: Asset Management (PR #140)
- ✅ Asset embedding in HTML (base64)
- ✅ Asset bundling in EPUB
- ✅ Asset warnings for large files
- ✅ Tests for asset processing

### Phase 4C: Player Features (PR #141)
- ✅ Undo/redo system
- ✅ Save/load system (3+ slots)
- ✅ Auto-save functionality
- ✅ Debug mode
- ✅ UI controls

### Phase 4D: EditorData (PR #141)
- ✅ v2.1 format export
- ✅ EditorData preservation
- ✅ Round-trip tests

### Phase 4E: Documentation (This Update)
- ✅ IMPORT_EXPORT_MATRIX.md updated
- ✅ PHASE_4_PLAN.md updated
- ✅ Package READMEs updated
- ✅ Integration tests added (PRs #139-141)

### Quality Gates
- ✅ All tests passing (280+ tests)
- ✅ 92% coverage maintained
- ✅ Build successful
- ✅ No TypeScript errors
- ✅ Documentation reviewed

---

## Timeline Summary

| Phase | Focus | Duration |
|-------|-------|----------|
| 4A | Lua Runtime | 1 week |
| 4B | Asset Management | 4-5 days |
| 4C | Player Features | 1 week |
| 4D | EditorData | 2-3 days |
| 4E | Documentation & Testing | 3-4 days |
| **Total** | | **2-3 weeks** |

---

## Next Steps After Phase 4

1. **Phase 5 Planning:** Consider:
   - PDF export capability
   - Advanced Twine macro conversion
   - Performance optimization for large stories
   - Visual Lua script editor

2. **User Feedback:** Collect feedback on:
   - Lua scripting experience
   - Asset workflow
   - Player features

3. **GitHub Issues:** Track enhancement requests from Phase 4 discoveries

4. **Performance Review:** Profile large story exports, optimize if needed

---

## Completion Summary

Phase 4 successfully achieved feature parity between the import/export system and whisker-core capabilities. All planned features were implemented and tested.

### Key Achievements

1. **Lua Scripting (PR #139)**
   - Full Lua runtime in HTML exports via Fengari
   - Choice condition evaluation
   - Passage lifecycle scripts (onEnter/onExit)
   - Story-level scripts and stylesheets

2. **Asset Management (PR #140)**
   - Base64 embedding for HTML exports
   - Asset bundling for EPUB exports
   - Configurable size limits and warnings
   - Smart asset processing

3. **Player Features (PR #141)**
   - Undo/redo with configurable history
   - Save/load system with 3 slots
   - Auto-save functionality
   - Debug mode for development
   - Full UI controls

4. **EditorData Support (PR #141)**
   - v2.1 format export
   - Preservation of test scenarios, playthroughs, and UI state
   - Round-trip fidelity maintained

### Test Coverage

- **Total Tests:** 280+ (up from 234)
- **Coverage:** 92% (maintained target)
- **New Test Files:**
  - Lua runtime integration tests
  - Asset processing tests
  - Player feature tests
  - v2.1 format round-trip tests

### Performance Impact

- **HTML Export:** +200KB (Fengari CDN, cached)
- **Asset Embedding:** Configurable, warns on large files
- **Build Time:** No significant impact
- **Runtime Performance:** Excellent, no regression

## Related Documentation

- **PHASE_3_PLAN.md** - Import/Export foundation
- **PHASE_3B_COMPLETION.md** - Testing baseline
- **IMPORT_EXPORT_MATRIX.md** - Complete capabilities matrix
- **packages/core-ts/src/models/types.ts** - Whisker-core format
- **packages/export/README.md** - Export package documentation

---

**Phase 4: Whisker-Core Feature Parity & Advanced Export - COMPLETE ✅**
