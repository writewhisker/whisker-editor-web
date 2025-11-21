<script lang="ts">
  import type { GraphNodeData } from './types';

  interface Props {
    nodes?: GraphNodeData[];
    width?: number;
    height?: number;
    viewportX?: number;
    viewportY?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  }

  let {
    nodes = [],
    width = 200,
    height = 150,
    viewportX = 0,
    viewportY = 0,
    viewportWidth = 800,
    viewportHeight = 600
  }: Props = $props();

  const scale = 0.1; // Scale down for minimap
</script>

<div class="minimap" style="width: {width}px; height: {height}px;">
  <svg {width} {height}>
    <!-- Nodes -->
    {#each nodes as node (node.id)}
      <rect
        x={node.position.x * scale}
        y={node.position.y * scale}
        width={(node.width ?? 120) * scale}
        height={(node.height ?? 60) * scale}
        fill="#999"
        opacity="0.5"
      />
    {/each}

    <!-- Viewport indicator -->
    <rect
      x={viewportX * scale}
      y={viewportY * scale}
      width={viewportWidth * scale}
      height={viewportHeight * scale}
      fill="none"
      stroke="#3b82f6"
      stroke-width="2"
    />
  </svg>
</div>

<style>
  .minimap {
    position: absolute;
    bottom: 16px;
    right: 16px;
    background: white;
    border: 2px solid #333;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
</style>
