# Plugin-Enhanced Story

A complete example showing how to enhance stories with plugins.

## Setup

```typescript
import { initializePluginSystem, STORY, PASSAGE, CHOICE } from '@writewhisker/plugins';

// Initialize plugin system
const registry = initializePluginSystem({
  autoInitialize: true,
  autoEnable: true,
});
```

## Inventory Plugin

```typescript
await registry.register({
  metadata: {
    name: 'inventory',
    version: '1.0.0',
    description: 'Player inventory management',
  },
  hooks: {
    on_init: (ctx) => {
      ctx.setData('items', []);
    },
    on_story_start: () => {
      console.log('Inventory cleared for new game');
    },
    on_passage_render: (html, passage) => {
      // Add inventory display to passages
      const items = registry.getPluginContext('inventory')?.getData<string[]>('items') || [];
      const inventoryHtml = `
        <div class="inventory">
          <h3>Inventory</h3>
          <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
      `;
      return html + inventoryHtml;
    },
  },
  apis: {
    items: {
      add: (item: string) => {
        const ctx = registry.getPluginContext('inventory')!;
        const items = ctx.getData<string[]>('items') || [];
        items.push(item);
        ctx.setData('items', items);
        console.log(`Added: ${item}`);
      },
      remove: (item: string) => {
        const ctx = registry.getPluginContext('inventory')!;
        const items = ctx.getData<string[]>('items') || [];
        const index = items.indexOf(item);
        if (index > -1) {
          items.splice(index, 1);
          ctx.setData('items', items);
        }
      },
      has: (item: string): boolean => {
        const ctx = registry.getPluginContext('inventory')!;
        const items = ctx.getData<string[]>('items') || [];
        return items.includes(item);
      },
      list: (): string[] => {
        const ctx = registry.getPluginContext('inventory')!;
        return ctx.getData<string[]>('items') || [];
      },
    },
  },
});

// Usage
const inventory = registry.getApi<{
  add: (item: string) => void;
  has: (item: string) => boolean;
}>('inventory.items');

inventory?.add('sword');
inventory?.add('health potion');
console.log(inventory?.has('sword')); // true
```

## Achievement Plugin

```typescript
await registry.register({
  metadata: {
    name: 'achievements',
    version: '1.0.0',
    description: 'Track player achievements',
  },
  hooks: {
    on_init: (ctx) => {
      ctx.setData('unlocked', new Set<string>());
      ctx.setData('definitions', new Map<string, { name: string; description: string }>());
    },
    on_passage_enter: (passage) => {
      const ctx = registry.getPluginContext('achievements')!;

      // Check passage-based achievements
      if (passage.id === 'secret-ending') {
        unlock('secret_discoverer');
      }
    },
    on_choice_select: (choice) => {
      const ctx = registry.getPluginContext('achievements')!;

      // Track choice-based achievements
      if (choice.id === 'help-stranger') {
        unlock('good_samaritan');
      }
    },
  },
  apis: {
    achievements: {
      define: (id: string, name: string, description: string) => {
        const ctx = registry.getPluginContext('achievements')!;
        const definitions = ctx.getData<Map<string, any>>('definitions')!;
        definitions.set(id, { name, description });
      },
      unlock: (id: string) => {
        const ctx = registry.getPluginContext('achievements')!;
        const unlocked = ctx.getData<Set<string>>('unlocked')!;
        if (!unlocked.has(id)) {
          unlocked.add(id);
          const definitions = ctx.getData<Map<string, any>>('definitions')!;
          const achievement = definitions.get(id);
          if (achievement) {
            showNotification(`Achievement Unlocked: ${achievement.name}`);
          }
        }
      },
      isUnlocked: (id: string): boolean => {
        const ctx = registry.getPluginContext('achievements')!;
        const unlocked = ctx.getData<Set<string>>('unlocked')!;
        return unlocked.has(id);
      },
    },
  },
});

// Define achievements
const achievements = registry.getApi<any>('achievements.achievements');
achievements?.define('first_steps', 'First Steps', 'Started your adventure');
achievements?.define('good_samaritan', 'Good Samaritan', 'Helped a stranger in need');
achievements?.define('secret_discoverer', 'Secret Discoverer', 'Found a hidden ending');
```

## Analytics Plugin

```typescript
await registry.register({
  metadata: {
    name: 'analytics',
    version: '1.0.0',
    description: 'Track player behavior',
    priority: 10, // Run early
  },
  hooks: {
    on_init: (ctx) => {
      ctx.setData('startTime', Date.now());
      ctx.setData('passageCount', 0);
      ctx.setData('choiceCount', 0);
    },
    on_story_start: () => {
      const ctx = registry.getPluginContext('analytics')!;
      ctx.setData('startTime', Date.now());
      console.log('Session started');
    },
    on_passage_enter: (passage) => {
      const ctx = registry.getPluginContext('analytics')!;
      const count = ctx.getData<number>('passageCount') || 0;
      ctx.setData('passageCount', count + 1);
      console.log(`Passage #${count + 1}: ${passage.title}`);
    },
    on_choice_select: () => {
      const ctx = registry.getPluginContext('analytics')!;
      const count = ctx.getData<number>('choiceCount') || 0;
      ctx.setData('choiceCount', count + 1);
    },
    on_story_end: () => {
      const ctx = registry.getPluginContext('analytics')!;
      const startTime = ctx.getData<number>('startTime')!;
      const duration = Date.now() - startTime;
      const passages = ctx.getData<number>('passageCount');
      const choices = ctx.getData<number>('choiceCount');

      console.log('Session complete:');
      console.log(`  Duration: ${Math.round(duration / 1000)}s`);
      console.log(`  Passages: ${passages}`);
      console.log(`  Choices: ${choices}`);
    },
  },
});
```

## Using Plugins with Story Player

```typescript
import { StoryPlayer } from '@writewhisker/story-player';

const player = new StoryPlayer(story);

// Emit plugin events
player.on('storyStart', () => {
  registry.emit(STORY.START, { storyId: story.id });
});

player.on('passageEnter', (passage) => {
  registry.emit(PASSAGE.ENTER, passage);
});

player.on('choiceSelect', (choice) => {
  registry.emit(CHOICE.SELECT, choice);
});

player.on('storyEnd', () => {
  registry.emit(STORY.END, {});
});

// Transform content through plugins
player.on('beforeRender', (html) => {
  const { value } = registry.emit(PASSAGE.RENDER, html);
  return value || html;
});
```

## Complete Example

See the [full plugins API documentation](../../api/typescript/plugins.md) for more details.
