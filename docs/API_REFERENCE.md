# Whisker Editor Web - API Reference

## Overview

This document provides a comprehensive API reference for whisker-editor-web's core modules, classes, and functions. Use this as a reference when extending the editor or integrating with external tools.

## Table of Contents

1. [Core Models](#core-models)
2. [Stores](#stores)
3. [Scripting Engine](#scripting-engine)
4. [Format Adapters](#format-adapters)
5. [Import/Export](#importexport)
6. [Validation](#validation)
7. [Player](#player)
8. [Utilities](#utilities)

---

## Core Models

### Story

**File**: `src/lib/models/Story.ts`

**Description**: Central data model representing an interactive fiction story.

#### Class: `Story`

```typescript
class Story {
  metadata: StoryMetadata;
  startPassage: string;
  passages: Map<string, Passage>;
  variables: Map<string, Variable>;
  settings: StorySettings;
  stylesheets: string[];
  scripts: string[];
  assets: Map<string, AssetReference>;
  luaFunctions: Map<string, LuaFunction>;
}
```

#### Constructor

```typescript
constructor(metadata?: Partial<StoryMetadata>)
```

Creates a new story with optional metadata.

**Parameters**:
- `metadata` (optional): Initial metadata values

**Example**:
```typescript
const story = new Story({
  title: 'My Story',
  author: 'Author Name'
});
```

#### Methods

##### `addPassage(passage: Passage): void`

Adds a passage to the story.

**Parameters**:
- `passage`: The passage to add

**Throws**: Error if passage with same ID already exists

**Example**:
```typescript
const passage = new Passage('start', 'Start Passage');
story.addPassage(passage);
```

##### `removePassage(id: string): void`

Removes a passage from the story.

**Parameters**:
- `id`: The passage ID to remove

**Example**:
```typescript
story.removePassage('start');
```

##### `getPassage(id: string): Passage | undefined`

Gets a passage by ID.

**Parameters**:
- `id`: The passage ID

**Returns**: The passage, or `undefined` if not found

##### `addVariable(name: string, variable: Variable): void`

Adds a variable to the story.

**Parameters**:
- `name`: Variable name
- `variable`: Variable definition

##### `serialize(): WhiskerCoreFormat`

Serializes the story to Whisker v2.0 format.

**Returns**: Whisker format JSON object

**Example**:
```typescript
const json = story.serialize();
// Save to file: JSON.stringify(json, null, 2)
```

##### `serializeWhiskerV21(): WhiskerFormatV21`

Serializes the story to Whisker v2.1 format (with `editorData`).

**Returns**: Whisker v2.1 format JSON object

##### `validate(): ValidationResult`

Validates the story structure and content.

**Returns**: Validation result with errors and warnings

**Example**:
```typescript
const result = story.validate();
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Passage

**File**: `src/lib/models/Passage.ts`

**Description**: Represents a single node/page in the story.

#### Class: `Passage`

```typescript
class Passage {
  id: string;
  title: string;
  content: string;
  tags: string[];
  choices: Choice[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  color?: string;
  onEnterScript?: string;
  onExitScript?: string;
}
```

#### Constructor

```typescript
constructor(id: string, title: string, content?: string)
```

**Parameters**:
- `id`: Unique passage identifier
- `title`: Passage name/title
- `content` (optional): Passage text content

#### Methods

##### `addChoice(choice: Choice): void`

Adds a choice to the passage.

##### `removeChoice(id: string): void`

Removes a choice by ID.

##### `addTag(tag: string): void`

Adds a tag to the passage.

##### `removeTag(tag: string): void`

Removes a tag from the passage.

### Choice

**File**: `src/lib/models/Choice.ts`

**Description**: Represents a player choice/link between passages.

#### Class: `Choice`

```typescript
class Choice {
  id: string;
  text: string;
  target: string;
  condition?: string;
  action?: string;
  isOnce?: boolean;
  isDisabled?: boolean;
}
```

#### Constructor

```typescript
constructor(id: string, text: string, target: string)
```

**Parameters**:
- `id`: Unique choice identifier
- `text`: Display text for the choice
- `target`: Target passage ID

### Variable

**File**: `src/lib/models/Variable.ts`

#### Interface: `Variable`

```typescript
interface Variable {
  type: 'string' | 'number' | 'boolean';
  default: string | number | boolean;
  description?: string;
}
```

---

## Stores

### editorStore

**File**: `src/lib/stores/editorStore.ts`

**Description**: Central store for editor state.

#### State

```typescript
interface EditorState {
  story: Story | null;
  selectedPassageId: string | null;
  selectedChoiceId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  activePanel: 'properties' | 'variables' | 'tags' | 'export' | null;
  isDirty: boolean;
}
```

#### Actions

```typescript
// Set current story
setStory(story: Story): void

// Select passage
selectPassage(id: string | null): void

// Select choice
selectChoice(id: string | null): void

// Set zoom level
setZoom(zoom: number): void

// Set pan position
setPan(x: number, y: number): void

// Mark story as modified
markDirty(): void

// Clear dirty flag
clearDirty(): void
```

#### Usage Example

```typescript
import { editorStore } from '$lib/stores/editorStore';

// Load a story
const story = new Story({ title: 'My Story' });
editorStore.setStory(story);

// Select a passage
editorStore.selectPassage('start');

// Get current state
const state = get(editorStore);
console.log('Selected passage:', state.selectedPassageId);
```

### undoStore

**File**: `src/lib/stores/undoStore.ts`

**Description**: Undo/redo functionality using command pattern.

#### Actions

```typescript
// Execute a command
execute(command: Command): void

// Undo last command
undo(): void

// Redo last undone command
redo(): void

// Check if can undo
canUndo(): boolean

// Check if can redo
canRedo(): boolean

// Clear history
clear(): void
```

#### Command Interface

```typescript
interface Command {
  execute(): void;
  undo(): void;
  description: string;
}
```

#### Usage Example

```typescript
import { undoStore } from '$lib/stores/undoStore';

class AddPassageCommand implements Command {
  constructor(
    private story: Story,
    private passage: Passage
  ) {}

  execute() {
    this.story.addPassage(this.passage);
  }

  undo() {
    this.story.removePassage(this.passage.id);
  }

  description = 'Add passage';
}

// Execute command
const cmd = new AddPassageCommand(story, newPassage);
undoStore.execute(cmd);

// Undo
undoStore.undo();

// Redo
undoStore.redo();
```

### validationStore

**File**: `src/lib/stores/validationStore.ts`

**Description**: Real-time validation tracking.

#### State

```typescript
interface ValidationState {
  errors: ValidationError[];
  warnings: string[];
  isValidating: boolean;
}
```

#### Actions

```typescript
// Validate current story
validate(story: Story): void

// Clear validation results
clear(): void

// Get errors for specific passage
getPassageErrors(passageId: string): ValidationError[]
```

---

## Scripting Engine

### LuaEngine

**File**: `src/lib/scripting/LuaEngine.ts`

**Description**: Browser-based Lua interpreter for script preview (~80% Lua 5.1 compatibility).

#### Class: `LuaEngine`

```typescript
class LuaEngine {
  constructor()

  // Execute Lua code
  execute(code: string): void

  // Evaluate Lua expression
  evaluate(expression: string): any

  // Set variable
  setVariable(name: string, value: any): void

  // Get variable
  getVariable(name: string): any

  // Clear all variables
  reset(): void

  // Get all variables
  getVariables(): Record<string, any>
}
```

#### Usage Example

```typescript
import { LuaEngine } from '$lib/scripting/LuaEngine';

const engine = new LuaEngine();

// Set variables
engine.setVariable('health', 100);
engine.setVariable('name', 'Player');

// Execute script
engine.execute(`
  if health < 50 then
    message = "You are hurt!"
  else
    message = "You are healthy!"
  end
`);

// Get result
const message = engine.getVariable('message');
console.log(message); // "You are healthy!"

// Evaluate expression
const isHealthy = engine.evaluate('health > 50');
console.log(isHealthy); // true
```

#### Supported Features

**Control Flow**:
- `if ... then ... elseif ... else ... end`
- `while ... do ... end`
- `for i = start, end do ... end`
- Nested control structures

**Functions**:
- Function definitions: `function name(params) ... end`
- Function calls
- Return statements
- Local functions

**Tables**:
- Table literals: `{ x = 10, y = 20 }`
- Dot notation: `table.field`
- Table assignment

**Operators**:
- Arithmetic: `+`, `-`, `*`, `/`, `%`, `^`
- Comparison: `==`, `~=`, `<`, `>`, `<=`, `>=`
- Logical: `and`, `or`, `not`
- String concatenation: `..`

**Standard Library** (Partial):
- `math.abs`, `math.floor`, `math.ceil`, `math.min`, `math.max`
- `string.len`, `string.sub`, `string.upper`, `string.lower`
- `print` (logs to console)

#### Known Limitations

- No `pairs()` or `ipairs()` iteration
- No metatables or metamethods
- No coroutines
- Limited standard library
- No module system

See `tests/integration/scriptCompatibility.test.ts` for detailed compatibility matrix.

### LuaExecutor

**File**: `src/lib/scripting/LuaExecutor.ts`

**Description**: Wasmoon-based Lua executor (~95% compatibility).

#### Class: `LuaExecutor`

```typescript
class LuaExecutor {
  constructor()

  // Execute Lua code
  async execute(code: string): Promise<void>

  // Evaluate Lua expression
  async evaluate(expression: string): Promise<any>

  // Set variable
  async setVariable(name: string, value: any): Promise<void>

  // Get variable
  async getVariable(name: string): Promise<any>

  // Reset state
  async reset(): Promise<void>
}
```

**Note**: All methods are async (uses WebAssembly).

---

## Format Adapters

### whiskerCoreAdapter

**File**: `src/lib/utils/whiskerCoreAdapter.ts`

**Description**: Converts between editor format and Whisker format.

#### Functions

##### `fromWhiskerCoreFormat(data: WhiskerCoreFormat | WhiskerFormatV21): Story`

Converts Whisker format to editor Story model.

**Parameters**:
- `data`: Whisker format JSON (v2.0 or v2.1)

**Returns**: Story instance

**Example**:
```typescript
import { fromWhiskerCoreFormat } from '$lib/utils/whiskerCoreAdapter';

const json = JSON.parse(fileContent);
const story = fromWhiskerCoreFormat(json);
```

##### `toWhiskerCoreFormat(story: Story, options?: ConversionOptions): WhiskerCoreFormat`

Converts Story to Whisker v2.0 format.

**Parameters**:
- `story`: Story instance
- `options` (optional): Conversion options

**Returns**: Whisker v2.0 format JSON

**Example**:
```typescript
import { toWhiskerCoreFormat } from '$lib/utils/whiskerCoreAdapter';

const json = toWhiskerCoreFormat(story);
const fileContent = JSON.stringify(json, null, 2);
```

##### `toWhiskerFormatV21(story: Story): WhiskerFormatV21`

Converts Story to Whisker v2.1 format (with `editorData`).

**Parameters**:
- `story`: Story instance

**Returns**: Whisker v2.1 format JSON

**Example**:
```typescript
import { toWhiskerFormatV21 } from '$lib/utils/whiskerCoreAdapter';

const json = toWhiskerFormatV21(story);
// Includes editorData namespace
```

##### `isWhiskerCoreFormat(data: any): boolean`

Checks if data is valid Whisker format.

**Parameters**:
- `data`: Data to check

**Returns**: `true` if valid Whisker format

---

## Import/Export

### TwineImporter

**File**: `src/lib/import/formats/TwineImporter.ts`

**Description**: Import stories from Twine 2 HTML files.

#### Class: `TwineImporter`

##### `static import(html: string): ImportResult`

Imports a Twine 2 HTML file.

**Parameters**:
- `html`: Twine HTML content

**Returns**: Import result with story and warnings

**Example**:
```typescript
import { TwineImporter } from '$lib/import/formats/TwineImporter';

const fileContent = await file.text();
const result = TwineImporter.import(fileContent);

if (result.success) {
  console.log('Imported story:', result.story);
  console.log('Warnings:', result.warnings);
} else {
  console.error('Import failed:', result.error);
}
```

**Supported Formats**:
- Harlowe 3.x
- SugarCube 2.x
- Chapbook 1.x
- Snowman 1.x

**Conversion Limitations**:
- Format-specific macros converted to closest equivalent
- Some advanced features may not translate
- Links converted to Whisker choices
- Variables converted to typed variables

### JSONExporter

**File**: `src/lib/export/formats/JSONExporter.ts`

**Description**: Export stories to Whisker JSON format.

#### Class: `JSONExporter`

##### `static export(story: Story, options?: ExportOptions): string`

Exports story to JSON.

**Parameters**:
- `story`: Story to export
- `options` (optional): Export options

**Returns**: JSON string

**Options**:
```typescript
interface ExportOptions {
  formatVersion?: '2.0' | '2.1';
  pretty?: boolean;
  includeEditorData?: boolean;
}
```

**Example**:
```typescript
import { JSONExporter } from '$lib/export/formats/JSONExporter';

const json = JSONExporter.export(story, {
  formatVersion: '2.1',
  pretty: true,
  includeEditorData: true
});

// Save to file
const blob = new Blob([json], { type: 'application/json' });
```

### HTMLExporter

**File**: `src/lib/export/formats/HTMLExporter.ts`

**Description**: Export stories to standalone HTML with embedded player.

#### Class: `HTMLExporter`

##### `static export(story: Story, options?: HTMLExportOptions): string`

Exports story to HTML.

**Parameters**:
- `story`: Story to export
- `options` (optional): Export options

**Returns**: HTML string

**Options**:
```typescript
interface HTMLExportOptions {
  includeStyles?: boolean;
  includePlayer?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}
```

---

## Validation

### whiskerSchema

**File**: `src/lib/validation/whiskerSchema.ts`

**Description**: JSON schema validator for Whisker format.

#### Functions

##### `validateWhiskerFormat(data: any): ValidationResult`

Validates data against Whisker format schema.

**Parameters**:
- `data`: Data to validate

**Returns**: Validation result

**Example**:
```typescript
import { validateWhiskerFormat } from '$lib/validation/whiskerSchema';

const json = JSON.parse(fileContent);
const result = validateWhiskerFormat(json);

if (result.valid) {
  console.log('Valid Whisker format');
} else {
  console.error('Validation errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

**Validation Result**:
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

interface ValidationError {
  path: string;
  message: string;
  expected?: string;
  actual?: string;
}
```

### StoryValidator

**File**: `src/lib/validation/StoryValidator.ts`

**Description**: Validates story structure and content.

#### Class: `StoryValidator`

##### `static validate(story: Story): ValidationResult`

Validates story completeness and correctness.

**Checks**:
- Start passage exists
- All choice targets exist
- No unreachable passages
- Variable references are valid
- Lua script syntax (basic check)
- No circular dependencies

**Example**:
```typescript
import { StoryValidator } from '$lib/validation/StoryValidator';

const result = StoryValidator.validate(story);

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`${error.path}: ${error.message}`);
  });
}
```

---

## Player

### StoryPlayer

**File**: `src/lib/player/StoryPlayer.ts`

**Description**: Story preview/playback engine.

#### Class: `StoryPlayer`

```typescript
class StoryPlayer {
  constructor(story: Story)

  // Start the story
  start(): void

  // Execute a choice
  selectChoice(choiceId: string): void

  // Get current passage
  getCurrentPassage(): Passage | null

  // Get available choices (filtered by conditions)
  getAvailableChoices(): Choice[]

  // Get variable value
  getVariable(name: string): any

  // Reset to start
  reset(): void

  // Get playthrough history
  getHistory(): PassageHistoryEntry[]
}
```

#### Usage Example

```typescript
import { StoryPlayer } from '$lib/player/StoryPlayer';

const player = new StoryPlayer(story);

// Start the story
player.start();

// Get current passage
const passage = player.getCurrentPassage();
console.log('Current passage:', passage?.title);

// Get available choices
const choices = player.getAvailableChoices();
choices.forEach(choice => {
  console.log(`- ${choice.text}`);
});

// Select a choice
player.selectChoice(choices[0].id);

// Check variable
const health = player.getVariable('health');
console.log('Health:', health);
```

---

## Utilities

### ID Generation

**File**: `src/lib/utils/id.ts`

#### Functions

##### `generateId(prefix?: string): string`

Generates a unique ID.

**Parameters**:
- `prefix` (optional): ID prefix

**Returns**: Unique ID string

**Example**:
```typescript
import { generateId } from '$lib/utils/id';

const passageId = generateId('passage');
// Returns: "passage_abc123def456"
```

##### `generateUUID(): string`

Generates a UUID v4.

**Returns**: UUID string

### Markdown Utilities

**File**: `src/lib/utils/markdown.ts`

#### Functions

##### `markdownToHtml(markdown: string): string`

Converts markdown to HTML.

##### `htmlToMarkdown(html: string): string`

Converts HTML to markdown.

### Graph Utilities

**File**: `src/lib/utils/graph.ts`

#### Functions

##### `findUnreachablePassages(story: Story): string[]`

Finds passages that can't be reached from start.

**Returns**: Array of unreachable passage IDs

##### `findCircularReferences(story: Story): string[][]`

Finds circular choice paths.

**Returns**: Array of circular paths

---

## Type Definitions

### Core Types

**File**: `src/lib/models/types.ts`

#### Whisker Core Format (v2.0)

```typescript
interface WhiskerCoreFormat {
  format: 'whisker';
  formatVersion: '2.0';
  metadata: StoryMetadata;
  settings: StorySettings;
  passages: PassageData[];
  variables: Record<string, TypedVariable>;
  stylesheets?: string[];
  scripts?: string[];
  assets?: AssetReference[];
}
```

#### Whisker Format v2.1

```typescript
interface WhiskerFormatV21 extends WhiskerCoreFormat {
  formatVersion: '2.1';
  editorData?: EditorData;
}

interface EditorData {
  tool: {
    name: string;
    version: string;
    url?: string;
  };
  modified: string;
  luaFunctions?: Record<string, LuaFunctionData>;
  playthroughs?: PlaythroughData[];
  testScenarios?: TestScenarioData[];
  visualScripts?: Record<string, VisualScriptData>;
  uiState?: EditorUIState;
  extensions?: Record<string, any>;
}
```

#### Passage Data

```typescript
interface PassageData {
  id: string;
  name: string;
  content: string;
  tags?: string[];
  choices?: ChoiceData[];
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  onEnterScript?: string;
  onExitScript?: string;
}
```

#### Choice Data

```typescript
interface ChoiceData {
  id: string;
  text: string;
  target: string;
  condition?: string;
  action?: string;
}
```

#### Typed Variable

```typescript
interface TypedVariable {
  type: 'string' | 'number' | 'boolean';
  default: string | number | boolean;
  description?: string;
}
```

---

## Error Handling

### Common Errors

#### Format Validation Errors

```typescript
try {
  const result = validateWhiskerFormat(data);
  if (!result.valid) {
    throw new Error('Invalid format');
  }
} catch (error) {
  console.error('Validation failed:', error);
}
```

#### Import Errors

```typescript
try {
  const result = TwineImporter.import(html);
  if (!result.success) {
    console.error('Import failed:', result.error);
  }
} catch (error) {
  console.error('Import exception:', error);
}
```

#### Lua Execution Errors

```typescript
const engine = new LuaEngine();
try {
  engine.execute('invalid lua code @#$');
} catch (error) {
  console.error('Lua error:', error.message);
}
```

---

## Best Practices

### Working with Stories

1. **Always validate** before export:
   ```typescript
   const result = story.validate();
   if (!result.valid) {
     // Handle errors
   }
   ```

2. **Use undo/redo** for user actions:
   ```typescript
   undoStore.execute(new AddPassageCommand(story, passage));
   ```

3. **Mark dirty state** after modifications:
   ```typescript
   editorStore.markDirty();
   ```

### Working with Lua Scripts

1. **Test in editor** before production:
   ```typescript
   const engine = new LuaEngine();
   engine.execute(script);
   // Verify results
   ```

2. **Handle compatibility** issues:
   ```typescript
   try {
     engine.execute(script);
   } catch (error) {
     // Fall back to LuaExecutor (Wasmoon)
     const executor = new LuaExecutor();
     await executor.execute(script);
   }
   ```

3. **Document limitations** in script comments:
   ```lua
   -- Note: pairs() not supported in editor preview
   -- Use whisker-core for full compatibility
   ```

### Performance

1. **Debounce expensive operations**:
   ```typescript
   const debouncedValidate = debounce(() => {
     validationStore.validate(story);
   }, 500);
   ```

2. **Use pagination** for large lists:
   ```typescript
   const passages = Array.from(story.passages.values()).slice(page * pageSize, (page + 1) * pageSize);
   ```

---

## See Also

- [Architecture Documentation](./ARCHITECTURE.md)
- [User Guide](./USER_GUIDE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Whisker Format Specification](../WHISKER_FORMAT_SPEC_V2.1.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Maintained By**: whisker-editor-web team
