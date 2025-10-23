import type { PassageData, Position, ChoiceData } from './types';
import { Choice } from './Choice';
import { nanoid } from 'nanoid';

export class Passage {
  id: string;
  title: string;
  content: string;
  position: Position;
  choices: Choice[];
  onEnterScript?: string;
  onExitScript?: string;
  tags: string[];
  created: string;
  modified: string;

  constructor(data?: Partial<PassageData>) {
    const now = new Date().toISOString();
    this.id = data?.id || nanoid();
    this.title = data?.title || 'Untitled Passage';
    this.content = data?.content || '';
    this.position = data?.position || { x: 0, y: 0 };
    this.choices = data?.choices?.map(c => Choice.deserialize(c)) || [];
    this.onEnterScript = data?.onEnterScript;
    this.onExitScript = data?.onExitScript;
    this.tags = data?.tags || [];
    this.created = data?.created || now;
    this.modified = data?.modified || now;
  }

  addChoice(choice?: Choice): Choice {
    const newChoice = choice || new Choice();
    this.choices.push(newChoice);
    return newChoice;
  }

  removeChoice(choiceId: string): boolean {
    const index = this.choices.findIndex(c => c.id === choiceId);
    if (index !== -1) {
      this.choices.splice(index, 1);
      return true;
    }
    return false;
  }

  serialize(): PassageData {
    const data: PassageData = {
      id: this.id,
      title: this.title,
      content: this.content,
      position: { ...this.position },
      choices: this.choices.map(c => c.serialize()),
      created: this.created,
      modified: this.modified,
    };

    if (this.onEnterScript) data.onEnterScript = this.onEnterScript;
    if (this.onExitScript) data.onExitScript = this.onExitScript;
    if (this.tags.length > 0) data.tags = [...this.tags];

    return data;
  }

  static deserialize(data: PassageData): Passage {
    return new Passage(data);
  }

  clone(): Passage {
    return new Passage({
      ...this.serialize(),
      id: nanoid(), // New ID for clone
      title: `${this.title} (copy)`,
    });
  }
}
