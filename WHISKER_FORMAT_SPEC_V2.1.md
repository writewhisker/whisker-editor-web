# Whisker Story Format Specification v2.1

**Status**: RFC DRAFT
**Date**: 2025-10-29
**Author**: whisker-editor-web team
**Supersedes**: Whisker Format v2.0
**Closes**: Gap #3 (Format Extensions)

---

## Executive Summary

This document defines the **Whisker Story Format v2.1**, introducing the `editorData` namespace for editor-specific extensions while maintaining full backward compatibility with v2.0.

### Key Changes from v2.0

- ✅ **New `editorData` namespace** for editor-specific features
- ✅ **Backward compatible** - v2.0 stories work unchanged
- ✅ **Forward compatible** - v2.1 stories degrade gracefully to v2.0
- ✅ **Governance** - Formal extension mechanism defined

---

## Format Version History

| Version | Date | Status | Key Features |
|---------|------|--------|--------------|
| 1.0 | 2024 | Legacy | Basic passages, simple variables |
| 2.0 | 2025-10 | Current | Typed variables, metadata, assets, settings |
| **2.1** | **2025-10** | **RFC** | **`editorData` namespace for extensions** |

---

## Whisker Format v2.0 (Reference)

### Core Schema

```typescript
interface WhiskerFormatV2 {
  // Format identification
  format: "whisker";
  formatVersion: "2.0";

  // Story metadata
  metadata: StoryMetadata;

  // Story configuration
  settings: StorySettings;
  startPassage: string;

  // Core content
  passages: PassageData[];
  variables: Record<string, TypedVariable>;

  // Optional features
  stylesheets?: string[];
  scripts?: string[];
  assets?: AssetReference[];
}
```

### Passage Schema

```typescript
interface PassageData {
  id: string;
  name: string;  // "name" in v2.0 (whisker-core convention)
  content: string;
  tags?: string[];
  choices?: ChoiceData[];
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  metadata?: Record<string, any>;
  onEnterScript?: string;
  onExitScript?: string;
}
```

### Choice Schema

```typescript
interface ChoiceData {
  id: string;
  text: string;
  target: string;  // "target" in v2.0 (whisker-core uses "target_passage")
  condition?: string;
  action?: string;
  metadata?: Record<string, any>;
}
```

### Variable Schema

```typescript
interface TypedVariable {
  type: "string" | "number" | "boolean";
  default: string | number | boolean;
}
```

---

## Whisker Format v2.1 (NEW)

### Overview

Version 2.1 introduces a **formal extension mechanism** via the `editorData` namespace, allowing authoring tools to store tool-specific data without polluting the core format.

### Core Schema

```typescript
interface WhiskerFormatV21 {
  // Format identification
  format: "whisker";
  formatVersion: "2.1";  // ← VERSION BUMP

  // Story metadata
  metadata: StoryMetadata;

  // Story configuration
  settings: StorySettings;
  startPassage: string;

  // Core content (unchanged from v2.0)
  passages: PassageData[];
  variables: Record<string, TypedVariable>;

  // Optional features (unchanged from v2.0)
  stylesheets?: string[];
  scripts?: string[];
  assets?: AssetReference[];

  // ✨ NEW: Editor-specific data namespace
  editorData?: EditorData;
}
```

### EditorData Namespace

```typescript
interface EditorData {
  /**
   * Tool identification
   * Identifies which editor created/last modified this data
   */
  tool: {
    name: string;         // e.g., "whisker-editor-web"
    version: string;      // e.g., "1.0.0"
    url?: string;         // e.g., "https://github.com/writewhisker/whisker-editor-web"
  };

  /**
   * Last modification timestamp for editor data
   */
  modified: string;       // ISO 8601 timestamp

  /**
   * Lua Function Library
   * Reusable functions for story logic
   */
  luaFunctions?: Record<string, LuaFunctionData>;

  /**
   * Playthrough Analytics
   * Recorded player sessions for analysis
   */
  playthroughs?: PlaythroughData[];

  /**
   * Test Scenarios
   * Automated testing data
   */
  testScenarios?: TestScenarioData[];

  /**
   * Visual Script Builder Data
   * Block-based script definitions
   */
  visualScripts?: Record<string, VisualScriptData>;

  /**
   * Editor UI State
   * Graph zoom, selected nodes, etc.
   */
  uiState?: EditorUIState;

  /**
   * Custom Extensions
   * Tool-specific extensions not in the spec
   */
  extensions?: Record<string, any>;
}
```

### LuaFunctionData Schema

```typescript
interface LuaFunctionData {
  id: string;
  name: string;
  description?: string;
  params: string[];      // Parameter names
  body: string;          // Lua code
  tags?: string[];       // For categorization
  created: string;       // ISO 8601
  modified: string;      // ISO 8601
}
```

### PlaythroughData Schema

```typescript
interface PlaythroughData {
  id: string;
  startedAt: string;     // ISO 8601
  completedAt?: string;  // ISO 8601 (if completed)
  duration?: number;     // Milliseconds
  passageVisits: {
    passageId: string;
    timestamp: string;
    choiceId?: string;   // Which choice was taken
    variables?: Record<string, any>;  // Variable state snapshot
  }[];
  metadata?: {
    platform?: string;   // "web", "mobile", etc.
    userAgent?: string;
    version?: string;    // Story version when played
  };
}
```

### TestScenarioData Schema

```typescript
interface TestScenarioData {
  id: string;
  name: string;
  description?: string;
  steps: TestStepData[];
  created: string;
  modified: string;
  tags?: string[];
}

interface TestStepData {
  type: "navigate" | "check" | "setVariable" | "wait";
  data: any;  // Step-specific data
}
```

### VisualScriptData Schema

```typescript
interface VisualScriptData {
  id: string;
  name: string;
  blocks: {
    id: string;
    type: string;        // "if", "while", "setVariable", etc.
    params: Record<string, any>;
    children?: string[]; // Child block IDs
  }[];
  generatedLua?: string; // Generated Lua code
}
```

### EditorUIState Schema

```typescript
interface EditorUIState {
  graph?: {
    zoom?: number;
    pan?: { x: number; y: number };
    selectedNodeIds?: string[];
  };
  openPanels?: string[];
  theme?: string;
  lastView?: string;      // e.g., "graph", "passage-editor"
}
```

---

## Backward Compatibility

### v2.0 → v2.1 (Reading)

**Scenario**: whisker-editor-web v2.1 reads a v2.0 file

```typescript
function readV20File(data: WhiskerFormatV2): WhiskerFormatV21 {
  return {
    ...data,
    formatVersion: "2.1",
    editorData: {
      tool: {
        name: "whisker-editor-web",
        version: packageJson.version,
      },
      modified: new Date().toISOString(),
    },
  };
}
```

**Result**: File upgraded to v2.1 with empty `editorData`

### v2.1 → v2.0 (Writing)

**Scenario**: whisker-core v2.0 reads a v2.1 file

```typescript
function downgradeToV20(data: WhiskerFormatV21): WhiskerFormatV2 {
  const { editorData, ...coreData } = data;
  return {
    ...coreData,
    formatVersion: "2.0",
  };
}
```

**Result**: `editorData` silently dropped, core features preserved

---

## Forward Compatibility

### Data Preservation

whisker-core v2.0 MUST preserve unknown fields when reading/writing:

```typescript
// ✅ GOOD: Preserve editorData even if not understood
function readStory(json: string): Story {
  const data = JSON.parse(json);
  const story = parseStoryCore(data);
  story._unknownFields = { editorData: data.editorData };
  return story;
}

function writeStory(story: Story): string {
  const data = serializeStoryCore(story);
  return JSON.stringify({ ...data, ...story._unknownFields });
}
```

### Version Detection

```typescript
function detectVersion(data: any): "1.0" | "2.0" | "2.1" | "unknown" {
  if (data.formatVersion === "2.1") return "2.1";
  if (data.formatVersion === "2.0") return "2.0";
  if (data.formatVersion === "1.0") return "1.0";
  if (data.format === "whisker") return "2.0";  // Assume v2.0
  return "unknown";
}
```

---

## Migration Guide

### Upgrading Stories: v2.0 → v2.1

```typescript
function migrateV20ToV21(story: WhiskerFormatV2): WhiskerFormatV21 {
  const v21: WhiskerFormatV21 = {
    ...story,
    formatVersion: "2.1",
  };

  // Move luaFunctions to editorData if they exist
  if ((story as any).luaFunctions) {
    v21.editorData = {
      tool: { name: "whisker-editor-web", version: "1.0.0" },
      modified: new Date().toISOString(),
      luaFunctions: (story as any).luaFunctions,
    };
    delete (v21 as any).luaFunctions;  // Remove from root
  }

  return v21;
}
```

### Downgrading Stories: v2.1 → v2.0

```typescript
function migrateV21ToV20(story: WhiskerFormatV21): WhiskerFormatV2 {
  const { editorData, ...v20 } = story;
  return {
    ...v20,
    formatVersion: "2.0",
  };
  // Note: editorData is lost in downgrade
}
```

---

## Governance & Extension Policy

### Core Format Authority

- **whisker-core** is the authoritative source for core format
- Changes to core fields require RFC and approval
- Both repositories must implement changes

### Editor Extensions

- **whisker-editor-web** can add fields to `editorData` freely
- New fields MUST be documented in this spec
- Changes should be communicated to whisker-core team

### Extension Guidelines

**DO**:
- ✅ Add new fields under `editorData.extensions`
- ✅ Document new fields in this spec
- ✅ Use descriptive, namespaced keys (e.g., `"web:colorPalette"`)
- ✅ Provide JSON schema for new fields
- ✅ Handle missing/corrupted data gracefully

**DON'T**:
- ❌ Add fields to root level without RFC
- ❌ Modify core format structure
- ❌ Break backward compatibility
- ❌ Store sensitive data (passwords, API keys)
- ❌ Store absolute file paths

### RFC Process for Core Changes

1. **Propose** - Create GitHub issue in whisker-core
2. **Discuss** - Community feedback period (1-2 weeks)
3. **Approve** - Core team approves change
4. **Implement** - Implement in whisker-core first
5. **Adopt** - whisker-editor-web implements change
6. **Version** - Bump format version if breaking

---

## Validation

### JSON Schema (v2.1)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["format", "formatVersion", "metadata", "settings", "startPassage", "passages", "variables"],
  "properties": {
    "format": { "const": "whisker" },
    "formatVersion": { "enum": ["1.0", "2.0", "2.1"] },
    "metadata": { "$ref": "#/definitions/StoryMetadata" },
    "settings": { "type": "object" },
    "startPassage": { "type": "string" },
    "passages": { "type": "array", "items": { "$ref": "#/definitions/PassageData" } },
    "variables": { "type": "object" },
    "stylesheets": { "type": "array", "items": { "type": "string" } },
    "scripts": { "type": "array", "items": { "type": "string" } },
    "assets": { "type": "array" },
    "editorData": { "$ref": "#/definitions/EditorData" }
  },
  "definitions": {
    "EditorData": {
      "type": "object",
      "required": ["tool", "modified"],
      "properties": {
        "tool": {
          "type": "object",
          "required": ["name", "version"],
          "properties": {
            "name": { "type": "string" },
            "version": { "type": "string" },
            "url": { "type": "string", "format": "uri" }
          }
        },
        "modified": { "type": "string", "format": "date-time" },
        "luaFunctions": { "type": "object" },
        "playthroughs": { "type": "array" },
        "testScenarios": { "type": "array" },
        "visualScripts": { "type": "object" },
        "uiState": { "type": "object" },
        "extensions": { "type": "object" }
      }
    }
  }
}
```

---

## Examples

### Minimal v2.1 Story

```json
{
  "format": "whisker",
  "formatVersion": "2.1",
  "metadata": {
    "title": "My Story",
    "author": "Author Name",
    "ifid": "uuid-here",
    "created": "2025-10-29T00:00:00Z",
    "modified": "2025-10-29T00:00:00Z"
  },
  "settings": {},
  "startPassage": "start",
  "passages": [
    {
      "id": "start",
      "name": "Start",
      "content": "Welcome to the story!",
      "position": { "x": 0, "y": 0 }
    }
  ],
  "variables": {}
}
```

### v2.1 Story with EditorData

```json
{
  "format": "whisker",
  "formatVersion": "2.1",
  "metadata": {
    "title": "Advanced Story",
    "author": "Author",
    "ifid": "uuid-here",
    "created": "2025-10-29T00:00:00Z",
    "modified": "2025-10-29T00:00:00Z"
  },
  "settings": {},
  "startPassage": "start",
  "passages": [
    {
      "id": "start",
      "name": "Start",
      "content": "{{ greet(playerName) }}",
      "position": { "x": 0, "y": 0 }
    }
  ],
  "variables": {
    "playerName": { "type": "string", "default": "Player" }
  },
  "editorData": {
    "tool": {
      "name": "whisker-editor-web",
      "version": "1.0.0",
      "url": "https://github.com/writewhisker/whisker-editor-web"
    },
    "modified": "2025-10-29T12:00:00Z",
    "luaFunctions": {
      "greet": {
        "id": "greet",
        "name": "greet",
        "description": "Greets the player by name",
        "params": ["name"],
        "body": "return \"Hello, \" .. name .. \"!\"",
        "tags": ["utility"],
        "created": "2025-10-29T10:00:00Z",
        "modified": "2025-10-29T10:00:00Z"
      }
    },
    "uiState": {
      "graph": {
        "zoom": 1.0,
        "pan": { "x": 0, "y": 0 }
      }
    }
  }
}
```

---

## Implementation Checklist

### whisker-core

- [ ] Update parser to recognize `formatVersion: "2.1"`
- [ ] Preserve `editorData` when reading/writing
- [ ] Add validation for v2.1 format
- [ ] Update documentation
- [ ] Add migration tests

### whisker-editor-web

- [x] Create this specification document
- [ ] Update `types.ts` with v2.1 types
- [ ] Implement `migrateV20ToV21()` in Story class
- [ ] Update `serializeWhiskerCore()` to use `editorData`
- [ ] Move `luaFunctions` into `editorData` namespace
- [ ] Add `editorData.tool` metadata
- [ ] Update import/export to handle v2.1
- [ ] Add format version tests
- [ ] Update documentation

---

## References

- whisker-core v2.0 format: `lib/whisker/core/story.lua`
- whisker-editor-web types: `src/lib/models/types.ts`
- Gap #3 Analysis: `WHISKER_ALIGNMENT_GAP_ANALYSIS.md`
- Strategic Alignment: `WHISKER_STRATEGIC_ALIGNMENT.md`

---

## Appendix: Naming Conventions

### Core vs Editor Field Names

Some fields have different names in core vs editor for historical reasons:

| Concept | whisker-core | whisker-editor-web | v2.1 Spec |
|---------|-------------|-------------------|-----------|
| Passage title | `name` | `title` | `name` ✅ |
| Choice target | `target_passage` | `target` | `target` ✅ |
| Variable init | `default` | `default` | `default` ✅ |

**Decision**: v2.1 adopts whisker-core naming as canonical.

---

**Status**: RFC DRAFT - Awaiting whisker-core team review
**Next Review**: Upon Phase 5A implementation
**Version**: 1.0
**Date**: 2025-10-29
