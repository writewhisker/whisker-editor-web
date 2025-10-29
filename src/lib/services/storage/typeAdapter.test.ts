/**
 * Tests for Type Adapter
 *
 * Ensures proper serialization and deserialization of Story data
 */

import { describe, it, expect } from 'vitest';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Choice } from '../../models/Choice';
import { Variable } from '../../models/Variable';
import type { SerializedStory } from './types';

describe('typeAdapter', () => {
  describe('Story serialization', () => {
    it('should serialize story with new fields (size, metadata)', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Test Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
      });

      // Add a passage with size and metadata
      const passage = new Passage({
        title: 'Test Passage',
        content: 'Content',
        position: { x: 0, y: 0 },
        size: { width: 300, height: 250 },
      });
      passage.setMetadata('key1', 'value1');
      passage.setMetadata('key2', 42);
      story.addPassage(passage);

      const serialized = story.serialize();

      // Check passage size is included
      expect(serialized.passages[passage.id].size).toEqual({ width: 300, height: 250 });

      // Check passage metadata is included
      expect(serialized.passages[passage.id].metadata).toEqual({
        key1: 'value1',
        key2: 42,
      });
    });

    it('should serialize story with stylesheets', () => {
      const story = new Story({
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
      });

      story.addStylesheet('body { color: red; }');
      story.addStylesheet('h1 { font-size: 24px; }');

      const serialized = story.serialize();

      expect(serialized.stylesheets).toEqual([
        'body { color: red; }',
        'h1 { font-size: 24px; }',
      ]);
    });

    it('should serialize story with scripts', () => {
      const story = new Story({
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
      });

      story.addScript('function init() { console.log("init"); }');
      story.addScript('function update() { console.log("update"); }');

      const serialized = story.serialize();

      expect(serialized.scripts).toEqual([
        'function init() { console.log("init"); }',
        'function update() { console.log("update"); }',
      ]);
    });

    it('should serialize story with assets', () => {
      const story = new Story({
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
      });

      story.addAsset({
        id: 'asset1',
        name: 'Test Image',
        type: 'image',
        path: 'path/to/image.png',
        mimeType: 'image/png',
        size: 1024,
      });

      story.addAsset({
        id: 'asset2',
        name: 'Test Audio',
        type: 'audio',
        path: 'path/to/audio.mp3',
        mimeType: 'audio/mp3',
      });

      const serialized = story.serialize();

      expect(serialized.assets).toHaveLength(2);
      expect(serialized.assets).toContainEqual({
        id: 'asset1',
        name: 'Test Image',
        path: 'path/to/image.png',
        mimeType: 'image/png',
        size: 1024,
      });
      expect(serialized.assets).toContainEqual({
        id: 'asset2',
        name: 'Test Audio',
        path: 'path/to/audio.mp3',
        mimeType: 'audio/mp3',
      });
    });

    it('should serialize choice metadata', () => {
      const story = new Story({
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
      });

      const passage = new Passage({
        title: 'Test',
        content: 'Content',
        position: { x: 0, y: 0 },
      });

      // Add a choice first
      const choice = new Choice({ text: 'Option', target: 'somewhere' });
      choice.setMetadata('priority', 'high');
      choice.setMetadata('cost', 10);
      passage.addChoice(choice);
      story.addPassage(passage);

      const serialized = story.serialize();
      const serializedPassage = serialized.passages[passage.id];

      expect(serializedPassage.choices[0].metadata).toEqual({
        priority: 'high',
        cost: 10,
      });
    });
  });

  describe('Story deserialization', () => {
    it('should deserialize story with size and metadata', () => {
      const data: any = {
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
        startPassage: 'passage1',
        passages: {
          passage1: {
            id: 'passage1',
            title: 'Test Passage',
            content: 'Content',
            position: { x: 0, y: 0 },
            size: { width: 400, height: 300 },
            metadata: { key1: 'value1', key2: 99 },
            choices: [],
          },
        },
        variables: {},
      };

      const story = Story.deserialize(data);
      const passage = story.getPassage('passage1');

      expect(passage?.size).toEqual({ width: 400, height: 300 });
      expect(passage?.metadata).toEqual({ key1: 'value1', key2: 99 });
    });

    it('should deserialize story with stylesheets', () => {
      const data: any = {
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
        startPassage: 'start',
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Content',
            position: { x: 0, y: 0 },
            choices: [],
          },
        },
        variables: {},
        stylesheets: ['css1', 'css2'],
      };

      const story = Story.deserialize(data);

      expect(story.stylesheets).toEqual(['css1', 'css2']);
    });

    it('should deserialize story with scripts', () => {
      const data: any = {
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
        startPassage: 'start',
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Content',
            position: { x: 0, y: 0 },
            choices: [],
          },
        },
        variables: {},
        scripts: ['script1', 'script2'],
      };

      const story = Story.deserialize(data);

      expect(story.scripts).toEqual(['script1', 'script2']);
    });

    it('should deserialize story with assets', () => {
      const data: any = {
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
        startPassage: 'start',
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Content',
            position: { x: 0, y: 0 },
            choices: [],
          },
        },
        variables: {},
        assets: [
          {
            id: 'asset1',
            name: 'Asset 1',
            path: 'path1',
            mimeType: 'image/png',
          },
          {
            id: 'asset2',
            name: 'Asset 2',
            path: 'path2',
            mimeType: 'audio/mp3',
          },
        ],
      };

      const story = Story.deserialize(data);

      expect(story.assets.size).toBe(2);
      expect(story.getAsset('asset1')).toEqual({
        id: 'asset1',
        name: 'Asset 1',
        path: 'path1',
        mimeType: 'image/png',
      });
      expect(story.getAsset('asset2')).toEqual({
        id: 'asset2',
        name: 'Asset 2',
        path: 'path2',
        mimeType: 'audio/mp3',
      });
    });

    it('should deserialize choice metadata', () => {
      const data: any = {
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
        startPassage: 'passage1',
        passages: {
          passage1: {
            id: 'passage1',
            title: 'Test',
            content: 'Content',
            position: { x: 0, y: 0 },
            choices: [
              {
                id: 'choice1',
                text: 'Option',
                target: 'passage2',
                metadata: { priority: 'low', hidden: false },
              },
            ],
          },
        },
        variables: {},
      };

      const story = Story.deserialize(data);
      const passage = story.getPassage('passage1');

      expect(passage?.choices[0].metadata).toEqual({
        priority: 'low',
        hidden: false,
      });
    });
  });

  describe('Round-trip serialization', () => {
    it('should preserve all new fields through round-trip', () => {
      // Create a story with all new features
      const original = new Story({
        metadata: {
          title: 'Round Trip Test',
          author: 'Tester',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
        },
      });

      // Add passage with size and metadata
      const passage = new Passage({
        title: 'Test Passage',
        content: 'Content',
        position: { x: 100, y: 200 },
        size: { width: 350, height: 275 },
      });
      passage.setMetadata('author', 'John Doe');
      passage.setMetadata('difficulty', 5);

      // Add a choice with metadata
      const choice = new Choice({ text: 'Continue', target: 'next' });
      choice.setMetadata('recommended', true);
      passage.addChoice(choice);

      original.addPassage(passage);

      // Add stylesheets, scripts, and assets
      original.addStylesheet('body { margin: 0; }');
      original.addScript('console.log("test");');
      original.addAsset({
        id: 'img1',
        name: 'Image',
        type: 'image',
        path: 'img.png',
        mimeType: 'image/png',
        size: 2048,
      });

      // Serialize
      const serialized = original.serialize();

      // Deserialize
      const restored = Story.deserialize(serialized);

      // Verify passage size
      const restoredPassage = restored.getPassage(passage.id);
      expect(restoredPassage?.size).toEqual({ width: 350, height: 275 });

      // Verify passage metadata
      expect(restoredPassage?.getMetadata('author')).toBe('John Doe');
      expect(restoredPassage?.getMetadata('difficulty')).toBe(5);

      // Verify choice metadata
      expect(restoredPassage?.choices[0].getMetadata('recommended')).toBe(true);

      // Verify stylesheets
      expect(restored.stylesheets).toEqual(['body { margin: 0; }']);

      // Verify scripts
      expect(restored.scripts).toEqual(['console.log("test");']);

      // Verify assets
      expect(restored.getAsset('img1')).toEqual({
        id: 'img1',
        name: 'Image',
        path: 'img.png',
        mimeType: 'image/png',
        size: 2048,
      });
    });
  });
});
