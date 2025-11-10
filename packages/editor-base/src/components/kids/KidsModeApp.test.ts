/**
 * Tests for Kids Mode App
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import KidsModeApp from './KidsModeApp.svelte';
import { projectActions } from '../../stores';

describe('KidsModeApp', () => {
  beforeEach(() => {
    projectActions.newProject();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render the kids mode app', () => {
      const { container } = render(KidsModeApp);

      // Should render something
      expect(container).toBeTruthy();
    });

    it('should have kids-mode class', () => {
      const { container } = render(KidsModeApp);

      const appContainer = container.querySelector('.kids-mode');
      expect(appContainer).toBeTruthy();
    });

    it('should render menu bar', () => {
      render(KidsModeApp);

      // Menu bar renders Story Creator title
      expect(screen.getByText('Story Creator')).toBeTruthy();
    });

    it('should render toolbar', () => {
      render(KidsModeApp);

      // Toolbar renders view mode buttons
      expect(screen.getByText('Page List')).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should have main content area', () => {
      const { container } = render(KidsModeApp);

      // Should have sections
      const sections = container.querySelectorAll('section, div');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should have colorful theme classes', () => {
      const { container } = render(KidsModeApp);

      // Should have gradient or colorful backgrounds
      const hasGradient = container.innerHTML.includes('gradient');
      expect(hasGradient).toBe(true);
    });
  });
});
