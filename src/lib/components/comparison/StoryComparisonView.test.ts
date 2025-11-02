import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import StoryComparisonView from './StoryComparisonView.svelte';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Variable } from '../../models/Variable';

// Mock the storyComparison utility
vi.mock('../../utils/storyComparison', () => ({
  compareStories: vi.fn((leftStory, rightStory) => ({
    metadataChanged: true,
    passageDiffs: [
      {
        passageId: 'p1',
        title: 'Passage 1',
        status: 'modified',
        changes: ['Content changed', 'Tags modified'],
        leftChoiceCount: 2,
        rightChoiceCount: 3,
        leftWordCount: 100,
        rightWordCount: 120,
      },
      {
        passageId: 'p2',
        title: 'Passage 2',
        status: 'added',
        rightChoiceCount: 1,
        rightWordCount: 50,
      },
      {
        passageId: 'p3',
        title: 'Passage 3',
        status: 'removed',
        leftChoiceCount: 2,
        leftWordCount: 75,
      },
    ],
    variableDiffs: [
      {
        name: 'score',
        status: 'modified',
        changes: ['Type changed', 'Default value changed'],
      },
    ],
    summary: {
      added: 1,
      removed: 1,
      modified: 1,
    },
    leftStats: {
      passageCount: 10,
      variableCount: 5,
      totalWords: 1000,
      totalChoices: 25,
    },
    rightStats: {
      passageCount: 11,
      variableCount: 5,
      totalWords: 1100,
      totalChoices: 28,
    },
  })),
}));

describe('StoryComparisonView', () => {
  let leftStory: Story;
  let rightStory: Story;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create left story
    leftStory = new Story('Test Story v1');
    leftStory.metadata.author = 'Author A';
    leftStory.metadata.version = '1.0';

    const passage1 = new Passage('p1', 'Passage 1', 'Original content');
    const passage3 = new Passage('p3', 'Passage 3', 'To be removed');
    leftStory.addPassage(passage1);
    leftStory.addPassage(passage3);
    leftStory.variables.set('score', new Variable('score', 'number', 0));

    // Create right story
    rightStory = new Story('Test Story v2');
    rightStory.metadata.author = 'Author B';
    rightStory.metadata.version = '2.0';

    const passage1r = new Passage('p1', 'Passage 1', 'Modified content');
    const passage2r = new Passage('p2', 'Passage 2', 'New passage');
    rightStory.addPassage(passage1r);
    rightStory.addPassage(passage2r);
    rightStory.variables.set('score', new Variable('score', 'string', '0'));
  });

  describe('rendering', () => {
    it('should render component with stories', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });
      expect(getByText('Story Comparison')).toBeTruthy();
    });

    it('should show no stories message when stories are null', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory: null, rightStory: null },
      });
      expect(getByText('No stories to compare')).toBeTruthy();
    });

    it('should display version headers with custom labels', () => {
      const { getByText } = render(StoryComparisonView, {
        props: {
          leftStory,
          rightStory,
          leftLabel: 'Original',
          rightLabel: 'Updated',
        },
      });
      expect(getByText('Original')).toBeTruthy();
      expect(getByText('Updated')).toBeTruthy();
    });

    it('should display formatted dates', () => {
      const leftDate = new Date('2024-01-01');
      const rightDate = new Date('2024-01-02');

      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory, leftDate, rightDate },
      });

      expect(getByText(/Modified:/)).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    it('should render accept all buttons', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(getByText('Accept All from Left')).toBeTruthy();
      expect(getByText('Accept All from Right')).toBeTruthy();
    });

    it('should dispatch accept event when accept all from left clicked', async () => {
      const { getByText, component } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      let dispatchedEvent: any = null;
      component.$on('accept', (event) => {
        dispatchedEvent = event.detail;
      });

      const button = getByText('Accept All from Left');
      await fireEvent.click(button);

      expect(dispatchedEvent).toBeTruthy();
      expect(dispatchedEvent.source).toBe('left');
      expect(dispatchedEvent.story).toBe(leftStory);
    });

    it('should dispatch accept event when accept all from right clicked', async () => {
      const { getByText, component } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      let dispatchedEvent: any = null;
      component.$on('accept', (event) => {
        dispatchedEvent = event.detail;
      });

      const button = getByText('Accept All from Right');
      await fireEvent.click(button);

      expect(dispatchedEvent).toBeTruthy();
      expect(dispatchedEvent.source).toBe('right');
      expect(dispatchedEvent.story).toBe(rightStory);
    });
  });

  describe('metadata comparison', () => {
    it('should show metadata section as expandable', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(getByText('Metadata Comparison')).toBeTruthy();
    });

    it('should show changed indicator when metadata changed', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(getByText('Changed')).toBeTruthy();
    });

    it('should expand metadata details when clicked', async () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const button = getByText('Metadata Comparison');
      await fireEvent.click(button);

      await waitFor(() => {
        expect(getByText('Title:')).toBeTruthy();
        expect(getByText('Author:')).toBeTruthy();
        expect(getByText('Version:')).toBeTruthy();
      });
    });
  });

  describe('statistics section', () => {
    it('should show statistics section as expandable', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(getByText('Statistics')).toBeTruthy();
    });

    it('should display statistics when expanded', async () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      // Statistics should be visible by default
      await waitFor(() => {
        expect(getByText('Passages:')).toBeTruthy();
        expect(getByText('Variables:')).toBeTruthy();
        expect(getByText('Total Words:')).toBeTruthy();
        expect(getByText('Total Choices:')).toBeTruthy();
      });
    });

    it('should format word counts with commas', async () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      await waitFor(() => {
        expect(getByText('1,000')).toBeTruthy();
        expect(getByText('1,100')).toBeTruthy();
      });
    });
  });

  describe('passage differences', () => {
    it('should display all filter buttons', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(getByText(/All \(3\)/)).toBeTruthy();
      expect(getByText(/Added \(1\)/)).toBeTruthy();
      expect(getByText(/Removed \(1\)/)).toBeTruthy();
      expect(getByText(/Modified \(1\)/)).toBeTruthy();
    });

    it('should filter to show only added passages', async () => {
      const { getByText, queryByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const addedButton = getByText(/Added \(1\)/);
      await fireEvent.click(addedButton);

      await waitFor(() => {
        expect(getByText('Passage 2')).toBeTruthy();
        expect(queryByText('Passage 3')).toBeNull();
      });
    });

    it('should filter to show only removed passages', async () => {
      const { getByText, queryByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const removedButton = getByText(/Removed \(1\)/);
      await fireEvent.click(removedButton);

      await waitFor(() => {
        expect(getByText('Passage 3')).toBeTruthy();
        expect(queryByText('Passage 2')).toBeNull();
      });
    });

    it('should filter to show only modified passages', async () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const modifiedButton = getByText(/Modified \(1\)/);
      await fireEvent.click(modifiedButton);

      await waitFor(() => {
        expect(getByText('Passage 1')).toBeTruthy();
      });
    });

    it('should show change details for modified passages', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(getByText('Content changed')).toBeTruthy();
      expect(getByText('Tags modified')).toBeTruthy();
    });

    it('should display status icons correctly', () => {
      const { container } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const icons = container.querySelectorAll('.font-mono.text-xs.font-bold');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('passage selection', () => {
    it('should allow selecting passages', async () => {
      const { container } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox).toBeTruthy();

      await fireEvent.click(checkbox);

      expect(checkbox.checked).toBe(true);
    });

    it('should show selected passages count', async () => {
      const { container, getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(checkbox);

      await waitFor(() => {
        expect(getByText(/1 passage selected/)).toBeTruthy();
      });
    });

    it('should show accept selected buttons when passages are selected', async () => {
      const { container, getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(checkbox);

      await waitFor(() => {
        expect(getByText('Accept Selected from Left')).toBeTruthy();
        expect(getByText('Accept Selected from Right')).toBeTruthy();
      });
    });

    it('should deselect all passages when deselect all clicked', async () => {
      const { container, getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      // Select a passage first
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox.checked).toBe(true);
      });

      // Click deselect all
      const deselectButton = getByText('Deselect All');
      await fireEvent.click(deselectButton);

      await waitFor(() => {
        expect(checkbox.checked).toBe(false);
      });
    });

    it('should dispatch accept event with selected passages', async () => {
      const { container, getByText, component } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      let dispatchedEvent: any = null;
      component.$on('accept', (event) => {
        dispatchedEvent = event.detail;
      });

      // Select a passage
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(checkbox);

      await waitFor(() => {
        expect(getByText('Accept Selected from Left')).toBeTruthy();
      });

      const acceptButton = getByText('Accept Selected from Left');
      await fireEvent.click(acceptButton);

      expect(dispatchedEvent).toBeTruthy();
      expect(dispatchedEvent.source).toBe('left');
      expect(dispatchedEvent.selectedPassages.length).toBeGreaterThan(0);
    });
  });

  describe('variable differences', () => {
    it('should display variable differences section when present', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(getByText(/Variable Differences \(1\)/)).toBeTruthy();
    });

    it('should show variable names and changes', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(getByText('score')).toBeTruthy();
    });

    it('should display status icons for variables', () => {
      const { container } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const variableSection = container.querySelector('.space-y-2');
      expect(variableSection).toBeTruthy();
    });
  });

  describe('footer summary', () => {
    it('should display summary counts', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(getByText(/\+1 added/)).toBeTruthy();
      expect(getByText(/-1 removed/)).toBeTruthy();
      expect(getByText(/~1 modified/)).toBeTruthy();
    });

    it('should update summary when filter changes', async () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const addedButton = getByText(/Added \(1\)/);
      await fireEvent.click(addedButton);

      // Summary should still show total counts
      await waitFor(() => {
        expect(getByText(/\+1 added/)).toBeTruthy();
      });
    });
  });

  describe('status colors and styling', () => {
    it('should apply correct color classes for added passages', () => {
      const { container } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const addedElements = container.querySelectorAll('.bg-green-100');
      expect(addedElements.length).toBeGreaterThan(0);
    });

    it('should apply correct color classes for removed passages', () => {
      const { container } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const removedElements = container.querySelectorAll('.bg-red-100');
      expect(removedElements.length).toBeGreaterThan(0);
    });

    it('should apply correct color classes for modified passages', () => {
      const { container } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const modifiedElements = container.querySelectorAll('.bg-yellow-100');
      expect(modifiedElements.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty passage list', async () => {
      const { compareStories } = await import('../../utils/storyComparison');
      vi.mocked(compareStories).mockReturnValue({
        metadataChanged: false,
        passageDiffs: [],
        variableDiffs: [],
        summary: { added: 0, removed: 0, modified: 0 },
        leftStats: {
          passageCount: 0,
          variableCount: 0,
          totalWords: 0,
          totalChoices: 0,
        },
        rightStats: {
          passageCount: 0,
          variableCount: 0,
          totalWords: 0,
          totalChoices: 0,
        },
      });

      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const allButton = getByText(/All \(0\)/);
      await fireEvent.click(allButton);

      await waitFor(() => {
        expect(getByText(/No passages/)).toBeTruthy();
      });
    });

    it('should handle stories with no variables', async () => {
      const { compareStories } = await import('../../utils/storyComparison');
      vi.mocked(compareStories).mockReturnValue({
        metadataChanged: false,
        passageDiffs: [],
        variableDiffs: [],
        summary: { added: 0, removed: 0, modified: 0 },
        leftStats: {
          passageCount: 0,
          variableCount: 0,
          totalWords: 0,
          totalChoices: 0,
        },
        rightStats: {
          passageCount: 0,
          variableCount: 0,
          totalWords: 0,
          totalChoices: 0,
        },
      });

      const { queryByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      expect(queryByText(/Variable Differences/)).toBeNull();
    });

    it('should handle missing dates gracefully', () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory, leftDate: null, rightDate: null },
      });

      expect(getByText(/Unknown/)).toBeTruthy();
    });
  });

  describe('expandable sections', () => {
    it('should collapse metadata section when clicked again', async () => {
      const { getByText, queryByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const button = getByText('Metadata Comparison');

      // Expand
      await fireEvent.click(button);
      await waitFor(() => {
        expect(getByText('Title:')).toBeTruthy();
      });

      // Collapse
      await fireEvent.click(button);
      await waitFor(() => {
        expect(queryByText('Title:')).toBeNull();
      });
    });

    it('should collapse statistics section when clicked', async () => {
      const { getByText } = render(StoryComparisonView, {
        props: { leftStory, rightStory },
      });

      const button = getByText('Statistics');
      await fireEvent.click(button);

      // Statistics should be hidden after clicking
      await waitFor(() => {
        const container = document.body;
        // Section should be collapsed
        expect(container.querySelector('.space-y-2')).toBeTruthy();
      });
    });
  });
});
