import type { VariableData } from './types';

export class Variable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  initial: string | number | boolean;

  constructor(data?: Partial<VariableData>) {
    this.name = data?.name || 'newVariable';
    this.type = data?.type || 'string';
    this.initial = data?.initial ?? '';
  }

  serialize(): VariableData {
    return {
      name: this.name,
      type: this.type,
      initial: this.initial,
    };
  }

  static deserialize(data: VariableData): Variable {
    return new Variable(data);
  }

  clone(newName?: string): Variable {
    return new Variable({
      ...this.serialize(),
      name: newName || `${this.name}_copy`,
    });
  }
}
