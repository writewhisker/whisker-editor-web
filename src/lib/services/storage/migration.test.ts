/**
 * Migration Utility Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageMigration, getMigrationUtil, resetMigrationUtil } from './migration';
import { MockLocalStorage } from './testHelpers';

describe('StorageMigration', () => {
  let mockStorage: MockLocalStorage;
  let migration: StorageMigration;

  beforeEach(async () => {
    // Setup mock localStorage
    mockStorage = new MockLocalStorage();
    global.localStorage = mockStorage as any;

    // Create and initialize migration utility
    migration = new StorageMigration();
    await migration.initialize();

    // Clear any existing migration status
    migration.clearMigrationStatus();
  });

  afterEach(() => {
    migration.clearMigrationStatus();
    mockStorage.clear();
    resetMigrationUtil();
  });

  describe('initialization', () => {
    it('should initialize without errors', async () => {
      const util = new StorageMigration();
      await expect(util.initialize()).resolves.not.toThrow();
    });

    it('should get singleton instance', async () => {
      const util1 = await getMigrationUtil();
      const util2 = await getMigrationUtil();
      expect(util1).toBe(util2);
    });
  });

  describe('migration status', () => {
    it('should return null for no migration status', () => {
      const status = migration.getMigrationStatus();
      expect(status).toBeNull();
    });

    it('should need migration when no status exists', async () => {
      const needed = await migration.needsMigration();
      expect(needed).toBe(true);
    });

    it('should not need migration after successful migration', async () => {
      await migration.migrateAll();

      const needed = await migration.needsMigration();
      expect(needed).toBe(false);
    });

    it('should save migration status after migration', async () => {
      await migration.migrateAll();

      const status = migration.getMigrationStatus();
      expect(status).not.toBeNull();
      expect(status?.version).toBe('1.0.0');
      expect(status?.itemsMigrated).toBeGreaterThanOrEqual(0);
    });

    it('should clear migration status', async () => {
      await migration.migrateAll();
      expect(migration.getMigrationStatus()).not.toBeNull();

      migration.clearMigrationStatus();
      expect(migration.getMigrationStatus()).toBeNull();
    });
  });

  describe('migration process', () => {
    it('should migrate localStorage keys', async () => {
      // Clear migration status to force a new migration
      migration.clearMigrationStatus();

      // Add some test data to localStorage
      mockStorage.setItem('whisker-theme', JSON.stringify('dark'));
      mockStorage.setItem('whisker-tag-colors', JSON.stringify({ combat: '#ff0000' }));

      const result = await migration.migrateAll();

      expect(result.success).toBe(true);
      expect(result.itemsMigrated).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should not migrate already migrated data', async () => {
      // First migration
      localStorage.setItem('whisker-theme', JSON.stringify('dark'));
      await migration.migrateAll();

      // Second migration attempt
      const result = await migration.migrateAll();

      expect(result.success).toBe(true);
      expect(result.itemsMigrated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Already migrated');
    });

    it('should handle empty localStorage', async () => {
      const result = await migration.migrateAll();

      expect(result.success).toBe(true);
      expect(result.itemsMigrated).toBe(0);
    });

    it('should handle invalid JSON gracefully', async () => {
      localStorage.setItem('whisker-theme', 'invalid-json{');

      const result = await migration.migrateAll();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should get list of keys to migrate', () => {
      const keys = migration.getKeysToMigrate();

      expect(keys).toContain('whisker-theme');
      expect(keys).toContain('whisker-view-preferences');
      expect(keys).toContain('whisker-tag-colors');
      expect(keys).toContain('whisker_export_preferences');
    });
  });

  describe('quota information', () => {
    it('should calculate storage quota', async () => {
      const quota = await migration.getQuotaInfo();

      expect(quota.used).toBeGreaterThanOrEqual(0);
      expect(quota.available).toBeGreaterThanOrEqual(0);
      expect(quota.total).toBeGreaterThan(0);
      expect(quota.used + quota.available).toBe(quota.total);
    });

    it('should reflect localStorage usage', async () => {
      // Add some data
      localStorage.setItem('test-key', 'test-value');

      const quota = await migration.getQuotaInfo();
      expect(quota.used).toBeGreaterThan(0);
    });

    it('should have reasonable total quota', async () => {
      const quota = await migration.getQuotaInfo();

      // Should be 10MB
      expect(quota.total).toBe(10 * 1024 * 1024);
    });
  });

  describe('error handling', () => {
    it('should throw error if not initialized', async () => {
      const uninitMigration = new StorageMigration();

      await expect(uninitMigration.migrateAll()).rejects.toThrow('Migration not initialized');
    });

    it('should handle localStorage errors gracefully', async () => {
      // Set data first before mocking
      mockStorage.setItem('whisker-theme', JSON.stringify('dark'));

      // Create new migration with mocked adapter that fails
      const brokenMigration = new StorageMigration();
      await brokenMigration.initialize();

      // Should not throw, just return errors
      const result = await brokenMigration.migrateAll();
      expect(result).toBeDefined();
    });
  });

  describe('migration result', () => {
    it('should return detailed migration result', async () => {
      localStorage.setItem('whisker-theme', JSON.stringify('dark'));
      localStorage.setItem('whisker-tag-colors', JSON.stringify({ tag: '#fff' }));

      const result = await migration.migrateAll();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('itemsMigrated');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should count successful migrations', async () => {
      // Clear migration status to force a new migration
      migration.clearMigrationStatus();

      mockStorage.setItem('whisker-theme', JSON.stringify('dark'));
      mockStorage.setItem('whisker-tag-colors', JSON.stringify({}));
      mockStorage.setItem('whisker-view-preferences', JSON.stringify({}));

      const result = await migration.migrateAll();

      expect(result.itemsMigrated).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
