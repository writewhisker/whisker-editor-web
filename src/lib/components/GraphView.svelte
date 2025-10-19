<script lang="ts">
  import { writable } from 'svelte/store';
  import {
    SvelteFlow,
    Controls,
    Background,
    MiniMap,
    type Node,
    type Edge,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { currentStory, selectedPassageId, projectActions } from '../stores/projectStore';
  import { filteredPassages, hasActiveFilters } from '../stores/filterStore';
  import PassageNode from './graph/PassageNode.svelte';
  import SearchBar from './SearchBar.svelte';
  import {
    getLayoutedElements,
    getForceLayoutElements,
    getCircularLayoutElements,
    type LayoutOptions,
  } from '../utils/graphLayout';

  // Node types
  const nodeTypes = {
    passage: PassageNode,
  };

  // Flow state
  const nodes = writable<Node[]>([]);
  const edges = writable<Edge[]>([]);
  let layoutDirection: 'TB' | 'LR' = 'TB';

  // Convert story passages to flow nodes and edges
  function updateGraph() {
    if (!$currentStory) {
      nodes.set([]);
      edges.set([]);
      return;
    }

    // Get filtered passage IDs for quick lookup
    const filteredIds = new Set($filteredPassages.map(p => p.id));

    // Create nodes from passages
    const flowNodes: Node[] = Array.from($currentStory.passages.values()).map((passage) => {
      const isStart = $currentStory.startPassage === passage.id;
      const isOrphan = !isStart && !hasIncomingConnections(passage.id);
      const isDead = passage.choices.length === 0;
      const isFiltered = filteredIds.has(passage.id);

      return {
        id: passage.id,
        type: 'passage',
        data: {
          passage,
          isStart,
          isOrphan,
          isDead,
          isFiltered,
        },
        position: passage.position || { x: 0, y: 0 },
        hidden: $hasActiveFilters && !isFiltered,
      };
    });

    // Create edges from choices
    const flowEdges: Edge[] = [];
    $currentStory.passages.forEach((passage) => {
      passage.choices.forEach((choice) => {
        if (choice.target) {
          // Hide edge if either source or target is hidden
          const sourceHidden = $hasActiveFilters && !filteredIds.has(passage.id);
          const targetHidden = $hasActiveFilters && !filteredIds.has(choice.target);

          flowEdges.push({
            id: `${passage.id}-${choice.id}`,
            source: passage.id,
            target: choice.target,
            label: choice.text,
            type: choice.condition ? 'step' : 'smoothstep',
            animated: !!choice.condition,
            style: choice.condition ? 'stroke-dasharray: 5, 5' : undefined,
            hidden: sourceHidden || targetHidden,
          });
        }
      });
    });

    nodes.set(flowNodes);
    edges.set(flowEdges);
  }

  // Check if a passage has incoming connections
  function hasIncomingConnections(passageId: string): boolean {
    if (!$currentStory) return false;

    for (const passage of $currentStory.passages.values()) {
      if (passage.choices.some((choice) => choice.target === passageId)) {
        return true;
      }
    }
    return false;
  }

  // Apply auto-layout
  function handleAutoLayout(type: 'hierarchical' | 'force' | 'circular' = 'hierarchical') {
    const currentNodes = $nodes;
    const currentEdges = $edges;

    let layouted;
    if (type === 'hierarchical') {
      const options: LayoutOptions = {
        direction: layoutDirection,
        nodeWidth: 250,
        nodeHeight: 150,
      };
      layouted = getLayoutedElements(currentNodes, currentEdges, options);
    } else if (type === 'circular') {
      layouted = getCircularLayoutElements(currentNodes, currentEdges);
    } else {
      layouted = getForceLayoutElements(currentNodes, currentEdges);
    }

    nodes.set(layouted.nodes);

    // Update passage positions in the story
    if ($currentStory) {
      layouted.nodes.forEach((node) => {
        const passage = $currentStory!.getPassage(node.id);
        if (passage) {
          passage.position = node.position;
        }
      });
      currentStory.update(s => s);
      projectActions.markChanged();
    }
  }

  // Handle node drag end - save position
  function handleNodeDragStop(event: CustomEvent) {
    const { targetNode } = event.detail;
    if (!$currentStory || !targetNode) return;

    const passage = $currentStory.getPassage(targetNode.id);
    if (passage) {
      passage.position = targetNode.position;
      currentStory.update(s => s);
      projectActions.markChanged();
    }
  }

  // Handle node click - select passage
  function handleNodeClick(event: CustomEvent) {
    const { node } = event.detail;
    if (node) {
      selectedPassageId.set(node.id);
    }
  }

  // Handle node double-click - edit passage (could open modal)
  function handleNodeDoubleClick(event: CustomEvent) {
    const { node } = event.detail;
    if (node) {
      selectedPassageId.set(node.id);
      // Could trigger a modal here or focus on properties panel
    }
  }

  // React to story changes and filter changes
  $: if ($currentStory) {
    updateGraph();
  }

  // Update graph when filters change
  $: if ($filteredPassages || $hasActiveFilters !== undefined) {
    updateGraph();
  }

  // Highlight selected node
  $: {
    const currentNodes = $nodes;
    const selectedId = $selectedPassageId;

    nodes.set(
      currentNodes.map((node) => ({
        ...node,
        selected: node.id === selectedId,
      }))
    );
  }
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- Search and Filter Bar -->
  <SearchBar />

  <!-- Toolbar -->
  <div class="bg-white border-b border-gray-300 p-2 flex items-center gap-2 z-10">
    <span class="text-sm font-medium text-gray-700">Layout:</span>
    <button
      class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      on:click={() => handleAutoLayout('hierarchical')}
      title="Arrange passages hierarchically"
    >
      Hierarchical
    </button>
    <button
      class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      on:click={() => handleAutoLayout('circular')}
      title="Arrange passages in a circle"
    >
      Circular
    </button>
    <button
      class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      on:click={() => handleAutoLayout('force')}
      title="Arrange passages in a grid"
    >
      Grid
    </button>

    <div class="border-l border-gray-300 h-6 mx-2"></div>

    <label class="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="radio"
        bind:group={layoutDirection}
        value="TB"
        on:change={() => handleAutoLayout('hierarchical')}
      />
      Top-Bottom
    </label>
    <label class="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="radio"
        bind:group={layoutDirection}
        value="LR"
        on:change={() => handleAutoLayout('hierarchical')}
      />
      Left-Right
    </label>
  </div>

  <!-- Graph -->
  <div class="flex-1 relative">
    {#if $currentStory}
      <SvelteFlow
        {nodes}
        {edges}
        {nodeTypes}
        fitView
        on:nodedragstop={handleNodeDragStop}
        on:nodeclick={handleNodeClick}
        on:nodedoubleclick={handleNodeDoubleClick}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.data.isStart) return '#10b981';
            if (node.data.isDead) return '#ef4444';
            if (node.data.isOrphan) return '#f59e0b';
            return '#3b82f6';
          }}
        />
      </SvelteFlow>
    {:else}
      <div class="flex items-center justify-center h-full text-gray-400">
        <div class="text-center">
          <div class="text-6xl mb-4">🗺️</div>
          <h2 class="text-2xl font-bold mb-2">No Story Loaded</h2>
          <p>Create or open a story to see the graph view</p>
        </div>
      </div>
    {/if}
  </div>
</div>
