# Example Plugins

This directory contains example plugins that demonstrate the capabilities of the Whisker plugin system.

## Available Examples

### 1. Custom Passage Types Plugin

**File**: `customPassageTypesPlugin.ts`

Demonstrates how to add custom passage types to the editor.

**Features**:
- Adds 4 custom passage types: Item, Character, Location, Event
- Each type has a unique icon and color
- Shows lifecycle hooks (onRegister, onUnregister)

**Custom Passage Types**:
- 📦 **Item** (red): Represents an item in the story
- 👤 **Character** (teal): Represents a character passage
- 🗺️ **Location** (green): Represents a location or scene
- ⚡ **Event** (yellow): Represents a story event or trigger

### 2. Debug Logger Plugin

**File**: `debugLoggerPlugin.ts`

Demonstrates runtime hooks for debugging and logging.

**Runtime Hooks**:
- `onInit`: Logs when plugin system initializes
- `onStoryLoad`: Logs when a story is loaded
- `onPassageEnter`: Logs when entering a passage
- `onPassageExit`: Logs when exiting a passage
- `onVariableChange`: Logs when a variable changes
- `onSave`: Logs when story is saved
- `onLoad`: Logs when story is loaded from save

**Use Cases**:
- Debugging story flow
- Monitoring variable changes
- Tracking player progress
- Development tools

### 3. Custom Actions Plugin

**File**: `customActionsPlugin.ts`

Demonstrates custom actions and conditions for interactive stories.

**Custom Actions**:
- `give-item`: Give an item to the player
- `remove-item`: Remove an item from the player
- `modify-stat`: Modify a player stat (health, strength, etc.)
- `set-flag`: Set a story flag

**Custom Conditions**:
- `has-item`: Check if player has an item
- `stat-compare`: Compare a stat to a value (gt, lt, eq, gte, lte)
- `flag-is-set`: Check if a flag is set to true
- `visited-passage`: Check if a passage has been visited

**Use Cases**:
- Inventory systems
- RPG stat management
- Conditional branching
- Achievement tracking

## Usage

### Register All Example Plugins

```typescript
import { registerExamplePlugins } from '$lib/plugins/examples';

// Register all example plugins at once
await registerExamplePlugins();
```

### Register Individual Plugins

```typescript
import { pluginStoreActions } from '$lib/plugins';
import { customPassageTypesPlugin } from '$lib/plugins/examples';

// Register a specific plugin
await pluginStoreActions.register(customPassageTypesPlugin);
```

### Use in Components

```typescript
import { passageTypes, customActions, customConditions } from '$lib/plugins';

// Access aggregated features from all plugins
$: types = $passageTypes;
$: actions = $customActions;
$: conditions = $customConditions;
```

## Creating Your Own Plugins

Use these examples as templates for creating your own plugins:

1. **Passage Types**: Start with `customPassageTypesPlugin.ts`
2. **Runtime Hooks**: Start with `debugLoggerPlugin.ts`
3. **Actions/Conditions**: Start with `customActionsPlugin.ts`

See the main plugin documentation for the full API reference.

## Plugin Development Best Practices

1. **Naming**: Use descriptive names with a consistent prefix (e.g., `my-plugin-name`)
2. **Versioning**: Follow semantic versioning (e.g., `1.0.0`)
3. **Metadata**: Always include `description` and optionally `author`
4. **Lifecycle**: Implement `onRegister` and `onUnregister` for cleanup
5. **Error Handling**: Runtime hooks should handle errors gracefully
6. **Logging**: Use console methods prefixed with plugin name for debugging
7. **Testing**: Write tests for your plugin's functionality

## Testing Example Plugins

```typescript
import { describe, it, expect } from 'vitest';
import { pluginStoreActions } from '$lib/plugins';
import { customActionsPlugin } from './customActionsPlugin';

describe('customActionsPlugin', () => {
  it('should execute give-item action', async () => {
    await pluginStoreActions.register(customActionsPlugin);

    const context = {
      storyState: {},
      variables: new Map(),
      currentPassage: null,
    };

    const action = customActionsPlugin.actions![0];
    await action.execute(context, { itemId: 'sword', itemName: 'Sword' });

    expect(context.storyState.inventory).toContain('sword');
    expect(context.variables.get('has_sword')).toBe(true);
  });
});
```
