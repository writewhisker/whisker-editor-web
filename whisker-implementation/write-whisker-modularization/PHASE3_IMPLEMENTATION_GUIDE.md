# Phase 3: Extract IF Extensions - Implementation Guide

## Overview

Phase 3 packages Interactive Fiction specific features as plugins in `@whisker/if-extensions`.

**Prerequisites**: Phases 0, 1, 2 complete (Plugin system ready)

**Timeline**: 1 week (Week 9)
**PRs**: 3 (PRs #28-30)
**Effort**: 6-10 developer-days

---

# PR #28: Create @whisker/if-extensions Package

**Goal**: Extract IF features from editor-base and package as plugins

**Estimated Effort**: 3-4 days
**Lines Changed**: ~300
**Risk**: LOW

## Package Structure

```
packages/if-extensions/
├── src/
│   ├── inventory/
│   │   ├── models/
│   │   │   └── InventoryItem.ts
│   │   ├── runtime/
│   │   │   └── InventorySystem.ts
│   │   ├── components/
│   │   │   ├── InventoryPanel.svelte
│   │   │   └── InventoryEditor.svelte
│   │   ├── plugin.ts
│   │   └── index.ts
│   ├── stats/
│   │   ├── models/
│   │   │   └── StatDefinition.ts
│   │   ├── runtime/
│   │   │   └── StatsSystem.ts
│   │   ├── components/
│   │   │   ├── StatsPanel.svelte
│   │   │   └── StatsEditor.svelte
│   │   ├── plugin.ts
│   │   └── index.ts
│   ├── combat/
│   │   ├── models/
│   │   │   └── CombatAction.ts
│   │   ├── runtime/
│   │   │   └── CombatSystem.ts
│   │   ├── components/
│   │   │   ├── CombatUI.svelte
│   │   │   └── CombatEditor.svelte
│   │   ├── plugin.ts
│   │   └── index.ts
│   ├── saveload/
│   │   ├── runtime/
│   │   │   └── SaveSystem.ts (enhanced from saveSystemStore)
│   │   ├── components/
│   │   │   └── SavePanel.svelte (from SaveSystemPanel)
│   │   ├── plugin.ts
│   │   └── index.ts
│   ├── achievements/
│   │   ├── runtime/
│   │   │   └── AchievementSystem.ts (from achievementStore)
│   │   ├── components/
│   │   │   └── AchievementPanel.svelte
│   │   ├── plugin.ts
│   │   └── index.ts
│   ├── characters/
│   │   ├── runtime/
│   │   │   └── CharacterSystem.ts (from characterStore)
│   │   ├── components/
│   │   │   └── CharacterManager.svelte
│   │   ├── plugin.ts
│   │   └── index.ts
│   ├── difficulty/
│   │   ├── runtime/
│   │   │   └── DifficultySystem.ts (from adaptiveDifficultyStore)
│   │   ├── components/
│   │   │   └── DifficultyPanel.svelte
│   │   ├── plugin.ts
│   │   └── index.ts
│   └── index.ts
├── tests/
│   ├── inventory/ (20 tests)
│   ├── stats/ (20 tests)
│   ├── combat/ (20 tests)
│   ├── saveload/ (existing tests)
│   ├── achievements/ (existing tests)
│   ├── characters/ (existing tests)
│   └── difficulty/ (existing tests)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Package Configuration

### `packages/if-extensions/package.json`

```json
{
  "name": "@whisker/if-extensions",
  "version": "0.1.0",
  "description": "Interactive Fiction extensions for Whisker - inventory, stats, combat, save/load",
  "license": "AGPL-3.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./inventory": {
      "types": "./dist/inventory/index.d.ts",
      "import": "./dist/inventory/index.js"
    },
    "./stats": {
      "types": "./dist/stats/index.d.ts",
      "import": "./dist/stats/index.js"
    },
    "./combat": {
      "types": "./dist/combat/index.d.ts",
      "import": "./dist/combat/index.js"
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
    "test:watch": "vitest",
    "check": "svelte-check && tsc --noEmit"
  },
  "dependencies": {
    "@whisker/core-ts": "workspace:*",
    "@whisker/editor-base": "workspace:*",
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@testing-library/svelte": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/writewhisker/whisker-editor-web.git",
    "directory": "packages/if-extensions"
  }
}
```

## Move Existing IF Features

### From editor-base to if-extensions:

```bash
# Move stores to runtime systems
mv packages/editor-base/src/stores/saveSystemStore.ts packages/if-extensions/src/saveload/runtime/SaveSystem.ts
mv packages/editor-base/src/stores/achievementStore.ts packages/if-extensions/src/achievements/runtime/AchievementSystem.ts
mv packages/editor-base/src/stores/characterStore.ts packages/if-extensions/src/characters/runtime/CharacterSystem.ts
mv packages/editor-base/src/stores/adaptiveDifficultyStore.ts packages/if-extensions/src/difficulty/runtime/DifficultySystem.ts

# Move components
mv packages/editor-base/src/components/SaveSystemPanel.svelte packages/if-extensions/src/saveload/components/SavePanel.svelte
mv packages/editor-base/src/components/AchievementPanel.svelte packages/if-extensions/src/achievements/components/
mv packages/editor-base/src/components/CharacterManager.svelte packages/if-extensions/src/characters/components/
mv packages/editor-base/src/components/AdaptiveDifficultyPanel.svelte packages/if-extensions/src/difficulty/components/DifficultyPanel.svelte
```

## Plugin Definitions

### `packages/if-extensions/src/inventory/plugin.ts`

```typescript
import type { EditorPlugin } from '@whisker/editor-base';
import InventoryPanel from './components/InventoryPanel.svelte';
import InventoryEditor from './components/InventoryEditor.svelte';
import { InventorySystem } from './runtime/InventorySystem';

export const inventoryPlugin: EditorPlugin = {
  name: 'inventory',
  version: '1.0.0',
  author: 'WriteWhisker',
  description: 'Inventory management system for interactive fiction',

  nodeTypes: [
    {
      type: 'item-pickup',
      label: 'Item Pickup',
      icon: 'package',
      color: '#4CAF50',
      description: 'Add an item to the player inventory',
    },
    {
      type: 'item-use',
      label: 'Use Item',
      icon: 'hand-paper',
      color: '#FF9800',
      description: 'Use an item from inventory',
    },
  ],

  actions: [
    {
      type: 'add-to-inventory',
      label: 'Add to Inventory',
      description: 'Add an item to the player inventory',
      execute: async (context, params) => {
        const inventory = context.storyState.inventorySystem as InventorySystem;
        if (inventory) {
          inventory.addItem(params.item, params.quantity || 1);
        }
      },
    },
    {
      type: 'remove-from-inventory',
      label: 'Remove from Inventory',
      description: 'Remove an item from inventory',
      execute: async (context, params) => {
        const inventory = context.storyState.inventorySystem as InventorySystem;
        if (inventory) {
          inventory.removeItem(params.itemId, params.quantity || 1);
        }
      },
    },
  ],

  conditions: [
    {
      type: 'has-item',
      label: 'Has Item',
      description: 'Check if player has an item',
      evaluate: (context, params) => {
        const inventory = context.storyState.inventorySystem as InventorySystem;
        if (!inventory) return false;
        const item = inventory.getItems({ id: params.itemId })[0];
        return item !== undefined && item.quantity >= (params.quantity || 1);
      },
    },
  ],

  ui: {
    sidebar: InventoryPanel,
    inspector: InventoryEditor,
  },

  runtime: {
    onInit: (context) => {
      // Initialize inventory system
      context.storyState.inventorySystem = new InventorySystem();
      console.log('Inventory system initialized');
    },
    onPassageEnter: (passage, context) => {
      // Auto-pickup items in passage tags?
      const inventory = context.storyState.inventorySystem as InventorySystem;
      if (inventory && passage.tags.includes('auto-pickup')) {
        // Handle auto-pickup logic
      }
    },
  },
};
```

### Similar plugins for:
- `stats/plugin.ts`
- `combat/plugin.ts`
- `saveload/plugin.ts`
- `achievements/plugin.ts`
- `characters/plugin.ts`
- `difficulty/plugin.ts`

## Main Package Export

### `packages/if-extensions/src/index.ts`

```typescript
/**
 * @whisker/if-extensions
 *
 * Interactive Fiction extensions for Whisker.
 * All features packaged as plugins.
 */

// Plugins
export { inventoryPlugin } from './inventory/plugin';
export { statsPlugin } from './stats/plugin';
export { combatPlugin } from './combat/plugin';
export { saveloadPlugin } from './saveload/plugin';
export { achievementsPlugin } from './achievements/plugin';
export { charactersPlugin } from './characters/plugin';
export { difficultyPlugin } from './difficulty/plugin';

// Convenience: All plugins bundle
export const ifExtensionsPlugins = [
  inventoryPlugin,
  statsPlugin,
  combatPlugin,
  saveloadPlugin,
  achievementsPlugin,
  charactersPlugin,
  difficultyPlugin,
];

// Export systems for advanced use
export * from './inventory';
export * from './stats';
export * from './combat';
export * from './saveload';
export * from './achievements';
export * from './characters';
export * from './difficulty';
```

---

# PR #29: Add IF Plugin Integration Tests

**Goal**: Test all IF plugins working together

**Estimated Effort**: 2-3 days
**Lines Changed**: ~150
**Risk**: LOW

## Integration Tests

### `packages/if-extensions/tests/integration/plugins.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '@whisker/editor-base';
import { ifExtensionsPlugins } from '../src';
import { Story } from '@whisker/core-ts';

describe('IF Extensions Integration', () => {
  beforeEach(() => {
    pluginManager.clear();
  });

  it('should register all IF plugins', async () => {
    for (const plugin of ifExtensionsPlugins) {
      await pluginManager.register(plugin);
    }

    expect(pluginManager.getPluginCount()).toBe(7);
  });

  it('should provide all passage types', async () => {
    for (const plugin of ifExtensionsPlugins) {
      await pluginManager.register(plugin);
    }

    const passageTypes = pluginManager.getPassageTypes();
    expect(passageTypes.length).toBeGreaterThan(0);
    expect(passageTypes.some(t => t.type === 'item-pickup')).toBe(true);
  });

  it('should provide all custom actions', async () => {
    for (const plugin of ifExtensionsPlugins) {
      await pluginManager.register(plugin);
    }

    const actions = pluginManager.getActions();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some(a => a.type === 'add-to-inventory')).toBe(true);
  });

  it('should provide all custom conditions', async () => {
    for (const plugin of ifExtensionsPlugins) {
      await pluginManager.register(plugin);
    }

    const conditions = pluginManager.getConditions();
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions.some(c => c.type === 'has-item')).toBe(true);
  });

  it('should initialize all runtime systems', async () => {
    for (const plugin of ifExtensionsPlugins) {
      await pluginManager.register(plugin);
    }

    const context = {
      storyState: {},
      variables: new Map(),
      currentPassage: null,
      history: [],
    };

    await pluginManager.executeHook('onInit', context);

    expect(context.storyState.inventorySystem).toBeDefined();
    expect(context.storyState.statsSystem).toBeDefined();
    expect(context.storyState.combatSystem).toBeDefined();
  });
});
```

### Add edge case tests:
- Plugin conflicts
- Circular dependencies
- Runtime errors
- Save/load with plugins

---

# PR #30: IF Extensions Documentation

**Goal**: Complete API documentation and usage examples

**Estimated Effort**: 1-2 days
**Lines Changed**: ~100
**Risk**: LOW

## Documentation

### `packages/if-extensions/README.md`

```markdown
# @whisker/if-extensions

Interactive Fiction extensions for Whisker - inventory, stats, combat, save/load, achievements, and more.

## Features

- 📦 **Inventory System** - Items, stacking, weight limits
- 📊 **Stats System** - Character stats with formulas
- ⚔️ **Combat System** - Turn-based combat
- 💾 **Save/Load System** - Multiple save slots
- 🏆 **Achievements** - Unlockable achievements
- 👥 **Character System** - NPCs and entities
- 📈 **Adaptive Difficulty** - Dynamic difficulty adjustment

## Installation

\`\`\`bash
npm install @whisker/if-extensions
\`\`\`

## Quick Start

\`\`\`typescript
import { pluginManager } from '@whisker/editor-base';
import {
  inventoryPlugin,
  statsPlugin,
  combatPlugin,
  ifExtensionsPlugins, // All plugins
} from '@whisker/if-extensions';

// Register individual plugins
await pluginManager.register(inventoryPlugin);
await pluginManager.register(statsPlugin);

// Or register all at once
for (const plugin of ifExtensionsPlugins) {
  await pluginManager.register(plugin);
}

// Initialize plugins
await pluginManager.initialize();
\`\`\`

## Inventory System

### Define Items

\`\`\`typescript
import { InventoryItem } from '@whisker/if-extensions/inventory';

const sword: InventoryItem = {
  id: 'sword-1',
  name: 'Iron Sword',
  description: 'A sturdy iron sword',
  weight: 5,
  value: 100,
  stackable: false,
  consumable: false,
  tags: ['weapon', 'melee'],
};
\`\`\`

### Use in Stories

In passage content:
\`\`\`
You find a sword on the ground.

[[Pick it up->PickupSword]]
\`\`\`

In PickupSword passage (with item-pickup type):
\`\`\`
You pick up the sword.

<<add-to-inventory itemId="sword-1" quantity=1>>
\`\`\`

## Stats System

### Define Stats

\`\`\`typescript
const strength: StatDefinition = {
  id: 'strength',
  name: 'Strength',
  category: 'primary',
  baseValue: 10,
  minValue: 1,
  maxValue: 20,
};

const attackPower: StatDefinition = {
  id: 'attack',
  name: 'Attack Power',
  category: 'derived',
  baseValue: 0,
  formula: 'strength * 2 + level',
};
\`\`\`

## Combat System

### Start Combat

\`\`\`typescript
combatSystem.startCombat([player, enemy]);

const action: CombatAction = {
  type: 'attack',
  actorId: 'player',
  targetId: 'enemy',
  damage: 10,
};

const result = combatSystem.executeAction(action);
\`\`\`

## API Documentation

See [full API docs](../../docs/api/if-extensions.md) for detailed documentation.

## License

AGPL-3.0
```

### Create Examples

Create `packages/if-extensions/examples/` with:
- inventory-example.ts
- stats-example.ts
- combat-example.ts
- integration-example.ts

---

# Phase 3 Summary

### Package: @whisker/if-extensions

**Contains**:
- ✅ Inventory system (models, runtime, UI, plugin)
- ✅ Stats system (models, runtime, UI, plugin)
- ✅ Combat system (models, runtime, UI, plugin)
- ✅ Save/Load system (enhanced)
- ✅ Achievements system
- ✅ Character system
- ✅ Adaptive difficulty

**Tests**: ~16 test files, ~300 tests
**Lines**: ~12,000 lines of code
**Dependencies**: @whisker/core-ts, @whisker/editor-base

### All Plugins

1. **inventoryPlugin** - Item management
2. **statsPlugin** - Character stats
3. **combatPlugin** - Turn-based combat
4. **saveloadPlugin** - Save system
5. **achievementsPlugin** - Achievements
6. **charactersPlugin** - NPC management
7. **difficultyPlugin** - Adaptive difficulty

### Success Criteria

- ✅ All 7 plugins registered successfully
- ✅ All ~300 tests pass
- ✅ Plugins integrate with editor
- ✅ Runtime systems work correctly
- ✅ UI components render
- ✅ Documentation complete

---

**Next**: Phase 4 - Extract Shared UI & Publish
