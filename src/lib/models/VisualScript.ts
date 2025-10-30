/**
 * VisualScript - Collection of visual programming blocks
 *
 * Represents a named visual script that can be associated with passages,
 * global functions, or other script contexts. Provides persistence of
 * visual block structure to editorData.
 */

import { nanoid } from 'nanoid';
import { ScriptBlock, type BlockData, blocksToLua } from './ScriptBlock';

export interface VisualScriptData {
  id: string;
  name: string;
  description?: string;
  context?: 'global' | 'passage' | 'choice' | 'onEnter' | 'onExit';
  contextId?: string;  // Passage ID or choice ID if context-specific
  blocks: BlockData[];
  generatedLua?: string;
  created: string;
  modified: string;
}

/**
 * VisualScript class - Manages a collection of visual blocks
 */
export class VisualScript {
  id: string;
  name: string;
  description: string;
  context: 'global' | 'passage' | 'choice' | 'onEnter' | 'onExit';
  contextId?: string;
  blocks: ScriptBlock[];
  created: Date;
  modified: Date;

  constructor(data: Partial<VisualScriptData> & { name: string }) {
    this.id = data.id || nanoid(8);
    this.name = data.name;
    this.description = data.description || '';
    this.context = data.context || 'global';
    this.contextId = data.contextId;
    this.blocks = data.blocks?.map(b => ScriptBlock.deserialize(b)) || [];
    this.created = data.created ? new Date(data.created) : new Date();
    this.modified = data.modified ? new Date(data.modified) : new Date();
  }

  /**
   * Add a block to this visual script
   */
  addBlock(block: ScriptBlock): void {
    this.blocks.push(block);
    this.touch();
  }

  /**
   * Remove a block by ID
   */
  removeBlock(blockId: string): boolean {
    const index = this.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return false;

    this.blocks.splice(index, 1);
    this.touch();
    return true;
  }

  /**
   * Get a block by ID
   */
  getBlock(blockId: string): ScriptBlock | undefined {
    return this.blocks.find(b => b.id === blockId);
  }

  /**
   * Replace a block
   */
  replaceBlock(blockId: string, newBlock: ScriptBlock): boolean {
    const index = this.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return false;

    this.blocks[index] = newBlock;
    this.touch();
    return true;
  }

  /**
   * Generate Lua code from all blocks
   */
  toLua(): string {
    return blocksToLua(this.blocks);
  }

  /**
   * Clear all blocks
   */
  clear(): void {
    this.blocks = [];
    this.touch();
  }

  /**
   * Update modified timestamp
   */
  private touch(): void {
    this.modified = new Date();
  }

  /**
   * Clone this visual script
   */
  clone(): VisualScript {
    // Clone blocks with new IDs by deserializing without preserving original IDs
    const clonedBlocks = this.blocks.map(b => {
      const serialized = b.serialize();
      // Remove ID so ScriptBlock constructor generates a new one
      delete serialized.id;
      return serialized;
    });

    return new VisualScript({
      name: this.name + ' (copy)',
      description: this.description,
      context: this.context,
      contextId: this.contextId,
      blocks: clonedBlocks,
      created: this.created.toISOString(),
      modified: new Date().toISOString(),
    });
  }

  /**
   * Serialize to JSON for editorData
   */
  serialize(): VisualScriptData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      context: this.context,
      contextId: this.contextId,
      blocks: this.blocks.map(b => b.serialize()),
      generatedLua: this.toLua(),
      created: this.created.toISOString(),
      modified: this.modified.toISOString(),
    };
  }

  /**
   * Deserialize from JSON
   */
  static deserialize(data: VisualScriptData): VisualScript {
    return new VisualScript(data);
  }

  /**
   * Create a visual script from Lua code (placeholder for future Lua→blocks parser)
   */
  static fromLua(name: string, luaCode: string): VisualScript {
    // TODO: Implement Lua→blocks parser
    // For now, create empty visual script with the Lua code as a comment
    return new VisualScript({
      name,
      description: 'Imported from Lua code (blocks not parsed)',
      blocks: [],
    });
  }
}

/**
 * VisualScriptCollection - Manages multiple visual scripts for a story
 */
export class VisualScriptCollection {
  private scripts: Map<string, VisualScript>;

  constructor() {
    this.scripts = new Map();
  }

  /**
   * Add or update a visual script
   */
  set(visualScript: VisualScript): void {
    this.scripts.set(visualScript.id, visualScript);
  }

  /**
   * Get a visual script by ID
   */
  get(id: string): VisualScript | undefined {
    return this.scripts.get(id);
  }

  /**
   * Check if a visual script exists
   */
  has(id: string): boolean {
    return this.scripts.has(id);
  }

  /**
   * Delete a visual script
   */
  delete(id: string): boolean {
    return this.scripts.delete(id);
  }

  /**
   * Get all visual scripts
   */
  getAll(): VisualScript[] {
    return Array.from(this.scripts.values());
  }

  /**
   * Get visual scripts by context
   */
  getByContext(context: 'global' | 'passage' | 'choice' | 'onEnter' | 'onExit', contextId?: string): VisualScript[] {
    return this.getAll().filter(vs => {
      if (vs.context !== context) return false;
      if (contextId && vs.contextId !== contextId) return false;
      return true;
    });
  }

  /**
   * Get visual scripts for a specific passage
   */
  getForPassage(passageId: string): VisualScript[] {
    return this.getAll().filter(vs =>
      (vs.context === 'passage' || vs.context === 'onEnter' || vs.context === 'onExit') &&
      vs.contextId === passageId
    );
  }

  /**
   * Clear all visual scripts
   */
  clear(): void {
    this.scripts.clear();
  }

  /**
   * Get count of visual scripts
   */
  get size(): number {
    return this.scripts.size;
  }

  /**
   * Serialize all visual scripts for editorData
   */
  serialize(): Record<string, VisualScriptData> {
    const result: Record<string, VisualScriptData> = {};
    for (const [id, visualScript] of this.scripts) {
      result[id] = visualScript.serialize();
    }
    return result;
  }

  /**
   * Deserialize visual scripts from editorData
   */
  static deserialize(data: Record<string, VisualScriptData>): VisualScriptCollection {
    const collection = new VisualScriptCollection();
    for (const [id, visualScriptData] of Object.entries(data)) {
      const visualScript = VisualScript.deserialize(visualScriptData);
      collection.set(visualScript);
    }
    return collection;
  }
}
