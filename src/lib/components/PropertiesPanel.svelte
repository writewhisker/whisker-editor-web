<script lang="ts">
  import { currentStory, selectedPassage, selectedPassageId } from '../stores/projectStore';
  import { Choice } from '../models/Choice';
  import { tagActions } from '../stores/tagStore';
  import TagInput from './TagInput.svelte';

  $: passage = $selectedPassage;

  function updatePassageTitle(event: Event) {
    const target = event.target as HTMLInputElement;
    if (passage) {
      passage.title = target.value;
      currentStory.update(s => s);
    }
  }

  function updatePassageContent(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (passage) {
      passage.content = target.value;
      currentStory.update(s => s);
    }
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
      const index = passage.tags.indexOf(tagName);
      if (index !== -1) {
        passage.tags.splice(index, 1);
        currentStory.update(s => s);
      }
    }
  }

  $: availablePassages = $currentStory
    ? Array.from($currentStory.passages.values()).filter(p => p.id !== passage?.id)
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
      <h3 class="font-semibold text-gray-800">Properties</h3>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          value={passage.title}
          on:input={updatePassageTitle}
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- ID (read-only) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          ID
        </label>
        <input
          type="text"
          value={passage.id}
          readonly
          class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 text-sm"
        />
      </div>

      <!-- Tags -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>

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

      <!-- Content -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <textarea
          value={passage.content}
          on:input={updatePassageContent}
          rows="10"
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Write your passage content here..."
        ></textarea>
      </div>

      <!-- Choices -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">
            Choices
          </label>
          <button
            class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            on:click={addChoice}
          >
            + Add Choice
          </button>
        </div>

        <div class="space-y-3">
          {#each passage.choices as choice (choice.id)}
            <div class="border border-gray-300 rounded p-3 space-y-2">
              <!-- Choice Text -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">
                  Choice Text
                </label>
                <input
                  type="text"
                  value={choice.text}
                  on:input={(e) => updateChoiceText(choice.id, (e.target as HTMLInputElement).value)}
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter choice text..."
                />
              </div>

              <!-- Target Passage -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">
                  Target Passage
                </label>
                <select
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
                <label class="block text-xs font-medium text-gray-600 mb-1">
                  Condition (optional)
                </label>
                <input
                  type="text"
                  value={choice.condition || ''}
                  on:input={(e) => updateChoiceCondition(choice.id, (e.target as HTMLInputElement).value)}
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g., health > 50"
                />
              </div>

              <!-- Remove Button -->
              <button
                class="w-full text-xs text-red-600 hover:text-red-800 py-1"
                on:click={() => removeChoice(choice.id)}
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
    </div>
  {/if}
</div>
