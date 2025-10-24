import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import GraphViewZoomControl from './GraphViewZoomControl.svelte';
import type { Node } from '@xyflow/svelte';

// Mock dependencies
const mockFitBounds = vi.fn();

vi.mock('@xyflow/svelte', () => ({
  useSvelteFlow: vi.fn(() => ({
    fitBounds: mockFitBounds,
  })),
}));

// Create store inside the mock factory to avoid hoisting issues
vi.mock('../../utils/motion', () => {
  const { writable } = require('svelte/store');
  return {
    prefersReducedMotion: writable(false),
  };
});

describe('GraphViewZoomControl', () => {
  let prefersReducedMotion: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the mocked store
    const motion = await import('../../utils/motion');
    prefersReducedMotion = motion.prefersReducedMotion;
    prefersReducedMotion.set(false);
  });

  describe('rendering', () => {
    it('should render without errors', () => {
      const { container } = render(GraphViewZoomControl, {
        props: {
          nodes: [],
          selectedPassageId: null,
        },
      });
      expect(container).toBeTruthy();
    });
  });

  describe('zoomToSelection', () => {
    const testNodes: Node[] = [
      {
        id: 'passage-1',
        type: 'passage',
        position: { x: 100, y: 200 },
        data: { title: 'Test Passage 1' },
      },
      {
        id: 'passage-2',
        type: 'passage',
        position: { x: 500, y: 600 },
        data: { title: 'Test Passage 2' },
      },
    ];

    it('should not zoom when no passage is selected', () => {
      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: testNodes,
          selectedPassageId: null,
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).not.toHaveBeenCalled();
    });

    it('should not zoom when selected passage is not found in nodes', () => {
      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: testNodes,
          selectedPassageId: 'nonexistent-id',
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).not.toHaveBeenCalled();
    });

    it('should call fitBounds with correct bounds for selected passage', () => {
      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: testNodes,
          selectedPassageId: 'passage-1',
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).toHaveBeenCalledWith(
        {
          x: 0, // 100 - 100 (padding)
          y: 100, // 200 - 100 (padding)
          width: 450, // 250 (nodeWidth) + 200 (2 * padding)
          height: 350, // 150 (nodeHeight) + 200 (2 * padding)
        },
        {
          duration: 400,
          padding: 0.2,
        }
      );
    });

    it('should zoom to second passage when selected', () => {
      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: testNodes,
          selectedPassageId: 'passage-2',
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).toHaveBeenCalledWith(
        {
          x: 400, // 500 - 100 (padding)
          y: 500, // 600 - 100 (padding)
          width: 450,
          height: 350,
        },
        {
          duration: 400,
          padding: 0.2,
        }
      );
    });

    it('should handle passage at origin (0, 0)', () => {
      const originNodes: Node[] = [
        {
          id: 'origin-passage',
          type: 'passage',
          position: { x: 0, y: 0 },
          data: { title: 'Origin' },
        },
      ];

      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: originNodes,
          selectedPassageId: 'origin-passage',
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).toHaveBeenCalledWith(
        {
          x: -100, // 0 - 100 (padding)
          y: -100, // 0 - 100 (padding)
          width: 450,
          height: 350,
        },
        {
          duration: 400,
          padding: 0.2,
        }
      );
    });

    it('should handle negative positions', () => {
      const negativeNodes: Node[] = [
        {
          id: 'negative-passage',
          type: 'passage',
          position: { x: -200, y: -300 },
          data: { title: 'Negative' },
        },
      ];

      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: negativeNodes,
          selectedPassageId: 'negative-passage',
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).toHaveBeenCalledWith(
        {
          x: -300, // -200 - 100 (padding)
          y: -400, // -300 - 100 (padding)
          width: 450,
          height: 350,
        },
        {
          duration: 400,
          padding: 0.2,
        }
      );
    });
  });

  describe('motion preferences', () => {
    it('should use 0 duration when prefers reduced motion', () => {
      // Set prefers reduced motion to true
      prefersReducedMotion.set(true);

      const testNodes: Node[] = [
        {
          id: 'passage-1',
          type: 'passage',
          position: { x: 100, y: 200 },
          data: { title: 'Test' },
        },
      ];

      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: testNodes,
          selectedPassageId: 'passage-1',
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).toHaveBeenCalledWith(
        expect.any(Object),
        {
          duration: 0, // Should be 0 for reduced motion
          padding: 0.2,
        }
      );
    });
  });

  describe('reactive updates', () => {
    it('should work after nodes prop updates', async () => {
      const initialNodes: Node[] = [
        {
          id: 'passage-1',
          type: 'passage',
          position: { x: 100, y: 200 },
          data: { title: 'Test 1' },
        },
      ];

      const { component, rerender } = render(GraphViewZoomControl, {
        props: {
          nodes: initialNodes,
          selectedPassageId: 'passage-1',
        },
      });

      component.zoomToSelection();
      expect(mockFitBounds).toHaveBeenCalledTimes(1);

      // Update nodes
      const updatedNodes: Node[] = [
        {
          id: 'passage-1',
          type: 'passage',
          position: { x: 300, y: 400 },
          data: { title: 'Test 1 Moved' },
        },
      ];

      await rerender({
        nodes: updatedNodes,
        selectedPassageId: 'passage-1',
      });

      mockFitBounds.mockClear();
      component.zoomToSelection();

      expect(mockFitBounds).toHaveBeenCalledWith(
        {
          x: 200, // 300 - 100
          y: 300, // 400 - 100
          width: 450,
          height: 350,
        },
        expect.any(Object)
      );
    });

    it('should work after selectedPassageId prop updates', async () => {
      const testNodes: Node[] = [
        {
          id: 'passage-1',
          type: 'passage',
          position: { x: 100, y: 200 },
          data: { title: 'Test 1' },
        },
        {
          id: 'passage-2',
          type: 'passage',
          position: { x: 500, y: 600 },
          data: { title: 'Test 2' },
        },
      ];

      const { component, rerender } = render(GraphViewZoomControl, {
        props: {
          nodes: testNodes,
          selectedPassageId: 'passage-1',
        },
      });

      component.zoomToSelection();
      expect(mockFitBounds).toHaveBeenCalledTimes(1);

      // Change selection
      await rerender({
        nodes: testNodes,
        selectedPassageId: 'passage-2',
      });

      mockFitBounds.mockClear();
      component.zoomToSelection();

      expect(mockFitBounds).toHaveBeenCalledWith(
        {
          x: 400, // 500 - 100
          y: 500, // 600 - 100
          width: 450,
          height: 350,
        },
        expect.any(Object)
      );
    });

    it('should handle deselection (selectedPassageId becomes null)', async () => {
      const testNodes: Node[] = [
        {
          id: 'passage-1',
          type: 'passage',
          position: { x: 100, y: 200 },
          data: { title: 'Test 1' },
        },
      ];

      const { component, rerender } = render(GraphViewZoomControl, {
        props: {
          nodes: testNodes,
          selectedPassageId: 'passage-1',
        },
      });

      component.zoomToSelection();
      expect(mockFitBounds).toHaveBeenCalledTimes(1);

      // Deselect
      await rerender({
        nodes: testNodes,
        selectedPassageId: null,
      });

      mockFitBounds.mockClear();
      component.zoomToSelection();

      expect(mockFitBounds).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty nodes array', () => {
      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: [],
          selectedPassageId: 'passage-1',
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).not.toHaveBeenCalled();
    });

    it('should handle very large coordinates', () => {
      const largeNodes: Node[] = [
        {
          id: 'large-passage',
          type: 'passage',
          position: { x: 99999, y: 88888 },
          data: { title: 'Far Away' },
        },
      ];

      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: largeNodes,
          selectedPassageId: 'large-passage',
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).toHaveBeenCalledWith(
        {
          x: 99899, // 99999 - 100
          y: 88788, // 88888 - 100
          width: 450,
          height: 350,
        },
        expect.any(Object)
      );
    });

    it('should maintain padding value of 0.2', () => {
      const testNodes: Node[] = [
        {
          id: 'passage-1',
          type: 'passage',
          position: { x: 100, y: 200 },
          data: { title: 'Test' },
        },
      ];

      const { component } = render(GraphViewZoomControl, {
        props: {
          nodes: testNodes,
          selectedPassageId: 'passage-1',
        },
      });

      component.zoomToSelection();

      expect(mockFitBounds).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          padding: 0.2,
        })
      );
    });
  });
});
