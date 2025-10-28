import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import ScriptEditor from './ScriptEditor.svelte';
import { currentStory } from '../../stores/projectStore';
import { Story } from '../../models/Story';

describe('ScriptEditor', () => {
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

    story.scripts = [
      '-- Script 1\nlocal x = 10',
      '-- Script 2\nfunction test() end',
    ];

    currentStory.set(story);
  });

  afterEach(() => {
    currentStory.set(null);
  });

  describe('rendering', () => {
    it('should render script list', () => {
      const { container } = render(ScriptEditor);

      const scriptItems = container.querySelectorAll('.script-item .script-name');
      const scriptNames = Array.from(scriptItems).map(el => el.textContent?.trim());
      expect(scriptNames).toContain('Script 1');
      expect(scriptNames).toContain('Script 2');
    });

    it('should show empty state when no scripts', () => {
      story.scripts = [];
      currentStory.set(story);

      const { getByText } = render(ScriptEditor);
      expect(getByText('No Scripts')).toBeTruthy();
    });

    it('should display active script code', () => {
      const { container } = render(ScriptEditor);

      const editor = container.querySelector('.code-editor') as HTMLTextAreaElement;
      expect(editor.value).toContain('-- Script 1');
    });

    it('should display Lua badge', () => {
      const { container } = render(ScriptEditor);

      expect(container.textContent).toContain('Lua');
    });
  });

  describe('adding scripts', () => {
    it('should add new script when clicking add button', async () => {
      const { container } = render(ScriptEditor);

      const addButton = container.querySelector('.btn-add') as HTMLButtonElement;
      await fireEvent.click(addButton);

      const items = container.querySelectorAll('.script-item');
      expect(items.length).toBe(3);
    });

    it('should add default Lua template for new scripts', async () => {
      const { container } = render(ScriptEditor);

      const addButton = container.querySelector('.btn-add') as HTMLButtonElement;
      await fireEvent.click(addButton);

      // Switch to the new script
      const items = container.querySelectorAll('.script-item');
      await fireEvent.click(items[items.length - 1]);

      const editor = container.querySelector('.code-editor') as HTMLTextAreaElement;
      expect(editor.value).toContain('-- New Script');
    });
  });

  describe('editing scripts', () => {
    it('should mark as modified when code changes', async () => {
      const { container } = render(ScriptEditor);

      const editor = container.querySelector('.code-editor') as HTMLTextAreaElement;
      await fireEvent.input(editor, { target: { value: 'new code' } });

      expect(container.textContent).toContain('Modified');
    });

    it('should save changes when save button clicked', async () => {
      const { container } = render(ScriptEditor);

      const editor = container.querySelector('.code-editor') as HTMLTextAreaElement;
      await fireEvent.input(editor, { target: { value: 'new code' } });

      const saveButton = container.querySelector('.btn-primary') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Saved');
      });
    });

    it('should revert changes when revert button clicked', async () => {
      const { container } = render(ScriptEditor);

      const originalCode = story.scripts[0];
      const editor = container.querySelector('.code-editor') as HTMLTextAreaElement;
      await fireEvent.input(editor, { target: { value: 'new code' } });

      const revertButton = container.querySelector('.btn-secondary') as HTMLButtonElement;
      await fireEvent.click(revertButton);

      expect(editor.value).toBe(originalCode);
    });
  });

  describe('deleting scripts', () => {
    it('should show confirmation before deleting', async () => {
      window.confirm = () => false; // User cancels

      const { container } = render(ScriptEditor);

      const deleteButton = container.querySelector('.btn-delete-small') as HTMLButtonElement;
      await fireEvent.click(deleteButton);

      const items = container.querySelectorAll('.script-item');
      expect(items.length).toBe(2); // Not deleted
    });

    it('should delete script when confirmed', async () => {
      window.confirm = () => true; // User confirms

      const { container } = render(ScriptEditor);

      const deleteButton = container.querySelector('.btn-delete-small') as HTMLButtonElement;
      await fireEvent.click(deleteButton);

      const items = container.querySelectorAll('.script-item');
      expect(items.length).toBe(1); // Deleted
    });
  });

  describe('snippets', () => {
    it('should display Lua snippet buttons', () => {
      const { getByText } = render(ScriptEditor);

      expect(getByText('Variable Declaration')).toBeTruthy();
      expect(getByText('Function')).toBeTruthy();
      expect(getByText('Conditional')).toBeTruthy();
      expect(getByText('For Loop')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should switch between scripts', async () => {
      const { container } = render(ScriptEditor);

      const items = container.querySelectorAll('.script-item');
      await fireEvent.click(items[1]);

      const editor = container.querySelector('.code-editor') as HTMLTextAreaElement;
      expect(editor.value).toContain('-- Script 2');
    });
  });

  describe('statistics', () => {
    it('should display line count', () => {
      const { container } = render(ScriptEditor);

      const lineCount = story.scripts[0].split('\n').length;
      expect(container.textContent).toContain(`${lineCount} lines`);
    });

    it('should display character count', () => {
      const { container} = render(ScriptEditor);

      const charCount = story.scripts[0].length;
      expect(container.textContent).toContain(`${charCount} characters`);
    });
  });
});
