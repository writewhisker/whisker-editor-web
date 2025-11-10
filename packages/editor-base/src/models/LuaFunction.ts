/**
 * LuaFunction - Reusable Lua function definitions
 */

import { nanoid } from 'nanoid';

export interface LuaFunctionData {
  id?: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  parameters: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  returnType: string;
  code: string;
}

export class LuaFunction {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  parameters: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  returnType: string;
  code: string;

  constructor(data?: Partial<LuaFunctionData>) {
    this.id = data?.id || nanoid();
    this.name = data?.name || 'New Function';
    this.description = data?.description || '';
    this.category = data?.category || 'Utility';
    this.tags = data?.tags || [];
    this.parameters = data?.parameters || [];
    this.returnType = data?.returnType || 'void';
    this.code = data?.code || '';
  }

  clone(): LuaFunction {
    return new LuaFunction({
      name: this.name,
      description: this.description,
      category: this.category,
      tags: [...this.tags],
      parameters: this.parameters.map(p => ({ ...p })),
      returnType: this.returnType,
      code: this.code,
    });
  }

  serialize(): LuaFunctionData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      tags: this.tags,
      parameters: this.parameters,
      returnType: this.returnType,
      code: this.code,
    };
  }

  static deserialize(data: LuaFunctionData): LuaFunction {
    return new LuaFunction(data);
  }
}

// Default function templates
export const DEFAULT_FUNCTION_TEMPLATES: LuaFunctionData[] = [
  {
    id: 'template-random-int',
    name: 'randomInt',
    description: 'Generate a random integer between min and max (inclusive)',
    category: 'Math',
    tags: ['random', 'number'],
    parameters: [
      { name: 'min', type: 'number', description: 'Minimum value' },
      { name: 'max', type: 'number', description: 'Maximum value' },
    ],
    returnType: 'number',
    code: 'return math.random(min, max)',
  },
  {
    id: 'template-clamp',
    name: 'clamp',
    description: 'Clamp a value between min and max',
    category: 'Math',
    tags: ['math', 'utility'],
    parameters: [
      { name: 'value', type: 'number', description: 'Value to clamp' },
      { name: 'min', type: 'number', description: 'Minimum value' },
      { name: 'max', type: 'number', description: 'Maximum value' },
    ],
    returnType: 'number',
    code: 'return math.max(min, math.min(max, value))',
  },
  {
    id: 'template-format-time',
    name: 'formatTime',
    description: 'Format seconds as MM:SS',
    category: 'String',
    tags: ['format', 'time'],
    parameters: [
      { name: 'seconds', type: 'number', description: 'Time in seconds' },
    ],
    returnType: 'string',
    code: `local minutes = math.floor(seconds / 60)
local secs = seconds % 60
return string.format("%02d:%02d", minutes, secs)`,
  },
];
