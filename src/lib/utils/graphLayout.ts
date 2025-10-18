import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/svelte';

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Apply dagre hierarchical layout to nodes
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = 'TB',
    nodeWidth = 250,
    nodeHeight = 150,
    rankSep = 100,
    nodeSep = 80,
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Force-directed layout (simple implementation)
 */
export function getForceLayoutElements(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  // Simple grid layout as fallback
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 300;

  const layoutedNodes = nodes.map((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
      ...node,
      position: {
        x: col * spacing + 100,
        y: row * spacing + 100,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Arrange nodes in a circle
 */
export function getCircularLayoutElements(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const centerX = 400;
  const centerY = 400;
  const radius = Math.max(200, nodes.length * 30);

  const layoutedNodes = nodes.map((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
