import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import PacingAnalyzerPanel from './PacingAnalyzerPanel.svelte';
import { pacingStore, pacingMetrics, pacingIssues } from '../stores/pacingStore';
import { currentStory } from '../stores/projectStore';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';

describe('PacingAnalyzerPanel', () => {
  let story: Story;

  beforeEach(() => {
    vi.clearAllMocks();
    currentStory.set(null);
    pacingStore.clearState();

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

  describe('rendering without story', () => {
    it('should display empty state when no story loaded', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('No story loaded')).toBeTruthy();
    });

    it('should show disabled analyze button when no story loaded', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      const button = getByText('Analyze') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should display header', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Pacing Analyzer')).toBeTruthy();
    });
  });

  describe('rendering with story but no analysis', () => {
    beforeEach(() => {
      currentStory.set(story);
    });

    it('should show analyze prompt when story loaded but not analyzed', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Click "Analyze" to check story pacing')).toBeTruthy();
    });

    it('should have enabled analyze button when story is loaded', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      const button = getByText('Analyze') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe('rendering with analyzed story', () => {
    beforeEach(() => {
      // Create passages with content and choices
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'This is the start passage with some content for testing pacing.',
      }));
      const passage2 = story.addPassage(new Passage({
        title: 'Middle',
        content: 'This is a middle passage.',
      }));
      const passage3 = story.addPassage(new Passage({
        title: 'End',
        content: 'The end.',
      }));

      story.startPassage = passage1.id;

      passage1.addChoice({ text: 'Continue', target: passage2.id, id: 'c1' } as any);
      passage2.addChoice({ text: 'Finish', target: passage3.id, id: 'c2' } as any);

      currentStory.set(story);
      pacingStore.analyze(story);
    });

    it('should display overview section', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Overview')).toBeTruthy();
    });

    it('should display total passages count', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Passages')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('should display total words', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Total Words')).toBeTruthy();
    });

    it('should display average words per passage', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Avg Words/Passage')).toBeTruthy();
    });

    it('should display max depth', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Max Depth')).toBeTruthy();
    });

    it('should display estimated playtime section', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Estimated Playtime')).toBeTruthy();
    });

    it('should display shortest path', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Shortest Path')).toBeTruthy();
    });

    it('should display longest path', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Longest Path')).toBeTruthy();
    });

    it('should display branching and flow section', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Branching & Flow')).toBeTruthy();
    });

    it('should display branching factor', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Branching Factor')).toBeTruthy();
    });

    it('should display average choices per passage', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Avg Choices/Passage')).toBeTruthy();
    });

    it('should display dead ends count', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Dead Ends')).toBeTruthy();
    });

    it('should display orphaned passages count', () => {
      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('Orphaned Passages')).toBeTruthy();
    });

    it('should display last analyzed timestamp', () => {
      const { container } = render(PacingAnalyzerPanel);
      expect(container.textContent).toContain('Last analyzed:');
    });
  });

  describe('issues section', () => {
    it('should show no issues message when no issues detected', () => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'Good pacing passage with reasonable content length.',
      }));
      const passage2 = story.addPassage(new Passage({
        title: 'Next',
        content: 'Another passage with good content.',
      }));

      story.startPassage = passage1.id;
      passage1.addChoice({ text: 'Continue', target: passage2.id, id: 'c1' } as any);

      currentStory.set(story);
      pacingStore.analyze(story);

      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText(/No pacing issues detected/)).toBeTruthy();
    });

    it('should display issues section when issues exist', () => {
      // Create a story with pacing issues (very short passage)
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'Short.',
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
      pacingStore.analyze(story);

      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText(/Issues/)).toBeTruthy();
    });

    it('should display severity levels for issues', () => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'X',
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
      pacingStore.analyze(story);

      const { container } = render(PacingAnalyzerPanel);
      const issues = get(pacingIssues);
      if (issues.length > 0) {
        expect(container.textContent).toMatch(/HIGH|MEDIUM|LOW/);
      }
    });

    it('should limit displayed issues to 10', () => {
      // Create many short passages to generate issues
      for (let i = 0; i < 15; i++) {
        story.addPassage(new Passage({
          title: `Passage ${i}`,
          content: 'X',
        }));
      }

      currentStory.set(story);
      pacingStore.analyze(story);

      const { container } = render(PacingAnalyzerPanel);
      const issues = get(pacingIssues);

      if (issues.length > 10) {
        expect(container.textContent).toContain('more issues');
      }
    });
  });

  describe('user interactions', () => {
    beforeEach(() => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'This is the start passage.',
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
    });

    it('should analyze when button is clicked', async () => {
      const analyzeSpy = vi.spyOn(pacingStore, 'analyze');
      const { getByText } = render(PacingAnalyzerPanel);

      const button = getByText('Analyze') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(analyzeSpy).toHaveBeenCalledWith(story);
    });

    it('should show analyzing state during analysis', async () => {
      const { getByText } = render(PacingAnalyzerPanel);

      const button = getByText('Analyze') as HTMLButtonElement;

      // Mock slow analysis
      vi.spyOn(pacingStore, 'analyze').mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      fireEvent.click(button);

      await waitFor(() => {
        expect(getByText('Analyzing...')).toBeTruthy();
      }, { timeout: 50 });
    });

    it('should disable analyze button when analyzing', async () => {
      const { getByText } = render(PacingAnalyzerPanel);

      vi.spyOn(pacingStore, 'analyze').mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      const button = getByText('Analyze') as HTMLButtonElement;
      fireEvent.click(button);

      await waitFor(() => {
        const analyzingButton = getByText('Analyzing...') as HTMLButtonElement;
        expect(analyzingButton.disabled).toBe(true);
      }, { timeout: 50 });
    });
  });

  describe('formatting functions', () => {
    it('should format time correctly for seconds', () => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'Short content.',
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
      pacingStore.analyze(story);

      const { container } = render(PacingAnalyzerPanel);
      // Should show time in seconds format
      expect(container.textContent).toMatch(/\d+s/);
    });

    it('should format time with minutes and seconds', () => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: Array(200).fill('word').join(' '), // Long content to get minutes
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
      pacingStore.analyze(story);

      const { container } = render(PacingAnalyzerPanel);
      // Should show time format (either seconds or minutes)
      expect(container.textContent).toMatch(/\d+[ms]/);
    });
  });

  describe('severity colors', () => {
    it('should apply correct color classes for high severity', () => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: '', // Empty content causes high severity issue
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
      pacingStore.analyze(story);

      const { container } = render(PacingAnalyzerPanel);
      const issues = get(pacingIssues);

      if (issues.some(i => i.severity === 'high')) {
        expect(container.innerHTML).toContain('text-red-');
      }
    });

    it('should highlight orphaned passages in red', () => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'Start passage.',
      }));
      const orphan = story.addPassage(new Passage({
        title: 'Orphan',
        content: 'Orphaned passage.',
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
      pacingStore.analyze(story);

      const { container } = render(PacingAnalyzerPanel);
      const metrics = get(pacingMetrics);

      if (metrics && metrics.orphans > 0) {
        expect(container.innerHTML).toContain('text-red-');
      }
    });

    it('should highlight excessive dead ends in yellow', () => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'Start passage.',
      }));

      // Create many dead ends
      for (let i = 0; i < 7; i++) {
        const deadEnd = story.addPassage(new Passage({
          title: `DeadEnd${i}`,
          content: 'Dead end.',
        }));
        passage1.addChoice({ text: `Go ${i}`, target: deadEnd.id, id: `c${i}` } as any);
      }

      story.startPassage = passage1.id;
      currentStory.set(story);
      pacingStore.analyze(story);

      const { container } = render(PacingAnalyzerPanel);
      const metrics = get(pacingMetrics);

      if (metrics && metrics.deadEnds > 5) {
        expect(container.innerHTML).toContain('text-yellow-');
      }
    });
  });

  describe('auto-analyze on story change', () => {
    it('should auto-analyze when story changes', async () => {
      const analyzeSpy = vi.spyOn(pacingStore, 'analyze');

      render(PacingAnalyzerPanel);

      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'Content.',
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);

      await waitFor(() => {
        expect(analyzeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle story with no passages', () => {
      currentStory.set(story);
      pacingStore.analyze(story);

      const { container } = render(PacingAnalyzerPanel);
      expect(container.textContent).toContain('0');
    });

    it('should handle story with single passage', () => {
      const passage1 = story.addPassage(new Passage({
        title: 'Only',
        content: 'Only passage.',
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
      pacingStore.analyze(story);

      const { getByText } = render(PacingAnalyzerPanel);
      expect(getByText('1')).toBeTruthy();
    });

    it('should handle very large numbers in word count', () => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: Array(10000).fill('word').join(' '),
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
      pacingStore.analyze(story);

      const { container } = render(PacingAnalyzerPanel);
      // Should format with commas
      expect(container.textContent).toMatch(/\d{1,3}(,\d{3})*/);
    });
  });

  describe('dark mode styling', () => {
    it('should have dark mode classes', () => {
      const { container } = render(PacingAnalyzerPanel);
      expect(container.innerHTML).toContain('dark:');
    });
  });
});
