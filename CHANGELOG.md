# Changelog

All notable changes to whisker-editor-web will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Project Status

whisker-editor-web is currently in **Phase 3** of a 10-phase development plan.

**Completed Phases:**
- ✅ Phase 1: Core data models & state management
- ✅ Phase 2: Basic UI components
- ✅ Phase 3: Visual node graph (Svelte Flow)

**Next:** Phase 4 - Search and filtering

See the private implementation repository for detailed phase planning.

---

## [0.1.0] - TBD

Initial release of whisker-editor-web as a separate repository.

### Added - Phase 1 (Core Data Models)
- `Passage` model with metadata, content, and choice extraction
- `Story` model with passage management
- `Choice` model for passage-to-passage links
- `Tag` model for passage organization
- `Variable` model for story state tracking
- Centralized state management using Svelte stores
- Project store with story, passage, and selection management
- Utility functions for ID generation and validation
- Comprehensive test suite (20 tests for models)

### Added - Phase 2 (Basic UI Components)
- `PassageList` component for browsing passages
- `PassageEditor` component for editing passage content
- Story metadata editor
- Responsive layout with Tailwind CSS 4
- Dark mode support
- Keyboard shortcuts for common actions
- Import/Export functionality (JSON format)
- Browser localStorage persistence
- Component tests (20 tests)

### Added - Phase 3 (Visual Node Graph)
- `GraphView` component with Svelte Flow integration
- `PassageNode` custom node component with visual indicators
- Three graph layout algorithms:
  - Hierarchical (Top-to-Bottom, Left-to-Right, etc.)
  - Circular layout
  - Grid/force-directed layout
- Graph interactivity:
  - Zoom and pan
  - Minimap navigation
  - Node dragging with position persistence
  - Node selection synchronized with passage list
- Visual indicators for:
  - Start passage (green)
  - Orphan passages (orange)
  - Dead-end passages (red)
- View modes: List, Graph, Split (side-by-side)
- Graph layout tests (20 tests)

### Infrastructure
- Vite 7 build system
- TypeScript 5.9 with strict type checking
- Svelte 5 with Runes API
- Vitest for unit testing (60 tests total)
- GitHub Actions CI/CD:
  - Multi-Node-version testing (18, 20, 22)
  - Type checking, linting, build verification
  - Automatic GitHub Pages deployment
- Tailwind CSS 4 for styling
- @xyflow/svelte for graph visualization
- dagre for graph layout algorithms

### License
- Licensed under AGPLv3 (network copyleft)
- Section 13 compliance for network services
- Clear separation from MIT-licensed whisker-core

---

## Upcoming Phases

### [0.2.0] - Phase 4: Search & Filtering
- Passage search by name and content
- Filter by tags
- Filter by orphans/dead ends
- Quick navigation

### [0.3.0] - Phase 5: Advanced Tagging
- Tag management UI
- Batch tag operations
- Tag-based organization
- Tag colors and icons

### [0.4.0] - Phase 6: Variable Management
- Variable tracking across passages
- Variable usage visualization
- Variable type inference
- Undefined variable warnings

### [0.5.0] - Phase 7: Story Testing
- Live preview/playtest mode
- Test path tracking
- Coverage visualization
- Debug mode

### [0.6.0] - Phase 8: Export
- Multiple export formats
- whisker-core compatible output
- Compact format support
- Export validation

### [0.7.0] - Phase 9: Theming
- Custom themes
- Editor customization
- Graph appearance options
- Accessibility improvements

### [1.0.0] - Phase 10: Polish
- Performance optimization
- Full documentation
- Tutorial mode
- Production-ready release

---

## Release Notes

### Version Numbering

whisker-editor-web follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes or major phases
- **MINOR** version for backwards-compatible new features (phases)
- **PATCH** version for backwards-compatible bug fixes

### Breaking Changes Policy

- Breaking changes will be announced in advance
- Migration guides will be provided
- LocalStorage data will be migrated automatically when possible
- Export format breaking changes will support both old and new formats

### Browser Support

- Chrome/Edge (Chromium) - latest 2 versions
- Firefox - latest 2 versions
- Safari - latest 2 versions

---

## Template for Future Releases

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Features that will be removed in upcoming releases

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security vulnerability fixes (see SECURITY.md)

### Performance
- Performance improvements

### UI/UX
- User interface improvements
```

---

[Unreleased]: https://github.com/writewhisker/whisker-editor-web/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/writewhisker/whisker-editor-web/releases/tag/v0.1.0
