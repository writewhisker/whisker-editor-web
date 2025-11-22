<script lang="ts">
  import { adaptiveDifficultyStore, metrics, adjustments, isEnabled, type PerformanceMetric, type DifficultyAdjustment, type MetricType, type AdjustmentType, type DifficultyLevel, type DifficultyThreshold } from '../stores/adaptiveDifficultyStore';

  let view: 'config' | 'metrics' | 'adjustments' | 'code' = 'config';

  // Form states
  let formMetricName = '';
  let formMetricType: MetricType = 'success_rate';
  let formMetricDescription = '';
  let formMetricCustomCode = '';
  let editingMetric: PerformanceMetric | null = null;

  let formAdjName = '';
  let formAdjDescription = '';
  let formAdjType: AdjustmentType = 'variable_modifier';
  let formAdjTargetLevel: DifficultyLevel = 'normal';
  let formAdjThresholds: DifficultyThreshold[] = [];
  let formAdjVariableName = '';
  let formAdjOperation: 'multiply' | 'add' | 'set' = 'multiply';
  let formAdjValue = 1;
  let editingAdjustment: DifficultyAdjustment | null = null;

  let updateFrequency = 5;
  let smoothingFactor = 0.3;

  // Subscribe to config values
  adaptiveDifficultyStore.subscribe(config => {
    updateFrequency = config.updateFrequency;
    smoothingFactor = config.smoothingFactor;
  });

  // Metric functions
  function startEditMetric(metric: PerformanceMetric) {
    editingMetric = metric;
    formMetricName = metric.name;
    formMetricType = metric.type;
    formMetricDescription = metric.description;
    formMetricCustomCode = metric.customCode || '';
    view = 'metrics';
  }

  function saveMetric() {
    if (!formMetricName.trim()) return;

    const metricData = {
      name: formMetricName,
      type: formMetricType,
      description: formMetricDescription,
      ...(formMetricType === 'custom' ? { customCode: formMetricCustomCode } : {}),
    };

    if (editingMetric) {
      adaptiveDifficultyStore.updateMetric(editingMetric.id, metricData);
    } else {
      adaptiveDifficultyStore.addMetric(metricData);
    }

    resetMetricForm();
  }

  function resetMetricForm() {
    editingMetric = null;
    formMetricName = '';
    formMetricType = 'success_rate';
    formMetricDescription = '';
    formMetricCustomCode = '';
  }

  function deleteMetric(id: string) {
    adaptiveDifficultyStore.deleteMetric(id);
  }

  // Adjustment functions
  function startEditAdjustment(adjustment: DifficultyAdjustment) {
    editingAdjustment = adjustment;
    formAdjName = adjustment.name;
    formAdjDescription = adjustment.description;
    formAdjType = adjustment.type;
    formAdjTargetLevel = adjustment.targetLevel;
    formAdjThresholds = [...adjustment.thresholds];

    if (adjustment.variableModifier) {
      formAdjVariableName = adjustment.variableModifier.variableName;
      formAdjOperation = adjustment.variableModifier.operation;
      formAdjValue = adjustment.variableModifier.value;
    }

    view = 'adjustments';
  }

  function saveAdjustment() {
    if (!formAdjName.trim() || formAdjThresholds.length === 0) return;

    const adjustmentData: Omit<DifficultyAdjustment, 'id'> = {
      name: formAdjName,
      description: formAdjDescription,
      type: formAdjType,
      targetLevel: formAdjTargetLevel,
      thresholds: formAdjThresholds,
    };

    if (formAdjType === 'variable_modifier') {
      adjustmentData.variableModifier = {
        variableName: formAdjVariableName,
        operation: formAdjOperation,
        value: formAdjValue,
      };
    }

    if (editingAdjustment) {
      adaptiveDifficultyStore.updateAdjustment(editingAdjustment.id, adjustmentData);
    } else {
      adaptiveDifficultyStore.addAdjustment(adjustmentData);
    }

    resetAdjustmentForm();
  }

  function resetAdjustmentForm() {
    editingAdjustment = null;
    formAdjName = '';
    formAdjDescription = '';
    formAdjType = 'variable_modifier';
    formAdjTargetLevel = 'normal';
    formAdjThresholds = [];
    formAdjVariableName = '';
    formAdjOperation = 'multiply';
    formAdjValue = 1;
  }

  function deleteAdjustment(id: string) {
    adaptiveDifficultyStore.deleteAdjustment(id);
  }

  function addThreshold() {
    if ($metrics.length === 0) return;

    formAdjThresholds = [
      ...formAdjThresholds,
      {
        metricId: $metrics[0].id,
        condition: 'below',
        value: 0.5,
        duration: 5,
      },
    ];
  }

  function removeThreshold(index: number) {
    formAdjThresholds = formAdjThresholds.filter((_, i) => i !== index);
  }

  // Code generation
  let generatedCode: ReturnType<typeof adaptiveDifficultyStore.generateCode> | null = null;
  let copiedSection: string | null = null;

  function generateCode() {
    generatedCode = adaptiveDifficultyStore.generateCode();
    view = 'code';
  }

  function copyCode(section: string, code: string) {
    navigator.clipboard.writeText(code);
    copiedSection = section;
    setTimeout(() => { copiedSection = null; }, 2000);
  }

  function downloadCode() {
    if (!generatedCode) return;

    const fullCode = `
${generatedCode.types}

${generatedCode.metricsCode}

${generatedCode.evaluationCode}

${generatedCode.adjustmentCode}

${generatedCode.utilityCode}
`.trim();

    const blob = new Blob([fullCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adaptive-difficulty.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getDifficultyColor(level: DifficultyLevel): string {
    switch (level) {
      case 'very_easy': return 'text-green-600 dark:text-green-400';
      case 'easy': return 'text-green-500 dark:text-green-300';
      case 'normal': return 'text-gray-600 dark:text-gray-400';
      case 'hard': return 'text-orange-500 dark:text-orange-400';
      case 'very_hard': return 'text-red-600 dark:text-red-400';
    }
  }
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-800">
  <!-- Header -->
  <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-3">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Adaptive Difficulty</h2>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Dynamic difficulty adjustment system</p>
  </div>

  <!-- View Tabs -->
  <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
    <div class="flex gap-2 p-2">
      <button
        class="px-3 py-1.5 text-xs rounded {view === 'config' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
        on:click={() => { view = 'config'; resetMetricForm(); resetAdjustmentForm(); }}
      >
        Configuration
      </button>
      <button
        class="px-3 py-1.5 text-xs rounded {view === 'metrics' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
        on:click={() => { view = 'metrics'; resetAdjustmentForm(); }}
      >
        Metrics ({$metrics.length})
      </button>
      <button
        class="px-3 py-1.5 text-xs rounded {view === 'adjustments' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
        on:click={() => { view = 'adjustments'; resetMetricForm(); }}
      >
        Adjustments ({$adjustments.length})
      </button>
      <button
        class="px-3 py-1.5 text-xs rounded {view === 'code' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
        on:click={generateCode}
      >
        Generate Code
      </button>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-3 space-y-3">
    {#if view === 'config'}
      <!-- Configuration View -->
      <div class="space-y-4">
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded">
          <div>
            <div class="font-medium text-sm">Enable Adaptive Difficulty</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Dynamically adjust difficulty based on player performance</div>
          </div>
          <button
            class="px-3 py-1 text-xs rounded {$isEnabled ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}"
            on:click={() => adaptiveDifficultyStore.setEnabled(!$isEnabled)}
          >
            {$isEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div>
          <label for="update-frequency" class="block text-sm font-medium mb-2">Update Frequency</label>
          <div class="flex items-center gap-2">
            <input
              id="update-frequency"
              type="range"
              min="1"
              max="20"
              bind:value={updateFrequency}
              on:change={() => adaptiveDifficultyStore.setUpdateFrequency(updateFrequency)}
              class="flex-1"
            />
            <span class="text-sm text-gray-600 dark:text-gray-400 w-24">{updateFrequency} passages</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Check and adjust difficulty every N passages</p>
        </div>

        <div>
          <label for="smoothing-factor" class="block text-sm font-medium mb-2">Smoothing Factor</label>
          <div class="flex items-center gap-2">
            <input
              id="smoothing-factor"
              type="range"
              min="0"
              max="100"
              bind:value={smoothingFactor}
              on:change={() => adaptiveDifficultyStore.setSmoothingFactor(smoothingFactor / 100)}
              class="flex-1"
            />
            <span class="text-sm text-gray-600 dark:text-gray-400 w-16">{(smoothingFactor * 100).toFixed(0)}%</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">How quickly to adjust (0 = slow, 100 = instant)</p>
        </div>

        <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div class="text-sm font-medium mb-2">Quick Stats</div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="p-2 bg-gray-50 dark:bg-gray-900 rounded">
              <div class="text-gray-500 dark:text-gray-400">Metrics Defined</div>
              <div class="text-lg font-semibold">{$metrics.length}</div>
            </div>
            <div class="p-2 bg-gray-50 dark:bg-gray-900 rounded">
              <div class="text-gray-500 dark:text-gray-400">Adjustments</div>
              <div class="text-lg font-semibold">{$adjustments.length}</div>
            </div>
          </div>
        </div>
      </div>

    {:else if view === 'metrics'}
      <!-- Metrics View -->
      <div class="space-y-3">
        {#if !editingMetric}
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium">Performance Metrics</h3>
            <button
              class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              on:click={() => { editingMetric = {} as PerformanceMetric; }}
            >
              + Add Metric
            </button>
          </div>

          {#if $metrics.length === 0}
            <div class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              No metrics defined. Add metrics to track player performance.
            </div>
          {:else}
            <div class="space-y-2">
              {#each $metrics as metric}
                <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="font-medium text-sm">{metric.name}</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{metric.description}</div>
                      <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Type: <span class="font-mono">{metric.type}</span>
                      </div>
                    </div>
                    <div class="flex gap-1">
                      <button
                        class="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                        on:click={() => startEditMetric(metric)}
                      >
                        Edit
                      </button>
                      <button
                        class="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                        on:click={() => deleteMetric(metric.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          <!-- Edit Metric Form -->
          <div class="space-y-3">
            <h3 class="text-sm font-medium">{editingMetric.id ? 'Edit' : 'Add'} Metric</h3>

            <div>
              <label for="metric-name" class="block text-sm font-medium mb-1">Name *</label>
              <input
                id="metric-name"
                type="text"
                bind:value={formMetricName}
                placeholder="Success Rate"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label for="metric-type" class="block text-sm font-medium mb-1">Type</label>
              <select
                id="metric-type"
                bind:value={formMetricType}
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="success_rate">Success Rate</option>
                <option value="time_spent">Time Spent</option>
                <option value="retry_count">Retry Count</option>
                <option value="hint_usage">Hint Usage</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label for="metric-description" class="block text-sm font-medium mb-1">Description</label>
              <textarea
                id="metric-description"
                bind:value={formMetricDescription}
                rows="2"
                placeholder="Describe what this metric measures..."
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              ></textarea>
            </div>

            {#if formMetricType === 'custom'}
              <div>
                <label for="metric-custom-code" class="block text-sm font-medium mb-1">Custom Code</label>
                <textarea
                  id="metric-custom-code"
                  bind:value={formMetricCustomCode}
                  rows="4"
                  placeholder="// Code to calculate metric value\nreturn value;"
                  class="w-full px-2 py-1 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                ></textarea>
              </div>
            {/if}

            <div class="flex gap-2">
              <button
                class="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                on:click={saveMetric}
              >
                Save
              </button>
              <button
                class="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                on:click={resetMetricForm}
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      </div>

    {:else if view === 'adjustments'}
      <!-- Adjustments View -->
      <div class="space-y-3">
        {#if !editingAdjustment}
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium">Difficulty Adjustments</h3>
            <button
              class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              on:click={() => { editingAdjustment = {} as DifficultyAdjustment; }}
            >
              + Add Adjustment
            </button>
          </div>

          {#if $adjustments.length === 0}
            <div class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              No adjustments defined. Add adjustments to modify difficulty.
            </div>
          {:else}
            <div class="space-y-2">
              {#each $adjustments as adjustment}
                <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <div class="font-medium text-sm">{adjustment.name}</div>
                        <span class="text-xs px-1.5 py-0.5 rounded {getDifficultyColor(adjustment.targetLevel)} bg-gray-100 dark:bg-gray-800">
                          {adjustment.targetLevel.replace('_', ' ')}
                        </span>
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{adjustment.description}</div>
                      <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Thresholds: {adjustment.thresholds.length}
                      </div>
                    </div>
                    <div class="flex gap-1">
                      <button
                        class="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                        on:click={() => startEditAdjustment(adjustment)}
                      >
                        Edit
                      </button>
                      <button
                        class="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                        on:click={() => deleteAdjustment(adjustment.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          <!-- Edit Adjustment Form -->
          <div class="space-y-3">
            <h3 class="text-sm font-medium">{editingAdjustment.id ? 'Edit' : 'Add'} Adjustment</h3>

            <div>
              <label for="adj-name" class="block text-sm font-medium mb-1">Name *</label>
              <input
                id="adj-name"
                type="text"
                bind:value={formAdjName}
                placeholder="Make easier for struggling players"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label for="adj-description" class="block text-sm font-medium mb-1">Description</label>
              <textarea
                id="adj-description"
                bind:value={formAdjDescription}
                rows="2"
                placeholder="Describe what this adjustment does..."
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="adj-type" class="block text-sm font-medium mb-1">Type</label>
                <select
                  id="adj-type"
                  bind:value={formAdjType}
                  class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                >
                  <option value="variable_modifier">Variable Modifier</option>
                  <option value="content_swap">Content Swap</option>
                  <option value="hint_availability">Hint Availability</option>
                  <option value="timer_adjustment">Timer Adjustment</option>
                </select>
              </div>

              <div>
                <label for="adj-target-level" class="block text-sm font-medium mb-1">Target Level</label>
                <select
                  id="adj-target-level"
                  bind:value={formAdjTargetLevel}
                  class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                >
                  <option value="very_easy">Very Easy</option>
                  <option value="easy">Easy</option>
                  <option value="hard">Normal</option>
                  <option value="hard">Hard</option>
                  <option value="very_hard">Very Hard</option>
                </select>
              </div>
            </div>

            {#if formAdjType === 'variable_modifier'}
              <div class="grid grid-cols-3 gap-2">
                <div class="col-span-2">
                  <label for="adj-variable" class="block text-sm font-medium mb-1">Variable</label>
                  <input
                    id="adj-variable"
                    type="text"
                    bind:value={formAdjVariableName}
                    placeholder="playerHealth"
                    class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label for="adj-operation" class="block text-sm font-medium mb-1">Operation</label>
                  <select
                    id="adj-operation"
                    bind:value={formAdjOperation}
                    class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  >
                    <option value="multiply">×</option>
                    <option value="add">+</option>
                    <option value="set">=</option>
                  </select>
                </div>
              </div>
              <div>
                <label for="adj-value" class="block text-sm font-medium mb-1">Value</label>
                <input
                  id="adj-value"
                  type="number"
                  step="0.1"
                  bind:value={formAdjValue}
                  class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
              </div>
            {/if}

            <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div class="flex justify-between items-center mb-2">
                <div class="block text-sm font-medium">Thresholds *</div>
                <button
                  class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  on:click={addThreshold}
                >
                  + Add
                </button>
              </div>

              {#if formAdjThresholds.length === 0}
                <div class="text-xs text-gray-500 dark:text-gray-400 italic">
                  Add at least one threshold condition
                </div>
              {:else}
                <div class="space-y-2">
                  {#each formAdjThresholds as threshold, i}
                    <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                      <div class="grid grid-cols-4 gap-2 mb-2">
                        <div class="col-span-2">
                          <select
                            bind:value={threshold.metricId}
                            class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          >
                            {#each $metrics as metric}
                              <option value={metric.id}>{metric.name}</option>
                            {/each}
                          </select>
                        </div>
                        <div>
                          <select
                            bind:value={threshold.condition}
                            class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          >
                            <option value="above">Above</option>
                            <option value="below">Below</option>
                            <option value="equals">Equals</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.1"
                            bind:value={threshold.value}
                            class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          />
                        </div>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-500 dark:text-gray-400">Over {threshold.duration} passages</span>
                        <button
                          class="px-2 py-0.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                          on:click={() => removeThreshold(i)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <div class="flex gap-2">
              <button
                class="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                on:click={saveAdjustment}
              >
                Save
              </button>
              <button
                class="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                on:click={resetAdjustmentForm}
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      </div>

    {:else if view === 'code'}
      <!-- Code View -->
      {#if generatedCode}
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium">Generated Code</h3>
            <button
              class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              on:click={downloadCode}
            >
              Download All
            </button>
          </div>

          <!-- Types -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <div class="text-xs font-medium text-gray-700 dark:text-gray-300">Type Definitions</div>
              <button
                class="px-2 py-0.5 text-xs {copiedSection === 'types' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'} text-white rounded"
                on:click={() => generatedCode && copyCode('types', generatedCode.types)}
              >
                {copiedSection === 'types' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto"><code>{generatedCode.types}</code></pre>
          </div>

          <!-- Metrics -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <div class="text-xs font-medium text-gray-700 dark:text-gray-300">Metrics Tracker</div>
              <button
                class="px-2 py-0.5 text-xs {copiedSection === 'metrics' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'} text-white rounded"
                on:click={() => generatedCode && copyCode('metrics', generatedCode.metricsCode)}
              >
                {copiedSection === 'metrics' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto max-h-64"><code>{generatedCode.metricsCode}</code></pre>
          </div>

          <!-- Evaluation -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <div class="text-xs font-medium text-gray-700 dark:text-gray-300">Difficulty Evaluation</div>
              <button
                class="px-2 py-0.5 text-xs {copiedSection === 'eval' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'} text-white rounded"
                on:click={() => generatedCode && copyCode('eval', generatedCode.evaluationCode)}
              >
                {copiedSection === 'eval' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto max-h-64"><code>{generatedCode.evaluationCode}</code></pre>
          </div>

          <!-- Adjustments -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <div class="text-xs font-medium text-gray-700 dark:text-gray-300">Adjustment Application</div>
              <button
                class="px-2 py-0.5 text-xs {copiedSection === 'adj' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'} text-white rounded"
                on:click={() => generatedCode && copyCode('adj', generatedCode.adjustmentCode)}
              >
                {copiedSection === 'adj' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto max-h-64"><code>{generatedCode.adjustmentCode}</code></pre>
          </div>

          <!-- Utility -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <div class="text-xs font-medium text-gray-700 dark:text-gray-300">Difficulty Manager</div>
              <button
                class="px-2 py-0.5 text-xs {copiedSection === 'util' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'} text-white rounded"
                on:click={() => generatedCode && copyCode('util', generatedCode.utilityCode)}
              >
                {copiedSection === 'util' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto max-h-64"><code>{generatedCode.utilityCode}</code></pre>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
