<script lang="ts">
  import type { TreeNode } from './types';

  interface Props {
    nodes?: TreeNode[];
    selectedId?: string;
    onNodeSelect?: (node: TreeNode) => void;
    onNodeToggle?: (node: TreeNode) => void;
  }

  let { nodes = [], selectedId, onNodeSelect, onNodeToggle }: Props = $props();

  function handleToggle(node: TreeNode) {
    onNodeToggle?.(node);
  }

  function handleSelect(node: TreeNode) {
    onNodeSelect?.(node);
  }
</script>

<div class="tree-view">
  {#each nodes as node (node.id)}
    <div class="tree-node">
      <div
        class="node-content"
        class:selected={selectedId === node.id}
        onclick={() => handleSelect(node)}
      >
        {#if node.children && node.children.length > 0}
          <button class="toggle-button" onclick={(e) => { e.stopPropagation(); handleToggle(node); }}>
            {node.expanded ? '▼' : '▶'}
          </button>
        {:else}
          <span class="spacer"></span>
        {/if}
        {#if node.icon}
          <span class="icon">{node.icon}</span>
        {/if}
        <span class="label">{node.label}</span>
      </div>
      {#if node.expanded && node.children}
        <div class="node-children">
          <svelte:self
            nodes={node.children}
            {selectedId}
            {onNodeSelect}
            {onNodeToggle}
          />
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .tree-view {
    font-size: 14px;
  }

  .tree-node {
    user-select: none;
  }

  .node-content {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.15s;
  }

  .node-content:hover {
    background: #f3f4f6;
  }

  .node-content.selected {
    background: #e0e7ff;
    color: #3730a3;
  }

  .toggle-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    width: 16px;
    height: 16px;
    font-size: 10px;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spacer {
    width: 16px;
  }

  .icon {
    font-size: 16px;
  }

  .label {
    flex: 1;
  }

  .node-children {
    margin-left: 16px;
  }
</style>
