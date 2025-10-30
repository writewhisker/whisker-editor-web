# Integration Test Fixtures

This directory contains shared test stories in Whisker format for integration testing between whisker-editor-web and whisker-core.

## Purpose

These fixtures are used to validate:
- Format compatibility across versions (v1.0, v2.0, v2.1)
- Round-trip conversion (editor ↔ core)
- Script execution compatibility
- Data preservation through import/export cycles

## Test Stories

### minimal-v2.0.json
**Format**: Whisker v2.0
**Features**: Minimal story with two passages, one variable, one choice
**Tests**: Basic format structure, passage navigation, simple variables

### with-functions-v2.1.json
**Format**: Whisker v2.1
**Features**: Story with editorData namespace, Lua functions, choices with conditions/actions
**Tests**: v2.1 format, editorData preservation, Lua function library, conditional choices

### complex-scripts-v2.0.json
**Format**: Whisker v2.0
**Features**: Complex Lua scripts with conditionals, loops, and tables
**Tests**: Script compatibility, control flow, table operations, pairs() iterator

## Usage in Tests

```typescript
import minimalStory from './fixtures/stories/minimal-v2.0.json';
import { fromWhiskerCoreFormat, toWhiskerCoreFormat } from '@/lib/utils/whiskerCoreAdapter';

// Test round-trip conversion
const editorData = fromWhiskerCoreFormat(minimalStory);
const coreData = toWhiskerCoreFormat(editorData);
expect(coreData).toMatchObject(minimalStory);
```

## Adding New Fixtures

When adding new test stories:
1. Use valid Whisker format (v2.0 or v2.1)
2. Include descriptive metadata (title, description, ifid)
3. Use deterministic UUIDs (00000000-0000-4000-8000-00000000000X)
4. Use ISO timestamps (2025-10-29T00:00:00.000Z)
5. Document the fixture purpose in this README

## Schema Validation

All fixtures should validate against the Whisker format schemas:
- `WHISKER_FORMAT_SPEC_V2.1.md` for format specification
- JSON Schema validation (see `src/lib/validation/whiskerSchema.ts`)
