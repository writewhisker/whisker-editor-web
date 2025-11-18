import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import BreakpointPanel from './BreakpointPanel.svelte';
import { playerActions } from '../../stores/playerStore';
import { projectActions } from '../../stores';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';

describe('BreakpointPanel', () => {
  let story: Story;
  let passage1: Passage;
  let passage2: Passage;

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

    passage1 = story.getPassage(story.startPassage!)!;
    passage1.title = 'Start Passage';
    passage1.tags = ['intro', 'important'];

    passage2 = new Passage({
      title: 'Second Passage',
    });
    passage2.tags = ['quest', 'battle', 'boss'];
    story.addPassage(passage2);

    projectActions.loadProject({ ...story.serialize(), version: '1.0.0' }, 'test.json');
    playerActions.loadStory(story);
  });

  it('should render empty state when no breakpoints', async () => {
    const { getByText } = render(BreakpointPanel);

    await waitFor(() => {
      expect(getByText('Breakpoints')).toBeTruthy();
    });

    expect(getByText('No breakpoints set.')).toBeTruthy();
  });

  it('should show instructions when empty', async () => {
    const { getByText } = render(BreakpointPanel);

    await waitFor(() => {
      expect(getByText(/Click the 🔴 button/)).toBeTruthy();
    });
  });

  it('should display breakpoint list when breakpoints exist', async () => {
    playerActions.toggleBreakpoint(passage1.id);
    playerActions.toggleBreakpoint(passage2.id);

    const { getByText } = render(BreakpointPanel);

    await waitFor(() => {
      expect(getByText('Start Passage')).toBeTruthy();
    });

    expect(getByText('Second Passage')).toBeTruthy();
  });

  it('should show passage tags', async () => {
    playerActions.toggleBreakpoint(passage1.id);

    const { getByText } = render(BreakpointPanel);

    await waitFor(() => {
      expect(getByText('intro')).toBeTruthy();
    });

    expect(getByText('important')).toBeTruthy();
  });

  it('should limit tag display to 2 tags', async () => {
    playerActions.toggleBreakpoint(passage2.id);

    const { getByText, queryByText } = render(BreakpointPanel);

    // Should show first 2 tags
    await waitFor(() => {
      expect(getByText('quest')).toBeTruthy();
    });

    expect(getByText('battle')).toBeTruthy();

    // Should show "+1" for the remaining tag
    expect(getByText('+1')).toBeTruthy();

    // "boss" tag should not be directly visible
    expect(queryByText('boss')).toBeNull();
  });

  it('should render clear all button when breakpoints exist', async () => {
    playerActions.toggleBreakpoint(passage1.id);

    const { getByText } = render(BreakpointPanel);

    await waitFor(() => {
      expect(getByText('Clear All')).toBeTruthy();
    });
  });

  it('should render remove buttons for each breakpoint', async () => {
    playerActions.toggleBreakpoint(passage1.id);
    playerActions.toggleBreakpoint(passage2.id);

    const { container } = render(BreakpointPanel);

    // Check for remove buttons (×)
    await waitFor(() => {
      const removeButtons = container.querySelectorAll('button');
      const hasRemoveButton = Array.from(removeButtons).some(
        btn => btn.textContent?.includes('×')
      );
      expect(hasRemoveButton).toBe(true);
    });
  });
});
