<script lang="ts">
  import type { GraphNodeData, GraphEdgeData } from './types';

  interface Props {
    nodes?: GraphNodeData[];
    edges?: GraphEdgeData[];
    width?: number;
    height?: number;
    zoom?: number;
    panX?: number;
    panY?: number;
  }

  let {
    nodes = [],
    edges = [],
    width = 800,
    height = 600,
    zoom = 1,
    panX = 0,
    panY = 0
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  function handleMouseDown(e: MouseEvent) {
    isDragging = true;
    dragStart = { x: e.clientX - panX, y: e.clientY - panY };
  }

  function handleMouseMove(e: MouseEvent) {
    if (isDragging) {
      panX = e.clientX - dragStart.x;
      panY = e.clientY - dragStart.y;
    }
  }

  function handleMouseUp() {
    isDragging = false;
  }
</script>

<div
  class="graph-canvas"
  style="width: {width}px; height: {height}px;"
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  role="application"
  aria-label="Graph canvas"
>
  <svg
    {width}
    {height}
    viewBox="0 0 {width} {height}"
  >
    <g transform="translate({panX}, {panY}) scale({zoom})">
      <!-- Edges layer -->
      <g class="edges">
        {#each edges as edge (edge.id)}
          <line
            x1={nodes.find(n => n.id === edge.source)?.position.x ?? 0}
            y1={nodes.find(n => n.id === edge.source)?.position.y ?? 0}
            x2={nodes.find(n => n.id === edge.target)?.position.x ?? 0}
            y2={nodes.find(n => n.id === edge.target)?.position.y ?? 0}
            stroke="#999"
            stroke-width="2"
          />
        {/each}
      </g>

      <!-- Nodes layer -->
      <g class="nodes">
        {#each nodes as node (node.id)}
          <g transform="translate({node.position.x}, {node.position.y})">
            <rect
              width={node.width ?? 120}
              height={node.height ?? 60}
              fill="#fff"
              stroke="#333"
              stroke-width="2"
              rx="4"
            />
            <text
              x={(node.width ?? 120) / 2}
              y={(node.height ?? 60) / 2}
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#333"
            >
              {node.label}
            </text>
          </g>
        {/each}
      </g>
    </g>
  </svg>
</div>

<style>
  .graph-canvas {
    position: relative;
    overflow: hidden;
    background: #f5f5f5;
    cursor: grab;
  }

  .graph-canvas:active {
    cursor: grabbing;
  }

  svg {
    display: block;
  }
</style>
