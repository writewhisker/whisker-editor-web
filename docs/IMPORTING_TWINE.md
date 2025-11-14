# Importing Twine Stories into Whisker Editor

This guide explains how to import Twine stories into Whisker Editor, including supported formats, conversion accuracy, and known limitations.

## Supported Formats

Whisker Editor can import stories from the following Twine formats:

### 1. Twine HTML Files (.html, .htm)

Twine HTML files are the standard export format from Twine 2. They contain embedded story data with `<tw-storydata>` and `<tw-passagedata>` tags.

**Supported story formats:**
- **Harlowe** (v1.x, 2.x, 3.x)
- **SugarCube** (v1.x, 2.x)
- **Chapbook** (v1.x, 2.x)
- **Snowman** (v1.x, 2.x)

### 2. Twee Notation Files (.twee, .tw)

Twee is a plain-text format for Twine stories that uses `:: PassageName` syntax.

**Example:**
```twee
:: StoryTitle
My Story

:: Start
This is the first passage.
[[Next passage->Second]]

:: Second [tag1 tag2] {"position":"200,100"}
This is the second passage with tags and position metadata.
```

## How to Import

1. Open Whisker Editor
2. Click the **Import** button in the menu
3. Choose one of these methods:
   - Drag and drop a file onto the upload area
   - Click to browse and select a file
4. Review the import preview:
   - Story metadata (title, author, passage count)
   - Conversion quality score
   - Warnings and potential issues
   - Sample passages
5. Adjust conversion options if needed (see below)
6. Click **Confirm Import**

## Conversion Options

When importing Twine HTML or Twee files, you can customize how the content is converted:

### Convert Variables Automatically
- **Default:** Enabled
- **Description:** Converts Twine variable syntax to Whisker syntax
- **Examples:**
  - `$variable` → `{{variable}}`
  - `_tempVar` → `{{_tempVar}}`

### Convert Macros to Whisker Syntax
- **Default:** Enabled
- **Description:** Attempts to convert Twine macros to equivalent Whisker syntax
- **Examples:**
  - `<<if $x > 5>>` → `{{#if x > 5}}`
  - `(if: $x > 5)` → `{{#if x > 5}}`

### Preserve Original Syntax in Comments
- **Default:** Disabled
- **Description:** Adds comments with original Twine syntax alongside converted code
- **Example:**
  ```
  <!-- Original: <<set $health = 100>> -->
  {{set health = 100}}
  ```

### Strict Mode
- **Default:** Disabled
- **Description:** Fails import if unknown macros are encountered
- **Use when:** You want to ensure all content is properly converted before importing

## Conversion Accuracy

The import process attempts to convert Twine syntax to Whisker syntax. Conversion quality varies by format:

### Format Comparison Table

| Format | Links | Variables | Conditionals | Macros | Overall Accuracy |
|--------|-------|-----------|--------------|--------|------------------|
| **Harlowe** | ✓ Excellent | ✓ Excellent | ✓ Good | ⚠️ Partial | **75-85%** |
| **SugarCube** | ✓ Excellent | ✓ Excellent | ✓ Excellent | ⚠️ Partial | **80-90%** |
| **Chapbook** | ✓ Excellent | ✓ Good | ✓ Good | ⚠️ Limited | **60-70%** |
| **Snowman** | ✓ Excellent | ⚠️ Limited | ❌ Not Supported | ❌ Not Supported | **30-40%** |
| **Twee** | ✓ Excellent | ✓ Excellent | ✓ Excellent | ⚠️ Partial | **85-95%** |

### What Gets Converted

#### ✓ Fully Supported
- **Links:** All link formats (Markdown, wiki-style, etc.)
- **Basic variables:** `$variable`, `_tempVariable`
- **Comments:** HTML comments
- **Passage metadata:** Tags, positions, titles
- **Story metadata:** Title, author, IFID

#### ⚠️ Partially Supported
- **Conditionals:**
  - `<<if>>`, `<<elseif>>`, `<<else>>` (SugarCube) - Converted to `{{if}}` syntax
  - `(if:)`, `(else-if:)`, `(else:)` (Harlowe) - Converted to `{{if}}` syntax
  - `[if]`, `[else if]`, `[else]` (Chapbook) - Converted to `{{if}}` syntax
- **Variable operations:**
  - `<<set>>` (SugarCube) - Converted to `{{var = value}}`
  - `(set:)`, `(put:)` (Harlowe) - Converted to `{{var = value}}`
  - Variable declarations (Chapbook) - Converted with type inference
- **Display macros:**
  - `<<print>>`, `<<= >>` (SugarCube) - Converted to `{{var}}`
  - `(print:)` (Harlowe) - Converted to `{{var}}`
- **Variable Type Inference:**
  - Automatically detects boolean, number, and string types from assignments
  - Infers types from literal values (e.g., `true`, `123`, `"text"`)

#### ❌ Not Supported (Requires Manual Conversion)
- **UI macros:** `<<textbox>>`, `<<button>>`, `<<cycle>>`, `<<checkbox>>`
- **Interactive link macros:** `<<linkreplace>>`, `<<linkappend>>`, `<<linkprepend>>`
- **Audio/video:** `<<audio>>`, `<<video>>`, `<<cacheaudio>>`
- **Advanced features:**
  - Widget definitions (`<<widget>>`)
  - JavaScript code blocks (`<<script>>`, `<script>`) - **Critical for Snowman**
  - JavaScript expressions (`<% %>`, `<%= %>`) - **Snowman-specific**
  - Custom macros
  - Data structures (datamaps, datasets, datarrays in Harlowe)
  - Random/either functionality (`(random:)`, `(either:)`)
  - Named hooks and hook references in Harlowe (`|name>`, `?name`)
  - Live/event macros in Harlowe (`(live:)`, `(event:)`)
  - Transition effects (`(transition:)`, `(transition-time:)`)
- **Time-based modifiers:** `[after]`, `[cont]` (Chapbook)
- **Embed passages:** `{embed passage:}` (Chapbook)

### Conversion Quality Score

After import, you'll see a quality score:

- **90-100%**: Excellent - Most content converted successfully
- **70-89%**: Good - Minor manual adjustments may be needed
- **50-69%**: Fair - Significant manual review recommended
- **Below 50%**: Poor - Extensive manual conversion required

## Known Limitations

### 1. Macro Conversion

Not all Twine macros have direct Whisker equivalents. Unsupported macros will be:
- Flagged in the conversion report
- Commented out in the passage content
- Listed with suggested manual fixes

### 2. JavaScript Code

Custom JavaScript code in passages or story scripts is not automatically converted. You'll need to:
- Review flagged JavaScript blocks
- Rewrite using Whisker's scripting syntax
- Or implement alternative solutions

### 3. Complex Expressions

Some complex Twine expressions may not convert perfectly:
- Nested macro calls
- Complex conditional expressions
- Custom data structures

### 4. Styling and CSS

Custom styling from Twine stylesheets may not transfer directly. You'll need to:
- Review imported styles
- Adapt them to Whisker's styling system
- Test appearance in Whisker's preview

### 5. Media References

References to external media (images, audio, video) are preserved but not validated. Ensure:
- Media files are accessible
- Paths are correct for your hosting environment
- Media formats are web-compatible

## Troubleshooting

### Import Fails with "Not a valid Twine HTML or Twee file"

**Cause:** The file format is not recognized.

**Solutions:**
- Verify the file is a Twine HTML export or Twee notation file
- Check that the file isn't corrupted (try opening in a text editor)
- Ensure it contains `<tw-storydata>` tags (HTML) or `::` passages (Twee)

### Low Conversion Quality Score

**Cause:** The story uses many unsupported macros or features.

**Solutions:**
- Review the conversion report for specific issues
- Enable "Preserve original syntax in comments" to keep reference
- Plan for manual cleanup after import
- Consider simplifying the original story before import

### Missing Passages

**Cause:** Passages may be filtered out or have parsing errors.

**Solutions:**
- Check for script/stylesheet tags (these are intentionally skipped)
- Review error messages in the conversion report
- Try importing with different conversion options

### Variables Not Working

**Cause:** Variable syntax may not have converted correctly.

**Solutions:**
- Enable "Convert variables automatically"
- Review variable declarations in imported passages
- Check the conversion report for variable-related warnings

### Links Not Working

**Cause:** Link targets may have been renamed or not imported.

**Solutions:**
- Check that all passages were imported
- Verify link syntax in the passage editor
- Use Whisker's validation tools to find broken links

## Best Practices

### Before Import

1. **Create a backup** of your original Twine story
2. **Export from Twine** to HTML format (preferred for metadata preservation)
3. **Test with a small story** first to understand conversion behavior
4. **Document custom features** that might not convert automatically

### During Import

1. **Review the preview** carefully before confirming
2. **Read the conversion report** to understand what needs manual fixing
3. **Start with default options**, adjust only if needed
4. **Keep original files** for reference

### After Import

1. **Run validation tools** to identify issues
2. **Test all passages** in preview mode
3. **Fix reported warnings** systematically
4. **Test interactive elements** (conditionals, variables)
5. **Save frequently** during cleanup

## Sample Files

Sample Twine files are included in the `samples/` directory:

- **`harlowe-sample.html`**: Demonstrates Harlowe syntax (variables, conditionals, links)
- **`sugarcube-sample.html`**: Shows SugarCube features (macros, inventory, quests)
- **`chapbook-sample.html`**: Examples of Chapbook modifiers and variables
- **`twee-sample.twee`**: Twee notation with various features

You can import these samples to test the import functionality and see conversion examples.

## Getting Help

If you encounter issues importing Twine stories:

1. Check this documentation for solutions
2. Review the conversion report for specific errors
3. Try the sample files to verify import is working
4. Report bugs at: https://github.com/writewhisker/whisker-editor-web/issues

## Technical Details

### Supported Twine Versions

- **Twine 2.x**: Full support for HTML exports
- **Twine 1.x**: Partial support (may require format conversion)
- **Twee 3**: Full support for notation files

### File Size Limits

- Maximum file size: 10 MB
- Maximum passages: 1000
- Large stories may take longer to import and process

### Character Encoding

- UTF-8 encoding is recommended
- HTML entities are automatically decoded
- Special characters should be preserved

## New Features (v2.0)

Recent improvements to Twine import:

### ✅ Snowman Format Support
- **Added:** Full Snowman format detection and basic conversion
- **Limitation:** Snowman relies heavily on JavaScript which cannot be automatically converted
- **Tracking:** Critical issues are flagged for JavaScript code blocks and expressions
- **Basic conversion:** Simple `<%= var %>` expressions are converted to `{{var}}`
- **Recommendation:** Snowman stories require significant manual conversion after import

### ✅ Enhanced Conversion Tracking
- **Detailed loss reports:** Each conversion issue now includes:
  - Severity level (critical, warning, info)
  - Category (macro, syntax, variable, etc.)
  - Specific passage where issue occurred
  - Original syntax that couldn't be converted
  - Suggested manual fix
- **Passage-specific tracking:** Easily identify which passages need manual work
- **Conversion quality score:** Overall percentage of successful conversion

### ✅ Variable Type Inference
- **Automatic type detection:** Variables are no longer all strings
- **Infers from values:**
  - `{{score = 100}}` → number type, initial value 100
  - `{{isAlive = true}}` → boolean type, initial value true
  - `{{name = "Alice"}}` → string type, initial value "Alice"
- **Smarter defaults:** Referenced variables without assignments default to appropriate types

### ✅ Improved Format-Specific Conversion
- **Harlowe:**
  - Tracks data structures (datamap, dataset, dataarray)
  - Tracks named hooks and hook references
  - Tracks transition and live/event macros
  - Better conversion of nested conditionals
- **SugarCube:**
  - Tracks interactive link macros (linkreplace, linkappend, etc.)
  - Tracks UI macros (button, textbox, etc.)
  - Better handling of temporary variables (_var)
  - Improved widget detection
- **Chapbook:**
  - Enhanced time-based modifier tracking
  - Better embed passage detection

## Future Improvements

Planned enhancements for Twine import:

- [ ] Limited JavaScript-to-Lua conversion for common patterns
- [ ] Import of custom styles and themes
- [ ] Batch import of multiple stories
- [ ] Import from Twine Archive (.taf) format
- [ ] Better widget/custom macro conversion
- [ ] Interactive import wizard for complex stories
- [ ] Conversion of common SugarCube widgets to Whisker equivalents

---

**Last updated:** 2025-11-12
**Version:** 2.0
