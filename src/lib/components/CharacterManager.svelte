<script lang="ts">
  import { onMount } from 'svelte';
  import { characterStore, entities, selectedEntity, entityCounts, type Entity, type EntityType, type EntityAttribute } from '../stores/characterStore';
  import { currentStory } from '../stores/storyStateStore';
  import { notificationStore } from '../stores/notificationStore';

  let searchQuery = '';
  let filterType: EntityType | 'all' = 'all';
  let showAddForm = false;
  let showEditForm = false;

  // Form state
  let formName = '';
  let formType: EntityType = 'character';
  let formDescription = '';
  let formColor = '';
  let formTags: string[] = [];
  let formTagInput = '';

  // Attribute form
  let showAddAttribute = false;
  let attrName = '';
  let attrValue = '';
  let attrType: 'text' | 'number' | 'boolean' = 'text';

  // Filter entities
  $: filteredEntities = $entities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || entity.type === filterType;
    return matchesSearch && matchesType;
  });

  // Load entities when story changes
  $: if ($currentStory) {
    characterStore.loadEntities($currentStory);
  }

  // Save entities when they change
  $: if ($currentStory && $entities) {
    characterStore.saveEntities($currentStory);
  }

  function getTypeIcon(type: EntityType): string {
    switch (type) {
      case 'character': return '👤';
      case 'location': return '📍';
      case 'item': return '📦';
      case 'faction': return '⚔️';
      case 'other': return '🔹';
      default: return '🔹';
    }
  }

  function getTypeColor(type: EntityType): string {
    switch (type) {
      case 'character': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'location': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'item': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'faction': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'other': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  function startAdd() {
    formName = '';
    formType = 'character';
    formDescription = '';
    formColor = '';
    formTags = [];
    showAddForm = true;
    showEditForm = false;
  }

  function startEdit(entity: Entity) {
    formName = entity.name;
    formType = entity.type;
    formDescription = entity.description;
    formColor = entity.color || '';
    formTags = [...entity.tags];
    characterStore.selectEntity(entity.id);
    showEditForm = true;
    showAddForm = false;
  }

  function cancelForm() {
    showAddForm = false;
    showEditForm = false;
    characterStore.selectEntity(null);
  }

  function saveEntity() {
    if (!formName.trim()) {
      notificationStore.error('Please enter a name');
      return;
    }

    if (showEditForm && $selectedEntity) {
      characterStore.updateEntity($selectedEntity.id, {
        name: formName.trim(),
        type: formType,
        description: formDescription.trim(),
        color: formColor || undefined,
        tags: formTags,
      });
      notificationStore.success('Entity updated');
    } else {
      characterStore.addEntity({
        name: formName.trim(),
        type: formType,
        description: formDescription.trim(),
        color: formColor || undefined,
        tags: formTags,
        attributes: [],
      });
      notificationStore.success('Entity created');
    }

    cancelForm();
  }

  function deleteEntity(id: string) {
    const entity = $entities.find(e => e.id === id);
    if (entity && confirm(`Delete "${entity.name}"?`)) {
      characterStore.deleteEntity(id);
      notificationStore.success('Entity deleted');
      if (showEditForm) {
        cancelForm();
      }
    }
  }

  function addTag() {
    const tag = formTagInput.trim();
    if (tag && !formTags.includes(tag)) {
      formTags = [...formTags, tag];
      formTagInput = '';
    }
  }

  function removeTag(tag: string) {
    formTags = formTags.filter(t => t !== tag);
  }

  function addAttribute() {
    if (!$selectedEntity || !attrName.trim()) return;

    const attribute: EntityAttribute = {
      name: attrName.trim(),
      value: attrValue.trim(),
      type: attrType,
    };

    characterStore.addAttribute($selectedEntity.id, attribute);
    attrName = '';
    attrValue = '';
    attrType = 'text';
    showAddAttribute = false;
    notificationStore.success('Attribute added');
  }

  function updateAttributeValue(attrName: string, value: string) {
    if ($selectedEntity) {
      characterStore.updateAttribute($selectedEntity.id, attrName, value);
    }
  }

  function deleteAttribute(attrName: string) {
    if ($selectedEntity && confirm(`Delete attribute "${attrName}"?`)) {
      characterStore.deleteAttribute($selectedEntity.id, attrName);
      notificationStore.success('Attribute deleted');
    }
  }
</script>

<div class="character-manager h-full flex flex-col bg-white dark:bg-gray-800">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Characters & Entities</h2>
      <button
        type="button"
        class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        on:click={startAdd}
      >
        + New
      </button>
    </div>

    <!-- Search -->
    <input
      type="text"
      placeholder="Search entities..."
      bind:value={searchQuery}
      class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
    />

    <!-- Type Filters -->
    <div class="flex gap-1 overflow-x-auto pb-1">
      <button
        type="button"
        class="px-2 py-1 text-xs rounded whitespace-nowrap {filterType === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
        on:click={() => filterType = 'all'}
      >
        All ({$entityCounts.total})
      </button>
      <button
        type="button"
        class="px-2 py-1 text-xs rounded whitespace-nowrap {filterType === 'character' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
        on:click={() => filterType = 'character'}
      >
        👤 Characters ({$entityCounts.character})
      </button>
      <button
        type="button"
        class="px-2 py-1 text-xs rounded whitespace-nowrap {filterType === 'location' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
        on:click={() => filterType = 'location'}
      >
        📍 Locations ({$entityCounts.location})
      </button>
      <button
        type="button"
        class="px-2 py-1 text-xs rounded whitespace-nowrap {filterType === 'item' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
        on:click={() => filterType = 'item'}
      >
        📦 Items ({$entityCounts.item})
      </button>
      <button
        type="button"
        class="px-2 py-1 text-xs rounded whitespace-nowrap {filterType === 'faction' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
        on:click={() => filterType = 'faction'}
      >
        ⚔️ Factions ({$entityCounts.faction})
      </button>
      <button
        type="button"
        class="px-2 py-1 text-xs rounded whitespace-nowrap {filterType === 'other' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
        on:click={() => filterType = 'other'}
      >
        🔹 Other ({$entityCounts.other})
      </button>
    </div>
  </div>

  <!-- Content Area -->
  <div class="flex-1 overflow-y-auto">
    {#if showAddForm || showEditForm}
      <!-- Add/Edit Form -->
      <div class="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">
          {showEditForm ? 'Edit Entity' : 'New Entity'}
        </h3>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              bind:value={formName}
              placeholder="Entity name"
              class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              bind:value={formType}
              class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="character">👤 Character</option>
              <option value="location">📍 Location</option>
              <option value="item">📦 Item</option>
              <option value="faction">⚔️ Faction</option>
              <option value="other">🔹 Other</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              bind:value={formDescription}
              placeholder="Entity description"
              rows="3"
              class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Color (optional)</label>
            <input
              type="color"
              bind:value={formColor}
              class="w-full h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
            <div class="flex gap-1 mb-2">
              <input
                type="text"
                bind:value={formTagInput}
                placeholder="Add tag"
                on:keydown={(e) => e.key === 'Enter' && addTag()}
                class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                on:click={addTag}
                class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Add
              </button>
            </div>
            <div class="flex flex-wrap gap-1">
              {#each formTags as tag}
                <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                  {tag}
                  <button
                    type="button"
                    on:click={() => removeTag(tag)}
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >×</button>
                </span>
              {/each}
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              on:click={saveEntity}
              class="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showEditForm ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              on:click={cancelForm}
              class="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Attributes (only in edit mode) -->
        {#if showEditForm && $selectedEntity}
          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-300">Attributes</h4>
              <button
                type="button"
                on:click={() => showAddAttribute = !showAddAttribute}
                class="px-2 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                {showAddAttribute ? 'Cancel' : '+ Add'}
              </button>
            </div>

            {#if showAddAttribute}
              <div class="mb-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                <div class="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    bind:value={attrName}
                    placeholder="Name"
                    class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <select
                    bind:value={attrType}
                    class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>
                <input
                  type="text"
                  bind:value={attrValue}
                  placeholder="Value"
                  class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
                />
                <button
                  type="button"
                  on:click={addAttribute}
                  class="w-full px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Add Attribute
                </button>
              </div>
            {/if}

            <div class="space-y-1">
              {#each $selectedEntity.attributes as attr}
                <div class="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                  <span class="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">{attr.name}:</span>
                  <input
                    type="text"
                    value={attr.value}
                    on:change={(e) => updateAttributeValue(attr.name, e.currentTarget.value)}
                    class="flex-1 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    on:click={() => deleteAttribute(attr.name)}
                    class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-xs"
                  >
                    🗑️
                  </button>
                </div>
              {/each}
              {#if $selectedEntity.attributes.length === 0}
                <p class="text-xs text-gray-500 dark:text-gray-400 text-center py-2">No attributes yet</p>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Entity List -->
    <div class="p-4 space-y-2">
      {#if filteredEntities.length === 0}
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No entities found</p>
          {#if searchQuery}
            <p class="text-xs mt-1">Try a different search term</p>
          {:else}
            <p class="text-xs mt-1">Click "+ New" to create one</p>
          {/if}
        </div>
      {:else}
        {#each filteredEntities as entity (entity.id)}
          <div
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all bg-white dark:bg-gray-750 {entity.id === $selectedEntity?.id ? 'ring-2 ring-blue-500' : ''}"
            style={entity.color ? `border-left: 4px solid ${entity.color}` : ''}
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="text-lg">{getTypeIcon(entity.type)}</span>
                <div>
                  <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">{entity.name}</h3>
                  <span class="inline-block px-2 py-0.5 text-xs rounded {getTypeColor(entity.type)}">
                    {entity.type}
                  </span>
                </div>
              </div>
              <div class="flex gap-1">
                <button
                  type="button"
                  on:click={() => startEdit(entity)}
                  class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  on:click={() => deleteEntity(entity.id)}
                  class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            {#if entity.description}
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">{entity.description}</p>
            {/if}

            {#if entity.attributes.length > 0}
              <div class="text-xs space-y-0.5 mb-2">
                {#each entity.attributes.slice(0, 3) as attr}
                  <div class="text-gray-600 dark:text-gray-400">
                    <span class="font-medium">{attr.name}:</span> {attr.value}
                  </div>
                {/each}
                {#if entity.attributes.length > 3}
                  <div class="text-gray-500 dark:text-gray-500">+{entity.attributes.length - 3} more</div>
                {/if}
              </div>
            {/if}

            {#if entity.tags.length > 0}
              <div class="flex flex-wrap gap-1">
                {#each entity.tags as tag}
                  <span class="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    {tag}
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .character-manager {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
</style>
