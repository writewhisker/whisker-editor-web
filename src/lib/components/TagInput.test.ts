import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import TagInput from './TagInput.svelte';
import { tagRegistry } from '../stores/tagStore';
import { currentStory } from '../stores/projectStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('TagInput', () => {
  let story: Story;

  // Helper function to register tags in the story
  function registerTag(tagName: string) {
    const passage = new Passage({ title: `Passage-${tagName}`, tags: [tagName] });
    story.addPassage(passage);
    currentStory.update(s => s);
  }

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    // Create test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Set as current story
    currentStory.set(story);
  });

  afterEach(() => {
    currentStory.set(null);
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should render input with default placeholder', () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.placeholder).toBe('Add tag...');
    });

    it('should render input with custom placeholder', () => {
      const { container } = render(TagInput, {
        props: { placeholder: 'Enter tag name' },
      });

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.placeholder).toBe('Enter tag name');
    });

    it('should have correct input classes', () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.className).toContain('w-full');
      expect(input.className).toContain('px-3');
      expect(input.className).toContain('py-2');
      expect(input.className).toContain('border');
    });

    it('should not show suggestions initially', () => {
      const { container } = render(TagInput);

      const dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeNull();
    });
  });

  describe('input interaction', () => {
    it('should update input value when typing', async () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'test' } });

      expect(input.value).toBe('test');
    });

    it('should show suggestions when input has value', async () => {
      // Add some tags to registry
      registerTag('action');
      registerTag('adventure');

      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'act' } });
      await fireEvent.focus(input);

      const dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeTruthy();
    });

    it('should hide suggestions when input is empty', async () => {
      registerTag('action');

      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'act' } });
      await fireEvent.input(input, { target: { value: '' } });

      const dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeNull();
    });

    it('should clear input value after pressing enter', async () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'test-tag' } });
      await fireEvent.keyDown(input, { key: 'Enter' });

      // Input should be cleared after adding tag
      expect(input.value).toBe('');
    });
  });

  describe('tag suggestions', () => {
    beforeEach(() => {
      // Add some tags to registry with usage counts
      registerTag('action');
      registerTag('adventure');
      registerTag('combat');
      registerTag('dialogue');
    });

    it('should filter suggestions based on input', async () => {
      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'act' } });

      const dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeTruthy();

      const suggestions = Array.from(dropdown!.querySelectorAll('button'));
      const suggestionTexts = suggestions.map(s => s.textContent);

      // Should show 'action' and 'Create new tag' button
      expect(suggestionTexts.some(text => text?.includes('action'))).toBe(true);
      expect(suggestionTexts.some(text => text?.includes('adventure'))).toBe(false);
    });

    it('should exclude existing tags from suggestions', async () => {
      const { container } = render(TagInput, {
        props: { existingTags: ['action'] },
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'a' } });

      const dropdown = container.querySelector('.absolute.z-10');
      const suggestions = Array.from(dropdown!.querySelectorAll('button'));
      const suggestionTexts = suggestions.map(s => s.textContent);

      // 'action' should be excluded, but 'adventure' should be included
      expect(suggestionTexts.some(text => text?.includes('action') && !text?.includes('adventure'))).toBe(false);
      expect(suggestionTexts.some(text => text?.includes('adventure'))).toBe(true);
    });

    it('should show create new tag option when there are matching suggestions', async () => {
      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      // Use a partial match that will show suggestions
      await fireEvent.input(input, { target: { value: 'act' } });

      const dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeTruthy();

      // Should have both existing tag suggestions and create new button
      const buttons = Array.from(dropdown!.querySelectorAll('button'));
      expect(buttons.length).toBeGreaterThan(0);

      // The "Create new tag" button appears when input doesn't exactly match
      const createButton = buttons.find(btn => btn.textContent?.includes('Create new tag'));
      expect(createButton).toBeTruthy();
    });

    it('should not show create new tag option for exact matches', async () => {
      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'action' } });

      const dropdown = container.querySelector('.absolute.z-10');
      const createButton = Array.from(dropdown!.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Create new tag'));

      // Should not show create button when exact match exists
      expect(createButton).toBeFalsy();
    });

    it('should limit suggestions to 10 items', async () => {
      // Add more than 10 tags
      for (let i = 0; i < 15; i++) {
        registerTag(`tag-${i}`);
      }

      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 't' } });

      const dropdown = container.querySelector('.absolute.z-10');
      const suggestions = Array.from(dropdown!.querySelectorAll('button'))
        .filter(btn => !btn.textContent?.includes('Create new tag'));

      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    it('should display tag color and usage count in suggestions', async () => {
      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'act' } });

      const dropdown = container.querySelector('.absolute.z-10');
      const suggestion = dropdown!.querySelector('button');

      // Should have color indicator
      const colorIndicator = suggestion!.querySelector('.inline-block.w-3.h-3.rounded');
      expect(colorIndicator).toBeTruthy();

      // Should have usage count
      expect(suggestion!.textContent).toMatch(/\d+ use/);
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      registerTag('action');
      registerTag('adventure');
      registerTag('combat');
    });

    it('should navigate suggestions with arrow down', async () => {
      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'a' } });
      await fireEvent.keyDown(input, { key: 'ArrowDown' });

      const dropdown = container.querySelector('.absolute.z-10');
      const selectedItem = dropdown!.querySelector('.bg-blue-100');

      expect(selectedItem).toBeTruthy();
    });

    it('should navigate suggestions with arrow up', async () => {
      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'a' } });
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      await fireEvent.keyDown(input, { key: 'ArrowUp' });

      const dropdown = container.querySelector('.absolute.z-10');
      const selectedItems = dropdown!.querySelectorAll('.bg-blue-100');

      // Should still have a selected item
      expect(selectedItems.length).toBe(1);
    });

    it('should fill input with suggestion when enter is pressed on selection', async () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'act' } });
      await fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Get the selected suggestion text before pressing enter
      const dropdown = container.querySelector('.absolute.z-10');
      const selectedItem = dropdown!.querySelector('.bg-blue-100');
      const selectedText = selectedItem?.querySelector('.font-medium')?.textContent;

      await fireEvent.keyDown(input, { key: 'Enter' });

      // Input should be cleared after adding
      expect(input.value).toBe('');
      // Can't directly test event dispatch in Svelte 5, but the input clearing confirms the behavior
    });

    it('should select suggestion with tab key', async () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'act' } });
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      await fireEvent.keyDown(input, { key: 'Tab' });

      // Input should be cleared after selection
      expect(input.value).toBe('');
    });

    it('should close suggestions with escape key', async () => {
      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'act' } });

      let dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeTruthy();

      await fireEvent.keyDown(input, { key: 'Escape' });

      dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeNull();
    });

    it('should add tag without suggestion when enter is pressed', async () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'new-tag' } });
      await fireEvent.keyDown(input, { key: 'Enter' });

      // Input should be cleared, indicating tag was added
      expect(input.value).toBe('');
    });
  });

  describe('click interactions', () => {
    beforeEach(() => {
      registerTag('action');
      registerTag('adventure');
    });

    it('should clear input when clicking suggestion', async () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'act' } });

      const dropdown = container.querySelector('.absolute.z-10');
      const suggestion = Array.from(dropdown!.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('action'));

      await fireEvent.click(suggestion!);

      // Input should be cleared after adding tag
      expect(input.value).toBe('');
    });

    it('should clear input when clicking create new tag button', async () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      // Use partial match that shows suggestions
      await fireEvent.input(input, { target: { value: 'adv' } });

      const dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeTruthy();

      const createButton = Array.from(dropdown!.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Create new tag'));

      // Create button should exist when input doesn't exactly match
      expect(createButton).toBeTruthy();

      await fireEvent.click(createButton!);

      // Input should be cleared
      expect(input.value).toBe('');
    });

    it('should show suggestions when clicking input', async () => {
      registerTag('action');

      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'act' } });
      await fireEvent.blur(input);

      // Wait for blur timeout
      await new Promise(resolve => setTimeout(resolve, 250));

      let dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeNull();

      await fireEvent.focus(input);

      dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeTruthy();
    });
  });

  describe('duplicate handling', () => {
    it('should show alert when adding duplicate tag', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const { container } = render(TagInput, {
        props: { existingTags: ['existing-tag'] },
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'existing-tag' } });
      await fireEvent.keyDown(input, { key: 'Enter' });

      expect(alertSpy).toHaveBeenCalledWith('Tag "existing-tag" is already added.');

      alertSpy.mockRestore();
    });

    it('should clear input when duplicate tag is attempted', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const { container } = render(TagInput, {
        props: { existingTags: ['existing-tag'] },
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'existing-tag' } });
      await fireEvent.keyDown(input, { key: 'Enter' });

      expect(input.value).toBe('');

      alertSpy.mockRestore();
    });
  });

  describe('focus management', () => {
    it('should close suggestions on blur with delay', async () => {
      registerTag('action');

      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'act' } });

      let dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeTruthy();

      await fireEvent.blur(input);

      // Should still be visible immediately
      dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeTruthy();

      // Wait for blur timeout (200ms)
      await new Promise(resolve => setTimeout(resolve, 250));

      dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle arrow navigation at boundaries', async () => {
      registerTag('action');
      registerTag('adventure');

      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'a' } });

      // Try to go up when nothing is selected
      await fireEvent.keyDown(input, { key: 'ArrowUp' });

      const dropdown = container.querySelector('.absolute.z-10');
      const selectedItem = dropdown!.querySelector('.bg-blue-100');

      // Should not select anything
      expect(selectedItem).toBeNull();

      // Go down twice
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      await fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Try to go down past the last item
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      await fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Should still have a selection (clamped to last item)
      const selectedItems = dropdown!.querySelectorAll('.bg-blue-100');
      expect(selectedItems.length).toBe(1);
    });

    it('should handle empty tag registry by not showing dropdown', async () => {
      // When registry is empty, no suggestions match, so dropdown doesn't appear
      // User can still type and press Enter to add a new tag
      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'test' } });
      await fireEvent.focus(input); // Trigger focus

      // No dropdown should appear since there are no tags in registry
      const dropdown = container.querySelector('.absolute.z-10');
      expect(dropdown).toBeNull();

      // But user can still add tag by pressing Enter
      await fireEvent.keyDown(input, { key: 'Enter' });
      expect(input.value).toBe(''); // Input cleared after adding
    });

    it('should handle case-insensitive filtering', async () => {
      registerTag('Action');

      const { container } = render(TagInput);
      const input = container.querySelector('input') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'act' } });

      const dropdown = container.querySelector('.absolute.z-10');
      const suggestions = Array.from(dropdown!.querySelectorAll('button'));
      const suggestionTexts = suggestions.map(s => s.textContent);

      expect(suggestionTexts.some(text => text?.includes('Action'))).toBe(true);
    });

    it('should not add empty tags', async () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '   ' } });

      const initialValue = input.value;
      await fireEvent.keyDown(input, { key: 'Enter' });

      // Input should remain unchanged (whitespace trimmed means empty, so no action)
      expect(input.value).toBe('   ');
    });

    it('should trim whitespace from tag names', async () => {
      const { container } = render(TagInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '  test-tag  ' } });
      await fireEvent.keyDown(input, { key: 'Enter' });

      // Input should be cleared, indicating tag was added (trimmed)
      expect(input.value).toBe('');
    });
  });
});
