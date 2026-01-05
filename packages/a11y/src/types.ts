/**
 * Core types for accessibility module
 */

/**
 * Event bus interface for decoupled communication
 */
export interface EventBus {
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (data: unknown) => void): () => void;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Dependencies container for module instantiation
 */
export interface A11yDependencies {
  eventBus?: EventBus;
  logger?: Logger;
}

/**
 * Valid ARIA roles for interactive fiction
 */
export type AriaRole =
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'complementary'
  | 'contentinfo'
  | 'dialog'
  | 'document'
  | 'heading'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'main'
  | 'navigation'
  | 'option'
  | 'region'
  | 'status';

/**
 * ARIA states and properties
 */
export type AriaAttribute =
  | 'aria-busy'
  | 'aria-checked'
  | 'aria-current'
  | 'aria-disabled'
  | 'aria-expanded'
  | 'aria-hidden'
  | 'aria-invalid'
  | 'aria-pressed'
  | 'aria-selected'
  | 'aria-activedescendant'
  | 'aria-atomic'
  | 'aria-controls'
  | 'aria-describedby'
  | 'aria-details'
  | 'aria-haspopup'
  | 'aria-keyshortcuts'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-live'
  | 'aria-owns'
  | 'aria-posinset'
  | 'aria-roledescription'
  | 'aria-setsize';

/**
 * ARIA attributes record type
 */
export type AriaAttributes = Partial<Record<AriaAttribute | 'role' | 'tabindex' | 'href' | 'class', string>>;

/**
 * WCAG compliance level
 */
export type WCAGLevel = 'AA' | 'AAA';

/**
 * Text size for contrast requirements
 */
export type TextSize = 'normal' | 'large';

/**
 * Contrast validation result
 */
export interface ContrastValidationResult {
  ratio: number;
  ratioFormatted: string;
  passesAaNormal: boolean;
  passesAaLarge: boolean;
  passesAaaNormal: boolean;
  passesAaaLarge: boolean;
  foreground: string;
  background: string;
  level: WCAGLevel;
  passes: boolean;
  name?: string;
}

/**
 * Color pair for batch validation
 */
export interface ColorPair {
  foreground: string;
  background: string;
  name?: string;
}

/**
 * Passage object for ARIA
 */
export interface Passage {
  id?: string;
  title?: string;
  content?: string;
}

/**
 * Choice object for ARIA
 */
export interface Choice {
  id?: string;
  text: string;
}

/**
 * Keyboard event abstraction
 */
export interface KeyboardEventData {
  key?: string;
  keyCode?: number;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/**
 * Navigation mode
 */
export type NavigationMode = 'browse' | 'focus';

/**
 * Live region priority
 */
export type LiveRegionPriority = 'polite' | 'assertive';

/**
 * Motion preference source
 */
export type MotionPreferenceSource = 'system' | 'user';

/**
 * Motion preference serialized data
 */
export interface MotionPreferenceData {
  userOverride: boolean | null;
  systemPreference: boolean;
}

/**
 * Accessibility metadata for export
 */
export interface AccessibilityMetadata {
  wcagLevel: WCAGLevel;
  wcagVersion: string;
  testedWith: string[];
  features: string[];
}

/**
 * Description reference for aria-describedby
 */
export interface DescriptionReference {
  id: string;
  html: string;
}

/**
 * Focusable element interface
 */
export interface FocusableElement {
  focus(options?: { preventScroll?: boolean }): void;
  blur(): void;
}
