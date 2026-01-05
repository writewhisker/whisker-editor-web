import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FocusManager } from '../FocusManager';

describe('FocusManager', () => {
  let manager: FocusManager;

  beforeEach(() => {
    manager = new FocusManager();
  });

  describe('constructor', () => {
    it('creates instance without dependencies', () => {
      expect(manager).toBeInstanceOf(FocusManager);
    });

    it('creates instance with dependencies', () => {
      const deps = {
        eventBus: { emit: vi.fn(), on: vi.fn(() => () => {}) },
        logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      };
      const managerWithDeps = new FocusManager(deps);
      expect(managerWithDeps).toBeInstanceOf(FocusManager);
    });

    it('creates via factory method', () => {
      const created = FocusManager.create();
      expect(created).toBeInstanceOf(FocusManager);
    });
  });

  describe('focus', () => {
    it('returns false for null element', () => {
      expect(manager.focus(null)).toBe(false);
    });

    it('focuses element and returns true', () => {
      const element = { focus: vi.fn(), blur: vi.fn() };
      expect(manager.focus(element)).toBe(true);
      expect(element.focus).toHaveBeenCalled();
    });

    it('supports preventScroll option', () => {
      const element = { focus: vi.fn(), blur: vi.fn() };
      manager.focus(element, { preventScroll: true });
      expect(element.focus).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('emits focus_change event', () => {
      const emit = vi.fn();
      const managerWithEvents = new FocusManager({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });
      const element = { focus: vi.fn(), blur: vi.fn() };

      managerWithEvents.focus(element);

      expect(emit).toHaveBeenCalledWith('a11y.focus_change', { element });
    });
  });

  describe('getFocusedElement', () => {
    it('returns null initially', () => {
      expect(manager.getFocusedElement()).toBeNull();
    });

    it('returns focused element after focus', () => {
      const element = { focus: vi.fn(), blur: vi.fn() };
      manager.focus(element);
      expect(manager.getFocusedElement()).toBe(element);
    });
  });

  describe('saveFocus/restoreFocus', () => {
    it('saves and restores focus', () => {
      const element = { focus: vi.fn(), blur: vi.fn() };
      manager.focus(element);

      manager.saveFocus('test');
      expect(manager.restoreFocus('test')).toBe(true);
    });

    it('uses default key', () => {
      const element = { focus: vi.fn(), blur: vi.fn() };
      manager.focus(element);

      manager.saveFocus();
      expect(manager.restoreFocus()).toBe(true);
    });

    it('returns false when no saved focus', () => {
      expect(manager.restoreFocus('nonexistent')).toBe(false);
    });
  });

  describe('trapFocus', () => {
    it('sets focus trap container', () => {
      const container = document.createElement('div');
      manager.trapFocus(container);
      expect(manager.isFocusTrapped()).toBe(true);
    });

    it('emits focus_trap_enabled event', () => {
      const emit = vi.fn();
      const managerWithEvents = new FocusManager({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });
      const container = document.createElement('div');

      managerWithEvents.trapFocus(container);

      expect(emit).toHaveBeenCalledWith('a11y.focus_trap_enabled', { container });
    });
  });

  describe('releaseFocusTrap', () => {
    it('releases focus trap', () => {
      const container = document.createElement('div');
      manager.trapFocus(container);
      manager.releaseFocusTrap();
      expect(manager.isFocusTrapped()).toBe(false);
    });

    it('emits focus_trap_released event', () => {
      const emit = vi.fn();
      const managerWithEvents = new FocusManager({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });
      const container = document.createElement('div');

      managerWithEvents.trapFocus(container);
      managerWithEvents.releaseFocusTrap();

      expect(emit).toHaveBeenCalledWith('a11y.focus_trap_released', {});
    });
  });

  describe('isFocusTrapped', () => {
    it('returns false initially', () => {
      expect(manager.isFocusTrapped()).toBe(false);
    });

    it('returns true after trap', () => {
      const container = document.createElement('div');
      manager.trapFocus(container);
      expect(manager.isFocusTrapped()).toBe(true);
    });
  });

  describe('getFocusableElements', () => {
    it('returns empty array for null container', () => {
      expect(manager.getFocusableElements(null as any)).toEqual([]);
    });

    it('finds focusable elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Button</button>
        <a href="#">Link</a>
        <input type="text">
        <button disabled>Disabled</button>
      `;

      const elements = manager.getFocusableElements(container);
      expect(elements.length).toBe(3); // Excludes disabled button
    });
  });

  describe('focusFirst', () => {
    it('focuses first focusable element', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      button.textContent = 'First';
      container.appendChild(button);

      // Mock focus
      const focusSpy = vi.spyOn(button, 'focus');
      manager.focusFirst(container);

      expect(focusSpy).toHaveBeenCalled();
    });

    it('returns false for empty container', () => {
      const container = document.createElement('div');
      expect(manager.focusFirst(container)).toBe(false);
    });
  });

  describe('focusLast', () => {
    it('focuses last focusable element', () => {
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      button1.textContent = 'First';
      button2.textContent = 'Last';
      container.appendChild(button1);
      container.appendChild(button2);

      const focusSpy = vi.spyOn(button2, 'focus');
      manager.focusLast(container);

      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('handleTab', () => {
    it('returns false when not trapped', () => {
      expect(manager.handleTab(false)).toBe(false);
    });

    it('moves focus forward', () => {
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);

      manager.trapFocus(container);
      // First element is focused by trapFocus

      const result = manager.handleTab(false);
      // Should try to move to next
      expect(result).toBe(true);
    });

    it('moves focus backward with shift', () => {
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);

      manager.trapFocus(container);

      const result = manager.handleTab(true);
      expect(result).toBe(true);
    });
  });

  describe('getFocusableSelector', () => {
    it('returns selector string', () => {
      const selector = manager.getFocusableSelector();
      expect(selector).toContain('button');
      expect(selector).toContain('a[href]');
      expect(selector).toContain('input');
    });
  });

  describe('getFocusTrapContainer', () => {
    it('returns null initially', () => {
      expect(manager.getFocusTrapContainer()).toBeNull();
    });

    it('returns container after trap', () => {
      const container = document.createElement('div');
      manager.trapFocus(container);
      expect(manager.getFocusTrapContainer()).toBe(container);
    });
  });
});
