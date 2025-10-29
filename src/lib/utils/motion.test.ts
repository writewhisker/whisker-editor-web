import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

describe('motion', () => {
  let matchMediaMock: any;

  beforeEach(() => {
    // Setup matchMedia mock
    matchMediaMock = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => matchMediaMock),
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('prefersReducedMotion store', () => {
    it('should detect reduced motion preference from system', async () => {
      matchMediaMock.matches = true;

      vi.resetModules();
      const { prefersReducedMotion } = await import('./motion');

      expect(get(prefersReducedMotion)).toBe(true);
    });

    it('should default to false when system allows motion', async () => {
      matchMediaMock.matches = false;

      vi.resetModules();
      const { prefersReducedMotion } = await import('./motion');

      expect(get(prefersReducedMotion)).toBe(false);
    });

    it('should register event listener for system preference changes', async () => {
      await import('./motion');

      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
      expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle window undefined gracefully', async () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      // Should not throw
      await import('./motion');

      global.window = originalWindow;
    });
  });

  describe('motion constants', () => {
    it('should export fast motion class', async () => {
      const { motion } = await import('./motion');
      expect(motion.fast).toBe('transition-transform transition-opacity duration-100 ease-out');
    });

    it('should export normal motion class', async () => {
      const { motion } = await import('./motion');
      expect(motion.normal).toBe('transition-transform transition-opacity duration-200 ease-out');
    });

    it('should export slow motion class', async () => {
      const { motion } = await import('./motion');
      expect(motion.slow).toBe('transition-transform transition-opacity duration-300 ease-out');
    });

    it('should export colors motion class', async () => {
      const { motion } = await import('./motion');
      expect(motion.colors).toBe('transition-colors duration-150 ease-out');
    });

    it('should export all motion class', async () => {
      const { motion } = await import('./motion');
      expect(motion.all).toBe('transition-all duration-200 ease-out');
    });
  });

  describe('motionSafe constants', () => {
    it('should export motion-safe variants', async () => {
      const { motionSafe } = await import('./motion');

      expect(motionSafe.fast).toBe('motion-safe:transition-transform motion-safe:transition-opacity motion-safe:duration-100 motion-safe:ease-out');
      expect(motionSafe.normal).toBe('motion-safe:transition-transform motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out');
      expect(motionSafe.slow).toBe('motion-safe:transition-transform motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out');
      expect(motionSafe.colors).toBe('motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out');
      expect(motionSafe.all).toBe('motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out');
    });
  });

  describe('getTransitionDuration', () => {
    it('should return default duration when motion allowed', async () => {
      const { getTransitionDuration } = await import('./motion');
      expect(getTransitionDuration(300, false)).toBe(300);
    });

    it('should return 0 when reduced motion preferred', async () => {
      const { getTransitionDuration } = await import('./motion');
      expect(getTransitionDuration(300, true)).toBe(0);
    });

    it('should handle various durations', async () => {
      const { getTransitionDuration } = await import('./motion');

      expect(getTransitionDuration(100, false)).toBe(100);
      expect(getTransitionDuration(200, false)).toBe(200);
      expect(getTransitionDuration(500, false)).toBe(500);

      expect(getTransitionDuration(100, true)).toBe(0);
      expect(getTransitionDuration(200, true)).toBe(0);
      expect(getTransitionDuration(500, true)).toBe(0);
    });
  });

  describe('conditionalAnimation', () => {
    it('should return animation when motion allowed', async () => {
      const { conditionalAnimation } = await import('./motion');
      const animation = { duration: 300, easing: 'ease-out' };

      expect(conditionalAnimation(animation, false)).toEqual(animation);
    });

    it('should return undefined when reduced motion preferred', async () => {
      const { conditionalAnimation } = await import('./motion');
      const animation = { duration: 300, easing: 'ease-out' };

      expect(conditionalAnimation(animation, true)).toBeUndefined();
    });

    it('should preserve animation object reference', async () => {
      const { conditionalAnimation } = await import('./motion');
      const animation = { duration: 300 };

      const result = conditionalAnimation(animation, false);
      expect(result).toBe(animation);
    });
  });

  describe('getFlowAnimationConfig', () => {
    it('should return animated config when motion allowed', async () => {
      const { getFlowAnimationConfig } = await import('./motion');
      const config = getFlowAnimationConfig(false);

      expect(config.animated).toBe(true);
      expect(config.duration).toBe(400);
    });

    it('should return non-animated config when reduced motion preferred', async () => {
      const { getFlowAnimationConfig } = await import('./motion');
      const config = getFlowAnimationConfig(true);

      expect(config.animated).toBe(false);
      expect(config.duration).toBe(0);
    });
  });

  describe('hwAccel constants', () => {
    it('should export hardware acceleration hints', async () => {
      const { hwAccel } = await import('./motion');

      expect(hwAccel.transform).toBe('will-change-transform');
      expect(hwAccel.opacity).toBe('will-change-opacity');
      expect(hwAccel.auto).toBe('will-change-auto');
    });
  });

  describe('easing constants', () => {
    it('should export easing functions', async () => {
      const { easing } = await import('./motion');

      expect(easing.ease).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
      expect(easing.easeIn).toBe('cubic-bezier(0.4, 0, 1, 1)');
      expect(easing.easeOut).toBe('cubic-bezier(0, 0, 0.2, 1)');
      expect(easing.easeInOut).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
      expect(easing.spring).toBe('cubic-bezier(0.68, -0.55, 0.265, 1.55)');
      expect(easing.sharp).toBe('cubic-bezier(0.4, 0, 0.6, 1)');
    });
  });

  describe('duration constants', () => {
    it('should export duration values', async () => {
      const { duration } = await import('./motion');

      expect(duration.instant).toBe(0);
      expect(duration.fast).toBe(100);
      expect(duration.normal).toBe(200);
      expect(duration.slow).toBe(300);
      expect(duration.slower).toBe(400);
      expect(duration.slowest).toBe(500);
    });
  });

  describe('animatableProps constants', () => {
    it('should export safe animatable properties', async () => {
      const { animatableProps } = await import('./motion');

      expect(animatableProps.safe).toEqual(['transform', 'opacity']);
    });

    it('should export caution properties', async () => {
      const { animatableProps } = await import('./motion');

      expect(animatableProps.caution).toEqual(['color', 'background-color', 'border-color']);
    });

    it('should export properties to avoid', async () => {
      const { animatableProps } = await import('./motion');

      expect(animatableProps.avoid).toEqual(['width', 'height', 'top', 'left', 'margin', 'padding']);
    });
  });

  describe('media query listener', () => {
    it('should update store when system preference changes', async () => {
      let changeCallback: ((e: MediaQueryListEvent) => void) | null = null;

      matchMediaMock.addEventListener = vi.fn((event, callback) => {
        if (event === 'change') {
          changeCallback = callback as (e: MediaQueryListEvent) => void;
        }
      });

      vi.resetModules();
      const { prefersReducedMotion } = await import('./motion');

      expect(get(prefersReducedMotion)).toBe(false);

      // Simulate system preference change
      if (changeCallback) {
        (changeCallback as (e: MediaQueryListEvent) => void)({ matches: true } as MediaQueryListEvent);
      }

      expect(get(prefersReducedMotion)).toBe(true);
    });

    it('should toggle between motion preferences', async () => {
      let changeCallback: ((e: MediaQueryListEvent) => void) | null = null;

      matchMediaMock.addEventListener = vi.fn((event, callback) => {
        if (event === 'change') {
          changeCallback = callback as (e: MediaQueryListEvent) => void;
        }
      });

      vi.resetModules();
      const { prefersReducedMotion } = await import('./motion');

      // Start with motion allowed
      expect(get(prefersReducedMotion)).toBe(false);

      // System changes to reduced motion
      if (changeCallback) {
        (changeCallback as (e: MediaQueryListEvent) => void)({ matches: true } as MediaQueryListEvent);
      }
      expect(get(prefersReducedMotion)).toBe(true);

      // System changes back to allow motion
      if (changeCallback) {
        (changeCallback as (e: MediaQueryListEvent) => void)({ matches: false } as MediaQueryListEvent);
      }
      expect(get(prefersReducedMotion)).toBe(false);
    });
  });
});
