/**
 * Accessibility Utilities
 *
 * Provides utilities for WCAG 2.1 Level AA compliance:
 * - Keyboard navigation
 * - Focus management
 * - ARIA label helpers
 * - Screen reader announcements
 */

import { writable } from 'svelte/store';

/**
 * Focus trap for modals/dialogs
 * Keeps focus within a container
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableElements = element.querySelectorAll<HTMLElement>(focusableSelector);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab: Going backwards
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab: Going forwards
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  }

  element.addEventListener('keydown', handleKeyDown);

  // Focus first element on mount
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Screen reader announcements
 * Uses ARIA live region for dynamic content
 */
export const announcer = (() => {
  let liveRegion: HTMLElement | null = null;

  function ensureLiveRegion() {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }
    return liveRegion;
  }

  return {
    /**
     * Announce message to screen readers (polite)
     */
    announce(message: string) {
      const region = ensureLiveRegion();
      region.textContent = message;

      // Clear after a delay so same message can be announced again
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    },

    /**
     * Announce message to screen readers (assertive - interrupts)
     */
    announceUrgent(message: string) {
      const region = ensureLiveRegion();
      region.setAttribute('aria-live', 'assertive');
      region.textContent = message;

      setTimeout(() => {
        region.setAttribute('aria-live', 'polite');
        region.textContent = '';
      }, 1000);
    },
  };
})();

/**
 * Keyboard shortcut system
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  handler: () => void;
  global?: boolean; // If true, works even when input is focused
}

class KeyboardShortcutManager {
  private shortcuts = new Map<string, KeyboardShortcut>();
  private enabled = true;

  /**
   * Register a keyboard shortcut
   */
  register(id: string, shortcut: KeyboardShortcut) {
    this.shortcuts.set(id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string) {
    this.shortcuts.delete(id);
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.enabled) return false;

    // Skip if user is typing in an input (unless shortcut is global)
    const target = e.target as HTMLElement;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                    target.isContentEditable;

    for (const [id, shortcut] of this.shortcuts) {
      if (isInput && !shortcut.global) continue;

      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !shortcut.ctrl || (e.ctrlKey || e.metaKey);
      const shiftMatch = !shortcut.shift || e.shiftKey;
      const altMatch = !shortcut.alt || e.altKey;
      const metaMatch = !shortcut.meta || e.metaKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        e.preventDefault();
        shortcut.handler();
        return true;
      }
    }

    return false;
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): Map<string, KeyboardShortcut> {
    return new Map(this.shortcuts);
  }
}

export const keyboardShortcuts = new KeyboardShortcutManager();

// Register global keyboard listener
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    keyboardShortcuts.handleKeyDown(e);
  });
}

/**
 * Focus management store
 * Tracks last focused element for restoration
 */
export const focusManager = (() => {
  let lastFocusedElement: HTMLElement | null = null;

  return {
    /**
     * Save current focus
     */
    saveFocus() {
      lastFocusedElement = document.activeElement as HTMLElement;
    },

    /**
     * Restore previously saved focus
     */
    restoreFocus() {
      if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
      }
    },

    /**
     * Focus element by selector
     */
    focusElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      element?.focus();
    },
  };
})();

/**
 * Skip link utility for keyboard navigation
 */
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'skip-link';
  link.textContent = label;
  link.onclick = (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  return link;
}

/**
 * Generate unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * ARIA label builders
 */
export const aria = {
  /**
   * Build label for passage in list
   */
  passageLabel(title: string, isStart: boolean, isOrphan: boolean, isDead: boolean): string {
    const parts = [title];
    if (isStart) parts.push('start passage');
    if (isOrphan) parts.push('orphaned');
    if (isDead) parts.push('dead end');
    return parts.join(', ');
  },

  /**
   * Build label for validation issue
   */
  validationLabel(severity: 'error' | 'warning' | 'info', count: number): string {
    const severityText = severity === 'error' ? 'errors' : severity === 'warning' ? 'warnings' : 'information';
    return `${count} ${severityText}`;
  },

  /**
   * Build label for button with keyboard shortcut
   */
  buttonWithShortcut(label: string, shortcut: string): string {
    return `${label}, keyboard shortcut: ${shortcut}`;
  },
};

/**
 * Color contrast checker
 * Ensures WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
 */
export function checkColorContrast(foreground: string, background: string): {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
} {
  // Convert hex to RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ] : [0, 0, 0];
  };

  // Calculate relative luminance
  const getLuminance = (rgb: [number, number, number]): number => {
    const [r, g, b] = rgb.map(val => {
      const sRGB = val / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fgLuminance = getLuminance(hexToRgb(foreground));
  const bgLuminance = getLuminance(hexToRgb(background));

  const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) /
                (Math.min(fgLuminance, bgLuminance) + 0.05);

  return {
    ratio,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
  };
}

/**
 * Roving tabindex manager for complex widgets (lists, trees, etc.)
 */
export class RovingTabindex {
  private items: HTMLElement[] = [];
  private currentIndex = 0;

  constructor(private container: HTMLElement) {}

  /**
   * Initialize roving tabindex on container's children
   */
  init() {
    this.items = Array.from(
      this.container.querySelectorAll<HTMLElement>('[role="option"], [role="tab"], [role="menuitem"]')
    );

    this.items.forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1;
      item.addEventListener('keydown', (e) => this.handleKeyDown(e, index));
      item.addEventListener('focus', () => this.setCurrentIndex(index));
    });
  }

  /**
   * Handle arrow key navigation
   */
  private handleKeyDown(e: KeyboardEvent, index: number) {
    let newIndex = index;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (index + 1) % this.items.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = (index - 1 + this.items.length) % this.items.length;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = this.items.length - 1;
        break;
      default:
        return;
    }

    this.focusItem(newIndex);
  }

  /**
   * Focus item at index
   */
  private focusItem(index: number) {
    this.setCurrentIndex(index);
    this.items[index]?.focus();
  }

  /**
   * Set current active index
   */
  private setCurrentIndex(index: number) {
    this.items.forEach((item, i) => {
      item.tabIndex = i === index ? 0 : -1;
    });
    this.currentIndex = index;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.items.forEach(item => {
      item.tabIndex = -1;
    });
    this.items = [];
  }
}
