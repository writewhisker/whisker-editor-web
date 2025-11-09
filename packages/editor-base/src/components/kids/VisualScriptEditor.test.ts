/**
 * Tests for Visual Script Editor
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import VisualScriptEditor from './VisualScriptEditor.svelte';

describe('VisualScriptEditor', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Visibility', () => {
    it('should not render when show is false', () => {
      const { container } = render(VisualScriptEditor, {
        props: { show: false }
      });

      expect(container.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('should render when show is true', () => {
      const { container } = render(VisualScriptEditor, {
        props: { show: true }
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('Content', () => {
    it('should show visual script editor title', () => {
      render(VisualScriptEditor, {
        props: { show: true }
      });

      expect(screen.getByText(/Visual Script/i)).toBeTruthy();
    });

    it('should show block palette', () => {
      const { container } = render(VisualScriptEditor, {
        props: { show: true }
      });

      // Should have sections for different block types
      expect(container.textContent).toContain('Actions');
    });

    it('should show action blocks', () => {
      render(VisualScriptEditor, {
        props: { show: true }
      });

      expect(screen.getByText(/Give Item/i)).toBeTruthy();
      expect(screen.getByText(/Show Message/i)).toBeTruthy();
    });

    it('should show condition blocks', () => {
      render(VisualScriptEditor, {
        props: { show: true }
      });

      expect(screen.getByText(/Has Item/i)).toBeTruthy();
    });

    it('should show variable blocks', () => {
      render(VisualScriptEditor, {
        props: { show: true }
      });

      expect(screen.getByText(/Set Variable/i)).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should have dialog role', () => {
      const { container } = render(VisualScriptEditor, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should have canvas area', () => {
      const { container } = render(VisualScriptEditor, {
        props: { show: true }
      });

      // Should have a drop zone for blocks
      const dropZone = container.querySelector('[role="region"]');
      expect(dropZone).toBeTruthy();
    });

    it('should have save button', () => {
      render(VisualScriptEditor, {
        props: { show: true }
      });

      expect(screen.getByText(/Save/i)).toBeTruthy();
    });

    it('should have close button', () => {
      const { container } = render(VisualScriptEditor, {
        props: { show: true }
      });

      const closeButton = container.querySelector('[aria-label="Close"]');
      expect(closeButton).toBeTruthy();
    });
  });
});
