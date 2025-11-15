# @writewhisker/player-ui

Drop-in UI components for embedding Whisker interactive stories.

## Installation

```bash
npm install @writewhisker/player-ui @writewhisker/core-ts
```

## Quick Start

```typescript
import { WhiskerPlayerUI } from '@writewhisker/player-ui';
import { Story } from '@writewhisker/core-ts';

// Load your story data
const storyData = await fetch('story.json').then(r => r.json());
const story = new Story(storyData);

// Create player with one line
WhiskerPlayerUI.create('#story-container', story, {
  theme: 'dark',
  showToolbar: true,
  autoSave: true
});
```

## Features

- **Zero Setup** - Works out of the box with built-in styles
- **Themes** - Dark and light themes included
- **Auto-Save** - Optional localStorage integration
- **Toolbar** - Undo, restart, save/load controls
- **Responsive** - Mobile-friendly design
- **Type-Safe** - Full TypeScript support

## Options

```typescript
interface PlayerUIOptions {
  theme?: 'dark' | 'light';           // Default: 'dark'
  showToolbar?: boolean;              // Default: true
  autoSave?: boolean;                 // Default: false
  saveKey?: string;                   // Default: 'whisker-save'
  onPassageChange?: (passage) => void;
  onChoiceSelected?: (choice) => void;
  onComplete?: () => void;
}
```

## API

```typescript
const player = WhiskerPlayerUI.create('#container', story, options);

player.undo();           // Undo last choice
player.restart();        // Restart from beginning
player.save();           // Save to localStorage
player.load();           // Load from localStorage
player.setTheme('light'); // Change theme
player.destroy();        // Clean up
```

## Documentation

See [docs/PLAYER_EMBEDDING_GUIDE.md](../../docs/PLAYER_EMBEDDING_GUIDE.md) for comprehensive documentation.

## License

AGPL-3.0
