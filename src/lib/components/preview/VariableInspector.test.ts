import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import VariableInspector from './VariableInspector.svelte';
import { projectActions, currentStory } from '../../stores/projectStore';
import { playerActions, playerVariables } from '../../stores/playerStore';
import { Story } from '@whisker/core-ts';
import { Variable } from '@whisker/core-ts';

describe('VariableInspector', () => {
  let story: Story;

  beforeEach(async () => {
    // Create test story with variables
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    story.addVariable(new Variable({
      name: 'health',
      type: 'number',
      initial: 100,
    }));

    story.addVariable(new Variable({
      name: 'has_key',
      type: 'boolean',
      initial: false,
    }));

    story.addVariable(new Variable({
      name: 'player_name',
      type: 'string',
      initial: 'Hero',
    }));

    projectActions.loadProject({ ...story.serialize(), version: '1.0.0' }, 'test.json');
    playerActions.loadStory(story);
    playerActions.start();

    // Wait for stores to be updated
    await waitFor(() => {
      expect(get(currentStory)).toBeTruthy();
      expect(get(playerVariables).size).toBeGreaterThan(0);
    });
  });

  it('should render empty state when no variables', async () => {
    const emptyStory = new Story({
      metadata: {
        title: 'Empty',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    projectActions.loadProject({ ...emptyStory.serialize(), version: '1.0.0' }, 'empty.json');
    playerActions.loadStory(emptyStory);

    const { getByText } = render(VariableInspector);

    await waitFor(() => {
      expect(getByText('No variables defined')).toBeTruthy();
    });
  });

  it('should render variables list', async () => {
    const { getByText, getByLabelText } = render(VariableInspector);

    // Wait for component to render with store data
    await waitFor(() => {
      expect(getByText('Variables')).toBeTruthy();
    });

    await waitFor(() => {
      expect(getByLabelText('health')).toBeTruthy();
    });

    expect(getByLabelText('has_key')).toBeTruthy();
    expect(getByLabelText('player_name')).toBeTruthy();
  });

  it('should display variable types', async () => {
    const { getAllByText, getByText } = render(VariableInspector);

    await waitFor(() => {
      expect(getByText('number')).toBeTruthy();
    });

    expect(getByText('boolean')).toBeTruthy();
    expect(getByText('string')).toBeTruthy();
  });

  it('should render correct input types', async () => {
    const { getByLabelText } = render(VariableInspector);

    await waitFor(() => {
      const healthInput = getByLabelText('health') as HTMLInputElement;
      expect(healthInput.type).toBe('number');
    });

    const keyInput = getByLabelText('has_key') as HTMLInputElement;
    expect(keyInput.type).toBe('checkbox');

    const nameInput = getByLabelText('player_name') as HTMLInputElement;
    expect(nameInput.type).toBe('text');
  });

  it('should display current variable values', async () => {
    const { getByLabelText } = render(VariableInspector);

    await waitFor(() => {
      const healthInput = getByLabelText('health') as HTMLInputElement;
      expect(healthInput.value).toBe('100');
    });

    const keyInput = getByLabelText('has_key') as HTMLInputElement;
    expect(keyInput.checked).toBe(false);

    const nameInput = getByLabelText('player_name') as HTMLInputElement;
    expect(nameInput.value).toBe('Hero');
  });

  it('should render test values button', async () => {
    const { getByText } = render(VariableInspector);

    await waitFor(() => {
      expect(getByText('Test Values')).toBeTruthy();
    });
  });

  it('should render reset button', async () => {
    const { getByText } = render(VariableInspector);

    await waitFor(() => {
      expect(getByText('Reset')).toBeTruthy();
    });
  });

  it('should show quick actions section', async () => {
    const { getByText } = render(VariableInspector);

    await waitFor(() => {
      expect(getByText('Quick Actions')).toBeTruthy();
    });
  });
});
