<script lang="ts">
  import { currentStory, selectedPassage, selectedPassageId, projectActions } from '../stores/projectStore';
  import { Choice } from '../models/Choice';
  import { tagActions } from '../stores/tagStore';
  import TagInput from './TagInput.svelte';
  import { notificationStore } from '../stores/notificationStore';
  import PassageLinkAutocomplete from './PassageLinkAutocomplete.svelte';
  import CommentPanel from './collaboration/CommentPanel.svelte';
  import { commentsByPassage } from '../stores/commentStore';

  $: passage = $selectedPassage;

  let titleWarning = '';
  let originalTitle = '';
  let commentsCollapsed = false;

  // Comment state
  $: passageComments = passage ? ($commentsByPassage.get(passage.id) || []) : [];
  $: unresolvedCommentCount = passageComments.filter(c => !c.resolved).length;

  // Track original title when passage changes
  $: if (passage) {
    originalTitle = passage.title;
    titleWarning = '';
  }

  function updatePassageTitle(event: Event) {
    const target = event.target as HTMLInputElement;
    if (passage) {
      const newTitle = target.value;

      // Check for duplicates (case-insensitive)
      if (newTitle !== originalTitle) {
        const duplicate = $currentStory && Array.from($currentStory.passages.values()).find(
          p => p.id !== passage.id && p.title.toLowerCase() === newTitle.toLowerCase()
        );

        if (duplicate) {
          titleWarning = `A passage named "${duplicate.title}" already exists`;
          // Don't update, keep showing the typed value but with warning
          passage.title = newTitle;
          currentStory.update(s => s);
        } else {
          titleWarning = '';
          projectActions.updatePassage(passage.id, { title: newTitle });
          originalTitle = newTitle;
        }
      } else {
        titleWarning = '';
        passage.title = newTitle;
        currentStory.update(s => s);
      }
    }
  }

  let contentTextarea: HTMLTextAreaElement;

  function updatePassageContent(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (passage) {
      projectActions.updatePassage(passage.id, { content: target.value });
    }
  }

  // Autocomplete state
  let autocompleteVisible = false;
  let autocompleteQuery = '';
  let autocompletePosition = { top: 0, left: 0 };
  let linkStartPos = 0;

  function handleContentInput(event: Event) {
    updatePassageContent(event);
    checkForAutocomplete(event);
  }

  function checkForAutocomplete(event: Event) {
    if (!contentTextarea || !passage) return;

    const textarea = contentTextarea;
    const cursorPos = textarea.selectionStart;
    const content = textarea.value;

    // Look backwards from cursor to find [[
    let searchPos = cursorPos - 1;
    let foundOpen = false;
    let openPos = -1;

    while (searchPos >= 0 && searchPos >= cursorPos - 100) {
      if (content[searchPos] === '[' && searchPos > 0 && content[searchPos - 1] === '[') {
        foundOpen = true;
        openPos = searchPos - 1;
        break;
      }
      // If we hit a closing ]] or newline, stop searching
      if (content[searchPos] === ']' || content[searchPos] === '\n') {
        break;
      }
      searchPos--;
    }

    if (foundOpen) {
      // Extract the query between [[ and cursor
      const query = content.substring(openPos + 2, cursorPos);

      // Check if there's already a closing ]] or -> before cursor
      if (query.includes(']]') || query.includes('->')) {
        autocompleteVisible = false;
        return;
      }

      // Show autocomplete
      linkStartPos = openPos;
      autocompleteQuery = query;
      autocompleteVisible = true;

      // Calculate position for dropdown
      const rect = textarea.getBoundingClientRect();
      const lines = content.substring(0, openPos).split('\n');
      const lineHeight = 20; // Approximate line height
      const currentLine = lines.length - 1;

      autocompletePosition = {
        top: rect.top + (currentLine + 1) * lineHeight + 25,
        left: rect.left + 10
      };
    } else {
      autocompleteVisible = false;
    }
  }

  function handleAutocompleteSelect(event: CustomEvent<{ title: string }>) {
    if (!contentTextarea || !passage) return;

    const title = event.detail.title;
    const content = passage.content;
    const cursorPos = contentTextarea.selectionStart;

    // Replace from [[ to cursor with [[title]]
    const before = content.substring(0, linkStartPos);
    const after = content.substring(cursorPos);
    const newContent = before + `[[${title}]]` + after;

    projectActions.updatePassage(passage.id, { content: newContent });

    // Close autocomplete
    autocompleteVisible = false;

    // Set cursor position after the inserted link
    setTimeout(() => {
      if (contentTextarea) {
        const newCursorPos = linkStartPos + `[[${title}]]`.length;
        contentTextarea.focus();
        contentTextarea.selectionStart = newCursorPos;
        contentTextarea.selectionEnd = newCursorPos;
      }
    }, 0);
  }

  function handleAutocompleteClose() {
    autocompleteVisible = false;
  }

  function handleContentKeydown(event: KeyboardEvent) {
    // Pass through navigation keys to autocomplete when it's visible
    if (autocompleteVisible && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
      // Let the autocomplete component handle these
      return;
    }
  }

  function insertSnippet(snippet: string) {
    if (!snippet || !passage || !contentTextarea) return;

    const start = contentTextarea.selectionStart;
    const end = contentTextarea.selectionEnd;
    const content = passage.content;

    // Insert snippet at cursor position
    const newContent = content.substring(0, start) + snippet + content.substring(end);
    projectActions.updatePassage(passage.id, { content: newContent });

    // Reset select to trigger UI update
    setTimeout(() => {
      if (contentTextarea) {
        contentTextarea.focus();
        contentTextarea.selectionStart = start + snippet.length;
        contentTextarea.selectionEnd = start + snippet.length;
      }
    }, 0);
  }

  function addChoice() {
    if (passage) {
      const choice = new Choice({
        text: 'New choice',
        target: ''
      });
      passage.addChoice(choice);
      currentStory.update(s => s);
    }
  }

  function removeChoice(choiceId: string) {
    if (passage) {
      passage.removeChoice(choiceId);
      currentStory.update(s => s);
    }
  }

  function updateChoiceText(choiceId: string, text: string) {
    if (passage) {
      const choice = passage.choices.find(c => c.id === choiceId);
      if (choice) {
        choice.text = text;
        currentStory.update(s => s);
      }
    }
  }

  function updateChoiceTarget(choiceId: string, target: string) {
    if (passage) {
      const choice = passage.choices.find(c => c.id === choiceId);
      if (choice) {
        choice.target = target;
        currentStory.update(s => s);
      }
    }
  }

  function updateChoiceCondition(choiceId: string, condition: string) {
    if (passage) {
      const choice = passage.choices.find(c => c.id === choiceId);
      if (choice) {
        choice.condition = condition || undefined;
        currentStory.update(s => s);
      }
    }
  }

  function addTag(event: CustomEvent<string>) {
    if (passage) {
      const tagName = event.detail.trim();
      if (tagName && !passage.tags.includes(tagName)) {
        passage.tags.push(tagName);
        currentStory.update(s => s);
      }
    }
  }

  function removeTag(tagName: string) {
    if (passage) {
      const newTags = passage.tags.filter(t => t !== tagName);
      projectActions.updatePassage(passage.id, { tags: newTags });
    }
  }

  function updatePassageColor(event: Event) {
    const target = event.target as HTMLInputElement;
    if (passage) {
      projectActions.updatePassage(passage.id, { color: target.value || undefined });
    }
  }

  function clearPassageColor() {
    if (passage) {
      projectActions.updatePassage(passage.id, { color: undefined });
    }
  }

  function duplicatePassage() {
    if (passage) {
      const duplicated = projectActions.duplicatePassage(passage.id);
      if (duplicated) {
        notificationStore.success(`Passage "${duplicated.title}" duplicated successfully`);
      }
    }
  }

  // Predefined color palette
  const colorPalette = [
    '#EF4444', // red
    '#F97316', // orange
    '#F59E0B', // amber
    '#EAB308', // yellow
    '#84CC16', // lime
    '#22C55E', // green
    '#10B981', // emerald
    '#14B8A6', // teal
    '#06B6D4', // cyan
    '#0EA5E9', // sky
    '#3B82F6', // blue
    '#6366F1', // indigo
    '#8B5CF6', // violet
    '#A855F7', // purple
    '#D946EF', // fuchsia
    '#EC4899', // pink
  ];

  $: availablePassages = $currentStory
    ? Array.from($currentStory.passages.values()).filter(p => p.id !== passage?.id)
    : [];

  // All passages for autocomplete (including current passage)
  $: allPassages = $currentStory
    ? Array.from($currentStory.passages.values())
    : [];
</script>

<div class="flex flex-col h-full bg-white border-l border-gray-300">
  {#if !passage}
    <div class="flex items-center justify-center h-full text-gray-400">
      <div class="text-center">
        <div class="text-4xl mb-2">📝</div>
        <div>Select a passage to edit</div>
      </div>
    </div>
  {:else}
    <!-- Header -->
    <div class="p-3 border-b border-gray-300">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-gray-800">Properties</h3>
        <button
          class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          on:click={duplicatePassage}
          title="Duplicate this passage (Ctrl+D)"
        >
          Duplicate
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Title -->
      <div>
        <label for="passage-title" class="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          id="passage-title"
          type="text"
          value={passage.title}
          on:input={updatePassageTitle}
          class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 {titleWarning ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}"
        />
        {#if titleWarning}
          <div class="mt-1 text-sm text-red-600 flex items-center gap-1">
            <span>⚠️</span>
            <span>{titleWarning}</span>
          </div>
        {/if}
      </div>

      <!-- ID (read-only) -->
      <div>
        <label for="passage-id" class="block text-sm font-medium text-gray-700 mb-1">
          ID
        </label>
        <input
          id="passage-id"
          type="text"
          value={passage.id}
          readonly
          class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 text-sm"
        />
      </div>

      <!-- Timestamps (read-only) -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label for="passage-created" class="block text-sm font-medium text-gray-700 mb-1">
            Created
          </label>
          <input
            id="passage-created"
            type="text"
            value={new Date(passage.created).toLocaleString()}
            readonly
            class="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-gray-600 text-xs"
            title={passage.created}
          />
        </div>
        <div>
          <label for="passage-modified" class="block text-sm font-medium text-gray-700 mb-1">
            Modified
          </label>
          <input
            id="passage-modified"
            type="text"
            value={new Date(passage.modified).toLocaleString()}
            readonly
            class="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-gray-600 text-xs"
            title={passage.modified}
          />
        </div>
      </div>

      <!-- Color -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label for="passage-color" class="block text-sm font-medium text-gray-700">
            Color
          </label>
          {#if passage.color}
            <button
              class="text-xs text-gray-500 hover:text-gray-700 underline"
              on:click={clearPassageColor}
              title="Clear color"
            >
              Clear
            </button>
          {/if}
        </div>

        <!-- Color Palette -->
        <div class="grid grid-cols-8 gap-1.5 mb-2">
          {#each colorPalette as color}
            <button
              class="w-8 h-8 rounded border-2 transition-all hover:scale-110"
              class:border-gray-800={passage.color === color}
              class:border-gray-300={passage.color !== color}
              style="background-color: {color};"
              on:click={() => passage && projectActions.updatePassage(passage.id, { color })}
              title={color}
            ></button>
          {/each}
        </div>

        <!-- Custom Color Picker -->
        <div class="flex gap-2 items-center">
          <input
            id="passage-color"
            type="color"
            value={passage.color || '#6366F1'}
            on:input={updatePassageColor}
            class="w-12 h-8 rounded border border-gray-300 cursor-pointer"
            title="Choose custom color"
          />
          <span class="text-xs text-gray-500">
            {passage.color || 'No color set'}
          </span>
        </div>
      </div>

      <!-- Tags -->
      <div>
        <div class="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </div>

        <!-- Tag Input -->
        <div class="mb-2">
          <TagInput
            existingTags={passage.tags}
            placeholder="Add tag..."
            on:add={addTag}
          />
        </div>

        <!-- Existing Tags -->
        <div class="flex flex-wrap gap-2">
          {#each passage.tags as tag (tag)}
            <span
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-white"
              style="background-color: {tagActions.getTagColor(tag)}"
            >
              {tag}
              <button
                class="hover:bg-white hover:bg-opacity-30 rounded-full p-0.5 transition-colors"
                on:click={() => removeTag(tag)}
                title="Remove tag"
              >
                ×
              </button>
            </span>
          {:else}
            <span class="text-xs text-gray-400">No tags - add one above</span>
          {/each}
        </div>
      </div>

      <!-- Notes/Comments -->
      <div>
        <label for="passage-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
          <span class="text-xs font-normal text-gray-500 dark:text-gray-400">(for planning and documentation - not shown in story)</span>
        </label>
        <textarea
          id="passage-notes"
          value={passage.notes || ''}
          on:input={(e) => projectActions.updatePassage(passage.id, { notes: e.currentTarget.value })}
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Add notes about this passage..."
        ></textarea>
      </div>

      <!-- Content -->
      <div>
        <div class="flex justify-between items-center mb-1">
          <label for="passage-content" class="block text-sm font-medium text-gray-700">
            Content
          </label>
          <select
            class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            on:change={(e) => insertSnippet(e.currentTarget.value)}
          >
            <option value="">Insert Snippet...</option>
            <option value="[[Choice Text]]">Link [[Choice Text]]</option>
            <option value="[[Choice Text->Target]]">Link with target [[Text->Target]]</option>
            <option value='<<set $variable = "value">>'>Set variable</option>
            <option value="<<if $variable>>...<<endif>>">If condition</option>
            <option value="<<if $var>>...<<else>>...<<endif>>">If-else condition</option>
            <option value='<<print $variable>>'>Print variable</option>
            <option value="/* Comment */">Comment</option>
          </select>
        </div>
        <textarea
          id="passage-content"
          bind:this={contentTextarea}
          value={passage.content}
          on:input={handleContentInput}
          on:keydown={handleContentKeydown}
          rows="10"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Write your passage content here..."
          spellcheck="true"
        ></textarea>
      </div>

      <!-- Choices -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="block text-sm font-medium text-gray-700">
            Choices
          </div>
          <button
            type="button"
            class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            on:click={addChoice}
            aria-label="Add new choice"
          >
            + Add Choice
          </button>
        </div>

        <div class="space-y-3">
          {#each passage.choices as choice (choice.id)}
            <div class="border border-gray-300 rounded p-3 space-y-2">
              <!-- Choice Text -->
              <div>
                <label for="choice-text-{choice.id}" class="block text-xs font-medium text-gray-600 mb-1">
                  Choice Text
                </label>
                <input
                  id="choice-text-{choice.id}"
                  type="text"
                  value={choice.text}
                  on:input={(e) => updateChoiceText(choice.id, (e.target as HTMLInputElement).value)}
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter choice text..."
                />
              </div>

              <!-- Target Passage -->
              <div>
                <label for="choice-target-{choice.id}" class="block text-xs font-medium text-gray-600 mb-1">
                  Target Passage
                </label>
                <select
                  id="choice-target-{choice.id}"
                  value={choice.target}
                  on:change={(e) => updateChoiceTarget(choice.id, (e.target as HTMLSelectElement).value)}
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select target --</option>
                  {#each availablePassages as p}
                    <option value={p.id}>{p.title}</option>
                  {/each}
                </select>
              </div>

              <!-- Condition (optional) -->
              <div>
                <label for="choice-condition-{choice.id}" class="block text-xs font-medium text-gray-600 mb-1">
                  Condition (optional)
                </label>
                <input
                  id="choice-condition-{choice.id}"
                  type="text"
                  value={choice.condition || ''}
                  on:input={(e) => updateChoiceCondition(choice.id, (e.target as HTMLInputElement).value)}
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g., health > 50"
                />
              </div>

              <!-- Remove Button -->
              <button
                type="button"
                class="w-full text-xs text-red-600 hover:text-red-800 py-1"
                on:click={() => removeChoice(choice.id)}
                aria-label="Remove this choice"
              >
                Remove Choice
              </button>
            </div>
          {:else}
            <div class="text-sm text-gray-400 text-center py-4">
              No choices yet. Add a choice to create branching paths.
            </div>
          {/each}
        </div>
      </div>

      <!-- Comments -->
      <div>
        <button
          type="button"
          class="w-full flex items-center justify-between text-sm font-medium text-gray-700 mb-2 hover:text-gray-900 transition-colors"
          on:click={() => commentsCollapsed = !commentsCollapsed}
        >
          <div class="flex items-center gap-2">
            <span>{commentsCollapsed ? '▶' : '▼'}</span>
            <span>Comments</span>
            {#if unresolvedCommentCount > 0}
              <span class="text-xs px-1.5 py-0.5 bg-blue-200 text-blue-700 rounded font-medium">
                {unresolvedCommentCount} unresolved
              </span>
            {:else if passageComments.length > 0}
              <span class="text-xs px-1.5 py-0.5 bg-green-200 text-green-700 rounded font-medium">
                All resolved
              </span>
            {/if}
          </div>
        </button>

        {#if !commentsCollapsed}
          <div class="border border-gray-300 rounded overflow-hidden" style="height: 400px;">
            <CommentPanel passageId={passage.id} showResolved={true} />
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Passage Link Autocomplete -->
<PassageLinkAutocomplete
  passages={allPassages}
  query={autocompleteQuery}
  position={autocompletePosition}
  visible={autocompleteVisible}
  on:select={handleAutocompleteSelect}
  on:close={handleAutocompleteClose}
/>
