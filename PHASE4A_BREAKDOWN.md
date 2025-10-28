# Phase 4A: Import & Format Conversion - Detailed Breakdown

**Goal:** Implement Twine HTML import with format conversion while maintaining test coverage and backward compatibility.

## Current Status (Just Completed)

✅ **Stage 1.1: Core Twine Import** (COMPLETE)
- TwineImporter class with IImporter interface
- Twine HTML parsing (tw-storydata, tw-passagedata)
- Format detection (Harlowe, SugarCube, Chapbook, Snowman)
- Basic syntax conversion (variables, conditionals, links)
- HTML entity decoding
- 34 passing tests
- Integration with exportStore
- ImportDialog supports .html files
- **Tests:** 2363 passing (100% backward compatible)

---

## Remaining Work - Broken Down

### **Stage 1.2: Enhanced Conversion & Loss Reporting** (2-3 hours)
**Goal:** Improve conversion quality and track what couldn't be converted

**Tasks:**
1. Add comprehensive loss tracking to TwineImporter
   - Track unconverted macros/features per format
   - Record line numbers where issues occur
   - Categorize losses (critical, warning, info)

2. Enhance warning messages
   - Specific feature names (e.g., "<<include>> macro not supported")
   - Suggested manual fixes
   - Count of affected passages

3. Update tests
   - Test loss tracking for each format
   - Verify warning categorization
   - Test edge cases (nested macros, complex syntax)

**Success Criteria:**
- All tests pass (target: 2370+)
- Detailed warnings for unsupported features
- No regressions in existing import

**Files to Modify:**
- `src/lib/import/formats/TwineImporter.ts`
- `src/lib/import/formats/TwineImporter.test.ts`
- `src/lib/import/types.ts` (add LossReport interface)

---

### **Stage 1.3: Advanced Syntax Conversion** (3-4 hours)
**Goal:** Support more complex Twine syntax patterns

**Tasks:**
1. **SugarCube Advanced:**
   - `<<set>>` with complex expressions
   - `<<if>>/<<elseif>>/<<else>>` chains
   - `<<print>>` with expressions
   - Nested macros
   - Story variables ($var) vs temp variables (_var)

2. **Harlowe Advanced:**
   - Chained hooks: `(if: $x)[(set: $y to 1)]`
   - Named hooks: `|name>[content]`
   - Hook references: `(click: ?name)`
   - Data structures (arrays, datamaps)

3. **Chapbook Advanced:**
   - Modifiers: `[after 2s]`, `[if x = y]`
   - Inserts: `{embed passage: 'name'}`
   - Conditional text

4. Add 20+ tests for advanced patterns

**Success Criteria:**
- All tests pass (target: 2390+)
- 70%+ conversion accuracy for complex syntax
- Proper warnings for unsupported patterns

**Files to Modify:**
- `src/lib/import/formats/TwineImporter.ts` (expand conversion methods)
- `src/lib/import/formats/TwineImporter.test.ts`

---

### **Stage 2.1: Import Preview UI** (3-4 hours)
**Goal:** Show user what will be imported before committing

**Tasks:**
1. Create ImportPreviewPanel component
   - Story metadata preview
   - Passage count, variable count
   - Detected format display
   - Warning/loss summary
   - Sample passages preview (first 3-5)

2. Update ImportDialog
   - Add preview step after file selection
   - "Back" and "Import" buttons
   - Collapsible warning details
   - Format badge display

3. Add 10+ UI tests

**Success Criteria:**
- All tests pass (target: 2400+)
- User can review import before confirming
- Warnings clearly visible

**Files to Create:**
- `src/lib/components/export/ImportPreviewPanel.svelte`
- `src/lib/components/export/ImportPreviewPanel.test.ts`

**Files to Modify:**
- `src/lib/components/export/ImportDialog.svelte`

---

### **Stage 2.2: Conversion Options UI** (2-3 hours)
**Goal:** Let users customize import behavior

**Tasks:**
1. Add conversion options to ImportDialog
   - "Convert variables automatically" checkbox
   - "Preserve original syntax in comments" checkbox
   - "Strict mode" (fail on unknown macros) toggle
   - Format-specific options panel

2. Update TwineImporter to accept options
   - Add ConversionOptions interface
   - Implement option-driven behavior
   - Update tests for options

3. Add 8+ tests for options

**Success Criteria:**
- All tests pass (target: 2408+)
- Options affect conversion behavior
- Options persist in preferences

**Files to Modify:**
- `src/lib/components/export/ImportDialog.svelte`
- `src/lib/import/formats/TwineImporter.ts`
- `src/lib/import/types.ts` (add ConversionOptions)
- `src/lib/stores/exportStore.ts` (persist options)

---

### **Stage 3.1: Twee Notation Support** (3-4 hours)
**Goal:** Support plain-text Twine format (Twee)

**Tasks:**
1. Extend TwineImporter to detect Twee format
   - Check for `:: PassageName` syntax
   - Distinguish from HTML

2. Implement Twee parser
   - Parse `:: StoryTitle`, `:: StoryData`
   - Parse passages with metadata: `:: Name [tags] {position}`
   - Handle passage content

3. Update ImportDialog
   - Accept `.twee`, `.tw` extensions
   - Update help text

4. Add 15+ tests for Twee format

**Success Criteria:**
- All tests pass (target: 2423+)
- Can import Twee files
- Correct passage/metadata extraction

**Files to Modify:**
- `src/lib/import/formats/TwineImporter.ts`
- `src/lib/import/formats/TwineImporter.test.ts`
- `src/lib/components/export/ImportDialog.svelte`

---

### **Stage 3.2: Sample Files & Documentation** (2-3 hours)
**Goal:** Provide test files and usage documentation

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
1. **Stage 1.2** - Enhanced loss reporting (foundational)
2. **Stage 1.3** - Advanced syntax (improves quality)
3. **Stage 2.1** - Preview UI (better UX before options)
4. **Stage 2.2** - Conversion options (enhances preview)
5. **Stage 3.1** - Twee support (extends capability)
6. **Stage 3.2** - Samples & docs (validates everything)
7. **Stage 3.3** - Twine export (completes round-trip)

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

| Stage | Estimate | Complexity |
|-------|----------|------------|
| 1.2 - Enhanced Loss Reporting | 2-3h | Medium |
| 1.3 - Advanced Syntax | 3-4h | High |
| 2.1 - Preview UI | 3-4h | Medium |
| 2.2 - Conversion Options | 2-3h | Low |
| 3.1 - Twee Support | 3-4h | Medium |
| 3.2 - Samples & Docs | 2-3h | Low |
| 3.3 - Twine Export | 4-5h | High |
| **Total** | **19-26h** | - |

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
