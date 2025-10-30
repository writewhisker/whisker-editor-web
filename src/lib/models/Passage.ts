import type { PassageData, Position, Size, ChoiceData } from './types';
import { Choice } from './Choice';
import { nanoid } from 'nanoid';

export class Passage {
  id: string;
  name: string; // PRIMARY: matches whisker-core
  content: string;
  position: Position;
  size: Size;
  choices: Choice[];
  onEnterScript?: string;
  onExitScript?: string;
  tags: string[];
  color?: string;
  created: string;
  modified: string;
  metadata: Record<string, any>;

  constructor(data?: Partial<PassageData>) {
    const now = new Date().toISOString();
    this.id = data?.id || nanoid();
    // Support both 'name' (whisker-core) and 'title' (legacy) fields
    this.name = data?.name || data?.title || 'Untitled Passage';
    this.content = data?.content || '';
    this.position = data?.position || { x: 0, y: 0 };
    this.size = data?.size || { width: 200, height: 150 };
    this.choices = data?.choices?.map(c => Choice.deserialize(c)) || [];
    this.onEnterScript = data?.onEnterScript;
    this.onExitScript = data?.onExitScript;
    this.tags = data?.tags || [];
    this.color = data?.color;
    this.created = data?.created || now;
    this.modified = data?.modified || now;
    this.metadata = data?.metadata || {};
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

  // Getter/setter for 'title' (backward compatibility alias)
  get title(): string {
    return this.name;
  }

  set title(value: string) {
    this.name = value;
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

  serialize(): PassageData {
    const data: PassageData = {
      id: this.id,
      name: this.name, // whisker-core compatible
      content: this.content,
      position: { ...this.position },
      size: { ...this.size },
      choices: this.choices.map(c => c.serialize()),
      created: this.created,
      modified: this.modified,
    };

    if (this.onEnterScript) data.onEnterScript = this.onEnterScript;
    if (this.onExitScript) data.onExitScript = this.onExitScript;
    if (this.tags.length > 0) data.tags = [...this.tags];
    if (this.color) data.color = this.color;
    if (Object.keys(this.metadata).length > 0) {
      data.metadata = { ...this.metadata };
    }

    return data;
  }

  static deserialize(data: PassageData): Passage {
    return new Passage(data);
  }

  clone(): Passage {
    return new Passage({
      ...this.serialize(),
      id: nanoid(), // New ID for clone
      name: `${this.name} (copy)`,
    });
  }
}
