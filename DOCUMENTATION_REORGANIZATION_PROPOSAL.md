# Documentation Reorganization Proposal

## Executive Summary

This proposal outlines a comprehensive reorganization of documentation across the writewhisker ecosystem to improve clarity, maintainability, and discoverability. The goal is to centralize all **design, planning, and status** documentation in `whisker-implementation` while keeping **usage, technical, and developer** documentation in the respective product repositories.

## Principles

### whisker-core & whisker-editor-web

**Focus:** Technical implementation and user-facing documentation

**Include:**
- ✅ README (getting started, installation, usage)
- ✅ API/Component documentation
- ✅ Tutorials and examples
- ✅ Testing guide (how to run/write tests)
- ✅ Architecture documentation (technical implementation details)
- ✅ Contributing guide (developer workflow)
- ✅ Community health files (CODE_OF_CONDUCT, SECURITY)
- ✅ CHANGELOG (version history)

**Exclude:**
- ❌ Phase plans and roadmaps
- ❌ Design decisions and rationale
- ❌ Project status and progress tracking
- ❌ Implementation timelines
- ❌ Feature planning documents

### whisker-implementation

**Focus:** Design, planning, status, and strategic documentation

**Include:**
- ✅ All phase implementation plans
- ✅ Project roadmap and status
- ✅ Design decisions and ADRs (Architecture Decision Records)
- ✅ Feature specifications
- ✅ Project timeline and estimates
- ✅ Phase reconciliation and comparisons
- ✅ Success criteria definitions
- ✅ Cross-repository planning
- ✅ Development strategy

**Exclude:**
- ❌ Code-level documentation
- ❌ API references
- ❌ Getting started guides
- ❌ Tutorials

---

## Migration Plan

### Phase 1: whisker-editor-web → whisker-implementation

#### Files to Move

| Current Location | New Location | Type |
|-----------------|--------------|------|
| `PHASE_RECONCILIATION.md` | `whisker-implementation/editor-web/PHASE_RECONCILIATION.md` | Planning |
| `PHASE_5_IMPLEMENTATION_PLAN.md` | `whisker-implementation/editor-web/phases/PHASE_5_IMPLEMENTATION_PLAN.md` | Planning |
| README.md (roadmap section) | `whisker-implementation/editor-web/ROADMAP.md` | Planning |
| README.md (phase details) | `whisker-implementation/editor-web/FEATURES.md` | Planning |

#### Files to Keep (whisker-editor-web)

| File | Purpose | Notes |
|------|---------|-------|
| `README.md` | Quick start, installation, basic usage | Simplified version |
| `CONTRIBUTING.md` | Developer workflow, PR process | Kept as-is |
| `CODE_OF_CONDUCT.md` | Community guidelines | Standard file |
| `SECURITY.md` | Security policy | Standard file |
| `CHANGELOG.md` | Version history | Standard file |
| `e2e/README.md` | E2E testing guide | Technical documentation |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template | Standard file |

#### Files to Create (whisker-editor-web)

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | Technical architecture overview |
| `TESTING.md` | Comprehensive testing guide |
| `docs/COMPONENT_API.md` | Component API reference |
| `docs/STORES.md` | Store documentation |
| `docs/MODELS.md` | Data model documentation |

### Phase 2: whisker-core → whisker-implementation

#### Current State Analysis

whisker-core is **well-organized** with mostly technical/API documentation:

**Existing Documentation (stays in whisker-core):**
- `README.md` - Installation, quick start, API overview ✅
- `AUTHORING.md` - User guide for creating stories ✅
- `TESTING.md` - Testing documentation ✅
- `CONTRIBUTING.md` - Developer guidelines ✅
- `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md` ✅
- `docs/API_REFERENCE.md` - Complete API documentation ✅
- `docs/GETTING_STARTED.md` - User tutorial ✅
- `docs/COMPACT_FORMAT.md` - Format specification ✅
- `docs/TWINE_IMPORT_EXPORT.md` - Import/export documentation ✅
- `docs/WHISKER_PARSERS.md` - Parser documentation ✅
- `docs/METATABLE_PRESERVATION.md` - Implementation details ✅
- `docs/SNOWMAN_CONVERTER.md` - Converter documentation ✅
- `examples/` - Code examples ✅

#### Assessment

**✅ whisker-core documentation is already properly organized!**

All files are **technical/API/user-facing documentation** that should stay in the repository. No planning or design documents found.

#### Minimal Changes Needed

**Create in whisker-implementation:**
- `core/README.md` - Link to whisker-core with brief overview
- `core/ROADMAP.md` - If future planning needed
- `core/features/` - Directory for future feature planning (currently empty)
- `core/decisions/` - Directory for future ADRs (currently empty)

**No files to move from whisker-core** - it's already correctly organized.

#### Files to Keep (whisker-core)

| File | Purpose | Status |
|------|---------|--------|
| `README.md` | Library overview, installation, usage | ✅ Keep |
| `AUTHORING.md` | Story creation guide | ✅ Keep |
| `TESTING.md` | Testing guide | ✅ Keep |
| `docs/API_REFERENCE.md` | Complete API reference | ✅ Keep |
| `docs/*.md` | Technical documentation | ✅ Keep |
| `CONTRIBUTING.md` | Developer guidelines | ✅ Keep |
| `examples/` | Code examples | ✅ Keep |
| Community health files | Standard files | ✅ Keep |

### Phase 3: whisker-implementation Structure

#### Proposed Directory Structure

```
whisker-implementation/
├── README.md                           # Overview of the implementation repo
├── ROADMAP.md                          # Cross-project roadmap
├── STATUS.md                           # Current status across all projects
├── decisions/                          # Architecture Decision Records
│   ├── 001-use-agplv3-for-editors.md
│   ├── 002-svelte-over-react.md
│   └── template.md
├── core/                               # whisker-core planning
│   ├── README.md
│   ├── ROADMAP.md
│   ├── features/
│   │   ├── feature-template.md
│   │   └── [feature-name].md
│   └── decisions/
├── editor-web/                         # whisker-editor-web planning
│   ├── README.md
│   ├── ROADMAP.md                      # Detailed roadmap (from current README)
│   ├── FEATURES.md                     # Feature catalog with status
│   ├── PHASE_RECONCILIATION.md         # Moved from editor-web root
│   ├── phases/
│   │   ├── PHASE_1_SUMMARY.md
│   │   ├── PHASE_2_SUMMARY.md
│   │   ├── PHASE_3_SUMMARY.md
│   │   ├── PHASE_4_SUMMARY.md
│   │   ├── PHASE_5_IMPLEMENTATION_PLAN.md
│   │   ├── PHASE_6_PLAN.md
│   │   ├── PHASE_7_PLAN.md
│   │   ├── PHASE_8_PLAN.md
│   │   ├── PHASE_9_PLAN.md
│   │   └── PHASE_10_PLAN.md
│   ├── features/
│   │   ├── connection-editing.md
│   │   ├── tag-management.md
│   │   └── search-filtering.md
│   └── decisions/
│       ├── 001-svelte-flow-for-graph.md
│       ├── 002-tailwind-css-4.md
│       └── 003-e2e-over-component-tests.md
├── editor-desktop/                     # whisker-editor-desktop planning
│   ├── README.md
│   ├── ROADMAP.md
│   └── features/
└── visual-editor/                      # Original VISUAL_EDITOR_PHASES.md
    ├── VISUAL_EDITOR_PHASES.md         # Original specification
    └── README.md
```

---

## Detailed File Specifications

### whisker-editor-web/README.md (New Simplified Version)

**Focus:** Quick start and basic usage

**Sections:**
1. **What is whisker-editor-web** (1-2 paragraphs)
2. **Quick Start** (installation, running)
3. **Key Features** (bullet list, no phase details)
4. **Technology Stack** (brief list)
5. **Documentation** (links to implementation repo)
6. **Contributing** (link to CONTRIBUTING.md)
7. **License** (AGPL-3.0 summary)

**Remove:**
- Detailed phase descriptions
- Roadmap section
- Phase dependency graphs
- Timeline estimates
- Success criteria
- Development priorities

**Replace with:**
- Link to `whisker-implementation/editor-web/ROADMAP.md`
- Link to `whisker-implementation/editor-web/FEATURES.md`
- Link to `whisker-implementation/STATUS.md`

**Complete Content:**

```markdown
# whisker-editor-web 🎨

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Svelte](https://img.shields.io/badge/svelte-5-ff3e00.svg)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-137%20passing-brightgreen.svg)](https://github.com/writewhisker/whisker-editor-web/actions)

**Modern visual story editor for whisker interactive fiction.** Create and edit interactive stories with an intuitive web-based interface featuring visual node graphs, real-time editing, and powerful story management tools.

> **Part of the writewhisker ecosystem**
> - Core library: [whisker-core](https://github.com/writewhisker/whisker-core) (MIT License)
> - Web editor: whisker-editor-web (this repository - AGPLv3)
> - Desktop editor: [whisker-editor-desktop](https://github.com/writewhisker/whisker-editor-desktop) (AGPLv3)

## ✨ Features

**Currently Available:**

- **Visual Story Editor** - Create and edit interactive stories with a modern web interface
- **Node Graph Visualization** - See your story structure as an interactive node graph with multiple layout options (hierarchical, circular, grid)
- **Real-Time Editing** - Edit passages, choices, and connections with instant visual feedback
- **Advanced Search & Filtering** - Find passages by title, content, tags, or type with powerful filtering
- **Visual Connection Editing** - Create connections by dragging between nodes, edit inline, and see conditional connections visually
- **Tag Management** - Organize passages with colored tags, autocomplete, and centralized tag management
- **Comprehensive Testing** - 137 passing tests ensuring reliability (unit + E2E)

**Key Capabilities:**

✅ **Story Management** - Create, save, load, and manage complete interactive fiction projects
✅ **Passage Editing** - Edit text, choices, conditions, and metadata for each story passage
✅ **Choice System** - Create branching narratives with conditional and unconditional choices
✅ **Variable System** - Track and manage story state with variables
✅ **History/Undo** - 50-level undo/redo for all edits
✅ **Visual Graph** - Interactive node-based view with drag-and-drop, zoom, pan, and minimap
✅ **Connection Validation** - Detect orphaned connections, dead-end passages, and unreachable content
✅ **Tag Organization** - Color-coded tags with autocomplete and global management

**In Development:**

- Enhanced view modes & navigation
- Live preview & testing
- Validation & quality tools
- Export & publishing

See the [full roadmap](https://github.com/writewhisker/whisker-implementation/blob/main/editor-web/ROADMAP.md) and [feature catalog](https://github.com/writewhisker/whisker-implementation/blob/main/editor-web/FEATURES.md) for details.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm 9+ or pnpm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/writewhisker/whisker-editor-web.git
cd whisker-editor-web

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## 🛠️ Technology Stack

- **[Svelte 5](https://svelte.dev/)** - Reactive UI framework with runes
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS
- **[Svelte Flow](https://svelteflow.dev/)** - Interactive node graphs
- **[dagre](https://github.com/dagrejs/dagre)** - Graph layout algorithms
- **[Vitest](https://vitest.dev/)** - Unit testing framework
- **[Playwright](https://playwright.dev/)** - E2E testing framework

## 📚 Documentation

### For Users

- **[Getting Started Guide](docs/GETTING_STARTED.md)** - First steps with the editor
- **[User Guide](docs/USER_GUIDE.md)** - Complete feature documentation
- **[Tutorials](docs/tutorials/)** - Step-by-step tutorials

### For Developers

- **[Architecture Overview](ARCHITECTURE.md)** - Technical architecture and patterns
- **[Testing Guide](TESTING.md)** - How to run and write tests
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Component API](docs/COMPONENT_API.md)** - Component documentation
- **[Store Documentation](docs/STORES.md)** - State management patterns
- **[Model Documentation](docs/MODELS.md)** - Data model reference

### Planning & Design

- **[Project Roadmap](https://github.com/writewhisker/whisker-implementation/blob/main/editor-web/ROADMAP.md)** - Development roadmap and timelines
- **[Feature Catalog](https://github.com/writewhisker/whisker-implementation/blob/main/editor-web/FEATURES.md)** - Complete feature list with status
- **[Architecture Decisions](https://github.com/writewhisker/whisker-implementation/tree/main/editor-web/decisions)** - Technical decision records
- **[Project Status](https://github.com/writewhisker/whisker-implementation/blob/main/STATUS.md)** - Current status across all projects

## 🧪 Testing

```bash
# Run unit tests in watch mode
npm test

# Run unit tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

**Current Coverage:** 137 tests passing (100%)
- 40 model tests (Story, Passage, Choice, Variable, History)
- 27 connection validation tests
- 20 graph layout tests
- 34 tag management tests
- 16 filter and search tests
- E2E tests for critical workflows

See [TESTING.md](TESTING.md) for detailed testing documentation.

## 📁 Project Structure

```
whisker-editor-web/
├── src/
│   ├── lib/
│   │   ├── components/         # Svelte components
│   │   │   ├── graph/          # Graph visualization
│   │   │   ├── PassageList.svelte
│   │   │   ├── PropertiesPanel.svelte
│   │   │   ├── TagInput.svelte
│   │   │   └── TagManager.svelte
│   │   ├── models/             # Data models
│   │   │   ├── Story.ts
│   │   │   ├── Passage.ts
│   │   │   ├── Choice.ts
│   │   │   └── Variable.ts
│   │   ├── stores/             # State management
│   │   │   ├── projectStore.ts
│   │   │   ├── tagStore.ts
│   │   │   └── filterStore.ts
│   │   └── utils/              # Utilities
│   │       ├── graphLayout.ts
│   │       └── connectionValidator.ts
│   ├── App.svelte              # Main app component
│   └── main.ts                 # Entry point
├── e2e/                        # E2E tests
├── docs/                       # User documentation
├── ARCHITECTURE.md             # Architecture overview
├── TESTING.md                  # Testing guide
└── README.md                   # This file
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## 📝 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

### Why AGPLv3?

We chose AGPLv3 to ensure that improvements to the visual editor are shared back with the community, especially for hosted/SaaS deployments.

**Key points:**
- ✅ Free to use, modify, and distribute
- ✅ Can be used in commercial projects
- ⚠️ Modifications must be released under AGPLv3
- ⚠️ Network use requires source disclosure

### Using with whisker-core

The core whisker library ([whisker-core](https://github.com/writewhisker/whisker-core)) is MIT licensed, allowing broad commercial use. This editor integrates with whisker-core but is separately licensed under AGPLv3.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick Start:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Ensure tests pass (`npm run test:run`)
5. Commit with descriptive messages
6. Push to your fork
7. Open a Pull Request

## 🔗 Related Projects

- **[whisker-core](https://github.com/writewhisker/whisker-core)** - Core Lua library (MIT)
- **[whisker-editor-desktop](https://github.com/writewhisker/whisker-editor-desktop)** - Desktop editor with Tauri (AGPLv3)
- **[whisker-implementation](https://github.com/writewhisker/whisker-implementation)** - Planning & design docs
- **[writewhisker](https://github.com/writewhisker)** - Organization home

## 📞 Support

- **Documentation:** [User Guide](docs/USER_GUIDE.md)
- **Issues:** [GitHub Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- **Discussions:** [GitHub Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)

## 🙏 Acknowledgments

- Built with [Svelte 5](https://svelte.dev/) and [Vite](https://vitejs.dev/)
- Graph visualization powered by [Svelte Flow](https://svelteflow.dev/)
- Inspired by [Twine](https://twinery.org/)
- Part of the [writewhisker](https://github.com/writewhisker) ecosystem

---

**Start creating visual interactive stories today!** 🚀
```


### whisker-editor-web/ARCHITECTURE.md (New)

**Purpose:** Technical architecture overview

**Sections:**
1. **System Architecture**
   - Component hierarchy
   - Data flow
   - State management pattern

2. **Technology Decisions**
   - Why Svelte 5
   - Why Svelte Flow
   - Why Tailwind CSS 4

3. **Key Patterns**
   - Store pattern
   - Component composition
   - Event handling

4. **Testing Strategy**
   - Unit tests (Vitest)
   - E2E tests (Playwright)
   - Coverage goals

### whisker-editor-web/TESTING.md (New)

**Purpose:** Comprehensive testing guide

**Sections:**
1. **Running Tests**
   - Unit tests
   - E2E tests
   - Coverage reports

2. **Writing Tests**
   - Unit test examples
   - E2E test examples
   - Test patterns

3. **Test Organization**
   - File structure
   - Naming conventions

4. **CI/CD Integration**
   - GitHub Actions workflow
   - Coverage reporting

### whisker-implementation/editor-web/FEATURES.md (New)

**Purpose:** Complete feature catalog with detailed descriptions

**Complete Content:**

```markdown
# whisker-editor-web Features

Complete catalog of all features, organized by phase with implementation status and detailed descriptions.

## Phase 1: Core Data Models & State Management ✅

**Status:** Complete
**Tests:** 40 tests passing

### Story Model ✅
- Complete story structure with metadata (title, author, IFID)
- Passage collection management
- Variable definitions and initial values
- Start passage designation
- JSON serialization and deserialization
- Story-level validation

**Files:** `src/lib/models/Story.ts`, `src/lib/models/Story.test.ts`

### Passage Model ✅
- Individual story nodes with unique IDs
- Content storage (markdown-ready)
- Title and position tracking
- Tag support for organization
- Choice collection (branching)
- Metadata (creation/modification timestamps)

**Files:** `src/lib/models/Passage.ts`, `src/lib/models/Passage.test.ts`

### Choice System ✅
- Branching narratives with target passages
- Choice text (what the player sees)
- Conditional logic support (Lua expressions)
- Choice validation
- Orphan detection

**Files:** `src/lib/models/Choice.ts`, `src/lib/models/Choice.test.ts`

### Variable System ✅
- Story state variables with types (string, number, boolean)
- Initial value definitions
- Variable usage tracking
- Type validation
- Variable inspector integration

**Files:** `src/lib/models/Variable.ts`, `src/lib/models/Variable.test.ts`

### History/Undo System ✅
- 50-level undo/redo for all operations
- State snapshots with JSON serialization
- Forward/backward navigation
- History trimming to limit memory
- Undo/redo UI integration

**Files:** `src/lib/stores/historyStore.ts`, `src/lib/stores/historyStore.test.ts`

### Serialization ✅
- Complete story save/load as JSON
- Preserves all data (passages, choices, variables, positions)
- Version compatibility
- Error handling for malformed data
- Auto-save capability (localStorage integration)

**Files:** `src/lib/models/Story.ts` (toJSON/fromJSON methods)

---

## Phase 2: Basic UI Components ✅

**Status:** Complete
**Tests:** Covered by integration and E2E tests

### Project Management ✅
- New project creation with defaults
- Save project to localStorage
- Load existing projects
- Close project with confirmation
- Recent projects list
- Project metadata editing

**Files:** `src/lib/stores/projectStore.ts`, `src/lib/components/ProjectMenu.svelte`

### Passage List ✅
- Scrollable list of all passages
- Passage titles with truncation
- Selection highlighting
- Quick passage navigation
- Visual indicators (start passage, orphans, dead-ends)
- Choice count display
- Tag display (up to 3, with overflow)
- Filter integration

**Files:** `src/lib/components/PassageList.svelte`

### Passage Editor ✅
- Content editing with textarea
- Title editing inline
- Tag management
- Position adjustment
- Choice editor integration
- Auto-save on changes
- Validation feedback

**Files:** `src/lib/components/PassageEditor.svelte`

### Choice Editor ✅
- Add/remove/edit choices
- Choice text editing
- Target passage selection (dropdown)
- Condition editor (Lua expressions)
- Choice reordering
- Validation warnings
- Quick navigation to target

**Files:** `src/lib/components/ChoiceEditor.svelte` (integrated in PassageEditor)

### Properties Panel ✅
- Passage title editing
- Tag management with TagInput
- Position controls (x, y coordinates)
- Choice list with inline editing
- Variable display
- Metadata display (ID, timestamps)

**Files:** `src/lib/components/PropertiesPanel.svelte`

### Variable Manager ✅
- List all story variables
- Add/remove variables
- Edit variable names
- Set types (string, number, boolean)
- Set initial values
- Variable usage tracking
- Delete unused variables

**Files:** `src/lib/components/VariableManager.svelte`

### Responsive Design ✅
- Desktop-optimized layout
- Tablet support (landscape)
- Panel resizing
- Collapsible panels
- Mobile-friendly (basic view)

**Implementation:** Tailwind CSS responsive utilities throughout

---

## Phase 3: Visual Node Graph ✅

**Status:** Complete
**Tests:** 20 layout tests

### Interactive Graph ✅
- Visual representation using Svelte Flow
- Nodes for passages with content preview
- Edges for choices/connections
- Zoom controls (buttons + mouse wheel)
- Pan controls (click-drag or space-drag)
- Fit view button
- Selection sync with list view

**Files:** `src/lib/components/GraphView.svelte`, `src/lib/components/graph/PassageNode.svelte`

### Multiple Layout Algorithms ✅
- **Hierarchical** - Top-down or left-right tree layout using dagre
- **Circular** - Passages arranged in a circle
- **Grid** - Evenly spaced grid layout
- **Manual** - Drag to position, save custom layouts
- Layout persistence per project

**Files:** `src/lib/utils/graphLayout.ts`, `src/lib/utils/graphLayout.test.ts`

### Visual Indicators ✅
- **Start Passage** - Green border and star icon (⭐)
- **Orphan Passages** - Orange border and warning icon (⚠️)
- **Dead-end Passages** - Red border and stop icon (🔚)
- **Selected Passage** - Highlighted border
- **Filtered Passages** - Dimmed when not matching filter
- **Connection Count** - Badge showing number of choices

**Files:** `src/lib/components/graph/PassageNode.svelte`

### Drag & Drop ✅
- Drag nodes to reposition
- Live position updates
- Save custom positions
- Reset to auto-layout
- Snap to grid (optional)
- Preserve manual positions on layout switch

**Files:** `src/lib/components/GraphView.svelte` (Svelte Flow integration)

### Minimap ✅
- Small overview of entire graph
- Current viewport indicator
- Click to navigate
- Toggle on/off
- Responsive sizing

**Files:** `src/lib/components/GraphView.svelte` (Svelte Flow MiniMap)

### Zoom/Pan Controls ✅
- Mouse wheel zoom
- Zoom buttons (+/-)
- Fit view to content
- Center on selection
- Pan with click-drag
- Pan with space-drag
- Touch gestures (mobile)

**Files:** `src/lib/components/GraphView.svelte` (Svelte Flow controls)

### View Modes ✅
- **List View** - Passage list only
- **Graph View** - Node graph only
- **Split View** - List + Graph side-by-side
- Quick toggle between modes
- Mode persistence

**Files:** `src/App.svelte`, `src/lib/stores/viewStore.ts`

---

## Phase 4: Search and Filtering ✅

**Status:** Complete
**Tests:** 16 tests

### Advanced Search ✅
- Search across passage titles
- Search passage content (full-text)
- Search choice text
- Search tags
- Case-insensitive matching
- Highlight search results
- Clear search button
- Search result count

**Files:** `src/lib/components/SearchBar.svelte`, `src/lib/stores/filterStore.ts`

### Tag Filtering ✅
- Filter by single tag
- Filter by multiple tags (OR logic)
- Tag dropdown with autocomplete
- Show passages with any selected tag
- Clear tag filters
- Tag filter chips with remove buttons

**Files:** `src/lib/components/SearchBar.svelte`, `src/lib/stores/filterStore.ts`

### Type Filtering ✅
- Filter by passage type:
  - **Start** - Start passage only
  - **Orphan** - Unreachable passages
  - **Dead-end** - Passages with no choices
  - **Normal** - All other passages
- Multiple type selection
- Type filter chips

**Files:** `src/lib/stores/filterStore.ts`, `src/lib/stores/filterStore.test.ts`

### Unified Filtering ✅
- Combine search + tag + type filters
- Consistent experience across list and graph
- Real-time filter application
- Filter state persistence
- Clear all filters button
- Result count display
- Empty state messaging

**Files:** `src/lib/stores/filterStore.ts` (derived store pattern)

### Visual Feedback ✅
- Active filter chips
- Result count badges
- Filtered passage dimming in graph
- Filtered passage hiding in list (optional)
- No results message
- Filter summary

**Files:** `src/lib/components/PassageList.svelte`, `src/lib/components/GraphView.svelte`

---

## Phase 5: Visual Connection Editing & Advanced Tagging ✅

**Status:** Complete
**Tests:** 61 tests (27 connection + 34 tag tests) + E2E tests

### Visual Connection Creation ✅
- Drag from source handles to create connections
- Multiple source handles (one per existing choice)
- Special "new connection" handle for creating new choices
- Auto-generated choice text based on target passage
- Visual feedback during drag
- Connection validation (no self-loops, no duplicates)
- Immediate graph update

**Files:** `src/lib/components/GraphView.svelte`, `src/lib/components/graph/PassageNode.svelte`

### Connection Editing & Styling ✅
- Custom ConnectionEdge component
- Choice text displayed as edge label
- Conditional connections: dashed orange lines
- Unconditional connections: solid blue lines
- Inline editing via double-click or context menu
- Delete via context menu
- Edit conditions via context menu
- Change target via reconnection (drag edge endpoint)

**Files:** `src/lib/components/graph/ConnectionEdge.svelte`, `src/lib/components/GraphView.svelte`

### Connection Validation ✅
- Detect orphaned connections (target doesn't exist)
- Detect dead-end passages (no outgoing connections)
- Detect unreachable passages (no incoming connections)
- Detect self-connections
- Detect duplicate connections
- Visual indicators for issues
- Validation summary panel
- Auto-cleanup on passage deletion

**Files:** `src/lib/utils/connectionValidator.ts`, `src/lib/utils/connectionValidator.test.ts`

### Tag Management System ✅
- Centralized tag registry (derived store)
- Track tag usage across all passages
- Tag rename (global across all passages)
- Tag merge (combine two tags into one)
- Tag delete (remove from all passages)
- Tag statistics (usage count, passage list)
- Custom color persistence (localStorage)

**Files:** `src/lib/stores/tagStore.ts`, `src/lib/stores/tagStore.test.ts`

### Tag Colors ✅
- 12-color predefined palette
- Hash-based deterministic color assignment
- Custom color override via color picker
- Reset to default color
- Consistent colors across all views
- High contrast for accessibility

**Files:** `src/lib/stores/tagStore.ts` (TAG_COLORS, hashStringToColor)

### Tag Autocomplete ✅
- TagInput component with dropdown
- Filter suggestions as user types
- Show tag colors in suggestions
- Display usage count per tag
- Prioritize exact matches
- Sort by popularity
- Keyboard navigation (arrows, enter, escape, tab)
- Create new tags on the fly

**Files:** `src/lib/components/TagInput.svelte`

### TagManager Component ✅
- Centralized tag management UI
- List all tags with usage counts
- Search/filter tags
- Sort by name, usage, or color
- Inline rename with enter/escape
- Color picker integration
- Bulk operations (select multiple tags)
- Merge tags dialog with swap functionality
- Delete with confirmation
- Statistics dashboard

**Files:** `src/lib/components/TagManager.svelte`

### Visual Tag Integration ✅
- Colored tag chips in PassageList (show up to 3)
- Colored tag chips in PassageNode (show up to 3)
- Colored tag chips in PropertiesPanel (all tags)
- Remove tags via X button
- Overflow indicator (+N more)
- Consistent styling across all views

**Files:**
- `src/lib/components/PassageList.svelte`
- `src/lib/components/graph/PassageNode.svelte`
- `src/lib/components/PropertiesPanel.svelte`

---

## Phase 6: Enhanced View Modes & Navigation

**Status:** Planned
**Estimated:** 2 weeks

### View Synchronization
- Perfect sync between list, graph, and properties
- Selection updates all views
- Scroll to selected passage in list
- Center on selected node in graph
- Update properties panel instantly

### View Preferences
- Save view mode per project
- Remember panel visibility
- Persist panel sizes
- Save zoom/pan state
- Restore on project load

### Panel Controls
- Show/hide individual panels
- Maximize/minimize panels
- Resize panels with drag handles
- Snap to predefined sizes
- Full-screen mode per panel

### Layout Persistence
- Save custom node positions
- Remember layout algorithm choice
- Persist minimap state
- Save zoom level
- Restore view state on load

### Focus Mode
- Hide all UI except editor
- Distraction-free writing
- Quick toggle (F11 or button)
- Dim background
- Center content

### Zoom to Selection
- Quick navigation in graph
- Zoom and center on passage
- Smooth animation
- Fit selection in viewport

### Keyboard Navigation
- Arrow keys navigate passages
- Tab to cycle through sections
- Shortcuts for common actions
- Customizable key bindings

### Breadcrumb Trail
- Show current passage path
- Click to navigate history
- Visual connection path
- Story flow visualization

---

## Phase 7: Live Preview & Testing

**Status:** Planned
**Estimated:** 2-3 weeks

### In-Editor Player
- Play story without leaving editor
- Start from any passage
- Variable state display
- Choice selection UI
- Full whisker runtime integration

### Debug Mode
- Step through passages one at a time
- Pause on passage entry
- Inspect current state
- View execution log
- Breakpoint support

### Variable Inspector
- Live variable values during play
- Variable change highlighting
- Edit variables during testing
- Reset to initial values
- Variable history

### Playthrough Recording
- Record full test sessions
- Save playthrough data
- Replay recorded sessions
- Export playthrough logs
- Analyze player paths

### Quick Jump
- Jump to any passage during testing
- Set variables to test specific scenarios
- Skip to checkpoints
- Test different paths quickly

### State Reset
- Restart from beginning
- Reset to specific passage
- Restore saved state
- Clear variable values
- Fresh test run

### Error Highlighting
- Show runtime errors in context
- Highlight source passage
- Link to problematic choice
- Suggest fixes
- Error log panel

### Test Scenarios
- Save variable configurations
- Load test scenarios
- Quick scenario switching
- Scenario library
- Share test setups

---

## Phase 8: Validation & Quality Tools

**Status:** Planned
**Estimated:** 1-2 weeks

### Story Validator
- Comprehensive health checks
- Error and warning categorization
- Quick validation (< 2 seconds)
- Incremental validation
- Validation on save

### Error Panel
- Grouped error display
- Click to navigate to issue
- Severity indicators (error, warning, info)
- Error counts by type
- Auto-refresh on changes

### Dead Link Detection
- Find broken passage connections
- Highlight missing targets
- Suggest fixes (create passage, change target)
- Auto-fix option

### Orphan Detection
- Identify unreachable passages
- Show passages with no incoming connections
- Suggest adding connections
- Option to delete orphans

### Variable Analysis
- Detect undefined variables
- Find unused variables
- Track variable usage
- Suggest variable cleanup
- Rename refactoring

### Complexity Metrics
- Measure story branching factor
- Calculate path lengths
- Count total passages/choices
- Estimate playtime
- Complexity score

### Quality Score
- Overall story health (0-100)
- Weighted by issue severity
- Visual progress bar
- Improvement suggestions

### Auto-Fix Tools
- One-click fixes for common issues
- Batch fixes
- Undo auto-fixes
- Preview before applying
- Safe refactoring

---

## Phase 9: Export & Publishing

**Status:** Planned
**Estimated:** 1-2 weeks

### Whisker JSON Export
- Standard whisker format
- Compatible with whisker runtime
- Preserves all data
- Validates before export
- Version metadata

### Standalone HTML Export
- Self-contained playable file
- Includes whisker runtime
- No external dependencies
- Customizable theme
- Mobile-friendly

### Package Export
- ZIP file with story + assets
- Include images, audio, fonts
- Preserve folder structure
- README generation
- License file inclusion

### Export Presets
- Save export configurations
- Quick export with saved settings
- Preset library
- Share presets
- Default preset

### Import System
- Import from Twine (Twee format)
- Import from JSON
- Import from other formats
- Mapping configuration
- Conflict resolution

### Asset Bundling
- Include images in export
- Embed audio files
- Bundle fonts
- Optimize file sizes
- Asset compression

### Minification
- Minimize output file size
- Remove whitespace
- Compress JSON
- Optimize for production
- Source maps (optional)

### Version Control
- Export with version number
- Changelog generation
- Git integration
- Diff between versions
- Version history

---

## Phase 10: Polish, Performance & Documentation

**Status:** Planned
**Estimated:** 2 weeks

### Performance Optimization
- Handle 500+ passages smoothly
- 60fps interactions guaranteed
- Virtualization for large lists
- Lazy loading for graphs
- Memory optimization

### Lazy Loading
- Load large graphs progressively
- Viewport-based rendering
- Load on scroll
- Background loading
- Cache management

### Virtualization
- Virtual scrolling for passage list
- Only render visible items
- Smooth scrolling
- Dynamic heights
- Performance gains for 100+ passages

### Animations
- Smooth transitions
- Easing functions
- Reduced motion support
- Configurable animation speed
- Performance-aware (disable on slow devices)

### Accessibility
- ARIA labels throughout
- Keyboard navigation complete
- Screen reader support
- High contrast mode
- Focus indicators
- Skip links

### WCAG AA Compliance
- Color contrast ratios
- Text sizing
- Focus management
- Alternative text
- Semantic HTML

### Onboarding Tutorial
- Interactive first-run guide
- Step-by-step walkthrough
- Feature highlights
- Dismissible tooltips
- Progress tracking

### Help System
- In-app documentation
- Contextual help tooltips
- Search help content
- Video tutorials
- FAQ

### Keyboard Shortcuts Guide
- Reference panel
- Searchable shortcuts
- Customizable bindings
- Print-friendly guide

### Template Gallery
- Starter templates
- Example stories
- Genre templates (mystery, adventure, etc.)
- Import templates
- Community templates

### User Documentation
- Comprehensive user guide
- Video tutorials
- Best practices
- Tips and tricks
- Troubleshooting

---

## Feature Summary

**Completed Phases:** 1-5 (50%)
**Tests:** 137 passing (100% pass rate)
**Lines of Code:** ~3,500 (production) + ~1,300 (tests)

**Next Up:** Phase 6 (Enhanced View Modes & Navigation)
**MVP Target:** Phase 7 (Live Preview & Testing)
**Full Feature Complete:** Phase 10

See [ROADMAP.md](ROADMAP.md) for timeline and dependencies.
```

### whisker-implementation/editor-web/README.md (New)

**Purpose:** Overview of editor-web planning

**Content:**
```markdown
# whisker-editor-web Planning & Design

This directory contains all planning, design, and status documentation for the whisker-editor-web project.

## Documents

- **[ROADMAP.md](ROADMAP.md)** - Complete roadmap with phase details and timelines
- **[FEATURES.md](FEATURES.md)** - Feature catalog with implementation status
- **[PHASE_RECONCILIATION.md](PHASE_RECONCILIATION.md)** - Comparison with original specification

## Phases

Detailed implementation plans for each phase:

- [Phase 1: Core Data Models & State Management](phases/PHASE_1_SUMMARY.md) ✅
- [Phase 2: Basic UI Components](phases/PHASE_2_SUMMARY.md) ✅
- [Phase 3: Visual Node Graph](phases/PHASE_3_SUMMARY.md) ✅
- [Phase 4: Search and Filtering](phases/PHASE_4_SUMMARY.md) ✅
- [Phase 5: Visual Connection Editing & Advanced Tagging](phases/PHASE_5_IMPLEMENTATION_PLAN.md) ✅
- [Phase 6: Enhanced View Modes & Navigation](phases/PHASE_6_PLAN.md) 🔄
- [Phase 7: Live Preview & Testing](phases/PHASE_7_PLAN.md)
- [Phase 8: Validation & Quality Tools](phases/PHASE_8_PLAN.md)
- [Phase 9: Export & Publishing](phases/PHASE_9_PLAN.md)
- [Phase 10: Polish, Performance & Documentation](phases/PHASE_10_PLAN.md)

## Features

Feature-specific design documents:

- [Connection Editing](features/connection-editing.md)
- [Tag Management](features/tag-management.md)
- [Search & Filtering](features/search-filtering.md)

## Architecture Decisions

Key technical decisions and their rationale:

- [ADR-001: Svelte Flow for Graph Visualization](decisions/001-svelte-flow-for-graph.md)
- [ADR-002: Tailwind CSS 4](decisions/002-tailwind-css-4.md)
- [ADR-003: E2E Testing Over Component Tests](decisions/003-e2e-over-component-tests.md)

## Status

Current progress: **Phases 1-5 Complete (50%)**

See [../../STATUS.md](../../STATUS.md) for cross-project status.
```

### whisker-implementation/STATUS.md (New)

**Purpose:** Cross-project status tracking

**Complete Content:**

```markdown
# writewhisker Project Status

Last Updated: 2025-01-19

Cross-project status tracking for the writewhisker ecosystem.

## Quick Summary

| Project | Status | Phase | Tests | Version |
|---------|--------|-------|-------|---------|
| whisker-core | Stable | N/A | TBD | 0.1.0 |
| whisker-editor-web | Active Development | Phase 5 Complete | 137 passing | 0.1.0 |
| whisker-editor-desktop | Planning | N/A | N/A | N/A |

---

## whisker-core

**Status:** Stable
**License:** MIT
**Repository:** https://github.com/writewhisker/whisker-core

### Current State
- Core runtime implementation complete
- Lua-based story engine
- Passage navigation
- Variable system
- Choice handling

### Next Steps
- TBD based on editor requirements
- Performance optimization
- Additional runtime features

---

## whisker-editor-web

**Status:** Active Development (50% Complete)
**License:** AGPL-3.0
**Repository:** https://github.com/writewhisker/whisker-editor-web

### Completed Phases (1-5)

#### Phase 1: Core Data Models & State Management ✅
- Complete data models (Story, Passage, Choice, Variable)
- 50-level undo/redo system
- JSON serialization
- **Tests:** 40 passing

#### Phase 2: Basic UI Components ✅
- Project management (new, save, load)
- Passage list and editor
- Properties panel
- Variable manager
- Responsive design
- **Tests:** Covered by integration tests

#### Phase 3: Visual Node Graph ✅
- Interactive graph with Svelte Flow
- Multiple layouts (hierarchical, circular, grid)
- Visual indicators (start, orphan, dead-end)
- Drag & drop positioning
- Minimap, zoom, pan controls
- **Tests:** 20 graph layout tests

#### Phase 4: Search and Filtering ✅
- Full-text search across all content
- Tag filtering with multi-select
- Type filtering (start, orphan, dead-end, normal)
- Unified filtering across views
- **Tests:** 16 filter tests

#### Phase 5: Visual Connection Editing & Advanced Tagging ✅
- Drag-and-drop connection creation
- Connection editing and styling (conditional vs. unconditional)
- Connection validation and auto-cleanup
- Tag management with colors and autocomplete
- TagInput and TagManager components
- **Tests:** 61 tests (27 connection + 34 tag) + E2E infrastructure

**Total Tests:** 137 passing (100% pass rate)

### In Progress

#### Phase 6: Enhanced View Modes & Navigation 🔄
**Status:** Next up
**Estimated:** 2 weeks

**Planned Features:**
- View synchronization (list ↔ graph ↔ properties)
- View preferences persistence
- Panel controls (show/hide, resize)
- Focus mode
- Keyboard navigation
- Breadcrumb trail

### Upcoming Phases

#### Phase 7: Live Preview & Testing
**Status:** Planned
**Estimated:** 2-3 weeks
- In-editor player
- Debug mode
- Variable inspector
- Playthrough recording

#### Phase 8: Validation & Quality Tools
**Status:** Planned
**Estimated:** 1-2 weeks
- Story validator
- Error panel
- Dead link/orphan detection
- Complexity metrics

#### Phase 9: Export & Publishing
**Status:** Planned
**Estimated:** 1-2 weeks
- Whisker JSON export
- Standalone HTML export
- Import from Twine

#### Phase 10: Polish, Performance & Documentation
**Status:** Planned
**Estimated:** 2 weeks
- Performance optimization (500+ passages)
- Accessibility (WCAG AA)
- User documentation

### Timeline

**Completed:** Phases 1-5 (11-16 weeks estimated, on schedule)
**Remaining to MVP:** Phases 6-7 (4-7 weeks)
**Remaining to Full Feature Complete:** Phases 6-10 (8-11 weeks)

**MVP Target:** Phase 7 (Live Preview & Testing)
**Full Release:** Phase 10 (Polish & Documentation)

### Technical Metrics

- **Lines of Code:** ~3,500 (production) + ~1,300 (tests)
- **Test Coverage:** 137 tests, 100% passing
- **Test Breakdown:**
  - 40 model tests
  - 27 connection validation tests
  - 20 graph layout tests
  - 34 tag management tests
  - 16 filter/search tests
  - E2E test infrastructure (Playwright)
- **Technologies:** Svelte 5, TypeScript, Vite, Tailwind CSS 4, Svelte Flow
- **CI/CD:** GitHub Actions (tests, build, E2E)

### Recent Achievements

**2025-01-19:**
- ✅ Phase 5 complete (Visual Connection Editing & Advanced Tagging)
- ✅ Added E2E testing infrastructure (Playwright)
- ✅ Integrated E2E tests into CI workflow
- ✅ 137 total tests passing

**Previous Milestones:**
- ✅ Phase 4 complete (Search and Filtering)
- ✅ Phase 3 complete (Visual Node Graph)
- ✅ Phase 2 complete (Basic UI Components)
- ✅ Phase 1 complete (Core Data Models)

---

## whisker-editor-desktop

**Status:** Planning
**License:** AGPL-3.0
**Repository:** https://github.com/writewhisker/whisker-editor-desktop

### Current State
- Repository created
- Technology decisions in progress
- Likely based on Tauri for desktop integration

### Planned Features
- Native desktop app with file system access
- Shared codebase with whisker-editor-web
- Desktop-specific features (file watchers, native menus)
- Cross-platform (Windows, macOS, Linux)

### Timeline
- Planning phase
- Development start TBD

---

## Cross-Project Initiatives

### Documentation Reorganization
**Status:** In Progress

Moving all planning and design docs to whisker-implementation:
- [x] Proposal created
- [ ] whisker-implementation repo setup
- [ ] Migrate editor-web planning docs
- [ ] Migrate core planning docs (if applicable)
- [ ] Update all cross-links

### Architecture Decisions

**Global ADRs:**
- **ADR-001:** AGPLv3 for Editors, MIT for Core
  - Ensures community contributions while allowing commercial use of core
  - Network copyleft for SaaS deployments

- **ADR-002:** Svelte 5 Over React for Web Editor
  - Better performance with compiled approach
  - Smaller bundle sizes
  - Modern reactivity with runes

**Editor-Web Specific ADRs:**
- **ADR-001:** Svelte Flow for Graph Visualization
- **ADR-002:** Tailwind CSS 4 for Styling
- **ADR-003:** E2E Testing Over Component Tests (Svelte 5 compatibility)

---

## Resources

### Documentation
- **[whisker-implementation](https://github.com/writewhisker/whisker-implementation)** - Planning and design docs
- **[writewhisker organization](https://github.com/writewhisker)** - All repositories

### Planning Documents
- [Editor Web Roadmap](https://github.com/writewhisker/whisker-implementation/blob/main/editor-web/ROADMAP.md)
- [Editor Web Features](https://github.com/writewhisker/whisker-implementation/blob/main/editor-web/FEATURES.md)
- [Phase Reconciliation](https://github.com/writewhisker/whisker-implementation/blob/main/editor-web/PHASE_RECONCILIATION.md)

### Code Repositories
- [whisker-core](https://github.com/writewhisker/whisker-core)
- [whisker-editor-web](https://github.com/writewhisker/whisker-editor-web)
- [whisker-editor-desktop](https://github.com/writewhisker/whisker-editor-desktop)

---

## Contributing

Each project has its own contributing guide:
- **whisker-core:** [CONTRIBUTING.md](https://github.com/writewhisker/whisker-core/blob/main/CONTRIBUTING.md)
- **whisker-editor-web:** [CONTRIBUTING.md](https://github.com/writewhisker/whisker-editor-web/blob/main/CONTRIBUTING.md)

For planning and design discussions, use the [whisker-implementation discussions](https://github.com/writewhisker/whisker-implementation/discussions).

---

**Next Update:** After Phase 6 completion
```

### whisker-implementation/README.md (New)

**Purpose:** Overview of the implementation repository

**Content:**
```markdown
# whisker Implementation & Planning

This repository contains all design, planning, and status documentation for the writewhisker ecosystem.

## Purpose

This repository serves as the central hub for:
- 📋 Project planning and roadmaps
- 🎯 Feature specifications
- 📊 Status tracking across all repositories
- 🏗️ Architecture decisions
- 📝 Design documents
- 🗺️ Phase implementation plans

## Why Separate from Code Repositories?

**Code repositories** (whisker-core, whisker-editor-web) focus on:
- ✅ Technical implementation
- ✅ API documentation
- ✅ Getting started guides
- ✅ Tutorials and examples

**This repository** focuses on:
- ✅ Strategic planning
- ✅ Feature design
- ✅ Status tracking
- ✅ Decision rationale

This separation provides:
- **Clarity** - Clear distinction between "how it works" and "why we built it"
- **Maintainability** - Planning docs don't clutter code repos
- **Discoverability** - All planning in one place
- **History** - Design evolution separate from code history

## Projects

### [whisker-core](core/)
Core Lua library for whisker interactive fiction

- [Roadmap](core/ROADMAP.md)
- [Features](core/features/)
- [Decisions](core/decisions/)

### [whisker-editor-web](editor-web/)
Modern web-based visual story editor

- [Roadmap](editor-web/ROADMAP.md)
- [Features Catalog](editor-web/FEATURES.md)
- [Phase Plans](editor-web/phases/)
- [Phase Reconciliation](editor-web/PHASE_RECONCILIATION.md)

### [whisker-editor-desktop](editor-desktop/)
Desktop editor built with Tauri

- [Roadmap](editor-desktop/ROADMAP.md)
- [Features](editor-desktop/features/)

## Current Status

See [STATUS.md](STATUS.md) for the latest status across all projects.

**Latest Update:** 2025-01-19
- ✅ whisker-editor-web Phase 5 complete (Visual Connection Editing & Advanced Tagging)
- 🔄 whisker-editor-web Phase 6 next (Enhanced View Modes & Navigation)
- 137 passing tests with E2E infrastructure

## Architecture Decisions

Cross-project architecture decisions:

- [ADR-001: AGPLv3 for Editors, MIT for Core](decisions/001-use-agplv3-for-editors.md)
- [ADR-002: Svelte 5 Over React for Web Editor](decisions/002-svelte-over-react.md)

## Contributing

This repository is for planning and design documentation. For code contributions:

- **whisker-core:** [Contributing Guide](https://github.com/writewhisker/whisker-core/blob/main/CONTRIBUTING.md)
- **whisker-editor-web:** [Contributing Guide](https://github.com/writewhisker/whisker-editor-web/blob/main/CONTRIBUTING.md)

For planning discussions, use [GitHub Discussions](https://github.com/writewhisker/whisker-implementation/discussions).

## License

This documentation is licensed under [CC-BY-4.0](LICENSE).
```

---

## Implementation Steps

### Step 1: Prepare whisker-implementation

1. Create directory structure
2. Create README.md and STATUS.md
3. Set up ADR template
4. Create LICENSE (CC-BY-4.0 for documentation)

### Step 2: Migrate whisker-editor-web Documentation

1. **Move files:**
   ```bash
   # In whisker-implementation
   mkdir -p editor-web/phases
   mkdir -p editor-web/features
   mkdir -p editor-web/decisions

   # Copy from whisker-editor-web
   cp ../whisker-editor-web/PHASE_RECONCILIATION.md editor-web/
   cp ../whisker-editor-web/PHASE_5_IMPLEMENTATION_PLAN.md editor-web/phases/
   ```

2. **Extract from README:**
   - Extract roadmap section → `editor-web/ROADMAP.md`
   - Extract feature details → `editor-web/FEATURES.md`

3. **Create new docs in whisker-editor-web:**
   - `ARCHITECTURE.md`
   - `TESTING.md`
   - Updated `README.md` (simplified)

4. **Update links:**
   - Update all cross-references
   - Add links from editor-web README to implementation repo

### Step 3: Migrate whisker-core Documentation (if applicable)

1. Audit current whisker-core docs
2. Identify planning vs. technical docs
3. Move planning docs to `whisker-implementation/core/`
4. Simplify whisker-core README
5. Update links

### Step 4: Create Cross-Repo Links

1. Add "Planning & Design" section to each repo's README
2. Link to whisker-implementation
3. Add badges/links back to code repos from implementation

### Step 5: Archive Old Files

1. In whisker-editor-web:
   ```bash
   git rm PHASE_RECONCILIATION.md
   git rm PHASE_5_IMPLEMENTATION_PLAN.md
   ```

2. Add deprecation notice in commit message
3. Include migration links in commit

---

## Benefits

### For Users

- **Clearer focus:** Each repo's README tells you what you need to know
- **Easier onboarding:** Getting started guides not buried in planning docs
- **Better navigation:** Planning and code are separate concerns

### For Contributors

- **Clear contribution paths:** Know where to contribute what
- **Design visibility:** All design decisions in one place
- **Historical context:** Understand why features were built

### For Maintainers

- **Reduced clutter:** Code repos stay focused
- **Better planning:** Central planning hub
- **Easier tracking:** Cross-project status at a glance

---

## Risks & Mitigation

### Risk: Broken Links

**Mitigation:**
- Use relative links where possible
- Document migration in CHANGELOG
- Add redirects if hosting docs

### Risk: Confusion About Where to Put New Docs

**Mitigation:**
- Clear guidelines in this proposal
- Update CONTRIBUTING.md with documentation policy
- Create templates for both types of docs

### Risk: Lost History

**Mitigation:**
- Keep git history intact (use `git mv` where possible)
- Add migration notes in commits
- Link to old file locations in new files

---

## Timeline

- **Day 1-2:** Set up whisker-implementation structure
- **Day 3:** Migrate whisker-editor-web planning docs
- **Day 4:** Update whisker-editor-web technical docs
- **Day 5:** Audit and migrate whisker-core docs
- **Day 6:** Update all cross-links
- **Day 7:** Final review and documentation

**Total:** ~1 week for complete migration

---

## Questions for Discussion

1. Should CHANGELOG stay in code repos or move to implementation?
   - **Recommendation:** Stay in code repos (version history is technical)

2. Should test documentation (e2e/README.md) stay in code repos?
   - **Recommendation:** Yes (it's technical "how to run tests")

3. Should we version the planning docs?
   - **Recommendation:** Yes, git provides versioning

4. Should we create a docs website?
   - **Recommendation:** Future consideration, start with markdown

---

## Approval Checklist

- [ ] Review proposed structure
- [ ] Validate file migrations
- [ ] Approve new README templates
- [ ] Confirm ADR template
- [ ] Approve timeline
- [ ] Begin implementation

---

**Next Steps:** Upon approval, create initial PRs for:
1. whisker-implementation repo setup
2. whisker-editor-web documentation migration
3. whisker-core documentation audit
