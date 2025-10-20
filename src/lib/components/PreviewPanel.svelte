<script lang="ts">
  import { currentStory, selectedPassageId } from '../stores/projectStore';
  import {
    playerActions,
    isPlayerActive,
    isPlayerPaused,
    currentPreviewPassage,
    availableChoices,
    debugMode,
    playthroughDuration,
  } from '../stores/playerStore';
  import VariableInspector from './preview/VariableInspector.svelte';
  import HistoryPanel from './preview/HistoryPanel.svelte';
  import BreakpointPanel from './preview/BreakpointPanel.svelte';
  import TestScenarioManager from './preview/TestScenarioManager.svelte';

  // Load story when it changes
  $: if ($currentStory) {
    playerActions.loadStory($currentStory);
  }

  // Process passage content with variable substitution
  $: processedContent = $currentPreviewPassage
    ? processContent($currentPreviewPassage.content)
    : '';

  function processContent(content: string): string {
    if (!content) return '';

    // Replace {{variable}} with actual values
    let processed = content.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const value = playerActions.getVariable(varName.trim());
      return value !== undefined ? String(value) : match;
    });

    // Convert line breaks to <br>
    processed = processed.replace(/\n/g, '<br>');

    return processed;
  }

  function startFromBeginning() {
    playerActions.start();
  }

  function startFromSelected() {
    if ($selectedPassageId) {
      playerActions.start($selectedPassageId);
    } else {
      startFromBeginning();
    }
  }

  function restart() {
    playerActions.restart();
  }

  function undo() {
    playerActions.undo();
  }

  function stop() {
    playerActions.stop();
  }

  function togglePause() {
    playerActions.togglePause();
  }

  function toggleDebug() {
    playerActions.toggleDebugMode();
  }

  function makeChoice(choiceId: string) {
    playerActions.makeChoice(choiceId);
  }

  function canMakeChoice(choice: any): boolean {
    // Choice is available if it has no condition or the player says it's available
    return $availableChoices.some(c => c.id === choice.id);
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
</script>

<div class="preview-panel flex flex-col h-full bg-gray-50">
  <!-- Toolbar -->
  <div class="toolbar bg-white border-b border-gray-300 px-4 py-2 flex items-center gap-2 flex-wrap">
    {#if !$isPlayerActive}
      <button
        class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        on:click={startFromBeginning}
        disabled={!$currentStory}
        title="Start from beginning"
      >
        ▶️ Play
      </button>
      <button
        class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        on:click={startFromSelected}
        disabled={!$selectedPassageId}
        title="Start from selected passage"
      >
        ▶️ From Selected
      </button>
    {:else}
      <button
        class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        on:click={stop}
        title="Stop preview"
      >
        ⏹️ Stop
      </button>
      <button
        class="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
        on:click={restart}
        title="Restart from beginning"
      >
        🔄 Restart
      </button>
      <button
        class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        on:click={undo}
        title="Undo last choice"
      >
        ↩️ Undo
      </button>
      <button
        class="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        on:click={togglePause}
        title={$isPlayerPaused ? 'Resume' : 'Pause'}
      >
        {$isPlayerPaused ? '▶️ Resume' : '⏸️ Pause'}
      </button>
    {/if}

    <div class="border-l border-gray-300 h-6 mx-2"></div>

    <button
      class="px-3 py-1 text-sm rounded transition-colors {$debugMode ? 'bg-purple-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}"
      on:click={toggleDebug}
      title="Toggle debug mode"
    >
      🐛 Debug {$debugMode ? 'On' : 'Off'}
    </button>

    {#if $isPlayerActive}
      <div class="ml-auto flex items-center gap-2 text-sm text-gray-600">
        <span class="font-medium">Duration:</span>
        <span class="font-mono">{formatDuration($playthroughDuration)}</span>
      </div>
    {/if}
  </div>

  <!-- Main Content Area -->
  <div class="flex-1 overflow-hidden flex">
    <!-- Content Panel -->
    <div class="flex-1 flex flex-col overflow-hidden">
      {#if !$isPlayerActive}
        <!-- Welcome Screen -->
        <div class="flex-1 flex items-center justify-center text-gray-400">
          <div class="text-center max-w-md">
            <div class="text-6xl mb-4">🎮</div>
            <h2 class="text-2xl font-bold mb-4 text-gray-700">Preview & Test</h2>
            <p class="mb-6">
              Test your story by playing through it in the editor. Use debug mode to inspect
              variables and track your playthrough.
            </p>
            <div class="flex gap-4 justify-center">
              <button
                class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-lg"
                on:click={startFromBeginning}
                disabled={!$currentStory}
              >
                ▶️ Start Preview
              </button>
              {#if $selectedPassageId}
                <button
                  class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
                  on:click={startFromSelected}
                >
                  ▶️ Start from Selected
                </button>
              {/if}
            </div>
          </div>
        </div>
      {:else if $isPlayerPaused}
        <!-- Paused State -->
        <div class="flex-1 flex items-center justify-center bg-yellow-50">
          <div class="text-center">
            <div class="text-6xl mb-4">⏸️</div>
            <h2 class="text-2xl font-bold mb-4 text-gray-700">Paused</h2>
            <p class="mb-6 text-gray-600">
              {#if $currentPreviewPassage}
                Breakpoint hit: <strong>{$currentPreviewPassage.title}</strong>
              {:else}
                Preview paused
              {/if}
            </p>
            <button
              class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-lg"
              on:click={togglePause}
            >
              ▶️ Continue
            </button>
          </div>
        </div>
      {:else if $currentPreviewPassage}
        <!-- Active Playthrough -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Passage Display -->
          <div class="passage-display bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">
              {$currentPreviewPassage.title}
            </h2>
            {#if $currentPreviewPassage.tags.length > 0}
              <div class="flex gap-2 mb-4">
                {#each $currentPreviewPassage.tags as tag}
                  <span class="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">
                    {tag}
                  </span>
                {/each}
              </div>
            {/if}
            <div class="content text-gray-700 leading-relaxed">
              {@html processedContent}
            </div>
          </div>

          <!-- Choices -->
          {#if $availableChoices.length > 0}
            <div class="choices-container">
              <h3 class="text-lg font-semibold text-gray-700 mb-3">Choose:</h3>
              <div class="flex flex-col gap-2">
                {#each $currentPreviewPassage.choices as choice}
                  {@const isAvailable = canMakeChoice(choice)}
                  <button
                    class="choice-button text-left px-4 py-3 rounded-lg transition-all {isAvailable
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
                    on:click={() => makeChoice(choice.id)}
                    disabled={!isAvailable}
                  >
                    <span class="flex items-center gap-2">
                      <span class="flex-1">{choice.text}</span>
                      {#if choice.condition}
                        <span class="text-xs px-2 py-1 rounded {isAvailable ? 'bg-blue-600' : 'bg-gray-400'}">
                          ⚡ Conditional
                        </span>
                      {/if}
                    </span>
                  </button>
                {/each}
              </div>
            </div>
          {:else}
            <!-- No choices - end of story -->
            <div class="text-center py-8">
              <div class="text-6xl mb-4">🏁</div>
              <h3 class="text-2xl font-bold text-gray-700 mb-2">The End</h3>
              <p class="text-gray-600 mb-6">You've reached the end of this path</p>
              <button
                class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
                on:click={restart}
              >
                🔄 Play Again
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Debug Sidebar -->
    {#if $debugMode && $isPlayerActive}
      <div class="w-80 flex-shrink-0 border-l border-gray-300 bg-white overflow-y-auto">
        <div class="p-4">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Debug Tools</h3>

          <!-- Variable Inspector -->
          <div class="mb-6">
            <VariableInspector />
          </div>

          <!-- History Panel -->
          <div class="mb-6">
            <HistoryPanel />
          </div>

          <!-- Breakpoint Panel -->
          <div class="mb-6">
            <BreakpointPanel />
          </div>
        </div>
      </div>
    {/if}

    <!-- Test Scenarios Panel (always visible when not playing) -->
    {#if !$isPlayerActive}
      <div class="w-96 flex-shrink-0 border-l border-gray-300 bg-white overflow-y-auto">
        <div class="p-4">
          <TestScenarioManager />
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .passage-display :global(br) {
    display: block;
    margin: 0.5em 0;
    content: '';
  }
</style>
