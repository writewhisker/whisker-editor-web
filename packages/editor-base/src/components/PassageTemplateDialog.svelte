<script lang="ts">
  import { templateManager, type PassageTemplate } from '../utils/passageTemplates';
  import { currentStory } from '../stores/storyStateStore';
  import { Passage } from '@writewhisker/core-ts';

  let {
    isOpen = $bindable(false),
    onSelect = undefined
  }: {
    isOpen?: boolean;
    onSelect?: ((template: PassageTemplate) => void) | undefined;
  } = $props();

  let selectedCategory: PassageTemplate['category'] | 'all' = $state('all');
  let searchQuery = $state('');
  let selectedTemplate: PassageTemplate | null = $state(null);

  const categories = [
    { id: 'all' as const, name: 'All Templates', icon: '📚' },
    { id: 'narrative' as const, name: 'Narrative', icon: '📖' },
    { id: 'choice' as const, name: 'Choice', icon: '🔀' },
    { id: 'conditional' as const, name: 'Conditional', icon: '⚡' },
    { id: 'scripted' as const, name: 'Scripted', icon: '🔧' },
    { id: 'custom' as const, name: 'Custom', icon: '⭐' },
  ];

  const templates = $derived(() => {
    const allTemplates = templateManager.getAllTemplates();

    // Filter by category
    let filtered = selectedCategory === 'all'
      ? allTemplates
      : allTemplates.filter(t => t.category === selectedCategory);

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  function selectTemplate(template: PassageTemplate) {
    selectedTemplate = template;
  }

  function applyTemplate() {
    if (selectedTemplate && $currentStory) {
      const passage = new Passage({
        ...selectedTemplate.template,
        position: { x: Math.random() * 400, y: Math.random() * 300 },
      });

      $currentStory.addPassage(passage);

      if (onSelect) {
        onSelect(selectedTemplate);
      }

      close();
    }
  }

  function close() {
    isOpen = false;
    selectedTemplate = null;
    searchQuery = '';
    selectedCategory = 'all';
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }
</script>

{#if isOpen}
  <div class="dialog-backdrop" onclick={handleBackdropClick}>
    <div class="dialog" role="dialog" tabindex="-1" aria-modal="true">
      <div class="dialog-header">
        <h2>Passage Templates</h2>
        <button class="close-btn" onclick={close} aria-label="Close">×</button>
      </div>

      <div class="dialog-body">
        <!-- Search and Filter -->
        <div class="controls">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search templates..."
            class="search-input"
          />

          <div class="category-tabs">
            {#each categories as category}
              <button
                class="category-tab"
                class:active={selectedCategory === category.id}
                onclick={() => selectedCategory = category.id}
              >
                <span class="category-icon">{category.icon}</span>
                <span class="category-name">{category.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Template Grid -->
        <div class="template-grid">
          {#if templates().length === 0}
            <div class="empty-state">
              <p>No templates found</p>
              <p class="hint">Try a different search or category</p>
            </div>
          {:else}
            {#each templates() as template}
              <button
                class="template-card"
                class:selected={selectedTemplate?.id === template.id}
                onclick={() => selectTemplate(template)}
                ondblclick={applyTemplate}
              >
                <div class="template-icon">{template.icon || '📄'}</div>
                <div class="template-info">
                  <div class="template-name">{template.name}</div>
                  <div class="template-description">{template.description}</div>
                </div>
              </button>
            {/each}
          {/if}
        </div>

        <!-- Template Preview -->
        {#if selectedTemplate}
          <div class="template-preview">
            <h3>Preview: {selectedTemplate.name}</h3>
            <div class="preview-content">
              <div class="preview-section">
                <div class="preview-label">Title</div>
                <div class="preview-value">{selectedTemplate.template.title || 'Untitled'}</div>
              </div>

              <div class="preview-section">
                <div class="preview-label">Content</div>
                <div class="preview-value preview-text">{selectedTemplate.template.content || '(Empty)'}</div>
              </div>

              {#if selectedTemplate.template.choices && selectedTemplate.template.choices.length > 0}
                <div class="preview-section">
                  <div class="preview-label">Choices ({selectedTemplate.template.choices.length})</div>
                  <ul class="preview-choices">
                    {#each selectedTemplate.template.choices as choice}
                      <li>{choice.text}</li>
                    {/each}
                  </ul>
                </div>
              {/if}

              {#if selectedTemplate.template.tags && selectedTemplate.template.tags.length > 0}
                <div class="preview-section">
                  <div class="preview-label">Tags</div>
                  <div class="preview-tags">
                    {#each selectedTemplate.template.tags as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" onclick={close}>Cancel</button>
        <button
          class="btn btn-primary"
          onclick={applyTemplate}
          disabled={!selectedTemplate}
        >
          Create from Template
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dialog {
    width: 90%;
    max-width: 900px;
    max-height: 85vh;
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    animation: slideUp 0.2s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    font-size: 28px;
    cursor: pointer;
    color: #64748b;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .dialog-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
  }

  .controls {
    margin-bottom: 20px;
  }

  .search-input {
    width: 100%;
    padding: 10px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .category-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .category-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .category-tab:hover {
    background: #f8fafc;
  }

  .category-tab.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .category-icon {
    font-size: 16px;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .template-card {
    display: flex;
    gap: 12px;
    padding: 16px;
    border: 2px solid #e2e8f0;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .template-card:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .template-card.selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .template-icon {
    font-size: 32px;
  }

  .template-info {
    flex: 1;
    min-width: 0;
  }

  .template-name {
    font-weight: 600;
    font-size: 14px;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .template-description {
    font-size: 12px;
    color: #64748b;
    line-height: 1.4;
  }

  .empty-state {
    grid-column: 1 / -1;
    padding: 48px;
    text-align: center;
    color: #64748b;
  }

  .empty-state .hint {
    font-size: 14px;
    opacity: 0.8;
    margin-top: 8px;
  }

  .template-preview {
    padding: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .template-preview h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .preview-section {
    margin-bottom: 12px;
  }

  .preview-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .preview-value {
    font-size: 14px;
    color: #1e293b;
  }

  .preview-text {
    white-space: pre-wrap;
    line-height: 1.6;
  }

  .preview-choices {
    margin: 0;
    padding-left: 20px;
    font-size: 14px;
    color: #1e293b;
  }

  .preview-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    padding: 4px 8px;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    font-size: 12px;
    color: #475569;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: #f1f5f9;
    color: #475569;
  }

  .btn-secondary:hover {
    background: #e2e8f0;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }
</style>
