<!--
  Monaco Editor Wrapper Component

  A professional code editor powered by Monaco (VS Code's editor).
  Supports syntax highlighting, autocomplete, and error checking.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-expect-error - monaco-editor is an optional peer dependency
  import * as monaco from 'monaco-editor';
  // @ts-expect-error - monaco-editor is an optional peer dependency
  import type { editor, IDisposable } from 'monaco-editor';

  interface Props {
    /** Initial value of the editor */
    value?: string;
    /** Programming language (e.g., 'lua', 'javascript') */
    language?: string;
    /** Editor theme ('vs-dark' | 'vs' | 'hc-black') */
    theme?: 'vs-dark' | 'vs' | 'hc-black';
    /** Read-only mode */
    readonly?: boolean;
    /** Show line numbers */
    lineNumbers?: 'on' | 'off' | 'relative';
    /** Enable minimap */
    minimap?: boolean;
    /** Font size in pixels */
    fontSize?: number;
    /** Tab size in spaces */
    tabSize?: number;
    /** Word wrap */
    wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
    /** Change event handler */
    onchange?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    language = 'lua',
    theme = 'vs-dark',
    readonly = false,
    lineNumbers = 'on',
    minimap = false,
    fontSize = 14,
    tabSize = 2,
    wordWrap = 'on',
    onchange,
  }: Props = $props();

  let containerEl: HTMLDivElement;
  let editorInstance: editor.IStandaloneCodeEditor | null = null;
  let changeListener: IDisposable | null = null;

  /**
   * Initialize Monaco Editor
   */
  onMount(() => {
    if (!containerEl) return;

    // Create editor instance
    editorInstance = monaco.editor.create(containerEl, {
      value: value || '',
      language,
      theme,
      readOnly: readonly,
      lineNumbers,
      minimap: { enabled: minimap },
      fontSize,
      tabSize,
      wordWrap,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      formatOnPaste: true,
      formatOnType: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      matchBrackets: 'always',
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoIndent: 'full',
      padding: { top: 10, bottom: 10 },
    });

    // Listen for content changes
    changeListener = editorInstance.onDidChangeModelContent(() => {
      const newValue = editorInstance?.getValue() || '';
      value = newValue;
      onchange?.(newValue);
    });

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
      editorInstance?.layout();
    });
    resizeObserver.observe(containerEl);

    return () => {
      resizeObserver.disconnect();
    };
  });

  /**
   * Update editor value when prop changes externally
   */
  $effect(() => {
    if (editorInstance) {
      const currentValue = editorInstance.getValue();
      if (value !== currentValue) {
        const position = editorInstance.getPosition();
        editorInstance.setValue(value || '');
        if (position) {
          editorInstance.setPosition(position);
        }
      }
    }
  });

  /**
   * Update language when prop changes
   */
  $effect(() => {
    if (editorInstance) {
      const model = editorInstance.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  });

  /**
   * Update theme when prop changes
   */
  $effect(() => {
    if (editorInstance) {
      monaco.editor.setTheme(theme);
    }
  });

  /**
   * Update readonly state when prop changes
   */
  $effect(() => {
    if (editorInstance) {
      editorInstance.updateOptions({ readOnly: readonly });
    }
  });

  /**
   * Cleanup on component destroy
   */
  onDestroy(() => {
    changeListener?.dispose();
    editorInstance?.dispose();
  });

  /**
   * Public API: Get current value
   */
  export function getValue(): string {
    return editorInstance?.getValue() || '';
  }

  /**
   * Public API: Set value
   */
  export function setValue(newValue: string): void {
    editorInstance?.setValue(newValue);
  }

  /**
   * Public API: Focus editor
   */
  export function focus(): void {
    editorInstance?.focus();
  }

  /**
   * Public API: Get selection
   */
  export function getSelection(): string {
    const selection = editorInstance?.getSelection();
    if (!selection) return '';
    return editorInstance?.getModel()?.getValueInRange(selection) || '';
  }

  /**
   * Public API: Insert text at cursor
   */
  export function insertText(text: string): void {
    if (!editorInstance) return;
    const selection = editorInstance.getSelection();
    if (!selection) return;

    editorInstance.executeEdits('', [
      {
        range: selection,
        text,
      },
    ]);
  }

  /**
   * Public API: Format document
   */
  export async function formatDocument(): Promise<void> {
    if (!editorInstance) return;
    await editorInstance.getAction('editor.action.formatDocument')?.run();
  }
</script>

<div class="monaco-editor-wrapper" bind:this={containerEl}></div>

<style>
  .monaco-editor-wrapper {
    width: 100%;
    height: 100%;
    min-height: 300px;
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    overflow: hidden;
  }

  :global(.monaco-editor .margin) {
    background-color: var(--bg-secondary, #1e1e1e);
  }

  :global(.monaco-editor) {
    background-color: var(--bg-primary, #1e1e1e);
  }
</style>
