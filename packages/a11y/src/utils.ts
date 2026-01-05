/**
 * Accessibility Utilities
 * Utility functions for accessibility features
 */

import type {
  AccessibilityMetadata,
  DescriptionReference,
  LiveRegionPriority,
} from './types';

let idCounter = 0;

/**
 * Generate a unique ID for accessibility elements
 */
export function generateId(prefix: string = 'a11y'): string {
  idCounter++;
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${random}-${idCounter}`;
}

/**
 * Escape HTML entities for safe output
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) {
    return '';
  }

  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return str.replace(/[&<>"']/g, (char) => replacements[char] || char);
}

/**
 * Strip HTML tags from a string
 */
export function stripHtml(str: string | null | undefined): string {
  if (!str) {
    return '';
  }

  // Remove HTML tags
  let result = str.replace(/<[^>]+>/g, '');

  // Decode common entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };

  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }

  return result;
}

/**
 * Create screen reader only CSS class content
 */
export function getSrOnlyCss(): string {
  return `.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}`;
}

/**
 * Create focus visible CSS
 */
export function getFocusVisibleCss(): string {
  return `*:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}`;
}

/**
 * Create skip link CSS
 */
export function getSkipLinkCss(): string {
  return `.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}`;
}

/**
 * Check if a string is likely to be decorative (not meaningful for SR)
 */
export function isDecorativeText(text: string | null | undefined): boolean {
  if (!text || text === '') {
    return true;
  }

  // Check for common decorative patterns
  const decorativePatterns = [
    /^[-=*_.]+$/, // Separators
    /^\s*$/, // Whitespace only
    /^[\d\s]+$/, // Numbers only
    /^[^\w]+$/, // No alphanumeric chars
  ];

  for (const pattern of decorativePatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Normalize whitespace in text
 */
export function normalizeWhitespace(text: string | null | undefined): string {
  if (!text) {
    return '';
  }

  // Collapse multiple spaces/newlines to single space
  let result = text.replace(/\s+/g, ' ');

  // Trim leading/trailing whitespace
  result = result.trim();

  return result;
}

/**
 * Truncate text for announcements (avoid overly long SR output)
 */
export function truncateForAnnouncement(
  text: string | null | undefined,
  maxLength: number = 200
): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  // Find a good break point
  let truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    truncated = text.substring(0, lastSpace);
  }

  return truncated + '...';
}

/**
 * Create an aria-describedby ID reference from a message
 */
export function createDescription(
  prefix: string,
  message: string
): DescriptionReference {
  const id = generateId(`${prefix}-desc`);
  const html = `<span id="${id}" class="sr-only">${escapeHtml(message)}</span>`;

  return {
    id,
    html,
  };
}

/**
 * Get accessibility metadata for export
 */
export function getAccessibilityMetadata(): AccessibilityMetadata {
  return {
    wcagLevel: 'AA',
    wcagVersion: '2.1',
    testedWith: ['NVDA', 'JAWS', 'VoiceOver'],
    features: [
      'keyboard_navigation',
      'screen_reader_support',
      'focus_management',
      'aria_live_regions',
      'high_contrast_mode',
      'reduced_motion',
    ],
  };
}

/**
 * Check if a link text is descriptive enough
 */
export function isDescriptiveLinkText(text: string | null | undefined): boolean {
  if (!text || text.length < 3) {
    return false;
  }

  const nonDescriptive = [
    'click',
    'click here',
    'here',
    'link',
    'read more',
    'learn more',
    'more',
    'this',
  ];

  const lowerText = text.toLowerCase().trim();

  for (const phrase of nonDescriptive) {
    if (lowerText === phrase) {
      return false;
    }
  }

  return true;
}

/**
 * Create HTML for a live region container
 */
export function createLiveRegionHtml(
  id: string,
  priority: LiveRegionPriority = 'polite'
): string {
  return `<div id="${id}" class="sr-only" aria-live="${priority}" aria-atomic="true"></div>`;
}

/**
 * Get all CSS needed for accessibility
 */
export function getAllA11yCss(): string {
  return [getSrOnlyCss(), getFocusVisibleCss(), getSkipLinkCss()].join('\n\n');
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  // Check for aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  // Check for display: none or visibility: hidden
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  // Check parent elements
  let parent = element.parentElement;
  while (parent) {
    if (parent.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
      return false;
    }
    parent = parent.parentElement;
  }

  return true;
}

/**
 * Get accessible name for an element
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }

  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElements = labelledBy
      .split(' ')
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (labelElements.length > 0) {
      return labelElements.map((el) => el!.textContent).join(' ');
    }
  }

  // Check for label association (for form elements)
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent || '';
    }
  }

  // Fall back to text content
  return element.textContent || '';
}

/**
 * Create an accessible description element
 */
export function createHiddenDescription(
  id: string,
  text: string
): HTMLSpanElement {
  const span = document.createElement('span');
  span.id = id;
  span.className = 'sr-only';
  span.textContent = text;
  return span;
}
