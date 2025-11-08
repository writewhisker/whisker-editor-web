import type { EditorPlugin } from '../types';

/**
 * Character System Plugin
 *
 * Manage characters and relationships with:
 * - Character definitions with attributes
 * - Relationship tracking (friendship, romance, rivalry)
 * - Relationship modifiers and thresholds
 * - Character state (met, alive, location)
 * - Opinion/affection values
 * - Conversation tracking
 */

export interface Character {
  id: string;
  name: string;
  description?: string;
  pronouns?: string;
  role?: string;
  traits?: string[];
  location?: string;
  metadata?: Record<string, any>;
}

export interface Relationship {
  characterId: string;
  friendship: number; // -100 to 100
  romance: number; // 0 to 100
  rivalry: number; // 0 to 100
  trust: number; // 0 to 100
  met: boolean;
  conversations: number;
  lastInteraction?: number;
  flags?: Set<string>; // Custom relationship flags
}

export interface CharacterState {
  characters: Record<string, Character>;
  relationships: Record<string, Relationship>;
  activeCharacter?: string; // Currently talking to
}

export const characterSystem: EditorPlugin = {
  name: 'character-system',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Character and relationship management system',

  // Character passage type
  nodeTypes: [
    {
      type: 'character',
      label: 'Character',
      icon: '👤',
      color: '#9B59B6',
      description: 'Character interaction passage',
    },
  ],

  // Character actions
  actions: [
    {
      type: 'character.define',
      label: 'Define Character',
      description: 'Register a new character',
      execute: async (context, params: Character) => {
        if (!context.storyState.characters) {
          context.storyState.characters = {
            characters: {},
            relationships: {},
          };
        }

        context.storyState.characters.characters[params.id] = { ...params };

        // Initialize relationship
        if (!context.storyState.characters.relationships[params.id]) {
          context.storyState.characters.relationships[params.id] = {
            characterId: params.id,
            friendship: 0,
            romance: 0,
            rivalry: 0,
            trust: 50,
            met: false,
            conversations: 0,
            flags: new Set(),
          };
        }

        console.log(`[Characters] Defined character: ${params.name}`);
      },
    },
    {
      type: 'character.meet',
      label: 'Meet Character',
      description: 'Mark character as met',
      execute: async (context, params: { id: string }) => {
        const relationship = context.storyState.characters?.relationships[params.id];
        if (!relationship) {
          console.warn(`[Characters] Character ${params.id} not found`);
          return;
        }

        if (!relationship.met) {
          relationship.met = true;
          relationship.lastInteraction = Date.now();
          context.variables.set(`met_${params.id}`, true);
          console.log(`[Characters] Met ${params.id}`);
        }
      },
    },
    {
      type: 'character.interact',
      label: 'Interact with Character',
      description: 'Start conversation/interaction',
      execute: async (context, params: { id: string }) => {
        const characters = context.storyState.characters;
        if (!characters?.relationships[params.id]) {
          console.warn(`[Characters] Character ${params.id} not found`);
          return;
        }

        const relationship = characters.relationships[params.id];
        relationship.conversations++;
        relationship.lastInteraction = Date.now();

        if (!relationship.met) {
          relationship.met = true;
          context.variables.set(`met_${params.id}`, true);
        }

        characters.activeCharacter = params.id;
        context.variables.set('active_character', params.id);
        context.variables.set(`${params.id}_conversations`, relationship.conversations);

        console.log(`[Characters] Interacting with ${params.id}`);
      },
    },
    {
      type: 'character.modifyRelationship',
      label: 'Modify Relationship',
      description: 'Change relationship values',
      execute: async (
        context,
        params: {
          id: string;
          type: 'friendship' | 'romance' | 'rivalry' | 'trust';
          amount: number;
        }
      ) => {
        const relationship = context.storyState.characters?.relationships[params.id];
        if (!relationship) {
          console.warn(`[Characters] Character ${params.id} not found`);
          return;
        }

        const oldValue = relationship[params.type];
        let newValue = oldValue + params.amount;

        // Apply bounds
        if (params.type === 'friendship') {
          newValue = Math.max(-100, Math.min(100, newValue));
        } else {
          newValue = Math.max(0, Math.min(100, newValue));
        }

        relationship[params.type] = newValue;
        context.variables.set(`${params.id}_${params.type}`, newValue);

        console.log(`[Characters] ${params.id} ${params.type}: ${oldValue} -> ${newValue}`);
      },
    },
    {
      type: 'character.setFlag',
      label: 'Set Relationship Flag',
      description: 'Set a custom relationship flag',
      execute: async (context, params: { id: string; flag: string; value: boolean }) => {
        const relationship = context.storyState.characters?.relationships[params.id];
        if (!relationship) {
          console.warn(`[Characters] Character ${params.id} not found`);
          return;
        }

        if (!relationship.flags) {
          relationship.flags = new Set();
        }

        if (params.value) {
          relationship.flags.add(params.flag);
        } else {
          relationship.flags.delete(params.flag);
        }

        context.variables.set(`${params.id}_${params.flag}`, params.value);

        console.log(`[Characters] ${params.id} flag ${params.flag}: ${params.value}`);
      },
    },
    {
      type: 'character.setLocation',
      label: 'Set Character Location',
      description: 'Update character location',
      execute: async (context, params: { id: string; location: string }) => {
        const character = context.storyState.characters?.characters[params.id];
        if (!character) {
          console.warn(`[Characters] Character ${params.id} not found`);
          return;
        }

        character.location = params.location;
        context.variables.set(`${params.id}_location`, params.location);

        console.log(`[Characters] ${params.id} moved to ${params.location}`);
      },
    },
  ],

  // Character conditions
  conditions: [
    {
      type: 'character.met',
      label: 'Has Met Character',
      description: 'Check if player has met character',
      evaluate: (context, params: { id: string }) => {
        return context.storyState.characters?.relationships[params.id]?.met || false;
      },
    },
    {
      type: 'character.relationship',
      label: 'Relationship Check',
      description: 'Check relationship value',
      evaluate: (
        context,
        params: {
          id: string;
          type: 'friendship' | 'romance' | 'rivalry' | 'trust';
          operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
          value: number;
        }
      ) => {
        const relationship = context.storyState.characters?.relationships[params.id];
        if (!relationship) return false;

        const relationshipValue = relationship[params.type];

        switch (params.operator) {
          case 'gt':
            return relationshipValue > params.value;
          case 'lt':
            return relationshipValue < params.value;
          case 'gte':
            return relationshipValue >= params.value;
          case 'lte':
            return relationshipValue <= params.value;
          case 'eq':
            return relationshipValue === params.value;
          default:
            return false;
        }
      },
    },
    {
      type: 'character.hasFlag',
      label: 'Has Relationship Flag',
      description: 'Check if relationship flag is set',
      evaluate: (context, params: { id: string; flag: string }) => {
        const relationship = context.storyState.characters?.relationships[params.id];
        return relationship?.flags?.has(params.flag) || false;
      },
    },
    {
      type: 'character.atLocation',
      label: 'Character At Location',
      description: 'Check if character is at location',
      evaluate: (context, params: { id: string; location: string }) => {
        const character = context.storyState.characters?.characters[params.id];
        return character?.location === params.location;
      },
    },
    {
      type: 'character.conversations',
      label: 'Conversation Count',
      description: 'Check conversation count',
      evaluate: (
        context,
        params: { id: string; operator: 'gt' | 'lt' | 'gte' | 'lte'; count: number }
      ) => {
        const relationship = context.storyState.characters?.relationships[params.id];
        if (!relationship) return false;

        const conversations = relationship.conversations;

        switch (params.operator) {
          case 'gt':
            return conversations > params.count;
          case 'lt':
            return conversations < params.count;
          case 'gte':
            return conversations >= params.count;
          case 'lte':
            return conversations <= params.count;
          default:
            return false;
        }
      },
    },
    {
      type: 'character.relationshipLevel',
      label: 'Relationship Level',
      description: 'Check relationship level tier',
      evaluate: (
        context,
        params: {
          id: string;
          type: 'friendship' | 'romance';
          level: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'close' | 'intimate';
        }
      ) => {
        const relationship = context.storyState.characters?.relationships[params.id];
        if (!relationship) return false;

        const value = relationship[params.type];

        // Define level thresholds
        const levels = {
          friendship: {
            hostile: [-100, -50],
            unfriendly: [-49, -10],
            neutral: [-9, 20],
            friendly: [21, 50],
            close: [51, 80],
            intimate: [81, 100],
          },
          romance: {
            hostile: [0, 0],
            unfriendly: [0, 0],
            neutral: [0, 20],
            friendly: [21, 40],
            close: [41, 70],
            intimate: [71, 100],
          },
        };

        const [min, max] = levels[params.type][params.level];
        return value >= min && value <= max;
      },
    },
  ],

  // Runtime hooks
  runtime: {
    onInit: (context) => {
      if (!context.storyState.characters) {
        context.storyState.characters = {
          characters: {},
          relationships: {},
        };
      }

      console.log('[Character System] Initialized');
    },

    onStoryLoad: (context) => {
      const characters = context.storyState.characters;
      if (characters) {
        const characterCount = Object.keys(characters.characters).length;
        const metCount = Object.values(characters.relationships).filter(r => r.met).length;
        console.log(`[Character System] Story loaded: ${metCount}/${characterCount} characters met`);
      }
    },
  },

  onRegister: () => {
    console.log('[Character System] Plugin registered');
  },

  onUnregister: () => {
    console.log('[Character System] Plugin unregistered');
  },
};
