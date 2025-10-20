<script lang="ts">
  import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/svelte';

  type $$Props = EdgeProps;

  export let id: $$Props['id'];
  export let sourceX: $$Props['sourceX'];
  export let sourceY: $$Props['sourceY'];
  export let targetX: $$Props['targetX'];
  export let targetY: $$Props['targetY'];
  export let sourcePosition: $$Props['sourcePosition'];
  export let targetPosition: $$Props['targetPosition'];
  export let data: $$Props['data'] = {};
  export let markerEnd: $$Props['markerEnd'];
  export let style: $$Props['style'];
  export let label: $$Props['label'];
  export let labelStyle: $$Props['labelStyle'];
  export let labelBgStyle: $$Props['labelBgStyle'];

  // Extract choice data
  $: choiceText = data?.choiceText || '';
  $: hasCondition = data?.hasCondition || false;

  // Calculate path
  $: [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge styling
  $: edgeStyle = hasCondition
    ? 'stroke: #f97316; stroke-width: 2; stroke-dasharray: 5, 5;' // Orange, dashed for conditional
    : 'stroke: #3b82f6; stroke-width: 2;'; // Blue, solid for normal

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (data?.onContextMenu) {
      data.onContextMenu(id, e.clientX, e.clientY);
    }
  }
</script>

<g on:contextmenu={handleContextMenu}>
  <BaseEdge path={edgePath} {markerEnd} style="{edgeStyle} {style || ''}" />

  <!-- Edge label with background -->
  <foreignObject
    x={labelX - 100}
    y={labelY - 20}
    width="200"
    height="40"
    class="overflow-visible"
  >
    <div class="flex items-center justify-center h-full">
      <div
        class="px-2 py-1 text-xs rounded shadow-md cursor-pointer transition-all hover:shadow-lg"
        class:bg-orange-100={hasCondition}
        class:border-orange-400={hasCondition}
        class:bg-blue-100={!hasCondition}
        class:border-blue-400={!hasCondition}
        style="border: 1px solid; max-width: 180px;"
        role="button"
        tabindex="0"
        title="Right-click for options"
      >
        <div class="font-medium truncate text-center">
          {choiceText || 'Untitled choice'}
        </div>
        {#if hasCondition}
          <div class="text-orange-600 text-xs text-center">⚡</div>
        {/if}
      </div>
    </div>
  </foreignObject>
</g>

<style>
  foreignObject {
    pointer-events: all;
  }

  foreignObject > div > div:hover {
    transform: scale(1.05);
  }
</style>
