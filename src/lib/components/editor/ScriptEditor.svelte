<script lang="ts">
  /**
   * ScriptEditor - Edit Lua scripts for the story
   */
  import { currentStory } from '../../stores/projectStore';

  let activeIndex = 0;
  let code = '';
  let hasChanges = false;

  $: scripts = $currentStory?.scripts || [];
  $: if (scripts.length > 0 && activeIndex < scripts.length) {
    code = scripts[activeIndex];
    hasChanges = false;
  }

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

  function updateCode(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    code = target.value;
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
    const textarea = document.querySelector('.code-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    code = code.substring(0, start) + snippet + code.substring(end);
    hasChanges = true;

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + snippet.length;
      textarea.selectionEnd = start + snippet.length;
    }, 0);
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
      <button class="btn-add" on:click={addScript} title="Add script">+</button>
    </div>

    <div class="script-list">
      {#if scripts.length === 0}
        <div class="empty-message">
          <p>No scripts</p>
          <button class="btn-primary" on:click={addScript}>Add First Script</button>
        </div>
      {:else}
        {#each scripts as script, index (index)}
          <div
            class="script-item"
            class:active={index === activeIndex}
            on:click={() => { activeIndex = index; }}
          >
            <span class="script-name">Script {index + 1}</span>
            <button
              class="btn-delete-small"
              on:click|stopPropagation={() => deleteScript(index)}
              title="Delete"
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
            on:click={() => insertSnippet(snippet.code)}
            title="Insert snippet"
          >
            {snippet.name}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="editor-area">
    {#if scripts.length === 0}
      <div class="empty-state">
        <h2>No Scripts</h2>
        <p>Add Lua scripts to add custom logic and interactivity to your story.</p>
        <button class="btn-primary-large" on:click={addScript}>
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
          {#if hasChanges}
            <button class="btn-secondary" on:click={revertChanges}>Revert</button>
            <button class="btn-primary" on:click={saveChanges}>Save Changes</button>
          {:else}
            <span class="saved-indicator">✓ Saved</span>
          {/if}
        </div>
      </div>

      <textarea
        class="code-editor"
        bind:value={code}
        on:input={updateCode}
        spellcheck="false"
        placeholder="-- Write your Lua code here"
      ></textarea>

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

  .code-editor {
    flex: 1;
    padding: 1rem;
    background: var(--color-background);
    color: var(--color-text);
    border: none;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    resize: none;
    tab-size: 2;
  }

  .code-editor:focus {
    outline: none;
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
</style>
