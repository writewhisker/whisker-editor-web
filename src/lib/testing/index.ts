/**
 * Testing Module - Unified exports for test scenario system
 */

// Core test scenario classes
export { TestScenario, TestStep, TestStepHelpers } from './TestScenario';
export type { TestScenarioData, TestStepData, TestStepType } from './TestScenario';

// Test runner
export { TestRunner } from './TestRunner';
export type { TestResult, TestStepResult } from './TestRunner';

// Adapter for compatibility with old system
export {
  migrateOldScenario,
  convertToOldFormat,
  loadAndMigrateScenarios,
  saveAsOldFormat,
} from './testScenarioAdapter';
