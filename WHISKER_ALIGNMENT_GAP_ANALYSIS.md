# Whisker Alignment Gap Analysis
## whisker-editor-web vs whisker-core

**Date**: 2025-10-29
**Status**: Comprehensive Analysis
**Priority**: High

---

## Executive Summary

This document identifies gaps, misalignments, and integration opportunities between **whisker-editor-web** (TypeScript/Svelte frontend) and **whisker-core** (Lua runtime backend).

### Key Findings

1. **Phase Divergence**: whisker-editor-web completed Phase 4 with advanced features while whisker-core is planning Phase 4 with different objectives
2. **Runtime Gap**: Two separate Lua execution environments with different capabilities
3. **Format Extensions**: Editor has added Phase 4 features not yet in whisker-core v2.0 spec
4. **Import/Export Gap**: whisker-core has Twine import capabilities not exposed in editor
5. **Testing Gap**: Different test approaches and no cross-repository integration tests

---

## Gap #1: Phase Implementation Divergence

### Current State

**whisker-core** (Phase 3 Complete):
- ✅ v2.0 format with typed variables
- ✅ Choice IDs
- ✅ Metadata & assets
- ✅ Story-level features
- 📋 Phase 4 Planning: Import & Format Conversion

**whisker-editor-web** (Phase 4 Complete):
- ✅ All Phase 1-3 features
- ✅ Advanced Lua scripting (LuaEngine)
- ✅ Visual Script Builder
- ✅ Function Library
- ✅ Analytics & Playthroughs
- ✅ Publishing to GitHub/itch.io

### Gap Description

The two repositories have taken different directions for Phase 4:
- **Core** focuses on **runtime execution** and **format interoperability**
- **Editor** focuses on **authoring tools** and **advanced features**

### Impact

- **Medium-High**: Creates feature fragmentation
- Different Phase 4 implementations could lead to incompatible features
- No unified roadmap for future development

### Recommendation

**Option 1**: Align both Phase 4s by implementing both feature sets
- whisker-core adds: Analytics, Function Library, Publishing support
- whisker-editor-web adds: Twine import, format conversion

**Option 2**: Define clear separation of concerns
- Core = Runtime + Format
- Editor = Authoring + Preview
- Document which features belong where

**Priority**: High - Needs strategic decision

---

## Gap #2: Runtime Execution Environment

### Current State

**whisker-core** has:
- `lib/whisker/core/engine.lua` - Full story execution engine
- `lib/whisker/core/lua_interpreter.lua` - Lua script execution
- `lib/whisker/core/renderer.lua` - Output rendering
- `lib/whisker/runtime/` - Complete runtime environment

**whisker-editor-web** has:
- `src/lib/scripting/LuaEngine.ts` - Browser-based Lua interpreter
- `src/lib/scripting/LuaExecutor.ts` - Lua execution with Wasmoon
- `src/lib/player/StoryPlayer.ts` - Story playback engine

### Gap Description

Two separate execution environments:
1. **whisker-core**: Native Lua runtime for production gameplay
2. **whisker-editor-web**: Browser-based Lua for preview/testing

### Differences

| Feature | whisker-core | whisker-editor-web |
|---------|-------------|-------------------|
| **Lua Version** | Native Lua 5.1+ | Wasmoon (Lua 5.4) |
| **Execution** | Native | WebAssembly |
| **Performance** | High | Medium (WASM overhead) |
| **Standard Library** | Full Lua stdlib | Limited (custom impl) |
| **Control Flow** | Full (if/while/for) | Partial (if only) |
| **Functions** | Full support | Limited |
| **Debugging** | GDB/print | Browser console |

### Impact

- **High**: Script behavior may differ between preview and production
- Authors might create scripts that work in editor but fail in runtime
- Testing in editor doesn't guarantee production compatibility

### Recommendation

**Option 1**: Use whisker-core's Lua runtime via WASM
- Compile whisker-core Lua engine to WASM
- Ensures 100% compatibility
- More complex build process

**Option 2**: Enhance editor's LuaEngine to match core
- Implement missing features (loops, functions, tables)
- Document known differences
- Add compatibility warnings

**Option 3**: Accept divergence, document clearly
- Document which features work where
- Add "Test in Production" warnings
- Provide CLI tool for local testing

**Priority**: Critical - Affects script reliability

---

## Gap #3: File Format Extensions

### Current State

**whisker-core v2.0 Format** supports:
```typescript
{
  format: "whisker",
  formatVersion: "2.0",
  metadata: { title, author, ifid, ... },
  settings: { startPassage, theme, ... },
  passages: PassageData[],
  variables: Record<string, TypedVariable>,
  scripts: string[],
  stylesheets: string[],
  assets: AssetReference[]
}
```

**whisker-editor-web** adds (not in core spec):
```typescript
{
  // ... core fields ...
  luaFunctions: Record<string, LuaFunctionData>,  // NEW
  playthroughs: Playthrough[],  // NEW (analytics)
  testScenarios: TestScenario[],  // NEW (testing)
  // ... plus editor-specific metadata
}
```

### Gap Description

Editor has extended the format with Phase 4 features:
- **Function Library** (`luaFunctions`) - Not in whisker-core
- **Analytics Data** (`playthroughs`) - Not in whisker-core
- **Test Scenarios** (`testScenarios`) - Not in whisker-core

### Impact

- **Medium**: Files saved by editor may not be fully parseable by core
- Extra fields will be ignored by whisker-core (no errors, but data loss)
- No versioning for editor-specific extensions

### Recommendation

**Option 1**: Propose v2.1 format with extensions
- Document editor-specific fields
- Add `editorData` namespace
- Update whisker-core to preserve unknown fields

**Option 2**: Use separate file for editor data
- `story.whisker` - Core format only
- `story.whisker-meta` - Editor-specific data
- Keeps formats cleanly separated

**Option 3**: Embed as metadata
- Store editor data in `metadata.editorExtensions`
- whisker-core ignores but preserves
- No format version bump needed

**Priority**: Medium - Affects data portability

---

## Gap #4: Import/Export Capabilities

### Current State

**whisker-core** has extensive import support:
- `lib/whisker/format/twine_importer.lua` - Twine HTML import
- `lib/whisker/format/harlowe_parser.lua` - Harlowe format
- `lib/whisker/format/sugarcube_parser.lua` - SugarCube format
- `lib/whisker/format/chapbook_parser.lua` - Chapbook format
- `lib/whisker/format/snowman_parser.lua` - Snowman format
- `lib/whisker/format/format_converter.lua` - Format conversion

**whisker-editor-web** has limited import:
- JSON import (whisker format only)
- No Twine import exposed
- No format conversion UI

**whisker-editor-web** has export capabilities:
- JSON export (whisker format)
- HTML export with embedded player
- Markdown export for documentation
- GitHub Pages publishing
- itch.io publishing

### Gap Description

**Import**: whisker-core has powerful import that editor doesn't expose
**Export**: whisker-editor-web has publishing features core doesn't have

### Impact

- **High**: Users can't import existing Twine stories via editor
- Missing major value proposition (migrate from Twine)
- whisker-core's import capabilities are hidden

### Recommendation

**Option 1**: Expose whisker-core parsers via API
- Create Node.js/WASM bindings for parsers
- Add import UI in editor
- Leverage existing, tested code

**Option 2**: Reimplement parsers in TypeScript
- Native TypeScript Twine parsers
- Better integration with editor
- Duplicate effort

**Option 3**: CLI tool for conversion
- Use whisker-core CLI for conversion
- Import converted files into editor
- Keeps concerns separated

**Priority**: High - Major feature gap

---

## Gap #5: Data Model Alignment

### Current State

**whisker-core** data model (Lua):
```lua
Story = {
  metadata = { uuid, name, author, version, ... },
  variables = { name = { type, default } },
  passages = { [id] = Passage },
  start_passage = "id",
  stylesheets = {},
  scripts = {},
  assets = {},
  tags = {},
  settings = {}
}

Passage = {
  id, name, content, tags, choices,
  position, size, metadata,
  on_enter_script, on_exit_script
}

Choice = {
  id, text, target_passage,
  condition, action, metadata
}
```

**whisker-editor-web** data model (TypeScript):
```typescript
class Story {
  metadata: StoryMetadata;
  startPassage: string;
  passages: Map<string, Passage>;  // Map vs Record
  variables: Map<string, Variable>;  // Map vs Record
  settings: Record<string, any>;
  stylesheets: string[];
  scripts: string[];
  assets: Map<string, AssetReference>;
  luaFunctions: Map<string, LuaFunction>;  // NEW
}

class Passage {
  id, title,  // "title" vs "name"
  content, tags, choices,
  position, size,
  color,  // Editor-only
  onEnterScript, onExitScript
}

class Choice {
  id, text, target,  // "target" vs "target_passage"
  condition, action,
  isOnce, isDisabled  // Editor-only
}
```

### Gap Description

Minor naming/structure differences:
- **Passage**: `name` (core) vs `title` (editor)
- **Choice**: `target_passage` (core) vs `target` (editor)
- **Storage**: Lua tables vs TypeScript Maps
- **Editor fields**: `color`, `isOnce`, `isDisabled` not in core

### Impact

- **Low**: `whiskerCoreAdapter` handles conversions
- Extra work to maintain adapter
- Easy to introduce bugs in conversion

### Recommendation

**Option 1**: Standardize on whisker-core naming
- Rename `title` → `name` in editor
- Rename `target` → `target_passage`
- Reduces adapter complexity

**Option 2**: Add aliases
- Support both names in both systems
- More flexible but more complex

**Option 3**: Accept difference, maintain adapter
- Current state works
- Document the mapping
- Keep adapter well-tested

**Priority**: Low - Current solution works

---

## Gap #6: Testing & Validation

### Current State

**whisker-core**:
- 3018 tests (Lua, busted framework)
- Unit tests for all modules
- Integration tests for formats
- No browser/UI tests

**whisker-editor-web**:
- ~350 tests (TypeScript, Vitest)
- Component tests (Svelte Testing Library)
- Unit tests for models
- No integration tests with core

### Gap Description

No cross-repository integration tests:
- No tests validating editor → core file compatibility
- No tests for runtime script compatibility
- No tests for import/export round-trips
- Different test frameworks make integration harder

### Impact

- **Medium**: Could miss compatibility issues
- Format divergence might go unnoticed
- Script compatibility issues only found by users

### Recommendation

**Option 1**: Add integration test suite
- Create shared test stories
- Test round-trip: editor → JSON → core → JSON → editor
- Test script execution: editor LuaEngine vs core Lua
- Runs in both repos

**Option 2**: Contract testing
- Define format contract
- Both repos test against contract
- JSON schema validation

**Option 3**: E2E test suite
- Separate repository
- Tests both systems together
- Catches integration issues

**Priority**: Medium - Prevents regressions

---

## Gap #7: Documentation Alignment

### Current State

**whisker-core** has:
- Extensive Lua API docs
- Format specification
- Parser documentation
- Runtime architecture docs

**whisker-editor-web** has:
- Component documentation
- TypeScript API docs
- User guides
- Phase implementation summaries

### Gap Description

- No unified documentation covering both
- No architecture overview showing how they connect
- No migration guides (core → editor, editor → core)
- Documentation in different styles/formats

### Impact

- **Low**: Developers might not understand the full system
- Harder to onboard new contributors
- Unclear what features belong where

### Recommendation

**Option 1**: Create unified docs site
- Combine both documentation sets
- Clear separation: Core vs Editor
- Integration guides
- Architecture diagrams

**Option 2**: Cross-link existing docs
- Add links between repositories
- "See also" sections
- Keep docs separate but connected

**Option 3**: Master documentation repo
- `whisker-docs` repository
- Pulls from both repos
- Generates unified site

**Priority**: Low - Nice to have

---

## Gap #8: Visual Script Builder Integration

### Current State

**whisker-editor-web** has:
- Visual Script Builder (Phase 4)
- 13 block types for visual programming
- Real-time Lua code generation
- NOT saved to whisker format (only generates code)

**whisker-core** has:
- No concept of visual blocks
- Only executes Lua text

### Gap Description

Visual blocks are editor-only:
- Blocks converted to Lua before saving
- No way to preserve block structure
- Can't round-trip: Lua → blocks
- Blocks lost when opening file elsewhere

### Impact

- **Low-Medium**: Visual blocks are ephemeral
- Users can't edit visual scripts later
- No version control for block structure
- Must copy generated Lua to preserve

### Recommendation

**Option 1**: Save block structure to format
- Add `visualScripts` field to format
- Store block definitions + generated Lua
- whisker-core ignores blocks, uses Lua

**Option 2**: Separate .blocks file
- `story.whisker` - Standard format
- `story.blocks` - Block definitions
- Editor loads both, core loads only .whisker

**Option 3**: Accept as editor-only feature
- Blocks are workflow tool, not format feature
- Users expected to copy generated Lua
- Document this clearly

**Priority**: Low - Current workflow acceptable

---

## Gap Summary Table

| Gap # | Description | Impact | Priority | Recommended Action |
|-------|-------------|--------|----------|-------------------|
| 1 | Phase 4 Divergence | Med-High | High | Align Phase 4 objectives |
| 2 | Runtime Execution | High | Critical | Enhance LuaEngine compatibility |
| 3 | Format Extensions | Medium | Medium | Propose v2.1 or use metadata |
| 4 | Import/Export | High | High | Expose Twine import in editor |
| 5 | Data Model | Low | Low | Maintain adapter, document |
| 6 | Testing | Medium | Medium | Add integration tests |
| 7 | Documentation | Low | Low | Cross-link or unify |
| 8 | Visual Blocks | Low-Med | Low | Accept or add to format |

---

## Immediate Action Items

### Priority 1: Critical (Do Now)

1. **Enhance LuaEngine** (Gap #2)
   - Add missing control flow (while, for loops)
   - Add function definitions
   - Add table operations
   - Document remaining differences

2. **Expose Twine Import** (Gap #4)
   - Create WASM bindings for parsers
   - Add ImportDialog for Twine files
   - Test with real Twine stories

### Priority 2: High (Next Sprint)

3. **Align Phase 4 Roadmap** (Gap #1)
   - Strategic meeting: Core vs Editor features
   - Document separation of concerns
   - Create unified Phase 5 plan

4. **Format Extensions Proposal** (Gap #3)
   - Propose whisker v2.1 format
   - Add `editorData` namespace
   - Update whiskerCoreAdapter

### Priority 3: Medium (Future)

5. **Integration Test Suite** (Gap #6)
   - Shared test stories
   - Round-trip tests
   - Script compatibility tests

6. **Documentation Unification** (Gap #7)
   - Architecture overview
   - Integration guides
   - Cross-repository links

---

## Long-Term Recommendations

### 1. Unified Development Roadmap

Create a master roadmap that spans both repositories:
- Coordinated feature development
- Clear ownership: Core vs Editor
- Synchronized releases

### 2. Format Governance

Establish process for format changes:
- RFC process for format extensions
- Version numbering strategy
- Backward compatibility policy

### 3. Integration Testing

Implement continuous integration tests:
- Automated round-trip testing
- Script compatibility validation
- Format validation across versions

### 4. Performance Alignment

Ensure preview matches production:
- Benchmark editor LuaEngine vs core Lua
- Document performance differences
- Add performance warnings where needed

---

## Conclusion

The gaps between whisker-editor-web and whisker-core are **manageable** but require **strategic attention**. The most critical gaps are:

1. **Runtime compatibility** (Gap #2) - Script behavior must match
2. **Import capabilities** (Gap #4) - Major feature missing from editor
3. **Phase alignment** (Gap #1) - Roadmaps have diverged

Addressing these three gaps would significantly improve the whisker ecosystem's cohesion and user experience.

**Next Steps**:
1. Review this analysis with stakeholders
2. Prioritize gaps based on strategic goals
3. Create implementation plan for high-priority gaps
4. Establish ongoing alignment process

---

**Document Status**: Complete
**Requires**: Strategic decision on priorities
**Owner**: Technical leadership
