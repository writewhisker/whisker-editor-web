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

### Coming Soon (Phases 5-10)
- 🏷️ Advanced tagging system
- 🎯 Variable and condition management UI
- 🎨 Theming and customization
- 📤 Export to Whisker format
- 🧪 Story testing and validation
- 🌐 Multi-language support
- 📊 Story statistics and analytics

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

We're actively working on Phases 4-10. See the [project board](https://github.com/writewhisker/whisker-editor-web/projects) for current priorities.

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
- [ ] **Phase 5**: Advanced tagging
- [ ] **Phase 6**: Variable management UI
- [ ] **Phase 7**: Story testing
- [ ] **Phase 8**: Export functionality
- [ ] **Phase 9**: Theming
- [ ] **Phase 10**: Polish and optimization

---

**Start creating visual interactive stories today!** 🚀

Open the editor, create a new project, and watch your story come to life in the node graph.
