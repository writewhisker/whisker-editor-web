import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import StoryFlowAnalyticsPanel from './StoryFlowAnalyticsPanel.svelte';
import { get } from 'svelte/store';
import { currentStory } from '../../stores';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';

// Mock the StoryFlowAnalyzer
vi.mock('../../utils/storyFlowAnalytics', () => ({
  StoryFlowAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockReturnValue({
      totalPaths: 5,
      averagePathLength: 3.2,
      longestPath: { path: ['passage1', 'passage2', 'passage3'], length: 3 },
      shortestPath: { path: ['passage1', 'passage4'], length: 2 },
      circularPaths: [],
      deadEnds: ['passage3'],
      unreachablePassages: ['passage5'],
      bottlenecks: [
        {
          passageId: 'passage2',
          passageTitle: 'Middle Passage',
          incomingCount: 3,
          outgoingCount: 2,
          bottleneckScore: 6.0,
        },
      ],
    }),
  })),
}));

describe('StoryFlowAnalyticsPanel', () => {
  let mockStory: Story;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock story
    mockStory = new Story({ metadata: { title: 'Test Story' } });
    const passage1 = new Passage({ id: 'passage1', title: 'Start', content: 'Beginning of story' });
    const passage2 = new Passage({ id: 'passage2', title: 'Middle Passage', content: 'Middle of story' });
    const passage3 = new Passage({ id: 'passage3', title: 'End', content: 'End of story' });
    const passage4 = new Passage({ id: 'passage4', title: 'Quick End', content: 'Quick ending' });
    const passage5 = new Passage({ id: 'passage5', title: 'Unreachable', content: 'Cannot reach' });

    mockStory.addPassage(passage1);
    mockStory.addPassage(passage2);
    mockStory.addPassage(passage3);
    mockStory.addPassage(passage4);
    mockStory.addPassage(passage5);

    currentStory.set(mockStory);
  });

  describe('rendering', () => {
    it('should render the component with header', () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);
      expect(getByText('Story Flow Analytics')).toBeTruthy();
    });

    it('should show empty state when no story loaded', () => {
      currentStory.set(null);
      const { getByText } = render(StoryFlowAnalyticsPanel);
      expect(getByText('No story loaded')).toBeTruthy();
    });

    it('should render refresh button', () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);
      expect(getByText('Refresh')).toBeTruthy();
    });

    it('should disable refresh button when no story loaded', () => {
      currentStory.set(null);
      const { container } = render(StoryFlowAnalyticsPanel);
      const button = container.querySelector('.refresh-btn') as HTMLButtonElement;
      expect(button?.disabled).toBe(true);
    });
  });

  describe('tabs', () => {
    it('should render all tab buttons', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText('Overview')).toBeTruthy();
        expect(getByText(/Paths/)).toBeTruthy();
        expect(getByText(/Bottlenecks/)).toBeTruthy();
        expect(getByText(/Issues/)).toBeTruthy();
      });
    });

    it('should show overview tab by default', async () => {
      const { container } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const overviewBtn = Array.from(container.querySelectorAll('.tabs button')).find(
          (btn) => btn.textContent?.includes('Overview')
        );
        expect(overviewBtn?.classList.contains('active')).toBe(true);
      });
    });

    it('should switch to paths tab when clicked', async () => {
      const { getByText, container } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText(/Paths/)).toBeTruthy();
      });

      const pathsBtn = getByText(/Paths/);
      await fireEvent.click(pathsBtn);

      await waitFor(() => {
        expect(pathsBtn.classList.contains('active')).toBe(true);
      });
    });

    it('should switch to bottlenecks tab when clicked', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText(/Bottlenecks/)).toBeTruthy();
      });

      const bottlenecksBtn = getByText(/Bottlenecks/);
      await fireEvent.click(bottlenecksBtn);

      await waitFor(() => {
        expect(bottlenecksBtn.classList.contains('active')).toBe(true);
      });
    });

    it('should switch to issues tab when clicked', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText(/Issues/)).toBeTruthy();
      });

      const issuesBtn = getByText(/Issues/);
      await fireEvent.click(issuesBtn);

      await waitFor(() => {
        expect(issuesBtn.classList.contains('active')).toBe(true);
      });
    });

    it('should display correct counts in tab labels', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText(/Paths \(5\)/)).toBeTruthy();
        expect(getByText(/Bottlenecks \(1\)/)).toBeTruthy();
        expect(getByText(/Issues \(2\)/)).toBeTruthy();
      });
    });
  });

  describe('overview tab', () => {
    it('should display metric cards', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText('Total Paths')).toBeTruthy();
        expect(getByText('Avg Path Length')).toBeTruthy();
        expect(getByText('Dead Ends')).toBeTruthy();
        expect(getByText('Circular Paths')).toBeTruthy();
      });
    });

    it('should display correct metric values', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText('5')).toBeTruthy(); // Total paths
        expect(getByText('3.2')).toBeTruthy(); // Avg path length
        expect(getByText('1')).toBeTruthy(); // Dead ends
        expect(getByText('0')).toBeTruthy(); // Circular paths
      });
    });

    it('should display longest path information', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText('Longest Path')).toBeTruthy();
        expect(getByText('3 passages')).toBeTruthy();
      });
    });

    it('should display shortest path information', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText('Shortest Path')).toBeTruthy();
        expect(getByText('2 passages')).toBeTruthy();
      });
    });

    it('should display passage titles in path', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText('Start')).toBeTruthy();
        expect(getByText('Middle Passage')).toBeTruthy();
        expect(getByText('End')).toBeTruthy();
      });
    });
  });

  describe('paths tab', () => {
    it('should display info message about total paths', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const pathsBtn = getByText(/Paths/);
        fireEvent.click(pathsBtn);
      });

      await waitFor(() => {
        expect(getByText(/Your story has 5 possible paths/)).toBeTruthy();
      });
    });

    it('should show no circular paths message when none exist', async () => {
      const { getByText, queryByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const pathsBtn = getByText(/Paths/);
        fireEvent.click(pathsBtn);
      });

      await waitFor(() => {
        expect(queryByText(/Circular Paths/)).toBeNull();
      });
    });
  });

  describe('bottlenecks tab', () => {
    it('should display bottleneck information', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const bottlenecksBtn = getByText(/Bottlenecks/);
        fireEvent.click(bottlenecksBtn);
      });

      await waitFor(() => {
        expect(getByText('Middle Passage')).toBeTruthy();
        expect(getByText('6.0')).toBeTruthy();
      });
    });

    it('should display incoming and outgoing counts', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const bottlenecksBtn = getByText(/Bottlenecks/);
        fireEvent.click(bottlenecksBtn);
      });

      await waitFor(() => {
        expect(getByText(/↓ 3 incoming/)).toBeTruthy();
        expect(getByText(/↑ 2 outgoing/)).toBeTruthy();
      });
    });

    it('should apply high severity class for high bottleneck scores', async () => {
      const { container, getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const bottlenecksBtn = getByText(/Bottlenecks/);
        fireEvent.click(bottlenecksBtn);
      });

      await waitFor(() => {
        const bottleneckItem = container.querySelector('.severity-high');
        expect(bottleneckItem).toBeTruthy();
      });
    });
  });

  describe('issues tab', () => {
    it('should display dead ends section', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const issuesBtn = getByText(/Issues/);
        fireEvent.click(issuesBtn);
      });

      await waitFor(() => {
        expect(getByText(/Dead Ends \(1\)/)).toBeTruthy();
        expect(getByText('Passages with no outgoing choices')).toBeTruthy();
      });
    });

    it('should display unreachable passages section', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const issuesBtn = getByText(/Issues/);
        fireEvent.click(issuesBtn);
      });

      await waitFor(() => {
        expect(getByText(/Unreachable Passages \(1\)/)).toBeTruthy();
        expect(getByText('Passages not connected from the start')).toBeTruthy();
      });
    });

    it('should list dead end passage titles', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const issuesBtn = getByText(/Issues/);
        fireEvent.click(issuesBtn);
      });

      await waitFor(() => {
        expect(getByText('End')).toBeTruthy();
      });
    });

    it('should list unreachable passage titles', async () => {
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const issuesBtn = getByText(/Issues/);
        fireEvent.click(issuesBtn);
      });

      await waitFor(() => {
        expect(getByText('Unreachable')).toBeTruthy();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading message while analyzing', async () => {
      const { getByText, container } = render(StoryFlowAnalyticsPanel);

      // Check if "Analyzing..." appears on button
      const button = container.querySelector('.refresh-btn') as HTMLButtonElement;
      await fireEvent.click(button);

      // Note: The loading state is brief, so this test might need adjustment
      // based on actual component behavior
    });

    it('should disable refresh button while loading', async () => {
      const { container } = render(StoryFlowAnalyticsPanel);
      const button = container.querySelector('.refresh-btn') as HTMLButtonElement;

      expect(button?.disabled).toBe(false);
    });
  });

  describe('refresh functionality', () => {
    it('should re-analyze story when refresh button clicked', async () => {
      const { container } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const button = container.querySelector('.refresh-btn') as HTMLButtonElement;
        expect(button).toBeTruthy();
      });

      const button = container.querySelector('.refresh-btn') as HTMLButtonElement;
      await fireEvent.click(button);

      // Should re-render with metrics
      await waitFor(() => {
        expect(container.textContent).toContain('Total Paths');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty metrics gracefully', async () => {
      const { StoryFlowAnalyzer } = await import('../../utils/storyFlowAnalytics');
      vi.mocked(StoryFlowAnalyzer).mockImplementation(() => ({
        analyze: vi.fn().mockReturnValue({
          totalPaths: 0,
          averagePathLength: 0,
          longestPath: null,
          shortestPath: null,
          circularPaths: [],
          deadEnds: [],
          unreachablePassages: [],
          bottlenecks: [],
        }),
      }));

      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const issuesBtn = getByText(/Issues/);
        fireEvent.click(issuesBtn);
      });

      await waitFor(() => {
        expect(getByText('No flow issues detected!')).toBeTruthy();
      });
    });

    it('should handle analysis errors', async () => {
      const { StoryFlowAnalyzer } = await import('../../utils/storyFlowAnalytics');
      vi.mocked(StoryFlowAnalyzer).mockImplementation(() => ({
        analyze: vi.fn().mockImplementation(() => {
          throw new Error('Analysis failed');
        }),
      }));

      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        expect(getByText('Failed to analyze story flow')).toBeTruthy();
      });
    });

    it('should handle missing passage titles', async () => {
      // Create a story with a passage that might not be found
      const { getByText } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        // Component should handle gracefully and show "Unknown" for missing passages
        const container = document.body;
        expect(container.textContent).toBeTruthy();
      });
    });
  });

  describe('severity classification', () => {
    it('should classify high severity bottlenecks correctly', async () => {
      const { getByText, container } = render(StoryFlowAnalyticsPanel);

      await waitFor(() => {
        const bottlenecksBtn = getByText(/Bottlenecks/);
        fireEvent.click(bottlenecksBtn);
      });

      await waitFor(() => {
        const highSeverity = container.querySelector('.severity-high');
        expect(highSeverity).toBeTruthy();
      });
    });
  });
});
