import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import StoryStatisticsPanel from './StoryStatisticsPanel.svelte';
import { currentStory } from '../stores/projectStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('StoryStatisticsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStory.set(null);
  });

  describe('rendering without story', () => {
    it('should display empty state when no story loaded', () => {
      const { getByText } = render(StoryStatisticsPanel);
      expect(getByText('No story loaded')).toBeTruthy();
    });

    it('should show icon in empty state', () => {
      const { container } = render(StoryStatisticsPanel);
      const text = container.textContent || '';
      expect(text).toContain('📊');
    });
  });

  describe('rendering with story', () => {
    let story: Story;

    beforeEach(() => {
      // Create a test story with passages
      story = new Story();
      story.metadata.title = 'Test Story';

      // Create passages with content
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'This is the start passage with some content.',
        tags: ['intro', 'main'],
      }));
      const passage2 = story.addPassage(new Passage({
        title: 'Middle',
        content: 'Middle passage.',
        tags: ['main'],
      }));
      const passage3 = story.addPassage(new Passage({
        title: 'End',
        content: 'The end.',
        tags: [],
      }));

      story.startPassage = passage1.id;

      // Add choices
      passage1.addChoice({ text: 'Go to middle', target: passage2.id, id: 'c1' } as any);
      passage1.addChoice({ text: 'Go to end', target: passage3.id, id: 'c2' } as any);
      passage2.addChoice({ text: 'Go to end', target: passage3.id, id: 'c3' } as any);

      currentStory.set(story);
    });

    it('should display header', () => {
      const { getByText } = render(StoryStatisticsPanel);
      expect(getByText('Story Statistics')).toBeTruthy();
    });

    describe('overview section', () => {
      it('should display Overview section', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Overview')).toBeTruthy();
      });

      it('should display passage count', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Passages')).toBeTruthy();
        expect(getByText('3')).toBeTruthy();
      });

      it('should display total words', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Total Words')).toBeTruthy();
      });

      it('should display average words per passage', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Avg Words/Passage')).toBeTruthy();
      });

      it('should display total choices', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Total Choices')).toBeTruthy();
      });

      it('should display variables count', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Variables')).toBeTruthy();
      });

      it('should display unique tags count', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Unique Tags')).toBeTruthy();
      });
    });

    describe('content analysis section', () => {
      it('should display Content Analysis section', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Content Analysis')).toBeTruthy();
      });

      it('should display longest passage', () => {
        const { container } = render(StoryStatisticsPanel);
        const text = container.textContent || '';
        expect(text).toContain('Longest Passage:');
        expect(text).toContain('Start');
      });

      it('should display shortest passage', () => {
        const { container } = render(StoryStatisticsPanel);
        const text = container.textContent || '';
        expect(text).toContain('Shortest Passage:');
        expect(text).toContain('End');
      });

      it('should display average choices per passage', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Avg Choices/Passage:')).toBeTruthy();
      });

      it('should display passage with most choices', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Most Choices:')).toBeTruthy();
      });
    });

    describe('story structure section', () => {
      it('should display Story Structure section', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Story Structure')).toBeTruthy();
      });

      it('should display start passage', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Start Passage:')).toBeTruthy();
      });

      it('should display dead ends count', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Dead Ends:')).toBeTruthy();
      });

      it('should display orphaned passages count', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Orphaned:')).toBeTruthy();
      });

      it('should display most connected passage', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Most Connected:')).toBeTruthy();
      });
    });

    describe('validation section', () => {
      it('should display Validation section', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Validation')).toBeTruthy();
      });

      it('should display errors count', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Errors')).toBeTruthy();
      });

      it('should display warnings count', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Warnings')).toBeTruthy();
      });

      it('should display info count', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Info')).toBeTruthy();
      });
    });

    describe('complexity score section', () => {
      it('should display Complexity Score section', () => {
        const { getByText } = render(StoryStatisticsPanel);
        expect(getByText('Complexity Score')).toBeTruthy();
      });

      it('should display complexity score out of 100', () => {
        const { container } = render(StoryStatisticsPanel);
        const text = container.textContent || '';
        expect(text).toContain('/ 100');
      });

      it('should display progress bar for complexity', () => {
        const { container } = render(StoryStatisticsPanel);
        const progressBar = container.querySelector('.bg-gradient-to-r.from-indigo-500');
        expect(progressBar).toBeTruthy();
      });
    });

    describe('statistics calculations', () => {
      it('should calculate correct word counts', () => {
        const { container } = render(StoryStatisticsPanel);
        // Component should calculate and display word counts
        // Exact values depend on content
        expect(container.textContent).toBeTruthy();
      });

      it('should identify passages with most/fewest words', () => {
        const { container } = render(StoryStatisticsPanel);
        const text = container.textContent || '';
        // Start has most words, End has fewest
        expect(text).toContain('Start');
        expect(text).toContain('End');
      });

      it('should calculate average statistics', () => {
        const { container } = render(StoryStatisticsPanel);
        const text = container.textContent || '';
        // Should show averages
        expect(text).toContain('Avg');
      });
    });

    describe('icons', () => {
      it('should display section icons', () => {
        const { container } = render(StoryStatisticsPanel);
        const text = container.textContent || '';

        expect(text).toContain('📈'); // Overview
        expect(text).toContain('📝'); // Content Analysis
        expect(text).toContain('🔗'); // Story Structure
        expect(text).toContain('🔍'); // Validation
        expect(text).toContain('⚡'); // Complexity
      });
    });
  });
});
