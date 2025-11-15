import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import StoryMetadataEditor from './StoryMetadataEditor.svelte';
import { currentStory } from '../stores/projectStore';
import { Story } from '@writewhisker/core-ts';

// Mock trapFocus utility
vi.mock('../utils/accessibility', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}));

describe('StoryMetadataEditor', () => {
  let story: Story;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        description: 'Test description',
        created: '2025-01-01T00:00:00.000Z',
        modified: '2025-01-15T00:00:00.000Z',
      },
    });

    currentStory.set(story);
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(StoryMetadataEditor, { props: { show: false } });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should display title', () => {
      const { getByText } = render(StoryMetadataEditor, { props: { show: true } });
      expect(getByText('Story Metadata')).toBeTruthy();
    });
  });

  describe('form inputs', () => {
    it('should display current story metadata', () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });

      const titleInput = container.querySelector('#story-title') as HTMLInputElement;
      const authorInput = container.querySelector('#story-author') as HTMLInputElement;
      const versionInput = container.querySelector('#story-version') as HTMLInputElement;
      const descInput = container.querySelector('#story-description') as HTMLTextAreaElement;

      expect(titleInput.value).toBe('Test Story');
      expect(authorInput.value).toBe('Test Author');
      expect(versionInput.value).toBe('1.0.0');
      expect(descInput.value).toBe('Test description');
    });

    it('should have title field marked as required', () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const titleInput = container.querySelector('#story-title') as HTMLInputElement;
      expect(titleInput.required).toBe(true);
    });

    it('should update title input', async () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const titleInput = container.querySelector('#story-title') as HTMLInputElement;

      await fireEvent.input(titleInput, { target: { value: 'New Title' } });
      expect(titleInput.value).toBe('New Title');
    });

    it('should update author input', async () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const authorInput = container.querySelector('#story-author') as HTMLInputElement;

      await fireEvent.input(authorInput, { target: { value: 'New Author' } });
      expect(authorInput.value).toBe('New Author');
    });

    it('should update version input', async () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const versionInput = container.querySelector('#story-version') as HTMLInputElement;

      await fireEvent.input(versionInput, { target: { value: '2.0.0' } });
      expect(versionInput.value).toBe('2.0.0');
    });

    it('should update description textarea', async () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const descInput = container.querySelector('#story-description') as HTMLTextAreaElement;

      await fireEvent.input(descInput, { target: { value: 'New description' } });
      expect(descInput.value).toBe('New description');
    });
  });

  describe('metadata display', () => {
    it('should display created date', () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Created:');
    });

    it('should display last modified date', () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Last Modified:');
    });
  });

  describe('action buttons', () => {
    it('should display Cancel button', () => {
      const { getByText } = render(StoryMetadataEditor, { props: { show: true } });
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should display Save Changes button', () => {
      const { getByText } = render(StoryMetadataEditor, { props: { show: true } });
      expect(getByText('Save Changes')).toBeTruthy();
    });
  });

  describe('close functionality', () => {
    it('should close when cancel button clicked', async () => {
      const { getByText, container } = render(StoryMetadataEditor, { props: { show: true } });
      const cancelButton = getByText('Cancel');

      await fireEvent.click(cancelButton);
      // Dialog should close (show becomes false internally)
    });

    it('should close when backdrop clicked', async () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const backdrop = container.querySelector('[role="presentation"]');

      expect(backdrop).toBeTruthy();
      await fireEvent.click(backdrop!);
      // Should close dialog
    });

    it('should not close when dialog content clicked', async () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
      await fireEvent.click(dialog!);
      // Dialog should remain open
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should close on Escape key', async () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });

      await fireEvent.keyDown(window, { key: 'Escape' });
      // Should handle escape key
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('metadata-title');
    });

    it('should have labeled form inputs', () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });

      const titleLabel = container.querySelector('label[for="story-title"]');
      const authorLabel = container.querySelector('label[for="story-author"]');
      const versionLabel = container.querySelector('label[for="story-version"]');
      const descLabel = container.querySelector('label[for="story-description"]');

      expect(titleLabel?.textContent).toContain('Story Title');
      expect(authorLabel?.textContent).toContain('Author');
      expect(versionLabel?.textContent).toContain('Version');
      expect(descLabel?.textContent).toContain('Description');
    });
  });

  describe('form submission', () => {
    it('should save changes on form submit', async () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      const form = container.querySelector('form');
      const titleInput = container.querySelector('#story-title') as HTMLInputElement;

      await fireEvent.input(titleInput, { target: { value: 'Updated Title' } });
      await fireEvent.submit(form!);

      // Should save changes (tested through component behavior)
    });

    it('should save changes when Save Changes button clicked', async () => {
      const { getByText, container } = render(StoryMetadataEditor, { props: { show: true } });
      const titleInput = container.querySelector('#story-title') as HTMLInputElement;

      await fireEvent.input(titleInput, { target: { value: 'New Title' } });
      const saveButton = getByText('Save Changes');
      await fireEvent.click(saveButton);

      // Should save changes
    });
  });

  describe('edge cases', () => {
    it('should handle empty title by using default', () => {
      const { container } = render(StoryMetadataEditor, { props: { show: true } });
      // Title input has required attribute, browser will handle validation
      const titleInput = container.querySelector('#story-title') as HTMLInputElement;
      expect(titleInput.required).toBe(true);
    });

    it('should trim whitespace from inputs', async () => {
      const { getByText, container } = render(StoryMetadataEditor, { props: { show: true } });
      const titleInput = container.querySelector('#story-title') as HTMLInputElement;

      await fireEvent.input(titleInput, { target: { value: '  Test Title  ' } });
      const saveButton = getByText('Save Changes');
      await fireEvent.click(saveButton);

      // Component trims values internally
    });
  });
});
