<script lang="ts">
  import { BaseEdge, getBezierPath, type EdgeProps, Position } from '@xyflow/svelte';

  type $$Props = {
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: Position;
    targetPosition: Position;
    data?: Record<string, any>;
    markerEnd?: string;
    style?: string;
    label?: string;
    labelStyle?: string;
  };

  export let id: $$Props['id'];
  export let sourceX: $$Props['sourceX'];
  export let sourceY: $$Props['sourceY'];
  export let targetX: $$Props['targetX'];
  export let targetY: $$Props['targetY'];
  export let sourcePosition: $$Props['sourcePosition'];
  export let targetPosition: $$Props['targetPosition'];
  export let data: $$Props['data'] = {};
  export let markerEnd: $$Props['markerEnd'] = undefined;
  export let style: $$Props['style'] = undefined;
  export let label: $$Props['label'] = undefined;
  export let labelStyle: $$Props['labelStyle'] = undefined;

  // Extract choice data
  $: choiceText = data?.choiceText || '';
  $: hasCondition = data?.hasCondition || false;
  $: isBroken = data?.isBroken || false;

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
  $: edgeStyle = isBroken
    ? 'stroke: #ef4444; stroke-width: 3; stroke-dasharray: 3, 3;' // Red, dashed for broken
    : hasCondition
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

<g oncontextmenu={handleContextMenu}>
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
        class:bg-red-100={isBroken}
        class:border-red-500={isBroken}
        class:bg-orange-100={!isBroken && hasCondition}
        class:border-orange-400={!isBroken && hasCondition}
        class:bg-blue-100={!isBroken && !hasCondition}
        class:border-blue-400={!isBroken && !hasCondition}
        style="border: 1px solid; max-width: 180px;"
        role="button"
        tabindex="0"
        title={isBroken ? 'Broken connection - target does not exist' : 'Right-click for options'}
      >
        <div class="font-medium truncate text-center">
          {#if isBroken}
            <span class="text-red-600">⚠️ {choiceText || 'Untitled choice'}</span>
          {:else}
            {choiceText || 'Untitled choice'}
          {/if}
        </div>
        {#if !isBroken && hasCondition}
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
