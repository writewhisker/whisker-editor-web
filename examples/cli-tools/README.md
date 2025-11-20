# CLI Tools Example

Command-line tools for Whisker story management, validation, and publishing.

## Features

- ✅ Story validation
- ✅ Export to multiple formats (HTML, JSON)
- ✅ Story information display
- ✅ Batch operations
- ✅ CI/CD integration ready

## Installation

```bash
npm install
npm run build
npm link
```

## Usage

### Validate Story

```bash
whisker validate story.json
```

### Export Story

```bash
# Export to HTML
whisker export story.json -f html -o story.html

# Export to JSON
whisker export story.json -f json -o story.exported.json
```

### Display Story Info

```bash
whisker info story.json
```

## CI/CD Integration

```yaml
# .github/workflows/validate.yml
name: Validate Story

on: [push]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g @whisker-examples/cli-tools
      - run: whisker validate story.json
```

## License

AGPL-3.0
