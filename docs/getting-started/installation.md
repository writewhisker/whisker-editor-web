# Installation

## Web Editor (Recommended)

The easiest way to get started is the web editor at [whisker.dev](https://whisker.dev).

No installation required - just open your browser and start writing!

## Command Line Interface

Install the CLI globally:

```bash
npm install -g @writewhisker/cli
```

Or using pnpm:

```bash
pnpm add -g @writewhisker/cli
```

### Verify Installation

```bash
whisker --version
```

### CLI Commands

| Command | Description |
|---------|-------------|
| `whisker play <file>` | Play a story in the terminal |
| `whisker validate <file>` | Validate a story file |
| `whisker export <file>` | Export to HTML or other formats |
| `whisker import <file>` | Import from Twine, Ink, etc. |

## As a Library

### TypeScript/JavaScript

```bash
npm install @writewhisker/parser @writewhisker/story-player
```

```typescript
import { parse } from '@writewhisker/parser';
import { StoryPlayer } from '@writewhisker/story-player';

const story = parse(`
:: Start
Hello, world!
+ [Continue] -> End

:: End
Goodbye!
`);

const player = new StoryPlayer(story);
player.start();
```

### Lua

```bash
luarocks install whisker-core
```

```lua
local whisker = require("whisker")

local story = whisker.parse([[
:: Start
Hello, world!
+ [Continue] -> End

:: End
Goodbye!
]])

local player = whisker.Player.new(story)
player:start()
```

## System Requirements

- **Node.js**: 18.0 or higher
- **Lua**: 5.1+ or LuaJIT
- **Browser**: Any modern browser (Chrome, Firefox, Safari, Edge)

## Next Steps

- [Quick Start](/getting-started/quick-start) - Write your first story
- [Editor Setup](/getting-started/editor-setup) - Configure your editor
