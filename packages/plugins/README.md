# @writewhisker/plugins

Plugin infrastructure for Whisker stories.

## Features

- **Plugin Lifecycle**: State machine managing discovered → loaded → initialized → enabled → disabled → destroyed
- **Hook System**: Observer and transform hooks with priority ordering
- **Plugin Registry**: Central management with auto-initialization
- **Plugin Context**: Runtime environment with API access, config, and storage

## Installation

```bash
pnpm add @writewhisker/plugins
```

## Quick Start

```typescript
import { initializePluginSystem, STORY } from '@writewhisker/plugins';

const registry = initializePluginSystem();

await registry.register({
  metadata: { name: 'analytics', version: '1.0.0' },
  hooks: {
    on_story_start: () => console.log('Story started!'),
    on_passage_render: (html) => `<div class="wrapper">${html}</div>`,
  },
});

registry.emit(STORY.START, { storyId: 'adventure' });
```

## Hook Categories

| Category | Events |
|----------|--------|
| Story | `on_story_start`, `on_story_end`, `on_story_reset` |
| Passage | `on_passage_enter`, `on_passage_exit`, `on_passage_render` |
| Choice | `on_choice_present`, `on_choice_select`, `on_choice_evaluate` |
| Variable | `on_variable_set`, `on_variable_get`, `on_state_change` |
| Persistence | `on_save`, `on_load_save`, `on_save_list` |
| Error | `on_error` |

## Documentation

See the [full API reference](../../docs/api/typescript/plugins.md).

## License

MIT
