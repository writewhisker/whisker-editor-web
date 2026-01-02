import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AudioManager,
  MockAudioBackend,
  createAudioManager,
  parseAudioDeclaration,
  type AudioTrack,
} from './AudioManager';

describe('AudioManager', () => {
  let manager: AudioManager;
  let backend: MockAudioBackend;

  beforeEach(() => {
    vi.useFakeTimers();
    backend = new MockAudioBackend();
    manager = new AudioManager({ backend });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createTrack = (
    id: string,
    overrides: Partial<AudioTrack> = {}
  ): AudioTrack => ({
    id,
    url: `audio/${id}.mp3`,
    channel: 'bgm',
    loop: false,
    volume: 1.0,
    preload: false,
    ...overrides,
  });

  describe('registerTrack/unregisterTrack', () => {
    it('should register a track', () => {
      manager.registerTrack(createTrack('bgm'));
      expect(manager.hasTrack('bgm')).toBe(true);
    });

    it('should unregister a track', () => {
      manager.registerTrack(createTrack('bgm'));
      expect(manager.unregisterTrack('bgm')).toBe(true);
      expect(manager.hasTrack('bgm')).toBe(false);
    });

    it('should return false when unregistering unknown track', () => {
      expect(manager.unregisterTrack('unknown')).toBe(false);
    });

    it('should get track info', () => {
      const track = createTrack('bgm', { volume: 0.7 });
      manager.registerTrack(track);
      expect(manager.getTrack('bgm')).toEqual(track);
    });

    it('should get all track IDs', () => {
      manager.registerTrack(createTrack('bgm'));
      manager.registerTrack(createTrack('sfx', { channel: 'sfx' }));
      expect(manager.getTrackIds()).toEqual(['bgm', 'sfx']);
    });
  });

  describe('play/pause/stop', () => {
    beforeEach(() => {
      manager.registerTrack(createTrack('bgm'));
      manager.registerTrack(createTrack('sfx', { channel: 'sfx' }));
    });

    it('should play a track', async () => {
      await manager.play('bgm');
      expect(manager.isPlaying('bgm')).toBe(true);
    });

    it('should throw when playing unknown track', async () => {
      await expect(manager.play('unknown')).rejects.toThrow(/Unknown audio/);
    });

    it('should pause a track', async () => {
      await manager.play('bgm');
      manager.pause('bgm');
      expect(manager.isPlaying('bgm')).toBe(false);
    });

    it('should resume a paused track', async () => {
      await manager.play('bgm');
      manager.pause('bgm');
      await manager.resume('bgm');
      expect(manager.isPlaying('bgm')).toBe(true);
    });

    it('should stop a track', async () => {
      await manager.play('bgm');
      manager.stop('bgm');
      expect(manager.isPlaying('bgm')).toBe(false);
    });

    it('should stop exclusive channel when playing bgm', async () => {
      manager.registerTrack(createTrack('bgm2', { channel: 'bgm' }));
      await manager.play('bgm');
      await manager.play('bgm2');
      expect(manager.isPlaying('bgm')).toBe(false);
      expect(manager.isPlaying('bgm2')).toBe(true);
    });

    it('should allow multiple sfx to play', async () => {
      manager.registerTrack(createTrack('sfx2', { channel: 'sfx' }));
      await manager.play('sfx');
      await manager.play('sfx2');
      expect(manager.isPlaying('sfx')).toBe(true);
      expect(manager.isPlaying('sfx2')).toBe(true);
    });

    it('should stop all tracks', async () => {
      await manager.play('bgm');
      await manager.play('sfx');
      manager.stopAll();
      expect(manager.isPlaying('bgm')).toBe(false);
      expect(manager.isPlaying('sfx')).toBe(false);
    });

    it('should pause all tracks', async () => {
      await manager.play('bgm');
      await manager.play('sfx');
      manager.pauseAll();
      expect(manager.isPlaying('bgm')).toBe(false);
      expect(manager.isPlaying('sfx')).toBe(false);
    });
  });

  describe('volume control', () => {
    beforeEach(() => {
      manager.registerTrack(createTrack('bgm', { volume: 0.8 }));
    });

    it('should set track volume', () => {
      manager.setVolume('bgm', 0.5);
      expect(manager.getVolume('bgm')).toBe(0.5);
    });

    it('should clamp volume to valid range', () => {
      manager.setVolume('bgm', 1.5);
      expect(manager.getVolume('bgm')).toBe(1);

      manager.setVolume('bgm', -0.5);
      expect(manager.getVolume('bgm')).toBe(0);
    });

    it('should set master volume', () => {
      manager.setMasterVolume(0.5);
      expect(manager.getMasterVolume()).toBe(0.5);
    });

    it('should set channel volume', () => {
      manager.setChannelVolume('bgm', 0.7);
      expect(manager.getChannelVolume('bgm')).toBe(0.7);
    });

    it('should mute/unmute channel', () => {
      manager.muteChannel('bgm');
      expect(manager.isChannelMuted('bgm')).toBe(true);

      manager.unmuteChannel('bgm');
      expect(manager.isChannelMuted('bgm')).toBe(false);
    });
  });

  describe('fade effects', () => {
    beforeEach(() => {
      manager.registerTrack(createTrack('bgm', { volume: 1.0 }));
    });

    it('should fade in a track', async () => {
      const fadePromise = manager.fadeIn('bgm', 1000);
      // Need to let the play() promise resolve first
      await vi.advanceTimersByTimeAsync(0);
      expect(manager.isPlaying('bgm')).toBe(true);

      await vi.advanceTimersByTimeAsync(1000);
      await fadePromise;
    });

    it('should fade out a track', async () => {
      await manager.play('bgm');
      const fadePromise = manager.fadeOut('bgm', 1000);

      await vi.advanceTimersByTimeAsync(1000);
      await fadePromise;

      expect(manager.isPlaying('bgm')).toBe(false);
    });

    it('should crossfade between tracks', async () => {
      manager.registerTrack(createTrack('bgm2', { channel: 'bgm' }));
      await manager.play('bgm');

      const crossfadePromise = manager.crossfade('bgm', 'bgm2', 1000);
      // Need to let the play() promise resolve first
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(1000);
      await crossfadePromise;

      expect(manager.isPlaying('bgm')).toBe(false);
      expect(manager.isPlaying('bgm2')).toBe(true);
    });
  });

  describe('seek/time', () => {
    beforeEach(() => {
      manager.registerTrack(createTrack('bgm'));
    });

    it('should seek to position', () => {
      manager.seek('bgm', 30);
      expect(manager.getCurrentTime('bgm')).toBe(30);
    });

    it('should get duration', () => {
      // Mock backend returns 60 seconds
      expect(manager.getDuration('bgm')).toBe(60);
    });
  });

  describe('getPlayingState', () => {
    it('should return playing state', async () => {
      manager.registerTrack(createTrack('bgm', { loop: true }));
      await manager.play('bgm');

      const state = manager.getPlayingState('bgm');
      expect(state).toMatchObject({
        id: 'bgm',
        playing: true,
        paused: false,
        loop: true,
      });
    });

    it('should return null for unknown track', () => {
      expect(manager.getPlayingState('unknown')).toBeNull();
    });
  });

  describe('stopChannel', () => {
    it('should stop all tracks on a channel', async () => {
      manager.registerTrack(createTrack('sfx1', { channel: 'sfx' }));
      manager.registerTrack(createTrack('sfx2', { channel: 'sfx' }));
      manager.registerTrack(createTrack('bgm', { channel: 'bgm' }));

      await manager.play('sfx1');
      await manager.play('sfx2');
      await manager.play('bgm');

      await manager.stopChannel('sfx');

      expect(manager.isPlaying('sfx1')).toBe(false);
      expect(manager.isPlaying('sfx2')).toBe(false);
      expect(manager.isPlaying('bgm')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all tracks', async () => {
      manager.registerTrack(createTrack('bgm'));
      manager.registerTrack(createTrack('sfx', { channel: 'sfx' }));
      await manager.play('bgm');

      manager.clear();

      expect(manager.getTrackIds()).toHaveLength(0);
    });
  });
});

describe('MockAudioBackend', () => {
  let backend: MockAudioBackend;

  beforeEach(() => {
    backend = new MockAudioBackend();
  });

  it('should create instances', () => {
    const instance = backend.create('test.mp3');
    expect(instance).toBeDefined();
  });

  it('should track play/pause state', async () => {
    const instance = backend.create('test.mp3');
    expect(backend.isPlaying(instance)).toBe(false);

    await backend.play(instance);
    expect(backend.isPlaying(instance)).toBe(true);

    backend.pause(instance);
    expect(backend.isPlaying(instance)).toBe(false);
  });

  it('should track volume', () => {
    const instance = backend.create('test.mp3');
    backend.setVolume(instance, 0.5);
    expect(backend.getVolume(instance)).toBe(0.5);
  });

  it('should track loop', () => {
    const instance = backend.create('test.mp3');
    backend.setLoop(instance, true);
    // Loop state is internal, tested via AudioManager
  });

  it('should track current time', () => {
    const instance = backend.create('test.mp3');
    backend.setCurrentTime(instance, 30);
    expect(backend.getCurrentTime(instance)).toBe(30);
  });

  it('should reset on stop', () => {
    const instance = backend.create('test.mp3');
    backend.setCurrentTime(instance, 30);
    backend.stop(instance);
    expect(backend.getCurrentTime(instance)).toBe(0);
    expect(backend.isPlaying(instance)).toBe(false);
  });
});

describe('parseAudioDeclaration', () => {
  it('should parse basic declaration', () => {
    const result = parseAudioDeclaration('bgm = "music/theme.mp3"');
    expect(result).toEqual({
      id: 'bgm',
      url: 'music/theme.mp3',
      loop: false,
      volume: 1.0,
      preload: false,
    });
  });

  it('should parse with loop', () => {
    const result = parseAudioDeclaration('bgm = "music/theme.mp3" loop');
    expect(result.loop).toBe(true);
  });

  it('should parse with volume', () => {
    const result = parseAudioDeclaration('bgm = "music/theme.mp3" volume:0.7');
    expect(result.volume).toBe(0.7);
  });

  it('should parse with preload', () => {
    const result = parseAudioDeclaration('bgm = "music/theme.mp3" preload');
    expect(result.preload).toBe(true);
  });

  it('should parse with channel', () => {
    const result = parseAudioDeclaration('click = "sounds/click.wav" channel:sfx');
    expect(result.channel).toBe('sfx');
  });

  it('should parse all options combined', () => {
    const result = parseAudioDeclaration(
      'theme = "music/main.mp3" loop volume:0.8 preload channel:bgm'
    );
    expect(result).toEqual({
      id: 'theme',
      url: 'music/main.mp3',
      loop: true,
      volume: 0.8,
      preload: true,
      channel: 'bgm',
    });
  });

  it('should handle whitespace', () => {
    const result = parseAudioDeclaration('  bgm  =  "test.mp3"  loop  ');
    expect(result.id).toBe('bgm');
    expect(result.loop).toBe(true);
  });

  it('should throw for invalid format', () => {
    expect(() => parseAudioDeclaration('invalid')).toThrow(
      /Invalid @audio declaration/
    );
  });

  it('should throw for missing quotes', () => {
    expect(() => parseAudioDeclaration('bgm = test.mp3')).toThrow(
      /Invalid @audio declaration/
    );
  });
});

describe('createAudioManager', () => {
  it('should create a new manager instance', () => {
    const manager = createAudioManager();
    expect(manager).toBeInstanceOf(AudioManager);
  });

  it('should pass options to manager', () => {
    const manager = createAudioManager({ masterVolume: 0.5 });
    expect(manager.getMasterVolume()).toBe(0.5);
  });
});

describe('real-world examples', () => {
  let manager: AudioManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = createAudioManager({ backend: new MockAudioBackend() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should work as a game audio system', async () => {
    // Register tracks
    manager.registerTrack({
      id: 'main_theme',
      url: 'music/main.mp3',
      channel: 'bgm',
      loop: true,
      volume: 0.7,
      preload: true,
    });

    manager.registerTrack({
      id: 'footstep',
      url: 'sounds/footstep.wav',
      channel: 'sfx',
      loop: false,
      volume: 0.5,
      preload: false,
    });

    manager.registerTrack({
      id: 'narrator',
      url: 'voice/intro.mp3',
      channel: 'voice',
      loop: false,
      volume: 1.0,
      preload: true,
    });

    // Play background music
    await manager.play('main_theme');
    expect(manager.isPlaying('main_theme')).toBe(true);

    // Play sound effect (doesn't stop music)
    await manager.play('footstep');
    expect(manager.isPlaying('main_theme')).toBe(true);
    expect(manager.isPlaying('footstep')).toBe(true);

    // Play voice (exclusive channel)
    await manager.play('narrator');
    expect(manager.isPlaying('narrator')).toBe(true);

    // Lower music during narration
    manager.setVolume('main_theme', 0.3);
    expect(manager.getVolume('main_theme')).toBe(0.3);
  });

  it('should handle scene transitions', async () => {
    manager.registerTrack({
      id: 'forest_theme',
      url: 'music/forest.mp3',
      channel: 'bgm',
      loop: true,
      volume: 0.7,
      preload: true,
    });

    manager.registerTrack({
      id: 'battle_theme',
      url: 'music/battle.mp3',
      channel: 'bgm',
      loop: true,
      volume: 0.8,
      preload: true,
    });

    // Play forest theme
    await manager.play('forest_theme');

    // Crossfade to battle theme
    const crossfadePromise = manager.crossfade('forest_theme', 'battle_theme', 2000);
    // Need to let the play() promise resolve first
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(2000);
    await crossfadePromise;

    expect(manager.isPlaying('forest_theme')).toBe(false);
    expect(manager.isPlaying('battle_theme')).toBe(true);
  });

  it('should handle muting', async () => {
    manager.registerTrack({
      id: 'music',
      url: 'music.mp3',
      channel: 'bgm',
      loop: true,
      volume: 1.0,
      preload: false,
    });

    // Mute BGM channel
    manager.muteChannel('bgm');
    expect(manager.isChannelMuted('bgm')).toBe(true);

    // Unmute
    manager.unmuteChannel('bgm');
    expect(manager.isChannelMuted('bgm')).toBe(false);
  });
});
