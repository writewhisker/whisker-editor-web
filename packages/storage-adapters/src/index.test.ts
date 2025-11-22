import { describe, it, expect } from 'vitest';
import * as StorageAdaptersModule from './index';

describe('@writewhisker/storage-adapters', () => {
  describe('module exports', () => {
    it('should export IndexedDBAdapter', () => {
      expect(StorageAdaptersModule.IndexedDBAdapter).toBeDefined();
      expect(typeof StorageAdaptersModule.IndexedDBAdapter).toBe('function');
    });

    it('should export LocalStorageAdapter', () => {
      expect(StorageAdaptersModule.LocalStorageAdapter).toBeDefined();
      expect(typeof StorageAdaptersModule.LocalStorageAdapter).toBe('function');
    });

    it('should export MemoryAdapter', () => {
      expect(StorageAdaptersModule.MemoryAdapter).toBeDefined();
      expect(typeof StorageAdaptersModule.MemoryAdapter).toBe('function');
    });

    it('should export all expected adapters', () => {
      const exports = Object.keys(StorageAdaptersModule);
      expect(exports).toContain('IndexedDBAdapter');
      expect(exports).toContain('LocalStorageAdapter');
      expect(exports).toContain('MemoryAdapter');
    });
  });

  describe('adapter instantiation', () => {
    it('should create MemoryAdapter instance', () => {
      const { MemoryAdapter } = StorageAdaptersModule;
      const adapter = new MemoryAdapter();
      expect(adapter).toBeInstanceOf(MemoryAdapter);
    });

    it('should create LocalStorageAdapter instance', () => {
      const { LocalStorageAdapter } = StorageAdaptersModule;
      const adapter = new LocalStorageAdapter();
      expect(adapter).toBeInstanceOf(LocalStorageAdapter);
    });
  });
});
