/**
 * Tests for GraphView
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import GraphView from './GraphView.svelte';
import { projectActions } from '../stores/projectStore';

// Mock @xyflow/svelte to avoid provider errors
vi.mock('@xyflow/svelte', async () => {
  const actual = await vi.importActual('@xyflow/svelte');
  return {
    ...actual,
    useSvelteFlow: () => ({
      fitView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      setCenter: vi.fn(),
      getZoom: vi.fn(() => 1),
      getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    }),
  };
});

describe('GraphView', () => {
  beforeEach(() => {
    projectActions.newProject();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render without errors', () => {
      const { container } = render(GraphView);
      expect(container).toBeTruthy();
    });

    it('should have content', () => {
      const { container } = render(GraphView);
      expect(container.innerHTML.length).toBeGreaterThan(0);
    });
  });

  describe('Structure', () => {
    it('should have proper DOM structure', () => {
      const { container } = render(GraphView);
      const elements = container.querySelectorAll('*');
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
