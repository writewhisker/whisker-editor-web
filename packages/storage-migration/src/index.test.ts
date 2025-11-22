import { describe, it, expect } from 'vitest';
import * as StorageMigrationModule from './index';

describe('@writewhisker/storage-migration', () => {
  describe('module exports', () => {
    it('should export MigrationManager', () => {
      expect(StorageMigrationModule.MigrationManager).toBeDefined();
      expect(typeof StorageMigrationModule.MigrationManager).toBe('function');
    });

    it('should export all expected classes', () => {
      const exports = Object.keys(StorageMigrationModule);
      expect(exports).toContain('MigrationManager');
    });
  });

  describe('MigrationManager instantiation', () => {
    it('should create MigrationManager instance', () => {
      const { MigrationManager } = StorageMigrationModule;
      const manager = new MigrationManager();
      expect(manager).toBeInstanceOf(MigrationManager);
    });
  });
});
