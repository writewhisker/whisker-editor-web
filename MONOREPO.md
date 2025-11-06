# Writewhisker Monorepo

This repository uses [pnpm](https://pnpm.io/) workspaces and [Turborepo](https://turbo.build/repo) to manage multiple packages.

## Structure

```
whisker-editor-web/
├── apps/                    # Applications
│   └── (TBD - editor app will move here in future PR)
├── packages/                # Shared packages
│   └── (TBD - extracted packages from Phase 1+)
├── .changeset/              # Changeset configuration for versioning
├── turbo.json               # Turborepo configuration
├── pnpm-workspace.yaml      # pnpm workspace configuration
└── package.json             # Root package.json
```

## Setup

### Prerequisites

- Node.js >=18.0.0
- pnpm >=8.0.0

### Installation

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

## Development

### Running Commands

All commands are run from the root directory using Turborepo:

```bash
# Run dev servers for all apps
pnpm dev

# Build all packages and apps
pnpm build

# Run tests across all packages
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Type check all packages
pnpm check

# Clean all build artifacts and node_modules
pnpm clean
```

### Working with Individual Packages

```bash
# Run command in specific workspace
pnpm --filter @writewhisker/editor-web dev
pnpm --filter @writewhisker/core test

# Add dependency to specific package
pnpm --filter @writewhisker/editor-web add some-package

# Add dev dependency to root
pnpm add -Dw some-dev-tool
```

## Versioning & Publishing

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Create a new changeset (describes changes for next release)
pnpm changeset

# Version packages (updates package.json versions)
pnpm version-packages

# Publish packages to npm
pnpm release
```

## Turborepo Pipeline

The `turbo.json` file defines the task pipeline:

- **build**: Builds packages with dependency awareness
- **dev**: Runs development servers (no caching, persistent)
- **test**: Runs tests (no caching for latest results)
- **test:run**: Runs tests once with coverage
- **lint**: Lints code
- **check**: Type checks TypeScript
- **clean**: Removes build artifacts

## Future Packages

As part of the modularization effort, packages will be extracted into this structure:

### Phase 1 - Core Packages
- `@writewhisker/core` - Core data structures
- `@writewhisker/parser` - Markdown parser
- `@writewhisker/runtime` - Story execution
- `@writewhisker/validator` - Validation
- `@writewhisker/serializer` - Import/export

### Phase 2 - Editor Packages
- `@writewhisker/graph-view` - Visual graph editing
- `@writewhisker/passage-editor` - Passage editing
- `@writewhisker/preview` - Story preview
- `@writewhisker/project-manager` - Project management

### Phase 3 - Feature Packages
- `@writewhisker/analytics` - Analytics
- `@writewhisker/ai` - AI features
- `@writewhisker/collaboration` - Collaboration
- `@writewhisker/kids-mode` - Kids interface
- `@writewhisker/mobile` - Mobile features

## Migration Status

- ✅ Phase 0 Week 1: projectStore refactoring (9 PRs)
- ✅ Phase 0 Week 2: Plugin system (5 PRs)
- ✅ Phase 0 Week 3: IF systems (7 PRs)
- 🔄 Phase 0 Week 4: Workspace setup (current)
- ⏳ Phase 1+: Package extraction (future)

## Resources

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Changesets Documentation](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
