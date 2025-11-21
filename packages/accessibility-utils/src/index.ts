/**
 * Accessibility Utils
 *
 * Framework-agnostic accessibility toolkit.
 * ARIA helpers, keyboard navigation, screen reader utilities.
 */

/**
 * Trap focus within an element (for modals, dialogs)
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableElements = Array.from(element.querySelectorAll(focusableSelector)) as HTMLElement[];

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = document.getElementById('a11y-announcer') || createAnnouncer();
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

function createAnnouncer(): HTMLElement {
  const announcer = document.createElement('div');
  announcer.id = 'a11y-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.style.position = 'absolute';
  announcer.style.left = '-10000px';
  announcer.style.width = '1px';
  announcer.style.height = '1px';
  announcer.style.overflow = 'hidden';
  document.body.appendChild(announcer);
  return announcer;
}

/**
 * Check if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('tabindex') === '-1') return false;

  const focusableElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  return focusableElements.includes(element.tagName) || element.hasAttribute('tabindex');
}

/**
 * Get next/previous focusable element
 */
export function getNextFocusable(current: HTMLElement, reverse: boolean = false): HTMLElement | null {
  const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const focusableElements = Array.from(document.querySelectorAll(focusableSelector)) as HTMLElement[];

  const currentIndex = focusableElements.indexOf(current);
  if (currentIndex === -1) return null;

  const nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;
  return focusableElements[nextIndex] || null;
}

/**
 * Keyboard navigation helper
 */
export class KeyboardNav {
  private element: HTMLElement;
  private handlers: Map<string, (e: KeyboardEvent) => void>;

  constructor(element: HTMLElement) {
    this.element = element;
    this.handlers = new Map();
    this.element.addEventListener('keydown', this.handleKeyDown);
  }

  on(key: string, handler: (e: KeyboardEvent) => void): this {
    this.handlers.set(key.toLowerCase(), handler);
    return this;
  }

  off(key: string): this {
    this.handlers.delete(key.toLowerCase());
    return this;
  }

  destroy(): void {
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.handlers.clear();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const handler = this.handlers.get(e.key.toLowerCase());
    if (handler) {
      handler(e);
    }
  };
}

/**
 * Skip link helper
 */
export function createSkipLink(targetId: string, text: string = 'Skip to main content'): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = text;
  link.className = 'skip-link';
  link.style.position = 'absolute';
  link.style.top = '-40px';
  link.style.left = '0';
  link.style.padding = '8px';
  link.style.zIndex = '100';

  link.addEventListener('focus', () => {
    link.style.top = '0';
  });

  link.addEventListener('blur', () => {
    link.style.top = '-40px';
  });

  return link;
}

/**
 * ARIA label helpers
 */
export function setAriaLabel(element: HTMLElement, label: string): void {
  element.setAttribute('aria-label', label);
}

export function setAriaDescribedBy(element: HTMLElement, descriptionId: string): void {
  element.setAttribute('aria-describedby', descriptionId);
}

export function setAriaExpanded(element: HTMLElement, expanded: boolean): void {
  element.setAttribute('aria-expanded', String(expanded));
}

export function setAriaHidden(element: HTMLElement, hidden: boolean): void {
  element.setAttribute('aria-hidden', String(hidden));
}

/**
 * Check if prefers-reduced-motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if prefers-contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}
