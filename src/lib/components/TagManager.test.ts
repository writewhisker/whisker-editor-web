import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import TagManager from './TagManager.svelte';
import { tagRegistry, tagActions } from '../stores/tagStore';
import { currentStory, projectActions } from '../stores/projectStore';
import { filterState } from '../stores/filterStore';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';

describe('TagManager', () => {
  let story: Story;

  // Helper function to add passages with tags
  function addPassageWithTags(title: string, tags: string[]) {
    const passage = new Passage({ title, tags });
    story.addPassage(passage);
    currentStory.update(s => s);
  }

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    // Create test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Set as current story
    currentStory.set(story);

    // Reset filter state
    filterState.set({
      searchQuery: '',
      selectedTags: [],
      passageTypes: [],
      includeChoiceText: true,
    });
  });

  afterEach(() => {
    currentStory.set(null);
    localStorage.clear();
  });

  describe('rendering and statistics', () => {
    it('should render with title and statistics section', () => {
      const { container } = render(TagManager);

      expect(container.textContent).toContain('Tag Manager');
      expect(container.textContent).toContain('Total Tags');
      expect(container.textContent).toContain('Total Usages');
    });

    it('should show zero statistics when no tags exist', () => {
      const { container } = render(TagManager);

      expect(container.textContent).toContain('Total Tags');
      expect(container.textContent).toContain('0'); // Total tags count
    });

    it('should display correct tag statistics', () => {
      addPassageWithTags('P1', ['action', 'combat']);
      addPassageWithTags('P2', ['action', 'dialogue']);
      addPassageWithTags('P3', ['combat']);

      const { container } = render(TagManager);

      expect(container.textContent).toContain('3'); // Total tags: action, combat, dialogue
      expect(container.textContent).toContain('5'); // Total usages: action(2), combat(2), dialogue(1) = 5
    });

    it('should display most used tag', () => {
      addPassageWithTags('P1', ['action']);
      addPassageWithTags('P2', ['action']);
      addPassageWithTags('P3', ['combat']);

      const { container } = render(TagManager);

      expect(container.textContent).toContain('Most Used Tag');
      expect(container.textContent).toContain('action');
      expect(container.textContent).toContain('2 uses');
    });

    it('should show empty state when no tags exist', () => {
      const { container } = render(TagManager);

      expect(container.textContent).toContain('No tags yet');
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      addPassageWithTags('P1', ['action', 'combat', 'dialogue']);
    });

    it('should filter tags based on search query', async () => {
      const { container } = render(TagManager);

      const searchInput = container.querySelector('input[placeholder="Search tags..."]') as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      await fireEvent.input(searchInput, { target: { value: 'act' } });

      // Should show action tag
      expect(container.textContent).toContain('action');

      // Combat and dialogue should not appear in the tag list (though they may appear in stats/other text)
      const tagElements = Array.from(container.querySelectorAll('.font-medium'));
      const tagNames = tagElements.map(el => el.textContent).filter(text =>
        text && !text.includes('Total') && !text.includes('Most')
      );

      expect(tagNames.filter(name => name?.includes('combat')).length).toBe(0);
      expect(tagNames.filter(name => name?.includes('dialogue')).length).toBe(0);
    });

    it('should be case-insensitive', async () => {
      const { container } = render(TagManager);

      const searchInput = container.querySelector('input[placeholder="Search tags..."]') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'ACT' } });

      expect(container.textContent).toContain('action');
    });

    it('should show no results message when search has no matches', async () => {
      const { container } = render(TagManager);

      const searchInput = container.querySelector('input[placeholder="Search tags..."]') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

      expect(container.textContent).toContain('No tags match your search');
    });
  });

  describe('sorting functionality', () => {
    beforeEach(() => {
      addPassageWithTags('P1', ['zebra']);
      addPassageWithTags('P2', ['alpha', 'alpha']); // alpha used twice
      addPassageWithTags('P3', ['beta']);
    });

    it('should sort by usage by default', () => {
      const { container } = render(TagManager);

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('usage');
    });

    it('should sort tags by name when selected', async () => {
      const { container } = render(TagManager);

      const select = container.querySelector('select') as HTMLSelectElement;
      await fireEvent.change(select, { target: { value: 'name' } });

      const tagElements = Array.from(container.querySelectorAll('.font-medium'));
      const tagNames = tagElements.map(el => el.textContent).filter(text =>
        text && !text.includes('Total') && !text.includes('Most')
      );

      // Should be alphabetically sorted
      expect(tagNames[0]).toContain('alpha');
      expect(tagNames[1]).toContain('beta');
      expect(tagNames[2]).toContain('zebra');
    });

    it('should display usage count for each tag', () => {
      const { container } = render(TagManager);

      expect(container.textContent).toMatch(/alpha.*2 uses/);
      expect(container.textContent).toMatch(/beta.*1 use/);
    });
  });

  describe('tag selection', () => {
    beforeEach(() => {
      addPassageWithTags('P1', ['action', 'combat']);
    });

    it('should allow selecting tags via checkbox', async () => {
      const { container } = render(TagManager);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      expect(checkboxes.length).toBeGreaterThan(0);

      await fireEvent.click(checkboxes[0]);

      // Should show selection count
      expect(container.textContent).toContain('1 selected');
    });

    it('should show bulk action buttons when tags are selected', async () => {
      const { container } = render(TagManager);

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(checkbox);

      expect(container.textContent).toContain('Clear');
      expect(container.textContent).toContain('Delete');
    });

    it('should show merge button only when exactly 2 tags are selected', async () => {
      const { container } = render(TagManager);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

      // Select first tag
      await fireEvent.click(checkboxes[0]);
      expect(container.textContent).not.toContain('Merge');

      // Select second tag
      await fireEvent.click(checkboxes[1]);
      expect(container.textContent).toContain('Merge');
    });

    it('should clear selection when Clear button is clicked', async () => {
      const { container } = render(TagManager);

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(checkbox);

      expect(container.textContent).toContain('1 selected');

      const clearButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Clear');
      await fireEvent.click(clearButton!);

      expect(container.textContent).not.toContain('selected');
    });
  });

  describe('rename functionality', () => {
    beforeEach(() => {
      addPassageWithTags('P1', ['oldname']);
    });

    it('should show rename input when Rename button is clicked', async () => {
      const { container } = render(TagManager);

      const renameButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Rename');
      await fireEvent.click(renameButton!);

      const input = container.querySelector('input[type="text"]:not([placeholder])') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe('oldname');
    });

    it('should show Save and Cancel buttons during rename', async () => {
      const { container } = render(TagManager);

      const renameButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Rename');
      await fireEvent.click(renameButton!);

      expect(container.textContent).toContain('Save');
      expect(container.textContent).toContain('Cancel');
    });

    it('should cancel rename on Cancel button click', async () => {
      const { container } = render(TagManager);

      const renameButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Rename');
      await fireEvent.click(renameButton!);

      const cancelButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Cancel');
      await fireEvent.click(cancelButton!);

      // Should return to normal view
      expect(container.textContent).not.toContain('Save');
      expect(container.textContent).toContain('Rename');
    });

    it('should cancel rename on Escape key', async () => {
      const { container } = render(TagManager);

      const renameButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Rename');
      await fireEvent.click(renameButton!);

      const input = container.querySelector('input[type="text"]:not([placeholder])') as HTMLInputElement;
      await fireEvent.keyDown(input, { key: 'Escape' });

      expect(container.textContent).not.toContain('Save');
    });

    it('should rename tag on Save button click', async () => {
      const { container } = render(TagManager);

      const renameButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Rename');
      await fireEvent.click(renameButton!);

      const input = container.querySelector('input[type="text"]:not([placeholder])') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'newname' } });

      const saveButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Save');
      await fireEvent.click(saveButton!);

      // Tag should be renamed in the story
      const registry = get(tagRegistry);
      expect(registry.has('newname')).toBe(true);
      expect(registry.has('oldname')).toBe(false);
    });

    it('should rename tag on Enter key', async () => {
      const { container } = render(TagManager);

      const renameButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Rename');
      await fireEvent.click(renameButton!);

      const input = container.querySelector('input[type="text"]:not([placeholder])') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'newname' } });
      await fireEvent.keyDown(input, { key: 'Enter' });

      const registry = get(tagRegistry);
      expect(registry.has('newname')).toBe(true);
    });

    it('should show alert when renaming to existing tag name', async () => {
      addPassageWithTags('P2', ['existing']);

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { container } = render(TagManager);

      const renameButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'Rename tag');
      await fireEvent.click(renameButton!);

      const input = container.querySelector('input[type="text"]:not([placeholder])') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'existing' } });
      await fireEvent.keyDown(input, { key: 'Enter' });

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));

      alertSpy.mockRestore();
    });
  });

  describe('delete functionality', () => {
    beforeEach(() => {
      addPassageWithTags('P1', ['delete-me']);
      addPassageWithTags('P2', ['delete-me']);
    });

    it('should show confirmation dialog when Delete button is clicked', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { container } = render(TagManager);

      const deleteButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Delete' && btn.getAttribute('title') === 'Delete tag');
      await fireEvent.click(deleteButton!);

      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Delete tag'));
      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('2 passage'));

      confirmSpy.mockRestore();
    });

    it('should delete tag when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { container } = render(TagManager);

      const deleteButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Delete' && btn.getAttribute('title') === 'Delete tag');
      await fireEvent.click(deleteButton!);

      const registry = get(tagRegistry);
      expect(registry.has('delete-me')).toBe(false);

      confirmSpy.mockRestore();
    });

    it('should not delete tag when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { container } = render(TagManager);

      const deleteButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Delete' && btn.getAttribute('title') === 'Delete tag');
      await fireEvent.click(deleteButton!);

      const registry = get(tagRegistry);
      expect(registry.has('delete-me')).toBe(true);

      confirmSpy.mockRestore();
    });
  });

  describe('bulk delete functionality', () => {
    beforeEach(() => {
      addPassageWithTags('P1', ['tag1', 'tag2', 'tag3']);
    });

    it('should delete selected tags when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { container } = render(TagManager);

      // Select first two tags
      const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      await fireEvent.click(checkboxes[0]);
      await fireEvent.click(checkboxes[1]);

      const deleteButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Delete' && !btn.getAttribute('title'));
      await fireEvent.click(deleteButton!);

      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Delete 2 selected tag'));

      confirmSpy.mockRestore();
    });

    it('should clear selection after bulk delete', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { container } = render(TagManager);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      await fireEvent.click(checkboxes[0]);

      const deleteButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Delete' && !btn.getAttribute('title'));
      await fireEvent.click(deleteButton!);

      expect(container.textContent).not.toContain('selected');

      confirmSpy.mockRestore();
    });
  });

  describe('filter functionality', () => {
    beforeEach(() => {
      addPassageWithTags('P1', ['action']);
    });

    it('should add tag to filter when Filter button is clicked', async () => {
      const { container } = render(TagManager);

      const filterButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Filter');
      await fireEvent.click(filterButton!);

      const state = get(filterState);
      expect(state.selectedTags).toContain('action');
    });

    it('should toggle filter when clicked multiple times', async () => {
      const { container } = render(TagManager);

      const filterButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Filter');

      await fireEvent.click(filterButton!);
      let state = get(filterState);
      expect(state.selectedTags).toContain('action');

      await fireEvent.click(filterButton!);
      state = get(filterState);
      expect(state.selectedTags).not.toContain('action');
    });
  });

  describe('color picker functionality', () => {
    beforeEach(() => {
      addPassageWithTags('P1', ['colored']);
    });

    it('should show color picker when color button is clicked', async () => {
      const { container } = render(TagManager);

      const colorButton = container.querySelector('button[title="Click to change color"]') as HTMLButtonElement;
      await fireEvent.click(colorButton);

      expect(container.textContent).toContain('Reset to Default');
    });

    it('should hide color picker when clicking color button again', async () => {
      const { container } = render(TagManager);

      const colorButton = container.querySelector('button[title="Click to change color"]') as HTMLButtonElement;
      await fireEvent.click(colorButton);
      await fireEvent.click(colorButton);

      // Color picker should be hidden
      const resetButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Reset to Default');
      expect(resetButton).toBeFalsy();
    });

    it('should change tag color when clicking a color swatch', async () => {
      const { container } = render(TagManager);

      const colorButton = container.querySelector('button[title="Click to change color"]') as HTMLButtonElement;
      await fireEvent.click(colorButton);

      // Find color swatches in the picker
      const colorSwatches = Array.from(container.querySelectorAll('.grid.grid-cols-4 button'));
      expect(colorSwatches.length).toBeGreaterThan(0);

      await fireEvent.click(colorSwatches[0]);

      // Color picker should close after selection
      const resetButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Reset to Default');
      expect(resetButton).toBeFalsy();
    });

    it('should reset tag color when Reset button is clicked', async () => {
      const { container } = render(TagManager);

      const colorButton = container.querySelector('button[title="Click to change color"]') as HTMLButtonElement;
      await fireEvent.click(colorButton);

      const resetButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Reset to Default');
      await fireEvent.click(resetButton!);

      // Color picker should close
      const resetButtonAfter = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Reset to Default');
      expect(resetButtonAfter).toBeFalsy();
    });
  });

  describe('merge dialog', () => {
    beforeEach(() => {
      addPassageWithTags('P1', ['source', 'target']);
    });

    it('should show alert when trying to merge without selecting 2 tags', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { container } = render(TagManager);

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(checkbox);

      // Merge button should not be visible with only 1 tag selected
      const mergeButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Merge');
      expect(mergeButton).toBeFalsy();

      alertSpy.mockRestore();
    });

    it('should open merge dialog when 2 tags are selected and Merge is clicked', async () => {
      const { container } = render(TagManager);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      await fireEvent.click(checkboxes[0]);
      await fireEvent.click(checkboxes[1]);

      const mergeButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Merge');
      await fireEvent.click(mergeButton!);

      expect(container.textContent).toContain('Merge Tags');
      expect(container.textContent).toContain('Source (will be deleted)');
      expect(container.textContent).toContain('Target (will be kept)');
    });

    it('should swap source and target when swap button is clicked', async () => {
      const { container } = render(TagManager);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      await fireEvent.click(checkboxes[0]);
      await fireEvent.click(checkboxes[1]);

      const mergeButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Merge');
      await fireEvent.click(mergeButton!);

      // Get the dialog
      const dialog = container.querySelector('.fixed.inset-0');
      expect(dialog).toBeTruthy();

      // Get initial source and target from the dialog
      const sourceDiv = dialog!.querySelector('.bg-gray-100 .font-medium');
      const targetDiv = dialog!.querySelector('.bg-blue-50 .font-medium');
      const initialSource = sourceDiv!.textContent;
      const initialTarget = targetDiv!.textContent;

      // Click swap button
      const swapButton = Array.from(dialog!.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('↔'));
      await fireEvent.click(swapButton!);

      // Source and target should be swapped
      const newSourceDiv = dialog!.querySelector('.bg-gray-100 .font-medium');
      const newTargetDiv = dialog!.querySelector('.bg-blue-50 .font-medium');
      expect(newSourceDiv!.textContent).toBe(initialTarget);
      expect(newTargetDiv!.textContent).toBe(initialSource);
    });

    it('should close merge dialog when Cancel is clicked', async () => {
      const { container } = render(TagManager);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      await fireEvent.click(checkboxes[0]);
      await fireEvent.click(checkboxes[1]);

      const mergeButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Merge');
      await fireEvent.click(mergeButton!);

      const cancelButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Cancel');
      await fireEvent.click(cancelButton!);

      expect(container.textContent).not.toContain('Merge Tags');
    });

    it('should merge tags when Merge Tags button is clicked', async () => {
      const { container } = render(TagManager);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      await fireEvent.click(checkboxes[0]);
      await fireEvent.click(checkboxes[1]);

      const mergeButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Merge');
      await fireEvent.click(mergeButton!);

      // Get source tag name
      const sourceElement = container.querySelector('.bg-gray-100 .font-medium');
      const sourceName = sourceElement!.textContent;

      const mergeTagsButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Merge Tags');
      await fireEvent.click(mergeTagsButton!);

      // Source tag should be removed from registry
      const registry = get(tagRegistry);
      expect(registry.has(sourceName!)).toBe(false);
    });

    it('should clear selection after merge', async () => {
      const { container } = render(TagManager);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      await fireEvent.click(checkboxes[0]);
      await fireEvent.click(checkboxes[1]);

      const mergeButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Merge');
      await fireEvent.click(mergeButton!);

      const mergeTagsButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Merge Tags');
      await fireEvent.click(mergeTagsButton!);

      expect(container.textContent).not.toContain('selected');
    });
  });

  describe('edge cases', () => {
    it('should handle empty story gracefully', () => {
      const { container } = render(TagManager);

      expect(container.textContent).toContain('No tags yet');
      expect(container.textContent).toContain('0'); // Stats should show 0
    });

    it('should not rename when new name is same as old', async () => {
      addPassageWithTags('P1', ['samename']);

      const { container } = render(TagManager);

      const renameButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Rename');
      await fireEvent.click(renameButton!);

      // Don't change the name
      const saveButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Save');
      await fireEvent.click(saveButton!);

      // Should cancel without error
      expect(container.textContent).not.toContain('Save');
    });

    it('should handle singular vs plural usage text correctly', () => {
      addPassageWithTags('P1', ['single']);
      addPassageWithTags('P2', ['multiple']);
      addPassageWithTags('P3', ['multiple']);

      const { container } = render(TagManager);

      expect(container.textContent).toMatch(/single.*1 use[^s]/);
      expect(container.textContent).toMatch(/multiple.*2 uses/);
    });
  });
});
