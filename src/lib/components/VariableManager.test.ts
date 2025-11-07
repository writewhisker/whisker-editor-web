import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import VariableManager from './VariableManager.svelte';
import { currentStory, variableList } from '../stores/projectStore';
import { Story } from '@whisker/core-ts';
import { Variable } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';

describe('VariableManager', () => {
  let story: Story;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    currentStory.set(story);
  });

  afterEach(() => {
    currentStory.set(null);
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should show empty state when no variables', () => {
      const { container, getByText } = render(VariableManager);

      expect(getByText('No variables yet')).toBeTruthy();
      expect(container.textContent).toContain('Variables store data');
      expect(container.textContent).toContain('📊');
    });

    it('should display "+ Add" button', () => {
      const { getByText } = render(VariableManager);

      expect(getByText('+ Add')).toBeTruthy();
    });

    it('should display variable list when variables exist', () => {
      const variable = new Variable({ name: 'score', type: 'number', initial: 0 });
      story.addVariable(variable);
      currentStory.set(story);

      const { getByText, container } = render(VariableManager);

      expect(getByText('score')).toBeTruthy();
      // Type "number" is now in a select dropdown, not standalone text
      expect(container.textContent).toContain('Number');
      expect(container.querySelector('input[type="number"]')).toBeTruthy();
    });

    it('should display stats footer with variable count', () => {
      const { getByText } = render(VariableManager);

      expect(getByText('0 variables')).toBeTruthy();
    });

    it('should use singular form for single variable', () => {
      const variable = new Variable({ name: 'health', type: 'number', initial: 100 });
      story.addVariable(variable);
      currentStory.set(story);

      const { getByText } = render(VariableManager);

      expect(getByText('1 variable')).toBeTruthy();
    });

    it('should use plural form for multiple variables', () => {
      story.addVariable(new Variable({ name: 'health', type: 'number', initial: 100 }));
      story.addVariable(new Variable({ name: 'score', type: 'number', initial: 0 }));
      currentStory.set(story);

      const { getByText } = render(VariableManager);

      expect(getByText('2 variables')).toBeTruthy();
    });
  });

  describe('add variable dialog', () => {
    it('should open add dialog when + Add button is clicked', async () => {
      const { getByText, getAllByText } = render(VariableManager);

      const addButton = getByText('+ Add');
      await fireEvent.click(addButton);

      // There are two "Add Variable" texts: heading and button
      const addVariableTexts = getAllByText('Add Variable');
      expect(addVariableTexts.length).toBeGreaterThan(0);
      expect(getByText('Name')).toBeTruthy();
      expect(getByText('Type')).toBeTruthy();
      expect(getByText('Initial Value')).toBeTruthy();
    });

    it('should close dialog when Cancel is clicked', async () => {
      const { getByText, getAllByText, queryByText, container } = render(VariableManager);

      await fireEvent.click(getByText('+ Add'));

      // Dialog should be open - verify by checking for dialog structure
      const dialog = container.querySelector('.fixed.inset-0');
      expect(dialog).toBeTruthy();

      await fireEvent.click(getByText('Cancel'));

      // Dialog should be closed - verify no dialog structure
      const closedDialog = container.querySelector('.fixed.inset-0');
      expect(closedDialog).toBeNull();
    });

    it('should have Add Variable button disabled when name is empty', async () => {
      const { getByText, container } = render(VariableManager);

      await fireEvent.click(getByText('+ Add'));

      const addVarButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Add Variable'
      ) as HTMLButtonElement;

      expect(addVarButton.disabled).toBe(true);
    });

    it('should enable Add Variable button when name is entered', async () => {
      const { getByText, container } = render(VariableManager);

      await fireEvent.click(getByText('+ Add'));

      const nameInput = container.querySelector('input[placeholder="playerName"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'newVar' } });

      await waitFor(() => {
        const addVarButton = Array.from(container.querySelectorAll('button')).find(
          btn => btn.textContent === 'Add Variable'
        ) as HTMLButtonElement;
        expect(addVarButton.disabled).toBe(false);
      });
    });

    it('should create string variable with default values', async () => {
      const { getByText, container } = render(VariableManager);

      await fireEvent.click(getByText('+ Add'));

      const nameInput = container.querySelector('input[placeholder="playerName"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'playerName' } });

      const addVarButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Add Variable'
      ) as HTMLButtonElement;
      await fireEvent.click(addVarButton);

      await waitFor(() => {
        const vars = get(variableList);
        expect(vars.length).toBe(1);
        expect(vars[0].name).toBe('playerName');
        expect(vars[0].type).toBe('string');
      });
    });

    it('should create number variable', async () => {
      const { getByText, container } = render(VariableManager);

      await fireEvent.click(getByText('+ Add'));

      const nameInput = container.querySelector('input[placeholder="playerName"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'score' } });

      const typeSelect = container.querySelector('select') as HTMLSelectElement;
      await fireEvent.change(typeSelect, { target: { value: 'number' } });

      const valueInput = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(valueInput, { target: { value: '100' } });

      const addVarButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Add Variable'
      ) as HTMLButtonElement;
      await fireEvent.click(addVarButton);

      await waitFor(() => {
        const vars = get(variableList);
        expect(vars.length).toBe(1);
        expect(vars[0].name).toBe('score');
        expect(vars[0].type).toBe('number');
        expect(vars[0].initial).toBe(100);
      });
    });

    it('should create boolean variable', async () => {
      const { getByText, container } = render(VariableManager);

      await fireEvent.click(getByText('+ Add'));

      const nameInput = container.querySelector('input[placeholder="playerName"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'hasKey' } });

      const typeSelect = container.querySelector('select') as HTMLSelectElement;
      await fireEvent.change(typeSelect, { target: { value: 'boolean' } });

      const addVarButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Add Variable'
      ) as HTMLButtonElement;
      await fireEvent.click(addVarButton);

      await waitFor(() => {
        const vars = get(variableList);
        expect(vars.length).toBe(1);
        expect(vars[0].name).toBe('hasKey');
        expect(vars[0].type).toBe('boolean');
        expect(typeof vars[0].initial).toBe('boolean');
      });
    });

    it('should trim whitespace from variable name', async () => {
      const { getByText, container } = render(VariableManager);

      await fireEvent.click(getByText('+ Add'));

      const nameInput = container.querySelector('input[placeholder="playerName"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: '  testVar  ' } });

      const addVarButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Add Variable'
      ) as HTMLButtonElement;
      await fireEvent.click(addVarButton);

      await waitFor(() => {
        const vars = get(variableList);
        expect(vars[0].name).toBe('testVar');
      });
    });

    it('should show alert when adding duplicate variable name', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      story.addVariable(new Variable({ name: 'existing', type: 'string', initial: '' }));
      currentStory.set(story);

      const { getByText, container } = render(VariableManager);

      await fireEvent.click(getByText('+ Add'));

      const nameInput = container.querySelector('input[placeholder="playerName"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'existing' } });

      const addVarButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Add Variable'
      ) as HTMLButtonElement;
      await fireEvent.click(addVarButton);

      expect(alertSpy).toHaveBeenCalledWith('A variable with this name already exists!');

      alertSpy.mockRestore();
    });
  });

  describe('variable display', () => {
    it('should display variable name with font-mono', () => {
      story.addVariable(new Variable({ name: 'testVar', type: 'string', initial: 'value' }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      const nameElement = Array.from(container.querySelectorAll('.font-mono')).find(
        el => el.textContent === 'testVar'
      );
      expect(nameElement).toBeTruthy();
    });

    it('should display type badge', () => {
      story.addVariable(new Variable({ name: 'count', type: 'number', initial: 0 }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      // Type is now in a select dropdown, not a badge
      const typeSelect = container.querySelector('select');
      expect(typeSelect).toBeTruthy();
      expect(typeSelect?.value).toBe('number');
    });

    it('should display text input for string variables', () => {
      story.addVariable(new Variable({ name: 'name', type: 'string', initial: 'Player' }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      const input = container.querySelector('input[type="text"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe('Player');
    });

    it('should display number input for number variables', () => {
      story.addVariable(new Variable({ name: 'health', type: 'number', initial: 100 }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe('100');
    });

    it('should display select for boolean variables', () => {
      story.addVariable(new Variable({ name: 'isAlive', type: 'boolean', initial: true }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      // There are multiple selects: one for type, one for boolean value
      const selects = container.querySelectorAll('select');
      const booleanSelect = Array.from(selects).find(s => {
        const options = Array.from(s.querySelectorAll('option'));
        return options.some(o => o.value === 'true' || o.value === 'false');
      }) as HTMLSelectElement;
      expect(booleanSelect).toBeTruthy();
      expect(booleanSelect.value).toBe('true');
    });

    it('should display copy and delete buttons', () => {
      story.addVariable(new Variable({ name: 'test', type: 'string', initial: '' }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      // Look for buttons by their emoji content
      const buttons = Array.from(container.querySelectorAll('button'));
      const copyButton = buttons.find(btn => btn.textContent?.includes('📋'));
      const deleteButton = buttons.find(btn => btn.textContent?.includes('🗑'));

      expect(copyButton).toBeTruthy();
      expect(deleteButton).toBeTruthy();
    });
  });

  describe('update variable value', () => {
    it('should update string variable value', async () => {
      story.addVariable(new Variable({ name: 'name', type: 'string', initial: 'Old' }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      const input = container.querySelector('input[type="text"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'New' } });

      await waitFor(() => {
        const variable = get(currentStory)?.getVariable('name');
        expect(variable?.initial).toBe('New');
      });
    });

    it('should update number variable value', async () => {
      story.addVariable(new Variable({ name: 'score', type: 'number', initial: 0 }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '50' } });

      await waitFor(() => {
        const variable = get(currentStory)?.getVariable('score');
        expect(variable?.initial).toBe(50);
      });
    });

    it('should update boolean variable value', async () => {
      story.addVariable(new Variable({ name: 'flag', type: 'boolean', initial: false }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      // Find the boolean value select (not the type select)
      const selects = container.querySelectorAll('select');
      const booleanSelect = Array.from(selects).find(s => {
        const options = Array.from(s.querySelectorAll('option'));
        return options.some(o => o.value === 'true' || o.value === 'false');
      }) as HTMLSelectElement;

      await fireEvent.change(booleanSelect, { target: { value: 'true' } });

      await waitFor(() => {
        const variable = get(currentStory)?.getVariable('flag');
        expect(variable?.initial).toBe(true);
      });
    });
  });

  describe('delete variable', () => {
    it('should show confirm dialog when deleting variable', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      story.addVariable(new Variable({ name: 'toDelete', type: 'string', initial: '' }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      const deleteButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.title === 'Delete variable'
      ) as HTMLButtonElement;
      await fireEvent.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Delete variable "toDelete"? This will not remove it from passage content.'
      );

      confirmSpy.mockRestore();
    });

    it('should delete variable when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      story.addVariable(new Variable({ name: 'toDelete', type: 'string', initial: '' }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      const deleteButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.title === 'Delete variable'
      ) as HTMLButtonElement;
      await fireEvent.click(deleteButton);

      await waitFor(() => {
        const vars = get(variableList);
        expect(vars.length).toBe(0);
      });

      confirmSpy.mockRestore();
    });

    it('should not delete variable when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      story.addVariable(new Variable({ name: 'kept', type: 'string', initial: '' }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      const deleteButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.title === 'Delete variable'
      ) as HTMLButtonElement;
      await fireEvent.click(deleteButton);

      const vars = get(variableList);
      expect(vars.length).toBe(1);

      confirmSpy.mockRestore();
    });
  });

  describe('usage count', () => {
    it('should count variable usage in passage content', () => {
      story.addVariable(new Variable({ name: 'score', type: 'number', initial: 0 }));

      const passage = new Passage({
        title: 'Test',
        content: 'Your score is {{score}}. High score: {{score}}.',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(VariableManager);

      // Phase 3: Now counts locations, not occurrences (content = 1 location)
      expect(getByText('Used 1 time')).toBeTruthy();
    });

    it('should count variable usage in choice conditions', () => {
      story.addVariable(new Variable({ name: 'health', type: 'number', initial: 100 }));

      const passage = new Passage({
        title: 'Test',
        content: 'Some content',
        position: { x: 0, y: 0 },
      });
      passage.choices.push(new Choice({
        id: 'choice-1',
        text: 'Fight',
        target: 'passage-2',
        condition: 'health > 50',
      }));
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(VariableManager);

      expect(getByText('Used 1 time')).toBeTruthy();
    });

    it('should show "Used 0 times" for unused variable', () => {
      story.addVariable(new Variable({ name: 'unused', type: 'string', initial: '' }));
      currentStory.set(story);

      const { getByText } = render(VariableManager);

      expect(getByText('Used 0 times')).toBeTruthy();
    });

    it('should use singular form for single usage', () => {
      story.addVariable(new Variable({ name: 'name', type: 'string', initial: '' }));

      const passage = new Passage({
        title: 'Test',
        content: 'Hello {{name}}',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { getByText } = render(VariableManager);

      expect(getByText('Used 1 time')).toBeTruthy();
    });
  });

  describe('copy to clipboard', () => {
    it('should copy variable syntax to clipboard', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy,
        },
      });

      story.addVariable(new Variable({ name: 'testVar', type: 'string', initial: '' }));
      currentStory.set(story);

      const { container } = render(VariableManager);

      // Find copy button by emoji content
      const buttons = Array.from(container.querySelectorAll('button'));
      const copyButton = buttons.find(btn => btn.textContent?.includes('📋')) as HTMLButtonElement;

      expect(copyButton).toBeTruthy();
      await fireEvent.click(copyButton);

      expect(writeTextSpy).toHaveBeenCalledWith('{{testVar}}');
      expect(alertSpy).toHaveBeenCalledWith('Copied {{testVar}} to clipboard');

      alertSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple variables', () => {
      story.addVariable(new Variable({ name: 'var1', type: 'string', initial: 'a' }));
      story.addVariable(new Variable({ name: 'var2', type: 'number', initial: 0 }));
      story.addVariable(new Variable({ name: 'var3', type: 'boolean', initial: true }));
      currentStory.set(story);

      const { getByText } = render(VariableManager);

      expect(getByText('var1')).toBeTruthy();
      expect(getByText('var2')).toBeTruthy();
      expect(getByText('var3')).toBeTruthy();
      expect(getByText('3 variables')).toBeTruthy();
    });

    it('should handle empty string as number initial value', async () => {
      const { getByText, container } = render(VariableManager);

      await fireEvent.click(getByText('+ Add'));

      const nameInput = container.querySelector('input[placeholder="playerName"]') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'score' } });

      const typeSelect = container.querySelector('select') as HTMLSelectElement;
      await fireEvent.change(typeSelect, { target: { value: 'number' } });

      // Leave value input empty

      const addVarButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Add Variable'
      ) as HTMLButtonElement;
      await fireEvent.click(addVarButton);

      await waitFor(() => {
        const vars = get(variableList);
        expect(vars[0].initial).toBe(0); // NaN coerced to 0
      });
    });

    it('should handle story without variables map', () => {
      currentStory.set(null);

      const { queryByText } = render(VariableManager);

      // Should not crash
      expect(queryByText('Variables')).toBeTruthy();
    });
  });
});
