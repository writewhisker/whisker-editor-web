import { describe, it, expect } from 'vitest';
import {
  getLayoutedElements,
  getForceLayoutElements,
  getCircularLayoutElements,
} from './graphLayout';
import type { Node, Edge } from '@xyflow/svelte';

describe('graphLayout', () => {
  // Sample test data
  const createTestNodes = (count: number): Node[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `node-${i}`,
      type: 'passage',
      data: { label: `Node ${i}` },
      position: { x: 0, y: 0 },
    }));
  };

  const createTestEdges = (nodeCount: number): Edge[] => {
    const edges: Edge[] = [];
    for (let i = 0; i < nodeCount - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
      });
    }
    return edges;
  };

  describe('getLayoutedElements', () => {
    it('should layout nodes hierarchically', () => {
      const nodes = createTestNodes(3);
      const edges = createTestEdges(3);

      const result = getLayoutedElements(nodes, edges);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);

      // Nodes should have updated positions
      result.nodes.forEach((node) => {
        expect(node.position.x).toBeDefined();
        expect(node.position.y).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });
    });

    it('should handle empty node list', () => {
      const result = getLayoutedElements([], []);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should handle single node', () => {
      const nodes = createTestNodes(1);

      const result = getLayoutedElements(nodes, []);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].position.x).toBeDefined();
      expect(result.nodes[0].position.y).toBeDefined();
    });

    it('should support top-bottom direction', () => {
      const nodes = createTestNodes(3);
      const edges = createTestEdges(3);

      const result = getLayoutedElements(nodes, edges, { direction: 'TB' });

      expect(result.nodes).toHaveLength(3);
      // In TB layout, y positions should increase down the hierarchy
      const node0 = result.nodes.find(n => n.id === 'node-0')!;
      const node1 = result.nodes.find(n => n.id === 'node-1')!;
      const node2 = result.nodes.find(n => n.id === 'node-2')!;

      expect(node0.position.y).toBeLessThan(node1.position.y);
      expect(node1.position.y).toBeLessThan(node2.position.y);
    });

    it('should support left-right direction', () => {
      const nodes = createTestNodes(3);
      const edges = createTestEdges(3);

      const result = getLayoutedElements(nodes, edges, { direction: 'LR' });

      expect(result.nodes).toHaveLength(3);
      // In LR layout, x positions should increase across the hierarchy
      const node0 = result.nodes.find(n => n.id === 'node-0')!;
      const node1 = result.nodes.find(n => n.id === 'node-1')!;
      const node2 = result.nodes.find(n => n.id === 'node-2')!;

      expect(node0.position.x).toBeLessThan(node1.position.x);
      expect(node1.position.x).toBeLessThan(node2.position.x);
    });

    it('should respect custom node dimensions', () => {
      const nodes = createTestNodes(2);
      const edges = createTestEdges(2);

      const result = getLayoutedElements(nodes, edges, {
        nodeWidth: 300,
        nodeHeight: 200,
      });

      expect(result.nodes).toHaveLength(2);
      // Positions should be calculated based on custom dimensions
      result.nodes.forEach((node) => {
        expect(node.position).toBeDefined();
      });
    });

    it('should respect spacing options', () => {
      const nodes = createTestNodes(3);
      const edges = createTestEdges(3);

      const tightResult = getLayoutedElements(nodes, edges, {
        rankSep: 50,
        nodeSep: 40,
      });

      const spaceResult = getLayoutedElements(nodes, edges, {
        rankSep: 200,
        nodeSep: 150,
      });

      expect(tightResult.nodes).toHaveLength(3);
      expect(spaceResult.nodes).toHaveLength(3);

      // Spaced layout should have greater distances
      const tightNode0 = tightResult.nodes.find(n => n.id === 'node-0')!;
      const tightNode1 = tightResult.nodes.find(n => n.id === 'node-1')!;
      const spaceNode0 = spaceResult.nodes.find(n => n.id === 'node-0')!;
      const spaceNode1 = spaceResult.nodes.find(n => n.id === 'node-1')!;

      const tightDistance = Math.abs(tightNode1.position.y - tightNode0.position.y);
      const spaceDistance = Math.abs(spaceNode1.position.y - spaceNode0.position.y);

      expect(spaceDistance).toBeGreaterThan(tightDistance);
    });

    it('should preserve node data', () => {
      const nodes = createTestNodes(2);
      nodes[0].data = { custom: 'value', id: 123 };
      const edges = createTestEdges(2);

      const result = getLayoutedElements(nodes, edges);

      expect(result.nodes[0].data).toEqual({ custom: 'value', id: 123 });
    });

    it('should preserve edge data', () => {
      const nodes = createTestNodes(2);
      const edges = createTestEdges(2);
      edges[0].label = 'Test Label';
      edges[0].animated = true;

      const result = getLayoutedElements(nodes, edges);

      expect(result.edges[0].label).toBe('Test Label');
      expect(result.edges[0].animated).toBe(true);
    });
  });

  describe('getForceLayoutElements', () => {
    it('should layout nodes in a grid', () => {
      const nodes = createTestNodes(4);
      const edges = createTestEdges(4);

      const result = getForceLayoutElements(nodes, edges);

      expect(result.nodes).toHaveLength(4);
      expect(result.edges).toHaveLength(3);

      // All nodes should have positions
      result.nodes.forEach((node) => {
        expect(node.position.x).toBeDefined();
        expect(node.position.y).toBeDefined();
        expect(node.position.x).toBeGreaterThanOrEqual(0);
        expect(node.position.y).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle single node', () => {
      const nodes = createTestNodes(1);

      const result = getForceLayoutElements(nodes, []);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].position).toBeDefined();
    });

    it('should arrange nodes in approximate grid pattern', () => {
      const nodes = createTestNodes(9); // 3x3 grid
      const edges: Edge[] = [];

      const result = getForceLayoutElements(nodes, edges);

      expect(result.nodes).toHaveLength(9);

      // Check that positions are distinct
      const positions = result.nodes.map(n => `${n.position.x},${n.position.y}`);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(9);
    });

    it('should preserve node and edge data', () => {
      const nodes = createTestNodes(2);
      nodes[0].data = { test: 'data' };
      const edges = createTestEdges(2);

      const result = getForceLayoutElements(nodes, edges);

      expect(result.nodes[0].data).toEqual({ test: 'data' });
      expect(result.edges).toEqual(edges);
    });
  });

  describe('getCircularLayoutElements', () => {
    it('should layout nodes in a circle', () => {
      const nodes = createTestNodes(6);
      const edges = createTestEdges(6);

      const result = getCircularLayoutElements(nodes, edges);

      expect(result.nodes).toHaveLength(6);
      expect(result.edges).toHaveLength(5);

      // All nodes should have positions
      result.nodes.forEach((node) => {
        expect(node.position.x).toBeDefined();
        expect(node.position.y).toBeDefined();
      });
    });

    it('should handle single node', () => {
      const nodes = createTestNodes(1);

      const result = getCircularLayoutElements(nodes, []);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].position).toBeDefined();
    });

    it('should distribute nodes evenly around circle', () => {
      const nodes = createTestNodes(4);
      const edges: Edge[] = [];

      const result = getCircularLayoutElements(nodes, edges);

      expect(result.nodes).toHaveLength(4);

      // Calculate center point
      const centerX = 400;
      const centerY = 400;

      // All nodes should be approximately same distance from center
      const distances = result.nodes.map((node) => {
        const dx = node.position.x - centerX;
        const dy = node.position.y - centerY;
        return Math.sqrt(dx * dx + dy * dy);
      });

      // All distances should be similar (within tolerance)
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      distances.forEach((distance) => {
        expect(Math.abs(distance - avgDistance)).toBeLessThan(1);
      });
    });

    it('should scale circle radius with node count', () => {
      const fewNodes = createTestNodes(3);
      const manyNodes = createTestNodes(10);

      const fewResult = getCircularLayoutElements(fewNodes, []);
      const manyResult = getCircularLayoutElements(manyNodes, []);

      // Calculate radius for both
      const centerX = 400;
      const centerY = 400;

      const fewRadius = Math.sqrt(
        Math.pow(fewResult.nodes[0].position.x - centerX, 2) +
        Math.pow(fewResult.nodes[0].position.y - centerY, 2)
      );

      const manyRadius = Math.sqrt(
        Math.pow(manyResult.nodes[0].position.x - centerX, 2) +
        Math.pow(manyResult.nodes[0].position.y - centerY, 2)
      );

      // More nodes should have larger radius
      expect(manyRadius).toBeGreaterThan(fewRadius);
    });

    it('should preserve node and edge data', () => {
      const nodes = createTestNodes(3);
      nodes[1].data = { important: true };
      const edges = createTestEdges(3);
      edges[0].animated = true;

      const result = getCircularLayoutElements(nodes, edges);

      expect(result.nodes[1].data).toEqual({ important: true });
      expect(result.edges[0].animated).toBe(true);
    });

    it('should handle empty node list', () => {
      const result = getCircularLayoutElements([], []);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('Layout algorithm comparison', () => {
    it('should produce different layouts for different algorithms', () => {
      const nodes = createTestNodes(5);
      const edges = createTestEdges(5);

      const hierarchical = getLayoutedElements(nodes, edges);
      const force = getForceLayoutElements(nodes, edges);
      const circular = getCircularLayoutElements(nodes, edges);

      // Get first node position from each layout
      const h1 = hierarchical.nodes[0].position;
      const f1 = force.nodes[0].position;
      const c1 = circular.nodes[0].position;

      // Positions should be different across algorithms
      const positionsMatch = (
        h1.x === f1.x && h1.y === f1.y ||
        f1.x === c1.x && f1.y === c1.y ||
        h1.x === c1.x && h1.y === c1.y
      );

      expect(positionsMatch).toBe(false);
    });
  });
});
