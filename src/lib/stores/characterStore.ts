/**
 * Character/Entity Store
 *
 * Manages characters and entities in the story.
 */

import { writable, derived, get } from 'svelte/store';
import type { Story } from '../models/Story';

export type EntityType = 'character' | 'location' | 'item' | 'faction' | 'other';

export interface EntityAttribute {
  name: string;
  value: string;
  type: 'text' | 'number' | 'boolean';
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description: string;
  attributes: EntityAttribute[];
  tags: string[];
  color?: string;
  created: string;
  modified: string;
}

interface CharacterStoreState {
  entities: Entity[];
  selectedEntityId: string | null;
}

const STORAGE_KEY = 'whisker-characters';

// Create writable store
const createCharacterStore = () => {
  const { subscribe, set, update } = writable<CharacterStoreState>({
    entities: [],
    selectedEntityId: null,
  });

  return {
    subscribe,

    /**
     * Load entities for a story
     */
    loadEntities: (story: Story) => {
      const savedData = story.getMetadata('entities');
      if (savedData && Array.isArray(savedData)) {
        update(state => ({
          ...state,
          entities: savedData,
        }));
      } else {
        update(state => ({
          ...state,
          entities: [],
        }));
      }
    },

    /**
     * Save entities to story metadata
     */
    saveEntities: (story: Story) => {
      const state = get({ subscribe });
      story.setMetadata('entities', state.entities);
    },

    /**
     * Add a new entity
     */
    addEntity: (entity: Omit<Entity, 'id' | 'created' | 'modified'>) => {
      update(state => {
        const now = new Date().toISOString();
        const newEntity: Entity = {
          ...entity,
          id: `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created: now,
          modified: now,
        };
        return {
          ...state,
          entities: [...state.entities, newEntity],
          selectedEntityId: newEntity.id,
        };
      });
    },

    /**
     * Update an existing entity
     */
    updateEntity: (id: string, updates: Partial<Omit<Entity, 'id' | 'created'>>) => {
      update(state => ({
        ...state,
        entities: state.entities.map(entity =>
          entity.id === id
            ? { ...entity, ...updates, modified: new Date().toISOString() }
            : entity
        ),
      }));
    },

    /**
     * Delete an entity
     */
    deleteEntity: (id: string) => {
      update(state => ({
        ...state,
        entities: state.entities.filter(entity => entity.id !== id),
        selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId,
      }));
    },

    /**
     * Select an entity
     */
    selectEntity: (id: string | null) => {
      update(state => ({
        ...state,
        selectedEntityId: id,
      }));
    },

    /**
     * Add attribute to entity
     */
    addAttribute: (entityId: string, attribute: EntityAttribute) => {
      update(state => ({
        ...state,
        entities: state.entities.map(entity =>
          entity.id === entityId
            ? {
                ...entity,
                attributes: [...entity.attributes, attribute],
                modified: new Date().toISOString(),
              }
            : entity
        ),
      }));
    },

    /**
     * Update attribute
     */
    updateAttribute: (entityId: string, attributeName: string, value: string) => {
      update(state => ({
        ...state,
        entities: state.entities.map(entity =>
          entity.id === entityId
            ? {
                ...entity,
                attributes: entity.attributes.map(attr =>
                  attr.name === attributeName ? { ...attr, value } : attr
                ),
                modified: new Date().toISOString(),
              }
            : entity
        ),
      }));
    },

    /**
     * Delete attribute
     */
    deleteAttribute: (entityId: string, attributeName: string) => {
      update(state => ({
        ...state,
        entities: state.entities.map(entity =>
          entity.id === entityId
            ? {
                ...entity,
                attributes: entity.attributes.filter(attr => attr.name !== attributeName),
                modified: new Date().toISOString(),
              }
            : entity
        ),
      }));
    },

    /**
     * Clear all entities
     */
    clear: () => {
      set({
        entities: [],
        selectedEntityId: null,
      });
    },
  };
};

export const characterStore = createCharacterStore();

// Derived stores
export const entities = derived(characterStore, $store => $store.entities);
export const selectedEntityId = derived(characterStore, $store => $store.selectedEntityId);
export const selectedEntity = derived(
  characterStore,
  $store => $store.entities.find(e => e.id === $store.selectedEntityId) || null
);

// Entity type counts
export const entityCounts = derived(entities, $entities => ({
  character: $entities.filter(e => e.type === 'character').length,
  location: $entities.filter(e => e.type === 'location').length,
  item: $entities.filter(e => e.type === 'item').length,
  faction: $entities.filter(e => e.type === 'faction').length,
  other: $entities.filter(e => e.type === 'other').length,
  total: $entities.length,
}));
