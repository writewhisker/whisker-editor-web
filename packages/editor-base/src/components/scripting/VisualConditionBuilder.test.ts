/**
 * Tests for VisualConditionBuilder
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import VisualConditionBuilder from './VisualConditionBuilder.svelte';
import { currentStory } from '../../stores/storyStateStore';
import { Story, Variable } from '@whisker/core-ts';

describe('VisualConditionBuilder', () => {
  let story: Story;

  beforeEach(() => {
    // Create a test story with variables
    story = new Story({
      metadata: { title: 'Test Story' }
    });

    story.addVariable(new Variable({ name: 'score', type: 'number', initial: 0 }));
    story.addVariable(new Variable({ name: 'playerName', type: 'string', initial: '' }));
    story.addVariable(new Variable({ name: 'hasKey', type: 'boolean', initial: false }));

    currentStory.set(story);
  });

  describe('Initialization', () => {
    it('should render with default empty condition', () => {
      const { container } = render(VisualConditionBuilder);

      expect(container.querySelector('.visual-condition-builder')).toBeTruthy();
      expect(container.querySelector('.condition-group')).toBeTruthy();
    });

    it('should have one group and one rule by default', () => {
      const { container } = render(VisualConditionBuilder);

      const groups = container.querySelectorAll('.condition-group');
      const rules = container.querySelectorAll('.rule');

      expect(groups.length).toBe(1);
      expect(rules.length).toBe(1);
    });

    it('should display available variables in dropdown', () => {
      const { container } = render(VisualConditionBuilder);

      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const options = Array.from(variableSelect.options);

      expect(options.some(opt => opt.textContent?.includes('score'))).toBe(true);
      expect(options.some(opt => opt.textContent?.includes('playerName'))).toBe(true);
      expect(options.some(opt => opt.textContent?.includes('hasKey'))).toBe(true);
    });
  });

  describe('Simple Conditions', () => {
    it('should generate simple equality condition', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange, outputFormat: 'whisker' }
      });

      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const valueInput = container.querySelector('.rule-input') as HTMLInputElement;

      // Set variable
      fireEvent.change(variableSelect, { target: { value: 'score' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Set value
      fireEvent.input(valueInput, { target: { value: '100' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check generated condition
      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('score');
      expect(lastCall[0]).toContain('100');
    });

    it('should generate condition with different operators', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange, outputFormat: 'whisker' }
      });

      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const operatorSelect = container.querySelector('.operator-select') as HTMLSelectElement;
      const valueInput = container.querySelector('.rule-input') as HTMLInputElement;

      // Set up condition: score > 50
      fireEvent.change(variableSelect, { target: { value: 'score' } });
      fireEvent.change(operatorSelect, { target: { value: '>' } });
      fireEvent.input(valueInput, { target: { value: '50' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('>');
      expect(lastCall[0]).toContain('50');
    });

    it('should auto-detect value type based on variable', async () => {
      const { container } = render(VisualConditionBuilder);

      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const typeSelect = container.querySelector('.type-select') as HTMLSelectElement;

      // Select number variable
      fireEvent.change(variableSelect, { target: { value: 'score' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(typeSelect.value).toBe('number');
    });

    it('should handle boolean variables', async () => {
      const { container } = render(VisualConditionBuilder);

      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;

      // Select boolean variable
      fireEvent.change(variableSelect, { target: { value: 'hasKey' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should show boolean dropdown instead of text input
      const valueSelect = container.querySelector('.value-select') as HTMLSelectElement;
      expect(valueSelect).toBeTruthy();
      expect(valueSelect.value).toBe('true');
    });
  });

  describe('Multiple Rules', () => {
    it('should add new rule to group', async () => {
      const { container } = render(VisualConditionBuilder);

      const addRuleBtn = container.querySelector('.btn-add-rule') as HTMLButtonElement;

      let rules = container.querySelectorAll('.rule');
      expect(rules.length).toBe(1);

      fireEvent.click(addRuleBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      rules = container.querySelectorAll('.rule');
      expect(rules.length).toBe(2);
    });

    it('should remove rule from group', async () => {
      const { container } = render(VisualConditionBuilder);

      // Add a second rule first
      const addRuleBtn = container.querySelector('.btn-add-rule') as HTMLButtonElement;
      fireEvent.click(addRuleBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      let rules = container.querySelectorAll('.rule');
      expect(rules.length).toBe(2);

      // Remove first rule
      const removeBtn = container.querySelector('.btn-remove-rule') as HTMLButtonElement;
      fireEvent.click(removeBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      rules = container.querySelectorAll('.rule');
      expect(rules.length).toBe(1);
    });

    it('should combine multiple rules with AND', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange, outputFormat: 'whisker' }
      });

      // Add second rule
      const addRuleBtn = container.querySelector('.btn-add-rule') as HTMLButtonElement;
      fireEvent.click(addRuleBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      const rules = container.querySelectorAll('.rule');

      // Set first rule: score > 50
      const var1 = rules[0].querySelector('.variable-select') as HTMLSelectElement;
      const op1 = rules[0].querySelector('.operator-select') as HTMLSelectElement;
      const val1 = rules[0].querySelector('.rule-input') as HTMLInputElement;

      fireEvent.change(var1, { target: { value: 'score' } });
      fireEvent.change(op1, { target: { value: '>' } });
      fireEvent.input(val1, { target: { value: '50' } });

      // Set second rule: hasKey == true
      const var2 = rules[1].querySelector('.variable-select') as HTMLSelectElement;
      fireEvent.change(var2, { target: { value: 'hasKey' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('score');
      expect(lastCall[0]).toContain('hasKey');
      expect(lastCall[0]).toContain('and');
    });

    it('should combine multiple rules with OR', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange, outputFormat: 'whisker' }
      });

      // Add second rule
      const addRuleBtn = container.querySelector('.btn-add-rule') as HTMLButtonElement;
      fireEvent.click(addRuleBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Change combinator to OR
      const combinatorSelect = container.querySelector('.combinator-select') as HTMLSelectElement;
      fireEvent.change(combinatorSelect, { target: { value: 'OR' } });

      const rules = container.querySelectorAll('.rule');

      // Set rules
      const var1 = rules[0].querySelector('.variable-select') as HTMLSelectElement;
      const val1 = rules[0].querySelector('.rule-input') as HTMLInputElement;
      fireEvent.change(var1, { target: { value: 'score' } });
      fireEvent.input(val1, { target: { value: '100' } });

      const var2 = rules[1].querySelector('.variable-select') as HTMLSelectElement;
      fireEvent.change(var2, { target: { value: 'hasKey' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('or');
    });
  });

  describe('Multiple Groups', () => {
    it('should add new group', async () => {
      const { container } = render(VisualConditionBuilder);

      const addGroupBtn = container.querySelector('.btn-add-group') as HTMLButtonElement;

      let groups = container.querySelectorAll('.condition-group');
      expect(groups.length).toBe(1);

      fireEvent.click(addGroupBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      groups = container.querySelectorAll('.condition-group');
      expect(groups.length).toBe(2);
    });

    it('should remove group', async () => {
      const { container } = render(VisualConditionBuilder);

      // Add second group
      const addGroupBtn = container.querySelector('.btn-add-group') as HTMLButtonElement;
      fireEvent.click(addGroupBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      let groups = container.querySelectorAll('.condition-group');
      expect(groups.length).toBe(2);

      // Remove first group
      const removeBtn = container.querySelector('.btn-remove-group') as HTMLButtonElement;
      fireEvent.click(removeBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      groups = container.querySelectorAll('.condition-group');
      expect(groups.length).toBe(1);
    });

    it('should combine groups with parentheses', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange, outputFormat: 'whisker' }
      });

      // Add second group
      const addGroupBtn = container.querySelector('.btn-add-group') as HTMLButtonElement;
      fireEvent.click(addGroupBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      const groups = container.querySelectorAll('.condition-group');

      // Set condition in first group
      const var1 = groups[0].querySelector('.variable-select') as HTMLSelectElement;
      const val1 = groups[0].querySelector('.rule-input') as HTMLInputElement;
      fireEvent.change(var1, { target: { value: 'score' } });
      fireEvent.input(val1, { target: { value: '100' } });

      // Set condition in second group
      const var2 = groups[1].querySelector('.variable-select') as HTMLSelectElement;
      fireEvent.change(var2, { target: { value: 'hasKey' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      // Should have parentheses for grouping
      expect(lastCall[0]).toMatch(/\(.*\).*\(.*\)/);
    });
  });

  describe('Output Formats', () => {
    it('should generate Whisker format by default', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange }
      });

      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const valueInput = container.querySelector('.rule-input') as HTMLInputElement;

      fireEvent.change(variableSelect, { target: { value: 'score' } });
      fireEvent.input(valueInput, { target: { value: '100' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      // Should use {{var}} format
      expect(lastCall[0]).toContain('{{');
      expect(lastCall[0]).toContain('}}');
    });

    it('should generate Lua format when specified', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange, outputFormat: 'lua' }
      });

      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const valueInput = container.querySelector('.rule-input') as HTMLInputElement;

      fireEvent.change(variableSelect, { target: { value: 'score' } });
      fireEvent.input(valueInput, { target: { value: '100' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      // Should NOT use {{var}} format
      expect(lastCall[0]).not.toContain('{{');
      expect(lastCall[0]).toContain('score');
    });

    it('should handle string values with quotes', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange, outputFormat: 'whisker' }
      });

      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const valueInput = container.querySelector('.rule-input') as HTMLInputElement;

      fireEvent.change(variableSelect, { target: { value: 'playerName' } });
      fireEvent.input(valueInput, { target: { value: 'Alice' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      // String values should be quoted
      expect(lastCall[0]).toContain('"Alice"');
    });
  });

  describe('UI Actions', () => {
    it('should clear all conditions', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange }
      });

      // Set up a condition
      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const valueInput = container.querySelector('.rule-input') as HTMLInputElement;
      fireEvent.change(variableSelect, { target: { value: 'score' } });
      fireEvent.input(valueInput, { target: { value: '100' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Clear
      const clearBtn = container.querySelector('.btn-action') as HTMLButtonElement;
      fireEvent.click(clearBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should be back to default state
      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('');
    });

    it('should toggle advanced options', async () => {
      const { container } = render(VisualConditionBuilder);

      const toggleBtn = container.querySelector('.btn-toggle') as HTMLButtonElement;

      // Advanced options should be hidden initially
      let advancedOptions = container.querySelector('.advanced-options');
      expect(advancedOptions).toBeFalsy();

      // Show advanced options
      fireEvent.click(toggleBtn);
      await new Promise(resolve => setTimeout(resolve, 0));

      advancedOptions = container.querySelector('.advanced-options');
      expect(advancedOptions).toBeTruthy();
    });

    it('should display empty state correctly', () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange }
      });

      const output = container.querySelector('.output-display code');
      expect(output?.textContent).toBe('(empty)');
    });

    it('should enable copy button when condition exists', async () => {
      const { container } = render(VisualConditionBuilder);

      const copyBtn = container.querySelector('.btn-copy') as HTMLButtonElement;

      // Should be disabled initially
      expect(copyBtn.disabled).toBe(true);

      // Set up a condition
      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const valueInput = container.querySelector('.rule-input') as HTMLInputElement;
      fireEvent.change(variableSelect, { target: { value: 'score' } });
      fireEvent.input(valueInput, { target: { value: '100' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should be enabled now
      expect(copyBtn.disabled).toBe(false);
    });
  });

  describe('Value Types', () => {
    it('should handle variable references', async () => {
      const onConditionChange = vi.fn();
      const { container } = render(VisualConditionBuilder, {
        props: { onConditionChange, outputFormat: 'whisker' }
      });

      const variableSelect = container.querySelector('.variable-select') as HTMLSelectElement;
      const typeSelect = container.querySelector('.type-select') as HTMLSelectElement;
      const valueInput = container.querySelector('.rule-input') as HTMLInputElement;

      fireEvent.change(variableSelect, { target: { value: 'score' } });
      fireEvent.change(typeSelect, { target: { value: 'variable' } });
      fireEvent.input(valueInput, { target: { value: 'maxScore' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      const calls = onConditionChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      // Both variables should be in {{}} format
      expect(lastCall[0]).toContain('{{score}}');
      expect(lastCall[0]).toContain('{{maxScore}}');
    });
  });
});
