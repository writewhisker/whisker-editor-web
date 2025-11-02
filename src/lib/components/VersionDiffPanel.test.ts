import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import VersionDiffPanel from './VersionDiffPanel.svelte';
import { get } from 'svelte/store';
import { versionDiffStore, snapshots, currentDiff } from '../stores/versionDiffStore';
import { currentStory } from '../stores/projectStore';
import { Story } from '../models/Story';

describe('VersionDiffPanel', () => {
  beforeEach(() => {
    // Reset stores
    versionDiffStore.clearSnapshots();

    // Create a test story
    const testStory = new Story('Test Story');
    testStory.addPassage('Start', 'Beginning of the story');
    currentStory.set(testStory);
  });

  describe('Rendering', () => {
    it('should render version diff panel', () => {
      render(VersionDiffPanel);
      expect(screen.getByText('Version Comparison')).toBeInTheDocument();
    });

    it('should show panel description', () => {
      render(VersionDiffPanel);
      expect(screen.getByText(/Compare story versions/i)).toBeInTheDocument();
    });

    it('should show view tabs', () => {
      render(VersionDiffPanel);
      expect(screen.getByText(/Snapshots/i)).toBeInTheDocument();
      expect(screen.getByText(/Compare/i)).toBeInTheDocument();
    });

    it('should show snapshots count in tab', () => {
      render(VersionDiffPanel);
      expect(screen.getByText(/Snapshots \(0\)/i)).toBeInTheDocument();
    });

    it('should start on snapshots view', () => {
      render(VersionDiffPanel);
      expect(screen.getByText('Version Snapshots')).toBeInTheDocument();
    });
  });

  describe('Snapshots View', () => {
    it('should show create snapshot button', () => {
      render(VersionDiffPanel);
      expect(screen.getByText(/Create Snapshot/i)).toBeInTheDocument();
    });

    it('should show empty state when no snapshots', () => {
      render(VersionDiffPanel);
      expect(screen.getByText(/No snapshots yet/i)).toBeInTheDocument();
    });

    it('should open create form on button click', async () => {
      render(VersionDiffPanel);

      const createButton = screen.getByText(/Create Snapshot/i);
      await fireEvent.click(createButton);

      expect(screen.getByText('Create New Snapshot')).toBeInTheDocument();
      expect(screen.getByLabelText(/Label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });

    it('should create snapshot with label', async () => {
      render(VersionDiffPanel);

      // Open form
      const createButton = screen.getByText(/Create Snapshot/i);
      await fireEvent.click(createButton);

      // Fill label
      const labelInput = screen.getByPlaceholderText(/v1.0.0/i);
      await fireEvent.input(labelInput, { target: { value: 'v1.0' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /^Create$/i });
      await fireEvent.click(submitButton);

      // Verify snapshot created
      const allSnapshots = get(snapshots);
      expect(allSnapshots.length).toBe(1);
      expect(allSnapshots[0].label).toBe('v1.0');
    });

    it('should create snapshot with description', async () => {
      render(VersionDiffPanel);

      // Open form
      const createButton = screen.getByText(/Create Snapshot/i);
      await fireEvent.click(createButton);

      // Fill fields
      const labelInput = screen.getByPlaceholderText(/v1.0.0/i);
      await fireEvent.input(labelInput, { target: { value: 'v1.0' } });

      const descInput = screen.getByPlaceholderText(/What changed/i);
      await fireEvent.input(descInput, { target: { value: 'Initial release' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /^Create$/i });
      await fireEvent.click(submitButton);

      // Verify snapshot created
      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].description).toBe('Initial release');
    });

    it('should create snapshot with author', async () => {
      render(VersionDiffPanel);

      // Open form
      const createButton = screen.getByText(/Create Snapshot/i);
      await fireEvent.click(createButton);

      // Fill fields
      const labelInput = screen.getByPlaceholderText(/v1.0.0/i);
      await fireEvent.input(labelInput, { target: { value: 'v1.0' } });

      const authorInput = screen.getByPlaceholderText(/Your name/i);
      await fireEvent.input(authorInput, { target: { value: 'John Doe' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /^Create$/i });
      await fireEvent.click(submitButton);

      // Verify snapshot created
      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].author).toBe('John Doe');
    });

    it('should not create snapshot without label', async () => {
      render(VersionDiffPanel);

      // Open form
      const createButton = screen.getByText(/Create Snapshot/i);
      await fireEvent.click(createButton);

      // Submit without label
      const submitButton = screen.getByRole('button', { name: /^Create$/i });
      await fireEvent.click(submitButton);

      // Verify no snapshot created
      const allSnapshots = get(snapshots);
      expect(allSnapshots.length).toBe(0);
    });

    it('should cancel create form', async () => {
      render(VersionDiffPanel);

      // Open form
      const createButton = screen.getByText(/Create Snapshot/i);
      await fireEvent.click(createButton);

      // Fill label
      const labelInput = screen.getByPlaceholderText(/v1.0.0/i);
      await fireEvent.input(labelInput, { target: { value: 'v1.0' } });

      // Cancel
      const cancelButtons = screen.getAllByText('Cancel');
      await fireEvent.click(cancelButtons[0]);

      // Verify form closed and no snapshot created
      expect(screen.queryByText('Create New Snapshot')).not.toBeInTheDocument();
      const allSnapshots = get(snapshots);
      expect(allSnapshots.length).toBe(0);
    });
  });

  describe('Snapshot List', () => {
    beforeEach(() => {
      const story = get(currentStory);
      if (story) {
        versionDiffStore.createSnapshot(story, 'v1.0', 'Initial version');
        versionDiffStore.createSnapshot(story, 'v2.0', 'Second version', 'Jane Doe');
      }
    });

    it('should display snapshots', () => {
      render(VersionDiffPanel);

      expect(screen.getByText('v1.0')).toBeInTheDocument();
      expect(screen.getByText('v2.0')).toBeInTheDocument();
    });

    it('should display snapshot descriptions', () => {
      render(VersionDiffPanel);

      expect(screen.getByText('Initial version')).toBeInTheDocument();
      expect(screen.getByText('Second version')).toBeInTheDocument();
    });

    it('should display snapshot author', () => {
      render(VersionDiffPanel);

      expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    });

    it('should display passage count', () => {
      render(VersionDiffPanel);

      expect(screen.getAllByText(/1 passages/i).length).toBeGreaterThan(0);
    });

    it('should show edit button', () => {
      render(VersionDiffPanel);

      const editButtons = screen.getAllByText('Edit');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('should show delete button', () => {
      render(VersionDiffPanel);

      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Snapshot Editing', () => {
    beforeEach(() => {
      const story = get(currentStory);
      if (story) {
        versionDiffStore.createSnapshot(story, 'v1.0', 'Initial version');
      }
    });

    it('should open edit form on edit button click', async () => {
      render(VersionDiffPanel);

      const editButton = screen.getByText('Edit');
      await fireEvent.click(editButton);

      expect(screen.getByDisplayValue('v1.0')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Initial version')).toBeInTheDocument();
    });

    it('should update snapshot label', async () => {
      render(VersionDiffPanel);

      // Open edit form
      const editButton = screen.getByText('Edit');
      await fireEvent.click(editButton);

      // Update label
      const labelInput = screen.getByDisplayValue('v1.0');
      await fireEvent.input(labelInput, { target: { value: 'v1.1' } });

      // Save
      const saveButton = screen.getByText('Save');
      await fireEvent.click(saveButton);

      // Verify update
      expect(screen.getByText('v1.1')).toBeInTheDocument();
      expect(screen.queryByText('v1.0')).not.toBeInTheDocument();
    });

    it('should update snapshot description', async () => {
      render(VersionDiffPanel);

      // Open edit form
      const editButton = screen.getByText('Edit');
      await fireEvent.click(editButton);

      // Update description
      const descInput = screen.getByDisplayValue('Initial version');
      await fireEvent.input(descInput, { target: { value: 'Updated description' } });

      // Save
      const saveButton = screen.getByText('Save');
      await fireEvent.click(saveButton);

      // Verify update
      expect(screen.getByText('Updated description')).toBeInTheDocument();
    });

    it('should cancel edit without saving', async () => {
      render(VersionDiffPanel);

      // Open edit form
      const editButton = screen.getByText('Edit');
      await fireEvent.click(editButton);

      // Update label
      const labelInput = screen.getByDisplayValue('v1.0');
      await fireEvent.input(labelInput, { target: { value: 'v1.1' } });

      // Cancel
      const cancelButtons = screen.getAllByText('Cancel');
      const editCancelButton = cancelButtons.find(btn =>
        btn.parentElement?.parentElement?.querySelector('input[value="v1.1"]')
      );
      if (editCancelButton) {
        await fireEvent.click(editCancelButton);
      }

      // Verify no update
      expect(screen.getByText('v1.0')).toBeInTheDocument();
    });
  });

  describe('Snapshot Deletion', () => {
    beforeEach(() => {
      const story = get(currentStory);
      if (story) {
        versionDiffStore.createSnapshot(story, 'v1.0', 'To delete');
      }

      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('should delete snapshot', async () => {
      render(VersionDiffPanel);

      const deleteButton = screen.getByText('Delete');
      await fireEvent.click(deleteButton);

      // Verify deletion
      const allSnapshots = get(snapshots);
      expect(allSnapshots.length).toBe(0);
      expect(screen.queryByText('v1.0')).not.toBeInTheDocument();
    });

    it('should show confirmation dialog', async () => {
      render(VersionDiffPanel);

      const deleteButton = screen.getByText('Delete');
      await fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('Delete this snapshot?');
    });
  });

  describe('Compare View', () => {
    beforeEach(() => {
      const story = get(currentStory);
      if (story) {
        versionDiffStore.createSnapshot(story, 'v1.0', 'First');
        versionDiffStore.createSnapshot(story, 'v2.0', 'Second');
      }
    });

    it('should switch to compare view', async () => {
      render(VersionDiffPanel);

      const compareTab = screen.getByText(/Compare/i);
      await fireEvent.click(compareTab);

      expect(screen.getByText('Select Versions to Compare')).toBeInTheDocument();
    });

    it('should show version selection dropdowns', async () => {
      render(VersionDiffPanel);

      const compareTab = screen.getByText(/Compare/i);
      await fireEvent.click(compareTab);

      expect(screen.getByText(/From \(older version\)/i)).toBeInTheDocument();
      expect(screen.getByText(/To \(newer version\)/i)).toBeInTheDocument();
    });

    it('should auto-select recent versions', async () => {
      render(VersionDiffPanel);

      const compareTab = screen.getByText(/Compare/i);
      await fireEvent.click(compareTab);

      // Auto-selection should happen
      const selects = screen.getAllByRole('combobox');
      expect(selects[0]).toHaveValue();
      expect(selects[1]).toHaveValue();
    });

    it('should disable compare button with same versions', async () => {
      render(VersionDiffPanel);

      const compareTab = screen.getByText(/Compare/i);
      await fireEvent.click(compareTab);

      const allSnapshots = get(snapshots);
      if (allSnapshots.length >= 2) {
        const selects = screen.getAllByRole('combobox');
        await fireEvent.change(selects[0], { target: { value: allSnapshots[0].id } });
        await fireEvent.change(selects[1], { target: { value: allSnapshots[0].id } });

        const compareButton = screen.getByText('Compare Versions');
        expect(compareButton).toBeDisabled();
      }
    });

    it('should enable compare button with different versions', async () => {
      render(VersionDiffPanel);

      const compareTab = screen.getByText(/Compare/i);
      await fireEvent.click(compareTab);

      const allSnapshots = get(snapshots);
      if (allSnapshots.length >= 2) {
        const selects = screen.getAllByRole('combobox');
        await fireEvent.change(selects[0], { target: { value: allSnapshots[0].id } });
        await fireEvent.change(selects[1], { target: { value: allSnapshots[1].id } });

        const compareButton = screen.getByText('Compare Versions');
        expect(compareButton).not.toBeDisabled();
      }
    });

    it('should disable compare tab with less than 2 snapshots', () => {
      // Clear snapshots
      versionDiffStore.clearSnapshots();

      const story = get(currentStory);
      if (story) {
        versionDiffStore.createSnapshot(story, 'v1.0', 'Only one');
      }

      render(VersionDiffPanel);

      const compareTab = screen.getByText(/Compare/i);
      expect(compareTab).toBeDisabled();
    });
  });

  describe('Diff View', () => {
    beforeEach(() => {
      const story1 = new Story('Story v1');
      story1.addPassage('Start', 'Original content');

      const story2 = new Story('Story v2');
      story2.addPassage('Start', 'Modified content');
      story2.addPassage('New Passage', 'New passage content');

      versionDiffStore.createSnapshot(story1, 'v1.0', 'First');
      versionDiffStore.createSnapshot(story2, 'v2.0', 'Second');

      const allSnapshots = get(snapshots);
      if (allSnapshots.length >= 2) {
        versionDiffStore.selectVersions(allSnapshots[0].id, allSnapshots[1].id);
      }
    });

    it('should show diff view tab when diff exists', () => {
      render(VersionDiffPanel);

      const diff = get(currentDiff);
      if (diff) {
        expect(screen.getByText('Diff View')).toBeInTheDocument();
      }
    });

    it('should switch to diff view', async () => {
      render(VersionDiffPanel);

      const diffTab = screen.getByText('Diff View');
      await fireEvent.click(diffTab);

      expect(screen.getByText('Comparison Results')).toBeInTheDocument();
    });

    it('should show version comparison labels', async () => {
      render(VersionDiffPanel);

      const diffTab = screen.getByText('Diff View');
      await fireEvent.click(diffTab);

      expect(screen.getByText(/v1.0.*→.*v2.0/)).toBeInTheDocument();
    });

    it('should show stats summary', async () => {
      render(VersionDiffPanel);

      const diffTab = screen.getByText('Diff View');
      await fireEvent.click(diffTab);

      expect(screen.getByText('Added')).toBeInTheDocument();
      expect(screen.getByText('Removed')).toBeInTheDocument();
      expect(screen.getByText('Modified')).toBeInTheDocument();
      expect(screen.getByText('Unchanged')).toBeInTheDocument();
    });

    it('should show export report button', async () => {
      render(VersionDiffPanel);

      const diffTab = screen.getByText('Diff View');
      await fireEvent.click(diffTab);

      expect(screen.getByText('Export Report')).toBeInTheDocument();
    });

    it('should show unchanged toggle', async () => {
      render(VersionDiffPanel);

      const diffTab = screen.getByText('Diff View');
      await fireEvent.click(diffTab);

      expect(screen.getByText(/Show unchanged passages/i)).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should display relative time', () => {
      const story = get(currentStory);
      if (story) {
        versionDiffStore.createSnapshot(story, 'Recent', 'Just now');
      }

      render(VersionDiffPanel);

      expect(screen.getByText(/just now|ago/i)).toBeInTheDocument();
    });

    it('should display full timestamp', () => {
      const story = get(currentStory);
      if (story) {
        versionDiffStore.createSnapshot(story, 'v1.0', 'Timestamped');
      }

      render(VersionDiffPanel);

      // Should show date/time in some format
      const timestamps = screen.getAllByText(/\d{1,2}[/:]\d{1,2}/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });
});
