# whisker-editor-web 🎨

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Svelte](https://img.shields.io/badge/svelte-5-ff3e00.svg)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-621%20passing-brightgreen.svg)](https://github.com/writewhisker/whisker-editor-web/actions)

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
- **Performance Optimized** - Handles 1000+ passage stories with virtual scrolling and metadata caching
- **Fully Accessible** - WCAG 2.1 Level AA compliant with 23 keyboard shortcuts and screen reader support
- **Comprehensive Testing** - 621 passing tests ensuring reliability (unit + E2E)

**Key Capabilities:**

✅ **Story Management** - Create, save, load, and manage complete interactive fiction projects
✅ **Passage Editing** - Edit text, choices, conditions, and metadata for each story passage
✅ **Choice System** - Create branching narratives with conditional and unconditional choices
✅ **Variable System** - Track and manage story state with variables
✅ **History/Undo** - 50-level undo/redo for all edits
✅ **Visual Graph** - Interactive node-based view with drag-and-drop, zoom, pan, and minimap
✅ **Connection Validation** - Detect orphaned connections, dead-end passages, and unreachable content
✅ **Tag Organization** - Color-coded tags with autocomplete and global management
✅ **Story Validation** - Real-time error checking with auto-fix suggestions and quality analysis
✅ **Story Player** - Test your story with live preview, breakpoints, and variable inspection
✅ **Export & Publishing** - Export to JSON, HTML (standalone player), or Markdown formats
✅ **Performance** - Virtual scrolling, metadata caching, and optimizations for large stories (1000+ passages)
✅ **Accessibility** - WCAG 2.1 AA compliant with keyboard shortcuts, screen reader support, and motion preferences
✅ **Documentation** - Comprehensive user guides, tutorials, and keyboard shortcuts reference

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

- **[Getting Started Guide](docs/GETTING_STARTED.md)** - 10-minute tutorial to create your first interactive story
- **[User Guide](docs/USER_GUIDE.md)** - Complete feature documentation (15 sections, 11,000 words)
- **[Keyboard Shortcuts](docs/KEYBOARD_SHORTCUTS.md)** - Quick reference for all 23 keyboard shortcuts

### For Developers

- **[Ecosystem Architecture](ECOSYSTEM_ARCHITECTURE.md)** - How whisker-core and whisker-editor-web work together
- **[Architecture Overview](ARCHITECTURE.md)** - Technical architecture and patterns
- **[Testing Guide](TESTING.md)** - How to run and write tests
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[E2E Testing](e2e/README.md)** - End-to-end testing documentation

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

**Current Coverage:** 621 tests passing (100%)
- 40 model tests (Story, Passage, Choice, Variable, History)
- 44 story player tests (playback, breakpoints, history)
- 57 player store tests (state management, error handling)
- 80 export/import tests (JSON, HTML, Markdown formats)
- 42 validation tests (dead links, unreachable passages, variables)
- 34 tag management tests
- 27 connection validation tests
- 20 graph layout tests
- 16 filter and search tests
- And more (full coverage of all features)

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

- **Issues:** [GitHub Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- **Discussions:** [GitHub Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)

## 🙏 Acknowledgments

- Built with [Svelte 5](https://svelte.dev/) and [Vite](https://vitejs.dev/)
- Graph visualization powered by [Svelte Flow](https://svelteflow.dev/)
- Inspired by [Twine](https://twinery.org/)
- Part of the [writewhisker](https://github.com/writewhisker) ecosystem

---

**Start creating visual interactive stories today!** 🚀
