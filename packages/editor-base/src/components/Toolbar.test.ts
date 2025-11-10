import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import Toolbar from './Toolbar.svelte';
import { currentStory, unsavedChanges, projectActions } from '../stores';
import { canUndo, canRedo, historyCount, historyActions } from '../stores/historyStore';
import { validationResult, errorCount, warningCount, infoCount, isValid } from '../stores/validationStore';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';

describe('Toolbar', () => {
  let onNew: ReturnType<typeof vi.fn>;
  let onOpen: ReturnType<typeof vi.fn>;
  let onSave: ReturnType<typeof vi.fn>;
  let onExport: ReturnType<typeof vi.fn>;
  let onImport: ReturnType<typeof vi.fn>;
  let onAddPassage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    onNew = vi.fn();
    onOpen = vi.fn();
    onSave = vi.fn();
    onExport = vi.fn();
    onImport = vi.fn();
    onAddPassage = vi.fn();

    // Reset stores
    currentStory.set(null);
    unsavedChanges.set(false);
    historyActions.clear();
    validationResult.set({
      issues: [],
      valid: true,
      timestamp: Date.now(),
      duration: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0
      }
    });
  });

  afterEach(() => {
    currentStory.set(null);
    unsavedChanges.set(false);
    historyActions.clear();
    validationResult.set({
      issues: [],
      valid: true,
      timestamp: Date.now(),
      duration: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0
      }
    });
    localStorage.clear();
  });

  describe('rendering with no story', () => {
    it('should render all action buttons', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      expect(getByText(/New/)).toBeTruthy();
      expect(getByText(/Open/)).toBeTruthy();
      expect(getByText(/Save/)).toBeTruthy();
      expect(getByText(/Export/)).toBeTruthy();
      expect(getByText(/Import/)).toBeTruthy();
      expect(getByText(/Add Passage/)).toBeTruthy();
    });

    it('should show "No project loaded" when no story is loaded', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      expect(getByText('No project loaded')).toBeTruthy();
    });

    it('should disable Save button when no story is loaded', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const saveButton = getByText(/Save/).closest('button') as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);
    });

    it('should disable Export button when no story is loaded', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const exportButton = getByText(/Export/).closest('button') as HTMLButtonElement;
      expect(exportButton.disabled).toBe(true);
    });

    it('should disable Add Passage button when no story is loaded', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const addButton = getByText(/Add Passage/).closest('button') as HTMLButtonElement;
      expect(addButton.disabled).toBe(true);
    });

    it('should not disable New, Open, or Import buttons', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const newButton = getByText(/📄 New/).closest('button') as HTMLButtonElement;
      const openButton = getByText(/📁 Open/).closest('button') as HTMLButtonElement;
      const importButton = getByText(/Import/).closest('button') as HTMLButtonElement;

      expect(newButton.disabled).toBe(false);
      expect(openButton.disabled).toBe(false);
      expect(importButton.disabled).toBe(false);
    });

    it('should not show validation status when no story is loaded', () => {
      const { queryByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      expect(queryByText(/Valid/)).toBeNull();
    });
  });

  describe('rendering with story loaded', () => {
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
      currentStory.set(story);
      validationResult.set({
        issues: [],
        valid: true,
        timestamp: Date.now(),
        duration: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0
      }
      });
    });

    it('should show story title', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      expect(getByText('Test Story')).toBeTruthy();
    });

    it('should enable Save button when story is loaded', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const saveButton = getByText(/Save/).closest('button') as HTMLButtonElement;
      expect(saveButton.disabled).toBe(false);
    });

    it('should enable Export button when story is loaded', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const exportButton = getByText(/Export/).closest('button') as HTMLButtonElement;
      expect(exportButton.disabled).toBe(false);
    });

    it('should enable Add Passage button when story is loaded', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const addButton = getByText(/Add Passage/).closest('button') as HTMLButtonElement;
      expect(addButton.disabled).toBe(false);
    });

    it('should show validation status as valid', () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      expect(getByText(/Valid/)).toBeTruthy();
    });
  });

  describe('unsaved changes indicator', () => {
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
      currentStory.set(story);
    });

    it('should not show asterisk when there are no unsaved changes', () => {
      unsavedChanges.set(false);

      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const saveText = getByText(/💾 Save/);
      expect(saveText.textContent).not.toContain('*');
    });

    it('should show asterisk when there are unsaved changes', () => {
      unsavedChanges.set(true);

      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const saveText = getByText(/💾 Save\*/);
      expect(saveText).toBeTruthy();
    });
  });

  describe('validation status indicator', () => {
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
      currentStory.set(story);
    });

    it('should show errors when validation fails with errors', () => {
      validationResult.set({
        issues: [],
        valid: false,
        timestamp: Date.now(),
        duration: 0,
        errorCount: 2,
        warningCount: 0,
        infoCount: 0,
        stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0
      }
      });

      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      expect(getByText('🔴 2')).toBeTruthy();
    });

    it('should show warnings when validation has warnings', () => {
      validationResult.set({
        issues: [],
        valid: false,
        timestamp: Date.now(),
        duration: 0,
        errorCount: 0,
        warningCount: 3,
        infoCount: 0,
        stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0
      }
      });

      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      expect(getByText('⚠️ 3')).toBeTruthy();
    });

    it('should show valid status when there are only info messages', () => {
      validationResult.set({
        issues: [],
        valid: true,
        timestamp: Date.now(),
        duration: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 1,
        stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0
      }
      });

      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      // Info messages don't make the story invalid, so it still shows as valid
      expect(getByText(/Valid/)).toBeTruthy();
    });

    it('should show all counts when there are mixed issues', () => {
      validationResult.set({
        issues: [],
        valid: false,
        timestamp: Date.now(),
        duration: 0,
        errorCount: 2,
        warningCount: 3,
        infoCount: 1,
        stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0
      }
      });

      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      expect(getByText('🔴 2')).toBeTruthy();
      expect(getByText('⚠️ 3')).toBeTruthy();
      expect(getByText('ℹ️ 1')).toBeTruthy();
    });
  });

  describe('undo/redo buttons', () => {
    it('should disable undo button when undo is not available', () => {
      const { getByTitle } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const undoButton = getByTitle(/Undo/).closest('button') as HTMLButtonElement;
      expect(undoButton.disabled).toBe(true);
    });

    it('should disable redo button when redo is not available', () => {
      const { getByTitle } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const redoButton = getByTitle(/Redo/).closest('button') as HTMLButtonElement;
      expect(redoButton.disabled).toBe(true);
    });

    it('should not show history count when history is empty', () => {
      const { queryByTitle } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      expect(queryByTitle('History depth')).toBeNull();
    });
  });

  describe('button callbacks', () => {
    it('should call onNew when New button is clicked', async () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const newButton = getByText(/📄 New/).closest('button') as HTMLButtonElement;
      await fireEvent.click(newButton);

      expect(onNew).toHaveBeenCalledTimes(1);
    });

    it('should call onOpen when Open button is clicked', async () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const openButton = getByText(/📁 Open/).closest('button') as HTMLButtonElement;
      await fireEvent.click(openButton);

      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('should call onSave when Save button is clicked', async () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);

      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const saveButton = getByText(/💾 Save/).closest('button') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should call onExport when Export button is clicked', async () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);

      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const exportButton = getByText(/Export/).closest('button') as HTMLButtonElement;
      await fireEvent.click(exportButton);

      expect(onExport).toHaveBeenCalledTimes(1);
    });

    it('should call onImport when Import button is clicked', async () => {
      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const importButton = getByText(/Import/).closest('button') as HTMLButtonElement;
      await fireEvent.click(importButton);

      expect(onImport).toHaveBeenCalledTimes(1);
    });

    it('should call onAddPassage when Add Passage button is clicked', async () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);

      const { getByText } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const addButton = getByText(/Add Passage/).closest('button') as HTMLButtonElement;
      await fireEvent.click(addButton);

      expect(onAddPassage).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('should have proper toolbar styling', () => {
      const { container } = render(Toolbar, {
        onNew,
        onOpen,
        onSave,
        onExport,
        onImport,
        onAddPassage,
      });

      const toolbar = container.querySelector('div');
      expect(toolbar).toBeTruthy();
      expect(toolbar?.className).toContain('bg-gray-100');
      expect(toolbar?.className).toContain('h-12');
    });
  });
});
