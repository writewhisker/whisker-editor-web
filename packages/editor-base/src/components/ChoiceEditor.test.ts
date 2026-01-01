import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import ChoiceEditor from './ChoiceEditor.svelte';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}));

// Mock story store
const mockCurrentStory = writable<unknown>(null);

vi.mock('../stores/storyStateStore', () => ({
  currentStory: mockCurrentStory
}));

describe('ChoiceEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentStory.set(null);
  });

  describe('rendering', () => {
    it('should render empty state when no choices', () => {
      const { container, getByText } = render(ChoiceEditor, {
        props: { choices: [] }
      });

      expect(getByText('No choices yet')).toBeTruthy();
      expect(container.querySelector('.empty-state')).toBeTruthy();
    });

    it('should render choices header', () => {
      const { getByText } = render(ChoiceEditor, {
        props: { choices: [] }
      });

      expect(getByText('Choices')).toBeTruthy();
      expect(getByText('+ Add Choice')).toBeTruthy();
    });

    it('should render provided choices', () => {
      const choices = [
        { id: '1', text: 'Go north', target: 'Forest', choiceType: 'once' as const },
        { id: '2', text: 'Go south', target: 'Beach', choiceType: 'sticky' as const }
      ];

      const { getByText } = render(ChoiceEditor, {
        props: { choices }
      });

      expect(getByText('Go north')).toBeTruthy();
      expect(getByText('Go south')).toBeTruthy();
    });
  });

  describe('choice types', () => {
    it('should display once-only marker (+) for once choices', () => {
      const choices = [
        { id: '1', text: 'Once choice', target: 'Target', choiceType: 'once' as const }
      ];

      const { container } = render(ChoiceEditor, {
        props: { choices }
      });

      const marker = container.querySelector('.choice-marker');
      expect(marker?.textContent?.trim()).toBe('+');
    });

    it('should display sticky marker (*) for sticky choices', () => {
      const choices = [
        { id: '1', text: 'Sticky choice', target: 'Target', choiceType: 'sticky' as const }
      ];

      const { container } = render(ChoiceEditor, {
        props: { choices }
      });

      const marker = container.querySelector('.choice-marker.sticky');
      expect(marker?.textContent?.trim()).toBe('*');
    });
  });

  describe('adding choices', () => {
    it('should add a new choice when Add Choice clicked', async () => {
      const onChoicesChange = vi.fn();
      const { getByText } = render(ChoiceEditor, {
        props: { choices: [], onChoicesChange }
      });

      await fireEvent.click(getByText('+ Add Choice'));

      expect(onChoicesChange).toHaveBeenCalled();
      const newChoices = onChoicesChange.mock.calls[0][0];
      expect(newChoices.length).toBe(1);
      expect(newChoices[0].choiceType).toBe('once');
    });

    it('should expand new choice when added', async () => {
      const { getByText, container } = render(ChoiceEditor, {
        props: { choices: [] }
      });

      await fireEvent.click(getByText('+ Add Choice'));

      // New choice should be expanded (show details)
      expect(container.querySelector('.choice-details')).toBeTruthy();
    });
  });

  describe('WLS 1.0 syntax generation', () => {
    it('should generate correct WLS syntax for once-only choice', async () => {
      const choices = [
        { id: '1', text: 'Go north', target: 'Forest', choiceType: 'once' as const }
      ];

      const { container } = render(ChoiceEditor, {
        props: { choices }
      });

      // Click to expand
      const header = container.querySelector('.choice-header');
      if (header) await fireEvent.click(header);

      const syntax = container.querySelector('.wls-syntax');
      expect(syntax?.textContent).toContain('+ [Go north] -> Forest');
    });

    it('should generate correct WLS syntax for sticky choice', async () => {
      const choices = [
        { id: '1', text: 'Look around', target: 'Look', choiceType: 'sticky' as const }
      ];

      const { container } = render(ChoiceEditor, {
        props: { choices }
      });

      const header = container.querySelector('.choice-header');
      if (header) await fireEvent.click(header);

      const syntax = container.querySelector('.wls-syntax');
      expect(syntax?.textContent).toContain('* [Look around] -> Look');
    });

    it('should include condition in WLS syntax when present', async () => {
      const choices = [
        {
          id: '1',
          text: 'Buy item',
          target: 'Shop',
          choiceType: 'once' as const,
          condition: '$gold > 10'
        }
      ];

      const { container } = render(ChoiceEditor, {
        props: { choices }
      });

      const header = container.querySelector('.choice-header');
      if (header) await fireEvent.click(header);

      const syntax = container.querySelector('.wls-syntax');
      expect(syntax?.textContent).toContain('{if $gold > 10}');
    });

    it('should include action in WLS syntax when present', async () => {
      const choices = [
        {
          id: '1',
          text: 'Buy item',
          target: 'Shop',
          choiceType: 'once' as const,
          action: '$gold = $gold - 10'
        }
      ];

      const { container } = render(ChoiceEditor, {
        props: { choices }
      });

      const header = container.querySelector('.choice-header');
      if (header) await fireEvent.click(header);

      const syntax = container.querySelector('.wls-syntax');
      expect(syntax?.textContent).toContain('{$ $gold = $gold - 10}');
    });
  });

  describe('special targets', () => {
    it('should show END, BACK, RESTART as special targets', async () => {
      const { container, getByText } = render(ChoiceEditor, {
        props: { choices: [], availablePassages: ['Start', 'End'] }
      });

      await fireEvent.click(getByText('+ Add Choice'));

      const select = container.querySelector('select');
      expect(select).toBeTruthy();

      // Check for special target options
      const options = select?.querySelectorAll('option');
      const optionTexts = Array.from(options || []).map(o => o.textContent);

      expect(optionTexts).toContain('END (end story)');
      expect(optionTexts).toContain('BACK (go back)');
      expect(optionTexts).toContain('RESTART (restart story)');
    });
  });

  describe('choice manipulation', () => {
    it('should allow removing a choice', async () => {
      const onChoicesChange = vi.fn();
      const choices = [
        { id: '1', text: 'Choice 1', target: 'Target', choiceType: 'once' as const }
      ];

      const { container } = render(ChoiceEditor, {
        props: { choices, onChoicesChange }
      });

      const deleteBtn = container.querySelector('.btn-delete');
      expect(deleteBtn).toBeTruthy();

      if (deleteBtn) await fireEvent.click(deleteBtn);

      const lastCall = onChoicesChange.mock.calls[onChoicesChange.mock.calls.length - 1];
      expect(lastCall[0].length).toBe(0);
    });

    it('should allow duplicating a choice', async () => {
      const onChoicesChange = vi.fn();
      const choices = [
        { id: '1', text: 'Original', target: 'Target', choiceType: 'once' as const }
      ];

      const { container } = render(ChoiceEditor, {
        props: { choices, onChoicesChange }
      });

      // Find duplicate button (clipboard icon)
      const buttons = container.querySelectorAll('.btn-icon');
      const duplicateBtn = Array.from(buttons).find(b => b.textContent?.includes('📋'));

      if (duplicateBtn) await fireEvent.click(duplicateBtn);

      const lastCall = onChoicesChange.mock.calls[onChoicesChange.mock.calls.length - 1];
      expect(lastCall[0].length).toBe(2);
      expect(lastCall[0][1].text).toContain('(copy)');
    });
  });

  describe('accessibility', () => {
    it('should have labels for all inputs', async () => {
      const choices = [
        { id: '1', text: 'Test', target: 'Target', choiceType: 'once' as const }
      ];

      const { container } = render(ChoiceEditor, {
        props: { choices }
      });

      // Expand choice
      const header = container.querySelector('.choice-header');
      if (header) await fireEvent.click(header);

      // Check for labels
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);

      // Verify labels have for attributes
      labels.forEach(label => {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const input = container.querySelector(`#${forAttr}`);
          expect(input).toBeTruthy();
        }
      });
    });
  });
});
