/**
 * Integration tests for Whisker format compatibility
 * Tests round-trip conversion, format validation, and data preservation
 */

import { describe, it, expect } from 'vitest';
import {
  fromWhiskerCoreFormat,
  toWhiskerCoreFormat,
  toWhiskerFormatV21,
  isWhiskerCoreFormat
} from '../../src/lib/utils/whiskerCoreAdapter';
import { validateWhiskerFormat } from '../../src/lib/validation/whiskerSchema';
import type { WhiskerCoreFormat, WhiskerFormatV21 } from '../../src/lib/models/types';

// Import test fixtures
import minimalStory from '../fixtures/stories/minimal-v2.0.json';
import functionsStory from '../fixtures/stories/with-functions-v2.1.json';
import complexScriptsStory from '../fixtures/stories/complex-scripts-v2.0.json';

describe('Format Integration Tests', () => {
  describe('Format Validation', () => {
    it('should validate minimal v2.0 story', () => {
      const result = validateWhiskerFormat(minimalStory);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate v2.1 story with functions', () => {
      const result = validateWhiskerFormat(functionsStory);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate complex scripts story', () => {
      const result = validateWhiskerFormat(complexScriptsStory);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid format', () => {
      const invalid = {
        format: 'invalid',
        formatVersion: '999.0'
      };

      const result = validateWhiskerFormat(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.path.includes('format'))).toBe(true);
    });

    it('should detect missing required fields', () => {
      const incomplete = {
        format: 'whisker',
        formatVersion: '2.0'
        // Missing metadata, settings, passages, variables
      };

      const result = validateWhiskerFormat(incomplete);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('metadata'))).toBe(true);
      expect(result.errors.some(e => e.path.includes('settings'))).toBe(true);
      expect(result.errors.some(e => e.path.includes('passages'))).toBe(true);
    });

    it('should validate variable types', () => {
      const invalidVars = {
        ...minimalStory,
        variables: {
          badVar: {
            type: 'invalid-type',
            default: 'test'
          }
        }
      };

      const result = validateWhiskerFormat(invalidVars);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('variables.badVar.type'))).toBe(true);
    });

    it('should validate editorData structure (v2.1)', () => {
      const invalidEditorData = {
        ...functionsStory,
        editorData: {
          // Missing required 'tool' and 'modified' fields
          luaFunctions: {}
        }
      };

      const result = validateWhiskerFormat(invalidEditorData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('editorData.tool'))).toBe(true);
      expect(result.errors.some(e => e.path.includes('editorData.modified'))).toBe(true);
    });
  });

  describe('Round-Trip Conversion (v2.0)', () => {
    it('should preserve data through editor → core → editor conversion', () => {
      // Convert from core format to editor format
      const editorData = fromWhiskerCoreFormat(minimalStory as WhiskerCoreFormat);

      // Verify editor format
      expect(editorData.metadata.title).toBe('Minimal Test Story');
      expect(editorData.startPassage).toBe('start');
      expect(Object.keys(editorData.passages)).toHaveLength(2);

      // Convert back to core format
      const coreData = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });

      // Verify core format
      expect(coreData.format).toBe('whisker');
      expect(coreData.formatVersion).toBe('2.0');
      expect(coreData.passages).toHaveLength(2);

      // Verify data preservation
      expect(coreData.metadata.title).toBe(minimalStory.metadata.title);
      expect(coreData.metadata.ifid).toBe(minimalStory.metadata.ifid);
      expect(coreData.settings.startPassage).toBe(minimalStory.settings.startPassage);
    });

    it('should preserve passages and choices', () => {
      const editorData = fromWhiskerCoreFormat(minimalStory as WhiskerCoreFormat);
      const coreData = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });

      const startPassage = coreData.passages.find(p => p.id === 'start');
      expect(startPassage).toBeDefined();
      expect(startPassage?.name).toBe('Start');
      expect(startPassage?.content).toBe('Welcome to the test story!');
      expect(startPassage?.choices).toHaveLength(1);
      expect(startPassage?.choices?.[0].target).toBe('end');
    });

    it('should preserve variable types and values', () => {
      const editorData = fromWhiskerCoreFormat(minimalStory as WhiskerCoreFormat);
      const coreData = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });

      expect(coreData.variables.testVar).toEqual({
        type: 'string',
        default: 'test'
      });
    });

    it('should handle multiple round-trips without data loss', () => {
      let coreData: any = minimalStory;

      // Perform 3 round-trips
      for (let i = 0; i < 3; i++) {
        const editorData = fromWhiskerCoreFormat(coreData);
        coreData = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });
      }

      // Verify final data matches original
      expect(coreData.metadata.title).toBe(minimalStory.metadata.title);
      expect(coreData.passages).toHaveLength(minimalStory.passages.length);
      expect(coreData.settings.startPassage).toBe(minimalStory.settings.startPassage);
    });
  });

  describe('Round-Trip Conversion (v2.1)', () => {
    it('should preserve luaFunctions through v2.1 round-trip', () => {
      // Convert from v2.1 format
      const editorData = fromWhiskerCoreFormat(functionsStory as WhiskerFormatV21);

      // Verify luaFunctions imported from editorData
      expect(editorData.luaFunctions).toBeDefined();
      expect(editorData.luaFunctions?.greet).toBeDefined();
      expect(editorData.luaFunctions?.greet.body).toContain('Hello');
      expect(editorData.luaFunctions?.calculateDamage).toBeDefined();

      // Convert to v2.1 format
      const v21Data = toWhiskerFormatV21(editorData);

      // Verify luaFunctions in editorData namespace
      expect(v21Data.editorData).toBeDefined();
      expect(v21Data.editorData?.luaFunctions).toBeDefined();
      expect(v21Data.editorData?.luaFunctions?.greet).toEqual(functionsStory.editorData.luaFunctions.greet);
      expect(v21Data.editorData?.luaFunctions?.calculateDamage).toEqual(functionsStory.editorData.luaFunctions.calculateDamage);
    });

    it('should preserve editorData.tool metadata', () => {
      const editorData = fromWhiskerCoreFormat(functionsStory as WhiskerFormatV21);
      const v21Data = toWhiskerFormatV21(editorData);

      expect(v21Data.editorData?.tool).toBeDefined();
      expect(v21Data.editorData?.tool.name).toBe('whisker-editor-web');
      expect(v21Data.editorData?.tool.version).toBeDefined();
      expect(v21Data.editorData?.tool.url).toBe('https://github.com/writewhisker/whisker-editor-web');
    });

    it('should handle v2.1 → v2.0 downgrade gracefully', () => {
      const editorData = fromWhiskerCoreFormat(functionsStory as WhiskerFormatV21);
      const v20Data = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });

      // editorData should be stripped
      expect((v20Data as any).editorData).toBeUndefined();

      // Core data should be preserved
      expect(v20Data.format).toBe('whisker');
      expect(v20Data.formatVersion).toBe('2.0');
      expect(v20Data.passages).toHaveLength(3);
      expect(v20Data.metadata.title).toBe('Story with Functions');
    });

    it('should handle v2.0 → v2.1 upgrade', () => {
      const editorData = fromWhiskerCoreFormat(minimalStory as WhiskerCoreFormat);
      const v21Data = toWhiskerFormatV21(editorData);

      // Should have v2.1 format
      expect(v21Data.formatVersion).toBe('2.1');

      // Should have editorData (even if empty)
      expect(v21Data.editorData).toBeDefined();
      expect(v21Data.editorData?.tool).toBeDefined();
      expect(v21Data.editorData?.modified).toBeDefined();

      // Core data should be preserved
      expect(v21Data.passages).toHaveLength(2);
      expect(v21Data.metadata.title).toBe('Minimal Test Story');
    });
  });

  describe('Complex Scripts Preservation', () => {
    it('should preserve onEnterScript and onExitScript', () => {
      const editorData = fromWhiskerCoreFormat(functionsStory as WhiskerFormatV21);
      const passage = editorData.passages['healed'];

      expect(passage).toBeDefined();
      expect(passage?.onEnterScript).toBe('health = 100');
    });

    it('should preserve choice conditions and actions', () => {
      const editorData = fromWhiskerCoreFormat(functionsStory as WhiskerFormatV21);
      const startPassage = editorData.passages['start'];

      expect(startPassage?.choices).toHaveLength(2);

      const damageChoice = startPassage?.choices.find(c => c.id === 'choice1');
      expect(damageChoice?.action).toBe('health = health - 10');

      const healChoice = startPassage?.choices.find(c => c.id === 'choice2');
      expect(healChoice?.condition).toBe('health < 100');
    });

    it('should handle complex script story', () => {
      const editorData = fromWhiskerCoreFormat(complexScriptsStory as WhiskerCoreFormat);

      // Verify script preservation
      const startPassage = editorData.passages['start'];
      expect(startPassage?.onEnterScript).toContain('counter = counter + 1');
      expect(startPassage?.onEnterScript).toContain('if counter > 5 then');

      const loopsPassage = editorData.passages['loops'];
      expect(loopsPassage?.onEnterScript).toContain('for i = 1, 5 do');

      const tablesPassage = editorData.passages['tables'];
      expect(tablesPassage?.onEnterScript).toContain('pairs(inventory)');
    });
  });

  describe('Format Detection', () => {
    it('should detect v2.0 format', () => {
      expect(isWhiskerCoreFormat(minimalStory)).toBe(true);
    });

    it('should detect v2.1 format', () => {
      expect(isWhiskerCoreFormat(functionsStory)).toBe(true);
    });

    it('should reject invalid format', () => {
      const invalid = {
        format: 'not-whisker',
        passages: []
      };

      expect(isWhiskerCoreFormat(invalid)).toBe(false);
    });

    it('should reject non-array passages', () => {
      const invalid = {
        format: 'whisker',
        formatVersion: '2.0',
        passages: {}  // Object instead of array
      };

      expect(isWhiskerCoreFormat(invalid)).toBe(false);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all passages through round-trip', () => {
      const editorData = fromWhiskerCoreFormat(functionsStory as WhiskerFormatV21);
      const v21Data = toWhiskerFormatV21(editorData);

      expect(v21Data.passages).toHaveLength(functionsStory.passages.length);

      // Verify each passage
      functionsStory.passages.forEach(originalPassage => {
        const roundTripPassage = v21Data.passages.find(p => p.id === originalPassage.id);
        expect(roundTripPassage).toBeDefined();
        expect(roundTripPassage?.name).toBe(originalPassage.name);
        expect(roundTripPassage?.content).toBe(originalPassage.content);
      });
    });

    it('should preserve all variables through round-trip', () => {
      const editorData = fromWhiskerCoreFormat(complexScriptsStory as WhiskerCoreFormat);
      const coreData = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });

      const originalVars = Object.keys(complexScriptsStory.variables);
      const roundTripVars = Object.keys(coreData.variables);

      expect(roundTripVars.sort()).toEqual(originalVars.sort());

      // Verify each variable
      originalVars.forEach(varName => {
        const original = complexScriptsStory.variables[varName];
        const roundTrip = coreData.variables[varName];

        expect(roundTrip).toEqual(original);
      });
    });

    it('should preserve metadata through round-trip', () => {
      const editorData = fromWhiskerCoreFormat(minimalStory as WhiskerCoreFormat);
      const coreData = toWhiskerCoreFormat(editorData, { formatVersion: '2.0' });

      expect(coreData.metadata.title).toBe(minimalStory.metadata.title);
      expect(coreData.metadata.author).toBe(minimalStory.metadata.author);
      expect(coreData.metadata.version).toBe(minimalStory.metadata.version);
      expect(coreData.metadata.ifid).toBe(minimalStory.metadata.ifid);
    });
  });
});
