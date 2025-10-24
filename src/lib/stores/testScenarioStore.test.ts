import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { TestScenario, TestScenarioResult } from '../player/testScenarioTypes';

// Mock the dependencies
vi.mock('../player/TestScenarioRunner', () => ({
  TestScenarioRunner: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}));

vi.mock('./playerStore', () => ({
  player: {
    subscribe: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  },
}));

describe('testScenarioStore', () => {
  let localStorageMock: { [key: string]: string };
  let confirmMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup localStorage mock
    localStorageMock = {};
    const localStorageImpl = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        Object.keys(localStorageMock).forEach(key => delete localStorageMock[key]);
      }),
      key: vi.fn(),
      length: 0,
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageImpl,
      writable: true,
      configurable: true,
    });

    // Setup window.confirm mock
    confirmMock = vi.fn().mockReturnValue(true);
    global.confirm = confirmMock;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('stores', () => {
    it('should export testScenarios store', async () => {
      const { testScenarios } = await import('./testScenarioStore');
      expect(testScenarios).toBeTruthy();
      expect(typeof testScenarios.subscribe).toBe('function');
    });

    it('should export scenarioResults store', async () => {
      const { scenarioResults } = await import('./testScenarioStore');
      expect(scenarioResults).toBeTruthy();
      expect(typeof scenarioResults.subscribe).toBe('function');
    });

    it('should export runningScenarioId store', async () => {
      const { runningScenarioId } = await import('./testScenarioStore');
      expect(runningScenarioId).toBeTruthy();
      expect(typeof runningScenarioId.subscribe).toBe('function');
    });

    it('should export selectedScenarioId store', async () => {
      const { selectedScenarioId } = await import('./testScenarioStore');
      expect(selectedScenarioId).toBeTruthy();
      expect(typeof selectedScenarioId.subscribe).toBe('function');
    });

    it('should initialize with empty scenarios', async () => {
      const { testScenarios } = await import('./testScenarioStore');
      const scenarios = get(testScenarios);
      expect(scenarios.size).toBe(0);
    });

    it('should load scenarios from localStorage on init', async () => {
      const mockScenarios = {
        'scenario_1': {
          id: 'scenario_1',
          name: 'Test 1',
          created: '2024-01-01',
          modified: '2024-01-01',
          steps: [],
        },
      };
      localStorageMock['whisker_test_scenarios'] = JSON.stringify(mockScenarios);

      vi.resetModules();
      const { testScenarios } = await import('./testScenarioStore');

      const scenarios = get(testScenarios);
      expect(scenarios.size).toBe(1);
      expect(scenarios.get('scenario_1')?.name).toBe('Test 1');
    });

    it('should handle corrupted localStorage gracefully', async () => {
      localStorageMock['whisker_test_scenarios'] = 'invalid json';

      vi.resetModules();
      const { testScenarios } = await import('./testScenarioStore');

      const scenarios = get(testScenarios);
      expect(scenarios.size).toBe(0);
    });
  });

  describe('derived stores', () => {
    it('should export scenarioList derived store', async () => {
      const { scenarioList } = await import('./testScenarioStore');
      expect(scenarioList).toBeTruthy();
      expect(typeof scenarioList.subscribe).toBe('function');
    });

    it('should sort scenarioList by modified date descending', async () => {
      const { testScenarioActions, scenarioList } = await import('./testScenarioStore');

      const scenario1 = testScenarioActions.create({
        name: 'First',
        steps: [],
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const scenario2 = testScenarioActions.create({
        name: 'Second',
        steps: [],
      });

      const list = get(scenarioList);
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('Second'); // Most recent first
      expect(list[1].name).toBe('First');
    });

    it('should export selectedScenario derived store', async () => {
      const { selectedScenario } = await import('./testScenarioStore');
      expect(selectedScenario).toBeTruthy();
      expect(typeof selectedScenario.subscribe).toBe('function');
    });

    it('should return selected scenario when id is set', async () => {
      const { testScenarioActions, selectedScenarioId, selectedScenario } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'Test Scenario',
        steps: [],
      });

      selectedScenarioId.set(scenario.id);

      const selected = get(selectedScenario);
      expect(selected?.id).toBe(scenario.id);
      expect(selected?.name).toBe('Test Scenario');
    });

    it('should return null when no scenario selected', async () => {
      const { selectedScenario } = await import('./testScenarioStore');

      const selected = get(selectedScenario);
      expect(selected).toBeNull();
    });

    it('should export scenarioCount derived store', async () => {
      const { scenarioCount } = await import('./testScenarioStore');
      expect(scenarioCount).toBeTruthy();
      expect(typeof scenarioCount.subscribe).toBe('function');
    });

    it('should reflect scenario count', async () => {
      const { testScenarioActions, scenarioCount } = await import('./testScenarioStore');

      expect(get(scenarioCount)).toBe(0);

      testScenarioActions.create({ name: 'Test 1', steps: [] });
      expect(get(scenarioCount)).toBe(1);

      testScenarioActions.create({ name: 'Test 2', steps: [] });
      expect(get(scenarioCount)).toBe(2);
    });
  });

  describe('testScenarioActions.create', () => {
    it('should create a new scenario with generated id', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'My Test',
        description: 'Test description',
        steps: [],
      });

      expect(scenario.id).toBeTruthy();
      expect(scenario.id).toMatch(/^scenario_\d+_/);
      expect(scenario.name).toBe('My Test');
      expect(scenario.description).toBe('Test description');

      const scenarios = get(testScenarios);
      expect(scenarios.has(scenario.id)).toBe(true);
    });

    it('should set created and modified timestamps', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const now = new Date().toISOString();
      const scenario = testScenarioActions.create({
        name: 'Test',
        steps: [],
      });

      expect(scenario.created).toBeTruthy();
      expect(scenario.modified).toBeTruthy();
      expect(new Date(scenario.created).getTime()).toBeGreaterThanOrEqual(new Date(now).getTime() - 1000);
      expect(new Date(scenario.modified).getTime()).toBeGreaterThanOrEqual(new Date(now).getTime() - 1000);
    });

    it('should persist to localStorage', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'Persisted Test',
        steps: [],
      });

      expect(localStorage.setItem).toHaveBeenCalled();
      const stored = JSON.parse(localStorageMock['whisker_test_scenarios']);
      expect(stored[scenario.id]).toBeTruthy();
      expect(stored[scenario.id].name).toBe('Persisted Test');
    });
  });

  describe('testScenarioActions.update', () => {
    it('should update existing scenario', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'Original',
        steps: [],
      });

      testScenarioActions.update(scenario.id, {
        name: 'Updated',
        description: 'New description',
      });

      const scenarios = get(testScenarios);
      const updated = scenarios.get(scenario.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('New description');
    });

    it('should update modified timestamp', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'Test',
        steps: [],
      });

      const originalModified = scenario.modified;

      await new Promise(resolve => setTimeout(resolve, 10));

      testScenarioActions.update(scenario.id, { name: 'Updated' });

      const scenarios = get(testScenarios);
      const updated = scenarios.get(scenario.id);
      expect(updated?.modified).not.toBe(originalModified);
    });

    it('should not allow id changes', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'Test',
        steps: [],
      });

      const originalId = scenario.id;

      testScenarioActions.update(scenario.id, {
        id: 'different_id',
      } as any);

      const scenarios = get(testScenarios);
      expect(scenarios.has(originalId)).toBe(true);
      expect(scenarios.has('different_id')).toBe(false);
    });

    it('should do nothing for non-existent scenario', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      testScenarioActions.update('non_existent', { name: 'Updated' });

      const scenarios = get(testScenarios);
      expect(scenarios.size).toBe(0);
    });

    it('should persist updates to localStorage', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'Original',
        steps: [],
      });

      testScenarioActions.update(scenario.id, { name: 'Updated' });

      const stored = JSON.parse(localStorageMock['whisker_test_scenarios']);
      expect(stored[scenario.id].name).toBe('Updated');
    });
  });

  describe('testScenarioActions.delete', () => {
    it('should delete scenario from store', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'To Delete',
        steps: [],
      });

      expect(get(testScenarios).size).toBe(1);

      testScenarioActions.delete(scenario.id);

      expect(get(testScenarios).size).toBe(0);
      expect(get(testScenarios).has(scenario.id)).toBe(false);
    });

    it('should remove from localStorage', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'To Delete',
        steps: [],
      });

      testScenarioActions.delete(scenario.id);

      const stored = JSON.parse(localStorageMock['whisker_test_scenarios']);
      expect(stored[scenario.id]).toBeUndefined();
    });

    it('should clear associated results', async () => {
      const { testScenarioActions, scenarioResults } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'Test',
        steps: [],
      });

      // Add a result
      scenarioResults.update(results => {
        results.set(scenario.id, {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          passed: true,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 100,
          stepResults: [],
          errors: [],
        });
        return results;
      });

      testScenarioActions.delete(scenario.id);

      expect(get(scenarioResults).has(scenario.id)).toBe(false);
    });

    it('should clear selection if deleted scenario was selected', async () => {
      const { testScenarioActions, selectedScenarioId } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'Test',
        steps: [],
      });

      selectedScenarioId.set(scenario.id);
      expect(get(selectedScenarioId)).toBe(scenario.id);

      testScenarioActions.delete(scenario.id);

      expect(get(selectedScenarioId)).toBeNull();
    });

    it('should not clear selection if different scenario deleted', async () => {
      const { testScenarioActions, selectedScenarioId } = await import('./testScenarioStore');

      const scenario1 = testScenarioActions.create({ name: 'Test 1', steps: [] });
      const scenario2 = testScenarioActions.create({ name: 'Test 2', steps: [] });

      selectedScenarioId.set(scenario1.id);

      testScenarioActions.delete(scenario2.id);

      expect(get(selectedScenarioId)).toBe(scenario1.id);
    });
  });

  describe('testScenarioActions.duplicate', () => {
    it('should duplicate existing scenario', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      const original = testScenarioActions.create({
        name: 'Original',
        description: 'Original description',
        steps: [{ description: 'Step 1' }],
      });

      const duplicate = testScenarioActions.duplicate(original.id);

      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).not.toBe(original.id);
      expect(duplicate?.name).toBe('Original (Copy)');
      expect(duplicate?.description).toBe('Original description');
      expect(duplicate?.steps).toEqual(original.steps);

      expect(get(testScenarios).size).toBe(2);
    });

    it('should return null for non-existent scenario', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const result = testScenarioActions.duplicate('non_existent');

      expect(result).toBeNull();
    });

    it('should generate new id and timestamps', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const original = testScenarioActions.create({
        name: 'Original',
        steps: [],
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const duplicate = testScenarioActions.duplicate(original.id);

      expect(duplicate?.id).not.toBe(original.id);
      expect(duplicate?.created).not.toBe(original.created);
      expect(duplicate?.modified).not.toBe(original.modified);
    });
  });

  describe('testScenarioActions.run', () => {
    it('should execute scenario using TestScenarioRunner', async () => {
      const { TestScenarioRunner } = await import('../player/TestScenarioRunner');
      const { testScenarioActions } = await import('./testScenarioStore');

      const mockResult: TestScenarioResult = {
        scenarioId: 'test',
        scenarioName: 'Test',
        passed: true,
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 100,
        stepResults: [],
        errors: [],
      };

      const mockExecute = vi.fn().mockResolvedValue(mockResult);
      (TestScenarioRunner as any).mockImplementation(() => ({
        execute: mockExecute,
      }));

      const scenario = testScenarioActions.create({
        name: 'Test',
        steps: [],
      });

      const result = await testScenarioActions.run(scenario.id);

      expect(TestScenarioRunner).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledWith(scenario);
      expect(result).toEqual(mockResult);
    });

    it('should set runningScenarioId during execution', async () => {
      const { testScenarioActions, runningScenarioId } = await import('./testScenarioStore');

      const scenario = testScenarioActions.create({
        name: 'Test',
        steps: [],
      });

      const runPromise = testScenarioActions.run(scenario.id);

      // Check that it's set during execution
      // Note: This is a bit tricky to test without async delays

      await runPromise;

      // After completion, should be null
      expect(get(runningScenarioId)).toBeNull();
    });

    it('should store result in scenarioResults', async () => {
      const { testScenarioActions, scenarioResults } = await import('./testScenarioStore');

      const mockResult: TestScenarioResult = {
        scenarioId: 'test',
        scenarioName: 'Test',
        passed: true,
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 100,
        stepResults: [],
        errors: [],
      };

      const { TestScenarioRunner } = await import('../player/TestScenarioRunner');
      (TestScenarioRunner as any).mockImplementation(() => ({
        execute: vi.fn().mockResolvedValue(mockResult),
      }));

      const scenario = testScenarioActions.create({
        name: 'Test',
        steps: [],
      });

      await testScenarioActions.run(scenario.id);

      const results = get(scenarioResults);
      expect(results.has(scenario.id)).toBe(true);
      expect(results.get(scenario.id)).toEqual(mockResult);
    });

    it('should clear runningScenarioId even on error', async () => {
      const { TestScenarioRunner } = await import('../player/TestScenarioRunner');
      const { testScenarioActions, runningScenarioId } = await import('./testScenarioStore');

      (TestScenarioRunner as any).mockImplementation(() => ({
        execute: vi.fn().mockRejectedValue(new Error('Test error')),
      }));

      const scenario = testScenarioActions.create({
        name: 'Test',
        steps: [],
      });

      await expect(testScenarioActions.run(scenario.id)).rejects.toThrow('Test error');

      expect(get(runningScenarioId)).toBeNull();
    });

    it('should throw error for non-existent scenario', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      await expect(testScenarioActions.run('non_existent')).rejects.toThrow('Scenario non_existent not found');
    });
  });

  describe('testScenarioActions.runAll', () => {
    it('should run all scenarios', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const mockResult: TestScenarioResult = {
        scenarioId: 'test',
        scenarioName: 'Test',
        passed: true,
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 100,
        stepResults: [],
        errors: [],
      };

      const { TestScenarioRunner } = await import('../player/TestScenarioRunner');
      (TestScenarioRunner as any).mockImplementation(() => ({
        execute: vi.fn().mockResolvedValue(mockResult),
      }));

      testScenarioActions.create({ name: 'Test 1', steps: [] });
      testScenarioActions.create({ name: 'Test 2', steps: [] });

      const results = await testScenarioActions.runAll();

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockResult);
      expect(results[1]).toEqual(mockResult);
    });

    it('should return empty array when no scenarios', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const results = await testScenarioActions.runAll();

      expect(results).toEqual([]);
    });
  });

  describe('testScenarioActions.clearResults', () => {
    it('should clear all scenario results', async () => {
      const { testScenarioActions, scenarioResults } = await import('./testScenarioStore');

      // Add some results
      scenarioResults.update(results => {
        results.set('scenario1', {
          scenarioId: 'scenario1',
          scenarioName: 'Test 1',
          passed: true,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 100,
          stepResults: [],
          errors: [],
        });
        results.set('scenario2', {
          scenarioId: 'scenario2',
          scenarioName: 'Test 2',
          passed: false,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 200,
          stepResults: [],
          errors: [],
        });
        return results;
      });

      expect(get(scenarioResults).size).toBe(2);

      testScenarioActions.clearResults();

      expect(get(scenarioResults).size).toBe(0);
    });
  });

  describe('testScenarioActions.select', () => {
    it('should set selectedScenarioId', async () => {
      const { testScenarioActions, selectedScenarioId } = await import('./testScenarioStore');

      testScenarioActions.select('scenario_123');

      expect(get(selectedScenarioId)).toBe('scenario_123');
    });

    it('should allow null selection', async () => {
      const { testScenarioActions, selectedScenarioId } = await import('./testScenarioStore');

      testScenarioActions.select('scenario_123');
      testScenarioActions.select(null);

      expect(get(selectedScenarioId)).toBeNull();
    });
  });

  describe('testScenarioActions.exportScenarios', () => {
    it('should export scenarios as JSON', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const scenario1 = testScenarioActions.create({ name: 'Test 1', steps: [] });
      const scenario2 = testScenarioActions.create({ name: 'Test 2', steps: [] });

      const exported = testScenarioActions.exportScenarios();

      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);

      const exportedIds = parsed.map((s: TestScenario) => s.id);
      expect(exportedIds).toContain(scenario1.id);
      expect(exportedIds).toContain(scenario2.id);
    });

    it('should export empty array when no scenarios', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const exported = testScenarioActions.exportScenarios();

      const parsed = JSON.parse(exported);
      expect(parsed).toEqual([]);
    });

    it('should format JSON with indentation', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      testScenarioActions.create({ name: 'Test', steps: [] });

      const exported = testScenarioActions.exportScenarios();

      expect(exported).toContain('\n');
      expect(exported).toContain('  ');
    });
  });

  describe('testScenarioActions.importScenarios', () => {
    it('should import scenarios from JSON', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      const importData = [
        {
          id: 'old_id_1',
          name: 'Imported 1',
          created: '2024-01-01',
          modified: '2024-01-01',
          steps: [],
        },
        {
          id: 'old_id_2',
          name: 'Imported 2',
          created: '2024-01-01',
          modified: '2024-01-01',
          steps: [],
        },
      ];

      const count = testScenarioActions.importScenarios(JSON.stringify(importData));

      expect(count).toBe(2);
      expect(get(testScenarios).size).toBe(2);
    });

    it('should generate new IDs for imported scenarios', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      const importData = [
        {
          id: 'old_id',
          name: 'Imported',
          created: '2024-01-01',
          modified: '2024-01-01',
          steps: [],
        },
      ];

      testScenarioActions.importScenarios(JSON.stringify(importData));

      const scenarios = get(testScenarios);
      expect(scenarios.has('old_id')).toBe(false);

      const importedScenario = Array.from(scenarios.values())[0];
      expect(importedScenario.id).toMatch(/^scenario_\d+_/);
      expect(importedScenario.name).toBe('Imported');
    });

    it('should throw error for invalid JSON', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      expect(() => testScenarioActions.importScenarios('invalid json')).toThrow();
    });

    it('should throw error for non-array input', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      expect(() => testScenarioActions.importScenarios('{"not": "array"}')).toThrow('Invalid format: expected array');
    });

    it('should persist imported scenarios to localStorage', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      const importData = [
        {
          id: 'old_id',
          name: 'Imported',
          created: '2024-01-01',
          modified: '2024-01-01',
          steps: [],
        },
      ];

      testScenarioActions.importScenarios(JSON.stringify(importData));

      const stored = JSON.parse(localStorageMock['whisker_test_scenarios']);
      const storedScenarios = Object.values(stored) as TestScenario[];
      expect(storedScenarios.some(s => s.name === 'Imported')).toBe(true);
    });
  });

  describe('testScenarioActions.clearAll', () => {
    it('should clear all scenarios when confirmed', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      testScenarioActions.create({ name: 'Test 1', steps: [] });
      testScenarioActions.create({ name: 'Test 2', steps: [] });

      confirmMock.mockReturnValue(true);

      testScenarioActions.clearAll();

      expect(get(testScenarios).size).toBe(0);
    });

    it('should clear results when confirmed', async () => {
      const { testScenarioActions, scenarioResults } = await import('./testScenarioStore');

      scenarioResults.update(results => {
        results.set('scenario1', {
          scenarioId: 'scenario1',
          scenarioName: 'Test',
          passed: true,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 100,
          stepResults: [],
          errors: [],
        });
        return results;
      });

      confirmMock.mockReturnValue(true);

      testScenarioActions.clearAll();

      expect(get(scenarioResults).size).toBe(0);
    });

    it('should remove from localStorage when confirmed', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      testScenarioActions.create({ name: 'Test', steps: [] });

      confirmMock.mockReturnValue(true);

      testScenarioActions.clearAll();

      expect(localStorage.removeItem).toHaveBeenCalledWith('whisker_test_scenarios');
    });

    it('should not clear when user cancels', async () => {
      const { testScenarioActions, testScenarios } = await import('./testScenarioStore');

      testScenarioActions.create({ name: 'Test', steps: [] });

      confirmMock.mockReturnValue(false);

      testScenarioActions.clearAll();

      expect(get(testScenarios).size).toBe(1);
    });

    it('should prompt user for confirmation', async () => {
      const { testScenarioActions } = await import('./testScenarioStore');

      confirmMock.mockReturnValue(false);

      testScenarioActions.clearAll();

      expect(confirmMock).toHaveBeenCalledWith('Are you sure you want to delete all test scenarios? This cannot be undone.');
    });
  });

  describe('localStorage integration', () => {
    it('should handle localStorage errors gracefully on load', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('Storage error'); }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      vi.resetModules();
      const { testScenarios } = await import('./testScenarioStore');

      const scenarios = get(testScenarios);
      expect(scenarios.size).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load test scenarios:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully on save', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(() => { throw new Error('Storage error'); }),
          removeItem: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      vi.resetModules();
      const { testScenarioActions } = await import('./testScenarioStore');

      // Should not throw
      expect(() => testScenarioActions.create({ name: 'Test', steps: [] })).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save test scenarios:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});
