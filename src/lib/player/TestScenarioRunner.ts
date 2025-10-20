/**
 * Test Scenario Runner
 *
 * Executes test scenarios against a StoryPlayer instance and validates results.
 */

import type { StoryPlayer } from './StoryPlayer';
import type {
  TestScenario,
  TestScenarioResult,
  TestStepResult,
  TestStep,
  VariableAssertion,
  TestExecutionOptions,
} from './testScenarioTypes';

export class TestScenarioRunner {
  private player: StoryPlayer;

  constructor(player: StoryPlayer) {
    this.player = player;
  }

  /**
   * Execute a test scenario and return results
   */
  async execute(
    scenario: TestScenario,
    options: TestExecutionOptions = {}
  ): Promise<TestScenarioResult> {
    const startTime = Date.now();
    const stepResults: TestStepResult[] = [];
    const errors: string[] = [];
    let passed = true;

    try {
      // Start from specified passage or beginning
      const startPassage = scenario.startPassageId || this.player.getStartPassageId();
      this.player.start(startPassage);

      // Set up initial state AFTER starting (to override initialized values)
      if (scenario.initialVariables) {
        for (const [name, value] of Object.entries(scenario.initialVariables)) {
          this.player.setVariable(name, value);
        }
      }

      // Execute each test step
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        const stepResult = await this.executeStep(step, i);

        stepResults.push(stepResult);

        if (!stepResult.passed) {
          passed = false;
          errors.push(...stepResult.errors);

          if (options.stopOnFirstError) {
            break;
          }
        }
      }

      // Validate final state
      if (scenario.expectedFinalPassageId) {
        const currentPassage = this.player.getCurrentPassage();
        if (currentPassage?.id !== scenario.expectedFinalPassageId) {
          passed = false;
          errors.push(
            `Expected to end at passage "${scenario.expectedFinalPassageId}" but ended at "${currentPassage?.id}"`
          );
        }
      }

      if (scenario.expectedFinalVariables) {
        for (const assertion of scenario.expectedFinalVariables) {
          const assertionResult = this.checkAssertion(assertion);
          if (!assertionResult.passed) {
            passed = false;
            errors.push(assertionResult.error!);
          }
        }
      }
    } catch (error) {
      passed = false;
      errors.push(`Scenario execution error: ${error}`);
    }

    const endTime = Date.now();

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed,
      startTime,
      endTime,
      duration: endTime - startTime,
      stepResults,
      errors,
      finalVariables: Object.fromEntries(this.player.getAllVariables()),
      finalPassageTitle: this.player.getCurrentPassage()?.title,
    };
  }

  /**
   * Execute a single test step
   */
  private async executeStep(step: TestStep, stepIndex: number): Promise<TestStepResult> {
    const errors: string[] = [];
    let passed = true;

    const currentPassage = this.player.getCurrentPassage();

    // Validate we're at the expected passage
    if (step.passageTitle && currentPassage?.title !== step.passageTitle) {
      passed = false;
      errors.push(
        `Step ${stepIndex + 1}: Expected passage "${step.passageTitle}" but found "${currentPassage?.title}"`
      );
    }

    if (step.passageId && currentPassage?.id !== step.passageId) {
      passed = false;
      errors.push(
        `Step ${stepIndex + 1}: Expected passage ID "${step.passageId}" but found "${currentPassage?.id}"`
      );
    }

    // Validate expected variables
    if (step.expectedVariables) {
      for (const assertion of step.expectedVariables) {
        const assertionResult = this.checkAssertion(assertion);
        if (!assertionResult.passed) {
          passed = false;
          errors.push(`Step ${stepIndex + 1}: ${assertionResult.error}`);
        }
      }
    }

    // Validate expected choices
    if (step.expectedChoices) {
      const availableChoices = this.player.getAvailableChoices();
      for (const expectedChoice of step.expectedChoices) {
        const choiceExists = availableChoices.some(
          (c) => c.text === expectedChoice.text
        );

        if (choiceExists !== expectedChoice.shouldBeAvailable) {
          passed = false;
          const shouldText = expectedChoice.shouldBeAvailable ? 'available' : 'not available';
          errors.push(
            `Step ${stepIndex + 1}: Choice "${expectedChoice.text}" should be ${shouldText}`
          );
        }
      }
    }

    // Make the choice if specified
    if (step.choiceText) {
      const availableChoices = this.player.getAvailableChoices();
      const choice = availableChoices.find((c) => c.text === step.choiceText);

      if (!choice) {
        passed = false;
        errors.push(
          `Step ${stepIndex + 1}: Choice "${step.choiceText}" not found. Available: ${availableChoices
            .map((c) => c.text)
            .join(', ')}`
        );
      } else {
        this.player.makeChoice(choice.id);
      }
    } else if (step.choiceId) {
      try {
        this.player.makeChoice(step.choiceId);
      } catch (error) {
        passed = false;
        errors.push(`Step ${stepIndex + 1}: Failed to make choice: ${error}`);
      }
    }

    return {
      step,
      passed,
      errors,
      actualPassageTitle: currentPassage?.title,
      actualVariables: Object.fromEntries(this.player.getAllVariables()),
    };
  }

  /**
   * Check a variable assertion
   */
  private checkAssertion(assertion: VariableAssertion): {
    passed: boolean;
    error?: string;
  } {
    const actualValue = this.player.getVariable(assertion.variableName);

    switch (assertion.operator) {
      case 'equals':
        if (actualValue !== assertion.expectedValue) {
          return {
            passed: false,
            error: `Variable "${assertion.variableName}" expected ${assertion.expectedValue}, got ${actualValue}`,
          };
        }
        break;

      case 'greaterThan':
        if (actualValue <= assertion.expectedValue) {
          return {
            passed: false,
            error: `Variable "${assertion.variableName}" expected > ${assertion.expectedValue}, got ${actualValue}`,
          };
        }
        break;

      case 'lessThan':
        if (actualValue >= assertion.expectedValue) {
          return {
            passed: false,
            error: `Variable "${assertion.variableName}" expected < ${assertion.expectedValue}, got ${actualValue}`,
          };
        }
        break;

      case 'contains':
        if (!String(actualValue).includes(String(assertion.expectedValue))) {
          return {
            passed: false,
            error: `Variable "${assertion.variableName}" expected to contain "${assertion.expectedValue}", got "${actualValue}"`,
          };
        }
        break;

      case 'exists':
        if (actualValue === undefined) {
          return {
            passed: false,
            error: `Variable "${assertion.variableName}" expected to exist but is undefined`,
          };
        }
        break;
    }

    return { passed: true };
  }
}
