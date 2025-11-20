# @writewhisker/scripting

Lua scripting engine for Whisker interactive fiction with Monaco editor integration.

## Features

- **Dual Execution Modes**: Preview engine (browser) and full Lua 5.1+ (wasmoon)
- **Monaco Editor Integration**: Syntax highlighting, autocomplete, error detection
- **Variable Management**: Get/set story variables from Lua scripts
- **Standard Library**: Math, string manipulation, and custom functions
- **Safe Execution**: Sandboxed environment with iteration limits
- **Type-Safe**: Full TypeScript support
- **Zero Runtime Dependencies**: Optional monaco-editor peer dependency

## Installation

```bash
pnpm add @writewhisker/scripting

# Optional: Monaco editor for code editing
pnpm add monaco-editor
```

## Quick Start

### Basic Lua Execution

```typescript
import { LuaExecutor } from '@writewhisker/scripting';
import { Story } from '@writewhisker/core-ts';

const story = new Story({ metadata: { title: 'My Story' } });
const executor = new LuaExecutor(story);

// Execute Lua code
const result = executor.execute(`
  health = 100
  score = score + 10
  print("Player health: " .. health)
`);

console.log(result.success); // true
console.log(result.output);  // ["Player health: 100"]

// Get variable
const health = executor.getVariable('health');
console.log(health); // 100

// Set variable
executor.setVariable('score', 50);
```

### Monaco Editor Integration

```typescript
import { initializeLuaSupport, registerLuaLanguage } from '@writewhisker/scripting';
import * as monaco from 'monaco-editor';

// Initialize Monaco with Lua support
await initializeLuaSupport(monaco);

// Create editor with Lua
const editor = monaco.editor.create(document.getElementById('editor'), {
  value: 'health = 100\nprint("Hello!")',
  language: 'lua',
  theme: 'whisker-dark',
});
```

## Core Concepts

### Execution Engines

The package provides two execution modes:

#### 1. **LuaEngine** - Preview Engine (Browser)
- Simplified Lua interpreter in pure TypeScript
- ~30% Lua compatibility
- Instant execution, no WASM overhead
- Good for quick previews and simple scripts

```typescript
import { LuaEngine } from '@writewhisker/scripting';

const engine = new LuaEngine();
const result = engine.execute('x = 10 + 5');
```

**Supported Features:**
- ✅ Variables (numbers, strings, booleans)
- ✅ Arithmetic operators (+, -, *, /, %)
- ✅ Comparison operators (==, ~=, <, >, <=, >=)
- ✅ Logical operators (and, or, not)
- ✅ If/then/else statements
- ✅ While loops (basic, max 10000 iterations)
- ✅ Numeric for loops (for i=1,10 do...end)
- ✅ Limited stdlib (math.random, math.floor, string.upper, string.lower, print)

**Not Supported:**
- ❌ Function definitions (function...end)
- ❌ Generic for loops (for k,v in pairs...)
- ❌ Tables (very limited)
- ❌ Most standard library functions

#### 2. **wasmoon** - Full Lua (Production)
- Complete Lua 5.1+ implementation via WebAssembly
- 100% Lua compatibility
- Larger bundle size (~200KB)
- Production-ready

```typescript
// wasmoon integration example (when deployed)
import { LuaFactory } from 'wasmoon';

const factory = new LuaFactory();
const lua = await factory.createEngine();

try {
  await lua.doString(`
    function fibonacci(n)
      if n <= 1 then return n end
      return fibonacci(n-1) + fibonacci(n-2)
    end

    print(fibonacci(10))
  `);
} finally {
  lua.global.close();
}
```

### LuaExecutor

The `LuaExecutor` class integrates Lua with your story:

```typescript
import { LuaExecutor } from '@writewhisker/scripting';
import { Story } from '@writewhisker/core-ts';

const executor = new LuaExecutor(story);

// Execute script
const result = executor.execute(`
  -- Access story variables
  local currentHP = health or 100

  -- Modify variables
  health = currentHP - 10

  -- Use Lua logic
  if health <= 0 then
    health = 0
    gameOver = true
  end

  -- Output for debugging
  print("Health: " .. health)
`);

// Check result
if (result.success) {
  console.log('Output:', result.output);
  console.log('New health:', executor.getVariable('health'));
} else {
  console.error('Errors:', result.errors);
}
```

## Advanced Usage

### Variable Management

Access and modify story variables from Lua:

```typescript
// Set variables before execution
executor.setVariable('playerName', 'Alice');
executor.setVariable('score', 0);
executor.setVariable('inventory', ['sword', 'potion']);

// Execute script that modifies variables
executor.execute(`
  score = score + 100
  table.insert(inventory, "gold")
  print("Welcome, " .. playerName)
`);

// Get modified variables
const newScore = executor.getVariable('score'); // 100
const inv = executor.getVariable('inventory'); // ['sword', 'potion', 'gold']

// Check if variable exists
const hasKey = executor.hasVariable('hasKey'); // false

// Delete variable
executor.deleteVariable('tempVar');

// Get all variables
const allVars = executor.getAllVariables();
```

### Context Management

Manage execution context for isolation:

```typescript
// Create new context
const context = executor.createContext();

// Execute in specific context
const result = executor.executeInContext(`
  local_var = 42
`, context);

// Context is isolated from global scope
console.log(executor.getVariable('local_var')); // undefined

// Reset context
executor.resetContext(context);

// Get global context
const globalContext = executor.getGlobalContext();
```

### Error Handling

Handle execution errors gracefully:

```typescript
const result = executor.execute(`
  health = "invalid" + 10  -- Type error
`);

if (!result.success) {
  console.error('Execution failed');
  result.errors.forEach(error => {
    console.error(`- ${error}`);
  });
}

// Get detailed error info
if (result.errors.length > 0) {
  const firstError = result.errors[0];
  // Parse error location if available
  const match = firstError.match(/line (\d+)/);
  if (match) {
    const line = parseInt(match[1]);
    console.log(`Error on line ${line}`);
  }
}
```

### Standard Library Extensions

Add custom functions to the Lua environment:

```typescript
const engine = new LuaEngine();

// Add custom function (simplified engine)
engine.registerFunction('greet', (name: string) => {
  return `Hello, ${name}!`;
});

const result = engine.execute(`
  message = greet("World")
  print(message)
`);
// Output: ["Hello, World!"]
```

### Passage Script Integration

Execute scripts on passage events:

```typescript
import { StoryPlayer } from '@writewhisker/core-ts';
import { LuaExecutor } from '@writewhisker/scripting';

const player = new StoryPlayer(story);
const executor = new LuaExecutor(story);

// Execute passage enter scripts
player.on('passageEntered', (passage) => {
  if (passage.onEnterScript) {
    const result = executor.execute(passage.onEnterScript);
    if (!result.success) {
      console.error('Script error:', result.errors);
    }
  }
});

// Execute passage exit scripts
player.on('passageExited', (passage) => {
  if (passage.onExitScript) {
    executor.execute(passage.onExitScript);
  }
});

// Execute choice scripts
player.on('choiceMade', (choice) => {
  if (choice.script) {
    executor.execute(choice.script);
  }
});
```

## Monaco Editor Integration

### Setup

Initialize Monaco with Lua language support:

```typescript
import * as monaco from 'monaco-editor';
import {
  registerLuaLanguage,
  registerStoryTheme,
  initializeLuaSupport
} from '@writewhisker/scripting';

// Full initialization (language + theme)
await initializeLuaSupport(monaco);

// Or initialize separately
registerLuaLanguage(monaco);
registerStoryTheme(monaco);
```

### Create Lua Editor

```typescript
const editor = monaco.editor.create(container, {
  value: initialCode,
  language: 'lua',
  theme: 'whisker-dark',
  minimap: { enabled: false },
  fontSize: 14,
  tabSize: 2,
});
```

### Autocomplete

Custom autocomplete for story variables:

```typescript
import { LuaExecutor } from '@writewhisker/scripting';

// Register completion provider
monaco.languages.registerCompletionItemProvider('lua', {
  provideCompletionItems: (model, position) => {
    const suggestions = [];

    // Add story variables
    const variables = executor.getAllVariables();
    Object.keys(variables).forEach(name => {
      suggestions.push({
        label: name,
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: name,
        detail: `Story variable (${typeof variables[name]})`,
      });
    });

    // Add Lua keywords
    const keywords = ['if', 'then', 'else', 'end', 'for', 'while', 'do', 'function', 'local', 'return'];
    keywords.forEach(keyword => {
      suggestions.push({
        label: keyword,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: keyword,
      });
    });

    return { suggestions };
  },
});
```

### Live Error Detection

Show errors as user types:

```typescript
// Execute code and show errors
function validateLuaCode(code: string) {
  const result = executor.execute(code);

  if (!result.success) {
    // Convert to Monaco markers
    const markers = result.errors.map(error => ({
      severity: monaco.MarkerSeverity.Error,
      message: error,
      startLineNumber: 1, // Parse from error message
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    }));

    monaco.editor.setModelMarkers(editor.getModel()!, 'lua', markers);
  } else {
    // Clear errors
    monaco.editor.setModelMarkers(editor.getModel()!, 'lua', []);
  }
}

// Validate on change
editor.onDidChangeModelContent(() => {
  const code = editor.getValue();
  validateLuaCode(code);
});
```

### Syntax Highlighting Theme

The package includes a custom "whisker-dark" theme:

```typescript
// Already registered by initializeLuaSupport()
monaco.editor.setTheme('whisker-dark');

// Or register custom theme
monaco.editor.defineTheme('my-theme', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'C586C0' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'comment', foreground: '6A9955' },
  ],
  colors: {
    'editor.background': '#1E1E1E',
  },
});
```

## Lua Standard Library

### Math Functions

```lua
-- Random numbers
x = math.random()         -- 0.0 to 1.0
x = math.random(10)       -- 1 to 10
x = math.random(5, 10)    -- 5 to 10

-- Rounding
x = math.floor(3.7)       -- 3
x = math.ceil(3.2)        -- 4

-- Other math
x = math.abs(-5)          -- 5
x = math.min(3, 7, 1)     -- 1
x = math.max(3, 7, 1)     -- 7
```

### String Functions

```lua
-- Case conversion
s = string.upper("hello") -- "HELLO"
s = string.lower("WORLD") -- "world"

-- Length
len = string.len("text")  -- 4
len = #"text"             -- 4

-- Substring
s = string.sub("hello", 2, 4) -- "ell"

-- Concatenation
s = "Hello" .. " " .. "World" -- "Hello World"
```

### Print Function

```lua
-- Print outputs to result.output array
print("Hello")
print("Score:", score)
print(string.format("Health: %d", health))
```

## Common Patterns

### Conditional Logic

```lua
if health <= 0 then
  gameOver = true
  print("Game Over!")
elseif health < 20 then
  print("Low health warning!")
else
  print("Health OK")
end
```

### Loops

```lua
-- Numeric for loop
for i = 1, 10 do
  score = score + i
end

-- While loop
count = 0
while count < 5 do
  count = count + 1
  print(count)
end
```

### Random Events

```lua
-- Random chance (50%)
if math.random() < 0.5 then
  foundItem = true
end

-- Random selection
choices = {"sword", "shield", "potion"}
item = choices[math.random(1, #choices)]
```

### Health/Damage System

```lua
-- Damage calculation
damage = math.random(5, 15)
health = health - damage

-- Clamp health
if health < 0 then health = 0 end
if health > 100 then health = 100 end

-- Death check
if health <= 0 then
  alive = false
end
```

### Inventory Management

```lua
-- Check item
hasKey = false
for i = 1, #inventory do
  if inventory[i] == "key" then
    hasKey = true
    break
  end
end

-- Add item
table.insert(inventory, "potion")

-- Remove item (by value)
for i = #inventory, 1, -1 do
  if inventory[i] == "key" then
    table.remove(inventory, i)
    break
  end
end
```

## Performance Tips

1. **Use Preview Engine for Simple Scripts**: For basic variable assignments, use LuaEngine
2. **Limit Loop Iterations**: Both engines limit loops to 10,000 iterations
3. **Avoid Complex Tables**: Tables have limited support in preview engine
4. **Cache Results**: Store frequently calculated values in variables
5. **Use wasmoon for Production**: Deploy with full Lua support for complex logic

## Security Considerations

1. **Sandboxed Execution**: Scripts run in isolated context
2. **No File Access**: Cannot access filesystem
3. **No Network**: Cannot make HTTP requests
4. **Iteration Limits**: Prevents infinite loops
5. **Type Validation**: Variables are type-checked

## API Reference

### `LuaExecutor`

```typescript
class LuaExecutor {
  constructor(story: Story);

  execute(code: string): LuaExecutionResult;
  executeInContext(code: string, context: LuaExecutionContext): LuaExecutionResult;

  getVariable(name: string): any;
  setVariable(name: string, value: any): void;
  hasVariable(name: string): boolean;
  deleteVariable(name: string): void;
  getAllVariables(): Record<string, any>;

  createContext(): LuaExecutionContext;
  resetContext(context: LuaExecutionContext): void;
  getGlobalContext(): LuaExecutionContext;
}
```

### `LuaEngine`

```typescript
class LuaEngine {
  constructor();

  execute(code: string): LuaExecutionResult;
  getVariable(name: string): LuaValue | undefined;
  setVariable(name: string, value: any): void;
  registerFunction(name: string, fn: Function): void;
  reset(): void;
}
```

### Monaco Integration

```typescript
function registerLuaLanguage(monaco: Monaco): void;
function registerStoryTheme(monaco: Monaco): void;
function initializeLuaSupport(monaco: Monaco): Promise<void>;
```

## Limitations

### Preview Engine Limitations

The `LuaEngine` is designed for quick previews and has several limitations:

- **No function definitions**: Cannot define custom functions
- **Limited table support**: Tables are unreliable
- **No metatables**: No metatable support
- **Limited stdlib**: Only basic math/string functions
- **No coroutines**: No coroutine support
- **No modules**: Cannot require/load modules

For production use, deploy to whisker-core with full Lua support via wasmoon.

## Bundle Size

- **Size**: ~10KB (gzipped)
- **Dependencies**: @writewhisker/core-ts, wasmoon (~200KB)
- **Peer Dependencies**: monaco-editor (optional, ~800KB)
- **Tree-shakable**: Yes (`sideEffects: false`)

## Testing

```bash
pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm test:coverage # Coverage report
```

## License

AGPL-3.0

## Related Packages

- [@writewhisker/core-ts](../core-ts) - Core story engine
- [@writewhisker/editor-base](../editor-base) - Code editor UI
- [@writewhisker/validation](../validation) - Script validation

## Support

- [Documentation](https://github.com/writewhisker/whisker-editor-web)
- [Lua Documentation](https://www.lua.org/manual/5.1/)
- [Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- [Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)
