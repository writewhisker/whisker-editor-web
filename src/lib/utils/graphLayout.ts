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
 * Grid layout - arranges nodes in a square grid pattern
 */
export function getGridLayoutElements(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
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
 * Force-directed layout (simple spring-based simulation)
 */
export function getForceLayoutElements(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  // Simple force-directed layout using spring simulation
  const width = 1600;
  const height = 1200;
  const iterations = 50;
  const repulsionStrength = 5000;
  const attractionStrength = 0.01;
  const centerGravity = 0.05;

  // Initialize random positions if not set
  const positions = new Map(
    nodes.map((node) => [
      node.id,
      {
        x: node.position.x || Math.random() * width,
        y: node.position.y || Math.random() * height,
      },
    ])
  );

  // Build adjacency map for connected nodes
  const adjacency = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  });

  // Run force simulation
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map(nodes.map((node) => [node.id, { x: 0, y: 0 }]));

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const posA = positions.get(nodeA.id)!;
        const posB = positions.get(nodeB.id)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;

        const force = repulsionStrength / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        forces.get(nodeA.id)!.x -= fx;
        forces.get(nodeA.id)!.y -= fy;
        forces.get(nodeB.id)!.x += fx;
        forces.get(nodeB.id)!.y += fy;
      }
    }

    // Attraction for connected nodes
    edges.forEach((edge) => {
      const posSource = positions.get(edge.source)!;
      const posTarget = positions.get(edge.target)!;

      const dx = posTarget.x - posSource.x;
      const dy = posTarget.y - posSource.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = attractionStrength * dist;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      forces.get(edge.source)!.x += fx;
      forces.get(edge.source)!.y += fy;
      forces.get(edge.target)!.x -= fx;
      forces.get(edge.target)!.y -= fy;
    });

    // Center gravity
    const centerX = width / 2;
    const centerY = height / 2;
    nodes.forEach((node) => {
      const pos = positions.get(node.id)!;
      const dx = centerX - pos.x;
      const dy = centerY - pos.y;
      forces.get(node.id)!.x += dx * centerGravity;
      forces.get(node.id)!.y += dy * centerGravity;
    });

    // Apply forces
    const damping = 0.5;
    nodes.forEach((node) => {
      const pos = positions.get(node.id)!;
      const force = forces.get(node.id)!;
      pos.x += force.x * damping;
      pos.y += force.y * damping;
    });
  }

  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id)!,
  }));

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
