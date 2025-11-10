import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PlaythroughList from './PlaythroughList.svelte';
import { currentStory } from '../../stores';
import { Story } from '@whisker/core-ts';
import { Playthrough } from '@whisker/core-ts';

// Mock the PlaythroughRecorder
const mockGetPlaythroughs = vi.fn(() => []);
const mockDeletePlaythrough = vi.fn();
const mockClearPlaythroughs = vi.fn();

vi.mock('$lib/analytics/PlaythroughRecorder', () => ({
  getPlaythroughRecorder: vi.fn(() => ({
    getPlaythroughsByStory: mockGetPlaythroughs,
    deletePlaythrough: mockDeletePlaythrough,
    clearPlaythroughsByStory: mockClearPlaythroughs,
  })),
}));

// Mock the store
vi.mock('$lib/stores/projectStore', () => ({
  currentStory: {
    subscribe: vi.fn(),
  },
}));

describe('PlaythroughList', () => {
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

    mockGetPlaythroughs.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('should render the list header', () => {
      render(PlaythroughList);

      expect(screen.getByText('Playthrough History')).toBeTruthy();
    });

    it('should render clear all button', () => {
      render(PlaythroughList);

      expect(screen.getByText('🗑️ Clear All')).toBeTruthy();
    });

    it('should show record count', () => {
      render(PlaythroughList);

      expect(screen.getByText(/record/)).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no playthroughs exist', () => {
      render(PlaythroughList);

      expect(screen.getByText('No playthrough records yet')).toBeTruthy();
    });

    it('should display hint message', () => {
      render(PlaythroughList);

      expect(screen.getByText('Playthroughs will appear here as you test your story')).toBeTruthy();
    });

    it('should disable clear all button when empty', () => {
      render(PlaythroughList);

      const clearButton = screen.getByText('🗑️ Clear All').closest('button') as HTMLButtonElement;
      expect(clearButton.disabled).toBe(true);
    });

    it('should show 0 records', () => {
      render(PlaythroughList);

      expect(screen.getByText('0 records')).toBeTruthy();
    });
  });

  describe('with playthrough data', () => {
    let mockPlaythroughs: Playthrough[];

    beforeEach(() => {
      const playthrough1 = new Playthrough({ storyId: 'story1' });
      playthrough1.startTime = new Date('2024-01-01T10:00:00').toISOString();
      playthrough1.completed = true;
      playthrough1.addStep({
        passageId: 'start',
        passageTitle: 'Start',
        choiceText: 'Begin',
        timestamp: new Date().toISOString(),
        variables: {},
      });

      const playthrough2 = new Playthrough({ storyId: 'story1' });
      playthrough2.startTime = new Date('2024-01-02T14:00:00').toISOString();
      playthrough2.completed = false;
      playthrough2.addStep({
        passageId: 'start',
        passageTitle: 'Start',
        timestamp: new Date().toISOString(),
        variables: {},
      });

      mockPlaythroughs = [playthrough1, playthrough2];
      mockGetPlaythroughs.mockReturnValue(mockPlaythroughs);
    });

    it('should render playthrough items', () => {
      render(PlaythroughList);

      const playthroughItems = screen.getAllByText(/playthrough/i);
      expect(playthroughItems).toBeTruthy();
    });

    it('should display playthrough dates', () => {
      render(PlaythroughList);

      // Should format and display dates
      expect(screen.getByText(/1\/1\/2024/)).toBeTruthy();
      expect(screen.getByText(/1\/2\/2024/)).toBeTruthy();
    });

    it('should show step counts', () => {
      render(PlaythroughList);

      expect(screen.getAllByText(/1 step/)).toBeTruthy();
    });

    it('should display completion status', () => {
      render(PlaythroughList);

      expect(screen.getByText('✓ Completed')).toBeTruthy();
      expect(screen.getByText('○ Incomplete')).toBeTruthy();
    });

    it('should show durations', () => {
      render(PlaythroughList);

      // Should display some duration text
      expect(screen.getAllByText(/\d+s/)).toBeTruthy();
    });

    it('should enable clear all button', () => {
      render(PlaythroughList);

      const clearButton = screen.getByText('🗑️ Clear All').closest('button') as HTMLButtonElement;
      expect(clearButton.disabled).toBe(false);
    });

    it('should show correct record count', () => {
      render(PlaythroughList);

      expect(screen.getByText('2 records')).toBeTruthy();
    });
  });

  describe('playthrough actions', () => {
    let mockPlaythrough: Playthrough;

    beforeEach(() => {
      mockPlaythrough = new Playthrough({ storyId: 'story1' });
      mockPlaythrough.startTime = new Date('2024-01-01T10:00:00').toISOString();
      mockPlaythrough.addStep({
        passageId: 'start',
        passageTitle: 'Start',
        choiceText: 'Begin',
        timestamp: new Date().toISOString(),
        variables: {},
      });

      mockGetPlaythroughs.mockReturnValue([mockPlaythrough]);
    });

    it('should render action buttons for each playthrough', () => {
      const { container } = render(PlaythroughList);

      const actionButtons = container.querySelectorAll('.btn-icon');
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it('should have view details button', () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]');
      expect(viewButton).toBeTruthy();
    });

    it('should have export button', () => {
      const { container } = render(PlaythroughList);

      const exportButton = container.querySelector('[title="Export"]');
      expect(exportButton).toBeTruthy();
    });

    it('should have delete button', () => {
      const { container } = render(PlaythroughList);

      const deleteButton = container.querySelector('[title="Delete"]');
      expect(deleteButton).toBeTruthy();
    });
  });

  describe('path display', () => {
    beforeEach(() => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.addStep({
        passageId: 'start',
        passageTitle: 'Beginning',
        timestamp: new Date().toISOString(),
        variables: {},
      });
      playthrough.addStep({
        passageId: 'middle',
        passageTitle: 'Middle',
        choiceText: 'Continue',
        timestamp: new Date().toISOString(),
        variables: {},
      });
      playthrough.addStep({
        passageId: 'end',
        passageTitle: 'Ending',
        choiceText: 'Finish',
        timestamp: new Date().toISOString(),
        variables: {},
      });

      mockGetPlaythroughs.mockReturnValue([playthrough]);
    });

    it('should display path preview', () => {
      render(PlaythroughList);

      expect(screen.getByText('Beginning')).toBeTruthy();
      expect(screen.getByText('Middle')).toBeTruthy();
      expect(screen.getByText('Ending')).toBeTruthy();
    });

    it('should show arrows between steps', () => {
      const { container } = render(PlaythroughList);

      const arrows = container.querySelectorAll('.path-arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should truncate long paths', () => {
      const playthrough = new Playthrough({ storyId: 'story1' });

      // Add many steps
      for (let i = 0; i < 10; i++) {
        playthrough.addStep({
          passageId: `step${i}`,
          passageTitle: `Step ${i}`,
          timestamp: new Date().toISOString(),
          variables: {},
        });
      }

      mockGetPlaythroughs.mockReturnValue([playthrough]);

      render(PlaythroughList);

      expect(screen.getByText(/\+\d+ more/)).toBeTruthy();
    });
  });

  describe('delete functionality', () => {
    beforeEach(() => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.id = 'test-playthrough-id';
      playthrough.addStep({
        passageId: 'start',
        passageTitle: 'Start',
        timestamp: new Date().toISOString(),
        variables: {},
      });

      mockGetPlaythroughs.mockReturnValue([playthrough]);
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('should show confirmation dialog when deleting', async () => {
      const { container } = render(PlaythroughList);

      const deleteButton = container.querySelector('[title="Delete"]') as HTMLElement;
      await fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
    });

    it('should delete playthrough when confirmed', async () => {
      const { container } = render(PlaythroughList);

      const deleteButton = container.querySelector('[title="Delete"]') as HTMLElement;
      await fireEvent.click(deleteButton);

      expect(mockDeletePlaythrough).toHaveBeenCalledWith('test-playthrough-id');
    });

    it('should not delete when cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const { container } = render(PlaythroughList);

      const deleteButton = container.querySelector('[title="Delete"]') as HTMLElement;
      await fireEvent.click(deleteButton);

      expect(mockDeletePlaythrough).not.toHaveBeenCalled();
    });
  });

  describe('export functionality', () => {
    beforeEach(() => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.addStep({
        passageId: 'start',
        passageTitle: 'Start',
        timestamp: new Date().toISOString(),
        variables: {},
      });

      mockGetPlaythroughs.mockReturnValue([playthrough]);

      // Mock URL.createObjectURL and related functions
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock document.createElement for anchor element
      const mockClick = vi.fn();
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
          } as any;
        }
        return document.createElement(tag);
      });
    });

    it('should export playthrough as JSON when export is clicked', async () => {
      const { container } = render(PlaythroughList);

      const exportButton = container.querySelector('[title="Export"]') as HTMLElement;
      await fireEvent.click(exportButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('clear all functionality', () => {
    beforeEach(() => {
      const playthrough1 = new Playthrough({ storyId: 'story1' });
      const playthrough2 = new Playthrough({ storyId: 'story1' });

      mockGetPlaythroughs.mockReturnValue([playthrough1, playthrough2]);
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('should show confirmation dialog when clearing all', async () => {
      render(PlaythroughList);

      const clearButton = screen.getByText('🗑️ Clear All');
      await fireEvent.click(clearButton);

      expect(window.confirm).toHaveBeenCalled();
    });

    it('should display number of playthroughs in confirmation', async () => {
      render(PlaythroughList);

      const clearButton = screen.getByText('🗑️ Clear All');
      await fireEvent.click(clearButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('2')
      );
    });

    it('should clear all playthroughs when confirmed', async () => {
      render(PlaythroughList);

      const clearButton = screen.getByText('🗑️ Clear All');
      await fireEvent.click(clearButton);

      expect(mockClearPlaythroughs).toHaveBeenCalledWith('test-story-id');
    });

    it('should not clear when cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(PlaythroughList);

      const clearButton = screen.getByText('🗑️ Clear All');
      await fireEvent.click(clearButton);

      expect(mockClearPlaythroughs).not.toHaveBeenCalled();
    });
  });

  describe('details modal', () => {
    beforeEach(() => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.startTime = new Date('2024-01-01T10:00:00').toISOString();
      playthrough.endTime = new Date('2024-01-01T10:05:00').toISOString();
      playthrough.completed = true;
      playthrough.finalVariables = { health: 100, score: 50 };

      playthrough.addStep({
        passageId: 'start',
        passageTitle: 'Start',
        choiceText: 'Begin',
        timestamp: new Date().toISOString(),
        variables: {},
        timeSpent: 30000,
      });
      playthrough.addStep({
        passageId: 'end',
        passageTitle: 'End',
        timestamp: new Date(Date.now() + 30000).toISOString(),
        variables: {},
        timeSpent: 30000,
      });

      mockGetPlaythroughs.mockReturnValue([playthrough]);
    });

    it('should open details modal when view is clicked', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      expect(screen.getByText('Playthrough Details')).toBeTruthy();
    });

    it('should display overview section in modal', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      expect(screen.getByText('Overview')).toBeTruthy();
      expect(screen.getByText('Started:')).toBeTruthy();
      expect(screen.getByText('Duration:')).toBeTruthy();
    });

    it('should show path taken section', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      expect(screen.getByText(/Path Taken/)).toBeTruthy();
    });

    it('should display steps in order', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      expect(screen.getByText('Start')).toBeTruthy();
      expect(screen.getByText('End')).toBeTruthy();
    });

    it('should show choices made section', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      expect(screen.getByText('Choices Made')).toBeTruthy();
      expect(screen.getByText('Begin')).toBeTruthy();
    });

    it('should display final variables', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      expect(screen.getByText('Final Variables')).toBeTruthy();
      expect(screen.getByText('health:')).toBeTruthy();
      expect(screen.getByText('100')).toBeTruthy();
    });

    it('should close modal when close button is clicked', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      const closeButton = screen.getByText('Close');
      await fireEvent.click(closeButton);

      expect(screen.queryByText('Playthrough Details')).toBeFalsy();
    });

    it('should close modal when X button is clicked', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      const xButton = container.querySelector('.btn-close') as HTMLElement;
      await fireEvent.click(xButton);

      expect(screen.queryByText('Playthrough Details')).toBeFalsy();
    });

    it('should close modal when overlay is clicked', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      const overlay = container.querySelector('.modal-overlay') as HTMLElement;
      await fireEvent.click(overlay);

      expect(screen.queryByText('Playthrough Details')).toBeFalsy();
    });

    it('should have action buttons in modal footer', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      expect(screen.getByText('💾 Export')).toBeTruthy();
      expect(screen.getByText('🗑️ Delete')).toBeTruthy();
      expect(screen.getByText('Close')).toBeTruthy();
    });
  });

  describe('selection state', () => {
    beforeEach(() => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.addStep({
        passageId: 'start',
        passageTitle: 'Start',
        timestamp: new Date().toISOString(),
        variables: {},
      });

      mockGetPlaythroughs.mockReturnValue([playthrough]);
    });

    it('should highlight selected playthrough', async () => {
      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      await fireEvent.click(viewButton);

      const playthroughItem = container.querySelector('.playthrough-item');
      expect(playthroughItem?.classList.contains('selected')).toBe(true);
    });
  });

  describe('formatting helpers', () => {
    it('should format dates correctly', () => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.startTime = new Date('2024-01-01T10:00:00').toISOString();

      mockGetPlaythroughs.mockReturnValue([playthrough]);

      render(PlaythroughList);

      // Should display formatted date
      expect(screen.getByText(/1\/1\/2024/)).toBeTruthy();
    });

    it('should format durations correctly', () => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.startTime = new Date('2024-01-01T10:00:00').toISOString();
      playthrough.endTime = new Date('2024-01-01T11:30:00').toISOString();

      mockGetPlaythroughs.mockReturnValue([playthrough]);

      render(PlaythroughList);

      // Should display formatted duration (like "1h 30m")
      expect(screen.getByText(/h.*m/)).toBeTruthy();
    });
  });

  describe('sorting', () => {
    it('should sort playthroughs by date descending', () => {
      const playthrough1 = new Playthrough({ storyId: 'story1' });
      playthrough1.startTime = new Date('2024-01-01T10:00:00').toISOString();

      const playthrough2 = new Playthrough({ storyId: 'story1' });
      playthrough2.startTime = new Date('2024-01-02T10:00:00').toISOString();

      mockGetPlaythroughs.mockReturnValue([playthrough1, playthrough2]);

      render(PlaythroughList);

      // Most recent should be first
      const dates = screen.getAllByText(/1\/\d+\/2024/);
      expect(dates[0].textContent).toContain('1/2/2024');
    });
  });

  describe('edge cases', () => {
    it('should handle null story gracefully', () => {
      vi.mocked(currentStory.subscribe).mockImplementation((callback) => {
        callback(null);
        return () => {};
      });

      render(PlaythroughList);

      expect(screen.getByText('No playthrough records yet')).toBeTruthy();
    });

    it('should handle playthroughs without end time', () => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.startTime = new Date('2024-01-01T10:00:00').toISOString();
      playthrough.endTime = null;

      mockGetPlaythroughs.mockReturnValue([playthrough]);

      render(PlaythroughList);

      // Should still render without crashing
      expect(screen.getByText(/1\/1\/2024/)).toBeTruthy();
    });

    it('should handle playthroughs without steps', () => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.steps = [];

      mockGetPlaythroughs.mockReturnValue([playthrough]);

      render(PlaythroughList);

      expect(screen.getByText('0 steps')).toBeTruthy();
    });

    it('should handle playthroughs without variables', () => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.finalVariables = {};

      mockGetPlaythroughs.mockReturnValue([playthrough]);

      const { container } = render(PlaythroughList);

      const viewButton = container.querySelector('[title="View details"]') as HTMLElement;
      fireEvent.click(viewButton);

      // Should not show variables section if empty
      expect(screen.queryByText('Final Variables')).toBeFalsy();
    });

    it('should handle singular/plural correctly', () => {
      const playthrough = new Playthrough({ storyId: 'story1' });
      playthrough.addStep({
        passageId: 'start',
        passageTitle: 'Start',
        timestamp: new Date().toISOString(),
        variables: {},
      });

      mockGetPlaythroughs.mockReturnValue([playthrough]);

      render(PlaythroughList);

      expect(screen.getByText('1 record')).toBeTruthy();
      expect(screen.getByText('1 step')).toBeTruthy();
    });
  });
});
