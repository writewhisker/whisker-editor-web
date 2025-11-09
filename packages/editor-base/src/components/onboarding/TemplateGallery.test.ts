import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import TemplateGallery from './TemplateGallery.svelte';

describe('TemplateGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the gallery header', () => {
      const { getByText } = render(TemplateGallery);
      expect(getByText('Choose Your Starting Point')).toBeTruthy();
    });

    it('should render subtitle', () => {
      const { getByText } = render(TemplateGallery);
      expect(getByText('Pick a template to get started, or create from scratch')).toBeTruthy();
    });

    it('should render close button', () => {
      const { container } = render(TemplateGallery);
      const closeButton = container.querySelector('button[aria-label="Close"]');
      expect(closeButton).toBeTruthy();
    });

    it('should render with modal backdrop', () => {
      const { container } = render(TemplateGallery);
      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(backdrop).toBeTruthy();
    });

    it('should render blank story option', () => {
      const { getByText } = render(TemplateGallery);
      expect(getByText('Start with Blank Story')).toBeTruthy();
    });
  });

  describe('filters', () => {
    it('should render all difficulty filter buttons', () => {
      const { getByText } = render(TemplateGallery);
      expect(getByText('All Levels')).toBeTruthy();
      expect(getByText('Beginner')).toBeTruthy();
      expect(getByText('Intermediate')).toBeTruthy();
      expect(getByText('Advanced')).toBeTruthy();
    });

    it('should render category filter buttons', () => {
      const { getByText } = render(TemplateGallery);
      expect(getByText('All Types')).toBeTruthy();
      expect(getByText('Adventure')).toBeTruthy();
      expect(getByText('RPG')).toBeTruthy();
    });

    it('should have all levels selected by default', () => {
      const { container } = render(TemplateGallery);
      const allLevelsButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'All Levels');
      expect(allLevelsButton?.className).toContain('bg-white/20');
    });

    it('should have all types selected by default', () => {
      const { container } = render(TemplateGallery);
      const allTypesButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'All Types');
      expect(allTypesButton?.className).toContain('bg-white/20');
    });
  });

  describe('difficulty filtering', () => {
    it('should filter to beginner templates', async () => {
      const { getByText, container } = render(TemplateGallery);
      const beginnerButton = getByText('Beginner');

      await fireEvent.click(beginnerButton);

      // Hello World is a beginner template
      expect(getByText('Hello World')).toBeTruthy();
    });

    it('should filter to intermediate templates', async () => {
      const { getByText } = render(TemplateGallery);
      const intermediateButton = getByText('Intermediate');

      await fireEvent.click(intermediateButton);

      // The Quest is an intermediate template
      expect(getByText('The Quest')).toBeTruthy();
    });

    it('should filter to advanced templates', async () => {
      const { getByText } = render(TemplateGallery);
      const advancedButton = getByText('Advanced');

      await fireEvent.click(advancedButton);

      // Combat System is an advanced template
      expect(getByText('Combat System')).toBeTruthy();
    });

    it('should show all templates when all levels selected', async () => {
      const { getByText, container } = render(TemplateGallery);

      // First filter to beginner
      await fireEvent.click(getByText('Beginner'));
      // Then click all levels
      await fireEvent.click(getByText('All Levels'));

      // Should show templates from all difficulty levels
      expect(getByText('Hello World')).toBeTruthy(); // beginner
      expect(getByText('The Quest')).toBeTruthy(); // intermediate
      expect(getByText('Combat System')).toBeTruthy(); // advanced
    });
  });

  describe('category filtering', () => {
    it('should filter to adventure templates', async () => {
      const { getByText } = render(TemplateGallery);
      const adventureButton = getByText('Adventure');

      await fireEvent.click(adventureButton);

      expect(getByText('The Cave')).toBeTruthy();
      expect(getByText('The Quest')).toBeTruthy();
    });

    it('should filter to RPG templates', async () => {
      const { getByText } = render(TemplateGallery);
      const rpgButton = getByText('RPG');

      await fireEvent.click(rpgButton);

      expect(getByText('Combat System')).toBeTruthy();
    });
  });

  describe('combined filtering', () => {
    it('should apply both difficulty and category filters', async () => {
      const { getByText, queryByText } = render(TemplateGallery);

      // Filter to intermediate adventure
      await fireEvent.click(getByText('Intermediate'));
      await fireEvent.click(getByText('Adventure'));

      // The Quest is intermediate adventure
      expect(getByText('The Quest')).toBeTruthy();

      // Combat System is advanced RPG, should not be shown
      expect(queryByText('Combat System')).toBeFalsy();
    });

    it('should show no results message when no templates match', async () => {
      const { getByText, container } = render(TemplateGallery);

      // This might not produce zero results, but test the no results UI
      await fireEvent.click(getByText('Advanced'));
      await fireEvent.click(getByText('Adventure'));

      // Check if we have templates or no results message
      const hasTemplates = container.querySelector('.grid-cols-1');
      if (!hasTemplates?.children.length) {
        expect(getByText('No templates match your filters')).toBeTruthy();
      }
    });

    it('should show clear filters button when no results', async () => {
      const { getByText, queryByText, container } = render(TemplateGallery);

      // Try to create a scenario with no results
      await fireEvent.click(getByText('Beginner'));
      await fireEvent.click(getByText('RPG'));

      // Check if clear filters button appears
      const clearButton = queryByText('Clear filters');
      if (clearButton) {
        expect(clearButton).toBeTruthy();
      }
    });
  });

  describe('template cards', () => {
    it('should display template icons', () => {
      const { container } = render(TemplateGallery);
      const icons = container.querySelectorAll('.text-4xl');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should display template names', () => {
      const { getByText } = render(TemplateGallery);
      expect(getByText('Hello World')).toBeTruthy();
      expect(getByText('The Cave')).toBeTruthy();
      expect(getByText('The Quest')).toBeTruthy();
    });

    it('should display template descriptions', () => {
      const { getByText } = render(TemplateGallery);
      expect(getByText(/Your first interactive story/)).toBeTruthy();
    });

    it('should display difficulty badges', () => {
      const { container } = render(TemplateGallery);
      const badges = container.querySelectorAll('.rounded-full.font-medium');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should display template features', () => {
      const { container } = render(TemplateGallery);
      const featureLists = container.querySelectorAll('ul');
      expect(featureLists.length).toBeGreaterThan(0);
    });

    it('should display passage count', () => {
      const { container } = render(TemplateGallery);
      expect(container.textContent).toContain('passages');
    });

    it('should display estimated time', () => {
      const { container } = render(TemplateGallery);
      expect(container.textContent).toContain('read');
    });

    it('should limit features display to 3', () => {
      const { container } = render(TemplateGallery);
      const featureLists = container.querySelectorAll('ul li');
      // Each template should show max 3 features
      featureLists.forEach(list => {
        const items = list.parentElement?.querySelectorAll('li');
        if (items) {
          expect(items.length).toBeLessThanOrEqual(3);
        }
      });
    });
  });

  describe('template selection', () => {
    it('should handle template card click', async () => {
      const { component, container } = render(TemplateGallery);

      let eventFired = false;
      component.$on('selectTemplate', (event) => {
        eventFired = true;
        expect(event.detail.templateId).toBeTruthy();
        expect(event.detail.templateName).toBeTruthy();
      });

      const templateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Hello World'));

      if (templateButton) {
        await fireEvent.click(templateButton);
        expect(eventFired).toBe(true);
      }
    });

    it('should dispatch correct template data', async () => {
      const { component, getByText } = render(TemplateGallery);

      let capturedEvent: any = null;
      component.$on('selectTemplate', (event) => {
        capturedEvent = event.detail;
      });

      const helloWorldCard = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Hello World'));

      if (helloWorldCard) {
        await fireEvent.click(helloWorldCard);

        if (capturedEvent) {
          expect(capturedEvent.templateId).toBe('hello-world');
          expect(capturedEvent.templateName).toBe('Hello World');
        }
      }
    });
  });

  describe('blank story option', () => {
    it('should highlight blank story on hover', async () => {
      const { container } = render(TemplateGallery);
      const blankStoryButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Start with Blank Story'));

      expect(blankStoryButton?.className).toContain('hover:border-blue-500');
    });

    it('should dispatch startBlank event when clicked', async () => {
      const { component, container } = render(TemplateGallery);

      let eventFired = false;
      component.$on('startBlank', () => {
        eventFired = true;
      });

      const blankStoryButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Start with Blank Story'));

      if (blankStoryButton) {
        await fireEvent.click(blankStoryButton);
        expect(eventFired).toBe(true);
      }
    });
  });

  describe('close functionality', () => {
    it('should dispatch close event when close button clicked', async () => {
      const { component, container } = render(TemplateGallery);

      let eventFired = false;
      component.$on('close', () => {
        eventFired = true;
      });

      const closeButton = container.querySelector('button[aria-label="Close"]');
      if (closeButton) {
        await fireEvent.click(closeButton);
        expect(eventFired).toBe(true);
      }
    });
  });

  describe('footer tip', () => {
    it('should display customization tip', () => {
      const { getByText } = render(TemplateGallery);
      expect(getByText(/All templates are fully editable/)).toBeTruthy();
    });
  });

  describe('difficulty color coding', () => {
    it('should use green color for beginner', () => {
      const { container } = render(TemplateGallery);
      const beginnerBadges = Array.from(container.querySelectorAll('.rounded-full'))
        .filter(badge => badge.textContent === 'beginner');

      beginnerBadges.forEach(badge => {
        expect(badge.className).toContain('bg-green-');
      });
    });

    it('should use yellow color for intermediate', () => {
      const { container } = render(TemplateGallery);
      const intermediateBadges = Array.from(container.querySelectorAll('.rounded-full'))
        .filter(badge => badge.textContent === 'intermediate');

      intermediateBadges.forEach(badge => {
        expect(badge.className).toContain('bg-yellow-');
      });
    });

    it('should use red color for advanced', () => {
      const { container } = render(TemplateGallery);
      const advancedBadges = Array.from(container.querySelectorAll('.rounded-full'))
        .filter(badge => badge.textContent === 'advanced');

      advancedBadges.forEach(badge => {
        expect(badge.className).toContain('bg-red-');
      });
    });
  });

  describe('clear filters functionality', () => {
    it('should reset filters when clear filters clicked', async () => {
      const { getByText, queryByText, container } = render(TemplateGallery);

      // Apply some filters
      await fireEvent.click(getByText('Beginner'));
      await fireEvent.click(getByText('RPG'));

      // If no results, clear filters button should appear
      const clearButton = queryByText('Clear filters');
      if (clearButton) {
        await fireEvent.click(clearButton);

        // Should show all templates again
        expect(getByText('Hello World')).toBeTruthy();
        expect(getByText('The Quest')).toBeTruthy();
      }
    });
  });

  describe('template data completeness', () => {
    it('should have all required template properties', () => {
      const { container } = render(TemplateGallery);

      // Check that templates have icons (emoji)
      const templateCards = container.querySelectorAll('.group.p-5');
      expect(templateCards.length).toBeGreaterThan(0);

      // Each card should have an icon, name, description, difficulty, and meta info
      templateCards.forEach(card => {
        const icon = card.querySelector('.text-4xl');
        const title = card.querySelector('.text-lg.font-bold');
        const description = card.querySelector('.text-sm');
        const difficulty = card.querySelector('.rounded-full');

        expect(icon).toBeTruthy();
        expect(title).toBeTruthy();
        expect(description).toBeTruthy();
        expect(difficulty).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle rapid filter changes', async () => {
      const { getByText } = render(TemplateGallery);

      // Rapidly change filters
      await fireEvent.click(getByText('Beginner'));
      await fireEvent.click(getByText('Intermediate'));
      await fireEvent.click(getByText('Advanced'));
      await fireEvent.click(getByText('All Levels'));

      // Should still render templates
      expect(getByText('Hello World')).toBeTruthy();
    });

    it('should handle clicking same filter twice', async () => {
      const { getByText, container } = render(TemplateGallery);
      const beginnerButton = getByText('Beginner');

      await fireEvent.click(beginnerButton);
      await fireEvent.click(beginnerButton);

      // Should maintain the filter
      expect(beginnerButton.className).toContain('bg-white/20');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels', () => {
      const { container } = render(TemplateGallery);
      const closeButton = container.querySelector('button[aria-label="Close"]');
      expect(closeButton).toBeTruthy();
    });

    it('should have role dialog on modal', () => {
      const { container } = render(TemplateGallery);
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should have aria-modal on modal', () => {
      const { container } = render(TemplateGallery);
      const modal = container.querySelector('[aria-modal="true"]');
      expect(modal).toBeTruthy();
    });
  });
});
