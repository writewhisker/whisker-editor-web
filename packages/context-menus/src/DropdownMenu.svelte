<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextMenuItem } from './types';

  interface Props {
    label?: string;
    items?: ContextMenuItem[];
    children?: Snippet;
  }

  let { label = 'Menu', items = [], children }: Props = $props();
  let open = $state(false);

  async function handleItemClick(item: ContextMenuItem) {
    if (!item.disabled) {
      await item.action?.();
      open = false;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown-menu-container')) {
      open = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="dropdown-menu-container">
  <button class="menu-trigger" onclick={() => (open = !open)}>
    {#if children}
      {@render children()}
    {:else}
      {label}
    {/if}
  </button>
  {#if open}
    <div class="menu-dropdown">
      {#each items as item (item.id)}
        {#if item.divider}
          <div class="divider"></div>
        {:else}
          <button
            class="menu-item"
            class:disabled={item.disabled}
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
          </button>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .dropdown-menu-container {
    position: relative;
    display: inline-block;
  }

  .menu-trigger {
    padding: 6px 12px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s;
  }

  .menu-trigger:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 4px;
    min-width: 180px;
    z-index: 100;
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
  }

  .icon {
    font-size: 16px;
  }

  .shortcut {
    font-size: 12px;
    color: #9ca3af;
    font-family: monospace;
  }

  .divider {
    height: 1px;
    background: #e5e7eb;
    margin: 4px 0;
  }
</style>
