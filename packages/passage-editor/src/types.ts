export interface PassageData {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

export interface EditorOptions {
  mode?: 'text' | 'markdown' | 'rich';
  syntax?: 'harlowe' | 'sugarcube' | 'chapbook';
  spellcheck?: boolean;
  autocomplete?: boolean;
}
