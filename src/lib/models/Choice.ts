import type { ChoiceData } from './types';
import { nanoid } from 'nanoid';

export class Choice {
  id: string;
  text: string;
  target: string;
  condition?: string;
  action?: string;

  constructor(data?: Partial<ChoiceData>) {
    this.id = data?.id || nanoid();
    this.text = data?.text || '';
    this.target = data?.target || '';
    this.condition = data?.condition;
    this.action = data?.action;
  }

  serialize(): ChoiceData {
    const data: ChoiceData = {
      id: this.id,
      text: this.text,
      target: this.target,
    };

    if (this.condition) data.condition = this.condition;
    if (this.action) data.action = this.action;

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
