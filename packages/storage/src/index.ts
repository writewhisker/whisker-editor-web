/**
 * @writewhisker/storage
 * Framework-agnostic storage layer with event-driven architecture
 */

// Export main service
export { StorageService } from './StorageService.js';
export type { StorageServiceEvents } from './StorageService.js';

// Export interface
export { IStorageBackend } from './interfaces/IStorageBackend.js';

// Export backends
export { IndexedDBBackend } from './backends/IndexedDBBackend.js';
export { LocalStorageBackend } from './backends/LocalStorageBackend.js';
export { MemoryBackend } from './backends/MemoryBackend.js';
