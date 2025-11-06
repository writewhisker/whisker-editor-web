<script lang="ts">
  import { currentStory, variableList } from '../stores/storyStateStore';
  import { playerVariables, isPlayerActive } from '../stores/playerStore';
  import { Variable } from '../models/Variable';

  let showAddDialog = false;
  let newVarName = '';
  let newVarType: 'string' | 'number' | 'boolean' = 'string';
  let newVarInitial: string | number | boolean = '';

  // Test values management
  let testValues: Map<string, any> = new Map();
  let showTestSection = false;

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

  function updateVariableType(name: string, newType: 'string' | 'number' | 'boolean') {
    if (!$currentStory) return;

    const variable = $currentStory.getVariable(name);
    if (variable) {
      variable.type = newType;

      // Convert initial value to new type
      if (newType === 'number') {
        variable.initial = Number(variable.initial) || 0;
      } else if (newType === 'boolean') {
        variable.initial = Boolean(variable.initial);
      } else {
        variable.initial = String(variable.initial);
      }

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

  function updateTestValue(name: string, value: any, type: string) {
    if (type === 'number') {
      testValues.set(name, Number(value));
    } else if (type === 'boolean') {
      testValues.set(name, value === 'true' || value === true);
    } else {
      testValues.set(name, String(value));
    }
    testValues = testValues;
  }

  function getTestValue(name: string, variable: Variable) {
    return testValues.has(name) ? testValues.get(name) : variable.initial;
  }

  function resetTestValues() {
    testValues.clear();
    testValues = testValues;
  }

  function setDefaultTestValues() {
    if (!$currentStory) return;

    for (const variable of $currentStory.variables.values()) {
      let testValue: any;
      switch (variable.type) {
        case 'number':
          testValue = 100;
          break;
        case 'boolean':
          testValue = true;
          break;
        default:
          testValue = 'TEST_VALUE';
      }
      testValues.set(variable.name, testValue);
    }
    testValues = testValues;
  }

  function getRuntimeValue(name: string) {
    return $playerVariables.get(name);
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
  <div class="flex-1 overflow-y-auto p-3 space-y-4">
    {#if $variableList.length === 0}
      <div class="text-center text-gray-400 text-sm py-8">
        <div class="text-2xl mb-2">📊</div>
        <div>No variables yet</div>
        <div class="text-xs mt-1">Variables store data like player name, score, etc.</div>
      </div>
    {:else}
      <!-- Variables Section -->
      <div class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <h4 class="text-xs font-semibold text-gray-600 uppercase">Variable Definitions</h4>
        </div>

        {#each $variableList as variable (variable.name)}
          {@const usageInfo = getVariableUsageInfo(variable.name)}
          {@const runtimeValue = getRuntimeValue(variable.name)}
          <div class="border border-gray-300 rounded p-3 space-y-2 bg-white shadow-sm">
            <!-- Name and Controls -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm font-medium text-gray-800">{variable.name}</span>
                {#if $isPlayerActive && runtimeValue !== undefined}
                  <span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded" title="Current runtime value">
                    ▶ {String(runtimeValue)}
                  </span>
                {/if}
              </div>
              <div class="flex items-center gap-1">
                <button
                  class="text-xs text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                  on:click={() => insertVariableAtCursor(variable.name)}
                  title="Copy {{variable}} to clipboard"
                >
                  📋
                </button>
                <button
                  class="text-xs text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                  on:click={() => removeVariable(variable.name)}
                  title="Delete variable"
                >
                  🗑
                </button>
              </div>
            </div>

            <!-- Type Selector -->
            <div>
              <label class="block text-xs text-gray-600 mb-1">Type</label>
              <select
                value={variable.type}
                on:change={(e) => updateVariableType(variable.name, (e.target as HTMLSelectElement).value as any)}
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="string">String (text)</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean (true/false)</option>
              </select>
            </div>

            <!-- Default/Initial Value -->
            <div>
              <label class="block text-xs text-gray-600 mb-1">Default Value</label>
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
                  placeholder={variable.type === 'number' ? '0' : 'Enter default value'}
                />
              {/if}
            </div>

            <!-- Usage Count with Details -->
            <div class="space-y-1 pt-1 border-t border-gray-200">
              <button
                class="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 w-full transition-colors"
                on:click={() => toggleUsageDetails(variable.name)}
              >
                <span class="transition-transform {expandedVariable === variable.name ? 'rotate-90' : ''}">▶</span>
                <span>Used {usageInfo.count} time{usageInfo.count !== 1 ? 's' : ''}</span>
                {#if usageInfo.count === 0}
                  <span class="text-orange-500 font-medium">(unused)</span>
                {/if}
              </button>

              <!-- Usage Details (Expandable) -->
              {#if expandedVariable === variable.name && usageInfo.usage.length > 0}
                <div class="pl-4 space-y-1 text-xs">
                  {#each usageInfo.usage as usage}
                    <div class="bg-gray-50 p-2 rounded border border-gray-200">
                      <div class="font-medium text-gray-700">{usage.passageName}</div>
                      <div class="text-gray-500 pl-2 mt-1">
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
      </div>

      <!-- Test Values Section -->
      <div class="border-t-2 border-gray-300 pt-4">
        <button
          class="flex items-center justify-between w-full px-1 mb-2 hover:text-blue-600 transition-colors"
          on:click={() => showTestSection = !showTestSection}
        >
          <h4 class="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
            <span class="transition-transform {showTestSection ? 'rotate-90' : ''}">▶</span>
            <span>Test Values</span>
          </h4>
        </button>

        {#if showTestSection}
          <div class="space-y-2">
            <p class="text-xs text-gray-500 px-1 mb-3">
              Set temporary values for testing without changing defaults
            </p>

            {#each $variableList as variable (variable.name)}
              {@const testValue = getTestValue(variable.name, variable)}
              <div class="border border-gray-200 rounded p-2 bg-gray-50 space-y-1">
                <label class="block text-xs font-medium text-gray-700">
                  {variable.name}
                  <span class="text-gray-500 font-normal">({variable.type})</span>
                </label>
                {#if variable.type === 'boolean'}
                  <select
                    value={String(testValue)}
                    on:change={(e) => updateTestValue(variable.name, (e.target as HTMLSelectElement).value, variable.type)}
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                {:else}
                  <input
                    type={variable.type === 'number' ? 'number' : 'text'}
                    value={testValue}
                    on:input={(e) => updateTestValue(variable.name, (e.target as HTMLInputElement).value, variable.type)}
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Test value"
                  />
                {/if}
              </div>
            {/each}

            <!-- Test Value Actions -->
            <div class="flex gap-2 pt-2">
              <button
                class="flex-1 px-3 py-2 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors font-medium"
                on:click={setDefaultTestValues}
                title="Set all variables to generic test values"
              >
                Fill Defaults
              </button>
              <button
                class="flex-1 px-3 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors font-medium"
                on:click={resetTestValues}
                title="Clear all test values"
              >
                Clear All
              </button>
            </div>

            <div class="text-xs text-gray-500 italic px-1 pt-2">
              Note: Test values are for preview only and won't affect the story's default values
            </div>
          </div>
        {/if}
      </div>
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
