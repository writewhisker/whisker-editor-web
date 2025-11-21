/**
 * Graph Layout
 *
 * Framework-agnostic graph layout algorithms.
 * Perfect for workflow editors, mind maps, org charts, story graphs.
 */

export interface Node {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  data?: any;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  data?: any;
}

export interface LayoutOptions {
  width: number;
  height: number;
  nodeSpacing?: number;
  rankSpacing?: number;
  padding?: number;
}

export interface LayoutResult {
  nodes: Map<string, { x: number; y: number }>;
  edges: Edge[];
}

/**
 * Force-directed layout using Fruchterman-Reingold algorithm
 */
export class ForceDirectedLayout {
  private nodes: Node[];
  private edges: Edge[];
  private options: LayoutOptions;

  constructor(nodes: Node[], edges: Edge[], options: LayoutOptions) {
    this.nodes = nodes;
    this.edges = edges;
    this.options = {
      nodeSpacing: 100,
      padding: 50,
      ...options,
    };
  }

  calculate(iterations: number = 100): LayoutResult {
    const { width, height, padding } = this.options;
    const k = Math.sqrt((width * height) / this.nodes.length);

    // Initialize random positions if not set
    this.nodes.forEach(node => {
      if (node.x === undefined) node.x = Math.random() * (width - padding! * 2) + padding!;
      if (node.y === undefined) node.y = Math.random() * (height - padding! * 2) + padding!;
    });

    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number }>();

      // Initialize forces
      this.nodes.forEach(node => {
        forces.set(node.id, { x: 0, y: 0 });
      });

      // Repulsive forces between all node pairs
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n1 = this.nodes[i];
          const n2 = this.nodes[j];
          const dx = n2.x! - n1.x!;
          const dy = n2.y! - n1.y!;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (k * k) / distance;

          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          const f1 = forces.get(n1.id)!;
          const f2 = forces.get(n2.id)!;
          f1.x -= fx;
          f1.y -= fy;
          f2.x += fx;
          f2.y += fy;
        }
      }

      // Attractive forces along edges
      this.edges.forEach(edge => {
        const source = this.nodes.find(n => n.id === edge.source);
        const target = this.nodes.find(n => n.id === edge.target);
        if (!source || !target) return;

        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (distance * distance) / k;

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        const fs = forces.get(source.id)!;
        const ft = forces.get(target.id)!;
        fs.x += fx;
        fs.y += fy;
        ft.x -= fx;
        ft.y -= fy;
      });

      // Apply forces with damping
      const damping = 0.8;
      this.nodes.forEach(node => {
        const force = forces.get(node.id)!;
        node.x = Math.max(padding!, Math.min(width - padding!, node.x! + force.x * damping));
        node.y = Math.max(padding!, Math.min(height - padding!, node.y! + force.y * damping));
      });
    }

    const positions = new Map<string, { x: number; y: number }>();
    this.nodes.forEach(node => {
      positions.set(node.id, { x: node.x!, y: node.y! });
    });

    return { nodes: positions, edges: this.edges };
  }
}

/**
 * Hierarchical layout (top-down tree)
 */
export class HierarchicalLayout {
  private nodes: Node[];
  private edges: Edge[];
  private options: LayoutOptions;

  constructor(nodes: Node[], edges: Edge[], options: LayoutOptions) {
    this.nodes = nodes;
    this.edges = edges;
    this.options = {
      nodeSpacing: 100,
      rankSpacing: 150,
      padding: 50,
      ...options,
    };
  }

  calculate(): LayoutResult {
    const { width, nodeSpacing, rankSpacing, padding } = this.options;

    // Build adjacency list
    const children = new Map<string, string[]>();
    const parents = new Map<string, string>();
    this.edges.forEach(edge => {
      if (!children.has(edge.source)) children.set(edge.source, []);
      children.get(edge.source)!.push(edge.target);
      parents.set(edge.target, edge.source);
    });

    // Find root nodes
    const roots = this.nodes.filter(n => !parents.has(n.id));

    // Assign ranks (levels)
    const ranks = new Map<string, number>();
    const assignRank = (nodeId: string, rank: number) => {
      ranks.set(nodeId, rank);
      const nodeChildren = children.get(nodeId) || [];
      nodeChildren.forEach(child => assignRank(child, rank + 1));
    };

    roots.forEach(root => assignRank(root.id, 0));
    this.nodes.forEach(node => {
      if (!ranks.has(node.id)) ranks.set(node.id, 0);
    });

    // Group by rank
    const rankGroups = new Map<number, string[]>();
    ranks.forEach((rank, nodeId) => {
      if (!rankGroups.has(rank)) rankGroups.set(rank, []);
      rankGroups.get(rank)!.push(nodeId);
    });

    // Position nodes
    const positions = new Map<string, { x: number; y: number }>();
    const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);

    sortedRanks.forEach(rank => {
      const nodesInRank = rankGroups.get(rank)!;
      const totalWidth = nodesInRank.length * nodeSpacing!;
      const startX = (width - totalWidth) / 2 + padding!;

      nodesInRank.forEach((nodeId, index) => {
        positions.set(nodeId, {
          x: startX + index * nodeSpacing!,
          y: padding! + rank * rankSpacing!,
        });
      });
    });

    return { nodes: positions, edges: this.edges };
  }
}

/**
 * Grid layout
 */
export class GridLayout {
  private nodes: Node[];
  private edges: Edge[];
  private options: LayoutOptions;

  constructor(nodes: Node[], edges: Edge[], options: LayoutOptions) {
    this.nodes = nodes;
    this.edges = edges;
    this.options = {
      nodeSpacing: 150,
      padding: 50,
      ...options,
    };
  }

  calculate(): LayoutResult {
    const { width, nodeSpacing, padding } = this.options;
    const cols = Math.floor((width - padding! * 2) / nodeSpacing!);

    const positions = new Map<string, { x: number; y: number }>();

    this.nodes.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      positions.set(node.id, {
        x: padding! + col * nodeSpacing!,
        y: padding! + row * nodeSpacing!,
      });
    });

    return { nodes: positions, edges: this.edges };
  }
}

/**
 * Circular layout
 */
export class CircularLayout {
  private nodes: Node[];
  private edges: Edge[];
  private options: LayoutOptions;

  constructor(nodes: Node[], edges: Edge[], options: LayoutOptions) {
    this.nodes = nodes;
    this.edges = edges;
    this.options = options;
  }

  calculate(): LayoutResult {
    const { width, height } = this.options;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 100;

    const positions = new Map<string, { x: number; y: number }>();
    const angleStep = (2 * Math.PI) / this.nodes.length;

    this.nodes.forEach((node, index) => {
      const angle = index * angleStep;
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    return { nodes: positions, edges: this.edges };
  }
}
