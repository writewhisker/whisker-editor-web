import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import HistoryPanel from './HistoryPanel.svelte';
import { playerActions } from '../../stores/playerStore';
import { projectActions } from '../../stores/projectStore';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Choice } from '../../models/Choice';

describe('HistoryPanel', () => {
  let story: Story;
  let startPassage: Passage;
  let secondPassage: Passage;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    startPassage = story.getPassage(story.startPassage!)!;
    startPassage.title = 'Start';

    secondPassage = new Passage({ title: 'Second Passage' });
    story.addPassage(secondPassage);

    startPassage.addChoice(new Choice({
      text: 'Go to second',
      target: secondPassage.id,
    }));

    projectActions.loadProject(story.serialize(), 'test.json');
    playerActions.loadStory(story);
  });

  it('should render empty state when no history', async () => {
    playerActions.stop();
    const { getByText } = render(HistoryPanel);

    await waitFor(() => {
      expect(getByText('No history yet')).toBeTruthy();
    });
  });

  it('should render history title', async () => {
    playerActions.start();
    const { getByText } = render(HistoryPanel);

    await waitFor(() => {
      expect(getByText('History')).toBeTruthy();
    });
  });

  it('should display stats summary when has history', async () => {
    playerActions.start();
    const { getByText } = render(HistoryPanel);

    await waitFor(() => {
      expect(getByText(/Steps:/)).toBeTruthy();
    });

    expect(getByText(/Unique Passages:/)).toBeTruthy();
    expect(getByText(/Duration:/)).toBeTruthy();
  });

  it('should show passage titles in history', async () => {
    playerActions.start();
    playerActions.makeChoice(startPassage.choices[0].id);

    const { getByText } = render(HistoryPanel);

    await waitFor(() => {
      expect(getByText('Start')).toBeTruthy();
    });

    expect(getByText('Second Passage')).toBeTruthy();
  });

  it('should show choice text in history', async () => {
    playerActions.start();
    playerActions.makeChoice(startPassage.choices[0].id);

    const { getByText } = render(HistoryPanel);

    await waitFor(() => {
      expect(getByText(/Go to second/)).toBeTruthy();
    });
  });

  it('should render export button', async () => {
    playerActions.start();
    const { getByText } = render(HistoryPanel);

    await waitFor(() => {
      expect(getByText('💾 Export Log')).toBeTruthy();
    });
  });

  it('should display step numbers', async () => {
    playerActions.start();
    playerActions.makeChoice(startPassage.choices[0].id);

    const { getByText } = render(HistoryPanel);

    // Check for step numbers (formatted as "01", "02", etc.)
    await waitFor(() => {
      expect(getByText('01')).toBeTruthy();
    });

    expect(getByText('02')).toBeTruthy();
  });
});
