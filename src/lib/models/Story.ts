import type { StoryData, StoryMetadata, ProjectData, PassageData, VariableData } from './types';
import { Passage } from './Passage';
import { Variable } from './Variable';
import { nanoid } from 'nanoid';

export class Story {
  metadata: StoryMetadata;
  startPassage: string;
  passages: Map<string, Passage>;
  variables: Map<string, Variable>;

  constructor(data?: Partial<StoryData>) {
    const now = new Date().toISOString();

    this.metadata = {
      title: data?.metadata?.title || 'Untitled Story',
      author: data?.metadata?.author || '',
      version: data?.metadata?.version || '1.0.0',
      created: data?.metadata?.created || now,
      modified: data?.metadata?.modified || now,
      description: data?.metadata?.description,
    };

    this.startPassage = data?.startPassage || '';
    this.passages = new Map();
    this.variables = new Map();

    // Deserialize passages
    if (data?.passages) {
      Object.entries(data.passages).forEach(([id, passageData]) => {
        this.passages.set(id, Passage.deserialize(passageData));
      });
    }

    // Deserialize variables
    if (data?.variables) {
      Object.entries(data.variables).forEach(([name, variableData]) => {
        this.variables.set(name, Variable.deserialize(variableData));
      });
    }

    // If no passages, create a default start passage
    if (this.passages.size === 0) {
      const startPassage = new Passage({
        id: nanoid(),
        title: 'Start',
        content: 'Your story begins here...',
        position: { x: 400, y: 300 },
      });
      this.passages.set(startPassage.id, startPassage);
      this.startPassage = startPassage.id;
    }
  }

  addPassage(passage?: Passage): Passage {
    const newPassage = passage || new Passage();
    this.passages.set(newPassage.id, newPassage);
    return newPassage;
  }

  removePassage(passageId: string): boolean {
    if (passageId === this.startPassage) {
      // Can't delete start passage, assign new start
      const remainingPassages = Array.from(this.passages.keys()).filter(id => id !== passageId);
      if (remainingPassages.length > 0) {
        this.startPassage = remainingPassages[0];
      } else {
        return false; // Can't delete the last passage
      }
    }

    // Remove all choices targeting this passage
    this.passages.forEach(passage => {
      passage.choices = passage.choices.filter(choice => choice.target !== passageId);
    });

    return this.passages.delete(passageId);
  }

  getPassage(id: string): Passage | undefined {
    return this.passages.get(id);
  }

  addVariable(variable?: Variable): Variable {
    const newVariable = variable || new Variable();
    this.variables.set(newVariable.name, newVariable);
    return newVariable;
  }

  removeVariable(name: string): boolean {
    return this.variables.delete(name);
  }

  getVariable(name: string): Variable | undefined {
    return this.variables.get(name);
  }

  serialize(): StoryData {
    const passages: Record<string, PassageData> = {};
    this.passages.forEach((passage, id) => {
      passages[id] = passage.serialize();
    });

    const variables: Record<string, VariableData> = {};
    this.variables.forEach((variable, name) => {
      variables[name] = variable.serialize();
    });

    return {
      metadata: { ...this.metadata },
      startPassage: this.startPassage,
      passages,
      variables,
    };
  }

  serializeProject(): ProjectData {
    return {
      ...this.serialize(),
      version: '1.0.0', // Editor format version
    };
  }

  static deserialize(data: StoryData): Story {
    return new Story(data);
  }

  static deserializeProject(data: ProjectData): Story {
    return new Story(data);
  }

  updateModified(): void {
    this.metadata.modified = new Date().toISOString();
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check start passage exists
    if (!this.passages.has(this.startPassage)) {
      errors.push('Start passage does not exist');
    }

    // Check all choice targets exist
    this.passages.forEach((passage, id) => {
      passage.choices.forEach(choice => {
        if (choice.target && !this.passages.has(choice.target)) {
          errors.push(`Passage "${passage.title}" has broken link to "${choice.target}"`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
