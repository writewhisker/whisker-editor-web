<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PanelTab } from './types';

  interface Props {
    tabs?: PanelTab[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    children?: Snippet;
  }

  let { tabs = [], activeTab, onTabChange, children }: Props = $props();
</script>

<div class="panel-tabs">
  <div class="tabs-header">
    {#each tabs as tab (tab.id)}
      <button
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => onTabChange?.(tab.id)}
      >
        {#if tab.icon}
          <span class="icon">{tab.icon}</span>
        {/if}
        <span class="label">{tab.label}</span>
        {#if tab.badge !== undefined && tab.badge > 0}
          <span class="badge">{tab.badge}</span>
        {/if}
      </button>
    {/each}
  </div>
  <div class="tabs-content">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  .panel-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .tabs-header {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 14px;
    color: #6b7280;
    transition: all 0.15s;
  }

  .tab:hover {
    color: #374151;
    background: #f3f4f6;
  }

  .tab.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .icon {
    font-size: 16px;
  }

  .badge {
    background: #ef4444;
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }

  .tabs-content {
    flex: 1;
    overflow-y: auto;
  }
</style>
