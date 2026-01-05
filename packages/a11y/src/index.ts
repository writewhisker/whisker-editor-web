/**
 * Whisker Accessibility Module
 * WCAG 2.1 compliant accessibility features for interactive fiction
 *
 * @packageDocumentation
 */

// Core components - import for use in createA11ySystem
import { AriaManager } from './AriaManager';
import { ContrastChecker } from './ContrastChecker';
import { FocusManager } from './FocusManager';
import { KeyboardNavigator } from './KeyboardNavigator';
import { MotionPreference } from './MotionPreference';
import { ScreenReaderAdapter } from './ScreenReaderAdapter';

// Re-export core components
export { AriaManager } from './AriaManager';
export { ContrastChecker } from './ContrastChecker';
export { FocusManager } from './FocusManager';
export type { FocusOptions } from './FocusManager';
export { KeyboardNavigator } from './KeyboardNavigator';
export type { KeyboardHandler, KeyboardNavigatorDependencies } from './KeyboardNavigator';
export { MotionPreference } from './MotionPreference';
export { ScreenReaderAdapter } from './ScreenReaderAdapter';

// Utilities
export * as utils from './utils';
export {
  generateId,
  escapeHtml,
  stripHtml,
  getSrOnlyCss,
  getFocusVisibleCss,
  getSkipLinkCss,
  isDecorativeText,
  normalizeWhitespace,
  truncateForAnnouncement,
  createDescription,
  getAccessibilityMetadata,
  isDescriptiveLinkText,
  createLiveRegionHtml,
  getAllA11yCss,
  isVisibleToScreenReader,
  getAccessibleName,
  createHiddenDescription,
} from './utils';

// Types
export type {
  EventBus,
  Logger,
  A11yDependencies,
  AriaRole,
  AriaAttribute,
  AriaAttributes,
  WCAGLevel,
  TextSize,
  ContrastValidationResult,
  ColorPair,
  Passage,
  Choice,
  KeyboardEventData,
  NavigationMode,
  LiveRegionPriority,
  MotionPreferenceSource,
  MotionPreferenceData,
  AccessibilityMetadata,
  DescriptionReference,
  FocusableElement,
} from './types';

/**
 * Create a fully configured accessibility system
 */
export function createA11ySystem(deps?: {
  eventBus?: import('./types').EventBus;
  logger?: import('./types').Logger;
}): {
  ariaManager: AriaManager;
  contrastChecker: ContrastChecker;
  focusManager: FocusManager;
  keyboardNavigator: KeyboardNavigator;
  motionPreference: MotionPreference;
  screenReaderAdapter: ScreenReaderAdapter;
} {
  const focusManager = FocusManager.create(deps);

  return {
    ariaManager: AriaManager.create(deps),
    contrastChecker: ContrastChecker.create(),
    focusManager,
    keyboardNavigator: KeyboardNavigator.create({ ...deps, focusManager }),
    motionPreference: MotionPreference.create(deps),
    screenReaderAdapter: ScreenReaderAdapter.create(deps),
  };
}
