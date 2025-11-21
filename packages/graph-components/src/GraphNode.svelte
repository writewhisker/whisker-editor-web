<script lang="ts">
  import type { GraphNodeData } from './types';

  interface Props {
    node: GraphNodeData;
    selected?: boolean;
    onclick?: (node: GraphNodeData) => void;
  }

  let { node, selected = false, onclick }: Props = $props();

  function handleClick() {
    onclick?.(node);
  }
</script>

<div
  class="graph-node"
  class:selected
  style="
    left: {node.position.x}px;
    top: {node.position.y}px;
    width: {node.width ?? 120}px;
    height: {node.height ?? 60}px;
  "
  onclick={handleClick}
  role="button"
  tabindex="0"
>
  <div class="node-label">{node.label}</div>
</div>

<style>
  .graph-node {
    position: absolute;
    background: white;
    border: 2px solid #333;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .graph-node:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  .graph-node.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  .node-label {
    padding: 8px;
    text-align: center;
    font-size: 14px;
  }
</style>
