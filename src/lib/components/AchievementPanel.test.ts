import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import AchievementPanel from './AchievementPanel.svelte';
import { achievementStore, achievements, categories, totalPoints } from '../stores/achievementStore';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('AchievementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset achievement store
    const allAchievements = get(achievements);
    allAchievements.forEach(ach => achievementStore.deleteAchievement(ach.id));
  });

  afterEach(() => {
    // Clean up
    const allAchievements = get(achievements);
    allAchievements.forEach(ach => achievementStore.deleteAchievement(ach.id));
  });

  describe('rendering', () => {
    it('should render panel with title', () => {
      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('Achievements');
    });

    it('should show achievement count and total points', () => {
      const { container } = render(AchievementPanel);

      expect(container.textContent).toMatch(/0 achievements/);
      expect(container.textContent).toMatch(/0 total points/);
    });

    it('should show add button in list mode', () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add');
      expect(addButton).toBeTruthy();
    });

    it('should show generate code button in list mode', () => {
      const { container } = render(AchievementPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code');
      expect(generateButton).toBeTruthy();
    });

    it('should show empty state when no achievements', () => {
      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('No achievements yet');
      expect(container.textContent).toContain('Click "+ Add" to create one');
    });

    it('should disable generate code button when no achievements', () => {
      const { container } = render(AchievementPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code') as HTMLButtonElement;

      expect(generateButton.disabled).toBe(true);
    });
  });

  describe('add achievement', () => {
    it('should switch to edit mode when add button clicked', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      expect(container.textContent).toContain('Title *');
      expect(container.textContent).toContain('Description');
      expect(container.textContent).toContain('Icon');
      expect(container.textContent).toContain('Rarity');
    });

    it('should show save and cancel buttons in edit mode', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      expect(container.textContent).toContain('Cancel');
      expect(container.textContent).toContain('Save');
    });

    it('should have empty form fields when adding', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      expect(titleInput.value).toBe('');
    });

    it('should disable save button when title is empty', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const saveButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Save') as HTMLButtonElement;

      expect(saveButton.disabled).toBe(true);
    });

    it('should enable save button when title is filled', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      await fireEvent.input(titleInput, { target: { value: 'Test Achievement' } });

      const saveButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Save') as HTMLButtonElement;

      expect(saveButton.disabled).toBe(false);
    });

    it('should save achievement and return to list', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      await fireEvent.input(titleInput, { target: { value: 'Test Achievement' } });

      const saveButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Save') as HTMLButtonElement;

      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Test Achievement');
        expect(container.textContent).toContain('1 achievements');
      });
    });

    it('should cancel add and return to list', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const cancelButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Cancel') as HTMLButtonElement;

      await fireEvent.click(cancelButton);

      expect(container.textContent).toContain('No achievements yet');
    });
  });

  describe('achievement form fields', () => {
    it('should have all trigger type options', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      expect(container.textContent).toContain('Visit Passage');
      expect(container.textContent).toContain('Variable Value');
      expect(container.textContent).toContain('Make Choice');
      expect(container.textContent).toContain('Visit X Passages');
      expect(container.textContent).toContain('Reach Ending');
    });

    it('should have all rarity options', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      expect(container.textContent).toContain('Common (10 pts)');
      expect(container.textContent).toContain('Uncommon (25 pts)');
      expect(container.textContent).toContain('Rare (50 pts)');
      expect(container.textContent).toContain('Epic (100 pts)');
      expect(container.textContent).toContain('Legendary (250 pts)');
    });

    it('should show category options', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const categorySelect = Array.from(container.querySelectorAll('select'))
        .find(select => select.previousElementSibling?.textContent === 'Category') as HTMLSelectElement;

      expect(categorySelect).toBeTruthy();
    });

    it('should have hidden checkbox', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const hiddenCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(hiddenCheckbox).toBeTruthy();
      expect(container.textContent).toContain('Hidden until unlocked');
    });

    it('should show passage input for passage_visit trigger', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const triggerSelect = Array.from(container.querySelectorAll('select'))
        .find(select => select.previousElementSibling?.textContent?.includes('Unlock Trigger')) as HTMLSelectElement;

      await fireEvent.change(triggerSelect, { target: { value: 'passage_visit' } });

      const passageInput = container.querySelector('input[placeholder="Passage ID"]');
      expect(passageInput).toBeTruthy();
    });

    it('should show variable inputs for variable_value trigger', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const triggerSelect = Array.from(container.querySelectorAll('select'))
        .find(select => select.previousElementSibling?.textContent?.includes('Unlock Trigger')) as HTMLSelectElement;

      await fireEvent.change(triggerSelect, { target: { value: 'variable_value' } });

      const variableInput = container.querySelector('input[placeholder="Variable name"]');
      const valueInput = container.querySelector('input[placeholder="Value"]');

      expect(variableInput).toBeTruthy();
      expect(valueInput).toBeTruthy();
    });

    it('should show count input for passage_count trigger', async () => {
      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      await fireEvent.click(addButton);

      const triggerSelect = Array.from(container.querySelectorAll('select'))
        .find(select => select.previousElementSibling?.textContent?.includes('Unlock Trigger')) as HTMLSelectElement;

      await fireEvent.change(triggerSelect, { target: { value: 'passage_count' } });

      const countInput = container.querySelector('input[type="number"]');
      expect(countInput).toBeTruthy();
    });
  });

  describe('achievement list', () => {
    beforeEach(() => {
      achievementStore.addAchievement({
        title: 'Test Achievement',
        description: 'Test description',
        icon: '🏆',
        rarity: 'common',
        points: 10,
        hidden: false,
        category: 'Story',
        trigger: {
          type: 'passage_visit',
          passageId: 'test-passage',
        },
      });
    });

    it('should display achievement in list', () => {
      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('Test Achievement');
      expect(container.textContent).toContain('Test description');
      expect(container.textContent).toContain('🏆');
      expect(container.textContent).toContain('common');
    });

    it('should show achievement points', () => {
      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('10 points');
    });

    it('should show achievement trigger type', () => {
      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('passage_visit');
    });

    it('should show hidden indicator for hidden achievements', () => {
      achievementStore.addAchievement({
        title: 'Secret Achievement',
        description: 'Secret',
        icon: '🔒',
        rarity: 'rare',
        points: 50,
        hidden: true,
        category: 'Story',
        trigger: {
          type: 'passage_visit',
          passageId: 'secret',
        },
      });

      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('Hidden');
    });

    it('should have edit button for each achievement', () => {
      const { container } = render(AchievementPanel);

      const editButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Edit');
      expect(editButton).toBeTruthy();
    });

    it('should have delete button for each achievement', () => {
      const { container } = render(AchievementPanel);

      const deleteButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Delete');
      expect(deleteButton).toBeTruthy();
    });

    it('should update total points when achievement added', () => {
      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('10 total points');
    });

    it('should show correct rarity styling', () => {
      const { container } = render(AchievementPanel);

      const rarityBadge = container.querySelector('.bg-gray-100');
      expect(rarityBadge).toBeTruthy();
    });
  });

  describe('edit achievement', () => {
    beforeEach(() => {
      achievementStore.addAchievement({
        title: 'Test Achievement',
        description: 'Test description',
        icon: '🏆',
        rarity: 'common',
        points: 10,
        hidden: false,
        category: 'Story',
        trigger: {
          type: 'passage_visit',
          passageId: 'test-passage',
        },
      });
    });

    it('should populate form when editing', async () => {
      const { container } = render(AchievementPanel);

      const editButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Edit') as HTMLButtonElement;

      await fireEvent.click(editButton);

      const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      expect(titleInput.value).toBe('Test Achievement');
    });

    it('should save edited achievement', async () => {
      const { container } = render(AchievementPanel);

      const editButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Edit') as HTMLButtonElement;

      await fireEvent.click(editButton);

      const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      await fireEvent.input(titleInput, { target: { value: 'Updated Achievement' } });

      const saveButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Save') as HTMLButtonElement;

      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Updated Achievement');
      });
    });

    it('should cancel edit and revert changes', async () => {
      const { container } = render(AchievementPanel);

      const editButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Edit') as HTMLButtonElement;

      await fireEvent.click(editButton);

      const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      await fireEvent.input(titleInput, { target: { value: 'Changed' } });

      const cancelButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Cancel') as HTMLButtonElement;

      await fireEvent.click(cancelButton);

      expect(container.textContent).toContain('Test Achievement');
      expect(container.textContent).not.toContain('Changed');
    });
  });

  describe('delete achievement', () => {
    beforeEach(() => {
      achievementStore.addAchievement({
        title: 'Test Achievement',
        description: 'Test description',
        icon: '🏆',
        rarity: 'common',
        points: 10,
        hidden: false,
        category: 'Story',
        trigger: {
          type: 'passage_visit',
          passageId: 'test-passage',
        },
      });
    });

    it('should show confirmation dialog when delete clicked', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { container } = render(AchievementPanel);

      const deleteButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Delete') as HTMLButtonElement;

      await fireEvent.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Delete this achievement?');

      confirmSpy.mockRestore();
    });

    it('should delete achievement when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { container } = render(AchievementPanel);

      const deleteButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Delete') as HTMLButtonElement;

      await fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(container.textContent).not.toContain('Test Achievement');
        expect(container.textContent).toContain('No achievements yet');
      });

      confirmSpy.mockRestore();
    });

    it('should not delete when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { container } = render(AchievementPanel);

      const deleteButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Delete') as HTMLButtonElement;

      await fireEvent.click(deleteButton);

      expect(container.textContent).toContain('Test Achievement');

      confirmSpy.mockRestore();
    });
  });

  describe('code generation', () => {
    beforeEach(() => {
      achievementStore.addAchievement({
        title: 'Test Achievement',
        description: 'Test description',
        icon: '🏆',
        rarity: 'common',
        points: 10,
        hidden: false,
        category: 'Story',
        trigger: {
          type: 'passage_visit',
          passageId: 'test-passage',
        },
      });
    });

    it('should switch to code view when generate clicked', async () => {
      const { container } = render(AchievementPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      expect(container.textContent).toContain('Types');
      expect(container.textContent).toContain('Storage & Definitions');
      expect(container.textContent).toContain('Check Function');
      expect(container.textContent).toContain('Unlock Function');
    });

    it('should show back and download buttons in code view', async () => {
      const { container } = render(AchievementPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      expect(container.textContent).toContain('Back');
      expect(container.textContent).toContain('Download');
    });

    it('should return to list when back clicked', async () => {
      const { container } = render(AchievementPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      const backButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Back') as HTMLButtonElement;

      await fireEvent.click(backButton);

      expect(container.textContent).toContain('Test Achievement');
      expect(container.textContent).not.toContain('Types');
    });

    it('should have copy buttons for each code section', async () => {
      const { container } = render(AchievementPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      const copyButtons = Array.from(container.querySelectorAll('button'))
        .filter(btn => btn.textContent?.includes('Copy'));

      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should copy code when copy button clicked', async () => {
      const { container } = render(AchievementPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      const copyButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Copy')) as HTMLButtonElement;

      await fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('should show copied feedback after copying', async () => {
      const { container } = render(AchievementPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      const copyButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Copy')) as HTMLButtonElement;

      await fireEvent.click(copyButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Copied!');
      });
    });

    it('should download code when download clicked', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const { container } = render(AchievementPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      const downloadButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Download') as HTMLButtonElement;

      await fireEvent.click(downloadButton);

      expect(createElementSpy).toHaveBeenCalledWith('a');

      createElementSpy.mockRestore();
    });
  });

  describe('rarity colors', () => {
    it('should show gray for common rarity', () => {
      achievementStore.addAchievement({
        title: 'Common Achievement',
        description: 'Test',
        icon: '🏆',
        rarity: 'common',
        points: 10,
        hidden: false,
        category: 'Story',
        trigger: { type: 'passage_visit', passageId: 'test' },
      });

      const { container } = render(AchievementPanel);

      const rarityBadge = container.querySelector('.bg-gray-100');
      expect(rarityBadge).toBeTruthy();
    });

    it('should show green for uncommon rarity', () => {
      achievementStore.addAchievement({
        title: 'Uncommon Achievement',
        description: 'Test',
        icon: '🏆',
        rarity: 'uncommon',
        points: 25,
        hidden: false,
        category: 'Story',
        trigger: { type: 'passage_visit', passageId: 'test' },
      });

      const { container } = render(AchievementPanel);

      const rarityBadge = container.querySelector('.bg-green-100');
      expect(rarityBadge).toBeTruthy();
    });

    it('should show blue for rare rarity', () => {
      achievementStore.addAchievement({
        title: 'Rare Achievement',
        description: 'Test',
        icon: '🏆',
        rarity: 'rare',
        points: 50,
        hidden: false,
        category: 'Story',
        trigger: { type: 'passage_visit', passageId: 'test' },
      });

      const { container } = render(AchievementPanel);

      const rarityBadge = container.querySelector('.bg-blue-100');
      expect(rarityBadge).toBeTruthy();
    });

    it('should show purple for epic rarity', () => {
      achievementStore.addAchievement({
        title: 'Epic Achievement',
        description: 'Test',
        icon: '🏆',
        rarity: 'epic',
        points: 100,
        hidden: false,
        category: 'Story',
        trigger: { type: 'passage_visit', passageId: 'test' },
      });

      const { container } = render(AchievementPanel);

      const rarityBadge = container.querySelector('.bg-purple-100');
      expect(rarityBadge).toBeTruthy();
    });

    it('should show orange for legendary rarity', () => {
      achievementStore.addAchievement({
        title: 'Legendary Achievement',
        description: 'Test',
        icon: '🏆',
        rarity: 'legendary',
        points: 250,
        hidden: false,
        category: 'Story',
        trigger: { type: 'passage_visit', passageId: 'test' },
      });

      const { container } = render(AchievementPanel);

      const rarityBadge = container.querySelector('.bg-orange-100');
      expect(rarityBadge).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple achievements', () => {
      for (let i = 0; i < 5; i++) {
        achievementStore.addAchievement({
          title: `Achievement ${i}`,
          description: `Description ${i}`,
          icon: '🏆',
          rarity: 'common',
          points: 10,
          hidden: false,
          category: 'Story',
          trigger: { type: 'passage_visit', passageId: `passage-${i}` },
        });
      }

      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('5 achievements');
      expect(container.textContent).toContain('50 total points');
    });

    it('should handle achievement with empty description', () => {
      achievementStore.addAchievement({
        title: 'No Description',
        description: '',
        icon: '🏆',
        rarity: 'common',
        points: 10,
        hidden: false,
        category: 'Story',
        trigger: { type: 'passage_visit', passageId: 'test' },
      });

      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('No Description');
    });

    it('should handle achievement with special characters in title', () => {
      achievementStore.addAchievement({
        title: 'Test & <Special> "Characters"',
        description: 'Test',
        icon: '🏆',
        rarity: 'common',
        points: 10,
        hidden: false,
        category: 'Story',
        trigger: { type: 'passage_visit', passageId: 'test' },
      });

      const { container } = render(AchievementPanel);

      expect(container.textContent).toContain('Test & <Special> "Characters"');
    });

    it('should handle rapid mode switching', async () => {
      achievementStore.addAchievement({
        title: 'Test',
        description: 'Test',
        icon: '🏆',
        rarity: 'common',
        points: 10,
        hidden: false,
        category: 'Story',
        trigger: { type: 'passage_visit', passageId: 'test' },
      });

      const { container } = render(AchievementPanel);

      const addButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === '+ Add') as HTMLButtonElement;

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate Code') as HTMLButtonElement;

      for (let i = 0; i < 3; i++) {
        await fireEvent.click(addButton);
        const cancel = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent === 'Cancel') as HTMLButtonElement;
        await fireEvent.click(cancel);

        await fireEvent.click(generateButton);
        const back = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent === 'Back') as HTMLButtonElement;
        await fireEvent.click(back);
      }

      expect(container.textContent).toContain('Test');
    });
  });
});
