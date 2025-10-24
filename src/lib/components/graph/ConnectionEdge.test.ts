import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ConnectionEdge from './ConnectionEdge.svelte';
import { Position } from '@xyflow/svelte';

// Mock @xyflow/svelte
vi.mock('@xyflow/svelte', () => ({
  BaseEdge: vi.fn(() => ({ $$: {}, $set: vi.fn(), $on: vi.fn() })),
  getBezierPath: vi.fn(() => ['M0,0 L100,100', 50, 50]),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}));

describe('ConnectionEdge', () => {
  let getBezierPath: any;

  const defaultProps = {
    id: 'edge-1',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the mocked function
    const xyflow = await import('@xyflow/svelte');
    getBezierPath = xyflow.getBezierPath;
  });

  describe('basic rendering', () => {
    it('should render without errors', () => {
      const { container } = render(ConnectionEdge, {
        props: defaultProps,
      });
      expect(container).toBeTruthy();
    });

    it('should render default label text "Untitled choice"', () => {
      const { container } = render(ConnectionEdge, {
        props: defaultProps,
      });

      const text = container.textContent || '';
      expect(text).toContain('Untitled choice');
    });

    it('should call getBezierPath with correct parameters', () => {
      render(ConnectionEdge, {
        props: defaultProps,
      });

      expect(getBezierPath).toHaveBeenCalledWith({
        sourceX: 0,
        sourceY: 0,
        sourcePosition: Position.Bottom,
        targetX: 100,
        targetY: 100,
        targetPosition: Position.Top,
      });
    });
  });

  describe('choice text', () => {
    it('should display custom choice text when provided', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { choiceText: 'Custom Choice' },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('Custom Choice');
    });

    it('should display "Untitled choice" when choiceText is empty', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { choiceText: '' },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('Untitled choice');
    });

    it('should display "Untitled choice" when data is not provided', () => {
      const { container } = render(ConnectionEdge, {
        props: defaultProps,
      });

      const text = container.textContent || '';
      expect(text).toContain('Untitled choice');
    });
  });

  describe('broken connection', () => {
    it('should show warning icon for broken connections', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { choiceText: 'Broken Choice', isBroken: true },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('⚠️');
      expect(text).toContain('Broken Choice');
    });

    it('should apply red styling for broken connections', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { isBroken: true },
        },
      });

      const label = container.querySelector('.bg-red-100');
      expect(label).toBeTruthy();
      expect(label?.className).toContain('border-red-500');
    });

    it('should have broken connection tooltip', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { isBroken: true },
        },
      });

      const label = container.querySelector('[title]');
      expect(label?.getAttribute('title')).toContain('Broken connection');
    });
  });

  describe('conditional connection', () => {
    it('should show lightning icon for conditional connections', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { choiceText: 'Conditional Choice', hasCondition: true },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('⚡');
    });

    it('should apply orange styling for conditional connections', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { hasCondition: true },
        },
      });

      const label = container.querySelector('.bg-orange-100');
      expect(label).toBeTruthy();
      expect(label?.className).toContain('border-orange-400');
    });

    it('should not show lightning icon for broken conditional connections', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { hasCondition: true, isBroken: true },
        },
      });

      const text = container.textContent || '';
      // Should have warning icon but not lightning icon
      expect(text).toContain('⚠️');
      expect(text).not.toContain('⚡');
    });
  });

  describe('normal connection', () => {
    it('should apply blue styling for normal connections', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { choiceText: 'Normal Choice' },
        },
      });

      const label = container.querySelector('.bg-blue-100');
      expect(label).toBeTruthy();
      expect(label?.className).toContain('border-blue-400');
    });

    it('should have right-click tooltip for normal connections', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: {},
        },
      });

      const label = container.querySelector('[title]');
      expect(label?.getAttribute('title')).toContain('Right-click for options');
    });

    it('should not show any icons for normal connections', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { choiceText: 'Normal Choice' },
        },
      });

      const text = container.textContent || '';
      expect(text).not.toContain('⚠️');
      expect(text).not.toContain('⚡');
    });
  });

  describe('styling priority', () => {
    it('should prioritize broken styling over conditional', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { isBroken: true, hasCondition: true },
        },
      });

      const label = container.querySelector('.bg-red-100');
      expect(label).toBeTruthy();
      expect(label?.className).not.toContain('bg-orange-100');
      expect(label?.className).not.toContain('bg-blue-100');
    });

    it('should use conditional styling when not broken', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { isBroken: false, hasCondition: true },
        },
      });

      const label = container.querySelector('.bg-orange-100');
      expect(label).toBeTruthy();
      expect(label?.className).not.toContain('bg-red-100');
      expect(label?.className).not.toContain('bg-blue-100');
    });

    it('should use normal styling when neither broken nor conditional', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { isBroken: false, hasCondition: false },
        },
      });

      const label = container.querySelector('.bg-blue-100');
      expect(label).toBeTruthy();
      expect(label?.className).not.toContain('bg-red-100');
      expect(label?.className).not.toContain('bg-orange-100');
    });
  });

  describe('context menu', () => {
    it('should call onContextMenu handler when provided', async () => {
      const onContextMenu = vi.fn();
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: { onContextMenu },
        },
      });

      const g = container.querySelector('g');
      expect(g).toBeTruthy();

      if (g) {
        await fireEvent.contextMenu(g, { clientX: 100, clientY: 200 });
        expect(onContextMenu).toHaveBeenCalledWith('edge-1', 100, 200);
      }
    });

    it('should not error when onContextMenu is not provided', async () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          data: {},
        },
      });

      const g = container.querySelector('g');
      expect(g).toBeTruthy();

      if (g) {
        // Should not throw error
        await expect(
          fireEvent.contextMenu(g, { clientX: 100, clientY: 200 })
        ).resolves.not.toThrow();
      }
    });
  });

  describe('label positioning', () => {
    it('should position label at bezier path midpoint', () => {
      const { container } = render(ConnectionEdge, {
        props: defaultProps,
      });

      const foreignObject = container.querySelector('foreignObject');
      expect(foreignObject).toBeTruthy();
      // getBezierPath returns [path, 50, 50] in our mock
      // Label should be at x: 50 - 100, y: 50 - 20
      expect(foreignObject?.getAttribute('x')).toBe('-50');
      expect(foreignObject?.getAttribute('y')).toBe('30');
    });

    it('should have fixed width and height for label', () => {
      const { container } = render(ConnectionEdge, {
        props: defaultProps,
      });

      const foreignObject = container.querySelector('foreignObject');
      expect(foreignObject?.getAttribute('width')).toBe('200');
      expect(foreignObject?.getAttribute('height')).toBe('40');
    });
  });

  describe('accessibility', () => {
    it('should have role button on label', () => {
      const { container } = render(ConnectionEdge, {
        props: defaultProps,
      });

      const button = container.querySelector('[role="button"]');
      expect(button).toBeTruthy();
    });

    it('should have tabindex on label', () => {
      const { container } = render(ConnectionEdge, {
        props: defaultProps,
      });

      const button = container.querySelector('[tabindex="0"]');
      expect(button).toBeTruthy();
    });

    it('should have title attribute for tooltip', () => {
      const { container } = render(ConnectionEdge, {
        props: defaultProps,
      });

      const label = container.querySelector('[title]');
      expect(label).toBeTruthy();
      expect(label?.getAttribute('title')).toBeTruthy();
    });
  });

  describe('custom props', () => {
    it('should accept custom style prop', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          style: 'custom-style',
        },
      });

      expect(container).toBeTruthy();
    });

    it('should accept custom markerEnd prop', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          markerEnd: 'url(#arrow)',
        },
      });

      expect(container).toBeTruthy();
    });

    it('should accept custom label prop', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          label: 'Custom Label',
        },
      });

      expect(container).toBeTruthy();
    });

    it('should accept custom labelStyle prop', () => {
      const { container } = render(ConnectionEdge, {
        props: {
          ...defaultProps,
          labelStyle: 'font-size: 14px;',
        },
      });

      expect(container).toBeTruthy();
    });
  });

  describe('different positions', () => {
    it('should handle source at top position', () => {
      render(ConnectionEdge, {
        props: {
          ...defaultProps,
          sourcePosition: Position.Top,
        },
      });

      expect(getBezierPath).toHaveBeenCalledWith(
        expect.objectContaining({
          sourcePosition: Position.Top,
        })
      );
    });

    it('should handle target at bottom position', () => {
      render(ConnectionEdge, {
        props: {
          ...defaultProps,
          targetPosition: Position.Bottom,
        },
      });

      expect(getBezierPath).toHaveBeenCalledWith(
        expect.objectContaining({
          targetPosition: Position.Bottom,
        })
      );
    });

    it('should handle source at left position', () => {
      render(ConnectionEdge, {
        props: {
          ...defaultProps,
          sourcePosition: Position.Left,
        },
      });

      expect(getBezierPath).toHaveBeenCalledWith(
        expect.objectContaining({
          sourcePosition: Position.Left,
        })
      );
    });

    it('should handle source at right position', () => {
      render(ConnectionEdge, {
        props: {
          ...defaultProps,
          sourcePosition: Position.Right,
        },
      });

      expect(getBezierPath).toHaveBeenCalledWith(
        expect.objectContaining({
          sourcePosition: Position.Right,
        })
      );
    });
  });

  describe('coordinates', () => {
    it('should handle negative coordinates', () => {
      render(ConnectionEdge, {
        props: {
          ...defaultProps,
          sourceX: -100,
          sourceY: -200,
          targetX: -50,
          targetY: -25,
        },
      });

      expect(getBezierPath).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceX: -100,
          sourceY: -200,
          targetX: -50,
          targetY: -25,
        })
      );
    });

    it('should handle large coordinates', () => {
      render(ConnectionEdge, {
        props: {
          ...defaultProps,
          sourceX: 10000,
          sourceY: 5000,
          targetX: 15000,
          targetY: 7500,
        },
      });

      expect(getBezierPath).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceX: 10000,
          sourceY: 5000,
          targetX: 15000,
          targetY: 7500,
        })
      );
    });
  });
});
