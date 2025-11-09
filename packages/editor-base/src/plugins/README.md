# Whisker Plugin System

The Whisker Plugin System provides a powerful extensibility architecture for the editor, allowing developers to add custom functionality, passage types, actions, conditions, UI components, and runtime hooks.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Plugin Structure](#plugin-structure)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Testing](#testing)

## Overview

The plugin system consists of several key components:

1. **PluginManager**: Centralized registry and lifecycle management
2. **Plugin Store**: Svelte reactive stores for component integration
3. **EditorPlugin Interface**: Standard contract for all plugins
4. **Runtime Hooks**: Lifecycle events for plugin integration
5. **Feature Aggregation**: Automatic collection of plugin features

## Quick Start

### Creating a Plugin

```typescript
import type { EditorPlugin } from '$lib/plugins/types';

export const myPlugin: EditorPlugin = {
  // Required metadata
  name: 'my-plugin',
  version: '1.0.0',

  // Optional metadata
  author: 'Your Name',
  description: 'A brief description of what this plugin does',

  // Optional features (see sections below)
  nodeTypes: [...],
  actions: [...],
  conditions: [...],
  ui: {...},
  runtime: {...},

  // Optional lifecycle hooks
  onRegister: async () => {
    console.log('Plugin registered');
  },

  onUnregister: async () => {
    console.log('Plugin unregistered');
  },
};
```

### Registering a Plugin

```typescript
import { pluginStoreActions } from '$lib/plugins';
import { myPlugin } from './myPlugin';

// Register the plugin
await pluginStoreActions.register(myPlugin);

// Unregister when no longer needed
await pluginStoreActions.unregister('my-plugin');

// Enable/disable plugins
pluginStoreActions.setEnabled('my-plugin', false);
pluginStoreActions.setEnabled('my-plugin', true);
```

### Using Plugin Features in Components

```typescript
<script lang="ts">
  import {
    registeredPlugins,
    passageTypes,
    customActions,
    customConditions
  } from '$lib/plugins';

  // Access reactive plugin data
  $: plugins = $registeredPlugins;
  $: types = $passageTypes;
  $: actions = $customActions;
  $: conditions = $customConditions;
</script>
```

## Plugin Structure

### Metadata (Required)

```typescript
{
  name: string;        // Unique identifier (kebab-case recommended)
  version: string;     // Semantic version (e.g., "1.0.0")
  author?: string;     // Plugin author
  description?: string; // Brief description
}
```

### Custom Passage Types

Add new passage/node types to the editor:

```typescript
{
  nodeTypes: [
    {
      type: 'character',
      label: 'Character',
      icon: '👤',
      color: '#4ECDC4',
      description: 'Represents a character passage',
    },
    // ... more types
  ]
}
```

### Custom Actions

Add executable actions to the editor:

```typescript
{
  actions: [
    {
      type: 'give-item',
      label: 'Give Item',
      description: 'Give an item to the player',
      execute: async (context, params) => {
        // Action implementation
        context.variables.set('has_item', true);
      },
    },
  ]
}
```

**ActionContext**:
```typescript
{
  currentPassage: Passage | null;
  storyState: Record<string, any>;
  variables: Map<string, any>;
}
```

### Custom Conditions

Add conditional checks for story logic:

```typescript
{
  conditions: [
    {
      type: 'has-item',
      label: 'Has Item',
      description: 'Check if player has an item',
      evaluate: (context, params) => {
        return context.variables.get('has_item') === true;
      },
    },
  ]
}
```

**ConditionContext**:
```typescript
{
  currentPassage: Passage | null;
  storyState: Record<string, any>;
  variables: Map<string, any>;
}
```

### UI Extensions

Extend the editor UI with custom components:

```typescript
import MyCustomSidebar from './MyCustomSidebar.svelte';

{
  ui: {
    sidebar?: ComponentType;      // Sidebar panel
    inspector?: ComponentType;    // Inspector panel
    toolbar?: ComponentType;      // Toolbar button
    menuBar?: ComponentType;      // Menu bar item
    contextMenu?: ComponentType;  // Context menu item
  }
}
```

### Runtime Hooks

React to runtime events:

```typescript
{
  runtime: {
    onInit: async (context) => {
      // Called when plugin system initializes
    },

    onStoryLoad: async (context) => {
      // Called when a story is loaded
    },

    onPassageEnter: async (passage, context) => {
      // Called when entering a passage
    },

    onPassageExit: async (passage, context) => {
      // Called when exiting a passage
    },

    onVariableChange: (name, value, context) => {
      // Called when a variable changes
    },

    onSave: async (context) => {
      // Called when story is saved
    },

    onLoad: async (context) => {
      // Called when story is loaded from save
    },
  }
}
```

**RuntimeContext**:
```typescript
{
  storyState: Record<string, any>;
  variables: Map<string, any>;
  currentPassage: Passage | null;
  history: string[]; // Passage IDs
}
```

### Lifecycle Hooks

Manage plugin lifecycle:

```typescript
{
  onRegister: async () => {
    // Called when plugin is registered
    // Use for initialization, setup
  },

  onUnregister: async () => {
    // Called when plugin is unregistered
    // Use for cleanup, teardown
  },
}
```

## API Reference

### PluginManager

Singleton class for managing plugins:

```typescript
import { pluginManager } from '$lib/plugins';

// Register a plugin
await pluginManager.register(plugin);

// Unregister a plugin
await pluginManager.unregister('plugin-name');

// Enable/disable a plugin
pluginManager.setEnabled('plugin-name', true);

// Get plugins
const plugins = pluginManager.getPlugins(); // Only enabled
const allEntries = pluginManager.getAllPluginEntries(); // All plugins
const plugin = pluginManager.getPlugin('plugin-name');
const hasPlugin = pluginManager.hasPlugin('plugin-name');

// Get aggregated features
const types = pluginManager.getPassageTypes();
const actions = pluginManager.getActions();
const conditions = pluginManager.getConditions();
const uiExtensions = pluginManager.getUIExtensions('sidebar');

// Execute runtime hooks
await pluginManager.executeHook('onStoryLoad', context);

// Initialization
await pluginManager.initialize();
const isInitialized = pluginManager.isInitialized();
```

### Plugin Store (Reactive)

Svelte stores for component integration:

```typescript
import {
  registeredPlugins,
  allPluginEntries,
  passageTypes,
  customActions,
  customConditions,
  pluginSystemInitialized,
  pluginStoreActions,
} from '$lib/plugins';

// Reactive stores
$registeredPlugins // EditorPlugin[]
$allPluginEntries // PluginRegistryEntry[]
$passageTypes // PassageType[]
$customActions // CustomAction[]
$customConditions // CustomCondition[]
$pluginSystemInitialized // boolean

// Actions
await pluginStoreActions.register(plugin);
await pluginStoreActions.unregister('plugin-name');
pluginStoreActions.setEnabled('plugin-name', true);
pluginStoreActions.getPlugin('plugin-name');
pluginStoreActions.hasPlugin('plugin-name');
pluginStoreActions.getUIExtensions('sidebar');
await pluginStoreActions.executeHook('onStoryLoad', context);
await pluginStoreActions.initialize();
pluginStoreActions.refresh(); // Manual refresh
```

## Examples

See the [examples directory](./examples/) for complete working examples:

- **customPassageTypesPlugin**: Demonstrates custom passage types
- **debugLoggerPlugin**: Demonstrates runtime hooks
- **customActionsPlugin**: Demonstrates actions and conditions

```typescript
import { registerExamplePlugins } from '$lib/plugins/examples';

// Register all examples
await registerExamplePlugins();
```

## Best Practices

### 1. Plugin Naming

```typescript
// Good: kebab-case, descriptive
name: 'inventory-system'
name: 'custom-passage-types'

// Avoid: camelCase, unclear
name: 'inventorySystem'
name: 'plugin1'
```

### 2. Versioning

Follow semantic versioning:
- **Major**: Breaking changes (2.0.0)
- **Minor**: New features, backward compatible (1.1.0)
- **Patch**: Bug fixes (1.0.1)

### 3. Error Handling

```typescript
runtime: {
  onStoryLoad: async (context) => {
    try {
      // Your code
    } catch (error) {
      console.error('[MyPlugin] Error in onStoryLoad:', error);
      // Don't throw - let other plugins run
    }
  }
}
```

### 4. Logging

Use consistent prefixes:

```typescript
console.log('[MyPlugin] Initialized');
console.error('[MyPlugin] Error:', error);
```

### 5. Cleanup

Always clean up in `onUnregister`:

```typescript
let interval: NodeJS.Timeout;

onRegister: () => {
  interval = setInterval(() => {
    // Do something
  }, 1000);
},

onUnregister: () => {
  if (interval) {
    clearInterval(interval);
  }
}
```

### 6. Type Safety

Use TypeScript for type safety:

```typescript
import type {
  EditorPlugin,
  ActionContext,
  ConditionContext
} from '$lib/plugins/types';

export const myPlugin: EditorPlugin = {
  // TypeScript will enforce correct structure
};
```

## Testing

### Unit Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '$lib/plugins/PluginManager';
import { pluginStoreActions } from '$lib/plugins';
import { myPlugin } from './myPlugin';

describe('myPlugin', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  it('should register successfully', async () => {
    await pluginStoreActions.register(myPlugin);
    expect(pluginManager.hasPlugin('my-plugin')).toBe(true);
  });

  it('should execute actions', async () => {
    await pluginStoreActions.register(myPlugin);

    const context = {
      storyState: {},
      variables: new Map(),
      currentPassage: null,
    };

    const action = myPlugin.actions![0];
    await action.execute(context, { /* params */ });

    // Assert expected behavior
    expect(context.variables.get('some_var')).toBe(true);
  });
});
```

### Integration Testing

```typescript
it('should work with other plugins', async () => {
  await pluginStoreActions.register(plugin1);
  await pluginStoreActions.register(plugin2);

  const types = pluginManager.getPassageTypes();
  expect(types.length).toBe(8); // 4 from each plugin
});
```

## Architecture

### File Structure

```
src/lib/plugins/
├── PluginManager.ts       # Core manager class
├── PluginManager.test.ts  # Manager tests
├── types.ts               # TypeScript type definitions
├── index.ts               # Main exports
├── examples/              # Example plugins
│   ├── customPassageTypesPlugin.ts
│   ├── debugLoggerPlugin.ts
│   ├── customActionsPlugin.ts
│   ├── examples.test.ts
│   ├── index.ts
│   └── README.md
└── README.md              # This file

src/lib/stores/
└── pluginStore.ts         # Svelte reactive stores
```

### Data Flow

```
Plugin Registration
     ↓
PluginManager (singleton)
     ↓
Plugin Store (reactive)
     ↓
Components (UI)
```

## Troubleshooting

### Plugin Not Showing Up

```typescript
// Check if registered
console.log(pluginStoreActions.hasPlugin('my-plugin')); // true?

// Check if enabled
const entries = $allPluginEntries;
const myEntry = entries.find(e => e.plugin.name === 'my-plugin');
console.log(myEntry?.enabled); // true?

// Force refresh (rare)
pluginStoreActions.refresh();
```

### Runtime Hooks Not Executing

```typescript
// Ensure plugin system is initialized
console.log($pluginSystemInitialized); // true?

// Check plugin has runtime hooks
const plugin = pluginStoreActions.getPlugin('my-plugin');
console.log(plugin?.runtime); // defined?

// Execute manually for testing
await pluginStoreActions.executeHook('onStoryLoad', context);
```

## Future Enhancements

- Plugin dependencies and versioning
- Plugin marketplace/registry
- Hot reload for development
- Plugin sandboxing for security
- Plugin configuration UI
- Plugin analytics/telemetry

## Support

For questions, issues, or contributions:
- File issues on GitHub
- See example plugins for reference
- Check the Phase 0 implementation docs
