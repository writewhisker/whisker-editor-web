/**
 * Test Scenario Adapter
 *
 * Provides compatibility between the new TestScenario classes
 * and the existing player-based test system.
 */

import { TestScenario as NewTestScenario, TestStep as NewTestStep, type TestStepData as NewTestStepData } from './TestScenario';
import type { TestScenario as OldTestScenario, TestStep as OldTestStep } from '../player/testScenarioTypes';

/**
 * Convert old test scenario format to new class instances
 */
export function migrateOldScenario(oldScenario: OldTestScenario): NewTestScenario {
  const newScenario = new NewTestScenario({
    id: oldScenario.id,
    name: oldScenario.name,
    description: oldScenario.description,
    storyId: '', // Old format doesn't have this
    enabled: true,
    created: oldScenario.created,
    modified: oldScenario.modified,
    tags: oldScenario.tags,
  });

  // Convert steps
  oldScenario.steps.forEach(oldStep => {
    const newSteps = convertOldStep(oldStep);
    newSteps.forEach(step => newScenario.addStep(step));
  });

  return newScenario;
}

/**
 * Convert old test step to new test step(s)
 * Note: One old step may become multiple new steps
 */
function convertOldStep(oldStep: OldTestStep): NewTestStep[] {
  const steps: NewTestStep[] = [];

  // If checking passage, add a check_passage step
  if (oldStep.passageId || oldStep.passageTitle) {
    steps.push(new NewTestStep({
      type: 'check_passage',
      expectedPassageId: oldStep.passageId,
      expectedPassageTitle: oldStep.passageTitle,
      description: oldStep.description || `Verify at passage: ${oldStep.passageTitle || oldStep.passageId}`,
    }));
  }

  // If making a choice, add a choice step
  if (oldStep.choiceText || oldStep.choiceId) {
    steps.push(new NewTestStep({
      type: 'choice',
      choiceText: oldStep.choiceText,
      description: oldStep.description || `Choose: ${oldStep.choiceText}`,
    }));
  }

  // If checking variables, add check_variable steps
  if (oldStep.expectedVariables) {
    oldStep.expectedVariables.forEach(assertion => {
      const operator = mapOperator(assertion.operator);
      steps.push(new NewTestStep({
        type: 'check_variable',
        variableName: assertion.variableName,
        expectedValue: assertion.expectedValue,
        operator,
        description: `Verify ${assertion.variableName} ${operator} ${assertion.expectedValue}`,
      }));
    });
  }

  // If no specific steps were created, add a generic step
  if (steps.length === 0 && oldStep.description) {
    steps.push(new NewTestStep({
      type: 'check_passage', // Default type
      description: oldStep.description,
    }));
  }

  return steps;
}

/**
 * Map old operator to new operator
 */
function mapOperator(oldOp: 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'exists'):
  'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' {
  switch (oldOp) {
    case 'equals':
    case 'exists':
      return 'equals';
    case 'greaterThan':
      return 'greater_than';
    case 'lessThan':
      return 'less_than';
    case 'contains':
      return 'contains';
    default:
      return 'equals';
  }
}

/**
 * Convert new test scenario back to old format for storage/compatibility
 */
export function convertToOldFormat(newScenario: NewTestScenario): OldTestScenario {
  const serialized = newScenario.serialize();

  // Group consecutive steps by passage
  const oldSteps: OldTestStep[] = [];
  let currentStep: Partial<OldTestStep> = {};

  serialized.steps.forEach((step, index) => {
    switch (step.type) {
      case 'start':
        // Start doesn't map to old format directly
        break;

      case 'check_passage':
        // If we have accumulated data, save it
        if (Object.keys(currentStep).length > 0) {
          oldSteps.push(currentStep as OldTestStep);
          currentStep = {};
        }
        currentStep.passageId = step.expectedPassageId;
        currentStep.passageTitle = step.expectedPassageTitle;
        currentStep.description = step.description;
        break;

      case 'choice':
        currentStep.choiceText = step.choiceText;
        if (!currentStep.description) {
          currentStep.description = step.description;
        }
        // Save the step after a choice
        if (Object.keys(currentStep).length > 0) {
          oldSteps.push(currentStep as OldTestStep);
          currentStep = {};
        }
        break;

      case 'check_variable':
        if (!currentStep.expectedVariables) {
          currentStep.expectedVariables = [];
        }
        currentStep.expectedVariables.push({
          variableName: step.variableName!,
          expectedValue: step.expectedValue,
          operator: reverseMapOperator(step.operator || 'equals'),
        });
        break;

      case 'check_text':
        // Text checks don't map directly to old format
        // We can add as description
        if (!currentStep.description) {
          currentStep.description = step.description;
        }
        break;
    }
  });

  // Save any remaining step
  if (Object.keys(currentStep).length > 0) {
    oldSteps.push(currentStep as OldTestStep);
  }

  return {
    id: serialized.id,
    name: serialized.name,
    description: serialized.description,
    created: serialized.created,
    modified: serialized.modified,
    steps: oldSteps,
    tags: serialized.tags,
  };
}

/**
 * Reverse map new operator to old operator
 */
function reverseMapOperator(newOp: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains'):
  'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'exists' {
  switch (newOp) {
    case 'equals':
    case 'not_equals':
      return 'equals';
    case 'greater_than':
      return 'greaterThan';
    case 'less_than':
      return 'lessThan';
    case 'contains':
      return 'contains';
    default:
      return 'equals';
  }
}

/**
 * Load scenarios from storage and migrate to new format
 */
export function loadAndMigrateScenarios(storageKey: string): Map<string, NewTestScenario> {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored) as Record<string, OldTestScenario>;
    const scenarios = new Map<string, NewTestScenario>();

    Object.entries(parsed).forEach(([id, oldScenario]) => {
      try {
        const newScenario = migrateOldScenario(oldScenario);
        scenarios.set(id, newScenario);
      } catch (error) {
        console.error(`Failed to migrate scenario ${id}:`, error);
      }
    });

    return scenarios;
  } catch (error) {
    console.error('Failed to load scenarios:', error);
    return new Map();
  }
}

/**
 * Save scenarios to storage in old format for compatibility
 */
export function saveAsOldFormat(scenarios: Map<string, NewTestScenario>, storageKey: string): void {
  try {
    const oldFormat: Record<string, OldTestScenario> = {};

    scenarios.forEach((newScenario, id) => {
      try {
        oldFormat[id] = convertToOldFormat(newScenario);
      } catch (error) {
        console.error(`Failed to convert scenario ${id}:`, error);
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(oldFormat));
  } catch (error) {
    console.error('Failed to save scenarios:', error);
  }
}
