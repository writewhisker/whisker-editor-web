import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe('trapFocus', () => {
    it('should trap focus within container', async () => {
      const { trapFocus } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = `
        <button id="first">First</button>
        <button id="middle">Middle</button>
        <button id="last">Last</button>
      `;
      document.body.appendChild(container);

      const cleanup = trapFocus(container);

      const firstBtn = container.querySelector('#first') as HTMLElement;
      const lastBtn = container.querySelector('#last') as HTMLElement;

      // Focus last button
      lastBtn.focus();
      expect(document.activeElement).toBe(lastBtn);

      // Tab forward from last should go to first
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      container.dispatchEvent(tabEvent);

      // Cleanup
      cleanup();
    });

    it('should focus first element on mount', async () => {
      const { trapFocus } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = `<button id="first">First</button><button id="second">Second</button>`;
      document.body.appendChild(container);

      const cleanup = trapFocus(container);

      const firstBtn = container.querySelector('#first') as HTMLElement;
      expect(document.activeElement).toBe(firstBtn);

      cleanup();
    });

    it('should return cleanup function', async () => {
      const { trapFocus } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = `<button>Button</button>`;
      document.body.appendChild(container);

      const cleanup = trapFocus(container);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });

    it('should handle container with no focusable elements', async () => {
      const { trapFocus } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = '<div>No focusable content</div>';
      document.body.appendChild(container);

      expect(() => trapFocus(container)).not.toThrow();
    });
  });

  describe('announcer', () => {
    it('should create live region on first announce', async () => {
      const { announcer } = await import('./accessibility');

      announcer.announce('Test message');

      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion).not.toBeNull();
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
      expect(liveRegion?.className).toContain('sr-only');
    });

    it('should announce message to screen readers', async () => {
      const { announcer } = await import('./accessibility');

      announcer.announce('Important message');

      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion?.textContent).toBe('Important message');
    });

    it('should clear message after delay', async () => {
      const { announcer } = await import('./accessibility');

      announcer.announce('Test');

      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion?.textContent).toBe('Test');

      vi.advanceTimersByTime(1000);

      expect(liveRegion?.textContent).toBe('');
    });

    it('should reuse existing live region', async () => {
      const { announcer } = await import('./accessibility');

      announcer.announce('First message');
      const firstRegion = document.querySelector('[role="status"]');

      announcer.announce('Second message');
      const secondRegion = document.querySelector('[role="status"]');

      expect(firstRegion).toBe(secondRegion);
      expect(secondRegion?.textContent).toBe('Second message');
    });

    it('should announce urgent messages with assertive', async () => {
      const { announcer } = await import('./accessibility');

      announcer.announceUrgent('Urgent message');

      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');
      expect(liveRegion?.textContent).toBe('Urgent message');
    });

    it('should reset to polite after urgent message', async () => {
      const { announcer } = await import('./accessibility');

      announcer.announceUrgent('Urgent');

      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');

      vi.advanceTimersByTime(1000);

      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.textContent).toBe('');
    });
  });

  describe('KeyboardShortcutManager', () => {
    it('should register keyboard shortcut', async () => {
      const { keyboardShortcuts } = await import('./accessibility');

      const handler = vi.fn();
      keyboardShortcuts.register('test', {
        key: 't',
        ctrl: true,
        description: 'Test shortcut',
        handler,
      });

      const shortcuts = keyboardShortcuts.getShortcuts();
      expect(shortcuts.has('test')).toBe(true);
      expect(shortcuts.get('test')?.key).toBe('t');
    });

    it('should unregister keyboard shortcut', async () => {
      const { keyboardShortcuts } = await import('./accessibility');

      keyboardShortcuts.register('test', {
        key: 't',
        description: 'Test',
        handler: vi.fn(),
      });

      keyboardShortcuts.unregister('test');

      const shortcuts = keyboardShortcuts.getShortcuts();
      expect(shortcuts.has('test')).toBe(false);
    });

    it('should handle keyboard event and call handler', async () => {
      const { keyboardShortcuts } = await import('./accessibility');

      const handler = vi.fn();
      keyboardShortcuts.register('test', {
        key: 't',
        ctrl: true,
        description: 'Test',
        handler,
      });

      const div = document.createElement('div');
      document.body.appendChild(div);

      const event = new KeyboardEvent('keydown', {
        key: 't',
        ctrlKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, 'target', { value: div });

      const handled = keyboardShortcuts.handleKeyDown(event);

      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('should skip inputs unless shortcut is global', async () => {
      const { keyboardShortcuts } = await import('./accessibility');

      const handler = vi.fn();
      keyboardShortcuts.register('test', {
        key: 't',
        description: 'Test',
        handler,
        global: false,
      });

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', {
        key: 't',
        bubbles: true,
      });
      Object.defineProperty(event, 'target', { value: input });

      const handled = keyboardShortcuts.handleKeyDown(event);

      expect(handled).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle global shortcuts in inputs', async () => {
      const { keyboardShortcuts } = await import('./accessibility');

      const handler = vi.fn();
      keyboardShortcuts.register('test', {
        key: 't',
        ctrl: true,
        description: 'Test',
        handler,
        global: true,
      });

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', {
        key: 't',
        ctrlKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, 'target', { value: input });

      const handled = keyboardShortcuts.handleKeyDown(event);

      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('should be case insensitive', async () => {
      const { keyboardShortcuts } = await import('./accessibility');

      const handler = vi.fn();
      keyboardShortcuts.register('test', {
        key: 't',
        description: 'Test',
        handler,
      });

      const div = document.createElement('div');
      document.body.appendChild(div);

      const event = new KeyboardEvent('keydown', { key: 'T', bubbles: true });
      Object.defineProperty(event, 'target', { value: div });
      keyboardShortcuts.handleKeyDown(event);

      expect(handler).toHaveBeenCalled();
    });

    it('should respect enabled state', async () => {
      const { keyboardShortcuts } = await import('./accessibility');

      const handler = vi.fn();
      keyboardShortcuts.register('test', {
        key: 't',
        description: 'Test',
        handler,
      });

      keyboardShortcuts.setEnabled(false);

      const event = new KeyboardEvent('keydown', { key: 't', bubbles: true });
      const handled = keyboardShortcuts.handleKeyDown(event);

      expect(handled).toBe(false);
      expect(handler).not.toHaveBeenCalled();

      keyboardShortcuts.setEnabled(true);
    });

    it('should match modifier keys correctly', async () => {
      const { keyboardShortcuts } = await import('./accessibility');

      const handler = vi.fn();
      keyboardShortcuts.register('test', {
        key: 's',
        ctrl: true,
        shift: true,
        description: 'Test',
        handler,
      });

      const div = document.createElement('div');
      document.body.appendChild(div);

      // Wrong modifiers
      const event1 = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      Object.defineProperty(event1, 'target', { value: div });
      keyboardShortcuts.handleKeyDown(event1);
      expect(handler).not.toHaveBeenCalled();

      // Correct modifiers
      const event2 = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true });
      Object.defineProperty(event2, 'target', { value: div });
      keyboardShortcuts.handleKeyDown(event2);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('focusManager', () => {
    it('should save current focus', async () => {
      const { focusManager } = await import('./accessibility');

      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();

      focusManager.saveFocus();

      // Change focus
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      expect(document.activeElement).toBe(input);
    });

    it('should restore saved focus', async () => {
      const { focusManager } = await import('./accessibility');

      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();

      focusManager.saveFocus();

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      focusManager.restoreFocus();

      expect(document.activeElement).toBe(button);
    });

    it('should clear saved focus after restore', async () => {
      const { focusManager } = await import('./accessibility');

      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();

      focusManager.saveFocus();
      focusManager.restoreFocus();

      // Second restore should do nothing
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      focusManager.restoreFocus();
      expect(document.activeElement).toBe(input);
    });

    it('should focus element by selector', async () => {
      const { focusManager } = await import('./accessibility');

      const button = document.createElement('button');
      button.id = 'target';
      document.body.appendChild(button);

      focusManager.focusElement('#target');

      expect(document.activeElement).toBe(button);
    });

    it('should handle non-existent selector gracefully', async () => {
      const { focusManager } = await import('./accessibility');

      expect(() => focusManager.focusElement('#nonexistent')).not.toThrow();
    });
  });

  describe('createSkipLink', () => {
    it('should create skip link element', async () => {
      const { createSkipLink } = await import('./accessibility');

      const link = createSkipLink('main-content', 'Skip to main content');

      expect(link.tagName).toBe('A');
      expect(link.href).toContain('#main-content');
      expect(link.textContent).toBe('Skip to main content');
      expect(link.className).toContain('skip-link');
    });

    it('should focus and scroll to target on click', async () => {
      const { createSkipLink } = await import('./accessibility');

      const target = document.createElement('div');
      target.id = 'main';
      target.scrollIntoView = vi.fn();
      document.body.appendChild(target);

      const link = createSkipLink('main', 'Skip to main');
      document.body.appendChild(link);

      link.click();

      expect(target.tabIndex).toBe(-1);
      expect(document.activeElement).toBe(target);
      expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
  });

  describe('generateA11yId', () => {
    it('should generate unique IDs', async () => {
      const { generateA11yId } = await import('./accessibility');

      const id1 = generateA11yId();
      const id2 = generateA11yId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^a11y-\d+$/);
      expect(id2).toMatch(/^a11y-\d+$/);
    });

    it('should use custom prefix', async () => {
      const { generateA11yId } = await import('./accessibility');

      const id = generateA11yId('dialog');

      expect(id).toMatch(/^dialog-\d+$/);
    });

    it('should increment counter', async () => {
      const { generateA11yId } = await import('./accessibility');

      const id1 = generateA11yId('test');
      const id2 = generateA11yId('test');

      const num1 = parseInt(id1.split('-')[1]);
      const num2 = parseInt(id2.split('-')[1]);

      expect(num2).toBeGreaterThan(num1);
    });
  });

  describe('aria helpers', () => {
    it('should build passage label', async () => {
      const { aria } = await import('./accessibility');

      expect(aria.passageLabel('Start', true, false, false)).toBe('Start, start passage');
      expect(aria.passageLabel('Orphan', false, true, false)).toBe('Orphan, orphaned');
      expect(aria.passageLabel('Dead', false, false, true)).toBe('Dead, dead end');
      expect(aria.passageLabel('Complex', true, true, true)).toBe('Complex, start passage, orphaned, dead end');
    });

    it('should build validation label', async () => {
      const { aria } = await import('./accessibility');

      expect(aria.validationLabel('error', 3)).toBe('3 errors');
      expect(aria.validationLabel('warning', 1)).toBe('1 warnings');
      expect(aria.validationLabel('info', 5)).toBe('5 information');
    });

    it('should build button with shortcut label', async () => {
      const { aria } = await import('./accessibility');

      expect(aria.buttonWithShortcut('Save', 'Ctrl+S')).toBe('Save, keyboard shortcut: Ctrl+S');
    });
  });

  describe('checkColorContrast', () => {
    it('should calculate contrast ratio', async () => {
      const { checkColorContrast } = await import('./accessibility');

      // Black on white = maximum contrast
      const result = checkColorContrast('#000000', '#ffffff');

      expect(result.ratio).toBeCloseTo(21, 0);
      expect(result.passesAA).toBe(true);
      expect(result.passesAAA).toBe(true);
    });

    it('should identify AA passing contrast', async () => {
      const { checkColorContrast } = await import('./accessibility');

      // Dark gray on white - should pass AA
      const result = checkColorContrast('#595959', '#ffffff');

      expect(result.passesAA).toBe(true);
    });

    it('should identify AA failing contrast', async () => {
      const { checkColorContrast } = await import('./accessibility');

      // Light gray on white - should fail AA
      const result = checkColorContrast('#cccccc', '#ffffff');

      expect(result.passesAA).toBe(false);
    });

    it('should identify AAA passing contrast', async () => {
      const { checkColorContrast } = await import('./accessibility');

      const result = checkColorContrast('#000000', '#ffffff');

      expect(result.passesAAA).toBe(true);
    });

    it('should handle colors without # prefix', async () => {
      const { checkColorContrast } = await import('./accessibility');

      const result = checkColorContrast('000000', 'ffffff');

      expect(result.ratio).toBeCloseTo(21, 0);
    });

    it('should calculate symmetric contrast', async () => {
      const { checkColorContrast } = await import('./accessibility');

      const result1 = checkColorContrast('#000000', '#ffffff');
      const result2 = checkColorContrast('#ffffff', '#000000');

      expect(result1.ratio).toBeCloseTo(result2.ratio, 2);
    });
  });

  describe('RovingTabindex', () => {
    it('should initialize roving tabindex on container', async () => {
      const { RovingTabindex } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = `
        <div role="option" id="opt1">Option 1</div>
        <div role="option" id="opt2">Option 2</div>
        <div role="option" id="opt3">Option 3</div>
      `;
      document.body.appendChild(container);

      const roving = new RovingTabindex(container);
      roving.init();

      const opt1 = container.querySelector('#opt1') as HTMLElement;
      const opt2 = container.querySelector('#opt2') as HTMLElement;

      expect(opt1.tabIndex).toBe(0);
      expect(opt2.tabIndex).toBe(-1);
    });

    it('should handle arrow key navigation', async () => {
      const { RovingTabindex } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = `
        <div role="option" id="opt1">Option 1</div>
        <div role="option" id="opt2">Option 2</div>
        <div role="option" id="opt3">Option 3</div>
      `;
      document.body.appendChild(container);

      const roving = new RovingTabindex(container);
      roving.init();

      const opt1 = container.querySelector('#opt1') as HTMLElement;
      const opt2 = container.querySelector('#opt2') as HTMLElement;

      expect(opt1.tabIndex).toBe(0);

      // Press ArrowDown to move to next
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      opt1.dispatchEvent(event);

      expect(opt2.tabIndex).toBe(0);
      expect(opt1.tabIndex).toBe(-1);
    });

    it('should wrap around at boundaries', async () => {
      const { RovingTabindex } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = `
        <div role="option" id="opt1">Option 1</div>
        <div role="option" id="opt2">Option 2</div>
      `;
      document.body.appendChild(container);

      const roving = new RovingTabindex(container);
      roving.init();

      const opt1 = container.querySelector('#opt1') as HTMLElement;
      const opt2 = container.querySelector('#opt2') as HTMLElement;

      // From first, go up to wrap to last
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      opt1.dispatchEvent(upEvent);

      expect(opt2.tabIndex).toBe(0);

      // From last, go down to wrap to first
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      opt2.dispatchEvent(downEvent);

      expect(opt1.tabIndex).toBe(0);
    });

    it('should handle Home key', async () => {
      const { RovingTabindex } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = `
        <div role="option" id="opt1">Option 1</div>
        <div role="option" id="opt2">Option 2</div>
        <div role="option" id="opt3">Option 3</div>
      `;
      document.body.appendChild(container);

      const roving = new RovingTabindex(container);
      roving.init();

      const opt1 = container.querySelector('#opt1') as HTMLElement;
      const opt3 = container.querySelector('#opt3') as HTMLElement;

      // Move to last item
      opt3.focus();

      // Press Home
      const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
      opt3.dispatchEvent(event);

      expect(opt1.tabIndex).toBe(0);
      expect(opt3.tabIndex).toBe(-1);
    });

    it('should handle End key', async () => {
      const { RovingTabindex } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = `
        <div role="option" id="opt1">Option 1</div>
        <div role="option" id="opt2">Option 2</div>
        <div role="option" id="opt3">Option 3</div>
      `;
      document.body.appendChild(container);

      const roving = new RovingTabindex(container);
      roving.init();

      const opt1 = container.querySelector('#opt1') as HTMLElement;
      const opt3 = container.querySelector('#opt3') as HTMLElement;

      // Press End from first
      const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
      opt1.dispatchEvent(event);

      expect(opt3.tabIndex).toBe(0);
      expect(opt1.tabIndex).toBe(-1);
    });

    it('should cleanup on destroy', async () => {
      const { RovingTabindex } = await import('./accessibility');

      const container = document.createElement('div');
      container.innerHTML = `
        <div role="option" id="opt1">Option 1</div>
        <div role="option" id="opt2">Option 2</div>
      `;
      document.body.appendChild(container);

      const roving = new RovingTabindex(container);
      roving.init();

      roving.destroy();

      const opt1 = container.querySelector('#opt1') as HTMLElement;
      const opt2 = container.querySelector('#opt2') as HTMLElement;

      expect(opt1.tabIndex).toBe(-1);
      expect(opt2.tabIndex).toBe(-1);
    });
  });
});
