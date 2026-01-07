/**
 * Audio Effects
 *
 * Manages audio playback with support for fade in/out, crossfade, volume control,
 * and audio groups (music, sfx, ambient, voice).
 *
 * Reference: whisker-core/lib/whisker/wls2/audio_effects.lua
 */

import type {
  AudioGroup,
  AudioDeclaration,
  AudioEffectOptions,
  AudioState,
  AudioTrack,
  FadeState,
} from './types';

// =============================================================================
// Audio Declaration Parser
// =============================================================================

/**
 * Parse audio declaration string
 * Format: "music:background src:/audio/bg.mp3 volume:0.8 loop:true"
 */
export function parseAudioDeclaration(declaration: string): AudioDeclaration {
  const parts = declaration.trim().split(/\s+/);

  let id = '';
  let src = '';
  let group: AudioGroup = 'sfx';
  let volume = 1.0;
  let loop = false;

  for (const part of parts) {
    if (part.includes(':')) {
      const [key, value] = part.split(':');

      switch (key.toLowerCase()) {
        case 'id':
          id = value;
          break;
        case 'src':
          src = value;
          break;
        case 'music':
        case 'sfx':
        case 'ambient':
        case 'voice':
          group = key.toLowerCase() as AudioGroup;
          id = id || value;
          break;
        case 'group':
          group = value as AudioGroup;
          break;
        case 'volume':
        case 'vol':
          volume = parseFloat(value);
          break;
        case 'loop':
          loop = value === 'true' || value === '1';
          break;
      }
    } else if (!id) {
      // First bare word is the ID
      id = part;
    }
  }

  return { id, src, group, volume, loop };
}

// =============================================================================
// Audio Effects Manager
// =============================================================================

export interface AudioBackend {
  play(id: string, src: string, volume: number, loop: boolean): void;
  stop(id: string): void;
  setVolume(id: string, volume: number): void;
  isPlaying(id: string): boolean;
}

/**
 * Default no-op audio backend
 */
export const nullAudioBackend: AudioBackend = {
  play: () => {},
  stop: () => {},
  setVolume: () => {},
  isPlaying: () => false,
};

export class AudioEffects {
  private tracks: Map<string, AudioTrack> = new Map();
  private declarations: Map<string, AudioDeclaration> = new Map();
  private groupVolumes: Record<AudioGroup, number> = {
    music: 1.0,
    sfx: 1.0,
    ambient: 1.0,
    voice: 1.0,
  };
  private masterMuted: boolean = false;
  private backend: AudioBackend;

  constructor(backend: AudioBackend = nullAudioBackend) {
    this.backend = backend;
  }

  /**
   * Set the audio backend
   */
  setBackend(backend: AudioBackend): void {
    this.backend = backend;
  }

  // ==========================================================================
  // Audio Declarations
  // ==========================================================================

  /**
   * Declare an audio asset
   */
  declare(declaration: string | AudioDeclaration): void {
    const decl =
      typeof declaration === 'string'
        ? parseAudioDeclaration(declaration)
        : declaration;

    this.declarations.set(decl.id, decl);
  }

  /**
   * Declare multiple audio assets
   */
  declareMany(declarations: (string | AudioDeclaration)[]): void {
    for (const decl of declarations) {
      this.declare(decl);
    }
  }

  /**
   * Get declaration by ID
   */
  getDeclaration(id: string): AudioDeclaration | undefined {
    return this.declarations.get(id);
  }

  // ==========================================================================
  // Playback Control
  // ==========================================================================

  /**
   * Play an audio track
   */
  play(
    id: string,
    options: AudioEffectOptions = {}
  ): AudioTrack | null {
    const decl = this.declarations.get(id);

    if (!decl) {
      console.warn(`AudioEffects: Unknown audio '${id}'`);
      return null;
    }

    const volume = options.volume ?? decl.volume ?? 1.0;
    const loop = options.loop ?? decl.loop ?? false;
    const fadeDuration = options.fadeDuration ?? 0;

    const track: AudioTrack = {
      id,
      group: decl.group,
      volume,
      loop,
      playing: true,
      fadeState:
        fadeDuration > 0
          ? {
              type: 'in',
              startVolume: 0,
              targetVolume: volume,
              duration: fadeDuration,
              elapsed: 0,
            }
          : undefined,
    };

    this.tracks.set(id, track);

    const effectiveVolume = this.getEffectiveVolume(track);
    this.backend.play(
      id,
      decl.src,
      fadeDuration > 0 ? 0 : effectiveVolume,
      loop
    );

    return track;
  }

  /**
   * Stop an audio track
   */
  stop(id: string, fadeDuration: number = 0): boolean {
    const track = this.tracks.get(id);

    if (!track || !track.playing) {
      return false;
    }

    if (fadeDuration > 0) {
      track.fadeState = {
        type: 'out',
        startVolume: track.volume,
        targetVolume: 0,
        duration: fadeDuration,
        elapsed: 0,
      };
    } else {
      track.playing = false;
      this.backend.stop(id);
    }

    return true;
  }

  /**
   * Stop all tracks in a group
   */
  stopGroup(group: AudioGroup, fadeDuration: number = 0): void {
    for (const [id, track] of this.tracks) {
      if (track.group === group && track.playing) {
        this.stop(id, fadeDuration);
      }
    }
  }

  /**
   * Stop all tracks
   */
  stopAll(fadeDuration: number = 0): void {
    for (const id of this.tracks.keys()) {
      this.stop(id, fadeDuration);
    }
  }

  /**
   * Pause a track
   */
  pause(id: string): boolean {
    const track = this.tracks.get(id);

    if (!track || !track.playing) {
      return false;
    }

    track.playing = false;
    return true;
  }

  /**
   * Resume a paused track
   */
  resume(id: string): boolean {
    const track = this.tracks.get(id);

    if (!track || track.playing) {
      return false;
    }

    track.playing = true;
    return true;
  }

  // ==========================================================================
  // Crossfade
  // ==========================================================================

  /**
   * Crossfade from one track to another
   */
  crossfade(
    fromId: string,
    toId: string,
    duration: number = 1000,
    options: AudioEffectOptions = {}
  ): boolean {
    const fromTrack = this.tracks.get(fromId);

    // Stop the old track with fade out
    if (fromTrack && fromTrack.playing) {
      this.stop(fromId, duration);
    }

    // Start the new track with fade in
    const newOptions = { ...options, fadeDuration: duration };
    const newTrack = this.play(toId, newOptions);

    return newTrack !== null;
  }

  // ==========================================================================
  // Volume Control
  // ==========================================================================

  /**
   * Set volume for a specific track
   */
  setTrackVolume(id: string, volume: number): boolean {
    const track = this.tracks.get(id);

    if (!track) {
      return false;
    }

    track.volume = Math.max(0, Math.min(1, volume));
    this.backend.setVolume(id, this.getEffectiveVolume(track));

    return true;
  }

  /**
   * Set volume for an audio group
   */
  setGroupVolume(group: AudioGroup, volume: number): void {
    this.groupVolumes[group] = Math.max(0, Math.min(1, volume));

    // Update all tracks in this group
    for (const [id, track] of this.tracks) {
      if (track.group === group && track.playing) {
        this.backend.setVolume(id, this.getEffectiveVolume(track));
      }
    }
  }

  /**
   * Get volume for an audio group
   */
  getGroupVolume(group: AudioGroup): number {
    return this.groupVolumes[group];
  }

  /**
   * Mute all audio
   */
  mute(): void {
    this.masterMuted = true;

    for (const [id, track] of this.tracks) {
      if (track.playing) {
        this.backend.setVolume(id, 0);
      }
    }
  }

  /**
   * Unmute all audio
   */
  unmute(): void {
    this.masterMuted = false;

    for (const [id, track] of this.tracks) {
      if (track.playing) {
        this.backend.setVolume(id, this.getEffectiveVolume(track));
      }
    }
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.masterMuted;
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    if (this.masterMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.masterMuted;
  }

  /**
   * Calculate effective volume for a track
   */
  private getEffectiveVolume(track: AudioTrack): number {
    if (this.masterMuted) {
      return 0;
    }

    let volume = track.volume;

    if (track.fadeState && track.fadeState.type !== 'crossfade') {
      const progress = Math.min(
        track.fadeState.elapsed / track.fadeState.duration,
        1
      );
      volume =
        track.fadeState.startVolume +
        (track.fadeState.targetVolume - track.fadeState.startVolume) * progress;
    }

    return volume * this.groupVolumes[track.group];
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Update fades and effects
   */
  update(deltaMs: number): void {
    const toRemove: string[] = [];

    for (const [id, track] of this.tracks) {
      if (track.fadeState && track.playing) {
        track.fadeState.elapsed += deltaMs;

        const progress = Math.min(
          track.fadeState.elapsed / track.fadeState.duration,
          1
        );

        if (progress >= 1) {
          // Fade complete
          if (track.fadeState.type === 'out') {
            track.playing = false;
            this.backend.stop(id);
            toRemove.push(id);
          } else {
            track.volume = track.fadeState.targetVolume;
            track.fadeState = undefined;
            this.backend.setVolume(id, this.getEffectiveVolume(track));
          }
        } else {
          // Update volume during fade
          this.backend.setVolume(id, this.getEffectiveVolume(track));
        }
      }
    }

    for (const id of toRemove) {
      this.tracks.delete(id);
    }
  }

  /**
   * Get a track by ID
   */
  getTrack(id: string): AudioTrack | undefined {
    return this.tracks.get(id);
  }

  /**
   * Get all playing tracks
   */
  getPlayingTracks(): AudioTrack[] {
    return Array.from(this.tracks.values()).filter((t) => t.playing);
  }

  /**
   * Get all tracks in a group
   */
  getGroupTracks(group: AudioGroup): AudioTrack[] {
    return Array.from(this.tracks.values()).filter((t) => t.group === group);
  }

  /**
   * Check if a track is playing
   */
  isPlaying(id: string): boolean {
    const track = this.tracks.get(id);
    return track?.playing ?? false;
  }

  /**
   * Get state for serialization
   */
  getState(): AudioState {
    return {
      playing: new Map(this.tracks),
      volumes: { ...this.groupVolumes },
      muted: this.masterMuted,
    };
  }

  /**
   * Restore state
   */
  restoreState(state: AudioState): void {
    this.groupVolumes = { ...state.volumes };
    this.masterMuted = state.muted;

    // Note: Actual playback restoration would require backend support
    for (const [id, track] of state.playing) {
      this.tracks.set(id, { ...track });
    }
  }

  /**
   * Reset the manager
   */
  reset(): void {
    this.stopAll();
    this.tracks.clear();
    this.declarations.clear();
    this.groupVolumes = {
      music: 1.0,
      sfx: 1.0,
      ambient: 1.0,
      voice: 1.0,
    };
    this.masterMuted = false;
  }
}

/**
 * Factory function to create an AudioEffects manager
 */
export function createAudioEffects(backend?: AudioBackend): AudioEffects {
  return new AudioEffects(backend);
}
