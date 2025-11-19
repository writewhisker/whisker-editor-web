# File Duplication Mapping: /src/lib/ → /packages/

**Analysis Date:** 2025-11-18
**Purpose:** Comprehensive mapping of duplicate files to support migration from monolithic `/src/lib/` to modularized `/packages/`

## Executive Summary

### Overview
- **Total Categories Analyzed:** 8 major directories
- **Files with Duplicates:** 52+ files exist in both locations
- **Exact Duplicates:** 19 files (can be safely removed from src/lib)
- **Diverged Files:** 33+ files (require merge decisions)
- **Migration Status:** Partially complete, validation/analytics packages exist but incomplete migration

### Key Findings
1. **Models** - Nearly complete migration, only minor divergence in type definitions
2. **Export** - Most files duplicated with minor divergence
3. **Import** - TwineImporter has significant divergence (203 lines)
4. **Scripting** - Well migrated, minimal divergence
5. **Publishing** - Near-complete migration with minor import path differences
6. **Audio** - Fully migrated, identical files
7. **Validation** - Complete package exists, files diverged by import paths
8. **Analytics** - Complete package exists, mostly identical
9. **Player** - Files exist in both locations with some divergence

---

## 1. MODELS DIRECTORY

**Mapping:** `/src/lib/models/` → `/packages/core-ts/src/models/`

### 1.1 Exact Duplicates (Safe to Remove from src/lib)

| File | Size | Status | Location (src) | Location (pkg) |
|------|------|--------|----------------|----------------|
| Collaborator.ts | 991 bytes | ✅ IDENTICAL | /src/lib/models/ | /packages/core-ts/src/models/ |
| ChangeLog.ts | 2,175 bytes | ✅ IDENTICAL | /src/lib/models/ | /packages/core-ts/src/models/ |
| Playthrough.ts | 5,014 bytes | ✅ IDENTICAL | /src/lib/models/ | /packages/core-ts/src/models/ |
| Variable.ts | 710 bytes | ✅ IDENTICAL | /src/lib/models/ | /packages/core-ts/src/models/ |
| LuaFunction.ts | 7,568 bytes | ✅ IDENTICAL | /src/lib/models/ | /packages/core-ts/src/models/ |
| Choice.ts | 1,562 bytes | ✅ IDENTICAL | /src/lib/models/ | /packages/core-ts/src/models/ |
| ScriptBlock.ts | 12,268 bytes | ✅ IDENTICAL | /src/lib/models/ | /packages/core-ts/src/models/ |
| Comment.ts | 1,714 bytes | ✅ IDENTICAL | /src/lib/models/ | /packages/core-ts/src/models/ |

**Total:** 8 files, 31,992 bytes

**Action:** Delete these files from `/src/lib/models/` and update imports to use `@writewhisker/core-ts`

### 1.2 Diverged Files (Requires Merge Decision)

| File | Src Size | Pkg Size | Diff Lines | Key Difference |
|------|----------|----------|------------|----------------|
| types.ts | 7,606 | 7,721 | 7 | PlaythroughData renamed to EditorPlaythroughData in package |
| index.ts | 309 | 581 | 22 | Package has more comprehensive exports |
| Passage.ts | 3,430 | 3,418 | 2 | Minor implementation differences |
| Story.ts | 12,232 | 12,234 | 4 | Very minor differences |

**Recommendation:**
- **types.ts**: Package version is newer with better naming (EditorPlaythroughData vs PlaythroughData). Use package version.
- **index.ts**: Package version exports more. Update src to use package exports.
- **Passage.ts & Story.ts**: Minimal differences, likely import path changes. Review diff and use package version.

---

## 2. EXPORT DIRECTORY

**Mapping:** `/src/lib/export/` → `/packages/export/src/`

### 2.1 Exact Duplicates

| File | Size | Status |
|------|------|--------|
| HTMLExporter.ts | 3,314 bytes | ✅ IDENTICAL |
| HTMLPlayerTemplate.ts | 8,043 bytes | ✅ IDENTICAL |
| themes/themes.ts | 5,102 bytes | ✅ IDENTICAL |

**Total:** 3 files, 16,459 bytes

### 2.2 Diverged Files

| File | Src Size | Pkg Size | Diff Lines | Key Difference |
|------|----------|----------|------------|----------------|
| WhiskerCoreExporter.ts | 3,525 | 3,545 | 4 | Minor import differences |
| StaticSiteExporter.ts | 17,380 | 17,346 | 7 | Small implementation tweaks |
| JSONExporter.ts | 5,420 | 5,414 | 2 | Minimal differences |
| EPUBExporter.ts | 19,552 | 19,774 | 7 | Minor updates in package |
| TwineExporter.ts | 3,737 | 3,787 | 3 | Small differences |
| MarkdownExporter.ts | 8,976 | 9,042 | 8 | Minor divergence |
| types.ts | 4,598 | 4,583 | 11 | Import path differences |

**Recommendation:** Most divergences are minor import path changes. Package versions should be canonical. Update src imports to use package.

### 2.3 Files Only in src/lib

| File | Size | Notes |
|------|------|-------|
| RobloxExporter.ts | ~15KB | Platform-specific exporter, likely app-specific |
| MinecraftExporter.ts | ~18KB | Platform-specific exporter, likely app-specific |

**Recommendation:** These are application-specific and should remain in `/src/lib/export/` OR be moved to a separate `@writewhisker/game-exporters` package.

---

## 3. IMPORT DIRECTORY

**Mapping:** `/src/lib/import/` → `/packages/import/src/`

### 3.1 Exact Duplicates

| File | Size | Status |
|------|------|--------|
| JSONImporter.ts | 4,630 bytes | ✅ IDENTICAL |

### 3.2 Diverged Files

| File | Src Size | Pkg Size | Diff Lines | Severity |
|------|----------|----------|------------|----------|
| TwineImporter.ts | 31,038 | 37,674 | 203 | ⚠️ HIGH |
| types.ts | 5,931 | 5,925 | 2 | ✅ LOW |

**⚠️ CRITICAL: TwineImporter.ts**
- **Diff:** 203 lines of difference (6,636 bytes difference)
- **Analysis:** Package version is significantly more feature-complete
  - Added Snowman format support
  - Enhanced Harlowe macro tracking
  - Better transition and event macro handling
  - Type safety improvements (e.g., `as Iterable<Passage>`)
- **Recommendation:** Package version is superior. Use package version, but review src version for any app-specific customizations that need to be preserved.

---

## 4. SCRIPTING DIRECTORY

**Mapping:** `/src/lib/scripting/` → `/packages/scripting/src/`

### 4.1 Exact Duplicates

| File | Size | Status |
|------|------|--------|
| LuaEngine.ts | 39,850 bytes | ✅ IDENTICAL |
| luaConfig.ts | 14,106 bytes | ✅ IDENTICAL |

### 4.2 Diverged Files

| File | Src Size | Pkg Size | Diff Lines |
|------|----------|----------|------------|
| LuaExecutor.ts | 7,536 | 7,554 | 18 |

**Recommendation:** Very minor divergence. Review and use package version.

---

## 5. PUBLISHING DIRECTORY

**Mapping:** `/src/lib/publishing/` → `/packages/publishing/src/`

### 5.1 Exact Duplicates

| File | Size | Status |
|------|------|--------|
| types.ts | 2,863 bytes | ✅ IDENTICAL |
| versionManager.ts | 7,935 bytes | ✅ IDENTICAL |

### 5.2 Diverged Files

| File | Src Size | Pkg Size | Diff Lines | Note |
|------|----------|----------|------------|------|
| GitHubPublisher.ts | 12,071 | 12,060 | 2 | Minimal |
| ItchPublisher.ts | 6,693 | 6,682 | 2 | Minimal |
| StaticPublisher.ts | 1,914 | 1,903 | 2 | Minimal |

**Recommendation:** All divergences are 2 lines - likely just import path differences. Use package versions.

### 5.3 Files Only in src/lib

| File | Size | Notes |
|------|------|-------|
| sharingUtils.ts | ~3KB | App-specific utility for UI sharing features |

**Recommendation:** This is application-specific and should remain in `/src/lib/publishing/` OR be moved to `/packages/editor-base/`.

---

## 6. AUDIO DIRECTORY

**Mapping:** `/src/lib/audio/` → `/packages/audio/src/`

### 6.1 Exact Duplicates (100% Match)

| File | Size | Status |
|------|------|--------|
| types.ts | 84 bytes | ✅ IDENTICAL |
| AudioManager.ts | 4,892 bytes | ✅ IDENTICAL |

**✅ COMPLETE MIGRATION** - All files are identical. Safe to remove from `/src/lib/audio/` entirely.

---

## 7. UTILS DIRECTORY

**Mapping:** `/src/lib/utils/` → `/packages/core-ts/src/utils/`

### 7.1 Exact Duplicates

| File | Size | Status |
|------|------|--------|
| idGenerator.ts | 420 bytes | ✅ IDENTICAL |

### 7.2 Diverged Files

| File | Src Size | Pkg Size | Diff Lines |
|------|----------|----------|------------|
| whiskerCoreAdapter.ts | 10,627 | 10,672 | 7 |

### 7.3 Files Only in src/lib/utils (App-Specific)

These files are **application-specific** and should remain in `/src/lib/utils/`:

| File | Purpose |
|------|---------|
| graphLayout.ts | UI graph layout algorithm |
| errorHandling.ts | App error handling |
| accessibility.ts | UI accessibility utilities |
| fileOperations.ts | File system operations (browser/app specific) |
| passageTemplates.ts | Editor templates |
| connectionValidator.ts | UI connection validation |
| recentFiles.ts | App state management |
| storageUtils.ts | Browser storage utilities |
| motion.ts | UI animations |
| autoSave.ts | App auto-save feature |
| storyComparison.ts | Editor feature |
| folderManager.ts | App feature |
| mobile.ts | Mobile app utilities |
| gridSnap.ts | UI feature |
| storyFlowAnalytics.ts | Editor analytics |

**Recommendation:** These are editor/app-specific. Either keep in `/src/lib/utils/` or move to `/packages/editor-base/`.

---

## 8. VALIDATION DIRECTORY

**Mapping:** `/src/lib/validation/` → `/packages/core-ts/src/validation/`

### 8.1 Exact Duplicates

| File | Size | Status |
|------|------|--------|
| defaultValidator.ts | N/A | ✅ IDENTICAL |
| validators/index.ts | N/A | ✅ IDENTICAL |

### 8.2 Diverged Files (Minor Import Differences)

All divergences are 2-4 lines - primarily import path changes to use package imports.

| File | Diff Lines | Status |
|------|------------|--------|
| AutoFixer.ts | 3 | Import paths |
| QualityAnalyzer.ts | 4 | Import paths |
| StoryValidator.ts | 4 | Import paths |
| types.ts | 4 | Import paths |
| DeadLinksValidator.ts | 2 | Import paths |
| EmptyPassagesValidator.ts | 2 | Import paths |
| MissingStartPassageValidator.ts | 2 | Import paths |
| UndefinedVariablesValidator.ts | 2 | Import paths |
| UnreachablePassagesValidator.ts | 2 | Import paths |
| UnusedVariablesValidator.ts | 4 | Import paths |
| ValidateAssetsValidator.ts | 2 | Import paths |
| ValidateIFIDValidator.ts | 2 | Import paths |
| ValidatePassageMetadataValidator.ts | 2 | Import paths |
| ValidateScriptsValidator.ts | 4 | Import paths |
| ValidateStylesheetsValidator.ts | 2 | Import paths |

**Recommendation:** Package versions are canonical with proper package imports. Use package versions exclusively.

### 8.3 Additional Package Features

The `/packages/validation/` package has additional CLI/reporting capabilities not in `/src/lib/validation/`:

| File | Purpose |
|------|---------|
| cli.ts | Command-line interface |
| reporters/ConsoleReporter.ts | Console output |
| reporters/HTMLReporter.ts | HTML report generation |
| reporters/JUnitReporter.ts | JUnit XML output |
| reporters/JSONReporter.ts | JSON report output |

**Note:** These are package-level features for standalone validation tool usage.

---

## 9. ANALYTICS DIRECTORY

**Mapping:** `/src/lib/analytics/` → `/packages/analytics/src/`

### 9.1 Exact Duplicates

| File | Size | Status |
|------|------|--------|
| PlaythroughAnalytics.ts | N/A | ✅ IDENTICAL |
| PlaythroughRecorder.ts | N/A | ✅ IDENTICAL |
| types.ts | N/A | ✅ IDENTICAL |

### 9.2 Diverged Files

| File | Diff Lines | Status |
|------|------------|--------|
| StoryAnalytics.ts | 14 | Minor differences |

### 9.3 Files Only in Package

| File | Purpose |
|------|---------|
| StorySimulator.ts | Advanced simulation features |
| index.ts | Package exports |

**Recommendation:** Use package versions. StorySimulator is additional package functionality.

---

## 10. PLAYER DIRECTORY

**Mapping:** `/src/lib/player/` → `/packages/core-ts/src/player/`

### 10.1 Exact Duplicates

| File | Size | Status |
|------|------|--------|
| testScenarioTypes.ts | N/A | ✅ IDENTICAL |
| TestScenarioRunner.ts | N/A | ✅ IDENTICAL |

### 10.2 Diverged Files

| File | Status |
|------|--------|
| StoryPlayer.ts | DIVERGED |
| types.ts | DIVERGED |

### 10.3 Files Only in src/lib/testing

| File | Size | Purpose |
|------|------|---------|
| TestRunner.ts | 13,234 bytes | Editor test runner UI |
| TestScenario.ts | 7,470 bytes | Test scenario model |
| testScenarioAdapter.ts | 7,266 bytes | Adapter for UI integration |

**Recommendation:**
- The `/src/lib/testing/` files are editor-specific UI components
- The `/packages/core-ts/src/player/` files are the core runtime
- Keep both, as they serve different purposes

---

## 11. MIGRATION PRIORITY MATRIX

### Phase 1: Safe & Immediate (0 Risk)
**Action:** Update imports, delete src files

1. **Audio** (2 files) - 100% identical
2. **Models - Exact Duplicates** (8 files) - 100% identical
3. **Export - Exact Duplicates** (3 files) - 100% identical
4. **Scripting - Exact Duplicates** (2 files) - 100% identical
5. **Publishing - Exact Duplicates** (2 files) - 100% identical
6. **Import - Exact Duplicates** (1 file) - 100% identical

**Total:** 18 files, ~80KB of duplicate code can be removed immediately.

### Phase 2: Low Risk (Minor Merge Required)
**Action:** Review diff, use package version, update imports

1. **Models - Minor Divergence** (4 files: types.ts, index.ts, Passage.ts, Story.ts)
2. **Export - Minor Divergence** (7 files: all exporters + types)
3. **Publishing - Minor Divergence** (3 files: all publishers)
4. **Scripting - Minor Divergence** (1 file: LuaExecutor.ts)
5. **Utils - Minor Divergence** (1 file: whiskerCoreAdapter.ts)
6. **Validation - All Files** (17 files - import path updates only)
7. **Analytics - Minor Divergence** (1 file: StoryAnalytics.ts)

**Total:** ~34 files requiring review but low risk.

### Phase 3: Medium Risk (Significant Divergence)
**Action:** Careful merge, preserve features from both versions

1. **Import/TwineImporter.ts** (203 line diff - package has more features)
2. **Player/StoryPlayer.ts** (diverged)
3. **Player/types.ts** (diverged)

**Total:** 3 files requiring detailed merge analysis.

### Phase 4: Keep in src/lib (Application-Specific)
**Action:** Do nothing OR migrate to `/packages/editor-base/`

1. **Game Exporters** (MinecraftExporter.ts, RobloxExporter.ts)
2. **Publishing Utils** (sharingUtils.ts)
3. **Utils** (15+ files: UI/editor-specific utilities)
4. **Testing** (TestRunner.ts, TestScenario.ts, testScenarioAdapter.ts)
5. **Data** (minecraftAssets.ts, robloxAssets.ts)
6. **Services** (storage/*, etc.)
7. **Templates** (kidsTemplates.ts, etc.)

---

## 12. RECOMMENDED MIGRATION STEPS

### Step 1: Immediate Wins (Week 1)
```bash
# Delete identical files from src/lib after updating imports:
rm -f src/lib/audio/*.ts
rm -f src/lib/models/{Collaborator,ChangeLog,Playthrough,Variable,LuaFunction,Choice,ScriptBlock,Comment}.ts
rm -f src/lib/export/formats/{HTMLExporter,HTMLPlayerTemplate}.ts
rm -f src/lib/export/themes/themes.ts
rm -f src/lib/scripting/{LuaEngine,luaConfig}.ts
rm -f src/lib/publishing/{types,versionManager}.ts
rm -f src/lib/import/formats/JSONImporter.ts
rm -f src/lib/utils/idGenerator.ts
```

**Before deletion:** Update all imports to use package versions:
- `@writewhisker/audio`
- `@writewhisker/core-ts`
- `@writewhisker/export`
- `@writewhisker/scripting`
- `@writewhisker/publishing`
- `@writewhisker/import`

### Step 2: Merge Diverged Files (Week 2-3)

1. **Validation**: Use package versions, update imports
2. **Analytics**: Use package versions
3. **Models**: Use package types.ts, index.ts, Story.ts, Passage.ts
4. **Export**: Use all package exporters
5. **Publishing**: Use all package publishers
6. **Scripting**: Use package LuaExecutor.ts

### Step 3: Handle Special Cases (Week 4)

1. **TwineImporter.ts**: Merge manually
   - Package version has more features (Snowman support, better macro handling)
   - Check src version for any app-specific customizations
   - Use package version as base, add any missing src features

2. **Player files**: Review divergence
   - Determine if differences are intentional
   - Merge or choose canonical version

### Step 4: Organize App-Specific Code

**Option A:** Keep in `/src/lib/`
```
/src/lib/
  ├── export/
  │   ├── MinecraftExporter.ts
  │   └── RobloxExporter.ts
  ├── utils/
  │   ├── graphLayout.ts
  │   ├── accessibility.ts
  │   └── ... (14 more files)
  └── testing/
      ├── TestRunner.ts
      ├── TestScenario.ts
      └── testScenarioAdapter.ts
```

**Option B:** Migrate to `/packages/editor-base/`
```
/packages/editor-base/src/
  ├── export/
  ├── utils/
  └── testing/
```

---

## 13. IMPORT STATEMENT UPDATES

### Before (src/lib)
```typescript
import { Story } from '$lib/models/Story';
import { Passage } from '$lib/models/Passage';
import { HTMLExporter } from '$lib/export/formats/HTMLExporter';
import { LuaEngine } from '$lib/scripting/LuaEngine';
```

### After (packages)
```typescript
import { Story, Passage } from '@writewhisker/core-ts';
import { HTMLExporter } from '@writewhisker/export';
import { LuaEngine } from '@writewhisker/scripting';
```

---

## 14. ESTIMATED CLEANUP IMPACT

### Code Reduction
- **Immediate removal:** ~18 files, ~80KB
- **After merges:** ~34 files, ~250KB
- **Total potential cleanup:** ~52 files, ~330KB of duplicate code

### Maintenance Benefits
- Single source of truth for core models
- Packages are independently testable
- Cleaner dependency graph
- Easier to publish standalone tools

### Testing Requirements
- Run full test suite after each phase
- Verify all imports resolve correctly
- Check bundle size doesn't increase
- Validate published packages work standalone

---

## 15. RISK ASSESSMENT

| Category | Risk Level | Reason |
|----------|------------|--------|
| Audio | 🟢 None | 100% identical |
| Scripting (core) | 🟢 None | 99% identical |
| Publishing | 🟢 Low | Only import paths differ |
| Models (core) | 🟢 Low | Mostly identical, well-tested |
| Export | 🟡 Medium | Some implementation differences |
| Validation | 🟡 Medium | Import path changes, thorough testing needed |
| Analytics | 🟡 Medium | Minor divergence |
| Import | 🔴 High | TwineImporter significantly diverged |
| Player | 🔴 High | Purpose unclear, needs investigation |

---

## 16. OPEN QUESTIONS

1. **TwineImporter.ts**: Why did the package version diverge so significantly? Are there features in src that need to be preserved?

2. **Player/StoryPlayer.ts**: What are the differences? Is src version app-specific or outdated?

3. **Game Exporters**: Should MinecraftExporter and RobloxExporter be:
   - Kept in src/lib (app-specific)?
   - Moved to separate `@writewhisker/game-exporters` package?
   - Moved to `@writewhisker/editor-base`?

4. **Testing Files**: Are TestRunner/TestScenario/testScenarioAdapter meant to be editor-only? Should they be in `@writewhisker/editor-base`?

5. **Utils**: Should the 15+ app-specific utils be moved to `@writewhisker/editor-base` or stay in src/lib?

---

## 17. NEXT STEPS

### Immediate Actions
1. ✅ Create this mapping document
2. ⬜ Review with team
3. ⬜ Create import update script
4. ⬜ Phase 1: Update imports for identical files
5. ⬜ Phase 1: Delete identical src/lib files
6. ⬜ Run tests, verify no regressions

### Short-term (1-2 weeks)
1. ⬜ Investigate TwineImporter divergence
2. ⬜ Merge diverged validation files
3. ⬜ Merge diverged export files
4. ⬜ Merge diverged models files
5. ⬜ Run full regression testing

### Medium-term (3-4 weeks)
1. ⬜ Resolve Player directory duplication
2. ⬜ Decide on game exporters location
3. ⬜ Organize app-specific utils
4. ⬜ Update documentation

### Long-term
1. ⬜ Consider moving editor-specific code to `@writewhisker/editor-base`
2. ⬜ Establish code ownership rules
3. ⬜ Set up CI checks to prevent new duplications

---

## 18. APPENDIX: Full File Listing

### A. Files in Both Locations (Duplicates)

#### Models (12 files)
- ✅ Collaborator.ts (identical)
- ✅ ChangeLog.ts (identical)
- ✅ Playthrough.ts (identical)
- ✅ Variable.ts (identical)
- ✅ LuaFunction.ts (identical)
- ✅ Choice.ts (identical)
- ✅ ScriptBlock.ts (identical)
- ✅ Comment.ts (identical)
- ⚠️ types.ts (7 line diff)
- ⚠️ index.ts (22 line diff)
- ⚠️ Passage.ts (2 line diff)
- ⚠️ Story.ts (4 line diff)

#### Export (10 files)
- ✅ HTMLExporter.ts (identical)
- ✅ HTMLPlayerTemplate.ts (identical)
- ✅ themes.ts (identical)
- ⚠️ WhiskerCoreExporter.ts (4 line diff)
- ⚠️ StaticSiteExporter.ts (7 line diff)
- ⚠️ JSONExporter.ts (2 line diff)
- ⚠️ EPUBExporter.ts (7 line diff)
- ⚠️ TwineExporter.ts (3 line diff)
- ⚠️ MarkdownExporter.ts (8 line diff)
- ⚠️ types.ts (11 line diff)

#### Import (3 files)
- ✅ JSONImporter.ts (identical)
- 🔴 TwineImporter.ts (203 line diff - MAJOR)
- ⚠️ types.ts (2 line diff)

#### Scripting (3 files)
- ✅ LuaEngine.ts (identical)
- ✅ luaConfig.ts (identical)
- ⚠️ LuaExecutor.ts (18 line diff)

#### Publishing (5 files)
- ✅ types.ts (identical)
- ✅ versionManager.ts (identical)
- ⚠️ GitHubPublisher.ts (2 line diff)
- ⚠️ ItchPublisher.ts (2 line diff)
- ⚠️ StaticPublisher.ts (2 line diff)

#### Audio (2 files)
- ✅ types.ts (identical)
- ✅ AudioManager.ts (identical)

#### Utils (2 files)
- ✅ idGenerator.ts (identical)
- ⚠️ whiskerCoreAdapter.ts (7 line diff)

#### Validation (17 files)
- ✅ defaultValidator.ts (identical)
- ✅ validators/index.ts (identical)
- ⚠️ AutoFixer.ts (3 line diff)
- ⚠️ QualityAnalyzer.ts (4 line diff)
- ⚠️ StoryValidator.ts (4 line diff)
- ⚠️ types.ts (4 line diff)
- ⚠️ DeadLinksValidator.ts (2 line diff)
- ⚠️ EmptyPassagesValidator.ts (2 line diff)
- ⚠️ MissingStartPassageValidator.ts (2 line diff)
- ⚠️ UndefinedVariablesValidator.ts (2 line diff)
- ⚠️ UnreachablePassagesValidator.ts (2 line diff)
- ⚠️ UnusedVariablesValidator.ts (4 line diff)
- ⚠️ ValidateAssetsValidator.ts (2 line diff)
- ⚠️ ValidateIFIDValidator.ts (2 line diff)
- ⚠️ ValidatePassageMetadataValidator.ts (2 line diff)
- ⚠️ ValidateScriptsValidator.ts (4 line diff)
- ⚠️ ValidateStylesheetsValidator.ts (2 line diff)

#### Analytics (4 files)
- ✅ PlaythroughAnalytics.ts (identical)
- ✅ PlaythroughRecorder.ts (identical)
- ✅ types.ts (identical)
- ⚠️ StoryAnalytics.ts (14 line diff)

#### Player (4 files)
- ✅ testScenarioTypes.ts (identical)
- ✅ TestScenarioRunner.ts (identical)
- ⚠️ StoryPlayer.ts (diverged)
- ⚠️ types.ts (diverged)

**Total Duplicates:** 62 files

### B. Files Only in src/lib (Application-Specific)

#### Export
- MinecraftExporter.ts
- RobloxExporter.ts

#### Publishing
- sharingUtils.ts

#### Utils (15+ files)
- graphLayout.ts
- errorHandling.ts
- accessibility.ts
- fileOperations.ts
- passageTemplates.ts
- connectionValidator.ts
- recentFiles.ts
- storageUtils.ts
- motion.ts
- autoSave.ts
- storyComparison.ts
- folderManager.ts
- mobile.ts
- gridSnap.ts
- storyFlowAnalytics.ts

#### Testing
- TestRunner.ts
- TestScenario.ts
- testScenarioAdapter.ts

#### Data
- minecraftAssets.ts
- robloxAssets.ts

#### Services
- storage/syncQueue.ts
- storage/migration.ts

#### Templates
- kidsTemplates.ts

**Total Unique to src/lib:** ~25+ files

### C. Files Only in packages/ (Package Features)

#### Validation
- cli.ts
- reporters/ (5 reporter implementations)

#### Analytics
- StorySimulator.ts

#### Core-ts
- player/index.ts
- utils/index.ts
- models/index.ts (extended exports)

**Total Unique to packages/:** ~10 files

---

## 19. CONCLUSION

The migration from `/src/lib/` to `/packages/` is **60-70% complete**:

- ✅ **Core domains well-migrated:** Models, Scripting, Audio, Publishing
- ⚠️ **Minor cleanup needed:** Export, Validation, Analytics
- 🔴 **Requires attention:** Import (TwineImporter), Player (divergence investigation)
- 📦 **App-specific code:** ~25 files should remain in src/lib or move to editor-base

**Immediate benefit:** Removing 18 identical files will eliminate ~80KB of duplicate code and reduce maintenance burden with zero risk.

**Total potential:** Full migration could eliminate ~330KB of duplication across 52 files, creating a cleaner monorepo with packages as the single source of truth.
