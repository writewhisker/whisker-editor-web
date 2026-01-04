# TypeScript API Reference

Complete API reference for all TypeScript packages in the Whisker ecosystem.

## @writewhisker/parser

The parser package provides WLS source code parsing capabilities.

### parse(source: string): ParseResult

Parse WLS source code into an Abstract Syntax Tree.

```typescript
import { parse } from '@writewhisker/parser';

const source = `
:: Start
Welcome to my story!
* [Begin] -> Chapter1

:: Chapter1
The adventure begins...
`;

const result = parse(source);

if (result.errors.length === 0) {
  console.log('Passages:', result.ast.passages.length);
} else {
  console.error('Parse errors:', result.errors);
}
```

### ParseResult

```typescript
interface ParseResult {
  ast: StoryAST | null;
  errors: ParseError[];
  warnings: ParseWarning[];
}

interface StoryAST {
  passages: PassageNode[];
  globals: GlobalNode[];
  metadata: MetadataNode[];
}

interface ParseError {
  code: string;      // WLS error code (e.g., "WLS-SYN-001")
  message: string;   // Human-readable message
  line: number;      // 1-indexed line number
  column: number;    // 1-indexed column number
  severity: 'error' | 'warning';
}
```

### Lexer

Low-level tokenization for advanced use cases:

```typescript
import { Lexer, TokenType } from '@writewhisker/parser';

const lexer = new Lexer(source);
const tokens = lexer.tokenize();

for (const token of tokens) {
  console.log(`${token.type}: ${token.value} at ${token.line}:${token.column}`);
}
```

### TokenType Enum

| Token | Description |
|-------|-------------|
| `PASSAGE_HEADER` | `:: PassageName` |
| `CHOICE_MARKER` | `*` or `-` |
| `DIVERT` | `->` |
| `VARIABLE` | `$name` or `$$temp` |
| `INTERPOLATION` | `{expression}` |
| `STRING` | `"text"` or `'text'` |
| `NUMBER` | Integer or float |
| `OPERATOR` | `+`, `-`, `*`, `/`, etc. |
| `KEYWORD` | `if`, `else`, `and`, `or`, etc. |

---

## @writewhisker/story-models

Core data models for stories.

### Story

```typescript
import { Story, Passage, Choice } from '@writewhisker/story-models';

const story = new Story({
  title: 'My Adventure',
  author: 'Author Name',
  version: '1.0.0'
});

// Add a passage
const start = new Passage({
  id: 'start',
  title: 'Start',
  content: 'Welcome to the adventure!'
});
story.addPassage(start);

// Add a choice
start.addChoice(new Choice({
  text: 'Begin the journey',
  target: 'chapter1'
}));
```

### Passage

```typescript
interface PassageOptions {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

class Passage {
  readonly id: string;
  title: string;
  content: string;
  choices: Choice[];
  tags: string[];
  metadata: Record<string, unknown>;

  addChoice(choice: Choice): void;
  removeChoice(choiceId: string): void;
  getChoice(choiceId: string): Choice | undefined;
}
```

### Choice

```typescript
interface ChoiceOptions {
  id?: string;
  text: string;
  target?: string;
  condition?: string;
  isOnce?: boolean;
  isFallback?: boolean;
}

class Choice {
  readonly id: string;
  text: string;
  target: string | null;
  condition: string | null;
  isOnce: boolean;
  isFallback: boolean;
  inlineContent: ContentBlock[];
}
```

---

## @writewhisker/story-validation

Validation with WLS error codes.

### validate(story: Story): ValidationResult

```typescript
import { validate } from '@writewhisker/story-validation';

const result = validate(story);

if (result.isValid) {
  console.log('Story is valid!');
} else {
  for (const error of result.errors) {
    console.error(`${error.code}: ${error.message}`);
  }
}
```

### Validators

```typescript
import {
  WlsStructureValidator,
  WlsLinkValidator,
  WlsVariableValidator,
  WlsExpressionValidator,
  WlsQualityValidator
} from '@writewhisker/story-validation';

// Use individual validators
const structureValidator = new WlsStructureValidator();
const structureErrors = structureValidator.validate(story);

// Configure quality thresholds
const qualityValidator = new WlsQualityValidator({
  maxPassageLength: 500,
  maxChoicesPerPassage: 6,
  warnOnDeadEnds: true
});
```

### Error Codes Reference

| Code | Severity | Message |
|------|----------|---------|
| `WLS-STR-001` | error | Missing start passage |
| `WLS-STR-002` | error | Duplicate passage ID |
| `WLS-STR-003` | warning | Unreachable passage |
| `WLS-LNK-001` | error | Dead link to passage |
| `WLS-LNK-002` | warning | Link to self |
| `WLS-VAR-001` | error | Undefined variable |
| `WLS-VAR-002` | warning | Unused variable |
| `WLS-EXP-001` | error | Invalid expression syntax |
| `WLS-QUA-001` | warning | Passage too long |

---

## @writewhisker/story-player

Story execution and state management.

### StoryPlayer

```typescript
import { StoryPlayer } from '@writewhisker/story-player';

const player = new StoryPlayer(story);

// Start the story
player.start();

// Get current passage
const passage = player.getCurrentPassage();
console.log(passage.title, passage.content);

// Get available choices
const choices = player.getAvailableChoices();
for (const choice of choices) {
  console.log(`- ${choice.text}`);
}

// Make a choice
player.choose(choices[0].id);
```

### GameState

```typescript
interface GameState {
  currentPassageId: string;
  variables: Record<string, unknown>;
  visitCounts: Record<string, number>;
  history: string[];
}

// Access state
const state = player.getState();
console.log('Current passage:', state.currentPassageId);
console.log('Visit count:', state.visitCounts['chapter1']);

// Save and restore
const savedState = player.serialize();
localStorage.setItem('save', JSON.stringify(savedState));

// Later...
const loadedState = JSON.parse(localStorage.getItem('save')!);
player.deserialize(loadedState);
```

### Events

```typescript
player.on('passageEnter', (passage) => {
  console.log('Entered:', passage.title);
});

player.on('passageExit', (passage) => {
  console.log('Left:', passage.title);
});

player.on('choiceMade', (choice) => {
  console.log('Chose:', choice.text);
});

player.on('variableChanged', (name, oldValue, newValue) => {
  console.log(`${name}: ${oldValue} -> ${newValue}`);
});

player.on('storyEnd', () => {
  console.log('Story complete!');
});
```

---

## @writewhisker/scripting

Lua scripting integration.

### ScriptEngine

```typescript
import { ScriptEngine } from '@writewhisker/scripting';

const engine = new ScriptEngine();

// Register custom functions
engine.registerFunction('roll', (sides: number) => {
  return Math.floor(Math.random() * sides) + 1;
});

// Execute Lua code
const result = engine.execute(`
  local damage = roll(6) + roll(6)
  return damage
`);
console.log('Damage:', result);
```

### Integration with StoryPlayer

```typescript
const player = new StoryPlayer(story, {
  scriptEngine: engine
});

// Variables are automatically available in Lua
player.setVariable('health', 100);

// Lua scripts can access variables
engine.execute(`
  if health < 50 then
    status = "wounded"
  else
    status = "healthy"
  end
`);
```

---

## @writewhisker/import

Import stories from other formats.

### importTwine(content: string): Story

```typescript
import { importTwine, detectTwineFormat } from '@writewhisker/import';

const htmlContent = fs.readFileSync('story.html', 'utf-8');
const format = detectTwineFormat(htmlContent); // 'harlowe', 'sugarcube', 'chapbook'

const story = importTwine(htmlContent);
console.log('Imported passages:', story.passages.length);
```

### importInk(content: string): Story

```typescript
import { importInk } from '@writewhisker/import';

const inkContent = fs.readFileSync('story.ink', 'utf-8');
const story = importInk(inkContent);
```

### importChoiceScript(content: string): Story

```typescript
import { importChoiceScript } from '@writewhisker/import';

const csContent = fs.readFileSync('startup.txt', 'utf-8');
const story = importChoiceScript(csContent);
```

---

## @writewhisker/export

Export stories to various formats.

### exportToHtml(story: Story, options?): string

```typescript
import { exportToHtml } from '@writewhisker/export';

const html = exportToHtml(story, {
  template: 'modern',
  includeStyles: true,
  selfContained: true
});

fs.writeFileSync('story.html', html);
```

### exportToEpub(story: Story, options?): Buffer

```typescript
import { exportToEpub } from '@writewhisker/export';

const epub = await exportToEpub(story, {
  title: 'My Interactive Story',
  author: 'Author Name',
  cover: coverImageBuffer
});

fs.writeFileSync('story.epub', epub);
```

### exportToText(story: Story): string

Export to WLS text format:

```typescript
import { exportToText } from '@writewhisker/export';

const wlsSource = exportToText(story);
fs.writeFileSync('story.ws', wlsSource);
```
