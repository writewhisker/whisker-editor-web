import type {
  StoryData,
  StoryMetadata,
  ProjectData,
  PassageData,
  VariableData,
  WhiskerCoreFormat,
  WhiskerFormatV21,
  AssetReference,
  VariableUsage
} from './types';
import { Passage } from './Passage';
import { Variable } from './Variable';
import { LuaFunction, DEFAULT_FUNCTION_TEMPLATES, type LuaFunctionData } from './LuaFunction';
import { nanoid } from 'nanoid';
import { generateIfid, toWhiskerCoreFormat, toWhiskerFormatV21 } from '../utils/whiskerCoreAdapter';

export class Story {
  metadata: StoryMetadata;
  startPassage: string;
  passages: Map<string, Passage>;
  variables: Map<string, Variable>;
  settings: Record<string, any>;  // Story-level settings (Phase 3)
  stylesheets: string[];
  scripts: string[];
  assets: Map<string, AssetReference>;
  luaFunctions: Map<string, LuaFunction>;  // Function library

  constructor(data?: Partial<StoryData>) {
    const now = new Date().toISOString();

    this.metadata = {
      title: data?.metadata?.title || 'Untitled Story',
      author: data?.metadata?.author || '',
      version: data?.metadata?.version || '1.0.0',
      created: data?.metadata?.created || now,
      modified: data?.metadata?.modified || now,
      description: data?.metadata?.description,
      tags: data?.metadata?.tags || [],
      createdBy: data?.metadata?.createdBy || 'local',
      ifid: data?.metadata?.ifid || generateIfid()  // Generate ifid if missing
    };

    this.startPassage = data?.startPassage || '';
    this.passages = new Map();
    this.variables = new Map();
    this.settings = data?.settings || {};  // Initialize settings (Phase 3)
    this.stylesheets = data?.stylesheets || [];
    this.scripts = data?.scripts || [];
    this.assets = new Map();
    this.luaFunctions = new Map();

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

    // Deserialize assets
    if (data?.assets) {
      data.assets.forEach(asset => {
        this.assets.set(asset.id, asset);
      });
    }

    // Deserialize Lua functions
    if (data?.luaFunctions) {
      Object.entries(data.luaFunctions).forEach(([id, funcData]) => {
        this.luaFunctions.set(id, LuaFunction.deserialize(funcData as LuaFunctionData));
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

  // Stylesheet management
  addStylesheet(css: string): number {
    this.stylesheets.push(css);
    return this.stylesheets.length - 1;
  }

  removeStylesheet(index: number): boolean {
    if (index >= 0 && index < this.stylesheets.length) {
      this.stylesheets.splice(index, 1);
      return true;
    }
    return false;
  }

  updateStylesheet(index: number, css: string): boolean {
    if (index >= 0 && index < this.stylesheets.length) {
      this.stylesheets[index] = css;
      return true;
    }
    return false;
  }

  // Script management
  addScript(script: string): number {
    this.scripts.push(script);
    return this.scripts.length - 1;
  }

  removeScript(index: number): boolean {
    if (index >= 0 && index < this.scripts.length) {
      this.scripts.splice(index, 1);
      return true;
    }
    return false;
  }

  updateScript(index: number, script: string): boolean {
    if (index >= 0 && index < this.scripts.length) {
      this.scripts[index] = script;
      return true;
    }
    return false;
  }

  // Lua function library management
  addLuaFunction(func?: LuaFunction): LuaFunction {
    const newFunc = func || new LuaFunction();
    this.luaFunctions.set(newFunc.id, newFunc);
    return newFunc;
  }

  removeLuaFunction(id: string): boolean {
    return this.luaFunctions.delete(id);
  }

  getLuaFunction(id: string): LuaFunction | undefined {
    return this.luaFunctions.get(id);
  }

  updateLuaFunction(id: string, updates: Partial<LuaFunctionData>): boolean {
    const func = this.luaFunctions.get(id);
    if (func) {
      Object.assign(func, updates);
      func.touch();
      return true;
    }
    return false;
  }

  // Load default function templates
  loadDefaultFunctionTemplates(): void {
    DEFAULT_FUNCTION_TEMPLATES.forEach(template => {
      if (!this.luaFunctions.has(template.id)) {
        this.luaFunctions.set(template.id, new LuaFunction(template));
      }
    });
  }

  // Asset management
  addAsset(asset: AssetReference): void {
    this.assets.set(asset.id, asset);
  }

  removeAsset(id: string): boolean {
    return this.assets.delete(id);
  }

  getAsset(id: string): AssetReference | undefined {
    return this.assets.get(id);
  }

  updateAsset(id: string, updates: Partial<AssetReference>): boolean {
    const asset = this.assets.get(id);
    if (asset) {
      this.assets.set(id, { ...asset, ...updates });
      return true;
    }
    return false;
  }

  // Story settings management (Phase 3)
  setSetting(key: string, value: any): void {
    if (!key || key.trim() === '') {
      throw new Error('Invalid setting key: key cannot be empty');
    }
    this.settings[key] = value;
  }

  getSetting(key: string, defaultValue?: any): any {
    const value = this.settings[key];
    return value !== undefined ? value : defaultValue;
  }

  hasSetting(key: string): boolean {
    return key in this.settings;
  }

  deleteSetting(key: string): boolean {
    if (key in this.settings) {
      delete this.settings[key];
      return true;
    }
    return false;
  }

  getAllSettings(): Record<string, any> {
    return { ...this.settings };
  }

  clearSettings(): void {
    this.settings = {};
  }

  // Variable usage tracking (Phase 3)
  getVariableUsage(variableName: string): VariableUsage[] {
    const usage: VariableUsage[] = [];

    this.passages.forEach((passage) => {
      const locations: string[] = [];

      // Check passage content (create fresh regex each time)
      if (passage.content && new RegExp(`{{\\s*${variableName}\\s*}}`).test(passage.content)) {
        locations.push('content');
      }

      // Check onEnter and onExit scripts
      if (passage.onEnterScript && passage.onEnterScript.includes(variableName)) {
        locations.push('script:onEnter');
      }
      if (passage.onExitScript && passage.onExitScript.includes(variableName)) {
        locations.push('script:onExit');
      }

      // Check choices
      passage.choices.forEach((choice, index) => {
        if (choice.condition && choice.condition.includes(variableName)) {
          locations.push(`choice:${index}:condition`);
        }
        if (choice.action && choice.action.includes(variableName)) {
          locations.push(`choice:${index}:action`);
        }
      });

      if (locations.length > 0) {
        usage.push({
          passageId: passage.id,
          passageName: passage.title,
          locations,
        });
      }
    });

    return usage;
  }

  getAllVariableUsage(): Map<string, VariableUsage[]> {
    const allUsage = new Map<string, VariableUsage[]>();

    this.variables.forEach((variable) => {
      const usage = this.getVariableUsage(variable.name);
      allUsage.set(variable.name, usage);
    });

    return allUsage;
  }

  getUnusedVariables(): string[] {
    const unused: string[] = [];

    this.variables.forEach((variable) => {
      const usage = this.getVariableUsage(variable.name);
      if (usage.length === 0) {
        unused.push(variable.name);
      }
    });

    return unused;
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

    const assets: AssetReference[] = Array.from(this.assets.values());

    const luaFunctions: Record<string, LuaFunctionData> = {};
    this.luaFunctions.forEach((func, id) => {
      luaFunctions[id] = func.serialize();
    });

    const data: StoryData = {
      metadata: { ...this.metadata },
      startPassage: this.startPassage,
      passages,
      variables,
    };

    // Only include optional fields if they have content
    if (Object.keys(this.settings).length > 0) {
      data.settings = { ...this.settings };
    }
    if (this.stylesheets.length > 0) {
      data.stylesheets = [...this.stylesheets];
    }
    if (this.scripts.length > 0) {
      data.scripts = [...this.scripts];
    }
    if (assets.length > 0) {
      data.assets = assets;
    }
    if (Object.keys(luaFunctions).length > 0) {
      data.luaFunctions = luaFunctions;
    }

    return data;
  }

  serializeProject(): ProjectData {
    return {
      ...this.serialize(),
      version: '1.0.0', // Editor format version
    };
  }

  /**
   * Serializes to whisker-core compatible format (v1.0 or v2.0)
   */
  serializeWhiskerCore(options?: {
    formatVersion?: '1.0' | '2.0';
    stripExtensions?: boolean;
  }): WhiskerCoreFormat {
    const storyData = this.serialize();
    return toWhiskerCoreFormat(storyData, options);
  }

  /**
   * Serializes to Whisker Format v2.1 with editorData namespace
   */
  serializeWhiskerV21(options?: {
    stripExtensions?: boolean;
    toolVersion?: string;
  }): WhiskerFormatV21 {
    const storyData = this.serialize();
    return toWhiskerFormatV21(storyData, options);
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

// Re-export Variable and Passage for convenience
export { Variable } from './Variable';
export { Passage } from './Passage';
