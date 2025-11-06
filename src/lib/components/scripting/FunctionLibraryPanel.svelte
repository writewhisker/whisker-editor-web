<script lang="ts">
  /**
   * FunctionLibraryPanel - Manage reusable Lua functions
   */
  import { currentStory } from '../../stores/storyStateStore';
  import { LuaFunction, DEFAULT_FUNCTION_TEMPLATES } from '../../models/LuaFunction';

  let selectedFunctionId = $state<string | null>(null);
  let searchQuery = $state('');
  let selectedCategory = $state('All');
  let showEditor = $state(false);
  let editingFunction = $state<LuaFunction | null>(null);

  // Reactive values
  let functions = $derived(
    $currentStory ? Array.from($currentStory.luaFunctions.values()) : []
  );

  let categories = $derived([
    'All',
    ...new Set(functions.map(f => f.category))
  ]);

  let filteredFunctions = $derived(
    functions.filter(f => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || f.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
  );

  function selectFunction(id: string) {
    selectedFunctionId = id;
    showEditor = false;
  }

  function createNewFunction() {
    if (!$currentStory) return;

    const newFunc = new LuaFunction();
    $currentStory.addLuaFunction(newFunc);
    currentStory.set($currentStory);

    selectedFunctionId = newFunc.id;
    editingFunction = newFunc;
    showEditor = true;
  }

  function editFunction(func: LuaFunction) {
    editingFunction = func.clone();
    editingFunction.id = func.id; // Keep same ID for updating
    showEditor = true;
  }

  function saveFunction() {
    if (!$currentStory || !editingFunction) return;

    $currentStory.updateLuaFunction(editingFunction.id, editingFunction.serialize());
    currentStory.set($currentStory);

    showEditor = false;
    editingFunction = null;
  }

  function cancelEdit() {
    showEditor = false;
    editingFunction = null;
  }

  function deleteFunction(id: string) {
    if (!$currentStory) return;

    if (confirm('Delete this function? This cannot be undone.')) {
      $currentStory.removeLuaFunction(id);
      currentStory.set($currentStory);

      if (selectedFunctionId === id) {
        selectedFunctionId = null;
      }
    }
  }

  function cloneFunction(func: LuaFunction) {
    if (!$currentStory) return;

    const cloned = func.clone();
    $currentStory.addLuaFunction(cloned);
    currentStory.set($currentStory);

    selectedFunctionId = cloned.id;
  }

  function loadDefaultTemplates() {
    if (!$currentStory) return;

    $currentStory.loadDefaultFunctionTemplates();
    currentStory.set($currentStory);
  }

  function insertIntoScript(code: string) {
    // This will be handled by parent component (ScriptEditor)
    const event = new CustomEvent('insertcode', { detail: code });
    window.dispatchEvent(event);
  }

  let selectedFunction = $derived(
    selectedFunctionId ? $currentStory?.getLuaFunction(selectedFunctionId) : null
  );
</script>

<div class="function-library">
  {#if showEditor && editingFunction}
    <!-- Function Editor Modal -->
    <div class="editor-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{editingFunction.id === 'new' ? 'New Function' : 'Edit Function'}</h3>
          <button class="btn-close" onclick={cancelEdit} type="button">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="func-name">Name</label>
            <input
              id="func-name"
              type="text"
              bind:value={editingFunction.name}
              placeholder="myFunction"
            />
          </div>

          <div class="form-group">
            <label for="func-desc">Description</label>
            <input
              id="func-desc"
              type="text"
              bind:value={editingFunction.description}
              placeholder="What does this function do?"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="func-category">Category</label>
              <select id="func-category" bind:value={editingFunction.category}>
                <option value="General">General</option>
                <option value="Combat">Combat</option>
                <option value="Inventory">Inventory</option>
                <option value="Dialogue">Dialogue</option>
                <option value="Quests">Quests</option>
                <option value="Stats">Stats</option>
                <option value="Utility">Utility</option>
              </select>
            </div>

            <div class="form-group">
              <label for="func-params">Parameters</label>
              <input
                id="func-params"
                type="text"
                bind:value={editingFunction.parameters}
                placeholder="param1: type, param2: type"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="func-return">Return Type</label>
            <input
              id="func-return"
              type="text"
              bind:value={editingFunction.returnType}
              placeholder="string, number, boolean, etc."
            />
          </div>

          <div class="form-group">
            <label for="func-code">Code</label>
            <textarea
              id="func-code"
              bind:value={editingFunction.code}
              placeholder="function myFunction()&#10;  -- Add code here&#10;end"
              rows="12"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="func-tags">Tags (comma-separated)</label>
            <input
              id="func-tags"
              type="text"
              value={editingFunction.tags.join(', ')}
              oninput={(e) => {
                const target = e.target as HTMLInputElement;
                editingFunction!.tags = target.value.split(',').map(t => t.trim()).filter(Boolean);
              }}
              placeholder="combat, utility, helper"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" onclick={cancelEdit} type="button">Cancel</button>
          <button class="btn-primary" onclick={saveFunction} type="button">Save Function</button>
        </div>
      </div>
    </div>
  {:else}
    <!-- Function Library View -->
    <div class="library-header">
      <h3>Function Library</h3>
      <div class="header-actions">
        <button class="btn-primary" onclick={createNewFunction} type="button">+ New Function</button>
        <button class="btn-secondary" onclick={loadDefaultTemplates} type="button">Load Templates</button>
      </div>
    </div>

    <div class="library-toolbar">
      <input
        type="text"
        class="search-input"
        bind:value={searchQuery}
        placeholder="Search functions..."
      />

      <select class="category-filter" bind:value={selectedCategory}>
        {#each categories as category}
          <option value={category}>{category}</option>
        {/each}
      </select>
    </div>

    <div class="library-content">
      <div class="function-list">
        {#if filteredFunctions.length === 0}
          <div class="empty-state">
            <p>No functions found</p>
            {#if functions.length === 0}
              <button class="btn-secondary" onclick={loadDefaultTemplates} type="button">
                Load Default Templates
              </button>
            {/if}
          </div>
        {:else}
          {#each filteredFunctions as func (func.id)}
            <div
              class="function-item"
              class:active={selectedFunctionId === func.id}
              onclick={() => selectFunction(func.id)}
              role="button"
              tabindex="0"
              onkeydown={(e) => { if (e.key === 'Enter') selectFunction(func.id); }}
            >
              <div class="function-header">
                <span class="function-name">{func.name}</span>
                <span class="function-category">{func.category}</span>
              </div>
              <p class="function-desc">{func.description}</p>
              {#if func.tags.length > 0}
                <div class="function-tags">
                  {#each func.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      {#if selectedFunction}
        <div class="function-detail">
          <div class="detail-header">
            <div>
              <h4>{selectedFunction.name}</h4>
              <p class="detail-category">{selectedFunction.category}</p>
            </div>
            <div class="detail-actions">
              <button
                class="btn-icon"
                onclick={() => insertIntoScript(selectedFunction!.code)}
                title="Insert into script"
                type="button"
              >
                ↓
              </button>
              <button
                class="btn-icon"
                onclick={() => cloneFunction(selectedFunction!)}
                title="Clone"
                type="button"
              >
                ⎘
              </button>
              <button
                class="btn-icon"
                onclick={() => editFunction(selectedFunction!)}
                title="Edit"
                type="button"
              >
                ✎
              </button>
              <button
                class="btn-icon btn-danger"
                onclick={() => deleteFunction(selectedFunction!.id)}
                title="Delete"
                type="button"
              >
                ×
              </button>
            </div>
          </div>

          <div class="detail-body">
            <p class="detail-description">{selectedFunction.description}</p>

            {#if selectedFunction.parameters}
              <div class="detail-section">
                <strong>Parameters:</strong>
                <code>{selectedFunction.parameters}</code>
              </div>
            {/if}

            {#if selectedFunction.returnType}
              <div class="detail-section">
                <strong>Returns:</strong>
                <code>{selectedFunction.returnType}</code>
              </div>
            {/if}

            <div class="detail-section">
              <strong>Code:</strong>
              <pre><code>{selectedFunction.code}</code></pre>
            </div>

            {#if selectedFunction.tags.length > 0}
              <div class="detail-section">
                <strong>Tags:</strong>
                <div class="detail-tags">
                  {#each selectedFunction.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="function-detail empty">
          <p>Select a function to view details</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .function-library {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-background);
  }

  .library-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .library-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--color-text);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .library-toolbar {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .search-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .category-filter {
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.875rem;
    background: var(--color-background);
  }

  .library-content {
    display: grid;
    grid-template-columns: 300px 1fr;
    flex: 1;
    overflow: hidden;
  }

  .function-list {
    overflow-y: auto;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .function-item {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background 0.2s;
  }

  .function-item:hover {
    background: var(--color-background);
  }

  .function-item.active {
    background: var(--color-primary-light);
    border-left: 3px solid var(--color-primary);
  }

  .function-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .function-name {
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--color-text);
  }

  .function-category {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: var(--color-background);
    border-radius: 3px;
    color: var(--color-text-secondary);
  }

  .function-desc {
    margin: 0 0 0.5rem 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }

  .function-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .tag {
    font-size: 0.6875rem;
    padding: 0.125rem 0.375rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-secondary);
  }

  .function-detail {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background: var(--color-background);
  }

  .function-detail.empty {
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .detail-header h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  .detail-category {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .detail-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon {
    width: 32px;
    height: 32px;
    padding: 0;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    background: var(--color-surface);
    border-color: var(--color-primary);
  }

  .btn-icon.btn-danger:hover {
    background: var(--color-error);
    border-color: var(--color-error);
    color: white;
  }

  .detail-body {
    padding: 1.5rem;
  }

  .detail-description {
    margin: 0 0 1.5rem 0;
    font-size: 1rem;
    color: var(--color-text);
  }

  .detail-section {
    margin-bottom: 1.5rem;
  }

  .detail-section strong {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text);
  }

  .detail-section code {
    display: block;
    padding: 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.8125rem;
  }

  .detail-section pre {
    margin: 0;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow-x: auto;
  }

  .detail-section pre code {
    display: block;
    padding: 0;
    background: none;
    border: none;
    font-size: 0.8125rem;
    line-height: 1.5;
    white-space: pre;
  }

  .detail-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  /* Editor Modal */
  .editor-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    background: var(--color-background);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  .btn-close {
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: color 0.2s;
  }

  .btn-close:hover {
    color: var(--color-text);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.875rem;
    font-family: inherit;
    background: var(--color-surface);
    color: var(--color-text);
  }

  .form-group textarea {
    font-family: monospace;
    resize: vertical;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-dark, #0056b3);
  }

  .btn-secondary {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .btn-secondary:hover {
    background: var(--color-surface);
  }
</style>
