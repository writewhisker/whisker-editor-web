import { describe, it, expect } from 'vitest';
import * as GraphComponentsModule from './index';

describe('@writewhisker/graph-components', () => {
  describe('module exports', () => {
    it('should export GraphCanvas component', () => {
      expect(GraphComponentsModule.GraphCanvas).toBeDefined();
    });

    it('should export GraphNode component', () => {
      expect(GraphComponentsModule.GraphNode).toBeDefined();
    });

    it('should export GraphEdge component', () => {
      expect(GraphComponentsModule.GraphEdge).toBeDefined();
    });

    it('should export MiniMap component', () => {
      expect(GraphComponentsModule.MiniMap).toBeDefined();
    });

    it('should export all expected components', () => {
      const componentExports = ['GraphCanvas', 'GraphNode', 'GraphEdge', 'MiniMap'];
      const exports = Object.keys(GraphComponentsModule);

      componentExports.forEach(comp => {
        expect(exports).toContain(comp);
      });
    });
  });

  describe('component availability', () => {
    it('should make all components importable', () => {
      const { GraphCanvas, GraphNode, GraphEdge, MiniMap } = GraphComponentsModule;

      expect(GraphCanvas).not.toBeUndefined();
      expect(GraphNode).not.toBeUndefined();
      expect(GraphEdge).not.toBeUndefined();
      expect(MiniMap).not.toBeUndefined();
    });

    it('should have function constructors for components', () => {
      const { GraphCanvas, GraphNode, GraphEdge, MiniMap } = GraphComponentsModule;

      expect(typeof GraphCanvas).toBe('function');
      expect(typeof GraphNode).toBe('function');
      expect(typeof GraphEdge).toBe('function');
      expect(typeof MiniMap).toBe('function');
    });
  });
});
