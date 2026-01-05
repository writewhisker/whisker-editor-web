import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MotionPreference } from '../MotionPreference';

describe('MotionPreference', () => {
  let preference: MotionPreference;

  beforeEach(() => {
    preference = new MotionPreference();
  });

  describe('constructor', () => {
    it('creates instance without dependencies', () => {
      expect(preference).toBeInstanceOf(MotionPreference);
    });

    it('creates via factory method', () => {
      const created = MotionPreference.create();
      expect(created).toBeInstanceOf(MotionPreference);
    });
  });

  describe('isReducedMotion', () => {
    it('returns false by default', () => {
      expect(preference.isReducedMotion()).toBe(false);
    });

    it('returns system preference when no override', () => {
      preference.setSystemPreference(true);
      expect(preference.isReducedMotion()).toBe(true);
    });

    it('returns user override when set', () => {
      preference.setSystemPreference(false);
      preference.enableReducedMotion();
      expect(preference.isReducedMotion()).toBe(true);
    });
  });

  describe('setSystemPreference', () => {
    it('sets system preference', () => {
      preference.setSystemPreference(true);
      expect(preference.isReducedMotion()).toBe(true);
    });

    it('emits event when no user override', () => {
      const emit = vi.fn();
      const pref = new MotionPreference({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      pref.setSystemPreference(true);

      expect(emit).toHaveBeenCalledWith('a11y.motion_preference_changed', {
        reducedMotion: true,
        source: 'system',
      });
    });

    it('does not emit event when user override exists', () => {
      const emit = vi.fn();
      const pref = new MotionPreference({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      pref.enableReducedMotion();
      emit.mockClear();
      pref.setSystemPreference(false);

      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('enableReducedMotion', () => {
    it('overrides system preference', () => {
      preference.setSystemPreference(false);
      preference.enableReducedMotion();
      expect(preference.isReducedMotion()).toBe(true);
    });

    it('emits event', () => {
      const emit = vi.fn();
      const pref = new MotionPreference({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      pref.enableReducedMotion();

      expect(emit).toHaveBeenCalledWith('a11y.motion_preference_changed', {
        reducedMotion: true,
        source: 'user',
      });
    });
  });

  describe('disableReducedMotion', () => {
    it('overrides system preference', () => {
      preference.setSystemPreference(true);
      preference.disableReducedMotion();
      expect(preference.isReducedMotion()).toBe(false);
    });

    it('emits event', () => {
      const emit = vi.fn();
      const pref = new MotionPreference({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      pref.disableReducedMotion();

      expect(emit).toHaveBeenCalledWith('a11y.motion_preference_changed', {
        reducedMotion: false,
        source: 'user',
      });
    });
  });

  describe('resetToSystem', () => {
    it('clears user override', () => {
      preference.setSystemPreference(true);
      preference.disableReducedMotion();
      expect(preference.isReducedMotion()).toBe(false);

      preference.resetToSystem();
      expect(preference.isReducedMotion()).toBe(true);
    });

    it('emits event with system source', () => {
      const emit = vi.fn();
      const pref = new MotionPreference({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      pref.setSystemPreference(true);
      pref.enableReducedMotion();
      emit.mockClear();
      pref.resetToSystem();

      expect(emit).toHaveBeenCalledWith('a11y.motion_preference_changed', {
        reducedMotion: true,
        source: 'system',
      });
    });
  });

  describe('toggle', () => {
    it('toggles from disabled to enabled', () => {
      expect(preference.isReducedMotion()).toBe(false);
      preference.toggle();
      expect(preference.isReducedMotion()).toBe(true);
    });

    it('toggles from enabled to disabled', () => {
      preference.enableReducedMotion();
      preference.toggle();
      expect(preference.isReducedMotion()).toBe(false);
    });
  });

  describe('getAnimationDuration', () => {
    it('returns normal duration when motion allowed', () => {
      expect(preference.getAnimationDuration(300, 1)).toBe(300);
    });

    it('returns reduced duration when motion reduced', () => {
      preference.enableReducedMotion();
      expect(preference.getAnimationDuration(300, 1)).toBe(1);
    });

    it('uses default reduced duration of 1', () => {
      preference.enableReducedMotion();
      expect(preference.getAnimationDuration(300)).toBe(1);
    });
  });

  describe('shouldAnimate', () => {
    it('returns true when motion allowed', () => {
      expect(preference.shouldAnimate()).toBe(true);
    });

    it('returns false when motion reduced', () => {
      preference.enableReducedMotion();
      expect(preference.shouldAnimate()).toBe(false);
    });

    it('always returns true for essential animations', () => {
      preference.enableReducedMotion();
      expect(preference.shouldAnimate(true)).toBe(true);
    });
  });

  describe('getCss', () => {
    it('returns CSS string', () => {
      const css = preference.getCss();

      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
      expect(css).toContain('animation-duration: 0.01ms');
      expect(css).toContain('body[data-reduced-motion="true"]');
    });
  });

  describe('getDetectionJs', () => {
    it('returns JavaScript string', () => {
      const js = preference.getDetectionJs();

      expect(js).toContain('matchMedia');
      expect(js).toContain('prefers-reduced-motion');
      expect(js).toContain('whisker:motion-preference');
    });
  });

  describe('getSource', () => {
    it('returns system when no override', () => {
      expect(preference.getSource()).toBe('system');
    });

    it('returns user when override set', () => {
      preference.enableReducedMotion();
      expect(preference.getSource()).toBe('user');
    });
  });

  describe('serialize/deserialize', () => {
    it('serializes preference', () => {
      preference.setSystemPreference(true);
      preference.enableReducedMotion();

      const data = preference.serialize();

      expect(data.userOverride).toBe(true);
      expect(data.systemPreference).toBe(true);
    });

    it('deserializes preference', () => {
      const data = {
        userOverride: true,
        systemPreference: false,
      };

      preference.deserialize(data);

      expect(preference.isReducedMotion()).toBe(true);
      expect(preference.getSource()).toBe('user');
    });

    it('handles null user override', () => {
      const data = {
        userOverride: null,
        systemPreference: true,
      };

      preference.deserialize(data);

      expect(preference.isReducedMotion()).toBe(true);
      expect(preference.getSource()).toBe('system');
    });
  });
});
