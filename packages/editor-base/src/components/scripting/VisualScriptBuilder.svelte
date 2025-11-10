<script lang="ts">
  import {
    ScriptBlock,
    createBlock,
    blocksToLua,
    BLOCK_TEMPLATES,
    type BlockType,
    type BlockCategory,
  } from '../../models/ScriptBlock';

  // Props
  let { onCodeChange }: { onCodeChange?: (code: string) => void } = $props();

  // State
  let blocks = $state<ScriptBlock[]>([]);
  let selectedBlockId = $state<string | null>(null);
  let showCodePreview = $state(true);
  let draggedBlockType = $state<BlockType | null>(null);
  let activeCategory = $state<BlockCategory>('variables');

  const categories: Array<{ id: BlockCategory; label: string; icon: string }> = [
    { id: 'variables', label: 'Variables', icon: '📦' },
    { id: 'math', label: 'Math', icon: '🔢' },
    { id: 'logic', label: 'Logic', icon: '🔀' },
    { id: 'text', label: 'Text', icon: '📝' },
    { id: 'output', label: 'Output', icon: '💬' },
    { id: 'control', label: 'Control', icon: '⚙️' },
  ];

  // Get blocks for current category
  let categoryBlocks = $derived(
    Object.entries(BLOCK_TEMPLATES)
      .filter(([, template]) => (template() as any).category === activeCategory)
      .map(([type]) => type as BlockType)
  );

  // Generate code
  let generatedCode = $derived(blocksToLua(blocks));

  // Update code when blocks change
  $effect(() => {
    if (onCodeChange) {
      onCodeChange(generatedCode);
    }
  });

  function handleDragStart(event: DragEvent, blockType: BlockType) {
    draggedBlockType = blockType;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (draggedBlockType) {
      addBlock(draggedBlockType);
      draggedBlockType = null;
    }
  }

  function addBlock(type: BlockType) {
    const newBlock = createBlock(type);
    blocks.push(newBlock);
    blocks = [...blocks];
    selectedBlockId = newBlock.id;
  }

  function removeBlock(blockId: string) {
    blocks = blocks.filter((b) => b.id !== blockId);
    if (selectedBlockId === blockId) {
      selectedBlockId = null;
    }
  }

  function moveBlockUp(index: number) {
    if (index > 0) {
      [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
      blocks = [...blocks];
    }
  }

  function moveBlockDown(index: number) {
    if (index < blocks.length - 1) {
      [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
      blocks = [...blocks];
    }
  }

  function duplicateBlock(block: ScriptBlock) {
    const cloned = block.clone();
    const index = blocks.findIndex((b) => b.id === block.id);
    blocks.splice(index + 1, 0, cloned);
    blocks = [...blocks];
    selectedBlockId = cloned.id;
  }

  function clearAllBlocks() {
    if (confirm('Clear all blocks? This cannot be undone.')) {
      blocks = [];
      selectedBlockId = null;
    }
  }

  function updateBlockParameter(blockId: string, paramName: string, value: any) {
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      const param = block.parameters.find((p) => p.name === paramName);
      if (param) {
        param.value = value;
        blocks = [...blocks];
      }
    }
  }

  function copyCodeToClipboard() {
    navigator.clipboard.writeText(generatedCode);
  }
</script>

<div class="visual-script-builder">
  <div class="builder-header">
    <h3>Visual Script Builder</h3>
    <div class="header-actions">
      <button
        class="btn btn-sm btn-secondary"
        onclick={() => (showCodePreview = !showCodePreview)}
      >
        {showCodePreview ? '👁️ Hide Code' : '👁️ Show Code'}
      </button>
      <button class="btn btn-sm btn-warning" onclick={clearAllBlocks}>
        🗑️ Clear All
      </button>
    </div>
  </div>

  <div class="builder-body">
    <!-- Block Palette -->
    <div class="block-palette">
      <div class="palette-header">
        <h4>Block Library</h4>
      </div>

      <div class="category-tabs">
        {#each categories as category}
          <button
            class="category-tab"
            class:active={activeCategory === category.id}
            onclick={() => (activeCategory = category.id)}
          >
            <span class="category-icon">{category.icon}</span>
            <span class="category-label">{category.label}</span>
          </button>
        {/each}
      </div>

      <div class="palette-blocks">
        {#each categoryBlocks as blockType}
          {@const block = createBlock(blockType)}
          <div
            class="palette-block"
            draggable="true"
            ondragstart={(e) => handleDragStart(e, blockType)}
            style="background-color: {block.color}"
            title="Drag to canvas to add"
          >
            <div class="block-label">{block.label}</div>
            <div class="block-params">
              {#each block.parameters as param}
                <span class="param-placeholder">{param.placeholder}</span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Canvas -->
    <div class="canvas-area">
      <div
        class="script-canvas"
        ondragover={handleDragOver}
        ondrop={handleDrop}
      >
        {#if blocks.length === 0}
          <div class="canvas-empty">
            <div class="empty-icon">🧩</div>
            <h4>No blocks yet</h4>
            <p>Drag blocks from the library on the left to start building your script</p>
          </div>
        {:else}
          <div class="blocks-list">
            {#each blocks as block, index}
              <div
                class="canvas-block"
                class:selected={selectedBlockId === block.id}
                style="border-left: 4px solid {block.color}"
                onclick={() => (selectedBlockId = block.id)}
              >
                <div class="block-header">
                  <span class="block-label">{block.label}</span>
                  <div class="block-actions">
                    <button
                      class="btn-icon"
                      onclick={() => moveBlockUp(index)}
                      disabled={index === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      class="btn-icon"
                      onclick={() => moveBlockDown(index)}
                      disabled={index === blocks.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      class="btn-icon"
                      onclick={() => duplicateBlock(block)}
                      title="Duplicate"
                    >
                      📋
                    </button>
                    <button
                      class="btn-icon btn-danger"
                      onclick={() => removeBlock(block.id)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div class="block-parameters">
                  {#each block.parameters as param}
                    <div class="parameter">
                      <label>{param.placeholder || param.name}:</label>
                      {#if param.type === 'text' && param.name === 'operator'}
                        <select
                          value={param.value}
                          onchange={(e) =>
                            updateBlockParameter(block.id, param.name, e.currentTarget.value)}
                        >
                          {#if block.type === 'math_operation' || block.type === 'change_variable'}
                            <option value="+">+</option>
                            <option value="-">-</option>
                            <option value="*">*</option>
                            <option value="/">/</option>
                            <option value="%">%</option>
                          {:else if block.type === 'comparison'}
                            <option value="==">==</option>
                            <option value="~=">~=</option>
                            <option value="<">&lt;</option>
                            <option value=">">&gt;</option>
                            <option value="<=">&lt;=</option>
                            <option value=">=">&gt;=</option>
                          {/if}
                        </select>
                      {:else if param.type === 'text' && param.name === 'operation'}
                        <select
                          value={param.value}
                          onchange={(e) =>
                            updateBlockParameter(block.id, param.name, e.currentTarget.value)}
                        >
                          <option value="upper">Uppercase</option>
                          <option value="lower">Lowercase</option>
                          <option value="len">Length</option>
                        </select>
                      {:else}
                        <input
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={param.value || ''}
                          placeholder={param.placeholder}
                          oninput={(e) =>
                            updateBlockParameter(block.id, param.name, e.currentTarget.value)}
                        />
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Code Preview -->
      {#if showCodePreview}
        <div class="code-preview">
          <div class="preview-header">
            <h4>Generated Lua Code</h4>
            <button class="btn btn-sm" onclick={copyCodeToClipboard} title="Copy to clipboard">
              📋 Copy
            </button>
          </div>
          <pre class="code-content">{generatedCode || '-- No blocks yet'}</pre>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .visual-script-builder {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary, white);
    border-radius: 8px;
    overflow: hidden;
  }

  .builder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--bg-secondary, #f8f8f8);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .builder-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--text-primary, #333);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .builder-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Block Palette */
  .block-palette {
    width: 280px;
    background: var(--bg-tertiary, #f0f0f0);
    border-right: 1px solid var(--border-color, #e0e0e0);
    display: flex;
    flex-direction: column;
  }

  .palette-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .palette-header h4 {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    text-transform: uppercase;
    font-weight: 600;
  }

  .category-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .category-tab {
    flex: 1;
    min-width: 80px;
    padding: 0.5rem;
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.2s;
  }

  .category-tab:hover {
    background: var(--bg-hover, #f8f8f8);
  }

  .category-tab.active {
    background: var(--primary-color, #007bff);
    color: white;
    border-color: var(--primary-color, #007bff);
  }

  .category-icon {
    font-size: 1.25rem;
  }

  .category-label {
    font-size: 0.75rem;
    font-weight: 500;
  }

  .palette-blocks {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .palette-block {
    padding: 0.75rem;
    border-radius: 6px;
    cursor: grab;
    user-select: none;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .palette-block:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .palette-block:active {
    cursor: grabbing;
  }

  .block-label {
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    margin-bottom: 0.25rem;
  }

  .block-params {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .param-placeholder {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    color: white;
  }

  /* Canvas Area */
  .canvas-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .script-canvas {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background: var(--bg-canvas, #fafafa);
  }

  .canvas-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary, #666);
    text-align: center;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .canvas-empty h4 {
    margin: 0 0 0.5rem;
    color: var(--text-primary, #333);
  }

  .canvas-empty p {
    margin: 0;
    max-width: 300px;
  }

  .blocks-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .canvas-block {
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    padding: 1rem;
    transition: all 0.2s;
    cursor: pointer;
  }

  .canvas-block:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .canvas-block.selected {
    border-color: var(--primary-color, #007bff);
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .block-header .block-label {
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .block-actions {
    display: flex;
    gap: 0.25rem;
  }

  .block-parameters {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .parameter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .parameter label {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    min-width: 120px;
  }

  .parameter input,
  .parameter select {
    flex: 1;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .parameter input:focus,
  .parameter select:focus {
    outline: none;
    border-color: var(--primary-color, #007bff);
  }

  /* Code Preview */
  .code-preview {
    border-top: 1px solid var(--border-color, #e0e0e0);
    background: var(--bg-code, #1e1e1e);
    max-height: 200px;
    display: flex;
    flex-direction: column;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-code-header, #2d2d2d);
    border-bottom: 1px solid var(--border-color-dark, #333);
  }

  .preview-header h4 {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-code, #d4d4d4);
  }

  .code-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    margin: 0;
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-code, #d4d4d4);
    background: var(--bg-code, #1e1e1e);
  }

  /* Buttons */
  .btn {
    padding: 0.375rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-sm {
    padding: 0.25rem 0.625rem;
    font-size: 0.8125rem;
  }

  .btn-secondary {
    background: var(--bg-tertiary, #f0f0f0);
    color: var(--text-primary, #333);
    border-color: var(--border-color, #e0e0e0);
  }

  .btn-secondary:hover {
    background: var(--bg-hover, #e8e8e8);
  }

  .btn-warning {
    background: var(--warning-color, #ffc107);
    color: var(--text-dark, #000);
  }

  .btn-warning:hover {
    background: var(--warning-color-dark, #e0a800);
  }

  .btn-icon {
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--border-color, #e0e0e0);
    background: white;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .btn-icon:hover:not(:disabled) {
    background: var(--bg-hover, #f8f8f8);
  }

  .btn-icon:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-icon.btn-danger {
    color: var(--danger-color, #dc3545);
  }

  .btn-icon.btn-danger:hover:not(:disabled) {
    background: var(--danger-color-light, #f8d7da);
    border-color: var(--danger-color, #dc3545);
  }
</style>
