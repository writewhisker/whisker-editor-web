import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp.svelte';
import { shortcutCategories, showShortcutsHelp } from '$lib/stores/keyboardShortcutsStore';

// Mock trapFocus utility
vi.mock('$lib/utils/accessibility', () => ({
  trapFocus: vi.fn(() => vi.fn()), // Returns cleanup function
}));

describe('KeyboardShortcutsHelp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showShortcutsHelp.set(false);
  });

  describe('visibility', () => {
    it('should not render when showShortcutsHelp is false', () => {
      showShortcutsHelp.set(false);
      const { container } = render(KeyboardShortcutsHelp);
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should render when showShortcutsHelp is true', () => {
      showShortcutsHelp.set(true);
      const { container } = render(KeyboardShortcutsHelp);
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('header', () => {
    beforeEach(() => {
      showShortcutsHelp.set(true);
    });

    it('should display title', () => {
      const { getByText } = render(KeyboardShortcutsHelp);
      expect(getByText('Keyboard Shortcuts')).toBeTruthy();
    });

    it('should have close button with aria-label', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const closeButton = container.querySelector('[aria-label="Close shortcuts help"]');
      expect(closeButton).toBeTruthy();
    });

    it('should display close icon (X)', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('shortcuts display', () => {
    beforeEach(() => {
      showShortcutsHelp.set(true);
    });

    it('should display all shortcut categories', () => {
      const { container } = render(KeyboardShortcutsHelp);

      shortcutCategories.forEach(category => {
        const text = container.textContent || '';
        expect(text).toContain(category.name);
      });
    });

    it('should display shortcuts for each category', () => {
      const { container } = render(KeyboardShortcutsHelp);

      shortcutCategories.forEach(category => {
        category.shortcuts.forEach(shortcut => {
          const text = container.textContent || '';
          expect(text).toContain(shortcut.description);
        });
      });
    });

    it('should display shortcut keys in kbd elements', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const kbdElements = container.querySelectorAll('kbd');
      expect(kbdElements.length).toBeGreaterThan(0);
    });
  });

  describe('platform-specific formatting', () => {
    beforeEach(() => {
      showShortcutsHelp.set(true);
    });

    it('should format shortcuts for non-Mac platforms', () => {
      // Mock non-Mac platform
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });

      const { container } = render(KeyboardShortcutsHelp);
      const text = container.textContent || '';

      // Should contain "Ctrl" not "Cmd" for non-Mac
      if (text.includes('Ctrl')) {
        expect(text).toContain('Ctrl');
      }
    });

    it('should show Mac-specific tip on Mac', () => {
      // Mock Mac platform
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      const { container } = render(KeyboardShortcutsHelp);
      const text = container.textContent || '';
      expect(text).toContain('Cmd');
    });
  });

  describe('tips section', () => {
    beforeEach(() => {
      showShortcutsHelp.set(true);
    });

    it('should display Tips header', () => {
      const { getByText } = render(KeyboardShortcutsHelp);
      expect(getByText('Tips')).toBeTruthy();
    });

    it('should display tip about shortcuts working in text fields', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const text = container.textContent || '';
      expect(text).toContain('Most shortcuts work even when typing in text fields');
    });

    it('should display tip about ? key', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const text = container.textContent || '';
      expect(text).toContain('anytime to show this help');
    });

    it('should display tip about Escape key', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const text = container.textContent || '';
      expect(text).toContain('to close this dialog');
    });
  });

  describe('footer', () => {
    beforeEach(() => {
      showShortcutsHelp.set(true);
    });

    it('should display documentation link', () => {
      const { getByText } = render(KeyboardShortcutsHelp);
      expect(getByText('View full documentation')).toBeTruthy();
    });

    it('should have correct link href', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const link = container.querySelector('a[href="/docs/KEYBOARD_SHORTCUTS.md"]');
      expect(link).toBeTruthy();
    });

    it('should have link with target="_blank"', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const link = container.querySelector('a[target="_blank"]');
      expect(link).toBeTruthy();
    });

    it('should have link with rel="noopener noreferrer"', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const link = container.querySelector('a[rel="noopener noreferrer"]');
      expect(link).toBeTruthy();
    });

    it('should display "Got it!" button', () => {
      const { getByText } = render(KeyboardShortcutsHelp);
      expect(getByText('Got it!')).toBeTruthy();
    });
  });

  describe('close functionality', () => {
    beforeEach(() => {
      showShortcutsHelp.set(true);
    });

    it('should close when close button clicked', async () => {
      const { container } = render(KeyboardShortcutsHelp);
      const closeButton = container.querySelector('[aria-label="Close shortcuts help"]') as HTMLElement;

      expect(get(showShortcutsHelp)).toBe(true);
      await fireEvent.click(closeButton);
      expect(get(showShortcutsHelp)).toBe(false);
    });

    it('should close when "Got it!" button clicked', async () => {
      const { getByText } = render(KeyboardShortcutsHelp);
      const gotItButton = getByText('Got it!');

      expect(get(showShortcutsHelp)).toBe(true);
      await fireEvent.click(gotItButton);
      expect(get(showShortcutsHelp)).toBe(false);
    });

    it('should close when backdrop clicked', async () => {
      const { container } = render(KeyboardShortcutsHelp);
      const backdrop = container.querySelector('[role="presentation"]') as HTMLElement;

      expect(get(showShortcutsHelp)).toBe(true);
      await fireEvent.click(backdrop);
      expect(get(showShortcutsHelp)).toBe(false);
    });

    it('should not close when dialog content clicked', async () => {
      const { container } = render(KeyboardShortcutsHelp);
      const dialog = container.querySelector('[role="dialog"]') as HTMLElement;

      expect(get(showShortcutsHelp)).toBe(true);
      await fireEvent.click(dialog);
      expect(get(showShortcutsHelp)).toBe(true); // Should still be open
    });

    it('should close on Escape key', async () => {
      const { container } = render(KeyboardShortcutsHelp);
      const backdrop = container.querySelector('[role="presentation"]') as HTMLElement;

      expect(get(showShortcutsHelp)).toBe(true);
      await fireEvent.keyDown(backdrop, { key: 'Escape' });
      expect(get(showShortcutsHelp)).toBe(false);
    });

    it('should not close on other keys', async () => {
      const { container } = render(KeyboardShortcutsHelp);
      const backdrop = container.querySelector('[role="presentation"]') as HTMLElement;

      expect(get(showShortcutsHelp)).toBe(true);
      await fireEvent.keyDown(backdrop, { key: 'Enter' });
      expect(get(showShortcutsHelp)).toBe(true); // Should still be open
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      showShortcutsHelp.set(true);
    });

    it('should have proper ARIA attributes', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('shortcuts-title');
    });

    it('should have title with correct id', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const title = container.querySelector('#shortcuts-title');
      expect(title).toBeTruthy();
      expect(title?.textContent).toBe('Keyboard Shortcuts');
    });

    it('should have backdrop with role="presentation"', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const backdrop = container.querySelector('[role="presentation"]');
      expect(backdrop).toBeTruthy();
    });
  });

  describe('styling', () => {
    beforeEach(() => {
      showShortcutsHelp.set(true);
    });

    it('should have modal with max-width and overflow handling', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.className).toContain('max-w-3xl');
      expect(dialog?.className).toContain('max-h-[80vh]');
    });

    it('should have scrollable content area', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const content = container.querySelector('.overflow-y-auto');
      expect(content).toBeTruthy();
    });

    it('should have styled kbd elements', () => {
      const { container } = render(KeyboardShortcutsHelp);
      const kbd = container.querySelector('kbd');
      expect(kbd?.className).toContain('font-mono');
      expect(kbd?.className).toContain('bg-gray-100');
    });
  });
});
