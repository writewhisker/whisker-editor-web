import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import TestScenarioManager from './TestScenarioManager.svelte';

// Mock stores
vi.mock('../../stores/testScenarioStore', () => {
  const { writable } = require('svelte/store');
  return {
    testScenarioActions: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      duplicate: vi.fn(),
      run: vi.fn(() => Promise.resolve()),
      runAll: vi.fn(() => Promise.resolve()),
      select: vi.fn(),
      exportScenarios: vi.fn(() => '[]'),
      importScenarios: vi.fn(() => 0),
    },
    scenarioList: writable([]),
    selectedScenario: writable(null),
    scenarioResults: writable(new Map()),
    runningScenarioId: writable(null),
    scenarioCount: writable(0),
  };
});

vi.mock('../../stores/projectStore', () => {
  const { writable } = require('svelte/store');
  return {
    currentStory: writable(null),
  };
});

describe('TestScenarioManager', () => {
  let scenarioList: any;
  let scenarioCount: any;
  let scenarioResults: any;
  let testScenarioActions: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock URL.createObjectURL and revokeObjectURL (not available in jsdom)
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Import mocked stores
    const testScenarioStore = await import('../../stores/testScenarioStore');
    scenarioList = testScenarioStore.scenarioList;
    scenarioCount = testScenarioStore.scenarioCount;
    scenarioResults = testScenarioStore.scenarioResults;
    testScenarioActions = testScenarioStore.testScenarioActions;

    // Reset stores
    scenarioList.set([]);
    scenarioCount.set(0);
    scenarioResults.set(new Map());
  });

  describe('empty state', () => {
    it('should display empty state when no scenarios', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('No test scenarios yet');
      expect(text).toContain('Create automated tests');
    });

    it('should show "Create First Scenario" button', () => {
      const { getByText } = render(TestScenarioManager);
      const button = getByText('Create First Scenario');
      expect(button).toBeTruthy();
    });

    it('should switch to create view when clicking create button', async () => {
      const { getByText, container } = render(TestScenarioManager);

      const createButton = getByText('Create First Scenario');
      await fireEvent.click(createButton);

      const text = container.textContent || '';
      expect(text).toContain('Scenario Name');
      expect(text).toContain('Description');
    });
  });

  describe('list view with scenarios', () => {
    beforeEach(() => {
      scenarioList.set([
        {
          id: 'scenario-1',
          name: 'Test Scenario 1',
          description: 'First test',
          steps: [{ description: 'Step 1' }],
          modified: Date.now().toString(),
          tags: [],
        },
        {
          id: 'scenario-2',
          name: 'Test Scenario 2',
          description: '',
          steps: [{ description: 'Step A' }, { description: 'Step B' }],
          modified: Date.now().toString(),
          tags: [],
        },
      ]);
      scenarioCount.set(2);
    });

    it('should display scenario list', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('Test Scenario 1');
      expect(text).toContain('Test Scenario 2');
    });

    it('should show scenario count in header', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('(2)');
    });

    it('should display scenario descriptions', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('First test');
    });

    it('should display step count for each scenario', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('1 steps');
      expect(text).toContain('2 steps');
    });

    it('should show "New" and "Run All" buttons', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('New');
      expect(text).toContain('Run All');
    });
  });

  describe('create view', () => {
    it('should show form fields in create view', async () => {
      const { getByText, container } = render(TestScenarioManager);

      // Switch to create view
      scenarioCount.set(0);
      await fireEvent.click(getByText('Create First Scenario'));

      const text = container.textContent || '';
      expect(text).toContain('Scenario Name');
      expect(text).toContain('Description');
      expect(text).toContain('Start Passage');
      expect(text).toContain('Test Steps');
    });

    it('should show "Add Step" button', async () => {
      scenarioCount.set(0);
      const { container } = render(TestScenarioManager);

      const createButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Create First Scenario')
      );
      if (createButton) {
        await fireEvent.click(createButton);
      }

      const text = container.textContent || '';
      expect(text).toContain('Add Step');
    });

    it('should show "Create Scenario" button', async () => {
      scenarioCount.set(0);
      const { getByText, container } = render(TestScenarioManager);

      await fireEvent.click(getByText('Create First Scenario'));

      const text = container.textContent || '';
      expect(text).toContain('Create Scenario');
    });

    it('should show back button in create view', async () => {
      scenarioCount.set(0);
      const { getByText, container } = render(TestScenarioManager);

      await fireEvent.click(getByText('Create First Scenario'));

      const text = container.textContent || '';
      expect(text).toContain('Back');
    });
  });

  describe('scenario results', () => {
    beforeEach(() => {
      scenarioList.set([
        {
          id: 'scenario-1',
          name: 'Passing Test',
          description: '',
          steps: [],
          modified: Date.now().toString(),
          tags: [],
        },
        {
          id: 'scenario-2',
          name: 'Failing Test',
          description: '',
          steps: [],
          modified: Date.now().toString(),
          tags: [],
        },
      ]);
      scenarioCount.set(2);

      const results = new Map();
      results.set('scenario-1', {
        passed: true,
        duration: 150,
        errors: [],
        stepResults: [{ passed: true }],
      });
      results.set('scenario-2', {
        passed: false,
        duration: 200,
        errors: ['Step failed', 'Another error'],
        stepResults: [{ passed: false }],
      });
      scenarioResults.set(results);
    });

    it('should show passed indicator for passing scenarios', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('Pass');
    });

    it('should show failed indicator for failing scenarios', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('Fail');
    });

    it('should show Results button when results exist', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('Results');
    });
  });

  describe('scenario actions', () => {
    beforeEach(() => {
      scenarioList.set([
        {
          id: 'scenario-1',
          name: 'Test Scenario',
          description: 'Test',
          steps: [],
          modified: Date.now().toString(),
          tags: [],
        },
      ]);
      scenarioCount.set(1);
    });

    it('should show run, edit, duplicate, and delete buttons', () => {
      const { container } = render(TestScenarioManager);

      const buttons = container.querySelectorAll('button');
      const buttonTexts = Array.from(buttons).map((b) => b.textContent).join('');

      expect(buttonTexts).toContain('▶️');
      expect(buttonTexts).toContain('✏️');
      expect(buttonTexts).toContain('📋');
      expect(buttonTexts).toContain('🗑️');
    });

    it('should call run action when clicking run button', async () => {
      const { container } = render(TestScenarioManager);

      const runButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('title') === 'Run scenario'
      );

      expect(runButton).toBeTruthy();
      if (runButton) {
        await fireEvent.click(runButton);
        expect(testScenarioActions.run).toHaveBeenCalledWith('scenario-1');
      }
    });

    it('should call duplicate action when clicking duplicate button', async () => {
      const { container } = render(TestScenarioManager);

      const duplicateButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('📋')
      );

      if (duplicateButton) {
        await fireEvent.click(duplicateButton);
        expect(testScenarioActions.duplicate).toHaveBeenCalledWith('scenario-1');
      }
    });
  });

  describe('import/export', () => {
    beforeEach(() => {
      scenarioList.set([
        {
          id: 'scenario-1',
          name: 'Test',
          description: '',
          steps: [],
          modified: Date.now().toString(),
          tags: [],
        },
      ]);
      scenarioCount.set(1);
    });

    it('should show Export All button', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('Export All');
    });

    it('should show Import button', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('Import');
    });

    it('should call exportScenarios when clicking Export All', async () => {
      const { container } = render(TestScenarioManager);

      const exportButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Export All')
      );

      expect(exportButton).toBeTruthy();
      if (exportButton) {
        await fireEvent.click(exportButton);
        expect(testScenarioActions.exportScenarios).toHaveBeenCalled();
      }
    });
  });

  describe('header', () => {
    it('should display title with test tube emoji', () => {
      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('🧪');
      expect(text).toContain('Test Scenarios');
    });

    it('should show New button in header when scenarios exist', () => {
      scenarioList.set([
        {
          id: 'scenario-1',
          name: 'Test',
          description: '',
          steps: [],
          modified: Date.now().toString(),
          tags: [],
        },
      ]);
      scenarioCount.set(1);

      const { container } = render(TestScenarioManager);

      const text = container.textContent || '';
      expect(text).toContain('New');
    });
  });

  describe('empty steps message', () => {
    it('should show message when no steps in form', async () => {
      scenarioCount.set(0);
      const { getByText, container } = render(TestScenarioManager);

      await fireEvent.click(getByText('Create First Scenario'));

      const text = container.textContent || '';
      expect(text).toContain('No steps yet');
    });
  });
});
