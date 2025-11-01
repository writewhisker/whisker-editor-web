import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  characterStore,
  entities,
  selectedEntityId,
  selectedEntity,
  entityCounts,
  type Entity,
  type EntityType,
} from './characterStore';
import { Story } from '../models/Story';

describe('characterStore', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    characterStore.clear();
  });

  afterEach(() => {
    characterStore.clear();
  });

  describe('initial state', () => {
    it('should initialize with empty entities', () => {
      expect(get(entities)).toEqual([]);
    });

    it('should initialize with no selection', () => {
      expect(get(selectedEntityId)).toBeNull();
      expect(get(selectedEntity)).toBeNull();
    });

    it('should initialize with zero counts', () => {
      const counts = get(entityCounts);
      expect(counts.total).toBe(0);
      expect(counts.character).toBe(0);
      expect(counts.location).toBe(0);
      expect(counts.item).toBe(0);
      expect(counts.faction).toBe(0);
      expect(counts.other).toBe(0);
    });
  });

  describe('loadEntities', () => {
    it('should load entities from story metadata', () => {
      const testEntities: Entity[] = [
        {
          id: 'e1',
          name: 'Hero',
          type: 'character',
          description: 'The main character',
          attributes: [],
          tags: [],
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      ];

      story.setMetadata('entities', testEntities);
      characterStore.loadEntities(story);

      expect(get(entities)).toEqual(testEntities);
    });

    it('should handle missing metadata', () => {
      characterStore.loadEntities(story);
      expect(get(entities)).toEqual([]);
    });

    it('should handle invalid metadata', () => {
      story.setMetadata('entities', 'invalid');
      characterStore.loadEntities(story);
      expect(get(entities)).toEqual([]);
    });
  });

  describe('addEntity', () => {
    it('should add entity with generated ID', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Main character',
        attributes: [],
        tags: [],
      });

      const ents = get(entities);
      expect(ents).toHaveLength(1);
      expect(ents[0].id).toBeDefined();
      expect(ents[0].name).toBe('Hero');
    });

    it('should add all entity types', () => {
      const types: EntityType[] = ['character', 'location', 'item', 'faction', 'other'];

      types.forEach(type => {
        characterStore.addEntity({
          name: `Test ${type}`,
          type,
          description: `A ${type}`,
          attributes: [],
          tags: [],
        });
      });

      expect(get(entities)).toHaveLength(5);
    });

    it('should auto-select newly added entity', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const selected = get(selectedEntity);
      expect(selected).not.toBeNull();
      expect(selected?.name).toBe('Hero');
    });

    it('should set created and modified timestamps', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const entity = get(entities)[0];
      expect(entity.created).toBeDefined();
      expect(entity.modified).toBeDefined();
    });
  });

  describe('updateEntity', () => {
    it('should update entity properties', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Original',
        attributes: [],
        tags: [],
      });

      const entityId = get(entities)[0].id;
      characterStore.updateEntity(entityId, {
        name: 'Updated Hero',
        description: 'Updated description',
      });

      const updated = get(entities)[0];
      expect(updated.name).toBe('Updated Hero');
      expect(updated.description).toBe('Updated description');
    });

    it('should update modified timestamp', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const entityId = get(entities)[0].id;
      const originalModified = get(entities)[0].modified;

      characterStore.updateEntity(entityId, { name: 'Updated' });

      const newModified = get(entities)[0].modified;
      expect(newModified).not.toBe(originalModified);
    });

    it('should not affect other entities', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      characterStore.addEntity({
        name: 'Villain',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const heroId = get(entities)[0].id;
      characterStore.updateEntity(heroId, { name: 'Super Hero' });

      expect(get(entities)[0].name).toBe('Super Hero');
      expect(get(entities)[1].name).toBe('Villain');
    });
  });

  describe('deleteEntity', () => {
    it('should delete entity by ID', () => {
      characterStore.addEntity({
        name: 'ToDelete',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const entityId = get(entities)[0].id;
      characterStore.deleteEntity(entityId);

      expect(get(entities)).toEqual([]);
    });

    it('should clear selection if deleted entity was selected', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const entityId = get(entities)[0].id;
      expect(get(selectedEntityId)).toBe(entityId);

      characterStore.deleteEntity(entityId);
      expect(get(selectedEntityId)).toBeNull();
    });

    it('should preserve selection if different entity deleted', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      characterStore.addEntity({
        name: 'Villain',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const heroId = get(entities)[0].id;
      const villainId = get(entities)[1].id;

      characterStore.selectEntity(heroId);
      characterStore.deleteEntity(villainId);

      expect(get(selectedEntityId)).toBe(heroId);
    });
  });

  describe('selectEntity', () => {
    it('should select entity by ID', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const entityId = get(entities)[0].id;
      characterStore.selectEntity(entityId);

      expect(get(selectedEntityId)).toBe(entityId);
      expect(get(selectedEntity)?.name).toBe('Hero');
    });

    it('should allow deselection with null', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      characterStore.selectEntity(null);
      expect(get(selectedEntityId)).toBeNull();
      expect(get(selectedEntity)).toBeNull();
    });
  });

  describe('attributes', () => {
    it('should add attribute to entity', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const entityId = get(entities)[0].id;
      characterStore.addAttribute(entityId, {
        name: 'strength',
        value: '10',
        type: 'number',
      });

      const entity = get(entities)[0];
      expect(entity.attributes).toHaveLength(1);
      expect(entity.attributes[0].name).toBe('strength');
    });

    it('should update attribute value', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [{ name: 'health', value: '100', type: 'number' }],
        tags: [],
      });

      const entityId = get(entities)[0].id;
      characterStore.updateAttribute(entityId, 'health', '50');

      const entity = get(entities)[0];
      expect(entity.attributes[0].value).toBe('50');
    });

    it('should delete attribute', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [
          { name: 'health', value: '100', type: 'number' },
          { name: 'mana', value: '50', type: 'number' },
        ],
        tags: [],
      });

      const entityId = get(entities)[0].id;
      characterStore.deleteAttribute(entityId, 'health');

      const entity = get(entities)[0];
      expect(entity.attributes).toHaveLength(1);
      expect(entity.attributes[0].name).toBe('mana');
    });
  });

  describe('entityCounts', () => {
    it('should count entities by type', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      characterStore.addEntity({
        name: 'Castle',
        type: 'location',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      characterStore.addEntity({
        name: 'Sword',
        type: 'item',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      const counts = get(entityCounts);
      expect(counts.character).toBe(1);
      expect(counts.location).toBe(1);
      expect(counts.item).toBe(1);
      expect(counts.total).toBe(3);
    });
  });

  describe('saveEntities', () => {
    it('should save entities to story metadata', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      characterStore.saveEntities(story);

      const saved = story.getMetadata('entities');
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('Hero');
    });
  });

  describe('clear', () => {
    it('should clear all entities and selection', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
      });

      characterStore.clear();

      expect(get(entities)).toEqual([]);
      expect(get(selectedEntityId)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle entity with color', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: [],
        color: '#ff0000',
      });

      expect(get(entities)[0].color).toBe('#ff0000');
    });

    it('should handle entity with multiple tags', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [],
        tags: ['protagonist', 'warrior', 'human'],
      });

      expect(get(entities)[0].tags).toEqual(['protagonist', 'warrior', 'human']);
    });

    it('should handle different attribute types', () => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Test',
        attributes: [
          { name: 'name', value: 'Arthur', type: 'text' },
          { name: 'level', value: '10', type: 'number' },
          { name: 'alive', value: 'true', type: 'boolean' },
        ],
        tags: [],
      });

      const attrs = get(entities)[0].attributes;
      expect(attrs).toHaveLength(3);
      expect(attrs.map(a => a.type)).toEqual(['text', 'number', 'boolean']);
    });
  });
});
