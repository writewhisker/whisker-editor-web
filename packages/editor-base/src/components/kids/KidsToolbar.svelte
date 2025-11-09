<script lang="ts">
  /**
   * Kids Toolbar
   *
   * Simplified, colorful toolbar with large buttons for common actions.
   */

  import { viewMode, viewPreferencesActions } from '../../stores/viewPreferencesStore';
  import { currentStory } from '../../stores/storyStateStore';

  // View mode friendly names
  const viewModes = [
    { id: 'list' as const, label: 'Page List', icon: '📄', color: 'purple' },
    { id: 'graph' as const, label: 'Story Map', icon: '🗺️', color: 'blue' },
    { id: 'preview' as const, label: 'Play Story', icon: '🎮', color: 'green' },
  ];

  function setViewMode(mode: 'list' | 'graph' | 'preview') {
    viewPreferencesActions.setViewMode(mode);
  }
</script>

<div class="kids-toolbar flex items-center justify-between px-6 py-4 border-b-4 border-cyan-600">
  <!-- View Mode Switcher -->
  <div class="flex items-center gap-4">
    <span class="text-xl font-bold text-white">View:</span>
    <div class="flex gap-3">
      {#each viewModes as mode}
        <button
          type="button"
          class="px-6 py-3 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-2
            {$viewMode === mode.id
              ? `bg-${mode.color}-600 text-white border-4 border-${mode.color}-800`
              : 'bg-white text-gray-700 hover:bg-gray-100 border-4 border-gray-300'}"
          on:click={() => setViewMode(mode.id)}
        >
          <span class="text-2xl">{mode.icon}</span>
          {mode.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="flex items-center gap-3">
    <button
      type="button"
      class="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
      title="Add a new story page"
    >
      <span class="text-2xl">➕</span>
      Add Page
    </button>

    <button
      type="button"
      class="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-bold text-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
      title="Share your story"
    >
      <span class="text-2xl">🎁</span>
      Share
    </button>
  </div>
</div>

<style>
  /* Dynamic color classes - Tailwind will purge unused ones */
  .bg-purple-600 { background-color: rgb(147 51 234); }
  .bg-blue-600 { background-color: rgb(37 99 235); }
  .bg-green-600 { background-color: rgb(22 163 74); }
  .border-purple-800 { border-color: rgb(107 33 168); }
  .border-blue-800 { border-color: rgb(30 64 175); }
  .border-green-800 { border-color: rgb(22 101 52); }
</style>
