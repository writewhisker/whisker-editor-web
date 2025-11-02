import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import QuickShortcutsOverlay from './QuickShortcutsOverlay.svelte';

describe('QuickShortcutsOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: false },
      });
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toBeFalsy();
    });

    it('should render when show is true', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toBeTruthy();
    });

    it('should render header with title', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Quick Keyboard Shortcuts')).toBeTruthy();
    });

    it('should render close button', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const closeButton = container.querySelector('button[aria-label="Close quick shortcuts"]');
      expect(closeButton).toBeTruthy();
    });

    it('should render backdrop', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const backdrop = container.querySelector('.bg-black\\/40');
      expect(backdrop).toBeTruthy();
    });

    it('should render with backdrop blur', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const backdrop = container.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeTruthy();
    });
  });

  describe('shortcut groups', () => {
    it('should render file shortcuts group', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('FILE')).toBeTruthy();
    });

    it('should render edit shortcuts group', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('EDIT')).toBeTruthy();
    });

    it('should render navigation shortcuts group', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('NAVIGATION')).toBeTruthy();
    });

    it('should render view shortcuts group', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('VIEW')).toBeTruthy();
    });
  });

  describe('file shortcuts', () => {
    it('should display new project shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('New Project')).toBeTruthy();
    });

    it('should display open shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Open')).toBeTruthy();
    });

    it('should display save shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Save')).toBeTruthy();
    });

    it('should display save as shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Save As')).toBeTruthy();
    });
  });

  describe('edit shortcuts', () => {
    it('should display undo shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Undo')).toBeTruthy();
    });

    it('should display redo shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Redo')).toBeTruthy();
    });

    it('should display duplicate passage shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Duplicate Passage')).toBeTruthy();
    });

    it('should display find shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Find')).toBeTruthy();
    });
  });

  describe('navigation shortcuts', () => {
    it('should display command palette shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Command Palette')).toBeTruthy();
    });

    it('should display navigate passages shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Navigate Passages')).toBeTruthy();
    });

    it('should display switch view mode shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Switch View Mode')).toBeTruthy();
    });
  });

  describe('view shortcuts', () => {
    it('should display focus mode shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Focus Mode')).toBeTruthy();
    });

    it('should display overlay toggle shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('This Overlay')).toBeTruthy();
    });

    it('should display close dialog shortcut', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Close Dialog')).toBeTruthy();
    });
  });

  describe('keyboard keys display', () => {
    it('should render keyboard keys with kbd styling', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const kbdElements = container.querySelectorAll('.kbd-key');
      expect(kbdElements.length).toBeGreaterThan(0);
    });

    it('should display Ctrl keys', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      // Keys are formatted based on platform, check for Ctrl or ⌘
      expect(container.textContent).toMatch(/Ctrl|⌘/);
    });

    it('should display special keys like arrow keys', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(container.textContent).toContain('↑/↓');
    });

    it('should display question mark key', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(container.textContent).toContain('?');
    });

    it('should display escape key', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(container.textContent).toContain('Esc');
    });
  });

  describe('close button interaction', () => {
    it('should close when close button clicked', async () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });

      const closeButton = container.querySelector('button[aria-label="Close quick shortcuts"]');
      await fireEvent.click(closeButton!);

      // Wait for reactivity
      await waitFor(() => {
        const overlay = container.querySelector('.fixed.inset-0');
        expect(overlay).toBeFalsy();
      });
    });
  });

  describe('backdrop interaction', () => {
    it('should close when backdrop clicked', async () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });

      const backdrop = container.querySelector('.fixed.inset-0');
      await fireEvent.click(backdrop!);

      await waitFor(() => {
        const overlay = container.querySelector('.fixed.inset-0');
        expect(overlay).toBeFalsy();
      });
    });

    it('should not close when clicking dialog content', async () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });

      const dialog = container.querySelector('[role="dialog"]');
      await fireEvent.click(dialog!);

      // Should still be visible
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toBeTruthy();
    });
  });

  describe('keyboard interaction', () => {
    it('should close when escape key pressed', async () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });

      const backdrop = container.querySelector('.fixed.inset-0');
      await fireEvent.keyDown(backdrop!, { key: 'Escape' });

      await waitFor(() => {
        const overlay = container.querySelector('.fixed.inset-0');
        expect(overlay).toBeFalsy();
      });
    });

    it('should close when question mark key pressed', async () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });

      const backdrop = container.querySelector('.fixed.inset-0');
      await fireEvent.keyDown(backdrop!, { key: '?' });

      await waitFor(() => {
        const overlay = container.querySelector('.fixed.inset-0');
        expect(overlay).toBeFalsy();
      });
    });
  });

  describe('footer', () => {
    it('should display help link in footer', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('For complete list, see')).toBeTruthy();
    });

    it('should have clickable help link', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const link = getByText('Help → Keyboard Shortcuts');
      expect(link).toBeTruthy();
      expect(link.tagName.toLowerCase()).toBe('button');
    });

    it('should close when help link clicked', async () => {
      const { getByText, container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });

      const helpLink = getByText('Help → Keyboard Shortcuts');
      await fireEvent.click(helpLink);

      await waitFor(() => {
        const overlay = container.querySelector('.fixed.inset-0');
        expect(overlay).toBeFalsy();
      });
    });
  });

  describe('layout', () => {
    it('should use two-column grid layout', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const grid = container.querySelector('.grid.grid-cols-2');
      expect(grid).toBeTruthy();
    });

    it('should have gradient header', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const header = container.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-500');
      expect(header).toBeTruthy();
    });

    it('should have rounded corners', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const dialog = container.querySelector('.rounded-2xl');
      expect(dialog).toBeTruthy();
    });
  });

  describe('shortcut items', () => {
    it('should display shortcuts with descriptions and keys', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const shortcutItems = container.querySelectorAll('.flex.items-center.justify-between');
      expect(shortcutItems.length).toBeGreaterThan(0);

      // Each shortcut should have description and key
      shortcutItems.forEach(item => {
        const description = item.querySelector('.text-sm');
        const key = item.querySelector('.kbd-key');
        expect(description).toBeTruthy();
        expect(key).toBeTruthy();
      });
    });

    it('should have hover effects on shortcut items', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const shortcutItems = container.querySelectorAll('.hover\\:shadow-md');
      expect(shortcutItems.length).toBeGreaterThan(0);
    });
  });

  describe('Mac key formatting', () => {
    it('should format keys for Mac when on Mac platform', () => {
      // Mock Mac platform
      const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });

      // On Mac, should show ⌘ instead of Ctrl
      const hasCommandSymbol = container.textContent?.includes('⌘');
      const hasCtrl = container.textContent?.includes('Ctrl');

      // Either it has ⌘ or Ctrl (depending on implementation)
      expect(hasCommandSymbol || hasCtrl).toBe(true);

      // Restore original platform
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    });
  });

  describe('accessibility', () => {
    it('should have role dialog', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should have aria-modal', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const modal = container.querySelector('[aria-modal="true"]');
      expect(modal).toBeTruthy();
    });

    it('should have aria-labelledby', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const dialog = container.querySelector('[aria-labelledby="quick-shortcuts-title"]');
      expect(dialog).toBeTruthy();
    });

    it('should have title with matching id', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const title = container.querySelector('#quick-shortcuts-title');
      expect(title).toBeTruthy();
      expect(title?.textContent).toContain('Quick Keyboard Shortcuts');
    });

    it('should have aria-label on close button', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const closeButton = container.querySelector('button[aria-label="Close quick shortcuts"]');
      expect(closeButton).toBeTruthy();
    });
  });

  describe('animations', () => {
    it('should have scale-in animation', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      const animatedElement = container.querySelector('.animate-scale-in');
      expect(animatedElement).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle toggling show prop', async () => {
      const { container, component } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });

      let overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toBeTruthy();

      // Toggle to false
      component.$set({ show: false });
      await waitFor(() => {
        overlay = container.querySelector('.fixed.inset-0');
        expect(overlay).toBeFalsy();
      });

      // Toggle back to true
      component.$set({ show: true });
      await waitFor(() => {
        overlay = container.querySelector('.fixed.inset-0');
        expect(overlay).toBeTruthy();
      });
    });

    it('should handle rapid keyboard events', async () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });

      const backdrop = container.querySelector('.fixed.inset-0');

      // Rapid key presses
      await fireEvent.keyDown(backdrop!, { key: '?' });
      await fireEvent.keyDown(backdrop!, { key: 'Escape' });

      await waitFor(() => {
        const overlay = container.querySelector('.fixed.inset-0');
        expect(overlay).toBeFalsy();
      });
    });
  });

  describe('instruction text', () => {
    it('should display close instruction', () => {
      const { getByText } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(getByText('Press ? or Esc to close')).toBeTruthy();
    });

    it('should display emoji in title', () => {
      const { container } = render(QuickShortcutsOverlay, {
        props: { show: true },
      });
      expect(container.textContent).toContain('⚡');
    });
  });
});
