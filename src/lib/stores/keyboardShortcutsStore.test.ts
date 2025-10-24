import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock the accessibility utils before importing
vi.mock('../utils/accessibility', () => ({
  keyboardShortcuts: {
    register: vi.fn(),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
  },
}));

import {
  shortcutCategories,
  showShortcutsHelp,
  initializeKeyboardShortcuts,
  type ShortcutCategory,
} from './keyboardShortcutsStore';
import { keyboardShortcuts } from '../utils/accessibility';

describe('keyboardShortcutsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset showShortcutsHelp store
    showShortcutsHelp.set(false);
  });

  describe('shortcutCategories', () => {
    it('should export shortcut categories array', () => {
      expect(Array.isArray(shortcutCategories)).toBe(true);
      expect(shortcutCategories.length).toBeGreaterThan(0);
    });

    it('should have General category', () => {
      const general = shortcutCategories.find((c) => c.name === 'General');
      expect(general).toBeTruthy();
      expect(general?.shortcuts).toBeDefined();
      expect(general?.shortcuts.length).toBeGreaterThan(0);
    });

    it('should have Navigation category', () => {
      const navigation = shortcutCategories.find((c) => c.name === 'Navigation');
      expect(navigation).toBeTruthy();
      expect(navigation?.shortcuts).toBeDefined();
    });

    it('should have Editing category', () => {
      const editing = shortcutCategories.find((c) => c.name === 'Editing');
      expect(editing).toBeTruthy();
      expect(editing?.shortcuts).toBeDefined();
    });

    it('should have Graph category', () => {
      const graph = shortcutCategories.find((c) => c.name === 'Graph');
      expect(graph).toBeTruthy();
      expect(graph?.shortcuts).toBeDefined();
    });

    it('should have Testing category', () => {
      const testing = shortcutCategories.find((c) => c.name === 'Testing');
      expect(testing).toBeTruthy();
      expect(testing?.shortcuts).toBeDefined();
    });

    it('should have save shortcut in General', () => {
      const general = shortcutCategories.find((c) => c.name === 'General');
      const save = general?.shortcuts.find((s) => s.id === 'save');
      expect(save).toBeTruthy();
      expect(save?.description).toBe('Save story');
      expect(save?.keys).toBe('Ctrl+S');
    });

    it('should have undo shortcut in General', () => {
      const general = shortcutCategories.find((c) => c.name === 'General');
      const undo = general?.shortcuts.find((s) => s.id === 'undo');
      expect(undo).toBeTruthy();
      expect(undo?.description).toBe('Undo');
      expect(undo?.keys).toBe('Ctrl+Z');
    });

    it('should have redo shortcut in General', () => {
      const general = shortcutCategories.find((c) => c.name === 'General');
      const redo = general?.shortcuts.find((s) => s.id === 'redo');
      expect(redo).toBeTruthy();
      expect(redo?.description).toBe('Redo');
      expect(redo?.keys).toBe('Ctrl+Shift+Z');
    });

    it('should have search shortcut in General', () => {
      const general = shortcutCategories.find((c) => c.name === 'General');
      const search = general?.shortcuts.find((s) => s.id === 'search');
      expect(search).toBeTruthy();
      expect(search?.description).toBe('Search passages');
      expect(search?.keys).toBe('Ctrl+F');
    });

    it('should have help shortcut in General', () => {
      const general = shortcutCategories.find((c) => c.name === 'General');
      const help = general?.shortcuts.find((s) => s.id === 'help');
      expect(help).toBeTruthy();
      expect(help?.description).toBe('Show keyboard shortcuts');
      expect(help?.keys).toBe('?');
    });

    it('should have proper structure for each category', () => {
      shortcutCategories.forEach((category) => {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('shortcuts');
        expect(Array.isArray(category.shortcuts)).toBe(true);

        category.shortcuts.forEach((shortcut) => {
          expect(shortcut).toHaveProperty('id');
          expect(shortcut).toHaveProperty('description');
          expect(shortcut).toHaveProperty('keys');
          expect(typeof shortcut.id).toBe('string');
          expect(typeof shortcut.description).toBe('string');
          expect(typeof shortcut.keys).toBe('string');
        });
      });
    });
  });

  describe('showShortcutsHelp', () => {
    it('should be a writable store', () => {
      expect(showShortcutsHelp).toBeTruthy();
      expect(typeof showShortcutsHelp.subscribe).toBe('function');
      expect(typeof showShortcutsHelp.set).toBe('function');
    });

    it('should default to false', () => {
      expect(get(showShortcutsHelp)).toBe(false);
    });

    it('should be settable to true', () => {
      showShortcutsHelp.set(true);
      expect(get(showShortcutsHelp)).toBe(true);
    });

    it('should be settable to false', () => {
      showShortcutsHelp.set(true);
      showShortcutsHelp.set(false);
      expect(get(showShortcutsHelp)).toBe(false);
    });

    it('should notify subscribers', () => {
      const values: boolean[] = [];
      const unsubscribe = showShortcutsHelp.subscribe((value) => {
        values.push(value);
      });

      showShortcutsHelp.set(true);
      showShortcutsHelp.set(false);

      unsubscribe();

      expect(values).toEqual([false, true, false]);
    });
  });

  describe('initializeKeyboardShortcuts', () => {
    it('should register save shortcut when handler provided', () => {
      const onSave = vi.fn();
      initializeKeyboardShortcuts({ onSave });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('save', {
        key: 's',
        ctrl: true,
        description: 'Save story',
        handler: onSave,
        global: true,
      });
    });

    it('should not register save shortcut when handler not provided', () => {
      initializeKeyboardShortcuts({});

      expect(keyboardShortcuts.register).not.toHaveBeenCalledWith(
        'save',
        expect.anything()
      );
    });

    it('should register undo shortcut when handler provided', () => {
      const onUndo = vi.fn();
      initializeKeyboardShortcuts({ onUndo });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('undo', {
        key: 'z',
        ctrl: true,
        description: 'Undo',
        handler: onUndo,
        global: true,
      });
    });

    it('should register redo shortcut when handler provided', () => {
      const onRedo = vi.fn();
      initializeKeyboardShortcuts({ onRedo });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('redo', {
        key: 'z',
        ctrl: true,
        shift: true,
        description: 'Redo',
        handler: onRedo,
        global: true,
      });
    });

    it('should register search shortcut when handler provided', () => {
      const onSearch = vi.fn();
      initializeKeyboardShortcuts({ onSearch });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('search', {
        key: 'f',
        ctrl: true,
        description: 'Search passages',
        handler: onSearch,
        global: true,
      });
    });

    it('should always register help shortcut', () => {
      initializeKeyboardShortcuts({});

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('help', {
        key: '?',
        description: 'Show keyboard shortcuts',
        handler: expect.any(Function),
        global: true,
      });
    });

    it('should register newPassage shortcut when handler provided', () => {
      const onNewPassage = vi.fn();
      initializeKeyboardShortcuts({ onNewPassage });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('newPassage', {
        key: 'n',
        ctrl: true,
        description: 'Create new passage',
        handler: onNewPassage,
        global: true,
      });
    });

    it('should register deletePassage shortcut when handler provided', () => {
      const onDeletePassage = vi.fn();
      initializeKeyboardShortcuts({ onDeletePassage });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('deletePassage', {
        key: 'Delete',
        description: 'Delete selected passage',
        handler: onDeletePassage,
      });
    });

    it('should register duplicatePassage shortcut when handler provided', () => {
      const onDuplicatePassage = vi.fn();
      initializeKeyboardShortcuts({ onDuplicatePassage });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('duplicatePassage', {
        key: 'd',
        ctrl: true,
        description: 'Duplicate selected passage',
        handler: onDuplicatePassage,
        global: true,
      });
    });

    it('should register navigation shortcuts when handlers provided', () => {
      const onFocusPassageList = vi.fn();
      const onFocusProperties = vi.fn();
      const onFocusGraph = vi.fn();

      initializeKeyboardShortcuts({
        onFocusPassageList,
        onFocusProperties,
        onFocusGraph,
      });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('focusPassageList', {
        key: '1',
        alt: true,
        description: 'Focus passage list',
        handler: onFocusPassageList,
        global: true,
      });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('focusProperties', {
        key: '2',
        alt: true,
        description: 'Focus properties panel',
        handler: onFocusProperties,
        global: true,
      });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('focusGraph', {
        key: '3',
        alt: true,
        description: 'Focus graph view',
        handler: onFocusGraph,
        global: true,
      });
    });

    it('should register passage navigation shortcuts', () => {
      const onNextPassage = vi.fn();
      const onPrevPassage = vi.fn();

      initializeKeyboardShortcuts({
        onNextPassage,
        onPrevPassage,
      });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('nextPassage', {
        key: 'j',
        description: 'Select next passage',
        handler: onNextPassage,
      });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('prevPassage', {
        key: 'k',
        description: 'Select previous passage',
        handler: onPrevPassage,
      });
    });

    it('should register testing shortcuts', () => {
      const onValidate = vi.fn();
      const onPlayStory = vi.fn();

      initializeKeyboardShortcuts({
        onValidate,
        onPlayStory,
      });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('validate', {
        key: 'v',
        ctrl: true,
        shift: true,
        description: 'Validate story',
        handler: onValidate,
        global: true,
      });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('playStory', {
        key: 'p',
        ctrl: true,
        description: 'Play story from start',
        handler: onPlayStory,
        global: true,
      });
    });

    it('should register graph shortcuts', () => {
      const onZoomToSelection = vi.fn();
      const onAutoLayout = vi.fn();

      initializeKeyboardShortcuts({
        onZoomToSelection,
        onAutoLayout,
      });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('zoomToSelection', {
        key: 'z',
        description: 'Zoom to selected passage',
        handler: onZoomToSelection,
      });

      expect(keyboardShortcuts.register).toHaveBeenCalledWith('autoLayout', {
        key: 'l',
        ctrl: true,
        description: 'Auto-layout graph',
        handler: onAutoLayout,
        global: true,
      });
    });

    it('should register multiple shortcuts together', () => {
      const handlers = {
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onNewPassage: vi.fn(),
        onDeletePassage: vi.fn(),
      };

      initializeKeyboardShortcuts(handlers);

      // Should have registered 6 shortcuts (5 provided + help)
      expect(keyboardShortcuts.register).toHaveBeenCalledTimes(6);
    });

    it('should set showShortcutsHelp to true when help handler called', () => {
      initializeKeyboardShortcuts({});

      // Get the help handler that was registered
      const helpCall = vi.mocked(keyboardShortcuts.register).mock.calls.find(
        (call) => call[0] === 'help'
      );
      expect(helpCall).toBeTruthy();

      const helpHandler = helpCall?.[1].handler;
      expect(helpHandler).toBeTruthy();

      // Call the help handler
      helpHandler?.();

      // Should have set showShortcutsHelp to true
      expect(get(showShortcutsHelp)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty handlers object', () => {
      expect(() => initializeKeyboardShortcuts({})).not.toThrow();

      // Should only register help shortcut
      expect(keyboardShortcuts.register).toHaveBeenCalledTimes(1);
      expect(keyboardShortcuts.register).toHaveBeenCalledWith(
        'help',
        expect.anything()
      );
    });

    it('should handle partial handlers object', () => {
      const onSave = vi.fn();
      const onUndo = vi.fn();

      initializeKeyboardShortcuts({ onSave, onUndo });

      // Should register save, undo, and help (3 total)
      expect(keyboardShortcuts.register).toHaveBeenCalledTimes(3);
    });
  });
});
