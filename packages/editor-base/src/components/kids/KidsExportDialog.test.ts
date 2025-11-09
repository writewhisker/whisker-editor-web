/**
 * Tests for Kids Export Dialog
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import KidsExportDialog from './KidsExportDialog.svelte';
import { projectActions } from '../../stores/projectStore';

describe('KidsExportDialog', () => {
  beforeEach(() => {
    // Create a test story
    projectActions.newProject();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Visibility', () => {
    it('should not render when show is false', () => {
      const { container } = render(KidsExportDialog, {
        props: { show: false }
      });

      expect(container.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('should render when show is true', () => {
      const { container } = render(KidsExportDialog, {
        props: { show: true }
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('Platform Support', () => {
    it('should render with minecraft platform', () => {
      const { container } = render(KidsExportDialog, {
        props: { show: true, platform: 'minecraft' }
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should render with roblox platform', () => {
      const { container } = render(KidsExportDialog, {
        props: { show: true, platform: 'roblox' }
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should have action buttons', () => {
      const { container } = render(KidsExportDialog, {
        props: { show: true, platform: 'minecraft' }
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Structure', () => {
    it('should have dialog role', () => {
      const { container } = render(KidsExportDialog, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should have aria-modal attribute', () => {
      const { container } = render(KidsExportDialog, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });

    it('should have aria-labelledby', () => {
      const { container } = render(KidsExportDialog, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('export-dialog-title');
    });
  });
});
