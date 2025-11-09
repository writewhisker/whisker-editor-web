<script lang="ts">
  interface PromptTemplate {
    id: string;
    name: string;
    category: 'writing' | 'editing' | 'analysis' | 'worldbuilding';
    prompt: string;
    icon: string;
    description: string;
  }

  // Props
  let {
    open = $bindable(false),
    onselect,
  }: {
    open?: boolean;
    onselect?: (detail: { template: PromptTemplate }) => void;
  } = $props();

  // State
  let selectedCategory = $state<PromptTemplate['category'] | 'all'>('all');
  let searchQuery = $state('');
  let customTemplates = $state<PromptTemplate[]>([]);

  // Built-in templates
  const builtInTemplates: PromptTemplate[] = [
    {
      id: 'expand-passage',
      name: 'Expand Passage',
      category: 'writing',
      icon: '📝',
      description: 'Expand a brief passage into fuller content',
      prompt: 'Expand this passage with more detail and description:\n\n{content}',
    },
    {
      id: 'add-dialogue',
      name: 'Add Dialogue',
      category: 'writing',
      icon: '💬',
      description: 'Add character dialogue to a passage',
      prompt: 'Add natural dialogue between characters to this passage:\n\n{content}',
    },
    {
      id: 'create-branches',
      name: 'Create Story Branches',
      category: 'writing',
      icon: '🌳',
      description: 'Generate multiple story branches',
      prompt:
        'Given this passage, create {count} interesting story branches:\n\n{content}\n\nMake each branch distinct and compelling.',
    },
    {
      id: 'improve-clarity',
      name: 'Improve Clarity',
      category: 'editing',
      icon: '✨',
      description: 'Make writing clearer and more concise',
      prompt: 'Rewrite this passage for better clarity and conciseness:\n\n{content}',
    },
    {
      id: 'fix-tone',
      name: 'Adjust Tone',
      category: 'editing',
      icon: '🎭',
      description: 'Change the tone of a passage',
      prompt: 'Rewrite this passage with a {tone} tone:\n\n{content}',
    },
    {
      id: 'grammar-check',
      name: 'Grammar & Style',
      category: 'editing',
      icon: '📖',
      description: 'Check grammar and improve style',
      prompt: 'Review this passage for grammar, style, and flow improvements:\n\n{content}',
    },
    {
      id: 'analyze-pacing',
      name: 'Analyze Pacing',
      category: 'analysis',
      icon: '⏱️',
      description: 'Analyze story pacing',
      prompt: 'Analyze the pacing of this story section and provide feedback:\n\n{content}',
    },
    {
      id: 'character-consistency',
      name: 'Character Consistency',
      category: 'analysis',
      icon: '👤',
      description: 'Check character consistency',
      prompt:
        'Review this passage for character consistency and voice:\n\nCharacter: {character}\nPrevious context: {context}\n\nPassage:\n{content}',
    },
    {
      id: 'plot-holes',
      name: 'Find Plot Holes',
      category: 'analysis',
      icon: '🕳️',
      description: 'Identify potential plot holes',
      prompt: 'Identify any plot holes or logical inconsistencies in this story:\n\n{content}',
    },
    {
      id: 'world-details',
      name: 'World Details',
      category: 'worldbuilding',
      icon: '🌍',
      description: 'Generate world details',
      prompt: 'Generate detailed world-building elements for this setting:\n\n{content}',
    },
    {
      id: 'character-background',
      name: 'Character Background',
      category: 'worldbuilding',
      icon: '📜',
      description: 'Create character backstory',
      prompt:
        'Create a detailed background for this character:\n\nName: {character}\nRole: {role}\nStory context: {context}',
    },
    {
      id: 'location-description',
      name: 'Location Description',
      category: 'worldbuilding',
      icon: '🏰',
      description: 'Describe a location in detail',
      prompt: 'Create a vivid description of this location:\n\nLocation: {location}\nMood: {mood}',
    },
  ];

  // Load custom templates from localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ai-custom-templates');
    if (saved) {
      try {
        customTemplates = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load custom templates:', e);
      }
    }
  }

  // Save custom templates
  function saveCustomTemplates() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-custom-templates', JSON.stringify(customTemplates));
    }
  }

  // Computed
  const allTemplates = $derived([...builtInTemplates, ...customTemplates]);

  const filteredTemplates = $derived(() => {
    let filtered = allTemplates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.prompt.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  function handleSelectTemplate(template: PromptTemplate) {
    onselect?.({ template });
    open = false;
  }

  function handleClose() {
    open = false;
  }
</script>

{#if open}
  <div class="dialog-overlay" onclick={handleClose} role="presentation">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog" tabindex="-1"
      aria-labelledby="templates-title"
      aria-modal="true"
    >
      <div class="dialog-header">
        <h2 id="templates-title">📋 Prompt Templates</h2>
        <button class="close-btn" onclick={handleClose} aria-label="Close">×</button>
      </div>

      <div class="dialog-toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search templates..."
            bind:value={searchQuery}
            class="search-input"
          />
        </div>

        <div class="category-filters">
          <button
            class="filter-btn"
            class:active={selectedCategory === 'all'}
            onclick={() => (selectedCategory = 'all')}
          >
            All
          </button>
          <button
            class="filter-btn"
            class:active={selectedCategory === 'writing'}
            onclick={() => (selectedCategory = 'writing')}
          >
            📝 Writing
          </button>
          <button
            class="filter-btn"
            class:active={selectedCategory === 'editing'}
            onclick={() => (selectedCategory = 'editing')}
          >
            ✏️ Editing
          </button>
          <button
            class="filter-btn"
            class:active={selectedCategory === 'analysis'}
            onclick={() => (selectedCategory = 'analysis')}
          >
            🔍 Analysis
          </button>
          <button
            class="filter-btn"
            class:active={selectedCategory === 'worldbuilding'}
            onclick={() => (selectedCategory = 'worldbuilding')}
          >
            🌍 World
          </button>
        </div>
      </div>

      <div class="dialog-content">
        {#if filteredTemplates().length === 0}
          <div class="empty-state">
            <span class="empty-icon">📭</span>
            <p>No templates found matching your search</p>
          </div>
        {:else}
          <div class="templates-grid">
            {#each filteredTemplates() as template (template.id)}
              <button
                class="template-card"
                onclick={() => handleSelectTemplate(template)}
              >
                <div class="template-header">
                  <span class="template-icon">{template.icon}</span>
                  <div class="template-info">
                    <div class="template-name">{template.name}</div>
                    <div class="template-category">{template.category}</div>
                  </div>
                </div>
                <div class="template-description">{template.description}</div>
                <div class="template-preview">{template.prompt.substring(0, 100)}...</div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
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
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background: var(--bg-primary, white);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    max-width: 900px;
    width: 90%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
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
    padding: 24px;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary, #333);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
    color: var(--text-secondary, #666);
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  .dialog-toolbar {
    padding: 16px 24px;
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-primary, white);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .search-icon {
    font-size: 18px;
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    background: transparent;
  }

  .category-filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 6px 12px;
    background: var(--bg-primary, white);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-btn:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .filter-btn.active {
    background: var(--accent-color, #3498db);
    color: white;
    border-color: var(--accent-color, #3498db);
  }

  .dialog-content {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-state p {
    margin: 0;
    font-size: 16px;
    color: var(--text-secondary, #666);
  }

  .templates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .template-card {
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .template-card:hover {
    background: var(--bg-hover, #e0e0e0);
    border-color: var(--accent-color, #3498db);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .template-header {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  .template-icon {
    font-size: 32px;
  }

  .template-info {
    flex: 1;
  }

  .template-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #333);
    margin-bottom: 4px;
  }

  .template-category {
    font-size: 12px;
    color: var(--text-secondary, #666);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .template-description {
    font-size: 14px;
    color: var(--text-primary, #333);
    line-height: 1.4;
    margin-bottom: 12px;
  }

  .template-preview {
    font-size: 12px;
    color: var(--text-secondary, #666);
    font-family: monospace;
    background: rgba(0, 0, 0, 0.05);
    padding: 8px;
    border-radius: 4px;
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    .templates-grid {
      grid-template-columns: 1fr;
    }

    .category-filters {
      overflow-x: auto;
      flex-wrap: nowrap;
    }
  }
</style>
