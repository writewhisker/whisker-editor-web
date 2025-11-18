# @writewhisker/validation

Story validation CLI and programmatic API for Whisker interactive fiction.

## Installation

```bash
npm install @writewhisker/validation @writewhisker/core-ts
```

Or install globally for CLI usage:

```bash
npm install -g @writewhisker/validation
```

## CLI Usage

### Basic Validation

```bash
# Validate a single story
whisker-validate story.json

# Validate multiple stories
whisker-validate story1.json story2.json

# Use glob patterns
whisker-validate ./stories/*.json
```

### Output Formats

```bash
# Console output (default, colored)
whisker-validate story.json

# JSON output
whisker-validate story.json --format json

# JUnit XML (for CI/CD)
whisker-validate story.json --format junit --output report.xml

# HTML report
whisker-validate story.json --format html --output report.html
```

### CI/CD Integration

#### GitHub Actions

``yaml
name: Validate Stories
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install -g @writewhisker/validation
      - run: whisker-validate stories/*.json --format junit --output test-results.xml
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results.xml
```

#### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run validate
```

```json
// package.json
{
  "scripts": {
    "validate": "whisker-validate stories/*.json"
  }
}
```

## Programmatic API

### Basic Usage

```typescript
import { validateStory } from '@writewhisker/validation';
import type { StoryData } from '@writewhisker/core-ts';

const story: StoryData = {
  // ... your story data
};

const result = validateStory(story);

if (!result.valid) {
  console.error('Validation failed:');
  result.errors.forEach(err => {
    console.error(`  - ${err.message}`);
    if (err.suggestion) {
      console.log(`    💡 ${err.suggestion}`);
    }
  });
}
```

### Custom Validation

```typescript
import { createDefaultValidator } from '@writewhisker/validation';

const validator = createDefaultValidator();
const result = validator.validate(story);

// Access detailed results
console.log(`Errors: ${result.errors.length}`);
console.log(`Warnings: ${result.warnings.length}`);
console.log(`Info: ${result.info.length}`);
```

### Using Reporters

```typescript
import { validateStory, createReporter } from '@writewhisker/validation';

const result = validateStory(story);

// Generate HTML report
const htmlReporter = createReporter('html');
const htmlOutput = htmlReporter.format(result);
await fs.writeFile('report.html', htmlOutput);

// Generate JSON report
const jsonReporter = createReporter('json');
const jsonOutput = jsonReporter.format(result);
console.log(jsonOutput);
```

### Validation with Auto-fix

```typescript
import { createAutoFixer, validateStory } from '@writewhisker/validation';

// Run validation
let result = validateStory(story);

// Auto-fix common issues
if (!result.valid) {
  const fixer = createAutoFixer();
  const fixed = fixer.fix(story, result);

  // Re-validate
  result = validateStory(fixed);
  console.log(`Fixed story valid: ${result.valid}`);
}
```

### Quality Analysis

```typescript
import { createQualityAnalyzer } from '@writewhisker/validation';

const analyzer = createQualityAnalyzer();
const quality = analyzer.analyze(story);

console.log(`Quality Score: ${quality.score}/100`);
console.log(`Complexity: ${quality.complexity}`);
console.log(`Dead Ends: ${quality.deadEnds.length}`);
console.log(`Unreachable Passages: ${quality.unreachablePassages.length}`);
```

## Validation Rules

The validator checks for:

### Errors (Must Fix)
- **Missing Start Passage** - Story must have a valid start passage
- **Dead Links** - All choice targets must reference existing passages
- **Invalid IFID** - Story metadata must have a valid IFID
- **Script Errors** - Lua/JavaScript syntax must be valid
- **Missing Variables** - Referenced variables must be defined

### Warnings (Should Fix)
- **Empty Passages** - Passages should have content
- **Unreachable Passages** - All passages should be reachable from start
- **Unused Variables** - Defined variables should be used
- **Dead Ends** - Passages without choices should be intentional

### Info (Nice to Have)
- **Missing Metadata** - Story should have title, author, etc.
- **Style Suggestions** - CSS validation
- **Asset Validation** - Check referenced images/audio exist

## Output Formats

### Console (Default)

Colored, human-readable output with symbols:
- ✗ Errors (red)
- ⚠ Warnings (yellow)
- ℹ Info (blue)

### JSON

Machine-readable format:
```json
{
  "valid": false,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "total": 3,
    "errors": 1,
    "warnings": 2,
    "info": 0
  },
  "issues": {
    "errors": [...],
    "warnings": [...],
    "info": []
  }
}
```

### JUnit XML

CI/CD compatible format for test reporting systems.

### HTML

Beautiful HTML report with:
- Summary cards
- Color-coded issues
- Suggestions and paths
- Responsive design

## API Reference

### Functions

- `validateStory(story)` - Validate a story and return results
- `validateStoryOrThrow(story)` - Validate and throw on errors
- `createDefaultValidator()` - Create validator instance
- `createReporter(format)` - Create reporter instance
- `createAutoFixer()` - Create auto-fixer instance
- `createQualityAnalyzer()` - Create quality analyzer

### Types

- `ValidationResult` - Result of validation
- `ValidationIssue` - Individual issue
- `ValidationSeverity` - Error/Warning/Info
- `ReporterFormat` - console/json/junit/html

## Examples

See the [examples/](./examples/) directory for:
- GitHub Actions workflow
- Pre-commit hook
- Custom validator
- Automated fixing
- Quality reporting

## License

AGPL-3.0
