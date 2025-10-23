import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ResizeHandle from './ResizeHandle.svelte';

describe('ResizeHandle', () => {
  beforeEach(() => {
    // Reset any mocks
    vi.clearAllMocks();
  });

  describe('vertical orientation', () => {
    it('should render a vertical resize handle', () => {
      const { container } = render(ResizeHandle, {
        props: { orientation: 'vertical' },
      });

      const handle = container.querySelector('.resize-handle-vertical');
      expect(handle).toBeTruthy();
    });

    it('should support drag interaction', async () => {
      const { container } = render(ResizeHandle, {
        props: {
          orientation: 'vertical',
        },
      });

      const handle = container.querySelector('.resize-handle') as HTMLElement;
      expect(handle).toBeTruthy();

      // Start drag - component should set cursor styles
      await fireEvent.mouseDown(handle, { clientX: 100, clientY: 0 });

      expect(document.body.style.cursor).toBe('col-resize');
      expect(document.body.style.userSelect).toBe('none');

      // Move mouse (event dispatching tested elsewhere)
      await fireEvent.mouseMove(window, { clientX: 150, clientY: 0 });

      // End drag - styles should be cleared
      await fireEvent.mouseUp(window);

      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });

    it('should handle multiple drag interactions', async () => {
      const { container } = render(ResizeHandle, {
        props: {
          orientation: 'vertical',
        },
      });

      const handle = container.querySelector('.resize-handle') as HTMLElement;

      // First drag
      await fireEvent.mouseDown(handle, { clientX: 100, clientY: 0 });
      expect(document.body.style.cursor).toBe('col-resize');
      await fireEvent.mouseMove(window, { clientX: 150, clientY: 0 });
      await fireEvent.mouseUp(window);
      expect(document.body.style.cursor).toBe('');

      // Second drag
      await fireEvent.mouseDown(handle, { clientX: 200, clientY: 0 });
      expect(document.body.style.cursor).toBe('col-resize');
      await fireEvent.mouseUp(window);
      expect(document.body.style.cursor).toBe('');
    });

    it('should not activate without mousedown', async () => {
      const { container } = render(ResizeHandle, {
        props: {
          orientation: 'vertical',
        },
      });

      // Try moving without mousedown
      await fireEvent.mouseMove(window, { clientX: 150, clientY: 0 });

      // Cursor should not be set
      expect(document.body.style.cursor).not.toBe('col-resize');
    });

    it('should deactivate on mouse up', async () => {
      const { container } = render(ResizeHandle, {
        props: {
          orientation: 'vertical',
        },
      });

      const handle = container.querySelector('.resize-handle') as HTMLElement;

      // Start drag
      await fireEvent.mouseDown(handle, { clientX: 100, clientY: 0 });
      expect(document.body.style.cursor).toBe('col-resize');

      // End drag
      await fireEvent.mouseUp(window);
      expect(document.body.style.cursor).toBe('');

      // Try moving after mouseup (cursor should remain default)
      await fireEvent.mouseMove(window, { clientX: 200, clientY: 0 });
      expect(document.body.style.cursor).not.toBe('col-resize');
    });
  });

  describe('horizontal orientation', () => {
    it('should render a horizontal resize handle', () => {
      const { container } = render(ResizeHandle, {
        props: { orientation: 'horizontal' },
      });

      const handle = container.querySelector('.resize-handle-horizontal');
      expect(handle).toBeTruthy();
    });

    it('should use row-resize cursor for horizontal orientation', async () => {
      const { container } = render(ResizeHandle, {
        props: {
          orientation: 'horizontal',
        },
      });

      const handle = container.querySelector('.resize-handle') as HTMLElement;

      // Start drag - should use row-resize cursor
      await fireEvent.mouseDown(handle, { clientX: 0, clientY: 100 });

      expect(document.body.style.cursor).toBe('row-resize');
      expect(document.body.style.userSelect).toBe('none');

      // End drag
      await fireEvent.mouseUp(window);

      expect(document.body.style.cursor).toBe('');
    });

    it('should support vertical mouse movement for horizontal resize', async () => {
      const { container } = render(ResizeHandle, {
        props: {
          orientation: 'horizontal',
        },
      });

      const handle = container.querySelector('.resize-handle') as HTMLElement;

      // Start drag
      await fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });
      expect(document.body.style.cursor).toBe('row-resize');

      // Move mouse vertically (this is what horizontal resizers respond to)
      await fireEvent.mouseMove(window, { clientX: 100, clientY: 200 });

      // End drag
      await fireEvent.mouseUp(window);
      expect(document.body.style.cursor).toBe('');
    });
  });

  describe('default props', () => {
    it('should use vertical orientation by default', () => {
      const { container } = render(ResizeHandle);

      const handle = container.querySelector('.resize-handle-vertical');
      expect(handle).toBeTruthy();
    });

    it('should accept minSize and maxSize props', () => {
      const { container } = render(ResizeHandle, {
        props: {
          minSize: 150,
          maxSize: 600,
        },
      });

      // Just verify it renders without errors
      expect(container.querySelector('.resize-handle')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(ResizeHandle, {
        props: { orientation: 'vertical' },
      });

      const handle = container.querySelector('.resize-handle') as HTMLElement;
      expect(handle.getAttribute('role')).toBe('separator');
      expect(handle.getAttribute('aria-orientation')).toBe('vertical');
      expect(handle.getAttribute('tabindex')).toBe('0');
    });

    it('should have correct aria-orientation for horizontal', () => {
      const { container } = render(ResizeHandle, {
        props: { orientation: 'horizontal' },
      });

      const handle = container.querySelector('.resize-handle') as HTMLElement;
      expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    });
  });

  describe('cursor and body styles', () => {
    it('should set cursor styles during drag', async () => {
      const { container } = render(ResizeHandle, {
        props: { orientation: 'vertical' },
      });

      const handle = container.querySelector('.resize-handle') as HTMLElement;

      // Start drag
      await fireEvent.mouseDown(handle, { clientX: 100, clientY: 0 });

      expect(document.body.style.cursor).toBe('col-resize');
      expect(document.body.style.userSelect).toBe('none');

      // End drag
      await fireEvent.mouseUp(window);

      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });

    it('should set row-resize cursor for horizontal orientation', async () => {
      const { container } = render(ResizeHandle, {
        props: { orientation: 'horizontal' },
      });

      const handle = container.querySelector('.resize-handle') as HTMLElement;

      // Start drag
      await fireEvent.mouseDown(handle, { clientX: 0, clientY: 100 });

      expect(document.body.style.cursor).toBe('row-resize');

      await fireEvent.mouseUp(window);
    });
  });
});
