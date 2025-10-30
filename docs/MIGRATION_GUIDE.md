# Migration Guide

## Overview

This guide covers migrating interactive fiction stories to and from Whisker Editor Web.

**Migration Paths Covered**:
1. [Twine → Whisker](#twine-to-whisker)
2. [Whisker v2.0 → v2.1](#whisker-v20-to-v21)
3. [Whisker v2.1 → v2.0](#whisker-v21-to-v20-downgrade)
4. [whisker-core ↔ whisker-editor-web](#whisker-core-and-whisker-editor-web)

---

## Twine to Whisker

### Supported Twine Formats

whisker-editor-web can import stories from Twine 2 in the following formats:

- **Harlowe 3.x** ✅ Full support
- **SugarCube 2.x** ✅ Full support
- **Chapbook 1.x** ✅ Full support
- **Snowman 1.x** ✅ Full support

### Migration Steps

#### 1. Export from Twine

1. Open your story in Twine 2
2. Click the menu (▼) next to your story name
3. Select **Publish to File**
4. Save the HTML file

#### 2. Import to Whisker

**Option A: Using the UI**

1. Open whisker-editor-web
2. Click **File** → **Import**
3. Select **Twine HTML**
4. Choose your exported HTML file
5. Review the conversion report
6. Click **Import**

**Option B: Using the API**

```typescript
import { TwineImporter } from '$lib/import/formats/TwineImporter';
import { editorStore } from '$lib/stores/editorStore';

// Read the Twine HTML file
const fileContent = await file.text();

// Import the story
const result = TwineImporter.import(fileContent);

if (result.success) {
  // Load into editor
  editorStore.setStory(result.story);

  // Check for warnings
  if (result.warnings.length > 0) {
    console.warn('Import warnings:', result.warnings);
  }
} else {
  console.error('Import failed:', result.error);
}
```

### Format-Specific Conversions

#### Harlowe

**Supported Features**:
- Links: `[[Link Text->Target]]`
- Variables: `(set: $var to value)`
- Conditionals: `(if: condition)[text]`
- Text formatting: `//italic//`, `**bold**`

**Conversions**:
- Harlowe links → Whisker choices
- `(set: $var to value)` → Lua: `var = value`
- `(if: condition)[text]` → Lua conditional in choice
- Formatting preserved in content

**Limitations**:
- Complex macros may not translate perfectly
- Harlowe-specific animations not supported
- Some advanced datatypes converted to simpler types

#### SugarCube

**Supported Features**:
- Links: `[[Link Text|Target]]`
- Variables: `<<set $var = value>>`
- Conditionals: `<<if condition>>text<</if>>`
- Widgets and macros

**Conversions**:
- SugarCube links → Whisker choices
- `<<set $var = value>>` → Lua: `var = value`
- `<<if>>` → Lua conditional
- `<<display>>` → Embedded content

**Limitations**:
- Custom widgets require manual conversion
- JavaScript expressions converted to Lua (best effort)
- Some advanced features may require manual tweaking

#### Chapbook

**Supported Features**:
- Links: `[Link Text](target)`
- Variables: `var: value`
- Modifiers: `[cont'd]`, `[if var > 5]`

**Conversions**:
- Markdown links → Whisker choices
- Var declarations → Lua variables
- Modifiers → Lua scripts

#### Snowman

**Supported Features**:
- Links: `[[Link Text|Target]]`
- Embedded JavaScript
- Template syntax

**Conversions**:
- Links → Whisker choices
- JavaScript → Lua (best effort)

### Post-Migration Checklist

After importing from Twine:

- [ ] Review all passages (check for conversion issues)
- [ ] Test all choice links
- [ ] Verify variable types and defaults
- [ ] Check Lua scripts (may need manual fixes)
- [ ] Review conversion warnings
- [ ] Test the story in preview mode
- [ ] Update any unsupported features

### Common Conversion Issues

#### Issue: Variables Not Working

**Problem**: Twine variables (`$var`) not working in Lua

**Solution**: Update variable syntax:
```lua
-- Twine: $playerName
-- Whisker: playerName
```

#### Issue: Complex Macros Not Converted

**Problem**: Advanced Twine macros have no Whisker equivalent

**Solution**: Manually implement using Lua:
```lua
-- Example: Twine's <<repeat>> macro
-- Convert to Lua while loop or function
function repeatAction(times)
  for i = 1, times do
    -- action
  end
end
```

#### Issue: Formatting Lost

**Problem**: Special formatting not preserved

**Solution**: Use Markdown in passage content:
```markdown
*italic text*
**bold text**
```

### Example Migration

**Original Twine (Harlowe)**:
```
:: Start
Welcome, (print: $playerName)!

Your health: (print: $health)

(if: $health < 50)[
  [[Rest->RestPassage]]
]
[[Continue->Next]]

:: RestPassage
(set: $health to 100)
You rest and recover.

[[Continue->Next]]
```

**Converted Whisker**:

**Passage: Start**
```
Welcome, {playerName}!

Your health: {health}
```

**Choices**:
- Text: "Rest"
  - Condition: `health < 50`
  - Target: `RestPassage`
- Text: "Continue"
  - Target: `Next`

**Passage: RestPassage**
```
You rest and recover.
```

**On Enter Script**:
```lua
health = 100
```

**Choice**:
- Text: "Continue"
- Target: `Next`

---

## Whisker v2.0 to v2.1

### Why Upgrade?

Whisker v2.1 adds the `editorData` namespace for editor-specific features:

- Lua function library management
- Playthrough tracking
- Test scenarios
- Visual script data
- UI state preservation
- Custom extensions

### Migration Steps

#### Automatic Upgrade

When you open a v2.0 file in whisker-editor-web, it's automatically upgraded:

```typescript
import { fromWhiskerCoreFormat } from '$lib/utils/whiskerCoreAdapter';

// Load v2.0 file
const v20Data = JSON.parse(fileContent);

// Automatically converts to internal format
const story = fromWhiskerCoreFormat(v20Data);

// Save as v2.1
const v21Data = story.serializeWhiskerV21();
```

#### Manual Upgrade

To upgrade a v2.0 file manually:

1. Open the file in a text editor
2. Change `"formatVersion": "2.0"` to `"formatVersion": "2.1"`
3. Add the `editorData` section:

```json
{
  "format": "whisker",
  "formatVersion": "2.1",
  "metadata": { ... },
  "settings": { ... },
  "passages": [ ... ],
  "variables": { ... },
  "editorData": {
    "tool": {
      "name": "whisker-editor-web",
      "version": "1.0.0",
      "url": "https://github.com/writewhisker/whisker-editor-web"
    },
    "modified": "2025-10-29T12:00:00.000Z"
  }
}
```

### What Changes?

**v2.0 Format**:
```json
{
  "format": "whisker",
  "formatVersion": "2.0",
  "metadata": { ... },
  "settings": { ... },
  "passages": [ ... ],
  "variables": { ... }
}
```

**v2.1 Format**:
```json
{
  "format": "whisker",
  "formatVersion": "2.1",
  "metadata": { ... },
  "settings": { ... },
  "passages": [ ... ],
  "variables": { ... },
  "editorData": {
    "tool": { "name": "...", "version": "...", "url": "..." },
    "modified": "2025-10-29T12:00:00.000Z",
    "luaFunctions": { ... },
    "playthroughs": [ ... ],
    "testScenarios": [ ... ]
  }
}
```

### Backward Compatibility

- ✅ whisker-core can read v2.1 files (ignores `editorData`)
- ✅ v2.0 editors can read v2.1 files (ignores `editorData`)
- ✅ No data loss when downgrading to v2.0 (editorData dropped)

---

## Whisker v2.1 to v2.0 (Downgrade)

### When to Downgrade

Downgrade to v2.0 when:

- Publishing to platforms that only support v2.0
- Sharing with tools that don't recognize v2.1
- Creating minimal distribution files

### Data Loss Warning

⚠️ **Downgrading to v2.0 will remove**:
- Lua function definitions (converted to inline scripts)
- Playthrough data
- Test scenarios
- Visual script data
- Editor UI state

**Preserved**:
- All passages and content
- All choices and links
- All variables
- All scripts (converted to inline)
- Metadata and settings

### Downgrade Steps

#### Using the Editor

1. Open your v2.1 story
2. Go to **File** → **Export** → **JSON**
3. Select **Format Version: 2.0**
4. Click **Export**

#### Using the API

```typescript
import { toWhiskerCoreFormat } from '$lib/utils/whiskerCoreAdapter';

// Load v2.1 story
const story = fromWhiskerCoreFormat(v21Data);

// Export as v2.0 (editorData removed)
const v20Data = toWhiskerCoreFormat(story, { formatVersion: '2.0' });

// Save
const json = JSON.stringify(v20Data, null, 2);
```

### Lua Functions Conversion

**v2.1** (Functions in `editorData.luaFunctions`):
```json
{
  "editorData": {
    "luaFunctions": {
      "calculateDamage": {
        "params": ["base", "multiplier"],
        "body": "return base * multiplier",
        "description": "Calculate damage"
      }
    }
  }
}
```

**v2.0** (Functions inlined in scripts):
- Function definitions moved to story scripts
- Function calls remain in passage scripts

**Migration**:
```lua
-- Add to story.scripts:
function calculateDamage(base, multiplier)
  return base * multiplier
end
```

---

## whisker-core and whisker-editor-web

### Editor → Core (Creating Stories for whisker-core)

#### Export Process

1. Create/edit story in whisker-editor-web
2. Export as Whisker JSON (v2.0 or v2.1)
3. Load in whisker-core

**Export Steps**:

```typescript
// In whisker-editor-web
import { JSONExporter } from '$lib/export/formats/JSONExporter';

const json = JSONExporter.export(story, {
  formatVersion: '2.0',  // or '2.1'
  pretty: true
});

// Save to file
const blob = new Blob([json], { type: 'application/json' });
// saveAs(blob, 'story.whisker.json');
```

**Load in whisker-core**:

```bash
# Using whisker-core CLI
whisker play story.whisker.json
```

#### Compatibility Notes

**✅ Fully Compatible**:
- All passages and content
- All choices and links
- All variables (typed)
- Lua scripts (if using compatible features)
- Metadata and settings

**⚠️ Partially Compatible**:
- Lua scripts using advanced features
  - Test in editor preview first
  - whisker-core has full Lua 5.1+ support
  - Editor has ~80% compatibility for preview

**❌ Editor-Only Features** (ignored by whisker-core):
- Visual script data (converted to Lua before export)
- Passage colors and positions
- Editor UI state
- Playthrough tracking data

### Core → Editor (Editing whisker-core Stories)

#### Import Process

1. Create story in whisker-core (or use existing)
2. Save as Whisker JSON
3. Import to whisker-editor-web

**From whisker-core**:

```bash
# Export from whisker-core (if supported)
whisker export story.lua story.whisker.json
```

**Import to whisker-editor-web**:

1. Open whisker-editor-web
2. **File** → **Open**
3. Select `story.whisker.json`

Or via API:

```typescript
import { fromWhiskerCoreFormat } from '$lib/utils/whiskerCoreAdapter';

const fileContent = await file.text();
const data = JSON.parse(fileContent);
const story = fromWhiskerCoreFormat(data);

editorStore.setStory(story);
```

#### Round-Trip Validation

To ensure no data loss through editor ↔ core workflow:

```typescript
import { fromWhiskerCoreFormat, toWhiskerCoreFormat } from '$lib/utils/whiskerCoreAdapter';

// Original core format
const originalData = JSON.parse(fileContent);

// Import to editor
const story = fromWhiskerCoreFormat(originalData);

// Export back to core format
const roundTripData = toWhiskerCoreFormat(story, { formatVersion: '2.0' });

// Validate (should be equivalent)
console.assert(
  JSON.stringify(originalData) === JSON.stringify(roundTripData),
  'Round-trip conversion failed'
);
```

**Integration Tests**: See `tests/integration/formatIntegration.test.ts` for comprehensive round-trip tests.

### Lua Script Compatibility

#### Editor Preview vs. Core Execution

**Editor (LuaEngine)**:
- ~80% Lua 5.1 compatibility
- Browser-based (custom interpreter + Wasmoon)
- Good for preview and testing
- Some limitations (see below)

**whisker-core**:
- 100% Lua 5.1+ compatibility
- Native Lua interpreter
- Production execution environment
- No limitations

#### Compatible Lua Features

✅ **Supported in Both**:

```lua
-- Variables
health = 100
name = "Player"

-- Arithmetic
damage = 10 + 5 * 2

-- Strings
greeting = "Hello, " .. name

-- Conditionals
if health > 50 then
  status = "healthy"
elseif health > 20 then
  status = "injured"
else
  status = "critical"
end

-- Loops
for i = 1, 10 do
  total = total + i
end

while counter < 10 do
  counter = counter + 1
end

-- Functions
function calculateDamage(base, multiplier)
  return base * multiplier
end

damage = calculateDamage(10, 2)

-- Tables (dot notation)
player = {}
player.health = 100
player.mana = 50

-- Table literals
inventory = { sword = 1, potion = 3 }
```

⚠️ **Limited Support in Editor**:

```lua
-- pairs() iteration (not supported in editor)
-- Works in whisker-core, not in editor preview
for k, v in pairs(inventory) do
  print(k, v)
end

-- Bracket notation (limited in editor)
-- Prefer dot notation for editor compatibility
inventory["sword"] = 1  -- May not work in editor
inventory.sword = 1     -- Works everywhere
```

❌ **whisker-core Only**:

```lua
-- Metatables
setmetatable(table, metatable)

-- Coroutines
co = coroutine.create(function() ... end)

-- Full standard library
io.open("file.txt")
os.date()
```

#### Testing Scripts

**Workflow**:

1. Write script in editor
2. Test in editor preview (quick iteration)
3. If editor preview fails, test in whisker-core
4. Adjust script for compatibility or mark as production-only

**Example**:

```lua
-- This script works in both editor and whisker-core
function takeDamage(amount)
  health = health - amount
  if health < 0 then
    health = 0
  end
end

-- Use in choice action
takeDamage(10)
```

**Testing**:

```typescript
// Test in editor
const engine = new LuaEngine();
engine.setVariable('health', 100);
engine.execute('takeDamage(10)');
console.log(engine.getVariable('health')); // 90

// If editor test passes, script will work in whisker-core
```

### Best Practices

#### For Maximum Compatibility

1. **Use compatible Lua features**
   - Stick to basic variables, conditionals, loops, functions
   - Avoid pairs(), metatables, coroutines in preview scripts
   - Document any whisker-core-only features

2. **Test in both environments**
   - Preview in editor during development
   - Final test in whisker-core before release

3. **Use v2.0 for distribution**
   - v2.0 is universal format
   - v2.1 for editor-specific workflows
   - Always test exported v2.0 files

4. **Validate before export**
   ```typescript
   const result = story.validate();
   if (!result.valid) {
     // Fix errors before exporting
   }
   ```

5. **Use integration tests**
   - Create test fixtures
   - Validate round-trip conversion
   - Check script compatibility

---

## Migration Tools

### Command-Line Tools (Planned)

Future CLI tools for migration:

```bash
# Convert Twine to Whisker
whisker-convert twine-to-whisker story.html story.whisker.json

# Upgrade v2.0 to v2.1
whisker-convert upgrade story-v2.0.json story-v2.1.json

# Downgrade v2.1 to v2.0
whisker-convert downgrade story-v2.1.json story-v2.0.json

# Validate format
whisker-validate story.whisker.json
```

### Programmatic API

For batch conversions or custom workflows:

```typescript
import {
  TwineImporter,
  JSONExporter,
  fromWhiskerCoreFormat,
  toWhiskerCoreFormat,
  toWhiskerFormatV21,
  validateWhiskerFormat
} from 'whisker-editor-web';

// Batch convert Twine files
const twineFiles = ['story1.html', 'story2.html'];
for (const file of twineFiles) {
  const html = await readFile(file);
  const result = TwineImporter.import(html);
  if (result.success) {
    const json = JSONExporter.export(result.story);
    await writeFile(file.replace('.html', '.json'), json);
  }
}
```

---

## Troubleshooting

### Common Migration Issues

#### Issue: Import Fails with "Invalid Format"

**Cause**: File is not valid Twine HTML or Whisker JSON

**Solution**:
1. Verify file is exported from Twine 2 (not Twine 1)
2. Check file opens in browser (for HTML)
3. Validate JSON syntax (for Whisker files)
4. Check format version is supported

#### Issue: Scripts Don't Work After Import

**Cause**: Twine macro syntax not fully converted

**Solution**:
1. Review conversion warnings
2. Manually update scripts to Lua
3. Test in editor preview
4. Use whisker-core for advanced features

#### Issue: Choices Not Appearing

**Cause**: Choice conditions failing or syntax errors

**Solution**:
1. Check choice condition scripts
2. Verify variable names match
3. Test conditions in preview
4. Review validation errors

#### Issue: Variables Reset on Load

**Cause**: Variable types or defaults not set correctly

**Solution**:
1. Verify variable definitions in Variables panel
2. Set correct types (string, number, boolean)
3. Set appropriate defaults
4. Test in preview mode

### Getting Help

**Documentation**:
- [Architecture Guide](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [User Guide](./USER_GUIDE.md)

**Community**:
- [GitHub Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- [whisker-core Issues](https://github.com/ezeholz/whisker-core/issues)

**Format Specification**:
- [Whisker Format v2.1](../WHISKER_FORMAT_SPEC_V2.1.md)

---

## Migration Checklist

### Pre-Migration

- [ ] Backup original files
- [ ] Document any custom features or macros
- [ ] Test story in original environment
- [ ] List all variables and their types

### During Migration

- [ ] Import/convert the story
- [ ] Review conversion warnings
- [ ] Update scripts as needed
- [ ] Set variable types and defaults
- [ ] Test all passages
- [ ] Test all choices
- [ ] Verify scripts execute correctly

### Post-Migration

- [ ] Full playthrough test
- [ ] Validate format compliance
- [ ] Test in whisker-core (if applicable)
- [ ] Document any changes made
- [ ] Update version numbers
- [ ] Export final distribution format

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Maintained By**: whisker-editor-web team
