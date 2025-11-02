import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import StoryMetricsDashboard from './StoryMetricsDashboard.svelte';
import { currentStory } from '../../stores/projectStore';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';

describe('StoryMetricsDashboard', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
  });

  afterEach(() => {
    currentStory.set(null);
  });

  describe('rendering', () => {
    it('should render dashboard header', () => {
      currentStory.set(story);
      const { container } = render(StoryMetricsDashboard);

      const header = container.querySelector('.dashboard-header');
      expect(header).toBeTruthy();
      expect(header?.textContent).toContain('Story Metrics Dashboard');
    });

    it('should show empty state when no story loaded', () => {
      currentStory.set(null);
      const { container } = render(StoryMetricsDashboard);

      const emptyState = container.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('No story loaded');
    });

    it('should show hint text in empty state', () => {
      currentStory.set(null);
      const { container } = render(StoryMetricsDashboard);

      const hint = container.querySelector('.hint');
      expect(hint?.textContent).toContain('Open or create a story');
    });

    it('should render tabs when story is loaded', () => {
      currentStory.set(story);
      const { container } = render(StoryMetricsDashboard);

      const tabs = container.querySelector('.tabs');
      expect(tabs).toBeTruthy();

      const tabButtons = tabs?.querySelectorAll('button');
      expect(tabButtons?.length).toBe(4);
    });

    it('should render all tab labels', () => {
      currentStory.set(story);
      const { container } = render(StoryMetricsDashboard);

      const tabButtons = container.querySelectorAll('.tabs button');
      const tabTexts = Array.from(tabButtons).map(btn => btn.textContent);

      expect(tabTexts).toContain('Content');
      expect(tabTexts).toContain('Structure');
      expect(tabTexts).toContain('Tags');
      expect(tabTexts).toContain('Readability');
    });

    it('should have content tab active by default', () => {
      currentStory.set(story);
      const { container } = render(StoryMetricsDashboard);

      const activeTab = container.querySelector('.tabs button.active');
      expect(activeTab?.textContent).toBe('Content');
    });
  });

  describe('content metrics', () => {
    beforeEach(() => {
      // Add some passages to the story
      story.addPassage(new Passage({
        title: 'Start',
        content: 'This is the beginning of our adventure. It has twenty words in it to test the word count functionality here.',
        choices: []
      }));

      story.addPassage(new Passage({
        title: 'Middle',
        content: 'A short passage.',
        choices: [
          { text: 'Go left', target: 'End' },
          { text: 'Go right', target: 'End' }
        ]
      }));

      story.addPassage(new Passage({
        title: 'End',
        content: 'The end.',
        choices: []
      }));

      currentStory.set(story);
    });

    it('should display total passages count', () => {
      const { container } = render(StoryMetricsDashboard);

      const passagesCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Total Passages'));

      expect(passagesCard).toBeTruthy();
      expect(passagesCard?.querySelector('.metric-value')?.textContent).toBe('3');
    });

    it('should display total words count', () => {
      const { container } = render(StoryMetricsDashboard);

      const wordsCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Total Words'));

      expect(wordsCard).toBeTruthy();
      const value = wordsCard?.querySelector('.metric-value')?.textContent;
      expect(value).toBeTruthy();
    });

    it('should display total choices count', () => {
      const { container } = render(StoryMetricsDashboard);

      const choicesCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Total Choices'));

      expect(choicesCard).toBeTruthy();
      expect(choicesCard?.querySelector('.metric-value')?.textContent).toBe('2');
    });

    it('should display average words per passage', () => {
      const { container } = render(StoryMetricsDashboard);

      const avgWordsCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Avg Words/Passage'));

      expect(avgWordsCard).toBeTruthy();
      const value = avgWordsCard?.querySelector('.metric-value')?.textContent;
      expect(value).toBeTruthy();
    });

    it('should display average choices per passage', () => {
      const { container } = render(StoryMetricsDashboard);

      const avgChoicesCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Avg Choices/Passage'));

      expect(avgChoicesCard).toBeTruthy();
      const value = avgChoicesCard?.querySelector('.metric-value')?.textContent;
      expect(parseFloat(value || '0')).toBeGreaterThanOrEqual(0);
    });

    it('should show passage details section', () => {
      const { container } = render(StoryMetricsDashboard);

      const detailsSection = container.querySelector('.details-section');
      expect(detailsSection).toBeTruthy();
      expect(detailsSection?.textContent).toContain('Passage Details');
    });

    it('should display longest passage info', () => {
      const { container } = render(StoryMetricsDashboard);

      const detailsSection = container.querySelector('.details-section');
      expect(detailsSection?.textContent).toContain('Longest Passage');
    });

    it('should display shortest passage info', () => {
      const { container } = render(StoryMetricsDashboard);

      const detailsSection = container.querySelector('.details-section');
      expect(detailsSection?.textContent).toContain('Shortest Passage');
    });
  });

  describe('structure metrics', () => {
    beforeEach(() => {
      story.addPassage(new Passage({
        title: 'Start',
        content: 'Beginning',
        choices: [{ text: 'Continue', target: 'End' }]
      }));

      story.addPassage(new Passage({
        title: 'End',
        content: 'The end.',
        choices: []
      }));

      story.startPassage = 'Start';
      currentStory.set(story);
    });

    it('should switch to structure tab', async () => {
      const { container } = render(StoryMetricsDashboard);

      const structureTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Structure');

      await fireEvent.click(structureTab!);

      const activeTab = container.querySelector('.tabs button.active');
      expect(activeTab?.textContent).toBe('Structure');
    });

    it('should show start passage status', async () => {
      const { container } = render(StoryMetricsDashboard);

      const structureTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Structure');
      await fireEvent.click(structureTab!);

      const startPassageCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Start Passage'));

      expect(startPassageCard).toBeTruthy();
      expect(startPassageCard?.textContent).toContain('Set');
    });

    it('should show warning when start passage not set', async () => {
      story.startPassage = undefined;
      currentStory.set(story);

      const { container } = render(StoryMetricsDashboard);

      const structureTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Structure');
      await fireEvent.click(structureTab!);

      const startPassageCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Start Passage'));

      expect(startPassageCard?.classList.contains('warning')).toBe(true);
    });

    it('should display dead ends count', async () => {
      const { container } = render(StoryMetricsDashboard);

      const structureTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Structure');
      await fireEvent.click(structureTab!);

      const deadEndsCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Dead Ends'));

      expect(deadEndsCard).toBeTruthy();
      expect(deadEndsCard?.querySelector('.metric-value')?.textContent).toBe('1');
    });

    it('should display branching points', async () => {
      const { container } = render(StoryMetricsDashboard);

      const structureTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Structure');
      await fireEvent.click(structureTab!);

      const branchingCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Branching Points'));

      expect(branchingCard).toBeTruthy();
    });

    it('should show info box with explanations', async () => {
      const { container } = render(StoryMetricsDashboard);

      const structureTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Structure');
      await fireEvent.click(structureTab!);

      const infoBox = container.querySelector('.info-box');
      expect(infoBox).toBeTruthy();
      expect(infoBox?.textContent).toContain('Dead Ends');
    });
  });

  describe('tags metrics', () => {
    beforeEach(() => {
      story.addPassage(new Passage({
        title: 'P1',
        content: 'Test',
        tags: ['action', 'combat']
      }));

      story.addPassage(new Passage({
        title: 'P2',
        content: 'Test',
        tags: ['action', 'dialogue']
      }));

      story.addPassage(new Passage({
        title: 'P3',
        content: 'Test',
        tags: []
      }));

      currentStory.set(story);
    });

    it('should switch to tags tab', async () => {
      const { container } = render(StoryMetricsDashboard);

      const tagsTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Tags');

      await fireEvent.click(tagsTab!);

      const activeTab = container.querySelector('.tabs button.active');
      expect(activeTab?.textContent).toBe('Tags');
    });

    it('should display unique tags count', async () => {
      const { container } = render(StoryMetricsDashboard);

      const tagsTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Tags');
      await fireEvent.click(tagsTab!);

      const uniqueTagsCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Unique Tags'));

      expect(uniqueTagsCard).toBeTruthy();
      expect(uniqueTagsCard?.querySelector('.metric-value')?.textContent).toBe('3');
    });

    it('should display untagged passages count', async () => {
      const { container } = render(StoryMetricsDashboard);

      const tagsTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Tags');
      await fireEvent.click(tagsTab!);

      const untaggedCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Untagged Passages'));

      expect(untaggedCard).toBeTruthy();
      expect(untaggedCard?.querySelector('.metric-value')?.textContent).toBe('1');
    });

    it('should show most used tags section', async () => {
      const { container } = render(StoryMetricsDashboard);

      const tagsTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Tags');
      await fireEvent.click(tagsTab!);

      const detailsSection = container.querySelector('.details-section');
      expect(detailsSection).toBeTruthy();
      expect(detailsSection?.textContent).toContain('Most Used Tags');
    });

    it('should list most used tags with counts', async () => {
      const { container } = render(StoryMetricsDashboard);

      const tagsTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Tags');
      await fireEvent.click(tagsTab!);

      const tagItems = container.querySelectorAll('.tag-item');
      expect(tagItems.length).toBeGreaterThan(0);

      const firstTag = tagItems[0];
      expect(firstTag.querySelector('.tag-name')).toBeTruthy();
      expect(firstTag.querySelector('.tag-count')).toBeTruthy();
    });

    it('should show info box when no tags exist', async () => {
      story = new Story({
        metadata: {
          title: 'Empty Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      story.addPassage(new Passage({
        title: 'P1',
        content: 'Test',
        tags: []
      }));

      currentStory.set(story);

      const { container } = render(StoryMetricsDashboard);

      const tagsTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Tags');
      await fireEvent.click(tagsTab!);

      const infoBox = container.querySelector('.info-box');
      expect(infoBox).toBeTruthy();
      expect(infoBox?.textContent).toContain('No tags');
    });
  });

  describe('readability metrics', () => {
    beforeEach(() => {
      // Create a story with enough content for readability metrics
      for (let i = 0; i < 5; i++) {
        story.addPassage(new Passage({
          title: `Passage ${i}`,
          content: 'Word '.repeat(100), // 100 words
          choices: i < 4 ? [
            { text: 'Choice 1', target: `Passage ${i + 1}` },
            { text: 'Choice 2', target: `Passage ${i + 1}` }
          ] : []
        }));
      }

      currentStory.set(story);
    });

    it('should switch to readability tab', async () => {
      const { container } = render(StoryMetricsDashboard);

      const readabilityTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Readability');

      await fireEvent.click(readabilityTab!);

      const activeTab = container.querySelector('.tabs button.active');
      expect(activeTab?.textContent).toBe('Readability');
    });

    it('should display estimated playtime', async () => {
      const { container } = render(StoryMetricsDashboard);

      const readabilityTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Readability');
      await fireEvent.click(readabilityTab!);

      const playtimeCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Est. Playtime'));

      expect(playtimeCard).toBeTruthy();
      const value = playtimeCard?.querySelector('.metric-value')?.textContent;
      expect(value).toBeTruthy();
      expect(value).toMatch(/min|h/);
    });

    it('should display complexity rating', async () => {
      const { container } = render(StoryMetricsDashboard);

      const readabilityTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Readability');
      await fireEvent.click(readabilityTab!);

      const complexityCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Complexity'));

      expect(complexityCard).toBeTruthy();
      const value = complexityCard?.querySelector('.metric-value')?.textContent;
      expect(['Simple', 'Moderate', 'Complex', 'Very Complex']).toContain(value);
    });

    it('should show success styling for simple complexity', async () => {
      story = new Story({
        metadata: {
          title: 'Simple Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      story.addPassage(new Passage({
        title: 'Start',
        content: 'Short story',
        choices: [{ text: 'End', target: 'End' }]
      }));

      currentStory.set(story);

      const { container } = render(StoryMetricsDashboard);

      const readabilityTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Readability');
      await fireEvent.click(readabilityTab!);

      const complexityCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Complexity'));

      expect(complexityCard?.classList.contains('success')).toBe(true);
    });

    it('should show explanatory info box', async () => {
      const { container } = render(StoryMetricsDashboard);

      const readabilityTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Readability');
      await fireEvent.click(readabilityTab!);

      const infoBox = container.querySelector('.info-box');
      expect(infoBox).toBeTruthy();
      expect(infoBox?.textContent).toContain('Estimated Playtime');
      expect(infoBox?.textContent).toContain('Complexity');
    });
  });

  describe('tab navigation', () => {
    beforeEach(() => {
      story.addPassage(new Passage({
        title: 'Test',
        content: 'Test content',
        tags: ['test']
      }));

      currentStory.set(story);
    });

    it('should show content section by default', () => {
      const { container } = render(StoryMetricsDashboard);

      const dashboardContent = container.querySelector('.dashboard-content');
      expect(dashboardContent?.textContent).toContain('Total Passages');
    });

    it('should change content when switching tabs', async () => {
      const { container } = render(StoryMetricsDashboard);

      const structureTab = Array.from(container.querySelectorAll('.tabs button'))
        .find(btn => btn.textContent === 'Structure');

      await fireEvent.click(structureTab!);

      const dashboardContent = container.querySelector('.dashboard-content');
      expect(dashboardContent?.textContent).toContain('Start Passage');
    });

    it('should maintain metrics grid layout across tabs', async () => {
      const { container } = render(StoryMetricsDashboard);

      const tabs = container.querySelectorAll('.tabs button');

      for (const tab of tabs) {
        await fireEvent.click(tab);
        const metricsGrid = container.querySelector('.metrics-grid');
        expect(metricsGrid).toBeTruthy();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle story with no passages', () => {
      currentStory.set(story);
      const { container } = render(StoryMetricsDashboard);

      const passagesCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Total Passages'));

      expect(passagesCard?.querySelector('.metric-value')?.textContent).toBe('0');
    });

    it('should handle passages with no content', () => {
      story.addPassage(new Passage({
        title: 'Empty',
        content: '',
        choices: []
      }));

      currentStory.set(story);
      const { container } = render(StoryMetricsDashboard);

      const wordsCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Total Words'));

      expect(wordsCard).toBeTruthy();
    });

    it('should handle rapid tab switching', async () => {
      story.addPassage(new Passage({ title: 'Test', content: 'Test' }));
      currentStory.set(story);

      const { container } = render(StoryMetricsDashboard);

      const tabs = container.querySelectorAll('.tabs button');

      // Rapidly switch tabs
      for (let i = 0; i < 10; i++) {
        await fireEvent.click(tabs[i % tabs.length]);
      }

      const activeTab = container.querySelector('.tabs button.active');
      expect(activeTab).toBeTruthy();
    });

    it('should recalculate metrics when story changes', () => {
      currentStory.set(story);
      const { container } = render(StoryMetricsDashboard);

      let passagesCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Total Passages'));
      expect(passagesCard?.querySelector('.metric-value')?.textContent).toBe('0');

      // Update the story
      story.addPassage(new Passage({ title: 'New', content: 'Content' }));
      currentStory.set(story);

      // Metrics should update
      passagesCard = Array.from(container.querySelectorAll('.metric-card'))
        .find(card => card.textContent?.includes('Total Passages'));
      expect(passagesCard?.querySelector('.metric-value')?.textContent).toBe('1');
    });
  });
});
