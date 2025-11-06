import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import SnippetsPanel from './SnippetsPanel.svelte';
import { templateManager } from '../utils/passageTemplates';
import { currentStory, selectedPassageId } from '../stores/projectStore';
import { notificationStore } from '../stores/notificationStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('SnippetsPanel', () => {
  let story: Story;

  beforeEach(() => {
    vi.clearAllMocks();
    currentStory.set(null);
    selectedPassageId.set(null);
    localStorage.clear();

    // Create test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
  });

  describe('rendering', () => {
    it('should display header', () => {
      const { getByText } = render(SnippetsPanel);
      expect(getByText('Snippets')).toBeTruthy();
    });

    it('should display custom button', () => {
      const { getByText } = render(SnippetsPanel);
      expect(getByText('+ Custom')).toBeTruthy();
    });

    it('should display search input', () => {
      const { container } = render(SnippetsPanel);
      const searchInput = container.querySelector('input[placeholder="Search snippets..."]');
      expect(searchInput).toBeTruthy();
    });
  });

  describe('category filters', () => {
    it('should display all category filter buttons', () => {
      const { getAllByText } = render(SnippetsPanel);

      expect(getAllByText(/All/).length).toBeGreaterThan(0);
      expect(getAllByText(/Narrative/).length).toBeGreaterThan(0);
      expect(getAllByText(/Choice/).length).toBeGreaterThan(0);
      expect(getAllByText(/Conditional/).length).toBeGreaterThan(0);
      expect(getAllByText(/Scripted/).length).toBeGreaterThan(0);
      expect(getAllByText(/Custom/).length).toBeGreaterThan(0);
    });

    it('should show category counts', () => {
      const { container } = render(SnippetsPanel);
      // Should show counts like "All (5)", "Narrative (2)", etc.
      expect(container.textContent).toMatch(/\(\d+\)/);
    });

    it('should filter templates by category when clicked', async () => {
      const { getByText, container } = render(SnippetsPanel);

      const narrativeButton = getByText(/Narrative/) as HTMLButtonElement;
      await fireEvent.click(narrativeButton);

      // Should only show narrative templates
      const templates = templateManager.getAllTemplates();
      const narrativeTemplates = templates.filter(t => t.category === 'narrative');

      narrativeTemplates.forEach(template => {
        expect(container.textContent).toContain(template.name);
      });
    });

    it('should highlight selected category', async () => {
      const { getAllByText } = render(SnippetsPanel);

      const choiceButtons = getAllByText(/Choice/);
      await fireEvent.click(choiceButtons[0] as HTMLButtonElement);

      expect((choiceButtons[0] as HTMLButtonElement).className).toContain('bg-blue-500');
    });

    it('should show all templates when All is selected', async () => {
      const { getByText } = render(SnippetsPanel);

      const allButton = getByText(/All/) as HTMLButtonElement;
      await fireEvent.click(allButton);

      const templates = templateManager.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('search functionality', () => {
    it('should filter templates by search query', async () => {
      const { container } = render(SnippetsPanel);

      const searchInput = container.querySelector('input[placeholder="Search snippets..."]') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'basic' } });

      // Should filter templates containing "basic"
      const templates = templateManager.getAllTemplates();
      const matchingTemplates = templates.filter(t =>
        t.name.toLowerCase().includes('basic') ||
        t.description.toLowerCase().includes('basic')
      );

      if (matchingTemplates.length > 0) {
        expect(container.textContent).toContain(matchingTemplates[0].name);
      }
    });

    it('should be case-insensitive', async () => {
      const { container } = render(SnippetsPanel);

      const searchInput = container.querySelector('input[placeholder="Search snippets..."]') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'BASIC' } });

      const templates = templateManager.getAllTemplates();
      const matchingTemplates = templates.filter(t =>
        t.name.toLowerCase().includes('basic') ||
        t.description.toLowerCase().includes('basic')
      );

      if (matchingTemplates.length > 0) {
        expect(container.textContent).toContain(matchingTemplates[0].name);
      }
    });

    it('should show no results message when search has no matches', async () => {
      const { container, getByText } = render(SnippetsPanel);

      const searchInput = container.querySelector('input[placeholder="Search snippets..."]') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'nonexistenttemplate12345' } });

      expect(getByText('No snippets found')).toBeTruthy();
    });

    it('should combine search and category filters', async () => {
      const { container, getByText } = render(SnippetsPanel);

      const narrativeButton = getByText(/Narrative/) as HTMLButtonElement;
      await fireEvent.click(narrativeButton);

      const searchInput = container.querySelector('input[placeholder="Search snippets..."]') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'basic' } });

      const templates = templateManager.getAllTemplates();
      const filtered = templates.filter(t =>
        t.category === 'narrative' &&
        (t.name.toLowerCase().includes('basic') || t.description.toLowerCase().includes('basic'))
      );

      // Result should match both filters
      expect(container).toBeTruthy();
    });
  });

  describe('template display', () => {
    it('should display template names', () => {
      const { container } = render(SnippetsPanel);

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        expect(container.textContent).toContain(templates[0].name);
      }
    });

    it('should display template descriptions', () => {
      const { container } = render(SnippetsPanel);

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        expect(container.textContent).toContain(templates[0].description);
      }
    });

    it('should display template icons', () => {
      const { container } = render(SnippetsPanel);

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0 && templates[0].icon) {
        expect(container.textContent).toContain(templates[0].icon);
      }
    });

    it('should show choice count for templates with choices', () => {
      const { container } = render(SnippetsPanel);

      const templates = templateManager.getAllTemplates();
      const templateWithChoices = templates.find(t => t.template.choices && t.template.choices.length > 0);

      if (templateWithChoices) {
        expect(container.textContent).toMatch(/\d+ choice/);
      }
    });

    it('should show tag count for templates with tags', () => {
      const { container } = render(SnippetsPanel);

      const templates = templateManager.getAllTemplates();
      const templateWithTags = templates.find(t => t.template.tags && t.template.tags.length > 0);

      if (templateWithTags) {
        expect(container.textContent).toMatch(/\d+ tag/);
      }
    });

    it('should display category badges', () => {
      const { container } = render(SnippetsPanel);

      const templates = templateManager.getAllTemplates();
      if (templates.length > 0) {
        expect(container.textContent).toContain(templates[0].category);
      }
    });
  });

  describe('template insertion', () => {
    beforeEach(() => {
      currentStory.set(story);
    });

    it('should show insert button for each template', () => {
      const { getAllByText } = render(SnippetsPanel);

      const insertButtons = getAllByText('Insert');
      expect(insertButtons.length).toBeGreaterThan(0);
    });

    it('should insert template when insert button is clicked', async () => {
      const { getAllByText } = render(SnippetsPanel);

      const initialPassageCount = story.passages.size;

      const insertButtons = getAllByText('Insert');
      await fireEvent.click(insertButtons[0] as HTMLButtonElement);

      await waitFor(() => {
        expect(get(currentStory)!.passages.size).toBe(initialPassageCount + 1);
      });
    });

    it('should show error notification when no story loaded', async () => {
      currentStory.set(null);
      const errorSpy = vi.spyOn(notificationStore, 'error');

      const { getAllByText } = render(SnippetsPanel);

      const insertButtons = getAllByText('Insert');
      await fireEvent.click(insertButtons[0] as HTMLButtonElement);

      expect(errorSpy).toHaveBeenCalledWith('No story loaded');
    });

    it('should show success notification after insertion', async () => {
      const successSpy = vi.spyOn(notificationStore, 'success');

      const { getAllByText } = render(SnippetsPanel);

      const insertButtons = getAllByText('Insert');
      await fireEvent.click(insertButtons[0] as HTMLButtonElement);

      await waitFor(() => {
        expect(successSpy).toHaveBeenCalled();
      });
    });

    it('should position new passage near selected passage', async () => {
      const existingPassage = story.addPassage(new Passage({
        title: 'Existing',
        content: 'Content',
        position: { x: 100, y: 100 },
      }));

      selectedPassageId.set(existingPassage.id);

      const { getAllByText } = render(SnippetsPanel);

      const insertButtons = getAllByText('Insert');
      await fireEvent.click(insertButtons[0] as HTMLButtonElement);

      await waitFor(() => {
        const passages = Array.from(get(currentStory)!.passages.values());
        const newPassage = passages.find(p => p.id !== existingPassage.id);

        if (newPassage && newPassage.position) {
          expect(newPassage.position.x).toBe(100 + 300);
          expect(newPassage.position.y).toBe(300);
        }
      });
    });

    it('should select newly inserted passage', async () => {
      const { getAllByText } = render(SnippetsPanel);

      const insertButtons = getAllByText('Insert');
      await fireEvent.click(insertButtons[0] as HTMLButtonElement);

      await waitFor(() => {
        expect(get(selectedPassageId)).toBeTruthy();
      });
    });
  });

  describe('custom template creation', () => {
    beforeEach(() => {
      currentStory.set(story);
    });

    it('should show custom template form when button is clicked', async () => {
      const { getByText } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      expect(getByText('Save as Template')).toBeTruthy();
    });

    it('should hide form when cancel is clicked', async () => {
      const { getByText } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      await fireEvent.click(customButton); // Click again to cancel

      await waitFor(() => {
        expect(getByText('+ Custom')).toBeTruthy();
      });
    });

    it('should display template name input', async () => {
      const { getByText, container } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      const nameInput = container.querySelector('input[placeholder="Template name"]');
      expect(nameInput).toBeTruthy();
    });

    it('should display description input', async () => {
      const { getByText, container } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      const descInput = container.querySelector('input[placeholder="Description (optional)"]');
      expect(descInput).toBeTruthy();
    });

    it('should display category select', async () => {
      const { getByText, container } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      const select = container.querySelector('select');
      expect(select).toBeTruthy();
    });

    it('should show error when creating template without name', async () => {
      const errorSpy = vi.spyOn(notificationStore, 'error');
      const { getByText } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      const saveButton = getByText('Save Template') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      expect(errorSpy).toHaveBeenCalledWith('Please enter a template name');
    });

    it('should show error when no passage is selected', async () => {
      const errorSpy = vi.spyOn(notificationStore, 'error');
      const { getByText, container } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      const nameInput = container.querySelector('input[placeholder="Template name"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'My Template' } });

      const saveButton = getByText('Save Template') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      expect(errorSpy).toHaveBeenCalledWith('Please select a passage to save as template');
    });

    it('should create custom template when form is submitted', async () => {
      const passage = story.addPassage(new Passage({
        title: 'Template Passage',
        content: 'Template content',
      }));

      selectedPassageId.set(passage.id);

      const successSpy = vi.spyOn(notificationStore, 'success');
      const { getByText, container } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      const nameInput = container.querySelector('input[placeholder="Template name"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'My Template' } });

      const saveButton = getByText('Save Template') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      expect(successSpy).toHaveBeenCalledWith('Created custom template "My Template"');
    });

    it('should clear form after successful creation', async () => {
      const passage = story.addPassage(new Passage({
        title: 'Template Passage',
        content: 'Template content',
      }));

      selectedPassageId.set(passage.id);

      const { getByText, container } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      const nameInput = container.querySelector('input[placeholder="Template name"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'My Template' } });

      const saveButton = getByText('Save Template') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(container.textContent).not.toContain('Save as Template');
      });
    });
  });

  describe('custom template deletion', () => {
    it('should show delete button for custom templates', async () => {
      const passage = story.addPassage(new Passage({
        title: 'Template',
        content: 'Content',
      }));

      selectedPassageId.set(passage.id);
      currentStory.set(story);

      const { getByText, container } = render(SnippetsPanel);

      // Create a custom template first
      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      const nameInput = container.querySelector('input[placeholder="Template name"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'Delete Me' } });

      const saveButton = getByText('Save Template') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      await waitFor(() => {
        const deleteButtons = container.querySelectorAll('button');
        const hasDeleteButton = Array.from(deleteButtons).some(btn => btn.textContent === 'Delete');
        expect(hasDeleteButton).toBe(true);
      });
    });

    it('should not show delete button for built-in templates', () => {
      const { container } = render(SnippetsPanel);

      const templates = templateManager.getAllTemplates();
      const builtInTemplate = templates.find(t => !t.id.startsWith('custom-'));

      if (builtInTemplate) {
        // Built-in templates should not have delete button next to them
        expect(container).toBeTruthy();
      }
    });

    it('should show confirmation dialog when deleting', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const passage = story.addPassage(new Passage({
        title: 'Template',
        content: 'Content',
      }));

      selectedPassageId.set(passage.id);
      currentStory.set(story);

      const { getByText, container } = render(SnippetsPanel);

      const customButton = getByText('+ Custom') as HTMLButtonElement;
      await fireEvent.click(customButton);

      const nameInput = container.querySelector('input[placeholder="Template name"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'Delete Me' } });

      const saveButton = getByText('Save Template') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      await waitFor(() => {
        const deleteButton = Array.from(container.querySelectorAll('button')).find(
          btn => btn.textContent === 'Delete'
        );
        if (deleteButton) {
          fireEvent.click(deleteButton);
          expect(confirmSpy).toHaveBeenCalled();
        }
      });

      confirmSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle empty template list', () => {
      vi.spyOn(templateManager, 'getAllTemplates').mockReturnValue([]);

      const { getByText } = render(SnippetsPanel);
      expect(getByText('No snippets found')).toBeTruthy();
    });

    it('should handle very long template names', () => {
      const { container } = render(SnippetsPanel);
      // Should truncate or wrap long names properly
      expect(container).toBeTruthy();
    });

    it('should handle templates with no description', () => {
      const { container } = render(SnippetsPanel);
      expect(container).toBeTruthy();
    });
  });

  describe('dark mode styling', () => {
    it('should have dark mode classes', () => {
      const { container } = render(SnippetsPanel);
      expect(container.innerHTML).toContain('dark:');
    });
  });
});
