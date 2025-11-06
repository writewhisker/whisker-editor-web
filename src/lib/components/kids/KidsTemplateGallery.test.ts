/**
 * Tests for Kids Template Gallery
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import KidsTemplateGallery from './KidsTemplateGallery.svelte';

describe('KidsTemplateGallery', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Visibility', () => {
    it('should not render when show is false', () => {
      const { container } = render(KidsTemplateGallery, {
        props: { show: false }
      });

      expect(container.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('should render when show is true', () => {
      const { container } = render(KidsTemplateGallery, {
        props: { show: true }
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('Content', () => {
    it('should show title', () => {
      render(KidsTemplateGallery, {
        props: { show: true }
      });

      expect(screen.getByText(/Choose Your Story Template/i)).toBeTruthy();
    });

    it('should have filter buttons', () => {
      const { container } = render(KidsTemplateGallery, {
        props: { show: true }
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show close button', () => {
      const { container } = render(KidsTemplateGallery, {
        props: { show: true }
      });

      const closeButton = container.querySelector('[aria-label="Close"]');
      expect(closeButton).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should have dialog role', () => {
      const { container } = render(KidsTemplateGallery, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should have proper aria label', () => {
      const { container } = render(KidsTemplateGallery, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('template-gallery-title');
    });
  });
});
