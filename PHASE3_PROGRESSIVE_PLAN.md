# Phase 3: Progressive Migration Plan - Fast Track

**Goal**: Complete migration of remaining components to `@whisker/editor-base` as quickly as possible

**Current Status**: 41 components migrated, ~116 remaining (75 net new after deduplication)

---

## Strategy: Parallel Batch Migration

Instead of feature-by-feature, migrate in dependency-aware batches to maximize speed.

---

## Phase 3a: Cleanup & Deduplication (30 minutes)

**Goal**: Remove duplicates, identify true remaining components

### Tasks:
1. Remove duplicate components already in editor-base
   - Delete: AboutDialog, Breadcrumb, CommandPalette, ConfirmDialog, ErrorBoundary, FileDialog, FindReplaceDialog, GraphView, LoadingSpinner, MenuBar, NotificationToast, PassageLinkAutocomplete, PassageList, PassagePreview, PreviewPanel, PropertiesPanel, ResizeHandle, SearchBar, SettingsDialog, StatusBar, StoryMetadataEditor, StorySettingsPanel, TagInput, Toolbar
   - Keep test files for reference

2. Identify components to skip (web-app specific)
   - ErrorBoundaryTest.test.svelte (test helper)

**Deliverable**: Clean component list (~20-25 components remaining)

---

## Phase 3b: Advanced Panels - Batch 1 (1 hour)

**Goal**: Migrate editor enhancement panels

### Components (8):
- CharacterManager.svelte
- VariableManager.svelte
- TagManager.svelte
- SnippetsPanel.svelte
- PassageTemplateDialog.svelte
- AutoSaveRecovery.svelte
- WordGoalsPanel.svelte
- StoryStatisticsPanel.svelte / StoryStatsWidget.svelte

### Approach:
1. Copy all 8 components in one batch
2. Identify shared dependencies
3. Copy required stores/utils together
4. Fix imports in single pass
5. Build and fix errors

**Expected Dependencies**:
- Stores: snippetStore, characterStore, variableStore, statsStore
- Utils: Various analytics helpers

---

## Phase 3c: Advanced Panels - Batch 2 (1 hour)

**Goal**: Migrate analysis and workflow panels

### Components (9):
- PacingAnalyzerPanel.svelte
- VariableDependencyPanel.svelte
- VersionDiffPanel.svelte
- PlaytestPanel.svelte
- AccessibilityPanel.svelte
- MobileExportPanel.svelte
- SaveSystemPanel.svelte
- PluginManagerPanel.svelte
- CollaborationPanel.svelte (if not already migrated)

### Approach:
Same parallel batch strategy - copy all, resolve deps together

**Expected Dependencies**:
- Stores: playtestStore, versionStore, pluginStore
- Utils: diffing, accessibility checking

---

## Phase 3d: Feature Subdirectories - Core (2 hours)

**Goal**: Migrate essential feature subdirectories

### Priority Subdirectories (6):
1. **editor/** - Core editor features
2. **help/** - Help system
3. **settings/** - Settings UI
4. **onboarding/** - User onboarding
5. **metrics/** - Analytics/metrics
6. **comparison/** - Version comparison

### Approach:
1. Copy entire subdirectories
2. Batch fix imports for each directory
3. Build incrementally

---

## Phase 3e: Feature Subdirectories - Advanced (2 hours)

**Goal**: Migrate advanced feature subdirectories

### Subdirectories (8):
1. **ai/** - AI writing features
2. **analytics/** - Advanced analytics (if different from metrics)
3. **animation/** - Animation system
4. **audio/** - Audio features
5. **interactive/** - Interactive elements
6. **kids/** - Kids mode features
7. **publishing/** - Publishing features
8. **auth/** - Authentication UI

### Approach:
Copy in groups of 2-3 related directories

---

## Phase 3f: Remaining Advanced Features (1 hour)

### Components:
- AchievementPanel.svelte
- AdaptiveDifficultyPanel.svelte
- AIWritingPanel.svelte (if not in ai/ subdirectory)

### Subdirectories:
- Any remaining from the 21 identified

---

## Phase 3g: Integration & Cleanup (1 hour)

**Goal**: Ensure everything builds and is properly exported

### Tasks:
1. Update all component exports in index.ts
2. Update store exports in stores/index.ts
3. Verify no circular dependencies
4. Run full build
5. Fix any remaining import issues
6. Update package.json if new dependencies needed
7. Clean up any test-only files from src/lib

---

## Phase 3h: Validation & Documentation (30 minutes)

### Tasks:
1. Verify all builds succeed
2. Check bundle sizes
3. Update package README
4. Document new exports
5. Create migration notes

---

## Total Estimated Time: 8-9 hours

### Optimizations for Speed:

1. **Parallel Processing**: Copy entire batches before fixing imports
2. **Defer Testing**: Don't write new tests, just ensure existing tests move
3. **Bulk Operations**: Use sed/grep for batch import fixes
4. **Skip Refinement**: Accept warnings, only fix errors
5. **Incremental Builds**: Build after each batch to catch issues early

---

## Execution Order (Fastest Path):

```bash
# Phase 3a: Cleanup (30m)
- Remove duplicates from src/lib/components
- Identify true count

# Phase 3b+3c: All Panels Together (2h)
- Copy all 17 remaining panel components at once
- Resolve dependencies in batch
- Single build/fix cycle

# Phase 3d+3e: All Subdirectories (3h)
- Copy all 21 subdirectories at once
- Batch fix imports by directory pattern
- Build and resolve

# Phase 3f: Sweep Remaining (30m)
- Move anything missed
- Final dependency resolution

# Phase 3g: Integration (1h)
- Export everything
- Full build
- Fix errors

# Phase 3h: Validation (30m)
- Final checks
- Documentation
```

**Total: 7.5 hours with aggressive parallel approach**

---

## Success Criteria:

✅ All components from src/lib/components/ migrated or documented as web-app specific
✅ All feature subdirectories migrated
✅ @whisker/editor-base builds successfully
✅ No import errors or missing dependencies
✅ All exports properly declared
✅ Bundle size reasonable (<2MB components chunk)

---

## Risk Mitigation:

1. **Commit after each batch** - Easy rollback if issues
2. **Keep src/lib intact** - Don't delete until confirmed working
3. **Track dependencies** - Document what's needed for each batch
4. **Build frequently** - Catch errors early

---

## Next Steps:

1. Approve this plan or request modifications
2. Execute Phase 3a (cleanup/deduplication)
3. Begin aggressive batch migration
4. Complete in single session if possible
