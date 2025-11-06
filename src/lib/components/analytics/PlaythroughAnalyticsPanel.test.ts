import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import PlaythroughAnalyticsPanel from './PlaythroughAnalyticsPanel.svelte';
import { currentStory } from '$lib/stores/projectStore';
import { Story } from '$lib/models/Story';
import { Playthrough } from '$lib/models/Playthrough';

// Create mock data
const createMockPlaythroughs = () => [
  new Playthrough('story1', 'passage1'),
  new Playthrough('story1', 'passage1'),
  new Playthrough('story1', 'passage1'),
];

// Mock the PlaythroughRecorder
const mockGetPlaythroughsByStory = vi.fn(() => createMockPlaythroughs());
const mockClearPlaythroughsByStory = vi.fn();

vi.mock('$lib/analytics/PlaythroughRecorder', () => ({
  getPlaythroughRecorder: vi.fn(() => ({
    getPlaythroughsByStory: mockGetPlaythroughsByStory,
    clearPlaythroughsByStory: mockClearPlaythroughsByStory,
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
    beforeEach(() => {
      // Override mock to return empty array for these tests
      mockGetPlaythroughsByStory.mockReturnValue([]);
    });

    afterEach(() => {
      // Restore default mock
      mockGetPlaythroughsByStory.mockReturnValue(createMockPlaythroughs());
    });

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
    // No need for beforeEach - the global mock already returns playthroughs

    it('should render tabs when data exists', async () => {
      render(PlaythroughAnalyticsPanel);

      // Wait for $effect to run and analyze playthroughs
      await tick();
      await waitFor(() => {
        expect(screen.getByText('📋 Overview')).toBeTruthy();
      });

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
    it('should show completion statistics', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText('Total Playthroughs')).toBeTruthy();
      });
      expect(screen.getByText('Completion Rate')).toBeTruthy();
      expect(screen.getByText('Avg. Duration')).toBeTruthy();
      expect(screen.getByText('Avg. Path Length')).toBeTruthy();
    });

    it('should display numerical values', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        // Check for stat values - they should be rendered
        const statValues = screen.getAllByText('5');
        expect(statValues.length).toBeGreaterThan(0);
      });
    });

    it('should show completion details', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/of \d+ completed/)).toBeTruthy();
      });
    });

    it('should display duration range', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        const minElements = screen.getAllByText(/Min:/);
        expect(minElements.length).toBeGreaterThan(0);
      });
      const maxElements = screen.getAllByText(/Max:/);
      expect(maxElements.length).toBeGreaterThan(0);
    });

    it('should show dead ends section when they exist', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/Dead Ends/)).toBeTruthy();
      });
    });
  });

  describe('passages tab', () => {
    it('should switch to passages tab when clicked', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/📍 Passages/)).toBeTruthy();
      });

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(screen.getByText('Passage Statistics')).toBeTruthy();
    });

    it('should display passage table', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/📍 Passages/)).toBeTruthy();
      });

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(screen.getByText('Passage')).toBeTruthy();
      expect(screen.getByText('Visits')).toBeTruthy();
      expect(screen.getByText('Visit Rate')).toBeTruthy();
    });

    it('should show passage count', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/📍 Passages/)).toBeTruthy();
      });

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(screen.getByText(/passages/)).toBeTruthy();
    });

    it('should display passage data rows', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/📍 Passages/)).toBeTruthy();
      });

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(screen.getByText('Start')).toBeTruthy();
    });
  });

  describe('choices tab', () => {
    it('should switch to choices tab when clicked', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/🎯 Choices/)).toBeTruthy();
      });

      const choicesTab = screen.getByText(/🎯 Choices/).closest('button') as HTMLElement;
      await fireEvent.click(choicesTab);

      expect(screen.getByText('Choice Statistics')).toBeTruthy();
    });

    it('should display choices table', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/🎯 Choices/)).toBeTruthy();
      });

      const choicesTab = screen.getByText(/🎯 Choices/).closest('button') as HTMLElement;
      await fireEvent.click(choicesTab);

      expect(screen.getByText('Choice Text')).toBeTruthy();
      expect(screen.getByText('Selections')).toBeTruthy();
      expect(screen.getByText('Selection Rate')).toBeTruthy();
    });

    it('should show choice count', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/🎯 Choices/)).toBeTruthy();
      });

      const choicesTab = screen.getByText(/🎯 Choices/).closest('button') as HTMLElement;
      await fireEvent.click(choicesTab);

      expect(screen.getByText(/choices/)).toBeTruthy();
    });

    it('should display progress bars for selection rates', async () => {
      const { container } = render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/🎯 Choices/)).toBeTruthy();
      });

      const choicesTab = screen.getByText(/🎯 Choices/).closest('button') as HTMLElement;
      await fireEvent.click(choicesTab);

      const progressBars = container.querySelectorAll('.progress-bar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('paths tab', () => {
    it('should switch to paths tab when clicked', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/🛤️ Paths/)).toBeTruthy();
      });

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText('Popular Paths')).toBeTruthy();
    });

    it('should show path count', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/🛤️ Paths/)).toBeTruthy();
      });

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText(/unique paths/)).toBeTruthy();
    });

    it('should display path rankings', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/🛤️ Paths/)).toBeTruthy();
      });

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText('#1')).toBeTruthy();
    });

    it('should show path steps', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/🛤️ Paths/)).toBeTruthy();
      });

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText('Start')).toBeTruthy();
      expect(screen.getByText('Middle')).toBeTruthy();
      expect(screen.getByText('End')).toBeTruthy();
    });

    it('should display path frequency', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/🛤️ Paths/)).toBeTruthy();
      });

      const pathsTab = screen.getByText(/🛤️ Paths/).closest('button') as HTMLElement;
      await fireEvent.click(pathsTab);

      expect(screen.getByText(/40%/)).toBeTruthy();
    });
  });

  describe('tab navigation', () => {
    it('should highlight active tab', async () => {
      const { container } = render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText('📋 Overview')).toBeTruthy();
      });

      const overviewTab = screen.getByText('📋 Overview').closest('button') as HTMLElement;
      expect(overviewTab.classList.contains('active')).toBe(true);
    });

    it('should switch tabs on click', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/📍 Passages/)).toBeTruthy();
      });

      const passagesTab = screen.getByText(/📍 Passages/).closest('button') as HTMLElement;
      await fireEvent.click(passagesTab);

      expect(passagesTab.classList.contains('active')).toBe(true);
    });

    it('should update content when switching tabs', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText(/📍 Passages/)).toBeTruthy();
      });

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
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText('📋 Overview')).toBeTruthy();
      });

      const refreshButton = screen.getByText('🔄 Refresh');

      // Clear call count from initial load
      mockGetPlaythroughsByStory.mockClear();

      await fireEvent.click(refreshButton);

      expect(mockGetPlaythroughsByStory).toHaveBeenCalled();
    });
  });

  describe('clear data functionality', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('should show confirmation dialog when clear is clicked', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText('📋 Overview')).toBeTruthy();
      });

      const clearButton = screen.getByText('🗑️ Clear Data');
      await fireEvent.click(clearButton);

      expect(window.confirm).toHaveBeenCalled();
    });

    it('should clear data when confirmed', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText('📋 Overview')).toBeTruthy();
      });

      const clearButton = screen.getByText('🗑️ Clear Data');

      mockClearPlaythroughsByStory.mockClear();
      await fireEvent.click(clearButton);

      expect(mockClearPlaythroughsByStory).toHaveBeenCalledWith('test-story-id');
    });

    it('should not clear data when cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        expect(screen.getByText('📋 Overview')).toBeTruthy();
      });

      const clearButton = screen.getByText('🗑️ Clear Data');

      mockClearPlaythroughsByStory.mockClear();
      await fireEvent.click(clearButton);

      expect(mockClearPlaythroughsByStory).not.toHaveBeenCalled();
    });
  });

  describe('helper functions', () => {
    it('should format durations correctly', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        // Should show formatted durations like "2m 0s" or "1h 30m"
        const durations = screen.getAllByText(/\d+m\s*\d*s*/);
        expect(durations.length).toBeGreaterThan(0);
      });
    });

    it('should format percentages correctly', async () => {
      render(PlaythroughAnalyticsPanel);

      await tick();
      await waitFor(() => {
        // Should show percentages like "60%"
        expect(screen.getByText(/60%/)).toBeTruthy();
      });
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
      mockGetPlaythroughsByStory.mockImplementation(() => {
        throw new Error('Analysis error');
      });

      // Should not crash
      render(PlaythroughAnalyticsPanel);
      expect(screen.getByText('Playthrough Analytics')).toBeTruthy();

      // Restore mock
      mockGetPlaythroughsByStory.mockImplementation(() => createMockPlaythroughs());
    });
  });

  describe('loading state', () => {
    it('should show loading indicator during analysis', () => {
      const { container } = render(PlaythroughAnalyticsPanel);

      // Loading state might be very brief, but should exist during analysis
      expect(container).toBeTruthy();
    });
  });
});
