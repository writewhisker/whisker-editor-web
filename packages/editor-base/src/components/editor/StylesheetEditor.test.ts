import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import StylesheetEditor from './StylesheetEditor.svelte';
import { currentStory } from '../../stores';
import { Story } from '@whisker/core-ts';

describe('StylesheetEditor', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    story.stylesheets = [
      '/* Stylesheet 1 */\n.passage { color: red; }',
      '/* Stylesheet 2 */\n.choice { color: blue; }',
    ];

    currentStory.set(story);
  });

  afterEach(() => {
    currentStory.set(null);
  });

  describe('rendering', () => {
    it('should render stylesheet list', () => {
      const { container } = render(StylesheetEditor);

      const stylesheetItems = container.querySelectorAll('.stylesheet-item .stylesheet-name');
      const stylesheetNames = Array.from(stylesheetItems).map(el => el.textContent?.trim());
      expect(stylesheetNames).toContain('Stylesheet 1');
      expect(stylesheetNames).toContain('Stylesheet 2');
    });

    it('should show empty state when no stylesheets', () => {
      story.stylesheets = [];
      currentStory.set(story);

      const { getByText } = render(StylesheetEditor);
      expect(getByText('No Stylesheets')).toBeTruthy();
    });

    it('should display active stylesheet code', () => {
      const { container } = render(StylesheetEditor);

      const editor = container.querySelector('.code-editor') as HTMLTextAreaElement;
      expect(editor.value).toContain('/* Stylesheet 1 */');
    });
  });

  describe('adding stylesheets', () => {
    it('should add new stylesheet when clicking add button', async () => {
      const { container } = render(StylesheetEditor);

      const addButton = container.querySelector('.btn-add') as HTMLButtonElement;
      await fireEvent.click(addButton);

      const items = container.querySelectorAll('.stylesheet-item');
      expect(items.length).toBe(3);
    });
  });

  describe('editing stylesheets', () => {
    it('should mark as modified when code changes', async () => {
      const { container } = render(StylesheetEditor);

      const editor = container.querySelector('.code-editor') as HTMLTextAreaElement;
      await fireEvent.input(editor, { target: { value: 'new code' } });

      expect(container.textContent).toContain('Modified');
    });

    it('should save changes when save button clicked', async () => {
      const { container } = render(StylesheetEditor);

      const editor = container.querySelector('.code-editor') as HTMLTextAreaElement;
      await fireEvent.input(editor, { target: { value: 'new code' } });

      const saveButton = container.querySelector('.btn-primary') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Saved');
      });
    });
  });

  describe('deleting stylesheets', () => {
    it('should show confirmation before deleting', async () => {
      window.confirm = () => false; // User cancels

      const { container } = render(StylesheetEditor);

      const deleteButton = container.querySelector('.btn-delete-small') as HTMLButtonElement;
      await fireEvent.click(deleteButton);

      const items = container.querySelectorAll('.stylesheet-item');
      expect(items.length).toBe(2); // Not deleted
    });
  });

  describe('snippets', () => {
    it('should display snippet buttons', () => {
      const { getByText } = render(StylesheetEditor);

      expect(getByText('Passage Style')).toBeTruthy();
      expect(getByText('Choice Style')).toBeTruthy();
      expect(getByText('Dark Theme')).toBeTruthy();
    });
  });

  describe('statistics', () => {
    it('should display line count', () => {
      const { container } = render(StylesheetEditor);

      const lineCount = story.stylesheets[0].split('\n').length;
      expect(container.textContent).toContain(`${lineCount} lines`);
    });

    it('should display character count', () => {
      const { container } = render(StylesheetEditor);

      const charCount = story.stylesheets[0].length;
      expect(container.textContent).toContain(`${charCount} characters`);
    });
  });
});
