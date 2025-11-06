<script lang="ts">
  /**
   * Visual Script Editor
   *
   * Scratch-like block-based scripting for kids.
   * Converts blocks to Lua code behind the scenes.
   */

  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let passageId: string | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    save: { script: string };
  }>();

  interface ScriptBlock {
    id: string;
    type: 'action' | 'condition' | 'variable';
    action: string;
    params: Record<string, string>;
  }

  let blocks: ScriptBlock[] = [];
  let draggedBlockType: string | null = null;

  // Available block types
  const actionBlocks = [
    { type: 'give_item', label: 'Give Item', icon: '🎁', params: ['item', 'amount'] },
    { type: 'teleport', label: 'Teleport Player', icon: '✈️', params: ['location'] },
    { type: 'show_message', label: 'Show Message', icon: '💬', params: ['message'] },
    { type: 'play_sound', label: 'Play Sound', icon: '🔊', params: ['sound'] },
    { type: 'spawn_mob', label: 'Spawn Mob', icon: '👾', params: ['mob', 'count'] },
  ];

  const conditionBlocks = [
    { type: 'has_item', label: 'Has Item?', icon: '❓', params: ['item'] },
    { type: 'in_location', label: 'In Location?', icon: '📍', params: ['location'] },
  ];

  const variableBlocks = [
    { type: 'set_variable', label: 'Set Variable', icon: '🔢', params: ['name', 'value'] },
    { type: 'add_score', label: 'Add Points', icon: '⭐', params: ['amount'] },
  ];

  function handleDragStart(blockType: string) {
    draggedBlockType = blockType;
  }

  function handleDrop() {
    if (draggedBlockType) {
      const newBlock: ScriptBlock = {
        id: `block-${Date.now()}`,
        type: 'action',
        action: draggedBlockType,
        params: {},
      };
      blocks = [...blocks, newBlock];
      draggedBlockType = null;
    }
  }

  function removeBlock(blockId: string) {
    blocks = blocks.filter(b => b.id !== blockId);
  }

  function moveBlockUp(index: number) {
    if (index > 0) {
      const temp = blocks[index];
      blocks[index] = blocks[index - 1];
      blocks[index - 1] = temp;
      blocks = [...blocks];
    }
  }

  function moveBlockDown(index: number) {
    if (index < blocks.length - 1) {
      const temp = blocks[index];
      blocks[index] = blocks[index + 1];
      blocks[index + 1] = temp;
      blocks = [...blocks];
    }
  }

  function convertBlocksToScript(): string {
    // Convert visual blocks to Lua script
    const scriptLines = blocks.map(block => {
      switch (block.action) {
        case 'give_item':
          return `giveItem("${block.params.item || 'diamond'}", ${block.params.amount || 1})`;
        case 'teleport':
          return `teleport("${block.params.location || 'spawn'}")`;
        case 'show_message':
          return `showMessage("${block.params.message || 'Hello!'}")`;
        case 'play_sound':
          return `playSound("${block.params.sound || 'note_pling'}")`;
        case 'spawn_mob':
          return `spawnMob("${block.params.mob || 'zombie'}", ${block.params.count || 1})`;
        case 'set_variable':
          return `setVariable("${block.params.name || 'myVar'}", "${block.params.value || '0'}")`;
        case 'add_score':
          return `addScore(${block.params.amount || 10})`;
        default:
          return `-- ${block.action}`;
      }
    });

    return scriptLines.join('\n');
  }

  function handleSave() {
    const script = convertBlocksToScript();
    dispatch('save', { script });
    show = false;
  }

  function handleClose() {
    dispatch('close');
    show = false;
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
    on:click={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="button"
    tabindex="-1"
  >
    <div
      class="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border-8 border-blue-400"
      on:click|stopPropagation
      role="dialog" tabindex="-1"
      aria-labelledby="visual-script-title"
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-6">
        <div class="flex items-center justify-between">
          <h2 id="visual-script-title" class="text-4xl font-black text-white flex items-center gap-3">
            <span class="text-5xl">🧩</span>
            Visual Script Builder
          </h2>
          <button
            type="button"
            class="text-white hover:text-gray-200 text-5xl leading-none"
            on:click={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p class="text-white text-lg mt-2 font-semibold">Drag blocks to create actions!</p>
      </div>

      <div class="flex h-[calc(90vh-200px)]">
        <!-- Block Palette (Left Side) -->
        <div class="w-80 bg-gradient-to-b from-blue-50 to-purple-50 p-6 border-r-4 border-blue-300 overflow-y-auto">
          <h3 class="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
            <span>🎯</span> Actions
          </h3>
          <div class="space-y-3 mb-6">
            {#each actionBlocks as block}
              <div
                class="bg-gradient-to-r from-green-400 to-green-500 p-4 rounded-xl shadow-md cursor-move border-4 border-green-600 hover:scale-105 transition-transform"
                draggable="true"
                on:dragstart={() => handleDragStart(block.type)}
                role="button"
                tabindex="0"
              >
                <div class="flex items-center gap-2">
                  <span class="text-3xl">{block.icon}</span>
                  <span class="text-white font-bold text-lg">{block.label}</span>
                </div>
              </div>
            {/each}
          </div>

          <h3 class="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
            <span>❓</span> Conditions
          </h3>
          <div class="space-y-3 mb-6">
            {#each conditionBlocks as block}
              <div
                class="bg-gradient-to-r from-yellow-400 to-orange-400 p-4 rounded-xl shadow-md cursor-move border-4 border-yellow-600 hover:scale-105 transition-transform"
                draggable="true"
                on:dragstart={() => handleDragStart(block.type)}
                role="button"
                tabindex="0"
              >
                <div class="flex items-center gap-2">
                  <span class="text-3xl">{block.icon}</span>
                  <span class="text-white font-bold text-lg">{block.label}</span>
                </div>
              </div>
            {/each}
          </div>

          <h3 class="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
            <span>🔢</span> Variables
          </h3>
          <div class="space-y-3">
            {#each variableBlocks as block}
              <div
                class="bg-gradient-to-r from-purple-400 to-pink-400 p-4 rounded-xl shadow-md cursor-move border-4 border-purple-600 hover:scale-105 transition-transform"
                draggable="true"
                on:dragstart={() => handleDragStart(block.type)}
                role="button"
                tabindex="0"
              >
                <div class="flex items-center gap-2">
                  <span class="text-3xl">{block.icon}</span>
                  <span class="text-white font-bold text-lg">{block.label}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Script Canvas (Right Side) -->
        <div class="flex-1 p-6 overflow-y-auto">
          <div
            class="min-h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-4 border-dashed border-gray-400"
            on:drop|preventDefault={handleDrop}
            on:dragover|preventDefault
            role="region"
            aria-label="Script canvas"
          >
            {#if blocks.length === 0}
              <div class="text-center py-20">
                <div class="text-8xl mb-4">⬅️</div>
                <p class="text-3xl font-bold text-gray-600">Drag blocks here!</p>
                <p class="text-xl text-gray-500 mt-2">Build your script by dragging blocks from the left</p>
              </div>
            {:else}
              <div class="space-y-4">
                {#each blocks as block, index}
                  <div class="bg-white rounded-2xl p-6 shadow-lg border-4 border-blue-300">
                    <div class="flex items-start justify-between gap-4">
                      <!-- Block Content -->
                      <div class="flex-1">
                        <div class="text-2xl font-black text-gray-800 mb-3">
                          {actionBlocks.find(b => b.type === block.action)?.label || block.action}
                        </div>

                        <!-- Block Parameters -->
                        <div class="space-y-2">
                          {#if block.action === 'give_item'}
                            <input
                              type="text"
                              placeholder="Item name (e.g. diamond)"
                              bind:value={block.params.item}
                              class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-lg"
                            />
                            <input
                              type="number"
                              placeholder="Amount (e.g. 5)"
                              bind:value={block.params.amount}
                              class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-lg"
                            />
                          {:else if block.action === 'show_message'}
                            <textarea
                              placeholder="Type your message here..."
                              bind:value={block.params.message}
                              class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-lg"
                              rows="3"
                            ></textarea>
                          {:else if block.action === 'teleport'}
                            <input
                              type="text"
                              placeholder="Location (e.g. spawn, cave)"
                              bind:value={block.params.location}
                              class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-lg"
                            />
                          {/if}
                        </div>
                      </div>

                      <!-- Block Controls -->
                      <div class="flex flex-col gap-2">
                        <button
                          type="button"
                          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold"
                          on:click={() => moveBlockUp(index)}
                          disabled={index === 0}
                          aria-label="Move block up"
                        >
                          ⬆️
                        </button>
                        <button
                          type="button"
                          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold"
                          on:click={() => moveBlockDown(index)}
                          disabled={index === blocks.length - 1}
                          aria-label="Move block down"
                        >
                          ⬇️
                        </button>
                        <button
                          type="button"
                          class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold"
                          on:click={() => removeBlock(block.id)}
                          aria-label="Remove block"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gradient-to-r from-blue-100 to-purple-100 px-8 py-6 border-t-4 border-blue-300">
        <div class="flex items-center justify-between">
          <div class="text-gray-700 font-semibold">
            <p class="text-lg">💡 Tip: The order matters! Blocks run from top to bottom.</p>
          </div>
          <div class="flex gap-4">
            <button
              type="button"
              class="px-8 py-4 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white rounded-2xl font-bold text-lg shadow-lg"
              on:click={handleClose}
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl font-bold text-lg shadow-lg"
              on:click={handleSave}
            >
              💾 Save Script
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
