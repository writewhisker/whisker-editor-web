# Whisker Plugin Development Guide

**Version:** 2.0
**Last Updated:** 2025-11-13

## Table of Contents

1. [Introduction](#introduction)
2. [Plugin Basics](#plugin-basics)
3. [Plugin Structure](#plugin-structure)
4. [Runtime Hooks](#runtime-hooks)
5. [SaaS Extensions](#saas-extensions)
6. [UI Extensions](#ui-extensions)
7. [Custom Actions & Conditions](#custom-actions--conditions)
8. [Testing Plugins](#testing-plugins)
9. [Publishing Plugins](#publishing-plugins)
10. [Examples](#examples)

---

## Introduction

Whisker's plugin system allows you to extend the editor with custom functionality. Plugins can:

- Add custom passage types
- Implement custom actions and conditions
- Extend the UI with new panels and tools
- Hook into the story runtime
- Integrate with SaaS backends (for SaaS application and similar products)

### Plugin Types

- **IF Extensions**: Add gameplay features (inventory, combat, achievements)
- **Editor Tools**: Enhance the authoring experience (analytics, AI writing)
- **SaaS Integrations**: Connect to external services (analytics, billing, storage)

---

## Plugin Basics

### Minimal Plugin

```typescript
import type { EditorPlugin } from '@whisker/editor-base/plugins';

export const myPlugin: EditorPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'A simple plugin',

  onRegister: async () => {
    console.log('Plugin registered!');
  },
};
```

### Registering a Plugin

```typescript
import { pluginManager } from '@whisker/editor-base/plugins';
import { myPlugin } from './myPlugin';

// Register plugin
await pluginManager.register(myPlugin);

// Check if registered
const isRegistered = pluginManager.getPlugin('my-plugin') !== null;

// Unregister plugin
await pluginManager.unregister('my-plugin');
```

---

## Plugin Structure

```typescript
export interface EditorPlugin {
  // Required metadata
  name: string;
  version: string;

  // Optional metadata
  author?: string;
  description?: string;

  // Features
  nodeTypes?: PassageType[];
  actions?: CustomAction[];
  conditions?: CustomCondition[];
  ui?: PluginUIExtensions;
  runtime?: PluginRuntimeHooks;

  // SaaS extensions (for SaaS application, etc.)
  saas?: SaaSPluginExtensions;

  // Lifecycle hooks
  onRegister?: () => void | Promise<void>;
  onUnregister?: () => void | Promise<void>;
}
```

---

## Runtime Hooks

Runtime hooks let you execute code during story playback.

### Available Hooks

#### Story Lifecycle

```typescript
runtime: {
  // Called when story loads
  onInit: async (context) => {
    console.log('Story initialized');
    console.log('Current passage:', context.currentPassage);
    console.log('Variables:', context.variables);
  },

  // Called when story data is loaded
  onStoryLoad: async (context) => {
    console.log('Story loaded:', context.storyState);
  },

  // Called when story is saved
  onSave: async (context) => {
    console.log('Saving story...');
  },

  // Called when story is loaded from save
  onLoad: async (context) => {
    console.log('Loading story...');
  },
}
```

#### Passage Navigation

```typescript
runtime: {
  // Called when entering a passage
  onPassageEnter: async (passage, context) => {
    console.log(`Entered: ${passage.title}`);

    // Track analytics
    trackPageView(passage.title);

    // Update state
    context.storyState.lastVisited = passage.id;
  },

  // Called when leaving a passage
  onPassageExit: async (passage, context) => {
    console.log(`Left: ${passage.title}`);
  },
}
```

#### State Changes

```typescript
runtime: {
  // Called when a variable changes
  onVariableChange: (name, value, context) => {
    console.log(`Variable changed: ${name} = ${value}`);

    // React to specific variables
    if (name === 'score' && value > 100) {
      console.log('High score achieved!');
    }
  },
}
```

### SaaS-Specific Hooks

For SaaS application and similar products:

```typescript
runtime: {
  // Called when a flow/project is created
  onProjectCreate: async (projectId, context) => {
    console.log('Project created:', projectId);

    // Track in analytics
    analytics.track('Flow Created', {
      projectId,
      userId: context.userId,
    });
  },

  // Called when flow is published
  onPublish: async (publishUrl, context) => {
    console.log('Published to:', publishUrl);

    // Send to backend
    await api.post('/flows/publish', {
      url: publishUrl,
      projectId: context.projectId,
    });
  },

  // Called when user is identified
  onUserIdentify: async (userId, traits) => {
    // Send to analytics provider
    segment.identify(userId, traits);
  },

  // Called for custom analytics events
  onAnalyticsEvent: async (eventName, properties) => {
    // Track custom events
    segment.track(eventName, properties);
  },
}
```

---

## SaaS Extensions

SaaS extensions enable SaaS application-style features.

### Permissions & Access Control

```typescript
saas: {
  permissions: {
    // Require specific plan
    requiredPlan: 'pro',

    // Require specific features
    requiredFeatures: ['analytics', 'team-collaboration'],

    // Custom access check
    checkAccess: async (user) => {
      return user.subscription.plan === 'pro' ||
             user.subscription.plan === 'enterprise';
    },
  },
}
```

### Settings Schema

```typescript
saas: {
  settings: {
    schema: {
      apiKey: {
        type: 'string',
        label: 'API Key',
        description: 'Your service API key',
        required: true,
        validation: (value) => {
          if (value.length < 20) {
            return 'API key must be at least 20 characters';
          }
          return true;
        },
      },
      enableTracking: {
        type: 'boolean',
        label: 'Enable Tracking',
        default: true,
      },
      maxEvents: {
        type: 'number',
        label: 'Max Events',
        description: 'Maximum events to track per session',
        default: 1000,
      },
    },

    defaults: {
      enableTracking: true,
      maxEvents: 1000,
    },

    validateSettings: (settings) => {
      if (!settings.apiKey) {
        return { valid: false, errors: ['API key is required'] };
      }
      return true;
    },
  },
}
```

### Storage Integration

```typescript
saas: {
  storage: {
    // Save plugin data
    save: async (data, context) => {
      await supabase
        .from('plugin_data')
        .upsert({
          user_id: context.userId,
          project_id: context.projectId,
          plugin_id: context.pluginId,
          data,
        });
    },

    // Load plugin data
    load: async (context) => {
      const { data } = await supabase
        .from('plugin_data')
        .select('data')
        .eq('user_id', context.userId)
        .eq('project_id', context.projectId)
        .eq('plugin_id', context.pluginId)
        .single();

      return data;
    },

    // Delete plugin data
    delete: async (context) => {
      await supabase
        .from('plugin_data')
        .delete()
        .eq('user_id', context.userId)
        .eq('project_id', context.projectId)
        .eq('plugin_id', context.pluginId);
    },
  },
}
```

### Backend API Integration

```typescript
saas: {
  api: {
    endpoints: {
      // Define custom API endpoints
      getAnalytics: async (params) => {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json();
      },

      trackEvent: async (params) => {
        await fetch('/api/track', {
          method: 'POST',
          body: JSON.stringify({
            event: params.event,
            properties: params.properties,
          }),
        });
      },
    },
  },
}
```

---

## UI Extensions

Plugins can add custom UI panels and components.

### Sidebar Panel

```svelte
<!-- MyPluginPanel.svelte -->
<script lang="ts">
  import { Button } from '@whisker/shared-ui/components';

  let status = $state('Ready');

  function doSomething() {
    status = 'Working...';
    // Do work
    setTimeout(() => {
      status = 'Done!';
    }, 1000);
  }
</script>

<div class="plugin-panel">
  <h3>My Plugin</h3>
  <p>Status: {status}</p>
  <Button onclick={doSomething}>Do Something</Button>
</div>
```

```typescript
import MyPluginPanel from './MyPluginPanel.svelte';

export const myPlugin: EditorPlugin = {
  name: 'my-plugin',
  version: '1.0.0',

  ui: {
    sidebar: MyPluginPanel,
  },
};
```

### Available UI Extension Points

```typescript
ui: {
  sidebar?: ComponentType;      // Right sidebar panel
  inspector?: ComponentType;    // Properties inspector
  toolbar?: ComponentType;      // Top toolbar
  menuBar?: ComponentType;      // Menu bar
  contextMenu?: ComponentType;  // Right-click context menu
}
```

---

## Custom Actions & Conditions

### Custom Actions

```typescript
actions: [
  {
    type: 'give-item',
    label: 'Give Item',
    description: 'Add item to player inventory',

    execute: async (context, params) => {
      const { itemId, quantity = 1 } = params;

      // Get current inventory
      const inventory = context.variables.get('inventory') || [];

      // Add item
      inventory.push({ itemId, quantity });

      // Update variable
      context.variables.set('inventory', inventory);

      console.log(`Gave ${quantity}x ${itemId}`);
    },
  },

  {
    type: 'play-sound',
    label: 'Play Sound',
    description: 'Play a sound effect',

    execute: async (context, params) => {
      const { soundUrl, volume = 1.0 } = params;

      const audio = new Audio(soundUrl);
      audio.volume = volume;
      await audio.play();
    },
  },
]
```

### Custom Conditions

```typescript
conditions: [
  {
    type: 'has-item',
    label: 'Has Item',
    description: 'Check if player has item',

    evaluate: (context, params) => {
      const { itemId, quantity = 1 } = params;
      const inventory = context.variables.get('inventory') || [];

      const item = inventory.find(i => i.itemId === itemId);
      return item && item.quantity >= quantity;
    },
  },

  {
    type: 'visited-passage',
    label: 'Visited Passage',
    description: 'Check if passage was visited',

    evaluate: (context, params) => {
      const { passageId } = params;
      return context.history?.includes(passageId) || false;
    },
  },
]
```

---

## Testing Plugins

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { myPlugin } from './myPlugin';
import { pluginManager } from '@whisker/editor-base/plugins';

describe('My Plugin', () => {
  it('should register successfully', async () => {
    await pluginManager.register(myPlugin);

    const registered = pluginManager.getPlugin('my-plugin');
    expect(registered).toBeDefined();
    expect(registered?.version).toBe('1.0.0');
  });

  it('should execute custom action', async () => {
    const action = myPlugin.actions?.[0];
    expect(action).toBeDefined();

    const context = {
      currentPassage: null,
      storyState: {},
      variables: new Map(),
    };

    await action?.execute(context, { itemId: 'sword', quantity: 1 });

    const inventory = context.variables.get('inventory');
    expect(inventory).toHaveLength(1);
    expect(inventory[0].itemId).toBe('sword');
  });

  it('should evaluate custom condition', () => {
    const condition = myPlugin.conditions?.[0];
    expect(condition).toBeDefined();

    const context = {
      currentPassage: null,
      storyState: {},
      variables: new Map([
        ['inventory', [{ itemId: 'sword', quantity: 1 }]]
      ]),
      history: [],
    };

    const result = condition?.evaluate(context, { itemId: 'sword' });
    expect(result).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Plugin Integration', () => {
  it('should work with SaaS application', async () => {
    // Register plugin
    await pluginManager.register(saas-applicationAnalyticsPlugin);

    // Simulate user identification
    const userId = 'user-123';
    const traits = { email: 'user@example.com', plan: 'pro' };

    // Call hook
    await saas-applicationAnalyticsPlugin.runtime?.onUserIdentify?.(userId, traits);

    // Verify analytics were sent
    // (mock analytics.identify)
  });
});
```

---

## Publishing Plugins

### NPM Package

```json
// package.json
{
  "name": "@myorg/whisker-plugin-analytics",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "@whisker/editor-base": "^0.1.0"
  }
}
```

```typescript
// src/index.ts
export { analyticsPlugin } from './plugin';
export type { AnalyticsSettings } from './types';
```

### Usage by Consumers

```typescript
// In SaaS application or other app
import { analyticsPlugin } from '@myorg/whisker-plugin-analytics';
import { pluginManager } from '@whisker/editor-base/api';

await pluginManager.register(analyticsPlugin);
```

---

## Examples

### Complete SaaS application Analytics Plugin

See: `packages/editor-base/src/plugins/examples/saas-application-analytics-plugin.ts`

### Inventory System Plugin

```typescript
export const inventoryPlugin: EditorPlugin = {
  name: 'inventory-system',
  version: '1.0.0',
  description: 'Simple inventory management',

  actions: [
    {
      type: 'add-item',
      label: 'Add Item',
      execute: (context, { item, quantity = 1 }) => {
        const inventory = context.variables.get('inventory') || {};
        inventory[item] = (inventory[item] || 0) + quantity;
        context.variables.set('inventory', inventory);
      },
    },
    {
      type: 'remove-item',
      label: 'Remove Item',
      execute: (context, { item, quantity = 1 }) => {
        const inventory = context.variables.get('inventory') || {};
        inventory[item] = Math.max(0, (inventory[item] || 0) - quantity);
        context.variables.set('inventory', inventory);
      },
    },
  ],

  conditions: [
    {
      type: 'has-item',
      label: 'Has Item',
      evaluate: (context, { item, quantity = 1 }) => {
        const inventory = context.variables.get('inventory') || {};
        return (inventory[item] || 0) >= quantity;
      },
    },
  ],

  runtime: {
    onInit: (context) => {
      // Initialize empty inventory
      if (!context.variables.has('inventory')) {
        context.variables.set('inventory', {});
      }
    },
  },
};
```

---

## Best Practices

### 1. Namespacing

Use unique prefixes for your plugin's actions, conditions, and variables:

```typescript
// Good
type: 'myplugin:give-item'

// Bad
type: 'give-item'  // May conflict with other plugins
```

### 2. Error Handling

Always handle errors gracefully:

```typescript
runtime: {
  onPassageEnter: async (passage, context) => {
    try {
      await trackAnalytics(passage);
    } catch (error) {
      console.error('Analytics error:', error);
      // Don't throw - let story continue
    }
  },
}
```

### 3. Performance

Avoid blocking operations in hooks:

```typescript
// Good - non-blocking
onPassageEnter: async (passage, context) => {
  trackAnalytics(passage).catch(console.error);  // Fire and forget
},

// Bad - blocking
onPassageEnter: async (passage, context) => {
  await heavyComputation();  // Blocks passage transition
},
```

### 4. Cleanup

Always clean up resources:

```typescript
onUnregister: async () => {
  // Close connections
  analyticsClient.close();

  // Remove event listeners
  window.removeEventListener('beforeunload', handler);

  // Clear timers
  clearInterval(pollingInterval);
},
```

---

## Resources

- [Plugin System Types](../packages/editor-base/src/plugins/types.ts)
- [Example Plugins](../packages/editor-base/src/plugins/examples/)
- [SaaS application Architecture](../../whisker-implementation/phases/guides/ONBOARDFLOW_ARCHITECTURE.md)

---

**Happy Plugin Development!** 🔌✨
