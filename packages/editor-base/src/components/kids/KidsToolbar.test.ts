/**
 * Tests for Kids Toolbar
 *
 * Tests the simplified, colorful toolbar for kids mode
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store';
import KidsToolbar from './KidsToolbar.svelte';
import { viewMode, viewPreferencesActions } from '../../stores/viewPreferencesStore';

describe('KidsToolbar', () => {
  beforeEach(() => {
    // Reset view mode to list
    viewPreferencesActions.setViewMode('list');
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render all view mode buttons', () => {
      render(KidsToolbar);

      expect(screen.getByText('Page List')).toBeTruthy();
      expect(screen.getByText('Story Map')).toBeTruthy();
      expect(screen.getByText('Play Story')).toBeTruthy();
    });

    it('should show view mode icons', () => {
      const { container } = render(KidsToolbar);

      expect(container.textContent).toContain('📄'); // Page List
      expect(container.textContent).toContain('🗺️'); // Story Map
      expect(container.textContent).toContain('🎮'); // Play Story
    });

    it('should render Add Page button', () => {
      render(KidsToolbar);

      expect(screen.getByText('Add Page')).toBeTruthy();
    });

    it('should render Share button', () => {
      render(KidsToolbar);

      expect(screen.getByText('Share')).toBeTruthy();
    });

    it('should show quick action icons', () => {
      const { container } = render(KidsToolbar);

      expect(container.textContent).toContain('➕'); // Add
      expect(container.textContent).toContain('🎁'); // Share
    });
  });

  describe('View Mode Switching', () => {
    it('should highlight Page List button when in list mode', () => {
      viewPreferencesActions.setViewMode('list');
      const { container } = render(KidsToolbar);

      const listButton = screen.getByText('Page List').closest('button');
      expect(listButton?.classList.contains('bg-purple-600')).toBeTruthy();
    });

    it('should highlight Story Map button when in graph mode', () => {
      viewPreferencesActions.setViewMode('graph');
      const { container } = render(KidsToolbar);

      const graphButton = screen.getByText('Story Map').closest('button');
      expect(graphButton?.classList.contains('bg-blue-600')).toBeTruthy();
    });

    it('should highlight Play Story button when in preview mode', () => {
      viewPreferencesActions.setViewMode('preview');
      const { container } = render(KidsToolbar);

      const previewButton = screen.getByText('Play Story').closest('button');
      expect(previewButton?.classList.contains('bg-green-600')).toBeTruthy();
    });

    it('should switch to list mode when Page List clicked', async () => {
      viewPreferencesActions.setViewMode('graph');
      render(KidsToolbar);

      const listButton = screen.getByText('Page List');
      await fireEvent.click(listButton);

      expect(get(viewMode)).toBe('list');
    });

    it('should switch to graph mode when Story Map clicked', async () => {
      viewPreferencesActions.setViewMode('list');
      render(KidsToolbar);

      const graphButton = screen.getByText('Story Map');
      await fireEvent.click(graphButton);

      expect(get(viewMode)).toBe('graph');
    });

    it('should switch to preview mode when Play Story clicked', async () => {
      viewPreferencesActions.setViewMode('list');
      render(KidsToolbar);

      const previewButton = screen.getByText('Play Story');
      await fireEvent.click(previewButton);

      expect(get(viewMode)).toBe('preview');
    });
  });

  describe('Quick Actions', () => {
    it('should have Add Page button as clickable', () => {
      const { container } = render(KidsToolbar);

      const addButton = screen.getByText('Add Page').closest('button');
      expect(addButton?.tagName).toBe('BUTTON');
    });

    it('should have Share button as clickable', () => {
      const { container } = render(KidsToolbar);

      const shareButton = screen.getByText('Share').closest('button');
      expect(shareButton?.tagName).toBe('BUTTON');
    });

    it('should show tooltip for Add Page button', () => {
      render(KidsToolbar);

      const addButton = screen.getByText('Add Page').closest('button');
      expect(addButton?.getAttribute('title')).toBe('Add a new story page');
    });

    it('should show tooltip for Share button', () => {
      render(KidsToolbar);

      const shareButton = screen.getByText('Share').closest('button');
      expect(shareButton?.getAttribute('title')).toBe('Share your story');
    });
  });

  describe('Structure', () => {
    it('should have all buttons as proper button elements', () => {
      const { container } = render(KidsToolbar);

      const buttons = container.querySelectorAll('button');
      // 3 view mode buttons + 2 quick action buttons = 5 total
      expect(buttons.length).toBe(5);
    });

    it('should have proper toolbar class', () => {
      const { container } = render(KidsToolbar);

      const toolbar = container.querySelector('.kids-toolbar');
      expect(toolbar).toBeTruthy();
    });
  });

  describe('Reactivity', () => {
    it('should update highlighting when view mode changes externally', async () => {
      const { container } = render(KidsToolbar);

      // Start in list mode
      viewPreferencesActions.setViewMode('list');
      await new Promise(resolve => setTimeout(resolve, 0));

      let listButton = screen.getByText('Page List').closest('button');
      expect(listButton?.classList.contains('bg-purple-600')).toBeTruthy();

      // Switch to graph mode
      viewPreferencesActions.setViewMode('graph');
      await new Promise(resolve => setTimeout(resolve, 0));

      let graphButton = screen.getByText('Story Map').closest('button');
      expect(graphButton?.classList.contains('bg-blue-600')).toBeTruthy();
    });
  });
});
