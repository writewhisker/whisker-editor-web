# @writewhisker/macros

Template engine for Whisker interactive fiction with support for loops, function calls, and custom macros.

## Features

- **Loop Macros**: `{{for}}` and `{{each}}` for iteration
- **Function Calls**: `{{call}}` to invoke registered functions
- **Variable Interpolation**: `{{var}}` for inserting values
- **Conditionals**: `{{if}}` for conditional rendering
- **Custom Macros**: Plugin system for custom macro registration
- **Safe Execution**: Maximum iteration limits and depth protection
- **TypeScript**: Fully typed API

## Installation

```bash
pnpm add @writewhisker/macros
```

## Quick Start

```typescript
import { processTemplate } from '@writewhisker/macros';

const template = `
Hello, {{var playerName}}!

Your inventory:
{{each item in inventory}}
- {{var item.name}} (quantity: {{var item.quantity}})
{{end}}

Numbers 1-10:
{{for i in range(1, 10)}}
  {{var i}}
{{end}}
`;

const result = await processTemplate(template, {
  playerName: 'Alice',
  inventory: [
    { name: 'Sword', quantity: 1 },
    { name: 'Potion', quantity: 3 },
  ],
});

console.log(result.output);
```

## Built-in Macros

### {{for}} - Numeric Loops

Iterate over a numeric range.

**Syntax:**
```
{{for variableName in range(start, end)}}
  ...
{{end}}

{{for variableName in range(start, end, step)}}
  ...
{{end}}
```

**Examples:**
```
{{for i in range(1, 5)}}
  Iteration {{var i}}
{{end}}
// Output: Iteration 1, Iteration 2, Iteration 3, Iteration 4, Iteration 5

{{for i in range(0, 10, 2)}}
  {{var i}}
{{end}}
// Output: 0, 2, 4, 6, 8, 10

{{for i in range(5, 1, -1)}}
  {{var i}}
{{end}}
// Output: 5, 4, 3, 2, 1
```

### {{each}} - Collection Iteration

Iterate over arrays and objects.

**Syntax:**
```
{{each item in collection}}
  ...
{{end}}

{{each key,value in collection}}
  ...
{{end}}
```

**Examples:**
```typescript
// Array iteration
const template = `
{{each item in items}}
- {{var item}}
{{end}}
`;

const result = await processTemplate(template, {
  items: ['Apple', 'Banana', 'Orange'],
});
// Output:
// - Apple
// - Banana
// - Orange

// Array with index
const template2 = `
{{each index,item in items}}
{{var index}}: {{var item}}
{{end}}
`;

// Object iteration
const template3 = `
{{each key,value in player}}
{{var key}}: {{var value}}
{{end}}
`;

const result3 = await processTemplate(template3, {
  player: {
    name: 'Alice',
    level: 5,
    health: 100,
  },
});
// Output:
// name: Alice
// level: 5
// health: 100
```

### {{call}} - Function Calls

Call registered functions with arguments.

**Syntax:**
```
{{call functionName(arg1, arg2, ...)}}
```

**Examples:**
```typescript
const template = `
Damage: {{call calculateDamage(playerAttack, enemyDefense)}}
Greeting: {{call greet(playerName)}}
`;

const result = await processTemplate(
  template,
  {
    playerAttack: 50,
    enemyDefense: 20,
    playerName: 'Alice',
  },
  {
    calculateDamage: (attack: number, defense: number) => {
      return Math.max(0, attack - defense);
    },
    greet: (name: string) => {
      return `Hello, ${name}!`;
    },
  }
);
// Output:
// Damage: 30
// Greeting: Hello, Alice!
```

### {{var}} - Variable Interpolation

Insert variable values into the template.

**Syntax:**
```
{{var variableName}}
{{var object.property}}
```

**Examples:**
```typescript
const template = `
Name: {{var player.name}}
Level: {{var player.level}}
Health: {{var player.stats.health}}/{{var player.stats.maxHealth}}
`;

const result = await processTemplate(template, {
  player: {
    name: 'Alice',
    level: 5,
    stats: {
      health: 80,
      maxHealth: 100,
    },
  },
});
```

### {{if}} - Conditionals

Conditionally render content based on variable values.

**Syntax:**
```
{{if condition}}
  ...
{{end}}
```

**Examples:**
```typescript
const template = `
{{if hasKey}}
You unlock the door.
{{end}}

{{if health}}
You are alive!
{{end}}
`;

const result = await processTemplate(template, {
  hasKey: true,
  health: 100,
});
```

## Advanced Usage

### Creating a Processor Instance

For more control, create a `MacroProcessor` instance:

```typescript
import { MacroProcessor } from '@writewhisker/macros';

const processor = new MacroProcessor();

const context = {
  variables: new Map([
    ['name', 'Alice'],
    ['score', 100],
  ]),
  functions: new Map([
    ['double', {
      name: 'double',
      execute: (x: number) => x * 2,
    }],
  ]),
  customMacros: new Map(),
};

const result = await processor.process(template, context);
```

### Custom Macros

Register your own macros:

```typescript
import { MacroProcessor, CustomMacro } from '@writewhisker/macros';

const processor = new MacroProcessor();

// Define a custom macro
const uppercaseMacro: CustomMacro = {
  name: 'uppercase',
  type: 'block',
  hasEndBlock: true,
  description: 'Convert content to uppercase',

  async process(args, context) {
    return (args.content || '').toUpperCase();
  },
};

// Register it
processor.getRegistry().register(uppercaseMacro);

// Use it
const template = `
{{uppercase}}
this will be uppercase
{{end}}
`;

const result = await processor.process(template, context);
// Output: THIS WILL BE UPPERCASE
```

### Inline Macros

Create inline macros without end blocks:

```typescript
const timeMacro: CustomMacro = {
  name: 'time',
  type: 'inline',
  hasEndBlock: false,
  description: 'Insert current time',

  async process(args, context) {
    return new Date().toLocaleTimeString();
  },
};

processor.getRegistry().register(timeMacro);

// Use: The time is {{time}}
```

### Processing Options

Configure macro processor behavior:

```typescript
const result = await processor.process(template, context, {
  strict: true,              // Throw errors instead of displaying them
  maxIterations: 5000,       // Maximum loop iterations
  maxDepth: 50,              // Maximum nesting depth
  delimiterStart: '<%',      // Custom delimiter start
  delimiterEnd: '%>',        // Custom delimiter end
  allowUnsafe: false,        // Allow unsafe operations
});
```

## API Reference

### Types

#### `MacroContext`
Execution context containing variables, functions, and custom macros.

#### `CustomMacro`
Definition for a custom macro implementation.

#### `MacroFunction`
Definition for a callable function.

#### `MacroResult`
Result of macro processing with output or error.

### Classes

#### `MacroProcessor`
Main processor for template rendering.

**Methods:**
- `process(template: string, context: MacroContext, options?: MacroProcessorOptions): Promise<MacroResult>`
- `getRegistry(): IMacroRegistry`

#### `MacroRegistry`
Registry for managing custom macros.

**Methods:**
- `register(macro: CustomMacro): void`
- `unregister(name: string): boolean`
- `get(name: string): CustomMacro | undefined`
- `has(name: string): boolean`
- `list(): string[]`
- `clear(): void`

### Functions

#### `processTemplate()`
Convenience function for simple template processing.

```typescript
function processTemplate(
  template: string,
  variables?: Record<string, any>,
  functions?: Record<string, (...args: any[]) => any>,
  options?: MacroProcessorOptions
): Promise<MacroResult>
```

#### `createMacroProcessor()`
Create a new MacroProcessor instance.

```typescript
function createMacroProcessor(): MacroProcessor
```

## Error Handling

By default, errors are displayed inline in the output:

```typescript
const template = '{{unknown}}';
const result = await processTemplate(template);
// Output: [Unknown macro: unknown]
```

Enable strict mode to throw errors:

```typescript
const result = await processTemplate(template, {}, {}, { strict: true });
// Throws: Error: Unknown macro: unknown
```

## Performance

The macro system includes safety limits:

- **Maximum iterations**: 10,000 by default (configurable)
- **Maximum nesting depth**: 100 by default (configurable)
- **Loop variable scoping**: Each iteration gets its own scope

## Examples

### Story Inventory System

```typescript
const template = `
# Inventory

{{if hasItems}}
You have {{var itemCount}} items:

{{each item in inventory}}
- {{var item.name}}
  {{if item.description}}
  Description: {{var item.description}}
  {{end}}
  Quantity: {{var item.quantity}}
  {{if item.magical}}
  ✨ Magical item!
  {{end}}
{{end}}
{{end}}

{{if !hasItems}}
Your inventory is empty.
{{end}}
`;

const result = await processTemplate(template, {
  hasItems: true,
  itemCount: 2,
  inventory: [
    {
      name: 'Healing Potion',
      description: 'Restores 50 HP',
      quantity: 3,
      magical: true,
    },
    {
      name: 'Rusty Sword',
      quantity: 1,
      magical: false,
    },
  ],
});
```

### Multiplication Table

```typescript
const template = `
Multiplication Table:

{{for i in range(1, 10)}}
{{for j in range(1, 10)}}
{{call multiply(i, j)}}
{{end}}
{{end}}
`;

const result = await processTemplate(
  template,
  {},
  {
    multiply: (a: number, b: number) => (a * b).toString().padStart(4, ' '),
  }
);
```

## License

MIT

## Related Packages

- `@writewhisker/core-ts` - Core Whisker data models
- `@writewhisker/scripting` - Lua scripting engine
- `@writewhisker/export` - Story export system
