// Core data types for Whisker Visual Editor

export interface Position {
  x: number;
  y: number;
}

export interface ChoiceData {
  id: string;
  text: string;
  target: string;
  condition?: string;
  action?: string;
}

export interface PassageData {
  id: string;
  title: string;
  content: string;
  position: Position;
  choices: ChoiceData[];
  onEnterScript?: string;
  onExitScript?: string;
  tags?: string[];
}

export interface VariableData {
  name: string;
  type: 'string' | 'number' | 'boolean';
  initial: string | number | boolean;
}

export interface StoryMetadata {
  title: string;
  author: string;
  version: string;
  created: string;
  modified: string;
  description?: string;
}

export interface StoryData {
  metadata: StoryMetadata;
  startPassage: string;
  passages: Record<string, PassageData>;
  variables: Record<string, VariableData>;
}

export interface ProjectData extends StoryData {
  version: string; // Editor format version
}
