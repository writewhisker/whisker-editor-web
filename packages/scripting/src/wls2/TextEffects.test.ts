/**
 * TextEffects Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TextEffects,
  createTextEffects,
  EffectController,
  parseEffectDeclaration,
  BUILTIN_EFFECTS,
} from './TextEffects';

describe('parseEffectDeclaration', () => {
  it('parses simple effect name', () => {
    const decl = parseEffectDeclaration('typewriter');

    expect(decl.name).toBe('typewriter');
    expect(decl.options).toEqual({});
  });

  it('parses effect with key:value options', () => {
    const decl = parseEffectDeclaration('typewriter speed:100');

    expect(decl.name).toBe('typewriter');
    expect(decl.options.speed).toBe(100);
  });

  it('parses effect with duration suffix', () => {
    const decl = parseEffectDeclaration('fade-in 500ms');

    expect(decl.name).toBe('fade-in');
    expect(decl.options.duration).toBe(500);
  });

  it('parses duration in seconds', () => {
    const decl = parseEffectDeclaration('fade-out 2s');

    expect(decl.options.duration).toBe(2000);
  });

  it('parses multiple options', () => {
    const decl = parseEffectDeclaration('shake intensity:10 duration:300');

    expect(decl.name).toBe('shake');
    expect(decl.options.intensity).toBe(10);
    expect(decl.options.duration).toBe(300);
  });
});

describe('BUILTIN_EFFECTS', () => {
  it('includes typewriter effect', () => {
    expect(BUILTIN_EFFECTS.typewriter).toBeDefined();
    expect(BUILTIN_EFFECTS.typewriter.type).toBe('progressive');
  });

  it('includes animation effects', () => {
    expect(BUILTIN_EFFECTS.shake.type).toBe('animation');
    expect(BUILTIN_EFFECTS.pulse.type).toBe('animation');
    expect(BUILTIN_EFFECTS.glitch.type).toBe('animation');
  });

  it('includes transition effects', () => {
    expect(BUILTIN_EFFECTS['fade-in'].type).toBe('transition');
    expect(BUILTIN_EFFECTS['fade-out'].type).toBe('transition');
    expect(BUILTIN_EFFECTS['slide-left'].type).toBe('transition');
  });
});

describe('EffectController', () => {
  describe('progressive effect (typewriter)', () => {
    it('reveals text progressively', () => {
      const frames: string[] = [];
      const controller = new EffectController(
        'Hello',
        'typewriter',
        { speed: 10 },
        {
          onFrame: (update) => frames.push(update.visibleText),
        }
      );

      controller.tick(10);
      expect(frames).toContain('H');

      controller.tick(10);
      expect(frames).toContain('He');

      controller.tick(30);
      expect(controller.isComplete()).toBe(true);
    });

    it('reports progress correctly', () => {
      const controller = new EffectController(
        'Test',
        'typewriter',
        { speed: 10 },
        {}
      );

      controller.tick(20);
      expect(controller.getProgress()).toBe(0.5);
    });

    it('skip completes immediately', () => {
      const onComplete = vi.fn();
      const controller = new EffectController(
        'Hello World',
        'typewriter',
        { speed: 50 },
        { onComplete }
      );

      controller.skip();

      expect(controller.isComplete()).toBe(true);
      expect(controller.getVisibleText()).toBe('Hello World');
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('duration-based effect', () => {
    it('completes after duration', () => {
      const onComplete = vi.fn();
      const controller = new EffectController(
        'Text',
        'fade-in',
        { duration: 100 },
        { onComplete }
      );

      controller.tick(50);
      expect(controller.getProgress()).toBe(0.5);
      expect(controller.isComplete()).toBe(false);

      controller.tick(50);
      expect(controller.isComplete()).toBe(true);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('pause/resume', () => {
    it('pauses effect', () => {
      const controller = new EffectController(
        'Test',
        'typewriter',
        { speed: 10 },
        {}
      );

      controller.tick(10);
      controller.pause();
      controller.tick(100);

      expect(controller.getProgress()).toBe(0.25);
    });

    it('resumes effect', () => {
      const controller = new EffectController(
        'Test',
        'typewriter',
        { speed: 10 },
        {}
      );

      controller.pause();
      controller.tick(100);
      controller.resume();
      controller.tick(40);

      expect(controller.isComplete()).toBe(true);
    });
  });

  describe('cancel', () => {
    it('stops effect without completing', () => {
      const onComplete = vi.fn();
      const controller = new EffectController(
        'Test',
        'typewriter',
        { speed: 10 },
        { onComplete }
      );

      controller.cancel();

      expect(controller.isComplete()).toBe(true);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('returns current state', () => {
      const controller = new EffectController(
        'Hello',
        'typewriter',
        { speed: 20 },
        {}
      );

      controller.tick(40);
      const state = controller.getState();

      expect(state.charIndex).toBe(2);
      expect(state.totalChars).toBe(5);
      expect(state.text).toBe('Hello');
    });
  });
});

describe('TextEffects', () => {
  let effects: TextEffects;

  beforeEach(() => {
    effects = createTextEffects();
  });

  describe('effect registration', () => {
    it('has builtin effects', () => {
      expect(effects.hasEffect('typewriter')).toBe(true);
      expect(effects.hasEffect('fade-in')).toBe(true);
    });

    it('registers custom effect', () => {
      effects.registerEffect('custom', {
        type: 'animation',
        defaultOptions: { duration: 1000 },
      });

      expect(effects.hasEffect('custom')).toBe(true);
    });

    it('getAvailableEffects returns all effects', () => {
      effects.registerEffect('custom', {
        type: 'animation',
        defaultOptions: {},
      });

      const available = effects.getAvailableEffects();

      expect(available).toContain('typewriter');
      expect(available).toContain('fade-in');
      expect(available).toContain('custom');
    });
  });

  describe('applyEffect', () => {
    it('creates effect controller', () => {
      const controller = effects.applyEffect('typewriter', 'Test');

      expect(controller).not.toBeNull();
      expect(controller).toBeInstanceOf(EffectController);
    });

    it('returns null for unknown effect', () => {
      const controller = effects.applyEffect('unknown', 'Test');

      expect(controller).toBeNull();
    });

    it('calls onFrame callback', () => {
      const onFrame = vi.fn();
      const controller = effects.applyEffect('typewriter', 'Hi', {}, onFrame);

      expect(onFrame).toHaveBeenCalled();
    });

    it('merges options with defaults', () => {
      const controller = effects.applyEffect('typewriter', 'Test', { speed: 5 });

      expect(controller).not.toBeNull();
    });
  });

  describe('applyFromDeclaration', () => {
    it('parses and applies effect', () => {
      const onFrame = vi.fn();
      const controller = effects.applyFromDeclaration(
        'typewriter speed:20',
        'Hello',
        onFrame
      );

      expect(controller).not.toBeNull();
    });
  });

  describe('update', () => {
    it('updates all active effects', () => {
      const onFrame = vi.fn();
      effects.applyEffect('typewriter', 'Test', { speed: 10 }, onFrame);

      effects.update(20);

      expect(onFrame).toHaveBeenCalledTimes(2); // Initial + update
    });
  });

  describe('cancelAll', () => {
    it('cancels all active effects', () => {
      effects.applyEffect('typewriter', 'Test1');
      effects.applyEffect('typewriter', 'Test2');

      effects.cancelAll();

      expect(effects.getActiveCount()).toBe(0);
    });
  });

  describe('skipAll', () => {
    it('skips all active effects to completion', () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      effects.applyEffect('typewriter', 'Test1', {}, undefined, onComplete1);
      effects.applyEffect('typewriter', 'Test2', {}, undefined, onComplete2);

      effects.skipAll();

      expect(onComplete1).toHaveBeenCalled();
      expect(onComplete2).toHaveBeenCalled();
    });
  });

  describe('getCSSKeyframes', () => {
    it('returns CSS for builtin effects', () => {
      const css = effects.getCSSKeyframes();

      expect(css).toContain('wls-shake');
      expect(css).toContain('wls-pulse');
      expect(css).toContain('wls-fade-in');
    });

    it('includes custom effect CSS', () => {
      effects.registerEffect('custom', {
        type: 'animation',
        defaultOptions: {},
        css: '@keyframes wls-custom { }',
      });

      const css = effects.getCSSKeyframes();

      expect(css).toContain('wls-custom');
    });
  });

  describe('getEffectStyle', () => {
    it('returns animation style', () => {
      const style = effects.getEffectStyle('shake', { duration: 300 });

      expect(style).toContain('animation');
      expect(style).toContain('300ms');
    });

    it('returns empty for unknown effect', () => {
      const style = effects.getEffectStyle('unknown');

      expect(style).toBe('');
    });
  });

  describe('reset', () => {
    it('cancels effects and clears custom', () => {
      effects.registerEffect('custom', {
        type: 'animation',
        defaultOptions: {},
      });
      effects.applyEffect('typewriter', 'Test');

      effects.reset();

      expect(effects.getActiveCount()).toBe(0);
      expect(effects.hasEffect('custom')).toBe(false);
      expect(effects.hasEffect('typewriter')).toBe(true); // Builtin preserved
    });
  });
});
