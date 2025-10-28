<script lang="ts">
  import { currentStory, projectActions } from '../stores/projectStore';

  let showAddDialog = false;
  let newSettingKey = '';
  let newSettingValue: string | number | boolean = '';
  let newSettingType: 'string' | 'number' | 'boolean' = 'string';
  let editingKey: string | null = null;
  let editValue: any = '';

  // Get sorted settings for display
  $: sortedSettings = $currentStory
    ? Object.entries($currentStory.getAllSettings()).sort((a, b) => a[0].localeCompare(b[0]))
    : [];

  function openAddDialog() {
    showAddDialog = true;
    newSettingKey = '';
    newSettingValue = '';
    newSettingType = 'string';
  }

  function closeAddDialog() {
    showAddDialog = false;
    newSettingKey = '';
    newSettingValue = '';
  }

  function addSetting() {
    if (!$currentStory || !newSettingKey.trim()) return;

    // Check if setting already exists
    if ($currentStory.hasSetting(newSettingKey)) {
      alert('A setting with this key already exists!');
      return;
    }

    let value: any = newSettingValue;
    if (newSettingType === 'number') {
      value = Number(newSettingValue);
    } else if (newSettingType === 'boolean') {
      value = newSettingValue === 'true' || newSettingValue === true;
    }

    $currentStory.setSetting(newSettingKey.trim(), value);
    currentStory.update((s) => s);
    projectActions.markChanged();
    closeAddDialog();
  }

  function deleteSetting(key: string) {
    if (!$currentStory) return;

    if (confirm(`Delete setting "${key}"?`)) {
      $currentStory.deleteSetting(key);
      currentStory.update((s) => s);
      projectActions.markChanged();
    }
  }

  function startEdit(key: string, value: any) {
    editingKey = key;
    editValue = value;
  }

  function cancelEdit() {
    editingKey = null;
    editValue = '';
  }

  function saveEdit(key: string) {
    if (!$currentStory || editingKey === null) return;

    let value: any = editValue;
    const currentValue = $currentStory.getSetting(key);

    // Try to preserve the type
    if (typeof currentValue === 'number') {
      value = Number(editValue);
    } else if (typeof currentValue === 'boolean') {
      value = editValue === 'true' || editValue === true;
    }

    $currentStory.setSetting(key, value);
    currentStory.update((s) => s);
    projectActions.markChanged();
    cancelEdit();
  }

  function getValueType(value: any): string {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    return typeof value;
  }

  function formatValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  function clearAllSettings() {
    if (!$currentStory) return;

    const count = Object.keys($currentStory.getAllSettings()).length;
    if (count === 0) return;

    if (confirm(`Clear all ${count} setting(s)? This cannot be undone.`)) {
      $currentStory.clearSettings();
      currentStory.update((s) => s);
      projectActions.markChanged();
    }
  }
</script>

<div class="flex flex-col h-full bg-white border-l border-gray-300">
  <!-- Header -->
  <div class="p-3 border-b border-gray-300">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold text-gray-800">Story Settings</h3>
      <div class="flex gap-1">
        <button
          class="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
          on:click={openAddDialog}
          title="Add new setting"
        >
          + Add
        </button>
        {#if sortedSettings.length > 0}
          <button
            class="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            on:click={clearAllSettings}
            title="Clear all settings"
          >
            Clear All
          </button>
        {/if}
      </div>
    </div>
    <p class="text-xs text-gray-500">
      Story-level configuration values (e.g., difficulty, theme, autoSave)
    </p>
  </div>

  <!-- Settings List -->
  <div class="flex-1 overflow-y-auto p-3 space-y-2">
    {#if sortedSettings.length === 0}
      <div class="text-center text-gray-400 text-sm py-8">
        <div class="text-2xl mb-2">⚙️</div>
        <div>No settings yet</div>
        <div class="text-xs mt-1">Settings store story configuration like difficulty, theme, etc.</div>
      </div>
    {:else}
      {#each sortedSettings as [key, value] (key)}
        <div class="border border-gray-300 rounded p-2">
          {#if editingKey === key}
            <!-- Editing Mode -->
            <div class="space-y-2">
              <div class="font-mono text-sm font-medium text-gray-700">{key}</div>
              <div>
                {#if typeof value === 'boolean'}
                  <select
                    bind:value={editValue}
                    class="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none"
                  >
                    <option value={false}>false</option>
                    <option value={true}>true</option>
                  </select>
                {:else if typeof value === 'number'}
                  <input
                    type="number"
                    bind:value={editValue}
                    class="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none"
                  />
                {:else if typeof value === 'object'}
                  <textarea
                    bind:value={editValue}
                    rows="3"
                    class="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none font-mono"
                  ></textarea>
                {:else}
                  <input
                    type="text"
                    bind:value={editValue}
                    class="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none"
                  />
                {/if}
              </div>
              <div class="flex justify-end gap-1">
                <button
                  class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  on:click={() => saveEdit(key)}
                >
                  Save
                </button>
                <button
                  class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  on:click={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <!-- Display Mode -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="font-mono text-sm font-medium text-gray-700 truncate" title={key}>
                  {key}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  <span class="px-1.5 py-0.5 bg-gray-200 rounded">{getValueType(value)}</span>
                </div>
                <div class="text-sm text-gray-800 mt-1 break-words">
                  {#if typeof value === 'object'}
                    <pre class="text-xs bg-gray-50 p-1 rounded overflow-x-auto">{formatValue(value)}</pre>
                  {:else}
                    {formatValue(value)}
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button
                  class="text-xs text-blue-600 hover:text-blue-800"
                  on:click={() => startEdit(key, value)}
                  title="Edit setting"
                >
                  ✏️
                </button>
                <button
                  class="text-xs text-red-600 hover:text-red-800"
                  on:click={() => deleteSetting(key)}
                  title="Delete setting"
                >
                  🗑
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Stats Footer -->
  {#if $currentStory}
    <div class="p-2 border-t border-gray-300 text-xs text-gray-600">
      {sortedSettings.length} setting{sortedSettings.length !== 1 ? 's' : ''}
    </div>
  {/if}
</div>

<!-- Add Setting Dialog -->
{#if showAddDialog}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 w-96">
      <h2 class="text-xl font-bold mb-4">Add Setting</h2>

      <div class="space-y-3">
        <!-- Key -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"> Key </label>
          <input
            type="text"
            bind:value={newSettingKey}
            placeholder="difficulty"
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            autofocus
          />
        </div>

        <!-- Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"> Type </label>
          <select
            bind:value={newSettingType}
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="string">String (text)</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean (true/false)</option>
          </select>
        </div>

        <!-- Value -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"> Value </label>
          {#if newSettingType === 'boolean'}
            <select
              bind:value={newSettingValue}
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={false}>false</option>
              <option value={true}>true</option>
            </select>
          {:else}
            <input
              type={newSettingType === 'number' ? 'number' : 'text'}
              bind:value={newSettingValue}
              placeholder={newSettingType === 'number' ? '0' : 'Initial value'}
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          {/if}
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <button
          class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          on:click={closeAddDialog}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          on:click={addSetting}
          disabled={!newSettingKey.trim()}
        >
          Add Setting
        </button>
      </div>
    </div>
  </div>
{/if}
