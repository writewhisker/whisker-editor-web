<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    children?: Snippet;
  }

  let {
    title,
    collapsible = false,
    collapsed = false,
    onCollapsedChange,
    children,
  }: Props = $props();

  function toggleCollapsed() {
    onCollapsedChange?.(!collapsed);
  }
</script>

<div class="panel">
  {#if title}
    <div class="panel-header">
      <h3 class="panel-title">{title}</h3>
      {#if collapsible}
        <button class="toggle-button" onclick={toggleCollapsed}>
          {collapsed ? '▶' : '▼'}
        </button>
      {/if}
    </div>
  {/if}
  {#if !collapsed}
    <div class="panel-body">
      {#if children}
        {@render children()}
      {/if}
    </div>
  {/if}
</div>

<style>
  .panel {
    border-bottom: 1px solid #e5e7eb;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f3f4f6;
  }

  .panel-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #374151;
  }

  .toggle-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 4px;
    color: #6b7280;
  }

  .panel-body {
    padding: 12px 16px;
  }
</style>
