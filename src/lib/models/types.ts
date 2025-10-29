// Core data types for Whisker Visual Editor

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ChoiceData {
  id: string;
  text: string;
  target: string;
  condition?: string;
  action?: string;
  metadata?: Record<string, any>;  // Custom choice metadata (whisker-core compat)
}

export interface PassageData {
  id: string;
  title: string;
  name?: string;            // Alias for title (whisker-core uses 'name')
  content: string;
  position: Position;
  size?: Size;              // Visual size in editor (whisker-core compat)
  choices: ChoiceData[];
  onEnterScript?: string;
  onExitScript?: string;
  tags?: string[];
  color?: string;           // Hex color code for organizational purposes (editor-specific)
  created?: string;         // ISO timestamp (editor-specific)
  modified?: string;        // ISO timestamp (editor-specific)
  metadata?: Record<string, any>;  // Custom passage metadata (whisker-core compat)
}

export interface VariableData {
  name: string;
  type: 'string' | 'number' | 'boolean';
  initial: string | number | boolean;
}

// Variable usage tracking (whisker-core Phase 3 compat)
export interface VariableUsage {
  passageId: string;
  passageName: string;
  locations: string[];  // e.g., ['content', 'choice:condition', 'script:onEnter']
}

export interface StoryMetadata {
  id?: string;              // Story identifier (for storage/tracking)
  title: string;
  author: string;
  version: string;
  created: string;
  modified: string;
  description?: string;
  tags?: string[];          // Story-level tags for organization
  createdBy?: string;       // User ID who created (for future auth)
  ifid?: string;            // Interactive Fiction ID (UUID) - whisker-core compatibility
}

// Settings object for whisker-core compatibility
export interface StorySettings {
  startPassage: string;
  theme?: string;
  scriptingLanguage?: 'lua' | 'javascript';
  undoLimit?: number;       // Number of undo states to keep (whisker-core default: 50)
  autoSave?: boolean;       // Auto-save preference (whisker-core compat)
}

// Asset reference for media files (images, audio, video, etc.)
export interface AssetReference {
  id: string;               // Unique asset identifier
  name: string;             // Display name / filename
  type: 'image' | 'audio' | 'video' | 'font' | 'other';
  path: string;             // Storage path or data URI
  mimeType: string;         // MIME type (e.g., 'image/png')
  size?: number;            // File size in bytes
  metadata?: Record<string, any>;  // Custom asset metadata
}

export interface StoryData {
  metadata: StoryMetadata;
  startPassage: string;
  passages: Record<string, PassageData>;
  variables: Record<string, VariableData>;
  settings?: Record<string, any>;  // Story-level settings (whisker-core Phase 3 compat)
  stylesheets?: string[];   // CSS code blocks (whisker-core compat)
  scripts?: string[];       // Story-wide Lua/JS scripts (whisker-core compat)
  assets?: AssetReference[];  // Media references (whisker-core compat)
  luaFunctions?: Record<string, any>;  // Reusable Lua function library
}

// whisker-core compatible format
export interface WhiskerCoreFormat {
  format: 'whisker';
  formatVersion: '1.0' | '2.0';
  metadata: StoryMetadata;
  settings: StorySettings;
  passages: PassageData[];  // Array for core compatibility
  // v2.0: Supports both simple (v1.0) and typed (v2.0) variable formats
  variables: Record<string, string | number | boolean | { type: string; default: any }>;
  stylesheets?: string[];   // CSS code blocks
  scripts?: string[];       // Story-wide Lua scripts
  assets?: AssetReference[];  // Media references
}

export interface ProjectData extends StoryData {
  version: string; // Editor format version
  format?: 'whisker';  // Optional format identifier
  formatVersion?: '1.0' | '2.0';  // Optional whisker-core version
}
