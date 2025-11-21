<script lang="ts">
  import type { GraphEdgeData, GraphPosition } from './types';

  interface Props {
    edge: GraphEdgeData;
    sourcePos: GraphPosition;
    targetPos: GraphPosition;
  }

  let { edge, sourcePos, targetPos }: Props = $props();
</script>

<line
  class="graph-edge"
  x1={sourcePos.x}
  y1={sourcePos.y}
  x2={targetPos.x}
  y2={targetPos.y}
  stroke="#999"
  stroke-width="2"
  marker-end="url(#arrowhead)"
/>

<style>
  .graph-edge {
    pointer-events: stroke;
  }

  .graph-edge:hover {
    stroke: #3b82f6;
  }
</style>
