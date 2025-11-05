import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CharacterManager from './CharacterManager.svelte';
import { get } from 'svelte/store';
import { characterStore, entities } from '../stores/characterStore';
import { currentStory } from '../stores/projectStore';
import { Story } from '../models/Story';

describe('CharacterManager', () => {
  beforeEach(() => {
    // Reset stores
    characterStore.clearEntities();

    // Create a test story
    const testStory = new Story('Test Story');
    currentStory.set(testStory);
  });

  describe('Rendering', () => {
    it('should render the character manager', () => {
      render(CharacterManager);
      expect(screen.getByText(/Character Manager/i)).toBeInTheDocument();
    });

    it('should show entity type tabs', () => {
      render(CharacterManager);
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText('Locations')).toBeInTheDocument();
      expect(screen.getByText('Items')).toBeInTheDocument();
    });

    it('should show add entity button', () => {
      render(CharacterManager);
      expect(screen.getByText(/Add Entity/i)).toBeInTheDocument();
    });

    it('should show search input', () => {
      render(CharacterManager);
      const searchInput = screen.getByPlaceholderText(/Search entities/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Adding Entities', () => {
    it('should show add form when add button clicked', async () => {
      render(CharacterManager);
      const addButton = screen.getByText(/Add Entity/i);
      await fireEvent.click(addButton);

      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
    });

    it('should create a new character entity', async () => {
      render(CharacterManager);

      // Open add form
      const addButton = screen.getByText(/Add Entity/i);
      await fireEvent.click(addButton);

      // Fill form
      const nameInput = screen.getByLabelText(/Name/i);
      const descInput = screen.getByLabelText(/Description/i);

      await fireEvent.input(nameInput, { target: { value: 'Hero' } });
      await fireEvent.input(descInput, { target: { value: 'The main protagonist' } });

      // Submit
      const saveButton = screen.getByText(/Save/i);
      await fireEvent.click(saveButton);

      // Verify entity was created
      const allEntities = get(entities);
      expect(allEntities).toHaveLength(1);
      expect(allEntities[0].name).toBe('Hero');
      expect(allEntities[0].description).toBe('The main protagonist');
      expect(allEntities[0].type).toBe('character');
    });

    it('should not create entity without name', async () => {
      render(CharacterManager);

      // Open add form
      const addButton = screen.getByText(/Add Entity/i);
      await fireEvent.click(addButton);

      // Try to save without name
      const saveButton = screen.getByText(/Save/i);
      await fireEvent.click(saveButton);

      // Verify no entity was created
      const allEntities = get(entities);
      expect(allEntities).toHaveLength(0);
    });

    it('should create entities of different types', async () => {
      render(CharacterManager);

      // Add a location
      const addButton = screen.getByText(/Add Entity/i);
      await fireEvent.click(addButton);

      const nameInput = screen.getByLabelText(/Name/i);
      const typeSelect = screen.getByLabelText(/Type/i);

      await fireEvent.input(nameInput, { target: { value: 'Castle' } });
      await fireEvent.change(typeSelect, { target: { value: 'location' } });

      const saveButton = screen.getByText(/Save/i);
      await fireEvent.click(saveButton);

      const allEntities = get(entities);
      expect(allEntities[0].type).toBe('location');
    });
  });

  describe('Editing Entities', () => {
    beforeEach(() => {
      // Add a test entity
      characterStore.addEntity({
        name: 'Test Character',
        type: 'character',
        description: 'Original description',
        tags: ['test'],
        attributes: []
      });
    });

    it('should open edit form when entity clicked', async () => {
      render(CharacterManager);

      const entityElement = screen.getByText('Test Character');
      await fireEvent.click(entityElement);

      expect(screen.getByDisplayValue('Test Character')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Original description')).toBeInTheDocument();
    });

    it('should update entity details', async () => {
      render(CharacterManager);

      // Click entity to edit
      const entityElement = screen.getByText('Test Character');
      await fireEvent.click(entityElement);

      // Update name
      const nameInput = screen.getByDisplayValue('Test Character');
      await fireEvent.input(nameInput, { target: { value: 'Updated Character' } });

      // Save
      const saveButton = screen.getByText(/Save/i);
      await fireEvent.click(saveButton);

      // Verify update
      const allEntities = get(entities);
      expect(allEntities[0].name).toBe('Updated Character');
    });

    it('should cancel edit without saving', async () => {
      render(CharacterManager);

      // Click entity to edit
      const entityElement = screen.getByText('Test Character');
      await fireEvent.click(entityElement);

      // Update name
      const nameInput = screen.getByDisplayValue('Test Character');
      await fireEvent.input(nameInput, { target: { value: 'Should Not Save' } });

      // Cancel
      const cancelButton = screen.getByText(/Cancel/i);
      await fireEvent.click(cancelButton);

      // Verify no update
      const allEntities = get(entities);
      expect(allEntities[0].name).toBe('Test Character');
    });
  });

  describe('Deleting Entities', () => {
    beforeEach(() => {
      characterStore.addEntity({
        name: 'To Delete',
        type: 'character',
        description: 'Will be deleted',
        tags: [],
        attributes: []
      });
    });

    it('should delete entity', async () => {
      render(CharacterManager);

      // Find and click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await fireEvent.click(deleteButton);

      // Verify deletion
      const allEntities = get(entities);
      expect(allEntities).toHaveLength(0);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      // Add multiple entities of different types
      characterStore.addEntity({
        name: 'Character One',
        type: 'character',
        description: 'A character',
        tags: [],
        attributes: []
      });
      characterStore.addEntity({
        name: 'Location One',
        type: 'location',
        description: 'A place',
        tags: [],
        attributes: []
      });
      characterStore.addEntity({
        name: 'Item One',
        type: 'item',
        description: 'A thing',
        tags: [],
        attributes: []
      });
    });

    it('should filter by type', async () => {
      render(CharacterManager);

      // Click Characters tab
      const charactersTab = screen.getByText('Characters');
      await fireEvent.click(charactersTab);

      expect(screen.getByText('Character One')).toBeInTheDocument();
      expect(screen.queryByText('Location One')).not.toBeInTheDocument();
      expect(screen.queryByText('Item One')).not.toBeInTheDocument();
    });

    it('should show all entities on All tab', async () => {
      render(CharacterManager);

      const allTab = screen.getByText('All');
      await fireEvent.click(allTab);

      expect(screen.getByText('Character One')).toBeInTheDocument();
      expect(screen.getByText('Location One')).toBeInTheDocument();
      expect(screen.getByText('Item One')).toBeInTheDocument();
    });

    it('should filter by search query', async () => {
      render(CharacterManager);

      const searchInput = screen.getByPlaceholderText(/Search entities/i);
      await fireEvent.input(searchInput, { target: { value: 'Location' } });

      expect(screen.queryByText('Character One')).not.toBeInTheDocument();
      expect(screen.getByText('Location One')).toBeInTheDocument();
      expect(screen.queryByText('Item One')).not.toBeInTheDocument();
    });

    it('should search in description', async () => {
      render(CharacterManager);

      const searchInput = screen.getByPlaceholderText(/Search entities/i);
      await fireEvent.input(searchInput, { target: { value: 'place' } });

      expect(screen.getByText('Location One')).toBeInTheDocument();
    });

    it('should combine type filter and search', async () => {
      render(CharacterManager);

      // Filter by character type
      const charactersTab = screen.getByText('Characters');
      await fireEvent.click(charactersTab);

      // Search
      const searchInput = screen.getByPlaceholderText(/Search entities/i);
      await fireEvent.input(searchInput, { target: { value: 'One' } });

      expect(screen.getByText('Character One')).toBeInTheDocument();
      expect(screen.queryByText('Location One')).not.toBeInTheDocument();
    });
  });

  describe('Entity Attributes', () => {
    beforeEach(() => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Main character',
        tags: [],
        attributes: []
      });
    });

    it('should add attribute to entity', async () => {
      render(CharacterManager);

      // Edit entity
      const entityElement = screen.getByText('Hero');
      await fireEvent.click(entityElement);

      // Add attribute
      const addAttrButton = screen.getByText(/Add Attribute/i);
      await fireEvent.click(addAttrButton);

      const attrNameInput = screen.getByLabelText(/Attribute Name/i);
      const attrValueInput = screen.getByLabelText(/Attribute Value/i);

      await fireEvent.input(attrNameInput, { target: { value: 'Health' } });
      await fireEvent.input(attrValueInput, { target: { value: '100' } });

      const saveAttrButton = screen.getByText(/Save Attribute/i);
      await fireEvent.click(saveAttrButton);

      // Verify attribute added
      const allEntities = get(entities);
      expect(allEntities[0].attributes).toHaveLength(1);
      expect(allEntities[0].attributes[0].name).toBe('Health');
      expect(allEntities[0].attributes[0].value).toBe('100');
    });
  });

  describe('Entity Tags', () => {
    beforeEach(() => {
      characterStore.addEntity({
        name: 'Hero',
        type: 'character',
        description: 'Main character',
        tags: ['protagonist'],
        attributes: []
      });
    });

    it('should display entity tags', () => {
      render(CharacterManager);
      expect(screen.getByText('protagonist')).toBeInTheDocument();
    });

    it('should add tag to entity', async () => {
      render(CharacterManager);

      // Edit entity
      const entityElement = screen.getByText('Hero');
      await fireEvent.click(entityElement);

      // Add tag
      const tagInput = screen.getByPlaceholderText(/Add tag/i);
      await fireEvent.input(tagInput, { target: { value: 'brave' } });
      await fireEvent.keyDown(tagInput, { key: 'Enter' });

      // Save entity
      const saveButton = screen.getByText(/Save/i);
      await fireEvent.click(saveButton);

      // Verify tag added
      const allEntities = get(entities);
      expect(allEntities[0].tags).toContain('brave');
      expect(allEntities[0].tags).toContain('protagonist');
    });

    it('should remove tag from entity', async () => {
      render(CharacterManager);

      // Edit entity
      const entityElement = screen.getByText('Hero');
      await fireEvent.click(entityElement);

      // Remove tag
      const removeTagButton = screen.getByRole('button', { name: /remove.*protagonist/i });
      await fireEvent.click(removeTagButton);

      // Save entity
      const saveButton = screen.getByText(/Save/i);
      await fireEvent.click(saveButton);

      // Verify tag removed
      const allEntities = get(entities);
      expect(allEntities[0].tags).not.toContain('protagonist');
    });
  });

  describe('Entity Counts', () => {
    it('should show counts for each entity type', () => {
      // Add entities of different types
      characterStore.addEntity({
        name: 'Char1',
        type: 'character',
        description: '',
        tags: [],
        attributes: []
      });
      characterStore.addEntity({
        name: 'Char2',
        type: 'character',
        description: '',
        tags: [],
        attributes: []
      });
      characterStore.addEntity({
        name: 'Loc1',
        type: 'location',
        description: '',
        tags: [],
        attributes: []
      });

      render(CharacterManager);

      // Check counts are displayed
      expect(screen.getByText(/Characters.*2/i)).toBeInTheDocument();
      expect(screen.getByText(/Locations.*1/i)).toBeInTheDocument();
    });
  });
});
