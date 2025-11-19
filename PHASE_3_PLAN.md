# Phase 3: Import/Export Feature Alignment

**Status:** PLANNED
**Estimated Duration:** 3-5 days
**Dependencies:** Phase 1 ✅ and Phase 2 ✅ Complete

---

## Executive Summary

Phase 3 focuses on documenting, testing, and enhancing the import/export capabilities of Whisker Editor to ensure feature parity with the core engine and provide clear user guidance on supported formats.

### Current State Analysis

**Import Package (@writewhisker/import):**
- ✅ JSONImporter.ts - Whisker native formats
- ✅ TwineImporter.ts - Twine 2 HTML import with macro conversion
- ✅ 105 passing tests
- ✅ Integration tests for real-world Twine files

**Export Package (@writewhisker/export):**
- ✅ WhiskerCoreExporter.ts - Native JSON export
- ✅ HTMLExporter.ts - Standalone HTML with embedded runtime
- ✅ MarkdownExporter.ts - Documentation format
- ✅ TwineExporter.ts - Twine 2 compatible export
- ✅ EPUBExporter.ts - eBook format
- ✅ StaticSiteExporter.ts - Multi-page static sites
- ✅ 129 passing tests
- ✅ Theme system (themes.ts)

---

## Phase 3A: Document Current Capabilities

**Objective:** Create comprehensive documentation of what works, what doesn't, and known limitations

### Tasks

#### 1. Create IMPORT_EXPORT_MATRIX.md

**Priority:** High
**Estimated Time:** 2 hours

Create a master reference document showing:
- Supported formats with status indicators
- Known limitations for each format
- Conversion quality notes
- Recommended workflows

**Template Structure:**
```markdown
# Import/Export Capabilities Matrix

## Import Support

| Format | Status | Package | Limitations | Notes |
|--------|--------|---------|-------------|-------|
| Whisker JSON v1.0-2.1 | ✅ Full | @writewhisker/import | None | Native format |
| Twine 2 (All formats) | ⚠️ Good | @writewhisker/import | Macro conversion limitations | See details below |
| Twee Notation | ⚠️ Partial | @writewhisker/import | Via Twine importer | Plain text format |

## Export Support

| Format | Status | Package | Features | Notes |
|--------|--------|---------|----------|-------|
| Whisker JSON | ✅ Full | @writewhisker/export | All versions supported | Native format |
| HTML Standalone | ✅ Full | @writewhisker/export | Embedded runtime, themes | Ready for web hosting |
| ... | ... | ... | ... | ... |

## Format-Specific Details
...
```

**Deliverable:** `/IMPORT_EXPORT_MATRIX.md`

---

#### 2. Analyze Twine Importer Capabilities

**Priority:** High
**Estimated Time:** 3 hours

Review `/packages/import/src/formats/TwineImporter.ts` to document:
- Which Twine story formats are supported (Harlowe, SugarCube, Chapbook, Snowman)
- Macro conversion mappings
- Known conversion issues
- Data loss scenarios

**Actions:**
```bash
# Read the TwineImporter source
# Check integration tests for real examples
# Document findings in matrix
```

**Deliverable:** Detailed format support in IMPORT_EXPORT_MATRIX.md

---

#### 3. Update Package READMEs

**Priority:** Medium
**Estimated Time:** 2 hours

**packages/import/README.md:**
- Add "Supported Formats" section
- Add "Known Limitations" section
- Add usage examples for each format
- Link to IMPORT_EXPORT_MATRIX.md

**packages/export/README.md:**
- Add "Export Formats" section
- Add theme documentation
- Add template customization guide
- Link to IMPORT_EXPORT_MATRIX.md

**Deliverables:**
- Updated `/packages/import/README.md`
- Updated `/packages/export/README.md`

---

#### 4. Create Conversion Quality Reports

**Priority:** Medium
**Estimated Time:** 2 hours

Enhance importer to provide detailed conversion reports:

**Location:** `/packages/import/src/types.ts`

```typescript
export interface ConversionReport {
  format: string;
  success: boolean;
  passagesConverted: number;
  warnings: ConversionWarning[];
  losses: ConversionLoss[];
  suggestions: string[];
}

export interface ConversionWarning {
  passage?: string;
  type: 'macro' | 'syntax' | 'feature';
  message: string;
  original: string;
  converted: string;
}

export interface ConversionLoss {
  passage?: string;
  feature: string;
  description: string;
  workaround?: string;
}
```

**Deliverable:** Enhanced type definitions and reporting

---

### Phase 3A Deliverables Summary

- ✅ IMPORT_EXPORT_MATRIX.md (comprehensive format reference)
- ✅ Updated packages/import/README.md (usage guide)
- ✅ Updated packages/export/README.md (format guide)
- ✅ Enhanced ConversionReport types
- ✅ Documentation of all known limitations

**Estimated Total Time:** 8-10 hours

---

## Phase 3B: Test and Verify Current Capabilities

**Objective:** Ensure existing functionality works correctly and is well-tested

### Tasks

#### 1. Audit Existing Test Coverage

**Priority:** High
**Estimated Time:** 2 hours

```bash
# Check import package coverage
pnpm --filter @writewhisker/import test:coverage

# Check export package coverage
pnpm --filter @writewhisker/export test:coverage
```

**Goal:** Achieve >80% coverage for both packages

**Actions:**
- Identify untested code paths
- Add tests for edge cases
- Test error handling

**Deliverable:** Coverage report and test improvements

---

#### 2. Create Real-World Test Cases

**Priority:** High
**Estimated Time:** 4 hours

**Test Cases Needed:**
1. Import Twine story with complex macros
2. Import/Export round-trip (lossless?)
3. Export to all formats from same story
4. Theme variations in HTML export
5. EPUB generation with images
6. Static site with navigation

**Location:** `/packages/import/src/formats/*.integration.test.ts`

**Deliverable:** 6+ integration tests with real story data

---

#### 3. Verify Core Engine Compatibility

**Priority:** High
**Estimated Time:** 2 hours

Ensure exports work correctly with @writewhisker/core-ts player:

```typescript
// Test: Can core-ts play exported stories?
import { StoryPlayer } from '@writewhisker/core-ts';
import { WhiskerCoreExporter } from '@writewhisker/export';

const exported = exporter.export(story);
const player = new StoryPlayer();
player.loadStory(JSON.parse(exported));
// Verify playback works
```

**Deliverable:** Core engine compatibility tests

---

### Phase 3B Deliverables Summary

- ✅ >80% test coverage for import/export packages
- ✅ 6+ real-world integration tests
- ✅ Core engine compatibility verified
- ✅ Edge case tests added

**Estimated Total Time:** 8 hours

---

## Phase 3C: Enhancements (Optional)

**Objective:** Add new capabilities based on user needs

### Priority Assessment

**High Value, Low Effort:**
1. ✅ Improve HTML export themes (2 hours)
2. ✅ Add dark mode support (2 hours)
3. ✅ Better error messages in importers (2 hours)

**High Value, Medium Effort:**
4. ⚠️ Enhanced Twine macro conversion (4-6 hours)
5. ⚠️ Twine 1 legacy support (6-8 hours)
6. ⚠️ PDF export (8-10 hours)

**Future/Low Priority:**
7. ❌ Mobile app templates (requires Capacitor setup, 2-3 days)
8. ❌ Desktop app templates (requires Tauri setup, 2-3 days)
9. ❌ Ink/ChoiceScript importers (unknown effort, low demand)

---

### Quick Wins (Recommended for Phase 3C)

#### 1. Expand HTML Export Themes

**Priority:** High
**Estimated Time:** 2 hours
**Location:** `/packages/export/src/themes/themes.ts`

**Current Themes:**
- classic
- modern
- minimal

**Add:**
- dark-modern
- accessibility-high-contrast
- mobile-optimized
- print-friendly

```typescript
export const themes = {
  // Existing themes
  classic: { ... },
  modern: { ... },
  minimal: { ... },

  // New themes
  'dark-modern': {
    name: 'Dark Modern',
    description: 'Dark mode with modern aesthetics',
    colors: {
      background: '#1a1a1a',
      text: '#e0e0e0',
      primary: '#64b5f6',
      secondary: '#81c784',
    },
    // ...
  },
  // ...
};
```

**Deliverable:** 4 additional themes

---

#### 2. Improve Importer Error Messages

**Priority:** Medium
**Estimated Time:** 2 hours
**Location:** `/packages/import/src/formats/*.ts`

**Current:** Generic error messages
**Goal:** Specific, actionable error messages

**Example:**
```typescript
// Before
throw new Error('Invalid Twine file');

// After
throw new Error(
  'Invalid Twine 2 HTML file: Missing <tw-storydata> element. ' +
  'This file may be Twine 1 format (not supported) or corrupted. ' +
  'Try exporting again from Twine.'
);
```

**Deliverable:** Better error messages throughout importers

---

#### 3. Add Conversion Suggestions

**Priority:** Medium
**Estimated Time:** 2 hours

When importing Twine with unsupported macros, suggest alternatives:

```typescript
const suggestions = [
  'The <<widget>> macro is not supported. Consider using Lua functions instead.',
  'Time-based modifiers (after:) are not supported. Use passage links and state tracking.',
  'JavaScript expressions have been converted to simple conditions. Review for accuracy.',
];
```

**Deliverable:** Helpful conversion suggestions

---

### Phase 3C Deliverables Summary (Quick Wins Only)

- ✅ 4 additional HTML themes (dark, accessible, mobile, print)
- ✅ Improved error messages in importers
- ✅ Conversion suggestions for unsupported features

**Estimated Total Time:** 6 hours

---

## Implementation Strategy

### Week 1: Documentation & Testing

**Days 1-2:** Phase 3A (Documentation)
- Create IMPORT_EXPORT_MATRIX.md
- Analyze Twine importer capabilities
- Update package READMEs
- Define ConversionReport types

**Days 3-4:** Phase 3B (Testing)
- Audit test coverage
- Create integration tests
- Verify core engine compatibility
- Add edge case tests

**Day 5:** Phase 3C (Quick Wins)
- Add 4 new themes
- Improve error messages
- Add conversion suggestions

---

## Success Criteria

### Must Have (Phase 3A & 3B)
- ✅ IMPORT_EXPORT_MATRIX.md published
- ✅ Package READMEs updated with examples
- ✅ >80% test coverage for import/export packages
- ✅ 6+ integration tests with real stories
- ✅ Core engine compatibility verified
- ✅ All existing tests passing

### Nice to Have (Phase 3C)
- ✅ 4 new HTML themes
- ✅ Better error messages
- ✅ Conversion suggestions
- ⚠️ Enhanced Twine macro support (defer to Phase 4)
- ❌ PDF export (defer to future)
- ❌ Mobile/Desktop templates (defer to future)

---

## Risks & Mitigation

**Risk 1:** Test coverage reveals bugs in existing exporters
- **Mitigation:** Fix bugs as discovered, may extend timeline
- **Impact:** Medium

**Risk 2:** Twine format variations not fully understood
- **Mitigation:** Test with real-world Twine stories from community
- **Impact:** Low (documentation can note "experimental" support)

**Risk 3:** Core engine compatibility issues
- **Mitigation:** Work with core-ts team to align format expectations
- **Impact:** Low (both packages in same monorepo)

---

## Dependencies

**Required:**
- Phase 1 ✅ Complete (no code duplication)
- Phase 2 ✅ Complete (clean codebase)
- Access to Twine story samples (for testing)

**Optional:**
- User feedback on needed formats (for prioritization)
- Design input on new themes (for Phase 3C)

---

## Out of Scope

The following are explicitly OUT OF SCOPE for Phase 3:

❌ **Not Included:**
1. Implementing PDF export (future Phase 4 candidate)
2. Creating mobile app templates (requires Capacitor expertise)
3. Creating desktop app templates (requires Tauri setup)
4. Adding Ink importer (low demand, high effort)
5. Adding ChoiceScript importer (low demand, high effort)
6. Adding Twine 1 support (legacy format, declining usage)
7. Implementing advanced Twine macro conversion (defer to Phase 4)

These items should be tracked as GitHub issues for future consideration.

---

## Deliverables Checklist

### Documentation
- [ ] IMPORT_EXPORT_MATRIX.md created
- [ ] packages/import/README.md updated
- [ ] packages/export/README.md updated
- [ ] ConversionReport types defined

### Testing
- [ ] Import package >80% coverage
- [ ] Export package >80% coverage
- [ ] 6+ integration tests created
- [ ] Core engine compatibility tests passing

### Enhancements (Quick Wins)
- [ ] 4 new HTML themes added
- [ ] Error messages improved
- [ ] Conversion suggestions implemented

### Quality Gates
- [ ] All 234 existing tests passing (105 import + 129 export)
- [ ] New tests passing
- [ ] Build successful
- [ ] No new TypeScript errors
- [ ] Documentation reviewed

---

## Timeline Summary

| Phase | Tasks | Duration |
|-------|-------|----------|
| 3A | Documentation | 8-10 hours (1-2 days) |
| 3B | Testing | 8 hours (1 day) |
| 3C | Quick Wins | 6 hours (1 day) |
| **Total** | | **3-5 days** |

---

## Next Steps After Phase 3

1. **User Testing:** Get feedback on import/export workflows
2. **Phase 4 Planning:** Based on Phase 3 findings, plan:
   - Enhanced Twine macro support (if needed)
   - PDF export (if requested)
   - Additional format support (based on demand)
3. **GitHub Issues:** Create issues for deferred enhancements
4. **Documentation Site:** Publish import/export guides

---

## Related Documentation

- **PHASE_1D_DECISION.md** - Structural decisions
- **PHASE_2_COMPLETION.md** - Cleanup completed
- **TODO_AUDIT.md** - Known tech debt
- **GitHub Issues #137-138** - Test coverage tracking

---

**Phase 3: Import/Export Feature Alignment - READY TO BEGIN**
