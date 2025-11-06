# Phases 4-5: Shared UI & WriteWhisker App - Implementation Guide

##

 Overview

Phases 4 & 5 complete the modularization by extracting shared UI components and assembling the final WriteWhisker application.

**Prerequisites**: Phases 0-3 complete

**Timeline**: 3 weeks total (Weeks 10-12)
- Phase 4: 1 week (Week 10)
- Phase 5: 2 weeks (Weeks 11-12)

**PRs**: 8 total (PRs #31-38)

---

# PHASE 4: Extract Shared UI & Publishing

## Timeline: 1 week (Week 10)
## PRs: 3 (PRs #31-33)
## Effort: 4-7 developer-days

---

# PR #31: Create @whisker/shared-ui Package

**Goal**: Extract reusable UI components and design system

**Estimated Effort**: 2-3 days
**Lines Changed**: ~200
**Risk**: LOW

## Package Structure

```
packages/shared-ui/
├── src/
│   ├── components/
│   │   ├── Button.svelte
│   │   ├── Input.svelte
│   │   ├── Textarea.svelte
│   │   ├── Select.svelte
│   │   ├── Checkbox.svelte
│   │   ├── Radio.svelte
│   │   ├── Modal.svelte
│   │   ├── Dialog.svelte
│   │   ├── Tooltip.svelte
│   │   ├── Dropdown.svelte
│   │   ├── Card.svelte
│   │   ├── Badge.svelte
│   │   ├── Alert.svelte
│   │   ├── Spinner.svelte
│   │   ├── Progress.svelte
│   │   ├── Tabs.svelte
│   │   ├── Table.svelte
│   │   └── index.ts
│   ├── styles/
│   │   ├── theme.css
│   │   ├── variables.css
│   │   ├── utilities.css
│   │   └── index.css
│   ├── utils/
│   │   ├── classNames.ts
│   │   └── index.ts
│   └── index.ts
├── tests/
│   └── components/
│       └── *.test.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## Package Configuration

### `packages/shared-ui/package.json`

```json
{
  "name": "@whisker/shared-ui",
  "version": "0.1.0",
  "description": "Shared UI components and design system for Whisker",
  "license": "AGPL-3.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "svelte": "./dist/index.js",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "import": "./dist/index.js"
    },
    "./styles": "./dist/styles/index.css",
    "./components": {
      "types": "./dist/components/index.d.ts",
      "svelte": "./dist/components/index.js"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build && tsc --emitDeclarationOnly",
    "test": "vitest run",
    "check": "svelte-check && tsc --noEmit"
  },
  "dependencies": {
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@testing-library/svelte": "^5.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## Move Shared Components

Identify and move truly shared components from editor-base:

```bash
# Example - adjust based on actual shared components
mv packages/editor-base/src/components/Button.svelte packages/shared-ui/src/components/
mv packages/editor-base/src/components/Modal.svelte packages/shared-ui/src/components/
mv packages/editor-base/src/components/Dialog.svelte packages/shared-ui/src/components/
# ... etc
```

## Export Components

### `packages/shared-ui/src/index.ts`

```typescript
/**
 * @whisker/shared-ui
 *
 * Shared UI components and design system
 */

export * from './components';
export * from './utils';

// Export CSS (for bundlers that support it)
import './styles/index.css';
```

---

# PR #32: Extract Theme System

**Goal**: Create centralized theme configuration

**Estimated Effort**: 1-2 days
**Lines Changed**: ~100
**Risk**: LOW

## Tailwind Configuration

### `packages/shared-ui/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    '../editor-base/src/**/*.{html,js,svelte,ts}',
    '../if-extensions/src/**/*.{html,js,svelte,ts}',
  ],
  theme: {
    extend: {
      colors: {
        // Whisker brand colors
        whisker: {
          50: '#fef5ee',
          100: '#fde8d7',
          200: '#fbcdae',
          300: '#f8ab7b',
          400: '#f47f46',
          500: '#f15e20',
          600: '#e24416',
          700: '#bb3214',
          800: '#952a18',
          900: '#782516',
        },
        // Editor colors
        editor: {
          bg: '#1e1e1e',
          fg: '#d4d4d4',
          border: '#3e3e42',
          hover: '#2a2d2e',
          active: '#37373d',
        },
        // Passage colors
        passage: {
          default: '#4a9eff',
          start: '#4caf50',
          dead: '#f44336',
          tag: '#ff9800',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
```

## CSS Variables

### `packages/shared-ui/src/styles/variables.css`

```css
:root {
  /* Colors */
  --color-primary: #f15e20;
  --color-secondary: #4a9eff;
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-error: #f44336;
  --color-info: #2196f3;

  /* Editor */
  --editor-bg: #1e1e1e;
  --editor-fg: #d4d4d4;
  --editor-border: #3e3e42;
  --editor-hover: #2a2d2e;
  --editor-active: #37373d;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'Fira Code', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;

  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}

/* Dark mode overrides */
[data-theme='dark'] {
  --color-primary: #ff7a45;
  --color-secondary: #66b2ff;
  /* ... dark mode specific colors */
}
```

## Update Packages to Use Shared UI

In editor-base and if-extensions, update imports:

```typescript
// Before
import Button from './Button.svelte';

// After
import { Button } from '@whisker/shared-ui';
```

---

# PR #33: Add npm Publishing Configuration

**Goal**: Set up packages for npm publishing

**Estimated Effort**: 1-2 days
**Lines Changed**: ~100
**Risk**: LOW

## Update All package.json Files

Ensure all packages have:

```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/writewhisker/whisker-editor-web.git",
    "directory": "packages/PACKAGE_NAME"
  },
  "bugs": {
    "url": "https://github.com/writewhisker/whisker-editor-web/issues"
  },
  "homepage": "https://writewhisker.com",
  "keywords": [
    "interactive-fiction",
    "story-editor",
    "narrative",
    "whisker"
  ],
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ]
}
```

## Create LICENSE Files

Copy AGPL-3.0 license to each package:

```bash
cp LICENSE packages/core-ts/
cp LICENSE packages/editor-base/
cp LICENSE packages/if-extensions/
cp LICENSE packages/shared-ui/
```

## Create CHANGELOG Files

Create initial changelogs:

```markdown
# Changelog

## [0.1.0] - 2025-11-06

### Added
- Initial release
- Core functionality extracted from whisker-editor-web
```

## Test Publishing (Dry Run)

```bash
cd packages/core-ts
pnpm pack --dry-run
cd ../editor-base
pnpm pack --dry-run
# ... repeat for all packages
```

---

# PHASE 5: WriteWhisker App & Final Polish

## Timeline: 2 weeks (Weeks 11-12)
## PRs: 5 (PRs #34-38)
## Effort: 10-15 developer-days

---

# PR #34: Create apps/writewhisker

**Goal**: Move main application to apps directory

**Estimated Effort**: 2-3 days
**Lines Changed**: ~200
**Risk**: MEDIUM

## App Structure

```
apps/writewhisker/
├── src/
│   ├── App.svelte
│   ├── main.ts
│   ├── routes/
│   │   ├── Landing.svelte
│   │   └── Editor.svelte
│   └── vite-env.d.ts
├── public/
│   ├── favicon.ico
│   └── assets/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Package Configuration

### `apps/writewhisker/package.json`

```json
{
  "name": "writewhisker",
  "version": "1.0.0",
  "description": "WriteWhisker Interactive Fiction Editor",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check && tsc --noEmit"
  },
  "dependencies": {
    "@whisker/core-ts": "workspace:*",
    "@whisker/editor-base": "workspace:*",
    "@whisker/if-extensions": "workspace:*",
    "@whisker/shared-ui": "workspace:*",
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "svelte-check": "^4.0.0"
  }
}
```

## Move Application Files

```bash
# Move main app files
mv src/App.svelte apps/writewhisker/src/
mv src/main.ts apps/writewhisker/src/
mv src/routes/* apps/writewhisker/src/routes/

# Move index.html
mv index.html apps/writewhisker/

# Move public assets
mv public/* apps/writewhisker/public/
```

## Update App.svelte

### `apps/writewhisker/src/App.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { pluginManager } from '@whisker/editor-base';
  import { ifExtensionsPlugins } from '@whisker/if-extensions';

  // Import editor components
  import {
    MenuBar,
    Toolbar,
    GraphView,
    PassageList,
    PropertiesPanel,
    PreviewPanel,
    StatusBar,
  } from '@whisker/editor-base';

  // Import shared UI
  import '@whisker/shared-ui/styles';

  // Initialize plugins
  onMount(async () => {
    console.log('Initializing WriteWhisker...');

    // Register all IF plugins
    for (const plugin of ifExtensionsPlugins) {
      await pluginManager.register(plugin);
    }

    // Initialize plugin system
    await pluginManager.initialize();

    console.log('WriteWhisker initialized with plugins:', pluginManager.getPluginCount());
  });
</script>

<div class="writewhisker-app">
  <MenuBar />
  <div class="app-content">
    <aside class="left-sidebar">
      <PassageList />
    </aside>

    <main class="main-content">
      <Toolbar />
      <GraphView />
    </main>

    <aside class="right-sidebar">
      <PropertiesPanel />
      <PreviewPanel />
    </aside>
  </div>
  <StatusBar />
</div>

<style>
  .writewhisker-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .app-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .left-sidebar,
  .right-sidebar {
    width: 300px;
    overflow-y: auto;
    border-right: 1px solid var(--editor-border);
  }

  .right-sidebar {
    border-left: 1px solid var(--editor-border);
    border-right: none;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
```

## Update Vite Config

### `apps/writewhisker/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@whisker/core-ts': resolve(__dirname, '../../packages/core-ts/src'),
      '@whisker/editor-base': resolve(__dirname, '../../packages/editor-base/src'),
      '@whisker/if-extensions': resolve(__dirname, '../../packages/if-extensions/src'),
      '@whisker/shared-ui': resolve(__dirname, '../../packages/shared-ui/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

---

# PR #35: Optional Kids Mode Package

**Goal**: Extract kids mode to separate package (optional)

**Estimated Effort**: 3-4 days
**Lines Changed**: ~300
**Risk**: LOW

**Note**: This is optional. Kids mode can stay in editor-base with a feature flag, or be extracted to `@whisker/kids-mode` package.

If extracting, follow same pattern as if-extensions.

---

# PR #36: Full Integration Tests

**Goal**: Test all packages working together

**Estimated Effort**: 2-3 days
**Lines Changed**: ~200
**Risk**: MEDIUM

## Integration Test Suite

### `tests/integration/full-app.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { Story, Passage } from '@whisker/core-ts';
import { pluginManager } from '@whisker/editor-base';
import { ifExtensionsPlugins } from '@whisker/if-extensions';

describe('Full Application Integration', () => {
  beforeAll(async () => {
    // Register all plugins
    for (const plugin of ifExtensionsPlugins) {
      await pluginManager.register(plugin);
    }
    await pluginManager.initialize();
  });

  it('should create a complete story with all features', () => {
    // Create story
    const story = new Story({
      metadata: {
        title: 'Integration Test Story',
        author: 'Test',
      },
    });

    // Add passages
    const start = new Passage({
      title: 'Start',
      content: 'Welcome!',
    });
    story.addPassage(start);

    // Validate story
    expect(story.passages.size).toBe(1);
    expect(story.getPassage(start.id)).toBe(start);
  });

  it('should use all IF features together', async () => {
    // Test inventory + stats + combat working together
    const context = {
      storyState: {},
      variables: new Map(),
      currentPassage: null,
      history: [],
    };

    // Initialize all systems
    await pluginManager.executeHook('onInit', context);

    // Verify all systems initialized
    expect(context.storyState.inventorySystem).toBeDefined();
    expect(context.storyState.statsSystem).toBeDefined();
    expect(context.storyState.combatSystem).toBeDefined();
  });

  it('should export story in all formats', () => {
    // Test all exporters work
    // Test whisker-core compatibility
    // Test import/export round-trip
  });

  it('should handle large stories performantly', () => {
    // Performance test with 1000+ passages
    // Measure render time, validation time, export time
  });
});
```

## Performance Tests

Add performance benchmarks for:
- Story creation with N passages
- Validation speed
- Export/import speed
- Plugin initialization time
- UI render time

---

# PR #37: Documentation

**Goal**: Complete all package documentation

**Estimated Effort**: 2-3 days
**Lines Changed**: ~200
**Risk**: LOW

## Package READMEs

Ensure each package has comprehensive README with:
- Installation
- Quick start
- API documentation
- Examples
- License

## Create Architecture Documentation

### `docs/ARCHITECTURE.md`

```markdown
# Whisker Architecture

## Overview

Whisker is a modular interactive fiction editor built with TypeScript and Svelte 5.

## Package Structure

\`\`\`
@whisker/core-ts         - Core runtime (models, validation, engine)
@whisker/editor-base     - Editor platform (stores, components, services)
@whisker/if-extensions   - IF-specific features (as plugins)
@whisker/shared-ui       - Shared UI components and design system
writewhisker (app)       - Main editor application
\`\`\`

## Data Flow

\`\`\`
User Input → Components → Stores → Models → Validation → Storage
                           ↓
                        Plugins → Runtime Systems
\`\`\`

## Plugin System

Plugins can extend:
- Passage types
- Custom actions
- Custom conditions
- UI (sidebar, inspector, toolbar)
- Runtime hooks

See [Plugin Development Guide](PLUGIN_DEVELOPMENT.md)
```

### `docs/PLUGIN_DEVELOPMENT.md`

Complete guide for developing custom plugins.

### `docs/CONTRIBUTING.md`

Guide for contributing to the project.

---

# PR #38: Publish Packages to npm

**Goal**: Publish all packages to npm registry

**Estimated Effort**: 1 day
**Lines Changed**: ~50
**Risk**: LOW

## Pre-Publish Checklist

- ✅ All tests pass
- ✅ All packages build successfully
- ✅ READMEs complete
- ✅ CHANGELOGs created
- ✅ LICENSE files in place
- ✅ Version numbers set (0.1.0)
- ✅ npm account configured
- ✅ GitHub Actions workflow created (see CI/CD guide)

## Manual Publish (First Time)

```bash
# Login to npm
npm login

# Publish core-ts first (no dependencies)
cd packages/core-ts
npm publish --access public

# Publish shared-ui (no @whisker dependencies)
cd ../shared-ui
npm publish --access public

# Publish editor-base (depends on core-ts)
cd ../editor-base
npm publish --access public

# Publish if-extensions (depends on core-ts, editor-base)
cd ../if-extensions
npm publish --access public

# Verify all published
npm info @whisker/core-ts
npm info @whisker/editor-base
npm info @whisker/if-extensions
npm info @whisker/shared-ui
```

## Automated Publishing

Use changesets for automated versioning and publishing (see CI/CD guide).

---

# Phases 4-5 Summary

## Final Package Structure

```
whisker-editor-web/
├── packages/
│   ├── core-ts/          ✅ Published to npm
│   ├── editor-base/      ✅ Published to npm
│   ├── if-extensions/    ✅ Published to npm
│   └── shared-ui/        ✅ Published to npm
├── apps/
│   └── writewhisker/     ✅ Deployed application
└── whisker-implementation/
    └── write-whisker-modularization/
        └── [all planning docs]
```

## Published Packages

| Package | Version | Size | Dependencies |
|---------|---------|------|--------------|
| @whisker/core-ts | 0.1.0 | ~50KB | nanoid |
| @whisker/editor-base | 0.1.0 | ~200KB | @whisker/core-ts, svelte |
| @whisker/if-extensions | 0.1.0 | ~100KB | @whisker/core-ts, @whisker/editor-base |
| @whisker/shared-ui | 0.1.0 | ~30KB | svelte |

## Success Criteria

- ✅ All packages published to npm
- ✅ WriteWhisker app works identically to before
- ✅ All 5,542 tests pass
- ✅ Zero circular dependencies
- ✅ Documentation complete
- ✅ OnboardFlow can install packages
- ✅ Performance acceptable
- ✅ Production deployment successful

## What OnboardFlow Can Do Now

```bash
# In OnboardFlow project
npm install @whisker/core-ts @whisker/editor-base @whisker/shared-ui
```

```typescript
// OnboardFlow can now use:
import { Story, Passage } from '@whisker/core-ts';
import { pluginManager } from '@whisker/editor-base';
import { Button, Modal } from '@whisker/shared-ui';

// Create custom plugins
const onboardingPlugin = {
  name: 'onboarding',
  // ... custom plugin implementation
};

await pluginManager.register(onboardingPlugin);
```

---

**Next**: CI/CD & Publishing Guide, OnboardFlow Architecture
