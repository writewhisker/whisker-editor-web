# @writewhisker/plugins API Reference

Core plugin infrastructure for Whisker stories including lifecycle management, hook system, and plugin registry.

## Installation

```bash
pnpm add @writewhisker/plugins
```

## Quick Start

```typescript
import {
  initializePluginSystem,
  shutdownPluginSystem,
  STORY,
  PASSAGE,
} from '@writewhisker/plugins';

// Initialize the plugin system
const registry = initializePluginSystem({
  autoInitialize: true,
  autoEnable: true,
});

// Register a plugin
await registry.register({
  metadata: {
    name: 'my-analytics-plugin',
    version: '1.0.0',
    description: 'Track story analytics',
  },
  hooks: {
    on_story_start: (context) => {
      console.log('Story started!');
    },
    on_passage_enter: (passage) => {
      console.log(`Entered passage: ${passage.id}`);
    },
  },
});

// Emit events
registry.emit(STORY.START, { storyId: 'my-story' });
registry.emit(PASSAGE.ENTER, { id: 'chapter-1', title: 'Chapter 1' });

// Cleanup
await shutdownPluginSystem();
```

---

## Plugin Registry

Central registry for managing plugin lifecycle and registration.

### Creating a Registry

```typescript
import {
  PluginRegistry,
  createPluginRegistry,
  initializePluginSystem,
  getPluginRegistry,
} from '@writewhisker/plugins';

// Option 1: Factory function
const registry = createPluginRegistry({
  autoInitialize: true,
  autoEnable: true,
});

// Option 2: Initialize singleton
const registry = initializePluginSystem({
  autoInitialize: true,
  autoEnable: true,
});

// Option 3: Get existing singleton
const registry = getPluginRegistry();
```

### Configuration Options

```typescript
interface PluginRegistryConfig {
  autoInitialize?: boolean;  // Auto-call on_init after registration
  autoEnable?: boolean;      // Auto-call on_enable after initialization
  logger?: Logger;           // Custom logger
}
```

### Registering Plugins

```typescript
const result = await registry.register({
  metadata: {
    name: 'inventory-system',
    version: '1.0.0',
    description: 'Item inventory management',
    author: 'Your Name',
    dependencies: ['core-systems'],     // Required plugins
    provides: ['inventory'],            // Features this plugin provides
    priority: 50,                       // Hook execution priority
  },
  hooks: {
    on_init: (ctx) => {
      console.log('Inventory initialized');
    },
    on_enable: (ctx) => {
      ctx.setData('inventory', []);
    },
    on_story_start: () => {
      console.log('Story started with inventory');
    },
  },
  apis: {
    inventory: {
      addItem: (item) => { /* ... */ },
      removeItem: (id) => { /* ... */ },
      getItems: () => { /* ... */ },
    },
  },
  config: {
    maxItems: 100,
    enableStacking: true,
  },
});

if (result.success) {
  console.log('Plugin registered');
} else {
  console.error('Registration failed:', result.error);
}
```

### Plugin Lifecycle

```typescript
// Manual lifecycle control (when autoInitialize/autoEnable = false)
await registry.initializePlugin('inventory-system');
await registry.enablePlugin('inventory-system');
await registry.disablePlugin('inventory-system');
await registry.destroyPlugin('inventory-system');

// Destroy all plugins
await registry.destroyAll();
```

### Querying Plugins

```typescript
// Check plugin exists
const exists = registry.hasPlugin('inventory-system');

// Get plugin state
const state = registry.getPluginState('inventory-system');
// 'discovered' | 'loaded' | 'initialized' | 'enabled' | 'disabled' | 'destroyed' | 'error'

// Check if enabled
const enabled = registry.isPluginEnabled('inventory-system');

// Get all plugin names
const names = registry.getPluginNames();

// Get enabled plugins only
const enabled = registry.getEnabledPlugins();

// Get plugin context
const context = registry.getPluginContext('inventory-system');
```

### API Management

```typescript
// Register global API
registry.registerApi('game.utils', { roll: (d) => Math.floor(Math.random() * d) + 1 });

// Get API
const utils = registry.getApi<{ roll: (d: number) => number }>('game.utils');
console.log(utils?.roll(20)); // 1-20

// Plugin APIs are namespaced: {pluginName}.{apiName}
const inventory = registry.getApi('inventory-system.inventory');

// List all APIs
const apiNames = registry.getApiNames();
```

### Emitting Events

```typescript
// Emit hook events
const { value, results } = registry.emit('on_passage_render', htmlContent);

// Transform hooks modify the value
console.log(value); // Modified HTML

// Observer hooks just execute (value unchanged)
registry.emit('on_story_start', storyData);
```

---

## Plugin Lifecycle States

Plugins transition through defined states:

```
discovered → loaded → initialized → enabled ⟷ disabled → destroyed
                 ↓         ↓           ↓          ↓
               error     error       error      error → destroyed
```

### State Descriptions

| State | Description |
|-------|-------------|
| `discovered` | Plugin found, metadata extracted |
| `loaded` | Plugin module loaded into memory |
| `initialized` | `on_init` hook executed |
| `enabled` | `on_enable` hook executed, actively participating |
| `disabled` | `on_disable` hook executed, temporarily inactive |
| `destroyed` | `on_destroy` hook executed, completely unloaded |
| `error` | Plugin encountered error during transition |

### State Machine

```typescript
import {
  PluginStateMachine,
  isValidTransition,
  getAllowedTransitions,
  getTransitionPath,
} from '@writewhisker/plugins';

// Create state machine
const machine = PluginStateMachine.create(); // Starts at 'discovered'

// Transition
const result = machine.transition('loaded');
if (result.success) {
  console.log('Now loaded');
}

// Check allowed transitions
const allowed = machine.getAllowedNext();
// ['initialized', 'error']

// Check if transition valid
const valid = isValidTransition('loaded', 'initialized'); // true
const invalid = isValidTransition('loaded', 'enabled');   // false

// Find path between states
const path = getTransitionPath('discovered', 'enabled');
// ['loaded', 'initialized', 'enabled']
```

---

## Hook System

The hook system enables plugins to respond to and transform events.

### Hook Modes

| Mode | Description | Example Use |
|------|-------------|-------------|
| `observer` | Execute side effects, cannot modify data | Analytics, logging |
| `transform` | Can modify the data being passed | Content filtering, formatting |

### Hook Categories

```typescript
import {
  STORY,
  PASSAGE,
  CHOICE,
  VARIABLE,
  PERSISTENCE,
  ERROR,
} from '@writewhisker/plugins';

// Story lifecycle
STORY.START    // 'on_story_start' (observer)
STORY.END      // 'on_story_end' (observer)
STORY.RESET    // 'on_story_reset' (observer)

// Passage navigation
PASSAGE.ENTER  // 'on_passage_enter' (observer)
PASSAGE.EXIT   // 'on_passage_exit' (observer)
PASSAGE.RENDER // 'on_passage_render' (transform)

// Choice handling
CHOICE.PRESENT  // 'on_choice_present' (transform)
CHOICE.SELECT   // 'on_choice_select' (observer)
CHOICE.EVALUATE // 'on_choice_evaluate' (transform)

// Variable management
VARIABLE.SET    // 'on_variable_set' (transform)
VARIABLE.GET    // 'on_variable_get' (transform)
VARIABLE.CHANGE // 'on_state_change' (observer)

// Persistence
PERSISTENCE.SAVE      // 'on_save' (transform)
PERSISTENCE.LOAD      // 'on_load_save' (transform)
PERSISTENCE.SAVE_LIST // 'on_save_list' (transform)

// Error handling
ERROR.ERROR // 'on_error' (observer)
```

### Hook Utilities

```typescript
import {
  getAllEvents,
  getMode,
  getCategory,
  isTransformHook,
  isObserverHook,
  isKnownEvent,
  getEventsByCategory,
  getCategories,
} from '@writewhisker/plugins';

// Get all hook events
const events = getAllEvents();

// Get hook mode
const mode = getMode('on_passage_render'); // 'transform'

// Get hook category
const category = getCategory('on_story_start'); // 'story'

// Check hook type
isTransformHook('on_passage_render'); // true
isObserverHook('on_story_start');     // true

// Get events by category
const storyEvents = getEventsByCategory('story');
// ['on_story_end', 'on_story_reset', 'on_story_start']

// Get all categories
const categories = getCategories();
// ['choice', 'error', 'passage', 'persistence', 'story', 'variable']
```

---

## Hook Manager

Manages hook registration and execution.

### Creating a Hook Manager

```typescript
import { HookManager, createHookManager } from '@writewhisker/plugins';

const manager = createHookManager();
// or
const manager = HookManager.create();
```

### Registering Hooks

```typescript
// Basic registration
const hookId = manager.registerHook('on_story_start', (data) => {
  console.log('Story started:', data);
});

// With priority (lower runs first)
const hookId = manager.registerHook('on_passage_render', (html) => {
  return html.toUpperCase();
}, 10); // Priority 10 (runs early)

// With plugin name
const hookId = manager.registerHook(
  'on_choice_present',
  (choices) => choices.filter(c => c.available),
  50,
  'choice-filter-plugin'
);

// Unregister
manager.unregisterHook(hookId);
```

### Priority Constants

```typescript
import {
  DEFAULT_PRIORITY,
  MIN_PRIORITY,
  MAX_PRIORITY,
} from '@writewhisker/plugins';

console.log(MIN_PRIORITY);     // 0
console.log(DEFAULT_PRIORITY); // 50
console.log(MAX_PRIORITY);     // 100
```

### Triggering Hooks

```typescript
// trigger() - for observer hooks (side effects only)
const results = manager.trigger('on_story_start', storyData);

for (const result of results) {
  if (result.success) {
    console.log(`Hook ${result.hookId} succeeded`);
  } else {
    console.error(`Hook ${result.hookId} failed: ${result.error}`);
  }
}

// transform() - for transform hooks (modify data)
const { value, results } = manager.transform('on_passage_render', '<p>Hello</p>');
console.log(value); // Transformed HTML

// emit() - automatically uses trigger or transform based on hook type
const { value, results } = manager.emit('on_choice_present', choices);
```

### Hook Scopes

Temporary hook registration that auto-cleans up:

```typescript
const scope = manager.createScope();

// Register hooks in scope
scope.register('on_story_start', callback1);
scope.register('on_passage_enter', callback2);

// Get scope hooks
const hooks = scope.getHooks();

// Close scope - unregisters all hooks
const count = scope.close();
console.log(`Unregistered ${count} hooks`);
```

### Pausing Hooks

```typescript
// Pause specific event
manager.pauseEvent('on_passage_render');

// Hooks won't execute
manager.trigger('on_passage_render', data); // Returns []

// Resume
manager.resumeEvent('on_passage_render');

// Pause all hooks
manager.pauseAll();

// Resume all
manager.resumeAll();

// Check status
manager.isEventPaused('on_passage_render');
manager.isGloballyPaused();
```

### Querying Hooks

```typescript
// Get hooks for event
const hooks = manager.getHooks('on_story_start');

// Get hook count
const count = manager.getHookCount('on_story_start');

// Get total hooks
const total = manager.getTotalHookCount();

// Get registered events
const events = manager.getRegisteredEvents();

// Get hooks by plugin
const pluginHooks = manager.getPluginHooks('my-plugin');
```

### Clearing Hooks

```typescript
// Clear specific event
const count = manager.clearEvent('on_story_start');

// Clear all hooks from plugin
const count = manager.clearPluginHooks('my-plugin');

// Clear all hooks
const count = manager.clearAll();

// Reset everything
manager.reset();
```

### Batch Registration

```typescript
const hookIds = manager.registerPluginHooks('my-plugin', {
  on_story_start: () => console.log('start'),
  on_story_end: () => console.log('end'),
  on_passage_render: (html) => `<div class="wrapper">${html}</div>`,
});
```

---

## Plugin Context

Runtime environment provided to plugins.

### Accessing Context

```typescript
await registry.register({
  metadata: { name: 'my-plugin', version: '1.0.0' },
  hooks: {
    on_init: (ctx) => {
      // ctx is the PluginContext
      console.log('Plugin:', ctx.metadata.name);
      console.log('State:', ctx.state);
    },
  },
});
```

### Context Properties

```typescript
interface PluginContext {
  // Metadata (read-only)
  readonly metadata: PluginMetadata;
  readonly state: PluginState;
  readonly log: Logger;

  // Hook registration
  registerHook(event: string, handler: Function, priority?: number): string;
  unregisterHook(hookId: string): boolean;
  unregisterAllHooks(): number;
  getRegisteredHooks(): string[];

  // API access
  getApi<T>(name: string): T | undefined;

  // Configuration
  getConfig<T>(key: string): T | undefined;
  setConfig<T>(key: string, value: T): void;
  getAllConfig(): Record<string, unknown>;

  // Data storage
  getData<T>(key: string): T | undefined;
  setData<T>(key: string, value: T): void;
  getAllData(): Record<string, unknown>;
  clearData(): void;
}
```

### Using Context

```typescript
hooks: {
  on_init: (ctx) => {
    // Read configuration
    const maxItems = ctx.getConfig<number>('maxItems') ?? 100;

    // Store plugin data
    ctx.setData('inventory', []);
    ctx.setData('initialized', true);

    // Register additional hooks
    ctx.registerHook('on_passage_enter', (passage) => {
      const inventory = ctx.getData<Item[]>('inventory');
      // Process inventory on passage enter
    });

    // Access other plugin APIs
    const utils = ctx.getApi('game-utils.helpers');
  },

  on_enable: (ctx) => {
    ctx.log.info('Plugin enabled');
  },

  on_disable: (ctx) => {
    ctx.log.info('Plugin disabled');
    // Clean up
    ctx.clearData();
  },
}
```

---

## Plugin Definition

Complete plugin structure:

```typescript
interface PluginDefinition {
  metadata: PluginMetadata;
  hooks?: PluginHooks;
  apis?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];        // Required plugins
  optionalDependencies?: string[]; // Optional plugins
  provides?: string[];            // Features provided
  priority?: number;              // Default hook priority
}

interface PluginHooks {
  // Lifecycle hooks
  on_load?: (ctx: PluginContext) => void | Promise<void>;
  on_init?: (ctx: PluginContext) => void | Promise<void>;
  on_enable?: (ctx: PluginContext) => void | Promise<void>;
  on_disable?: (ctx: PluginContext) => void | Promise<void>;
  on_destroy?: (ctx: PluginContext) => void | Promise<void>;

  // Event hooks
  on_story_start?: EventHookFn;
  on_story_end?: EventHookFn;
  on_passage_enter?: EventHookFn;
  on_passage_render?: EventHookFn;
  // ... etc
}
```

---

## Complete Example

```typescript
import {
  initializePluginSystem,
  shutdownPluginSystem,
  PASSAGE,
} from '@writewhisker/plugins';

// Initialize
const registry = initializePluginSystem();

// Analytics plugin
await registry.register({
  metadata: {
    name: 'analytics',
    version: '1.0.0',
    description: 'Track reader behavior',
  },
  hooks: {
    on_init: (ctx) => {
      ctx.setData('pageViews', 0);
      ctx.setData('startTime', Date.now());
    },
    on_passage_enter: (passage) => {
      const ctx = registry.getPluginContext('analytics')!;
      const views = ctx.getData<number>('pageViews') ?? 0;
      ctx.setData('pageViews', views + 1);
      console.log(`Page view #${views + 1}: ${passage.title}`);
    },
    on_story_end: () => {
      const ctx = registry.getPluginContext('analytics')!;
      const views = ctx.getData<number>('pageViews');
      const duration = Date.now() - ctx.getData<number>('startTime')!;
      console.log(`Story complete: ${views} pages, ${duration}ms`);
    },
  },
  apis: {
    stats: {
      getPageViews: () => {
        const ctx = registry.getPluginContext('analytics')!;
        return ctx.getData<number>('pageViews') ?? 0;
      },
    },
  },
});

// Content filter plugin
await registry.register({
  metadata: {
    name: 'content-filter',
    version: '1.0.0',
    priority: 10, // Run early
  },
  hooks: {
    on_passage_render: (html: string) => {
      // Censor bad words
      return html.replace(/badword/gi, '****');
    },
  },
});

// Use plugins
registry.emit(PASSAGE.ENTER, { id: 'ch1', title: 'Chapter 1' });

const stats = registry.getApi<{ getPageViews: () => number }>('analytics.stats');
console.log('Views:', stats?.getPageViews());

// Cleanup
await shutdownPluginSystem();
```

---

## TypeScript Types

```typescript
import type {
  PluginState,
  PluginMetadata,
  PluginDefinition,
  PluginHooks,
  PluginRegistryConfig,
  HookMode,
  HookCategory,
  HookHandler,
  HookEntry,
  HookResult,
  HookEventInfo,
  StateTransition,
  Logger,
} from '@writewhisker/plugins';
```
