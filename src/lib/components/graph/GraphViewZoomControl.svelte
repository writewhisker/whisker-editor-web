<script lang="ts">
  import { useSvelteFlow, type Node } from '@xyflow/svelte';
  import { prefersReducedMotion } from '../../utils/motion';

  // Props
  export let nodes: Node[] = [];
  export let selectedPassageId: string | null = null;

  // Get Svelte Flow instance for programmatic control
  const { fitBounds } = useSvelteFlow();

  // Zoom to selected passage
  export function zoomToSelection() {
    if (!selectedPassageId) return;

    const selectedNode = nodes.find(n => n.id === selectedPassageId);
    if (!selectedNode) return;

    // Calculate bounds with padding
    const padding = 100;
    const nodeWidth = 250;
    const nodeHeight = 150;

    fitBounds(
      {
        x: selectedNode.position.x - padding,
        y: selectedNode.position.y - padding,
        width: nodeWidth + (padding * 2),
        height: nodeHeight + (padding * 2),
      },
      {
        duration: $prefersReducedMotion ? 0 : 400, // Respect motion preferences
        padding: 0.2,
      }
    );
  }

  // React to selectedPassageId changes if needed
  // (Could auto-zoom here if desired)
</script>

<!-- This component doesn't render anything visible, it just provides zoom control -->
