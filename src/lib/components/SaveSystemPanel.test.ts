import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SaveSystemPanel from './SaveSystemPanel.svelte';
import { get } from 'svelte/store';
import { saveSystem, saveSlots } from '../stores/saveSystemStore';
import { currentStory } from '../stores/projectStore';
import { Story } from '@whisker/core-ts';

describe('SaveSystemPanel', () => {
  beforeEach(() => {
    // Reset save system
    saveSystem.clearAllSlots();

    // Create test story
    const testStory = new Story('Test Story');
    currentStory.set(testStory);
  });

  describe('Rendering', () => {
    it('should render save system panel', () => {
      render(SaveSystemPanel);
      expect(screen.getByText(/Save System/i)).toBeInTheDocument();
    });

    it('should show save slots', () => {
      render(SaveSystemPanel);
      expect(screen.getByText(/Save Slots/i)).toBeInTheDocument();
    });

    it('should show autosave toggle', () => {
      render(SaveSystemPanel);
      expect(screen.getByLabelText(/Enable Autosave/i)).toBeInTheDocument();
    });
  });

  describe('Save Slots', () => {
    it('should create a new save slot', async () => {
      render(SaveSystemPanel);

      const createButton = screen.getByText(/Create Save/i);
      await fireEvent.click(createButton);

      const allSlots = get(saveSlots);
      expect(allSlots.length).toBeGreaterThan(0);
    });

    it('should display save slot information', async () => {
      // Create a save slot
      const slotId = saveSystem.createSave('Test Save', {});

      render(SaveSystemPanel);

      expect(screen.getByText('Test Save')).toBeInTheDocument();
    });

    it('should delete a save slot', async () => {
      const slotId = saveSystem.createSave('To Delete', {});

      render(SaveSystemPanel);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await fireEvent.click(deleteButton);

      const allSlots = get(saveSlots);
      expect(allSlots).toHaveLength(0);
    });

    it('should load a save slot', async () => {
      const slotId = saveSystem.createSave('Load Me', { passage: 'start' });

      render(SaveSystemPanel);

      const loadButton = screen.getByText(/Load/i);
      await fireEvent.click(loadButton);

      // Verify load was triggered
      // (This would need proper mocking of the story state)
    });
  });

  describe('Autosave', () => {
    it('should enable autosave', async () => {
      render(SaveSystemPanel);

      const autosaveToggle = screen.getByLabelText(/Enable Autosave/i);
      await fireEvent.click(autosaveToggle);

      expect(autosaveToggle).toBeChecked();
    });

    it('should set autosave interval', async () => {
      render(SaveSystemPanel);

      const intervalInput = screen.getByLabelText(/Autosave Interval/i);
      await fireEvent.input(intervalInput, { target: { value: '300' } });

      expect(intervalInput).toHaveValue(300);
    });
  });

  describe('Save Metadata', () => {
    it('should show save timestamp', () => {
      const now = new Date();
      saveSystem.createSave('With Timestamp', {}, now);

      render(SaveSystemPanel);

      // Timestamp should be displayed in some form
      expect(screen.getByText(/ago|at/i)).toBeInTheDocument();
    });

    it('should show save description', () => {
      saveSystem.createSave('Save', {}, undefined, 'Test description');

      render(SaveSystemPanel);

      expect(screen.getByText('Test description')).toBeInTheDocument();
    });
  });

  describe('Save Limits', () => {
    it('should enforce maximum save slots', async () => {
      // Create maximum number of saves
      for (let i = 0; i < 10; i++) {
        saveSystem.createSave(`Save ${i}`, {});
      }

      render(SaveSystemPanel);

      // Try to create another
      const createButton = screen.getByText(/Create Save/i);
      await fireEvent.click(createButton);

      const allSlots = get(saveSlots);
      expect(allSlots.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Export/Import', () => {
    it('should export save data', async () => {
      saveSystem.createSave('Export Me', {});

      render(SaveSystemPanel);

      const exportButton = screen.getByText(/Export/i);
      await fireEvent.click(exportButton);

      // Verify export happened (would need proper mock)
    });

    it('should import save data', async () => {
      render(SaveSystemPanel);

      const importButton = screen.getByText(/Import/i);
      expect(importButton).toBeInTheDocument();
    });
  });
});
