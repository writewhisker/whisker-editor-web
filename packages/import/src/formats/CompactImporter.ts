/**
 * Compact Binary Importer
 *
 * Imports stories from the Whisker compact binary format.
 * Companion to CompactExporter for round-trip support.
 */

import type { Story } from '@writewhisker/core-ts';
import type { ImportResult, ImportOptions } from '../types';
import { BinaryReader, createBinaryReader } from '../utils/binaryReader';

// Format constants (must match CompactExporter)
const MAGIC = 'WSKR';
const FORMAT_VERSION = 1;

// Variable types
const VAR_TYPE_STRING = 0;
const VAR_TYPE_NUMBER = 1;
const VAR_TYPE_BOOLEAN = 2;
const VAR_TYPE_ARRAY = 3;
const VAR_TYPE_OBJECT = 4;
const VAR_TYPE_NULL = 5;

/**
 * Imported passage data
 */
interface ImportedPassage {
  id: string;
  title: string;
  content: string;
  position: { x: number; y: number };
  tags: string[];
  choices: ImportedChoice[];
}

/**
 * Imported choice data
 */
interface ImportedChoice {
  text: string;
  target: string;
  condition?: string;
  disabled?: boolean;
}

/**
 * Imported variable data
 */
interface ImportedVariable {
  name: string;
  defaultValue: unknown;
}

/**
 * Imported metadata
 */
interface ImportedMetadata {
  title: string;
  author: string;
  version: string;
  description: string;
  startPassage: string;
  tags: string[];
  ifid: string;
  created: string;
  modified: string;
  stylesheets: string[];
  scripts: string[];
}

/**
 * Compact Binary Importer
 */
export class CompactImporter {
  readonly name = 'Compact Binary Importer';
  readonly supportedExtensions = ['.wskr'];
  readonly mimeTypes = ['application/octet-stream'];

  /**
   * Check if this importer can handle the file
   */
  canImport(filename: string, content?: ArrayBuffer): boolean {
    // Check extension
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    if (!this.supportedExtensions.includes(ext)) {
      return false;
    }

    // Check magic bytes if content provided
    if (content) {
      const view = new DataView(content);
      if (content.byteLength < 4) return false;

      const magic = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
      );
      return magic === MAGIC;
    }

    return true;
  }

  /**
   * Import a story from compact binary format
   */
  async import(
    content: ArrayBuffer,
    options?: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      const reader = createBinaryReader(content);

      // Verify magic
      const magic = this.readMagic(reader);
      if (magic !== MAGIC) {
        return {
          success: false,
          error: `Invalid file format: expected '${MAGIC}', got '${magic}'`,
        };
      }

      // Read version and flags
      const version = reader.readUint16();
      const flags = reader.readUint16();

      if (version > FORMAT_VERSION) {
        warnings.push(
          `File version ${version} is newer than supported ${FORMAT_VERSION}`
        );
      }

      // Read offsets
      const stringTableOffset = reader.readUint32();
      const passageTableOffset = reader.readUint32();
      const variableTableOffset = reader.readUint32();
      const metadataOffset = reader.readUint32();

      // Read string table first (we need it for everything else)
      reader.setPosition(stringTableOffset);
      const stringTable = this.readStringTable(reader);

      // Read passages
      reader.setPosition(passageTableOffset);
      const passages = this.readPassageTable(reader, stringTable);

      // Read variables
      reader.setPosition(variableTableOffset);
      const variables = this.readVariableTable(reader, stringTable);

      // Read metadata
      reader.setPosition(metadataOffset);
      const metadata = this.readMetadata(reader, stringTable);

      // Build story data
      const storyData = this.buildStoryData(passages, variables, metadata);

      const duration = Date.now() - startTime;

      return {
        success: true,
        story: storyData,
        format: 'compact',
        stats: {
          passageCount: passages.length,
          variableCount: variables.length,
          importTime: duration,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Read magic bytes
   */
  private readMagic(reader: BinaryReader): string {
    return String.fromCharCode(
      reader.readUint8(),
      reader.readUint8(),
      reader.readUint8(),
      reader.readUint8()
    );
  }

  /**
   * Read string table
   */
  private readStringTable(reader: BinaryReader): string[] {
    const count = reader.readVarint();
    const strings: string[] = [];

    for (let i = 0; i < count; i++) {
      strings.push(reader.readString());
    }

    return strings;
  }

  /**
   * Read passage table
   */
  private readPassageTable(
    reader: BinaryReader,
    stringTable: string[]
  ): ImportedPassage[] {
    const count = reader.readVarint();
    const passages: ImportedPassage[] = [];

    for (let i = 0; i < count; i++) {
      // ID and title
      const id = stringTable[reader.readVarint()];
      const title = stringTable[reader.readVarint()];

      // Content
      const content = stringTable[reader.readVarint()];

      // Position
      const x = reader.readInt16();
      const y = reader.readInt16();

      // Tags
      const tagCount = reader.readUint8();
      const tags: string[] = [];
      for (let j = 0; j < tagCount; j++) {
        tags.push(stringTable[reader.readVarint()]);
      }

      // Choices
      const choiceCount = reader.readUint8();
      const choices: ImportedChoice[] = [];
      for (let j = 0; j < choiceCount; j++) {
        const text = stringTable[reader.readVarint()];
        const target = stringTable[reader.readVarint()];
        const choiceFlags = reader.readUint8();

        const choice: ImportedChoice = { text, target };

        if (choiceFlags & 0x01) {
          choice.condition = stringTable[reader.readVarint()];
        }
        if (choiceFlags & 0x02) {
          choice.disabled = true;
        }

        choices.push(choice);
      }

      passages.push({
        id,
        title,
        content,
        position: { x, y },
        tags,
        choices,
      });
    }

    return passages;
  }

  /**
   * Read variable table
   */
  private readVariableTable(
    reader: BinaryReader,
    stringTable: string[]
  ): ImportedVariable[] {
    const count = reader.readVarint();
    const variables: ImportedVariable[] = [];

    for (let i = 0; i < count; i++) {
      const name = stringTable[reader.readVarint()];
      const defaultValue = this.readValue(reader, stringTable);

      variables.push({ name, defaultValue });
    }

    return variables;
  }

  /**
   * Read a typed value
   */
  private readValue(reader: BinaryReader, stringTable: string[]): unknown {
    const type = reader.readUint8();

    switch (type) {
      case VAR_TYPE_NULL:
        return null;

      case VAR_TYPE_STRING:
        return stringTable[reader.readVarint()];

      case VAR_TYPE_NUMBER:
        return reader.readFloat64();

      case VAR_TYPE_BOOLEAN:
        return reader.readBoolean();

      case VAR_TYPE_ARRAY: {
        const length = reader.readVarint();
        const arr: unknown[] = [];
        for (let i = 0; i < length; i++) {
          arr.push(this.readValue(reader, stringTable));
        }
        return arr;
      }

      case VAR_TYPE_OBJECT: {
        const length = reader.readVarint();
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < length; i++) {
          const key = stringTable[reader.readVarint()];
          const value = this.readValue(reader, stringTable);
          obj[key] = value;
        }
        return obj;
      }

      default:
        return null;
    }
  }

  /**
   * Read metadata
   */
  private readMetadata(
    reader: BinaryReader,
    stringTable: string[]
  ): ImportedMetadata {
    const title = stringTable[reader.readVarint()];
    const author = stringTable[reader.readVarint()];
    const version = stringTable[reader.readVarint()];
    const description = stringTable[reader.readVarint()];
    const startPassage = stringTable[reader.readVarint()];

    // Tags
    const tagCount = reader.readUint8();
    const tags: string[] = [];
    for (let i = 0; i < tagCount; i++) {
      tags.push(stringTable[reader.readVarint()]);
    }

    // IFID and timestamps
    const ifid = reader.readString();
    const created = reader.readString();
    const modified = reader.readString();

    // Stylesheets
    const stylesheetCount = reader.readVarint();
    const stylesheets: string[] = [];
    for (let i = 0; i < stylesheetCount; i++) {
      stylesheets.push(stringTable[reader.readVarint()]);
    }

    // Scripts
    const scriptCount = reader.readVarint();
    const scripts: string[] = [];
    for (let i = 0; i < scriptCount; i++) {
      scripts.push(stringTable[reader.readVarint()]);
    }

    return {
      title,
      author,
      version,
      description,
      startPassage,
      tags,
      ifid,
      created,
      modified,
      stylesheets,
      scripts,
    };
  }

  /**
   * Build story data from imported components
   */
  private buildStoryData(
    passages: ImportedPassage[],
    variables: ImportedVariable[],
    metadata: ImportedMetadata
  ): Record<string, unknown> {
    // Build passages object
    const passagesObj: Record<string, unknown> = {};
    for (const passage of passages) {
      passagesObj[passage.id] = {
        id: passage.id,
        title: passage.title,
        content: passage.content,
        position: passage.position,
        tags: passage.tags,
        choices: passage.choices.map((c) => ({
          text: c.text,
          target: c.target,
          condition: c.condition,
          disabled: c.disabled,
        })),
      };
    }

    // Build variables object
    const variablesObj: Record<string, unknown> = {};
    for (const variable of variables) {
      variablesObj[variable.name] = {
        name: variable.name,
        defaultValue: variable.defaultValue,
      };
    }

    return {
      metadata: {
        title: metadata.title,
        author: metadata.author,
        version: metadata.version,
        description: metadata.description,
        tags: metadata.tags,
        ifid: metadata.ifid,
        created: metadata.created,
        modified: metadata.modified,
      },
      startPassage: metadata.startPassage,
      passages: passagesObj,
      variables: variablesObj,
      stylesheets: metadata.stylesheets,
      scripts: metadata.scripts,
    };
  }
}

/**
 * Factory function
 */
export function createCompactImporter(): CompactImporter {
  return new CompactImporter();
}
