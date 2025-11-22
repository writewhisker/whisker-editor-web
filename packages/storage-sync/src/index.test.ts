import { describe, it, expect } from 'vitest';
import * as StorageSyncModule from './index';

describe('@writewhisker/storage-sync', () => {
  describe('module exports', () => {
    it('should export SyncEngine', () => {
      expect(StorageSyncModule.SyncEngine).toBeDefined();
      expect(typeof StorageSyncModule.SyncEngine).toBe('function');
    });

    it('should export all expected classes', () => {
      const exports = Object.keys(StorageSyncModule);
      expect(exports).toContain('SyncEngine');
    });
  });

  describe('SyncEngine instantiation', () => {
    it('should create SyncEngine instance', () => {
      const { SyncEngine } = StorageSyncModule;
      const engine = new SyncEngine();
      expect(engine).toBeInstanceOf(SyncEngine);
    });
  });
});
