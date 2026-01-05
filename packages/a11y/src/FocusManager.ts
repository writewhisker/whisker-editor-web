/**
 * Focus Manager
 * Manages keyboard focus for accessibility
 */

import type { A11yDependencies, FocusableElement } from './types';

/**
 * Focusable element selectors (for DOM environments)
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
];

/**
 * Focus options
 */
export interface FocusOptions {
  preventScroll?: boolean;
}

/**
 * FocusManager class
 * Provides focus management for accessible UI
 */
export class FocusManager {
  private events?: A11yDependencies['eventBus'];
  private log?: A11yDependencies['logger'];
  private savedFocus: Map<string, FocusableElement | null> = new Map();
  private focusTrapContainer: HTMLElement | null = null;
  private focusedElement: FocusableElement | null = null;

  constructor(deps?: A11yDependencies) {
    this.events = deps?.eventBus;
    this.log = deps?.logger;
  }

  /**
   * Factory method for DI container
   */
  static create(deps?: A11yDependencies): FocusManager {
    return new FocusManager(deps);
  }

  /**
   * Set focus to an element
   */
  focus(element: FocusableElement | null, options?: FocusOptions): boolean {
    if (!element) {
      return false;
    }

    try {
      if (options?.preventScroll) {
        element.focus({ preventScroll: true });
      } else {
        element.focus();
      }
      this.focusedElement = element;

      this.events?.emit('a11y.focus_change', { element });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the currently focused element
   */
  getFocusedElement(): FocusableElement | null {
    return this.focusedElement;
  }

  /**
   * Save the current focus for later restoration
   */
  saveFocus(key: string = 'default'): void {
    this.savedFocus.set(key, this.focusedElement);

    this.log?.debug(`Focus saved with key: ${key}`);
  }

  /**
   * Restore focus to a previously saved element
   */
  restoreFocus(key: string = 'default'): boolean {
    const element = this.savedFocus.get(key);
    if (element) {
      this.savedFocus.delete(key);
      return this.focus(element);
    }

    return false;
  }

  /**
   * Enable focus trapping within a container
   */
  trapFocus(container: HTMLElement): void {
    if (!container) {
      return;
    }

    this.focusTrapContainer = container;

    // Focus the first focusable element
    this.focusFirst(container);

    this.events?.emit('a11y.focus_trap_enabled', { container });

    this.log?.debug('Focus trap enabled');
  }

  /**
   * Release focus trap
   */
  releaseFocusTrap(): void {
    this.focusTrapContainer = null;

    this.events?.emit('a11y.focus_trap_released', {});

    this.log?.debug('Focus trap released');
  }

  /**
   * Check if focus is currently trapped
   */
  isFocusTrapped(): boolean {
    return this.focusTrapContainer !== null;
  }

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    if (!container) {
      return [];
    }

    const selector = FOCUSABLE_SELECTORS.join(', ');
    const elements = container.querySelectorAll<HTMLElement>(selector);
    return Array.from(elements);
  }

  /**
   * Move focus to the first focusable element in a container
   */
  focusFirst(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      return this.focus(focusable[0]);
    }
    return false;
  }

  /**
   * Move focus to the last focusable element in a container
   */
  focusLast(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      return this.focus(focusable[focusable.length - 1]);
    }
    return false;
  }

  /**
   * Move focus to the next focusable element
   */
  focusNext(): boolean {
    const container = this.focusTrapContainer;
    if (!container) {
      return false;
    }

    const focusable = this.getFocusableElements(container);
    const currentIndex = this.findIndex(focusable, this.focusedElement);

    if (currentIndex !== -1) {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= focusable.length) {
        nextIndex = 0; // Wrap to first element
      }
      return this.focus(focusable[nextIndex]);
    }

    return this.focusFirst(container);
  }

  /**
   * Move focus to the previous focusable element
   */
  focusPrevious(): boolean {
    const container = this.focusTrapContainer;
    if (!container) {
      return false;
    }

    const focusable = this.getFocusableElements(container);
    const currentIndex = this.findIndex(focusable, this.focusedElement);

    if (currentIndex !== -1) {
      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = focusable.length - 1; // Wrap to last element
      }
      return this.focus(focusable[prevIndex]);
    }

    return this.focusLast(container);
  }

  /**
   * Find index of element in array
   */
  private findIndex(arr: HTMLElement[], element: FocusableElement | null): number {
    if (!element) return -1;
    return arr.findIndex((el) => el === element);
  }

  /**
   * Handle Tab key for focus management
   */
  handleTab(shiftKey: boolean): boolean {
    if (!this.isFocusTrapped()) {
      return false;
    }

    if (shiftKey) {
      return this.focusPrevious();
    } else {
      return this.focusNext();
    }
  }

  /**
   * Get the focusable selector string
   */
  getFocusableSelector(): string {
    return FOCUSABLE_SELECTORS.join(', ');
  }

  /**
   * Get the current focus trap container
   */
  getFocusTrapContainer(): HTMLElement | null {
    return this.focusTrapContainer;
  }
}
