/**
 * Tests for DiffViewer component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import DiffViewer from './DiffViewer.svelte';

describe('DiffViewer', () => {
  it('should render with default props', () => {
    const { container } = render(DiffViewer, {
      props: {
        localContent: 'Line 1\nLine 2',
        remoteContent: 'Line 1\nLine 3',
      },
    });

    expect(container.querySelector('.diff-viewer')).toBeTruthy();
  });

  it('should display local and remote labels', () => {
    const { getByText } = render(DiffViewer, {
      props: {
        localContent: 'Content',
        remoteContent: 'Content',
        localLabel: 'My Version',
        remoteLabel: 'Their Version',
      },
    });

    expect(getByText('My Version')).toBeTruthy();
    expect(getByText('Their Version')).toBeTruthy();
  });

  it('should show split view by default', () => {
    const { container } = render(DiffViewer, {
      props: {
        localContent: 'Content',
        remoteContent: 'Content',
      },
    });

    expect(container.querySelector('.diff-split')).toBeTruthy();
    expect(container.querySelector('.diff-unified')).toBeFalsy();
  });

  it('should have view mode toggle buttons', () => {
    const { getByText } = render(DiffViewer, {
      props: {
        localContent: 'Content',
        remoteContent: 'Content',
      },
    });

    expect(getByText('Split View')).toBeTruthy();
    expect(getByText('Unified View')).toBeTruthy();
  });

  it('should show line numbers when enabled', () => {
    const { container } = render(DiffViewer, {
      props: {
        localContent: 'Line 1\nLine 2',
        remoteContent: 'Line 1\nLine 2',
        showLineNumbers: true,
      },
    });

    expect(container.querySelector('.line-number')).toBeTruthy();
  });

  it('should display diff content', () => {
    const { container } = render(DiffViewer, {
      props: {
        localContent: 'Old line',
        remoteContent: 'New line',
      },
    });

    expect(container.textContent).toContain('Old line');
    expect(container.textContent).toContain('New line');
  });
});
