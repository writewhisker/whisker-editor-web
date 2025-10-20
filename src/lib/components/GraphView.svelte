<script lang="ts">
  import { writable } from 'svelte/store';
  import {
    SvelteFlow,
    Controls,
    Background,
    MiniMap,
    type Node,
    type Edge,
    type Connection,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { currentStory, selectedPassageId, projectActions } from '../stores/projectStore';
  import { filteredPassages, hasActiveFilters } from '../stores/filterStore';
  import PassageNode from './graph/PassageNode.svelte';
  import ConnectionEdge from './graph/ConnectionEdge.svelte';
  import SearchBar from './SearchBar.svelte';
  import { Choice } from '../models/Choice';
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

  // Edge types
  const edgeTypes = {
    connection: ConnectionEdge,
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
            sourceHandle: `choice-${choice.id}`,
            type: 'connection',
            animated: !!choice.condition,
            hidden: sourceHidden || targetHidden,
            data: {
              choiceText: choice.text,
              hasCondition: !!choice.condition,
              choiceId: choice.id,
              passageId: passage.id,
              onEdit: handleEdgeEdit,
              onContextMenu: handleEdgeContextMenu,
            },
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

  // Handle edge (choice) text editing
  function handleEdgeEdit(edgeId: string, newText: string) {
    if (!$currentStory) return;

    // Parse edge ID to get passage and choice IDs
    const [passageId, choiceId] = edgeId.split('-');
    const passage = $currentStory.getPassage(passageId);

    if (passage) {
      const choice = passage.choices.find(c => c.id === choiceId);
      if (choice) {
        choice.text = newText;
        currentStory.update(s => s);
        projectActions.markChanged();
        updateGraph();
      }
    }
  }

  // Handle edge context menu
  let edgeContextMenu = {
    show: false,
    x: 0,
    y: 0,
    edgeId: '',
  };

  function handleEdgeContextMenu(edgeId: string, x: number, y: number) {
    edgeContextMenu = {
      show: true,
      x,
      y,
      edgeId,
    };
  }

  function closeEdgeContextMenu() {
    edgeContextMenu.show = false;
  }

  function deleteEdge(edgeId: string) {
    if (!$currentStory) return;

    const [passageId, choiceId] = edgeId.split('-');
    const passage = $currentStory.getPassage(passageId);

    if (passage) {
      if (confirm('Delete this connection?')) {
        passage.removeChoice(choiceId);
        currentStory.update(s => s);
        projectActions.markChanged();
        updateGraph();
      }
    }
    closeEdgeContextMenu();
  }

  function editEdgeCondition(edgeId: string) {
    if (!$currentStory) return;

    const [passageId, choiceId] = edgeId.split('-');
    const passage = $currentStory.getPassage(passageId);

    if (passage) {
      const choice = passage.choices.find(c => c.id === choiceId);
      if (choice) {
        const condition = prompt('Enter condition (leave empty for no condition):', choice.condition || '');
        if (condition !== null) {
          choice.condition = condition.trim() || undefined;
          currentStory.update(s => s);
          projectActions.markChanged();
          updateGraph();
        }
      }
    }
    closeEdgeContextMenu();
  }

  // Handle connection creation
  function handleConnect(connection: Connection) {
    if (!$currentStory) return;

    const sourceId = connection.source;
    const targetId = connection.target;
    const sourceHandleId = connection.sourceHandle;

    // Validate connection
    if (!sourceId || !targetId) return;
    if (sourceId === targetId) {
      console.warn('Cannot connect passage to itself');
      return;
    }

    const sourcePassage = $currentStory.getPassage(sourceId);
    const targetPassage = $currentStory.getPassage(targetId);

    if (!sourcePassage || !targetPassage) {
      console.warn('Invalid passage connection');
      return;
    }

    // Check if connecting from an existing choice handle or the "new connection" handle
    if (sourceHandleId && sourceHandleId.startsWith('choice-')) {
      // Connecting from existing choice - update its target
      const choiceId = sourceHandleId.replace('choice-', '');
      const choice = sourcePassage.choices.find(c => c.id === choiceId);

      if (choice) {
        // Check if this would create a duplicate connection
        if (choice.target === targetId) {
          console.warn('Connection already exists');
          return;
        }

        // Update existing choice target
        choice.target = targetId;
        currentStory.update(s => s);
        projectActions.markChanged();
        updateGraph();
      }
    } else {
      // Creating new connection from "new-connection" handle
      // Check for duplicate connections
      const hasDuplicate = sourcePassage.choices.some(c => c.target === targetId);
      if (hasDuplicate) {
        console.warn('Connection to this passage already exists');
        return;
      }

      // Create new choice
      const newChoice = new Choice({
        text: `Go to ${targetPassage.title}`,
        target: targetId,
      });

      sourcePassage.addChoice(newChoice);
      currentStory.update(s => s);
      projectActions.markChanged();
      updateGraph();
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
        {edgeTypes}
        fitView
        on:nodedragstop={handleNodeDragStop}
        on:nodeclick={handleNodeClick}
        on:nodedoubleclick={handleNodeDoubleClick}
        on:connect={handleConnect}
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

  <!-- Edge Context Menu -->
  {#if edgeContextMenu.show}
    <div
      class="fixed bg-white border border-gray-300 rounded shadow-lg z-50 py-1 min-w-[180px]"
      style="left: {edgeContextMenu.x}px; top: {edgeContextMenu.y}px;"
      on:click|stopPropagation
      role="menu"
      tabindex="-1"
    >
      <button
        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
        on:click={() => editEdgeCondition(edgeContextMenu.edgeId)}
      >
        <span>⚡</span>
        Edit Condition
      </button>
      <div class="border-t border-gray-200 my-1"></div>
      <button
        class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        on:click={() => deleteEdge(edgeContextMenu.edgeId)}
      >
        <span>🗑️</span>
        Delete Connection
      </button>
    </div>
  {/if}
</div>

<svelte:window on:click={closeEdgeContextMenu} />
