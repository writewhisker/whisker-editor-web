<script lang="ts">
  import { currentStory, variableList } from '../stores/projectStore';
  import { Variable } from '../models/Variable';

  let showAddDialog = false;
  let newVarName = '';
  let newVarType: 'string' | 'number' | 'boolean' = 'string';
  let newVarInitial: string | number | boolean = '';

  function addVariable() {
    showAddDialog = true;
    newVarName = '';
    newVarType = 'string';
    newVarInitial = '';
  }

  function confirmAddVariable() {
    if (!$currentStory || !newVarName.trim()) return;

    // Check if variable already exists
    if ($currentStory.variables.has(newVarName)) {
      alert('A variable with this name already exists!');
      return;
    }

    const variable = new Variable({
      name: newVarName.trim(),
      type: newVarType,
      initial: newVarType === 'number' ? Number(newVarInitial) :
               newVarType === 'boolean' ? Boolean(newVarInitial) :
               String(newVarInitial)
    });

    $currentStory.addVariable(variable);
    currentStory.set($currentStory);
    showAddDialog = false;
  }

  function removeVariable(name: string) {
    if (!$currentStory) return;

    if (confirm(`Delete variable "${name}"? This will not remove it from passage content.`)) {
      $currentStory.removeVariable(name);
      currentStory.set($currentStory);
    }
  }

  function updateVariableValue(name: string, value: string) {
    if (!$currentStory) return;

    const variable = $currentStory.getVariable(name);
    if (variable) {
      if (variable.type === 'number') {
        variable.initial = Number(value);
      } else if (variable.type === 'boolean') {
        variable.initial = value === 'true';
      } else {
        variable.initial = value;
      }
      currentStory.set($currentStory);
    }
  }

  // Use Phase 3 variable usage tracking
  function getVariableUsageInfo(name: string) {
    if (!$currentStory) return { count: 0, usage: [] };

    const usage = $currentStory.getVariableUsage(name);
    const count = usage.reduce((sum, u) => sum + u.locations.length, 0);

    return { count, usage };
  }

  // Show/hide usage details
  let expandedVariable: string | null = null;

  function toggleUsageDetails(name: string) {
    expandedVariable = expandedVariable === name ? null : name;
  }

  function insertVariableAtCursor(name: string) {
    // This would need to be implemented based on which textarea is focused
    // For now, just copy to clipboard
    navigator.clipboard.writeText(`{{${name}}}`);
    alert(`Copied {{${name}}} to clipboard`);
  }
</script>

<div class="flex flex-col h-full bg-white border-l border-gray-300">
  <!-- Header -->
  <div class="p-3 border-b border-gray-300">
    <div class="flex items-center justify-between mb-1">
      <h3 class="font-semibold text-gray-800">Variables</h3>
      <button
        class="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
        on:click={addVariable}
      >
        + Add
      </button>
    </div>
  </div>

  <!-- Variable List -->
  <div class="flex-1 overflow-y-auto p-3 space-y-2">
    {#if $variableList.length === 0}
      <div class="text-center text-gray-400 text-sm py-8">
        <div class="text-2xl mb-2">📊</div>
        <div>No variables yet</div>
        <div class="text-xs mt-1">Variables store data like player name, score, etc.</div>
      </div>
    {:else}
      {#each $variableList as variable (variable.name)}
        {@const usageInfo = getVariableUsageInfo(variable.name)}
        <div class="border border-gray-300 rounded p-2 space-y-2">
          <!-- Name and Type -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-medium">{variable.name}</span>
              <span class="text-xs px-1.5 py-0.5 bg-gray-200 rounded">{variable.type}</span>
            </div>
            <div class="flex items-center gap-1">
              <button
                class="text-xs text-blue-600 hover:text-blue-800"
                on:click={() => insertVariableAtCursor(variable.name)}
                title="Copy {{variable}} to clipboard"
              >
                📋
              </button>
              <button
                class="text-xs text-red-600 hover:text-red-800"
                on:click={() => removeVariable(variable.name)}
                title="Delete variable"
              >
                🗑
              </button>
            </div>
          </div>

          <!-- Initial Value -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Initial Value</label>
            {#if variable.type === 'boolean'}
              <select
                value={String(variable.initial)}
                on:change={(e) => updateVariableValue(variable.name, (e.target as HTMLSelectElement).value)}
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            {:else}
              <input
                type={variable.type === 'number' ? 'number' : 'text'}
                value={variable.initial}
                on:input={(e) => updateVariableValue(variable.name, (e.target as HTMLInputElement).value)}
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            {/if}
          </div>

          <!-- Usage Count with Details -->
          <div class="space-y-1">
            <button
              class="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 w-full"
              on:click={() => toggleUsageDetails(variable.name)}
            >
              <span class={expandedVariable === variable.name ? 'rotate-90' : ''}>▶</span>
              <span>Used {usageInfo.count} time{usageInfo.count !== 1 ? 's' : ''}</span>
              {#if usageInfo.count === 0}
                <span class="text-orange-500 font-medium">(unused)</span>
              {/if}
            </button>

            <!-- Usage Details (Expandable) -->
            {#if expandedVariable === variable.name && usageInfo.usage.length > 0}
              <div class="pl-4 space-y-1 text-xs">
                {#each usageInfo.usage as usage}
                  <div class="bg-gray-50 p-1 rounded">
                    <div class="font-medium text-gray-700">{usage.passageName}</div>
                    <div class="text-gray-500 pl-2">
                      {#each usage.locations as location}
                        <div>• {location}</div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Stats Footer -->
  {#if $currentStory}
    <div class="p-2 border-t border-gray-300 text-xs text-gray-600">
      {$variableList.length} variable{$variableList.length !== 1 ? 's' : ''}
    </div>
  {/if}
</div>

<!-- Add Variable Dialog -->
{#if showAddDialog}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 w-96">
      <h2 class="text-xl font-bold mb-4">Add Variable</h2>

      <div class="space-y-3">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            bind:value={newVarName}
            placeholder="playerName"
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            autofocus
          />
        </div>

        <!-- Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            bind:value={newVarType}
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="string">String (text)</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean (true/false)</option>
          </select>
        </div>

        <!-- Initial Value -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Initial Value
          </label>
          {#if newVarType === 'boolean'}
            <select
              bind:value={newVarInitial}
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={false}>false</option>
              <option value={true}>true</option>
            </select>
          {:else}
            <input
              type={newVarType === 'number' ? 'number' : 'text'}
              bind:value={newVarInitial}
              placeholder={newVarType === 'number' ? '0' : 'Initial value'}
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          {/if}
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <button
          class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          on:click={() => showAddDialog = false}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          on:click={confirmAddVariable}
          disabled={!newVarName.trim()}
        >
          Add Variable
        </button>
      </div>
    </div>
  </div>
{/if}
