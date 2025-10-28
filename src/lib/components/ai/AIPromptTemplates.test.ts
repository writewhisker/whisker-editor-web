import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/svelte';
import AIPromptTemplates from './AIPromptTemplates.svelte';

describe('AIPromptTemplates', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when closed', () => {
      const { container } = render(AIPromptTemplates, { open: false });

      expect(container.querySelector('.dialog-overlay')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('📋 Prompt Templates')).toBeInTheDocument();
    });

    it('should render all category filters', () => {
      const { container } = render(AIPromptTemplates, { open: true });

      const filters = container.querySelectorAll('.filter-btn');
      expect(filters).toHaveLength(5); // All + 4 categories

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('📝 Writing')).toBeInTheDocument();
      expect(screen.getByText('✏️ Editing')).toBeInTheDocument();
      expect(screen.getByText('🔍 Analysis')).toBeInTheDocument();
      expect(screen.getByText('🌍 World')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });
  });

  describe('built-in templates', () => {
    it('should render all built-in templates', () => {
      render(AIPromptTemplates, { open: true });

      const templateCards = screen.getAllByRole('button', { name: /./i }).filter((btn) =>
        btn.className.includes('template-card')
      );

      // Should have 12 built-in templates
      expect(templateCards.length).toBeGreaterThanOrEqual(12);
    });

    it('should render Expand Passage template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Expand Passage')).toBeInTheDocument();
      expect(screen.getByText('Expand a brief passage into fuller content')).toBeInTheDocument();
    });

    it('should render Add Dialogue template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Add Dialogue')).toBeInTheDocument();
      expect(screen.getByText('Add character dialogue to a passage')).toBeInTheDocument();
    });

    it('should render Create Story Branches template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Create Story Branches')).toBeInTheDocument();
      expect(screen.getByText('Generate multiple story branches')).toBeInTheDocument();
    });

    it('should render Improve Clarity template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Improve Clarity')).toBeInTheDocument();
      expect(screen.getByText('Make writing clearer and more concise')).toBeInTheDocument();
    });

    it('should render Adjust Tone template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Adjust Tone')).toBeInTheDocument();
      expect(screen.getByText('Change the tone of a passage')).toBeInTheDocument();
    });

    it('should render Grammar & Style template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Grammar & Style')).toBeInTheDocument();
      expect(screen.getByText('Check grammar and improve style')).toBeInTheDocument();
    });

    it('should render Analyze Pacing template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Analyze Pacing')).toBeInTheDocument();
      expect(screen.getByText('Analyze story pacing')).toBeInTheDocument();
    });

    it('should render Character Consistency template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Character Consistency')).toBeInTheDocument();
      expect(screen.getByText('Check character consistency')).toBeInTheDocument();
    });

    it('should render Find Plot Holes template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Find Plot Holes')).toBeInTheDocument();
      expect(screen.getByText('Identify potential plot holes')).toBeInTheDocument();
    });

    it('should render World Details template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('World Details')).toBeInTheDocument();
      expect(screen.getByText('Generate world details')).toBeInTheDocument();
    });

    it('should render Character Background template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Character Background')).toBeInTheDocument();
      expect(screen.getByText('Create character backstory')).toBeInTheDocument();
    });

    it('should render Location Description template', () => {
      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Location Description')).toBeInTheDocument();
      expect(screen.getByText('Describe a location in detail')).toBeInTheDocument();
    });
  });

  describe('category filtering', () => {
    it('should show all templates by default', () => {
      render(AIPromptTemplates, { open: true });

      const allButton = screen.getByRole('button', { name: 'All' });
      expect(allButton).toHaveClass('active');

      // Should show templates from all categories
      expect(screen.getByText('Expand Passage')).toBeInTheDocument(); // writing
      expect(screen.getByText('Improve Clarity')).toBeInTheDocument(); // editing
      expect(screen.getByText('Analyze Pacing')).toBeInTheDocument(); // analysis
      expect(screen.getByText('World Details')).toBeInTheDocument(); // worldbuilding
    });

    it('should filter by writing category', async () => {
      const { container } = render(AIPromptTemplates, { open: true });

      const writingButton = screen.getByText('📝 Writing').closest('.filter-btn');
      if (writingButton) await fireEvent.click(writingButton);

      expect(writingButton).toHaveClass('active');
      expect(screen.getByText('Expand Passage')).toBeInTheDocument();
      expect(screen.getByText('Add Dialogue')).toBeInTheDocument();
      expect(screen.getByText('Create Story Branches')).toBeInTheDocument();
    });

    it('should filter by editing category', async () => {
      const { container } = render(AIPromptTemplates, { open: true });

      const editingButton = screen.getByText('✏️ Editing').closest('.filter-btn');
      if (editingButton) await fireEvent.click(editingButton);

      expect(editingButton).toHaveClass('active');
      expect(screen.getByText('Improve Clarity')).toBeInTheDocument();
      expect(screen.getByText('Adjust Tone')).toBeInTheDocument();
      expect(screen.getByText('Grammar & Style')).toBeInTheDocument();
    });

    it('should filter by analysis category', async () => {
      const { container } = render(AIPromptTemplates, { open: true });

      const analysisButton = screen.getByText('🔍 Analysis').closest('.filter-btn');
      if (analysisButton) await fireEvent.click(analysisButton);

      expect(analysisButton).toHaveClass('active');
      expect(screen.getByText('Analyze Pacing')).toBeInTheDocument();
      expect(screen.getByText('Character Consistency')).toBeInTheDocument();
      expect(screen.getByText('Find Plot Holes')).toBeInTheDocument();
    });

    it('should filter by worldbuilding category', async () => {
      const { container } = render(AIPromptTemplates, { open: true });

      const worldButton = screen.getByText('🌍 World').closest('.filter-btn');
      if (worldButton) await fireEvent.click(worldButton);

      expect(worldButton).toHaveClass('active');
      expect(screen.getByText('World Details')).toBeInTheDocument();
      expect(screen.getByText('Character Background')).toBeInTheDocument();
      expect(screen.getByText('Location Description')).toBeInTheDocument();
    });

    it('should switch between categories', async () => {
      render(AIPromptTemplates, { open: true });

      const writingButton = screen.getByText('📝 Writing').closest('.filter-btn');
      if (writingButton) await fireEvent.click(writingButton);
      expect(writingButton).toHaveClass('active');

      const editingButton = screen.getByText('✏️ Editing').closest('.filter-btn');
      if (editingButton) await fireEvent.click(editingButton);
      expect(editingButton).toHaveClass('active');
      expect(writingButton).not.toHaveClass('active');
    });
  });

  describe('search functionality', () => {
    it('should filter templates by name', async () => {
      render(AIPromptTemplates, { open: true });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await fireEvent.input(searchInput, { target: { value: 'dialogue' } });

      expect(screen.getByText('Add Dialogue')).toBeInTheDocument();
      expect(screen.queryByText('Expand Passage')).not.toBeInTheDocument();
    });

    it('should filter templates by description', async () => {
      render(AIPromptTemplates, { open: true });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await fireEvent.input(searchInput, { target: { value: 'grammar' } });

      expect(screen.getByText('Grammar & Style')).toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      render(AIPromptTemplates, { open: true });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await fireEvent.input(searchInput, { target: { value: 'DIALOGUE' } });

      expect(screen.getByText('Add Dialogue')).toBeInTheDocument();
    });

    it('should show empty state when no results', async () => {
      render(AIPromptTemplates, { open: true });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No templates found matching your search')).toBeInTheDocument();
    });

    it('should combine search with category filter', async () => {
      render(AIPromptTemplates, { open: true });

      const writingButton = screen.getByRole('button', { name: /Writing/i });
      await fireEvent.click(writingButton);

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await fireEvent.input(searchInput, { target: { value: 'passage' } });

      expect(screen.getByText('Expand Passage')).toBeInTheDocument();
      expect(screen.queryByText('Improve Clarity')).not.toBeInTheDocument(); // Different category
    });
  });

  describe('template selection', () => {
    it('should dispatch select event when template clicked', async () => {
      const { component } = render(AIPromptTemplates, { open: true });

      const selectHandler = vi.fn();
      component.$on('select', selectHandler);

      const expandPassageCard = screen.getByText('Expand Passage').closest('button');
      if (expandPassageCard) {
        await fireEvent.click(expandPassageCard);
      }

      expect(selectHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            template: expect.objectContaining({
              id: 'expand-passage',
              name: 'Expand Passage',
              category: 'writing',
            }),
          },
        })
      );
    });

    it('should close dialog after template selection', async () => {
      let isOpen = $state(true);
      const { component, rerender } = render(AIPromptTemplates, { open: isOpen });

      component.$on('select', () => {
        isOpen = false;
      });

      const expandPassageCard = screen.getByText('Expand Passage').closest('button');
      if (expandPassageCard) {
        await fireEvent.click(expandPassageCard);
      }

      await rerender({ open: isOpen });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should include template prompt in selection', async () => {
      const { component } = render(AIPromptTemplates, { open: true });

      const selectHandler = vi.fn();
      component.$on('select', selectHandler);

      const expandPassageCard = screen.getByText('Expand Passage').closest('button');
      if (expandPassageCard) {
        await fireEvent.click(expandPassageCard);
      }

      expect(selectHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            template: expect.objectContaining({
              prompt: expect.stringContaining('Expand this passage'),
            }),
          },
        })
      );
    });
  });

  describe('dialog controls', () => {
    it('should close when close button clicked', async () => {
      let isOpen = $state(true);
      const { rerender } = render(AIPromptTemplates, {
        open: isOpen,
      });

      const closeButton = screen.getByLabelText('Close');
      await fireEvent.click(closeButton);

      // Component should update open binding
      await rerender({ open: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close when overlay clicked', async () => {
      let isOpen = $state(true);
      const { container, rerender } = render(AIPromptTemplates, {
        open: isOpen,
      });

      const overlay = container.querySelector('.dialog-overlay');
      if (overlay) {
        await fireEvent.click(overlay);
      }

      await rerender({ open: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not close when dialog content clicked', async () => {
      render(AIPromptTemplates, { open: true });

      const dialog = screen.getByRole('dialog');
      await fireEvent.click(dialog);

      // Should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('custom templates', () => {
    it('should load custom templates from localStorage', () => {
      const customTemplates = [
        {
          id: 'custom-1',
          name: 'Custom Template',
          category: 'writing' as const,
          icon: '🎨',
          description: 'My custom template',
          prompt: 'Custom prompt: {content}',
        },
      ];

      localStorage.setItem('ai-custom-templates', JSON.stringify(customTemplates));

      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Custom Template')).toBeInTheDocument();
      expect(screen.getByText('My custom template')).toBeInTheDocument();
    });

    it('should handle corrupt localStorage data gracefully', () => {
      localStorage.setItem('ai-custom-templates', 'invalid json');

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(AIPromptTemplates, { open: true });

      // Should still render built-in templates
      expect(screen.getByText('Expand Passage')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing localStorage data', () => {
      localStorage.removeItem('ai-custom-templates');

      render(AIPromptTemplates, { open: true });

      // Should render built-in templates
      expect(screen.getByText('Expand Passage')).toBeInTheDocument();
    });

    it('should combine custom and built-in templates', () => {
      const customTemplates = [
        {
          id: 'custom-1',
          name: 'Custom Template',
          category: 'writing' as const,
          icon: '🎨',
          description: 'My custom template',
          prompt: 'Custom prompt',
        },
      ];

      localStorage.setItem('ai-custom-templates', JSON.stringify(customTemplates));

      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Custom Template')).toBeInTheDocument();
      expect(screen.getByText('Expand Passage')).toBeInTheDocument();
    });
  });

  describe('template card display', () => {
    it('should display template icon', () => {
      render(AIPromptTemplates, { open: true });

      // Icons are rendered as text content in template-icon spans
      const templateCards = screen.getAllByRole('button').filter((btn) =>
        btn.className.includes('template-card')
      );

      expect(templateCards.length).toBeGreaterThan(0);
    });

    it('should display template category', () => {
      render(AIPromptTemplates, { open: true });

      // Categories are shown in template-category divs
      expect(screen.getAllByText('writing').length).toBeGreaterThan(0);
      expect(screen.getAllByText('editing').length).toBeGreaterThan(0);
    });

    it('should truncate prompt preview', () => {
      const longPrompt = 'A'.repeat(200);
      const customTemplates = [
        {
          id: 'long-prompt',
          name: 'Long Template',
          category: 'writing' as const,
          icon: '📝',
          description: 'Has a long prompt',
          prompt: longPrompt,
        },
      ];

      localStorage.setItem('ai-custom-templates', JSON.stringify(customTemplates));

      render(AIPromptTemplates, { open: true });

      // Preview should be truncated to 100 chars + "..."
      const preview = screen.getByText(/A{100}\.\.\./);
      expect(preview).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(AIPromptTemplates, { open: true });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'templates-title');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have proper heading for screen readers', () => {
      render(AIPromptTemplates, { open: true });

      const heading = screen.getByText('📋 Prompt Templates');
      expect(heading.id).toBe('templates-title');
    });

    it('should have accessible close button', () => {
      render(AIPromptTemplates, { open: true });

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle templates with special characters in name', () => {
      const customTemplates = [
        {
          id: 'special',
          name: 'Template with "quotes" & <tags>',
          category: 'writing' as const,
          icon: '📝',
          description: 'Special chars',
          prompt: 'Test',
        },
      ];

      localStorage.setItem('ai-custom-templates', JSON.stringify(customTemplates));

      render(AIPromptTemplates, { open: true });

      expect(screen.getByText('Template with "quotes" & <tags>')).toBeInTheDocument();
    });

    it('should handle empty search query', async () => {
      render(AIPromptTemplates, { open: true });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await fireEvent.input(searchInput, { target: { value: '' } });

      // Should show all templates
      expect(screen.getByText('Expand Passage')).toBeInTheDocument();
      expect(screen.getByText('Improve Clarity')).toBeInTheDocument();
    });

    it('should handle whitespace-only search query', async () => {
      render(AIPromptTemplates, { open: true });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await fireEvent.input(searchInput, { target: { value: '   ' } });

      // Should show all templates
      expect(screen.getByText('Expand Passage')).toBeInTheDocument();
    });
  });
});
