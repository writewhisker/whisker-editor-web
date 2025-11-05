/**
 * Tests for Kids Menu Bar
 *
 * Tests the simplified menu bar for kids mode
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import KidsMenuBar from './KidsMenuBar.svelte';

describe('KidsMenuBar', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render Story Creator title', () => {
      render(KidsMenuBar);

      expect(screen.getByText('Story Creator')).toBeTruthy();
    });

    it('should render logo emoji', () => {
      const { container } = render(KidsMenuBar);

      expect(container.textContent).toContain('📖');
    });

    it('should render File menu button', () => {
      render(KidsMenuBar);

      expect(screen.getByText('File')).toBeTruthy();
    });

    it('should render Theme menu button', () => {
      render(KidsMenuBar);

      expect(screen.getByText('Theme')).toBeTruthy();
    });

    it('should render Help menu button', () => {
      render(KidsMenuBar);

      expect(screen.getByText('Help')).toBeTruthy();
    });
  });

  describe('File Menu', () => {
    it('should not show File menu initially', () => {
      render(KidsMenuBar);

      // Menu items should not be visible
      expect(screen.queryByText('New Story')).toBeFalsy();
    });

    it('should show File menu when clicked', async () => {
      render(KidsMenuBar);

      const fileButton = screen.getByText('File');
      await fireEvent.click(fileButton);

      expect(screen.getByText('New Story')).toBeTruthy();
      expect(screen.getByText('Open Story')).toBeTruthy();
      expect(screen.getByText('Save Story')).toBeTruthy();
    });

    it('should hide File menu when clicked again', async () => {
      render(KidsMenuBar);

      const fileButton = screen.getByText('File');

      // Open menu
      await fireEvent.click(fileButton);
      expect(screen.getByText('New Story')).toBeTruthy();

      // Close menu
      await fireEvent.click(fileButton);
      expect(screen.queryByText('New Story')).toBeFalsy();
    });
  });

  describe('Theme Menu', () => {
    it('should show Theme menu when clicked', async () => {
      render(KidsMenuBar);

      const themeButton = screen.getByText('Theme');
      await fireEvent.click(themeButton);

      expect(screen.getByText(/Minecraft/i)).toBeTruthy();
      expect(screen.getByText(/Roblox/i)).toBeTruthy();
    });

    it('should close other menus when Theme menu opened', async () => {
      render(KidsMenuBar);

      // Open File menu first
      const fileButton = screen.getByText('File');
      await fireEvent.click(fileButton);
      expect(screen.getByText('New Story')).toBeTruthy();

      // Open Theme menu
      const themeButton = screen.getByText('Theme');
      await fireEvent.click(themeButton);

      // File menu should be closed
      expect(screen.queryByText('New Story')).toBeFalsy();
      // Theme menu should be open
      expect(screen.getByText(/Minecraft/i)).toBeTruthy();
    });
  });

  describe('Help Menu', () => {
    it('should show Help menu when clicked', async () => {
      render(KidsMenuBar);

      const helpButton = screen.getByText('Help');
      await fireEvent.click(helpButton);

      expect(screen.getByText(/Tutorial/i)).toBeTruthy();
    });
  });

  describe('Menu Behavior', () => {
    it('should close File menu when menu item clicked', async () => {
      render(KidsMenuBar);

      const fileButton = screen.getByText('File');
      await fireEvent.click(fileButton);

      const newStoryButton = screen.getByText('New Story');
      await fireEvent.click(newStoryButton);

      // Menu should be closed after clicking item
      expect(screen.queryByText('Open Story')).toBeFalsy();
    });
  });

  describe('Structure', () => {
    it('should have header element', () => {
      const { container } = render(KidsMenuBar);

      const header = container.querySelector('.kids-header');
      expect(header).toBeTruthy();
      expect(header?.tagName).toBe('HEADER');
    });

    it('should have navigation element', () => {
      const { container } = render(KidsMenuBar);

      const nav = container.querySelector('nav');
      expect(nav).toBeTruthy();
    });
  });
});
