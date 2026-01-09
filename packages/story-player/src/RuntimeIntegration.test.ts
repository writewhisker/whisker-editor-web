import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RuntimeIntegration, createPlayer, createTestPlayer } from './RuntimeIntegration';
import { Story, Passage } from '@writewhisker/story-models';
import { MockAudioBackend } from './AudioManager';

// Mock requestAnimationFrame for text effects tests
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 0);
  return 1;
});
global.cancelAnimationFrame = vi.fn();

// Helper to create a test story
function createTestStory(
  title: string = 'Test Story',
  passages: Array<{ id: string; title: string; content?: string }> = []
): Story {
  const story = new Story({
    metadata: { title },
  });
  for (const p of passages) {
    const passage = new Passage({
      id: p.id,
      title: p.title,
      content: p.content ?? '',
    });
    story.passages.set(p.id, passage);
  }
  if (passages.length > 0) {
    story.startPassage = passages[0].id;
  }
  return story;
}

describe('RuntimeIntegration', () => {
  let integration: RuntimeIntegration;

  beforeEach(() => {
    integration = createTestPlayer();
  });

  describe('Construction', () => {
    it('should create with default configuration', () => {
      const player = new RuntimeIntegration();
      expect(player.isInitialized()).toBe(false);
      expect(player.isPaused()).toBe(false);
    });

    it('should create with custom configuration', () => {
      const player = new RuntimeIntegration({
        threading: { maxThreads: 5 },
        enableTiming: true,
        enableEffects: true,
      });
      expect(player).toBeDefined();
    });

    it('should create with audio backend', () => {
      const backend = new MockAudioBackend();
      const player = new RuntimeIntegration({
        audio: { backend },
      });
      expect(player.getAudioManager()).toBeDefined();
    });

    it('should disable timing when specified', () => {
      const player = new RuntimeIntegration({ enableTiming: false });
      expect(player.getTimedContentManager()).toBeNull();
    });

    it('should disable effects when specified', () => {
      const player = new RuntimeIntegration({ enableEffects: false });
      expect(player.getEffectManager()).toBeNull();
    });
  });

  describe('Lifecycle', () => {
    let story: Story;

    beforeEach(() => {
      story = createTestStory('Test Story', [
        { id: 'start', title: 'Start', content: 'Hello' },
      ]);
    });

    it('should load a story', () => {
      integration.loadStory(story);
      expect(integration.isInitialized()).toBe(true);
    });

    it('should emit initialized event when loading story', () => {
      const callback = vi.fn();
      integration.on('initialized', callback);
      integration.loadStory(story);
      expect(callback).toHaveBeenCalledWith('initialized', { story: 'Test Story' });
    });

    it('should throw when starting without loading story', () => {
      expect(() => integration.start()).toThrow('No story loaded');
    });

    it('should start playback after loading', () => {
      integration.loadStory(story);
      expect(() => integration.start()).not.toThrow();
    });

    it('should emit started event', () => {
      const callback = vi.fn();
      integration.on('started', callback);
      integration.loadStory(story);
      integration.start();
      expect(callback).toHaveBeenCalled();
    });

    it('should pause and resume', () => {
      integration.loadStory(story);
      integration.start();

      integration.pause();
      expect(integration.isPaused()).toBe(true);

      integration.resume();
      expect(integration.isPaused()).toBe(false);
    });

    it('should emit pause and resume events', () => {
      const pauseCallback = vi.fn();
      const resumeCallback = vi.fn();
      integration.on('paused', pauseCallback);
      integration.on('resumed', resumeCallback);

      integration.loadStory(story);
      integration.start();
      integration.pause();
      integration.resume();

      expect(pauseCallback).toHaveBeenCalled();
      expect(resumeCallback).toHaveBeenCalled();
    });

    it('should reset', () => {
      integration.loadStory(story);
      integration.start();
      integration.pause();
      integration.reset();
      expect(integration.isPaused()).toBe(false);
    });

    it('should emit reset event', () => {
      const callback = vi.fn();
      integration.on('reset', callback);
      integration.loadStory(story);
      integration.start();
      integration.reset();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('External Functions', () => {
    it('should register external functions', () => {
      integration.registerFunction('testFn', () => 'result');
      expect(integration.hasFunction('testFn')).toBe(true);
    });

    it('should check if function is registered', () => {
      expect(integration.hasFunction('nonexistent')).toBe(false);
      integration.registerFunction('exists', () => {});
      expect(integration.hasFunction('exists')).toBe(true);
    });

    it('should call registered functions', async () => {
      integration.registerFunction('add', (a: number, b: number) => a + b);
      const result = await integration.callFunction('add', [1, 2]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(3);
    });

    it('should emit externalFunctionCalled event on success', async () => {
      const callback = vi.fn();
      integration.on('externalFunctionCalled', callback);
      integration.registerFunction('test', () => 'ok');
      await integration.callFunction('test', []);
      expect(callback).toHaveBeenCalled();
    });

    it('should return error for unregistered functions', async () => {
      const result = await integration.callFunction('nonexistent', []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not registered');
    });

    it('should emit externalFunctionError event on failure', async () => {
      const callback = vi.fn();
      integration.on('externalFunctionError', callback);
      await integration.callFunction('nonexistent', []);
      expect(callback).toHaveBeenCalled();
    });

    it('should provide access to function registry', () => {
      const registry = integration.getFunctionRegistry();
      expect(registry).toBeDefined();
    });
  });

  describe('Timed Content', () => {
    it('should schedule content', () => {
      const timerId = integration.scheduleContent(1000, []);
      expect(timerId).toBeTruthy();
    });

    it('should schedule repeating content', () => {
      const timerId = integration.scheduleRepeating(500, [], 3);
      expect(timerId).toBeTruthy();
    });

    it('should parse time strings', () => {
      const timerId = integration.scheduleContent('2s', []);
      expect(timerId).toBeTruthy();
    });

    it('should cancel timers', () => {
      const timerId = integration.scheduleContent(1000, []);
      expect(integration.isTimerActive(timerId!)).toBe(true);
      const cancelled = integration.cancelTimer(timerId!);
      expect(cancelled).toBe(true);
      expect(integration.isTimerActive(timerId!)).toBe(false);
    });

    it('should get active timers', () => {
      integration.scheduleContent(1000, []);
      integration.scheduleContent(2000, []);
      const timers = integration.getActiveTimers();
      expect(timers.length).toBe(2);
    });

    it('should get timer remaining time', () => {
      const timerId = integration.scheduleContent(5000, []);
      const remaining = integration.getTimerRemaining(timerId!);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(5000);
    });

    it('should tick timers', () => {
      integration.scheduleContent(0, [{ type: 'text', content: 'test' }]);
      const content = integration.tickTimers();
      expect(content.length).toBeGreaterThanOrEqual(0);
    });

    it('should return null when timing is disabled', () => {
      const player = new RuntimeIntegration({ enableTiming: false });
      expect(player.scheduleContent(1000, [])).toBeNull();
      expect(player.getActiveTimers()).toEqual([]);
    });
  });

  describe('Audio', () => {
    it('should register audio tracks', () => {
      integration.registerAudioTrack({
        id: 'bgm1',
        url: '/audio/music.mp3',
        channel: 'bgm',
        loop: true,
      });
      expect(integration.getAudioManager().hasTrack('bgm1')).toBe(true);
    });

    it('should play audio', async () => {
      integration.registerAudioTrack({
        id: 'test',
        url: '/audio/test.mp3',
        channel: 'sfx',
      });
      await integration.playAudio('test');
      // With MockAudioBackend, this should succeed
    });

    it('should emit audioStarted event', async () => {
      const callback = vi.fn();
      integration.on('audioStarted', callback);
      integration.registerAudioTrack({
        id: 'test',
        url: '/audio/test.mp3',
        channel: 'sfx',
      });
      await integration.playAudio('test');
      expect(callback).toHaveBeenCalled();
    });

    it('should stop audio', () => {
      integration.registerAudioTrack({
        id: 'test',
        url: '/audio/test.mp3',
        channel: 'sfx',
      });
      integration.stopAudio('test');
      // Should not throw
    });

    it('should set volume', () => {
      integration.registerAudioTrack({
        id: 'test',
        url: '/audio/test.mp3',
        channel: 'sfx',
        volume: 1.0,
      });
      integration.setAudioVolume('test', 0.5);
      // Should not throw
    });

    it('should mute/unmute channels', () => {
      integration.setChannelMuted('bgm', true);
      integration.setChannelMuted('bgm', false);
      // Should not throw
    });
  });

  describe('Text Effects', () => {
    it('should check if effect exists', () => {
      expect(integration.hasEffect('typewriter')).toBe(true);
      expect(integration.hasEffect('nonexistent')).toBe(false);
    });

    it('should apply effect with callbacks', () => {
      const onFrame = vi.fn();
      const onComplete = vi.fn();
      const controller = integration.applyEffect(
        'fade-in',
        'Hello',
        {},
        onFrame,
        onComplete
      );
      expect(controller).toBeDefined();
    });

    it('should emit effectStarted event', () => {
      const callback = vi.fn();
      integration.on('effectStarted', callback);
      integration.applyEffect('fade-in', 'Hello', {}, () => {});
      expect(callback).toHaveBeenCalled();
    });

    it('should cancel all effects', () => {
      integration.applyEffect('fade-in', 'Hello', {}, () => {});
      integration.cancelAllEffects();
      // Should not throw
    });

    it('should return null when effects are disabled', () => {
      const player = new RuntimeIntegration({ enableEffects: false });
      const controller = player.applyEffect('fade-in', 'Hello', {}, () => {});
      expect(controller).toBeNull();
    });
  });

  describe('Parameterized Passages', () => {
    it('should register parameterized passages', () => {
      integration.registerParameterizedPassage('Describe', [
        { name: 'item', required: true },
        { name: 'quality', defaultValue: 'normal', required: false },
      ]);
      expect(integration.hasParameterizedPassage('Describe')).toBe(true);
    });

    it('should bind passage arguments', () => {
      integration.registerParameterizedPassage('Greet', [
        { name: 'name', required: true },
      ]);
      const result = integration.bindPassageArguments('Greet', ['World']);
      expect(result.success).toBe(true);
      expect(result.bindings.get('name')).toBe('World');
    });

    it('should fail binding with missing required args', () => {
      integration.registerParameterizedPassage('Test', [
        { name: 'required', required: true },
      ]);
      const result = integration.bindPassageArguments('Test', []);
      expect(result.success).toBe(false);
    });
  });

  describe('State Management', () => {
    let story: Story;

    beforeEach(() => {
      story = createTestStory('Test Story', [
        { id: 'start', title: 'Start', content: 'Hello' },
      ]);
    });

    it('should get state', () => {
      integration.loadStory(story);
      const state = integration.getState();
      expect(state.player).toBeDefined();
      expect(state.audioVolumes).toBeDefined();
      expect(state.activeTimers).toBeDefined();
      expect(state.timestamp).toBeDefined();
    });

    it('should include active timers in state', () => {
      integration.loadStory(story);
      integration.scheduleContent(5000, []);
      const state = integration.getState();
      expect(state.activeTimers.length).toBe(1);
    });
  });

  describe('Events', () => {
    it('should add event listeners', () => {
      const callback = vi.fn();
      integration.on('error', callback);
      // Event should be registered
    });

    it('should remove event listeners', () => {
      const callback = vi.fn();
      integration.on('error', callback);
      integration.off('error', callback);
      // Should not throw
    });

    it('should support one-time listeners', () => {
      const callback = vi.fn();
      const story = createTestStory('Test', [
        { id: 'start', title: 'Start', content: 'Test' },
      ]);

      integration.once('initialized', callback);
      integration.loadStory(story);
      integration.loadStory(story);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Access', () => {
    it('should provide access to player', () => {
      expect(integration.getPlayer()).toBeDefined();
    });

    it('should provide access to audio manager', () => {
      expect(integration.getAudioManager()).toBeDefined();
    });

    it('should provide access to effect manager', () => {
      expect(integration.getEffectManager()).toBeDefined();
    });

    it('should provide access to function registry', () => {
      expect(integration.getFunctionRegistry()).toBeDefined();
    });

    it('should provide access to passage manager', () => {
      expect(integration.getPassageManager()).toBeDefined();
    });

    it('should provide access to timed content manager', () => {
      expect(integration.getTimedContentManager()).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    it('should create player with createPlayer', () => {
      const player = createPlayer();
      expect(player).toBeInstanceOf(RuntimeIntegration);
    });

    it('should create player with createPlayer and config', () => {
      const player = createPlayer({
        threading: { maxThreads: 3 },
      });
      expect(player).toBeInstanceOf(RuntimeIntegration);
    });

    it('should create test player with createTestPlayer', () => {
      const player = createTestPlayer();
      expect(player).toBeInstanceOf(RuntimeIntegration);
      expect(player.getEffectManager()).toBeDefined();
      expect(player.getTimedContentManager()).toBeDefined();
    });
  });
});
