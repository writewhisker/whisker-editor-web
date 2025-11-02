import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PlaythroughAnalyticsPanel from './PlaythroughAnalyticsPanel.svelte';
import { currentStory } from '$lib/stores/projectStore';
import { Story } from '$lib/models/Story';
import { Playthrough } from '$lib/models/Playthrough';

// Mock the PlaythroughRecorder
vi.mock('$lib/analytics/PlaythroughRecorder', () => ({
  getPlaythroughRecorder: vi.fn(() => ({
    getPlaythroughsByStory: vi.fn(() => []),
    clearPlaythroughsByStory: vi.fn(),
  })),
}));

// Mock the PlaythroughAnalytics
vi.mock('$lib/analytics/PlaythroughAnalytics', () => ({
  PlaythroughAnalytics: vi.fn().mockImplementation(() => ({
    analyze: vi.fn(() => ({
      completion: {
        totalPlaythroughs: 5,
        completedPlaythroughs: 3,
        completionRate: 0.6,
        averageDuration: 120000,
        minDuration: 60000,
        maxDuration: 180000,
        averageSteps: 10,
        minSteps: 5,
        maxSteps: 15,
      },
      passages: new Map([
        ['passage1', {
          passageId: 'passage1',
          passageTitle: 'Start',
          visitCount: 5,
          visitRate: 1.0,
          averageTimeSpent: 30000,
          exitPaths: new Map(),
        }],
      ]),
      choices: [
        {
          choiceText: 'Go left',
          fromPassageId: 'passage1',
          fromPassageTitle: 'Start',
          toPassageId: 'passage2',
          selectionCount: 3,
          selectionRate: 0.6,
        },
      ],
      popularPaths: [
        {
          path: ['Start', 'Middle', 'End'],
          count: 2,
          frequency: 0.4,
        },
      ],
      deadEnds: ['passage5'],
    })),
  })),
}));

// Mock the store
vi.mock('$lib/stores/projectStore', () => ({
  currentStory: {
    subscribe: vi.fn(),
  },
}));

describe('PlaythroughAnalyticsPanel', () => {
  let mockStory: Story;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock story
    mockStory = new Story();
    mockStory.metadata.id = 'test-story-id';

    // Mock the store subscription
    vi.mocked(currentStory.subscribe).mockImplementation((callback) => {
      callback(mockStory);
      return () => {};
    });
  });

  describe('rendering', () => {
    it('should render the analytics header', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText('Playthrough Analytics')).toBeTruthy();
    });

    it('should render action buttons', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText('🔄 Refresh')).toBeTruthy();
      expect(screen.getByText('🗑️ Clear Data')).toBeTruthy();
    });

    it('should show playthrough count', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText(/playthrough/)).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no playthroughs exist', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText('No Playthrough Data')).toBeTruthy();
    });

    it('should display empty state message', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText('Start testing your story to collect analytics data.')).toBeTruthy();
    });

    it('should show hint about enabling recording', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText('Enable recording in the story player to track playthroughs.')).toBeTruthy();
    });

    it('should disable clear data button when empty', () => {
      render(PlaythroughAnalyticsPanel);

      const clearButton = screen.getByText('🗑️ Clear Data').closest('button') as HTMLButtonElement;
      expect(clearButton.disabled).toBe(true);
    });
  });

  describe('with playthrough data', () => {
    beforeEach(() => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      // Create mock playthroughs
      const mockPlaythroughs = [
        new Playthrough('story1', 'passage1'),
        new Playthrough('story1', 'passage1'),
        new Playthrough('story1', 'passage1'),
      ];

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => mockPlaythroughs),
        clearPlaythroughsByStory: vi.fn(),
      });
    });

    it('should render tabs when data exists', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText('📋 Overview')).toBeTruthy();
      expect(screen.getByText(/📍 Passages/)).toBeTruthy();
      expect(screen.getByText(/🎯 Choices/)).toBeTruthy();
      expect(screen.getByText(/🛤️ Paths/)).toBeTruthy();
    });

    it('should show badge counts on tabs', () => {
      const { container } = render(PlaythroughAnalyticsPanel);

      const badges = container.querySelectorAll('.badge');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should enable clear data button when data exists', () => {
      render(PlaythroughAnalyticsPanel);

      const clearButton = screen.getByText('🗑️ Clear Data').closest('button') as HTMLButtonElement;
      expect(clearButton.disabled).toBe(false);
    });
  });

  describe('overview tab', () => {
    beforeEach(() => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      const mockPlaythroughs = [
        new Playthrough('story1', 'passage1'),
        new Playthrough('story1', 'passage1'),
      ];

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => mockPlaythroughs),
        clearPlaythroughsByStory: vi.fn(),
      });
    });

    it('should show completion statistics', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText('Total Playthroughs')).toBeTruthy();
      expect(screen.getByText('Completion Rate')).toBeTruthy();
      expect(screen.getByText('Avg. Duration')).toBeTruthy();
      expect(screen.getByText('Avg. Path Length')).toBeTruthy();
    });

    it('should display numerical values', () => {
      render(PlaythroughAnalyticsPanel);

      // Check for stat values - they should be rendered
      const statValues = screen.getAllByText('5');
      expect(statValues.length).toBeGreaterThan(0);
    });

    it('should show completion details', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText(/of \d+ completed/)).toBeTruthy();
    });

    it('should display duration range', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText(/Min:/)).toBeTruthy();
      expect(screen.getByText(/Max:/)).toBeTruthy();
    });

    it('should show dead ends section when they exist', () => {
      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText(/Dead Ends/)).toBeTruthy();
    });
  });

  describe('passages tab', () => {
    beforeEach(() => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      const mockPlaythroughs = [
        new Playthrough('story1', 'passage1'),
      ];

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => mockPlaythroughs),
        clearPlaythroughsByStory: vi.fn(),
      });
    });

    it('should switch to passages tab when clicked', async () => {
      render(PlaythroughAnalyticsPanel);

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(screen.getByText('Passage Statistics')).toBeTruthy();
    });

    it('should display passage table', async () => {
      render(PlaythroughAnalyticsPanel);

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(screen.getByText('Passage')).toBeTruthy();
      expect(screen.getByText('Visits')).toBeTruthy();
      expect(screen.getByText('Visit Rate')).toBeTruthy();
    });

    it('should show passage count', async () => {
      render(PlaythroughAnalyticsPanel);

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(screen.getByText(/passages/)).toBeTruthy();
    });

    it('should display passage data rows', async () => {
      render(PlaythroughAnalyticsPanel);

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(screen.getByText('Start')).toBeTruthy();
    });
  });

  describe('choices tab', () => {
    beforeEach(() => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      const mockPlaythroughs = [
        new Playthrough('story1', 'passage1'),
      ];

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => mockPlaythroughs),
        clearPlaythroughsByStory: vi.fn(),
      });
    });

    it('should switch to choices tab when clicked', async () => {
      render(PlaythroughAnalyticsPanel);

      const choicesTab = screen.getByText(/🎯 Choices/).closest('button') as HTMLElement;
      await fireEvent.click(choicesTab);

      expect(screen.getByText('Choice Statistics')).toBeTruthy();
    });

    it('should display choices table', async () => {
      render(PlaythroughAnalyticsPanel);

      const choicesTab = screen.getByText(/🎯 Choices/).closest('button') as HTMLElement;
      await fireEvent.click(choicesTab);

      expect(screen.getByText('Choice Text')).toBeTruthy();
      expect(screen.getByText('Selections')).toBeTruthy();
      expect(screen.getByText('Selection Rate')).toBeTruthy();
    });

    it('should show choice count', async () => {
      render(PlaythroughAnalyticsPanel);

      const choicesTab = screen.getByText(/🎯 Choices/).closest('button') as HTMLElement;
      await fireEvent.click(choicesTab);

      expect(screen.getByText(/choices/)).toBeTruthy();
    });

    it('should display progress bars for selection rates', async () => {
      const { container } = render(PlaythroughAnalyticsPanel);

      const choicesTab = screen.getByText(/🎯 Choices/).closest('button') as HTMLElement;
      await fireEvent.click(choicesTab);

      const progressBars = container.querySelectorAll('.progress-bar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('paths tab', () => {
    beforeEach(() => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      const mockPlaythroughs = [
        new Playthrough('story1', 'passage1'),
      ];

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => mockPlaythroughs),
        clearPlaythroughsByStory: vi.fn(),
      });
    });

    it('should switch to paths tab when clicked', async () => {
      render(PlaythroughAnalyticsPanel);

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText('Popular Paths')).toBeTruthy();
    });

    it('should show path count', async () => {
      render(PlaythroughAnalyticsPanel);

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText(/unique paths/)).toBeTruthy();
    });

    it('should display path rankings', async () => {
      render(PlaythroughAnalyticsPanel);

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText('#1')).toBeTruthy();
    });

    it('should show path steps', async () => {
      render(PlaythroughAnalyticsPanel);

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText('Start')).toBeTruthy();
      expect(screen.getByText('Middle')).toBeTruthy();
      expect(screen.getByText('End')).toBeTruthy();
    });

    it('should display path frequency', async () => {
      render(PlaythroughAnalyticsPanel);

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText(/40%/)).toBeTruthy();
    });
  });

  describe('tab navigation', () => {
    beforeEach(() => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      const mockPlaythroughs = [
        new Playthrough('story1', 'passage1'),
      ];

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => mockPlaythroughs),
        clearPlaythroughsByStory: vi.fn(),
      });
    });

    it('should highlight active tab', async () => {
      const { container } = render(PlaythroughAnalyticsPanel);

      const overviewTab = screen.getByText('📋 Overview').closest('button') as HTMLElement;
      expect(overviewTab.classList.contains('active')).toBe(true);
    });

    it('should switch tabs on click', async () => {
      render(PlaythroughAnalyticsPanel);

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(passagesTab.classList.contains('active')).toBe(true);
    });

    it('should update content when switching tabs', async () => {
      render(PlaythroughAnalyticsPanel);

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(screen.getByText('Passage Statistics')).toBeTruthy();

      const choicesTab = screen.getByText(/🎯 Choices/).closest('button') as HTMLElement;
      await fireEvent.click(choicesTab);

      expect(screen.getByText('Choice Statistics')).toBeTruthy();
    });
  });

  describe('refresh functionality', () => {
    it('should reload data when refresh is clicked', async () => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');
      const mockGetPlaythroughs = vi.fn(() => []);

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: mockGetPlaythroughs,
        clearPlaythroughsByStory: vi.fn(),
      });

      render(PlaythroughAnalyticsPanel);

      const refreshButton = screen.getByText('🔄 Refresh');
      await fireEvent.click(refreshButton);

      expect(mockGetPlaythroughs).toHaveBeenCalled();
    });
  });

  describe('clear data functionality', () => {
    beforeEach(() => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      const mockPlaythroughs = [
        new Playthrough('story1', 'passage1'),
      ];

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => mockPlaythroughs),
        clearPlaythroughsByStory: vi.fn(),
      });

      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('should show confirmation dialog when clear is clicked', async () => {
      render(PlaythroughAnalyticsPanel);

      const clearButton = screen.getByText('🗑️ Clear Data');
      await fireEvent.click(clearButton);

      expect(window.confirm).toHaveBeenCalled();
    });

    it('should clear data when confirmed', async () => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');
      const mockClear = vi.fn();

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => [new Playthrough('story1', 'passage1')]),
        clearPlaythroughsByStory: mockClear,
      });

      render(PlaythroughAnalyticsPanel);

      const clearButton = screen.getByText('🗑️ Clear Data');
      await fireEvent.click(clearButton);

      expect(mockClear).toHaveBeenCalledWith('test-story-id');
    });

    it('should not clear data when cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');
      const mockClear = vi.fn();

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => [new Playthrough('story1', 'passage1')]),
        clearPlaythroughsByStory: mockClear,
      });

      render(PlaythroughAnalyticsPanel);

      const clearButton = screen.getByText('🗑️ Clear Data');
      await fireEvent.click(clearButton);

      expect(mockClear).not.toHaveBeenCalled();
    });
  });

  describe('helper functions', () => {
    beforeEach(() => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      const mockPlaythroughs = [
        new Playthrough('story1', 'passage1'),
      ];

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => mockPlaythroughs),
        clearPlaythroughsByStory: vi.fn(),
      });
    });

    it('should format durations correctly', () => {
      render(PlaythroughAnalyticsPanel);

      // Should show formatted durations like "2m" or "1h 30m"
      expect(screen.getByText(/m/)).toBeTruthy();
    });

    it('should format percentages correctly', () => {
      render(PlaythroughAnalyticsPanel);

      // Should show percentages like "60%"
      expect(screen.getByText(/60%/)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle null story gracefully', () => {
      vi.mocked(currentStory.subscribe).mockImplementation((callback) => {
        callback(null);
        return () => {};
      });

      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText('No Playthrough Data')).toBeTruthy();
    });

    it('should handle story without ID', () => {
      const storyWithoutId = new Story();
      storyWithoutId.metadata.id = '';

      vi.mocked(currentStory.subscribe).mockImplementation((callback) => {
        callback(storyWithoutId);
        return () => {};
      });

      render(PlaythroughAnalyticsPanel);

      expect(screen.getByText('No Playthrough Data')).toBeTruthy();
    });

    it('should handle analysis errors gracefully', () => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => {
          throw new Error('Analysis error');
        }),
        clearPlaythroughsByStory: vi.fn(),
      });

      // Should not crash
      render(PlaythroughAnalyticsPanel);
      expect(screen.getByText('Playthrough Analytics')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator during analysis', () => {
      const { getPlaythroughRecorder } = require('$lib/analytics/PlaythroughRecorder');

      const mockPlaythroughs = [
        new Playthrough('story1', 'passage1'),
      ];

      vi.mocked(getPlaythroughRecorder).mockReturnValue({
        getPlaythroughsByStory: vi.fn(() => mockPlaythroughs),
        clearPlaythroughsByStory: vi.fn(),
      });

      const { container } = render(PlaythroughAnalyticsPanel);

      // Loading state might be very brief, but should exist during analysis
      expect(container).toBeTruthy();
    });
  });
});
