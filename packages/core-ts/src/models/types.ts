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
  notes?: string;           // Notes/comments for passage (editor-specific)
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

// whisker-core compatible format (v2.0)
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

// ============================================================================
// Whisker Format v2.1 - EditorData Namespace
// ============================================================================

/**
 * Lua function definition for reusable story logic
 */
export interface LuaFunctionData {
  id: string;
  name: string;
  description?: string;
  params: string[];         // Parameter names
  body: string;             // Lua code
  tags?: string[];          // For categorization
  created: string;          // ISO 8601
  modified: string;         // ISO 8601
}

/**
 * Recorded playthrough session for analytics (v2.1 editor format)
 * Note: This is different from the PlaythroughData used by the Playthrough class
 */
export interface EditorPlaythroughData {
  id: string;
  startedAt: string;        // ISO 8601
  completedAt?: string;     // ISO 8601 (if completed)
  duration?: number;        // Milliseconds
  passageVisits: {
    passageId: string;
    timestamp: string;
    choiceId?: string;      // Which choice was taken
    variables?: Record<string, any>;  // Variable state snapshot
  }[];
  metadata?: {
    platform?: string;      // "web", "mobile", etc.
    userAgent?: string;
    version?: string;       // Story version when played
  };
}

/**
 * Test scenario for automated testing
 */
export interface TestScenarioData {
  id: string;
  name: string;
  description?: string;
  steps: TestStepData[];
  created: string;
  modified: string;
  tags?: string[];
}

export interface TestStepData {
  type: 'navigate' | 'check' | 'setVariable' | 'wait';
  data: any;  // Step-specific data
}

/**
 * Visual script builder block data
 */
export interface VisualScriptData {
  id: string;
  name: string;
  blocks: {
    id: string;
    type: string;           // "if", "while", "setVariable", etc.
    params: Record<string, any>;
    children?: string[];    // Child block IDs
  }[];
  generatedLua?: string;    // Generated Lua code
}

/**
 * Editor UI state for persistence
 */
export interface EditorUIState {
  graph?: {
    zoom?: number;
    pan?: { x: number; y: number };
    selectedNodeIds?: string[];
  };
  openPanels?: string[];
  theme?: string;
  lastView?: string;        // e.g., "graph", "passage-editor"
}

/**
 * Editor-specific data namespace (v2.1)
 * Allows authoring tools to store tool-specific data without polluting core format
 */
export interface EditorData {
  /**
   * Tool identification
   */
  tool: {
    name: string;           // e.g., "whisker-editor-web"
    version: string;        // e.g., "1.0.0"
    url?: string;           // e.g., "https://github.com/writewhisker/whisker-editor-web"
  };

  /**
   * Last modification timestamp for editor data
   */
  modified: string;         // ISO 8601

  /**
   * Lua Function Library
   */
  luaFunctions?: Record<string, LuaFunctionData>;

  /**
   * Playthrough Analytics
   */
  playthroughs?: EditorPlaythroughData[];

  /**
   * Test Scenarios
   */
  testScenarios?: TestScenarioData[];

  /**
   * Visual Script Builder Data
   */
  visualScripts?: Record<string, VisualScriptData>;

  /**
   * Editor UI State
   */
  uiState?: EditorUIState;

  /**
   * Custom Extensions
   */
  extensions?: Record<string, any>;
}

/**
 * Whisker Format v2.1 with editorData namespace
 */
export interface WhiskerFormatV21 {
  format: 'whisker';
  formatVersion: '2.1';
  metadata: StoryMetadata;
  settings: StorySettings;
  startPassage: string;
  passages: PassageData[];
  variables: Record<string, { type: string; default: any }>;
  stylesheets?: string[];
  scripts?: string[];
  assets?: AssetReference[];
  editorData?: EditorData;  // ✨ NEW in v2.1
}

export interface ProjectData extends StoryData {
  version: string; // Editor format version
  format?: 'whisker';  // Optional format identifier
  formatVersion?: '1.0' | '2.0';  // Optional whisker-core version
}
