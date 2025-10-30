/**
 * JSON Schema validation for Whisker format
 * Based on WHISKER_FORMAT_SPEC_V2.1.md
 */

import type { WhiskerCoreFormat, WhiskerFormatV21 } from '../models/types';

export interface ValidationError {
  path: string;
  message: string;
  expected?: string;
  actual?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validates a Whisker format story against the specification
 */
export function validateWhiskerFormat(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Check root level required fields
  if (!data || typeof data !== 'object') {
    errors.push({
      path: '$',
      message: 'Story data must be an object',
      expected: 'object',
      actual: typeof data
    });
    return { valid: false, errors, warnings };
  }

  // Validate format field
  if (data.format !== 'whisker') {
    errors.push({
      path: '$.format',
      message: 'Invalid format field',
      expected: 'whisker',
      actual: data.format
    });
  }

  // Validate formatVersion
  const validVersions = ['1.0', '2.0', '2.1'];
  if (!validVersions.includes(data.formatVersion)) {
    errors.push({
      path: '$.formatVersion',
      message: 'Invalid formatVersion',
      expected: validVersions.join(' | '),
      actual: data.formatVersion
    });
  }

  // Validate metadata
  validateMetadata(data.metadata, errors, warnings);

  // Validate settings (required in v2.0+)
  if (data.formatVersion !== '1.0') {
    validateSettings(data.settings, errors, warnings);
  }

  // Validate passages
  validatePassages(data.passages, errors, warnings);

  // Validate variables
  validateVariables(data.variables, data.formatVersion, errors, warnings);

  // Validate optional fields
  if (data.stylesheets !== undefined) {
    validateArray(data.stylesheets, '$.stylesheets', 'string', errors);
  }

  if (data.scripts !== undefined) {
    validateArray(data.scripts, '$.scripts', 'string', errors);
  }

  if (data.assets !== undefined) {
    validateAssets(data.assets, errors, warnings);
  }

  // Validate v2.1 editorData
  if (data.formatVersion === '2.1' && data.editorData) {
    validateEditorData(data.editorData, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validateMetadata(metadata: any, errors: ValidationError[], warnings: string[]): void {
  if (!metadata || typeof metadata !== 'object') {
    errors.push({
      path: '$.metadata',
      message: 'Metadata is required and must be an object'
    });
    return;
  }

  // Required fields
  const requiredFields = ['title', 'author', 'version', 'created', 'modified'];
  for (const field of requiredFields) {
    if (!metadata[field] || typeof metadata[field] !== 'string') {
      errors.push({
        path: `$.metadata.${field}`,
        message: `Field is required and must be a string`,
        expected: 'string',
        actual: typeof metadata[field]
      });
    }
  }

  // Validate ISO timestamps
  if (metadata.created && !isISODate(metadata.created)) {
    warnings.push(`metadata.created is not a valid ISO 8601 timestamp: ${metadata.created}`);
  }
  if (metadata.modified && !isISODate(metadata.modified)) {
    warnings.push(`metadata.modified is not a valid ISO 8601 timestamp: ${metadata.modified}`);
  }

  // Validate ifid (should be UUID v4)
  if (metadata.ifid && !isUUID(metadata.ifid)) {
    warnings.push(`metadata.ifid is not a valid UUID: ${metadata.ifid}`);
  }
}

function validateSettings(settings: any, errors: ValidationError[], warnings: string[]): void {
  if (!settings || typeof settings !== 'object') {
    errors.push({
      path: '$.settings',
      message: 'Settings is required and must be an object'
    });
    return;
  }

  if (!settings.startPassage || typeof settings.startPassage !== 'string') {
    errors.push({
      path: '$.settings.startPassage',
      message: 'startPassage is required and must be a string'
    });
  }

  if (settings.scriptingLanguage && settings.scriptingLanguage !== 'lua' && settings.scriptingLanguage !== 'javascript') {
    warnings.push(`settings.scriptingLanguage should be 'lua' or 'javascript', got '${settings.scriptingLanguage}'`);
  }
}

function validatePassages(passages: any, errors: ValidationError[], warnings: string[]): void {
  if (!Array.isArray(passages)) {
    errors.push({
      path: '$.passages',
      message: 'Passages must be an array',
      expected: 'array',
      actual: typeof passages
    });
    return;
  }

  if (passages.length === 0) {
    errors.push({
      path: '$.passages',
      message: 'Story must have at least one passage'
    });
  }

  passages.forEach((passage, index) => {
    validatePassage(passage, index, errors, warnings);
  });
}

function validatePassage(passage: any, index: number, errors: ValidationError[], warnings: string[]): void {
  const path = `$.passages[${index}]`;

  if (!passage || typeof passage !== 'object') {
    errors.push({
      path,
      message: 'Passage must be an object'
    });
    return;
  }

  // Required fields
  if (!passage.id || typeof passage.id !== 'string') {
    errors.push({
      path: `${path}.id`,
      message: 'Passage id is required and must be a string'
    });
  }

  if (!passage.name && !passage.title) {
    errors.push({
      path: `${path}.name`,
      message: 'Passage must have either name or title'
    });
  }

  if (passage.content === undefined || typeof passage.content !== 'string') {
    errors.push({
      path: `${path}.content`,
      message: 'Passage content is required and must be a string'
    });
  }

  // Validate position
  if (passage.position) {
    if (typeof passage.position.x !== 'number' || typeof passage.position.y !== 'number') {
      errors.push({
        path: `${path}.position`,
        message: 'Position must have numeric x and y'
      });
    }
  }

  // Validate choices
  if (passage.choices && Array.isArray(passage.choices)) {
    passage.choices.forEach((choice: any, choiceIndex: number) => {
      validateChoice(choice, `${path}.choices[${choiceIndex}]`, errors, warnings);
    });
  }
}

function validateChoice(choice: any, path: string, errors: ValidationError[], warnings: string[]): void {
  if (!choice || typeof choice !== 'object') {
    errors.push({
      path,
      message: 'Choice must be an object'
    });
    return;
  }

  if (!choice.id || typeof choice.id !== 'string') {
    errors.push({
      path: `${path}.id`,
      message: 'Choice id is required and must be a string'
    });
  }

  if (!choice.text || typeof choice.text !== 'string') {
    errors.push({
      path: `${path}.text`,
      message: 'Choice text is required and must be a string'
    });
  }

  if (!choice.target || typeof choice.target !== 'string') {
    errors.push({
      path: `${path}.target`,
      message: 'Choice target is required and must be a string'
    });
  }
}

function validateVariables(variables: any, formatVersion: string, errors: ValidationError[], warnings: string[]): void {
  if (!variables || typeof variables !== 'object') {
    errors.push({
      path: '$.variables',
      message: 'Variables must be an object'
    });
    return;
  }

  Object.entries(variables).forEach(([name, value]) => {
    const path = `$.variables.${name}`;

    if (formatVersion === '2.0' || formatVersion === '2.1') {
      // v2.0+ uses typed variables
      if (!value || typeof value !== 'object') {
        errors.push({
          path,
          message: 'Variable must be an object with type and default'
        });
        return;
      }

      const typedVar = value as any;
      const validTypes = ['string', 'number', 'boolean'];
      if (!validTypes.includes(typedVar.type)) {
        errors.push({
          path: `${path}.type`,
          message: 'Variable type must be string, number, or boolean',
          expected: validTypes.join(' | '),
          actual: typedVar.type
        });
      }

      if (typedVar.default === undefined) {
        errors.push({
          path: `${path}.default`,
          message: 'Variable must have a default value'
        });
      }

      // Type check default value
      const actualType = typeof typedVar.default;
      if (typedVar.type && actualType !== typedVar.type) {
        errors.push({
          path: `${path}.default`,
          message: 'Variable default value type mismatch',
          expected: typedVar.type,
          actual: actualType
        });
      }
    } else {
      // v1.0 uses simple variables
      const validTypes = ['string', 'number', 'boolean'];
      if (!validTypes.includes(typeof value)) {
        errors.push({
          path,
          message: 'Variable value must be string, number, or boolean'
        });
      }
    }
  });
}

function validateAssets(assets: any, errors: ValidationError[], warnings: string[]): void {
  if (!Array.isArray(assets)) {
    errors.push({
      path: '$.assets',
      message: 'Assets must be an array'
    });
    return;
  }

  assets.forEach((asset, index) => {
    const path = `$.assets[${index}]`;

    if (!asset || typeof asset !== 'object') {
      errors.push({
        path,
        message: 'Asset must be an object'
      });
      return;
    }

    const requiredFields = ['id', 'name', 'type', 'path', 'mimeType'];
    for (const field of requiredFields) {
      if (!asset[field] || typeof asset[field] !== 'string') {
        errors.push({
          path: `${path}.${field}`,
          message: `Asset ${field} is required and must be a string`
        });
      }
    }

    const validTypes = ['image', 'audio', 'video', 'font', 'other'];
    if (asset.type && !validTypes.includes(asset.type)) {
      warnings.push(`Asset type should be one of: ${validTypes.join(', ')}, got '${asset.type}'`);
    }
  });
}

function validateEditorData(editorData: any, errors: ValidationError[], warnings: string[]): void {
  const path = '$.editorData';

  if (!editorData || typeof editorData !== 'object') {
    errors.push({
      path,
      message: 'editorData must be an object'
    });
    return;
  }

  // Validate tool
  if (!editorData.tool || typeof editorData.tool !== 'object') {
    errors.push({
      path: `${path}.tool`,
      message: 'editorData.tool is required and must be an object'
    });
  } else {
    if (!editorData.tool.name || typeof editorData.tool.name !== 'string') {
      errors.push({
        path: `${path}.tool.name`,
        message: 'Tool name is required and must be a string'
      });
    }
    if (!editorData.tool.version || typeof editorData.tool.version !== 'string') {
      errors.push({
        path: `${path}.tool.version`,
        message: 'Tool version is required and must be a string'
      });
    }
  }

  // Validate modified
  if (!editorData.modified || typeof editorData.modified !== 'string') {
    errors.push({
      path: `${path}.modified`,
      message: 'editorData.modified is required and must be an ISO 8601 timestamp'
    });
  } else if (!isISODate(editorData.modified)) {
    warnings.push(`editorData.modified is not a valid ISO 8601 timestamp: ${editorData.modified}`);
  }

  // Optional fields - just check types if present
  if (editorData.luaFunctions !== undefined && typeof editorData.luaFunctions !== 'object') {
    errors.push({
      path: `${path}.luaFunctions`,
      message: 'luaFunctions must be an object'
    });
  }

  if (editorData.playthroughs !== undefined && !Array.isArray(editorData.playthroughs)) {
    errors.push({
      path: `${path}.playthroughs`,
      message: 'playthroughs must be an array'
    });
  }

  if (editorData.testScenarios !== undefined && !Array.isArray(editorData.testScenarios)) {
    errors.push({
      path: `${path}.testScenarios`,
      message: 'testScenarios must be an array'
    });
  }
}

function validateArray(arr: any, path: string, itemType: string, errors: ValidationError[]): void {
  if (!Array.isArray(arr)) {
    errors.push({
      path,
      message: 'Must be an array'
    });
    return;
  }

  arr.forEach((item, index) => {
    if (typeof item !== itemType) {
      errors.push({
        path: `${path}[${index}]`,
        message: `Array items must be ${itemType}`,
        expected: itemType,
        actual: typeof item
      });
    }
  });
}

function isISODate(str: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return isoRegex.test(str);
}

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
