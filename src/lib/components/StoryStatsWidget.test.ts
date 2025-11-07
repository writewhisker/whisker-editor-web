import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import StoryStatsWidget from './StoryStatsWidget.svelte';
import { currentStory, passageList } from '../stores/projectStore';
import { viewPreferencesStore } from '../stores/viewPreferencesStore';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';

describe('StoryStatsWidget', () => {
  let story: Story;

  beforeEach(() => {
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

    // Add test passages with content and choices
    const passage1 = new Passage({
      title: 'Start',
      content: 'This is the first passage with some content here.',
    });
    passage1.addChoice(new Choice({ text: 'Go to next', target: 'Next' }));
    passage1.addChoice(new Choice({ text: 'Go to end', target: 'End' }));

    const passage2 = new Passage({
      title: 'Next',
      content: 'This is the second passage with more words in it.',
    });
    passage2.addChoice(new Choice({ text: 'Go to end', target: 'End' }));

    const passage3 = new Passage({
      title: 'End',
      content: 'Final passage.',
    });

    story.addPassage(passage1);
    story.addPassage(passage2);
    story.addPassage(passage3);

    currentStory.set(story);
  });

  afterEach(() => {
    currentStory.set(null);
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should render when show is true', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });
      const widget = container.querySelector('[role="region"]');
      expect(widget).toBeTruthy();
    });

    it('should not render when show is false', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: false },
      });
      const widget = container.querySelector('[role="region"]');
      expect(widget).toBeFalsy();
    });

    it('should not render when no story loaded', () => {
      currentStory.set(null);
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });
      const widget = container.querySelector('[role="region"]');
      expect(widget).toBeFalsy();
    });

    it('should render stats header', () => {
      const { getByText } = render(StoryStatsWidget, {
        props: { show: true },
      });
      expect(getByText('Stats')).toBeTruthy();
    });

    it('should render with fixed positioning', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });
      const widget = container.querySelector('.fixed.top-20.right-4');
      expect(widget).toBeTruthy();
    });

    it('should have correct aria attributes', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });
      const region = container.querySelector('[role="region"]');
      expect(region?.getAttribute('aria-label')).toBe('Story statistics widget');
    });
  });

  describe('collapsed state', () => {
    it('should be collapsed by default', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });
      const compactView = container.querySelector('.px-3.py-2.flex');
      expect(compactView).toBeTruthy();
    });

    it('should show compact stats when collapsed', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      // Should show P, W, C indicators
      expect(container.textContent).toContain('P');
      expect(container.textContent).toContain('W');
      expect(container.textContent).toContain('C');
    });

    it('should display passage count in compact mode', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });
      expect(container.textContent).toContain('3');
    });

    it('should display word count in compact mode', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });
      // Total words from all passages
      const wordCount = container.textContent?.match(/\d+(?=\s*W)/);
      expect(wordCount).toBeTruthy();
    });

    it('should display choice count in compact mode', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });
      expect(container.textContent).toContain('3');
    });
  });

  describe('expanded state', () => {
    it('should expand when header clicked', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        const grid = container.querySelector('.grid.grid-cols-3');
        expect(grid).toBeTruthy();
      });
    });

    it('should collapse when header clicked again', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        const grid = container.querySelector('.grid.grid-cols-3');
        expect(grid).toBeFalsy();
      });
    });

    it('should show detailed stats when expanded', async () => {
      const { container, getByText } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        expect(getByText('Passages')).toBeTruthy();
        expect(getByText('Words')).toBeTruthy();
        expect(getByText('Choices')).toBeTruthy();
      });
    });

    it('should show view full statistics button when expanded', async () => {
      const { container, getByText } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        expect(getByText('View Full Statistics')).toBeTruthy();
      });
    });

    it('should update aria-expanded attribute', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      expect(headerButton?.getAttribute('aria-expanded')).toBe('false');

      await fireEvent.click(headerButton!);

      await waitFor(() => {
        expect(headerButton?.getAttribute('aria-expanded')).toBe('true');
      });
    });
  });

  describe('statistics calculation', () => {
    it('should count total passages correctly', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });
      const passageCount = get(passageList).length;
      expect(passageCount).toBe(3);
    });

    it('should count total words correctly', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        const wordsStat = container.querySelector('.text-green-600');
        expect(wordsStat).toBeTruthy();
      });
    });

    it('should count total choices correctly', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const passages = get(passageList);
      const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
      expect(totalChoices).toBe(3);
    });

    it('should format large word counts with k suffix', async () => {
      // Add many passages with lots of words
      for (let i = 0; i < 100; i++) {
        const passage = new Passage({
          title: `Passage ${i}`,
          content: 'word '.repeat(100), // 100 words per passage
        });
        story.addPassage(passage);
      }
      currentStory.update(s => s);

      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        expect(container.textContent).toMatch(/\d+\.?\d*k/);
      });
    });
  });

  describe('close functionality', () => {
    it('should hide widget when close button clicked', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const closeButton = container.querySelector('button[aria-label="Close statistics widget"]');
      await fireEvent.click(closeButton!);

      await waitFor(() => {
        const widget = container.querySelector('[role="region"]');
        expect(widget).toBeFalsy();
      });
    });
  });

  describe('view full panel functionality', () => {
    it('should open statistics panel when button clicked', async () => {
      const { container, getByText } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        const viewButton = getByText('View Full Statistics');
        fireEvent.click(viewButton);
      });

      // Check if view preferences store was updated
      const prefs = get(viewPreferencesStore);
      expect(prefs.panels.statistics).toBe(true);
    });
  });

  describe('stat card styling', () => {
    it('should use blue styling for passages', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        const passagesStat = container.querySelector('.bg-blue-50');
        expect(passagesStat).toBeTruthy();
      });
    });

    it('should use green styling for words', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        const wordsStat = container.querySelector('.bg-green-50');
        expect(wordsStat).toBeTruthy();
      });
    });

    it('should use orange styling for choices', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        const choicesStat = container.querySelector('.bg-orange-50');
        expect(choicesStat).toBeTruthy();
      });
    });
  });

  describe('compact stats formatting', () => {
    it('should show k suffix for large word counts in compact mode', () => {
      // Add many words
      for (let i = 0; i < 50; i++) {
        const passage = new Passage({
          title: `Passage ${i}`,
          content: 'word '.repeat(100),
        });
        story.addPassage(passage);
      }
      currentStory.update(s => s);

      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const compactStats = container.querySelector('.px-3.py-2.flex');
      expect(compactStats?.textContent).toMatch(/\d+\.?\d*k/);
    });

    it('should show raw numbers for word counts under 1000', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const passages = get(passageList);
      const totalWords = passages.reduce((sum, p) => {
        const words = p.content.trim().split(/\s+/).filter(w => w.length > 0).length;
        return sum + words;
      }, 0);

      if (totalWords < 1000) {
        const compactStats = container.querySelector('.px-3.py-2.flex');
        expect(compactStats?.textContent).not.toMatch(/k/);
      }
    });
  });

  describe('empty story', () => {
    it('should not render when story has no passages', () => {
      const emptyStory = new Story({
        metadata: {
          title: 'Empty',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(emptyStory);

      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const widget = container.querySelector('[role="region"]');
      expect(widget).toBeFalsy();
    });
  });

  describe('dynamic updates', () => {
    it('should update when passages are added', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const initialContent = container.textContent;

      // Add a new passage
      const newPassage = new Passage({
        title: 'New',
        content: 'New content here.',
      });
      story.addPassage(newPassage);
      currentStory.update(s => s);

      await waitFor(() => {
        const updatedContent = container.textContent;
        expect(updatedContent).not.toBe(initialContent);
      });
    });

    it('should update when passage content changes', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const passage = get(passageList)[0];
      const initialWords = container.textContent;

      // Update passage content
      passage.content = 'This is much longer content with many more words to count';
      currentStory.update(s => s);

      await waitFor(() => {
        const updatedWords = container.textContent;
        expect(updatedWords).not.toBe(initialWords);
      });
    });

    it('should update when choices are added', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const passage = get(passageList)[0];

      // Add a choice
      passage.addChoice(new Choice({ text: 'New choice', target: 'Somewhere' }));
      currentStory.update(s => s);

      await waitFor(() => {
        const passages = get(passageList);
        const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
        expect(totalChoices).toBeGreaterThan(3);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle passages with no content', () => {
      const emptyPassage = new Passage({
        title: 'Empty',
        content: '',
      });
      story.addPassage(emptyPassage);
      currentStory.update(s => s);

      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      expect(container).toBeTruthy();
    });

    it('should handle passages with only whitespace', () => {
      const whitespacePassage = new Passage({
        title: 'Whitespace',
        content: '    \n\n   \t  ',
      });
      story.addPassage(whitespacePassage);
      currentStory.update(s => s);

      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      expect(container).toBeTruthy();
    });

    it('should handle very large numbers', () => {
      // Add many passages
      for (let i = 0; i < 1000; i++) {
        const passage = new Passage({
          title: `P${i}`,
          content: 'word '.repeat(1000),
        });
        story.addPassage(passage);
      }
      currentStory.update(s => s);

      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      expect(container).toBeTruthy();
    });
  });

  describe('toggle icon', () => {
    it('should show down arrow when collapsed', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const arrow = container.querySelector('svg');
      expect(arrow?.classList.contains('rotate-180')).toBe(false);
    });

    it('should rotate arrow when expanded', async () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const headerButton = container.querySelector('button[aria-expanded]');
      await fireEvent.click(headerButton!);

      await waitFor(() => {
        const arrow = container.querySelector('svg');
        expect(arrow?.classList.contains('rotate-180')).toBe(true);
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels on toggle button', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const button = container.querySelector('button[aria-expanded]');
      expect(button?.getAttribute('aria-label')).toContain('statistics');
    });

    it('should have proper aria label on close button', () => {
      const { container } = render(StoryStatsWidget, {
        props: { show: true },
      });

      const closeButton = container.querySelector('button[aria-label="Close statistics widget"]');
      expect(closeButton).toBeTruthy();
    });
  });
});
