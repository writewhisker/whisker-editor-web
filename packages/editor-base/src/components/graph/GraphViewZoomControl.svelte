<script lang="ts">
  import { useSvelteFlow, type Node } from '@xyflow/svelte';
  import { prefersReducedMotion } from '../../utils/motion';
  import { isMobile } from '../../utils/mobile';

  // Props
  export let nodes: Node[] = [];
  export let selectedPassageId: string | null = null;

  // Get Svelte Flow instance for programmatic control
  const { fitBounds, zoomIn, zoomOut, fitView, getViewport } = useSvelteFlow();

  // Track current zoom level
  let currentZoom = 1;

  // Update zoom level from viewport
  function updateZoomLevel() {
    try {
      const viewport = getViewport();
      currentZoom = viewport.zoom;
    } catch (e) {
      // Viewport not ready yet
    }
  }

  // Call updateZoomLevel periodically
  $: if (nodes) {
    updateZoomLevel();
  }

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

  // Zoom control handlers
  function handleZoomIn() {
    zoomIn({ duration: $prefersReducedMotion ? 0 : 200 });
    setTimeout(updateZoomLevel, 250);
  }

  function handleZoomOut() {
    zoomOut({ duration: $prefersReducedMotion ? 0 : 200 });
    setTimeout(updateZoomLevel, 250);
  }

  function handleFitView() {
    fitView({ duration: $prefersReducedMotion ? 0 : 400 });
    setTimeout(updateZoomLevel, 450);
  }

  // Keyboard event handler for accessibility
  function handleKeyDown(event: KeyboardEvent, action: 'zoomIn' | 'zoomOut' | 'fitView') {
    // Trigger action on Enter or Space key
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (action === 'zoomIn') handleZoomIn();
      else if (action === 'zoomOut') handleZoomOut();
      else if (action === 'fitView') handleFitView();
    }
  }
</script>

<!-- Zoom Controls UI - positioned in bottom-right corner -->
{#if !$isMobile}
  <div class="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
    <!-- Zoom percentage display -->
    <div class="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 shadow-lg text-center">
      <span class="text-xs text-gray-500 dark:text-gray-400 block mb-1">Zoom</span>
      <span class="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{Math.round(currentZoom * 100)}%</span>
    </div>

    <!-- Zoom control buttons -->
    <div class="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
      <button
        class="w-full px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset border-b border-gray-200 dark:border-gray-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        on:click={handleZoomIn}
        on:keydown={(e) => handleKeyDown(e, 'zoomIn')}
        title="Zoom In (Plus key)"
        aria-label="Zoom In"
        tabindex="0"
      >
        <span class="text-lg" aria-hidden="true">+</span>
      </button>

      <button
        class="w-full px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset border-b border-gray-200 dark:border-gray-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        on:click={handleZoomOut}
        on:keydown={(e) => handleKeyDown(e, 'zoomOut')}
        title="Zoom Out (Minus key)"
        aria-label="Zoom Out"
        tabindex="0"
      >
        <span class="text-lg" aria-hidden="true">-</span>
      </button>

      <button
        class="w-full px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        on:click={handleFitView}
        on:keydown={(e) => handleKeyDown(e, 'fitView')}
        title="Fit to Screen (F key)"
        aria-label="Fit to Screen"
        tabindex="0"
      >
        <span class="text-lg" aria-hidden="true">⊡</span>
      </button>
    </div>
  </div>
{/if}
