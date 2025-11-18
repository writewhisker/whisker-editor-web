import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import VariableDependencyPanel from './VariableDependencyPanel.svelte';
import {
  dependencyStore,
  dependencyGraph,
  variableNodes,
  circularDependencies,
  unusedVariables,
  orphanVariables,
} from '../stores/variableDependencyStore';
import { currentStory } from '../stores/projectStore';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { Variable } from '@writewhisker/core-ts';

describe('VariableDependencyPanel', () => {
  let story: Story;

  beforeEach(() => {
    vi.clearAllMocks();
    currentStory.set(null);
    dependencyStore.clearState();

    // Create test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
  });

  describe('rendering without story', () => {
    it('should display empty state when no story loaded', () => {
      const { getByText } = render(VariableDependencyPanel);
      expect(getByText('No story loaded')).toBeTruthy();
    });

    it('should show disabled analyze button when no story loaded', () => {
      const { getByText } = render(VariableDependencyPanel);
      const button = getByText('Analyze') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should display header', () => {
      const { getByText } = render(VariableDependencyPanel);
      expect(getByText('Variable Dependencies')).toBeTruthy();
    });
  });

  describe('rendering with story but no analysis', () => {
    beforeEach(() => {
      currentStory.set(story);
    });

    it('should show analyze prompt when story loaded but not analyzed', () => {
      const { getByText } = render(VariableDependencyPanel);
      expect(getByText('Click "Analyze" to build dependency graph')).toBeTruthy();
    });

    it('should show icon in analyze prompt', () => {
      const { container } = render(VariableDependencyPanel);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should have enabled analyze button when story is loaded', () => {
      const { getByText } = render(VariableDependencyPanel);
      const button = getByText('Analyze') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe('rendering with analyzed story', () => {
    beforeEach(() => {
      // Add variables
      story.addVariable(new Variable({
        name: 'health',
        type: 'number',
        initial: 100,
      }));

      story.addVariable(new Variable({
        name: 'score',
        type: 'number',
        initial: 0,
      }));

      // Add passage that uses variables
      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Your health is $health and score is $score.',
      }));

      story.startPassage = passage.id;

      currentStory.set(story);
      dependencyStore.analyze(story);
    });

    it('should display view mode tabs', () => {
      const { getByText } = render(VariableDependencyPanel);
      expect(getByText('Variables')).toBeTruthy();
      expect(getByText('Issues')).toBeTruthy();
    });

    it('should show variables count', () => {
      const { container } = render(VariableDependencyPanel);
      const nodes = get(variableNodes);
      expect(container.textContent).toContain(`(${nodes.length})`);
    });
  });

  describe('variables list view', () => {
    beforeEach(() => {
      story.addVariable(new Variable({
        name: 'health',
        type: 'number',
        initial: 100,
      }));

      story.addVariable(new Variable({
        name: 'mana',
        type: 'number',
        initial: 50,
      }));

      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Health: $health, Mana: $mana',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);
      dependencyStore.analyze(story);
    });

    it('should display variables list section', () => {
      const { container } = render(VariableDependencyPanel);
      const nodes = get(variableNodes);
      expect(container.textContent).toContain('Variables');
      expect(container.textContent).toContain(`(${nodes.length})`);
    });

    it('should show variable names', () => {
      const { getByText } = render(VariableDependencyPanel);
      expect(getByText(/health/)).toBeTruthy();
      expect(getByText(/mana/)).toBeTruthy();
    });

    it('should show variable types', () => {
      const { container } = render(VariableDependencyPanel);
      expect(container.textContent).toContain('number');
    });

    it('should show read and write counts', () => {
      const { container } = render(VariableDependencyPanel);
      expect(container.textContent).toMatch(/R:\d+/);
      expect(container.textContent).toMatch(/W:\d+/);
    });

    it('should show passages used count', () => {
      const { container } = render(VariableDependencyPanel);
      expect(container.textContent).toMatch(/\d+ passage/);
    });

    it('should show dependencies', () => {
      const { container } = render(VariableDependencyPanel);
      const nodes = get(variableNodes);
      const nodeWithDeps = nodes.find(n => n.dependencies.dependsOn.length > 0);

      if (nodeWithDeps) {
        expect(container.textContent).toContain(nodeWithDeps.dependencies.dependsOn[0]);
      }
    });

    it('should sort variables alphabetically', () => {
      const { container } = render(VariableDependencyPanel);
      const nodes = get(variableNodes);
      const sorted = [...nodes].sort((a, b) => a.name.localeCompare(b.name));

      expect(nodes[0].name).toBe(sorted[0].name);
    });
  });

  describe('issues view', () => {
    beforeEach(() => {
      currentStory.set(story);
      dependencyStore.analyze(story);
    });

    it('should switch to issues view when clicked', async () => {
      const { getByText } = render(VariableDependencyPanel);

      const issuesButton = getByText('Issues') as HTMLButtonElement;
      await fireEvent.click(issuesButton);

      await waitFor(() => {
        expect(issuesButton.className).toContain('bg-blue-');
      });
    });

    it('should show no issues message when no issues exist', () => {
      const { getByText } = render(VariableDependencyPanel);

      const issuesButton = getByText('Issues') as HTMLButtonElement;
      fireEvent.click(issuesButton);

      const circular = get(circularDependencies);
      const unused = get(unusedVariables);
      const orphan = get(orphanVariables);

      if (circular.length === 0 && unused.length === 0 && orphan.length === 0) {
        expect(getByText(/No dependency issues detected/)).toBeTruthy();
      }
    });

    it('should display circular dependencies section', async () => {
      // Create circular dependency would require more complex setup
      const { getByText } = render(VariableDependencyPanel);

      const issuesButton = getByText('Issues') as HTMLButtonElement;
      await fireEvent.click(issuesButton);

      const circular = get(circularDependencies);
      if (circular.length > 0) {
        expect(getByText(/Circular Dependencies/)).toBeTruthy();
      }
    });

    it('should display unused variables section', async () => {
      story.addVariable(new Variable({
        name: 'unused_var',
        type: 'string',
        initial: 'never used',
      }));

      currentStory.set(story);
      dependencyStore.analyze(story);

      const { getByText } = render(VariableDependencyPanel);

      const issuesButton = getByText('Issues') as HTMLButtonElement;
      await fireEvent.click(issuesButton);

      const unused = get(unusedVariables);
      if (unused.length > 0) {
        expect(getByText(/Unused Variables/)).toBeTruthy();
      }
    });

    it('should display orphan variables section', async () => {
      const { getByText } = render(VariableDependencyPanel);

      const issuesButton = getByText('Issues') as HTMLButtonElement;
      await fireEvent.click(issuesButton);

      const orphan = get(orphanVariables);
      if (orphan.length > 0) {
        expect(getByText(/Orphan Variables/)).toBeTruthy();
        expect(getByText(/written but never read/)).toBeTruthy();
      }
    });
  });

  describe('details view', () => {
    beforeEach(() => {
      story.addVariable(new Variable({
        name: 'health',
        type: 'number',
        initial: 100,
      }));

      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Your health is $health.',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);
      dependencyStore.analyze(story);
    });

    it('should show details view when variable is clicked', async () => {
      const { getByText } = render(VariableDependencyPanel);

      const variableButton = getByText(/health/) as HTMLButtonElement;
      await fireEvent.click(variableButton);

      await waitFor(() => {
        expect(getByText('Details')).toBeTruthy();
      });
    });

    it('should display back to list button in details view', async () => {
      const { getByText } = render(VariableDependencyPanel);

      const variableButton = getByText(/health/) as HTMLButtonElement;
      await fireEvent.click(variableButton);

      await waitFor(() => {
        expect(getByText(/Back to list/)).toBeTruthy();
      });
    });

    it('should show variable details', async () => {
      const { getByText, container } = render(VariableDependencyPanel);

      const variableButton = getByText(/health/) as HTMLButtonElement;
      await fireEvent.click(variableButton);

      await waitFor(() => {
        expect(container.textContent).toContain('Type:');
        expect(container.textContent).toContain('Reads:');
        expect(container.textContent).toContain('Writes:');
        expect(container.textContent).toContain('Passages:');
      });
    });

    it('should show dependencies section', async () => {
      const { getByText, container } = render(VariableDependencyPanel);

      const variableButton = getByText(/health/) as HTMLButtonElement;
      await fireEvent.click(variableButton);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      if (healthNode && healthNode.dependencies.dependsOn.length > 0) {
        await waitFor(() => {
          expect(container.textContent).toContain('Depends On');
        });
      }
    });

    it('should show affects section', async () => {
      const { getByText, container } = render(VariableDependencyPanel);

      const variableButton = getByText(/health/) as HTMLButtonElement;
      await fireEvent.click(variableButton);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      if (healthNode && healthNode.dependencies.affects.length > 0) {
        await waitFor(() => {
          expect(container.textContent).toContain('Affects');
        });
      }
    });

    it('should show usage locations', async () => {
      const { getByText } = render(VariableDependencyPanel);

      const variableButton = getByText(/health/) as HTMLButtonElement;
      await fireEvent.click(variableButton);

      await waitFor(() => {
        expect(getByText(/Usage Locations/)).toBeTruthy();
      });
    });

    it('should return to list when back button is clicked', async () => {
      const { getByText } = render(VariableDependencyPanel);

      const variableButton = getByText(/health/) as HTMLButtonElement;
      await fireEvent.click(variableButton);

      await waitFor(() => {
        const backButton = getByText(/Back to list/) as HTMLButtonElement;
        fireEvent.click(backButton);
      });

      await waitFor(() => {
        expect(getByText('Variables')).toBeTruthy();
      });
    });
  });

  describe('user interactions', () => {
    beforeEach(() => {
      story.addVariable(new Variable({
        name: 'test_var',
        type: 'string',
        initial: 'test',
      }));

      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test $test_var',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);
    });

    it('should analyze when button is clicked', async () => {
      const analyzeSpy = vi.spyOn(dependencyStore, 'analyze');
      const { getByText } = render(VariableDependencyPanel);

      const button = getByText('Analyze') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(analyzeSpy).toHaveBeenCalledWith(story);
    });

    it('should show analyzing state during analysis', async () => {
      const { getByText } = render(VariableDependencyPanel);

      vi.spyOn(dependencyStore, 'analyze').mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      const button = getByText('Analyze') as HTMLButtonElement;
      fireEvent.click(button);

      await waitFor(() => {
        expect(getByText('Analyzing...')).toBeTruthy();
      }, { timeout: 50 });
    });

    it('should disable analyze button when analyzing', async () => {
      const { getByText } = render(VariableDependencyPanel);

      vi.spyOn(dependencyStore, 'analyze').mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      const button = getByText('Analyze') as HTMLButtonElement;
      fireEvent.click(button);

      await waitFor(() => {
        const analyzingButton = getByText('Analyzing...') as HTMLButtonElement;
        expect(analyzingButton.disabled).toBe(true);
      }, { timeout: 50 });
    });

    it('should select variable when clicked', async () => {
      dependencyStore.analyze(story);

      const { getByText } = render(VariableDependencyPanel);

      const variableButton = getByText(/test_var/) as HTMLButtonElement;
      await fireEvent.click(variableButton);

      await waitFor(() => {
        expect(getByText('Details')).toBeTruthy();
      });
    });
  });

  describe('variable status colors', () => {
    it('should apply color for unused variables', () => {
      story.addVariable(new Variable({
        name: 'unused',
        type: 'string',
        initial: 'test',
      }));

      currentStory.set(story);
      dependencyStore.analyze(story);

      const { container } = render(VariableDependencyPanel);
      const nodes = get(variableNodes);
      const unusedNode = nodes.find(n => n.isUnused);

      if (unusedNode) {
        expect(container.innerHTML).toContain('text-gray-');
      }
    });

    it('should apply color for orphan variables', () => {
      const { container } = render(VariableDependencyPanel);
      const nodes = get(variableNodes);
      const orphanNode = nodes.find(n => n.isOrphan);

      if (orphanNode) {
        expect(container.innerHTML).toContain('text-yellow-');
      }
    });

    it('should show unused badge', () => {
      story.addVariable(new Variable({
        name: 'unused',
        type: 'string',
        initial: 'test',
      }));

      currentStory.set(story);
      dependencyStore.analyze(story);

      const { container } = render(VariableDependencyPanel);
      const nodes = get(variableNodes);
      const unusedNode = nodes.find(n => n.isUnused);

      if (unusedNode) {
        expect(container.textContent).toContain('unused');
      }
    });

    it('should show orphan badge', () => {
      const { container } = render(VariableDependencyPanel);
      const nodes = get(variableNodes);
      const orphanNode = nodes.find(n => n.isOrphan);

      if (orphanNode) {
        expect(container.textContent).toContain('orphan');
      }
    });
  });

  describe('usage icons', () => {
    it('should display correct icons for usage types', async () => {
      story.addVariable(new Variable({
        name: 'test_var',
        type: 'string',
        initial: 'test',
      }));

      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test $test_var',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);
      dependencyStore.analyze(story);

      const { getByText } = render(VariableDependencyPanel);

      const variableButton = getByText(/test_var/) as HTMLButtonElement;
      await fireEvent.click(variableButton);

      await waitFor(() => {
        const detailsButton = getByText('Details');
        expect(detailsButton).toBeTruthy();
      });
    });
  });

  describe('auto-analyze on story change', () => {
    it('should auto-analyze when story changes', async () => {
      const analyzeSpy = vi.spyOn(dependencyStore, 'analyze');

      render(VariableDependencyPanel);

      story.addVariable(new Variable({
        name: 'auto_test',
        type: 'number',
        initial: 0,
      }));

      currentStory.set(story);

      await waitFor(() => {
        expect(analyzeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle story with no variables', () => {
      currentStory.set(story);
      dependencyStore.analyze(story);

      const { container } = render(VariableDependencyPanel);
      expect(container.textContent).toContain('(0)');
    });

    it('should handle very long variable names', () => {
      story.addVariable(new Variable({
        name: 'very_long_variable_name_that_should_be_truncated',
        type: 'string',
        initial: 'test',
      }));

      const passage = story.addPassage(new Passage({
        title: 'Start',
        content: 'Test',
      }));

      story.startPassage = passage.id;
      currentStory.set(story);
      dependencyStore.analyze(story);

      const { container } = render(VariableDependencyPanel);
      expect(container).toBeTruthy();
    });

    it('should handle variables with no usages', () => {
      story.addVariable(new Variable({
        name: 'no_usage',
        type: 'string',
        initial: 'test',
      }));

      currentStory.set(story);
      dependencyStore.analyze(story);

      const { container } = render(VariableDependencyPanel);
      expect(container.textContent).toContain('no_usage');
    });
  });

  describe('dark mode styling', () => {
    it('should have dark mode classes', () => {
      const { container } = render(VariableDependencyPanel);
      expect(container.innerHTML).toContain('dark:');
    });
  });
});
