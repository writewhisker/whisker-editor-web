<script lang="ts">
  import type { Command } from './types';

  interface Props {
    commands?: Command[];
    onClose?: () => void;
  }

  let { commands = [], onClose }: Props = $props();
  let searchQuery = $state('');
  let selectedIndex = $state(0);

  const filtered = $derived(
    commands
      .filter(cmd =>
        cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 10)
  );

  function executeCommand(command: Command) {
    command.action();
    onClose?.();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      executeCommand(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  }
</script>

<div class="command-palette-overlay" onclick={onClose}>
  <div class="command-palette" onclick={(e) => e.stopPropagation()}>
    <input
      type="text"
      class="search-input"
      placeholder="Type a command..."
      bind:value={searchQuery}
      onkeydown={handleKeyDown}
      autofocus
    />
    <div class="commands">
      {#each filtered as command, i (command.id)}
        <button
          class="command"
          class:selected={i === selectedIndex}
          onclick={() => executeCommand(command)}
        >
          <div class="command-label">
            {#if command.category}
              <span class="category">{command.category}:</span>
            {/if}
            {command.label}
          </div>
          {#if command.shortcut}
            <span class="shortcut">{command.shortcut}</span>
          {/if}
        </button>
      {/each}
      {#if filtered.length === 0 && searchQuery}
        <div class="no-results">No commands found</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .command-palette-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    padding-top: 100px;
    z-index: 1000;
  }

  .command-palette {
    width: 600px;
    max-height: 400px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .search-input {
    width: 100%;
    padding: 16px;
    border: none;
    border-bottom: 1px solid #e5e7eb;
    font-size: 16px;
    outline: none;
  }

  .commands {
    max-height: 320px;
    overflow-y: auto;
  }

  .command {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
  }

  .command:hover,
  .command.selected {
    background: #f3f4f6;
  }

  .command-label {
    display: flex;
    gap: 8px;
    font-size: 14px;
  }

  .category {
    color: #6b7280;
    font-weight: 500;
  }

  .shortcut {
    font-size: 12px;
    color: #9ca3af;
    font-family: monospace;
  }

  .no-results {
    padding: 24px;
    text-align: center;
    color: #9ca3af;
  }
</style>
