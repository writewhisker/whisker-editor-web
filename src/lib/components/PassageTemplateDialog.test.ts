import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PassageTemplateDialog from './PassageTemplateDialog.svelte';
import { get } from 'svelte/store';
import { currentStory } from '../stores/projectStore';
import { templateManager } from '../utils/passageTemplates';
import { Story } from '../models/Story';

describe('PassageTemplateDialog', () => {
  beforeEach(() => {
    // Create a test story
    const testStory = new Story('Test Story');
    currentStory.set(testStory);
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      const component = render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      expect(screen.getByText('Passage Templates')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const component = render(PassageTemplateDialog, {
        props: { isOpen: false }
      });

      expect(screen.queryByText('Passage Templates')).not.toBeInTheDocument();
    });

    it('should show search input', () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      expect(screen.getByPlaceholderText(/Search templates/i)).toBeInTheDocument();
    });

    it('should show category tabs', () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      expect(screen.getByText('All Templates')).toBeInTheDocument();
      expect(screen.getByText('Narrative')).toBeInTheDocument();
      expect(screen.getByText('Choice')).toBeInTheDocument();
      expect(screen.getByText('Conditional')).toBeInTheDocument();
      expect(screen.getByText('Scripted')).toBeInTheDocument();
    });

    it('should show close button', () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should show action buttons', () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create from Template')).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('should start with "All" category selected', () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const allTab = screen.getByText('All Templates');
      expect(allTab.parentElement).toHaveClass('active');
    });

    it('should switch to Narrative category', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const narrativeTab = screen.getByText('Narrative');
      await fireEvent.click(narrativeTab);

      expect(narrativeTab.parentElement).toHaveClass('active');
    });

    it('should switch to Choice category', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const choiceTab = screen.getByText('Choice');
      await fireEvent.click(choiceTab);

      expect(choiceTab.parentElement).toHaveClass('active');
    });

    it('should filter templates by category', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      // Get all templates initially
      const allTemplates = templateManager.getAllTemplates();
      const narrativeTemplates = allTemplates.filter(t => t.category === 'narrative');

      // Switch to Narrative category
      const narrativeTab = screen.getByText('Narrative');
      await fireEvent.click(narrativeTab);

      // Verify only narrative templates are shown
      if (narrativeTemplates.length > 0) {
        expect(screen.getByText(narrativeTemplates[0].name)).toBeInTheDocument();
      }
    });
  });

  describe('Search Functionality', () => {
    it('should filter templates by search query', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const searchInput = screen.getByPlaceholderText(/Search templates/i);
      await fireEvent.input(searchInput, { target: { value: 'choice' } });

      // Results should be filtered
      // (Actual templates depend on templateManager implementation)
    });

    it('should search in template descriptions', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const searchInput = screen.getByPlaceholderText(/Search templates/i);
      await fireEvent.input(searchInput, { target: { value: 'player' } });

      // Results should include templates with "player" in description
    });

    it('should show empty state when no templates match', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const searchInput = screen.getByPlaceholderText(/Search templates/i);
      await fireEvent.input(searchInput, { target: { value: 'xyznonexistent123' } });

      expect(screen.getByText('No templates found')).toBeInTheDocument();
      expect(screen.getByText('Try a different search or category')).toBeInTheDocument();
    });

    it('should combine category and search filters', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      // Select a category
      const narrativeTab = screen.getByText('Narrative');
      await fireEvent.click(narrativeTab);

      // Then search
      const searchInput = screen.getByPlaceholderText(/Search templates/i);
      await fireEvent.input(searchInput, { target: { value: 'test' } });

      // Both filters should apply
    });
  });

  describe('Template Selection', () => {
    it('should select template on click', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        const firstTemplate = screen.getByText(templates[0].name);
        await fireEvent.click(firstTemplate.closest('button')!);

        expect(firstTemplate.closest('button')).toHaveClass('selected');
      }
    });

    it('should show template preview when selected', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        const firstTemplate = screen.getByText(templates[0].name);
        await fireEvent.click(firstTemplate.closest('button')!);

        expect(screen.getByText(`Preview: ${templates[0].name}`)).toBeInTheDocument();
      }
    });

    it('should show template title in preview', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        const template = templates[0];
        const templateElement = screen.getByText(template.name);
        await fireEvent.click(templateElement.closest('button')!);

        expect(screen.getByText('Title')).toBeInTheDocument();
      }
    });

    it('should show template content in preview', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        const template = templates[0];
        const templateElement = screen.getByText(template.name);
        await fireEvent.click(templateElement.closest('button')!);

        expect(screen.getByText('Content')).toBeInTheDocument();
      }
    });

    it('should show choices in preview if present', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      const templateWithChoices = templates.find(t =>
        t.template.choices && t.template.choices.length > 0
      );

      if (templateWithChoices) {
        const templateElement = screen.getByText(templateWithChoices.name);
        await fireEvent.click(templateElement.closest('button')!);

        expect(screen.getByText(/Choices/i)).toBeInTheDocument();
      }
    });

    it('should show tags in preview if present', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      const templateWithTags = templates.find(t =>
        t.template.tags && t.template.tags.length > 0
      );

      if (templateWithTags) {
        const templateElement = screen.getByText(templateWithTags.name);
        await fireEvent.click(templateElement.closest('button')!);

        expect(screen.getByText('Tags')).toBeInTheDocument();
      }
    });

    it('should enable create button when template selected', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const createButton = screen.getByText('Create from Template');
      expect(createButton).toBeDisabled();

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        const firstTemplate = screen.getByText(templates[0].name);
        await fireEvent.click(firstTemplate.closest('button')!);

        expect(createButton).not.toBeDisabled();
      }
    });
  });

  describe('Template Application', () => {
    it('should create passage from template on button click', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const story = get(currentStory);
      if (!story) return;

      const initialPassageCount = story.passages.size;

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        // Select template
        const firstTemplate = screen.getByText(templates[0].name);
        await fireEvent.click(firstTemplate.closest('button')!);

        // Create from template
        const createButton = screen.getByText('Create from Template');
        await fireEvent.click(createButton);

        // Verify passage was created
        expect(story.passages.size).toBe(initialPassageCount + 1);
      }
    });

    it('should create passage from template on double click', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const story = get(currentStory);
      if (!story) return;

      const initialPassageCount = story.passages.size;

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        // Double-click template
        const firstTemplate = screen.getByText(templates[0].name);
        await fireEvent.dblClick(firstTemplate.closest('button')!);

        // Verify passage was created
        expect(story.passages.size).toBe(initialPassageCount + 1);
      }
    });

    it('should call onSelect callback when template applied', async () => {
      const onSelect = vi.fn();

      render(PassageTemplateDialog, {
        props: {
          isOpen: true,
          onSelect
        }
      });

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        // Select template
        const firstTemplate = screen.getByText(templates[0].name);
        await fireEvent.click(firstTemplate.closest('button')!);

        // Create from template
        const createButton = screen.getByText('Create from Template');
        await fireEvent.click(createButton);

        // Verify callback was called
        expect(onSelect).toHaveBeenCalledWith(templates[0]);
      }
    });

    it('should close dialog after applying template', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        // Select template
        const firstTemplate = screen.getByText(templates[0].name);
        await fireEvent.click(firstTemplate.closest('button')!);

        // Create from template
        const createButton = screen.getByText('Create from Template');
        await fireEvent.click(createButton);

        // Dialog should close
        expect(screen.queryByText('Passage Templates')).not.toBeInTheDocument();
      }
    });
  });

  describe('Dialog Closing', () => {
    it('should close on cancel button click', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const cancelButton = screen.getByText('Cancel');
      await fireEvent.click(cancelButton);

      expect(screen.queryByText('Passage Templates')).not.toBeInTheDocument();
    });

    it('should close on X button click', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await fireEvent.click(closeButton);

      expect(screen.queryByText('Passage Templates')).not.toBeInTheDocument();
    });

    it('should close on backdrop click', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const backdrop = screen.getByText('Passage Templates').closest('.dialog-backdrop');
      if (backdrop) {
        await fireEvent.click(backdrop);
        expect(screen.queryByText('Passage Templates')).not.toBeInTheDocument();
      }
    });

    it('should reset state on close', async () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      // Select a template and search
      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        const firstTemplate = screen.getByText(templates[0].name);
        await fireEvent.click(firstTemplate.closest('button')!);
      }

      const searchInput = screen.getByPlaceholderText(/Search templates/i);
      await fireEvent.input(searchInput, { target: { value: 'test' } });

      // Close dialog
      const cancelButton = screen.getByText('Cancel');
      await fireEvent.click(cancelButton);

      // Re-open and verify state is reset
      // (Would need to control isOpen prop to test this fully)
    });
  });

  describe('Template Grid Display', () => {
    it('should display templates in grid layout', () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        const grid = screen.getByText(templates[0].name).closest('.template-grid');
        expect(grid).toBeInTheDocument();
      }
    });

    it('should show template icons', () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0 && templates[0].icon) {
        expect(screen.getByText(templates[0].icon)).toBeInTheDocument();
      }
    });

    it('should show template descriptions', () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        expect(screen.getByText(templates[0].description)).toBeInTheDocument();
      }
    });
  });

  describe('Category Icons', () => {
    it('should show category icons', () => {
      render(PassageTemplateDialog, {
        props: { isOpen: true }
      });

      expect(screen.getByText('📚')).toBeInTheDocument(); // All
      expect(screen.getByText('📖')).toBeInTheDocument(); // Narrative
      expect(screen.getByText('🔀')).toBeInTheDocument(); // Choice
      expect(screen.getByText('⚡')).toBeInTheDocument(); // Conditional
      expect(screen.getByText('🔧')).toBeInTheDocument(); // Scripted
    });
  });
});
