import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyboardNavigator } from '../KeyboardNavigator';
import { FocusManager } from '../FocusManager';

describe('KeyboardNavigator', () => {
  let navigator: KeyboardNavigator;

  beforeEach(() => {
    navigator = new KeyboardNavigator();
  });

  describe('constructor', () => {
    it('creates instance without dependencies', () => {
      expect(navigator).toBeInstanceOf(KeyboardNavigator);
    });

    it('creates instance with dependencies', () => {
      const deps = {
        eventBus: { emit: vi.fn(), on: vi.fn(() => () => {}) },
        logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        focusManager: new FocusManager(),
      };
      const navigatorWithDeps = new KeyboardNavigator(deps);
      expect(navigatorWithDeps).toBeInstanceOf(KeyboardNavigator);
    });

    it('creates via factory method', () => {
      const created = KeyboardNavigator.create();
      expect(created).toBeInstanceOf(KeyboardNavigator);
    });
  });

  describe('registerHandler', () => {
    it('registers a handler for a key', () => {
      const handler = vi.fn(() => true);
      navigator.registerHandler('a', handler);

      expect(navigator.getHandledKeys()).toContain('a');
    });

    it('allows multiple handlers for same key', () => {
      const handler1 = vi.fn(() => false);
      const handler2 = vi.fn(() => true);

      navigator.registerHandler('a', handler1);
      navigator.registerHandler('a', handler2);

      navigator.handleKeyEvent({ key: 'a' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('unregisterHandler', () => {
    it('removes all handlers for a key', () => {
      navigator.registerHandler('a', () => true);
      navigator.unregisterHandler('a');

      expect(navigator.getHandledKeys()).not.toContain('a');
    });
  });

  describe('handleKeyEvent', () => {
    it('returns false when disabled', () => {
      navigator.disable();
      expect(navigator.handleKeyEvent({ key: 'Tab' })).toBe(false);
    });

    it('handles key by name', () => {
      const handler = vi.fn(() => true);
      navigator.registerHandler('a', handler);

      const result = navigator.handleKeyEvent({ key: 'a' });

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('handles key by keyCode', () => {
      // Escape is keyCode 27
      const result = navigator.handleKeyEvent({ keyCode: 27 });
      expect(result).toBe(true);
    });

    it('returns false for unhandled key', () => {
      expect(navigator.handleKeyEvent({ key: 'z' })).toBe(false);
    });

    it('stops at first handler returning true', () => {
      const handler1 = vi.fn(() => true);
      const handler2 = vi.fn(() => true);

      navigator.registerHandler('a', handler1);
      navigator.registerHandler('a', handler2);

      navigator.handleKeyEvent({ key: 'a' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('getHandledKeys', () => {
    it('returns default handled keys', () => {
      const keys = navigator.getHandledKeys();

      expect(keys).toContain('Tab');
      expect(keys).toContain('Escape');
      expect(keys).toContain('Enter');
      expect(keys).toContain('Space');
      expect(keys).toContain('ArrowDown');
      expect(keys).toContain('ArrowUp');
    });
  });

  describe('isEnabled/enable/disable', () => {
    it('is enabled by default', () => {
      expect(navigator.isEnabled()).toBe(true);
    });

    it('can be disabled', () => {
      navigator.disable();
      expect(navigator.isEnabled()).toBe(false);
    });

    it('can be enabled', () => {
      navigator.disable();
      navigator.enable();
      expect(navigator.isEnabled()).toBe(true);
    });

    it('emits events on state change', () => {
      const emit = vi.fn();
      const nav = new KeyboardNavigator({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      nav.disable();
      expect(emit).toHaveBeenCalledWith('a11y.keyboard_disabled', {});

      nav.enable();
      expect(emit).toHaveBeenCalledWith('a11y.keyboard_enabled', {});
    });
  });

  describe('getMode/setMode', () => {
    it('defaults to browse mode', () => {
      expect(navigator.getMode()).toBe('browse');
    });

    it('can set to focus mode', () => {
      navigator.setMode('focus');
      expect(navigator.getMode()).toBe('focus');
    });

    it('ignores invalid modes', () => {
      navigator.setMode('invalid' as any);
      expect(navigator.getMode()).toBe('browse');
    });

    it('emits mode_changed event', () => {
      const emit = vi.fn();
      const nav = new KeyboardNavigator({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      nav.setMode('focus');

      expect(emit).toHaveBeenCalledWith('a11y.mode_changed', { mode: 'focus' });
    });
  });

  describe('setChoices', () => {
    it('sets choice list', () => {
      const choices = [
        { focus: vi.fn(), blur: vi.fn() },
        { focus: vi.fn(), blur: vi.fn() },
      ];

      navigator.setChoices(choices);

      expect(navigator.getCurrentChoiceIndex()).toBe(1);
    });

    it('resets index for empty list', () => {
      navigator.setChoices([]);
      expect(navigator.getCurrentChoiceIndex()).toBe(0);
    });
  });

  describe('getCurrentChoiceIndex', () => {
    it('returns 0 initially', () => {
      expect(navigator.getCurrentChoiceIndex()).toBe(0);
    });
  });

  describe('default handlers', () => {
    it('handles Escape key', () => {
      const emit = vi.fn();
      const nav = new KeyboardNavigator({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      nav.handleKeyEvent({ key: 'Escape' });

      expect(emit).toHaveBeenCalledWith('a11y.escape_pressed', {});
    });

    it('handles Enter key', () => {
      const emit = vi.fn();
      const nav = new KeyboardNavigator({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      nav.handleKeyEvent({ key: 'Enter' });

      expect(emit).toHaveBeenCalledWith('a11y.activate', {});
    });

    it('handles Space key', () => {
      const emit = vi.fn();
      const nav = new KeyboardNavigator({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      nav.handleKeyEvent({ key: 'Space' });

      expect(emit).toHaveBeenCalledWith('a11y.activate', {});
    });
  });

  describe('choice navigation', () => {
    it('navigates down through choices', () => {
      const emit = vi.fn();
      const nav = new KeyboardNavigator({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      const choices = [
        { focus: vi.fn(), blur: vi.fn() },
        { focus: vi.fn(), blur: vi.fn() },
      ];
      nav.setChoices(choices);

      nav.handleKeyEvent({ key: 'ArrowDown' });

      expect(nav.getCurrentChoiceIndex()).toBe(2);
    });

    it('navigates up through choices', () => {
      const nav = new KeyboardNavigator();
      const choices = [
        { focus: vi.fn(), blur: vi.fn() },
        { focus: vi.fn(), blur: vi.fn() },
      ];
      nav.setChoices(choices);

      nav.handleKeyEvent({ key: 'ArrowDown' }); // Move to 2
      nav.handleKeyEvent({ key: 'ArrowUp' }); // Move back to 1

      expect(nav.getCurrentChoiceIndex()).toBe(1);
    });

    it('wraps around at end', () => {
      const nav = new KeyboardNavigator();
      const choices = [
        { focus: vi.fn(), blur: vi.fn() },
        { focus: vi.fn(), blur: vi.fn() },
      ];
      nav.setChoices(choices);

      nav.handleKeyEvent({ key: 'ArrowDown' }); // 2
      nav.handleKeyEvent({ key: 'ArrowDown' }); // Should wrap to 1

      expect(nav.getCurrentChoiceIndex()).toBe(1);
    });

    it('wraps around at beginning', () => {
      const nav = new KeyboardNavigator();
      const choices = [
        { focus: vi.fn(), blur: vi.fn() },
        { focus: vi.fn(), blur: vi.fn() },
      ];
      nav.setChoices(choices);

      nav.handleKeyEvent({ key: 'ArrowUp' }); // Should wrap to 2

      expect(nav.getCurrentChoiceIndex()).toBe(2);
    });

    it('Home goes to first choice', () => {
      const nav = new KeyboardNavigator();
      const choices = [
        { focus: vi.fn(), blur: vi.fn() },
        { focus: vi.fn(), blur: vi.fn() },
        { focus: vi.fn(), blur: vi.fn() },
      ];
      nav.setChoices(choices);

      nav.handleKeyEvent({ key: 'ArrowDown' }); // 2
      nav.handleKeyEvent({ key: 'ArrowDown' }); // 3
      nav.handleKeyEvent({ key: 'Home' }); // 1

      expect(nav.getCurrentChoiceIndex()).toBe(1);
    });

    it('End goes to last choice', () => {
      const nav = new KeyboardNavigator();
      const choices = [
        { focus: vi.fn(), blur: vi.fn() },
        { focus: vi.fn(), blur: vi.fn() },
        { focus: vi.fn(), blur: vi.fn() },
      ];
      nav.setChoices(choices);

      nav.handleKeyEvent({ key: 'End' });

      expect(nav.getCurrentChoiceIndex()).toBe(3);
    });
  });

  describe('static methods', () => {
    describe('createEvent', () => {
      it('creates normalized event', () => {
        const event = KeyboardNavigator.createEvent({
          key: 'Enter',
          shiftKey: true,
        });

        expect(event.key).toBe('Enter');
        expect(event.shift).toBe(true);
        expect(event.ctrl).toBe(false);
      });

      it('handles alternative property names', () => {
        const event = KeyboardNavigator.createEvent({
          key: 'a',
          shift: true,
          ctrl: true,
        });

        expect(event.shift).toBe(true);
        expect(event.ctrl).toBe(true);
      });
    });

    describe('getKeyCode', () => {
      it('returns code for known key', () => {
        expect(KeyboardNavigator.getKeyCode('Tab')).toBe(9);
        expect(KeyboardNavigator.getKeyCode('Enter')).toBe(13);
        expect(KeyboardNavigator.getKeyCode('Escape')).toBe(27);
      });

      it('returns undefined for unknown key', () => {
        expect(KeyboardNavigator.getKeyCode('Unknown')).toBeUndefined();
      });
    });

    describe('getKeyName', () => {
      it('returns name for known code', () => {
        expect(KeyboardNavigator.getKeyName(9)).toBe('Tab');
        expect(KeyboardNavigator.getKeyName(13)).toBe('Enter');
      });

      it('returns undefined for unknown code', () => {
        expect(KeyboardNavigator.getKeyName(999)).toBeUndefined();
      });
    });

    describe('getKeyCodes', () => {
      it('returns key codes object', () => {
        const codes = KeyboardNavigator.getKeyCodes();

        expect(codes.TAB).toBe(9);
        expect(codes.ENTER).toBe(13);
        expect(codes.ESCAPE).toBe(27);
      });
    });
  });
});
