/**
 * Tests for Whisker Core Adapter
 */

import { describe, it, expect } from 'vitest';
import {
  generateIfid,
  toWhiskerCoreFormat,
  fromWhiskerCoreFormat,
  isWhiskerCoreFormat,
  isEditorFormat,
  importWhiskerFile
} from './whiskerCoreAdapter';
import type { StoryData, WhiskerCoreFormat } from '../models/types';

describe('whiskerCoreAdapter', () => {
  describe('generateIfid', () => {
    it('should generate a valid UUID', () => {
      const ifid = generateIfid();
      expect(ifid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const ifid1 = generateIfid();
      const ifid2 = generateIfid();
      expect(ifid1).not.toBe(ifid2);
    });
  });

  describe('toWhiskerCoreFormat', () => {
    const editorData: StoryData = {
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: '2025-01-01T00:00:00.000Z',
        modified: '2025-01-01T00:00:00.000Z',
        ifid: '12345678-1234-4234-8234-123456789012'
      },
      startPassage: 'passage1',
      passages: {
        passage1: {
          id: 'passage1',
          title: 'Start',
          content: 'Welcome!',
          position: { x: 0, y: 0 },
          choices: [
            {
              id: 'choice1',
              text: 'Continue',
              target: 'passage2',
              condition: 'health > 0'
            }
          ],
          onEnterScript: 'console.log("entered")',
          color: '#ff0000'
        },
        passage2: {
          id: 'passage2',
          title: 'Next',
          content: 'Next scene',
          position: { x: 100, y: 100 },
          choices: []
        }
      },
      variables: {
        health: {
          name: 'health',
          type: 'number',
          initial: 100
        },
        name: {
          name: 'name',
          type: 'string',
          initial: 'Hero'
        }
      }
    };

    it('should convert to whisker-core format', () => {
      const coreData = toWhiskerCoreFormat(editorData, { formatVersion: '1.0' });

      expect(coreData.format).toBe('whisker');
      expect(coreData.formatVersion).toBe('1.0');
      expect(coreData.metadata.ifid).toBe('12345678-1234-4234-8234-123456789012');
      expect(coreData.settings.startPassage).toBe('passage1');
      expect(coreData.settings.scriptingLanguage).toBe('lua');
      expect(Array.isArray(coreData.passages)).toBe(true);
      expect(coreData.passages).toHaveLength(2);
      expect(coreData.variables).toEqual({
        health: 100,
        name: 'Hero'
      });
    });

    it('should strip extensions when requested', () => {
      const coreData = toWhiskerCoreFormat(editorData, { stripExtensions: true, formatVersion: '1.0' });

      const passage1 = coreData.passages.find(p => p.id === 'passage1');
      expect(passage1).toBeDefined();
      expect(passage1?.onEnterScript).toBeUndefined();
      expect(passage1?.color).toBeUndefined();
    });

    it('should preserve extensions when not stripping', () => {
      const coreData = toWhiskerCoreFormat(editorData, { stripExtensions: false });

      const passage1 = coreData.passages.find(p => p.id === 'passage1');
      expect(passage1?.onEnterScript).toBe('console.log("entered")');
      expect(passage1?.color).toBe('#ff0000');
    });

    it('should support format version 2.0', () => {
      const coreData = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });
      expect(coreData.formatVersion).toBe('2.0');
    });

    it('should convert variables to typed format in v2.0', () => {
      const coreData = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });

      expect(coreData.formatVersion).toBe('2.0');
      expect(coreData.variables.health).toEqual({
        type: 'number',
        default: 100
      });
      expect(coreData.variables.name).toEqual({
        type: 'string',
        default: 'Hero'
      });
    });

    it('should convert variables to simple format in v1.0', () => {
      const coreData = toWhiskerCoreFormat(editorData, { formatVersion: '1.0' });

      expect(coreData.formatVersion).toBe('1.0');
      expect(coreData.variables).toEqual({
        health: 100,
        name: 'Hero'
      });
    });

    it('should default to v2.0 format when version not specified', () => {
      const coreData = toWhiskerCoreFormat(editorData);

      expect(coreData.formatVersion).toBe('2.0');
      expect(coreData.variables.health).toEqual({
        type: 'number',
        default: 100
      });
    });

    it('should generate ifid if missing', () => {
      const dataWithoutIfid = {
        ...editorData,
        metadata: { ...editorData.metadata, ifid: undefined }
      };

      const coreData = toWhiskerCoreFormat(dataWithoutIfid);
      expect(coreData.metadata.ifid).toBeDefined();
      expect(coreData.metadata.ifid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('fromWhiskerCoreFormat', () => {
    const coreData: WhiskerCoreFormat = {
      format: 'whisker',
      formatVersion: '1.0',
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: '2025-01-01T00:00:00.000Z',
        modified: '2025-01-01T00:00:00.000Z',
        ifid: '12345678-1234-4234-8234-123456789012'
      },
      settings: {
        startPassage: 'passage1',
        scriptingLanguage: 'lua'
      },
      passages: [
        {
          id: 'passage1',
          title: 'Start',
          content: 'Welcome!',
          position: { x: 0, y: 0 },
          choices: [
            {
              id: 'choice1',
              text: 'Continue',
              target: 'passage2'
            }
          ]
        },
        {
          id: 'passage2',
          title: 'Next',
          content: 'Next scene',
          position: { x: 100, y: 100 },
          choices: []
        }
      ],
      variables: {
        health: 100,
        name: 'Hero',
        isDead: false
      }
    };

    it('should convert from whisker-core format', () => {
      const editorData = fromWhiskerCoreFormat(coreData);

      expect(editorData.metadata.title).toBe('Test Story');
      expect(editorData.metadata.ifid).toBe('12345678-1234-4234-8234-123456789012');
      expect(editorData.startPassage).toBe('passage1');
      expect(editorData.passages).toHaveProperty('passage1');
      expect(editorData.passages).toHaveProperty('passage2');
    });

    it('should infer variable types correctly', () => {
      const editorData = fromWhiskerCoreFormat(coreData);

      expect(editorData.variables.health).toEqual({
        name: 'health',
        type: 'number',
        initial: 100
      });

      expect(editorData.variables.name).toEqual({
        name: 'name',
        type: 'string',
        initial: 'Hero'
      });

      expect(editorData.variables.isDead).toEqual({
        name: 'isDead',
        type: 'boolean',
        initial: false
      });
    });

    it('should convert passages array to Record', () => {
      const editorData = fromWhiskerCoreFormat(coreData);

      expect(typeof editorData.passages).toBe('object');
      expect(Array.isArray(editorData.passages)).toBe(false);
      expect(Object.keys(editorData.passages)).toHaveLength(2);
    });

    it('should handle v2.0 typed variable format', () => {
      const coreDataV2: WhiskerCoreFormat = {
        ...coreData,
        formatVersion: '2.0',
        variables: {
          health: { type: 'number', default: 100 },
          name: { type: 'string', default: 'Hero' },
          isDead: { type: 'boolean', default: false }
        }
      };

      const editorData = fromWhiskerCoreFormat(coreDataV2);

      expect(editorData.variables.health).toEqual({
        name: 'health',
        type: 'number',
        initial: 100
      });

      expect(editorData.variables.name).toEqual({
        name: 'name',
        type: 'string',
        initial: 'Hero'
      });

      expect(editorData.variables.isDead).toEqual({
        name: 'isDead',
        type: 'boolean',
        initial: false
      });
    });

    it('should handle mixed variable formats (migration scenario)', () => {
      const mixedData: WhiskerCoreFormat = {
        ...coreData,
        formatVersion: '2.0',
        variables: {
          // Typed format
          health: { type: 'number', default: 100 },
          // Simple format (legacy)
          score: 0,
          name: 'Player'
        }
      };

      const editorData = fromWhiskerCoreFormat(mixedData);

      // Typed variable should work
      expect(editorData.variables.health).toEqual({
        name: 'health',
        type: 'number',
        initial: 100
      });

      // Simple variables should be inferred
      expect(editorData.variables.score).toEqual({
        name: 'score',
        type: 'number',
        initial: 0
      });

      expect(editorData.variables.name).toEqual({
        name: 'name',
        type: 'string',
        initial: 'Player'
      });
    });
  });

  describe('isWhiskerCoreFormat', () => {
    it('should detect whisker-core format', () => {
      const coreData = {
        format: 'whisker',
        formatVersion: '1.0',
        metadata: {},
        settings: {},
        passages: [],
        variables: {}
      };

      expect(isWhiskerCoreFormat(coreData)).toBe(true);
    });

    it('should reject non-array passages', () => {
      const invalidData = {
        format: 'whisker',
        formatVersion: '1.0',
        passages: {}  // Object instead of array
      };

      expect(isWhiskerCoreFormat(invalidData)).toBe(false);
    });

    it('should reject missing format field', () => {
      const invalidData = {
        formatVersion: '1.0',
        passages: []
      };

      expect(isWhiskerCoreFormat(invalidData)).toBe(false);
    });

    it('should reject invalid format version', () => {
      const invalidData = {
        format: 'whisker',
        formatVersion: '3.0',  // Invalid version
        passages: []
      };

      expect(isWhiskerCoreFormat(invalidData)).toBe(false);
    });
  });

  describe('isEditorFormat', () => {
    it('should detect editor format', () => {
      const editorData = {
        metadata: { title: 'Test' },
        startPassage: 'start',
        passages: { start: {} },
        variables: {}
      };

      expect(isEditorFormat(editorData)).toBe(true);
    });

    it('should reject array passages', () => {
      const invalidData = {
        metadata: {},
        startPassage: 'start',
        passages: [],  // Array instead of Record
        variables: {}
      };

      expect(isEditorFormat(invalidData)).toBe(false);
    });

    it('should reject missing metadata', () => {
      const invalidData = {
        startPassage: 'start',
        passages: {},
        variables: {}
      };

      expect(isEditorFormat(invalidData)).toBeFalsy();
    });
  });

  describe('importWhiskerFile', () => {
    it('should import whisker-core format', () => {
      const coreData = {
        format: 'whisker',
        formatVersion: '1.0',
        metadata: { title: 'Test' },
        settings: { startPassage: 'start' },
        passages: [
          {
            id: 'start',
            title: 'Start',
            content: 'Begin',
            position: { x: 0, y: 0 },
            choices: []
          }
        ],
        variables: { health: 100 }
      };

      const result = importWhiskerFile(coreData);
      expect(result.metadata.title).toBe('Test');
      expect(result.startPassage).toBe('start');
    });

    it('should import editor format', () => {
      const editorData = {
        metadata: { title: 'Test' },
        startPassage: 'start',
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Begin',
            position: { x: 0, y: 0 },
            choices: []
          }
        },
        variables: {}
      };

      const result = importWhiskerFile(editorData);
      expect(result).toEqual(editorData);
    });

    it('should throw on unknown format', () => {
      const invalidData = {
        unknown: 'format'
      };

      expect(() => importWhiskerFile(invalidData)).toThrow('Unknown Whisker format');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through round-trip conversion', () => {
      const originalData: StoryData = {
        metadata: {
          title: 'Round Trip Test',
          author: 'Tester',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
          ifid: '12345678-1234-4234-8234-123456789012'
        },
        startPassage: 'start',
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Begin here',
            position: { x: 0, y: 0 },
            choices: []
          }
        },
        variables: {
          health: {
            name: 'health',
            type: 'number',
            initial: 100
          }
        }
      };

      // Convert to core and back
      const coreData = toWhiskerCoreFormat(originalData, { stripExtensions: true });
      const backToEditor = fromWhiskerCoreFormat(coreData);

      expect(backToEditor.metadata.title).toBe(originalData.metadata.title);
      expect(backToEditor.metadata.ifid).toBe(originalData.metadata.ifid);
      expect(backToEditor.startPassage).toBe(originalData.startPassage);
      expect(backToEditor.passages.start.title).toBe(originalData.passages.start.title);
      expect(backToEditor.variables.health.initial).toBe(originalData.variables.health.initial);
    });

    it('should preserve variable types through v2.0 round-trip', () => {
      const originalData: StoryData = {
        metadata: {
          title: 'Type Preservation Test',
          author: 'Tester',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
          ifid: '12345678-1234-4234-8234-123456789012'
        },
        startPassage: 'start',
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Test',
            position: { x: 0, y: 0 },
            choices: []
          }
        },
        variables: {
          health: { name: 'health', type: 'number', initial: 100 },
          name: { name: 'name', type: 'string', initial: 'Hero' },
          alive: { name: 'alive', type: 'boolean', initial: true }
        }
      };

      // Convert to v2.0 core format and back
      const coreData = toWhiskerCoreFormat(originalData, { formatVersion: '2.0' });
      const backToEditor = fromWhiskerCoreFormat(coreData);

      // Verify all variable types and values are preserved
      expect(backToEditor.variables.health).toEqual({
        name: 'health',
        type: 'number',
        initial: 100
      });

      expect(backToEditor.variables.name).toEqual({
        name: 'name',
        type: 'string',
        initial: 'Hero'
      });

      expect(backToEditor.variables.alive).toEqual({
        name: 'alive',
        type: 'boolean',
        initial: true
      });
    });

    it('should handle v1.0 to v2.0 migration in round-trip', () => {
      const v1Data: WhiskerCoreFormat = {
        format: 'whisker',
        formatVersion: '1.0',
        metadata: {
          title: 'Migration Test',
          author: 'Tester',
          version: '1.0.0',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
          ifid: '12345678-1234-4234-8234-123456789012'
        },
        settings: {
          startPassage: 'start',
          scriptingLanguage: 'lua'
        },
        passages: [
          {
            id: 'start',
            title: 'Start',
            content: 'Test',
            position: { x: 0, y: 0 },
            choices: []
          }
        ],
        variables: {
          health: 100,  // v1.0 simple format
          name: 'Hero'
        }
      };

      // Import v1.0 format (infers types)
      const editorData = fromWhiskerCoreFormat(v1Data);

      // Export as v2.0 format (preserves inferred types)
      const v2Data = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });

      // Verify v2.0 typed format
      expect(v2Data.formatVersion).toBe('2.0');
      expect(v2Data.variables.health).toEqual({
        type: 'number',
        default: 100
      });
      expect(v2Data.variables.name).toEqual({
        type: 'string',
        default: 'Hero'
      });

      // Round-trip back to editor
      const backToEditor = fromWhiskerCoreFormat(v2Data);

      // Verify types are preserved
      expect(backToEditor.variables.health.type).toBe('number');
      expect(backToEditor.variables.name.type).toBe('string');
    });
  });
});
