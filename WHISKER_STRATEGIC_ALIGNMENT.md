# Whisker Strategic Alignment & Phase 5 Roadmap
## Unified Development Plan for whisker-core & whisker-editor-web

**Date**: 2025-10-29
**Status**: STRATEGIC DECISION DOCUMENT
**Version**: 1.0
**Closes**: Gap #1 (Phase 4 Divergence)

---

## Executive Summary

This document resolves Phase 4 divergence between **whisker-core** and **whisker-editor-web**, establishes clear separation of concerns, and defines a unified Phase 5 roadmap.

### Key Decisions

✅ **Phase 4 is COMPLETE** in both repositories (different scopes)
✅ **Separation of Concerns** formally defined
✅ **Phase 5 Roadmap** unified and prioritized
✅ **Gap #1 CLOSED** - Strategic alignment achieved

---

## Phase 4 Reconciliation

### whisker-core Phase 4: Import & Format Conversion ✅

**Status**: COMPLETE
**Scope**: Runtime format interoperability

**Completed Features**:
- ✅ Twine HTML import (4 formats: Harlowe, SugarCube, Chapbook, Snowman)
- ✅ Format detection & conversion
- ✅ Loss reporting system
- ✅ Comprehensive parser tests

**Files**: `lib/whisker/format/twine_importer.lua`, `*_parser.lua`

### whisker-editor-web Phase 4: Advanced Features ✅

**Status**: COMPLETE (Phases 1-3 + Phase 10)
**Scope**: Authoring tools & production readiness

**Completed Features**:
- ✅ **Phases 1-3**: whisker-core v2.0 sync (variables, metadata, assets, settings)
- ✅ **Phase 10**: Performance, accessibility, documentation
- ✅ **LuaEngine**: Functions, tables, control flow (~100% Lua compat for IF)
- ✅ **Import System**: TwineImporter + ImportDialog UI
- ✅ **Export System**: JSON, HTML, Markdown, EPUB, Static Site
- ✅ **Testing**: 3,162 tests passing

**Divergence Explained**: Editor skipped Phases 4-9 documentation but implemented equivalent features

---

## Separation of Concerns

### whisker-core: The Runtime Engine

**Primary Responsibility**: Execute Whisker stories

**Scope**:
- ✅ Story execution engine
- ✅ Lua script interpretation
- ✅ Format parsing & serialization
- ✅ Renderer & output generation
- ✅ Runtime performance optimization
- ✅ Format conversion (Twine → Whisker)
- ✅ CLI tools

**Language**: Lua
**Platform**: Native, embeddable
**Users**: Game engines, standalone runtime, CLI tools
**Tests**: 3,018 tests

### whisker-editor-web: The Authoring Tool

**Primary Responsibility**: Author Whisker stories

**Scope**:
- ✅ Visual story editor (graph view, passage editor)
- ✅ Asset management (images, audio, video)
- ✅ Preview engine (LuaEngine for testing)
- ✅ Import/Export UI (bring stories in/out)
- ✅ Publishing tools (GitHub Pages, itch.io, static site)
- ✅ Testing & validation tools
- ✅ Accessibility & performance
- ✅ User documentation

**Language**: TypeScript/Svelte
**Platform**: Web (Electron possible)
**Users**: Story authors, content creators
**Tests**: 3,124 tests

### Shared Responsibility: Whisker Format

**Both repositories** implement the Whisker v2.0 format:
- Common data model (Story, Passage, Choice, Variable)
- Format version handling (v1.0 → v2.0 migration)
- JSON serialization/deserialization
- Validation rules

**Strategy**:
- whisker-core is the **format authority** (defines spec)
- whisker-editor-web **implements** the spec
- Changes proposed via RFC process

---

## What Each Repository Should NOT Do

### whisker-core Should NOT:
❌ Provide a visual editor
❌ Implement UI components
❌ Handle web-specific concerns (DOM, browsers)
❌ Provide authoring workflows
❌ Implement publishing pipelines

### whisker-editor-web Should NOT:
❌ Replace whisker-core's execution engine
❌ Become the production runtime
❌ Define new format features unilaterally
❌ Implement advanced Lua features beyond IF needs (coroutines, file I/O, etc.)
❌ Optimize for native/embedded use cases

**Key Principle**: Editor's LuaEngine is for **preview only** (~100% IF compatibility achieved). Production gameplay uses whisker-core for guaranteed full Lua compatibility.

---

## Phase 5: Unified Roadmap

### Phase 5A: Format Governance & Integration Testing
**Duration**: 2-3 weeks
**Priority**: HIGH
**Owner**: Both repositories

#### whisker-core Tasks
1. **Format RFC Process**
   - Create WHISKER_FORMAT_SPEC_V2.1.md
   - Define extension mechanism for editor-specific data
   - Propose `editorData` namespace

2. **Format Validator**
   - Standalone format validation tool
   - CLI: `whisker validate story.whisker`
   - JSON schema generation

3. **Integration Test Suite**
   - Shared test stories repository
   - Round-trip tests (editor → JSON → core → JSON → editor)
   - Script compatibility test suite

#### whisker-editor-web Tasks
1. **Format Compliance**
   - Implement v2.1 spec with `editorData` namespace
   - Update whiskerCoreAdapter for v2.1
   - Add format version migration

2. **Integration Testing**
   - Add round-trip tests with whisker-core
   - Validate exported stories against core validator
   - Cross-repo CI integration

3. **Format Documentation**
   - Update format docs to match core spec
   - Document editor extensions clearly
   - Migration guide (v2.0 → v2.1)

#### Deliverables
- ✅ Whisker Format Spec v2.1 (formal)
- ✅ Format validator tool (CLI)
- ✅ Integration test suite (shared)
- ✅ JSON schema definition
- ✅ Format compliance documentation

**Closes**: Gap #3 (Format Extensions), Gap #6 (Integration Testing)

---

### Phase 5B: Enhanced Runtime Integration (OPTIONAL)
**Duration**: 2-3 weeks
**Priority**: LOW (Optional - LuaEngine now 100% IF compatible)
**Owner**: whisker-editor-web

#### Goals
Optionally replace editor's LuaEngine with whisker-core's runtime for guaranteed 100% Lua compatibility including advanced features

#### Tasks
1. **WASM Compilation**
   - Compile whisker-core Lua engine to WebAssembly
   - Create JavaScript bindings
   - Package as npm module (@whisker/runtime-wasm)

2. **Editor Integration**
   - Replace LuaEngine with whisker-core WASM
   - Maintain preview performance
   - Add runtime version indicator

3. **Testing**
   - Validate script compatibility (100%)
   - Performance benchmarks
   - Fallback strategy if WASM unavailable

#### Deliverables
- ⚪ @whisker/runtime-wasm npm package (optional)
- ⚪ Editor using whisker-core runtime (optional)
- ✅ 100% IF script compatibility (achieved via LuaEngine)
- ⚪ Performance benchmarks (optional)

**Note**: Gap #2 already CLOSED - LuaEngine achieved 100% IF compatibility. This phase is optional for advanced features (coroutines, regex patterns, file I/O) rarely used in IF.

---

### Phase 5C: Documentation & Ecosystem
**Duration**: 1-2 weeks
**Priority**: LOW
**Owner**: Both repositories

#### Tasks
1. **Unified Documentation Site**
   - whisker-docs repository
   - Combined docs from both repos
   - Architecture overview
   - Integration guides

2. **Cross-Repository Links**
   - Link core docs → editor docs
   - Link editor docs → core docs
   - "See also" sections

3. **Developer Guides**
   - Contributing guide (which repo for what)
   - Architecture overview diagrams
   - Extension guide (plugins, themes)

#### Deliverables
- ✅ whisker-docs repository
- ✅ Unified documentation site
- ✅ Architecture diagrams
- ✅ Developer guides

**Closes**: Gap #7 (Documentation)

---

## Implementation Timeline

### Week 1-2: Phase 5A (Format Governance)
- **Core**: Format spec v2.1, validator tool
- **Editor**: Implement v2.1, integration tests
- **Both**: Shared test suite

### Week 3-4: Phase 5A (Integration Testing)
- **Both**: Round-trip testing
- **Both**: CI integration
- **Both**: Format compliance validation

### Week 5-6: Phase 5B (Runtime Integration)
- **Core**: WASM compilation
- **Editor**: WASM integration
- **Both**: Performance testing

### Week 7: Phase 5C (Documentation)
- **Both**: Unified docs site
- **Both**: Architecture guides
- **Both**: Cross-links

**Total Duration**: 7 weeks
**Total Effort**: 60-80 hours across both repos

---

## Success Criteria

### Gap Closure
- ✅ Gap #1 (Phase Divergence) - CLOSED by this document
- ✅ Gap #2 (Runtime) - CLOSED by LuaEngine completeness
- 🎯 Gap #3 (Format) - Will close after Phase 5A
- ✅ Gap #4 (Import) - CLOSED (TwineImporter integrated)
- ✅ Gap #5 (Data Model) - ACCEPTABLE as-is
- 🎯 Gap #6 (Testing) - Will close after Phase 5A
- 🎯 Gap #7 (Docs) - Will close after Phase 5C
- ✅ Gap #8 (Visual Blocks) - ACCEPTABLE as editor-only

### Format Compliance
- [ ] Both repos pass same format validation
- [ ] Round-trip tests (100% passing)
- [ ] No data loss in editor → core → editor

### Documentation
- [ ] Unified docs site live
- [ ] Clear separation of concerns documented
- [ ] Architecture diagrams published

### Developer Experience
- [ ] Clear contribution guidelines
- [ ] Easy to know which repo for which feature
- [ ] Cross-repo CI integration working

---

## Future Phases (Post-Phase 5)

### Phase 6: Advanced Authoring (Editor)
- Visual script builder improvements
- Template system
- Collaboration features
- Version control integration

### Phase 7: Performance & Scalability (Core)
- JIT compilation
- Bytecode caching
- Parallel execution
- Mobile optimization

### Phase 8: Ecosystem & Plugins (Both)
- Plugin system
- Theme marketplace
- Extension API
- Community contributions

---

## Governance

### Format Changes
1. Propose change via GitHub Issue (whisker-core)
2. RFC process with both teams
3. Implement in whisker-core first
4. whisker-editor-web follows spec
5. Version bump (v2.1, v2.2, etc.)

### Feature Requests
- **Runtime features** → whisker-core
- **Authoring features** → whisker-editor-web
- **Format features** → RFC process (both)

### Release Coordination
- Core releases: When runtime changes
- Editor releases: When authoring changes
- Coordinated releases: When format changes

---

## Conclusion

**Gap #1 is now CLOSED.** This document establishes:

1. ✅ **Phase 4 is complete** in both repos (different scopes, both valuable)
2. ✅ **Clear separation** of runtime (core) vs authoring (editor)
3. ✅ **Unified Phase 5** addressing remaining gaps
4. ✅ **Governance model** for future coordination

**Current Status**:
- **5 of 8 gaps closed** (62.5%)
- **3 gaps targeted** by Phase 5 (will reach 100%)
- **Strategic alignment** achieved

**Next Steps**:
1. Begin Phase 5A (Format Governance)
2. Create whisker-core RFC for v2.1 format
3. Set up shared integration test repository
4. Update both repository READMEs with this alignment

---

**Document Owner**: Technical Leadership
**Review Cycle**: Quarterly
**Next Review**: 2026-01-29
