<script lang="ts">
  import { currentStory } from '../stores/storyStateStore';
  import { selectedPassageId } from '../stores/selectionStore';
  import type { Passage } from '@writewhisker/core-ts';

  // Calculate breadcrumb trail from start passage to selected passage
  $: breadcrumbTrail = calculateBreadcrumb($currentStory, $selectedPassageId);

  function calculateBreadcrumb(story: typeof $currentStory, selectedId: string | null): Passage[] {
    if (!story || !selectedId) return [];

    const selected = story.getPassage(selectedId);
    if (!selected) return [];

    // If selected is the start passage, just return it
    if (story.startPassage === selectedId) {
      return [selected];
    }

    // Find shortest path from start to selected using BFS
    const startId = story.startPassage;
    if (!startId) return [selected];

    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (id === selectedId) {
        // Found the path! Return passages in order
        return path.map(pid => story.getPassage(pid)!).filter(Boolean);
      }

      if (visited.has(id)) continue;
      visited.add(id);

      const passage = story.getPassage(id);
      if (!passage) continue;

      // Add all targets to queue
      for (const choice of passage.choices) {
        if (choice.target && !visited.has(choice.target)) {
          queue.push({
            id: choice.target,
            path: [...path, choice.target],
          });
        }
      }
    }

    // No path found from start, just return selected
    return [selected];
  }

  function navigateToPassage(passageId: string) {
    selectedPassageId.set(passageId);
  }
</script>

{#if breadcrumbTrail.length > 0}
  <div class="bg-gray-50 border-b border-gray-300 px-4 py-2 flex items-center gap-2 text-sm overflow-x-auto">
    <span class="text-gray-500 flex-shrink-0">📍 Path:</span>
    {#each breadcrumbTrail as passage, index}
      {#if index > 0}
        <span class="text-gray-400">→</span>
      {/if}
      <button
        class="px-2 py-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0 {passage.id === $selectedPassageId ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}"
        on:click={() => navigateToPassage(passage.id)}
        title={passage.title}
      >
        {#if index === 0}
          <span class="mr-1">🏠</span>
        {/if}
        {passage.title}
      </button>
    {/each}
    {#if breadcrumbTrail.length > 1}
      <span class="text-gray-400 ml-2 flex-shrink-0">({breadcrumbTrail.length} {breadcrumbTrail.length === 1 ? 'passage' : 'passages'})</span>
    {/if}
  </div>
{/if}
