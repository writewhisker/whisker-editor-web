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
  | 'comment';

export interface ScriptBlockData {
  id?: string;
  type: ScriptBlockType;
  label: string;
  code: string;
  inputs: Array<{
    name: string;
    type: string;
    value?: any;
  }>;
  outputs: Array<{
    name: string;
    type: string;
  }>;
  parameters?: Array<{
    name: string;
    type: string;
    value?: any;
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
  }>;
  outputs: Array<{
    name: string;
    type: string;
  }>;
  parameters: Array<{
    name: string;
    type: string;
    value?: any;
  }>;
  position: { x: number; y: number };
  metadata: Record<string, any>;

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
