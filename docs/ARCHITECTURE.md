# Whisker Editor Web Architecture

## Overview

**whisker-editor-web** is a modern web-based authoring tool for creating interactive fiction stories in the Whisker format. It works in tandem with **whisker-core**, the Lua-based runtime engine that executes stories.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Whisker Ecosystem                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐         ┌────────────────────┐   │
│  │  whisker-editor-web  │         │   whisker-core     │   │
│  │   (Authoring Tool)   │◄───────►│  (Runtime Engine)  │   │
│  │                      │         │                    │   │
│  │  TypeScript/Svelte   │         │    Lua 5.1+        │   │
│  │  Browser-based       │         │    Native/CLI      │   │
│  └──────────────────────┘         └────────────────────┘   │
│           │                                │                │
│           │                                │                │
│           └────────────┬───────────────────┘                │
│                        │                                     │
│                   ┌────▼─────┐                              │
│                   │  Whisker │                              │
│                   │  Format  │                              │
│                   │ (v2.0/2.1)                              │
│                   └──────────┘                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Separation of Concerns

The Whisker ecosystem follows a clear separation of concerns:

### whisker-editor-web (This Project)
**Purpose**: Authoring Tool - Create and edit stories

**Responsibilities**:
- Visual story graph editor
- Passage content editing
- Variable management
- Lua script editing (with Visual Script Builder)
- Story validation and testing
- Import from Twine formats
- Export to multiple formats (JSON, HTML, Markdown, EPUB)
- Publishing to web platforms

**Technology Stack**:
- TypeScript
- Svelte 5 (with runes)
- Vite
- Vitest
- Monaco Editor (code editing)
- Wasmoon (Lua preview in browser)

### whisker-core
**Purpose**: Runtime Engine - Execute stories

**Responsibilities**:
- Load and parse Whisker format files
- Execute Lua scripts
- Render story content
- Manage game state
- Handle player choices
- Save/load game state
- Command-line interface for playing stories

**Technology Stack**:
- Lua 5.1+
- Native Lua libraries
- Busted (testing framework)

### Whisker Format
**Purpose**: Interchange Format - Store stories

**Format Versions**:
- **v2.0**: Core format (shared specification)
- **v2.1**: Extended format with `editorData` namespace

**Key Principle**: whisker-core defines the format specification, whisker-editor-web implements it with optional extensions.

## Component Architecture

### High-Level Component Structure

```
whisker-editor-web/
├── src/
│   ├── lib/
│   │   ├── components/        # Svelte UI components
│   │   ├── models/            # Core data models (Story, Passage, Choice)
│   │   ├── stores/            # Svelte stores (state management)
│   │   ├── scripting/         # Lua engine & executor
│   │   ├── import/            # Format importers (Twine, JSON)
│   │   ├── export/            # Format exporters
│   │   ├── validation/        # Format validation
│   │   ├── utils/             # Utilities & adapters
│   │   └── player/            # Story playback engine
│   ├── routes/                # SvelteKit routes
│   └── test/                  # Test setup & mocks
└── tests/
    ├── fixtures/              # Shared test data
    └── integration/           # Integration tests
```

### Core Components

#### 1. Data Models (`src/lib/models/`)

**Story** (`Story.ts`)
- Central data model representing an entire interactive fiction story
- Manages passages, variables, metadata, settings
- Handles serialization to Whisker format (v2.0 and v2.1)
- Provides methods for validation and manipulation

```typescript
class Story {
  metadata: StoryMetadata;
  startPassage: string;
  passages: Map<string, Passage>;
  variables: Map<string, Variable>;
  settings: StorySettings;
  luaFunctions: Map<string, LuaFunction>;

  // Methods
  addPassage(passage: Passage): void
  removePassage(id: string): void
  serialize(): WhiskerCoreFormat | WhiskerFormatV21
}
```

**Passage** (`Passage.ts`)
- Represents a single node in the story graph
- Contains content, choices, scripts, and visual properties

**Choice** (`Choice.ts`)
- Represents a player choice/link between passages
- Supports conditions and actions (Lua scripts)

#### 2. Stores (`src/lib/stores/`)

State management using Svelte 5 runes and stores:

**editorStore** (`editorStore.ts`)
- Current story state
- Selected passage/choice
- Editor UI state (zoom, pan, active panel)

**undoStore** (`undoStore.ts`)
- Undo/redo functionality
- Command pattern implementation

**validationStore** (`validationStore.ts`)
- Real-time validation errors/warnings
- Format compliance checking

**exportStore** (`exportStore.ts`)
- Export settings and state
- Publishing configuration

#### 3. Scripting Engine (`src/lib/scripting/`)

**LuaEngine** (`LuaEngine.ts`)
- Browser-compatible Lua interpreter
- ~80% Lua 5.1 compatibility
- Used for script preview and testing in editor
- Supports: variables, control flow, functions, tables

**LuaExecutor** (`LuaExecutor.ts`)
- Wasmoon integration (WebAssembly Lua)
- Higher compatibility (~95%) for complex scripts
- Used when LuaEngine limitations are encountered

**Compatibility Note**:
- Editor provides Lua preview for testing
- Production stories should use whisker-core for 100% Lua compatibility
- Known limitations documented in `tests/integration/scriptCompatibility.test.ts`

#### 4. Format Adapters (`src/lib/utils/`)

**whiskerCoreAdapter** (`whiskerCoreAdapter.ts`)
- Converts between editor internal format and Whisker format
- Handles v2.0 ↔ v2.1 conversions
- Preserves data through round-trip conversions

```typescript
// Core adapter functions
function fromWhiskerCoreFormat(data: WhiskerCoreFormat | WhiskerFormatV21): Story
function toWhiskerCoreFormat(story: Story, options?: { formatVersion: '2.0' | '2.1' }): WhiskerCoreFormat
function toWhiskerFormatV21(story: Story): WhiskerFormatV21
```

#### 5. Import/Export (`src/lib/import/`, `src/lib/export/`)

**Importers**:
- `TwineImporter.ts`: Import from Twine 2 HTML (Harlowe, SugarCube, Chapbook, Snowman)
- `JSONImporter.ts`: Import from Whisker JSON format

**Exporters**:
- `JSONExporter.ts`: Export to Whisker JSON (v2.0/v2.1)
- `HTMLExporter.ts`: Export standalone HTML with embedded player
- `MarkdownExporter.ts`: Export to Markdown for documentation
- `EPUBExporter.ts`: Export to EPUB format
- `StaticSiteExporter.ts`: Export to static website

#### 6. Validation (`src/lib/validation/`)

**whiskerSchema** (`whiskerSchema.ts`)
- JSON schema validator for Whisker format
- Validates all format versions (v1.0, v2.0, v2.1)
- Provides detailed error reporting with paths

**StoryValidator** (`StoryValidator.ts`)
- Validates story structure and content
- Checks for broken links, unreachable passages
- Validates Lua script syntax

#### 7. Player (`src/lib/player/`)

**StoryPlayer** (`StoryPlayer.ts`)
- Preview player for testing stories in editor
- Executes passages, evaluates conditions, runs actions
- Uses LuaEngine for script execution
- Tracks playthrough state

### UI Components (`src/lib/components/`)

#### Editor Components
- `GraphView.svelte`: Visual story graph with nodes and connections
- `PassageEditor.svelte`: Content editor for passages
- `PropertiesPanel.svelte`: Properties editing (passage, choice, story)
- `VariableManager.svelte`: Manage story variables
- `TagManager.svelte`: Manage passage tags
- `MenuBar.svelte`: Application menu
- `Toolbar.svelte`: Quick actions

#### Script Components
- `ScriptEditor.svelte`: Lua code editor (Monaco)
- `VisualScriptBuilder.svelte`: Visual block-based scripting
- `FunctionLibrary.svelte`: Manage Lua functions

#### Testing Components
- `TestScenarioRunner.svelte`: Run automated test scenarios
- `ValidationPanel.svelte`: Display validation errors/warnings
- `StoryPlayer.svelte`: Preview player UI

#### Export Components
- `ExportPanel.svelte`: Export configuration and actions
- `ImportDialog.svelte`: Import from external formats

## Data Flow

### Creating a Story

```
User Input
   │
   ▼
UI Components (Svelte)
   │
   ▼
Stores (editorStore, undoStore)
   │
   ▼
Models (Story, Passage, Choice)
   │
   ▼
Validation (StoryValidator)
```

### Saving a Story

```
Story Model
   │
   ▼
whiskerCoreAdapter.toWhiskerFormatV21()
   │
   ▼
Whisker Format v2.1 JSON
   │
   ▼
File System / Export
```

### Loading a Story

```
File System / Import
   │
   ▼
JSON Parser
   │
   ▼
Format Validation (whiskerSchema)
   │
   ▼
whiskerCoreAdapter.fromWhiskerCoreFormat()
   │
   ▼
Story Model
   │
   ▼
Stores (editorStore)
   │
   ▼
UI Components
```

### Testing/Preview Flow

```
Story Model
   │
   ▼
StoryPlayer
   │
   ▼
LuaEngine/LuaExecutor
   │
   ▼
Execute Scripts
   │
   ▼
Display Results
```

### Production Execution Flow (whisker-core)

```
Whisker Format File (.whisker.json)
   │
   ▼
whisker-core Parser
   │
   ▼
Story Engine (Lua)
   │
   ▼
Execute Scripts (Native Lua)
   │
   ▼
Render Output
   │
   ▼
Player
```

## Integration Points with whisker-core

### 1. Whisker Format (Primary Integration)

**File Format**: JSON files containing story data

**Versions Supported**:
- v2.0: Core specification (defined by whisker-core)
- v2.1: Extended specification (defined by whisker-editor-web)

**Compatibility**:
- whisker-core reads v2.0 and v2.1 (ignores `editorData`)
- whisker-editor-web reads/writes both v2.0 and v2.1
- Round-trip conversion preserves all data

### 2. Lua Scripts

**Integration**:
- Editor creates Lua scripts
- whisker-core executes Lua scripts
- Editor provides preview using LuaEngine (~80% compatible)
- Production uses whisker-core (100% compatible)

**Script Types**:
- Passage scripts: `onEnterScript`, `onExitScript`
- Choice scripts: `condition`, `action`
- Global functions: stored in `editorData.luaFunctions` (v2.1)

### 3. Test Fixtures

**Shared Test Data**: `tests/fixtures/stories/`
- `minimal-v2.0.json`: Basic story for format testing
- `with-functions-v2.1.json`: v2.1 story with functions
- `complex-scripts-v2.0.json`: Complex Lua scripts

**Purpose**:
- whisker-editor-web uses for validation and integration tests
- whisker-core can use same fixtures for compatibility testing
- Ensures both tools work with same test data

### 4. Format Validation

**JSON Schema Validator**: `src/lib/validation/whiskerSchema.ts`
- Validates Whisker format compliance
- Can be ported to Lua for whisker-core use
- Ensures both tools validate consistently

## Testing Strategy

### Test Pyramid

```
         ┌─────────────┐
         │     E2E     │  (Playwright - planned)
         │   Testing   │
         └─────────────┘
              ▲
              │
       ┌──────────────┐
       │ Integration  │     (Vitest - 54 tests)
       │   Testing    │
       └──────────────┘
              ▲
              │
    ┌──────────────────┐
    │  Unit Testing    │   (Vitest - 3,150+ tests)
    │  Component Tests │
    └──────────────────┘
```

### Test Categories

**Unit Tests** (~3,150 tests)
- Model tests (Story, Passage, Choice)
- Store tests (editorStore, undoStore, etc.)
- Utility tests (adapters, validators)
- Scripting tests (LuaEngine, LuaExecutor)

**Integration Tests** (54 tests)
- Format validation tests
- Round-trip conversion tests
- Script compatibility tests
- Fixture compatibility tests

**Component Tests** (~50 tests)
- Svelte component rendering
- User interactions
- Store integration

**E2E Tests** (Planned)
- Full workflow tests
- Cross-browser compatibility

### Testing with whisker-core

**Integration Testing**:
- Shared test fixtures in `tests/fixtures/stories/`
- Format round-trip validation
- Script compatibility verification

**Process**:
1. Create test story in editor
2. Export to Whisker format
3. Load in whisker-core
4. Verify execution matches expectations
5. Export from whisker-core (if supported)
6. Re-import to editor
7. Verify no data loss

## Performance Considerations

### Editor Performance

**Optimization Strategies**:
- Svelte reactivity for efficient updates
- Virtual scrolling for large passage lists
- Debounced validation
- Lazy loading of Monaco Editor

**Known Limitations**:
- Large stories (>200 passages): Graph rendering may slow down
- Complex Lua scripts: Preview may be slower than whisker-core
- Browser memory limits: Very large stories may require pagination

### LuaEngine Performance

**Browser-based Lua**:
- Custom interpreter: Medium performance (~80% compatibility)
- Wasmoon: Better performance (~95% compatibility)
- Production (whisker-core): Best performance (100% compatibility)

**Recommendation**: Use editor for authoring, whisker-core for production execution

## Security Considerations

### Lua Script Execution

**Browser Environment**:
- Sandboxed execution (no file system access)
- Limited standard library
- Safe for untrusted scripts in preview

**Production Environment** (whisker-core):
- Full Lua capabilities
- File system access possible
- Scripts should be reviewed before distribution

### File Handling

**Editor**:
- File API for local file operations
- No server-side storage by default
- Optional publishing to GitHub Pages, itch.io

**User Data**:
- Stories stored locally (browser storage or file system)
- No telemetry or analytics
- Privacy-focused design

## Deployment

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

### Distribution

**Options**:
1. **Static Site**: Deploy to any static host (Netlify, Vercel, GitHub Pages)
2. **Desktop App**: Package with Electron/Tauri (future)
3. **Self-hosted**: Run on local web server

## Future Architecture Enhancements

### Phase 5 Roadmap

**Phase 5A**: Format Governance ✅ COMPLETE
- v2.1 specification with `editorData` namespace
- Integration testing suite
- JSON schema validator

**Phase 5B**: Enhanced Runtime Integration (Planned)
- Optional whisker-core WASM integration
- 100% Lua compatibility in browser
- Performance benchmarking

**Phase 5C**: Documentation & Tooling
- Unified documentation site
- Migration tools
- CLI tools for format conversion

**Phase 5D**: Testing & Quality (Planned)
- E2E test suite
- Visual regression testing
- Performance testing

## References

### Related Documentation
- [Whisker Format Specification v2.1](../WHISKER_FORMAT_SPEC_V2.1.md)
- [Gap Analysis](../WHISKER_ALIGNMENT_GAP_ANALYSIS.md)
- [Strategic Alignment](../WHISKER_STRATEGIC_ALIGNMENT.md)
- [API Reference](./API_REFERENCE.md)
- [User Guide](./USER_GUIDE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)

### External Links
- [whisker-core Repository](https://github.com/ezeholz/whisker-core)
- [Whisker Format Discussion](https://github.com/ezeholz/whisker-core/issues)
- [Svelte Documentation](https://svelte.dev)
- [Lua 5.1 Reference](https://www.lua.org/manual/5.1/)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Maintained By**: whisker-editor-web team
