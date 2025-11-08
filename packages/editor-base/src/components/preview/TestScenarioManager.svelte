<script lang="ts">
  import {
    testScenarioActions,
    scenarioList,
    selectedScenario,
    scenarioResults,
    runningScenarioId,
    scenarioCount,
  } from '../../stores/testScenarioStore';
  import { currentStory } from '../../stores/storyStateStore';
  import type { TestScenario, TestStep } from '../../player/testScenarioTypes';

  let view: 'list' | 'create' | 'edit' | 'results' = 'list';
  let editingScenario: TestScenario | null = null;

  // Form state
  let formName = '';
  let formDescription = '';
  let formStartPassageId = '';
  let formSteps: TestStep[] = [];

  function createNew() {
    formName = '';
    formDescription = '';
    formStartPassageId = '';
    formSteps = [];
    editingScenario = null;
    view = 'create';
  }

  function editScenario(scenario: TestScenario) {
    editingScenario = scenario;
    formName = scenario.name;
    formDescription = scenario.description || '';
    formStartPassageId = scenario.startPassageId || '';
    formSteps = [...scenario.steps];
    view = 'edit';
  }

  function saveScenario() {
    if (!formName.trim()) {
      alert('Please enter a scenario name');
      return;
    }

    if (editingScenario) {
      testScenarioActions.update(editingScenario.id, {
        name: formName,
        description: formDescription,
        startPassageId: formStartPassageId || undefined,
        steps: formSteps,
      });
    } else {
      testScenarioActions.create({
        name: formName,
        description: formDescription,
        startPassageId: formStartPassageId || undefined,
        steps: formSteps,
        tags: [],
      });
    }

    view = 'list';
  }

  function cancelEdit() {
    view = 'list';
    editingScenario = null;
  }

  function deleteScenario(id: string) {
    if (confirm('Are you sure you want to delete this test scenario?')) {
      testScenarioActions.delete(id);
    }
  }

  async function runScenario(id: string) {
    try {
      await testScenarioActions.run(id);
      view = 'results';
      testScenarioActions.select(id);
    } catch (error) {
      alert(`Failed to run scenario: ${error}`);
    }
  }

  async function runAllScenarios() {
    try {
      await testScenarioActions.runAll();
      view = 'results';
    } catch (error) {
      alert(`Failed to run scenarios: ${error}`);
    }
  }

  function addStep() {
    formSteps = [...formSteps, { description: '' }];
  }

  function removeStep(index: number) {
    formSteps = formSteps.filter((_, i) => i !== index);
  }

  function exportScenarios() {
    const json = testScenarioActions.exportScenarios();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-scenarios.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importScenarios() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const count = testScenarioActions.importScenarios(text);
          alert(`Successfully imported ${count} scenarios`);
        } catch (error) {
          alert(`Failed to import: ${error}`);
        }
      }
    };
    input.click();
  }

  $: passages = $currentStory ? Array.from($currentStory.passages.values()) : [];
  $: hasScenarios = $scenarioCount > 0;
</script>

<div class="test-scenario-manager bg-white border border-gray-300 rounded p-4">
  <!-- Header -->
  <div class="header flex items-center justify-between mb-4">
    <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
      <span>🧪</span>
      <span>Test Scenarios</span>
      {#if hasScenarios}
        <span class="text-sm font-normal text-gray-500">({$scenarioCount})</span>
      {/if}
    </h3>

    {#if view === 'list'}
      <div class="flex gap-2">
        <button
          class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          on:click={createNew}
          title="Create new scenario"
        >
          ➕ New
        </button>
        {#if hasScenarios}
          <button
            class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            on:click={runAllScenarios}
            disabled={$runningScenarioId !== null}
            title="Run all scenarios"
          >
            ▶️ Run All
          </button>
        {/if}
      </div>
    {:else}
      <button
        class="px-3 py-1 text-sm bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
        on:click={cancelEdit}
      >
        ← Back
      </button>
    {/if}
  </div>

  <!-- List View -->
  {#if view === 'list'}
    {#if hasScenarios}
      <div class="scenario-list space-y-2 max-h-96 overflow-y-auto">
        {#each $scenarioList as scenario (scenario.id)}
          {@const result = $scenarioResults.get(scenario.id)}
          {@const isRunning = $runningScenarioId === scenario.id}

          <div class="scenario-item bg-gray-50 border border-gray-200 rounded p-3">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h4 class="font-medium text-gray-800">{scenario.name}</h4>
                  {#if result}
                    <span
                      class="text-xs px-2 py-0.5 rounded {result.passed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'}"
                    >
                      {result.passed ? '✓ Pass' : '✗ Fail'}
                    </span>
                  {/if}
                </div>

                {#if scenario.description}
                  <p class="text-sm text-gray-600 mt-1">{scenario.description}</p>
                {/if}

                <div class="text-xs text-gray-500 mt-1">
                  {scenario.steps.length} steps • Modified {new Date(
                    scenario.modified
                  ).toLocaleDateString()}
                </div>
              </div>

              <div class="flex gap-1 ml-2">
                <button
                  class="p-1 text-sm text-green-600 hover:bg-green-50 rounded transition-colors"
                  on:click={() => runScenario(scenario.id)}
                  disabled={isRunning}
                  title="Run scenario"
                >
                  {isRunning ? '⏳' : '▶️'}
                </button>
                <button
                  class="p-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  on:click={() => editScenario(scenario)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  class="p-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  on:click={() => testScenarioActions.duplicate(scenario.id)}
                  title="Duplicate"
                >
                  📋
                </button>
                <button
                  class="p-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                  on:click={() => deleteScenario(scenario.id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Import/Export -->
      <div class="mt-4 pt-4 border-t border-gray-200 flex gap-2">
        <button
          class="flex-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          on:click={exportScenarios}
        >
          💾 Export All
        </button>
        <button
          class="flex-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          on:click={importScenarios}
        >
          📂 Import
        </button>
        {#if $scenarioResults.size > 0}
          <button
            class="flex-1 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
            on:click={() => (view = 'results')}
          >
            📊 Results
          </button>
        {/if}
      </div>
    {:else}
      <div class="empty-state text-center py-8">
        <div class="text-6xl mb-4">🧪</div>
        <p class="text-gray-600 mb-4">No test scenarios yet</p>
        <p class="text-sm text-gray-500 mb-4">
          Create automated tests to verify your story works as expected
        </p>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          on:click={createNew}
        >
          Create First Scenario
        </button>
      </div>
    {/if}
  {/if}

  <!-- Create/Edit View -->
  {#if view === 'create' || view === 'edit'}
    <div class="scenario-form space-y-4 max-h-96 overflow-y-auto">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Scenario Name <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          bind:value={formName}
          placeholder="e.g., Happy path through quest"
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"> Description </label>
        <textarea
          bind:value={formDescription}
          placeholder="Describe what this test verifies..."
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"> Start Passage </label>
        <select
          bind:value={formStartPassageId}
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Story Start</option>
          {#each passages as passage}
            <option value={passage.id}>{passage.title}</option>
          {/each}
        </select>
      </div>

      <!-- Steps -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700"> Test Steps </label>
          <button
            class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            on:click={addStep}
          >
            ➕ Add Step
          </button>
        </div>

        {#if formSteps.length === 0}
          <p class="text-sm text-gray-500 italic">
            No steps yet. Add steps to define the test flow.
          </p>
        {:else}
          <div class="space-y-2">
            {#each formSteps as step, index}
              <div class="step-item bg-gray-50 border border-gray-200 rounded p-2">
                <div class="flex items-start gap-2">
                  <span class="text-sm font-medium text-gray-500 mt-1">{index + 1}.</span>
                  <div class="flex-1">
                    <input
                      type="text"
                      bind:value={step.description}
                      placeholder="Step description (e.g., 'Choose accept quest')"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      bind:value={step.choiceText}
                      placeholder="Choice text (optional)"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                    />
                  </div>
                  <button
                    class="p-1 text-red-600 hover:bg-red-50 rounded"
                    on:click={() => removeStep(index)}
                    title="Remove step"
                  >
                    ×
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex gap-2 pt-4 border-t border-gray-200">
        <button
          class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          on:click={saveScenario}
        >
          {editingScenario ? 'Update' : 'Create'} Scenario
        </button>
        <button
          class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          on:click={cancelEdit}
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- Results View -->
  {#if view === 'results'}
    <div class="results-view space-y-4 max-h-96 overflow-y-auto">
      {#each $scenarioList as scenario}
        {@const result = $scenarioResults.get(scenario.id)}
        {#if result}
          <div
            class="result-item border rounded p-3 {result.passed
              ? 'border-green-300 bg-green-50'
              : 'border-red-300 bg-red-50'}"
          >
            <div class="flex items-start justify-between mb-2">
              <h4 class="font-medium {result.passed ? 'text-green-800' : 'text-red-800'}">
                {result.passed ? '✓' : '✗'} {scenario.name}
              </h4>
              <span class="text-xs text-gray-600">{result.duration}ms</span>
            </div>

            {#if !result.passed && result.errors.length > 0}
              <div class="errors mt-2 space-y-1">
                {#each result.errors as error}
                  <p class="text-sm text-red-700">• {error}</p>
                {/each}
              </div>
            {/if}

            <div class="text-xs text-gray-600 mt-2">
              {result.stepResults.length} steps • {result.stepResults.filter((s) => s.passed)
                .length} passed
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .test-scenario-manager {
    min-height: 200px;
  }

  .scenario-list::-webkit-scrollbar,
  .scenario-form::-webkit-scrollbar,
  .results-view::-webkit-scrollbar {
    width: 6px;
  }

  .scenario-list::-webkit-scrollbar-track,
  .scenario-form::-webkit-scrollbar-track,
  .results-view::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .scenario-list::-webkit-scrollbar-thumb,
  .scenario-form::-webkit-scrollbar-thumb,
  .results-view::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
  }
</style>
