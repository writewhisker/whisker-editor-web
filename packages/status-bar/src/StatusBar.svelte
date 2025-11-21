<script lang="ts">
  import type { StatusItem } from './types';

  interface Props {
    items?: StatusItem[];
  }

  let { items = [] }: Props = $props();

  const leftItems = $derived(
    items.filter(item => item.position !== 'right').sort((a, b) => (b.priority || 0) - (a.priority || 0))
  );

  const rightItems = $derived(
    items.filter(item => item.position === 'right').sort((a, b) => (b.priority || 0) - (a.priority || 0))
  );
</script>

<div class="status-bar">
  <div class="status-left">
    {#each leftItems as item (item.id)}
      <button
        class="status-item"
        title={item.tooltip}
        onclick={item.onClick}
      >
        {#if item.icon}
          <span class="icon">{item.icon}</span>
        {/if}
        {#if item.text}
          <span class="text">{item.text}</span>
        {/if}
      </button>
    {/each}
  </div>
  <div class="status-right">
    {#each rightItems as item (item.id)}
      <button
        class="status-item"
        title={item.tooltip}
        onclick={item.onClick}
      >
        {#if item.icon}
          <span class="icon">{item.icon}</span>
        {/if}
        {#if item.text}
          <span class="text">{item.text}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 24px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    padding: 0 8px;
    font-size: 12px;
  }

  .status-left,
  .status-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.15s;
    color: #6b7280;
  }

  .status-item:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .icon {
    font-size: 14px;
  }
</style>
