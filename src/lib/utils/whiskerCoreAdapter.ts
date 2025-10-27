/**
 * Format adapter for converting between whisker-editor-web and whisker-core formats
 */

import type { StoryData, ProjectData, WhiskerCoreFormat, PassageData, VariableData } from '../models/types';
import { nanoid } from 'nanoid';

/**
 * Generates a UUID v4 for Interactive Fiction ID (ifid)
 */
export function generateIfid(): string {
  return crypto.randomUUID();
}

/**
 * Converts editor format to whisker-core compatible format
 *
 * Transformations (v2.0):
 * - Adds format identifier and version
 * - Creates settings object with startPassage, undoLimit, autoSave
 * - Converts passages Record to Array
 * - Maps 'title' to 'name' for passages (whisker-core uses 'name')
 * - Includes size and metadata fields
 * - Preserves typed variables (v2.0) or converts to simple (v1.0)
 * - Preserves choice IDs
 * - Generates ifid if missing
 * - Includes stylesheets, scripts, and assets
 * - Strips editor-specific extensions (color, created, modified) if requested
 */
export function toWhiskerCoreFormat(
  data: ProjectData | StoryData,
  options: {
    formatVersion?: '1.0' | '2.0';
    stripExtensions?: boolean;
    preserveIfid?: boolean;
  } = {}
): WhiskerCoreFormat {
  const {
    formatVersion = '2.0',  // Changed default from 1.0 to 2.0
    stripExtensions = false,
    preserveIfid = true
  } = options;

  // Ensure ifid exists
  const ifid = preserveIfid && data.metadata.ifid
    ? data.metadata.ifid
    : generateIfid();

  // Convert passages Record to Array and map title -> name
  const passagesArray: PassageData[] = Object.values(data.passages).map(p => {
    const passage = { ...p };
    // whisker-core uses 'name' instead of 'title'
    passage.name = p.title;
    return passage;
  });

  // Optionally strip editor-specific extensions
  const passages = stripExtensions
    ? passagesArray.map(p => {
        const { color, created, modified, ...corePassage } = p;
        return corePassage;
      })
    : passagesArray;

  // Convert variables: v2.0 uses typed format, v1.0 uses simple format
  const variables: Record<string, any> = {};
  if (formatVersion === '2.0') {
    // v2.0: Use typed variables format { type, default }
    Object.entries(data.variables).forEach(([name, varData]) => {
      variables[name] = {
        type: varData.type,
        default: varData.initial
      };
    });
  } else {
    // v1.0: Use simple format (backward compatibility)
    Object.entries(data.variables).forEach(([name, varData]) => {
      variables[name] = varData.initial;
    });
  }

  const result: WhiskerCoreFormat = {
    format: 'whisker',
    formatVersion,
    metadata: {
      ...data.metadata,
      ifid
    },
    settings: {
      startPassage: data.startPassage,
      scriptingLanguage: 'lua'
    },
    passages,
    variables
  };

  // Include optional fields if present
  if (data.stylesheets && data.stylesheets.length > 0) {
    result.stylesheets = [...data.stylesheets];
  }
  if (data.scripts && data.scripts.length > 0) {
    result.scripts = [...data.scripts];
  }
  if (data.assets && data.assets.length > 0) {
    result.assets = [...data.assets];
  }

  return result;
}

/**
 * Converts whisker-core format to editor format
 *
 * Transformations:
 * - Converts passages Array to Record (keyed by id)
 * - Maps 'name' to 'title' for passages (editor uses 'title')
 * - Imports size and metadata fields
 * - Infers variable types from values
 * - Extracts startPassage from settings
 * - Imports stylesheets, scripts, and assets
 * - Preserves ifid
 */
export function fromWhiskerCoreFormat(
  coreData: WhiskerCoreFormat | (Partial<WhiskerCoreFormat> & { passages: PassageData[] })
): StoryData {
  // Convert passages Array to Record and map name -> title
  const passages: Record<string, PassageData> = {};
  (coreData.passages || []).forEach(passage => {
    const editorPassage = { ...passage };
    // Editor uses 'title', whisker-core uses 'name'
    if (passage.name && !passage.title) {
      editorPassage.title = passage.name;
    }
    passages[passage.id] = editorPassage;
  });

  // Convert variables to editor format
  const variables: Record<string, VariableData> = {};
  const rawVariables = coreData.variables || {};

  Object.entries(rawVariables).forEach(([name, value]) => {
    let type: 'string' | 'number' | 'boolean';
    let initial: any;

    // Check if v2.0 typed format { type, default }
    if (typeof value === 'object' && value !== null && 'type' in value && 'default' in value) {
      // v2.0 typed variable
      type = value.type as 'string' | 'number' | 'boolean';
      initial = value.default;
    } else {
      // v1.0 simple variable - infer type
      if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (typeof value === 'number') {
        type = 'number';
      } else {
        type = 'string';
      }
      initial = value;
    }

    variables[name] = {
      name,
      type,
      initial
    };
  });

  // Extract startPassage from settings or use top-level
  const startPassage = coreData.settings?.startPassage || '';

  // Build metadata with ifid
  const metadata = coreData.metadata || {
    title: 'Untitled Story',
    author: '',
    version: '1.0.0',
    created: new Date().toISOString(),
    modified: new Date().toISOString()
  };

  const result: StoryData = {
    metadata,
    startPassage,
    passages,
    variables
  };

  // Import optional fields if present
  if (coreData.stylesheets && coreData.stylesheets.length > 0) {
    result.stylesheets = [...coreData.stylesheets];
  }
  if (coreData.scripts && coreData.scripts.length > 0) {
    result.scripts = [...coreData.scripts];
  }
  if (coreData.assets && coreData.assets.length > 0) {
    result.assets = [...coreData.assets];
  }

  return result;
}

/**
 * Detects if data is in whisker-core format
 */
export function isWhiskerCoreFormat(data: any): data is WhiskerCoreFormat {
  return (
    data &&
    typeof data === 'object' &&
    data.format === 'whisker' &&
    (data.formatVersion === '1.0' || data.formatVersion === '2.0') &&
    Array.isArray(data.passages)
  );
}

/**
 * Detects if data is in editor format
 */
export function isEditorFormat(data: any): data is StoryData | ProjectData {
  return (
    data &&
    typeof data === 'object' &&
    data.metadata &&
    typeof data.startPassage === 'string' &&
    data.passages &&
    !Array.isArray(data.passages) && // Record, not Array
    typeof data.passages === 'object'
  );
}

/**
 * Auto-detects format and converts to editor format
 */
export function importWhiskerFile(data: any): StoryData {
  if (isWhiskerCoreFormat(data)) {
    return fromWhiskerCoreFormat(data);
  } else if (isEditorFormat(data)) {
    return data;
  } else {
    throw new Error('Unknown Whisker format - unable to import');
  }
}
