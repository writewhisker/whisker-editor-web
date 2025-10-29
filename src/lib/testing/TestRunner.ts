/**
 * TestRunner - Executes automated test scenarios
 *
 * Runs test scenarios and generates detailed results.
 */

import type { Story } from '../models/Story';
import type { Passage } from '../models/Passage';
import { TestScenario, type TestStep } from './TestScenario';
import { Playthrough, PlaythroughStep } from '../models/Playthrough';

export interface TestStepResult {
  stepIndex: number;
  step: TestStep;
  passed: boolean;
  message: string;
  actualValue?: any;
  expectedValue?: any;
  timestamp: string;
}

export interface TestResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  startTime: string;
  endTime: string;
  duration: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  stepResults: TestStepResult[];
  playthrough?: Playthrough;
  error?: string;
}

export class TestRunner {
  private story: Story;
  private currentPassage: Passage | null = null;
  private variables: Map<string, any> = new Map();
  private playthrough: Playthrough | null = null;

  constructor(story: Story) {
    this.story = story;
  }

  /**
   * Run a single test scenario
   */
  async runTest(scenario: TestScenario): Promise<TestResult> {
    const startTime = new Date().toISOString();
    const stepResults: TestStepResult[] = [];

    try {
      // Initialize test state
      this.reset();

      // Start playthrough recording
      this.playthrough = new Playthrough({
        storyId: this.story.metadata.id || 'unknown',
        storyTitle: this.story.metadata.title,
        metadata: { testScenario: scenario.id },
      });

      // Execute each test step
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        const result = await this.executeStep(step, i);
        stepResults.push(result);

        if (!result.passed) {
          break; // Stop on first failure
        }
      }

      // Complete the playthrough
      if (this.playthrough) {
        this.playthrough.complete(Object.fromEntries(this.variables));
      }

      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      const passedSteps = stepResults.filter(r => r.passed).length;
      const failedSteps = stepResults.filter(r => !r.passed).length;

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed: failedSteps === 0,
        startTime,
        endTime,
        duration,
        totalSteps: scenario.steps.length,
        passedSteps,
        failedSteps,
        stepResults,
        playthrough: this.playthrough,
      };
    } catch (error) {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed: false,
        startTime,
        endTime,
        duration,
        totalSteps: scenario.steps.length,
        passedSteps: stepResults.filter(r => r.passed).length,
        failedSteps: stepResults.filter(r => !r.passed).length + 1,
        stepResults,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run multiple test scenarios
   */
  async runTests(scenarios: TestScenario[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const scenario of scenarios) {
      if (scenario.enabled) {
        const result = await this.runTest(scenario);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Execute a single test step
   */
  private async executeStep(step: TestStep, stepIndex: number): Promise<TestStepResult> {
    const timestamp = new Date().toISOString();

    try {
      switch (step.type) {
        case 'start':
          return this.executeStartStep(step, stepIndex, timestamp);

        case 'choice':
          return this.executeChoiceStep(step, stepIndex, timestamp);

        case 'check_passage':
          return this.executeCheckPassageStep(step, stepIndex, timestamp);

        case 'check_variable':
          return this.executeCheckVariableStep(step, stepIndex, timestamp);

        case 'check_text':
          return this.executeCheckTextStep(step, stepIndex, timestamp);

        default:
          return {
            stepIndex,
            step,
            passed: false,
            message: `Unknown step type: ${step.type}`,
            timestamp,
          };
      }
    } catch (error) {
      return {
        stepIndex,
        step,
        passed: false,
        message: error instanceof Error ? error.message : String(error),
        timestamp,
      };
    }
  }

  /**
   * Execute start step
   */
  private executeStartStep(step: TestStep, stepIndex: number, timestamp: string): TestStepResult {
    const startPassageId = this.story.startPassage;
    if (!startPassageId) {
      return {
        stepIndex,
        step,
        passed: false,
        message: 'Story has no start passage',
        timestamp,
      };
    }

    const startPassage = this.story.passages.get(startPassageId);
    if (!startPassage) {
      return {
        stepIndex,
        step,
        passed: false,
        message: `Start passage not found: ${startPassageId}`,
        timestamp,
      };
    }

    this.currentPassage = startPassage;
    this.recordPassageVisit();

    return {
      stepIndex,
      step,
      passed: true,
      message: `Started at passage: ${startPassage.title}`,
      actualValue: startPassage.title,
      timestamp,
    };
  }

  /**
   * Execute choice step
   */
  private executeChoiceStep(step: TestStep, stepIndex: number, timestamp: string): TestStepResult {
    if (!this.currentPassage) {
      return {
        stepIndex,
        step,
        passed: false,
        message: 'No current passage (must start test first)',
        timestamp,
      };
    }

    const choices = this.currentPassage.choices;

    // Find choice by index or text
    let choiceIndex: number;
    if (step.choiceIndex !== undefined) {
      choiceIndex = step.choiceIndex;
    } else if (step.choiceText) {
      choiceIndex = choices.findIndex(c => c.text === step.choiceText);
      if (choiceIndex === -1) {
        return {
          stepIndex,
          step,
          passed: false,
          message: `Choice not found: "${step.choiceText}"`,
          actualValue: choices.map(c => c.text),
          expectedValue: step.choiceText,
          timestamp,
        };
      }
    } else {
      return {
        stepIndex,
        step,
        passed: false,
        message: 'Choice step must specify either choiceIndex or choiceText',
        timestamp,
      };
    }

    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      return {
        stepIndex,
        step,
        passed: false,
        message: `Invalid choice index: ${choiceIndex} (available: 0-${choices.length - 1})`,
        actualValue: choices.length,
        expectedValue: choiceIndex,
        timestamp,
      };
    }

    const choice = choices[choiceIndex];
    const nextPassage = this.story.passages.get(choice.target);

    if (!nextPassage) {
      return {
        stepIndex,
        step,
        passed: false,
        message: `Target passage not found: ${choice.target}`,
        timestamp,
      };
    }

    this.currentPassage = nextPassage;
    this.recordPassageVisit();

    return {
      stepIndex,
      step,
      passed: true,
      message: `Chose: "${choice.text}" → ${nextPassage.title}`,
      actualValue: choice.text,
      timestamp,
    };
  }

  /**
   * Execute check passage step
   */
  private executeCheckPassageStep(step: TestStep, stepIndex: number, timestamp: string): TestStepResult {
    if (!this.currentPassage) {
      return {
        stepIndex,
        step,
        passed: false,
        message: 'No current passage to check',
        timestamp,
      };
    }

    const idMatch = step.expectedPassageId
      ? this.currentPassage.id === step.expectedPassageId
      : true;

    const titleMatch = step.expectedPassageTitle
      ? this.currentPassage.title === step.expectedPassageTitle
      : true;

    const passed = idMatch && titleMatch;

    return {
      stepIndex,
      step,
      passed,
      message: passed
        ? `At expected passage: ${this.currentPassage.title}`
        : `Expected passage "${step.expectedPassageTitle || step.expectedPassageId}", but at "${this.currentPassage.title}"`,
      actualValue: { id: this.currentPassage.id, title: this.currentPassage.title },
      expectedValue: { id: step.expectedPassageId, title: step.expectedPassageTitle },
      timestamp,
    };
  }

  /**
   * Execute check variable step
   */
  private executeCheckVariableStep(step: TestStep, stepIndex: number, timestamp: string): TestStepResult {
    if (!step.variableName) {
      return {
        stepIndex,
        step,
        passed: false,
        message: 'Variable name not specified',
        timestamp,
      };
    }

    const actualValue = this.variables.get(step.variableName);
    const expectedValue = step.expectedValue;
    const operator = step.operator || 'equals';

    let passed = false;
    let message = '';

    switch (operator) {
      case 'equals':
        passed = actualValue === expectedValue;
        message = passed
          ? `Variable ${step.variableName} = ${actualValue}`
          : `Expected ${step.variableName} = ${expectedValue}, but got ${actualValue}`;
        break;

      case 'not_equals':
        passed = actualValue !== expectedValue;
        message = passed
          ? `Variable ${step.variableName} ≠ ${expectedValue}`
          : `Expected ${step.variableName} ≠ ${expectedValue}, but it equals`;
        break;

      case 'greater_than':
        passed = actualValue > expectedValue;
        message = passed
          ? `Variable ${step.variableName} > ${expectedValue}`
          : `Expected ${step.variableName} > ${expectedValue}, but got ${actualValue}`;
        break;

      case 'less_than':
        passed = actualValue < expectedValue;
        message = passed
          ? `Variable ${step.variableName} < ${expectedValue}`
          : `Expected ${step.variableName} < ${expectedValue}, but got ${actualValue}`;
        break;

      case 'contains':
        passed = String(actualValue).includes(String(expectedValue));
        message = passed
          ? `Variable ${step.variableName} contains "${expectedValue}"`
          : `Expected ${step.variableName} to contain "${expectedValue}", but got ${actualValue}`;
        break;
    }

    return {
      stepIndex,
      step,
      passed,
      message,
      actualValue,
      expectedValue,
      timestamp,
    };
  }

  /**
   * Execute check text step
   */
  private executeCheckTextStep(step: TestStep, stepIndex: number, timestamp: string): TestStepResult {
    if (!this.currentPassage) {
      return {
        stepIndex,
        step,
        passed: false,
        message: 'No current passage to check',
        timestamp,
      };
    }

    const content = this.currentPassage.content;
    const expectedText = step.expectedText || '';
    const textMatch = step.textMatch || 'contains';

    let passed = false;
    let message = '';

    switch (textMatch) {
      case 'exact':
        passed = content === expectedText;
        message = passed
          ? 'Text matches exactly'
          : `Expected exact text match`;
        break;

      case 'contains':
        passed = content.includes(expectedText);
        message = passed
          ? `Text contains "${expectedText}"`
          : `Text does not contain "${expectedText}"`;
        break;

      case 'regex':
        try {
          const regex = new RegExp(expectedText);
          passed = regex.test(content);
          message = passed
            ? `Text matches regex: ${expectedText}`
            : `Text does not match regex: ${expectedText}`;
        } catch (error) {
          return {
            stepIndex,
            step,
            passed: false,
            message: `Invalid regex: ${expectedText}`,
            timestamp,
          };
        }
        break;
    }

    return {
      stepIndex,
      step,
      passed,
      message,
      actualValue: content.length > 100 ? content.substring(0, 100) + '...' : content,
      expectedValue: expectedText,
      timestamp,
    };
  }

  /**
   * Record passage visit in playthrough
   */
  private recordPassageVisit(): void {
    if (!this.playthrough || !this.currentPassage) return;

    const step = new PlaythroughStep({
      passageId: this.currentPassage.id,
      passageTitle: this.currentPassage.title,
      timestamp: new Date().toISOString(),
      variables: Object.fromEntries(this.variables),
      timeSpent: 0,
    });

    this.playthrough.addStep(step);
  }

  /**
   * Reset test state
   */
  private reset(): void {
    this.currentPassage = null;
    this.variables = new Map();
    this.playthrough = null;

    // Initialize variables from story
    this.story.variables.forEach((variable, name) => {
      this.variables.set(name, variable.initial);
    });
  }
}
