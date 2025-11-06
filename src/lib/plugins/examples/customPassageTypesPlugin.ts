import type { EditorPlugin } from '../types';

/**
 * Example Plugin: Custom Passage Types
 *
 * Demonstrates how to add custom passage types to the editor
 */
export const customPassageTypesPlugin: EditorPlugin = {
  name: 'custom-passage-types',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Adds custom passage types for different story elements',

  nodeTypes: [
    {
      type: 'item',
      label: 'Item',
      icon: '📦',
      color: '#FF6B6B',
      description: 'Represents an item in the story',
    },
    {
      type: 'character',
      label: 'Character',
      icon: '👤',
      color: '#4ECDC4',
      description: 'Represents a character passage',
    },
    {
      type: 'location',
      label: 'Location',
      icon: '🗺️',
      color: '#95E1D3',
      description: 'Represents a location or scene',
    },
    {
      type: 'event',
      label: 'Event',
      icon: '⚡',
      color: '#FFE66D',
      description: 'Represents a story event or trigger',
    },
  ],

  onRegister: () => {
    console.log('Custom Passage Types plugin registered');
  },

  onUnregister: () => {
    console.log('Custom Passage Types plugin unregistered');
  },
};
