# Contributing to whisker-editor-web

Thank you for your interest in contributing to whisker-editor-web! This document provides guidelines and instructions for contributing to the visual story editor.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [UI/UX Guidelines](#uiux-guidelines)
- [Submitting Changes](#submitting-changes)
- [License (AGPLv3)](#license-agplv3)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- **Node.js 18+** (20+ recommended)
- **npm** or **pnpm**
- **Git**
- Modern browser (Chrome, Firefox, or Safari)
- Basic familiarity with:
  - **TypeScript**
  - **Svelte 5** (Runes API)
  - **Vite**
  - **Interactive fiction concepts**

### Installing Dependencies

```bash
# Clone the repository
git clone https://github.com/writewhisker/whisker-editor-web.git
cd whisker-editor-web

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running the Editor

```bash
# Development server with hot reload
npm run dev
# Opens at http://localhost:5173

# Type checking
npm run check

# Run tests
npm run test:run

# Build for production
npm run build
```

## Development Setup

### Project Structure

```
whisker-editor-web/
├── src/
│   ├── lib/
│   │   ├── components/          # Svelte components
│   │   │   ├── graph/           # Graph view components
│   │   │   ├── PassageEditor.svelte
│   │   │   ├── PassageList.svelte
│   │   │   └── ...
│   │   ├── models/              # Data models
│   │   │   ├── Passage.ts
│   │   │   ├── Story.ts
│   │   │   ├── Choice.ts
│   │   │   └── ...
│   │   ├── stores/              # State management
│   │   │   └── projectStore.ts
│   │   └── utils/               # Utility functions
│   │       ├── graphLayout.ts
│   │       └── ...
│   ├── App.svelte               # Main application
│   ├── main.ts                  # Entry point
│   └── test/                    # Test setup
├── public/                       # Static assets
├── index.html                    # HTML entry point
└── vite.config.ts                # Vite configuration
```

### Development Phases

whisker-editor-web is being developed in 10 phases. Check which phase your contribution relates to:

**Completed:**
- ✅ **Phase 1**: Core data models & state management
- ✅ **Phase 2**: Basic UI components
- ✅ **Phase 3**: Visual node graph (Svelte Flow)

**In Progress:**
- 📋 **Phase 4**: Search and filtering

**Planned:**
- Phases 5-10: See `design_notes/VISUAL_EDITOR_PHASES.md` in the private implementation repo

### Branch Naming

Use descriptive branch names:

- `feature/phase4-search-bar` - New features
- `fix/graph-node-positioning` - Bug fixes
- `docs/improve-readme` - Documentation updates
- `refactor/simplify-store-logic` - Code refactoring
- `ui/improve-passage-editor` - UI/UX improvements
- `perf/optimize-graph-rendering` - Performance improvements

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Use the bug report template** when creating a new issue
3. **Include browser console errors** (F12 → Console)
4. **Provide steps to reproduce** the issue
5. **Export and attach your story** if relevant
6. **Include screenshots** for UI issues

### Suggesting Features

1. **Check existing issues and discussions** for similar requests
2. **Use the feature request template** when creating a new issue
3. **Consider which phase** the feature belongs to
4. **Provide UI/UX mockups** if possible
5. **Explain the user benefit** and workflow

### Contributing Code

1. **Fork the repository** and create a new branch
2. **Make your changes** following our coding standards
3. **Add tests** for new functionality
4. **Update documentation** as needed
5. **Run tests, type checking, and build** before committing
6. **Test in multiple browsers** for UI changes
7. **Submit a pull request** using our PR template

## Coding Standards

### TypeScript Style Guide

#### Indentation and Formatting

- Use **2 spaces** for indentation (no tabs)
- Maximum line length: **100 characters**
- Use semicolons
- Use single quotes for strings (unless template literals)

#### Naming Conventions

```typescript
// Interfaces and Types: PascalCase
interface Passage {
  id: string;
  name: string;
}

type StoryMetadata = {
  title: string;
  author: string;
};

// Classes: PascalCase
class PassageManager {
  // ...
}

// Functions and variables: camelCase
function createPassage(name: string): Passage {
  const passageId = generateId();
  return { id: passageId, name };
}

// Constants: UPPER_SNAKE_CASE
const DEFAULT_PASSAGE_NAME = 'Untitled Passage';
const MAX_PASSAGE_NAME_LENGTH = 100;

// React-style component props: PascalCase
interface PassageEditorProps {
  passage: Passage;
  onSave: (passage: Passage) => void;
}
```

#### Type Safety

```typescript
// ✅ GOOD: Explicit types
function parsePassage(text: string): Passage | null {
  // ...
}

// ❌ BAD: Implicit any
function parsePassage(text) {
  // ...
}

// ✅ GOOD: Type guards
function isPassage(obj: unknown): obj is Passage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  );
}

// ✅ GOOD: Discriminated unions
type LayoutAlgorithm =
  | { type: 'hierarchical'; direction: 'TB' | 'LR' }
  | { type: 'circular'; radius: number }
  | { type: 'grid'; columns: number };
```

### Svelte 5 Guidelines

#### Use Runes API

```svelte
<script lang="ts">
// ✅ GOOD: Use runes ($state, $derived, $effect)
let count = $state(0);
let doubled = $derived(count * 2);

$effect(() => {
  console.log('Count changed:', count);
});

// ❌ BAD: Old reactive syntax (no longer supported in Svelte 5)
let count = 0;
$: doubled = count * 2;
</script>
```

#### Component Structure

```svelte
<script lang="ts">
  import type { Passage } from '../models/Passage';

  // Props using $props()
  let { passage, onSave }: {
    passage: Passage;
    onSave: (passage: Passage) => void;
  } = $props();

  // State
  let isEditing = $state(false);

  // Derived state
  let hasUnsavedChanges = $derived(/* ... */);

  // Functions
  function handleSave() {
    onSave(passage);
  }
</script>

<div class="passage-editor">
  <!-- Template -->
</div>

<style>
  /* Scoped styles */
</style>
```

### CSS and Styling

We use **Tailwind CSS 4** for styling:

```svelte
<!-- ✅ GOOD: Use Tailwind utility classes -->
<button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Click me
</button>

<!-- ✅ GOOD: Use component classes for reusable styles -->
<button class="btn btn-primary">
  Click me
</button>

<!-- ❌ BAD: Inline styles (avoid unless dynamic) -->
<button style="background: blue; padding: 8px 16px;">
  Click me
</button>
```

#### Accessibility

Always consider accessibility:

```svelte
<!-- ✅ GOOD: Semantic HTML + ARIA -->
<button
  aria-label="Delete passage"
  onclick={handleDelete}
>
  <TrashIcon />
</button>

<!-- ✅ GOOD: Keyboard navigation -->
<div
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
  onclick={handleClick}
>
  Clickable div
</div>

<!-- ❌ BAD: No accessibility -->
<div onclick={handleClick}>
  Clickable div
</div>
```

## Testing Guidelines

### Writing Tests

We use **Vitest** for unit testing:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Passage } from '../models/Passage';

describe('Passage', () => {
  let passage: Passage;

  beforeEach(() => {
    passage = new Passage('Start', 'Welcome!');
  });

  it('should create a passage with a unique ID', () => {
    expect(passage.id).toBeDefined();
    expect(passage.id).toHaveLength(36); // UUID
  });

  it('should detect choices in passage content', () => {
    passage.content = '[[Link text->Target]]';
    const choices = passage.extractChoices();

    expect(choices).toHaveLength(1);
    expect(choices[0].linkText).toBe('Link text');
    expect(choices[0].target).toBe('Target');
  });
});
```

### Test Coverage

- **Aim for >80% code coverage** for models and utilities
- **Test edge cases** and error conditions
- **Mock external dependencies** (stores, DOM APIs)
- **Test user interactions** for components

### Running Tests

```bash
# Run all tests
npm run test:run

# Watch mode (during development)
npm test

# Coverage report
npm run test:run -- --coverage

# Test specific file
npm run test:run src/lib/models/Passage.test.ts
```

## UI/UX Guidelines

### Design Principles

1. **Clarity**: UI should be self-explanatory
2. **Consistency**: Use consistent patterns and components
3. **Efficiency**: Minimize clicks and cognitive load
4. **Feedback**: Provide clear feedback for all actions
5. **Accessibility**: Support keyboard navigation and screen readers

### Component Design

```svelte
<!-- Good component design example -->
<script lang="ts">
  let {
    passage,
    isSelected = false,
    onSelect,
    onEdit,
    onDelete
  }: {
    passage: Passage;
    isSelected?: boolean;
    onSelect: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  } = $props();

  let isHovered = $state(false);
</script>

<div
  class="passage-item"
  class:selected={isSelected}
  class:hovered={isHovered}
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
  onclick={() => onSelect(passage.id)}
>
  <h3>{passage.name}</h3>

  <div class="actions">
    <button onclick|stopPropagation={() => onEdit(passage.id)}>
      Edit
    </button>
    <button onclick|stopPropagation={() => onDelete(passage.id)}>
      Delete
    </button>
  </div>
</div>
```

### Browser Support

Test in:
- **Chrome/Edge** (Chromium)
- **Firefox**
- **Safari**

## Submitting Changes

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `ui`: UI/UX improvement
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Tests
- `chore`: Build/tooling

**Examples:**

```
feat(graph): Add circular layout algorithm

Implemented circular layout option for graph view, placing nodes
in a circle around a central point. Useful for non-linear stories.

Related to Phase 3 completion.
Closes #45
```

```
fix(editor): Prevent data loss on browser refresh

Added automatic saving to localStorage every 30 seconds and
confirmation dialog before page unload with unsaved changes.

Fixes #52
```

### Pull Request Process

1. **Update documentation** if you changed UI or added features
2. **Add tests** for new functionality or bug fixes
3. **Run full test suite** (`npm run test:run`)
4. **Run type checking** (`npm run check`)
5. **Build successfully** (`npm run build`)
6. **Test in multiple browsers** for UI changes
7. **Fill out the PR template** completely
8. **Link related issues** in the PR description
9. **Wait for review** - maintainers will review within 7 days
10. **Address feedback** promptly and professionally

### Review Criteria

Your PR will be reviewed for:

- **Correctness**: Does it work as intended?
- **Test coverage**: Are there tests for new code?
- **Code quality**: Is it readable and maintainable?
- **TypeScript**: Proper types, no `any`?
- **UI/UX**: Is it intuitive and accessible?
- **Performance**: Does it impact performance?
- **Browser compatibility**: Works in all supported browsers?

## Getting Help

- **Documentation**: Check [README.md](README.md)
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Report bugs or request features via GitHub Issues
- **Phase Planning**: See VISUAL_EDITOR_PHASES.md (private repo)

## Recognition

Contributors are recognized in:

- GitHub contributors list
- `CHANGELOG.md` for significant contributions
- Release notes

Thank you for contributing to whisker-editor-web!

## License (AGPLv3)

By contributing to whisker-editor-web, you agree that your contributions will be licensed under the **GNU Affero General Public License v3.0 or later (AGPLv3+)**.

### What this means:

- Your code will be **open source** under AGPLv3
- If someone runs a modified version as a **network service** (SaaS), they must make their source code available (Section 13)
- Your contributions help ensure the editor remains **free and open**

See [LICENSE](LICENSE) and [NOTICE](NOTICE) for details.

### Section 13 Compliance

If you're deploying whisker-editor-web as a network service and making modifications, you must:

1. Display a notice with a link to your modified source code
2. Ensure users can download your modifications
3. License your modifications under AGPLv3+

See [NOTICE](NOTICE) for implementation examples.
