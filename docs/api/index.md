# API Reference

Whisker provides two implementations:

- **TypeScript**: For web editors and browser-based players
- **Lua**: For game engines and embedded applications

## TypeScript Packages

| Package | Description |
|---------|-------------|
| `@writewhisker/parser` | Parse WLS source into AST |
| `@writewhisker/story-models` | Story, Passage, and Choice models |
| `@writewhisker/story-validation` | Validate stories with WLS error codes |
| `@writewhisker/story-player` | Execute stories and manage state |
| `@writewhisker/scripting` | Lua scripting engine integration |
| `@writewhisker/import` | Import from Twine, Ink, ChoiceScript |
| `@writewhisker/export` | Export to HTML, ePub, PWA |
| `@writewhisker/publishing` | Publish to GitHub Pages, itch.io, IFDB |

## Lua Modules

| Module | Description |
|--------|-------------|
| `whisker.parser` | WLS parser and lexer |
| `whisker.runtime` | Story execution runtime |
| `whisker.validators` | Validation with WLS error codes |
| `whisker.format` | Format converters (Twine, Ink) |
| `whisker.export` | Exporters (HTML, ePub, Ink) |

## Error Codes

All validators use unified WLS error codes in the format `WLS-{CATEGORY}-{NUMBER}`:

| Category | Code | Description |
|----------|------|-------------|
| Structure | STR | Missing start, duplicates, unreachable |
| Links | LNK | Dead links, special targets |
| Variables | VAR | Undefined, unused, scoping |
| Expressions | EXP | Syntax errors in expressions |
| Types | TYP | Type mismatches |
| Flow | FLW | Cycles, dead ends, infinite loops |
| Quality | QUA | Complexity metrics |

See the [Error Code Reference](/api/error-codes) for complete details.
