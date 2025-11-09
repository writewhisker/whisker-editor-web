/**
 * Tests for Kids Share Panel
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import KidsSharePanel from './KidsSharePanel.svelte';
import { projectActions } from '../../stores/projectStore';

describe('KidsSharePanel', () => {
  beforeEach(() => {
    projectActions.newProject();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Visibility', () => {
    it('should not render when show is false', () => {
      const { container } = render(KidsSharePanel, {
        props: { show: false }
      });

      expect(container.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('should render when show is true', () => {
      const { container } = render(KidsSharePanel, {
        props: { show: true }
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('Content', () => {
    it('should show share title', () => {
      render(KidsSharePanel, {
        props: { show: true }
      });

      expect(screen.getByText(/Share/i)).toBeTruthy();
    });

    it('should show sharing options', () => {
      const { container } = render(KidsSharePanel, {
        props: { show: true }
      });

      // Should have buttons for sharing
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Structure', () => {
    it('should have dialog role', () => {
      const { container } = render(KidsSharePanel, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should have aria-modal attribute', () => {
      const { container } = render(KidsSharePanel, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });
  });
});
