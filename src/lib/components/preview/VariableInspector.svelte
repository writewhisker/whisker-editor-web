<script lang="ts">
  import { currentStory } from '../../stores/storyStateStore';
  import { playerVariables, playerActions } from '../../stores/playerStore';

  // Get story variables definitions
  $: storyVariables = $currentStory
    ? Array.from($currentStory.variables.values())
    : [];

  function getInputType(type: string): string {
    switch (type) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'checkbox';
      default:
        return 'text';
    }
  }

  function updateVariable(name: string, event: Event) {
    const target = event.target as HTMLInputElement;
    let value: any;

    if (target.type === 'checkbox') {
      value = target.checked;
    } else if (target.type === 'number') {
      value = parseFloat(target.value);
    } else {
      value = target.value;
    }

    playerActions.setVariable(name, value);
  }

  function getVariableValue(name: string): any {
    return $playerVariables.get(name);
  }

  function resetVariables() {
    if (!$currentStory) return;

    for (const variable of $currentStory.variables.values()) {
      playerActions.setVariable(variable.name, variable.initial);
    }
  }

  function setTestVariables() {
    if (!$currentStory) return;

    // Set some test values based on type
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
          testValue = 'TEST';
      }
      playerActions.setVariable(variable.name, testValue);
    }
  }
</script>

<div class="variable-inspector">
  <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
    <span>🔢</span>
    <span>Variables</span>
  </h4>

  {#if storyVariables.length === 0}
    <p class="text-sm text-gray-500 italic">No variables defined</p>
  {:else}
    <div class="variables-list space-y-2 mb-4">
      {#each storyVariables as variable}
        {@const currentValue = getVariableValue(variable.name)}
        <div class="variable-item bg-gray-50 rounded p-2">
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-medium text-gray-700" for="var-{variable.name}">
              {variable.name}
            </label>
            <span class="text-xs text-gray-500 px-2 py-0.5 bg-white rounded">
              {variable.type}
            </span>
          </div>

          {#if variable.type === 'boolean'}
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                id="var-{variable.name}"
                type="checkbox"
                checked={currentValue === true}
                on:change={(e) => updateVariable(variable.name, e)}
                class="rounded"
              />
              <span class="text-sm text-gray-600">
                {currentValue === true ? 'true' : 'false'}
              </span>
            </label>
          {:else if variable.type === 'number'}
            <input
              id="var-{variable.name}"
              type="number"
              value={currentValue ?? variable.initial}
              on:input={(e) => updateVariable(variable.name, e)}
              class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          {:else}
            <input
              id="var-{variable.name}"
              type="text"
              value={currentValue ?? variable.initial}
              on:input={(e) => updateVariable(variable.name, e)}
              class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          {/if}

          {#if (variable as any).description}
            <p class="text-xs text-gray-500 mt-1">{(variable as any).description}</p>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Quick Actions -->
    <div class="override-section pt-4 border-t border-gray-200">
      <h5 class="text-xs font-semibold text-gray-600 mb-2">Quick Actions</h5>
      <div class="flex gap-2">
        <button
          class="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          on:click={setTestVariables}
          title="Set all variables to test values"
        >
          Test Values
        </button>
        <button
          class="flex-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          on:click={resetVariables}
          title="Reset to default values"
        >
          Reset
        </button>
      </div>
    </div>
  {/if}
</div>
