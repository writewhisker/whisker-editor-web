/**
 * Tests for Kids Landing Page
 *
 * Tests age-specific content variations and user interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import KidsLanding from './KidsLanding.svelte';
import { kidsModeActions } from '../lib/stores/kidsModeStore';

describe('KidsLanding', () => {
  beforeEach(() => {
    // Reset kids mode state
    kidsModeActions.reset();
  });

  describe('Default Content (No Age Set)', () => {
    it('should render default content when no age group is set', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Create Your Own');
      expect(container.textContent).toContain('Amazing Adventures!');
      expect(container.textContent).toContain('Build epic stories for Minecraft and Roblox');
    });

    it('should show default CTA button text', () => {
      render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(screen.getByText('Start Creating!')).toBeTruthy();
    });

    it('should show 6 default feature cards', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      const featureCards = container.querySelectorAll('.feature-card');
      expect(featureCards.length).toBe(6);
    });
  });

  describe('Ages 8-10 Content', () => {
    beforeEach(() => {
      kidsModeActions.setAgeGroup('8-10');
    });

    it('should show age-appropriate title for 8-10', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Make Cool Stories');
      expect(container.textContent).toContain('Super Easy & Fun!');
    });

    it('should show simple language for 8-10', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('SO much fun');
      expect(container.textContent).toContain('Really Easy');
    });

    it('should show 15 page limit in features', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('up to 15 pages');
    });

    it('should emphasize safety for 8-10', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Super Safe');
      expect(container.textContent).toContain('Safe for kids');
    });

    it('should show encouraging CTA button', () => {
      render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(screen.getByText("Let's Make a Story!")).toBeTruthy();
    });
  });

  describe('Ages 10-13 Content', () => {
    beforeEach(() => {
      kidsModeActions.setAgeGroup('10-13');
    });

    it('should show age-appropriate title for 10-13', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Build Amazing');
      expect(container.textContent).toContain('Interactive Stories!');
    });

    it('should mention variables and items', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Items & Variables');
      expect(container.textContent).toContain('track things in your story');
    });

    it('should show 30 page limit in features', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Up to 30 story pages');
    });

    it('should mention 6 choices limit', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('up to 6 choices');
    });

    it('should show building-focused CTA', () => {
      render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(screen.getByText('Start Building!')).toBeTruthy();
    });
  });

  describe('Ages 13-15 Content', () => {
    beforeEach(() => {
      kidsModeActions.setAgeGroup('13-15');
    });

    it('should show advanced title for 13-15', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Create Advanced');
      expect(container.textContent).toContain('Interactive Narratives!');
    });

    it('should mention unlimited features', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Unlimited Passages');
      expect(container.textContent).toContain('No limits');
    });

    it('should mention code view', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Code View');
      expect(container.textContent).toContain('edit the code');
    });

    it('should mention online sharing', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(container.textContent).toContain('Share Online');
    });

    it('should show professional CTA', () => {
      render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      expect(screen.getByText('Start Creating!')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should call onGetStarted when primary button clicked', async () => {
      const onGetStarted = vi.fn();
      render(KidsLanding, {
        props: {
          onGetStarted,
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      const button = screen.getByText('Start Creating!');
      await fireEvent.click(button);

      expect(onGetStarted).toHaveBeenCalledTimes(1);
    });

    it('should call onBrowseTemplates when browse button clicked', async () => {
      const onBrowseTemplates = vi.fn();
      render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates,
          onParentInfo: vi.fn(),
        }
      });

      const button = screen.getByText('Browse Cool Templates');
      await fireEvent.click(button);

      expect(onBrowseTemplates).toHaveBeenCalledTimes(1);
    });

    it('should call onParentInfo when parent link clicked', async () => {
      const onParentInfo = vi.fn();
      render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo,
        }
      });

      const link = screen.getByText(/Parent & Teacher Information/);
      await fireEvent.click(link);

      expect(onParentInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reactive Content Updates', () => {
    it('should update content when age group changes', async () => {
      const { container, component } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      // Initially no age
      expect(container.textContent).toContain('Amazing Adventures!');

      // Change to 8-10
      kidsModeActions.setAgeGroup('8-10');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(container.textContent).toContain('Super Easy & Fun!');

      // Change to 13-15
      kidsModeActions.setAgeGroup('13-15');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(container.textContent).toContain('Interactive Narratives!');
    });
  });

  describe('Feature Cards', () => {
    it('should show 6 feature cards for all age groups', () => {
      const ageGroups: Array<'8-10' | '10-13' | '13-15' | null> = [null, '8-10', '10-13', '13-15'];

      ageGroups.forEach(age => {
        kidsModeActions.reset();
        if (age) kidsModeActions.setAgeGroup(age);

        const { container } = render(KidsLanding, {
          props: {
            onGetStarted: vi.fn(),
            onBrowseTemplates: vi.fn(),
            onParentInfo: vi.fn(),
          }
        });

        const featureCards = container.querySelectorAll('.feature-card');
        expect(featureCards.length).toBe(6);
      });
    });

    it('should show different emojis for different age groups', () => {
      // Ages 8-10
      kidsModeActions.setAgeGroup('8-10');
      const { container: container1 } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });
      expect(container1.textContent).toContain('🏰'); // Minecraft quests
      expect(container1.textContent).toContain('🔒'); // Safety

      kidsModeActions.reset();

      // Ages 13-15
      kidsModeActions.setAgeGroup('13-15');
      const { container: container2 } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });
      expect(container2.textContent).toContain('🚀'); // Unlimited
      expect(container2.textContent).toContain('💻'); // Code view
    });
  });

  describe('Accessibility', () => {
    it('should have proper section structure', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should have clickable buttons', () => {
      const { container } = render(KidsLanding, {
        props: {
          onGetStarted: vi.fn(),
          onBrowseTemplates: vi.fn(),
          onParentInfo: vi.fn(),
        }
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
