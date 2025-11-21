<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { SidebarPosition } from './types';

  interface Props {
    position?: SidebarPosition;
    width?: number;
    collapsible?: boolean;
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    children?: Snippet;
  }

  let {
    position = 'left',
    width = 300,
    collapsible = true,
    collapsed = false,
    onCollapsedChange,
    children,
  }: Props = $props();

  function toggleCollapsed() {
    onCollapsedChange?.(!collapsed);
  }
</script>

<div
  class="sidebar"
  class:collapsed
  class:position-left={position === 'left'}
  class:position-right={position === 'right'}
  style:width={collapsed ? '0' : `${width}px`}
>
  <div class="sidebar-content">
    {#if children}
      {@render children()}
    {/if}
  </div>
  {#if collapsible}
    <button class="collapse-button" onclick={toggleCollapsed}>
      {collapsed ? (position === 'left' ? '→' : '←') : (position === 'left' ? '←' : '→')}
    </button>
  {/if}
</div>

<style>
  .sidebar {
    position: relative;
    height: 100%;
    background: #f9fafb;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    transition: width 0.2s ease;
    overflow: hidden;
  }

  .sidebar.position-right {
    border-right: none;
    border-left: 1px solid #e5e7eb;
  }

  .sidebar.collapsed {
    width: 0 !important;
    border: none;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .collapse-button {
    position: absolute;
    top: 50%;
    right: -12px;
    transform: translateY(-50%);
    width: 24px;
    height: 48px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    z-index: 10;
    transition: background 0.15s;
  }

  .position-right .collapse-button {
    right: auto;
    left: -12px;
    border-radius: 4px 0 0 4px;
  }

  .collapse-button:hover {
    background: #f3f4f6;
  }
</style>
