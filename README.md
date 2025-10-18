# Whisker Visual Editor - Phase 1

Modern visual story editor built with Svelte + TypeScript + Vite.

## Phase 1: Foundation & Infrastructure ✅

### Completed Features

#### 1.1 Project Setup ✅
- [x] Vite build system with hot reload
- [x] TypeScript configured
- [x] Tailwind CSS for styling
- [x] Svelte for UI components
- [x] Svelte stores for state management

#### 1.2 Core Data Models ✅
- [x] `Story` class with metadata
- [x] `Passage` class with position data
- [x] `Choice` class with connections
- [x] `Variable` management system
- [x] Serialization/deserialization methods
- [x] JSON schema validation

#### 1.3 Basic UI Shell ✅
- [x] Main application layout
- [x] Menu bar (File, Edit, View, Test)
- [x] Toolbar with basic actions
- [x] Status bar for project info
- [x] Modal system for dialogs
- [x] Keyboard shortcut system

#### 1.4 File Operations ✅
- [x] "New Project" functionality
- [x] "Open Project" (file picker)
- [x] "Save Project" (auto-save + manual)
- [x] Project validation on load
- [x] File format version handling
- [x] File System Access API support (with fallback)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## File Structure

```
editor/visual/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── MenuBar.svelte       # Application menu
│   │   │   ├── Toolbar.svelte       # Action toolbar
│   │   │   ├── StatusBar.svelte     # Bottom status bar
│   │   │   └── FileDialog.svelte    # Modal dialog
│   │   ├── models/
│   │   │   ├── Story.ts             # Story model
│   │   │   ├── Passage.ts           # Passage model
│   │   │   ├── Choice.ts            # Choice model
│   │   │   ├── Variable.ts          # Variable model
│   │   │   └── types.ts             # TypeScript interfaces
│   │   ├── stores/
│   │   │   └── projectStore.ts      # Svelte store for state
│   │   └── utils/
│   │       └── fileOperations.ts    # File I/O utilities
│   ├── App.svelte                   # Main application
│   ├── app.css                      # Global styles
│   └── main.ts                      # Entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Success Criteria ✅

- ✅ Can create, save, and load a story project
- ✅ No data loss on save/load cycle
- ✅ Clean, responsive UI shell
- ✅ < 2 second load time

## Keyboard Shortcuts

- `Ctrl/Cmd + N` - New Project
- `Ctrl/Cmd + O` - Open Project
- `Ctrl/Cmd + S` - Save Project
- `Ctrl/Cmd + Shift + S` - Save As

## Technologies

- **Svelte 5** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **Svelte Stores** - State management
- **File System Access API** - Modern file handling (with fallback)
- **nanoid** - Unique ID generation

## Next Phase

**Phase 2: List View & Basic Editing** (2-3 weeks)
- Story tree navigator
- Properties panel
- Passage CRUD operations
- Variable manager
- Undo/redo system

## Notes

This is the Phase 1 implementation following the visual editor roadmap from `design_notes/VISUAL_EDITOR_PHASES.md`.

The editor uses modern web APIs (File System Access API) with graceful fallbacks for older browsers.
