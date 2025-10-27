# Phase 4 & 5 Implementation Plan
## Store Refactoring & UI Integration

**Status**: 📋 Planning Phase
**Prerequisites**: Phases 1-3 Complete ✅
**Estimated Time**: 12-16 hours
**Complexity**: High (Breaking Changes)

---

## Overview

Phases 4 and 5 will refactor the remaining stores to use the storage adapter for preferences, making the entire application use a unified storage system. This enables future cloud sync, cross-device preferences, and better offline support.

---

## Phase 4: Refactor Store Files

### Objectives
- Replace direct localStorage calls with storage adapter
- Make preference operations async
- Maintain backward compatibility
- Add comprehensive tests

---

### 4.1 Create Preference Service Wrapper

**File**: `src/lib/services/storage/PreferenceService.ts`
**Lines**: ~200
**Time**: 2 hours

#### Purpose
Provide a high-level API for managing preferences that bridges sync and async worlds.

#### Implementation

```typescript
import { getDefaultStorageAdapter } from './StorageServiceFactory';
import type { IStorageAdapter, PreferenceScope } from './types';

/**
 * Preference Service
 *
 * Provides both sync and async access to preferences.
 * Sync methods use a cache; async methods go directly to storage.
 */
export class PreferenceService {
  private adapter: IStorageAdapter | null = null;
  private cache: Map<string, any> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    this.adapter = await getDefaultStorageAdapter();
    this.initialized = true;
  }

  /**
   * Get preference (async)
   */
  async getPreference<T>(
    key: string,
    defaultValue: T,
    scope: PreferenceScope = 'global'
  ): Promise<T> {
    if (!this.adapter) throw new Error('Preference service not initialized');

    const value = await this.adapter.loadPreference(key, scope);
    if (value === null) return defaultValue;

    // Update cache
    this.cache.set(key, value);
    return value as T;
  }

  /**
   * Set preference (async)
   */
  async setPreference<T>(
    key: string,
    value: T,
    scope: PreferenceScope = 'global'
  ): Promise<void> {
    if (!this.adapter) throw new Error('Preference service not initialized');

    await this.adapter.savePreference(key, value, scope);
    this.cache.set(key, value);
  }

  /**
   * Get preference (sync - uses cache)
   */
  getPreferenceSync<T>(key: string, defaultValue: T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    return defaultValue;
  }

  /**
   * Set preference (sync - queues async save)
   */
  setPreferenceSync<T>(key: string, value: T, scope: PreferenceScope = 'global'): void {
    this.cache.set(key, value);

    // Queue async save (fire-and-forget)
    this.setPreference(key, value, scope).catch(err => {
      console.error('Failed to save preference:', err);
    });
  }

  /**
   * Load all preferences into cache
   */
  async loadAllPreferences(scope: PreferenceScope = 'global'): Promise<void> {
    if (!this.adapter) throw new Error('Preference service not initialized');

    const prefs = await this.adapter.loadAllPreferences(scope);
    Object.entries(prefs).forEach(([key, value]) => {
      this.cache.set(key, value);
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
let preferenceService: PreferenceService | null = null;

export async function getPreferenceService(): Promise<PreferenceService> {
  if (!preferenceService) {
    preferenceService = new PreferenceService();
    await preferenceService.initialize();
  }
  return preferenceService;
}

export function getPreferenceServiceSync(): PreferenceService {
  if (!preferenceService) {
    throw new Error('Preference service not initialized. Call getPreferenceService() first.');
  }
  return preferenceService;
}
```

#### Tests Required
- ✅ Initialization tests
- ✅ Async get/set operations
- ✅ Sync get/set operations
- ✅ Cache behavior
- ✅ Error handling
- ✅ Singleton pattern

**Test File**: `src/lib/services/storage/PreferenceService.test.ts` (~150 lines)

---

### 4.2 Refactor themeStore.ts

**File**: `src/lib/stores/themeStore.ts`
**Current**: 124 lines
**Time**: 1.5 hours

#### Changes Required

**Before** (lines 54-60):
```typescript
export function setTheme(t: Theme) {
  theme.set(t);
  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_KEY, t);
  }
  applyTheme(t);
}
```

**After**:
```typescript
import { getPreferenceServiceSync } from '../services/storage/PreferenceService';

export function setTheme(t: Theme) {
  theme.set(t);

  // Save to storage adapter (async)
  try {
    const prefs = getPreferenceServiceSync();
    prefs.setPreferenceSync('theme', t);
  } catch (err) {
    console.warn('Failed to save theme preference:', err);
  }

  applyTheme(t);
}
```

**Before** (lines 7-17):
```typescript
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'auto';

  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored;
  }

  return 'auto';
}
```

**After**:
```typescript
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'auto';

  try {
    const prefs = getPreferenceServiceSync();
    const stored = prefs.getPreferenceSync<Theme>('theme', 'auto');
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  } catch (err) {
    // Fallback to localStorage for backward compatibility
    const stored = localStorage.getItem('whisker-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored as Theme;
    }
  }

  return 'auto';
}
```

#### Backward Compatibility
- ✅ Keep `whisker-theme` localStorage key as fallback
- ✅ Migrate old value on first load
- ✅ Handle initialization errors gracefully

#### Tests Required
- ✅ Theme setting and persistence
- ✅ Theme loading on init
- ✅ System preference detection
- ✅ Theme toggle functionality
- ✅ Migration from old localStorage
- ✅ Error handling when storage unavailable

**Test File**: `src/lib/stores/themeStore.adapter.test.ts` (~120 lines)

---

### 4.3 Refactor viewPreferencesStore.ts

**File**: `src/lib/stores/viewPreferencesStore.ts`
**Current**: 190 lines
**Time**: 2.5 hours

#### Changes Required

**Key Areas to Update**:
1. Replace `loadPreferences()` function (lines 74-83)
2. Replace `savePreferences()` function (lines 86-92)
3. Replace `loadGlobalViewMode()` function (lines 95-101)
4. Replace `saveGlobalViewMode()` function (lines 104-110)

**Before** (lines 74-92):
```typescript
function loadPreferences(): ProjectViewPreferences {
  try {
    checkStorageVersion();
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn('Failed to load view preferences:', e);
    return {};
  }
}

function savePreferences(prefs: ProjectViewPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save view preferences:', e);
  }
}
```

**After**:
```typescript
import { getPreferenceServiceSync } from '../services/storage/PreferenceService';

async function loadPreferences(): Promise<ProjectViewPreferences> {
  try {
    const prefs = await getPreferenceService();
    return await prefs.getPreference<ProjectViewPreferences>(
      'view-preferences',
      {}
    );
  } catch (e) {
    console.warn('Failed to load view preferences:', e);
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('whisker-view-preferences');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }
}

async function savePreferences(prefs: ProjectViewPreferences): Promise<void> {
  try {
    const prefService = await getPreferenceService();
    await prefService.setPreference('view-preferences', prefs);
  } catch (e) {
    console.warn('Failed to save view preferences:', e);
  }
}

// Sync version for backward compatibility
function savePreferencesSync(prefs: ProjectViewPreferences): void {
  try {
    const prefService = getPreferenceServiceSync();
    prefService.setPreferenceSync('view-preferences', prefs);
  } catch (e) {
    console.warn('Failed to save view preferences:', e);
    // Fallback to localStorage
    try {
      localStorage.setItem('whisker-view-preferences', JSON.stringify(prefs));
    } catch (err) {
      console.error('Fallback save failed:', err);
    }
  }
}
```

#### Migration Strategy
1. Check for old `whisker-view-preferences` in localStorage
2. If found, migrate to new storage adapter format
3. Mark as migrated to prevent re-migration
4. Keep old format for 1-2 versions for rollback

#### Tests Required
- ✅ Preference loading and saving
- ✅ Per-project preferences
- ✅ Global view mode
- ✅ Panel visibility toggles
- ✅ Panel size persistence
- ✅ Migration from old format
- ✅ Focus mode toggle
- ✅ Error handling

**Test File**: `src/lib/stores/viewPreferencesStore.adapter.test.ts` (~180 lines)

---

### 4.4 Refactor tagStore.ts

**File**: `src/lib/stores/tagStore.ts`
**Current**: 245 lines
**Time**: 2 hours

#### Changes Required

**Key Areas**:
1. Tag color persistence (lines ~100-120)
2. Tag suggestions (lines ~150-170)
3. Tag deletion (lines ~180-200)

**Before** (tag color saving):
```typescript
export function saveTagColor(tag: string, color: string): void {
  tagColors.update(colors => {
    colors[tag] = color;
    // Save to localStorage
    try {
      localStorage.setItem('whisker-tag-colors', JSON.stringify(colors));
    } catch (e) {
      console.error('Failed to save tag colors:', e);
    }
    return colors;
  });
}
```

**After**:
```typescript
import { getPreferenceServiceSync } from '../services/storage/PreferenceService';

export function saveTagColor(tag: string, color: string): void {
  tagColors.update(colors => {
    colors[tag] = color;

    // Save to storage adapter
    try {
      const prefs = getPreferenceServiceSync();
      prefs.setPreferenceSync('tag-colors', colors);
    } catch (e) {
      console.error('Failed to save tag colors:', e);
    }

    return colors;
  });
}
```

#### Per-Project Tag Settings
Enable storing tag colors per-project:

```typescript
export async function saveProjectTagColors(
  projectId: string,
  colors: Record<string, string>
): Promise<void> {
  const prefs = await getPreferenceService();
  await prefs.setPreference(`project-${projectId}-tag-colors`, colors, 'project');
}

export async function loadProjectTagColors(
  projectId: string
): Promise<Record<string, string>> {
  const prefs = await getPreferenceService();
  return await prefs.getPreference<Record<string, string>>(
    `project-${projectId}-tag-colors`,
    {},
    'project'
  );
}
```

#### Tests Required
- ✅ Tag color saving/loading
- ✅ Tag suggestions
- ✅ Tag deletion
- ✅ Per-project tag colors
- ✅ Global tag colors
- ✅ Tag sharing between projects
- ✅ Migration from old format

**Test File**: `src/lib/stores/tagStore.adapter.test.ts` (~160 lines)

---

### 4.5 Refactor exportStore.ts

**File**: `src/lib/stores/exportStore.ts`
**Current**: 354 lines
**Time**: 3 hours

#### Changes Required

**Key Areas**:
1. Export format preferences (lines ~50-80)
2. Last used export settings (lines ~100-130)
3. Export templates (lines ~200-250)

**Before**:
```typescript
function loadExportPreferences(): ExportPreferences {
  try {
    const stored = localStorage.getItem('whisker-export-prefs');
    return stored ? JSON.parse(stored) : DEFAULT_EXPORT_PREFS;
  } catch (e) {
    console.error('Failed to load export preferences:', e);
    return DEFAULT_EXPORT_PREFS;
  }
}

function saveExportPreferences(prefs: ExportPreferences): void {
  try {
    localStorage.setItem('whisker-export-prefs', JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save export preferences:', e);
  }
}
```

**After**:
```typescript
import { getPreferenceService, getPreferenceServiceSync } from '../services/storage/PreferenceService';

async function loadExportPreferences(): Promise<ExportPreferences> {
  try {
    const prefs = await getPreferenceService();
    return await prefs.getPreference<ExportPreferences>(
      'export-preferences',
      DEFAULT_EXPORT_PREFS
    );
  } catch (e) {
    console.error('Failed to load export preferences:', e);
    return DEFAULT_EXPORT_PREFS;
  }
}

async function saveExportPreferences(prefs: ExportPreferences): Promise<void> {
  try {
    const prefService = await getPreferenceService();
    await prefService.setPreference('export-preferences', prefs);
  } catch (e) {
    console.error('Failed to save export preferences:', e);
  }
}

// Sync version for immediate updates
function saveExportPreferencesSync(prefs: ExportPreferences): void {
  try {
    const prefService = getPreferenceServiceSync();
    prefService.setPreferenceSync('export-preferences', prefs);
  } catch (e) {
    console.error('Failed to save export preferences:', e);
  }
}
```

#### Export Templates
Store custom export templates in storage adapter:

```typescript
export interface ExportTemplate {
  id: string;
  name: string;
  format: ExportFormat;
  settings: ExportSettings;
  createdAt: string;
}

export async function saveExportTemplate(template: ExportTemplate): Promise<void> {
  const prefs = await getPreferenceService();
  const templates = await prefs.getPreference<ExportTemplate[]>('export-templates', []);

  const index = templates.findIndex(t => t.id === template.id);
  if (index >= 0) {
    templates[index] = template;
  } else {
    templates.push(template);
  }

  await prefs.setPreference('export-templates', templates);
}

export async function loadExportTemplates(): Promise<ExportTemplate[]> {
  const prefs = await getPreferenceService();
  return await prefs.getPreference<ExportTemplate[]>('export-templates', []);
}
```

#### Tests Required
- ✅ Preference loading/saving
- ✅ Export format selection
- ✅ Export settings persistence
- ✅ Template creation/deletion
- ✅ Template loading
- ✅ Last used settings
- ✅ Migration from old format

**Test File**: `src/lib/stores/exportStore.adapter.test.ts` (~200 lines)

---

## Phase 5: UI Integration & Migration

### Objectives
- Add UI for storage management
- Create migration utilities
- Add settings panel
- Handle edge cases

---

### 5.1 Create Migration Utility

**File**: `src/lib/services/storage/migration.ts`
**Lines**: ~250
**Time**: 2 hours

#### Purpose
Migrate existing localStorage data to new storage adapter format.

#### Implementation

```typescript
import { getDefaultStorageAdapter } from './StorageServiceFactory';
import type { IStorageAdapter } from './types';

interface MigrationStatus {
  version: string;
  migratedAt: string;
  itemsMigrated: number;
}

/**
 * Storage Migration Utility
 */
export class StorageMigration {
  private adapter: IStorageAdapter | null = null;
  private readonly MIGRATION_KEY = 'whisker-migration-status';
  private readonly CURRENT_VERSION = '1.0.0';

  async initialize(): Promise<void> {
    this.adapter = await getDefaultStorageAdapter();
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    const status = this.getMigrationStatus();
    return status === null || status.version !== this.CURRENT_VERSION;
  }

  /**
   * Get migration status
   */
  private getMigrationStatus(): MigrationStatus | null {
    try {
      const stored = localStorage.getItem(this.MIGRATION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set migration status
   */
  private setMigrationStatus(status: MigrationStatus): void {
    try {
      localStorage.setItem(this.MIGRATION_KEY, JSON.stringify(status));
    } catch (e) {
      console.error('Failed to save migration status:', e);
    }
  }

  /**
   * Migrate all preferences
   */
  async migrateAll(): Promise<void> {
    if (!this.adapter) throw new Error('Migration not initialized');

    console.log('Starting storage migration...');
    let itemsMigrated = 0;

    // Migrate theme
    itemsMigrated += await this.migrateTheme();

    // Migrate view preferences
    itemsMigrated += await this.migrateViewPreferences();

    // Migrate tag colors
    itemsMigrated += await this.migrateTagColors();

    // Migrate export preferences
    itemsMigrated += await this.migrateExportPreferences();

    // Mark migration complete
    this.setMigrationStatus({
      version: this.CURRENT_VERSION,
      migratedAt: new Date().toISOString(),
      itemsMigrated,
    });

    console.log(`Migration complete. ${itemsMigrated} items migrated.`);
  }

  /**
   * Migrate theme preference
   */
  private async migrateTheme(): Promise<number> {
    if (!this.adapter) return 0;

    try {
      const theme = localStorage.getItem('whisker-theme');
      if (theme) {
        await this.adapter.savePreference('theme', theme);
        console.log('Migrated theme:', theme);
        return 1;
      }
    } catch (e) {
      console.error('Failed to migrate theme:', e);
    }
    return 0;
  }

  /**
   * Migrate view preferences
   */
  private async migrateViewPreferences(): Promise<number> {
    if (!this.adapter) return 0;

    let count = 0;
    try {
      const prefs = localStorage.getItem('whisker-view-preferences');
      if (prefs) {
        await this.adapter.savePreference('view-preferences', JSON.parse(prefs));
        count++;
      }

      const viewMode = localStorage.getItem('whisker-global-view-mode');
      if (viewMode) {
        await this.adapter.savePreference('global-view-mode', viewMode);
        count++;
      }

      console.log(`Migrated ${count} view preference items`);
    } catch (e) {
      console.error('Failed to migrate view preferences:', e);
    }
    return count;
  }

  /**
   * Migrate tag colors
   */
  private async migrateTagColors(): Promise<number> {
    if (!this.adapter) return 0;

    try {
      const colors = localStorage.getItem('whisker-tag-colors');
      if (colors) {
        await this.adapter.savePreference('tag-colors', JSON.parse(colors));
        console.log('Migrated tag colors');
        return 1;
      }
    } catch (e) {
      console.error('Failed to migrate tag colors:', e);
    }
    return 0;
  }

  /**
   * Migrate export preferences
   */
  private async migrateExportPreferences(): Promise<number> {
    if (!this.adapter) return 0;

    try {
      const prefs = localStorage.getItem('whisker-export-prefs');
      if (prefs) {
        await this.adapter.savePreference('export-preferences', JSON.parse(prefs));
        console.log('Migrated export preferences');
        return 1;
      }
    } catch (e) {
      console.error('Failed to migrate export preferences:', e);
    }
    return 0;
  }

  /**
   * Rollback migration (restore from localStorage)
   */
  async rollback(): Promise<void> {
    console.log('Rolling back migration...');
    localStorage.removeItem(this.MIGRATION_KEY);
    console.log('Rollback complete. Old localStorage data preserved.');
  }

  /**
   * Clean up old localStorage keys after successful migration
   */
  async cleanupOldData(): Promise<void> {
    const keysToRemove = [
      'whisker-theme',
      'whisker-view-preferences',
      'whisker-global-view-mode',
      'whisker-tag-colors',
      'whisker-export-prefs',
      'whisker-preferences-version',
    ];

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Failed to remove ${key}:`, e);
      }
    });

    console.log('Old localStorage data cleaned up');
  }
}

// Singleton instance
let migration: StorageMigration | null = null;

export async function getStorageMigration(): Promise<StorageMigration> {
  if (!migration) {
    migration = new StorageMigration();
    await migration.initialize();
  }
  return migration;
}

/**
 * Auto-migrate on first load
 */
export async function autoMigrate(): Promise<void> {
  const migrator = await getStorageMigration();

  if (await migrator.needsMigration()) {
    console.log('Auto-migrating storage...');
    await migrator.migrateAll();
  }
}
```

#### Tests Required
- ✅ Migration detection
- ✅ Theme migration
- ✅ View preferences migration
- ✅ Tag colors migration
- ✅ Export preferences migration
- ✅ Migration status tracking
- ✅ Rollback functionality
- ✅ Cleanup old data

**Test File**: `src/lib/services/storage/migration.test.ts` (~250 lines)

---

### 5.2 Add Storage Settings Panel

**File**: `src/lib/components/settings/StorageSettings.svelte`
**Lines**: ~200
**Time**: 2 hours

#### Features
- Display storage quota usage
- Clear cache button
- Export all preferences
- Import preferences
- Reset to defaults
- Migration status display

#### Implementation

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { getDefaultStorageAdapter } from '$lib/services/storage/StorageServiceFactory';
  import { getStorageMigration } from '$lib/services/storage/migration';
  import type { IStorageAdapter } from '$lib/services/storage/types';

  let adapter: IStorageAdapter | null = null;
  let quotaInfo = { used: 0, total: 0, available: 0 };
  let migrationStatus: any = null;
  let loading = true;

  onMount(async () => {
    adapter = await getDefaultStorageAdapter();
    await loadQuotaInfo();
    await loadMigrationStatus();
    loading = false;
  });

  async function loadQuotaInfo() {
    if (!adapter) return;
    quotaInfo = await adapter.getQuotaInfo();
  }

  async function loadMigrationStatus() {
    const migrator = await getStorageMigration();
    migrationStatus = await migrator.needsMigration() ? 'pending' : 'complete';
  }

  async function clearCache() {
    if (!adapter || !confirm('Clear all cached data? This will not delete your projects.')) {
      return;
    }

    try {
      // Clear preferences but keep projects
      const prefs = await adapter.loadAllPreferences('global');
      for (const key of Object.keys(prefs)) {
        await adapter.deletePreference(key);
      }

      alert('Cache cleared successfully');
      await loadQuotaInfo();
    } catch (e) {
      alert('Failed to clear cache: ' + e);
    }
  }

  async function runMigration() {
    if (!confirm('Migrate old localStorage data to new storage format?')) {
      return;
    }

    try {
      const migrator = await getStorageMigration();
      await migrator.migrateAll();
      alert('Migration complete!');
      await loadMigrationStatus();
    } catch (e) {
      alert('Migration failed: ' + e);
    }
  }

  $: usagePercent = quotaInfo.total > 0
    ? (quotaInfo.used / quotaInfo.total) * 100
    : 0;
</script>

<div class="storage-settings">
  <h2>Storage Settings</h2>

  {#if loading}
    <div class="loading">Loading storage info...</div>
  {:else}
    <!-- Quota Display -->
    <section class="quota-section">
      <h3>Storage Quota</h3>
      <div class="quota-bar">
        <div class="quota-used" style="width: {usagePercent}%"></div>
      </div>
      <div class="quota-stats">
        <span>Used: {(quotaInfo.used / 1024).toFixed(2)} KB</span>
        <span>Available: {(quotaInfo.available / 1024).toFixed(2)} KB</span>
        <span>Total: {(quotaInfo.total / 1024).toFixed(2)} KB</span>
      </div>
    </section>

    <!-- Migration Status -->
    <section class="migration-section">
      <h3>Migration Status</h3>
      <div class="migration-status">
        {#if migrationStatus === 'pending'}
          <span class="status-pending">⚠️ Migration Pending</span>
          <button on:click={runMigration}>Run Migration</button>
        {:else}
          <span class="status-complete">✅ Up to Date</span>
        {/if}
      </div>
    </section>

    <!-- Actions -->
    <section class="actions-section">
      <h3>Actions</h3>
      <button on:click={clearCache} class="danger">Clear Cache</button>
      <button on:click={loadQuotaInfo}>Refresh Info</button>
    </section>
  {/if}
</div>

<style>
  .storage-settings {
    padding: 1rem;
  }

  .quota-bar {
    width: 100%;
    height: 20px;
    background: #e0e0e0;
    border-radius: 10px;
    overflow: hidden;
    margin: 1rem 0;
  }

  .quota-used {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #ff9800);
    transition: width 0.3s;
  }

  .quota-stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: #666;
  }

  .status-pending {
    color: #ff9800;
  }

  .status-complete {
    color: #4caf50;
  }

  button.danger {
    background: #f44336;
    color: white;
  }

  button.danger:hover {
    background: #d32f2f;
  }
</style>
```

---

### 5.3 Update Settings Modal

**File**: `src/lib/components/modals/SettingsModal.svelte`
**Changes**: Add storage settings tab
**Time**: 1 hour

Add a new tab for storage settings in the existing settings modal.

---

### 5.4 Add Auto-Migration on App Start

**File**: `src/routes/+layout.svelte`
**Changes**: Run migration check on app initialization
**Time**: 0.5 hours

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { autoMigrate } from '$lib/services/storage/migration';

  onMount(async () => {
    // Auto-migrate storage if needed
    try {
      await autoMigrate();
    } catch (e) {
      console.error('Auto-migration failed:', e);
    }
  });
</script>
```

---

## Testing Strategy

### Test Coverage Goals
- **Unit Tests**: 95%+ coverage of new code
- **Integration Tests**: All stores with adapter
- **Migration Tests**: All migration scenarios
- **E2E Tests**: User workflows with preferences

### Test Files to Create

1. **PreferenceService.test.ts** (~150 lines)
   - Service initialization
   - Async get/set
   - Sync get/set
   - Cache behavior
   - Error handling

2. **themeStore.adapter.test.ts** (~120 lines)
   - Theme persistence
   - Migration from old format
   - Error handling

3. **viewPreferencesStore.adapter.test.ts** (~180 lines)
   - Preference loading/saving
   - Per-project preferences
   - Migration

4. **tagStore.adapter.test.ts** (~160 lines)
   - Tag color persistence
   - Per-project colors
   - Migration

5. **exportStore.adapter.test.ts** (~200 lines)
   - Export preferences
   - Template management
   - Migration

6. **migration.test.ts** (~250 lines)
   - Migration detection
   - Data migration
   - Rollback
   - Cleanup

**Total Test Lines**: ~1,060 lines

---

## Implementation Timeline

### Week 1: Foundation
- **Day 1-2**: PreferenceService implementation + tests (4 hours)
- **Day 3**: Migration utility implementation + tests (4 hours)

### Week 2: Store Refactoring
- **Day 1**: themeStore refactor + tests (3 hours)
- **Day 2**: viewPreferencesStore refactor + tests (4 hours)
- **Day 3**: tagStore refactor + tests (3 hours)

### Week 3: Completion
- **Day 1-2**: exportStore refactor + tests (5 hours)
- **Day 3**: UI components + integration (3 hours)
- **Day 4**: E2E testing + bug fixes (3 hours)

**Total Time**: ~29 hours (3-4 weeks part-time)

---

## Rollout Strategy

### Phase 4.0: Soft Launch
1. Deploy with feature flag disabled
2. Monitor error rates
3. Enable for 10% of users
4. Collect feedback

### Phase 4.1: Gradual Rollout
1. Enable for 50% of users
2. Monitor migration success rate
3. Fix any issues
4. Full rollout

### Phase 4.2: Cleanup
1. Remove old localStorage fallbacks
2. Remove feature flags
3. Mark as stable

---

## Risk Assessment

### High Risk
- **Migration failures**: Mitigation: Robust error handling + rollback
- **Performance impact**: Mitigation: Caching layer + benchmarking
- **Data loss**: Mitigation: Keep old localStorage until confirmed

### Medium Risk
- **Breaking changes**: Mitigation: Backward compatibility layer
- **Test coverage gaps**: Mitigation: Comprehensive test plan

### Low Risk
- **User confusion**: Mitigation: Clear UI + documentation

---

## Success Criteria

### Functional
- ✅ All preferences persist via storage adapter
- ✅ Migration completes without data loss
- ✅ Backward compatibility maintained
- ✅ All tests passing (>95% coverage)

### Performance
- ✅ Preference load time <50ms
- ✅ No UI blocking during save
- ✅ Migration completes <5 seconds

### Quality
- ✅ Zero critical bugs in first week
- ✅ <1% error rate
- ✅ User feedback positive

---

## Dependencies

### Before Starting
- ✅ Phases 1-3 complete
- ✅ All existing tests passing
- ✅ Code review of Phases 1-3

### External Dependencies
- None (all internal code)

---

## Notes

- Keep old localStorage keys for 2 versions as backup
- Add telemetry for migration success/failure rates
- Consider adding preference export/import for power users
- Document all breaking changes
- Create migration guide for users

---

## Appendix

### Preference Keys Mapping

| Old Key | New Key | Scope |
|---------|---------|-------|
| `whisker-theme` | `theme` | global |
| `whisker-view-preferences` | `view-preferences` | global |
| `whisker-global-view-mode` | `global-view-mode` | global |
| `whisker-tag-colors` | `tag-colors` | global |
| `whisker-export-prefs` | `export-preferences` | global |

### Storage Adapter Methods Used

- `savePreference(key, value, scope)`
- `loadPreference(key, scope)`
- `loadAllPreferences(scope)`
- `deletePreference(key, scope)`
- `getQuotaInfo()`

---

**Document Version**: 1.0
**Last Updated**: 2025-01-25
**Author**: Claude Code
**Status**: Ready for Review
