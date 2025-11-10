/**
 * ScriptBlock - Visual script block for node-based scripting
 */

import { nanoid } from 'nanoid';

export type ScriptBlockType =
  | 'variable'
  | 'condition'
  | 'action'
  | 'function'
  | 'event'
  | 'comment'
  | 'math_operation'
  | 'change_variable'
  | 'comparison';

export interface ScriptBlockData {
  id?: string;
  type: ScriptBlockType;
  label: string;
  code: string;
  inputs: Array<{
    name: string;
    type: string;
    value?: any;
    placeholder?: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
  }>;
  parameters?: Array<{
    name: string;
    type: string;
    value?: any;
    placeholder?: string;
  }>;
  position?: { x: number; y: number };
  metadata?: Record<string, any>;
}

export class ScriptBlock {
  id: string;
  type: ScriptBlockType;
  label: string;
  code: string;
  inputs: Array<{
    name: string;
    type: string;
    value?: any;
    placeholder?: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
  }>;
  parameters: Array<{
    name: string;
    type: string;
    value?: any;
    placeholder?: string;
  }>;
  position: { x: number; y: number };
  metadata: Record<string, any>;
  color?: string;

  constructor(data: Partial<ScriptBlockData> & { type: ScriptBlockType }) {
    this.id = data.id || nanoid();
    this.type = data.type;
    this.label = data.label || 'New Block';
    this.code = data.code || '';
    this.inputs = data.inputs || [];
    this.outputs = data.outputs || [];
    this.parameters = data.parameters || [];
    this.position = data.position || { x: 0, y: 0 };
    this.metadata = data.metadata || {};
    this.color = (data as any).color;
  }

  serialize(): ScriptBlockData {
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      code: this.code,
      inputs: this.inputs,
      outputs: this.outputs,
      parameters: this.parameters,
      position: this.position,
      metadata: this.metadata,
    };
  }

  static deserialize(data: ScriptBlockData): ScriptBlock {
    return new ScriptBlock(data);
  }
}

// Helper function to create a block
export function createBlock(type: ScriptBlockType, label?: string): ScriptBlock {
  return new ScriptBlock({ type, label });
}

// Block categories for organization
export type BlockCategory = 'variables' | 'logic' | 'actions' | 'functions' | 'events' | 'other' | 'math' | 'text' | 'output' | 'control';

export type BlockType = ScriptBlockType;

// Block templates for the visual editor
export const BLOCK_TEMPLATES: Record<string, () => Partial<ScriptBlockData>> = {
  setVariable: () => ({
    type: 'variable',
    label: 'Set Variable',
    code: 'variable = value',
    inputs: [
      { name: 'variable', type: 'string', placeholder: 'Variable name' },
      { name: 'value', type: 'any', placeholder: 'Value' }
    ],
    outputs: [],
  }),
  ifCondition: () => ({
    type: 'condition',
    label: 'If Condition',
    code: 'if condition then',
    inputs: [
      { name: 'condition', type: 'boolean', placeholder: 'Condition' }
    ],
    outputs: [
      { name: 'true', type: 'flow' },
      { name: 'false', type: 'flow' }
    ],
  }),
  comment: () => ({
    type: 'comment',
    label: 'Comment',
    code: '-- Comment',
    inputs: [],
    outputs: [],
  }),
};

// Convert blocks to Lua code
export function blocksToLua(blocks: ScriptBlock[]): string {
  return blocks.map(block => block.code).join('\n');
}
