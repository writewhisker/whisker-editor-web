# Conversion Method Updates for Stages 1.2 & 1.3

Due to the extensive changes needed, I'll update the methods in chunks. This document tracks the key changes needed.

## Changes Required

### 1. Update method signatures to accept ConversionTracker

```typescript
private convertToWhisker(
  twineStory: TwineStory,
  storyFormat: TwineFormat,
  warnings: string[],
  tracker: ConversionTracker  // NEW
): Story

private convertPassageText(
  text: string,
  format: TwineFormat,
  warnings: string[],
  tracker: ConversionTracker,  // NEW
  passageId?: string,          // NEW
  passageName?: string         // NEW
): string

private convertFromHarlowe(
  text: string,
  warnings: string[],
  tracker: ConversionTracker,  // NEW
  passageId?: string,          // NEW
  passageName?: string         // NEW
): string

// Same for convertFromSugarCube and convertFromChapbook
```

### 2. Advanced Syntax Support

#### SugarCube Advanced:
- `<<if>>`/`<<elseif>>`/`<<else>>` chains
- Nested macros
- Temp variables `_var` vs story variables `$var`
- Complex expressions in `<<set>>`

#### Harlowe Advanced:
- Chained hooks with conditionals
- Named hooks `|name>[content]`
- More data structure patterns

#### Chapbook Advanced:
- Time-based modifiers `[after 2s]`
- Variable modifiers

### 3. Issue Tracking Examples

```typescript
// Track unsupported <<include>> macro
tracker.addIssue('critical', 'macro', '<<include>>',
  'The <<include>> macro is not supported - passage inclusion must be done manually', {
    passageId,
    passageName,
    original: '<<include "IncludedPassage">>',
    suggestion: 'Manually copy content from the included passage'
  });

// Track unsupported feature
tracker.addIssue('warning', 'syntax', 'Named Hooks',
  'Harlowe named hooks are not fully supported', {
    passageId,
    passageName,
    original: '|hookname>[content]',
    suggestion: 'Use regular conditional text instead'
  });
```

## Implementation Plan

Due to file size, I'll:
1. Create a new comprehensive version with all methods updated
2. Replace the entire TwineImporter.ts file
3. Update tests
4. Run full test suite
