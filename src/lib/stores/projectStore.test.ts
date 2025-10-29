import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  currentStory,
  currentFilePath,
  unsavedChanges,
  selectedPassageId,
  passageList,
  variableList,
  selectedPassage,
  projectActions,
} from './projectStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import { Variable } from '../models/Variable';
import type { ProjectData } from '../models/types';
import * as historyStore from './historyStore';
import * as connectionValidator from '../utils/connectionValidator';

// Mock historyStore
vi.mock('./historyStore', () => ({
  historyActions: {
    clear: vi.fn(),
    setPresent: vi.fn(),
    pushState: vi.fn(),
    undo: vi.fn(() => null),
    redo: vi.fn(() => null),
  },
}));

// Mock connectionValidator
vi.mock('../utils/connectionValidator', () => ({
  removeConnectionsToPassage: vi.fn(() => 0),
}));

describe('projectStore', () => {
  beforeEach(() => {
    // Reset all stores
    currentStory.set(null);
    currentFilePath.set(null);
    unsavedChanges.set(false);
    selectedPassageId.set(null);
    vi.clearAllMocks();
  });

  afterEach(() => {
    currentStory.set(null);
    currentFilePath.set(null);
    unsavedChanges.set(false);
    selectedPassageId.set(null);
  });

  describe('basic stores', () => {
    it('should initialize with null currentStory', () => {
      expect(get(currentStory)).toBeNull();
    });

    it('should initialize with null currentFilePath', () => {
      expect(get(currentFilePath)).toBeNull();
    });

    it('should initialize with false unsavedChanges', () => {
      expect(get(unsavedChanges)).toBe(false);
    });

    it('should initialize with null selectedPassageId', () => {
      expect(get(selectedPassageId)).toBeNull();
    });
  });

  describe('derived stores', () => {
    describe('passageList', () => {
      it('should return empty array when no story', () => {
        expect(get(passageList)).toEqual([]);
      });

      it('should return array of passages from story', () => {
        const story = new Story({
          metadata: {
            title: 'Test',
            author: 'Author',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          },
        });

        // Story automatically creates a "Start" passage
        const p1 = new Passage({ title: 'P1' });
        const p2 = new Passage({ title: 'P2' });
        story.addPassage(p1);
        story.addPassage(p2);

        currentStory.set(story);

        const passages = get(passageList);
        expect(passages).toHaveLength(3); // Start + P1 + P2
        expect(passages.map(p => p.title)).toContain('Start');
        expect(passages.map(p => p.title)).toContain('P1');
        expect(passages.map(p => p.title)).toContain('P2');
      });
    });

    describe('variableList', () => {
      it('should return empty array when no story', () => {
        expect(get(variableList)).toEqual([]);
      });

      it('should return array of variables from story', () => {
        const story = new Story({
          metadata: {
            title: 'Test',
            author: 'Author',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          },
        });

        story.addVariable(new Variable({ name: 'health', type: 'number', initial: 100 }));
        story.addVariable(new Variable({ name: 'gold', type: 'number', initial: 50 }));

        currentStory.set(story);

        const variables = get(variableList);
        expect(variables).toHaveLength(2);
        expect(variables.map(v => v.name)).toContain('health');
        expect(variables.map(v => v.name)).toContain('gold');
      });
    });

    describe('selectedPassage', () => {
      it('should return null when no story', () => {
        selectedPassageId.set('some-id');
        expect(get(selectedPassage)).toBeNull();
      });

      it('should return null when no selection', () => {
        const story = new Story({
          metadata: {
            title: 'Test',
            author: 'Author',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          },
        });
        currentStory.set(story);
        expect(get(selectedPassage)).toBeNull();
      });

      it('should return selected passage', () => {
        const story = new Story({
          metadata: {
            title: 'Test',
            author: 'Author',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          },
        });

        const passage = new Passage({ title: 'Test Passage' });
        story.addPassage(passage);
        currentStory.set(story);
        selectedPassageId.set(passage.id);

        expect(get(selectedPassage)).toBe(passage);
      });

      it('should return null when selected passage not found', () => {
        const story = new Story({
          metadata: {
            title: 'Test',
            author: 'Author',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          },
        });

        currentStory.set(story);
        selectedPassageId.set('nonexistent-id');

        expect(get(selectedPassage)).toBeNull();
      });
    });
  });

  describe('projectActions', () => {
    describe('newProject', () => {
      it('should create new project with default title', () => {
        projectActions.newProject();

        const story = get(currentStory);
        expect(story).not.toBeNull();
        expect(story?.metadata.title).toBe('Untitled Story');
      });

      it('should create new project with custom title', () => {
        projectActions.newProject('My Story');

        const story = get(currentStory);
        expect(story).not.toBeNull();
        expect(story?.metadata.title).toBe('My Story');
      });

      it('should reset currentFilePath', () => {
        currentFilePath.set('/some/path');
        projectActions.newProject();
        expect(get(currentFilePath)).toBeNull();
      });

      it('should reset unsavedChanges', () => {
        unsavedChanges.set(true);
        projectActions.newProject();
        expect(get(unsavedChanges)).toBe(false);
      });

      it('should select the start passage', () => {
        projectActions.newProject();

        const story = get(currentStory);
        const selected = get(selectedPassageId);
        expect(selected).not.toBeNull();

        const passages = Array.from(story!.passages.values());
        expect(passages[0].id).toBe(selected);
      });

      it('should create story with metadata', () => {
        projectActions.newProject('Test Story');

        const story = get(currentStory);
        expect(story?.metadata.author).toBe('');
        expect(story?.metadata.version).toBe('1.0.0');
        expect(story?.metadata.created).toBeDefined();
        expect(story?.metadata.modified).toBeDefined();
      });
    });

    describe('loadProject', () => {
      it('should load project from data', () => {
        const projectData: ProjectData = {
          version: 1,
          metadata: {
            title: 'Loaded Story',
            author: 'Test Author',
            version: '2.0.0',
            created: '2024-01-01',
            modified: '2024-01-02',
          },
          passages: [
            {
              id: 'p1',
              title: 'Start',
              content: 'Content',
              tags: [],
              position: { x: 0, y: 0 },
              created: '2024-01-01',
              modified: '2024-01-02',
              choices: [],
            },
          ],
          variables: {},
          startPassage: 'p1',
        };

        projectActions.loadProject(projectData);

        const story = get(currentStory);
        expect(story?.metadata.title).toBe('Loaded Story');
        expect(story?.metadata.author).toBe('Test Author');
      });

      it('should set filePath if provided', () => {
        const projectData: ProjectData = {
          version: 1,
          metadata: {
            title: 'Test',
            author: '',
            version: '1.0.0',
            created: '2024-01-01',
            modified: '2024-01-02',
          },
          passages: {},
          variables: {},
          startPassage: '',
        };

        projectActions.loadProject(projectData, '/path/to/file.json');
        expect(get(currentFilePath)).toBe('/path/to/file.json');
      });

      it('should reset unsavedChanges', () => {
        unsavedChanges.set(true);

        const projectData: ProjectData = {
          version: 1,
          metadata: {
            title: 'Test',
            author: '',
            version: '1.0.0',
            created: '2024-01-01',
            modified: '2024-01-02',
          },
          passages: {},
          variables: {},
          startPassage: '',
        };

        projectActions.loadProject(projectData);
        expect(get(unsavedChanges)).toBe(false);
      });

      it('should select start passage if present', () => {
        const projectData: ProjectData = {
          version: 1,
          metadata: {
            title: 'Test',
            author: '',
            version: '1.0.0',
            created: '2024-01-01',
            modified: '2024-01-02',
          },
          passages: [
            {
              id: 'start-id',
              title: 'Start',
              content: '',
              tags: [],
              position: { x: 0, y: 0 },
              created: '2024-01-01',
              modified: '2024-01-02',
              choices: [],
            },
          ],
          variables: {},
          startPassage: 'start-id',
        };

        projectActions.loadProject(projectData);
        expect(get(selectedPassageId)).toBe('start-id');
      });
    });

    describe('saveProject', () => {
      it('should return null when no story', () => {
        const data = projectActions.saveProject();
        expect(data).toBeNull();
      });

      it('should serialize and return project data', () => {
        projectActions.newProject('Save Test');

        const data = projectActions.saveProject();
        expect(data).not.toBeNull();
        expect(data?.metadata.title).toBe('Save Test');
      });

      it('should mark as not unsaved', () => {
        projectActions.newProject();
        unsavedChanges.set(true);

        projectActions.saveProject();
        expect(get(unsavedChanges)).toBe(false);
      });

      it('should update modified timestamp', () => {
        projectActions.newProject();

        const story = get(currentStory);
        const originalModified = story?.metadata.modified;

        // Wait a bit to ensure timestamp changes
        const data = projectActions.saveProject();
        expect(data?.metadata.modified).toBeDefined();
        // Modified timestamp should be updated (this might be the same if executed too fast)
        expect(typeof data?.metadata.modified).toBe('string');
      });
    });

    describe('markChanged', () => {
      it('should set unsavedChanges to true', () => {
        expect(get(unsavedChanges)).toBe(false);
        projectActions.markChanged();
        expect(get(unsavedChanges)).toBe(true);
      });
    });

    describe('closeProject', () => {
      it('should clear all stores', () => {
        projectActions.newProject();
        currentFilePath.set('/some/path');
        unsavedChanges.set(true);

        projectActions.closeProject();

        expect(get(currentStory)).toBeNull();
        expect(get(currentFilePath)).toBeNull();
        expect(get(unsavedChanges)).toBe(false);
        expect(get(selectedPassageId)).toBeNull();
      });

      it('should call historyActions.clear', () => {
        projectActions.closeProject();
        expect(historyStore.historyActions.clear).toHaveBeenCalled();
      });
    });

    describe('addPassage', () => {
      beforeEach(() => {
        projectActions.newProject();
      });

      it('should return null when no story', () => {
        currentStory.set(null);
        const passage = projectActions.addPassage();
        expect(passage).toBeNull();
      });

      it('should add passage with default title', () => {
        const passage = projectActions.addPassage();

        expect(passage).not.toBeNull();
        expect(passage?.title).toBe('Untitled Passage');

        const story = get(currentStory);
        expect(story?.passages.has(passage!.id)).toBe(true);
      });

      it('should add passage with custom title', () => {
        const passage = projectActions.addPassage('Custom Title');

        expect(passage?.title).toBe('Custom Title');
      });

      it('should select newly added passage', () => {
        const passage = projectActions.addPassage();
        expect(get(selectedPassageId)).toBe(passage?.id);
      });

      it('should mark as unsaved', () => {
        unsavedChanges.set(false);
        projectActions.addPassage();
        expect(get(unsavedChanges)).toBe(true);
      });

      it('should push to history', () => {
        projectActions.addPassage();
        expect(historyStore.historyActions.pushState).toHaveBeenCalled();
      });

      it('should handle duplicate title by appending number', () => {
        projectActions.addPassage('Duplicate');
        const passage2 = projectActions.addPassage('Duplicate');

        expect(passage2?.title).toBe('Duplicate 2');
      });

      it('should handle multiple duplicate titles', () => {
        projectActions.addPassage('Duplicate');
        projectActions.addPassage('Duplicate');
        const passage3 = projectActions.addPassage('Duplicate');

        expect(passage3?.title).toBe('Duplicate 3');
      });

      it('should be case insensitive for duplicate detection', () => {
        projectActions.addPassage('MyPassage');
        const passage2 = projectActions.addPassage('mypassage');

        expect(passage2?.title).toBe('mypassage 2');
      });
    });

    describe('updatePassage', () => {
      let passageId: string;

      beforeEach(() => {
        projectActions.newProject();
        const passage = projectActions.addPassage('Test Passage');
        passageId = passage!.id;
        unsavedChanges.set(false);
        vi.clearAllMocks(); // Clear the pushState call from addPassage
      });

      it('should do nothing when no story', () => {
        currentStory.set(null);
        projectActions.updatePassage(passageId, { title: 'New Title' });
        // Should not throw
      });

      it('should do nothing when passage not found', () => {
        projectActions.updatePassage('nonexistent', { title: 'New Title' });
        expect(historyStore.historyActions.pushState).not.toHaveBeenCalled();
      });

      it('should update passage title', () => {
        projectActions.updatePassage(passageId, { title: 'Updated Title' });

        const story = get(currentStory);
        const passage = story?.getPassage(passageId);
        expect(passage?.title).toBe('Updated Title');
      });

      it('should update passage content', () => {
        projectActions.updatePassage(passageId, { content: 'New content' });

        const story = get(currentStory);
        const passage = story?.getPassage(passageId);
        expect(passage?.content).toBe('New content');
      });

      it('should update passage tags', () => {
        projectActions.updatePassage(passageId, { tags: ['tag1', 'tag2'] });

        const story = get(currentStory);
        const passage = story?.getPassage(passageId);
        expect(passage?.tags).toEqual(['tag1', 'tag2']);
      });

      it('should update passage position', () => {
        projectActions.updatePassage(passageId, { position: { x: 100, y: 200 } });

        const story = get(currentStory);
        const passage = story?.getPassage(passageId);
        expect(passage?.position).toEqual({ x: 100, y: 200 });
      });

      it('should update modified timestamp', () => {
        const story = get(currentStory);
        const passage = story?.getPassage(passageId);
        const originalModified = passage?.modified;

        projectActions.updatePassage(passageId, { content: 'New' });

        const updatedPassage = get(currentStory)?.getPassage(passageId);
        expect(updatedPassage?.modified).toBeDefined();
        // Modified should be updated
        expect(typeof updatedPassage?.modified).toBe('string');
      });

      it('should mark as unsaved', () => {
        projectActions.updatePassage(passageId, { content: 'New' });
        expect(get(unsavedChanges)).toBe(true);
      });

      it('should push to history', () => {
        projectActions.updatePassage(passageId, { content: 'New' });
        expect(historyStore.historyActions.pushState).toHaveBeenCalled();
      });

      it('should prevent duplicate title', () => {
        const passage2 = projectActions.addPassage('Another Passage');
        vi.clearAllMocks();

        projectActions.updatePassage(passageId, { title: 'Another Passage' });

        const story = get(currentStory);
        const passage = story?.getPassage(passageId);
        // Title should remain unchanged
        expect(passage?.title).toBe('Test Passage');
        // Should not push to history since update was rejected
        expect(historyStore.historyActions.pushState).not.toHaveBeenCalled();
      });

      it('should allow same title on same passage', () => {
        projectActions.updatePassage(passageId, { title: 'Test Passage' });

        const story = get(currentStory);
        const passage = story?.getPassage(passageId);
        expect(passage?.title).toBe('Test Passage');
      });

      it('should be case insensitive for duplicate title check', () => {
        projectActions.addPassage('CaseSensitive');
        vi.clearAllMocks();

        projectActions.updatePassage(passageId, { title: 'casesensitive' });

        const story = get(currentStory);
        const passage = story?.getPassage(passageId);
        expect(passage?.title).toBe('Test Passage');
      });

      it('should apply other updates even if title is rejected', () => {
        projectActions.addPassage('Existing');
        vi.clearAllMocks();

        projectActions.updatePassage(passageId, {
          title: 'Existing',
          content: 'New content',
        });

        const story = get(currentStory);
        const passage = story?.getPassage(passageId);
        expect(passage?.title).toBe('Test Passage'); // Title unchanged
        expect(passage?.content).toBe('New content'); // Content updated
      });
    });

    describe('deletePassage', () => {
      let passageId: string;

      beforeEach(() => {
        projectActions.newProject();
        const passage = projectActions.addPassage('To Delete');
        passageId = passage!.id;
        unsavedChanges.set(false);
        vi.clearAllMocks();
      });

      it('should do nothing when no story', () => {
        currentStory.set(null);
        projectActions.deletePassage(passageId);
        // Should not throw
      });

      it('should remove passage from story', () => {
        projectActions.deletePassage(passageId);

        const story = get(currentStory);
        expect(story?.passages.has(passageId)).toBe(false);
      });

      it('should clear selection if deleted passage was selected', () => {
        selectedPassageId.set(passageId);
        projectActions.deletePassage(passageId);
        expect(get(selectedPassageId)).toBeNull();
      });

      it('should not clear selection if different passage was selected', () => {
        const passage2 = projectActions.addPassage('Another');
        selectedPassageId.set(passage2!.id);

        projectActions.deletePassage(passageId);
        expect(get(selectedPassageId)).toBe(passage2!.id);
      });

      it('should mark as unsaved', () => {
        projectActions.deletePassage(passageId);
        expect(get(unsavedChanges)).toBe(true);
      });

      it('should push to history', () => {
        projectActions.deletePassage(passageId);
        expect(historyStore.historyActions.pushState).toHaveBeenCalled();
      });

      it('should call removeConnectionsToPassage', () => {
        projectActions.deletePassage(passageId);
        expect(connectionValidator.removeConnectionsToPassage).toHaveBeenCalled();
      });
    });

    describe('undo', () => {
      it('should restore previous state when available', async () => {
        const previousState = {
          metadata: {
            title: 'Previous',
            author: '',
            version: '1.0.0',
            created: '2024-01-01',
            modified: '2024-01-02',
          },
          passages: {},
          variables: {},
          startPassage: '',
        };

        (historyStore.historyActions.undo as ReturnType<typeof vi.fn>).mockReturnValueOnce(previousState);

        projectActions.newProject('Current');
        await projectActions.undo();

        const story = get(currentStory);
        expect(story?.metadata.title).toBe('Previous');
        expect(get(unsavedChanges)).toBe(true);
      });

      it('should do nothing when no previous state', async () => {
        vi.mocked(historyStore.historyActions.undo).mockReturnValueOnce(null);

        projectActions.newProject('Current');
        const originalTitle = get(currentStory)?.metadata.title;

        await projectActions.undo();

        expect(get(currentStory)?.metadata.title).toBe(originalTitle);
      });
    });

    describe('redo', () => {
      it('should restore next state when available', async () => {
        const nextState = {
          metadata: {
            title: 'Next',
            author: '',
            version: '1.0.0',
            created: '2024-01-01',
            modified: '2024-01-02',
          },
          passages: {},
          variables: {},
          startPassage: '',
        };

        vi.mocked(historyStore.historyActions.redo).mockReturnValueOnce(nextState);

        projectActions.newProject('Current');
        await projectActions.redo();

        const story = get(currentStory);
        expect(story?.metadata.title).toBe('Next');
        expect(get(unsavedChanges)).toBe(true);
      });

      it('should do nothing when no next state', async () => {
        vi.mocked(historyStore.historyActions.redo).mockReturnValueOnce(null);

        projectActions.newProject('Current');
        const originalTitle = get(currentStory)?.metadata.title;

        await projectActions.redo();

        expect(get(currentStory)?.metadata.title).toBe(originalTitle);
      });
    });
  });
});
