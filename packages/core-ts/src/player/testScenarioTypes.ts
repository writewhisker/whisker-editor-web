/**
 * Test Scenario Types
 *
 * Defines types for test scenarios that can be saved, loaded, and executed
 * to automate story testing.
 */

/**
 * Variable assertion for test validation
 */
export interface VariableAssertion {
  variableName: string;
  expectedValue: any;
  operator: 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'exists';
}

/**
 * Expected choice to be available at a step
 */
export interface ExpectedChoice {
  text: string;
  shouldBeAvailable: boolean;
}

/**
 * Test step definition
 */
export interface TestStep {
  passageId?: string;
  passageTitle?: string;
  choiceText?: string;
  choiceId?: string;
  expectedVariables?: VariableAssertion[];
  expectedChoices?: ExpectedChoice[];
  description?: string;
}

/**
 * Test result for a single step
 */
export interface TestStepResult {
  step: TestStep;
  passed: boolean;
  errors: string[];
  actualPassageTitle?: string;
  actualVariables?: Record<string, any>;
}

/**
 * Complete test scenario definition
 */
export interface TestScenario {
  id: string;
  name: string;
  description?: string;
  created: string;
  modified: string;

  // Initial conditions
  startPassageId?: string;
  initialVariables?: Record<string, any>;

  // Test steps to execute
  steps: TestStep[];

  // Expected outcome
  expectedFinalPassageId?: string;
  expectedFinalVariables?: VariableAssertion[];

  // Metadata
  tags?: string[];
}

/**
 * Result of executing a test scenario
 */
export interface TestScenarioResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  startTime: number;
  endTime: number;
  duration: number;

  stepResults: TestStepResult[];
  errors: string[];

  finalVariables?: Record<string, any>;
  finalPassageTitle?: string;
}

/**
 * Test scenario execution options
 */
export interface TestExecutionOptions {
  stopOnFirstError?: boolean;
  capturePlaythrough?: boolean;
  timeoutMs?: number;
}
