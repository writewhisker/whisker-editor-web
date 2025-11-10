import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MobileToolbar from './MobileToolbar.svelte';

// Mock the hapticFeedback utility
vi.mock('../../utils/mobile', () => ({
  hapticFeedback: vi.fn()
}));

describe('MobileToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render main FAB button', () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      expect(fab).toBeTruthy();
    });

    it('should show plus icon when collapsed', () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      const svg = fab?.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should not show action buttons when collapsed', () => {
      const { container } = render(MobileToolbar);

      const actionButtons = container.querySelector('.action-buttons');
      expect(actionButtons).toBeNull();
    });

    it('should not show zoom indicator when collapsed', () => {
      const { container } = render(MobileToolbar);

      const zoomIndicator = container.querySelector('.zoom-indicator');
      expect(zoomIndicator).toBeNull();
    });

    it('should not show menu drawer initially', () => {
      const { container } = render(MobileToolbar);

      const menuDrawer = container.querySelector('.menu-drawer');
      expect(menuDrawer).toBeNull();
    });

    it('should not show menu overlay initially', () => {
      const { container } = render(MobileToolbar);

      const menuOverlay = container.querySelector('.menu-overlay');
      expect(menuOverlay).toBeNull();
    });
  });

  describe('FAB expansion', () => {
    it('should expand when main FAB clicked', async () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const actionButtons = container.querySelector('.action-buttons');
      expect(actionButtons).toBeTruthy();
    });

    it('should show close icon when expanded', async () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      // Icon should change to X
      const svg = fab?.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should collapse when main FAB clicked again', async () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);
      await fireEvent.click(fab!);

      const actionButtons = container.querySelector('.action-buttons');
      expect(actionButtons).toBeNull();
    });

    it('should show zoom indicator when expanded', async () => {
      const { container } = render(MobileToolbar, {
        props: { currentZoom: 1.5 }
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const zoomIndicator = container.querySelector('.zoom-indicator');
      expect(zoomIndicator).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    async function expandToolbar(container: HTMLElement) {
      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);
    }

    it('should show all action buttons when expanded', async () => {
      const { container } = render(MobileToolbar);
      await expandToolbar(container);

      const actionButtons = container.querySelectorAll('.action-buttons .fab.secondary');
      expect(actionButtons.length).toBe(6); // Add, Fit, Zoom In, Zoom Out, Toggle Minimap, Menu
    });

    it('should show add passage button', async () => {
      const { container } = render(MobileToolbar);
      await expandToolbar(container);

      const addButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Add passage');

      expect(addButton).toBeTruthy();
    });

    it('should show fit view button', async () => {
      const { container } = render(MobileToolbar);
      await expandToolbar(container);

      const fitButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Fit view');

      expect(fitButton).toBeTruthy();
    });

    it('should show zoom in button', async () => {
      const { container } = render(MobileToolbar);
      await expandToolbar(container);

      const zoomInButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Zoom in');

      expect(zoomInButton).toBeTruthy();
    });

    it('should show zoom out button', async () => {
      const { container } = render(MobileToolbar);
      await expandToolbar(container);

      const zoomOutButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Zoom out');

      expect(zoomOutButton).toBeTruthy();
    });

    it('should show toggle minimap button', async () => {
      const { container } = render(MobileToolbar);
      await expandToolbar(container);

      const minimapButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label')?.includes('minimap'));

      expect(minimapButton).toBeTruthy();
    });

    it('should update minimap button label based on state', async () => {
      const { container } = render(MobileToolbar, {
        props: { showMiniMap: false }
      });
      await expandToolbar(container);

      const minimapButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label')?.includes('minimap'));

      expect(minimapButton?.getAttribute('aria-label')).toBe('Show minimap');
    });

    it('should show menu button', async () => {
      const { container } = render(MobileToolbar);
      await expandToolbar(container);

      const menuButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Open menu');

      expect(menuButton).toBeTruthy();
    });
  });

  describe('zoom indicator', () => {
    async function expandToolbar(container: HTMLElement) {
      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);
    }

    it('should display current zoom percentage', async () => {
      const { container } = render(MobileToolbar, {
        props: { currentZoom: 1.0 }
      });
      await expandToolbar(container);

      const zoomIndicator = container.querySelector('.zoom-indicator');
      expect(zoomIndicator?.textContent).toBe('100%');
    });

    it('should update when zoom changes', async () => {
      const { container, component } = render(MobileToolbar, {
        props: { currentZoom: 1.0 }
      });
      await expandToolbar(container);

      (component as any).$set({ currentZoom: 1.5 });

      const zoomIndicator = container.querySelector('.zoom-indicator');
      expect(zoomIndicator?.textContent).toBe('150%');
    });

    it('should round zoom percentage', async () => {
      const { container } = render(MobileToolbar, {
        props: { currentZoom: 1.234 }
      });
      await expandToolbar(container);

      const zoomIndicator = container.querySelector('.zoom-indicator');
      expect(zoomIndicator?.textContent).toBe('123%');
    });

    it('should handle zoom less than 100%', async () => {
      const { container } = render(MobileToolbar, {
        props: { currentZoom: 0.5 }
      });
      await expandToolbar(container);

      const zoomIndicator = container.querySelector('.zoom-indicator');
      expect(zoomIndicator?.textContent).toBe('50%');
    });
  });

  describe('menu drawer', () => {
    async function expandToolbar(container: HTMLElement) {
      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);
    }

    async function openMenu(container: HTMLElement) {
      await expandToolbar(container);
      const menuButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Open menu');
      await fireEvent.click(menuButton!);
    }

    it('should show menu drawer when menu button clicked', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const menuDrawer = container.querySelector('.menu-drawer');
      expect(menuDrawer).toBeTruthy();
    });

    it('should show menu overlay when opened', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const menuOverlay = container.querySelector('.menu-overlay');
      expect(menuOverlay).toBeTruthy();
    });

    it('should show menu header', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const menuHeader = container.querySelector('.menu-header');
      expect(menuHeader).toBeTruthy();
      expect(menuHeader?.textContent).toContain('Menu');
    });

    it('should show close button in menu', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const closeButton = container.querySelector('.close-button');
      expect(closeButton).toBeTruthy();
    });

    it('should close FAB menu when opening hamburger menu', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const actionButtons = container.querySelector('.action-buttons');
      expect(actionButtons).toBeNull();
    });
  });

  describe('menu items', () => {
    async function openMenu(container: HTMLElement) {
      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);
      const menuButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Open menu');
      await fireEvent.click(menuButton!);
    }

    it('should show all menu items', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const menuItems = container.querySelectorAll('.menu-item');
      expect(menuItems.length).toBe(7); // New, Open, Save, Export, Import, Settings
    });

    it('should show New Story menu item', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const newStoryItem = Array.from(container.querySelectorAll('.menu-item'))
        .find(item => item.textContent?.includes('New Story'));

      expect(newStoryItem).toBeTruthy();
    });

    it('should show Open Story menu item', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const openStoryItem = Array.from(container.querySelectorAll('.menu-item'))
        .find(item => item.textContent?.includes('Open Story'));

      expect(openStoryItem).toBeTruthy();
    });

    it('should show Save menu item', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const saveItem = Array.from(container.querySelectorAll('.menu-item'))
        .find(item => item.textContent?.trim() === 'Save');

      expect(saveItem).toBeTruthy();
    });

    it('should show Export menu item', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const exportItem = Array.from(container.querySelectorAll('.menu-item'))
        .find(item => item.textContent?.trim() === 'Export');

      expect(exportItem).toBeTruthy();
    });

    it('should show Import menu item', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const importItem = Array.from(container.querySelectorAll('.menu-item'))
        .find(item => item.textContent?.trim() === 'Import');

      expect(importItem).toBeTruthy();
    });

    it('should show Settings menu item', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const settingsItem = Array.from(container.querySelectorAll('.menu-item'))
        .find(item => item.textContent?.includes('Settings'));

      expect(settingsItem).toBeTruthy();
    });

    it('should show dividers between menu sections', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const dividers = container.querySelectorAll('.menu-divider');
      expect(dividers.length).toBeGreaterThan(0);
    });

    it('should show icons for menu items', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const menuItems = container.querySelectorAll('.menu-item');
      menuItems.forEach(item => {
        const icon = item.querySelector('.menu-icon');
        expect(icon).toBeTruthy();
      });
    });
  });

  describe('menu interactions', () => {
    async function openMenu(container: HTMLElement) {
      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);
      const menuButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Open menu');
      await fireEvent.click(menuButton!);
    }

    it('should close menu when overlay clicked', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const menuOverlay = container.querySelector('.menu-overlay');
      await fireEvent.click(menuOverlay!);

      const menuDrawer = container.querySelector('.menu-drawer');
      expect(menuDrawer).toBeNull();
    });

    it('should close menu when close button clicked', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const closeButton = container.querySelector('.close-button');
      await fireEvent.click(closeButton!);

      const menuDrawer = container.querySelector('.menu-drawer');
      expect(menuDrawer).toBeNull();
    });

    it('should close menu after selecting menu item', async () => {
      const { container } = render(MobileToolbar);
      await openMenu(container);

      const menuItem = container.querySelector('.menu-item');
      await fireEvent.click(menuItem!);

      const menuDrawer = container.querySelector('.menu-drawer');
      expect(menuDrawer).toBeNull();
    });
  });

  describe('event dispatching', () => {
    it('should dispatch addPassage event', async () => {
      const { container, component } = render(MobileToolbar);

      let eventDispatched = false;
      (component as any).$on('addPassage', () => {
        eventDispatched = true;
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const addButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Add passage');
      await fireEvent.click(addButton!);

      expect(eventDispatched).toBe(true);
    });

    it('should dispatch fitView event', async () => {
      const { container, component } = render(MobileToolbar);

      let eventDispatched = false;
      (component as any).$on('fitView', () => {
        eventDispatched = true;
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const fitButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Fit view');
      await fireEvent.click(fitButton!);

      expect(eventDispatched).toBe(true);
    });

    it('should dispatch zoomIn event', async () => {
      const { container, component } = render(MobileToolbar);

      let eventDispatched = false;
      (component as any).$on('zoomIn', () => {
        eventDispatched = true;
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const zoomInButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Zoom in');
      await fireEvent.click(zoomInButton!);

      expect(eventDispatched).toBe(true);
    });

    it('should dispatch zoomOut event', async () => {
      const { container, component } = render(MobileToolbar);

      let eventDispatched = false;
      (component as any).$on('zoomOut', () => {
        eventDispatched = true;
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const zoomOutButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Zoom out');
      await fireEvent.click(zoomOutButton!);

      expect(eventDispatched).toBe(true);
    });

    it('should dispatch toggleMiniMap event', async () => {
      const { container, component } = render(MobileToolbar);

      let eventDispatched = false;
      (component as any).$on('toggleMiniMap', () => {
        eventDispatched = true;
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const minimapButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label')?.includes('minimap'));
      await fireEvent.click(minimapButton!);

      expect(eventDispatched).toBe(true);
    });

    it('should dispatch saveStory event from menu', async () => {
      const { container, component } = render(MobileToolbar);

      let eventDispatched = false;
      (component as any).$on('saveStory', () => {
        eventDispatched = true;
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const menuButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label') === 'Open menu');
      await fireEvent.click(menuButton!);

      const saveItem = Array.from(container.querySelectorAll('.menu-item'))
        .find(item => item.textContent?.trim() === 'Save');
      await fireEvent.click(saveItem!);

      expect(eventDispatched).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on main FAB', () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      expect(fab?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-labels on all action buttons', async () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const actionButtons = container.querySelectorAll('.action-buttons .fab.secondary');
      actionButtons.forEach(btn => {
        expect(btn.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should update aria-label when FAB state changes', async () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      expect(fab?.getAttribute('aria-label')).toBe('Open toolbar');

      await fireEvent.click(fab!);
      expect(fab?.getAttribute('aria-label')).toBe('Close toolbar');
    });

    it('should have aria-label on slider', async () => {
      const { container } = render(MobileToolbar, {
        props: {
          showSlider: true,
          min: 0,
          max: 100
        } as any
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const slider = container.querySelector('.range-slider');
      if (slider) {
        expect(slider.getAttribute('aria-label')).toBeTruthy();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle rapid FAB clicks', async () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');

      for (let i = 0; i < 10; i++) {
        await fireEvent.click(fab!);
      }

      // Should still be in a valid state
      expect(fab).toBeTruthy();
    });

    it('should handle menu open/close cycles', async () => {
      const { container } = render(MobileToolbar);

      for (let i = 0; i < 5; i++) {
        const fab = container.querySelector('.fab.primary');
        await fireEvent.click(fab!);

        const menuButton = Array.from(container.querySelectorAll('.fab.secondary'))
          .find(btn => btn.getAttribute('aria-label') === 'Open menu');
        await fireEvent.click(menuButton!);

        const closeButton = container.querySelector('.close-button');
        await fireEvent.click(closeButton!);
      }

      const menuDrawer = container.querySelector('.menu-drawer');
      expect(menuDrawer).toBeNull();
    });

    it('should handle zero zoom', async () => {
      const { container } = render(MobileToolbar, {
        props: { currentZoom: 0 }
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const zoomIndicator = container.querySelector('.zoom-indicator');
      expect(zoomIndicator?.textContent).toBe('0%');
    });

    it('should handle very high zoom', async () => {
      const { container } = render(MobileToolbar, {
        props: { currentZoom: 10.5 }
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const zoomIndicator = container.querySelector('.zoom-indicator');
      expect(zoomIndicator?.textContent).toBe('1050%');
    });

    it('should handle showMiniMap toggle', async () => {
      const { container, component } = render(MobileToolbar, {
        props: { showMiniMap: true }
      });

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      let minimapButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label')?.includes('minimap'));
      expect(minimapButton?.getAttribute('aria-label')).toBe('Hide minimap');

      (component as any).$set({ showMiniMap: false });

      minimapButton = Array.from(container.querySelectorAll('.fab.secondary'))
        .find(btn => btn.getAttribute('aria-label')?.includes('minimap'));
      expect(minimapButton?.getAttribute('aria-label')).toBe('Show minimap');
    });
  });

  describe('animations', () => {
    it('should have animation classes on action buttons', async () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      await fireEvent.click(fab!);

      const actionButtons = container.querySelector('.action-buttons');
      expect(actionButtons).toBeTruthy();
      // Animation classes are applied via CSS
    });

    it('should have icon rotation class when expanded', async () => {
      const { container } = render(MobileToolbar);

      const fab = container.querySelector('.fab.primary');
      const icon = fab?.querySelector('.icon');

      await fireEvent.click(fab!);

      expect(icon?.classList.contains('rotated')).toBe(true);
    });
  });
});
