<script lang="ts">
  /**
   * StylesheetEditor - Edit CSS stylesheets for the story
   */
  import { currentStory } from '../../stores/projectStore';

  let activeIndex = 0;
  let code = '';
  let hasChanges = false;

  $: stylesheets = $currentStory?.stylesheets || [];
  $: if (stylesheets.length > 0 && activeIndex < stylesheets.length) {
    code = stylesheets[activeIndex];
    hasChanges = false;
  }

  function addStylesheet() {
    if (!$currentStory) return;

    const defaultCss = `/* New Stylesheet */\n.passage {\n  font-family: Georgia, serif;\n  line-height: 1.6;\n}\n`;

    $currentStory.stylesheets.push(defaultCss);
    currentStory.set($currentStory);
    activeIndex = $currentStory.stylesheets.length - 1;
  }

  function deleteStylesheet(index: number) {
    if (!$currentStory) return;

    if (confirm('Delete this stylesheet?')) {
      $currentStory.stylesheets.splice(index, 1);
      currentStory.set($currentStory);

      if (activeIndex >= $currentStory.stylesheets.length) {
        activeIndex = Math.max(0, $currentStory.stylesheets.length - 1);
      }
    }
  }

  function updateCode(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    code = target.value;
    hasChanges = true;
  }

  function saveChanges() {
    if (!$currentStory || activeIndex >= stylesheets.length) return;

    $currentStory.stylesheets[activeIndex] = code;
    currentStory.set($currentStory);
    hasChanges = false;
  }

  function revertChanges() {
    if (activeIndex < stylesheets.length) {
      code = stylesheets[activeIndex];
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
      name: 'Passage Style',
      code: `.passage {
  font-family: Georgia, serif;
  font-size: 16px;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}`
    },
    {
      name: 'Choice Style',
      code: `.choice {
  display: block;
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  background: #f5f5f5;
  border: 2px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.choice:hover {
  background: #e8e8e8;
  border-color: #007bff;
}`
    },
    {
      name: 'Dark Theme',
      code: `body {
  background: #1a1a1a;
  color: #e0e0e0;
}

.passage {
  background: #2d2d2d;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.choice {
  background: #3a3a3a;
  border-color: #555;
  color: #e0e0e0;
}

.choice:hover {
  background: #454545;
  border-color: #007bff;
}`
    }
  ];
</script>

<div class="stylesheet-editor">
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>Stylesheets</h3>
      <button class="btn-add" on:click={addStylesheet} title="Add stylesheet">+</button>
    </div>

    <div class="stylesheet-list">
      {#if stylesheets.length === 0}
        <div class="empty-message">
          <p>No stylesheets</p>
          <button class="btn-primary" on:click={addStylesheet}>Add First Stylesheet</button>
        </div>
      {:else}
        {#each stylesheets as stylesheet, index (index)}
          <div
            class="stylesheet-item"
            class:active={index === activeIndex}
            on:click={() => { activeIndex = index; }}
          >
            <span class="stylesheet-name">Stylesheet {index + 1}</span>
            <button
              class="btn-delete-small"
              on:click|stopPropagation={() => deleteStylesheet(index)}
              title="Delete"
            >
              ×
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <div class="snippets">
      <h4>Snippets</h4>
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

  <div class="editor-area">
    {#if stylesheets.length === 0}
      <div class="empty-state">
        <h2>No Stylesheets</h2>
        <p>Add a stylesheet to customize the appearance of your story.</p>
        <button class="btn-primary-large" on:click={addStylesheet}>
          Create Stylesheet
        </button>
      </div>
    {:else}
      <div class="editor-header">
        <div class="editor-title">
          <span>Stylesheet {activeIndex + 1}</span>
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
        placeholder="/* Write your CSS here */"
      ></textarea>

      <div class="editor-footer">
        <span class="line-count">{code.split('\n').length} lines</span>
        <span class="char-count">{code.length} characters</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .stylesheet-editor {
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

  .stylesheet-list {
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

  .stylesheet-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.2s;
  }

  .stylesheet-item:hover {
    background: var(--color-background);
  }

  .stylesheet-item.active {
    background: var(--color-primary-light);
    border-left: 3px solid var(--color-primary);
  }

  .stylesheet-name {
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
  }

  .snippets h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .snippet-btn {
    display: block;
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
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
