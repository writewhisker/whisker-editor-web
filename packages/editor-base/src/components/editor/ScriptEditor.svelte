<script lang="ts">
  /**
   * ScriptEditor - Edit Lua scripts for the story
   */
  import { onMount } from 'svelte';
  import { currentStory } from '../../stores/storyStateStore';
  import MonacoEditor from './MonacoEditor.svelte';
  import FunctionLibraryPanel from '../scripting/FunctionLibraryPanel.svelte';
  import VisualScriptBuilder from '../scripting/VisualScriptBuilder.svelte';
  import LuaConsole from '../scripting/LuaConsole.svelte';
  import { initializeLuaSupport } from '../../scripting/luaConfig';
  import { getLuaExecutor, type LuaExecutionResult } from '../../scripting/LuaExecutor';

  let activeIndex = $state(0);
  let code = $state('');
  let hasChanges = $state(false);
  let editorRef = $state<MonacoEditor>();
  let executionResult = $state<LuaExecutionResult | null>(null);
  let isRunning = $state(false);
  let activeTab = $state<'editor' | 'library' | 'visual' | 'console'>('editor');

  let scripts = $derived($currentStory?.scripts || []);

  // Initialize on mount
  onMount(() => {
    // Initialize Lua support
    initializeLuaSupport();

    // Listen for code insertion from function library
    const handleInsertCode = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail && editorRef) {
        editorRef.insertText('\n' + customEvent.detail + '\n');
        activeTab = 'editor'; // Switch back to editor
      }
    };

    window.addEventListener('insertcode', handleInsertCode);
    return () => window.removeEventListener('insertcode', handleInsertCode);
  });

  // Update code when active script changes
  $effect(() => {
    if (scripts.length > 0 && activeIndex < scripts.length) {
      code = scripts[activeIndex];
      hasChanges = false;
    }
  });

  function addScript() {
    if (!$currentStory) return;

    const defaultLua = `-- New Script\n-- This script runs when the story starts\n\nfunction init()\n  -- Initialize variables\nend\n`;

    $currentStory.scripts.push(defaultLua);
    currentStory.set($currentStory);
    activeIndex = $currentStory.scripts.length - 1;
  }

  function deleteScript(index: number) {
    if (!$currentStory) return;

    if (confirm('Delete this script?')) {
      $currentStory.scripts.splice(index, 1);
      currentStory.set($currentStory);

      if (activeIndex >= $currentStory.scripts.length) {
        activeIndex = Math.max(0, $currentStory.scripts.length - 1);
      }
    }
  }

  function handleCodeChange(newCode: string) {
    code = newCode;
    hasChanges = true;
  }

  function saveChanges() {
    if (!$currentStory || activeIndex >= scripts.length) return;

    $currentStory.scripts[activeIndex] = code;
    currentStory.set($currentStory);
    hasChanges = false;
  }

  function revertChanges() {
    if (activeIndex < scripts.length) {
      code = scripts[activeIndex];
      hasChanges = false;
    }
  }

  function insertSnippet(snippet: string) {
    if (!editorRef) return;

    editorRef.insertText(snippet);
    editorRef.focus();
    hasChanges = true;
  }

  async function runScript() {
    if (!$currentStory || !code) return;

    isRunning = true;
    executionResult = null;

    try {
      const executor = getLuaExecutor();
      await executor.initialize();

      // Create execution context
      const context = {
        story: $currentStory,
        currentPassageId: $currentStory.startPassage || Array.from($currentStory.passages.keys())[0],
        variables: {},
        history: [],
      };

      // Execute the script
      const result = await executor.execute(code, context);
      executionResult = result;
    } catch (error) {
      executionResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        output: [],
      };
    } finally {
      isRunning = false;
    }
  }

  const snippets = [
    {
      name: 'Variable Declaration',
      code: `local myVariable = 0`
    },
    {
      name: 'Function',
      code: `function myFunction(param)
  -- Function body
  return result
end`
    },
    {
      name: 'Conditional',
      code: `if condition then
  -- True branch
else
  -- False branch
end`
    },
    {
      name: 'For Loop',
      code: `for i = 1, 10 do
  -- Loop body
end`
    },
    {
      name: 'Table',
      code: `local myTable = {
  key1 = "value1",
  key2 = "value2"
}`
    },
    {
      name: 'Random Number',
      code: `local randomNum = math.random(1, 100)`
    },
    {
      name: 'Play Audio',
      code: `playAudio('asset://audio_id', volume)`
    },
    {
      name: 'Game State Access',
      code: `local value = game_state:get_variable("variableName")
game_state:set_variable("variableName", newValue)`
    }
  ];
</script>

<div class="script-editor">
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>Scripts</h3>
      <button class="btn-add" onclick={addScript} title="Add script">+</button>
    </div>

    <div class="script-list">
      {#if scripts.length === 0}
        <div class="empty-message">
          <p>No scripts</p>
          <button class="btn-primary" onclick={addScript}>Add First Script</button>
        </div>
      {:else}
        {#each scripts as script, index (index)}
          <div
            class="script-item"
            class:active={index === activeIndex}
            onclick={() => { activeIndex = index; }}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activeIndex = index; } }}
          >
            <span class="script-name">Script {index + 1}</span>
            <button
              class="btn-delete-small"
              onclick={(e) => { e.stopPropagation(); deleteScript(index); }}
              title="Delete"
              type="button"
            >
              ×
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <div class="snippets">
      <h4>Lua Snippets</h4>
      <div class="snippet-list">
        {#each snippets as snippet}
          <button
            class="snippet-btn"
            onclick={() => insertSnippet(snippet.code)}
            title="Insert snippet"
            type="button"
          >
            {snippet.name}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="editor-area">
    <div class="editor-tabs">
      <button
        class="tab"
        class:active={activeTab === 'editor'}
        onclick={() => { activeTab = 'editor'; }}
        type="button"
      >
        Scripts
      </button>
      <button
        class="tab"
        class:active={activeTab === 'library'}
        onclick={() => { activeTab = 'library'; }}
        type="button"
      >
        Function Library
      </button>
      <button
        class="tab"
        class:active={activeTab === 'visual'}
        onclick={() => { activeTab = 'visual'; }}
        type="button"
      >
        🧩 Visual Builder
      </button>
      <button
        class="tab"
        class:active={activeTab === 'console'}
        onclick={() => { activeTab = 'console'; }}
        type="button"
      >
        💻 Lua Console
      </button>
    </div>

    {#if activeTab === 'library'}
      <FunctionLibraryPanel />
    {:else if activeTab === 'visual'}
      <VisualScriptBuilder onCodeChange={handleCodeChange} />
    {:else if activeTab === 'console'}
      <LuaConsole />
    {:else if scripts.length === 0}
      <div class="empty-state">
        <h2>No Scripts</h2>
        <p>Add Lua scripts to add custom logic and interactivity to your story.</p>
        <button class="btn-primary-large" onclick={addScript} type="button">
          Create Script
        </button>
      </div>
    {:else}
      <div class="editor-header">
        <div class="editor-title">
          <span>Script {activeIndex + 1}</span>
          <span class="language-badge">Lua</span>
          {#if hasChanges}
            <span class="modified-indicator">● Modified</span>
          {/if}
        </div>

        <div class="editor-actions">
          <button
            class="btn-run"
            onclick={runScript}
            disabled={isRunning || !code}
            type="button"
            title="Run script (Ctrl+Enter)"
          >
            {#if isRunning}
              Running...
            {:else}
              ▶ Run Script
            {/if}
          </button>
          {#if hasChanges}
            <button class="btn-secondary" onclick={revertChanges} type="button">Revert</button>
            <button class="btn-primary" onclick={saveChanges} type="button">Save Changes</button>
          {:else}
            <span class="saved-indicator">✓ Saved</span>
          {/if}
        </div>
      </div>

      <div class="monaco-container">
        <MonacoEditor
          bind:this={editorRef}
          bind:value={code}
          language="lua"
          theme="vs-dark"
          lineNumbers="on"
          minimap={false}
          fontSize={14}
          tabSize={2}
          wordWrap="on"
          onchange={handleCodeChange}
        />
      </div>

      {#if executionResult}
        <div class="execution-results" class:error={!executionResult.success}>
          <div class="results-header">
            <span class="results-title">
              {#if executionResult.success}
                ✓ Execution Successful
              {:else}
                ✗ Execution Failed
              {/if}
            </span>
            <button
              class="btn-close-results"
              onclick={() => { executionResult = null; }}
              type="button"
              title="Close"
            >
              ×
            </button>
          </div>

          <div class="results-body">
            {#if executionResult.error}
              <div class="error-message">
                <strong>Error:</strong> {executionResult.error}
              </div>
            {/if}

            {#if executionResult.value !== undefined}
              <div class="return-value">
                <strong>Return Value:</strong>
                <code>{JSON.stringify(executionResult.value, null, 2)}</code>
              </div>
            {/if}

            {#if executionResult.output && executionResult.output.length > 0}
              <div class="output-section">
                <strong>Output:</strong>
                <div class="output-lines">
                  {#each executionResult.output as line}
                    <div class="output-line">{line}</div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if executionResult.variables && Object.keys(executionResult.variables).length > 0}
              <div class="variables-section">
                <strong>Modified Variables:</strong>
                <code>{JSON.stringify(executionResult.variables, null, 2)}</code>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <div class="editor-footer">
        <span class="line-count">{code.split('\n').length} lines</span>
        <span class="char-count">{code.length} characters</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .script-editor {
    display: grid;
    grid-template-columns: 200px 1fr;
    height: 100%;
    background: var(--color-background);
    overflow: hidden;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .btn-add {
    width: 24px;
    height: 24px;
    padding: 0;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
  }

  .script-list {
    flex: 1;
    overflow-y: auto;
  }

  .empty-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
    text-align: center;
  }

  .empty-message p {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .btn-primary {
    padding: 0.5rem 0.75rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .script-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.2s;
  }

  .script-item:hover {
    background: var(--color-background);
  }

  .script-item.active {
    background: var(--color-primary-light);
    border-left: 3px solid var(--color-primary);
  }

  .script-name {
    font-size: 0.8125rem;
    color: var(--color-text);
  }

  .btn-delete-small {
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    color: var(--color-error);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    transition: background 0.2s;
  }

  .btn-delete-small:hover {
    background: var(--color-error);
    color: white;
  }

  .snippets {
    padding: 1rem;
    border-top: 1px solid var(--color-border);
    max-height: 400px;
    overflow-y: auto;
  }

  .snippets h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .snippet-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .snippet-btn {
    display: block;
    width: 100%;
    padding: 0.5rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.75rem;
    text-align: left;
    transition: all 0.2s;
  }

  .snippet-btn:hover {
    background: var(--color-primary-light);
    border-color: var(--color-primary);
  }

  .editor-area {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-tabs {
    display: flex;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .tab:hover {
    color: var(--color-text);
    background: var(--color-background);
  }

  .tab.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
    font-weight: 600;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
    text-align: center;
  }

  .empty-state h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--color-text);
  }

  .empty-state p {
    margin: 0;
    color: var(--color-text-secondary);
    max-width: 400px;
  }

  .btn-primary-large {
    padding: 0.75rem 1.5rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .editor-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .language-badge {
    padding: 0.125rem 0.5rem;
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: 3px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .modified-indicator {
    font-size: 0.75rem;
    color: var(--color-warning);
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .btn-secondary {
    padding: 0.5rem 1rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-secondary:hover {
    background: var(--color-surface);
  }

  .saved-indicator {
    font-size: 0.875rem;
    color: var(--color-success);
  }

  .monaco-container {
    flex: 1;
    overflow: hidden;
    min-height: 400px;
  }

  .editor-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .btn-run {
    padding: 0.5rem 1rem;
    background: var(--color-success);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: background 0.2s;
  }

  .btn-run:hover:not(:disabled) {
    background: var(--color-success-dark, #059669);
  }

  .btn-run:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .execution-results {
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    max-height: 300px;
    overflow-y: auto;
  }

  .execution-results.error {
    border-top: 2px solid var(--color-error);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-background);
    border-bottom: 1px solid var(--color-border);
  }

  .results-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .execution-results.error .results-title {
    color: var(--color-error);
  }

  .btn-close-results {
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    color: var(--color-text-secondary);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    transition: background 0.2s;
  }

  .btn-close-results:hover {
    background: var(--color-background);
  }

  .results-body {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .error-message {
    padding: 0.75rem;
    background: var(--color-error-light, #fee2e2);
    color: var(--color-error);
    border-radius: 4px;
    font-size: 0.875rem;
    font-family: monospace;
  }

  .return-value,
  .output-section,
  .variables-section {
    font-size: 0.875rem;
  }

  .return-value code,
  .variables-section code {
    display: block;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.8125rem;
    white-space: pre-wrap;
    overflow-x: auto;
  }

  .output-lines {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.8125rem;
  }

  .output-line {
    padding: 0.125rem 0;
    color: var(--color-text);
  }
</style>
