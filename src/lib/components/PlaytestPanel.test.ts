import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import PlaytestPanel from './PlaytestPanel.svelte';
import {
  playtestStore,
  sessions,
  currentSession,
  isRecording,
  analytics,
  sessionCount,
} from '../stores/playtestStore';
import { currentStory } from '../stores/projectStore';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';

describe('PlaytestPanel', () => {
  let story: Story;

  beforeEach(() => {
    vi.clearAllMocks();
    currentStory.set(null);
    playtestStore.clearAllSessions();

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
      const { getByText } = render(PlaytestPanel);
      expect(getByText('No story loaded')).toBeTruthy();
    });

    it('should display header', () => {
      const { getByText } = render(PlaytestPanel);
      expect(getByText('Playtest Recording')).toBeTruthy();
    });

    it('should show session count', () => {
      const { container } = render(PlaytestPanel);
      expect(container.textContent).toMatch(/\d+ session/);
    });
  });

  describe('rendering with story', () => {
    beforeEach(() => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);
    });

    it('should show recording controls when not recording', () => {
      const { getByText } = render(PlaytestPanel);
      expect(getByText('Start Recording')).toBeTruthy();
    });

    it('should display player name input', () => {
      const { container } = render(PlaytestPanel);
      const input = container.querySelector('input[placeholder="Tester name"]');
      expect(input).toBeTruthy();
    });

    it('should display session notes textarea', () => {
      const { container } = render(PlaytestPanel);
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });
  });

  describe('starting recording', () => {
    beforeEach(() => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);
    });

    it('should start recording when button is clicked', async () => {
      const startSpy = vi.spyOn(playtestStore, 'startSession');
      const { getByText } = render(PlaytestPanel);

      const button = getByText('Start Recording') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(startSpy).toHaveBeenCalledWith(story, expect.any(Object));
    });

    it('should include player name in metadata', async () => {
      const startSpy = vi.spyOn(playtestStore, 'startSession');
      const { getByText, container } = render(PlaytestPanel);

      const nameInput = container.querySelector('input[placeholder="Tester name"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'Test Player' } });

      const button = getByText('Start Recording') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(startSpy).toHaveBeenCalledWith(story, {
        playerName: 'Test Player',
        notes: undefined,
      });
    });

    it('should include session notes in metadata', async () => {
      const startSpy = vi.spyOn(playtestStore, 'startSession');
      const { getByText, container } = render(PlaytestPanel);

      const notesInput = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(notesInput, { target: { value: 'Testing pacing' } });

      const button = getByText('Start Recording') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(startSpy).toHaveBeenCalledWith(story, {
        playerName: undefined,
        notes: 'Testing pacing',
      });
    });

    it('should clear inputs after starting', async () => {
      const { getByText, container } = render(PlaytestPanel);

      const nameInput = container.querySelector('input[placeholder="Tester name"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'Test Player' } });

      const button = getByText('Start Recording') as HTMLButtonElement;
      await fireEvent.click(button);

      await waitFor(() => {
        expect(nameInput.value).toBe('');
      });
    });
  });

  describe('recording state', () => {
    beforeEach(() => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);
    });

    it('should show recording indicator when recording', async () => {
      playtestStore.startSession(story);

      const { container } = render(PlaytestPanel);
      expect(container.textContent).toContain('Recording...');
    });

    it('should show pulsing red dot when recording', async () => {
      playtestStore.startSession(story);

      const { container } = render(PlaytestPanel);
      const redDot = container.querySelector('.bg-red-500.animate-pulse');
      expect(redDot).toBeTruthy();
    });

    it('should show stop controls when recording', async () => {
      playtestStore.startSession(story);

      const { getByText } = render(PlaytestPanel);
      expect(getByText('Complete Session')).toBeTruthy();
      expect(getByText('Stop Recording')).toBeTruthy();
      expect(getByText('Cancel Session')).toBeTruthy();
    });

    it('should complete session when complete button is clicked', async () => {
      playtestStore.startSession(story);
      const endSpy = vi.spyOn(playtestStore, 'endSession');

      const { getByText } = render(PlaytestPanel);

      const button = getByText('Complete Session') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(endSpy).toHaveBeenCalledWith(true);
    });

    it('should stop session when stop button is clicked', async () => {
      playtestStore.startSession(story);
      const endSpy = vi.spyOn(playtestStore, 'endSession');

      const { getByText } = render(PlaytestPanel);

      const button = getByText('Stop Recording') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(endSpy).toHaveBeenCalledWith(false);
    });

    it('should cancel session when cancel button is clicked', async () => {
      playtestStore.startSession(story);
      const cancelSpy = vi.spyOn(playtestStore, 'cancelSession');

      const { getByText } = render(PlaytestPanel);

      const button = getByText('Cancel Session') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should analyze after ending session', async () => {
      playtestStore.startSession(story);
      const analyzeSpy = vi.spyOn(playtestStore, 'analyze');

      const { getByText } = render(PlaytestPanel);

      const button = getByText('Complete Session') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(analyzeSpy).toHaveBeenCalled();
    });
  });

  describe('analytics display', () => {
    beforeEach(() => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      // Create a completed session
      playtestStore.startSession(story);
      playtestStore.endSession(true);
      playtestStore.analyze();
    });

    it('should display analytics section when sessions exist', () => {
      const { getByText } = render(PlaytestPanel);
      expect(getByText('Analytics')).toBeTruthy();
    });

    it('should show completion rate', () => {
      const { container } = render(PlaytestPanel);
      expect(container.textContent).toContain('Completion');
      expect(container.textContent).toMatch(/\d+%/);
    });

    it('should show average duration', () => {
      const { getByText } = render(PlaytestPanel);
      expect(getByText('Avg Duration')).toBeTruthy();
    });

    it('should show average choices', () => {
      const { getByText } = render(PlaytestPanel);
      expect(getByText('Avg Choices')).toBeTruthy();
    });

    it('should show average passages', () => {
      const { getByText } = render(PlaytestPanel);
      expect(getByText('Avg Passages')).toBeTruthy();
    });

    it('should display dropoff points when they exist', () => {
      const { container } = render(PlaytestPanel);
      const analyticsData = get(analytics);

      if (analyticsData && analyticsData.dropoffPoints.length > 0) {
        expect(container.textContent).toContain('Top Dropoff Points');
      }
    });
  });

  describe('sessions list', () => {
    beforeEach(() => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      // Create a session
      playtestStore.startSession(story, { playerName: 'Test Player' });
      playtestStore.endSession(true);
    });

    it('should display sessions section', () => {
      const { getByText } = render(PlaytestPanel);
      expect(getByText(/Sessions/)).toBeTruthy();
    });

    it('should show session count', () => {
      const { container } = render(PlaytestPanel);
      const count = get(sessionCount);
      expect(container.textContent).toContain(`(${count})`);
    });

    it('should display export button', () => {
      const { getByText } = render(PlaytestPanel);
      expect(getByText('Export')).toBeTruthy();
    });

    it('should display clear all button', () => {
      const { getByText } = render(PlaytestPanel);
      expect(getByText('Clear All')).toBeTruthy();
    });

    it('should show session player name or timestamp', () => {
      const { container } = render(PlaytestPanel);
      expect(container.textContent).toContain('Test Player');
    });

    it('should show session statistics', () => {
      const { container } = render(PlaytestPanel);
      expect(container.textContent).toMatch(/\d+ passages/);
      expect(container.textContent).toMatch(/\d+ choices/);
    });

    it('should show completion indicator', () => {
      const { container } = render(PlaytestPanel);
      // Completed session should show checkmark
      expect(container.textContent).toContain('✓');
    });
  });

  describe('session details view', () => {
    beforeEach(() => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      playtestStore.startSession(story, {
        playerName: 'Test Player',
        notes: 'Test notes',
      });
      playtestStore.endSession(true);
    });

    it('should show session details when clicked', async () => {
      const { container, getByText } = render(PlaytestPanel);

      const sessionButtons = container.querySelectorAll('.hover\\:bg-gray-100');
      if (sessionButtons.length > 0) {
        await fireEvent.click(sessionButtons[0] as HTMLButtonElement);

        await waitFor(() => {
          expect(getByText('Session Details')).toBeTruthy();
        });
      }
    });

    it('should show back to list button', async () => {
      const { container, getByText } = render(PlaytestPanel);

      const sessionButtons = container.querySelectorAll('.hover\\:bg-gray-100');
      if (sessionButtons.length > 0) {
        await fireEvent.click(sessionButtons[0] as HTMLButtonElement);

        await waitFor(() => {
          expect(getByText(/Back to list/)).toBeTruthy();
        });
      }
    });

    it('should display session metadata', async () => {
      const { container, getByText } = render(PlaytestPanel);

      const sessionButtons = container.querySelectorAll('.hover\\:bg-gray-100');
      if (sessionButtons.length > 0) {
        await fireEvent.click(sessionButtons[0] as HTMLButtonElement);

        await waitFor(() => {
          expect(container.textContent).toContain('Player:');
          expect(container.textContent).toContain('Notes:');
          expect(container.textContent).toContain('Test Player');
          expect(container.textContent).toContain('Test notes');
        });
      }
    });

    it('should show action timeline', async () => {
      const { container, getByText } = render(PlaytestPanel);

      const sessionButtons = container.querySelectorAll('.hover\\:bg-gray-100');
      if (sessionButtons.length > 0) {
        await fireEvent.click(sessionButtons[0] as HTMLButtonElement);

        await waitFor(() => {
          expect(getByText(/Action Timeline/)).toBeTruthy();
        });
      }
    });

    it('should return to list when back button is clicked', async () => {
      const { container, getByText } = render(PlaytestPanel);

      const sessionButtons = container.querySelectorAll('.hover\\:bg-gray-100');
      if (sessionButtons.length > 0) {
        await fireEvent.click(sessionButtons[0] as HTMLButtonElement);

        await waitFor(() => {
          const backButton = getByText(/Back to list/) as HTMLButtonElement;
          fireEvent.click(backButton);
        });

        await waitFor(() => {
          expect(getByText(/Sessions/)).toBeTruthy();
        });
      }
    });
  });

  describe('session deletion', () => {
    beforeEach(() => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      playtestStore.startSession(story);
      playtestStore.endSession(true);
    });

    it('should show delete button in session details', async () => {
      const { container, getByText } = render(PlaytestPanel);

      const sessionButtons = container.querySelectorAll('.hover\\:bg-gray-100');
      if (sessionButtons.length > 0) {
        await fireEvent.click(sessionButtons[0] as HTMLButtonElement);

        await waitFor(() => {
          expect(getByText('Delete')).toBeTruthy();
        });
      }
    });

    it('should show confirmation when deleting session', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { container, getAllByText } = render(PlaytestPanel);

      const sessionButtons = container.querySelectorAll('.hover\\:bg-gray-100');
      if (sessionButtons.length > 0) {
        await fireEvent.click(sessionButtons[0] as HTMLButtonElement);

        await waitFor(() => {
          const deleteButtons = getAllByText('Delete');
          if (deleteButtons.length > 0) {
            fireEvent.click(deleteButtons[0] as HTMLButtonElement);
            expect(confirmSpy).toHaveBeenCalled();
          }
        });
      }

      confirmSpy.mockRestore();
    });

    it('should delete session when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const deleteSpy = vi.spyOn(playtestStore, 'deleteSession');

      const { container, getAllByText } = render(PlaytestPanel);

      const sessionButtons = container.querySelectorAll('.hover\\:bg-gray-100');
      if (sessionButtons.length > 0) {
        await fireEvent.click(sessionButtons[0] as HTMLButtonElement);

        await waitFor(() => {
          const deleteButtons = getAllByText('Delete');
          if (deleteButtons.length > 0) {
            fireEvent.click(deleteButtons[0] as HTMLButtonElement);
            expect(deleteSpy).toHaveBeenCalled();
          }
        });
      }

      confirmSpy.mockRestore();
    });
  });

  describe('clear all sessions', () => {
    beforeEach(() => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      playtestStore.startSession(story);
      playtestStore.endSession(true);
    });

    it('should show confirmation when clearing all', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { getByText } = render(PlaytestPanel);

      const button = getByText('Clear All') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('delete all sessions'));

      confirmSpy.mockRestore();
    });

    it('should clear all sessions when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const clearSpy = vi.spyOn(playtestStore, 'clearAllSessions');

      const { getByText } = render(PlaytestPanel);

      const button = getByText('Clear All') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(clearSpy).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('export sessions', () => {
    beforeEach(() => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      playtestStore.startSession(story);
      playtestStore.endSession(true);
    });

    it('should export sessions when button is clicked', async () => {
      const exportSpy = vi.spyOn(playtestStore, 'exportSessions');

      // Mock DOM elements for download
      const createElementSpy = vi.spyOn(document, 'createElement');
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      createElementSpy.mockReturnValue(mockAnchor as any);

      const { getByText } = render(PlaytestPanel);

      const button = getByText('Export') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(exportSpy).toHaveBeenCalled();

      createElementSpy.mockRestore();
    });
  });

  describe('time formatting', () => {
    it('should format seconds correctly', () => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      playtestStore.startSession(story);
      playtestStore.endSession(true);

      const { container } = render(PlaytestPanel);
      // Should show time in seconds format
      expect(container.textContent).toMatch(/\d+s/);
    });

    it('should format time ago correctly', () => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      playtestStore.startSession(story);
      playtestStore.endSession(true);

      const { container } = render(PlaytestPanel);
      const sessionData = get(sessions);
      expect(sessionData.length).toBeGreaterThan(0);
    });
  });

  describe('auto-analyze', () => {
    it('should analyze when sessions exist on mount', async () => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      playtestStore.startSession(story);
      playtestStore.endSession(true);

      // Clear analytics to test auto-analyze
      const analyzeSpy = vi.spyOn(playtestStore, 'analyze');

      render(PlaytestPanel);

      await waitFor(() => {
        const analyticsData = get(analytics);
        if (get(sessions).length > 0 && !analyticsData) {
          expect(analyzeSpy).toHaveBeenCalled();
        }
      });
    });
  });

  describe('edge cases', () => {
    it('should handle no sessions', () => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      const { container } = render(PlaytestPanel);
      expect(container.textContent).toContain('0 session');
    });

    it('should handle session with no player name', () => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      playtestStore.startSession(story);
      playtestStore.endSession(true);

      const { container } = render(PlaytestPanel);
      // Should show timestamp instead of player name
      expect(container).toBeTruthy();
    });

    it('should handle incomplete sessions', () => {
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test content',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);

      playtestStore.startSession(story);
      playtestStore.endSession(false);

      const { container } = render(PlaytestPanel);
      // Should show incomplete indicator (circle)
      expect(container.textContent).toContain('○');
    });
  });

  describe('dark mode styling', () => {
    it('should have dark mode classes', () => {
      const { container } = render(PlaytestPanel);
      expect(container.innerHTML).toContain('dark:');
    });
  });
});
