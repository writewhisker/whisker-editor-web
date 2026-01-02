/**
 * Test Helpers and Fixtures
 *
 * Utilities for testing Whisker stories and components.
 * Provides test setup, fixtures, and helper functions.
 */

import { Story, Passage, Variable, Choice } from '@writewhisker/story-models';

// =============================================================================
// WLS Test Utilities
// =============================================================================

/**
 * Parse WLS content and return structured test result
 */
export interface ParseResult {
  success: boolean;
  story?: Story;
  passageCount: number;
  variableCount: number;
  choiceCount: number;
  parseErrors: string[];
  warnings: string[];
}

/**
 * Parse WLS content for testing
 */
export function parseWLS(content: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Parse passage headers (:: PassageName)
    const passageRegex = /^::[ \t]*([^\n\[{]+?)(?:\s*\[([^\]]*)\])?(?:\s*\{([^}]*)\})?[ \t]*$/gm;
    const passages = new Map<string, Passage>();
    const variables = new Map<string, Variable>();

    let match: RegExpExecArray | null;
    const lines = content.split('\n');
    let currentPassageId: string | null = null;
    let currentContent: string[] = [];
    let passageStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const passageMatch = line.match(/^::[ \t]*([^\n\[{]+?)(?:\s*\[([^\]]*)\])?(?:\s*\{([^}]*)\})?[ \t]*$/);

      if (passageMatch) {
        // Save previous passage
        if (currentPassageId) {
          const passageContent = currentContent.join('\n').trim();
          const choices = extractChoices(passageContent);
          passages.set(currentPassageId, new Passage({
            id: currentPassageId,
            title: currentPassageId,
            content: passageContent,
            choices,
            tags: [],
          }));
        }

        // Start new passage
        currentPassageId = passageMatch[1].trim();
        currentContent = [];
        passageStartLine = i;

        // Parse tags
        const tags = passageMatch[2] ? passageMatch[2].split(/\s+/).filter(Boolean) : [];
      } else if (currentPassageId) {
        currentContent.push(line);

        // Extract variable declarations
        const varMatch = line.match(/\{do\s+\$?(\w+)\s*=\s*(.+?)\}/);
        if (varMatch) {
          const [, name, value] = varMatch;
          if (!variables.has(name)) {
            variables.set(name, new Variable({
              name,
              type: inferType(value),
              initial: parseValue(value),
            }));
          }
        }
      }
    }

    // Save last passage
    if (currentPassageId) {
      const passageContent = currentContent.join('\n').trim();
      const choices = extractChoices(passageContent);
      passages.set(currentPassageId, new Passage({
        id: currentPassageId,
        title: currentPassageId,
        content: passageContent,
        choices,
        tags: [],
      }));
    }

    // Determine start passage
    const startPassage = passages.has('Start') ? 'Start' :
                        passages.keys().next().value || 'Start';

    // Count choices
    let choiceCount = 0;
    for (const passage of passages.values()) {
      choiceCount += passage.choices.length;
    }

    const story = new Story({
      metadata: {
        title: 'Test Story',
        author: '',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      startPassage,
      passages: Object.fromEntries(passages),
      variables: Object.fromEntries(variables),
    });

    return {
      success: true,
      story,
      passageCount: passages.size,
      variableCount: variables.size,
      choiceCount,
      parseErrors: errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      passageCount: 0,
      variableCount: 0,
      choiceCount: 0,
      parseErrors: [error instanceof Error ? error.message : String(error)],
      warnings,
    };
  }
}

/**
 * Extract choices from passage content
 */
function extractChoices(content: string): Choice[] {
  const choices: Choice[] = [];
  const choiceRegex = /^\+\s*\[([^\]]+)\]\s*(?:->|→)\s*(\S+)/gm;

  let match: RegExpExecArray | null;
  while ((match = choiceRegex.exec(content)) !== null) {
    choices.push(new Choice({
      id: `choice-${choices.length}`,
      text: match[1].trim(),
      target: match[2].trim(),
    }));
  }

  // Also match [[link]] style
  const linkRegex = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;
  while ((match = linkRegex.exec(content)) !== null) {
    const text = match[2] || match[1];
    const target = match[1];
    choices.push(new Choice({
      id: `choice-${choices.length}`,
      text: text.trim(),
      target: target.trim(),
    }));
  }

  return choices;
}

/**
 * Infer variable type from value
 */
function inferType(value: string): 'string' | 'number' | 'boolean' {
  const trimmed = value.trim();
  if (trimmed === 'true' || trimmed === 'false') return 'boolean';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return 'number';
  return 'string';
}

/**
 * Parse value string to actual value
 */
function parseValue(value: string): string | number | boolean {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  return trimmed.replace(/^["']|["']$/g, '');
}

/**
 * Validate result interface
 */
export interface ValidateResult {
  valid: boolean;
  errors: Array<{
    code: string;
    message: string;
    passageId?: string;
    line?: number;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: string[];
}

/**
 * Parse and validate WLS content
 */
export function parseAndValidate(content: string): ParseResult & ValidateResult {
  const parseResult = parseWLS(content);
  const validationErrors: ValidateResult['errors'] = [];

  if (parseResult.success && parseResult.story) {
    const story = parseResult.story;

    // Check for missing start passage
    if (!story.passages.has(story.startPassage)) {
      validationErrors.push({
        code: 'WLS-STR-001',
        message: `Start passage "${story.startPassage}" not found`,
        severity: 'error',
      });
    }

    // Check for dead links
    for (const passage of story.passages.values()) {
      for (const choice of passage.choices) {
        if (choice.target && choice.target !== 'END' && !story.passages.has(choice.target)) {
          validationErrors.push({
            code: 'WLS-LNK-001',
            message: `Dead link to "${choice.target}" in passage "${passage.id}"`,
            passageId: passage.id,
            severity: 'error',
          });
        }
      }
    }

    // Check for unreachable passages
    const reachable = new Set<string>();
    const queue = [story.startPassage];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      const passage = story.passages.get(current);
      if (passage) {
        for (const choice of passage.choices) {
          if (choice.target && !reachable.has(choice.target)) {
            queue.push(choice.target);
          }
        }
      }
    }

    for (const passage of story.passages.values()) {
      if (!reachable.has(passage.id)) {
        validationErrors.push({
          code: 'WLS-STR-002',
          message: `Unreachable passage "${passage.id}"`,
          passageId: passage.id,
          severity: 'warning',
        });
      }
    }
  }

  return {
    ...parseResult,
    valid: parseResult.success && validationErrors.filter(e => e.severity === 'error').length === 0,
    errors: validationErrors,
    warnings: parseResult.warnings,
  };
}

/**
 * Story playthrough result
 */
export interface PlaythroughResult {
  success: boolean;
  output: string[];
  passages: string[];
  finalVariables: Record<string, any>;
  choicesMade: number;
  error?: string;
}

/**
 * Run a story with specific choice indices
 */
export function runStory(content: string, choices: number[] = []): PlaythroughResult {
  const parseResult = parseWLS(content);

  if (!parseResult.success || !parseResult.story) {
    return {
      success: false,
      output: [],
      passages: [],
      finalVariables: {},
      choicesMade: 0,
      error: parseResult.parseErrors.join(', '),
    };
  }

  const story = parseResult.story;
  const output: string[] = [];
  const visitedPassages: string[] = [];
  const variables: Record<string, any> = {};

  // Initialize variables
  for (const [name, variable] of story.variables) {
    variables[name] = variable.initial;
  }

  let currentPassageId = story.startPassage;
  let choiceIndex = 0;
  const maxIterations = 1000; // Prevent infinite loops
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    const passage = story.passages.get(currentPassageId);
    if (!passage) {
      return {
        success: false,
        output,
        passages: visitedPassages,
        finalVariables: variables,
        choicesMade: choiceIndex,
        error: `Passage "${currentPassageId}" not found`,
      };
    }

    visitedPassages.push(currentPassageId);

    // Process content (simple variable interpolation)
    let processedContent = passage.content;
    for (const [name, value] of Object.entries(variables)) {
      processedContent = processedContent.replace(new RegExp(`\\$${name}`, 'g'), String(value));
    }
    output.push(processedContent);

    // Check for END
    if (currentPassageId === 'END' || passage.choices.length === 0) {
      break;
    }

    // Make choice
    const availableChoices = passage.choices;
    if (availableChoices.length === 0) {
      break;
    }

    const choiceToMake = choiceIndex < choices.length ? choices[choiceIndex] : 0;
    if (choiceToMake >= availableChoices.length) {
      return {
        success: false,
        output,
        passages: visitedPassages,
        finalVariables: variables,
        choicesMade: choiceIndex,
        error: `Invalid choice index ${choiceToMake} (only ${availableChoices.length} choices available)`,
      };
    }

    const selectedChoice = availableChoices[choiceToMake];
    currentPassageId = selectedChoice.target;
    choiceIndex++;

    if (currentPassageId === 'END') {
      break;
    }
  }

  return {
    success: true,
    output,
    passages: visitedPassages,
    finalVariables: variables,
    choicesMade: choiceIndex,
  };
}

/**
 * Test corpus case interface
 */
export interface CorpusTestCase {
  name: string;
  description?: string;
  input: string;
  expected: {
    passages?: number;
    variables?: string[];
    valid?: boolean;
    errors?: string[];
    output_contains?: string;
    start_passage?: string;
  };
}

/**
 * Run a corpus test case
 */
export function runCorpusTest(testCase: CorpusTestCase): {
  passed: boolean;
  failures: string[];
} {
  const result = parseAndValidate(testCase.input);
  const failures: string[] = [];

  if (testCase.expected.passages !== undefined) {
    if (result.passageCount !== testCase.expected.passages) {
      failures.push(`Expected ${testCase.expected.passages} passages, got ${result.passageCount}`);
    }
  }

  if (testCase.expected.valid !== undefined) {
    if (result.valid !== testCase.expected.valid) {
      failures.push(`Expected valid=${testCase.expected.valid}, got ${result.valid}`);
    }
  }

  if (testCase.expected.variables !== undefined) {
    for (const varName of testCase.expected.variables) {
      if (!result.story?.variables.has(varName)) {
        failures.push(`Expected variable "${varName}" not found`);
      }
    }
  }

  if (testCase.expected.start_passage !== undefined && result.story) {
    if (result.story.startPassage !== testCase.expected.start_passage) {
      failures.push(`Expected start passage "${testCase.expected.start_passage}", got "${result.story.startPassage}"`);
    }
  }

  if (testCase.expected.output_contains !== undefined) {
    const playResult = runStory(testCase.input);
    const fullOutput = playResult.output.join('\n');
    if (!fullOutput.includes(testCase.expected.output_contains)) {
      failures.push(`Expected output to contain "${testCase.expected.output_contains}"`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

// =============================================================================
// Original Test Helpers
// =============================================================================

/**
 * Create a minimal story for testing
 */
export function createTestStory(overrides?: Partial<any>): Story {
  const story = new Story({
    metadata: {
      title: 'Test Story',
      author: '',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      ifid: 'test-ifid-1',
    },
    startPassage: 'Start',
    ...overrides,
  });

  // Add default passages if not provided
  if (story.passages.size === 0) {
    const start = createTestPassage({ title: 'Start' });
    const middle = createTestPassage({ title: 'Middle', id: 'passage-2' });
    const end = createTestPassage({ title: 'End', id: 'passage-3' });

    story.passages.set(start.id, start);
    story.passages.set(middle.id, middle);
    story.passages.set(end.id, end);
    story.startPassage = start.id;
  }

  return story;
}

/**
 * Create a test passage
 */
export function createTestPassage(overrides?: Partial<any>): Passage {
  return new Passage({
    id: 'passage-1',
    title: 'Test Passage',
    content: 'This is test content.\n\n[[Next Passage]]',
    tags: [],
    position: { x: 0, y: 0 },
    ...overrides,
  });
}

/**
 * Create a story with specific structure
 */
export function createLinearStory(length: number = 5): Story {
  const story = new Story({
    metadata: {
      title: 'Linear Story',
      author: '',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      ifid: 'linear-story-ifid',
    },
    startPassage: 'passage-0',
  });

  for (let i = 0; i < length; i++) {
    const isLast = i === length - 1;
    const passage = new Passage({
      id: `passage-${i}`,
      title: `Passage ${i}`,
      content: isLast
        ? 'The End.'
        : `This is passage ${i}.\n\n[[Passage ${i + 1}]]`,
      tags: [],
      position: { x: i * 200, y: 0 },
    });
    story.passages.set(passage.id, passage);
  }

  return story;
}

/**
 * Create a branching story
 */
export function createBranchingStory(): Story {
  const story = new Story({
    metadata: {
      title: 'Branching Story',
      author: '',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      ifid: 'branching-story-ifid',
    },
    startPassage: 'start',
  });

  const passages = [
    new Passage({
      id: 'start',
      title: 'Start',
      content: 'Choose your path:\n\n[[Left Path]]\n[[Right Path]]',
      tags: [],
      position: { x: 0, y: 0 },
    }),
    new Passage({
      id: 'left',
      title: 'Left Path',
      content: 'You went left.\n\n[[End]]',
      tags: ['left'],
      position: { x: -200, y: 200 },
    }),
    new Passage({
      id: 'right',
      title: 'Right Path',
      content: 'You went right.\n\n[[End]]',
      tags: ['right'],
      position: { x: 200, y: 200 },
    }),
    new Passage({
      id: 'end',
      title: 'End',
      content: 'The story ends.',
      tags: [],
      position: { x: 0, y: 400 },
    }),
  ];

  passages.forEach(p => story.passages.set(p.id, p));

  return story;
}

/**
 * Create a story with loops/cycles
 */
export function createCyclicStory(): Story {
  const story = new Story({
    metadata: {
      title: 'Cyclic Story',
      author: '',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      ifid: 'cyclic-story-ifid',
    },
    startPassage: 'a',
  });

  const passages = [
    new Passage({
      id: 'a',
      title: 'A',
      content: 'Go to [[B]]',
      tags: [],
      position: { x: 0, y: 0 },
    }),
    new Passage({
      id: 'b',
      title: 'B',
      content: 'Go to [[C]]',
      tags: [],
      position: { x: 200, y: 0 },
    }),
    new Passage({
      id: 'c',
      title: 'C',
      content: 'Go back to [[A]] or continue to [[D]]',
      tags: [],
      position: { x: 400, y: 0 },
    }),
    new Passage({
      id: 'd',
      title: 'D',
      content: 'The End',
      tags: [],
      position: { x: 600, y: 0 },
    }),
  ];

  passages.forEach(p => story.passages.set(p.id, p));

  return story;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 1000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout exceeded');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Wait for a specific time
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Spy on function calls
 */
export interface Spy<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: Array<{ args: Parameters<T>; result: ReturnType<T> }>;
  callCount: number;
  reset(): void;
  restore(): void;
}

export function spy<T extends (...args: any[]) => any>(fn: T): Spy<T> {
  const calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> = [];

  const spyFn = function (...args: Parameters<T>): ReturnType<T> {
    const result = fn(...args);
    calls.push({ args, result });
    return result;
  } as Spy<T>;

  Object.defineProperty(spyFn, 'calls', {
    get() {
      return calls;
    },
  });

  Object.defineProperty(spyFn, 'callCount', {
    get() {
      return calls.length;
    },
  });

  spyFn.reset = function () {
    calls.length = 0;
  };

  spyFn.restore = function () {
    // No-op for basic spy
  };

  return spyFn;
}

/**
 * Create a mock function
 */
export interface Mock<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mockReturnValue(value: ReturnType<T>): Mock<T>;
  mockReturnValueOnce(value: ReturnType<T>): Mock<T>;
  mockImplementation(fn: T): Mock<T>;
  mockResolvedValue(value: Awaited<ReturnType<T>>): Mock<T>;
  mockRejectedValue(error: any): Mock<T>;
  calls: Array<{ args: Parameters<T>; result: ReturnType<T> }>;
  callCount: number;
  reset(): void;
}

export function mock<T extends (...args: any[]) => any>(): Mock<T> {
  const calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> = [];
  let implementation: T | undefined;
  let returnValue: ReturnType<T> | undefined;
  const returnValuesOnce: Array<ReturnType<T>> = [];

  const mockFn = function (...args: Parameters<T>): ReturnType<T> {
    let result: ReturnType<T>;

    if (returnValuesOnce.length > 0) {
      result = returnValuesOnce.shift()!;
    } else if (implementation) {
      result = implementation(...args);
    } else if (returnValue !== undefined) {
      result = returnValue;
    } else {
      result = undefined as ReturnType<T>;
    }

    calls.push({ args, result });
    return result;
  } as Mock<T>;

  mockFn.mockReturnValue = function (value: ReturnType<T>) {
    returnValue = value;
    return mockFn;
  };

  mockFn.mockReturnValueOnce = function (value: ReturnType<T>) {
    returnValuesOnce.push(value);
    return mockFn;
  };

  mockFn.mockImplementation = function (fn: T) {
    implementation = fn;
    return mockFn;
  };

  mockFn.mockResolvedValue = function (value: Awaited<ReturnType<T>>) {
    returnValue = Promise.resolve(value) as ReturnType<T>;
    return mockFn;
  };

  mockFn.mockRejectedValue = function (error: any) {
    returnValue = Promise.reject(error) as ReturnType<T>;
    return mockFn;
  };

  Object.defineProperty(mockFn, 'calls', {
    get() {
      return calls;
    },
  });

  Object.defineProperty(mockFn, 'callCount', {
    get() {
      return calls.length;
    },
  });

  mockFn.reset = function () {
    calls.length = 0;
    returnValuesOnce.length = 0;
    implementation = undefined;
    returnValue = undefined;
  };

  return mockFn;
}

/**
 * Assert that a function throws an error
 */
export function assertThrows(fn: () => void, expectedMessage?: string): void {
  let thrown = false;
  let error: Error | undefined;

  try {
    fn();
  } catch (e) {
    thrown = true;
    error = e as Error;
  }

  if (!thrown) {
    throw new Error('Expected function to throw an error');
  }

  if (expectedMessage && error && !error.message.includes(expectedMessage)) {
    throw new Error(
      `Expected error message to include "${expectedMessage}", got "${error.message}"`
    );
  }
}

/**
 * Assert that an async function throws an error
 */
export async function assertThrowsAsync(
  fn: () => Promise<void>,
  expectedMessage?: string
): Promise<void> {
  let thrown = false;
  let error: Error | undefined;

  try {
    await fn();
  } catch (e) {
    thrown = true;
    error = e as Error;
  }

  if (!thrown) {
    throw new Error('Expected function to throw an error');
  }

  if (expectedMessage && error && !error.message.includes(expectedMessage)) {
    throw new Error(
      `Expected error message to include "${expectedMessage}", got "${error.message}"`
    );
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compare two objects deeply
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => deepEqual(item, b[index]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Test runner helper
 */
export interface TestContext {
  story: Story;
  cleanup: Array<() => void>;
}

export function createTestContext(): TestContext {
  const cleanup: Array<() => void> = [];

  return {
    story: createTestStory(),
    cleanup,
  };
}

export function cleanupTestContext(context: TestContext): void {
  for (const fn of context.cleanup) {
    fn();
  }
  context.cleanup.length = 0;
}

/**
 * Performance testing helper
 */
export async function measurePerformance(
  fn: () => void | Promise<void>,
  iterations: number = 100
): Promise<{ avg: number; min: number; max: number; total: number }> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const total = times.reduce((sum, time) => sum + time, 0);
  const avg = total / iterations;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { avg, min, max, total };
}

/**
 * Snapshot testing helper
 */
export interface Snapshot {
  data: any;
  timestamp: number;
}

const snapshots = new Map<string, Snapshot>();

export function createSnapshot(name: string, data: any): void {
  snapshots.set(name, {
    data: deepClone(data),
    timestamp: Date.now(),
  });
}

export function matchSnapshot(name: string, data: any): boolean {
  const snapshot = snapshots.get(name);
  if (!snapshot) {
    throw new Error(`Snapshot "${name}" not found`);
  }
  return deepEqual(snapshot.data, data);
}

export function clearSnapshots(): void {
  snapshots.clear();
}
