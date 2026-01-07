/**
 * AudioEffects Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AudioEffects,
  createAudioEffects,
  parseAudioDeclaration,
  type AudioBackend,
} from './AudioEffects';

describe('parseAudioDeclaration', () => {
  it('parses simple declaration', () => {
    const decl = parseAudioDeclaration('music:theme src:/audio/theme.mp3');

    expect(decl.id).toBe('theme');
    expect(decl.src).toBe('/audio/theme.mp3');
    expect(decl.group).toBe('music');
  });

  it('parses volume', () => {
    const decl = parseAudioDeclaration('sfx:click src:/click.mp3 volume:0.5');

    expect(decl.volume).toBe(0.5);
  });

  it('parses loop', () => {
    const decl = parseAudioDeclaration('ambient:rain src:/rain.mp3 loop:true');

    expect(decl.loop).toBe(true);
  });

  it('parses group key', () => {
    const decl = parseAudioDeclaration('id:narration src:/voice.mp3 group:voice');

    expect(decl.id).toBe('narration');
    expect(decl.group).toBe('voice');
  });

  it('uses first bare word as id', () => {
    const decl = parseAudioDeclaration('mySound src:/sound.mp3');

    expect(decl.id).toBe('mySound');
  });
});

describe('AudioEffects', () => {
  let audio: AudioEffects;
  let mockBackend: AudioBackend;

  beforeEach(() => {
    mockBackend = {
      play: vi.fn(),
      stop: vi.fn(),
      setVolume: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
    };
    audio = createAudioEffects(mockBackend);
  });

  describe('declarations', () => {
    it('declares audio from string', () => {
      audio.declare('music:theme src:/audio/theme.mp3');

      const decl = audio.getDeclaration('theme');
      expect(decl).toBeDefined();
      expect(decl!.src).toBe('/audio/theme.mp3');
    });

    it('declares audio from object', () => {
      audio.declare({
        id: 'click',
        src: '/click.mp3',
        group: 'sfx',
      });

      expect(audio.getDeclaration('click')).toBeDefined();
    });

    it('declares multiple', () => {
      audio.declareMany([
        'music:theme src:/theme.mp3',
        { id: 'click', src: '/click.mp3', group: 'sfx' },
      ]);

      expect(audio.getDeclaration('theme')).toBeDefined();
      expect(audio.getDeclaration('click')).toBeDefined();
    });
  });

  describe('play', () => {
    beforeEach(() => {
      audio.declare({
        id: 'test',
        src: '/test.mp3',
        group: 'sfx',
        volume: 0.8,
      });
    });

    it('plays declared audio', () => {
      const track = audio.play('test');

      expect(track).not.toBeNull();
      expect(mockBackend.play).toHaveBeenCalledWith('test', '/test.mp3', 0.8, false);
    });

    it('returns null for unknown audio', () => {
      const track = audio.play('unknown');

      expect(track).toBeNull();
    });

    it('applies options', () => {
      audio.play('test', { volume: 0.5, loop: true });

      expect(mockBackend.play).toHaveBeenCalledWith('test', '/test.mp3', 0.5, true);
    });

    it('starts fade in with volume 0', () => {
      audio.play('test', { fadeDuration: 1000 });

      expect(mockBackend.play).toHaveBeenCalledWith('test', '/test.mp3', 0, false);
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      audio.declare({ id: 'test', src: '/test.mp3', group: 'sfx' });
      audio.play('test');
    });

    it('stops playing audio', () => {
      audio.stop('test');

      expect(mockBackend.stop).toHaveBeenCalledWith('test');
    });

    it('returns false for non-playing audio', () => {
      audio.stop('test');
      const result = audio.stop('test');

      expect(result).toBe(false);
    });

    it('initiates fade out', () => {
      audio.stop('test', 500);

      const track = audio.getTrack('test');
      expect(track!.fadeState).toBeDefined();
      expect(track!.fadeState!.type).toBe('out');
    });
  });

  describe('stopGroup', () => {
    beforeEach(() => {
      audio.declare({ id: 'music1', src: '/m1.mp3', group: 'music' });
      audio.declare({ id: 'music2', src: '/m2.mp3', group: 'music' });
      audio.declare({ id: 'sfx1', src: '/s1.mp3', group: 'sfx' });
      audio.play('music1');
      audio.play('music2');
      audio.play('sfx1');
    });

    it('stops all in group', () => {
      audio.stopGroup('music');

      expect(mockBackend.stop).toHaveBeenCalledWith('music1');
      expect(mockBackend.stop).toHaveBeenCalledWith('music2');
      expect(mockBackend.stop).not.toHaveBeenCalledWith('sfx1');
    });
  });

  describe('stopAll', () => {
    beforeEach(() => {
      audio.declare({ id: 'a', src: '/a.mp3', group: 'sfx' });
      audio.declare({ id: 'b', src: '/b.mp3', group: 'music' });
      audio.play('a');
      audio.play('b');
    });

    it('stops all tracks', () => {
      audio.stopAll();

      expect(mockBackend.stop).toHaveBeenCalledWith('a');
      expect(mockBackend.stop).toHaveBeenCalledWith('b');
    });
  });

  describe('crossfade', () => {
    beforeEach(() => {
      audio.declare({ id: 'track1', src: '/t1.mp3', group: 'music' });
      audio.declare({ id: 'track2', src: '/t2.mp3', group: 'music' });
      audio.play('track1');
    });

    it('fades out old and fades in new', () => {
      audio.crossfade('track1', 'track2', 500);

      const oldTrack = audio.getTrack('track1');
      const newTrack = audio.getTrack('track2');

      expect(oldTrack!.fadeState!.type).toBe('out');
      expect(newTrack!.fadeState!.type).toBe('in');
    });
  });

  describe('volume control', () => {
    beforeEach(() => {
      audio.declare({ id: 'test', src: '/test.mp3', group: 'sfx' });
      audio.play('test');
    });

    it('sets track volume', () => {
      audio.setTrackVolume('test', 0.5);

      expect(mockBackend.setVolume).toHaveBeenCalled();
    });

    it('sets group volume', () => {
      audio.setGroupVolume('sfx', 0.5);

      expect(audio.getGroupVolume('sfx')).toBe(0.5);
      expect(mockBackend.setVolume).toHaveBeenCalled();
    });

    it('clamps volume to 0-1', () => {
      audio.setGroupVolume('sfx', 1.5);
      expect(audio.getGroupVolume('sfx')).toBe(1);

      audio.setGroupVolume('sfx', -0.5);
      expect(audio.getGroupVolume('sfx')).toBe(0);
    });
  });

  describe('mute', () => {
    beforeEach(() => {
      audio.declare({ id: 'test', src: '/test.mp3', group: 'sfx' });
      audio.play('test');
    });

    it('mutes all audio', () => {
      audio.mute();

      expect(audio.isMuted()).toBe(true);
      expect(mockBackend.setVolume).toHaveBeenCalledWith('test', 0);
    });

    it('unmutes all audio', () => {
      audio.mute();
      audio.unmute();

      expect(audio.isMuted()).toBe(false);
    });

    it('toggle toggles mute state', () => {
      audio.toggleMute();
      expect(audio.isMuted()).toBe(true);

      audio.toggleMute();
      expect(audio.isMuted()).toBe(false);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      audio.declare({ id: 'test', src: '/test.mp3', group: 'sfx' });
    });

    it('updates fade in', () => {
      audio.play('test', { fadeDuration: 100 });

      audio.update(50);
      expect(mockBackend.setVolume).toHaveBeenCalled();

      audio.update(50);
      const track = audio.getTrack('test');
      expect(track!.fadeState).toBeUndefined(); // Fade complete
    });

    it('completes fade out and stops', () => {
      audio.play('test');
      audio.stop('test', 100);

      audio.update(100);

      expect(mockBackend.stop).toHaveBeenCalledWith('test');
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      audio.declare({ id: 'a', src: '/a.mp3', group: 'music' });
      audio.declare({ id: 'b', src: '/b.mp3', group: 'sfx' });
      audio.play('a');
      audio.play('b');
    });

    it('isPlaying returns true for playing track', () => {
      expect(audio.isPlaying('a')).toBe(true);
    });

    it('getPlayingTracks returns all playing', () => {
      const tracks = audio.getPlayingTracks();
      expect(tracks).toHaveLength(2);
    });

    it('getGroupTracks returns tracks in group', () => {
      const tracks = audio.getGroupTracks('music');
      expect(tracks).toHaveLength(1);
      expect(tracks[0].id).toBe('a');
    });
  });

  describe('serialization', () => {
    it('getState returns state', () => {
      audio.declare({ id: 'test', src: '/test.mp3', group: 'sfx' });
      audio.play('test');
      audio.setGroupVolume('music', 0.5);

      const state = audio.getState();

      expect(state.volumes.music).toBe(0.5);
      expect(state.playing.has('test')).toBe(true);
    });

    it('restoreState restores state', () => {
      const state = {
        playing: new Map(),
        volumes: { music: 0.3, sfx: 0.8, ambient: 1, voice: 1 },
        muted: true,
      };

      audio.restoreState(state);

      expect(audio.getGroupVolume('music')).toBe(0.3);
      expect(audio.isMuted()).toBe(true);
    });
  });

  describe('reset', () => {
    it('stops all and clears state', () => {
      audio.declare({ id: 'test', src: '/test.mp3', group: 'sfx' });
      audio.play('test');
      audio.mute();

      audio.reset();

      expect(audio.getPlayingTracks()).toHaveLength(0);
      expect(audio.isMuted()).toBe(false);
    });
  });
});
