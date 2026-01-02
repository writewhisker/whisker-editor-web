import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TextEffectManager,
  createTextEffectManager,
  parseEffectDeclaration,
  EFFECT_CSS,
  type EffectFrame,
  type TextEffect,
  type EffectOptions,
} from './TextEffects';

// Mock requestAnimationFrame for testing
const mockRAF = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(Date.now()), 16) as unknown as number;
};

const mockCAF = (id: number): void => {
  clearTimeout(id);
};

describe('TextEffectManager', () => {
  let manager: TextEffectManager;
  let originalRAF: typeof requestAnimationFrame;
  let originalCAF: typeof cancelAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock requestAnimationFrame
    originalRAF = globalThis.requestAnimationFrame;
    originalCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = mockRAF;
    globalThis.cancelAnimationFrame = mockCAF;

    manager = new TextEffectManager();
  });

  afterEach(() => {
    manager.cancelAll();
    vi.useRealTimers();
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
  });

  describe('built-in effects', () => {
    it('should have typewriter effect registered', () => {
      expect(manager.hasEffect('typewriter')).toBe(true);
    });

    it('should have shake effect registered', () => {
      expect(manager.hasEffect('shake')).toBe(true);
    });

    it('should have pulse effect registered', () => {
      expect(manager.hasEffect('pulse')).toBe(true);
    });

    it('should have glitch effect registered', () => {
      expect(manager.hasEffect('glitch')).toBe(true);
    });

    it('should have fade-in effect registered', () => {
      expect(manager.hasEffect('fade-in')).toBe(true);
    });

    it('should have slide effects registered', () => {
      expect(manager.hasEffect('slide-left')).toBe(true);
      expect(manager.hasEffect('slide-right')).toBe(true);
      expect(manager.hasEffect('slide-up')).toBe(true);
      expect(manager.hasEffect('slide-down')).toBe(true);
    });

    it('should get all effect names', () => {
      const names = manager.getEffectNames();
      expect(names).toContain('typewriter');
      expect(names).toContain('shake');
      expect(names).toContain('fade-in');
    });
  });

  describe('applyEffect', () => {
    it('should apply an effect and call onFrame', async () => {
      const onFrame = vi.fn();
      const onComplete = vi.fn();

      manager.applyEffect('fade-in', 'Hello', { duration: 100 }, onFrame, onComplete);

      // Advance through animation - each frame takes ~16ms in our mock
      await vi.advanceTimersByTimeAsync(32);
      expect(onFrame).toHaveBeenCalled();

      // Advance enough to complete the animation
      await vi.advanceTimersByTimeAsync(200);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should throw for unknown effect', () => {
      expect(() =>
        manager.applyEffect('unknown', 'test', {}, () => {})
      ).toThrow(/Unknown text effect/);
    });

    it('should return a controller', () => {
      const controller = manager.applyEffect(
        'fade-in',
        'Hello',
        { duration: 1000 },
        () => {}
      );

      expect(controller).toHaveProperty('cancel');
      expect(controller).toHaveProperty('pause');
      expect(controller).toHaveProperty('resume');
      expect(controller).toHaveProperty('skip');
      expect(controller).toHaveProperty('isComplete');
      expect(controller).toHaveProperty('isPaused');
    });
  });

  describe('typewriter effect', () => {
    it('should reveal text progressively', async () => {
      const frames: EffectFrame[] = [];
      const text = 'Hello';

      manager.applyEffect(
        'typewriter',
        text,
        { speed: 50 },
        (frame) => frames.push({ ...frame }),
        () => {}
      );

      // Advance through the animation
      for (let i = 0; i < 20; i++) {
        await vi.advanceTimersByTimeAsync(16);
      }

      // Should have progressively longer visible text
      const visibleTexts = frames.map((f) => f.visibleText);
      expect(visibleTexts[0].length).toBeLessThan(text.length);
      expect(visibleTexts[visibleTexts.length - 1]).toBe(text);
    });

    it('should be marked as progressive', () => {
      const effect = manager.getEffect('typewriter');
      expect(effect?.isProgressive).toBe(true);
    });
  });

  describe('controller', () => {
    it('should allow canceling an effect', async () => {
      const onComplete = vi.fn();

      const controller = manager.applyEffect(
        'fade-in',
        'Hello',
        { duration: 1000 },
        () => {},
        onComplete
      );

      controller.cancel();
      await vi.advanceTimersByTimeAsync(1000);

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should allow pausing and resuming', async () => {
      const frames: number[] = [];

      const controller = manager.applyEffect(
        'fade-in',
        'Hello',
        { duration: 200 },
        (frame) => frames.push(frame.progress),
        () => {}
      );

      await vi.advanceTimersByTimeAsync(50);
      controller.pause();
      expect(controller.isPaused()).toBe(true);

      const frameCountAtPause = frames.length;
      await vi.advanceTimersByTimeAsync(100);

      // No new frames while paused
      expect(frames.length).toBe(frameCountAtPause);

      controller.resume();
      expect(controller.isPaused()).toBe(false);

      await vi.advanceTimersByTimeAsync(200);
      expect(frames.length).toBeGreaterThan(frameCountAtPause);
    });

    it('should allow skipping to end', async () => {
      const onComplete = vi.fn();
      const lastFrame = { progress: 0 };

      const controller = manager.applyEffect(
        'fade-in',
        'Hello',
        { duration: 1000 },
        (frame) => {
          lastFrame.progress = frame.progress;
        },
        onComplete
      );

      await vi.advanceTimersByTimeAsync(16);
      controller.skip();

      expect(lastFrame.progress).toBe(1);
      expect(onComplete).toHaveBeenCalled();
      expect(controller.isComplete()).toBe(true);
    });
  });

  describe('registerEffect', () => {
    it('should register a custom effect', () => {
      const customEffect: TextEffect = {
        name: 'custom',
        apply(text, options, onFrame, onComplete) {
          onFrame({
            progress: 1,
            elapsed: 0,
            duration: 0,
            text,
            visibleText: text,
            data: {},
          });
          onComplete();
          return {
            cancel: () => {},
            pause: () => {},
            resume: () => {},
            skip: () => {},
            isComplete: () => true,
            isPaused: () => false,
          };
        },
      };

      manager.registerEffect(customEffect);
      expect(manager.hasEffect('custom')).toBe(true);
    });

    it('should unregister an effect', () => {
      expect(manager.unregisterEffect('shake')).toBe(true);
      expect(manager.hasEffect('shake')).toBe(false);
    });
  });

  describe('cancelAll/pauseAll/resumeAll/skipAll', () => {
    it('should cancel all active effects', async () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      manager.applyEffect('fade-in', 'A', { duration: 1000 }, () => {}, onComplete1);
      manager.applyEffect('fade-in', 'B', { duration: 1000 }, () => {}, onComplete2);

      expect(manager.getActiveCount()).toBe(2);

      manager.cancelAll();

      await vi.advanceTimersByTimeAsync(1000);

      expect(onComplete1).not.toHaveBeenCalled();
      expect(onComplete2).not.toHaveBeenCalled();
      expect(manager.getActiveCount()).toBe(0);
    });

    it('should skip all active effects', async () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      manager.applyEffect('fade-in', 'A', { duration: 1000 }, () => {}, onComplete1);
      manager.applyEffect('fade-in', 'B', { duration: 1000 }, () => {}, onComplete2);

      await vi.advanceTimersByTimeAsync(16);
      manager.skipAll();

      expect(onComplete1).toHaveBeenCalled();
      expect(onComplete2).toHaveBeenCalled();
    });
  });

  describe('getCSSClass', () => {
    it('should return correct CSS class', () => {
      expect(manager.getCSSClass('shake')).toBe('wls-effect-shake');
      expect(manager.getCSSClass('fade-in')).toBe('wls-effect-fade-in');
    });
  });

  describe('getCSSCustomProperty', () => {
    it('should return correct custom property', () => {
      expect(manager.getCSSCustomProperty(500)).toBe('--wls-duration: 500ms');
    });
  });
});

describe('parseEffectDeclaration', () => {
  it('should parse effect name only', () => {
    const result = parseEffectDeclaration('shake');
    expect(result.name).toBe('shake');
    expect(result.options).toEqual({});
  });

  it('should parse effect with duration in ms', () => {
    const result = parseEffectDeclaration('shake 500ms');
    expect(result.name).toBe('shake');
    expect(result.options.duration).toBe(500);
  });

  it('should parse effect with duration in seconds', () => {
    const result = parseEffectDeclaration('fade-in 1s');
    expect(result.name).toBe('fade-in');
    expect(result.options.duration).toBe(1000);
  });

  it('should parse effect with duration as number', () => {
    const result = parseEffectDeclaration('shake 500');
    expect(result.name).toBe('shake');
    expect(result.options.duration).toBe(500);
  });

  it('should parse effect with speed option', () => {
    const result = parseEffectDeclaration('typewriter speed:100');
    expect(result.name).toBe('typewriter');
    expect(result.options.speed).toBe(100);
  });

  it('should parse effect with delay option', () => {
    const result = parseEffectDeclaration('fade-in delay:500');
    expect(result.name).toBe('fade-in');
    expect(result.options.delay).toBe(500);
  });

  it('should parse effect with multiple options', () => {
    const result = parseEffectDeclaration('typewriter 2s speed:50 delay:100');
    expect(result.name).toBe('typewriter');
    expect(result.options.duration).toBe(2000);
    expect(result.options.speed).toBe(50);
    expect(result.options.delay).toBe(100);
  });

  it('should parse effect with easing', () => {
    const result = parseEffectDeclaration('fade-in easing:ease-in-out');
    expect(result.name).toBe('fade-in');
    expect(result.options.easing).toBe('ease-in-out');
  });

  it('should throw for empty declaration', () => {
    expect(() => parseEffectDeclaration('')).toThrow(/Invalid effect/);
    expect(() => parseEffectDeclaration('   ')).toThrow(/Invalid effect/);
  });
});

describe('EFFECT_CSS', () => {
  it('should include keyframes for shake', () => {
    expect(EFFECT_CSS).toContain('@keyframes wls-shake');
  });

  it('should include keyframes for pulse', () => {
    expect(EFFECT_CSS).toContain('@keyframes wls-pulse');
  });

  it('should include keyframes for glitch', () => {
    expect(EFFECT_CSS).toContain('@keyframes wls-glitch');
  });

  it('should include keyframes for fade-in', () => {
    expect(EFFECT_CSS).toContain('@keyframes wls-fade-in');
  });

  it('should include keyframes for slide effects', () => {
    expect(EFFECT_CSS).toContain('@keyframes wls-slide-left');
    expect(EFFECT_CSS).toContain('@keyframes wls-slide-right');
    expect(EFFECT_CSS).toContain('@keyframes wls-slide-up');
    expect(EFFECT_CSS).toContain('@keyframes wls-slide-down');
  });

  it('should include CSS classes', () => {
    expect(EFFECT_CSS).toContain('.wls-effect-shake');
    expect(EFFECT_CSS).toContain('.wls-effect-fade-in');
  });
});

describe('createTextEffectManager', () => {
  it('should create a new manager instance', () => {
    const manager = createTextEffectManager();
    expect(manager).toBeInstanceOf(TextEffectManager);
  });
});

describe('effect data', () => {
  let manager: TextEffectManager;
  let originalRAF: typeof requestAnimationFrame;
  let originalCAF: typeof cancelAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
    originalRAF = globalThis.requestAnimationFrame;
    originalCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = mockRAF;
    globalThis.cancelAnimationFrame = mockCAF;
    manager = new TextEffectManager();
  });

  afterEach(() => {
    manager.cancelAll();
    vi.useRealTimers();
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
  });

  it('shake effect should provide offset data', async () => {
    let lastData: Record<string, unknown> = {};

    manager.applyEffect(
      'shake',
      'BOOM!',
      { duration: 500 },
      (frame) => {
        lastData = frame.data;
      },
      () => {}
    );

    await vi.advanceTimersByTimeAsync(100);

    expect(lastData).toHaveProperty('offsetX');
    expect(lastData).toHaveProperty('offsetY');
  });

  it('fade-in effect should provide opacity data', async () => {
    let lastData: Record<string, unknown> = {};

    manager.applyEffect(
      'fade-in',
      'Hello',
      { duration: 500 },
      (frame) => {
        lastData = frame.data;
      },
      () => {}
    );

    await vi.advanceTimersByTimeAsync(100);

    expect(lastData).toHaveProperty('opacity');
    expect(typeof lastData.opacity).toBe('number');
  });

  it('slide-left effect should provide offset and opacity data', async () => {
    let lastData: Record<string, unknown> = {};

    manager.applyEffect(
      'slide-left',
      'Hello',
      { duration: 500 },
      (frame) => {
        lastData = frame.data;
      },
      () => {}
    );

    await vi.advanceTimersByTimeAsync(100);

    expect(lastData).toHaveProperty('offsetX');
    expect(lastData).toHaveProperty('opacity');
  });
});
