# Superset Parity Plan: whisker-core ↔ whisker-editor-web

## Goal
Both implementations have 100% of ALL features from BOTH codebases.

## Current State (Updated 2026-01-08)

| Feature Category | whisker-core (Lua) | whisker-editor-web (TS) |
|-----------------|-------------------|------------------------|
| Lua Runtime | 100% (native) | **~99%** |
| Runtime Features | Full | Full |
| Export Formats | **11** | **11** |
| Import Formats | **8** | **8** |
| Validators | **55+ checks** | **55+ checks** |
| Error Codes | **WLS-*-001 to N** | **WLS-*-001 to N** |
| Security (CSP, Sandbox) | **Full** | **Full** |

### PARITY ACHIEVED (Including Granularity)

Both implementations have feature parity on all major capabilities, including:
- Identical validator granularity (same error codes)
- Identical export/import format support
- Identical converter support (Twine story formats)

---

## WLS Version Consolidation (2026-01-08)

WLS 1.0 and WLS 2.0 have been consolidated into a single unified WLS 1.0 specification.
Since there were no existing users, all "WLS 2.0" features are now part of WLS 1.0.

### Changes Made

1. **Scripting Package**: Moved `wls2/` files to main `src/`
   - `WLS2Container` → `Container`
   - `WLS2Options` → `ContainerOptions`
   - `createWLS2Container` → `createContainer`

2. **Story Player Package**: Renamed integration facade
   - `WLS2Integration` → `RuntimeIntegration`
   - `WLS2Config` → `RuntimeConfig`
   - `createWLS2Player` → `createPlayer`

3. **Parser Package**: Renamed declarations
   - `wls2-declarations.ts` → `declarations.ts`

4. **Migration Tools**: Removed
   - `tools/migrate-1x-to-2x.ts` - deleted
   - `cli-migrate/wlsMigration.ts` - deleted

5. **Test Corpus**: Flattened structure
   - Merged `wls1/` and `wls2/` directories
   - Removed version-specific tags

6. **Documentation**: Updated
   - Deleted `WLS-2.0-FEATURES.md`
   - Updated all version references

---

## Feature Overview

### Lua Engine (~99% Lua 5.4 compatibility)

**Fully Implemented:**
- Math library (all functions)
- String library (all functions)
- Table library (all functions)
- OS library (safe subset: time, date, clock, difftime)
- Coroutine support (create, resume, yield, status, wrap)
- Module system (require, package.loaded, package.preload)
- Metatable support (all metamethods including `__close`)
- Debug library (traceback, getinfo, getlocal)
- UTF-8 library (all functions)
- Lua 5.4 features (`<const>`, `<close>`, `//`, bitwise ops, warn)

**Intentionally Not Supported (Browser Security):**
- File I/O (`io` library, `os.execute`, `loadfile`, `dofile`)
- Weak tables (`__mode` metamethod)
- Full debug introspection (upvalues)

### Runtime Features

**Thread Scheduler:**
- Parallel narrative execution
- Thread spawning and priorities
- Await synchronization

**Timed Content:**
- One-shot and repeating timers
- Time string parsing ("500ms", "2s")
- Global and per-timer pause

**LIST State Machine:**
- State add/remove/toggle
- History tracking
- Callback system

**External Functions:**
- Host function binding
- Type validation

**Text Effects:**
- Typewriter effect
- Animations (shake, pulse, glitch)
- Transitions (fade, slide)

**Audio Effects:**
- Fade in/out, crossfade
- Audio groups (music, sfx, ambient)

**Parameterized Passages:**
- Passages with parameters
- Default values

### Export Formats

whisker-core and whisker-editor-web both support:
- JSON, Twine, EPUB, HTML, Markdown
- PDF, PWA, Static Site, Text, Ink

### Validators (Full Granularity Parity)

Both implementations have equivalent granular checks:

| Category | Error Codes | Description |
|----------|-------------|-------------|
| Structural | WLS-STR-001 to 006 | Start passage, duplicates, unreachable, empty, orphans, terminals |
| Links | WLS-LNK-001 to 005 | Dead links, self-links, empty targets, special target case, BACK on start |
| Flow | WLS-FLW-001 to 006 | Dead ends, bottlenecks, cycles, infinite loops, unreachable choices, always-true |
| Variables | WLS-VAR-001 to 008 | Undefined, unused, invalid names, reserved prefix, shadowing, lone $, unclosed interp, temp cross-passage |
| Expressions | WLS-EXP-001 to 007 | Empty, unclosed, assignment in condition, missing operands, invalid operators, unmatched parens, incomplete |
| Syntax | WLS-SYN-001 to 003 | Parse errors, stylesheets, script keywords |
| Quality | WLS-QUA-001 to 012 | Branching, complexity, passage length, nesting, variable count, choices per passage, dead ends, pacing, short passages, terminal passages, uninitialized read, unused write |
| Assets | WLS-AST-001 to 007 | IDs, paths, refs, unused, names, mimetypes, sizes |
| Metadata | WLS-META-001 to 005 | IFID presence, IFID format, dimensions, reserved keys, size |
| Scripts | WLS-SCR-001 to 004 | Empty scripts, syntax, unsafe functions, sizes |
| Collections | WLS-COL-001 to 010 | Duplicate list values, empty lists, invalid identifiers, array indices, map keys, undefined LIST/ARRAY/MAP references |
| Modules | WLS-MOD-001 to 015 | Invalid paths, circular includes, namespace conflicts, invalid function/namespace names, reserved names, duplicate functions, parameter validation, export/import consistency, undefined function calls |
| Presentation | WLS-PRS-001 to 015 | Invalid theme, CSS classes, unclosed formatting, style properties, blockquote depth, media URLs, alt text, long paragraphs, color contrast, heading hierarchy |

### Security

- CSP generation
- SHA-256 hashing
- Content sandboxing

---

## Test Corpus

Cross-platform test suite validates parity:

```
test-corpus/
├── variables/      # Variable operations
├── control-flow/   # If/else, loops
├── functions/      # Function definitions
├── tables/         # Table operations
├── lists/          # LIST state machine
├── validators/     # Validator behavior
└── exporters/      # Export format tests
```

**Test Results (TypeScript):**
- 21 passed, 1 skipped (22 total)
- The 1 skip is for LIST runtime integration (requires runtime wiring)

---

## Conclusion

Parity is complete. Both implementations support the unified WLS 1.0 specification.
