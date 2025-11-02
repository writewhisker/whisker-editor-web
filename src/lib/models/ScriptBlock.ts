/**
 * ScriptBlock - Visual block-based scripting model
 *
 * Represents visual programming blocks that can be assembled
 * into scripts without writing code directly.
 */

import { nanoid } from 'nanoid';

export type BlockType =
  | 'set_variable'
  | 'change_variable'
  | 'math_operation'
  | 'random_number'
  | 'comparison'
  | 'logical_and'
  | 'logical_or'
  | 'logical_not'
  | 'print'
  | 'if_condition'
  | 'string_operation'
  | 'get_variable'
  | 'literal';

export type BlockCategory = 'variables' | 'math' | 'logic' | 'output' | 'control' | 'text';

export interface BlockParameter {
  name: string;
  type: 'text' | 'number' | 'variable' | 'expression' | 'block';
  value?: string | number | ScriptBlock | BlockData;
  placeholder?: string;
}

export interface BlockData {
  id?: string;
  type: BlockType;
  category: BlockCategory;
  label: string;
  parameters: BlockParameter[];
  color: string;
  children?: ScriptBlock[] | BlockData[];
}

/**
 * ScriptBlock class
 */
export class ScriptBlock {
  id: string;
  type: BlockType;
  category: BlockCategory;
  label: string;
  parameters: BlockParameter[];
  color: string;
  children: ScriptBlock[];

  constructor(data: BlockData) {
    this.id = data.id || nanoid(8);
    this.type = data.type;
    this.category = data.category;
    this.label = data.label;
    this.parameters = data.parameters;
    this.color = data.color;
    // Convert BlockData[] to ScriptBlock[] if necessary
    this.children = data.children
      ? data.children.map(c => c instanceof ScriptBlock ? c : ScriptBlock.deserialize(c as BlockData))
      : [];
  }

  /**
   * Generate Lua code from this block
   */
  toLua(): string {
    switch (this.type) {
      case 'set_variable':
        return this.generateSetVariable();
      case 'change_variable':
        return this.generateChangeVariable();
      case 'math_operation':
        return this.generateMathOperation();
      case 'random_number':
        return this.generateRandomNumber();
      case 'comparison':
        return this.generateComparison();
      case 'logical_and':
        return this.generateLogicalAnd();
      case 'logical_or':
        return this.generateLogicalOr();
      case 'logical_not':
        return this.generateLogicalNot();
      case 'print':
        return this.generatePrint();
      case 'if_condition':
        return this.generateIfCondition();
      case 'string_operation':
        return this.generateStringOperation();
      case 'get_variable':
        return this.getParameterValue('variable') || '';
      case 'literal':
        return this.getParameterValue('value') || '';
      default:
        return `-- Unknown block type: ${this.type}`;
    }
  }

  /**
   * Get parameter value
   */
  private getParameterValue(paramName: string): string {
    const param = this.parameters.find((p) => p.name === paramName);
    if (!param) return '';

    if (param.type === 'block' && param.value instanceof ScriptBlock) {
      return param.value.toLua();
    }

    return String(param.value || '');
  }

  /**
   * Generate Lua code for set variable
   */
  private generateSetVariable(): string {
    const varName = this.getParameterValue('variable');
    const value = this.getParameterValue('value');
    return `${varName} = ${value}`;
  }

  /**
   * Generate Lua code for change variable
   */
  private generateChangeVariable(): string {
    const varName = this.getParameterValue('variable');
    const operator = this.getParameterValue('operator');
    const value = this.getParameterValue('value');
    return `${varName} = ${varName} ${operator} ${value}`;
  }

  /**
   * Generate Lua code for math operation
   */
  private generateMathOperation(): string {
    const left = this.getParameterValue('left');
    const operator = this.getParameterValue('operator');
    const right = this.getParameterValue('right');
    return `${left} ${operator} ${right}`;
  }

  /**
   * Generate Lua code for random number
   */
  private generateRandomNumber(): string {
    const min = this.getParameterValue('min');
    const max = this.getParameterValue('max');
    return `math.random(${min}, ${max})`;
  }

  /**
   * Generate Lua code for comparison
   */
  private generateComparison(): string {
    const left = this.getParameterValue('left');
    const operator = this.getParameterValue('operator');
    const right = this.getParameterValue('right');
    return `${left} ${operator} ${right}`;
  }

  /**
   * Generate Lua code for logical AND
   */
  private generateLogicalAnd(): string {
    const left = this.getParameterValue('left');
    const right = this.getParameterValue('right');
    return `${left} and ${right}`;
  }

  /**
   * Generate Lua code for logical OR
   */
  private generateLogicalOr(): string {
    const left = this.getParameterValue('left');
    const right = this.getParameterValue('right');
    return `${left} or ${right}`;
  }

  /**
   * Generate Lua code for logical NOT
   */
  private generateLogicalNot(): string {
    const value = this.getParameterValue('value');
    return `not ${value}`;
  }

  /**
   * Generate Lua code for print
   */
  private generatePrint(): string {
    const values = this.parameters
      .filter((p) => p.name.startsWith('value'))
      .map((p) => {
        if (p.type === 'block' && p.value instanceof ScriptBlock) {
          return p.value.toLua();
        }
        return String(p.value || '');
      })
      .filter((v) => v);
    return `print(${values.join(', ')})`;
  }

  /**
   * Generate Lua code for if condition
   */
  private generateIfCondition(): string {
    const condition = this.getParameterValue('condition');
    const childrenCode = this.children.map((c) => '  ' + c.toLua()).join('\n');
    return `if ${condition} then\n${childrenCode}\nend`;
  }

  /**
   * Generate Lua code for string operation
   */
  private generateStringOperation(): string {
    const operation = this.getParameterValue('operation');
    const value = this.getParameterValue('value');

    switch (operation) {
      case 'upper':
        return `string.upper(${value})`;
      case 'lower':
        return `string.lower(${value})`;
      case 'len':
        return `string.len(${value})`;
      default:
        return value;
    }
  }

  /**
   * Clone this block
   */
  clone(): ScriptBlock {
    return new ScriptBlock({
      type: this.type,
      category: this.category,
      label: this.label,
      parameters: this.parameters.map((p) => ({ ...p })),
      color: this.color,
      children: this.children.map((c) => c.clone()),
    });
  }

  /**
   * Serialize to JSON
   */
  serialize(): BlockData {
    return {
      id: this.id,
      type: this.type,
      category: this.category,
      label: this.label,
      parameters: this.parameters.map((p) => ({
        ...p,
        value:
          p.type === 'block' && p.value instanceof ScriptBlock
            ? p.value.serialize()
            : p.value,
      })),
      color: this.color,
      children: this.children.map((c) => c.serialize()),
    };
  }

  /**
   * Deserialize from JSON
   */
  static deserialize(data: BlockData): ScriptBlock {
    const block = new ScriptBlock({
      ...data,
      parameters: data.parameters.map((p) => ({
        ...p,
        value:
          p.type === 'block' && typeof p.value === 'object'
            ? ScriptBlock.deserialize(p.value as BlockData)
            : p.value,
      })),
      children: data.children?.map((c) => ScriptBlock.deserialize(c)) || [],
    });
    return block;
  }
}

/**
 * Block Templates - Pre-defined blocks for the palette
 */
export const BLOCK_TEMPLATES: Record<BlockType, () => ScriptBlock> = {
  set_variable: () =>
    new ScriptBlock({
      type: 'set_variable',
      category: 'variables',
      label: 'Set variable',
      color: '#FF6B6B',
      parameters: [
        { name: 'variable', type: 'text', placeholder: 'variable name' },
        { name: 'value', type: 'expression', placeholder: 'value' },
      ],
    }),

  change_variable: () =>
    new ScriptBlock({
      type: 'change_variable',
      category: 'variables',
      label: 'Change variable',
      color: '#FF6B6B',
      parameters: [
        { name: 'variable', type: 'text', placeholder: 'variable name' },
        { name: 'operator', type: 'text', value: '+', placeholder: 'operator' },
        { name: 'value', type: 'expression', placeholder: 'value' },
      ],
    }),

  math_operation: () =>
    new ScriptBlock({
      type: 'math_operation',
      category: 'math',
      label: 'Math',
      color: '#4ECDC4',
      parameters: [
        { name: 'left', type: 'expression', placeholder: 'left' },
        { name: 'operator', type: 'text', value: '+', placeholder: 'operator' },
        { name: 'right', type: 'expression', placeholder: 'right' },
      ],
    }),

  random_number: () =>
    new ScriptBlock({
      type: 'random_number',
      category: 'math',
      label: 'Random number',
      color: '#4ECDC4',
      parameters: [
        { name: 'min', type: 'number', value: 1, placeholder: 'min' },
        { name: 'max', type: 'number', value: 10, placeholder: 'max' },
      ],
    }),

  comparison: () =>
    new ScriptBlock({
      type: 'comparison',
      category: 'logic',
      label: 'Compare',
      color: '#95E1D3',
      parameters: [
        { name: 'left', type: 'expression', placeholder: 'left' },
        { name: 'operator', type: 'text', value: '==', placeholder: 'operator' },
        { name: 'right', type: 'expression', placeholder: 'right' },
      ],
    }),

  logical_and: () =>
    new ScriptBlock({
      type: 'logical_and',
      category: 'logic',
      label: 'AND',
      color: '#95E1D3',
      parameters: [
        { name: 'left', type: 'expression', placeholder: 'condition 1' },
        { name: 'right', type: 'expression', placeholder: 'condition 2' },
      ],
    }),

  logical_or: () =>
    new ScriptBlock({
      type: 'logical_or',
      category: 'logic',
      label: 'OR',
      color: '#95E1D3',
      parameters: [
        { name: 'left', type: 'expression', placeholder: 'condition 1' },
        { name: 'right', type: 'expression', placeholder: 'condition 2' },
      ],
    }),

  logical_not: () =>
    new ScriptBlock({
      type: 'logical_not',
      category: 'logic',
      label: 'NOT',
      color: '#95E1D3',
      parameters: [{ name: 'value', type: 'expression', placeholder: 'condition' }],
    }),

  print: () =>
    new ScriptBlock({
      type: 'print',
      category: 'output',
      label: 'Print',
      color: '#F38181',
      parameters: [
        { name: 'value1', type: 'expression', placeholder: 'value' },
        { name: 'value2', type: 'expression', placeholder: 'value (optional)' },
      ],
    }),

  if_condition: () =>
    new ScriptBlock({
      type: 'if_condition',
      category: 'control',
      label: 'If',
      color: '#FFD93D',
      parameters: [{ name: 'condition', type: 'expression', placeholder: 'condition' }],
      children: [],
    }),

  string_operation: () =>
    new ScriptBlock({
      type: 'string_operation',
      category: 'text',
      label: 'String',
      color: '#A8E6CF',
      parameters: [
        { name: 'operation', type: 'text', value: 'upper', placeholder: 'operation' },
        { name: 'value', type: 'expression', placeholder: 'text' },
      ],
    }),

  get_variable: () =>
    new ScriptBlock({
      type: 'get_variable',
      category: 'variables',
      label: 'Get variable',
      color: '#FF6B6B',
      parameters: [{ name: 'variable', type: 'text', placeholder: 'variable name' }],
    }),

  literal: () =>
    new ScriptBlock({
      type: 'literal',
      category: 'variables',
      label: 'Value',
      color: '#DDDDDD',
      parameters: [{ name: 'value', type: 'text', placeholder: 'value' }],
    }),
};

/**
 * Create a block from template
 */
export function createBlock(type: BlockType): ScriptBlock {
  const template = BLOCK_TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown block type: ${type}`);
  }
  return template();
}

/**
 * Generate Lua code from a list of blocks
 */
export function blocksToLua(blocks: ScriptBlock[]): string {
  return blocks.map((block) => block.toLua()).join('\n');
}
