<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { trapFocus } from '../utils/accessibility';

  export let show = false;

  interface Template {
    title: string;
    content: string;
    description: string;
    icon: string;
  }

  const templates: Record<string, Template> = {
    blank: {
      title: 'Blank Passage',
      content: '',
      description: 'Start with an empty passage',
      icon: '📄'
    },
    choice: {
      title: 'Choice Passage',
      content: 'What do you do?\n\n[[Option 1]]\n[[Option 2]]\n[[Option 3]]',
      description: 'Present multiple choices to the player',
      icon: '🔀'
    },
    conversation: {
      title: 'Conversation',
      content: '"Hello there," says the stranger.\n\n[[Ask who they are]]\n[[Say hello back]]\n[[Walk away]]',
      description: 'Dialog with NPC responses',
      icon: '💬'
    },
    description: {
      title: 'Description',
      content: 'You find yourself in a new location. [Describe the setting here]\n\n[[Continue]]',
      description: 'Describe a scene or location',
      icon: '🏞️'
    },
    checkpoint: {
      title: 'Checkpoint',
      content: '<<set $chapter = 2>>\n\nChapter 2: [Title]\n\n[Story continues...]\n\n[[Next]]',
      description: 'Set variables and mark story progress',
      icon: '🏁'
    },
    ending: {
      title: 'Ending',
      content: 'THE END\n\n[Describe how the story concludes]\n\n[[Start Over->Start]]',
      description: 'Conclude the story',
      icon: '🎬'
    }
  };

  const dispatch = createEventDispatcher();
  let dialogElement: HTMLElement;
  let cleanupFocusTrap: (() => void) | null = null;
  let selectedTemplate: string | null = null;

  function handleSelect(templateKey: string) {
    selectedTemplate = templateKey;
    const template = templates[templateKey];
    dispatch('select', {
      title: template.title,
      content: template.content
    });
    close();
  }

  function handleCancel() {
    dispatch('cancel');
    close();
  }

  function close() {
    show = false;
    selectedTemplate = null;
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }

  $: if (show && dialogElement) {
    cleanupFocusTrap = trapFocus(dialogElement);
  }

  $: if (!show && cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    on:click={handleCancel}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div
      bind:this={dialogElement}
      class="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-title"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="bg-blue-600 text-white px-6 py-4">
        <h2 id="template-title" class="text-xl font-bold">
          Choose a Template
        </h2>
        <p class="text-blue-100 text-sm mt-1">
          Select a starting template for your new passage
        </p>
      </div>

      <!-- Template Grid -->
      <div class="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each Object.entries(templates) as [key, template]}
            <button
              class="group relative flex flex-col p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              on:click={() => handleSelect(key)}
              type="button"
            >
              <!-- Icon and Title -->
              <div class="flex items-start gap-3 mb-2">
                <div class="text-2xl flex-shrink-0">
                  {template.icon}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {template.title}
                  </h3>
                  <p class="text-sm text-gray-600 mt-1">
                    {template.description}
                  </p>
                </div>
              </div>

              <!-- Preview -->
              <div class="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 font-mono line-clamp-3 overflow-hidden">
                {template.content || '(empty)'}
              </div>

              <!-- Hover indicator -->
              <div class="absolute inset-0 pointer-events-none rounded-lg border-2 border-transparent group-hover:border-blue-500 transition-colors"></div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
        <button
          class="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          on:click={handleCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Add subtle animation */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  [role="dialog"] {
    animation: fadeIn 0.15s ease-out;
  }

  /* Line clamp utility for preview text */
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
