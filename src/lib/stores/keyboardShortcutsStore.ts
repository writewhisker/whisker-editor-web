/**
 * Keyboard Shortcuts Store
 *
 * Centralized keyboard shortcut registration and management
 */

import { writable } from 'svelte/store';
import { keyboardShortcuts, type KeyboardShortcut } from '../utils/accessibility';

export interface ShortcutCategory {
  name: string;
  shortcuts: Array<{
    id: string;
    description: string;
    keys: string;
  }>;
}

/**
 * All keyboard shortcuts organized by category
 */
export const shortcutCategories: ShortcutCategory[] = [
  {
    name: 'General',
    shortcuts: [
      { id: 'save', description: 'Save story', keys: 'Ctrl+S' },
      { id: 'undo', description: 'Undo', keys: 'Ctrl+Z' },
      { id: 'redo', description: 'Redo', keys: 'Ctrl+Shift+Z' },
      { id: 'search', description: 'Search passages', keys: 'Ctrl+F' },
      { id: 'help', description: 'Show keyboard shortcuts', keys: '?' },
    ],
  },
  {
    name: 'Navigation',
    shortcuts: [
      { id: 'focusPassageList', description: 'Focus passage list', keys: 'Alt+1' },
      { id: 'focusProperties', description: 'Focus properties panel', keys: 'Alt+2' },
      { id: 'focusGraph', description: 'Focus graph view', keys: 'Alt+3' },
      { id: 'nextPassage', description: 'Select next passage', keys: 'J or ArrowDown' },
      { id: 'prevPassage', description: 'Select previous passage', keys: 'K or ArrowUp' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { id: 'newPassage', description: 'Create new passage', keys: 'Ctrl+N' },
      { id: 'deletePassage', description: 'Delete selected passage', keys: 'Delete or Backspace' },
      { id: 'duplicatePassage', description: 'Duplicate selected passage', keys: 'Ctrl+D' },
      { id: 'focusTitle', description: 'Focus passage title', keys: 'Ctrl+T' },
      { id: 'focusContent', description: 'Focus passage content', keys: 'Ctrl+E' },
    ],
  },
  {
    name: 'Graph',
    shortcuts: [
      { id: 'zoomIn', description: 'Zoom in graph', keys: 'Ctrl++' },
      { id: 'zoomOut', description: 'Zoom out graph', keys: 'Ctrl+-' },
      { id: 'fitView', description: 'Fit graph to view', keys: 'Ctrl+0' },
      { id: 'zoomToSelection', description: 'Zoom to selected passage', keys: 'Z' },
      { id: 'autoLayout', description: 'Auto-layout graph', keys: 'Ctrl+L' },
    ],
  },
  {
    name: 'Testing',
    shortcuts: [
      { id: 'playStory', description: 'Play story from start', keys: 'Ctrl+P' },
      { id: 'validate', description: 'Validate story', keys: 'Ctrl+Shift+V' },
      { id: 'togglePreview', description: 'Toggle preview panel', keys: 'Ctrl+Shift+P' },
    ],
  },
];

/**
 * Show/hide keyboard shortcuts help modal
 */
export const showShortcutsHelp = writable(false);

/**
 * Initialize all keyboard shortcuts
 * Call this from the root App component
 */
export function initializeKeyboardShortcuts(handlers: {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onNewPassage?: () => void;
  onDeletePassage?: () => void;
  onDuplicatePassage?: () => void;
  onValidate?: () => void;
  onPlayStory?: () => void;
  onSearch?: () => void;
  onZoomToSelection?: () => void;
  onAutoLayout?: () => void;
  onFocusPassageList?: () => void;
  onFocusProperties?: () => void;
  onFocusGraph?: () => void;
  onNextPassage?: () => void;
  onPrevPassage?: () => void;
  onFocusTitle?: () => void;
  onFocusContent?: () => void;
}) {
  // General shortcuts
  if (handlers.onSave) {
    keyboardShortcuts.register('save', {
      key: 's',
      ctrl: true,
      description: 'Save story',
      handler: handlers.onSave,
      global: true,
    });
  }

  if (handlers.onUndo) {
    keyboardShortcuts.register('undo', {
      key: 'z',
      ctrl: true,
      description: 'Undo',
      handler: handlers.onUndo,
      global: true,
    });
  }

  if (handlers.onRedo) {
    keyboardShortcuts.register('redo', {
      key: 'z',
      ctrl: true,
      shift: true,
      description: 'Redo',
      handler: handlers.onRedo,
      global: true,
    });
  }

  if (handlers.onSearch) {
    keyboardShortcuts.register('search', {
      key: 'f',
      ctrl: true,
      description: 'Search passages',
      handler: handlers.onSearch,
      global: true,
    });
  }

  // Always register help shortcut
  keyboardShortcuts.register('help', {
    key: '?',
    description: 'Show keyboard shortcuts',
    handler: () => showShortcutsHelp.set(true),
    global: true,
  });

  // Editing shortcuts
  if (handlers.onNewPassage) {
    keyboardShortcuts.register('newPassage', {
      key: 'n',
      ctrl: true,
      description: 'Create new passage',
      handler: handlers.onNewPassage,
      global: true,
    });
  }

  if (handlers.onDeletePassage) {
    keyboardShortcuts.register('deletePassage', {
      key: 'Delete',
      description: 'Delete selected passage',
      handler: handlers.onDeletePassage,
    });
  }

  if (handlers.onDuplicatePassage) {
    keyboardShortcuts.register('duplicatePassage', {
      key: 'd',
      ctrl: true,
      description: 'Duplicate selected passage',
      handler: handlers.onDuplicatePassage,
      global: true,
    });
  }

  // Navigation shortcuts
  if (handlers.onFocusPassageList) {
    keyboardShortcuts.register('focusPassageList', {
      key: '1',
      alt: true,
      description: 'Focus passage list',
      handler: handlers.onFocusPassageList,
      global: true,
    });
  }

  if (handlers.onFocusProperties) {
    keyboardShortcuts.register('focusProperties', {
      key: '2',
      alt: true,
      description: 'Focus properties panel',
      handler: handlers.onFocusProperties,
      global: true,
    });
  }

  if (handlers.onFocusGraph) {
    keyboardShortcuts.register('focusGraph', {
      key: '3',
      alt: true,
      description: 'Focus graph view',
      handler: handlers.onFocusGraph,
      global: true,
    });
  }

  if (handlers.onNextPassage) {
    keyboardShortcuts.register('nextPassage', {
      key: 'j',
      description: 'Select next passage',
      handler: handlers.onNextPassage,
    });
  }

  if (handlers.onPrevPassage) {
    keyboardShortcuts.register('prevPassage', {
      key: 'k',
      description: 'Select previous passage',
      handler: handlers.onPrevPassage,
    });
  }

  // Testing shortcuts
  if (handlers.onValidate) {
    keyboardShortcuts.register('validate', {
      key: 'v',
      ctrl: true,
      shift: true,
      description: 'Validate story',
      handler: handlers.onValidate,
      global: true,
    });
  }

  if (handlers.onPlayStory) {
    keyboardShortcuts.register('playStory', {
      key: 'p',
      ctrl: true,
      description: 'Play story from start',
      handler: handlers.onPlayStory,
      global: true,
    });
  }

  // Graph shortcuts
  if (handlers.onZoomToSelection) {
    keyboardShortcuts.register('zoomToSelection', {
      key: 'z',
      description: 'Zoom to selected passage',
      handler: handlers.onZoomToSelection,
    });
  }

  if (handlers.onAutoLayout) {
    keyboardShortcuts.register('autoLayout', {
      key: 'l',
      ctrl: true,
      description: 'Auto-layout graph',
      handler: handlers.onAutoLayout,
      global: true,
    });
  }
}
