/**
 * Compact Binary Exporter
 *
 * Exports stories to a compact binary format for 20-40% size reduction vs JSON.
 * Uses string deduplication, varint encoding, and compact structures.
 *
 * Format specification:
 * - Magic: "WSKR" (4 bytes)
 * - Version: uint16 (format version)
 * - Flags: uint16 (feature flags)
 * - Header size: uint32
 * - String table offset: uint32
 * - Passage table offset: uint32
 * - Variable table offset: uint32
 * - Metadata offset: uint32
 * - [String Table]
 * - [Passage Table]
 * - [Variable Table]
 * - [Metadata]
 */

import type { Story, Passage, Variable } from '@writewhisker/core-ts';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';
import { BinaryWriter, createBinaryWriter } from '../utils/binaryWriter';

// Format constants
const MAGIC = 'WSKR';
const FORMAT_VERSION = 1;
const HEADER_SIZE = 24; // Magic(4) + Version(2) + Flags(2) + Offsets(4x4)

// Flags
const FLAG_HAS_STYLESHEETS = 0x0001;
const FLAG_HAS_SCRIPTS = 0x0002;
const FLAG_HAS_ASSETS = 0x0004;
const FLAG_HAS_FUNCTIONS = 0x0008;
const FLAG_HAS_SETTINGS = 0x0010;

// Variable types
const VAR_TYPE_STRING = 0;
const VAR_TYPE_NUMBER = 1;
const VAR_TYPE_BOOLEAN = 2;
const VAR_TYPE_ARRAY = 3;
const VAR_TYPE_OBJECT = 4;
const VAR_TYPE_NULL = 5;

/**
 * String table for deduplication
 */
class StringTable {
  private strings: Map<string, number> = new Map();
  private list: string[] = [];

  /**
   * Add a string and return its index
   */
  add(str: string): number {
    const existing = this.strings.get(str);
    if (existing !== undefined) {
      return existing;
    }

    const index = this.list.length;
    this.strings.set(str, index);
    this.list.push(str);
    return index;
  }

  /**
   * Get all strings in order
   */
  getStrings(): string[] {
    return this.list;
  }

  /**
   * Get string count
   */
  get size(): number {
    return this.list.length;
  }
}

/**
 * Compact Binary Exporter
 */
export class CompactExporter implements IExporter {
  readonly name = 'Compact Binary Exporter';
  readonly format = 'package' as const;
  readonly extension = '.wskr';
  readonly mimeType = 'application/octet-stream';

  /**
   * Export a story to compact binary format
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      const { story } = context;
      const writer = createBinaryWriter(65536);
      const stringTable = new StringTable();

      // Pre-populate string table with common strings
      this.buildStringTable(story, stringTable);

      // Calculate flags
      const flags = this.calculateFlags(story);

      // Write header placeholder (we'll patch offsets later)
      this.writeHeader(writer, FORMAT_VERSION, flags);

      // Write string table
      const stringTableOffset = writer.getPosition();
      this.writeStringTable(writer, stringTable);

      // Write passage table
      const passageTableOffset = writer.getPosition();
      this.writePassageTable(writer, story, stringTable);

      // Write variable table
      const variableTableOffset = writer.getPosition();
      this.writeVariableTable(writer, story, stringTable);

      // Write metadata
      const metadataOffset = writer.getPosition();
      this.writeMetadata(writer, story, stringTable);

      // Patch header offsets
      writer.writeUint32At(8, stringTableOffset);
      writer.writeUint32At(12, passageTableOffset);
      writer.writeUint32At(16, variableTableOffset);
      writer.writeUint32At(20, metadataOffset);

      // Get final buffer
      const buffer = writer.getBuffer();

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${storyName}_${timestamp}.wskr`;

      const duration = Date.now() - startTime;

      return {
        success: true,
        content: new Blob([buffer as BlobPart], { type: this.mimeType }),
        filename,
        mimeType: this.mimeType,
        size: buffer.length,
        duration,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Build the string table from story data
   */
  private buildStringTable(story: Story, table: StringTable): void {
    // Metadata strings
    table.add(story.metadata.title);
    table.add(story.metadata.author || '');
    table.add(story.metadata.version || '');
    table.add(story.metadata.description || '');
    table.add(story.startPassage);

    // Tags
    for (const tag of story.metadata.tags || []) {
      table.add(tag);
    }

    // Passage strings
    for (const passage of story.passages.values()) {
      table.add(passage.id);
      table.add(passage.title);
      table.add(passage.content);

      for (const tag of passage.tags) {
        table.add(tag);
      }

      for (const choice of passage.choices) {
        table.add(choice.text);
        table.add(choice.target);
        if (choice.condition) table.add(choice.condition);
      }
    }

    // Variable strings
    for (const variable of story.variables.values()) {
      table.add(variable.name);
      if (typeof variable.defaultValue === 'string') {
        table.add(variable.defaultValue);
      }
    }

    // Stylesheets and scripts
    for (const css of story.stylesheets) {
      table.add(css);
    }
    for (const script of story.scripts) {
      table.add(script);
    }
  }

  /**
   * Calculate feature flags
   */
  private calculateFlags(story: Story): number {
    let flags = 0;

    if (story.stylesheets.length > 0) flags |= FLAG_HAS_STYLESHEETS;
    if (story.scripts.length > 0) flags |= FLAG_HAS_SCRIPTS;
    if (story.assets.size > 0) flags |= FLAG_HAS_ASSETS;
    if (story.luaFunctions.size > 0) flags |= FLAG_HAS_FUNCTIONS;
    if (Object.keys(story.settings).length > 0) flags |= FLAG_HAS_SETTINGS;

    return flags;
  }

  /**
   * Write file header
   */
  private writeHeader(writer: BinaryWriter, version: number, flags: number): void {
    // Magic
    for (const char of MAGIC) {
      writer.writeUint8(char.charCodeAt(0));
    }

    // Version and flags
    writer.writeUint16(version);
    writer.writeUint16(flags);

    // Placeholder offsets (will be patched)
    writer.writeUint32(0); // String table offset
    writer.writeUint32(0); // Passage table offset
    writer.writeUint32(0); // Variable table offset
    writer.writeUint32(0); // Metadata offset
  }

  /**
   * Write string table
   */
  private writeStringTable(writer: BinaryWriter, table: StringTable): void {
    const strings = table.getStrings();

    // Write count
    writer.writeVarint(strings.length);

    // Write each string
    for (const str of strings) {
      writer.writeString(str);
    }
  }

  /**
   * Write passage table
   */
  private writePassageTable(
    writer: BinaryWriter,
    story: Story,
    stringTable: StringTable
  ): void {
    const passages: Passage[] = Array.from(story.passages.values());

    // Write count
    writer.writeVarint(passages.length);

    // Write each passage
    for (const passage of passages) {
      // ID and title (string indices)
      writer.writeVarint(stringTable.add(passage.id));
      writer.writeVarint(stringTable.add(passage.title));

      // Content (string index)
      writer.writeVarint(stringTable.add(passage.content));

      // Position (int16 for x and y)
      writer.writeInt16(Math.round(passage.position.x));
      writer.writeInt16(Math.round(passage.position.y));

      // Tags
      writer.writeUint8(passage.tags.length);
      for (const tag of passage.tags) {
        writer.writeVarint(stringTable.add(tag));
      }

      // Choices
      writer.writeUint8(passage.choices.length);
      for (const choice of passage.choices) {
        writer.writeVarint(stringTable.add(choice.text));
        writer.writeVarint(stringTable.add(choice.target));

        // Flags for optional fields
        const choiceFlags =
          (choice.condition ? 0x01 : 0) |
          (choice.disabled ? 0x02 : 0);
        writer.writeUint8(choiceFlags);

        if (choice.condition) {
          writer.writeVarint(stringTable.add(choice.condition));
        }
      }
    }
  }

  /**
   * Write variable table
   */
  private writeVariableTable(
    writer: BinaryWriter,
    story: Story,
    stringTable: StringTable
  ): void {
    const variables: Variable[] = Array.from(story.variables.values());

    // Write count
    writer.writeVarint(variables.length);

    // Write each variable
    for (const variable of variables) {
      // Name (string index)
      writer.writeVarint(stringTable.add(variable.name));

      // Write value with type
      this.writeValue(writer, variable.defaultValue, stringTable);
    }
  }

  /**
   * Write a typed value
   */
  private writeValue(
    writer: BinaryWriter,
    value: unknown,
    stringTable: StringTable
  ): void {
    if (value === null || value === undefined) {
      writer.writeUint8(VAR_TYPE_NULL);
    } else if (typeof value === 'string') {
      writer.writeUint8(VAR_TYPE_STRING);
      writer.writeVarint(stringTable.add(value));
    } else if (typeof value === 'number') {
      writer.writeUint8(VAR_TYPE_NUMBER);
      writer.writeFloat64(value);
    } else if (typeof value === 'boolean') {
      writer.writeUint8(VAR_TYPE_BOOLEAN);
      writer.writeBoolean(value);
    } else if (Array.isArray(value)) {
      writer.writeUint8(VAR_TYPE_ARRAY);
      writer.writeVarint(value.length);
      for (const item of value) {
        this.writeValue(writer, item, stringTable);
      }
    } else if (typeof value === 'object') {
      writer.writeUint8(VAR_TYPE_OBJECT);
      const entries = Object.entries(value as Record<string, unknown>);
      writer.writeVarint(entries.length);
      for (const [key, val] of entries) {
        writer.writeVarint(stringTable.add(key));
        this.writeValue(writer, val, stringTable);
      }
    } else {
      // Unknown type, write as null
      writer.writeUint8(VAR_TYPE_NULL);
    }
  }

  /**
   * Write metadata
   */
  private writeMetadata(
    writer: BinaryWriter,
    story: Story,
    stringTable: StringTable
  ): void {
    // Title, author, version, description
    writer.writeVarint(stringTable.add(story.metadata.title));
    writer.writeVarint(stringTable.add(story.metadata.author || ''));
    writer.writeVarint(stringTable.add(story.metadata.version || ''));
    writer.writeVarint(stringTable.add(story.metadata.description || ''));

    // Start passage
    writer.writeVarint(stringTable.add(story.startPassage));

    // Tags
    const tags = story.metadata.tags || [];
    writer.writeUint8(tags.length);
    for (const tag of tags) {
      writer.writeVarint(stringTable.add(tag));
    }

    // IFID (write directly as it's a UUID)
    writer.writeString(story.metadata.ifid || '');

    // Timestamps
    writer.writeString(story.metadata.created);
    writer.writeString(story.metadata.modified);

    // Stylesheets
    writer.writeVarint(story.stylesheets.length);
    for (const css of story.stylesheets) {
      writer.writeVarint(stringTable.add(css));
    }

    // Scripts
    writer.writeVarint(story.scripts.length);
    for (const script of story.scripts) {
      writer.writeVarint(stringTable.add(script));
    }
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.format !== 'package') {
      errors.push('Invalid format for Compact exporter');
    }

    return errors;
  }

  /**
   * Estimate export size (compact should be 20-40% smaller than JSON)
   */
  estimateSize(story: Story): number {
    const jsonString = JSON.stringify(story.serialize());
    // Estimate 60-80% of JSON size
    return Math.round(jsonString.length * 0.7);
  }
}

/**
 * Factory function
 */
export function createCompactExporter(): CompactExporter {
  return new CompactExporter();
}
