# TODO/FIXME Audit

**Date:** November 18, 2025
**Total Comments:** 13
**Status:** Phase 2C - Legacy Code Removal

---

## Summary

This audit categorizes all TODO/FIXME comments in the codebase to identify critical items requiring GitHub issues versus enhancement notes that can remain as documentation.

### Count by Category
- **Critical (High Priority):** 3 items
- **Enhancement (Low Priority):** 8 items
- **Test Placeholders:** 2 items

---

## Critical TODOs (High Priority)

These items represent incomplete features or poor UX that should be addressed.

### 1. Missing Template Selection UI
**File:** `src/App.svelte:806`
**Code:**
```typescript
// TODO: Add a proper modal UI for template selection instead of prompt()
```

**Impact:** Poor user experience - using browser `prompt()` dialog
**Priority:** High
**Action:** Create GitHub issue for proper template selection modal

---

### 2. Incomplete Email Authentication
**File:** `packages/editor-base/src/components/auth/AuthDialog.svelte:20`
**Code:**
```typescript
// TODO: Implement Supabase email auth
```

**Impact:** Authentication feature not functional
**Priority:** High
**Action:** Either implement or remove auth stub code

---

### 3. Incomplete Google OAuth
**File:** `packages/editor-base/src/components/auth/AuthDialog.svelte:47`
**Code:**
```typescript
// TODO: Implement Google OAuth
```

**Impact:** Authentication feature not functional
**Priority:** High
**Action:** Either implement or remove auth stub code

---

## Enhancement TODOs (Low Priority)

These are feature enhancement notes that document future improvements. They can remain in code as inline documentation.

### 4. Choice Condition Evaluation
**File:** `packages/analytics/src/StorySimulator.ts:170`
**Code:**
```typescript
// TODO: Evaluate choice conditions
```

**Impact:** Enhancement to simulator - not blocking
**Priority:** Low
**Recommendation:** Keep as inline note

---

### 5. Storage Service Extensibility
**File:** `src/lib/services/storage/StorageServiceFactory.ts:108`
**File:** `packages/editor-base/src/services/storage/StorageServiceFactory.ts:108`
**Code:**
```typescript
// TODO: In the future, we might want to:
```

**Impact:** Future extensibility note
**Priority:** Low
**Recommendation:** Keep as inline documentation

---

### 6. Achievement Notification UI
**File:** `packages/editor-base/src/stores/achievementStore.ts:167`
**Code:**
```typescript
// TODO: Show UI notification
```

**Impact:** Enhancement to achievement system
**Priority:** Low
**Recommendation:** Keep as inline note

---

### 7. Visual Condition Builder Parser
**File:** `packages/editor-base/src/components/scripting/VisualConditionBuilder.svelte:197`
**Code:**
```typescript
// TODO: Implement parser for existing conditions
```

**Impact:** Enhancement to condition builder
**Priority:** Low
**Recommendation:** Keep as inline note

---

### 8. Template Loading from Service
**File:** `packages/editor-base/src/components/onboarding/OnboardingWizard.svelte:91`
**Code:**
```typescript
// TODO: Load template from template service
```

**Impact:** Enhancement to onboarding
**Priority:** Low
**Recommendation:** Keep as inline note

---

### 9. Accessibility Script Comment
**File:** `scripts/fixAccessibility.ts:142`
**Code:**
```typescript
// Just comment it out with a TODO for now
```

**Impact:** Script maintenance note
**Priority:** Low
**Recommendation:** Keep as inline note or remove

---

### 10. AI Writing Store Example
**File:** `packages/editor-base/src/stores/aiWritingStore.ts:119`
**Code:**
```typescript
'Quality Review:\n\n✓ Pacing: Good balance of action and exposition\n⚠ Repetitive Phrases: "Suddenly" used 8 times - consider alternatives\n✓ Choice Meaningfulness: Player decisions have clear consequences\n⚠ Dead Ends: 3 passages lead nowhere - add more connections\n✓ Branching Depth: Good variety of paths\n\nEnhancements:\n1. Vary sentence openings for better flow\n2. Create more choice consequences in passages 18, 22, 31\n3. Review passages marked as "TODO"',
```

**Impact:** Example data containing "TODO" text (not a real TODO)
**Priority:** N/A
**Recommendation:** Keep as-is (part of example data)

---

## Test Placeholder TODOs

These mark placeholder test files that need comprehensive test implementation.

### 11. Missing Audio Manager Tests
**File:** `packages/audio/src/AudioManager.test.ts:3`
**Code:**
```typescript
/**
 * Placeholder tests for AudioManager
 * TODO: Add comprehensive unit tests
 */
```

**Impact:** Low test coverage for audio package
**Priority:** Medium
**Action:** Create GitHub issue for test coverage improvement

---

### 12. Missing GitHub Utility Tests
**File:** `packages/github/src/utils.test.ts:3`
**Code:**
```typescript
/**
 * TODO: Add comprehensive unit tests for GitHub integration
 */
```

**Impact:** Low test coverage for GitHub package
**Priority:** Medium
**Action:** Create GitHub issue for test coverage improvement

---

## Recommendations

### Immediate Actions (Create GitHub Issues)

1. **Template Selection Modal** (src/App.svelte:806)
   - Replace browser prompt() with proper modal dialog
   - Improves UX significantly

2. **Authentication Implementation** (AuthDialog.svelte:20, 47)
   - Either implement Supabase email auth and Google OAuth
   - OR remove stub code if auth not planned for v1

3. **Test Coverage** (AudioManager.test.ts:3, utils.test.ts:3)
   - Add comprehensive tests for audio and GitHub packages
   - Improves code quality and reliability

### Keep as Inline Documentation (8 items)

The following TODOs document future enhancements and should remain in code:
- Choice condition evaluation
- Storage service extensibility (2 files)
- Achievement notifications
- Visual condition parser
- Template loading
- Accessibility script note

### Non-Issues (1 item)

- AI Writing Store example data (aiWritingStore.ts:119) - Contains "TODO" as example text, not a real TODO

---

## Statistics

**Before Phase 2C:** 13 TODO/FIXME comments found
**Critical Issues:** 3 (template UI, auth implementation x2)
**Test Coverage Issues:** 2 (audio, github packages)
**Enhancement Notes:** 8 (keep as inline docs)
**Non-Issues:** 1 (example data)

**After Phase 2C (Target):**
- Create 5 GitHub issues for critical/test items
- Keep 8 enhancement TODOs as inline documentation
- Verify 1 non-issue remains unchanged

---

## GitHub Issues Created ✅

The following GitHub issues have been created for critical TODOs:

1. **Issue #135**: Replace browser prompt() with proper template selection modal
   - URL: https://github.com/writewhisker/whisker-editor-web/issues/135
   - Priority: High
   - Category: UI/UX Enhancement

2. **Issue #136**: Decide authentication implementation strategy
   - URL: https://github.com/writewhisker/whisker-editor-web/issues/136
   - Priority: High
   - Category: Architecture Decision
   - Covers both email auth and Google OAuth stubs

3. **Issue #137**: Add comprehensive unit tests for Audio package
   - URL: https://github.com/writewhisker/whisker-editor-web/issues/137
   - Priority: Medium
   - Category: Testing

4. **Issue #138**: Add comprehensive unit tests for GitHub integration package
   - URL: https://github.com/writewhisker/whisker-editor-web/issues/138
   - Priority: Medium
   - Category: Testing

## Phase 2C Complete ✅

All critical TODOs have been converted to tracked GitHub issues. Enhancement TODOs remain as inline documentation for future reference.
