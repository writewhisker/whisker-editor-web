import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import StorySettingsPanel from './StorySettingsPanel.svelte';
import { currentStory, projectActions } from '../stores/projectStore';
import { Story } from '@whisker/core-ts';
import { get } from 'svelte/store';

describe('StorySettingsPanel', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
      },
    });
    currentStory.set(story);
    vi.spyOn(projectActions, 'markChanged');
  });

  it('should render empty state when no settings exist', () => {
    render(StorySettingsPanel);
    expect(screen.getByText('No settings yet')).toBeTruthy();
  });

  it('should display existing settings', () => {
    story.setSetting('difficulty', 'medium');
    story.setSetting('autoSave', true);
    currentStory.set(story);

    render(StorySettingsPanel);
    expect(screen.getByText('difficulty')).toBeTruthy();
    expect(screen.getByText('medium')).toBeTruthy();
    expect(screen.getByText('autoSave')).toBeTruthy();
  });

  it('should show setting count in footer', () => {
    story.setSetting('theme', 'dark');
    story.setSetting('volume', 0.8);
    currentStory.set(story);

    render(StorySettingsPanel);
    expect(screen.getByText('2 settings')).toBeTruthy();
  });

  it('should show singular form for one setting', () => {
    story.setSetting('theme', 'dark');
    currentStory.set(story);

    render(StorySettingsPanel);
    expect(screen.getByText('1 setting')).toBeTruthy();
  });

  it('should open add dialog when Add button clicked', async () => {
    const { container } = render(StorySettingsPanel);
    const addButton = screen.getByText('+ Add');

    await fireEvent.click(addButton);

    expect(screen.getAllByText('Add Setting')).toBeTruthy();
    expect(screen.getByPlaceholderText('difficulty')).toBeTruthy();
  });

  it('should add a new string setting', async () => {
    const { container } = render(StorySettingsPanel);

    // Open dialog
    await fireEvent.click(screen.getByText('+ Add'));

    // Fill in form
    const keyInput = screen.getByPlaceholderText('difficulty') as HTMLInputElement;
    const valueInput = screen.getByPlaceholderText('Initial value') as HTMLInputElement;

    await fireEvent.input(keyInput, { target: { value: 'theme' } });
    await fireEvent.input(valueInput, { target: { value: 'dark' } });

    // Submit - use getAllBy since both header and button have this text
    const addButtons = screen.getAllByText('Add Setting');
    await fireEvent.click(addButtons[addButtons.length - 1]); // Click the button, not the header

    // Check story was updated
    const currentStoryValue = get(currentStory);
    expect(currentStoryValue?.getSetting('theme')).toBe('dark');
    expect(projectActions.markChanged).toHaveBeenCalled();
  });

  it('should add a new number setting', async () => {
    const { container } = render(StorySettingsPanel);

    // Open dialog
    await fireEvent.click(screen.getByText('+ Add'));

    // Select number type
    const typeSelect = container.querySelector('select') as HTMLSelectElement;
    await fireEvent.change(typeSelect, { target: { value: 'number' } });

    // Fill in form
    const keyInput = screen.getByPlaceholderText('difficulty') as HTMLInputElement;
    const valueInput = screen.getByPlaceholderText('0') as HTMLInputElement;

    await fireEvent.input(keyInput, { target: { value: 'volume' } });
    await fireEvent.input(valueInput, { target: { value: '0.75' } });

    // Submit
    const addButtons = screen.getAllByText('Add Setting');
    await fireEvent.click(addButtons[addButtons.length - 1]);

    // Check story was updated
    const currentStoryValue = get(currentStory);
    expect(currentStoryValue?.getSetting('volume')).toBe(0.75);
  });

  it('should add a new boolean setting', async () => {
    const { container } = render(StorySettingsPanel);

    // Open dialog
    await fireEvent.click(screen.getByText('+ Add'));

    // Select boolean type
    const typeSelect = container.querySelectorAll('select')[0] as HTMLSelectElement;
    await fireEvent.change(typeSelect, { target: { value: 'boolean' } });

    // Fill in form
    const keyInput = screen.getByPlaceholderText('difficulty') as HTMLInputElement;
    await fireEvent.input(keyInput, { target: { value: 'enableHints' } });

    // Value should default to false for boolean
    const valueSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
    await fireEvent.change(valueSelect, { target: { value: 'true' } });

    // Submit
    const addButtons = screen.getAllByText('Add Setting');
    await fireEvent.click(addButtons[addButtons.length - 1]);

    // Check story was updated
    const currentStoryValue = get(currentStory);
    expect(currentStoryValue?.getSetting('enableHints')).toBe(true);
  });

  it('should prevent adding duplicate setting key', async () => {
    story.setSetting('existing', 'value');
    currentStory.set(story);

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { container } = render(StorySettingsPanel);

    // Open dialog
    await fireEvent.click(screen.getByText('+ Add'));

    // Try to add existing key
    const keyInput = screen.getByPlaceholderText('difficulty') as HTMLInputElement;
    await fireEvent.input(keyInput, { target: { value: 'existing' } });

    const addButtons = screen.getAllByText('Add Setting');
    await fireEvent.click(addButtons[addButtons.length - 1]);

    expect(alertSpy).toHaveBeenCalledWith('A setting with this key already exists!');
    alertSpy.mockRestore();
  });

  it('should delete a setting', async () => {
    story.setSetting('toDelete', 'value');
    currentStory.set(story);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(StorySettingsPanel);

    // Find and click delete button (🗑 emoji)
    const deleteButtons = screen.getAllByText('🗑');
    await fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Delete setting "toDelete"?');

    const currentStoryValue = get(currentStory);
    expect(currentStoryValue?.hasSetting('toDelete')).toBe(false);
    expect(projectActions.markChanged).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should edit a setting value', async () => {
    story.setSetting('editMe', 'oldValue');
    currentStory.set(story);

    const { container } = render(StorySettingsPanel);

    // Find and click edit button (✏️ emoji)
    const editButtons = screen.getAllByText('✏️');
    await fireEvent.click(editButtons[0]);

    // Find the input field and change value
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'newValue' } });

    // Save
    await fireEvent.click(screen.getByText('Save'));

    const currentStoryValue = get(currentStory);
    expect(currentStoryValue?.getSetting('editMe')).toBe('newValue');
    expect(projectActions.markChanged).toHaveBeenCalled();
  });

  it('should cancel editing', async () => {
    story.setSetting('editMe', 'originalValue');
    currentStory.set(story);

    const { container } = render(StorySettingsPanel);

    // Start editing
    const editButtons = screen.getAllByText('✏️');
    await fireEvent.click(editButtons[0]);

    // Change value
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'changedValue' } });

    // Cancel
    await fireEvent.click(screen.getByText('Cancel'));

    // Value should remain unchanged
    const currentStoryValue = get(currentStory);
    expect(currentStoryValue?.getSetting('editMe')).toBe('originalValue');
  });

  it('should clear all settings', async () => {
    story.setSetting('key1', 'value1');
    story.setSetting('key2', 'value2');
    currentStory.set(story);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(StorySettingsPanel);

    // Click Clear All button
    await fireEvent.click(screen.getByText('Clear All'));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Clear all 2 setting(s)?')
    );

    const currentStoryValue = get(currentStory);
    expect(Object.keys(currentStoryValue?.getAllSettings() || {})).toHaveLength(0);
    expect(projectActions.markChanged).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should display different value types correctly', () => {
    story.setSetting('stringVal', 'text');
    story.setSetting('numberVal', 42);
    story.setSetting('boolVal', true);
    story.setSetting('objectVal', { nested: 'data' });
    currentStory.set(story);

    render(StorySettingsPanel);

    expect(screen.getByText('text')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('true')).toBeTruthy();
    expect(screen.getByText(/"nested": "data"/)).toBeTruthy();
  });

  it('should show correct type badges', () => {
    story.setSetting('stringVal', 'text');
    story.setSetting('numberVal', 42);
    story.setSetting('boolVal', true);
    currentStory.set(story);

    render(StorySettingsPanel);

    expect(screen.getAllByText('string')).toBeTruthy();
    expect(screen.getAllByText('number')).toBeTruthy();
    expect(screen.getAllByText('boolean')).toBeTruthy();
  });
});
