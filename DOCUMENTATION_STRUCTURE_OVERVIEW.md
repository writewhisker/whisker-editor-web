# Documentation Structure Overview

Complete overview of documentation across all three repositories.

---

## 1. whisker-core (MIT License, Public)

**Purpose:** Technical/API documentation for the Lua library

### Current Structure (NO CHANGES NEEDED ✅)

```
whisker-core/
├── README.md                           ✅ Keep - Library overview, installation
├── AUTHORING.md                        ✅ Keep - Story creation guide
├── TESTING.md                          ✅ Keep - Testing documentation
├── CONTRIBUTING.md                     ✅ Keep - Developer guidelines
├── CODE_OF_CONDUCT.md                  ✅ Keep - Community guidelines
├── SECURITY.md                         ✅ Keep - Security policy
├── CHANGELOG.md                        ✅ Keep - Version history
├── LICENSE                             ✅ Keep - MIT License
├── NOTICE                              ✅ Keep - Legal notices
├── docs/
│   ├── API_REFERENCE.md                ✅ Keep - Complete API docs
│   ├── GETTING_STARTED.md              ✅ Keep - User tutorial
│   ├── COMPACT_FORMAT.md               ✅ Keep - Format specification
│   ├── TWINE_IMPORT_EXPORT.md          ✅ Keep - Import/export docs
│   ├── WHISKER_PARSERS.md              ✅ Keep - Parser documentation
│   ├── METATABLE_PRESERVATION.md       ✅ Keep - Implementation details
│   └── SNOWMAN_CONVERTER.md            ✅ Keep - Converter docs
├── examples/                           ✅ Keep - Code examples
│   ├── simple.lua
│   └── ...
└── tests/                              ✅ Keep - Test suite
```

**Assessment:** ✅ All documentation is technical/API focused. No planning docs to move.

---

## 2. whisker-editor-web (AGPL-3.0, Public)

**Purpose:** Technical implementation and user documentation

### Current Structure (BEFORE reorganization)

```
whisker-editor-web/
├── README.md                           📝 Needs simplification
├── CONTRIBUTING.md                     ✅ Keep
├── CODE_OF_CONDUCT.md                  ✅ Keep
├── SECURITY.md                         ✅ Keep
├── CHANGELOG.md                        ✅ Keep
├── PHASE_RECONCILIATION.md             ⚠️ MOVE to whisker-implementation
├── PHASE_5_IMPLEMENTATION_PLAN.md      ⚠️ MOVE to whisker-implementation
├── e2e/
│   └── README.md                       ✅ Keep - E2E testing guide
└── ... (source code)
```

### Proposed Structure (AFTER reorganization)

```
whisker-editor-web/
├── README.md                           ✅ NEW - Simplified, user-focused
├── ARCHITECTURE.md                     ✅ NEW - Technical architecture
├── TESTING.md                          ✅ NEW - Testing guide
├── CONTRIBUTING.md                     ✅ Keep - Developer workflow
├── CODE_OF_CONDUCT.md                  ✅ Keep - Community guidelines
├── SECURITY.md                         ✅ Keep - Security policy
├── CHANGELOG.md                        ✅ Keep - Version history
├── LICENSE                             ✅ Keep - AGPL-3.0
├── e2e/
│   └── README.md                       ✅ Keep - E2E testing details
├── src/                                ✅ Keep - Source code
│   └── ... (all source files)
└── tests/                              ✅ Keep - Test files
    └── ... (all test files)
```

**Files to REMOVE from whisker-editor-web:**
- ❌ `PHASE_RECONCILIATION.md` → Move to whisker-implementation
- ❌ `PHASE_5_IMPLEMENTATION_PLAN.md` → Move to whisker-implementation

**New Files to CREATE in whisker-editor-web:**
- ✅ `ARCHITECTURE.md` - Technical architecture and patterns
- ✅ `TESTING.md` - Comprehensive testing guide
- ✅ Updated `README.md` - Simplified, focused on features and getting started

---

## 3. whisker-implementation (Private)

**Purpose:** Planning, design, and strategic documentation

### Current Structure (BEFORE)

```
whisker-implementation/
├── README.md
├── visual-editor/
│   ├── VISUAL_EDITOR_PHASES.md         (Original specification)
│   └── VISUAL_EDITOR_MULTI_PLATFORM.md
├── core/
│   ├── CRITICAL_FIXES_APPLIED.md
│   ├── LUA_RUNTIME_FIX_SUMMARY.md
│   └── MUSEUM_RUNTIME.md
├── testing/
│   ├── TEST_IMPLEMENTATION_SUMMARY.md
│   ├── TEMPLATE_TEST_RESULTS.md
│   └── PASSAGE_TEMPLATES_SUMMARY.md
├── planning/
│   ├── NEXT_STEPS_PLAN.md
│   ├── RPG_INTEGRATION_PLAN.md
│   ├── INTEGRATION_TASKS_GUIDE.md
│   └── MISSING_COMPONENTS.md
└── phases/
    ├── PHASE1_CODE_REVIEW.md
    └── PHASE1_COMPLETION_SUMMARY.md
```

### Proposed Structure (AFTER)

```
whisker-implementation/
├── README.md                           📝 Update with new structure
│
├── visual-editor/
│   ├── VISUAL_EDITOR_PHASES.md         ✅ Keep - Original spec
│   ├── VISUAL_EDITOR_MULTI_PLATFORM.md ✅ Keep - Platform strategy
│   │
│   └── editor-web/                     ✅ NEW - Editor-web planning
│       ├── README.md                   ✅ NEW - Overview
│       ├── PHASE_RECONCILIATION.md     ✅ MOVE from editor-web
│       └── phases/
│           └── PHASE_5_IMPLEMENTATION_PLAN.md  ✅ MOVE from editor-web
│
├── core/                               ✅ Keep existing
│   ├── README.md                       ✅ NEW - Core planning overview
│   ├── CRITICAL_FIXES_APPLIED.md       ✅ Keep
│   ├── LUA_RUNTIME_FIX_SUMMARY.md      ✅ Keep
│   └── MUSEUM_RUNTIME.md               ✅ Keep
│
├── testing/                            ✅ Keep existing
│   ├── TEST_IMPLEMENTATION_SUMMARY.md  ✅ Keep
│   ├── TEMPLATE_TEST_RESULTS.md        ✅ Keep
│   └── PASSAGE_TEMPLATES_SUMMARY.md    ✅ Keep
│
├── planning/                           ✅ Keep existing
│   ├── NEXT_STEPS_PLAN.md              ✅ Keep
│   ├── RPG_INTEGRATION_PLAN.md         ✅ Keep
│   ├── INTEGRATION_TASKS_GUIDE.md      ✅ Keep
│   └── MISSING_COMPONENTS.md           ✅ Keep
│
└── phases/                             ✅ Keep existing
    ├── PHASE1_CODE_REVIEW.md           ✅ Keep
    └── PHASE1_COMPLETION_SUMMARY.md    ✅ Keep
```

**New Files to CREATE in whisker-implementation:**
- ✅ `visual-editor/editor-web/README.md` - Overview of editor-web planning
- ✅ `core/README.md` - Overview of core planning (placeholder)

**Files to RECEIVE from whisker-editor-web:**
- ✅ `visual-editor/editor-web/PHASE_RECONCILIATION.md` (from editor-web root)
- ✅ `visual-editor/editor-web/phases/PHASE_5_IMPLEMENTATION_PLAN.md` (from editor-web root)

---

## Document Categories by Repository

### whisker-core (Public, MIT)
**Focus:** API, tutorials, technical implementation

| Category | Examples |
|----------|----------|
| API Documentation | API_REFERENCE.md |
| User Guides | AUTHORING.md, GETTING_STARTED.md |
| Format Specs | COMPACT_FORMAT.md, TWINE_IMPORT_EXPORT.md |
| Technical Details | METATABLE_PRESERVATION.md, WHISKER_PARSERS.md |
| Examples | examples/*.lua |
| Tests | tests/*.lua |

### whisker-editor-web (Public, AGPL-3.0)
**Focus:** Getting started, architecture, testing

| Category | Examples |
|----------|----------|
| Getting Started | README.md (simplified) |
| Technical Architecture | ARCHITECTURE.md (NEW) |
| Testing | TESTING.md (NEW), e2e/README.md |
| Contributing | CONTRIBUTING.md |
| Community Health | CODE_OF_CONDUCT.md, SECURITY.md |

### whisker-implementation (Private)
**Focus:** Planning, design decisions, status tracking

| Category | Examples |
|----------|----------|
| Visual Editor Planning | VISUAL_EDITOR_PHASES.md (original spec) |
| Editor-Web Planning | PHASE_RECONCILIATION.md, PHASE_5_IMPLEMENTATION_PLAN.md |
| Platform Strategy | VISUAL_EDITOR_MULTI_PLATFORM.md |
| Core Implementation | LUA_RUNTIME_FIX_SUMMARY.md |
| Testing Strategy | TEST_IMPLEMENTATION_SUMMARY.md |
| Development Planning | NEXT_STEPS_PLAN.md, RPG_INTEGRATION_PLAN.md |
| Phase Tracking | PHASE1_COMPLETION_SUMMARY.md |

---

## Migration Steps

### Step 1: Create new docs in whisker-editor-web
- [x] Create `ARCHITECTURE.md`
- [x] Create `TESTING.md`
- [x] Update `README.md` (simplified)

### Step 2: Set up whisker-implementation structure
- [ ] Create `visual-editor/editor-web/` directory
- [ ] Create `visual-editor/editor-web/README.md`
- [ ] Create `visual-editor/editor-web/phases/` directory
- [ ] Create `core/README.md` (placeholder)

### Step 3: Move planning docs
- [ ] Copy `PHASE_RECONCILIATION.md` → `whisker-implementation/visual-editor/editor-web/`
- [ ] Copy `PHASE_5_IMPLEMENTATION_PLAN.md` → `whisker-implementation/visual-editor/editor-web/phases/`

### Step 4: Update references in whisker-editor-web
- [ ] Update README.md links to point to whisker-implementation
- [ ] Update any other cross-references

### Step 5: Commit changes
- [ ] Commit to whisker-implementation (add new planning docs)
- [ ] Commit to whisker-editor-web (remove planning docs, add technical docs)

### Step 6: Clean up
- [ ] Delete `PHASE_RECONCILIATION.md` from whisker-editor-web
- [ ] Delete `PHASE_5_IMPLEMENTATION_PLAN.md` from whisker-editor-web

---

## Summary

**whisker-core:** ✅ No changes needed - already well-organized with technical/API docs

**whisker-editor-web:**
- Remove 2 planning docs
- Add 2 new technical docs (ARCHITECTURE.md, TESTING.md)
- Simplify README.md

**whisker-implementation:**
- Add `visual-editor/editor-web/` structure
- Receive 2 planning docs from editor-web
- Add overview README files

**Result:** Clear separation of technical docs (public repos) from planning docs (private repo)
