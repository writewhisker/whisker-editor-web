import type { ChoiceData } from './types';
import { nanoid } from 'nanoid';

export class Choice {
  id: string;
  text: string;
  target_passage: string; // PRIMARY: matches whisker-core
  condition?: string;
  action?: string;
  metadata: Record<string, any>;

  constructor(data?: Partial<ChoiceData>) {
    this.id = data?.id || nanoid();
    this.text = data?.text || '';
    // Support both 'target_passage' (whisker-core) and 'target' (legacy)
    this.target_passage = (data as any)?.target_passage || data?.target || '';
    this.condition = data?.condition;
    this.action = data?.action;
    this.metadata = data?.metadata || {};
  }

  // Getter/setter for 'target' (backward compatibility alias)
  get target(): string {
    return this.target_passage;
  }

  set target(value: string) {
    this.target_passage = value;
  }

  // Metadata methods
  setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }

  getMetadata(key: string, defaultValue?: any): any {
    return this.metadata[key] !== undefined ? this.metadata[key] : defaultValue;
  }

  hasMetadata(key: string): boolean {
    return this.metadata[key] !== undefined;
  }

  deleteMetadata(key: string): boolean {
    if (this.metadata[key] !== undefined) {
      delete this.metadata[key];
      return true;
    }
    return false;
  }

  serialize(): ChoiceData {
    const data: ChoiceData = {
      id: this.id,
      text: this.text,
      target: this.target_passage, // whisker-core compatible
    };

    if (this.condition) data.condition = this.condition;
    if (this.action) data.action = this.action;
    if (Object.keys(this.metadata).length > 0) {
      data.metadata = { ...this.metadata };
    }

    return data;
  }

  static deserialize(data: ChoiceData): Choice {
    return new Choice(data);
  }

  clone(): Choice {
    return new Choice({
      ...this.serialize(),
      id: nanoid(), // New ID for clone
    });
  }
}
