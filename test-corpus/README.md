# Cross-Platform Test Corpus

Shared test suite for validating feature parity between:
- **whisker-core** (Lua)
- **whisker-editor-web** (TypeScript)

## Directory Structure

```
test-corpus/
├── variables/            # Variable operations
├── control-flow/         # If/else, loops
├── functions/            # Function definitions
├── tables/               # Table operations
├── metatables/           # Metatable support
├── coroutines/           # Coroutine support
├── math/                 # Math library
├── lists/                # LIST state machine
├── pcall/                # Protected calls
├── debug/                # Debug library
├── os/                   # OS library
├── validators/           # Validator behavior
└── exporters/            # Export format tests
```

## Test Format (YAML)

```yaml
name: "Test name"
description: "What this test validates"
tags: [variables, basic]

# The WLS code to execute
wls: |
  count = 10
  count = count + 5

# Expected outcomes
assertions:
  # Variable assertions
  - variable: count
    equals: 15

  # Output assertions
  - output:
      contains: "expected text"

  # Error assertions
  - error:
      code: "E001"

# Platform-specific expectations (if different)
platforms:
  lua:
    skip: false
  typescript:
    skip: false
    reason: "Feature not implemented"
```

## Running Tests

### TypeScript (whisker-editor-web)
```bash
cd test-corpus && pnpm test
```

### Lua (whisker-core)
```bash
cd test-corpus && lua runner-lua.lua .
```

## Test Categories

### Language Features (~22 tests)
- Variable assignment and arithmetic
- String operations
- Comparison operators
- Control flow (if/else/elseif)
- Loops (while, for)
- Functions and returns
- Tables and metatables
- Math library
- Coroutines (platform-specific)

### Runtime Features
- LIST state machine operations
- Thread spawning and scheduling
- Timer scheduling (oneshot, repeating)
- External function calls
- Parameterized passages

### Validators
- Dead link detection
- Unreachable passages
- Variable usage
- Syntax validation

### Exporters
- JSON round-trip
- Twine format compatibility
