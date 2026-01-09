import type { ChoiceData, ChoiceType } from './types';
import { nanoid } from 'nanoid';

export class Choice {
  id: string;
  text: string;
  target: string;
  condition?: string;
  action?: string;
  choiceType: ChoiceType;  // 'once' or 'sticky'
  metadata: Record<string, any>;

  constructor(data?: Partial<ChoiceData>) {
    this.id = data?.id || nanoid();
    this.text = data?.text || '';
    this.target = data?.target || '';
    this.condition = data?.condition;
    this.action = data?.action;
    this.choiceType = data?.choiceType || 'once';  // Default to once-only
    this.metadata = data?.metadata || {};
  }

  /**
   * Check if this is a once-only choice
   * Once-only choices disappear after being selected
   */
  isOnce(): boolean {
    return this.choiceType === 'once';
  }

  /**
   * Check if this is a sticky choice
   * Sticky choices remain visible after selection
   */
  isSticky(): boolean {
    return this.choiceType === 'sticky';
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
      target: this.target,
    };

    if (this.condition) data.condition = this.condition;
    if (this.action) data.action = this.action;
    // Only serialize choiceType if not default ('once')
    if (this.choiceType !== 'once') data.choiceType = this.choiceType;
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
