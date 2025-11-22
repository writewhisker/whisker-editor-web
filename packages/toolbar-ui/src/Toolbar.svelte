<script lang="ts">
  import type { ToolbarGroupConfig } from './types';

  interface Props {
    groups?: ToolbarGroupConfig[];
  }

  let { groups = [] }: Props = $props();
</script>

<div class="toolbar">
  {#each groups as group, i (group.id)}
    <div class="toolbar-group">
      {#each group.items as item (item.id)}
        <button
          class="toolbar-button"
          disabled={item.disabled}
          title={item.tooltip}
          onclick={item.action}
        >
          {#if item.icon}
            <span class="icon">{item.icon}</span>
          {/if}
          <span class="label">{item.label}</span>
        </button>
      {/each}
    </div>
    {#if i < groups.length - 1}
      <div class="divider"></div>
    {/if}
  {/each}
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .toolbar-group {
    display: flex;
    gap: 4px;
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s;
  }

  .toolbar-button:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .toolbar-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    font-size: 16px;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: #d1d5db;
  }
</style>
