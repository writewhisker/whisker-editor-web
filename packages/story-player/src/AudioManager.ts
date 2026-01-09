/**
 * Audio/Media API
 *
 * First-class audio controls for stories with support for
 * background music, sound effects, voice, and ambient sounds.
 */

/**
 * Audio channel types
 */
export type AudioChannel = 'bgm' | 'sfx' | 'voice' | 'ambient';

/**
 * Represents an audio track declaration
 */
export interface AudioTrack {
  /** Unique identifier for this track */
  id: string;
  /** URL or path to the audio file */
  url: string;
  /** Audio channel type */
  channel: AudioChannel;
  /** Whether to loop playback */
  loop: boolean;
  /** Volume (0.0 to 1.0) */
  volume: number;
  /** Whether to preload the audio */
  preload: boolean;
}

/**
 * State of a playing audio instance
 */
export interface PlayingAudio {
  /** Track ID */
  id: string;
  /** Current volume */
  volume: number;
  /** Whether currently playing */
  playing: boolean;
  /** Whether paused */
  paused: boolean;
  /** Whether looping */
  loop: boolean;
  /** Current playback position in seconds */
  currentTime?: number;
  /** Total duration in seconds */
  duration?: number;
}

/**
 * Audio backend interface for platform-specific implementations
 */
export interface AudioBackend {
  /** Create an audio instance from URL */
  create(url: string): unknown;
  /** Start playback */
  play(instance: unknown): Promise<void>;
  /** Pause playback */
  pause(instance: unknown): void;
  /** Stop and reset playback */
  stop(instance: unknown): void;
  /** Set volume (0.0 to 1.0) */
  setVolume(instance: unknown, volume: number): void;
  /** Get current volume */
  getVolume(instance: unknown): number;
  /** Set loop mode */
  setLoop(instance: unknown, loop: boolean): void;
  /** Get current time in seconds */
  getCurrentTime(instance: unknown): number;
  /** Set current time in seconds */
  setCurrentTime(instance: unknown, time: number): void;
  /** Get duration in seconds */
  getDuration(instance: unknown): number;
  /** Check if playing */
  isPlaying(instance: unknown): boolean;
  /** Preload audio */
  preload(instance: unknown): Promise<void>;
  /** Dispose of audio instance */
  dispose(instance: unknown): void;
}

/**
 * Mock audio backend for testing
 */
export class MockAudioBackend implements AudioBackend {
  private instances = new Map<
    object,
    {
      url: string;
      volume: number;
      loop: boolean;
      playing: boolean;
      currentTime: number;
      duration: number;
    }
  >();

  create(url: string): object {
    const instance = {};
    this.instances.set(instance, {
      url,
      volume: 1.0,
      loop: false,
      playing: false,
      currentTime: 0,
      duration: 60, // Mock 60 seconds
    });
    return instance;
  }

  async play(instance: unknown): Promise<void> {
    const state = this.instances.get(instance as object);
    if (state) state.playing = true;
  }

  pause(instance: unknown): void {
    const state = this.instances.get(instance as object);
    if (state) state.playing = false;
  }

  stop(instance: unknown): void {
    const state = this.instances.get(instance as object);
    if (state) {
      state.playing = false;
      state.currentTime = 0;
    }
  }

  setVolume(instance: unknown, volume: number): void {
    const state = this.instances.get(instance as object);
    if (state) state.volume = volume;
  }

  getVolume(instance: unknown): number {
    const state = this.instances.get(instance as object);
    return state?.volume ?? 0;
  }

  setLoop(instance: unknown, loop: boolean): void {
    const state = this.instances.get(instance as object);
    if (state) state.loop = loop;
  }

  getCurrentTime(instance: unknown): number {
    const state = this.instances.get(instance as object);
    return state?.currentTime ?? 0;
  }

  setCurrentTime(instance: unknown, time: number): void {
    const state = this.instances.get(instance as object);
    if (state) state.currentTime = time;
  }

  getDuration(instance: unknown): number {
    const state = this.instances.get(instance as object);
    return state?.duration ?? 0;
  }

  isPlaying(instance: unknown): boolean {
    const state = this.instances.get(instance as object);
    return state?.playing ?? false;
  }

  async preload(): Promise<void> {
    // No-op in mock
  }

  dispose(instance: unknown): void {
    this.instances.delete(instance as object);
  }
}

/**
 * Audio manager options
 */
export interface AudioManagerOptions {
  /** Audio backend implementation */
  backend?: AudioBackend;
  /** Global volume multiplier (0.0 to 1.0) */
  masterVolume?: number;
  /** Default channel volumes */
  channelVolumes?: Partial<Record<AudioChannel, number>>;
}

/**
 * Audio manager for WLS stories
 *
 * @example
 * ```typescript
 * const audio = new AudioManager({ backend: new WebAudioBackend() });
 *
 * // Register tracks
 * audio.registerTrack({
 *   id: 'bgm',
 *   url: 'music/theme.mp3',
 *   channel: 'bgm',
 *   loop: true,
 *   volume: 0.7,
 *   preload: true,
 * });
 *
 * // Playback
 * audio.play('bgm');
 * audio.setVolume('bgm', 0.5);
 * await audio.fadeOut('bgm', 2000);
 * ```
 */
export class AudioManager {
  private tracks: Map<string, AudioTrack> = new Map();
  private instances: Map<string, unknown> = new Map();
  private backend: AudioBackend;
  private masterVolume: number;
  private channelVolumes: Record<AudioChannel, number>;
  private channelMuted: Record<AudioChannel, boolean>;

  constructor(options: AudioManagerOptions = {}) {
    this.backend = options.backend ?? new MockAudioBackend();
    this.masterVolume = options.masterVolume ?? 1.0;
    this.channelVolumes = {
      bgm: options.channelVolumes?.bgm ?? 1.0,
      sfx: options.channelVolumes?.sfx ?? 1.0,
      voice: options.channelVolumes?.voice ?? 1.0,
      ambient: options.channelVolumes?.ambient ?? 1.0,
    };
    this.channelMuted = {
      bgm: false,
      sfx: false,
      voice: false,
      ambient: false,
    };
  }

  /**
   * Register an audio track
   */
  registerTrack(track: AudioTrack): void {
    this.tracks.set(track.id, track);

    // Create audio instance
    const instance = this.backend.create(track.url);
    this.backend.setLoop(instance, track.loop);
    this.backend.setVolume(instance, this.calculateVolume(track));
    this.instances.set(track.id, instance);

    // Preload if requested
    if (track.preload) {
      this.preload(track.id);
    }
  }

  /**
   * Unregister a track
   */
  unregisterTrack(id: string): boolean {
    const instance = this.instances.get(id);
    if (instance) {
      this.backend.stop(instance);
      this.backend.dispose(instance);
      this.instances.delete(id);
    }
    return this.tracks.delete(id);
  }

  /**
   * Check if a track is registered
   */
  hasTrack(id: string): boolean {
    return this.tracks.has(id);
  }

  /**
   * Get track info
   */
  getTrack(id: string): AudioTrack | undefined {
    return this.tracks.get(id);
  }

  /**
   * Get all registered track IDs
   */
  getTrackIds(): string[] {
    return Array.from(this.tracks.keys());
  }

  /**
   * Preload an audio track
   */
  async preload(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }
    await this.backend.preload(instance);
  }

  /**
   * Play an audio track
   */
  async play(id: string): Promise<void> {
    const track = this.tracks.get(id);
    const instance = this.instances.get(id);

    if (!track || !instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }

    // Stop other tracks on exclusive channels
    if (track.channel === 'bgm' || track.channel === 'voice') {
      await this.stopChannel(track.channel);
    }

    await this.backend.play(instance);
  }

  /**
   * Pause an audio track
   */
  pause(id: string): void {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }
    this.backend.pause(instance);
  }

  /**
   * Resume a paused audio track
   */
  async resume(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }
    await this.backend.play(instance);
  }

  /**
   * Stop an audio track
   */
  stop(id: string): void {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }
    this.backend.stop(instance);
  }

  /**
   * Stop all tracks on a channel
   */
  async stopChannel(channel: AudioChannel): Promise<void> {
    for (const [id, track] of this.tracks) {
      if (track.channel === channel) {
        const instance = this.instances.get(id);
        if (instance && this.backend.isPlaying(instance)) {
          this.backend.stop(instance);
        }
      }
    }
  }

  /**
   * Stop all audio
   */
  stopAll(): void {
    for (const [, instance] of this.instances) {
      this.backend.stop(instance);
    }
  }

  /**
   * Pause all audio
   */
  pauseAll(): void {
    for (const [, instance] of this.instances) {
      if (this.backend.isPlaying(instance)) {
        this.backend.pause(instance);
      }
    }
  }

  /**
   * Resume all paused audio
   */
  async resumeAll(): Promise<void> {
    for (const [, instance] of this.instances) {
      await this.backend.play(instance);
    }
  }

  /**
   * Set volume for a specific track
   */
  setVolume(id: string, volume: number): void {
    const track = this.tracks.get(id);
    const instance = this.instances.get(id);

    if (!track || !instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }

    // Update track volume
    track.volume = Math.max(0, Math.min(1, volume));

    // Apply to instance
    this.backend.setVolume(instance, this.calculateVolume(track));
  }

  /**
   * Get volume for a specific track
   */
  getVolume(id: string): number {
    const track = this.tracks.get(id);
    if (!track) {
      throw new Error(`Unknown audio track: ${id}`);
    }
    return track.volume;
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Set channel volume
   */
  setChannelVolume(channel: AudioChannel, volume: number): void {
    this.channelVolumes[channel] = Math.max(0, Math.min(1, volume));
    this.updateChannelVolumes(channel);
  }

  /**
   * Get channel volume
   */
  getChannelVolume(channel: AudioChannel): number {
    return this.channelVolumes[channel];
  }

  /**
   * Mute a channel
   */
  muteChannel(channel: AudioChannel): void {
    this.channelMuted[channel] = true;
    this.updateChannelVolumes(channel);
  }

  /**
   * Unmute a channel
   */
  unmuteChannel(channel: AudioChannel): void {
    this.channelMuted[channel] = false;
    this.updateChannelVolumes(channel);
  }

  /**
   * Check if a channel is muted
   */
  isChannelMuted(channel: AudioChannel): boolean {
    return this.channelMuted[channel];
  }

  /**
   * Check if a track is playing
   */
  isPlaying(id: string): boolean {
    const instance = this.instances.get(id);
    if (!instance) return false;
    return this.backend.isPlaying(instance);
  }

  /**
   * Get playing state for a track
   */
  getPlayingState(id: string): PlayingAudio | null {
    const track = this.tracks.get(id);
    const instance = this.instances.get(id);

    if (!track || !instance) return null;

    return {
      id,
      volume: this.backend.getVolume(instance),
      playing: this.backend.isPlaying(instance),
      paused: !this.backend.isPlaying(instance),
      loop: track.loop,
      currentTime: this.backend.getCurrentTime(instance),
      duration: this.backend.getDuration(instance),
    };
  }

  /**
   * Fade in a track
   */
  async fadeIn(id: string, duration: number): Promise<void> {
    const track = this.tracks.get(id);
    const instance = this.instances.get(id);

    if (!track || !instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }

    const targetVolume = this.calculateVolume(track);

    // Start at zero volume
    this.backend.setVolume(instance, 0);

    // Stop other tracks on exclusive channels
    if (track.channel === 'bgm' || track.channel === 'voice') {
      await this.stopChannel(track.channel);
    }

    // Start playing
    await this.backend.play(instance);

    // Fade in
    return this.fade(instance, 0, targetVolume, duration);
  }

  /**
   * Fade out a track
   */
  async fadeOut(id: string, duration: number): Promise<void> {
    const instance = this.instances.get(id);

    if (!instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }

    const startVolume = this.backend.getVolume(instance);

    await this.fade(instance, startVolume, 0, duration);

    // Stop after fade
    this.backend.stop(instance);
  }

  /**
   * Crossfade from one track to another
   */
  async crossfade(fromId: string, toId: string, duration: number): Promise<void> {
    const toTrack = this.tracks.get(toId);
    const toInstance = this.instances.get(toId);
    const fromInstance = this.instances.get(fromId);

    if (!toTrack || !toInstance) {
      throw new Error(`Unknown audio track: ${toId}`);
    }

    const targetVolume = this.calculateVolume(toTrack);

    // Start new track at zero volume
    this.backend.setVolume(toInstance, 0);
    await this.backend.play(toInstance);

    // Fade both simultaneously
    const promises: Promise<void>[] = [
      this.fade(toInstance, 0, targetVolume, duration),
    ];

    if (fromInstance && this.backend.isPlaying(fromInstance)) {
      const fromVolume = this.backend.getVolume(fromInstance);
      promises.push(
        this.fade(fromInstance, fromVolume, 0, duration).then(() => {
          this.backend.stop(fromInstance);
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Seek to a position in seconds
   */
  seek(id: string, time: number): void {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }
    this.backend.setCurrentTime(instance, time);
  }

  /**
   * Get current playback time
   */
  getCurrentTime(id: string): number {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }
    return this.backend.getCurrentTime(instance);
  }

  /**
   * Get track duration
   */
  getDuration(id: string): number {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Unknown audio track: ${id}`);
    }
    return this.backend.getDuration(instance);
  }

  /**
   * Clear all tracks
   */
  clear(): void {
    this.stopAll();
    for (const [, instance] of this.instances) {
      this.backend.dispose(instance);
    }
    this.tracks.clear();
    this.instances.clear();
  }

  /**
   * Calculate effective volume for a track
   */
  private calculateVolume(track: AudioTrack): number {
    if (this.channelMuted[track.channel]) {
      return 0;
    }
    return track.volume * this.channelVolumes[track.channel] * this.masterVolume;
  }

  /**
   * Update volumes for all tracks
   */
  private updateAllVolumes(): void {
    for (const [id, track] of this.tracks) {
      const instance = this.instances.get(id);
      if (instance) {
        this.backend.setVolume(instance, this.calculateVolume(track));
      }
    }
  }

  /**
   * Update volumes for a specific channel
   */
  private updateChannelVolumes(channel: AudioChannel): void {
    for (const [id, track] of this.tracks) {
      if (track.channel === channel) {
        const instance = this.instances.get(id);
        if (instance) {
          this.backend.setVolume(instance, this.calculateVolume(track));
        }
      }
    }
  }

  /**
   * Fade volume over time
   */
  private fade(
    instance: unknown,
    from: number,
    to: number,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeDelta = (to - from) / steps;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const newVolume = from + volumeDelta * step;
        this.backend.setVolume(instance, newVolume);

        if (step >= steps) {
          clearInterval(interval);
          this.backend.setVolume(instance, to);
          resolve();
        }
      }, stepDuration);
    });
  }
}

/**
 * Parse an @audio declaration string
 * Format: id = "url" [loop] [volume:N] [preload] [channel:type]
 */
export function parseAudioDeclaration(
  declaration: string
): Omit<AudioTrack, 'channel'> & { channel?: AudioChannel } {
  // Match: id = "url" [options...]
  const match = declaration.match(/^\s*(\w+)\s*=\s*"([^"]+)"(.*)$/);

  if (!match) {
    throw new Error(`Invalid @audio declaration: ${declaration}`);
  }

  const [, id, url, optionsStr] = match;

  const track: Omit<AudioTrack, 'channel'> & { channel?: AudioChannel } = {
    id,
    url,
    loop: false,
    volume: 1.0,
    preload: false,
  };

  // Parse options
  const options = optionsStr.trim();

  if (/\bloop\b/i.test(options)) {
    track.loop = true;
  }

  if (/\bpreload\b/i.test(options)) {
    track.preload = true;
  }

  const volumeMatch = options.match(/\bvolume:([0-9.]+)/i);
  if (volumeMatch) {
    track.volume = parseFloat(volumeMatch[1]);
  }

  const channelMatch = options.match(/\bchannel:(\w+)/i);
  if (channelMatch) {
    const channel = channelMatch[1].toLowerCase();
    if (['bgm', 'sfx', 'voice', 'ambient'].includes(channel)) {
      track.channel = channel as AudioChannel;
    }
  }

  return track;
}

/**
 * Create a new audio manager
 */
export function createAudioManager(
  options?: AudioManagerOptions
): AudioManager {
  return new AudioManager(options);
}
