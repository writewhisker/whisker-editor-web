<script lang="ts">
  import { onMount } from 'svelte';
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
  import { currentStory, selectedPassageId, projectActions, unsavedChanges } from '../stores/projectStore';
  import { filteredPassages, hasActiveFilters, isOrphanPassage, isDeadEndPassage } from '../stores/filterStore';
  import PassageNode from './graph/PassageNode.svelte';
  import ConnectionEdge from './graph/ConnectionEdge.svelte';
  import SearchBar from './SearchBar.svelte';
  import { Choice } from '../models/Choice';
  import { Passage } from '../models/Passage';
  import { historyActions } from '../stores/historyStore';
  import {
    getLayoutedElements,
    getForceLayoutElements,
    getGridLayoutElements,
    getCircularLayoutElements,
    type LayoutOptions,
  } from '../utils/graphLayout';
  import { validationResult, validationActions } from '../stores/validationStore';
  import type { ValidationIssue } from '../validation/types';
  import { prefersReducedMotion } from '../utils/motion';
  import GraphViewZoomControl from './graph/GraphViewZoomControl.svelte';
  import MobileToolbar from './graph/MobileToolbar.svelte';
  import { isMobile, isTouch, setupPinchZoom } from '../utils/mobile';
  import { graphLayout, viewMode, viewPreferencesActions, type LayoutAlgorithm } from '../stores/viewPreferencesStore';
  import { notificationStore } from '../stores/notificationStore';
  import { FolderManager } from '../utils/folderManager';

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
  let currentZoom = 1; // Track current zoom level
  let zoomControl: GraphViewZoomControl; // Reference to zoom control component
  let showMiniMap = true; // Track minimap visibility
  let flowContainer: HTMLElement; // Reference to flow container for pinch zoom

  // Track if positions have been manually adjusted (to show warning before applying layout)
  let hasManualPositions = false;

  // Multi-select state
  let selectMode = false;
  let selectedNodes = new Set<string>();

  // Get Svelte Flow instance for programmatic zoom control
  const { zoomIn: flowZoomIn, zoomOut: flowZoomOut, fitView: flowFitView, getViewport } = useSvelteFlow();

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

  // Apply layout algorithm
  function applyLayout(algorithm?: LayoutAlgorithm) {
    const layoutType = algorithm || $graphLayout.algorithm;

    // Don't apply if manual mode
    if (layoutType === 'manual') {
      return;
    }

    const currentNodes = $nodes;
    const currentEdges = $edges;

    if (currentNodes.length === 0) return;

    let layouted;
    switch (layoutType) {
      case 'hierarchical':
        const options: LayoutOptions = {
          direction: $graphLayout.direction,
          nodeWidth: 250,
          nodeHeight: 150,
        };
        layouted = getLayoutedElements(currentNodes, currentEdges, options);
        break;
      case 'circular':
        layouted = getCircularLayoutElements(currentNodes, currentEdges);
        break;
      case 'grid':
        layouted = getGridLayoutElements(currentNodes, currentEdges);
        break;
      case 'force':
        layouted = getForceLayoutElements(currentNodes, currentEdges);
        break;
      default:
        return;
    }

    // Animate the layout change if motion is enabled
    const duration = $prefersReducedMotion ? 0 : 300;

    // Update nodes with animation
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
      hasManualPositions = false; // Reset manual position flag after applying layout
    }

    // Fit view after layout with animation
    setTimeout(() => {
      flowFitView({ duration, padding: 0.1 });
    }, duration);
  }

  // Reset to manual mode
  function resetToManual() {
    viewPreferencesActions.setGraphLayoutAlgorithm('manual');
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

  function handleNodeDragStop(event: any) {
    // Handle different event structures from @xyflow/svelte
    const targetNode = event?.detail?.targetNode || event?.detail?.node || event?.node;
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
      hasManualPositions = true; // Mark that manual adjustments have been made
    }
  }

  // Handle node click - select passage
  function handleNodeClick(event: any) {
    const node = event?.detail?.node || event?.node;
    if (!node) return;

    // In select mode, toggle node selection
    if (selectMode) {
      if (selectedNodes.has(node.id)) {
        selectedNodes.delete(node.id);
      } else {
        selectedNodes.add(node.id);
      }
      selectedNodes = selectedNodes;
    } else {
      // Normal mode - select single passage
      selectedPassageId.set(node.id);

      // If in graph-only mode, switch to split view to show passage editor
      if (get(viewMode) === 'graph') {
        viewPreferencesActions.setViewMode('split');
      }
    }
  }

  // Handle node double-click - edit passage (could open modal)
  function handleNodeDoubleClick(event: any) {
    const node = event?.detail?.node || event?.node;
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

  // Passage templates
  const passageTemplates = {
    blank: { title: 'New Passage', content: '' },
    choice: {
      title: 'Choice Passage',
      content: 'What do you do?\n\n[[Option 1]]\n[[Option 2]]\n[[Option 3]]'
    },
    conversation: {
      title: 'Conversation',
      content: '"Hello there," says the stranger.\n\n[[Ask who they are]]\n[[Say hello back]]\n[[Walk away]]'
    },
    description: {
      title: 'Description',
      content: 'You find yourself in a new location. [Describe the setting here]\n\n[[Continue]]'
    },
    checkpoint: {
      title: 'Checkpoint',
      content: '<<set $chapter = 2>>\n\nChapter 2: [Title]\n\n[Story continues...]\n\n[[Next]]'
    },
    ending: {
      title: 'Ending',
      content: 'THE END\n\n[Describe how the story concludes]\n\n[[Start Over->Start]]'
    }
  };

  // Handle edge context menu
  let edgeContextMenu = {
    show: false,
    x: 0,
    y: 0,
    edgeId: '',
  };

  // Handle graph context menu (right-click on empty space)
  let graphContextMenu = {
    show: false,
    x: 0,
    y: 0,
    clickPosition: { x: 0, y: 0 },
    showSubmenu: false,
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

  function handlePaneContextMenu(event: any) {
    // Get the mouse position from the event
    const mouseX = event.clientX || event.detail?.clientX || 0;
    const mouseY = event.clientY || event.detail?.clientY || 0;

    // Get the flow viewport position (for placing the passage)
    const viewport = getViewport();
    const flowX = (mouseX - viewport.x) / viewport.zoom;
    const flowY = (mouseY - viewport.y) / viewport.zoom;

    graphContextMenu = {
      show: true,
      x: mouseX,
      y: mouseY,
      clickPosition: { x: flowX, y: flowY },
      showSubmenu: false,
    };
  }

  function closeGraphContextMenu() {
    graphContextMenu.show = false;
    graphContextMenu.showSubmenu = false;
  }

  function toggleTemplateSubmenu() {
    graphContextMenu.showSubmenu = !graphContextMenu.showSubmenu;
  }

  function addPassageWithTemplate(templateKey: string) {
    if (!$currentStory) return;

    const template = passageTemplates[templateKey as keyof typeof passageTemplates];
    if (!template) return;

    // Create passage with template content at the clicked position
    const passage = new Passage({
      title: template.title,
      content: template.content,
      position: graphContextMenu.clickPosition,
    });

    currentStory.update(story => {
      if (story) {
        story.addPassage(passage);
        selectedPassageId.set(passage.id);
        unsavedChanges.set(true);
      }
      return story;
    });

    // Save new state to history
    const newState = get(currentStory);
    if (newState) {
      historyActions.pushState(newState.serialize());
    }

    updateGraph();
    closeGraphContextMenu();
  }

  // Double-click detection for pane
  let paneClickTimer: ReturnType<typeof setTimeout> | null = null;
  let paneClickCount = 0;
  const DOUBLE_CLICK_DELAY = 300; // ms

  // Handle pane click - detect double-click for quick passage creation
  function handlePaneClick(event: any) {
    paneClickCount++;

    if (paneClickCount === 1) {
      // First click - start timer
      paneClickTimer = setTimeout(() => {
        // Single click - do nothing special
        paneClickCount = 0;
      }, DOUBLE_CLICK_DELAY);
    } else if (paneClickCount === 2) {
      // Second click - this is a double-click!
      if (paneClickTimer) {
        clearTimeout(paneClickTimer);
        paneClickTimer = null;
      }
      paneClickCount = 0;

      // Create passage at double-click location
      createPassageAtClick(event);
    }
  }

  function createPassageAtClick(event: any) {
    if (!$currentStory) return;

    // Get the mouse position from the event
    const mouseX = event.clientX || event.detail?.event?.clientX || event.detail?.clientX || 0;
    const mouseY = event.clientY || event.detail?.event?.clientY || event.detail?.clientY || 0;

    // Get the flow viewport position (for placing the passage)
    const viewport = getViewport();
    const flowX = (mouseX - viewport.x) / viewport.zoom;
    const flowY = (mouseY - viewport.y) / viewport.zoom;

    // Create a new blank passage at the double-clicked position
    const passage = new Passage({
      title: 'New Passage',
      content: '',
      position: { x: flowX, y: flowY },
    });

    currentStory.update(story => {
      if (story) {
        story.addPassage(passage);
        selectedPassageId.set(passage.id);
        unsavedChanges.set(true);
      }
      return story;
    });

    // Save new state to history
    const newState = get(currentStory);
    if (newState) {
      historyActions.pushState(newState.serialize());
    }

    // Auto-switch to split view to show passage editor
    if (get(viewMode) === 'graph') {
      viewPreferencesActions.setViewMode('split');
    }

    updateGraph();
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
  function handleConnect(event: any) {
    if (!$currentStory) return;

    // Extract connection from event (handle different event structures)
    const connection = event?.detail || event;

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

      // Create new choice with default text
      const defaultText = `Go to ${targetPassage.title}`;
      const newChoice = new Choice({
        text: defaultText,
        target: targetId,
      });

      sourcePassage.addChoice(newChoice);
      currentStory.update(s => s);
      projectActions.markChanged();
      updateGraph();

      // Prompt user to customize the choice text
      setTimeout(() => {
        const customText = prompt('Enter choice text:', defaultText);
        if (customText !== null && customText.trim() !== '') {
          newChoice.text = customText.trim();
          currentStory.update(s => s);
          projectActions.markChanged();
          updateGraph();
        }
      }, 100); // Small delay to ensure graph is updated first
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
    if (zoomControl) {
      zoomControl.zoomToSelection();
    }
  }

  // Mobile toolbar event handlers
  function handleMobileAddPassage() {
    projectActions.addPassage();
  }

  function handleMobileFitView() {
    flowFitView({ duration: $prefersReducedMotion ? 0 : 400 });
  }

  function handleMobileZoomIn() {
    flowZoomIn({ duration: $prefersReducedMotion ? 0 : 200 });
  }

  function handleMobileZoomOut() {
    flowZoomOut({ duration: $prefersReducedMotion ? 0 : 200 });
  }

  function handleMobileToggleMiniMap() {
    showMiniMap = !showMiniMap;
  }

  // Pinch-to-zoom support for touch devices
  let initialPinchZoom = 1;

  function handlePinchZoom(scale: number, centerX: number, centerY: number) {
    // Get current viewport
    const viewport = getViewport();

    // Calculate zoom direction based on scale change
    if (scale > initialPinchZoom) {
      flowZoomIn({ duration: 0 });
    } else if (scale < initialPinchZoom) {
      flowZoomOut({ duration: 0 });
    }

    // Update initial pinch zoom for next comparison
    initialPinchZoom = scale;

    // Update current zoom display
    currentZoom = viewport.zoom;
  }

  function handlePinchStart() {
    const viewport = getViewport();
    initialPinchZoom = 1; // Reset scale reference
  }

  function handlePinchEnd() {
    // Optional: Add any cleanup or final adjustments
  }

  // Setup pinch-to-zoom on mount
  onMount(() => {
    if (!flowContainer || !$isTouch) return;

    const cleanup = setupPinchZoom(flowContainer, {
      onPinchZoom: handlePinchZoom,
      onPinchStart: handlePinchStart,
      onPinchEnd: handlePinchEnd,
      scaleThreshold: 5, // Slightly higher threshold for smoother experience
    });

    return cleanup;
  });

  // Multi-select functions
  function toggleSelectMode() {
    selectMode = !selectMode;
    if (!selectMode) {
      clearSelection();
    }
  }

  function clearSelection() {
    selectedNodes.clear();
    selectedNodes = selectedNodes;
  }

  function selectAll() {
    selectedNodes.clear();
    $nodes.filter(n => !n.hidden).forEach(n => {
      selectedNodes.add(n.id);
    });
    selectedNodes = selectedNodes;
  }

  function bulkDelete() {
    if (selectedNodes.size === 0 || !$currentStory) return;

    const count = selectedNodes.size;
    if (confirm(`Delete ${count} selected passage${count !== 1 ? 's' : ''}?`)) {
      selectedNodes.forEach(id => {
        $currentStory.removePassage(id);
      });
      currentStory.update(s => s);
      projectActions.markChanged();
      clearSelection();
      updateGraph();
    }
  }

  function bulkAddTag() {
    if (selectedNodes.size === 0 || !$currentStory) return;

    const tagName = prompt('Enter tag name to add to selected passages:');
    if (!tagName || !tagName.trim()) return;

    const trimmedTag = tagName.trim();
    selectedNodes.forEach(id => {
      const passage = $currentStory.getPassage(id);
      if (passage && !passage.tags.includes(trimmedTag)) {
        passage.tags.push(trimmedTag);
      }
    });
    currentStory.update(s => s);
    projectActions.markChanged();
    clearSelection();
  }

  function bulkRemoveTag() {
    if (selectedNodes.size === 0 || !$currentStory) return;

    const tagName = prompt('Enter tag name to remove from selected passages:');
    if (!tagName || !tagName.trim()) return;

    const trimmedTag = tagName.trim();
    selectedNodes.forEach(id => {
      const passage = $currentStory.getPassage(id);
      if (passage) {
        passage.tags = passage.tags.filter(t => t !== trimmedTag);
      }
    });
    currentStory.update(s => s);
    projectActions.markChanged();
    clearSelection();
  }

  function bulkMove() {
    if (selectedNodes.size === 0 || !$currentStory) return;

    const deltaXStr = prompt('Enter horizontal offset (pixels):');
    const deltaYStr = prompt('Enter vertical offset (pixels):');

    if (!deltaXStr || !deltaYStr) return;

    const deltaX = parseFloat(deltaXStr);
    const deltaY = parseFloat(deltaYStr);

    if (isNaN(deltaX) || isNaN(deltaY)) {
      alert('Invalid offset values');
      return;
    }

    selectedNodes.forEach(id => {
      const passage = $currentStory.getPassage(id);
      if (passage && passage.position) {
        passage.position = {
          x: passage.position.x + deltaX,
          y: passage.position.y + deltaY,
        };
      }
    });

    currentStory.update(s => s);
    projectActions.markChanged();
    updateGraph();
    clearSelection();
  }

  function bulkDuplicate() {
    if (selectedNodes.size === 0 || !$currentStory) return;

    const count = selectedNodes.size;
    if (confirm(`Duplicate ${count} selected passage${count !== 1 ? 's' : ''}?`)) {
      const newPassageIds: string[] = [];

      selectedNodes.forEach(id => {
        const duplicated = projectActions.duplicatePassage(id);
        if (duplicated) {
          newPassageIds.push(duplicated.id);
          // Offset duplicates slightly
          if (duplicated.position) {
            duplicated.position.x += 50;
            duplicated.position.y += 50;
          }
        }
      });

      currentStory.update(s => s);
      updateGraph();

      // Select the duplicated passages
      clearSelection();
      newPassageIds.forEach(id => selectedNodes.add(id));
      selectedNodes = selectedNodes;

      notificationStore.success(`Duplicated ${count} passage${count !== 1 ? 's' : ''}`);
    }
  }

  function selectByTag() {
    if (!$currentStory) return;

    const tagName = prompt('Enter tag name to select passages:');
    if (!tagName || !tagName.trim()) return;

    const trimmedTag = tagName.trim();
    clearSelection();

    $currentStory.passages.forEach(passage => {
      if (passage.tags.includes(trimmedTag)) {
        selectedNodes.add(passage.id);
      }
    });

    selectedNodes = selectedNodes;
    if (selectedNodes.size > 0) {
      selectMode = true;
      notificationStore.success(`Selected ${selectedNodes.size} passage${selectedNodes.size !== 1 ? 's' : ''} with tag "${trimmedTag}"`);
    } else {
      notificationStore.info(`No passages found with tag "${trimmedTag}"`);
    }
  }

  function selectOrphans() {
    if (!$currentStory) return;

    clearSelection();
    $nodes.forEach(node => {
      if (node.data?.isOrphan) {
        selectedNodes.add(node.id);
      }
    });

    selectedNodes = selectedNodes;
    if (selectedNodes.size > 0) {
      selectMode = true;
      notificationStore.success(`Selected ${selectedNodes.size} orphaned passage${selectedNodes.size !== 1 ? 's' : ''}`);
    } else {
      notificationStore.info('No orphaned passages found');
    }
  }

  function selectDeadEnds() {
    if (!$currentStory) return;

    clearSelection();
    $nodes.forEach(node => {
      if (node.data?.isDead) {
        selectedNodes.add(node.id);
      }
    });

    selectedNodes = selectedNodes;
    if (selectedNodes.size > 0) {
      selectMode = true;
      notificationStore.success(`Selected ${selectedNodes.size} dead-end passage${selectedNodes.size !== 1 ? 's' : ''}`);
    } else {
      notificationStore.info('No dead-end passages found');
    }
  }

  function selectByFolder() {
    if (!$currentStory) return;

    const folders = FolderManager.getAllFolders($currentStory);
    if (folders.length === 0) {
      notificationStore.info('No folders found. Create folders by using "Move to Folder" action.');
      return;
    }

    const folderList = folders.map(f => `${f.name} (${f.passageCount})`).join('\n');
    const folderName = prompt(`Enter folder name to select:\n\nAvailable folders:\n${folderList}`);

    if (!folderName || !folderName.trim()) return;

    const trimmedFolder = folderName.trim();
    clearSelection();

    $currentStory.passages.forEach(passage => {
      if (FolderManager.getFolder(passage) === trimmedFolder) {
        selectedNodes.add(passage.id);
      }
    });

    selectedNodes = selectedNodes;
    if (selectedNodes.size > 0) {
      selectMode = true;
      notificationStore.success(`Selected ${selectedNodes.size} passage${selectedNodes.size !== 1 ? 's' : ''} in folder "${trimmedFolder}"`);
    } else {
      notificationStore.info(`No passages found in folder "${trimmedFolder}"`);
    }
  }

  function bulkMoveToFolder() {
    if (selectedNodes.size === 0 || !$currentStory) return;

    const folders = FolderManager.getAllFolders($currentStory);
    const folderList = folders.length > 0
      ? `\n\nExisting folders:\n${folders.map(f => f.name).join('\n')}`
      : '';

    const folderName = prompt(`Enter folder name (leave empty to remove from folder):${folderList}`);

    if (folderName === null) return; // Cancelled

    const trimmedFolder = folderName.trim() || null;
    const passages = Array.from(selectedNodes)
      .map(id => $currentStory.getPassage(id))
      .filter(p => p !== null) as any[];

    FolderManager.moveToFolder(passages, trimmedFolder);

    currentStory.update(s => s);
    projectActions.markChanged();

    if (trimmedFolder) {
      notificationStore.success(`Moved ${passages.length} passage${passages.length !== 1 ? 's' : ''} to folder "${trimmedFolder}"`);
    } else {
      notificationStore.success(`Removed ${passages.length} passage${passages.length !== 1 ? 's' : ''} from folders`);
    }

    clearSelection();
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

  // Update node styling based on multi-select
  $: {
    if (selectMode && selectedNodes.size > 0) {
      nodes.update(nodes =>
        nodes.map((node) => ({
          ...node,
          className: selectedNodes.has(node.id) ? 'selected-node' : '',
        }))
      );
    } else if (!selectMode) {
      // Clear multi-select styling
      nodes.update(nodes =>
        nodes.map((node) => ({
          ...node,
          className: '',
        }))
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
  <div class="bg-white border-b border-gray-300 p-2 flex items-center gap-2 z-10 flex-wrap">
    <button
      class="px-3 py-1 text-sm rounded border transition-colors {selectMode ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}"
      on:click={toggleSelectMode}
      title="Toggle select mode"
    >
      {selectMode ? '☑' : '☐'} Select
    </button>

    <div class="border-l border-gray-300 h-6 mx-2"></div>

    <!-- Layout Algorithm Selector -->
    <span class="text-sm font-medium text-gray-700">Layout:</span>
    <select
      class="px-3 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
      bind:value={$graphLayout.algorithm}
      on:change={(e) => viewPreferencesActions.setGraphLayoutAlgorithm(e.currentTarget.value as LayoutAlgorithm)}
      title="Select layout algorithm"
    >
      <option value="manual">Manual (User Positioned)</option>
      <option value="hierarchical">Hierarchical (Tree)</option>
      <option value="force">Force-Directed (Auto-Spacing)</option>
      <option value="circular">Circular (Circle)</option>
      <option value="grid">Grid (Square Grid)</option>
    </select>

    <!-- Direction selector (only for hierarchical) -->
    {#if $graphLayout.algorithm === 'hierarchical'}
      <select
        class="px-3 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
        bind:value={$graphLayout.direction}
        on:change={(e) => viewPreferencesActions.setGraphLayoutDirection(e.currentTarget.value as 'TB' | 'LR')}
        title="Layout direction"
      >
        <option value="TB">Top-Bottom</option>
        <option value="LR">Left-Right</option>
      </select>
    {/if}

    <!-- Apply Layout Button -->
    <button
      class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      on:click={() => applyLayout()}
      disabled={$graphLayout.algorithm === 'manual' || $nodes.length === 0}
      title="Apply the selected layout algorithm"
    >
      Apply Layout
    </button>

    <!-- Reset to Manual Button -->
    {#if $graphLayout.algorithm !== 'manual'}
      <button
        class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        on:click={resetToManual}
        title="Switch back to manual positioning"
      >
        Reset to Manual
      </button>
    {/if}

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

  <!-- Bulk Actions Toolbar -->
  {#if selectMode || selectedNodes.size > 0}
    <div class="bg-purple-100 border-b border-purple-300 px-3 py-2">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-semibold text-purple-800">
          {selectedNodes.size} node{selectedNodes.size !== 1 ? 's' : ''} selected
        </div>
        <div class="flex gap-2 flex-wrap">
          <button
            class="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
            on:click={selectAll}
            title="Select all visible nodes"
          >
            Select All
          </button>
          <button
            class="px-2 py-1 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700"
            on:click={selectByTag}
            title="Select passages by tag"
          >
            By Tag
          </button>
          <button
            class="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
            on:click={selectByFolder}
            title="Select passages by folder"
          >
            By Folder
          </button>
          <button
            class="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
            on:click={selectOrphans}
            title="Select orphaned passages"
          >
            Orphans
          </button>
          <button
            class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            on:click={selectDeadEnds}
            title="Select dead-end passages"
          >
            Dead Ends
          </button>
          <button
            class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            on:click={clearSelection}
            title="Clear selection"
          >
            Clear
          </button>
        </div>
      </div>
      {#if selectedNodes.size > 0}
        <div class="flex gap-2 flex-wrap">
          <button
            class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            on:click={bulkMove}
            title="Move selected nodes"
          >
            Move
          </button>
          <button
            class="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
            on:click={bulkDuplicate}
            title="Duplicate selected passages"
          >
            Duplicate
          </button>
          <button
            class="px-3 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600"
            on:click={bulkMoveToFolder}
            title="Move selected passages to a folder"
          >
            📁 Move to Folder
          </button>
          <button
            class="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            on:click={bulkAddTag}
            title="Add tag to selected passages"
          >
            + Add Tag
          </button>
          <button
            class="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
            on:click={bulkRemoveTag}
            title="Remove tag from selected passages"
          >
            - Remove Tag
          </button>
          <button
            class="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            on:click={bulkDelete}
            title="Delete selected passages"
          >
            Delete
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Graph -->
  <div bind:this={flowContainer} class="flex-1 relative">
    {#if $currentStory}
      <SvelteFlow
        nodes={$nodes}
        edges={$edges}
        {nodeTypes}
        {edgeTypes}
        fitView
        onnodedragstop={(e: any) => handleNodeDragStop(e)}
        onnodeclick={(e: any) => handleNodeClick(e)}
        onconnect={(e: any) => handleConnect(e)}
        onpaneclick={(e: any) => handlePaneClick(e)}
        onpanecontextmenu={(e: any) => {
          e.preventDefault();
          handlePaneContextMenu(e);
        }}
        onmove={(e: any) => {
          if (e?.detail?.viewport) {
            currentZoom = e.detail.viewport.zoom;
          }
        }}
      >
        <Background />
        <Controls />
        {#if showMiniMap}
          <MiniMap
            pannable={true}
            zoomable={true}
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
        {/if}
        <GraphViewZoomControl
          bind:this={zoomControl}
          nodes={$nodes}
          selectedPassageId={$selectedPassageId}
        />
      </SvelteFlow>

      <!-- Mobile Toolbar (shown only on mobile) -->
      {#if $isMobile}
        <MobileToolbar
          {currentZoom}
          {showMiniMap}
          on:addPassage={handleMobileAddPassage}
          on:fitView={handleMobileFitView}
          on:zoomIn={handleMobileZoomIn}
          on:zoomOut={handleMobileZoomOut}
          on:toggleMiniMap={handleMobileToggleMiniMap}
        />
      {/if}
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

  <!-- Graph Context Menu (right-click on empty space) -->
  {#if graphContextMenu.show}
    <div
      class="fixed bg-white border border-gray-300 rounded shadow-lg z-50 py-1 min-w-[200px]"
      style="left: {graphContextMenu.x}px; top: {graphContextMenu.y}px;"
      on:click|stopPropagation
      role="menu"
      tabindex="0"
      on:keydown={(e) => {
        if (e.key === 'Escape') closeGraphContextMenu();
        else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTemplateSubmenu();
        }
      }}
    >
      <button
        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between gap-2"
        on:click={toggleTemplateSubmenu}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTemplateSubmenu();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            graphContextMenu.showSubmenu = true;
          }
        }}
      >
        <span class="flex items-center gap-2">
          <span>➕</span>
          Add Passage Here
        </span>
        <span class="text-gray-400">{graphContextMenu.showSubmenu ? '▼' : '▶'}</span>
      </button>

      <!-- Template Submenu -->
      {#if graphContextMenu.showSubmenu}
        <div class="ml-4 border-l-2 border-gray-200 pl-2 mt-1">
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            on:click={() => addPassageWithTemplate('blank')}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addPassageWithTemplate('blank');
              }
            }}
          >
            <span>📄</span>
            Blank Passage
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            on:click={() => addPassageWithTemplate('choice')}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addPassageWithTemplate('choice');
              }
            }}
          >
            <span>🔀</span>
            Choice Passage
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            on:click={() => addPassageWithTemplate('conversation')}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addPassageWithTemplate('conversation');
              }
            }}
          >
            <span>💬</span>
            Conversation
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            on:click={() => addPassageWithTemplate('description')}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addPassageWithTemplate('description');
              }
            }}
          >
            <span>📝</span>
            Description
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            on:click={() => addPassageWithTemplate('checkpoint')}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addPassageWithTemplate('checkpoint');
              }
            }}
          >
            <span>🚩</span>
            Checkpoint
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            on:click={() => addPassageWithTemplate('ending')}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addPassageWithTemplate('ending');
              }
            }}
          >
            <span>🏁</span>
            Ending
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<svelte:window on:click={() => {
  closeEdgeContextMenu();
  closeGraphContextMenu();
}} />

<style>
  :global(.selected-node) {
    outline: 3px solid #9333ea !important;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.2) !important;
  }
</style>
