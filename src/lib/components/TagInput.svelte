<script lang="ts">
  import { tagRegistry, tagActions } from '../stores/tagStore';
  import { createEventDispatcher } from 'svelte';

  export let existingTags: string[] = [];
  export let placeholder = 'Add tag...';

  const dispatch = createEventDispatcher<{ add: string }>();

  let inputValue = '';
  let showSuggestions = false;
  let selectedIndex = -1;
  let inputElement: HTMLInputElement;

  // Filter suggestions based on input
  $: suggestions = inputValue.trim()
    ? Array.from($tagRegistry.values())
        .filter(tag => {
          // Exclude already existing tags
          if (existingTags.includes(tag.name)) return false;

          // Filter by input
          return tag.name.toLowerCase().includes(inputValue.toLowerCase());
        })
        .sort((a, b) => {
          // Prioritize exact matches and popular tags
          const aStarts = a.name.toLowerCase().startsWith(inputValue.toLowerCase());
          const bStarts = b.name.toLowerCase().startsWith(inputValue.toLowerCase());

          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;

          return b.usageCount - a.usageCount;
        })
        .slice(0, 10)
    : [];

  function handleInput() {
    showSuggestions = inputValue.trim().length > 0;
    selectedIndex = -1;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex].name);
        } else {
          addTag();
        }
        break;

      case 'Escape':
        e.preventDefault();
        closeSuggestions();
        break;

      case 'Tab':
        if (selectedIndex >= 0) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex].name);
        }
        break;
    }
  }

  function selectSuggestion(tagName: string) {
    inputValue = tagName;
    closeSuggestions();
    addTag();
  }

  function addTag() {
    const tagName = inputValue.trim();

    if (!tagName) return;

    if (existingTags.includes(tagName)) {
      alert(`Tag "${tagName}" is already added.`);
      inputValue = '';
      return;
    }

    dispatch('add', tagName);
    inputValue = '';
    closeSuggestions();
    inputElement?.focus();
  }

  function closeSuggestions() {
    showSuggestions = false;
    selectedIndex = -1;
  }

  function handleBlur() {
    // Delay to allow click events on suggestions
    setTimeout(() => {
      closeSuggestions();
    }, 200);
  }
</script>

<div class="tag-input relative">
  <input
    bind:this={inputElement}
    bind:value={inputValue}
    on:input={handleInput}
    on:keydown={handleKeyDown}
    on:blur={handleBlur}
    on:focus={handleInput}
    type="text"
    {placeholder}
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={showSuggestions && suggestions.length > 0}
    aria-controls="tag-suggestions"
    aria-activedescendant={selectedIndex >= 0 ? `tag-suggestion-${selectedIndex}` : undefined}
    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
  />

  {#if showSuggestions && suggestions.length > 0}
    <div
      id="tag-suggestions"
      role="listbox"
      aria-label="Tag suggestions"
      class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-64 overflow-y-auto"
    >
      {#each suggestions as tag, i (tag.name)}
        <div
          id="tag-suggestion-{i}"
          role="option"
          aria-selected={i === selectedIndex}
          class="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors cursor-pointer"
          class:bg-blue-100={i === selectedIndex}
          on:click={() => selectSuggestion(tag.name)}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectSuggestion(tag.name);
            }
          }}
          tabindex="-1"
        >
          <div class="flex items-center gap-2">
            <span
              class="inline-block w-3 h-3 rounded flex-shrink-0"
              style="background-color: {tag.color}"
              aria-hidden="true"
            ></span>
            <span class="font-medium">{tag.name}</span>
            <span class="text-xs text-gray-500 ml-auto">{tag.usageCount} {tag.usageCount === 1 ? 'use' : 'uses'}</span>
          </div>
        </div>
      {/each}

      {#if inputValue.trim() && !suggestions.some(s => s.name.toLowerCase() === inputValue.toLowerCase())}
        <div
          role="option"
          aria-selected="false"
          class="w-full text-left px-3 py-2 border-t border-gray-200 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
          on:click={addTag}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              addTag();
            }
          }}
          tabindex="-1"
        >
          <div class="flex items-center gap-2">
            <span class="text-green-600" aria-hidden="true">+</span>
            <span class="font-medium">Create new tag: "{inputValue.trim()}"</span>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tag-input {
    /* Ensure dropdown is above other elements */
    position: relative;
    z-index: 1;
  }
</style>
