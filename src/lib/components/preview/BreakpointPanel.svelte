<script lang="ts">
  import { currentStory } from '../../stores/storyStateStore';
  import { breakpoints, playerActions } from '../../stores/playerStore';

  function removeBreakpoint(passageId: string) {
    playerActions.toggleBreakpoint(passageId);
  }

  function clearAllBreakpoints() {
    if (confirm('Clear all breakpoints?')) {
      $breakpoints.forEach(passageId => {
        playerActions.toggleBreakpoint(passageId);
      });
    }
  }

  $: breakpointList = Array.from($breakpoints)
    .map(passageId => ({
      id: passageId,
      passage: $currentStory?.getPassage(passageId),
    }))
    .filter(item => item.passage !== null);
</script>

<div class="breakpoint-panel">
  <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
    <span>🔴</span>
    <span>Breakpoints</span>
  </h4>

  {#if $breakpoints.size === 0}
    <div class="empty-state bg-gray-50 rounded p-3 text-xs text-gray-600">
      <p class="mb-2">No breakpoints set.</p>
      <p class="text-gray-500">
        Click the 🔴 button on passage nodes in the graph view to add breakpoints. The preview
        will pause when reaching these passages.
      </p>
    </div>
  {:else}
    <div class="breakpoint-list space-y-1 mb-3">
      {#each breakpointList as item}
        {#if item.passage}
          <div class="breakpoint-item bg-red-50 rounded px-2 py-2 flex items-center gap-2">
            <button
              class="flex-shrink-0 w-5 h-5 flex items-center justify-center text-red-600 hover:bg-red-200 rounded transition-colors"
              on:click={() => removeBreakpoint(item.id)}
              title="Remove breakpoint"
            >
              ×
            </button>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 truncate">
                {item.passage.title}
              </div>
              {#if item.passage.tags.length > 0}
                <div class="flex gap-1 mt-1">
                  {#each item.passage.tags.slice(0, 2) as tag}
                    <span class="text-xs px-1 py-0.5 bg-white rounded text-gray-600">
                      {tag}
                    </span>
                  {/each}
                  {#if item.passage.tags.length > 2}
                    <span class="text-xs text-gray-500">
                      +{item.passage.tags.length - 2}
                    </span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>

    <!-- Clear All Button -->
    <button
      class="w-full px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      on:click={clearAllBreakpoints}
      title="Clear all breakpoints"
    >
      Clear All
    </button>
  {/if}
</div>
