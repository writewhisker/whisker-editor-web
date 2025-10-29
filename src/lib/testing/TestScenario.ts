/**
 * TestScenario - Defines an automated test for a story
 *
 * Allows authors to define test scenarios to verify story paths work correctly.
 */

import { nanoid } from 'nanoid';

export type TestStepType = 'start' | 'choice' | 'check_passage' | 'check_variable' | 'check_text';

export interface TestStepData {
  type: TestStepType;
  description?: string;

  // For 'choice' steps
  choiceIndex?: number;
  choiceText?: string;

  // For 'check_passage' steps
  expectedPassageId?: string;
  expectedPassageTitle?: string;

  // For 'check_variable' steps
  variableName?: string;
  expectedValue?: any;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';

  // For 'check_text' steps
  expectedText?: string;
  textMatch?: 'exact' | 'contains' | 'regex';
}

export interface TestScenarioData {
  id: string;
  name: string;
  description: string;
  storyId: string;
  enabled: boolean;
  steps: TestStepData[];
  created: string;
  modified: string;
  tags?: string[];
}

export class TestStep {
  type: TestStepType;
  description: string;

  // Choice properties
  choiceIndex?: number;
  choiceText?: string;

  // Passage check properties
  expectedPassageId?: string;
  expectedPassageTitle?: string;

  // Variable check properties
  variableName?: string;
  expectedValue?: any;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';

  // Text check properties
  expectedText?: string;
  textMatch: 'exact' | 'contains' | 'regex';

  constructor(data: TestStepData) {
    this.type = data.type;
    this.description = data.description || this.getDefaultDescription(data);

    this.choiceIndex = data.choiceIndex;
    this.choiceText = data.choiceText;
    this.expectedPassageId = data.expectedPassageId;
    this.expectedPassageTitle = data.expectedPassageTitle;
    this.variableName = data.variableName;
    this.expectedValue = data.expectedValue;
    this.operator = data.operator || 'equals';
    this.expectedText = data.expectedText;
    this.textMatch = data.textMatch || 'contains';
  }

  private getDefaultDescription(data: TestStepData): string {
    switch (data.type) {
      case 'start':
        return 'Start the story';
      case 'choice':
        return data.choiceText
          ? `Choose: "${data.choiceText}"`
          : `Choose option ${data.choiceIndex}`;
      case 'check_passage':
        return `Verify at passage: ${data.expectedPassageTitle || data.expectedPassageId}`;
      case 'check_variable':
        return `Verify ${data.variableName} ${data.operator || 'equals'} ${data.expectedValue}`;
      case 'check_text':
        return `Verify text ${data.textMatch || 'contains'}: "${data.expectedText}"`;
      default:
        return 'Test step';
    }
  }

  serialize(): TestStepData {
    const data: TestStepData = {
      type: this.type,
      description: this.description,
    };

    if (this.choiceIndex !== undefined) data.choiceIndex = this.choiceIndex;
    if (this.choiceText) data.choiceText = this.choiceText;
    if (this.expectedPassageId) data.expectedPassageId = this.expectedPassageId;
    if (this.expectedPassageTitle) data.expectedPassageTitle = this.expectedPassageTitle;
    if (this.variableName) data.variableName = this.variableName;
    if (this.expectedValue !== undefined) data.expectedValue = this.expectedValue;
    if (this.operator !== 'equals') data.operator = this.operator;
    if (this.expectedText) data.expectedText = this.expectedText;
    if (this.textMatch !== 'contains') data.textMatch = this.textMatch;

    return data;
  }

  static deserialize(data: TestStepData): TestStep {
    return new TestStep(data);
  }
}

export class TestScenario {
  id: string;
  name: string;
  description: string;
  storyId: string;
  enabled: boolean;
  steps: TestStep[];
  created: string;
  modified: string;
  tags: string[];

  constructor(data?: Partial<TestScenarioData>) {
    const now = new Date().toISOString();

    this.id = data?.id || nanoid();
    this.name = data?.name || 'New Test Scenario';
    this.description = data?.description || '';
    this.storyId = data?.storyId || '';
    this.enabled = data?.enabled !== undefined ? data.enabled : true;
    this.steps = [];
    this.created = data?.created || now;
    this.modified = data?.modified || now;
    this.tags = data?.tags ? [...data.tags] : [];

    // Deserialize steps if provided
    if (data?.steps) {
      this.steps = data.steps.map(step => TestStep.deserialize(step));
    }
  }

  /**
   * Add a test step
   */
  addStep(step: TestStep | TestStepData): void {
    if (step instanceof TestStep) {
      this.steps.push(step);
    } else {
      this.steps.push(new TestStep(step));
    }
    this.touch();
  }

  /**
   * Remove a test step by index
   */
  removeStep(index: number): boolean {
    if (index >= 0 && index < this.steps.length) {
      this.steps.splice(index, 1);
      this.touch();
      return true;
    }
    return false;
  }

  /**
   * Move a step to a new position
   */
  moveStep(fromIndex: number, toIndex: number): boolean {
    if (
      fromIndex >= 0 && fromIndex < this.steps.length &&
      toIndex >= 0 && toIndex < this.steps.length
    ) {
      const [step] = this.steps.splice(fromIndex, 1);
      this.steps.splice(toIndex, 0, step);
      this.touch();
      return true;
    }
    return false;
  }

  /**
   * Update modification timestamp
   */
  touch(): void {
    this.modified = new Date().toISOString();
  }

  /**
   * Clone this test scenario with a new ID
   */
  clone(): TestScenario {
    return new TestScenario({
      ...this.serialize(),
      id: nanoid(),
      name: `${this.name} (Copy)`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    });
  }

  /**
   * Serialize to plain object
   */
  serialize(): TestScenarioData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      storyId: this.storyId,
      enabled: this.enabled,
      steps: this.steps.map(step => step.serialize()),
      created: this.created,
      modified: this.modified,
      tags: [...this.tags],
    };
  }

  /**
   * Deserialize from plain object
   */
  static deserialize(data: TestScenarioData): TestScenario {
    return new TestScenario(data);
  }
}

/**
 * Helper functions to create common test steps
 */
export const TestStepHelpers = {
  start(): TestStep {
    return new TestStep({ type: 'start' });
  },

  chooseByIndex(index: number): TestStep {
    return new TestStep({
      type: 'choice',
      choiceIndex: index,
    });
  },

  chooseByText(text: string): TestStep {
    return new TestStep({
      type: 'choice',
      choiceText: text,
    });
  },

  expectPassage(passageId: string, passageTitle?: string): TestStep {
    return new TestStep({
      type: 'check_passage',
      expectedPassageId: passageId,
      expectedPassageTitle: passageTitle,
    });
  },

  expectVariable(
    variableName: string,
    expectedValue: any,
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' = 'equals'
  ): TestStep {
    return new TestStep({
      type: 'check_variable',
      variableName,
      expectedValue,
      operator,
    });
  },

  expectText(
    text: string,
    match: 'exact' | 'contains' | 'regex' = 'contains'
  ): TestStep {
    return new TestStep({
      type: 'check_text',
      expectedText: text,
      textMatch: match,
    });
  },
};
