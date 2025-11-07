import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import ScriptEditor from './ScriptEditor.svelte';
import { currentStory } from '../../stores/projectStore';
import { Story } from '@whisker/core-ts';

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

    it('should display Monaco editor container', () => {
      const { container } = render(ScriptEditor);

      const editorContainer = container.querySelector('.monaco-container');
      expect(editorContainer).toBeTruthy();
    });

    it('should display Lua badge', () => {
      const { container } = render(ScriptEditor);

      expect(container.textContent).toContain('Lua');
    });
  });

  describe('adding scripts', () => {
    it('should add new script when clicking add button', async () => {
      const { container } = render(ScriptEditor);

      const initialCount = story.scripts.length;
      const addButton = container.querySelector('.btn-add') as HTMLButtonElement;
      await fireEvent.click(addButton);

      // Check the underlying story state
      expect(story.scripts.length).toBe(initialCount + 1);
    });

    it('should add new script to story', async () => {
      const { container } = render(ScriptEditor);

      const initialCount = story.scripts.length;
      const addButton = container.querySelector('.btn-add') as HTMLButtonElement;
      await fireEvent.click(addButton);

      // Check the underlying story state
      expect(story.scripts.length).toBe(initialCount + 1);
    });
  });

  describe('editing scripts', () => {
    it('should show saved indicator by default', async () => {
      const { container } = render(ScriptEditor);

      await waitFor(() => {
        expect(container.textContent).toContain('Saved');
      });
    });

    it('should have Monaco editor for editing', async () => {
      const { container } = render(ScriptEditor);

      const monacoContainer = container.querySelector('.monaco-container');
      expect(monacoContainer).toBeTruthy();
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

      const initialCount = story.scripts.length;
      const deleteButton = container.querySelector('.btn-delete-small') as HTMLButtonElement;
      await fireEvent.click(deleteButton);

      // Check the underlying story state
      expect(story.scripts.length).toBe(initialCount - 1);
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

      await waitFor(() => {
        // Check that the script title updated
        expect(container.textContent).toContain('Script 2');
      });
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

  describe('script execution', () => {
    it('should display run script button', () => {
      const { container } = render(ScriptEditor);

      const runButton = container.querySelector('.btn-run');
      expect(runButton).toBeTruthy();
      expect(runButton?.textContent).toContain('Run Script');
    });

    it('should execute script when run button clicked', async () => {
      const { container } = render(ScriptEditor);

      // Update the script to something executable
      story.scripts[0] = 'return 42';
      currentStory.set(story);

      await waitFor(() => {
        const runButton = container.querySelector('.btn-run') as HTMLButtonElement;
        expect(runButton).toBeTruthy();
      });

      const runButton = container.querySelector('.btn-run') as HTMLButtonElement;
      await fireEvent.click(runButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Execution Successful');
      });
    });

    it('should display execution results', async () => {
      // Set up story with print script BEFORE rendering
      story.scripts = ['print("Hello from Lua")'];
      currentStory.set(story);

      const { container } = render(ScriptEditor);

      await waitFor(() => {
        const runButton = container.querySelector('.btn-run') as HTMLButtonElement;
        expect(runButton).toBeTruthy();
      });

      const runButton = container.querySelector('.btn-run') as HTMLButtonElement;
      await fireEvent.click(runButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Execution Successful');
        expect(container.textContent).toContain('Output:');
      }, { timeout: 2000 });
    });

    it('should display error for invalid script', async () => {
      // Set up story with invalid script BEFORE rendering
      story.scripts = ['invalid lua syntax }{'];
      currentStory.set(story);

      const { container } = render(ScriptEditor);

      await waitFor(() => {
        const runButton = container.querySelector('.btn-run') as HTMLButtonElement;
        expect(runButton).toBeTruthy();
      });

      const runButton = container.querySelector('.btn-run') as HTMLButtonElement;
      await fireEvent.click(runButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Execution Failed');
        expect(container.textContent).toContain('Error:');
      }, { timeout: 2000 });
    });

    it('should close execution results', async () => {
      const { container } = render(ScriptEditor);

      // Run a script first
      story.scripts[0] = 'return 42';
      currentStory.set(story);

      await waitFor(() => {
        const runButton = container.querySelector('.btn-run') as HTMLButtonElement;
        expect(runButton).toBeTruthy();
      });

      const runButton = container.querySelector('.btn-run') as HTMLButtonElement;
      await fireEvent.click(runButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Execution Successful');
      });

      const closeButton = container.querySelector('.btn-close-results') as HTMLButtonElement;
      await fireEvent.click(closeButton);

      await waitFor(() => {
        expect(container.textContent).not.toContain('Execution Successful');
      });
    });
  });
});
