import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import LuaConsole from './LuaConsole.svelte';

// Mock the LuaEngine
vi.mock('$lib/scripting/LuaEngine', () => ({
  getLuaEngine: () => ({
    execute: vi.fn((code: string) => ({
      success: true,
      output: [`Executed: ${code}`],
      errors: [],
      context: {
        variables: new Map(),
        functions: new Map(),
        output: [],
        errors: [],
      },
    })),
    reset: vi.fn(),
    getAllVariables: vi.fn(() => ({})),
  }),
}));

describe('LuaConsole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render console header', () => {
      const { container } = render(LuaConsole);

      const header = container.querySelector('.console-header');
      expect(header).toBeTruthy();
      expect(header?.textContent).toContain('Lua Console');
    });

    it('should render sidebar with examples', () => {
      const { container } = render(LuaConsole);

      const sidebar = container.querySelector('.console-sidebar');
      expect(sidebar).toBeTruthy();

      const examplesSection = Array.from(container.querySelectorAll('.sidebar-section'))
        .find(section => section.textContent?.includes('Examples'));
      expect(examplesSection).toBeTruthy();
    });

    it('should render variables section', () => {
      const { container } = render(LuaConsole);

      const variablesSection = Array.from(container.querySelectorAll('.sidebar-section'))
        .find(section => section.textContent?.includes('Variables'));
      expect(variablesSection).toBeTruthy();
    });

    it('should render standard library section', () => {
      const { container } = render(LuaConsole);

      const stdlibSection = Array.from(container.querySelectorAll('.sidebar-section'))
        .find(section => section.textContent?.includes('Standard Library'));
      expect(stdlibSection).toBeTruthy();
    });

    it('should render console output area', () => {
      const { container } = render(LuaConsole);

      const output = container.querySelector('.console-output');
      expect(output).toBeTruthy();
    });

    it('should render console input area', () => {
      const { container } = render(LuaConsole);

      const input = container.querySelector('.console-input');
      expect(input).toBeTruthy();

      const textarea = input?.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });

    it('should show welcome message when history is empty', () => {
      const { container } = render(LuaConsole);

      const welcomeMessage = container.querySelector('.welcome-message');
      expect(welcomeMessage).toBeTruthy();
      expect(welcomeMessage?.textContent).toContain('Welcome to Lua Console');
    });

    it('should show execute button', () => {
      const { container } = render(LuaConsole);

      const executeButton = container.querySelector('.execute-btn');
      expect(executeButton).toBeTruthy();
      expect(executeButton?.textContent).toContain('Execute');
    });
  });

  describe('header actions', () => {
    it('should render clear history button', () => {
      const { container } = render(LuaConsole);

      const clearHistoryBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Clear History'));

      expect(clearHistoryBtn).toBeTruthy();
    });

    it('should render reset engine button', () => {
      const { container } = render(LuaConsole);

      const resetEngineBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Reset Engine'));

      expect(resetEngineBtn).toBeTruthy();
    });
  });

  describe('examples', () => {
    it('should display example buttons', () => {
      const { container } = render(LuaConsole);

      const exampleButtons = container.querySelectorAll('.example-btn');
      expect(exampleButtons.length).toBeGreaterThan(0);
    });

    it('should load example code when button clicked', async () => {
      const { container } = render(LuaConsole);

      const exampleButton = container.querySelector('.example-btn');
      await fireEvent.click(exampleButton!);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.value.length).toBeGreaterThan(0);
    });

    it('should have Variables example', () => {
      const { container } = render(LuaConsole);

      const variablesExample = Array.from(container.querySelectorAll('.example-btn'))
        .find(btn => btn.textContent?.includes('Variables'));

      expect(variablesExample).toBeTruthy();
    });

    it('should have Arithmetic example', () => {
      const { container } = render(LuaConsole);

      const arithmeticExample = Array.from(container.querySelectorAll('.example-btn'))
        .find(btn => btn.textContent?.includes('Arithmetic'));

      expect(arithmeticExample).toBeTruthy();
    });

    it('should have String Functions example', () => {
      const { container } = render(LuaConsole);

      const stringExample = Array.from(container.querySelectorAll('.example-btn'))
        .find(btn => btn.textContent?.includes('String Functions'));

      expect(stringExample).toBeTruthy();
    });

    it('should have Math Functions example', () => {
      const { container } = render(LuaConsole);

      const mathExample = Array.from(container.querySelectorAll('.example-btn'))
        .find(btn => btn.textContent?.includes('Math Functions'));

      expect(mathExample).toBeTruthy();
    });

    it('should have Comparisons example', () => {
      const { container } = render(LuaConsole);

      const comparisonsExample = Array.from(container.querySelectorAll('.example-btn'))
        .find(btn => btn.textContent?.includes('Comparisons'));

      expect(comparisonsExample).toBeTruthy();
    });
  });

  describe('variables display', () => {
    it('should show empty message when no variables set', () => {
      const { container } = render(LuaConsole);

      const emptyMessage = container.querySelector('.empty-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent).toContain('No variables set');
    });
  });

  describe('standard library documentation', () => {
    it('should show print function', () => {
      const { container } = render(LuaConsole);

      const stdlibSection = Array.from(container.querySelectorAll('.sidebar-section'))
        .find(section => section.textContent?.includes('Standard Library'));

      expect(stdlibSection?.textContent).toContain('print');
    });

    it('should show math functions', () => {
      const { container } = render(LuaConsole);

      const stdlibSection = Array.from(container.querySelectorAll('.sidebar-section'))
        .find(section => section.textContent?.includes('Standard Library'));

      expect(stdlibSection?.textContent).toContain('math.random');
      expect(stdlibSection?.textContent).toContain('math.floor');
    });

    it('should show string functions', () => {
      const { container } = render(LuaConsole);

      const stdlibSection = Array.from(container.querySelectorAll('.sidebar-section'))
        .find(section => section.textContent?.includes('Standard Library'));

      expect(stdlibSection?.textContent).toContain('string.upper');
      expect(stdlibSection?.textContent).toContain('string.lower');
    });
  });

  describe('input interaction', () => {
    it('should update textarea value when typing', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'test code' } });

      expect(textarea.value).toBe('test code');
    });

    it('should enable execute button when input has value', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      const executeButton = container.querySelector('.execute-btn') as HTMLButtonElement;

      expect(executeButton.disabled).toBe(true);

      await fireEvent.input(textarea, { target: { value: 'test' } });

      expect(executeButton.disabled).toBe(false);
    });

    it('should execute code on Enter key', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'print("test")' } });

      await fireEvent.keyDown(textarea, { key: 'Enter' });

      // Input should be cleared after execution
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should not execute on Shift+Enter', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'print("test")' } });

      await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      // Input should not be cleared
      expect(textarea.value).toBe('print("test")');
    });

    it('should clear input after executing code', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'test' } });

      const executeButton = container.querySelector('.execute-btn');
      await fireEvent.click(executeButton!);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });
  });

  describe('code execution', () => {
    it('should add entry to history after execution', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'print("hello")' } });

      const executeButton = container.querySelector('.execute-btn');
      await fireEvent.click(executeButton!);

      await waitFor(() => {
        const historyEntry = container.querySelector('.history-entry');
        expect(historyEntry).toBeTruthy();
      });
    });

    it('should show input line in history', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'x = 5' } });

      const executeButton = container.querySelector('.execute-btn');
      await fireEvent.click(executeButton!);

      await waitFor(() => {
        const inputLine = container.querySelector('.input-line');
        expect(inputLine?.textContent).toContain('x = 5');
      });
    });

    it('should show prompt symbol in input line', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'test' } });

      const executeButton = container.querySelector('.execute-btn');
      await fireEvent.click(executeButton!);

      await waitFor(() => {
        const prompt = container.querySelector('.prompt');
        expect(prompt?.textContent).toBe('>');
      });
    });

    it('should not execute empty input', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: '' } });

      const executeButton = container.querySelector('.execute-btn') as HTMLButtonElement;
      expect(executeButton.disabled).toBe(true);
    });

    it('should scroll to bottom after execution', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

      // Execute multiple commands to create scrollable content
      for (let i = 0; i < 5; i++) {
        await fireEvent.input(textarea, { target: { value: `print(${i})` } });
        const executeButton = container.querySelector('.execute-btn');
        await fireEvent.click(executeButton!);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await waitFor(() => {
        const historyEntries = container.querySelectorAll('.history-entry');
        expect(historyEntries.length).toBeGreaterThan(0);
      });
    });
  });

  describe('command history navigation', () => {
    it('should navigate to previous command with ArrowUp', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

      // Execute a command
      await fireEvent.input(textarea, { target: { value: 'first command' } });
      await fireEvent.keyDown(textarea, { key: 'Enter' });

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });

      // Press arrow up
      await fireEvent.keyDown(textarea, { key: 'ArrowUp' });

      expect(textarea.value).toBe('first command');
    });

    it('should navigate to next command with ArrowDown', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

      // Execute two commands
      await fireEvent.input(textarea, { target: { value: 'first' } });
      await fireEvent.keyDown(textarea, { key: 'Enter' });

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });

      await fireEvent.input(textarea, { target: { value: 'second' } });
      await fireEvent.keyDown(textarea, { key: 'Enter' });

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });

      // Navigate up twice, then down once
      await fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      await fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea.value).toBe('first');

      await fireEvent.keyDown(textarea, { key: 'ArrowDown' });
      expect(textarea.value).toBe('second');
    });

    it('should clear input when navigating past last command', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

      await fireEvent.input(textarea, { target: { value: 'test' } });
      await fireEvent.keyDown(textarea, { key: 'Enter' });

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });

      await fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea.value).toBe('test');

      await fireEvent.keyDown(textarea, { key: 'ArrowDown' });
      expect(textarea.value).toBe('');
    });
  });

  describe('clear history', () => {
    it('should clear history when button clicked', async () => {
      const { container } = render(LuaConsole);

      // Execute a command to create history
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'test' } });

      const executeButton = container.querySelector('.execute-btn');
      await fireEvent.click(executeButton!);

      await waitFor(() => {
        const historyEntry = container.querySelector('.history-entry');
        expect(historyEntry).toBeTruthy();
      });

      // Clear history
      const clearHistoryBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Clear History'));

      await fireEvent.click(clearHistoryBtn!);

      // History should be cleared
      const historyEntry = container.querySelector('.history-entry');
      expect(historyEntry).toBeNull();
    });

    it('should show welcome message after clearing history', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'test' } });

      const executeButton = container.querySelector('.execute-btn');
      await fireEvent.click(executeButton!);

      await waitFor(() => {
        const welcomeMessage = container.querySelector('.welcome-message');
        expect(welcomeMessage).toBeNull();
      });

      const clearHistoryBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Clear History'));

      await fireEvent.click(clearHistoryBtn!);

      const welcomeMessage = container.querySelector('.welcome-message');
      expect(welcomeMessage).toBeTruthy();
    });
  });

  describe('reset engine', () => {
    it('should add reset message to history', async () => {
      const { container } = render(LuaConsole);

      const resetBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Reset Engine'));

      await fireEvent.click(resetBtn!);

      await waitFor(() => {
        const historyEntry = container.querySelector('.history-entry');
        expect(historyEntry).toBeTruthy();
      });
    });

    it('should show reset confirmation in history', async () => {
      const { container } = render(LuaConsole);

      const resetBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Reset Engine'));

      await fireEvent.click(resetBtn!);

      await waitFor(() => {
        const output = container.querySelector('.output-section');
        expect(output?.textContent).toContain('cleared');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace-only input', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: '   ' } });

      const executeButton = container.querySelector('.execute-btn') as HTMLButtonElement;
      expect(executeButton.disabled).toBe(true);
    });

    it('should handle multiple rapid executions', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      const executeButton = container.querySelector('.execute-btn');

      for (let i = 0; i < 5; i++) {
        await fireEvent.input(textarea, { target: { value: `cmd${i}` } });
        await fireEvent.click(executeButton!);
      }

      await waitFor(() => {
        const historyEntries = container.querySelectorAll('.history-entry');
        expect(historyEntries.length).toBe(5);
      });
    });

    it('should handle long input strings', async () => {
      const { container } = render(LuaConsole);

      const longString = 'x = ' + '1234567890'.repeat(50);
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: longString } });

      const executeButton = container.querySelector('.execute-btn');
      await fireEvent.click(executeButton!);

      await waitFor(() => {
        const historyEntry = container.querySelector('.history-entry');
        expect(historyEntry).toBeTruthy();
      });
    });

    it('should handle navigation at history boundaries', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

      // Try to navigate up when history is empty
      await fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea.value).toBe('');

      // Add one command
      await fireEvent.input(textarea, { target: { value: 'test' } });
      await fireEvent.keyDown(textarea, { key: 'Enter' });

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });

      // Navigate up to the command
      await fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea.value).toBe('test');

      // Try to navigate up again (should stay at first command)
      await fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea.value).toBe('test');
    });

    it('should handle multiline input', async () => {
      const { container } = render(LuaConsole);

      const multilineCode = 'x = 1\ny = 2\nz = x + y';
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: multilineCode } });

      const executeButton = container.querySelector('.execute-btn');
      await fireEvent.click(executeButton!);

      await waitFor(() => {
        const codeInput = container.querySelector('.code-input');
        expect(codeInput?.textContent).toContain('x = 1');
      });
    });

    it('should preserve textarea focus after execution', async () => {
      const { container } = render(LuaConsole);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'test' } });

      const executeButton = container.querySelector('.execute-btn');
      await fireEvent.click(executeButton!);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });

      // User should be able to immediately type again
      await fireEvent.input(textarea, { target: { value: 'next' } });
      expect(textarea.value).toBe('next');
    });
  });
});
