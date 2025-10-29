/**
 * Audio Manager
 *
 * Manages background music and sound effects for stories.
 */

export interface AudioTrack {
  id: string;
  url: string;
  volume?: number; // 0-1
  loop?: boolean;
}

export class AudioManager {
  private musicContext: AudioContext | null = null;
  private currentMusic: HTMLAudioElement | null = null;
  private soundEffects: Map<string, HTMLAudioElement> = new Map();

  private masterVolume = 1.0;
  private musicVolume = 1.0;
  private sfxVolume = 1.0;
  private muted = false;

  constructor() {
    // Initialize audio context on user interaction
    if (typeof window !== 'undefined') {
      this.musicContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Play background music
   */
  async playMusic(track: AudioTrack): Promise<void> {
    // Stop current music if playing
    if (this.currentMusic) {
      this.stopMusic();
    }

    const audio = new Audio(track.url);
    audio.loop = track.loop ?? true;
    audio.volume = (track.volume ?? 1.0) * this.musicVolume * this.masterVolume;

    try {
      await audio.play();
      this.currentMusic = audio;
    } catch (error) {
      console.error('Failed to play music:', error);
    }
  }

  /**
   * Stop background music
   */
  stopMusic(fadeOut: boolean = false): void {
    if (!this.currentMusic) return;

    if (fadeOut) {
      this.fadeOutMusic(1000).then(() => {
        this.currentMusic?.pause();
        this.currentMusic = null;
      });
    } else {
      this.currentMusic.pause();
      this.currentMusic = null;
    }
  }

  /**
   * Pause music
   */
  pauseMusic(): void {
    this.currentMusic?.pause();
  }

  /**
   * Resume music
   */
  resumeMusic(): void {
    this.currentMusic?.play();
  }

  /**
   * Play sound effect
   */
  async playSoundEffect(id: string, url: string, volume: number = 1.0): Promise<void> {
    const audio = new Audio(url);
    audio.volume = volume * this.sfxVolume * this.masterVolume;

    try {
      await audio.play();
      this.soundEffects.set(id, audio);

      // Remove from map when finished
      audio.addEventListener('ended', () => {
        this.soundEffects.delete(id);
      });
    } catch (error) {
      console.error('Failed to play sound effect:', error);
    }
  }

  /**
   * Stop all sound effects
   */
  stopAllSoundEffects(): void {
    this.soundEffects.forEach(audio => audio.pause());
    this.soundEffects.clear();
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  /**
   * Set music volume
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  /**
   * Set sound effects volume
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  /**
   * Mute all audio
   */
  mute(): void {
    this.muted = true;
    this.updateVolumes();
  }

  /**
   * Unmute all audio
   */
  unmute(): void {
    this.muted = false;
    this.updateVolumes();
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    this.muted = !this.muted;
    this.updateVolumes();
  }

  /**
   * Fade out music
   */
  private async fadeOutMusic(duration: number): Promise<void> {
    if (!this.currentMusic) return;

    const startVolume = this.currentMusic.volume;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const fade = () => {
        if (!this.currentMusic) {
          resolve();
          return;
        }

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        this.currentMusic.volume = startVolume * (1 - progress);

        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          resolve();
        }
      };

      fade();
    });
  }

  /**
   * Update all audio volumes
   */
  private updateVolumes(): void {
    const effectiveVolume = this.muted ? 0 : this.masterVolume;

    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume * effectiveVolume;
    }

    this.soundEffects.forEach(audio => {
      audio.volume = this.sfxVolume * effectiveVolume;
    });
  }

  /**
   * Preload audio file
   */
  async preload(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      audio.addEventListener('error', reject, { once: true });
      audio.load();
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopMusic();
    this.stopAllSoundEffects();
    this.musicContext?.close();
  }
}

// Singleton instance
export const audioManager = new AudioManager();
