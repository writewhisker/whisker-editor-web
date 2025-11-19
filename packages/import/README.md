# @writewhisker/import

Import system for Whisker - Convert stories from various formats into Whisker's native format.

## Features

- 📥 **JSON Import** - Lossless import of Whisker native format (v1.0-2.1)
- 🎭 **Twine 2 Import** - Convert Twine 2 HTML stories with intelligent macro conversion
- 🔍 **Auto-Detection** - Automatically detect format from file content
- ⚠️ **Conversion Reporting** - Detailed reports on conversion quality and issues
- ✅ **Validation** - Optional story validation after import
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive type definitions

## Installation

```bash
pnpm add @writewhisker/import
```

## Quick Start

### Import JSON

```typescript
import { JSONImporter } from '@writewhisker/import';

const importer = new JSONImporter();
const result = await importer.import({
  data: jsonString,
  options: {
    validateAfterImport: true,
    preserveIds: true,
  }
});

if (result.success) {
  console.log(`Imported ${result.passageCount} passages`);
  const story = result.story;
  // Use the story...
} else {
  console.error(`Import failed: ${result.error}`);
}
```

### Import Twine 2

```typescript
import { TwineImporter } from '@writewhisker/import';

const importer = new TwineImporter();
const result = await importer.import({
  data: twineHTML,
  options: {
    conversionOptions: {
      convertMacros: true,
      convertVariables: true,
      preserveOriginalSyntax: true,
    }
  }
});

if (result.success) {
  console.log(`Imported ${result.passageCount} passages`);

  // Check conversion quality
  if (result.lossReport) {
    console.log(`Conversion quality: ${result.lossReport.conversionQuality}`);
    console.log(`Total issues: ${result.lossReport.totalIssues}`);
    console.log(`Critical: ${result.lossReport.critical.length}`);
    console.log(`Warnings: ${result.lossReport.warnings.length}`);
  }

  const story = result.story;
} else {
  console.error(`Import failed: ${result.error}`);
}
```

## Supported Formats

### JSON Import ✅ Full Support

**File Extensions:** `.json`

**Features:**
- ✅ Whisker native format (v1.0-2.1)
- ✅ Auto-detection of format version
- ✅ Metadata preservation
- ✅ Variable and tag import
- ✅ Validation during import
- ✅ Error recovery
- ✅ Format migration (old → new)

**Limitations:** None - lossless import

**Example:**
```typescript
const result = await jsonImporter.import({
  data: jsonContent,
  options: {
    validateAfterImport: true,    // Validate story structure
    preserveIds: true,             // Keep original passage IDs
    importMetadata: true,          // Import story metadata
    importTags: true,              // Import passage tags
    importVariables: true,         // Import story variables
  }
});
```

### Twine 2 Import ⚠️ Good Support

**File Extensions:** `.html`

**Supported Story Formats:**
- Harlowe (⚠️ Good - most common format)
- SugarCube (⚠️ Good - second most common)
- Chapbook (⚠️ Fair - simpler format)
- Snowman (⚠️ Fair - JavaScript-based)

**Features:**
- ✅ HTML parsing and passage extraction
- ✅ Link detection and conversion
- ✅ Tag import
- ✅ Position/size preservation
- ⚠️ Macro conversion (format-dependent)
- ⚠️ Variable conversion (basic support)
- ✅ Conversion quality reporting

**Macro Support:**

**Fully Supported (Auto-converted):**
- `[[Link]]` → Whisker choice syntax
- `[[Text|Target]]` → Choice with custom text
- `<<set>>` → Variable assignment (basic)
- `<<if>>` / `<<else>>` → Conditional content (basic)
- `<<display>>` → Passage embedding (basic)

**Partially Supported (May require manual fixes):**
- `<<link>>` → Converted to simple choice
- `<<button>>` → Converted to choice
- Complex variable expressions → Simplified
- JavaScript expressions → Comments

**Not Supported (Preserved as comments):**
- `<<widget>>` → No equivalent (use Lua functions)
- Time-based modifiers → No equivalent
- Audio/video macros → Preserved as TODO
- Advanced SugarCube features → Manual conversion needed

**Example:**
```typescript
const result = await twineImporter.import({
  data: twineHTML,
  filename: 'story.html',
  options: {
    conversionOptions: {
      convertMacros: true,               // Convert supported macros
      convertVariables: true,            // Convert variable syntax
      preserveOriginalSyntax: true,      // Keep original as comments
      strictMode: false,                 // Don't fail on unknown macros
    }
  }
});

// Review conversion report
if (result.lossReport) {
  const { conversionQuality, totalIssues, critical, warnings } = result.lossReport;

  console.log(`Quality: ${(conversionQuality * 100).toFixed(0)}%`);
  console.log(`Issues: ${totalIssues}`);

  // Review critical issues
  critical.forEach(issue => {
    console.log(`❌ ${issue.passageName}: ${issue.message}`);
    if (issue.suggestion) {
      console.log(`   💡 ${issue.suggestion}`);
    }
  });

  // Review warnings
  warnings.forEach(issue => {
    console.log(`⚠️  ${issue.passageName}: ${issue.message}`);
  });
}
```

## Known Limitations

### Twine Import Limitations

1. **Macro Conversion** - Not all Twine macros have Whisker equivalents
   - **Impact:** Some features may need manual conversion
   - **Workaround:** Review conversion report, use Lua for advanced features

2. **JavaScript Expressions** - Complex JS converted to comments
   - **Impact:** Requires rewriting logic
   - **Workaround:** Use Whisker conditions or Lua scripts

3. **Widget Definitions** - No direct equivalent
   - **Impact:** Custom Twine widgets don't convert
   - **Workaround:** Create Lua functions instead

4. **Audio/Video** - Basic preservation only
   - **Impact:** Media references preserved but not fully converted
   - **Workaround:** Use Whisker audio features after import

5. **Styling** - Inline styles may be lost
   - **Impact:** Visual formatting may need recreation
   - **Workaround:** Apply styles in Whisker editor

### JSON Import Limitations

1. **Version Compatibility** - Very old formats may fail
   - **Impact:** Ancient Whisker files might not import
   - **Workaround:** Export from older Whisker version first

2. **External Resources** - Absolute paths may break
   - **Impact:** Media references could be invalid
   - **Workaround:** Use relative paths or embed resources

## Conversion Quality

The `LossReport` interface provides detailed information about conversion issues:

```typescript
interface LossReport {
  totalIssues: number;                 // Total conversion issues
  critical: ConversionIssue[];          // Features that couldn't convert
  warnings: ConversionIssue[];          // Partial conversions
  info: ConversionIssue[];              // Informational notes
  categoryCounts: Record<string, number>;  // Issues by category
  affectedPassages: string[];           // Which passages need review
  conversionQuality: number;            // 0-1 quality estimate
}
```

### Interpreting Conversion Quality

- **1.0** → Perfect conversion, no issues
- **0.8-0.99** → Excellent, minor warnings
- **0.6-0.79** → Good, some manual fixes needed
- **0.4-0.59** → Fair, significant review required
- **<0.4** → Poor, extensive manual work needed

### Conversion Issue Details

```typescript
interface ConversionIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;                    // e.g., 'macro', 'syntax', 'variable'
  feature: string;                     // What couldn't be converted
  passageId?: string;
  passageName?: string;
  line?: number;
  original?: string;                   // Original syntax
  suggestion?: string;                 // Recommended fix
  message: string;                     // Detailed explanation
}
```

## Import Options

### Common Options

```typescript
interface ImportOptions {
  // Format detection
  format?: 'json' | 'twine';          // Auto-detected if not specified

  // Validation
  validateAfterImport?: boolean;       // Run validation after import
  strictMode?: boolean;                // Fail on any errors

  // Merging
  mergeStrategy?: 'replace' | 'merge' | 'duplicate';

  // Content preservation
  preserveIds?: boolean;               // Keep original passage IDs
  importMetadata?: boolean;            // Import story metadata
  importTags?: boolean;                // Import passage tags
  importVariables?: boolean;           // Import story variables

  // Transformation
  transformTitles?: (title: string) => string;
  customHandlers?: Record<string, (data: unknown) => unknown>;

  // Twine-specific
  conversionOptions?: ConversionOptions;
}
```

### Twine Conversion Options

```typescript
interface ConversionOptions {
  convertVariables?: boolean;          // Auto-convert $var to {{var}}
  preserveOriginalSyntax?: boolean;    // Keep original as comments
  strictMode?: boolean;                // Fail on unknown macros
  convertMacros?: boolean;             // Convert macros to Whisker syntax
  targetVersion?: string;              // Target Whisker syntax version
}
```

## Import Result

Every import operation returns an `ImportResult`:

```typescript
interface ImportResult {
  success: boolean;
  story?: Story;
  validation?: ValidationResult;
  duration?: number;                   // Import duration in milliseconds
  passageCount?: number;
  variableCount?: number;
  error?: string;
  warnings?: string[];
  lossReport?: LossReport;             // Twine conversions only
  skipped?: {
    passages?: string[];
    variables?: string[];
    metadata?: string[];
  };
}
```

## Advanced Usage

### Auto-Format Detection

```typescript
import { detectFormat } from '@writewhisker/import';

const detection = await detectFormat(fileContent);
if (detection.format) {
  console.log(`Detected format: ${detection.format}`);
  console.log(`Confidence: ${(detection.confidence * 100).toFixed(0)}%`);
  console.log(`Reason: ${detection.reason}`);
}
```

### Custom Import Handlers

```typescript
const result = await importer.import({
  data: content,
  options: {
    customHandlers: {
      'customField': (data) => {
        // Transform custom field data
        return transformedData;
      }
    }
  }
});
```

### Batch Import with Progress Tracking

```typescript
const files = ['story1.html', 'story2.html', 'story3.html'];
const results = [];

for (const file of files) {
  const content = await readFile(file);
  const result = await twineImporter.import({
    data: content,
    filename: file,
  });

  results.push({
    file,
    success: result.success,
    passages: result.passageCount,
    quality: result.lossReport?.conversionQuality,
  });

  console.log(`Imported ${file}: ${result.success ? '✅' : '❌'}`);
}

// Summary
const successful = results.filter(r => r.success).length;
console.log(`Successfully imported ${successful}/${files.length} files`);
```

## Recommended Workflows

### Workflow: Twine → Whisker Migration

```typescript
// 1. Import Twine file
const result = await twineImporter.import({
  data: twineHTML,
  options: {
    validateAfterImport: true,
    conversionOptions: {
      convertMacros: true,
      convertVariables: true,
      preserveOriginalSyntax: true,
    }
  }
});

// 2. Check conversion quality
if (!result.success) {
  throw new Error(`Import failed: ${result.error}`);
}

const quality = result.lossReport?.conversionQuality || 0;
console.log(`Conversion quality: ${(quality * 100).toFixed(0)}%`);

// 3. Review and fix critical issues
const critical = result.lossReport?.critical || [];
if (critical.length > 0) {
  console.log('\n⚠️  Critical issues requiring manual fixes:');
  critical.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue.passageName}: ${issue.message}`);
    if (issue.suggestion) {
      console.log(`   💡 Suggestion: ${issue.suggestion}`);
    }
  });
}

// 4. Review warnings
const warnings = result.lossReport?.warnings || [];
if (warnings.length > 0) {
  console.log('\nℹ️  Warnings to review:');
  warnings.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue.passageName}: ${issue.message}`);
  });
}

// 5. Save imported story
if (quality >= 0.6) {
  console.log('\n✅ Conversion quality acceptable - story ready for review');
  // Save story to JSON for backup
} else {
  console.log('\n❌ Conversion quality low - extensive manual work needed');
}
```

## Testing

This package includes comprehensive tests:

```bash
# Run all tests
pnpm test

# Run tests once
pnpm test:run

# Coverage report
pnpm test:coverage

# Type check
pnpm check
```

**Test Coverage:**
- 105 total tests
- JSONImporter: 26 tests
- TwineImporter: 79 tests
- Integration tests with real-world files
- >80% code coverage target

## API Reference

### JSONImporter

```typescript
class JSONImporter implements IImporter {
  readonly name = 'JSON Importer';
  readonly format = 'json';
  readonly extensions = ['.json'];

  async import(context: ImportContext): Promise<ImportResult>;
  canImport(data: string | object): boolean;
  validate(data: string | object): string[];
  getFormatVersion(data: string | object): string;
}
```

### TwineImporter

```typescript
class TwineImporter implements IImporter {
  readonly name = 'Twine Importer';
  readonly format = 'twine';
  readonly extensions = ['.html'];

  async import(context: ImportContext): Promise<ImportResult>;
  canImport(data: string | object): boolean;
  validate(data: string | object): string[];
  getFormatVersion(data: string | object): string;
}
```

## Error Handling

```typescript
try {
  const result = await importer.import({ data, options });

  if (!result.success) {
    // Handle import failure
    console.error(`Import failed: ${result.error}`);

    // Check for warnings even on failure
    if (result.warnings) {
      result.warnings.forEach(warning => console.warn(warning));
    }

    return;
  }

  // Handle successful import
  const story = result.story!;

} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected import error:', error);
}
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  ImportFormat,
  ImportOptions,
  ImportResult,
  ImportContext,
  IImporter,
  ConversionOptions,
  ConversionIssue,
  ConversionSeverity,
  LossReport,
} from '@writewhisker/import';
```

## Related Documentation

- **[IMPORT_EXPORT_MATRIX.md](../../IMPORT_EXPORT_MATRIX.md)** - Complete format capabilities matrix
- **[@writewhisker/export](../export/README.md)** - Export stories to various formats
- **[@writewhisker/core-ts](../core-ts/README.md)** - Core story engine

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT

## Version History

### 0.1.0
- Initial release
- JSON import (Whisker v1.0-2.1)
- Twine 2 import (Harlowe, SugarCube, Chapbook, Snowman)
- Conversion quality reporting
- 105 tests passing
