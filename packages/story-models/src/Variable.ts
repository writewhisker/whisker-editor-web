import type { VariableData, VariableScope } from './types';

export class Variable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  initial: string | number | boolean;
  scope: VariableScope;  // 'story' or 'temp'

  constructor(data?: Partial<VariableData>) {
    this.name = data?.name || 'newVariable';
    this.type = data?.type || 'string';
    this.initial = data?.initial ?? '';
    this.scope = data?.scope || 'story';  // Default to story scope
  }

  /**
   * Check if this is a story-scoped variable
   * Story variables persist for the entire playthrough and are saved
   */
  isStoryScoped(): boolean {
    return this.scope === 'story';
  }

  /**
   * Check if this is a temp variable
   * Temp variables are passage-scoped and not saved
   */
  isTempScoped(): boolean {
    return this.scope === 'temp';
  }

  /**
   * Get the variable name with appropriate prefix for WLS syntax
   * Story variables: $name
   * Temp variables: _name
   */
  getPrefixedName(): string {
    return this.scope === 'temp' ? `_${this.name}` : `$${this.name}`;
  }

  serialize(): VariableData {
    const data: VariableData = {
      name: this.name,
      type: this.type,
      initial: this.initial,
    };
    // Only serialize scope if not default ('story')
    if (this.scope !== 'story') data.scope = this.scope;
    return data;
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
