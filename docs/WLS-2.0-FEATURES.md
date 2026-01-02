# WLS 2.0 Features

This document describes the WLS 2.0 features implemented in whisker-editor-web.

## Overview

WLS 2.0 adds advanced features for interactive narrative authoring:

| Feature | Package | Description |
|---------|---------|-------------|
| Thread Scheduler | story-player | Parallel narrative execution |
| Thread Syntax | parser | Thread passage parsing |
| LIST State Machines | scripting | State machine operations |
| Timed Content | story-player | Delayed/scheduled content |
| External Functions | story-player | Host function binding |
| Audio API | story-player | Audio/media controls |
| Text Effects | story-player | Text animations |
| Parameterized Passages | story-player | Reusable passages with params |
| Migration Tool | tools | WLS 1.x to 2.0 migration |

## Thread Scheduler

**Package:** `@writewhisker/story-player`

Enables parallel narrative execution with multiple threads.

```typescript
import { ThreadScheduler, createThreadScheduler } from '@writewhisker/story-player';

const scheduler = createThreadScheduler();

// Create a main thread
const mainId = scheduler.createThread('Start');

// Spawn child threads
const childId = scheduler.spawnThread('Background', mainId);

// Step execution
const outputs = scheduler.step((thread) => ['content']);
```

## LIST State Machines

**Package:** `@writewhisker/scripting`

Extends LIST with state machine operators.

```typescript
import { ListValue, ListRegistry } from '@writewhisker/scripting';

const doorState = new ListValue('doorState', ['closed', 'open'], ['closed']);

// Add state (+=)
doorState.add('open');

// Remove state (-=)
doorState.remove('closed');

// Check state (?)
doorState.contains('open'); // true

// Superset (>=)
doorState.includes(otherList);
```

## Timed Content

**Package:** `@writewhisker/story-player`

Manages delayed and scheduled content delivery.

```typescript
import { TimedContentManager, parseTimeString } from '@writewhisker/story-player';

const manager = new TimedContentManager();

// Schedule one-shot content
manager.schedule(1000, [contentNode]);

// Schedule repeating content
manager.every(1000, [contentNode], 3); // max 3 fires

// Pause/resume
manager.pause();
manager.resume();

// Parse time strings
parseTimeString('2s');   // 2000
parseTimeString('500ms'); // 500
```

## External Functions

**Package:** `@writewhisker/story-player`

Allows stories to call host application functions.

```typescript
import { ExternalFunctionRegistry, parseExternalDeclaration } from '@writewhisker/story-player';

const registry = new ExternalFunctionRegistry();

// Register a function
registry.register('playSound', (id) => {
  audioManager.play(id);
});

// Declare signature (optional, for type checking)
registry.declare(parseExternalDeclaration('playSound(id: string): void'));

// Call from story
await registry.call('playSound', ['click']);
```

## Audio API

**Package:** `@writewhisker/story-player`

First-class audio controls with channels and effects.

```typescript
import { AudioManager, parseAudioDeclaration } from '@writewhisker/story-player';

const audio = new AudioManager({ backend: myAudioBackend });

// Register tracks
audio.registerTrack({
  id: 'bgm',
  url: 'music/theme.mp3',
  channel: 'bgm',
  loop: true,
  volume: 0.7,
  preload: true,
});

// Playback
await audio.play('bgm');
audio.setVolume('bgm', 0.5);
await audio.fadeOut('bgm', 2000);
await audio.crossfade('forest', 'battle', 2000);
```

## Text Effects

**Package:** `@writewhisker/story-player`

Dynamic text presentation effects.

```typescript
import { TextEffectManager, parseEffectDeclaration } from '@writewhisker/story-player';

const effects = new TextEffectManager();

// Apply typewriter effect
const controller = effects.applyEffect(
  'typewriter',
  'Hello, world!',
  { speed: 50 },
  (frame) => {
    element.textContent = frame.visibleText;
  },
  () => console.log('Complete')
);

// Control
controller.pause();
controller.resume();
controller.skip();
```

### Built-in Effects

- `typewriter` - Character-by-character reveal
- `shake` - Horizontal shake
- `pulse` - Fade in/out pulse
- `glitch` - Digital distortion
- `fade-in` / `fade-out` - Opacity transitions
- `slide-left` / `slide-right` / `slide-up` / `slide-down` - Slide transitions

## Parameterized Passages

**Package:** `@writewhisker/story-player`

Passages that accept parameters for reusable content.

```typescript
import {
  ParameterizedPassageManager,
  parsePassageHeader,
  parsePassageCall
} from '@writewhisker/story-player';

const manager = new ParameterizedPassageManager();

// Register passage
const { name, params } = parsePassageHeader('Describe(item, quality = "normal")');
manager.registerPassage(name, params);

// Bind arguments when calling
const call = parsePassageCall('Describe("sword", "excellent")');
const result = manager.bindArguments(call.target, call.args);

// Create variable scope
const scope = manager.createVariableScope(result.bindings);
// scope = { item: 'sword', quality: 'excellent' }
```

## Migration Tool

**Package:** `tools/migrate-1x-to-2x.ts`

Migrates WLS 1.x stories to 2.0 format.

```typescript
import { migrateStory, MigrationOptions } from './tools/migrate-1x-to-2x';

const options: MigrationOptions = {
  addVersionDirective: true,
  renameReservedWords: true,
};

const result = migrateStory(wls1Source, options);
console.log(result.output);
console.log(result.warnings);
```

## Test Corpus

The WLS 2.0 test corpus is located in the whisker-language-specification repository:

```
whisker-language-specification/test-corpus/wls-2.0/
├── threads.yaml          # 11 tests
├── state-machines.yaml   # 13 tests
├── timed.yaml            # 14 tests
├── external.yaml         # 14 tests
├── parameterized.yaml    # 14 tests
├── audio.yaml            # 18 tests
├── text-effects.yaml     # 17 tests
└── README.md
```

Total: 101 tests covering all WLS 2.0 features.
