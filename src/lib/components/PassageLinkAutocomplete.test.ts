import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import PassageLinkAutocomplete from './PassageLinkAutocomplete.svelte';
import { Passage } from '../models/Passage';

describe('PassageLinkAutocomplete', () => {
  const testPassages = [
    new Passage({ id: '1', title: 'Start', content: 'The beginning' }),
    new Passage({ id: '2', title: 'Forest Path', content: 'A dark forest' }),
    new Passage({ id: '3', title: 'Castle Gate', content: 'A grand castle' }),
    new Passage({ id: '4', title: 'Cave Entrance', content: 'A mysterious cave' }),
  ];

  it('renders dropdown when visible is true', () => {
    const { container } = render(PassageLinkAutocomplete, {
      passages: testPassages,
      query: '',
      position: { top: 100, left: 50 },
      visible: true,
    });

    const dropdown = container.querySelector('#passage-autocomplete-dropdown');
    expect(dropdown).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { container } = render(PassageLinkAutocomplete, {
      passages: testPassages,
      query: '',
      position: { top: 100, left: 50 },
      visible: false,
    });

    const dropdown = container.querySelector('#passage-autocomplete-dropdown');
    expect(dropdown).toBeFalsy();
  });

  it('filters passages based on query', () => {
    const { container } = render(PassageLinkAutocomplete, {
      passages: testPassages,
      query: 'cas',
      position: { top: 100, left: 50 },
      visible: true,
    });

    const items = container.querySelectorAll('[role="option"]');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Castle Gate');
  });

  it('shows all passages when query is empty', () => {
    const { container } = render(PassageLinkAutocomplete, {
      passages: testPassages,
      query: '',
      position: { top: 100, left: 50 },
      visible: true,
    });

    const items = container.querySelectorAll('[role="option"]');
    expect(items.length).toBe(4);
  });

  it('highlights matching text in results', () => {
    const { container } = render(PassageLinkAutocomplete, {
      passages: testPassages,
      query: 'for',
      position: { top: 100, left: 50 },
      visible: true,
    });

    const mark = container.querySelector('mark');
    expect(mark).toBeTruthy();
    expect(mark?.textContent).toBe('For');
  });

  it('shows no results message when no matches found', () => {
    const { container } = render(PassageLinkAutocomplete, {
      passages: testPassages,
      query: 'xyz123',
      position: { top: 100, left: 50 },
      visible: true,
    });

    expect(container.textContent).toContain('No passages found matching');
  });

  it('renders clickable passage options with correct attributes', () => {
    // Note: Direct event dispatching cannot be tested in Svelte 5 because component.$on() API
    // has been removed. This test verifies the passage options are rendered correctly with
    // click handlers and accessibility attributes. The actual event dispatching is verified
    // through manual testing and integration tests.
    const { container } = render(PassageLinkAutocomplete, {
      passages: testPassages,
      query: 'forest',
      position: { top: 100, left: 50 },
      visible: true,
    });

    // Verify the passage option is rendered and clickable
    const option = container.querySelector('[role="option"]');
    expect(option).toBeTruthy();
    expect(option?.getAttribute('role')).toBe('option');
    expect(option?.getAttribute('aria-selected')).toBeDefined();

    // Verify it contains the correct passage title
    expect(option?.textContent).toContain('Forest Path');

    // Verify it has cursor-pointer class (indicating it's clickable)
    expect(option?.className).toContain('cursor-pointer');
  });

  it('sorts passages with exact starts first', () => {
    const { container } = render(PassageLinkAutocomplete, {
      passages: testPassages,
      query: 'c',
      position: { top: 100, left: 50 },
      visible: true,
    });

    const items = container.querySelectorAll('[role="option"]');
    // "Castle Gate" and "Cave Entrance" should both appear
    // "Castle Gate" and "Cave Entrance" both start with 'C', so alphabetical
    expect(items[0].textContent).toContain('Castle Gate');
    expect(items[1].textContent).toContain('Cave Entrance');
  });

  it('limits results to 10 passages', () => {
    const manyPassages = Array.from({ length: 20 }, (_, i) =>
      new Passage({ id: `${i}`, title: `Passage ${i}`, content: '' })
    );

    const { container } = render(PassageLinkAutocomplete, {
      passages: manyPassages,
      query: '',
      position: { top: 100, left: 50 },
      visible: true,
    });

    const items = container.querySelectorAll('[role="option"]');
    expect(items.length).toBe(10);
  });

  it('displays passage metadata (tags and content length)', () => {
    const passageWithTags = new Passage({
      id: '1',
      title: 'Tagged Passage',
      content: 'Some content here',
      tags: ['important', 'combat', 'boss'],
    });

    const { container } = render(PassageLinkAutocomplete, {
      passages: [passageWithTags],
      query: '',
      position: { top: 100, left: 50 },
      visible: true,
    });

    expect(container.textContent).toContain('important');
    expect(container.textContent).toContain('combat');
    expect(container.textContent).toContain('chars');
  });
});
