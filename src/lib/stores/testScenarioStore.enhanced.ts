/**
 * Enhanced Test Scenario Store
 *
 * Uses new TestScenario classes internally while maintaining API compatibility
 * with existing UI components.
 */

import { writable, derived, get } from 'svelte/store';
import { TestScenario, TestStepHelpers } from '../testing/TestScenario';
import { TestRunner } from '../testing/TestRunner';
import { loadAndMigrateScenarios, saveAsOldFormat, convertToOldFormat } from '../testing/testScenarioAdapter';
import { currentStory } from './projectStore';
import type { TestScenario as OldTestScenario, TestScenarioResult } from '../player/testScenarioTypes';
import type { TestResult } from '../testing/TestRunner';

const STORAGE_KEY = 'whisker_test_scenarios';

// Internal store using new classes
const internalScenarios = writable<Map<string, TestScenario>>(
  loadAndMigrateScenarios(STORAGE_KEY)
);

// Save to storage whenever scenarios change
function saveScenarios(scenarios: Map<string, TestScenario>): void {
  saveAsOldFormat(scenarios, STORAGE_KEY);
}

// Create stores
export const testScenarios = derived(internalScenarios, $scenarios => {
  // Convert to old format for backward compatibility with UI
  const oldFormat = new Map<string, OldTestScenario>();
  $scenarios.forEach((scenario, id) => {
    oldFormat.set(id, convertToOldFormat(scenario));
  });
  return oldFormat;
});

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

/**
 * Convert TestResult (from new runner) to TestScenarioResult (old format)
 */
function convertTestResult(result: TestResult): TestScenarioResult {
  return {
    scenarioId: result.scenarioId,
    scenarioName: result.scenarioName,
    passed: result.passed,
    startTime: new Date(result.startTime).getTime(),
    endTime: new Date(result.endTime).getTime(),
    duration: result.duration,
    stepResults: result.stepResults.map(sr => ({
      step: {
        description: sr.step.description,
      },
      passed: sr.passed,
      errors: sr.passed ? [] : [sr.message],
      actualPassageTitle: typeof sr.actualValue === 'object' && sr.actualValue?.title
        ? sr.actualValue.title
        : undefined,
      actualVariables: typeof sr.actualValue === 'object' ? sr.actualValue : undefined,
    })),
    errors: result.stepResults
      .filter(sr => !sr.passed)
      .map(sr => sr.message)
      .concat(result.error ? [result.error] : []),
    finalVariables: result.playthrough?.finalVariables,
    finalPassageTitle: result.playthrough?.steps.length
      ? result.playthrough.steps[result.playthrough.steps.length - 1].passageTitle
      : undefined,
  };
}

// Actions
export const testScenarioActions = {
  /**
   * Create a new test scenario
   */
  create(scenario: Omit<OldTestScenario, 'id' | 'created' | 'modified'>): OldTestScenario {
    const newScenario = new TestScenario({
      name: scenario.name,
      description: scenario.description,
      storyId: get(currentStory)?.metadata.id || '',
      tags: scenario.tags,
    });

    // Convert steps if provided
    if (scenario.steps) {
      // For now, support creating with description only
      // Full conversion would need more complex logic
      scenario.steps.forEach(step => {
        if (step.description) {
          newScenario.addStep(TestStepHelpers.start());
        }
      });
    }

    internalScenarios.update((scenarios) => {
      scenarios.set(newScenario.id, newScenario);
      saveScenarios(scenarios);
      return scenarios;
    });

    return convertToOldFormat(newScenario);
  },

  /**
   * Update an existing test scenario
   */
  update(id: string, updates: Partial<OldTestScenario>): void {
    internalScenarios.update((scenarios) => {
      const existing = scenarios.get(id);
      if (existing) {
        if (updates.name) existing.name = updates.name;
        if (updates.description !== undefined) existing.description = updates.description;
        if (updates.tags) existing.tags = updates.tags;
        existing.touch();
        saveScenarios(scenarios);
      }
      return scenarios;
    });
  },

  /**
   * Delete a test scenario
   */
  delete(id: string): void {
    internalScenarios.update((scenarios) => {
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
  duplicate(id: string): OldTestScenario | null {
    const scenarios = get(internalScenarios);
    const original = scenarios.get(id);
    if (!original) return null;

    const cloned = original.clone();

    internalScenarios.update((scenarios) => {
      scenarios.set(cloned.id, cloned);
      saveScenarios(scenarios);
      return scenarios;
    });

    return convertToOldFormat(cloned);
  },

  /**
   * Execute a test scenario using the new TestRunner
   */
  async run(id: string): Promise<TestScenarioResult> {
    const scenarios = get(internalScenarios);
    const scenario = scenarios.get(id);
    if (!scenario) {
      throw new Error(`Scenario ${id} not found`);
    }

    const story = get(currentStory);
    if (!story) {
      throw new Error('No story loaded');
    }

    runningScenarioId.set(id);

    try {
      const runner = new TestRunner(story);
      const result = await runner.runTest(scenario);

      const convertedResult = convertTestResult(result);

      scenarioResults.update((results) => {
        results.set(id, convertedResult);
        return results;
      });

      return convertedResult;
    } finally {
      runningScenarioId.set(null);
    }
  },

  /**
   * Run all test scenarios
   */
  async runAll(): Promise<TestScenarioResult[]> {
    const scenarios = get(internalScenarios);
    const story = get(currentStory);
    if (!story) {
      throw new Error('No story loaded');
    }

    const results: TestScenarioResult[] = [];
    const runner = new TestRunner(story);

    for (const scenario of Array.from(scenarios.values())) {
      if (scenario.enabled) {
        runningScenarioId.set(scenario.id);
        try {
          const result = await runner.runTest(scenario);
          const convertedResult = convertTestResult(result);

          scenarioResults.update((results) => {
            results.set(scenario.id, convertedResult);
            return results;
          });

          results.push(convertedResult);
        } catch (error) {
          console.error(`Failed to run scenario ${scenario.id}:`, error);
        } finally {
          runningScenarioId.set(null);
        }
      }
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
    const scenarios = get(internalScenarios);
    const serialized = Array.from(scenarios.values()).map(s => s.serialize());
    return JSON.stringify(serialized, null, 2);
  },

  /**
   * Import scenarios from JSON
   */
  importScenarios(json: string): number {
    try {
      const imported = JSON.parse(json);
      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array');
      }

      internalScenarios.update((scenarios) => {
        imported.forEach((data) => {
          try {
            const scenario = TestScenario.deserialize(data);
            // Generate new ID to avoid conflicts
            const newScenario = scenario.clone();
            scenarios.set(newScenario.id, newScenario);
          } catch (error) {
            console.error('Failed to import scenario:', error);
          }
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
      internalScenarios.set(new Map());
      scenarioResults.set(new Map());
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  /**
   * Get internal scenario (new class) for advanced use
   */
  getInternalScenario(id: string): TestScenario | undefined {
    return get(internalScenarios).get(id);
  },

  /**
   * Update internal scenario directly
   */
  updateInternalScenario(id: string, updater: (scenario: TestScenario) => void): void {
    internalScenarios.update((scenarios) => {
      const scenario = scenarios.get(id);
      if (scenario) {
        updater(scenario);
        saveScenarios(scenarios);
      }
      return scenarios;
    });
  },
};
