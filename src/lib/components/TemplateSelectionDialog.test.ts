/**
 * Tests for TemplateSelectionDialog
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TemplateSelectionDialog from './TemplateSelectionDialog.svelte';

// Mock trapFocus utility
vi.mock('../utils/accessibility', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}));

describe('TemplateSelectionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: false } });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should display dialog title', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('Choose a Template')).toBeTruthy();
    });

    it('should display dialog subtitle', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('Select a starting template for your new passage')).toBeTruthy();
    });

    it('should display Cancel button', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  describe('Template Options', () => {
    it('should render all 6 template options', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const templateButtons = container.querySelectorAll('button[type="button"]');
      // 6 templates + 1 cancel button = 7 total buttons
      expect(templateButtons.length).toBe(7);
    });

    it('should display Blank Passage template', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('Blank Passage')).toBeTruthy();
      expect(getByText('Start with an empty passage')).toBeTruthy();
    });

    it('should display Choice Passage template', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('Choice Passage')).toBeTruthy();
      expect(getByText('Present multiple choices to the player')).toBeTruthy();
    });

    it('should display Conversation template', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('Conversation')).toBeTruthy();
      expect(getByText('Dialog with NPC responses')).toBeTruthy();
    });

    it('should display Description template', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('Description')).toBeTruthy();
      expect(getByText('Describe a scene or location')).toBeTruthy();
    });

    it('should display Checkpoint template', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('Checkpoint')).toBeTruthy();
      expect(getByText('Set variables and mark story progress')).toBeTruthy();
    });

    it('should display Ending template', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('Ending')).toBeTruthy();
      expect(getByText('Conclude the story')).toBeTruthy();
    });

    it('should display template icons', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const text = container.textContent || '';

      // Check for presence of emojis
      expect(text).toContain('📄'); // Blank
      expect(text).toContain('🔀'); // Choice
      expect(text).toContain('💬'); // Conversation
      expect(text).toContain('🏞️'); // Description
      expect(text).toContain('🏁'); // Checkpoint
      expect(text).toContain('🎬'); // Ending
    });

    it('should display content preview for each template', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const previews = container.querySelectorAll('.font-mono');

      // Should have 6 preview elements (one per template)
      expect(previews.length).toBe(6);
    });

    it('should display blank template content as (empty)', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });
      expect(getByText('(empty)')).toBeTruthy();
    });

    it('should display Choice template content preview', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('What do you do?');
      expect(text).toContain('[[Option 1]]');
    });
  });

  describe('User Interactions', () => {
    it('should have clickable template buttons', async () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });

      const blankButton = getByText('Blank Passage').closest('button');
      expect(blankButton).toBeTruthy();

      if (blankButton) {
        await fireEvent.click(blankButton);
        // Button should be clickable without errors
      }
    });

    it('should have clickable Cancel button', async () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });

      const cancelButton = getByText('Cancel');
      expect(cancelButton).toBeTruthy();

      await fireEvent.click(cancelButton);
      // Button should be clickable without errors
    });

    it('should allow clicking on backdrop', async () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });

      const backdrop = container.querySelector('.fixed.inset-0');
      expect(backdrop).toBeTruthy();

      if (backdrop) {
        await fireEvent.click(backdrop);
        // Should not throw error
      }
    });

    it('should allow clicking dialog content without closing', async () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();

      if (dialog) {
        await fireEvent.click(dialog);
        // Dialog should still be present
        expect(container.querySelector('[role="dialog"]')).toBeTruthy();
      }
    });
  });

  describe('Keyboard Interactions', () => {
    it('should handle Escape key without errors', async () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();

      await fireEvent.keyDown(window, { key: 'Escape' });
      // Should handle without errors
    });

    it('should handle other keys without errors', async () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });

      await fireEvent.keyDown(window, { key: 'Enter' });
      await fireEvent.keyDown(window, { key: 'Space' });
      await fireEvent.keyDown(window, { key: 'Tab' });

      // Dialog should remain visible - keyboard handlers don't close on these keys
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
    });

    it('should have aria-modal attribute', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });

    it('should have aria-labelledby pointing to title', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog?.getAttribute('aria-labelledby')).toBe('template-title');
      expect(container.querySelector('#template-title')).toBeTruthy();
    });

    it('should have focusable tabindex', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog?.getAttribute('tabindex')).toBe('-1');
    });

    it('should have proper button types', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const buttons = container.querySelectorAll('button');

      buttons.forEach(button => {
        expect(button.getAttribute('type')).toBe('button');
      });
    });

    it('should have focus styles on template buttons', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const templateButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.textContent?.includes('Passage') || btn.textContent?.includes('Conversation')
      );

      templateButtons.forEach(button => {
        expect(button.className).toContain('focus:outline-none');
        expect(button.className).toContain('focus:ring-2');
      });
    });
  });

  describe('Layout and Styling', () => {
    it('should use grid layout for templates', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const grid = container.querySelector('.grid');

      expect(grid).toBeTruthy();
      expect(grid?.className).toContain('grid-cols-1');
      expect(grid?.className).toContain('md:grid-cols-2');
    });

    it('should have proper modal styling', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const backdrop = container.querySelector('.fixed.inset-0');

      expect(backdrop?.className).toContain('bg-black');
      expect(backdrop?.className).toContain('bg-opacity-50');
      expect(backdrop?.className).toContain('z-50');
    });

    it('should have blue header background', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const header = container.querySelector('.bg-blue-600');

      expect(header).toBeTruthy();
      expect(header?.className).toContain('text-white');
    });

    it('should limit dialog height', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog?.className).toContain('max-h-[80vh]');
    });

    it('should make content scrollable', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const content = container.querySelector('.overflow-y-auto');

      expect(content).toBeTruthy();
    });
  });

  describe('Template Content', () => {
    it('should display Checkpoint template preview', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const text = container.textContent || '';

      expect(text).toContain('<<set $chapter = 2>>');
      expect(text).toContain('Chapter 2: [Title]');
    });

    it('should display Ending template preview', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const text = container.textContent || '';

      expect(text).toContain('THE END');
      expect(text).toContain('[[Start Over->Start]]');
    });

    it('should display Description template preview', () => {
      const { container } = render(TemplateSelectionDialog, { props: { show: true } });
      const text = container.textContent || '';

      expect(text).toContain('You find yourself in a new location');
      expect(text).toContain('[[Continue]]');
    });

    it('should display all template buttons as clickable', () => {
      const { getByText } = render(TemplateSelectionDialog, { props: { show: true } });

      // All template titles should be present and clickable
      const templates = ['Blank Passage', 'Choice Passage', 'Conversation', 'Description', 'Checkpoint', 'Ending'];

      templates.forEach(templateName => {
        const button = getByText(templateName).closest('button');
        expect(button).toBeTruthy();
        expect(button?.getAttribute('type')).toBe('button');
      });
    });
  });
});
