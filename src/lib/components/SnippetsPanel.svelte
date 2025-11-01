<script lang="ts">
  import { templateManager, type PassageTemplate } from '../utils/passageTemplates';
  import { currentStory, selectedPassageId, projectActions } from '../stores/projectStore';
  import { Passage } from '../models/Passage';
  import { notificationStore } from '../stores/notificationStore';
  import { get } from 'svelte/store';

  let searchQuery = '';
  let selectedCategory: PassageTemplate['category'] | 'all' = 'all';
  let showCreateCustom = false;
  let customName = '';
  let customDescription = '';
  let customCategory: PassageTemplate['category'] = 'custom';

  // Get all templates
  $: allTemplates = templateManager.getAllTemplates();

  // Filter templates
  $: filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Category counts
  $: categoryCounts = {
    all: allTemplates.length,
    narrative: allTemplates.filter(t => t.category === 'narrative').length,
    choice: allTemplates.filter(t => t.category === 'choice').length,
    conditional: allTemplates.filter(t => t.category === 'conditional').length,
    scripted: allTemplates.filter(t => t.category === 'scripted').length,
    custom: allTemplates.filter(t => t.category === 'custom').length,
  };

  function insertTemplate(template: PassageTemplate) {
    if (!$currentStory) {
      notificationStore.error('No story loaded');
      return;
    }

    // Get current passage if one is selected
    const currentPassage = $selectedPassageId ? $currentStory.getPassage($selectedPassageId) : null;

    // Create new passage from template
    const passage = new Passage({
      title: template.template.title || 'New Passage',
      content: template.template.content || '',
      choices: template.template.choices || [],
      tags: template.template.tags || [],
      onEnterScript: template.template.onEnterScript,
      onExitScript: template.template.onExitScript,
      // Position near current passage if one is selected
      position: currentPassage?.position
        ? { x: currentPassage.position.x + 250, y: currentPassage.position.y }
        : undefined,
    });

    currentStory.update(story => {
      if (story) {
        story.addPassage(passage);
        selectedPassageId.set(passage.id);
      }
      return story;
    });

    projectActions.markChanged();
    notificationStore.success(`Inserted "${template.name}" template`);
  }

  function createCustomTemplate() {
    if (!customName.trim()) {
      notificationStore.error('Please enter a template name');
      return;
    }

    const currentPassage = $selectedPassageId && $currentStory
      ? $currentStory.getPassage($selectedPassageId)
      : null;

    if (!currentPassage) {
      notificationStore.error('Please select a passage to save as template');
      return;
    }

    templateManager.createCustomTemplate(
      customName.trim(),
      customDescription.trim() || 'Custom template',
      customCategory,
      {
        title: currentPassage.title,
        content: currentPassage.content,
        choices: currentPassage.choices,
        tags: currentPassage.tags,
        onEnterScript: currentPassage.onEnterScript,
        onExitScript: currentPassage.onExitScript,
      }
    );

    notificationStore.success(`Created custom template "${customName}"`);
    customName = '';
    customDescription = '';
    customCategory = 'custom';
    showCreateCustom = false;

    // Refresh template list
    allTemplates = templateManager.getAllTemplates();
  }

  function deleteCustomTemplate(templateId: string) {
    if (confirm('Delete this custom template?')) {
      templateManager.deleteCustomTemplate(templateId);
      notificationStore.success('Template deleted');
      allTemplates = templateManager.getAllTemplates();
    }
  }

  function getCategoryIcon(category: PassageTemplate['category']): string {
    switch (category) {
      case 'narrative': return '📄';
      case 'choice': return '🔀';
      case 'conditional': return '⚡';
      case 'scripted': return '🔢';
      case 'custom': return '⭐';
      default: return '📄';
    }
  }

  function getCategoryColor(category: PassageTemplate['category']): string {
    switch (category) {
      case 'narrative': return 'bg-blue-100 text-blue-700';
      case 'choice': return 'bg-green-100 text-green-700';
      case 'conditional': return 'bg-yellow-100 text-yellow-700';
      case 'scripted': return 'bg-purple-100 text-purple-700';
      case 'custom': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
</script>

<div class="snippets-panel h-full flex flex-col bg-white dark:bg-gray-800">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Snippets</h2>
      <button
        type="button"
        class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        on:click={() => showCreateCustom = !showCreateCustom}
        title="Save current passage as template"
      >
        {showCreateCustom ? 'Cancel' : '+ Custom'}
      </button>
    </div>

    <!-- Search -->
    <input
      type="text"
      placeholder="Search snippets..."
      bind:value={searchQuery}
      class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
    />
  </div>

  <!-- Create Custom Template Form -->
  {#if showCreateCustom}
    <div class="p-4 bg-blue-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Save as Template</h3>
      <div class="space-y-2">
        <input
          type="text"
          placeholder="Template name"
          bind:value={customName}
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          bind:value={customDescription}
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
        <select
          bind:value={customCategory}
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="narrative">Narrative</option>
          <option value="choice">Choice</option>
          <option value="conditional">Conditional</option>
          <option value="scripted">Scripted</option>
          <option value="custom">Custom</option>
        </select>
        <button
          type="button"
          class="w-full px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          on:click={createCustomTemplate}
        >
          Save Template
        </button>
      </div>
    </div>
  {/if}

  <!-- Category Filters -->
  <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
    <div class="flex gap-2">
      <button
        type="button"
        class="px-3 py-1 text-xs rounded transition-colors whitespace-nowrap {selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}"
        on:click={() => selectedCategory = 'all'}
      >
        All ({categoryCounts.all})
      </button>
      <button
        type="button"
        class="px-3 py-1 text-xs rounded transition-colors whitespace-nowrap {selectedCategory === 'narrative' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}"
        on:click={() => selectedCategory = 'narrative'}
      >
        📄 Narrative ({categoryCounts.narrative})
      </button>
      <button
        type="button"
        class="px-3 py-1 text-xs rounded transition-colors whitespace-nowrap {selectedCategory === 'choice' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}"
        on:click={() => selectedCategory = 'choice'}
      >
        🔀 Choice ({categoryCounts.choice})
      </button>
      <button
        type="button"
        class="px-3 py-1 text-xs rounded transition-colors whitespace-nowrap {selectedCategory === 'conditional' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}"
        on:click={() => selectedCategory = 'conditional'}
      >
        ⚡ Conditional ({categoryCounts.conditional})
      </button>
      <button
        type="button"
        class="px-3 py-1 text-xs rounded transition-colors whitespace-nowrap {selectedCategory === 'scripted' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}"
        on:click={() => selectedCategory = 'scripted'}
      >
        🔢 Scripted ({categoryCounts.scripted})
      </button>
      <button
        type="button"
        class="px-3 py-1 text-xs rounded transition-colors whitespace-nowrap {selectedCategory === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}"
        on:click={() => selectedCategory = 'custom'}
      >
        ⭐ Custom ({categoryCounts.custom})
      </button>
    </div>
  </div>

  <!-- Template List -->
  <div class="flex-1 overflow-y-auto p-4 space-y-2">
    {#if filteredTemplates.length === 0}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">No snippets found</p>
        {#if searchQuery}
          <p class="text-xs mt-1">Try a different search term</p>
        {/if}
      </div>
    {:else}
      {#each filteredTemplates as template (template.id)}
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all bg-white dark:bg-gray-750">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">{template.icon || getCategoryIcon(template.category)}</span>
                <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{template.name}</h3>
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">{template.description}</p>
              <div class="flex items-center gap-2">
                <span class="inline-block px-2 py-0.5 text-xs rounded {getCategoryColor(template.category)}">
                  {template.category}
                </span>
                {#if template.template.choices && template.template.choices.length > 0}
                  <span class="text-xs text-gray-500 dark:text-gray-400">{template.template.choices.length} choice{template.template.choices.length !== 1 ? 's' : ''}</span>
                {/if}
                {#if template.template.tags && template.template.tags.length > 0}
                  <span class="text-xs text-gray-500 dark:text-gray-400">{template.template.tags.length} tag{template.template.tags.length !== 1 ? 's' : ''}</span>
                {/if}
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <button
                type="button"
                class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
                on:click={() => insertTemplate(template)}
                title="Insert this template"
              >
                Insert
              </button>
              {#if template.id.startsWith('custom-')}
                <button
                  type="button"
                  class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  on:click={() => deleteCustomTemplate(template.id)}
                  title="Delete custom template"
                >
                  Delete
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .snippets-panel {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
</style>
