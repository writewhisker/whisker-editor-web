/**
 * Test Helpers and Fixtures
 *
 * Utilities for testing Whisker stories and components.
 * Provides test setup, fixtures, and helper functions.
 */

import type { Story, Passage } from '@writewhisker/story-models';

/**
 * Create a minimal story for testing
 */
export function createTestStory(overrides?: Partial<Story>): Story {
  return {
    id: 'test-story-1',
    name: 'Test Story',
    startPassage: 'Start',
    passages: [
      createTestPassage({ title: 'Start' }),
      createTestPassage({ title: 'Middle', id: 'passage-2' }),
      createTestPassage({ title: 'End', id: 'passage-3' }),
    ],
    metadata: {},
    created: Date.now(),
    modified: Date.now(),
    ...overrides,
  };
}

/**
 * Create a test passage
 */
export function createTestPassage(overrides?: Partial<Passage>): Passage {
  return {
    id: 'passage-1',
    title: 'Test Passage',
    content: 'This is test content.\n\n[[Next Passage]]',
    tags: [],
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

/**
 * Create a story with specific structure
 */
export function createLinearStory(length: number = 5): Story {
  const passages: Passage[] = [];

  for (let i = 0; i < length; i++) {
    const isLast = i === length - 1;
    passages.push({
      id: `passage-${i}`,
      title: `Passage ${i}`,
      content: isLast
        ? 'The End.'
        : `This is passage ${i}.\n\n[[Passage ${i + 1}]]`,
      tags: [],
      position: { x: i * 200, y: 0 },
    });
  }

  return {
    id: 'linear-story',
    name: 'Linear Story',
    startPassage: 'Passage 0',
    passages,
    metadata: {},
    created: Date.now(),
    modified: Date.now(),
  };
}

/**
 * Create a branching story
 */
export function createBranchingStory(): Story {
  return {
    id: 'branching-story',
    name: 'Branching Story',
    startPassage: 'Start',
    passages: [
      {
        id: 'start',
        title: 'Start',
        content: 'Choose your path:\n\n[[Left Path]]\n[[Right Path]]',
        tags: [],
        position: { x: 0, y: 0 },
      },
      {
        id: 'left',
        title: 'Left Path',
        content: 'You went left.\n\n[[End]]',
        tags: ['left'],
        position: { x: -200, y: 200 },
      },
      {
        id: 'right',
        title: 'Right Path',
        content: 'You went right.\n\n[[End]]',
        tags: ['right'],
        position: { x: 200, y: 200 },
      },
      {
        id: 'end',
        title: 'End',
        content: 'The story ends.',
        tags: [],
        position: { x: 0, y: 400 },
      },
    ],
    metadata: {},
    created: Date.now(),
    modified: Date.now(),
  };
}

/**
 * Create a story with loops/cycles
 */
export function createCyclicStory(): Story {
  return {
    id: 'cyclic-story',
    name: 'Cyclic Story',
    startPassage: 'A',
    passages: [
      {
        id: 'a',
        title: 'A',
        content: 'Go to [[B]]',
        tags: [],
        position: { x: 0, y: 0 },
      },
      {
        id: 'b',
        title: 'B',
        content: 'Go to [[C]]',
        tags: [],
        position: { x: 200, y: 0 },
      },
      {
        id: 'c',
        title: 'C',
        content: 'Go back to [[A]] or continue to [[D]]',
        tags: [],
        position: { x: 400, y: 0 },
      },
      {
        id: 'd',
        title: 'D',
        content: 'The End',
        tags: [],
        position: { x: 600, y: 0 },
      },
    ],
    metadata: {},
    created: Date.now(),
    modified: Date.now(),
  };
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
