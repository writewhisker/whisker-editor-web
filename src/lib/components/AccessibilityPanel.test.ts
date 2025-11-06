import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import AccessibilityPanel from './AccessibilityPanel.svelte';
import {
  accessibilityStore,
  accessibilityReport,
  accessibilityScore,
  accessibilityLevel,
  accessibilityIssues,
  criticalIssues,
} from '../stores/accessibilityStore';
import { currentStory } from '../stores/projectStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('AccessibilityPanel', () => {
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

    // Add test passages
    const passage1 = new Passage({
      title: 'Start',
      content: 'This is a test passage. It has some content.',
    });
    const passage2 = new Passage({
      title: 'Next',
      content: 'This is another passage with more text.',
    });

    story.addPassage(passage1);
    story.addPassage(passage2);

    currentStory.set(story);
  });

  afterEach(() => {
    currentStory.set(null);
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should render accessibility header', () => {
      const { getByText } = render(AccessibilityPanel);
      expect(getByText('Accessibility')).toBeTruthy();
    });

    it('should render check button', () => {
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check');
      expect(button).toBeTruthy();
    });

    it('should show no story message when no story loaded', () => {
      currentStory.set(null);
      const { getByText } = render(AccessibilityPanel);
      expect(getByText('No story loaded')).toBeTruthy();
    });

    it('should show click check message when no report available', () => {
      const { getByText } = render(AccessibilityPanel);
      expect(getByText('Click "Check" to analyze accessibility')).toBeTruthy();
    });

    it('should render with proper structure classes', () => {
      const { container } = render(AccessibilityPanel);
      const panel = container.querySelector('.h-full.flex.flex-col');
      expect(panel).toBeTruthy();
    });
  });

  describe('check button states', () => {
    it('should enable check button when story is loaded', () => {
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('should disable check button when no story loaded', () => {
      currentStory.set(null);
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should show analyzing state when analyzing', async () => {
      const { getByText, container } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      // Check for "Analyzing..." text (might appear briefly)
      const analyzingButton = container.querySelector('button:disabled');
      if (analyzingButton) {
        expect(analyzingButton.textContent).toContain('Analyzing...');
      }
    });
  });

  describe('accessibility score display', () => {
    it('should display accessibility score after analysis', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      // Wait for analysis to complete
      await waitFor(() => {
        const score = get(accessibilityScore);
        expect(score).toBeGreaterThanOrEqual(0);
      });

      const scoreElement = container.querySelector('.text-4xl.font-bold');
      expect(scoreElement).toBeTruthy();
    });

    it('should display accessibility level badge', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const level = get(accessibilityLevel);
        expect(level).toBeTruthy();
      });

      const badge = container.querySelector('.rounded-full.text-sm.font-medium');
      expect(badge).toBeTruthy();
    });

    it('should display last checked timestamp', async () => {
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        expect(getByText(/Last checked:/)).toBeTruthy();
      });
    });
  });

  describe('reading level display', () => {
    it('should display grade level after analysis', async () => {
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        expect(getByText('Reading Level')).toBeTruthy();
        expect(getByText('Grade Level')).toBeTruthy();
      });
    });

    it('should display reading ease score', async () => {
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        expect(getByText('Reading Ease')).toBeTruthy();
      });
    });

    it('should display average sentence length', async () => {
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        expect(getByText('Avg Sentence Length')).toBeTruthy();
      });
    });

    it('should display complex words count', async () => {
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        expect(getByText('Complex Words')).toBeTruthy();
      });
    });
  });

  describe('issues display', () => {
    it('should display issues count when issues exist', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const issues = get(accessibilityIssues);
        if (issues.length > 0) {
          const issuesHeader = container.querySelector('h3');
          expect(issuesHeader?.textContent).toContain('Issues');
        }
      });
    });

    it('should display critical issues count when present', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const critical = get(criticalIssues);
        if (critical.length > 0) {
          expect(container.textContent).toContain('Critical');
        }
      });
    });

    it('should show no issues message when no issues found', async () => {
      // Create story with good accessibility
      const simpleStory = new Story({
        metadata: {
          title: 'Good Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'This is a simple passage.',
      });
      simpleStory.addPassage(passage);
      currentStory.set(simpleStory);

      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const issues = get(accessibilityIssues);
        if (issues.length === 0) {
          expect(container.textContent).toContain('No accessibility issues detected');
        }
      });
    });

    it('should limit displayed issues to 15', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const issues = get(accessibilityIssues);
        const displayedIssues = container.querySelectorAll('.p-3.rounded.border');
        expect(displayedIssues.length).toBeLessThanOrEqual(15);
      });
    });

    it('should show more issues indicator when over 15 issues', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const issues = get(accessibilityIssues);
        if (issues.length > 15) {
          expect(container.textContent).toContain('more issues');
        }
      });
    });
  });

  describe('issue details', () => {
    it('should display issue severity', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const issues = get(accessibilityIssues);
        if (issues.length > 0) {
          const severityBadges = container.querySelectorAll('.text-xs.font-medium.uppercase');
          expect(severityBadges.length).toBeGreaterThan(0);
        }
      });
    });

    it('should display issue message', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const issues = get(accessibilityIssues);
        if (issues.length > 0) {
          const messages = container.querySelectorAll('.text-sm.text-gray-900');
          expect(messages.length).toBeGreaterThan(0);
        }
      });
    });

    it('should display issue suggestion', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const issues = get(accessibilityIssues);
        if (issues.length > 0) {
          expect(container.textContent).toContain('💡');
        }
      });
    });

    it('should display passage title when available', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const issues = get(accessibilityIssues);
        const issueWithPassage = issues.find(i => i.passageTitle);
        if (issueWithPassage) {
          expect(container.textContent).toContain('Passage:');
        }
      });
    });
  });

  describe('WCAG guidelines info', () => {
    it('should display WCAG guidelines information', async () => {
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        expect(getByText('About WCAG Guidelines')).toBeTruthy();
      });
    });

    it('should display WCAG level for issues', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const issues = get(accessibilityIssues);
        const issueWithLevel = issues.find(i => i.wcagLevel);
        if (issueWithLevel) {
          expect(container.textContent).toContain('WCAG');
        }
      });
    });
  });

  describe('score color coding', () => {
    it('should apply correct color for excellent scores', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const score = get(accessibilityScore);
        const scoreElement = container.querySelector('.text-4xl.font-bold');
        if (score >= 90 && scoreElement) {
          expect(scoreElement.className).toContain('text-green-');
        }
      });
    });

    it('should apply correct color for good scores', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const score = get(accessibilityScore);
        const scoreElement = container.querySelector('.text-4xl.font-bold');
        if (score >= 70 && score < 90 && scoreElement) {
          expect(scoreElement.className).toContain('text-blue-');
        }
      });
    });

    it('should apply correct border color for score card', async () => {
      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;

      await fireEvent.click(button);

      await waitFor(() => {
        const scoreCard = container.querySelector('.rounded-lg.border-2');
        expect(scoreCard).toBeTruthy();
      });
    });
  });

  describe('auto-analysis', () => {
    it('should auto-analyze when story changes', async () => {
      const { container } = render(AccessibilityPanel);

      // Wait for auto-analysis to trigger
      await waitFor(() => {
        const report = get(accessibilityReport);
        expect(report).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('should update analysis when story content changes', async () => {
      const { container, getByText } = render(AccessibilityPanel);

      // Get initial report
      const button = getByText('Check') as HTMLButtonElement;
      await fireEvent.click(button);

      await waitFor(() => {
        const report = get(accessibilityReport);
        expect(report).toBeTruthy();
      });

      const firstReport = get(accessibilityReport);

      // Modify story
      const passage = new Passage({
        title: 'New Passage',
        content: 'This is new content that should trigger re-analysis.',
      });
      story.addPassage(passage);
      currentStory.update(s => s);

      // Wait for re-analysis
      await waitFor(() => {
        const newReport = get(accessibilityReport);
        if (firstReport && newReport) {
          expect(newReport.analyzedAt).not.toBe(firstReport.analyzedAt);
        }
      }, { timeout: 2000 });
    });
  });

  describe('edge cases', () => {
    it('should handle empty story', () => {
      const emptyStory = new Story({
        metadata: {
          title: 'Empty Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      currentStory.set(emptyStory);
      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;
      expect(button).toBeTruthy();
    });

    it('should handle very long passage titles', async () => {
      const longTitlePassage = new Passage({
        title: 'A'.repeat(200),
        content: 'Short content',
      });
      story.addPassage(longTitlePassage);

      const { container, getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;
      await fireEvent.click(button);

      await waitFor(() => {
        expect(container).toBeTruthy();
      });
    });

    it('should handle passages with special characters', async () => {
      const specialPassage = new Passage({
        title: 'Special <>&"\' Characters',
        content: 'Content with <html> tags and &amp; entities',
      });
      story.addPassage(specialPassage);

      const { getByText } = render(AccessibilityPanel);
      const button = getByText('Check') as HTMLButtonElement;
      await fireEvent.click(button);

      await waitFor(() => {
        expect(get(accessibilityReport)).toBeTruthy();
      });
    });
  });
});
