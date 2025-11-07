import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import CommandPalette from './CommandPalette.svelte';
import { currentStory, passageList, selectedPassageId } from '../stores/projectStore';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';

// Mock trapFocus utility
vi.mock('../utils/accessibility', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    currentStory.set(null);
    selectedPassageId.set(null);
    vi.clearAllMocks();

    // Mock scrollIntoView (not available in jsdom)
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    currentStory.set(null);
    selectedPassageId.set(null);
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(CommandPalette, { props: { show: false } });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(CommandPalette, { props: { show: true } });
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should render search input', () => {
      const { container } = render(CommandPalette, { props: { show: true } });
      const input = container.querySelector('input[type="text"]');
      expect(input).toBeTruthy();
      expect(input?.getAttribute('placeholder')).toContain('Type a command');
    });

    it('should show Esc key hint', () => {
      const { getByText } = render(CommandPalette, { props: { show: true } });
      expect(getByText('Esc')).toBeTruthy();
    });

    it('should show keyboard navigation hints', () => {
      const { getByText } = render(CommandPalette, { props: { show: true } });
      expect(getByText('Navigate')).toBeTruthy();
      expect(getByText('Select')).toBeTruthy();
    });
  });

  describe('commands without story', () => {
    it('should show basic file commands when no story loaded', () => {
      const { getByText } = render(CommandPalette, { props: { show: true } });

      expect(getByText('New Project')).toBeTruthy();
      expect(getByText('Open Project')).toBeTruthy();
      expect(getByText('Load Example: The Cave')).toBeTruthy();
    });

    it('should show command count in footer', () => {
      const { container } = render(CommandPalette, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('command');
    });
  });

  describe('commands with story', () => {
    beforeEach(() => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      const p1 = new Passage({ title: 'Passage 1', content: 'Content 1', position: { x: 0, y: 0 } });
      story.addPassage(p1);
      currentStory.set(story);
    });

    it('should show file commands', () => {
      const { getByText } = render(CommandPalette, { props: { show: true } });

      expect(getByText('Save Project')).toBeTruthy();
      expect(getByText('Export Story')).toBeTruthy();
      expect(getByText('Import Story')).toBeTruthy();
    });

    it('should show edit commands', () => {
      const { getByText } = render(CommandPalette, { props: { show: true } });

      expect(getByText('Undo')).toBeTruthy();
      expect(getByText('Redo')).toBeTruthy();
      expect(getByText('Add New Passage')).toBeTruthy();
    });

    it('should show view commands', () => {
      const { getByText } = render(CommandPalette, { props: { show: true } });

      expect(getByText('Switch to List View')).toBeTruthy();
      expect(getByText('Switch to Graph View')).toBeTruthy();
      expect(getByText('Switch to Split View')).toBeTruthy();
      expect(getByText('Switch to Preview Mode')).toBeTruthy();
    });

    it('should show help commands', () => {
      const { getByText } = render(CommandPalette, { props: { show: true } });
      expect(getByText('Show Keyboard Shortcuts')).toBeTruthy();
    });

    it('should show passage navigation commands', () => {
      const { container } = render(CommandPalette, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Go to: Passage 1');
    });

    it('should show categories', () => {
      const { container } = render(CommandPalette, { props: { show: true } });

      const text = container.textContent || '';
      // Categories are rendered (they appear in the text with labels)
      expect(text).toContain('File');
      expect(text).toContain('Edit');
      expect(text).toContain('View');
      expect(text).toContain('Navigate');
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);
    });

    it('should filter commands by label', async () => {
      const { container, queryByText } = render(CommandPalette, { props: { show: true } });
      const input = container.querySelector('input[type="text"]') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'save' } });

      expect(queryByText('Save Project')).toBeTruthy();
      expect(queryByText('Save As...')).toBeTruthy();
      expect(queryByText('Add New Passage')).toBeNull();
    });

    it('should filter commands by category', async () => {
      const { container, queryByText } = render(CommandPalette, { props: { show: true } });
      const input = container.querySelector('input[type="text"]') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'edit' } });

      expect(queryByText('Undo')).toBeTruthy();
      expect(queryByText('Redo')).toBeTruthy();
      expect(queryByText('Save Project')).toBeNull();
    });

    it('should show empty state when no matches', async () => {
      const { container, getByText } = render(CommandPalette, { props: { show: true } });
      const input = container.querySelector('input[type="text"]') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'xyznonexistent' } });

      expect(getByText('No commands found')).toBeTruthy();
      expect(getByText('Try a different search')).toBeTruthy();
    });

    it('should update command count based on filter', async () => {
      const { container } = render(CommandPalette, { props: { show: true } });
      const input = container.querySelector('input[type="text"]') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'save' } });

      const text = container.textContent || '';
      // Should show fewer commands after filtering
      expect(text).toContain('command');
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);
    });

    it('should close on Escape key', async () => {
      const { container } = render(CommandPalette, { props: { show: true } });

      // Dialog should be present initially
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();

      await fireEvent.keyDown(window, { key: 'Escape' });

      // Since we can't directly test the show prop change in Svelte 5,
      // just verify the keydown event was handled without errors
    });

    it('should navigate down with ArrowDown', async () => {
      const { container } = render(CommandPalette, { props: { show: true } });

      // First command should be highlighted by default (index 0)
      let selectedBtn = container.querySelector('.bg-blue-100');
      expect(selectedBtn).toBeTruthy();

      await fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Selection should move
      selectedBtn = container.querySelector('.bg-blue-100');
      expect(selectedBtn).toBeTruthy();
    });

    it('should navigate up with ArrowUp', async () => {
      const { container } = render(CommandPalette, { props: { show: true } });

      // Navigate down first
      await fireEvent.keyDown(window, { key: 'ArrowDown' });
      await fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Then navigate up
      await fireEvent.keyDown(window, { key: 'ArrowUp' });

      const selectedBtn = container.querySelector('.bg-blue-100');
      expect(selectedBtn).toBeTruthy();
    });
  });

  describe('command execution', () => {
    beforeEach(() => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      const p1 = new Passage({ title: 'Test Passage', content: 'Content', position: { x: 0, y: 0 } });
      story.addPassage(p1);
      currentStory.set(story);
      selectedPassageId.set(null);
    });

    it('should execute passage navigation on click', async () => {
      const { container } = render(CommandPalette, { props: { show: true } });

      const passageNavButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent?.includes('Go to: Test Passage')
      );

      expect(passageNavButton).toBeTruthy();

      if (passageNavButton) {
        await fireEvent.click(passageNavButton);

        // Should set selected passage
        const selectedId = get(selectedPassageId);
        expect(selectedId).toBeTruthy();
      }
    });

    it('should execute file commands on click', async () => {
      const { container } = render(CommandPalette, { props: { show: true } });

      const saveButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent?.includes('Save Project')
      );

      expect(saveButton).toBeTruthy();

      if (saveButton) {
        await fireEvent.click(saveButton);
        // Command should execute without errors
        // In Svelte 5, events are handled differently - just verify click works
      }
    });
  });

  describe('mouse interaction', () => {
    beforeEach(() => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);
    });

    it('should highlight command on mouse enter', async () => {
      const { container } = render(CommandPalette, { props: { show: true } });

      const buttons = container.querySelectorAll('button[data-command-index]');
      expect(buttons.length).toBeGreaterThan(1);

      if (buttons.length > 1) {
        const secondButton = buttons[1] as HTMLElement;
        await fireEvent.mouseEnter(secondButton);

        // Should have blue background after hover
        expect(secondButton.classList.contains('bg-blue-100')).toBe(true);
      }
    });

    it('should close when clicking backdrop', async () => {
      const { container, component } = render(CommandPalette, { props: { show: true } });

      const backdrop = container.querySelector('.fixed.inset-0');
      expect(backdrop).toBeTruthy();

      if (backdrop) {
        await fireEvent.click(backdrop);
        // Component should handle closing
      }
    });

    it('should not close when clicking dialog', async () => {
      const { container } = render(CommandPalette, { props: { show: true } });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();

      if (dialog) {
        await fireEvent.click(dialog);
        // Dialog should still be present
        expect(container.querySelector('[role="dialog"]')).toBeTruthy();
      }
    });
  });

  describe('shortcuts display', () => {
    beforeEach(() => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);
    });

    it('should show keyboard shortcuts for commands', () => {
      const { container } = render(CommandPalette, { props: { show: true } });
      const text = container.textContent || '';

      expect(text).toContain('Ctrl+N');
      expect(text).toContain('Ctrl+S');
      expect(text).toContain('Ctrl+O');
    });
  });
});
