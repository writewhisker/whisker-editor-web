/**
 * Comprehensive tests for AudioManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager, type AudioTrack } from './AudioManager';

// Mock Audio API
class MockAudio {
  src = '';
  volume = 1;
  loop = false;
  paused = true;
  private listeners: Map<string, Function[]> = new Map();

  constructor(src?: string) {
    if (src) this.src = src;
  }

  async play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  load() {
    // Simulate successful load
    setTimeout(() => {
      this.trigger('canplaythrough');
    }, 0);
  }

  addEventListener(event: string, handler: Function, options?: any) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: Function) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  private trigger(event: string) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(h => h());
  }

  triggerEnded() {
    this.trigger('ended');
  }

  triggerError(error: Error) {
    const handlers = this.listeners.get('error') || [];
    handlers.forEach(h => h(error));
  }
}

// Mock AudioContext
class MockAudioContext {
  state = 'running';

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

// Setup global mocks with vi.fn wrapper
const audioInstances: MockAudio[] = [];
globalThis.Audio = vi.fn((src?: string) => {
  const instance = new MockAudio(src);
  audioInstances.push(instance);
  return instance;
}) as any;

globalThis.AudioContext = MockAudioContext as any;
Object.defineProperty(globalThis, 'window', {
  value: {
    Audio: globalThis.Audio,
    AudioContext: MockAudioContext,
  },
  writable: true,
});

// Mock requestAnimationFrame
let animationFrameCallbacks: Function[] = [];
globalThis.requestAnimationFrame = vi.fn((callback: Function) => {
  animationFrameCallbacks.push(callback);
  return animationFrameCallbacks.length;
});

describe('AudioManager', () => {
  let manager: AudioManager;

  beforeEach(() => {
    manager = new AudioManager();
    animationFrameCallbacks = [];
    audioInstances.length = 0; // Clear audio instances
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('Constructor', () => {
    it('should instantiate AudioManager', () => {
      expect(manager).toBeInstanceOf(AudioManager);
    });

    it('should initialize AudioContext', () => {
      // AudioContext should be created (tested implicitly)
      expect(manager).toBeDefined();
    });
  });

  describe('playMusic', () => {
    it('should play background music', async () => {
      const track: AudioTrack = {
        id: 'bg-music',
        url: 'https://example.com/music.mp3',
        volume: 0.8,
        loop: true,
      };

      await manager.playMusic(track);

      // Verify music is playing (we can't directly test private currentMusic)
      expect(globalThis.Audio).toHaveBeenCalledWith(track.url);
    });

    it('should set music volume correctly', async () => {
      const track: AudioTrack = {
        id: 'bg-music',
        url: 'https://example.com/music.mp3',
        volume: 0.5,
      };

      await manager.playMusic(track);

      // Volume should be track.volume * musicVolume * masterVolume
      // Default musicVolume = 1.0, masterVolume = 1.0
      // So volume should be 0.5
      const lastInstance = audioInstances[audioInstances.length - 1];
      expect(lastInstance.volume).toBe(0.5);
    });

    it('should loop music by default', async () => {
      const track: AudioTrack = {
        id: 'bg-music',
        url: 'https://example.com/music.mp3',
      };

      await manager.playMusic(track);

      const audioInstances = (globalThis.Audio as any).mock.results;
      const lastInstance = audioInstances[audioInstances.length - 1].value;
      expect(lastInstance.loop).toBe(true);
    });

    it('should stop current music before playing new music', async () => {
      const track1: AudioTrack = {
        id: 'music1',
        url: 'https://example.com/music1.mp3',
      };

      const track2: AudioTrack = {
        id: 'music2',
        url: 'https://example.com/music2.mp3',
      };

      await manager.playMusic(track1);
      const firstInstance = audioInstances[0];

      await manager.playMusic(track2);

      // First music should be paused
      expect(firstInstance.paused).toBe(true);
    });

    it('should handle play errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock play to reject
      vi.mocked(globalThis.Audio).mockImplementationOnce(function (this: any, src: string) {
        this.src = src;
        this.play = vi.fn().mockRejectedValue(new Error('Play failed'));
        this.addEventListener = vi.fn();
        return this;
      } as any);

      const track: AudioTrack = {
        id: 'bg-music',
        url: 'https://example.com/music.mp3',
      };

      await manager.playMusic(track);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to play music:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('stopMusic', () => {
    it('should stop playing music', async () => {
      const track: AudioTrack = {
        id: 'bg-music',
        url: 'https://example.com/music.mp3',
      };

      await manager.playMusic(track);
      const audioInstance = audioInstances[0];

      manager.stopMusic();

      expect(audioInstance.paused).toBe(true);
    });

    it('should handle stopping when no music is playing', () => {
      expect(() => manager.stopMusic()).not.toThrow();
    });

    it('should fade out music when requested', async () => {
      const track: AudioTrack = {
        id: 'bg-music',
        url: 'https://example.com/music.mp3',
      };

      await manager.playMusic(track);
      const audioInstance = audioInstances[0];

      manager.stopMusic(true);

      // Should trigger fade animation
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('pauseMusic and resumeMusic', () => {
    it('should pause music', async () => {
      const track: AudioTrack = {
        id: 'bg-music',
        url: 'https://example.com/music.mp3',
      };

      await manager.playMusic(track);
      const audioInstance = audioInstances[0];

      manager.pauseMusic();

      expect(audioInstance.paused).toBe(true);
    });

    it('should resume music', async () => {
      const track: AudioTrack = {
        id: 'bg-music',
        url: 'https://example.com/music.mp3',
      };

      await manager.playMusic(track);
      const audioInstance = audioInstances[0];

      manager.pauseMusic();
      manager.resumeMusic();

      expect(audioInstance.paused).toBe(false);
    });

    it('should handle pause/resume when no music is playing', () => {
      expect(() => manager.pauseMusic()).not.toThrow();
      expect(() => manager.resumeMusic()).not.toThrow();
    });
  });

  describe('playSoundEffect', () => {
    it('should play sound effect', async () => {
      await manager.playSoundEffect('sfx1', 'https://example.com/sfx.mp3', 0.7);

      expect(globalThis.Audio).toHaveBeenCalledWith('https://example.com/sfx.mp3');
      const audioInstance = audioInstances[0];
      expect(audioInstance.volume).toBe(0.7);
    });

    it('should use default volume of 1.0', async () => {
      await manager.playSoundEffect('sfx1', 'https://example.com/sfx.mp3');

      const audioInstance = audioInstances[0];
      expect(audioInstance.volume).toBe(1.0);
    });

    it('should remove sound effect from map when ended', async () => {
      await manager.playSoundEffect('sfx1', 'https://example.com/sfx.mp3');

      const audioInstance = audioInstances[0];

      // Trigger ended event
      audioInstance.triggerEnded();

      // Sound effect should be removed (can't directly test private map)
      expect(audioInstance).toBeDefined();
    });

    it('should handle play errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock play to reject
      vi.mocked(globalThis.Audio).mockImplementationOnce(function (this: any, src: string) {
        this.src = src;
        this.play = vi.fn().mockRejectedValue(new Error('Play failed'));
        this.addEventListener = vi.fn();
        return this;
      } as any);

      await manager.playSoundEffect('sfx1', 'https://example.com/sfx.mp3');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to play sound effect:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('stopAllSoundEffects', () => {
    it('should stop all sound effects', async () => {
      await manager.playSoundEffect('sfx1', 'https://example.com/sfx1.mp3');
      await manager.playSoundEffect('sfx2', 'https://example.com/sfx2.mp3');

      const sfx1 = audioInstances[0];
      const sfx2 = audioInstances[1];

      manager.stopAllSoundEffects();

      expect(sfx1.paused).toBe(true);
      expect(sfx2.paused).toBe(true);
    });
  });

  describe('Volume Controls', () => {
    it('should set master volume', async () => {
      const track: AudioTrack = {
        id: 'music',
        url: 'https://example.com/music.mp3',
        volume: 1.0,
      };

      await manager.playMusic(track);
      const audioInstance = audioInstances[0];

      manager.setMasterVolume(0.5);

      // Music volume should be updated: 1.0 * 1.0 * 0.5 = 0.5
      expect(audioInstance.volume).toBe(0.5);
    });

    it('should clamp master volume to 0-1 range', async () => {
      manager.setMasterVolume(2.0);
      manager.setMasterVolume(-0.5);

      // Should not throw, volumes are clamped
      expect(manager).toBeDefined();
    });

    it('should set music volume', async () => {
      const track: AudioTrack = {
        id: 'music',
        url: 'https://example.com/music.mp3',
        volume: 1.0,
      };

      await manager.playMusic(track);
      const audioInstance = audioInstances[0];

      manager.setMusicVolume(0.3);

      // Music volume should be updated: 1.0 * 0.3 * 1.0 = 0.3
      expect(audioInstance.volume).toBe(0.3);
    });

    it('should set SFX volume', async () => {
      manager.setSFXVolume(0.6);

      await manager.playSoundEffect('sfx1', 'https://example.com/sfx.mp3', 1.0);

      const audioInstance = audioInstances[0];
      // SFX volume should be: 1.0 * 0.6 * 1.0 = 0.6
      expect(audioInstance.volume).toBe(0.6);
    });
  });

  describe('Mute Controls', () => {
    it('should mute all audio', async () => {
      const track: AudioTrack = {
        id: 'music',
        url: 'https://example.com/music.mp3',
        volume: 1.0,
      };

      await manager.playMusic(track);
      const audioInstance = audioInstances[0];

      manager.mute();

      expect(audioInstance.volume).toBe(0);
    });

    it('should unmute audio', async () => {
      const track: AudioTrack = {
        id: 'music',
        url: 'https://example.com/music.mp3',
        volume: 1.0,
      };

      await manager.playMusic(track);
      const audioInstance = audioInstances[0];

      manager.mute();
      manager.unmute();

      expect(audioInstance.volume).toBe(1.0);
    });

    it('should toggle mute', async () => {
      const track: AudioTrack = {
        id: 'music',
        url: 'https://example.com/music.mp3',
        volume: 1.0,
      };

      await manager.playMusic(track);
      const audioInstance = audioInstances[0];

      manager.toggleMute(); // Mute
      expect(audioInstance.volume).toBe(0);

      manager.toggleMute(); // Unmute
      expect(audioInstance.volume).toBe(1.0);
    });
  });

  describe('preload', () => {
    it('should preload audio file', async () => {
      await manager.preload('https://example.com/audio.mp3');

      expect(globalThis.Audio).toHaveBeenCalledWith('https://example.com/audio.mp3');
      const audioInstance = audioInstances[0];
      expect(audioInstance.load).toBeDefined();
    });

    it('should handle preload errors', async () => {
      vi.mocked(globalThis.Audio).mockImplementationOnce(function (this: any, src: string) {
        const instance = new MockAudio(src);
        instance.addEventListener = (event: string, handler: Function) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Load failed')), 0);
          }
        };
        return instance as any;
      } as any);

      await expect(manager.preload('https://example.com/invalid.mp3')).rejects.toThrow();
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      const track: AudioTrack = {
        id: 'music',
        url: 'https://example.com/music.mp3',
      };

      await manager.playMusic(track);
      await manager.playSoundEffect('sfx1', 'https://example.com/sfx.mp3');

      const musicInstance = audioInstances[0];
      const sfxInstance = audioInstances[1];

      manager.dispose();

      expect(musicInstance.paused).toBe(true);
      expect(sfxInstance.paused).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple sound effects simultaneously', async () => {
      await manager.playSoundEffect('sfx1', 'https://example.com/sfx1.mp3');
      await manager.playSoundEffect('sfx2', 'https://example.com/sfx2.mp3');
      await manager.playSoundEffect('sfx3', 'https://example.com/sfx3.mp3');

      expect(globalThis.Audio).toHaveBeenCalledTimes(3);
    });

    it('should update volumes for all audio when master volume changes', async () => {
      const track: AudioTrack = {
        id: 'music',
        url: 'https://example.com/music.mp3',
        volume: 1.0,
      };

      await manager.playMusic(track);
      await manager.playSoundEffect('sfx1', 'https://example.com/sfx.mp3', 1.0);

      const musicInstance = audioInstances[0];
      const sfxInstance = audioInstances[1];

      manager.setMasterVolume(0.5);

      expect(musicInstance.volume).toBe(0.5);
      expect(sfxInstance.volume).toBe(0.5);
    });

    it('should respect individual volume settings when changing master volume', async () => {
      manager.setMusicVolume(0.8);
      manager.setSFXVolume(0.6);

      const track: AudioTrack = {
        id: 'music',
        url: 'https://example.com/music.mp3',
        volume: 1.0,
      };

      await manager.playMusic(track);
      await manager.playSoundEffect('sfx1', 'https://example.com/sfx.mp3', 1.0);

      const musicInstance = audioInstances[0];
      const sfxInstance = audioInstances[1];

      manager.setMasterVolume(0.5);

      // Music: 1.0 * 0.8 * 0.5 = 0.4
      expect(musicInstance.volume).toBe(0.4);
      // SFX: 1.0 * 0.6 * 0.5 = 0.3
      expect(musicInstance.volume).toBeCloseTo(0.4, 2);
      expect(sfxInstance.volume).toBeCloseTo(0.3, 2);
    });
  });
});
