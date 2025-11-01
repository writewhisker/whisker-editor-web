import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import PassageList from './PassageList.svelte';
import { currentStory, selectedPassageId } from '../stores/projectStore';
import { filterState } from '../stores/filterStore';
import { validationResult } from '../stores/validationStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import { Choice } from '../models/Choice';

describe('PassageList', () => {
  let story: Story;
  let onAddPassage: ReturnType<typeof vi.fn>;
  let onDeletePassage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    onAddPassage = vi.fn();
    onDeletePassage = vi.fn();

    currentStory.set(story);
    validationResult.set({
      issues: [],
      valid: true,
      timestamp: Date.now(),
      duration: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0
      }
    });
  });

  afterEach(() => {
    currentStory.set(null);
    selectedPassageId.set(null);
    filterState.set({
      searchQuery: '',
      selectedTags: [],
      passageTypes: [],
      includeChoiceText: true,
    });
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should render header with "Passages" title', () => {
      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(getByText('Passages')).toBeTruthy();
    });

    it('should render "+ Add" button', () => {
      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(getByText('+ Add')).toBeTruthy();
    });

    it('should call onAddPassage when + Add is clicked', async () => {
      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      await fireEvent.click(getByText('+ Add'));

      expect(onAddPassage).toHaveBeenCalled();
    });

    it('should render compact view toggle button', () => {
      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(getByText('Compact')).toBeTruthy();
    });

    it('should show empty message when no passages match filters', () => {
      // Add a passage but set a filter that won't match it
      const passage = new Passage({
        title: 'Test Passage',
        content: 'Some content',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      // Set a search query that won't match
      filterState.set({
        searchQuery: 'NOMATCHXYZ',
        selectedTags: [],
        passageTypes: [],
        includeChoiceText: true,
      });

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(getByText('No passages match your filters')).toBeTruthy();
    });

    it('should display passages when they exist', () => {
      const passage = new Passage({
        title: 'Test Passage',
        content: 'Test content',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(getByText('Test Passage')).toBeTruthy();
    });
  });

  describe('compact view toggle', () => {
    it('should toggle compact view when button is clicked', async () => {
      const passage = new Passage({
        title: 'Test',
        content: 'Test content that should be hidden in compact view',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText, container } = render(PassageList, { onAddPassage, onDeletePassage });

      const compactButton = getByText('Compact').closest('button') as HTMLButtonElement;

      // Initially not compact - should show content preview
      expect(container.textContent).toContain('Test content that should');

      await fireEvent.click(compactButton);

      // After toggle - content should be hidden (compact mode)
      await waitFor(() => {
        const contentElements = Array.from(container.querySelectorAll('.text-xs.text-gray-500'));
        expect(contentElements.length).toBe(0);
      });
    });

    it('should persist compact view preference in localStorage', async () => {
      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      const compactButton = getByText('Compact').closest('button') as HTMLButtonElement;
      await fireEvent.click(compactButton);

      expect(localStorage.getItem('passageList.compactView')).toBe('true');
    });
  });

  describe('passage selection', () => {
    it('should select passage when clicked', async () => {
      const passage = new Passage({
        title: 'Clickable',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      await fireEvent.click(getByText('Clickable'));

      await waitFor(() => {
        expect(get(selectedPassageId)).toBe(passage.id);
      });
    });

    it('should highlight selected passage', async () => {
      const passage = new Passage({
        title: 'Selected',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      const button = getByText('Selected').closest('button') as HTMLButtonElement;
      await fireEvent.click(button);

      await waitFor(() => {
        expect(button.className).toContain('bg-blue-50');
      });
    });
  });

  describe('passage icons', () => {
    it('should show start icon for start passage', () => {
      const passage = new Passage({
        title: 'Start',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      story.startPassage = passage.id;
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      const startIcon = Array.from(container.querySelectorAll('span')).find(
        span => span.textContent === '▶' && span.title === 'Start passage'
      );
      expect(startIcon).toBeTruthy();
    });

    it('should show dead end icon for passage with no choices', () => {
      const passage = new Passage({
        title: 'Dead End',
        content: '',
        position: { x: 0, y: 0 },
      });
      passage.choices = [];
      story.addPassage(passage);
      // Add start passage so this isn't orphaned
      const startPassage = new Passage({
        title: 'Start',
        content: '',
        position: { x: 0, y: 0 },
      });
      startPassage.choices.push(new Choice({
        id: 'c1',
        text: 'Go',
        target: passage.id,
      }));
      story.addPassage(startPassage);
      story.startPassage = startPassage.id;
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      const deadEndIcon = Array.from(container.querySelectorAll('span')).find(
        span => span.textContent === '⏹' && span.title === 'Dead end'
      );
      expect(deadEndIcon).toBeTruthy();
    });

    it('should show orphan icon for orphaned passage', () => {
      const orphan = new Passage({
        title: 'Orphan',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(orphan);

      // Add a separate start passage
      const start = new Passage({
        title: 'Start',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(start);
      story.startPassage = start.id;
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      const orphanIcon = Array.from(container.querySelectorAll('span')).find(
        span => span.textContent === '⚠' && span.title === 'Orphaned passage'
      );
      expect(orphanIcon).toBeTruthy();
    });

    it('should show color indicator when passage has color', () => {
      const passage = new Passage({
        title: 'Colored',
        content: '',
        position: { x: 0, y: 0 },
        color: '#FF0000',
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      const colorDiv = Array.from(container.querySelectorAll('div')).find(
        div => div.style.backgroundColor === 'rgb(255, 0, 0)'
      );
      expect(colorDiv).toBeTruthy();
    });
  });

  describe('validation icons', () => {
    it('should show error icon when passage has validation errors', () => {
      const passage = new Passage({
        title: 'Has Error',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      validationResult.set({
        valid: false,
        timestamp: Date.now(),
        duration: 0,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        stats: {
          totalPassages: 0,
          reachablePassages: 0,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0
        },
        issues: [
          {
            id: 'issue-1',
            severity: 'error',
            message: 'Test error',
            passageId: passage.id,
            category: 'links',
            fixable: false,
          },
        ],
      });

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(container.textContent).toContain('🔴');
    });

    it('should show warning icon when passage has warnings', () => {
      const passage = new Passage({
        title: 'Has Warning',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      validationResult.set({
        valid: true,
        timestamp: Date.now(),
        duration: 0,
        errorCount: 0,
        warningCount: 1,
        infoCount: 0,
        stats: {
          totalPassages: 0,
          reachablePassages: 0,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0
        },
        issues: [
          {
            id: 'issue-1',
            severity: 'warning',
            message: 'Test warning',
            passageId: passage.id,
            category: 'links',
            fixable: false,
          },
        ],
      });

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(container.textContent).toContain('⚠️');
    });

    it('should show count of validation issues', () => {
      const passage = new Passage({
        title: 'Has Issues',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      validationResult.set({
        valid: false,
        timestamp: Date.now(),
        duration: 0,
        errorCount: 2,
        warningCount: 0,
        infoCount: 0,
        stats: {
          totalPassages: 0,
          reachablePassages: 0,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0
        },
        issues: [
          {
            id: 'issue-1',
            severity: 'error',
            message: 'Error 1',
            passageId: passage.id,
            category: 'links',
            fixable: false,
          },
          {
            id: 'issue-2',
            severity: 'error',
            message: 'Error 2',
            passageId: passage.id,
            category: 'links',
            fixable: false,
          },
        ],
      });

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      // Should show count "2"
      const countElements = Array.from(container.querySelectorAll('span')).filter(
        span => span.textContent?.includes('2')
      );
      expect(countElements.length).toBeGreaterThan(0);
    });
  });

  describe('passage content preview', () => {
    it('should show truncated content preview in normal view', () => {
      const passage = new Passage({
        title: 'Test',
        content: 'This is a long content that should be truncated after fifty characters or so',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(container.textContent).toContain('This is a long content that should be truncated');
      expect(container.textContent).toContain('...');
    });

    it('should show tags in normal view', () => {
      const passage = new Passage({
        title: 'Tagged',
        content: '',
        position: { x: 0, y: 0 },
        tags: ['action', 'combat', 'boss'],
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(getByText('action')).toBeTruthy();
      expect(getByText('combat')).toBeTruthy();
      expect(getByText('boss')).toBeTruthy();
    });

    it('should limit tags display to 3 with overflow indicator', () => {
      const passage = new Passage({
        title: 'Many Tags',
        content: '',
        position: { x: 0, y: 0 },
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText, queryByText } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(getByText('tag1')).toBeTruthy();
      expect(getByText('tag2')).toBeTruthy();
      expect(getByText('tag3')).toBeTruthy();
      expect(getByText('+2')).toBeTruthy(); // Should show "+2" for remaining tags
      expect(queryByText('tag4')).toBeNull();
      expect(queryByText('tag5')).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should show word count in normal view', () => {
      const passage = new Passage({
        title: 'Stats Test',
        content: 'One two three four five',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(container.textContent).toMatch(/5w/);
    });

    it('should show outgoing choices count', () => {
      const passage = new Passage({
        title: 'With Choices',
        content: '',
        position: { x: 0, y: 0 },
      });
      passage.choices = [
        new Choice({ id: '1', text: 'Choice 1', target: 'p1' }),
        new Choice({ id: '2', text: 'Choice 2', target: 'p2' }),
      ];
      story.addPassage(passage);
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      // Should show "→ 2" for 2 outgoing choices
      expect(container.textContent).toMatch(/→\s*2/);
    });

    it('should show incoming links count', () => {
      const passage1 = new Passage({
        title: 'Target',
        content: '',
        position: { x: 0, y: 0 },
      });
      const passage2 = new Passage({
        title: 'Source',
        content: '',
        position: { x: 0, y: 0 },
      });
      passage2.choices = [new Choice({ id: '1', text: 'Go', target: passage1.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      // Should show "← 1" for 1 incoming link
      expect(container.textContent).toMatch(/←\s*1/);
    });
  });

  describe('context menu', () => {
    it('should show context menu on right click', async () => {
      const passage = new Passage({
        title: 'Right Click Me',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText, queryByText } = render(PassageList, { onAddPassage, onDeletePassage });

      const button = getByText('Right Click Me').closest('button') as HTMLButtonElement;
      await fireEvent.contextMenu(button);

      await waitFor(() => {
        expect(queryByText('Set as Start')).toBeTruthy();
        expect(queryByText('Duplicate')).toBeTruthy();
        expect(queryByText('Delete')).toBeTruthy();
      });
    });

    it('should set passage as start from context menu', async () => {
      const passage = new Passage({
        title: 'Make Start',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      const button = getByText('Make Start').closest('button') as HTMLButtonElement;
      await fireEvent.contextMenu(button);

      await waitFor(() => {
        expect(getByText('Set as Start')).toBeTruthy();
      });

      await fireEvent.click(getByText('Set as Start'));

      await waitFor(() => {
        expect(get(currentStory)?.startPassage).toBe(passage.id);
      });
    });

    it('should duplicate passage from context menu', async () => {
      const passage = new Passage({
        title: 'Duplicate Me',
        content: 'Original content',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      const initialSize = get(currentStory)?.passages.size || 0;

      const button = getByText('Duplicate Me').closest('button') as HTMLButtonElement;
      await fireEvent.contextMenu(button);

      await fireEvent.click(getByText('Duplicate'));

      await waitFor(() => {
        const currentStoryValue = get(currentStory);
        // Should have one more passage than before
        expect(currentStoryValue?.passages.size).toBe(initialSize + 1);

        const passages = Array.from(currentStoryValue?.passages.values() || []);
        // Find the duplicated passage (should have " (copy)" or similar in the title)
        const duplicate = passages.find(p => p.id !== passage.id && p.title.includes('Duplicate Me') && p.id !== passage.id);
        expect(duplicate).toBeTruthy();
        expect(duplicate?.title).toContain('Duplicate Me');
        expect(duplicate?.content).toBe('Original content');
      });
    });

    it('should delete passage from context menu', async () => {
      const passage = new Passage({
        title: 'Delete Me',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      const button = getByText('Delete Me').closest('button') as HTMLButtonElement;
      await fireEvent.contextMenu(button);

      await fireEvent.click(getByText('Delete'));

      expect(onDeletePassage).toHaveBeenCalledWith(passage.id);
    });
  });

  describe('bulk operations', () => {
    it('should show bulk actions toolbar when passages are selected', async () => {
      const passage = new Passage({
        title: 'Select Me',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      const button = getByText('Select Me').closest('button') as HTMLButtonElement;

      // Ctrl+Click to multi-select
      await fireEvent.click(button, { ctrlKey: true });

      await waitFor(() => {
        expect(getByText(/1 passage selected/)).toBeTruthy();
        expect(getByText('+ Add Tag')).toBeTruthy();
        expect(getByText('Delete')).toBeTruthy();
        expect(getByText('Clear')).toBeTruthy();
      });
    });

    it('should select multiple passages with Ctrl+Click', async () => {
      const p1 = new Passage({ title: 'P1', content: '', position: { x: 0, y: 0 } });
      const p2 = new Passage({ title: 'P2', content: '', position: { x: 0, y: 0 } });
      story.addPassage(p1);
      story.addPassage(p2);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      await fireEvent.click(getByText('P1').closest('button')!, { ctrlKey: true });
      await fireEvent.click(getByText('P2').closest('button')!, { ctrlKey: true });

      await waitFor(() => {
        expect(getByText(/2 passages selected/)).toBeTruthy();
      });
    });

    it('should bulk delete selected passages', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const p1 = new Passage({ title: 'P1', content: '', position: { x: 0, y: 0 } });
      const p2 = new Passage({ title: 'P2', content: '', position: { x: 0, y: 0 } });
      story.addPassage(p1);
      story.addPassage(p2);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      await fireEvent.click(getByText('P1').closest('button')!, { ctrlKey: true });
      await fireEvent.click(getByText('P2').closest('button')!, { ctrlKey: true });

      await waitFor(() => {
        expect(getByText(/2 passages selected/)).toBeTruthy();
      });

      const deleteButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent === 'Delete' && btn.className.includes('bg-red-500')
      ) as HTMLButtonElement;

      await fireEvent.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Delete 2 selected passages?');
      expect(onDeletePassage).toHaveBeenCalledWith(p1.id);
      expect(onDeletePassage).toHaveBeenCalledWith(p2.id);

      confirmSpy.mockRestore();
    });

    it('should bulk add tag to selected passages', async () => {
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('test-tag');

      const p1 = new Passage({ title: 'P1', content: '', position: { x: 0, y: 0 } });
      const p2 = new Passage({ title: 'P2', content: '', position: { x: 0, y: 0 } });
      story.addPassage(p1);
      story.addPassage(p2);
      currentStory.set(story);

      const { getByText } = render(PassageList, { onAddPassage, onDeletePassage });

      await fireEvent.click(getByText('P1').closest('button')!, { ctrlKey: true });
      await fireEvent.click(getByText('P2').closest('button')!, { ctrlKey: true });

      await fireEvent.click(getByText('+ Add Tag'));

      expect(promptSpy).toHaveBeenCalled();

      await waitFor(() => {
        const story = get(currentStory);
        const passage1 = story?.getPassage(p1.id);
        const passage2 = story?.getPassage(p2.id);
        expect(passage1?.tags).toContain('test-tag');
        expect(passage2?.tags).toContain('test-tag');
      });

      promptSpy.mockRestore();
    });

    it('should clear selection', async () => {
      const passage = new Passage({
        title: 'Select Me',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText, queryByText } = render(PassageList, { onAddPassage, onDeletePassage });

      await fireEvent.click(getByText('Select Me').closest('button')!, { ctrlKey: true });

      await waitFor(() => {
        expect(getByText(/1 passage selected/)).toBeTruthy();
      });

      await fireEvent.click(getByText('Clear'));

      await waitFor(() => {
        expect(queryByText(/passage selected/)).toBeNull();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty content gracefully', () => {
      const passage = new Passage({
        title: 'Empty',
        content: '',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(container.textContent).toContain('Empty');
    });

    it('should handle passages with no tags', () => {
      const passage = new Passage({
        title: 'No Tags',
        content: '',
        position: { x: 0, y: 0 },
        tags: [],
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      // Should render without crashing
      expect(container).toBeTruthy();
    });

    it('should handle zero word count', () => {
      const passage = new Passage({
        title: 'No Words',
        content: '   ',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { container } = render(PassageList, { onAddPassage, onDeletePassage });

      expect(container.textContent).toMatch(/0w/);
    });
  });
});
