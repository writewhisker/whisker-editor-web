# @writewhisker/audio

Audio management and playback for Whisker interactive fiction.

## Features

- **Background Music**: Loop background tracks with crossfading
- **Sound Effects**: Play one-shot sound effects
- **Ambient Sounds**: Layer ambient audio loops
- **Volume Control**: Individual volume for music, SFX, and ambient
- **Crossfading**: Smooth transitions between tracks
- **Preloading**: Preload audio assets for instant playback
- **Web Audio API**: Modern browser audio using Web Audio API
- **Zero Dependencies**: Pure TypeScript, no external libraries
- **Type-Safe**: Full TypeScript support
- **Framework Agnostic**: Works with any UI framework

## Installation

```bash
pnpm add @writewhisker/audio
```

## Quick Start

```typescript
import { AudioManager } from '@writewhisker/audio';

// Create audio manager
const audio = new AudioManager();

// Initialize (required for Web Audio API)
await audio.initialize();

// Play background music
await audio.playMusic('background.mp3', {
  loop: true,
  volume: 0.7,
  fadeIn: 1000, // 1 second fade in
});

// Play sound effect
await audio.playSound('click.mp3', {
  volume: 0.8,
});

// Play ambient sound
await audio.playAmbient('rain.mp3', {
  loop: true,
  volume: 0.5,
});

// Set master volume
audio.setMasterVolume(0.8);

// Stop music with fade out
await audio.stopMusic(1000); // 1 second fade out
```

## Core Concepts

### Audio Manager

The `AudioManager` is the main class for managing all audio in your story:

```typescript
const audio = new AudioManager({
  masterVolume: 0.8,
  musicVolume: 0.7,
  soundVolume: 0.9,
  ambientVolume: 0.6,
});

await audio.initialize();
```

### Audio Types

#### Background Music
- Single track playing at a time
- Automatically loops
- Crossfades when changing tracks

```typescript
// Play music
await audio.playMusic('theme.mp3', {
  loop: true,
  volume: 0.7,
  fadeIn: 2000,
});

// Change music (crossfades)
await audio.playMusic('battle.mp3', {
  fadeIn: 1000,
  crossfade: 1500,
});

// Stop music
await audio.stopMusic(1000);
```

#### Sound Effects
- Play multiple sounds simultaneously
- One-shot playback
- No looping

```typescript
// Play sound effect
await audio.playSound('sword.mp3', {
  volume: 0.8,
});

// Play with delay
await audio.playSound('footstep.mp3', {
  delay: 500, // ms
});

// Stop all sounds
audio.stopAllSounds();
```

#### Ambient Sounds
- Layer multiple ambient tracks
- Can loop indefinitely
- Great for atmosphere

```typescript
// Play ambient
await audio.playAmbient('forest.mp3', {
  loop: true,
  volume: 0.4,
});

// Stack multiple ambient sounds
await audio.playAmbient('birds.mp3', { volume: 0.3 });
await audio.playAmbient('wind.mp3', { volume: 0.2 });

// Stop specific ambient
audio.stopAmbient('forest.mp3');

// Stop all ambient
audio.stopAllAmbient();
```

## Advanced Usage

### Preloading

Preload audio files to avoid loading delays:

```typescript
// Preload single file
await audio.preload('music/intro.mp3');

// Preload multiple files
await audio.preloadAll([
  'music/intro.mp3',
  'music/battle.mp3',
  'sfx/click.mp3',
  'sfx/explosion.mp3',
  'ambient/rain.mp3',
]);

// Check if loaded
const isLoaded = audio.isLoaded('music/intro.mp3');
```

### Volume Control

Fine-grained volume control:

```typescript
// Master volume (affects everything)
audio.setMasterVolume(0.8);

// Category volumes
audio.setMusicVolume(0.7);
audio.setSoundVolume(0.9);
audio.setAmbientVolume(0.5);

// Get current volumes
const volumes = audio.getVolumes();
console.log(volumes);
// { master: 0.8, music: 0.7, sound: 0.9, ambient: 0.5 }

// Mute/unmute
audio.mute();
audio.unmute();
const isMuted = audio.isMuted();
```

### Crossfading

Smooth transitions between music tracks:

```typescript
// Crossfade to new track
await audio.playMusic('new-track.mp3', {
  crossfade: 2000, // 2 second crossfade
});

// Custom fade in/out
await audio.playMusic('track.mp3', {
  fadeIn: 1500,
  fadeOut: 1500,
});
```

### Event Handling

Listen to audio events:

```typescript
// Music started
audio.on('musicStart', (track) => {
  console.log('Music started:', track);
});

// Music ended
audio.on('musicEnd', (track) => {
  console.log('Music ended:', track);
});

// Sound played
audio.on('soundPlay', (sound) => {
  console.log('Sound played:', sound);
});

// Error handling
audio.on('error', (error) => {
  console.error('Audio error:', error);
});
```

### State Management

Get current audio state:

```typescript
// Get current music track
const currentMusic = audio.getCurrentMusic();

// Get playing sounds
const sounds = audio.getPlayingSounds();

// Get ambient tracks
const ambient = audio.getAmbientTracks();

// Get all audio state
const state = audio.getState();
console.log(state);
// {
//   music: { track: 'theme.mp3', volume: 0.7, playing: true },
//   sounds: ['click.mp3', 'explosion.mp3'],
//   ambient: ['rain.mp3', 'wind.mp3'],
//   volumes: { master: 0.8, music: 0.7, sound: 0.9, ambient: 0.5 },
//   muted: false
// }
```

## Integration Examples

### With Story Player

Integrate audio with passage transitions:

```typescript
import { StoryPlayer } from '@writewhisker/core-ts';
import { AudioManager } from '@writewhisker/audio';

const player = new StoryPlayer(story);
const audio = new AudioManager();

await audio.initialize();

// Play music on passage enter
player.on('passageEntered', (passage) => {
  const musicTag = passage.tags.find(t => t.startsWith('music:'));
  if (musicTag) {
    const track = musicTag.replace('music:', '');
    audio.playMusic(`music/${track}.mp3`, {
      fadeIn: 1000,
      crossfade: 1500,
    });
  }

  const soundTag = passage.tags.find(t => t.startsWith('sfx:'));
  if (soundTag) {
    const sound = soundTag.replace('sfx:', '');
    audio.playSound(`sfx/${sound}.mp3`);
  }
});
```

### Passage Tags

Use passage tags to control audio:

```typescript
// Passage with tags: ["music:battle", "sfx:sword", "ambient:wind"]

function handlePassageTags(passage: Passage) {
  passage.tags.forEach(tag => {
    if (tag.startsWith('music:')) {
      const track = tag.replace('music:', '');
      audio.playMusic(`${track}.mp3`, { crossfade: 1000 });
    }

    if (tag.startsWith('sfx:')) {
      const sound = tag.replace('sfx:', '');
      audio.playSound(`${sound}.mp3`);
    }

    if (tag.startsWith('ambient:')) {
      const ambient = tag.replace('ambient:', '');
      audio.playAmbient(`${ambient}.mp3`, { loop: true });
    }

    if (tag === 'stop-music') {
      audio.stopMusic(1000);
    }
  });
}
```

### UI Controls

Create audio settings UI:

```typescript
// Volume sliders
<input
  type="range"
  min="0"
  max="100"
  value={audio.getMasterVolume() * 100}
  on:input={(e) => audio.setMasterVolume(e.target.value / 100)}
/>

<input
  type="range"
  min="0"
  max="100"
  value={audio.getMusicVolume() * 100}
  on:input={(e) => audio.setMusicVolume(e.target.value / 100)}
/>

// Mute button
<button on:click={() => audio.isMuted() ? audio.unmute() : audio.mute()}>
  {audio.isMuted() ? '🔇' : '🔊'}
</button>

// Now playing display
{#if audio.getCurrentMusic()}
  <div>Now Playing: {audio.getCurrentMusic().track}</div>
{/if}
```

### Persistence

Save audio settings:

```typescript
import { PreferenceManager } from '@writewhisker/storage';

const prefs = new PreferenceManager(backend);

// Save volumes
async function saveAudioSettings() {
  const volumes = audio.getVolumes();
  await prefs.set('audio.masterVolume', volumes.master, 'user');
  await prefs.set('audio.musicVolume', volumes.music, 'user');
  await prefs.set('audio.soundVolume', volumes.sound, 'user');
  await prefs.set('audio.ambientVolume', volumes.ambient, 'user');
  await prefs.set('audio.muted', audio.isMuted(), 'user');
}

// Load volumes
async function loadAudioSettings() {
  const master = await prefs.get('audio.masterVolume', 0.8, 'user');
  const music = await prefs.get('audio.musicVolume', 0.7, 'user');
  const sound = await prefs.get('audio.soundVolume', 0.9, 'user');
  const ambient = await prefs.get('audio.ambientVolume', 0.5, 'user');
  const muted = await prefs.get('audio.muted', false, 'user');

  audio.setMasterVolume(master);
  audio.setMusicVolume(music);
  audio.setSoundVolume(sound);
  audio.setAmbientVolume(ambient);
  if (muted) audio.mute();
}
```

## Audio File Formats

Supported formats (depends on browser):
- **MP3**: Widest support, good compression
- **OGG**: Open format, good quality
- **WAV**: Uncompressed, large files
- **M4A/AAC**: Good quality, iOS support

Recommendations:
- Use MP3 for maximum compatibility
- Provide OGG fallbacks for Firefox
- Keep sound effects small (<100KB)
- Compress music files appropriately

## Performance Tips

1. **Preload Critical Assets**: Preload music and common sound effects
2. **Limit Simultaneous Sounds**: Too many sounds can cause performance issues
3. **Use Appropriate Bitrates**: 128kbps for music, 64kbps for ambient
4. **Lazy Load**: Only load audio when needed
5. **Clean Up**: Stop and unload unused audio tracks

```typescript
// Good: Preload on story load
await audio.preloadAll([
  'music/theme.mp3',
  'sfx/click.mp3',
  'sfx/transition.mp3',
]);

// Good: Limit concurrent sounds
const MAX_SOUNDS = 5;
if (audio.getPlayingSounds().length < MAX_SOUNDS) {
  await audio.playSound('effect.mp3');
}

// Good: Stop old ambient before starting new
audio.stopAllAmbient();
await audio.playAmbient('new-ambient.mp3');
```

## API Reference

### `AudioManager`

```typescript
class AudioManager {
  constructor(options?: AudioOptions);

  initialize(): Promise<void>;

  // Music
  playMusic(url: string, options?: PlayOptions): Promise<void>;
  stopMusic(fadeOut?: number): Promise<void>;
  getCurrentMusic(): MusicState | null;

  // Sound effects
  playSound(url: string, options?: PlayOptions): Promise<void>;
  stopSound(url: string): void;
  stopAllSounds(): void;
  getPlayingSounds(): string[];

  // Ambient
  playAmbient(url: string, options?: PlayOptions): Promise<void>;
  stopAmbient(url: string, fadeOut?: number): Promise<void>;
  stopAllAmbient(fadeOut?: number): Promise<void>;
  getAmbientTracks(): string[];

  // Volume
  setMasterVolume(volume: number): void;
  setMusicVolume(volume: number): void;
  setSoundVolume(volume: number): void;
  setAmbientVolume(volume: number): void;
  getVolumes(): VolumeState;

  // Muting
  mute(): void;
  unmute(): void;
  isMuted(): boolean;

  // Preloading
  preload(url: string): Promise<void>;
  preloadAll(urls: string[]): Promise<void>;
  isLoaded(url: string): boolean;

  // State
  getState(): AudioState;

  // Events
  on(event: AudioEvent, callback: Function): void;
  off(event: AudioEvent, callback: Function): void;
}
```

## Browser Support

- Chrome 14+
- Firefox 25+
- Safari 6+
- Edge 12+
- Opera 15+

Requires Web Audio API support. Falls back gracefully in unsupported browsers.

## Bundle Size

- **Size**: ~3KB (gzipped)
- **Dependencies**: None (uses Web Audio API)
- **Tree-shakable**: Yes (`sideEffects: false`)

## Testing

```bash
pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm test:coverage # Coverage report
```

## License

AGPL-3.0

## Related Packages

- [@writewhisker/core-ts](../core-ts) - Core story engine
- [@writewhisker/storage](../storage) - Save audio preferences
- [@writewhisker/editor-base](../editor-base) - Audio management UI

## Support

- [Documentation](https://github.com/writewhisker/whisker-editor-web)
- [Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- [Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)
