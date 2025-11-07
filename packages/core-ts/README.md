# @whisker/core-ts

Core TypeScript runtime for Whisker interactive fiction engine.

## Overview

This package contains the core models, types, and utilities for the Whisker story engine. It is framework-agnostic and can be used in any JavaScript/TypeScript environment.

## Installation

```bash
npm install @whisker/core-ts
# or
pnpm add @whisker/core-ts
```

## What's Included

### Models

- **Story** - The main story container with passages, variables, and metadata
- **Passage** - Individual story passages/nodes with content and choices
- **Choice** - Player choices that navigate between passages
- **Variable** - Story variables with types (string, number, boolean)
- **LuaFunction** - Custom Lua functions for scripting
- **ScriptBlock** - Script blocks for passage logic
- **Playthrough** - Player session tracking
- **ChangeLog** - Story change history
- **Comment** - Comments and annotations
- **Collaborator** - Collaborator information

### Utilities

- **whiskerCoreAdapter** - Format conversion between editor and runtime formats
  - `toWhiskerCoreFormat()` - Convert to Whisker Core format (v1.0, v2.0)
  - `toWhiskerFormatV21()` - Convert to Whisker Format v2.1 with editorData
  - `fromWhiskerCoreFormat()` - Import from Whisker Core format
  - `importWhiskerFile()` - Auto-detect format and import
  - `generateIfid()` - Generate Interactive Fiction ID (UUID v4)

- **idGenerator** - Unique ID generation
  - `generateId()` - Generate timestamp-based unique IDs

### Types

Complete TypeScript type definitions for all models and data structures.

## Usage

```typescript
import { Story, Passage, Variable } from '@whisker/core-ts';
import { toWhiskerCoreFormat, generateIfid } from '@whisker/core-ts';

// Create a new story
const story = new Story({
  metadata: {
    title: 'My Story',
    author: 'Author Name',
    version: '1.0.0',
    ifid: generateIfid()
  },
  startPassage: 'start'
});

// Add a passage
const passage = story.createPassage({
  title: 'start',
  content: 'Welcome to the story!'
});

// Add a variable
const variable = story.createVariable({
  name: 'playerName',
  type: 'string',
  initial: ''
});

// Export to Whisker Core format
const exported = toWhiskerCoreFormat(story.serialize(), {
  formatVersion: '2.0'
});
```

## Format Support

- **Whisker Format v1.0** - Basic story format
- **Whisker Format v2.0** - Typed variables format
- **Whisker Format v2.1** - EditorData namespace support

## Testing

The package includes comprehensive test coverage (340+ tests).

```bash
pnpm test
```

## Building

```bash
pnpm build
```

## License

MIT
