<script lang="ts">
  import { currentStory, passageList, variableList } from '../stores/projectStore';
</script>

<div class="bg-gray-800 text-white text-xs h-6 flex items-center px-4 gap-4 border-t border-gray-700">
  {#if $currentStory}
    <div class="flex items-center gap-1">
      <span class="text-gray-400">Passages:</span>
      <span class="font-semibold">{$passageList.length}</span>
    </div>

    <div class="flex items-center gap-1">
      <span class="text-gray-400">Variables:</span>
      <span class="font-semibold">{$variableList.length}</span>
    </div>

    <div class="flex items-center gap-1">
      <span class="text-gray-400">Start:</span>
      <span class="font-semibold">
        {$currentStory.passages.get($currentStory.startPassage)?.title || 'None'}
      </span>
    </div>

    <div class="flex-1"></div>

    <div class="text-gray-400">
      Modified: {new Date($currentStory.metadata.modified).toLocaleString()}
    </div>
  {:else}
    <div class="text-gray-400 italic">
      Ready to create or open a project
    </div>
  {/if}
</div>
