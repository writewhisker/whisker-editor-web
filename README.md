# whisker-editor-web 🎨

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Svelte](https://img.shields.io/badge/svelte-5-ff3e00.svg)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)](https://www.typescriptlang.org/)

**Modern visual story editor for whisker.** Create interactive fiction with an intuitive web-based interface featuring visual node graphs, real-time editing, and powerful story management tools.

> **Part of the writewhisker ecosystem**
> - Core library: [whisker-core](https://github.com/writewhisker/whisker-core) (MIT License)
> - Web editor: whisker-editor-web (this repository - AGPLv3)
> - Desktop editor: [whisker-editor-desktop](https://github.com/writewhisker/whisker-editor-desktop) (AGPLv3)

## ✨ Features

### Phase 1: Core Data Models & State Management ✅
- **Story Model** - Complete story structure with metadata, passages, variables
- **Passage Model** - Individual story nodes with content, choices, and conditions
- **Variable System** - Track and manage story state variables
- **History/Undo** - 50-level undo/redo system for all edits
- **Serialization** - Save/load stories as JSON

### Phase 2: Basic UI Components ✅
- **Project Management** - New project, save, load, close operations
- **Passage List** - View and manage all story passages
- **Passage Editor** - Edit passage content, title, tags, and position
- **Choice Editor** - Create and modify story choices with conditions
- **Properties Panel** - Configure passage properties and metadata
- **Responsive Design** - Works on desktop and tablet

### Phase 3: Visual Node Graph ✅
- **Interactive Graph** - Visual representation of story structure using Svelte Flow
- **Multiple Layouts** - Hierarchical (top-down/left-right), circular, and grid layouts
- **Visual Indicators** - Color-coded nodes show start passage, orphans, dead ends
- **Drag & Drop** - Reposition nodes and save custom layouts
- **Minimap** - Navigate large stories with ease
- **Zoom/Pan Controls** - Smooth navigation through story graphs
- **View Modes** - Switch between list view, graph view, and split view

### Phase 4: Search and Filtering ✅
- **Advanced Search** - Search across passage titles, content, tags, and choice text
- **Tag Filtering** - Filter passages by tags with multi-select support
- **Type Filtering** - Filter by passage type (start, orphan, dead-end, normal)
- **Unified Filtering** - Consistent search/filter experience across list and graph views
- **Visual Feedback** - Active filter chips, result counts, and clear filter options
- **Smart Integration** - Filters apply to both passage list and graph view simultaneously

### Phase 5: Visual Connection Editing & Advanced Tagging
- **Visual Connection Creation** - Drag from node ports to create connections visually
- **Connection Editing** - Edit choice text, conditions, and targets directly on connections
- **Connection Styling** - Differentiate conditional vs. unconditional connections
- **Connection Validation** - Detect and warn about invalid or orphaned connections
- **Tag Management** - Centralized tag library with rename, merge, and delete operations
- **Tag Colors** - Assign colors to tags for visual organization
- **Tag Autocomplete** - Quick tag selection from existing tags
- **Inline Tag Input** - Improved tag editing UX without prompts

### Phase 6: Enhanced View Modes & Navigation
- **View Synchronization** - Perfect sync between list, graph, and properties
- **View Preferences** - Save and restore view mode settings per project
- **Panel Controls** - Show/hide, maximize/minimize individual panels
- **Layout Persistence** - Remember panel sizes and positions
- **Focus Mode** - Distraction-free writing with minimal UI
- **Zoom to Selection** - Quick navigation to selected passages
- **Keyboard Navigation** - Arrow keys to navigate between passages
- **Breadcrumb Trail** - Visual path showing current location in story

### Phase 7: Live Preview & Testing
- **In-Editor Player** - Test stories without leaving the editor
- **Debug Mode** - Step through passages, inspect variables, view execution log
- **Variable Inspector** - Live view of variable values during testing
- **Playthrough Recording** - Record and replay test sessions
- **Quick Jump** - Jump to any passage during testing
- **State Reset** - Restart testing from any point
- **Error Highlighting** - Show runtime errors with passage context
- **Test Scenarios** - Save and load test variable configurations

### Phase 8: Validation & Quality Tools
- **Story Validator** - Comprehensive checks for common issues
- **Error Panel** - Grouped display of warnings and errors with click-to-fix
- **Dead Link Detection** - Find broken passage connections
- **Orphan Detection** - Identify unreachable passages
- **Variable Analysis** - Detect undefined or unused variables
- **Complexity Metrics** - Measure story branching and path lengths
- **Quality Score** - Overall story health indicator
- **Auto-Fix Tools** - Automated fixes for common problems

### Phase 9: Export & Publishing
- **Whisker JSON Export** - Standard format for Whisker runtime
- **Standalone HTML** - Self-contained playable HTML file
- **Package Export** - ZIP with story and all assets
- **Export Presets** - Quick export with saved configurations
- **Import System** - Import from Twine, JSON, and other formats
- **Asset Bundling** - Include images, audio, and other media
- **Minification** - Optimized output for production
- **Version Control** - Export with version metadata

### Phase 10: Polish, Performance & Documentation
- **Performance Optimization** - Handle 500+ passage stories smoothly
- **Lazy Loading** - Load large graphs progressively
- **Virtualization** - Optimize rendering for large lists
- **Animations** - Smooth transitions and visual feedback
- **Accessibility** - ARIA labels, keyboard navigation, screen reader support
- **Onboarding Tutorial** - Interactive guide for new users
- **Help System** - In-app documentation and tooltips
- **Keyboard Shortcuts Guide** - Reference for all shortcuts
- **Template Gallery** - Starter templates for common story types
- **User Documentation** - Comprehensive guide and video tutorials

## 🛠️ Technology Stack

- **[Svelte 5](https://svelte.dev/)** - Reactive UI framework with runes
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS
- **[Svelte Flow](https://svelteflow.dev/)** - Interactive node graphs (@xyflow/svelte)
- **[dagre](https://github.com/dagrejs/dagre)** - Hierarchical graph layout
- **[Vitest](https://vitest.dev/)** - Unit testing framework
- **[Testing Library](https://testing-library.com/)** - Component testing

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

## 📁 Project Structure

```
whisker-editor-web/
├── src/
│   ├── lib/
│   │   ├── components/      # Svelte components
│   │   │   ├── graph/       # Graph visualization components
│   │   │   ├── PassageList.svelte
│   │   │   ├── PassageEditor.svelte
│   │   │   ├── PropertiesPanel.svelte
│   │   │   └── GraphView.svelte
│   │   ├── models/          # Data models
│   │   │   ├── Story.ts
│   │   │   ├── Passage.ts
│   │   │   ├── Choice.ts
│   │   │   ├── Variable.ts
│   │   │   └── types.ts
│   │   ├── stores/          # Svelte stores for state
│   │   │   ├── projectStore.ts
│   │   │   └── historyStore.ts
│   │   └── utils/           # Utility functions
│   │       └── graphLayout.ts
│   ├── test/                # Test setup
│   │   └── setup.ts
│   ├── App.svelte           # Main application component
│   └── main.ts              # Application entry point
├── public/                  # Static assets
├── tests/                   # Test files
├── package.json             # Project dependencies
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Vitest configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── LICENSE                  # AGPLv3 License
└── README.md                # This file
```

## 🧪 Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

Current test coverage: **76 tests, 100% passing**
- 40 model tests (Story, Passage, Choice, Variable, History)
- 20 graph layout tests (hierarchical, circular, grid)
- 16 filter and search tests (filterStore, tag filtering, passage type filtering)

## 🎨 Development

### Type Checking

```bash
# Check types
npm run check
```

### Code Style

This project uses:
- TypeScript for type safety
- Svelte 5 with runes for reactivity
- Tailwind CSS for styling
- ESLint and Prettier (configured in package.json)

### Git Workflow

```bash
# Feature development
git checkout -b feature/your-feature
git commit -am "feat: add your feature"
git push origin feature/your-feature
```

## 📝 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

### Why AGPLv3?

We chose AGPLv3 to ensure that improvements to the visual editor are shared back with the community, especially for hosted/SaaS deployments. This license requires that if you modify the editor and offer it as a web service, you must make your modified source code available.

**Key points:**
- ✅ Free to use, modify, and distribute
- ✅ Can be used in commercial projects
- ⚠️ Modifications must be released under AGPLv3
- ⚠️ Network use requires source disclosure (Section 13)

### Using with whisker-core

The core whisker library ([whisker-core](https://github.com/writewhisker/whisker-core)) is MIT licensed, allowing broad commercial use. This editor integrates with whisker-core but is separately licensed under AGPLv3.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Add tests** for new functionality
5. **Ensure tests pass** (`npm run test:run`)
6. **Commit your changes** with descriptive messages
7. **Push to your fork** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Development Priorities

We're actively working on **Phase 5: Visual Connection Editing & Advanced Tagging**. See the [roadmap](#-roadmap) for the complete phase plan and the [project board](https://github.com/writewhisker/whisker-editor-web/projects) for current tasks.

**Note:** The phase plan has been reconciled with the [official implementation guide](../whisker-implementation/visual-editor/VISUAL_EDITOR_PHASES.md) to ensure a comprehensive, well-structured development path.

## 🔗 Related Projects

- **[whisker-core](https://github.com/writewhisker/whisker-core)** - Core Lua library (MIT)
- **[whisker-editor-desktop](https://github.com/writewhisker/whisker-editor-desktop)** - Desktop editor with Tauri (AGPLv3)
- **[writewhisker](https://github.com/writewhisker)** - Organization home

## 📞 Support

- **Documentation:** [Wiki](https://github.com/writewhisker/whisker-editor-web/wiki)
- **Issues:** [GitHub Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- **Discussions:** [GitHub Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)

## 🙏 Acknowledgments

- Built with [Svelte 5](https://svelte.dev/) and [Vite](https://vitejs.dev/)
- Graph visualization powered by [Svelte Flow](https://svelteflow.dev/)
- Inspired by [Twine](https://twinery.org/)
- Part of the [writewhisker](https://github.com/writewhisker) ecosystem

## 🗺️ Roadmap

- [x] **Phase 1**: Core data models and state management
- [x] **Phase 2**: Basic UI components
- [x] **Phase 3**: Visual node graph
- [x] **Phase 4**: Search and filtering
- [ ] **Phase 5**: Visual connection editing & advanced tagging
- [ ] **Phase 6**: Enhanced view modes & navigation
- [ ] **Phase 7**: Live preview & testing
- [ ] **Phase 8**: Validation & quality tools
- [ ] **Phase 9**: Export & publishing
- [ ] **Phase 10**: Polish, performance & documentation

### Phase Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (Basic UI) ──→ Phase 5 (Connections & Tags)
    ↓                       ↓
Phase 3 (Graph) ────────→ Phase 6 (View Modes)
    ↓                       ↓
Phase 4 (Search) ────────→ Phase 7 (Preview & Testing)
                            ↓
                         Phase 8 (Validation)
                            ↓
                         Phase 9 (Export)
                            ↓
                         Phase 10 (Polish)
```

**Minimum Viable Product (MVP):** Phases 1-7
**Full Feature Complete:** Phases 1-10

### About This Phase Plan

This roadmap reconciles the original [VISUAL_EDITOR_PHASES.md](../whisker-implementation/visual-editor/VISUAL_EDITOR_PHASES.md) specification with the actual development progress. Key changes:

**What We Kept from the Original:**
- All core features from the official phases
- Focus on visual editing and node-based workflow
- Emphasis on quality tools and validation
- Comprehensive testing and preview capabilities

**What We Adapted:**
- **Phase 4 Addition**: Added "Search and Filtering" as a valuable enhancement not in the original plan
- **Phase 5 Combination**: Combined "Visual Connection Editing" (official Phase 4) with "Advanced Tagging" for better feature grouping
- **Phase Reordering**: Moved some features to better align with natural development flow
- **Web-First Focus**: Optimized for web-based implementation using Svelte 5 instead of React

**Why These Changes:**
- **Natural Progression**: Each phase builds logically on previous work
- **User Value**: Delivers usable features early (MVP at Phase 7)
- **Technical Dependencies**: Respects implementation dependencies
- **Modern Stack**: Leverages Svelte 5's reactive features for better performance

**Impact:**
- Phases 1-4 complete with excellent test coverage (76 tests, 100% passing)
- Clear path to MVP (Phases 5-7)
- Full feature parity with original vision by Phase 10
- Enhanced with additional features (search/filtering) for better UX

---

**Start creating visual interactive stories today!** 🚀

Open the editor, create a new project, and watch your story come to life in the node graph.
