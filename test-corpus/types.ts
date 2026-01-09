/**
 * Cross-Platform Test Corpus Types
 */

export interface TestCase {
  name: string;
  description?: string;
  tags?: string[];
  wls: string;
  assertions: Assertion[];
  platforms?: {
    lua?: PlatformConfig;
    typescript?: PlatformConfig;
  };
}

export interface PlatformConfig {
  skip?: boolean;
  reason?: string;
}

export type Assertion =
  | VariableAssertion
  | OutputAssertion
  | ErrorAssertion
  | PassageAssertion
  | ThreadAssertion
  | TimerAssertion
  | ListAssertion;

export interface VariableAssertion {
  variable: string;
  equals?: unknown;
  type?: string;
  contains?: string;
  greaterThan?: number;
  lessThan?: number;
}

export interface OutputAssertion {
  output: {
    contains?: string;
    equals?: string;
    matches?: string;
  };
}

export interface ErrorAssertion {
  error: {
    code?: string;
    message?: string;
    contains?: string;
  };
}

export interface PassageAssertion {
  passage: string;
  exists?: boolean;
  hasChoices?: number;
  content?: {
    contains?: string;
  };
}

export interface ThreadAssertion {
  threads: {
    count?: number;
    states?: Record<string, string>;
  };
}

export interface TimerAssertion {
  timers: {
    count?: number;
    active?: number;
  };
}

export interface ListAssertion {
  list: string;
  value?: string | string[];
  contains?: string;
  isEmpty?: boolean;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  assertions: AssertionResult[];
  error?: string;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  message?: string;
}

export interface TestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}
