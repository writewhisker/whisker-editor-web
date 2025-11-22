/**
 * Storage Service Factory
 * Creates storage adapters using @writewhisker/storage
 */

import { createIndexedDBStorage, type StorageService } from '@writewhisker/storage';

export async function getDefaultStorageAdapter(): Promise<StorageService> {
  return createIndexedDBStorage();
}
