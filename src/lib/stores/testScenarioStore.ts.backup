/**
 * Test Scenario Store
 *
 * Manages test scenarios with localStorage persistence.
 */

import { writable, derived } from 'svelte/store';
import type { TestScenario, TestScenarioResult } from '../player/testScenarioTypes';
import { TestScenarioRunner } from '../player/TestScenarioRunner';
import { player } from './playerStore';

const STORAGE_KEY = 'whisker_test_scenarios';

// Load scenarios from localStorage
function loadScenarios(): Map<string, TestScenario> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error('Failed to load test scenarios:', error);
  }
  return new Map();
}

// Save scenarios to localStorage
function saveScenarios(scenarios: Map<string, TestScenario>): void {
  try {
    const obj = Object.fromEntries(scenarios);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.error('Failed to save test scenarios:', error);
  }
}

// Create stores
export const testScenarios = writable<Map<string, TestScenario>>(loadScenarios());
export const scenarioResults = writable<Map<string, TestScenarioResult>>(new Map());
export const runningScenarioId = writable<string | null>(null);
export const selectedScenarioId = writable<string | null>(null);

// Derived stores
export const scenarioList = derived(testScenarios, ($scenarios) =>
  Array.from($scenarios.values()).sort((a, b) =>
    new Date(b.modified).getTime() - new Date(a.modified).getTime()
  )
);

export const selectedScenario = derived(
  [testScenarios, selectedScenarioId],
  ([$scenarios, $selectedId]) => {
    return $selectedId ? $scenarios.get($selectedId) || null : null;
  }
);

export const scenarioCount = derived(testScenarios, ($scenarios) => $scenarios.size);

// Actions
export const testScenarioActions = {
  /**
   * Create a new test scenario
   */
  create(scenario: Omit<TestScenario, 'id' | 'created' | 'modified'>): TestScenario {
    const now = new Date().toISOString();
    const newScenario: TestScenario = {
      ...scenario,
      id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created: now,
      modified: now,
    };

    testScenarios.update((scenarios) => {
      scenarios.set(newScenario.id, newScenario);
      saveScenarios(scenarios);
      return scenarios;
    });

    return newScenario;
  },

  /**
   * Update an existing test scenario
   */
  update(id: string, updates: Partial<TestScenario>): void {
    testScenarios.update((scenarios) => {
      const existing = scenarios.get(id);
      if (existing) {
        const updated: TestScenario = {
          ...existing,
          ...updates,
          id, // Prevent ID changes
          modified: new Date().toISOString(),
        };
        scenarios.set(id, updated);
        saveScenarios(scenarios);
      }
      return scenarios;
    });
  },

  /**
   * Delete a test scenario
   */
  delete(id: string): void {
    testScenarios.update((scenarios) => {
      scenarios.delete(id);
      saveScenarios(scenarios);
      return scenarios;
    });

    scenarioResults.update((results) => {
      results.delete(id);
      return results;
    });

    selectedScenarioId.update((selectedId) =>
      selectedId === id ? null : selectedId
    );
  },

  /**
   * Duplicate a test scenario
   */
  duplicate(id: string): TestScenario | null {
    const scenarios = new Map<string, TestScenario>();
    testScenarios.subscribe((s) => (scenarios.clear(), s.forEach((v, k) => scenarios.set(k, v))))();

    const original = scenarios.get(id);
    if (!original) return null;

    return this.create({
      ...original,
      name: `${original.name} (Copy)`,
    });
  },

  /**
   * Execute a test scenario
   */
  async run(id: string): Promise<TestScenarioResult> {
    const scenarios = new Map<string, TestScenario>();
    testScenarios.subscribe((s) => (scenarios.clear(), s.forEach((v, k) => scenarios.set(k, v))))();

    const scenario = scenarios.get(id);
    if (!scenario) {
      throw new Error(`Scenario ${id} not found`);
    }

    runningScenarioId.set(id);

    try {
      const runner = new TestScenarioRunner(player);
      const result = await runner.execute(scenario);

      scenarioResults.update((results) => {
        results.set(id, result);
        return results;
      });

      return result;
    } finally {
      runningScenarioId.set(null);
    }
  },

  /**
   * Run all test scenarios
   */
  async runAll(): Promise<TestScenarioResult[]> {
    const scenarios = new Map<string, TestScenario>();
    testScenarios.subscribe((s) => (scenarios.clear(), s.forEach((v, k) => scenarios.set(k, v))))();

    const results: TestScenarioResult[] = [];

    for (const scenario of scenarios.values()) {
      const result = await this.run(scenario.id);
      results.push(result);
    }

    return results;
  },

  /**
   * Clear all test results
   */
  clearResults(): void {
    scenarioResults.set(new Map());
  },

  /**
   * Select a scenario
   */
  select(id: string | null): void {
    selectedScenarioId.set(id);
  },

  /**
   * Export scenarios to JSON
   */
  exportScenarios(): string {
    const scenarios = new Map<string, TestScenario>();
    testScenarios.subscribe((s) => (scenarios.clear(), s.forEach((v, k) => scenarios.set(k, v))))();

    return JSON.stringify(Array.from(scenarios.values()), null, 2);
  },

  /**
   * Import scenarios from JSON
   */
  importScenarios(json: string): number {
    try {
      const imported = JSON.parse(json) as TestScenario[];
      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array');
      }

      testScenarios.update((scenarios) => {
        imported.forEach((scenario) => {
          // Generate new IDs to avoid conflicts
          const newId = `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          scenarios.set(newId, {
            ...scenario,
            id: newId,
          });
        });
        saveScenarios(scenarios);
        return scenarios;
      });

      return imported.length;
    } catch (error) {
      console.error('Failed to import scenarios:', error);
      throw error;
    }
  },

  /**
   * Clear all scenarios
   */
  clearAll(): void {
    if (confirm('Are you sure you want to delete all test scenarios? This cannot be undone.')) {
      testScenarios.set(new Map());
      scenarioResults.set(new Map());
      localStorage.removeItem(STORAGE_KEY);
    }
  },
};
