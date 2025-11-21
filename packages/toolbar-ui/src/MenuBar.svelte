<script lang="ts">
  import type { MenuItem } from './types';

  interface Props {
    menus?: MenuItem[];
  }

  let { menus = [] }: Props = $props();
  let openMenu = $state<string | null>(null);

  function toggleMenu(menuId: string) {
    openMenu = openMenu === menuId ? null : menuId;
  }

  function handleItemClick(item: MenuItem) {
    if (!item.children) {
      item.action?.();
      openMenu = null;
    }
  }
</script>

<div class="menubar">
  {#each menus as menu (menu.id)}
    <div class="menu-container">
      <button
        class="menu-label"
        class:active={openMenu === menu.id}
        onclick={() => toggleMenu(menu.id)}
      >
        {menu.label}
      </button>
      {#if openMenu === menu.id && menu.children}
        <div class="menu-dropdown">
          {#each menu.children as item (item.id)}
            <button
              class="menu-item"
              disabled={item.disabled}
              onclick={() => handleItemClick(item)}
            >
              <span class="item-label">
                {#if item.icon}
                  <span class="icon">{item.icon}</span>
                {/if}
                {item.label}
              </span>
              {#if item.shortcut}
                <span class="shortcut">{item.shortcut}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .menubar {
    display: flex;
    gap: 2px;
    padding: 4px 8px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .menu-container {
    position: relative;
  }

  .menu-label {
    padding: 6px 12px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    border-radius: 4px;
    transition: background 0.15s;
  }

  .menu-label:hover,
  .menu-label.active {
    background: #e5e7eb;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 200px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 4px;
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

  .menu-item:hover:not(:disabled) {
    background: #f3f4f6;
  }

  .menu-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .item-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon {
    font-size: 16px;
  }

  .shortcut {
    font-size: 12px;
    color: #6b7280;
    margin-left: 16px;
  }
</style>
