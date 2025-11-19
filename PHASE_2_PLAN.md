# Phase 2: Legacy Code Removal

**Status:** PLANNED  
**Estimated Duration:** 2-4 hours  
**Dependencies:** Phase 1 complete ✅

## Executive Summary

Phase 2 focuses on removing deprecated code, backup files, and technical debt to improve code quality and maintainability. Analysis shows:

- **1 deprecated file** (connectionValidator.ts) - Still in use, cannot remove yet
- **2 backup files** - Safe to remove
- **34 TODO/FIXME comments** - Need review and action

---

## Phase 2A: Remove Deprecated Code

### Current State

**File:** `packages/editor-base/src/utils/connectionValidator.ts` (8KB)

**Status:** ⚠️ **CANNOT REMOVE - STILL IN USE**

**Active References (9 total):**
1. `src/lib/stores/projectStore.test.ts` - Import and mock
2. `src/lib/stores/passageOperationsStore.ts` - Uses `removeConnectionsToPassage`  
3. `src/lib/utils/connectionValidator.test.ts` - Test file
4. `packages/editor-base/src/stores/passageOperationsStore.ts` - Uses `removeConnectionsToPassage`
5. `packages/editor-base/src/utils/index.ts` - Re-exports all functions

**Analysis:**
The file is NOT deprecated - it's actively used for managing passage connections. The original plan incorrectly identified this as deprecated code.

**Recommended Action:**
- **SKIP removal** - File is required for passage operations
- Update any documentation claiming it's deprecated
- No migration needed

### Deliverables
- ✅ Analysis complete
- ❌ No removal needed
- 📋 Update plan to reflect actual status

---

## Phase 2B: Remove Backup Files

### Files to Remove

1. **`/package.json.backup`**
   - Created during earlier migrations
   - No longer needed (current package.json is stable)

2. **`/src/lib/stores/testScenarioStore.ts.backup`**
   - Backup of old test scenario store
   - New version is working correctly

### Tasks

1. **Remove backup files:**
   ```bash
   rm package.json.backup
   rm src/lib/stores/testScenarioStore.ts.backup
   ```

2. **Update .gitignore:**
   ```bash
   echo "*.backup" >> .gitignore
   ```

3. **Verify no impact:**
   ```bash
   pnpm run build
   pnpm run test
   ```

### Deliverables
- Cleaned repository (2 files removed)
- Updated .gitignore to prevent future backups
- All tests passing

---

## Phase 2C: Address TODO/FIXME Comments

### Summary

**Total:** 34 TODO/FIXME comments found

**Categories:**
1. **Test-related** (3 comments) - Missing comprehensive tests
2. **Feature stubs** (8 comments) - Unimplemented features
3. **UI improvements** (2 comments) - Better UX needed
4. **Code quality** (21 comments) - Refactoring opportunities

### Critical TODOs (High Priority)

#### 1. Missing Template UI
**File:** `src/App.svelte:806`
```typescript
// TODO: Add a proper modal UI for template selection instead of prompt()
```
**Impact:** Poor UX - using browser prompt()  
**Action:** Create proper template selection dialog

#### 2. Missing Tests
**Files:**
- `packages/audio/src/AudioManager.test.ts:3`
- `packages/github/src/utils.test.ts:3`

**Impact:** Low test coverage for new packages  
**Action:** Add comprehensive unit tests

#### 3. Unimplemented Auth
**Files:**
- `packages/editor-base/src/components/auth/AuthDialog.svelte:20` - Email auth
- `packages/editor-base/src/components/auth/AuthDialog.svelte:47` - Google OAuth

**Impact:** Auth features not functional  
**Action:** Implement or remove stub code

### Non-Critical TODOs (Low Priority)

#### Feature Enhancement Comments (21 items)
- AI writing suggestions improvements
- Visual condition builder parser
- Storage service extensibility notes  
- Achievement notification UI
- Analytics simulator improvements

**Recommended Action:** Document as future enhancements, not blocking issues

### Tasks

1. **Categorize all TODOs:**
   ```bash
   grep -rn "TODO\|FIXME" --include="*.ts" --include="*.svelte" \
     src/ packages/ > TODO_AUDIT.md
   ```

2. **Create issues for critical TODOs:**
   - Template selection UI
   - Missing test coverage
   - Incomplete auth implementation

3. **Remove or convert non-critical TODOs:**
   - Move to GitHub issues
   - Convert to documentation
   - Remove if obsolete

4. **Update coding standards:**
   - Add guidelines for when to use TODO vs GitHub issue
   - Require ticket references in TODOs

### Deliverables
- TODO_AUDIT.md - Complete categorized list
- GitHub issues for critical items (3-5 issues)
- Reduced TODO count (target: <15)
- Updated CONTRIBUTING.md with TODO guidelines

---

## Phase 2D: Code Duplication Check

### Additional Cleanup (Optional)

Run final duplication check to ensure Phase 1 was complete:

```bash
# Check for any remaining duplicate files
find src/lib packages/editor-base/src \
  -type f -name "*.ts" -o -name "*.svelte" | \
  sort | uniq -d

# Check for duplicate exports
grep -r "export.*from" src/ packages/ | \
  grep -v node_modules | sort | uniq -c | \
  awk '$1 > 1'
```

### Deliverables
- Verification report
- Any additional cleanup if duplicates found

---

## Implementation Strategy

### Order of Execution

1. **Phase 2B: Remove Backup Files** (10 minutes)
   - Low risk, immediate benefit
   - Run first to clean up repository

2. **Phase 2A: Update Documentation** (15 minutes)
   - Correct deprecation claims about connectionValidator
   - Update any migration guides

3. **Phase 2C: TODO Audit** (1-2 hours)
   - Categorize all TODOs
   - Create GitHub issues
   - Clean up/remove obsolete TODOs

4. **Phase 2D: Final Verification** (30 minutes)
   - Run duplication checks
   - Verify all tests pass
   - Generate completion report

### Success Criteria

- ✅ All backup files removed
- ✅ .gitignore updated
- ✅ TODO count reduced by >50%
- ✅ Critical TODOs converted to GitHub issues
- ✅ All tests passing (923 unit + 4 E2E)
- ✅ Build successful
- ✅ No new duplicates introduced

### Risks & Mitigation

**Risk:** Accidentally removing needed code  
**Mitigation:** Grep for usage before deleting any file

**Risk:** Breaking tests when removing TODOs  
**Mitigation:** Run test suite after each change

**Risk:** Losing important context in TODOs  
**Mitigation:** Convert to GitHub issues before removing

---

## Estimated Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 2A | Documentation update | 15 min |
| 2B | Remove backup files | 10 min |
| 2C | TODO audit & cleanup | 1-2 hours |
| 2D | Final verification | 30 min |
| **Total** | | **2-4 hours** |

---

## Next Steps

After Phase 2 completion:
1. Create Phase 2 completion report
2. Update CHANGELOG.md
3. Commit all changes
4. Move to Phase 3 (if defined in project plan)

---

## Files to Modify

**Deletions:**
- package.json.backup
- src/lib/stores/testScenarioStore.ts.backup

**Modifications:**
- .gitignore (add *.backup)
- Various files with TODO comments (cleanup)
- CONTRIBUTING.md (add TODO guidelines)

**New Files:**
- TODO_AUDIT.md (categorized TODO list)
- PHASE_2_COMPLETION.md (final report)
- GitHub issues (3-5 issues for critical TODOs)

