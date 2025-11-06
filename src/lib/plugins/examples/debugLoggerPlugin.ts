import type { EditorPlugin } from '../types';

/**
 * Example Plugin: Debug Logger
 *
 * Demonstrates runtime hooks for debugging and logging
 */
export const debugLoggerPlugin: EditorPlugin = {
  name: 'debug-logger',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Logs runtime events for debugging purposes',

  runtime: {
    onInit: (context) => {
      console.log('[Debug Logger] Plugin system initialized', {
        variables: context.variables.size,
        currentPassage: context.currentPassage?.id,
        historyLength: context.history.length,
      });
    },

    onStoryLoad: (context) => {
      console.log('[Debug Logger] Story loaded', {
        storyState: Object.keys(context.storyState).length,
        variables: context.variables.size,
      });
    },

    onPassageEnter: (passage, context) => {
      console.log('[Debug Logger] Entering passage', {
        passageId: passage.id,
        passageTitle: passage.title,
        historyLength: context.history.length,
      });
    },

    onPassageExit: (passage, context) => {
      console.log('[Debug Logger] Exiting passage', {
        passageId: passage.id,
        passageTitle: passage.title,
      });
    },

    onVariableChange: (name, value, context) => {
      console.log('[Debug Logger] Variable changed', {
        name,
        value,
        totalVariables: context.variables.size,
      });
    },

    onSave: (context) => {
      console.log('[Debug Logger] Story saved', {
        variables: context.variables.size,
        currentPassage: context.currentPassage?.id,
      });
    },

    onLoad: (context) => {
      console.log('[Debug Logger] Story loaded from save', {
        variables: context.variables.size,
        historyLength: context.history.length,
      });
    },
  },

  onRegister: () => {
    console.log('[Debug Logger] Plugin registered and ready');
  },

  onUnregister: () => {
    console.log('[Debug Logger] Plugin unregistered');
  },
};
