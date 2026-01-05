import { describe, it, expect, beforeEach } from 'vitest';
import { AriaManager } from '../AriaManager';

describe('AriaManager', () => {
  let manager: AriaManager;

  beforeEach(() => {
    manager = new AriaManager();
  });

  describe('constructor', () => {
    it('creates instance without dependencies', () => {
      expect(manager).toBeInstanceOf(AriaManager);
    });

    it('creates instance with dependencies', () => {
      const deps = {
        eventBus: { emit: () => {}, on: () => () => {} },
        logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      };
      const managerWithDeps = new AriaManager(deps);
      expect(managerWithDeps).toBeInstanceOf(AriaManager);
    });

    it('creates via factory method', () => {
      const created = AriaManager.create();
      expect(created).toBeInstanceOf(AriaManager);
    });
  });

  describe('getPassageAria', () => {
    it('returns correct attributes for passage', () => {
      const passage = { id: '1', title: 'Introduction', content: 'Hello' };
      const attrs = manager.getPassageAria(passage);

      expect(attrs.role).toBe('article');
      expect(attrs['aria-label']).toBe('Introduction');
    });

    it('uses passage id when title is missing', () => {
      const passage = { id: '42' };
      const attrs = manager.getPassageAria(passage);

      expect(attrs['aria-label']).toBe('Passage 42');
    });

    it('sets aria-current for current passage', () => {
      const passage = { id: '1', title: 'Test' };
      const attrs = manager.getPassageAria(passage, true);

      expect(attrs['aria-current']).toBe('page');
    });

    it('does not set aria-current for non-current passage', () => {
      const passage = { id: '1', title: 'Test' };
      const attrs = manager.getPassageAria(passage, false);

      expect(attrs['aria-current']).toBeUndefined();
    });
  });

  describe('getChoiceListAria', () => {
    it('returns correct attributes for choice list', () => {
      const choices = [{ text: 'A' }, { text: 'B' }, { text: 'C' }];
      const attrs = manager.getChoiceListAria(choices);

      expect(attrs.role).toBe('listbox');
      expect(attrs['aria-label']).toBe('3 choices available');
    });

    it('handles singular choice', () => {
      const choices = [{ text: 'Only option' }];
      const attrs = manager.getChoiceListAria(choices);

      expect(attrs['aria-label']).toBe('1 choice available');
    });

    it('handles empty choices', () => {
      const attrs = manager.getChoiceListAria([]);

      expect(attrs['aria-label']).toBe('0 choices available');
    });
  });

  describe('getChoiceAria', () => {
    it('returns correct attributes for choice item', () => {
      const choice = { text: 'Go north' };
      const attrs = manager.getChoiceAria(choice, 2, 4, true);

      expect(attrs.role).toBe('option');
      expect(attrs['aria-label']).toBe('Go north');
      expect(attrs['aria-posinset']).toBe('2');
      expect(attrs['aria-setsize']).toBe('4');
      expect(attrs['aria-selected']).toBe('true');
      expect(attrs.tabindex).toBe('0');
    });

    it('sets tabindex -1 for non-selected choice', () => {
      const choice = { text: 'Go south' };
      const attrs = manager.getChoiceAria(choice, 1, 2, false);

      expect(attrs['aria-selected']).toBe('false');
      expect(attrs.tabindex).toBe('-1');
    });
  });

  describe('getDialogAria', () => {
    it('returns correct attributes for dialog', () => {
      const attrs = manager.getDialogAria('Confirm Exit');

      expect(attrs.role).toBe('dialog');
      expect(attrs['aria-label']).toBe('Confirm Exit');
      expect((attrs as Record<string, string>)['aria-modal']).toBe('true');
    });

    it('includes description when provided', () => {
      const attrs = manager.getDialogAria('Save', 'save-desc');

      expect(attrs['aria-describedby']).toBe('save-desc');
    });
  });

  describe('getNavigationAria', () => {
    it('returns correct attributes for navigation', () => {
      const attrs = manager.getNavigationAria('Main menu');

      expect(attrs.role).toBe('navigation');
      expect(attrs['aria-label']).toBe('Main menu');
    });
  });

  describe('getButtonAria', () => {
    it('returns correct attributes for button', () => {
      const attrs = manager.getButtonAria('Submit');

      expect(attrs.role).toBe('button');
      expect(attrs['aria-label']).toBe('Submit');
    });

    it('includes pressed state for toggle button', () => {
      const attrs = manager.getButtonAria('Toggle', true);

      expect(attrs['aria-pressed']).toBe('true');
    });

    it('includes disabled state', () => {
      const attrs = manager.getButtonAria('Disabled', undefined, true);

      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('getLiveRegionAria', () => {
    it('returns polite by default', () => {
      const attrs = manager.getLiveRegionAria();

      expect(attrs['aria-live']).toBe('polite');
      expect(attrs['aria-atomic']).toBe('false');
    });

    it('returns assertive when specified', () => {
      const attrs = manager.getLiveRegionAria('assertive', true);

      expect(attrs['aria-live']).toBe('assertive');
      expect(attrs['aria-atomic']).toBe('true');
    });
  });

  describe('getLoadingAria', () => {
    it('returns busy when loading', () => {
      const attrs = manager.getLoadingAria(true);
      expect(attrs['aria-busy']).toBe('true');
    });

    it('returns not busy when not loading', () => {
      const attrs = manager.getLoadingAria(false);
      expect(attrs['aria-busy']).toBe('false');
    });
  });

  describe('getHeadingAria', () => {
    it('returns correct heading attributes', () => {
      const attrs = manager.getHeadingAria(2);

      expect(attrs.role).toBe('heading');
      expect((attrs as Record<string, string>)['aria-level']).toBe('2');
    });
  });

  describe('getSkipLinkAria', () => {
    it('returns correct skip link attributes', () => {
      const attrs = manager.getSkipLinkAria('main-content');

      expect(attrs.href).toBe('#main-content');
      expect(attrs['aria-label']).toBe('Skip to main content');
      expect(attrs.class).toBe('skip-link');
    });
  });

  describe('getMainAria', () => {
    it('returns main role', () => {
      const attrs = manager.getMainAria();
      expect(attrs.role).toBe('main');
    });

    it('includes label when provided', () => {
      const attrs = manager.getMainAria('Story content');
      expect(attrs['aria-label']).toBe('Story content');
    });
  });

  describe('isValidRole', () => {
    it('returns true for valid roles', () => {
      expect(manager.isValidRole('button')).toBe(true);
      expect(manager.isValidRole('dialog')).toBe(true);
      expect(manager.isValidRole('navigation')).toBe(true);
    });

    it('returns false for invalid roles', () => {
      expect(manager.isValidRole('invalid')).toBe(false);
      expect(manager.isValidRole('')).toBe(false);
    });
  });

  describe('isValidAriaAttribute', () => {
    it('returns true for valid attributes', () => {
      expect(manager.isValidAriaAttribute('aria-label')).toBe(true);
      expect(manager.isValidAriaAttribute('aria-hidden')).toBe(true);
    });

    it('returns false for invalid attributes', () => {
      expect(manager.isValidAriaAttribute('aria-invalid-attr')).toBe(false);
    });
  });

  describe('toHtmlAttrs', () => {
    it('converts attributes to HTML string', () => {
      const attrs = { role: 'button', 'aria-label': 'Test' };
      const html = manager.toHtmlAttrs(attrs);

      expect(html).toContain('role="button"');
      expect(html).toContain('aria-label="Test"');
    });

    it('skips undefined values', () => {
      const attrs = { role: 'button', 'aria-label': undefined };
      const html = manager.toHtmlAttrs(attrs as any);

      expect(html).not.toContain('aria-label');
    });
  });

  describe('mergeAria', () => {
    it('merges two attribute sets', () => {
      const base = { role: 'button', 'aria-label': 'Base' };
      const override = { 'aria-label': 'Override', 'aria-disabled': 'true' };

      const merged = manager.mergeAria(base, override);

      expect(merged.role).toBe('button');
      expect(merged['aria-label']).toBe('Override');
      expect(merged['aria-disabled']).toBe('true');
    });

    it('handles undefined override', () => {
      const base = { role: 'button' };
      const merged = manager.mergeAria(base, undefined);

      expect(merged).toEqual(base);
    });
  });
});
