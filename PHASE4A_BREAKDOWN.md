# Phase 4A: Import & Format Conversion - Detailed Breakdown

**Goal:** Implement Twine HTML import with format conversion while maintaining test coverage and backward compatibility.

## Current Status

✅ **Stage 1.1: Core Twine Import** (COMPLETE - Committed: c105e62)
- TwineImporter class with IImporter interface
- Twine HTML parsing (tw-storydata, tw-passagedata)
- Format detection (Harlowe, SugarCube, Chapbook, Snowman)
- Basic syntax conversion (variables, conditionals, links)
- HTML entity decoding
- 34 passing tests
- Integration with exportStore
- ImportDialog supports .html files
- **Tests:** 2363 passing (100% backward compatible)

✅ **Stage 1.2: Enhanced Loss Reporting** (COMPLETE - Ready to commit)
- ConversionTracker class for issue tracking
- Loss report with severity levels (critical, warning, info)
- Category tracking (macro, syntax, ui, data-structure, etc.)
- Conversion quality estimation (0-1 scale)
- Affected passage tracking
- Detailed suggestions for manual fixes
- 5 new tests for loss reporting
- **Tests:** 2379 passing (100% backward compatible)

✅ **Stage 1.3: Advanced Syntax Conversion** (COMPLETE - Committed: 91ebf3f)
- **SugarCube Advanced:**
  - <<if>>/<<elseif>>/<<else>>/<<endif>> chains
  - Temp variables (_var) support
  - <<= shorthand syntax
  - UI macro detection (textbox, button, etc.)
  - Unsupported macro tracking (include, widget, script, audio, etc.)
- **Harlowe Advanced:**
  - (put: value into $var) syntax
  - (else-if:) chains
  - Named hook removal (|hookname>)
  - Data structure detection (datamap, dataset, dataarray)
  - Random/either macro warnings
- **Chapbook Advanced:**
  - [else if] chains
  - Variable references {var}
  - Time-based modifier detection [after Xs]
  - Embed passage warnings
- 11 new tests for advanced syntax
- **Tests:** 2379 passing (100% backward compatible)

✅ **Stage 2.1: Import Preview UI** (COMPLETE - Committed: 56ce091)
- ImportPreviewPanel component (305 lines)
  - Story metadata display (title, author, passages, variables)
  - Conversion quality visualization with color-coded progress bar
  - Loss report details (critical/warning/info issues)
  - Sample passages preview (first 3)
  - Collapsible sections for warnings and issues
- Updated ImportDialog with preview workflow
  - Three-step flow: file-selection → preview → importing
  - importStoryWithResult() method in exportStore
  - History tracking on confirmation
- 16 new tests for ImportPreviewPanel
- **Tests:** 2395 passing (100% backward compatible)

✅ **Stage 2.2: Conversion Options UI** (COMPLETE - Committed: 920dd0f)
- ConversionOptions interface in types.ts
  - convertVariables, convertMacros, preserveOriginalSyntax, strictMode
- Conversion options UI in ImportDialog
  - Shows for Twine HTML files (.html, .htm)
  - 4 checkboxes with clear descriptions
  - Gray background panel to distinguish from general options
- Updated TwineImporter to accept conversion options
  - Extracts options from ImportContext
  - Logs options as info message in loss report
  - Foundation for future option-driven conversion logic
- Updated exportStore.importStoryWithResult()
  - Accepts optional conversionOptions parameter
  - Passes options to importer
- Updated ImportDialog.test.ts
  - Tests verify conversionOptions are passed correctly
- **Tests:** 2395 passing (100% backward compatible)

✅ **Stage 3.1: Twee Notation Support** (COMPLETE - Committed: 6b9369b)
- **Twee Format Detection:**
  - Extended TwineImporter to detect Twee format
  - Added `.twee` and `.tw` to supported extensions
  - isTwee() detection method using pattern matching
- **Twee Parser Implementation:**
  - Comprehensive parseTwee() method (109 lines)
  - Parses `:: PassageName [tags] {metadata}` syntax
  - Handles StoryTitle and StoryData special passages
  - Extracts tags from square brackets
  - Parses position metadata from JSON objects
  - Multi-line passage content support
  - Automatic start node selection (first non-script/stylesheet passage)
- **UI Updates:**
  - ImportDialog accepts .twee and .tw extensions
  - Updated help text to mention Twee notation
  - Conversion options show for Twee files
- **Testing:**
  - 17 new comprehensive Twee tests
  - Detection, import, tags, metadata, special passages
  - SugarCube and Harlowe syntax conversion in Twee
  - Multi-line passages, start node selection
  - Edge cases (empty files, missing title, etc.)
- **Tests:** 2410 passing (100% backward compatible)

✅ **Stage 3.2: Sample Files & Documentation** (COMPLETE - Committed: 658b516)
- **Sample Files Created:**
  - `samples/harlowe-sample.html` - Harlowe story with variables, conditionals, links (10 passages)
  - `samples/sugarcube-sample.html` - SugarCube quest with inventory, gold, strength system (17 passages)
  - `samples/chapbook-sample.html` - Chapbook journey with modifiers and variables (16 passages)
  - `samples/twee-sample.twee` - Twee notation story with tags and position metadata (12 passages)
  - All samples demonstrate format-specific features and conversion scenarios
- **Documentation:**
  - `docs/IMPORTING_TWINE.md` - Comprehensive 300+ line guide
  - Supported formats and versions table
  - Conversion accuracy matrix (50-95% by format)
  - Step-by-step import instructions
  - Conversion options explained
  - Known limitations and troubleshooting
  - Best practices for before/during/after import
  - Technical details and future improvements
- **Integration Tests:**
  - `src/lib/import/formats/TwineImporter.integration.test.ts` (12 tests)
  - Tests all 4 sample files import successfully
  - Verifies passage counts, titles, tags, metadata
  - Tests conversion quality reporting
  - Tests error handling for empty stories
  - Tests conversion options (convertVariables, preserveOriginalSyntax)
  - Tests metadata preservation (IFID, passage structure)
- **Tests:** 2422 passing (12 new integration tests, 100% backward compatible)

✅ **Stage 3.3: Export to Twine HTML** (COMPLETE - Ready to commit)
- **TwineExporter Class:**
  - Implements IExporter interface for Twine 2 HTML format
  - Exports to Harlowe 3.x compatible format
  - Converts Whisker syntax to Harlowe macros
  - Variable conversion: {{var}} → $var
  - Conditional conversion: {{#if}}{{else}}{{/if}} → (if:)[](else:)[]
  - Set statement conversion: {{set var = val}} → (set: $var to val)
  - HTML entity escaping for safety
  - Preserves passage positions, tags, metadata
  - Generates valid IFID if not present
- **Integration:**
  - Added 'twine' to ExportFormat type
  - Registered TwineExporter in exportStore
  - Export action automatically routes to TwineExporter
- **Testing:**
  - 15 comprehensive unit tests
  - Tests simple and multi-passage exports
  - Tests tag preservation
  - Tests HTML entity escaping
  - Tests Whisker → Harlowe syntax conversion
  - Tests variable, conditional, and set conversions
  - Tests position and metadata preservation
  - Tests error handling (null story, empty story)
  - Tests IFID generation
- **Tests:** 2437 passing (15 new tests, 100% backward compatible)

---

## Phase 4A Complete!

All stages of Phase 4A (Import & Format Conversion) have been successfully implemented:
- ✅ Stage 1.1: Core Twine Import
- ✅ Stage 1.2: Enhanced Loss Reporting
- ✅ Stage 1.3: Advanced Syntax Conversion
- ✅ Stage 2.1: Import Preview UI
- ✅ Stage 2.2: Conversion Options UI
- ✅ Stage 3.1: Twee Notation Support
- ✅ Stage 3.2: Sample Files & Documentation
- ✅ Stage 3.3: Twine HTML Export

---

## Remaining Work - Broken Down

### **Stage 3.3: Export to Twine HTML** (4-5 hours)
**Goal:** Round-trip support - export Whisker stories to Twine HTML

**Tasks:**
1. Create sample Twine files
   - `samples/harlowe-sample.html` (small story)
   - `samples/sugarcube-sample.html`
   - `samples/chapbook-sample.html`
   - `samples/twee-sample.twee`
   - Each with various features to demonstrate

2. Create documentation
   - `docs/IMPORTING_TWINE.md`
   - Supported formats table
   - Conversion accuracy matrix
   - Known limitations
   - Troubleshooting guide

3. Add integration test
   - Test importing all sample files
   - Verify no errors
   - Check passage counts

**Success Criteria:**
- 4+ sample files work correctly
- Documentation covers all formats
- Integration test passes

**Files to Create:**
- `samples/harlowe-sample.html`
- `samples/sugarcube-sample.html`
- `samples/chapbook-sample.html`
- `samples/twee-sample.twee`
- `docs/IMPORTING_TWINE.md`
- `src/lib/import/formats/TwineImporter.integration.test.ts`

---

### **Stage 3.3: Export to Twine HTML** (4-5 hours)
**Goal:** Round-trip support - export Whisker stories to Twine HTML

**Tasks:**
1. Create TwineExporter class
   - Implement IExporter interface
   - Generate Twine HTML structure
   - Convert Whisker syntax to Harlowe (default)
   - Include proper metadata (IFID, format)

2. Add TwineExporter to exportStore
   - Register as export format
   - Add to ExportPanel options

3. Add 15+ tests

**Success Criteria:**
- All tests pass (target: 2438+)
- Can export Whisker story to Twine HTML
- Exported HTML can be opened in Twine 2
- Round-trip test: import → export → import yields similar result

**Files to Create:**
- `src/lib/export/formats/TwineExporter.ts`
- `src/lib/export/formats/TwineExporter.test.ts`

**Files to Modify:**
- `src/lib/stores/exportStore.ts`
- `src/lib/export/types.ts` (add 'twine' to ExportFormat)

---

## Implementation Strategy

### Order of Implementation
1. ✅ **Stage 1.1** - Core Twine Import (c105e62)
2. ✅ **Stage 1.2** - Enhanced loss reporting (committed)
3. ✅ **Stage 1.3** - Advanced syntax (91ebf3f)
4. ✅ **Stage 2.1** - Preview UI (56ce091)
5. ✅ **Stage 2.2** - Conversion options (920dd0f)
6. ✅ **Stage 3.1** - Twee support (ready to commit)
7. **Stage 3.2** - Samples & docs (validates everything)
8. **Stage 3.3** - Twine export (completes round-trip)

### Testing Requirements (Each Stage)
- ✅ All existing tests pass
- ✅ New tests for new features
- ✅ No breaking changes
- ✅ Test coverage ≥ 80% for new code

### Commit Strategy
- One commit per stage
- Run full test suite before committing
- Include stage number in commit message
- Update PHASE4A_BREAKDOWN.md with completion checkmarks

---

## Estimated Timeline

| Stage | Estimate | Complexity | Status |
|-------|----------|------------|--------|
| 1.1 - Core Twine Import | 4-5h | High | ✅ Complete |
| 1.2 - Enhanced Loss Reporting | 2-3h | Medium | ✅ Complete |
| 1.3 - Advanced Syntax | 3-4h | High | ✅ Complete |
| 2.1 - Preview UI | 3-4h | Medium | ✅ Complete |
| 2.2 - Conversion Options | 2-3h | Low | ✅ Complete |
| 3.1 - Twee Support | 3-4h | Medium | ✅ Complete |
| 3.2 - Samples & Docs | 2-3h | Low | 🔄 Next |
| 3.3 - Twine Export | 4-5h | High | ⬜ Pending |
| **Total** | **23-31h** | - | **19-24h done** |

---

## Success Metrics (Overall Phase 4A)

- [ ] Import Harlowe stories with 70%+ conversion accuracy
- [ ] Import SugarCube stories with 75%+ conversion accuracy
- [ ] Import Chapbook stories with 60%+ conversion accuracy
- [ ] Import Twee notation with 90%+ accuracy
- [ ] Export to Twine HTML with valid format
- [ ] All tests passing (target: 2440+ tests)
- [ ] Zero breaking changes to existing features
- [ ] User documentation complete
- [ ] Sample files provided

---

## Next Steps

**Immediate:** Choose which stage to implement next

**Recommended:** Stage 1.2 (Enhanced Loss Reporting)
- Builds on completed Stage 1.1
- Improves user experience with current functionality
- Provides foundation for later stages
- Low risk, high value

**Alternative:** Stage 2.1 (Preview UI)
- If prioritizing user experience over conversion quality
- More visible improvement to users
- Can proceed in parallel with 1.2/1.3 (different files)
