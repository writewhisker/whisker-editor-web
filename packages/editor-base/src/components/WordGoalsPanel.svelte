<script lang="ts">
  import { wordGoalStore, goals, selectedGoalId, activeGoals, type WordGoal, type GoalType } from '../stores/wordGoalStore';
  import { currentStory } from '../stores/storyStateStore';
  import { notificationStore } from '../stores/notificationStore';
  import type { Passage } from '@whisker/core-ts';
  import { onMount, onDestroy } from 'svelte';

  let showAddGoal = false;
  let formType: GoalType = 'daily';
  let formTarget = 500;
  let formStartDate = new Date().toISOString().split('T')[0];
  let formEndDate = '';

  // Calculate total word count
  $: totalWords = $currentStory
    ? (Array.from($currentStory.passages.values()) as Passage[])
        .reduce((sum, passage) => sum + (passage.content?.split(/\s+/).filter(w => w.length > 0).length || 0), 0)
    : 0;

  // Load goals when story loads
  $: if ($currentStory) {
    wordGoalStore.loadGoals($currentStory);
  }

  // Update progress when word count changes
  $: if ($currentStory && totalWords >= 0) {
    wordGoalStore.updateProgress($currentStory);
  }

  // Auto-save goals when they change
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  $: if ($currentStory && $goals) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if ($currentStory) {
        wordGoalStore.saveGoals($currentStory);
      }
    }, 500);
  }

  onDestroy(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
  });

  function addGoal() {
    if (!formTarget || formTarget <= 0) {
      notificationStore.error('Please enter a valid target word count');
      return;
    }

    const endDate = formEndDate || getDefaultEndDate(formType, formStartDate);

    wordGoalStore.addGoal({
      type: formType,
      target: formTarget,
      startDate: formStartDate,
      endDate,
    });

    notificationStore.success(`${capitalize(formType)} goal created`);
    showAddGoal = false;
    resetForm();
  }

  function getDefaultEndDate(type: GoalType, startDate: string): string {
    const start = new Date(startDate);
    switch (type) {
      case 'daily':
        start.setDate(start.getDate() + 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() + 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() + 1);
        break;
      case 'total':
        return ''; // No end date for total goals
    }
    return start.toISOString().split('T')[0];
  }

  function resetForm() {
    formType = 'daily';
    formTarget = 500;
    formStartDate = new Date().toISOString().split('T')[0];
    formEndDate = '';
  }

  function deleteGoal(id: string) {
    if (confirm('Delete this goal?')) {
      wordGoalStore.deleteGoal(id);
      notificationStore.success('Goal deleted');
    }
  }

  function getGoalStatus(goal: WordGoal): 'not_started' | 'in_progress' | 'completed' | 'exceeded' {
    return wordGoalStore.getGoalStatus(goal);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
      case 'exceeded': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  function getProgressPercentage(goal: WordGoal): number {
    return Math.min(100, Math.round((goal.current / goal.target) * 100));
  }

  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }

  function getTypeIcon(type: GoalType): string {
    switch (type) {
      case 'daily': return '📅';
      case 'weekly': return '📆';
      case 'monthly': return '🗓️';
      case 'total': return '🎯';
      default: return '📝';
    }
  }
</script>

<div class="word-goals-panel h-full flex flex-col bg-white dark:bg-gray-800">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Word Goals</h2>
      <button
        type="button"
        class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        on:click={() => showAddGoal = !showAddGoal}
        title="Add new goal"
      >
        {showAddGoal ? 'Cancel' : '+ New Goal'}
      </button>
    </div>

    <!-- Total Word Count -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
      <div class="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Words</div>
      <div class="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalWords.toLocaleString()}</div>
    </div>
  </div>

  <!-- Add Goal Form -->
  {#if showAddGoal}
    <div class="p-4 bg-blue-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">New Goal</h3>
      <div class="space-y-2">
        <div>
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Type</label>
          <select
            bind:value={formType}
            class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="total">Total (Project)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target Words</label>
          <input
            type="number"
            bind:value={formTarget}
            min="1"
            step="100"
            class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
          <input
            type="date"
            bind:value={formStartDate}
            class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        {#if formType !== 'total'}
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date (optional)</label>
            <input
              type="date"
              bind:value={formEndDate}
              class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        {/if}
        <button
          type="button"
          class="w-full px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          on:click={addGoal}
        >
          Create Goal
        </button>
      </div>
    </div>
  {/if}

  <!-- Goals List -->
  <div class="flex-1 overflow-y-auto p-4 space-y-3">
    {#if $goals.length === 0}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">No goals yet</p>
        <p class="text-xs mt-1">Create a goal to track your progress</p>
      </div>
    {:else}
      <!-- Active Goals -->
      {#if $activeGoals.length > 0}
        <div class="mb-4">
          <h3 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">ACTIVE GOALS</h3>
          {#each $activeGoals as goal (goal.id)}
            {@const status = getGoalStatus(goal)}
            {@const percentage = getProgressPercentage(goal)}
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 hover:border-blue-400 dark:hover:border-blue-500 transition-all bg-white dark:bg-gray-750">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2 flex-1">
                  <span class="text-xl">{getTypeIcon(goal.type)}</span>
                  <div>
                    <div class="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {capitalize(goal.type)} Goal
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">
                      {goal.current.toLocaleString()} / {goal.target.toLocaleString()} words
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <span class="px-2 py-0.5 text-xs rounded {getStatusColor(status)}">
                    {status.replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                    class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    on:click={() => deleteGoal(goal.id)}
                    title="Delete goal"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div
                  class="h-2 rounded-full transition-all duration-300 {
                    status === 'completed' || status === 'exceeded'
                      ? 'bg-green-500 dark:bg-green-600'
                      : 'bg-blue-500 dark:bg-blue-600'
                  }"
                  style="width: {percentage}%"
                ></div>
              </div>

              <!-- Dates -->
              <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Started: {formatDate(goal.startDate)}</span>
                {#if goal.endDate}
                  <span>Ends: {formatDate(goal.endDate)}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Inactive/Past Goals -->
      {@const inactiveGoals = $goals.filter(g => !$activeGoals.includes(g))}
      {#if inactiveGoals.length > 0}
        <div>
          <h3 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">PAST GOALS</h3>
          {#each inactiveGoals as goal (goal.id)}
            {@const status = getGoalStatus(goal)}
            {@const percentage = getProgressPercentage(goal)}
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 opacity-60 bg-white dark:bg-gray-750">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2 flex-1">
                  <span class="text-lg opacity-50">{getTypeIcon(goal.type)}</span>
                  <div>
                    <div class="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {capitalize(goal.type)} Goal
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">
                      {goal.current.toLocaleString()} / {goal.target.toLocaleString()} words
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <span class="px-2 py-0.5 text-xs rounded {getStatusColor(status)}">
                    {status.replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                    class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    on:click={() => deleteGoal(goal.id)}
                    title="Delete goal"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div
                  class="h-2 rounded-full bg-gray-400 dark:bg-gray-600"
                  style="width: {percentage}%"
                ></div>
              </div>

              <!-- Dates -->
              <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Started: {formatDate(goal.startDate)}</span>
                {#if goal.endDate}
                  <span>Ended: {formatDate(goal.endDate)}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .word-goals-panel {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
</style>
