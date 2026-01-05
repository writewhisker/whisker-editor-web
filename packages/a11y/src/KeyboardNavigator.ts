/**
 * Keyboard Navigator
 * Handles keyboard navigation for accessible UI
 */

import type {
  A11yDependencies,
  KeyboardEventData,
  NavigationMode,
  FocusableElement,
} from './types';
import type { FocusManager } from './FocusManager';

/**
 * Key codes
 */
const KEY_CODES: Record<string, number> = {
  TAB: 9,
  ENTER: 13,
  ESCAPE: 27,
  SPACE: 32,
  END: 35,
  HOME: 36,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
};

/**
 * Key code to name mapping
 */
const KEY_NAMES: Record<number, string> = {
  9: 'Tab',
  13: 'Enter',
  27: 'Escape',
  32: 'Space',
  35: 'End',
  36: 'Home',
  37: 'ArrowLeft',
  38: 'ArrowUp',
  39: 'ArrowRight',
  40: 'ArrowDown',
};

/**
 * Keyboard event handler function
 */
export type KeyboardHandler = (event: KeyboardEventData) => boolean;

/**
 * KeyboardNavigator dependencies
 */
export interface KeyboardNavigatorDependencies extends A11yDependencies {
  focusManager?: FocusManager;
}

/**
 * KeyboardNavigator class
 * Provides keyboard navigation support for accessible UI
 */
export class KeyboardNavigator {
  private events?: A11yDependencies['eventBus'];
  private log?: A11yDependencies['logger'];
  private focusManager?: FocusManager;

  private enabled: boolean = true;
  private mode: NavigationMode = 'browse';
  private handlers: Map<string, KeyboardHandler[]> = new Map();

  private currentChoiceIndex: number = 0;
  private choiceList: FocusableElement[] = [];

  constructor(deps?: KeyboardNavigatorDependencies) {
    this.events = deps?.eventBus;
    this.log = deps?.logger;
    this.focusManager = deps?.focusManager;

    this.registerDefaultHandlers();
  }

  /**
   * Factory method for DI container
   */
  static create(deps?: KeyboardNavigatorDependencies): KeyboardNavigator {
    return new KeyboardNavigator(deps);
  }

  /**
   * Register default keyboard handlers
   */
  private registerDefaultHandlers(): void {
    // Tab navigation
    this.registerHandler('Tab', (event) => {
      if (this.focusManager) {
        return this.focusManager.handleTab(event.shift || false);
      }
      return false;
    });

    // Escape to close dialogs/modals
    this.registerHandler('Escape', () => {
      this.events?.emit('a11y.escape_pressed', {});
      return true;
    });

    // Enter/Space to activate
    this.registerHandler('Enter', () => {
      this.events?.emit('a11y.activate', {});
      return true;
    });

    this.registerHandler('Space', () => {
      this.events?.emit('a11y.activate', {});
      return true;
    });

    // Arrow key navigation for choices
    this.registerHandler('ArrowDown', () => this.navigateChoice(1));
    this.registerHandler('ArrowUp', () => this.navigateChoice(-1));
    this.registerHandler('ArrowRight', () => this.navigateChoice(1));
    this.registerHandler('ArrowLeft', () => this.navigateChoice(-1));

    // Home/End for first/last choice
    this.registerHandler('Home', () => this.navigateToChoice(1));
    this.registerHandler('End', () => this.navigateToChoice(this.choiceList.length));
  }

  /**
   * Register a keyboard handler
   */
  registerHandler(key: string, handler: KeyboardHandler): void {
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    this.handlers.get(key)!.push(handler);
  }

  /**
   * Unregister all handlers for a key
   */
  unregisterHandler(key: string): void {
    this.handlers.delete(key);
  }

  /**
   * Handle a keyboard event
   */
  handleKeyEvent(event: KeyboardEventData): boolean {
    if (!this.enabled) {
      return false;
    }

    // Normalize key name
    let key = event.key;
    if (!key && event.keyCode) {
      key = KEY_NAMES[event.keyCode];
    }

    if (!key) {
      return false;
    }

    // Get handlers for this key
    const handlers = this.handlers.get(key);
    if (!handlers) {
      return false;
    }

    // Execute handlers in order until one returns true
    for (const handler of handlers) {
      if (handler(event)) {
        this.log?.debug(`Keyboard event handled: ${key}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get the list of handled keys
   */
  getHandledKeys(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if keyboard navigation is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable keyboard navigation
   */
  enable(): void {
    this.enabled = true;
    this.events?.emit('a11y.keyboard_enabled', {});
  }

  /**
   * Disable keyboard navigation
   */
  disable(): void {
    this.enabled = false;
    this.events?.emit('a11y.keyboard_disabled', {});
  }

  /**
   * Get current navigation mode
   */
  getMode(): NavigationMode {
    return this.mode;
  }

  /**
   * Set navigation mode
   */
  setMode(mode: NavigationMode): void {
    if (mode !== 'browse' && mode !== 'focus') {
      return;
    }

    this.mode = mode;

    this.events?.emit('a11y.mode_changed', { mode });
  }

  /**
   * Set the choice list for arrow key navigation
   */
  setChoices(choices: FocusableElement[]): void {
    this.choiceList = choices || [];
    this.currentChoiceIndex = 0;

    // Focus first choice if available
    if (this.choiceList.length > 0) {
      this.navigateToChoice(1);
    }
  }

  /**
   * Navigate to a specific choice by delta
   */
  private navigateChoice(delta: number): boolean {
    if (this.choiceList.length === 0) {
      return false;
    }

    let newIndex = this.currentChoiceIndex + delta;

    // Wrap around
    if (newIndex < 1) {
      newIndex = this.choiceList.length;
    } else if (newIndex > this.choiceList.length) {
      newIndex = 1;
    }

    return this.navigateToChoice(newIndex);
  }

  /**
   * Navigate to a specific choice index (1-based)
   */
  private navigateToChoice(index: number): boolean {
    if (index < 1 || index > this.choiceList.length) {
      return false;
    }

    this.currentChoiceIndex = index;
    const choice = this.choiceList[index - 1]; // Convert to 0-based

    // Focus the choice element
    if (this.focusManager && choice) {
      this.focusManager.focus(choice);
    }

    // Emit navigation event
    this.events?.emit('a11y.choice_focused', {
      index,
      choice,
      total: this.choiceList.length,
    });

    return true;
  }

  /**
   * Get the current choice index (1-based)
   */
  getCurrentChoiceIndex(): number {
    return this.currentChoiceIndex;
  }

  /**
   * Create keyboard event from DOM event or raw data
   */
  static createEvent(raw: {
    key?: string;
    keyCode?: number;
    shiftKey?: boolean;
    shift?: boolean;
    ctrlKey?: boolean;
    ctrl?: boolean;
    altKey?: boolean;
    alt?: boolean;
    metaKey?: boolean;
    meta?: boolean;
  }): KeyboardEventData {
    return {
      key: raw.key,
      keyCode: raw.keyCode,
      shift: raw.shiftKey ?? raw.shift ?? false,
      ctrl: raw.ctrlKey ?? raw.ctrl ?? false,
      alt: raw.altKey ?? raw.alt ?? false,
      meta: raw.metaKey ?? raw.meta ?? false,
    };
  }

  /**
   * Get key code for a key name
   */
  static getKeyCode(name: string): number | undefined {
    for (const [code, keyName] of Object.entries(KEY_NAMES)) {
      if (keyName === name) {
        return parseInt(code, 10);
      }
    }
    return undefined;
  }

  /**
   * Get key name for a key code
   */
  static getKeyName(code: number): string | undefined {
    return KEY_NAMES[code];
  }

  /**
   * Get all key codes
   */
  static getKeyCodes(): Record<string, number> {
    return { ...KEY_CODES };
  }
}
