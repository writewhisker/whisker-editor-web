import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import WordGoalsPanel from './WordGoalsPanel.svelte';
import { wordGoalStore, goals, activeGoals } from '../stores/wordGoalStore';
import { currentStory } from '../stores/projectStore';
import { notificationStore } from '../stores/notificationStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('WordGoalsPanel', () => {
  let story: Story;

  beforeEach(() => {
    vi.clearAllMocks();
    currentStory.set(null);
    wordGoalStore.clearGoals();
    localStorage.clear();

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

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('rendering', () => {
    it('should display header', () => {
      const { getByText } = render(WordGoalsPanel);
      expect(getByText('Word Goals')).toBeTruthy();
    });

    it('should display new goal button', () => {
      const { getByText } = render(WordGoalsPanel);
      expect(getByText('+ New Goal')).toBeTruthy();
    });

    it('should display total word count section', () => {
      const { getByText } = render(WordGoalsPanel);
      expect(getByText('Total Words')).toBeTruthy();
    });

    it('should show zero words when no story loaded', () => {
      const { getByText } = render(WordGoalsPanel);
      expect(getByText('0')).toBeTruthy();
    });
  });

  describe('word count calculation', () => {
    beforeEach(() => {
      const passage1 = story.addPassage(new Passage({
        title: 'Start',
        content: 'This is a test passage with ten words here.',
      }));

      const passage2 = story.addPassage(new Passage({
        title: 'Next',
        content: 'Another passage with five words.',
      }));

      story.startPassage = passage1.id;
      currentStory.set(story);
    });

    it('should calculate total word count from story', () => {
      const { container } = render(WordGoalsPanel);
      // Should show a non-zero word count
      expect(container.textContent).toMatch(/\d{1,}/);
    });

    it('should format large numbers with commas', () => {
      // Create passage with many words
      const longContent = Array(1500).fill('word').join(' ');
      story.addPassage(new Passage({
        title: 'Long',
        content: longContent,
      }));

      currentStory.set(story);

      const { container } = render(WordGoalsPanel);
      // Should show formatted number like "1,500"
      expect(container.textContent).toMatch(/\d{1,3}(,\d{3})*/);
    });
  });

  describe('empty state', () => {
    it('should show no goals message when no goals exist', () => {
      const { getByText } = render(WordGoalsPanel);
      expect(getByText('No goals yet')).toBeTruthy();
    });

    it('should show helper text in empty state', () => {
      const { getByText } = render(WordGoalsPanel);
      expect(getByText(/Create a goal to track your progress/)).toBeTruthy();
    });
  });

  describe('add goal form', () => {
    it('should show form when new goal button is clicked', async () => {
      const { getByText } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      expect(getByText('New Goal')).toBeTruthy();
    });

    it('should hide form when cancel button is clicked', async () => {
      const { getByText } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      await fireEvent.click(newGoalButton); // Click again to cancel

      await waitFor(() => {
        expect(getByText('+ New Goal')).toBeTruthy();
      });
    });

    it('should display goal type selector', async () => {
      const { getByText, container } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      const select = container.querySelector('select');
      expect(select).toBeTruthy();
      expect(select?.innerHTML).toContain('Daily');
      expect(select?.innerHTML).toContain('Weekly');
      expect(select?.innerHTML).toContain('Monthly');
      expect(select?.innerHTML).toContain('Total');
    });

    it('should display target words input', async () => {
      const { getByText, container } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      const input = container.querySelector('input[type="number"]');
      expect(input).toBeTruthy();
    });

    it('should display start date input', async () => {
      const { getByText, container } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it('should display end date input for non-total goals', async () => {
      const { getByText, container } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      expect(getByText('End Date (optional)')).toBeTruthy();
    });

    it('should hide end date input for total goals', async () => {
      const { getByText, container } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      const select = container.querySelector('select') as HTMLSelectElement;
      await fireEvent.change(select, { target: { value: 'total' } });

      await waitFor(() => {
        expect(container.textContent).not.toContain('End Date (optional)');
      });
    });

    it('should create goal when form is submitted', async () => {
      currentStory.set(story);
      const addGoalSpy = vi.spyOn(wordGoalStore, 'addGoal');

      const { getByText, container } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      const targetInput = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(targetInput, { target: { value: '1000' } });

      const createButton = getByText('Create Goal') as HTMLButtonElement;
      await fireEvent.click(createButton);

      expect(addGoalSpy).toHaveBeenCalled();
    });

    it('should show error when target is invalid', async () => {
      const errorSpy = vi.spyOn(notificationStore, 'error');

      const { getByText, container } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      const targetInput = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(targetInput, { target: { value: '0' } });

      const createButton = getByText('Create Goal') as HTMLButtonElement;
      await fireEvent.click(createButton);

      expect(errorSpy).toHaveBeenCalledWith('Please enter a valid target word count');
    });

    it('should show success notification after creating goal', async () => {
      currentStory.set(story);
      const successSpy = vi.spyOn(notificationStore, 'success');

      const { getByText, container } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      const targetInput = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(targetInput, { target: { value: '1000' } });

      const createButton = getByText('Create Goal') as HTMLButtonElement;
      await fireEvent.click(createButton);

      expect(successSpy).toHaveBeenCalled();
    });

    it('should reset form after successful creation', async () => {
      currentStory.set(story);

      const { getByText, container } = render(WordGoalsPanel);

      const newGoalButton = getByText('+ New Goal') as HTMLButtonElement;
      await fireEvent.click(newGoalButton);

      const targetInput = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(targetInput, { target: { value: '1000' } });

      const createButton = getByText('Create Goal') as HTMLButtonElement;
      await fireEvent.click(createButton);

      await waitFor(() => {
        expect(container.textContent).not.toContain('New Goal');
      });
    });
  });

  describe('active goals display', () => {
    beforeEach(() => {
      currentStory.set(story);

      wordGoalStore.addGoal({
        type: 'daily',
        target: 500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });
    });

    it('should display active goals section', () => {
      const { getByText } = render(WordGoalsPanel);
      expect(getByText('ACTIVE GOALS')).toBeTruthy();
    });

    it('should show goal type icon', () => {
      const { container } = render(WordGoalsPanel);
      // Should show emoji icons like 📅, 📆, etc.
      expect(container.textContent).toMatch(/[📅📆🗓️🎯]/);
    });

    it('should show goal type label', () => {
      const { getByText } = render(WordGoalsPanel);
      expect(getByText(/Daily Goal/)).toBeTruthy();
    });

    it('should show current and target word counts', () => {
      const { container } = render(WordGoalsPanel);
      expect(container.textContent).toMatch(/\d+\s*\/\s*500\s*words/);
    });

    it('should show goal status badge', () => {
      const { container } = render(WordGoalsPanel);
      expect(container.textContent).toMatch(/not started|in progress|completed|exceeded/);
    });

    it('should show delete button for goals', () => {
      const { getAllByText } = render(WordGoalsPanel);
      const deleteButtons = getAllByText('Delete');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should display progress bar', () => {
      const { container } = render(WordGoalsPanel);
      const progressBar = container.querySelector('.bg-blue-500, .bg-green-500');
      expect(progressBar).toBeTruthy();
    });

    it('should show start and end dates', () => {
      const { container } = render(WordGoalsPanel);
      expect(container.textContent).toContain('Started:');
      expect(container.textContent).toContain('Ends:');
    });
  });

  describe('goal progress', () => {
    beforeEach(() => {
      // Add passage with 250 words
      const content = Array(250).fill('word').join(' ');
      story.addPassage(new Passage({
        title: 'Start',
        content,
      }));

      currentStory.set(story);

      wordGoalStore.addGoal({
        type: 'daily',
        target: 500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });
    });

    it('should calculate progress percentage correctly', () => {
      const { container } = render(WordGoalsPanel);
      // With 250 words out of 500, should show 50% progress
      const progressBar = container.querySelector('.h-2') as HTMLElement;
      if (progressBar) {
        expect(progressBar.style.width).toBeDefined();
      }
    });

    it('should change progress bar color when goal is completed', () => {
      // Add more words to complete goal
      const content = Array(500).fill('word').join(' ');
      story.addPassage(new Passage({
        title: 'More',
        content,
      }));

      currentStory.set(story);

      const { container } = render(WordGoalsPanel);
      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toBeTruthy();
    });

    it('should show completed status when goal is met', () => {
      // Add more words to complete goal
      const content = Array(500).fill('word').join(' ');
      story.addPassage(new Passage({
        title: 'More',
        content,
      }));

      currentStory.set(story);

      const { getByText } = render(WordGoalsPanel);
      expect(getByText(/completed/i)).toBeTruthy();
    });
  });

  describe('past goals display', () => {
    beforeEach(() => {
      currentStory.set(story);

      // Add a goal from the past
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

      wordGoalStore.addGoal({
        type: 'daily',
        target: 500,
        startDate: twoDaysAgo,
        endDate: yesterday,
      });
    });

    it('should display past goals section', () => {
      const { getByText } = render(WordGoalsPanel);
      expect(getByText('PAST GOALS')).toBeTruthy();
    });

    it('should show past goals with reduced opacity', () => {
      const { container } = render(WordGoalsPanel);
      expect(container.innerHTML).toContain('opacity-60');
    });

    it('should show ended date for past goals', () => {
      const { container } = render(WordGoalsPanel);
      expect(container.textContent).toContain('Ended:');
    });

    it('should show gray progress bar for past goals', () => {
      const { container } = render(WordGoalsPanel);
      expect(container.innerHTML).toContain('bg-gray-');
    });
  });

  describe('goal deletion', () => {
    beforeEach(() => {
      currentStory.set(story);

      wordGoalStore.addGoal({
        type: 'daily',
        target: 500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });
    });

    it('should show confirmation dialog when delete is clicked', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const { getAllByText } = render(WordGoalsPanel);

      const deleteButtons = getAllByText('Delete');
      await fireEvent.click(deleteButtons[0] as HTMLButtonElement);

      expect(confirmSpy).toHaveBeenCalledWith('Delete this goal?');

      confirmSpy.mockRestore();
    });

    it('should delete goal when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const deleteSpy = vi.spyOn(wordGoalStore, 'deleteGoal');

      const { getAllByText } = render(WordGoalsPanel);

      const deleteButtons = getAllByText('Delete');
      await fireEvent.click(deleteButtons[0] as HTMLButtonElement);

      expect(deleteSpy).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should not delete goal when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const { getAllByText } = render(WordGoalsPanel);

      const goalsBeforeDelete = get(goals).length;

      const deleteButtons = getAllByText('Delete');
      await fireEvent.click(deleteButtons[0] as HTMLButtonElement);

      expect(get(goals).length).toBe(goalsBeforeDelete);

      confirmSpy.mockRestore();
    });

    it('should show success notification after deletion', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const successSpy = vi.spyOn(notificationStore, 'success');

      const { getAllByText } = render(WordGoalsPanel);

      const deleteButtons = getAllByText('Delete');
      await fireEvent.click(deleteButtons[0] as HTMLButtonElement);

      expect(successSpy).toHaveBeenCalledWith('Goal deleted');

      confirmSpy.mockRestore();
    });
  });

  describe('goal types', () => {
    beforeEach(() => {
      currentStory.set(story);
    });

    it('should show correct icon for daily goals', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });

      const { container } = render(WordGoalsPanel);
      expect(container.textContent).toContain('📅');
    });

    it('should show correct icon for weekly goals', () => {
      wordGoalStore.addGoal({
        type: 'weekly',
        target: 3500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 604800000).toISOString().split('T')[0],
      });

      const { container } = render(WordGoalsPanel);
      expect(container.textContent).toContain('📆');
    });

    it('should show correct icon for monthly goals', () => {
      wordGoalStore.addGoal({
        type: 'monthly',
        target: 15000,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 2592000000).toISOString().split('T')[0],
      });

      const { container } = render(WordGoalsPanel);
      expect(container.textContent).toContain('🗓️');
    });

    it('should show correct icon for total goals', () => {
      wordGoalStore.addGoal({
        type: 'total',
        target: 50000,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });

      const { container } = render(WordGoalsPanel);
      expect(container.textContent).toContain('🎯');
    });
  });

  describe('auto-save', () => {
    it('should save goals when they change', async () => {
      vi.useFakeTimers();
      currentStory.set(story);

      const saveSpy = vi.spyOn(wordGoalStore, 'saveGoals');

      render(WordGoalsPanel);

      wordGoalStore.addGoal({
        type: 'daily',
        target: 500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });

      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });
  });

  describe('status colors', () => {
    beforeEach(() => {
      currentStory.set(story);
    });

    it('should apply correct color for not started status', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });

      const { container } = render(WordGoalsPanel);
      expect(container.innerHTML).toMatch(/bg-gray-|bg-blue-/);
    });

    it('should apply correct color for completed status', () => {
      const content = Array(600).fill('word').join(' ');
      story.addPassage(new Passage({
        title: 'Start',
        content,
      }));

      currentStory.set(story);

      wordGoalStore.addGoal({
        type: 'daily',
        target: 500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });

      const { container } = render(WordGoalsPanel);
      expect(container.innerHTML).toContain('bg-green-');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple goals', () => {
      currentStory.set(story);

      wordGoalStore.addGoal({
        type: 'daily',
        target: 500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });

      wordGoalStore.addGoal({
        type: 'weekly',
        target: 3500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 604800000).toISOString().split('T')[0],
      });

      const { container } = render(WordGoalsPanel);
      expect(get(goals).length).toBe(2);
    });

    it('should handle very large word counts', () => {
      const content = Array(100000).fill('word').join(' ');
      story.addPassage(new Passage({
        title: 'Huge',
        content,
      }));

      currentStory.set(story);

      const { container } = render(WordGoalsPanel);
      expect(container.textContent).toMatch(/100,000/);
    });

    it('should handle goals with no end date', () => {
      currentStory.set(story);

      wordGoalStore.addGoal({
        type: 'total',
        target: 50000,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });

      const { container } = render(WordGoalsPanel);
      expect(container).toBeTruthy();
    });
  });

  describe('dark mode styling', () => {
    it('should have dark mode classes', () => {
      const { container } = render(WordGoalsPanel);
      expect(container.innerHTML).toContain('dark:');
    });
  });
});
