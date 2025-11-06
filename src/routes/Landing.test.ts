/**
 * Tests for Professional Landing Page
 *
 * Tests the main marketing landing page functionality
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import Landing from './Landing.svelte';

describe('Landing', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Hero Section', () => {
    it('should render hero title', () => {
      render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      expect(screen.getByText(/Create Interactive Stories/i)).toBeTruthy();
      expect(screen.getByText(/Visually & Collaboratively/i)).toBeTruthy();
    });

    it('should render hero subtitle', () => {
      render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      expect(screen.getByText(/modern visual editor for interactive fiction/i)).toBeTruthy();
    });

    it('should show Get Started button', () => {
      render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      expect(screen.getByText(/Get Started Free/i)).toBeTruthy();
    });

    it('should show Try Demo button', () => {
      render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      expect(screen.getByText(/Try Demo Story/i)).toBeTruthy();
    });

    it('should show social proof metrics', () => {
      const { container } = render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      expect(container.textContent).toContain('10K+');
      expect(container.textContent).toContain('Stories Created');
      expect(container.textContent).toContain('100%');
      expect(container.textContent).toContain('Free & Open Source');
    });
  });

  describe('User Interactions', () => {
    it('should call onGetStarted when Get Started clicked', async () => {
      const onGetStarted = vi.fn();

      render(Landing, {
        props: {
          onGetStarted,
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      const button = screen.getByText(/Get Started Free/i);
      await fireEvent.click(button);

      expect(onGetStarted).toHaveBeenCalledTimes(1);
    });

    it('should call onTryDemo when Try Demo clicked', async () => {
      const onTryDemo = vi.fn();

      render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo,
          onSignIn: vi.fn(),
        }
      });

      const button = screen.getByText(/Try Demo Story/i);
      await fireEvent.click(button);

      expect(onTryDemo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Features Section', () => {
    it('should show features section title', () => {
      render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      expect(screen.getByText(/Everything You Need to Craft Engaging Stories/i)).toBeTruthy();
    });

    it('should show Visual Graph Editor feature', () => {
      const { container } = render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Visual Graph Editor');
      expect(container.textContent).toContain('See your story structure at a glance');
    });

    it('should show Real-time Collaboration feature', () => {
      const { container } = render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Real-time Collaboration');
    });

    it('should show Publish Anywhere feature', () => {
      const { container } = render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Publish Anywhere');
      expect(container.textContent).toContain('Export to HTML');
    });
  });

  describe('Structure', () => {
    it('should have sections with proper structure', () => {
      const { container } = render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should have clickable buttons', () => {
      const { container } = render(Landing, {
        props: {
          onGetStarted: vi.fn(),
          onTryDemo: vi.fn(),
          onSignIn: vi.fn(),
        }
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
