/**
 * ARIA Manager
 * Manages ARIA attributes for accessible UI components
 */

import type {
  A11yDependencies,
  AriaAttributes,
  AriaAttribute,
  AriaRole,
  Passage,
  Choice,
  LiveRegionPriority,
} from './types';

/**
 * Valid ARIA roles for interactive fiction
 */
const VALID_ROLES: AriaRole[] = [
  'application',
  'article',
  'banner',
  'button',
  'complementary',
  'contentinfo',
  'dialog',
  'document',
  'heading',
  'list',
  'listbox',
  'listitem',
  'main',
  'navigation',
  'option',
  'region',
  'status',
];

/**
 * ARIA states and properties
 */
const ARIA_ATTRIBUTES: AriaAttribute[] = [
  // States
  'aria-busy',
  'aria-checked',
  'aria-current',
  'aria-disabled',
  'aria-expanded',
  'aria-hidden',
  'aria-invalid',
  'aria-pressed',
  'aria-selected',
  // Properties
  'aria-activedescendant',
  'aria-atomic',
  'aria-controls',
  'aria-describedby',
  'aria-details',
  'aria-haspopup',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-live',
  'aria-owns',
  'aria-posinset',
  'aria-roledescription',
  'aria-setsize',
];

/**
 * AriaManager class
 * Provides ARIA attribute generation for accessible UI components
 */
export class AriaManager {
  private events?: A11yDependencies['eventBus'];
  private log?: A11yDependencies['logger'];

  constructor(deps?: A11yDependencies) {
    this.events = deps?.eventBus;
    this.log = deps?.logger;
  }

  /**
   * Factory method for DI container
   */
  static create(deps?: A11yDependencies): AriaManager {
    return new AriaManager(deps);
  }

  /**
   * Get ARIA attributes for a story passage
   */
  getPassageAria(passage: Passage, isCurrent: boolean = false): AriaAttributes {
    const attrs: AriaAttributes = {
      role: 'article',
      'aria-label': passage.title || `Passage ${passage.id || ''}`,
    };

    if (isCurrent) {
      attrs['aria-current'] = 'page';
    }

    return attrs;
  }

  /**
   * Get ARIA attributes for a choice list
   */
  getChoiceListAria(choices: Choice[]): AriaAttributes {
    const count = choices?.length || 0;

    return {
      role: 'listbox',
      'aria-label': count === 1 ? '1 choice available' : `${count} choices available`,
    };
  }

  /**
   * Get ARIA attributes for a choice item
   */
  getChoiceAria(
    choice: Choice,
    index: number,
    total: number,
    isSelected: boolean = false
  ): AriaAttributes {
    return {
      role: 'option',
      'aria-label': choice.text,
      'aria-posinset': String(index),
      'aria-setsize': String(total),
      'aria-selected': isSelected ? 'true' : 'false',
      tabindex: isSelected ? '0' : '-1',
    };
  }

  /**
   * Get ARIA attributes for a dialog
   */
  getDialogAria(title: string, description?: string): AriaAttributes {
    const attrs: AriaAttributes = {
      role: 'dialog',
      'aria-label': title,
    };

    // aria-modal is not in our type but commonly used
    (attrs as Record<string, string>)['aria-modal'] = 'true';

    if (description) {
      attrs['aria-describedby'] = description;
    }

    return attrs;
  }

  /**
   * Get ARIA attributes for a navigation region
   */
  getNavigationAria(label: string): AriaAttributes {
    return {
      role: 'navigation',
      'aria-label': label,
    };
  }

  /**
   * Get ARIA attributes for a button
   */
  getButtonAria(
    label: string,
    isPressed?: boolean,
    isDisabled?: boolean
  ): AriaAttributes {
    const attrs: AriaAttributes = {
      role: 'button',
      'aria-label': label,
    };

    if (isPressed !== undefined) {
      attrs['aria-pressed'] = isPressed ? 'true' : 'false';
    }

    if (isDisabled) {
      attrs['aria-disabled'] = 'true';
    }

    return attrs;
  }

  /**
   * Get ARIA attributes for a live region
   */
  getLiveRegionAria(
    priority: LiveRegionPriority = 'polite',
    isAtomic: boolean = false
  ): AriaAttributes {
    return {
      'aria-live': priority,
      'aria-atomic': isAtomic ? 'true' : 'false',
    };
  }

  /**
   * Get ARIA attributes for loading state
   */
  getLoadingAria(isLoading: boolean): AriaAttributes {
    return {
      'aria-busy': isLoading ? 'true' : 'false',
    };
  }

  /**
   * Get ARIA attributes for a heading
   */
  getHeadingAria(level: number): AriaAttributes {
    const attrs: AriaAttributes = {
      role: 'heading',
    };
    (attrs as Record<string, string>)['aria-level'] = String(level);
    return attrs;
  }

  /**
   * Get skip link attributes
   */
  getSkipLinkAria(targetId: string): AriaAttributes {
    return {
      href: `#${targetId}`,
      'aria-label': 'Skip to main content',
      class: 'skip-link',
    };
  }

  /**
   * Get ARIA attributes for main content region
   */
  getMainAria(label?: string): AriaAttributes {
    const attrs: AriaAttributes = {
      role: 'main',
    };

    if (label) {
      attrs['aria-label'] = label;
    }

    return attrs;
  }

  /**
   * Validate ARIA role
   */
  isValidRole(role: string): role is AriaRole {
    return VALID_ROLES.includes(role as AriaRole);
  }

  /**
   * Validate ARIA attribute name
   */
  isValidAriaAttribute(attr: string): attr is AriaAttribute {
    return ARIA_ATTRIBUTES.includes(attr as AriaAttribute);
  }

  /**
   * Format ARIA attributes as HTML attribute string
   */
  toHtmlAttrs(attrs: AriaAttributes): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined && value !== '') {
        parts.push(`${key}="${value}"`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Merge ARIA attributes, with second taking precedence
   */
  mergeAria(base: AriaAttributes, override?: AriaAttributes): AriaAttributes {
    return { ...base, ...override };
  }
}
