/**
 * Tests for Kids Parental Controls Panel
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import KidsParentalControlsPanel from './KidsParentalControlsPanel.svelte';
import { parentalControlsActions } from '../../stores/parentalControlsStore';

describe('KidsParentalControlsPanel', () => {
  beforeEach(() => {
    parentalControlsActions.reset();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Visibility', () => {
    it('should not render when show is false', () => {
      const { container } = render(KidsParentalControlsPanel, {
        props: { show: false }
      });

      expect(container.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('should render when show is true', () => {
      const { container } = render(KidsParentalControlsPanel, {
        props: { show: true }
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('PIN Protection', () => {
    it('should have input fields', () => {
      const { container } = render(KidsParentalControlsPanel, {
        props: { show: true }
      });

      const inputs = container.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('Content', () => {
    it('should show parental controls title', () => {
      render(KidsParentalControlsPanel, {
        props: { show: true }
      });

      expect(screen.getByText(/Parental Controls/i)).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should have dialog role', () => {
      const { container } = render(KidsParentalControlsPanel, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should have buttons', () => {
      const { container } = render(KidsParentalControlsPanel, {
        props: { show: true }
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
