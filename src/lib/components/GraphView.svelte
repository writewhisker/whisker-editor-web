<script lang="ts">
  import { writable, get } from 'svelte/store';
  import {
    SvelteFlow,
    Controls,
    Background,
    MiniMap,
    useSvelteFlow,
    type Node,
    type Edge,
    type Connection,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { currentStory, selectedPassageId, projectActions } from '../stores/projectStore';
  import { filteredPassages, hasActiveFilters, isOrphanPassage, isDeadEndPassage } from '../stores/filterStore';
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
  import { validationResult, validationActions } from '../stores/validationStore';
  import type { ValidationIssue } from '../validation/types';
  import { prefersReducedMotion } from '../utils/motion';

  // Get Svelte Flow instance for programmatic control
  const { fitBounds } = useSvelteFlow();

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
  let currentZoom = 1; // Track current zoom level

  // Debounce timer for updateGraph
  let updateGraphTimer: ReturnType<typeof setTimeout> | null = null;
  const UPDATE_GRAPH_DEBOUNCE_MS = 50; // 50ms debounce for graph updates

  // Convert story passages to flow nodes and edges
  function updateGraph() {
    if (!$currentStory) {
      nodes.set([]);
      edges.set([]);
      return;
    }

    // Create lookup maps for validation issues
    const passageIssues = new Map<string, ValidationIssue[]>();
    const brokenEdges = new Set<string>();

    // Use validation results from store if available
    if ($validationResult && Array.isArray($validationResult.issues)) {
      $validationResult.issues.forEach((issue) => {
        // Track passage-level issues (only if issue has passageId)
        if (issue.passageId) {
          if (!passageIssues.has(issue.passageId)) {
            passageIssues.set(issue.passageId, []);
          }
          passageIssues.get(issue.passageId)!.push(issue);

          // Track broken connections (dead links)
          if (issue.category === 'links' && issue.choiceId) {
            brokenEdges.add(`${issue.passageId}-${issue.choiceId}`);
          }
        }
      });
    }

    // Get filtered passage IDs for quick lookup
    const filteredIds = new Set($filteredPassages.map(p => p.id));

    // Create nodes from passages (using cached metadata)
    const flowNodes: Node[] = Array.from($currentStory.passages.values()).map((passage) => {
      const isStart = $currentStory.startPassage === passage.id;
      const isOrphan = isOrphanPassage(passage, $currentStory);
      const isDead = isDeadEndPassage(passage, $currentStory);
      const isFiltered = filteredIds.has(passage.id);
      const issues = passageIssues.get(passage.id) || [];

      return {
        id: passage.id,
        type: 'passage',
        data: {
          passage,
          isStart,
          isOrphan,
          isDead,
          isFiltered,
          validationIssues: issues,
          color: passage.color,
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
          const edgeId = `${passage.id}-${choice.id}`;
          const isBroken = brokenEdges.has(edgeId);

          flowEdges.push({
            id: edgeId,
            source: passage.id,
            target: choice.target,
            sourceHandle: `choice-${choice.id}`,
            type: 'connection',
            animated: !!choice.condition && !$prefersReducedMotion, // Respect motion preferences
            hidden: sourceHidden || targetHidden,
            data: {
              choiceText: choice.text,
              hasCondition: !!choice.condition,
              choiceId: choice.id,
              passageId: passage.id,
              isBroken,
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
  // Helper function to snap position to grid
  function snapToGrid(position: { x: number; y: number }): { x: number; y: number } {
    try {
      const gridSnapEnabled = localStorage.getItem('whisker-grid-snap-enabled') === 'true';
      if (!gridSnapEnabled) return position;

      const gridSize = parseInt(localStorage.getItem('whisker-grid-size') || '20', 10);
      return {
        x: Math.round(position.x / gridSize) * gridSize,
        y: Math.round(position.y / gridSize) * gridSize,
      };
    } catch (error) {
      return position; // Fallback to original position if error
    }
  }

  function handleNodeDragStop(event: CustomEvent) {
    const { targetNode } = event.detail;
    if (!$currentStory || !targetNode) return;

    const passage = $currentStory.getPassage(targetNode.id);
    if (passage) {
      // Apply grid snap if enabled
      const snappedPosition = snapToGrid(targetNode.position);
      passage.position = snappedPosition;

      // Update the node position in the flow to reflect the snap
      nodes.update(ns => {
        const node = ns.find(n => n.id === targetNode.id);
        if (node) {
          node.position = snappedPosition;
        }
        return ns;
      });

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

  // Debounced graph update for better performance
  function debouncedUpdateGraph() {
    if (updateGraphTimer) {
      clearTimeout(updateGraphTimer);
    }
    updateGraphTimer = setTimeout(() => {
      updateGraph();
    }, UPDATE_GRAPH_DEBOUNCE_MS);
  }

  // React to story changes (debounced for better performance with rapid changes)
  $: if ($currentStory) {
    debouncedUpdateGraph();
  }

  // Update graph when filters change (debounced)
  $: if ($filteredPassages || $hasActiveFilters !== undefined) {
    debouncedUpdateGraph();
  }

  // Zoom to selected passage
  function zoomToSelection() {
    if (!$selectedPassageId) return;

    const selectedNode = $nodes.find(n => n.id === $selectedPassageId);
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

  // Highlight selected node (optimized to avoid full array recreation)
  $: {
    const currentNodes = $nodes;
    const selectedId = $selectedPassageId;

    // Only update if selection actually changed
    const currentlySelected = currentNodes.find(n => n.selected)?.id;
    if (currentlySelected !== selectedId) {
      nodes.update(nodes =>
        nodes.map((node) => {
          // Only create new object if selection state changes
          if (node.id === selectedId && !node.selected) {
            return { ...node, selected: true };
          } else if (node.id === currentlySelected && node.selected) {
            return { ...node, selected: false };
          }
          return node;
        })
      );
    }
  }
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- Search and Filter Bar -->
  <SearchBar />

  <!-- Validation Summary Bar -->
  {#if $validationResult && ($validationResult.errorCount > 0 || $validationResult.warningCount > 0)}
    <div class="bg-white border-b border-gray-300 px-3 py-2 flex items-center gap-4 text-sm">
      <span class="font-medium text-gray-700">Connection Issues:</span>
      {#if $validationResult.errorCount > 0}
        <span class="px-2 py-1 bg-red-100 text-red-700 rounded flex items-center gap-1">
          <span>❌</span>
          <span>{$validationResult.errorCount} {$validationResult.errorCount === 1 ? 'error' : 'errors'}</span>
        </span>
      {/if}
      {#if $validationResult.warningCount > 0}
        <span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded flex items-center gap-1">
          <span>⚠️</span>
          <span>{$validationResult.warningCount} {$validationResult.warningCount === 1 ? 'warning' : 'warnings'}</span>
        </span>
      {/if}
      {#if $validationResult.infoCount > 0}
        <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
          <span>ℹ️</span>
          <span>{$validationResult.infoCount} circular {$validationResult.infoCount === 1 ? 'path' : 'paths'}</span>
        </span>
      {/if}
    </div>
  {/if}

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

    <div class="border-l border-gray-300 h-6 mx-2"></div>

    <button
      class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      on:click={zoomToSelection}
      disabled={!$selectedPassageId}
      title="Zoom to selected passage (Z)"
    >
      🔍 Zoom to Selection
    </button>
  </div>

  <!-- Graph -->
  <div class="flex-1 relative">
    {#if $currentStory}
      <SvelteFlow
        nodes={$nodes}
        edges={$edges}
        {nodeTypes}
        {edgeTypes}
        fitView
        onnodedragstop={(e: any) => handleNodeDragStop(e as CustomEvent)}
        onnodeclick={(e: any) => handleNodeClick(e as CustomEvent)}
        onconnect={(e: any) => handleConnect(e.detail)}
        onmove={(e: any) => {
          if (e.detail?.viewport) {
            currentZoom = e.detail.viewport.zoom;
          }
        }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node: Node) => {
            // Use custom color if set
            if (node.data?.color) return node.data.color as string;
            // Otherwise use status-based colors
            if (node.data?.isStart) return '#10b981';
            if (node.data?.isDead) return '#ef4444';
            if (node.data?.isOrphan) return '#f59e0b';
            return '#3b82f6';
          }}
        />
      </SvelteFlow>

      <!-- Zoom Level Indicator -->
      <div class="absolute bottom-4 left-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 shadow-md text-sm font-mono">
        <span class="text-gray-600 dark:text-gray-400">Zoom:</span>
        <span class="ml-1 font-semibold text-gray-900 dark:text-gray-100">{Math.round(currentZoom * 100)}%</span>
      </div>
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
