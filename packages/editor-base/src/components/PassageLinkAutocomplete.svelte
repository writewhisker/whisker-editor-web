<script lang="ts">
  import type { Passage } from '@writewhisker/core-ts';
  import { createEventDispatcher, onMount } from 'svelte';

  export let passages: Passage[] = [];
  export let query: string = '';
  export let position: { top: number; left: number } = { top: 0, left: 0 };
  export let visible: boolean = false;

  const dispatch = createEventDispatcher<{
    select: { title: string };
    close: void;
  }>();

  let selectedIndex = 0;

  $: filteredPassages = passages
    .filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      // Prioritize exact starts
      const aStarts = a.title.toLowerCase().startsWith(query.toLowerCase());
      const bStarts = b.title.toLowerCase().startsWith(query.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      // Then alphabetical
      return a.title.localeCompare(b.title);
    })
    .slice(0, 10); // Limit to 10 results

  // Reset selected index when filtered list changes
  $: if (filteredPassages.length > 0 && selectedIndex >= filteredPassages.length) {
    selectedIndex = 0;
  }

  // Highlight matching text
  function highlightMatch(text: string, query: string): string {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  }

  function selectPassage(index: number) {
    if (index >= 0 && index < filteredPassages.length) {
      dispatch('select', { title: filteredPassages[index].title });
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!visible || filteredPassages.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % filteredPassages.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = (selectedIndex - 1 + filteredPassages.length) % filteredPassages.length;
        break;
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        selectPassage(selectedIndex);
        break;
      case 'Escape':
        event.preventDefault();
        dispatch('close');
        break;
    }
  }

  // Scroll selected item into view
  function scrollToSelected(node: HTMLElement, selected: boolean) {
    if (selected && node.scrollIntoView) {
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // Handle clicks outside
  function handleClickOutside(event: MouseEvent) {
    if (visible) {
      const target = event.target as HTMLElement;
      const dropdown = document.getElementById('passage-autocomplete-dropdown');
      if (dropdown && !dropdown.contains(target)) {
        dispatch('close');
      }
    }
  }

  // Add global keyboard and click listeners when visible
  $: {
    if (typeof window !== 'undefined') {
      if (visible) {
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('click', handleClickOutside);
      } else {
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('click', handleClickOutside);
      }
    }
  }

  // Cleanup on unmount
  onMount(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('click', handleClickOutside);
      }
    };
  });
</script>

{#if visible && filteredPassages.length > 0}
  <div
    id="passage-autocomplete-dropdown"
    class="fixed z-50 bg-white border border-gray-300 rounded shadow-lg max-h-64 overflow-y-auto"
    style="top: {position.top}px; left: {position.left}px; min-width: 300px; max-width: 500px;"
  >
    <ul class="py-1">
      {#each filteredPassages as passage, index (passage.id)}
        <li
          use:scrollToSelected={index === selectedIndex}
          class="px-3 py-2 cursor-pointer transition-colors {index === selectedIndex ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}"
          on:mouseenter={() => selectedIndex = index}
          on:click|preventDefault={() => selectPassage(index)}
          role="option"
          aria-selected={index === selectedIndex}
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">
                {@html highlightMatch(passage.title, query)}
              </div>
              {#if passage.tags.length > 0}
                <div class="text-xs opacity-75 mt-0.5 flex gap-1 flex-wrap">
                  {#each passage.tags.slice(0, 3) as tag}
                    <span class="px-1 py-0.5 bg-gray-200 {index === selectedIndex ? 'bg-white bg-opacity-20' : ''} rounded">
                      {tag}
                    </span>
                  {/each}
                  {#if passage.tags.length > 3}
                    <span class="px-1 py-0.5">+{passage.tags.length - 3}</span>
                  {/if}
                </div>
              {/if}
            </div>
            <div class="text-xs opacity-75 whitespace-nowrap">
              {passage.content.length} chars
            </div>
          </div>
        </li>
      {/each}
    </ul>
  </div>
{:else if visible && query}
  <div
    id="passage-autocomplete-dropdown"
    class="fixed z-50 bg-white border border-gray-300 rounded shadow-lg"
    style="top: {position.top}px; left: {position.left}px; min-width: 300px;"
  >
    <div class="px-3 py-2 text-sm text-gray-500">
      No passages found matching "{query}"
    </div>
  </div>
{/if}

<style>
  mark {
    background-color: rgb(254 249 195);
    font-weight: 600;
  }

  [aria-selected="true"] mark {
    background-color: rgba(255, 255, 255, 0.3);
    font-weight: 600;
  }
</style>
