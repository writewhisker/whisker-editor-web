<script lang="ts">
  import type { ContextMenuItem, ContextMenuPosition } from './types';

  interface Props {
    items?: ContextMenuItem[];
    position?: ContextMenuPosition;
    onClose?: () => void;
  }

  let { items = [], position = { x: 0, y: 0 }, onClose }: Props = $props();

  async function handleItemClick(item: ContextMenuItem) {
    if (!item.children && !item.disabled) {
      await item.action?.();
      onClose?.();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  class="context-menu"
  style:left="{position.x}px"
  style:top="{position.y}px"
>
  {#each items as item (item.id)}
    {#if item.divider}
      <div class="divider"></div>
    {:else}
      <button
        class="menu-item"
        class:disabled={item.disabled}
        class:has-children={item.children && item.children.length > 0}
        onclick={() => handleItemClick(item)}
      >
        <span class="item-content">
          {#if item.icon}
            <span class="icon">{item.icon}</span>
          {/if}
          <span class="label">{item.label}</span>
        </span>
        {#if item.shortcut}
          <span class="shortcut">{item.shortcut}</span>
        {/if}
        {#if item.children}
          <span class="arrow">▶</span>
        {/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .context-menu {
    position: fixed;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 4px;
    min-width: 180px;
    z-index: 1000;
  }

  .menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
    transition: background 0.15s;
  }

  .menu-item:hover:not(.disabled) {
    background: #f3f4f6;
  }

  .menu-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .item-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
  }

  .shortcut {
    font-size: 12px;
    color: #9ca3af;
    font-family: monospace;
    margin-left: 12px;
  }

  .arrow {
    font-size: 10px;
    color: #9ca3af;
    margin-left: 8px;
  }

  .divider {
    height: 1px;
    background: #e5e7eb;
    margin: 4px 0;
  }
</style>
