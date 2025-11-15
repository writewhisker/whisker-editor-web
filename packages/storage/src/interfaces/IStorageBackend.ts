/**
 * Storage backend interface
 * Defines the contract for all storage implementations
 */

export interface IStorageBackend {
  /**
   * Save data to storage
   * @param key Unique identifier for the data
   * @param data Data to store (will be serialized)
   */
  save(key: string, data: any): Promise<void>;

  /**
   * Load data from storage
   * @param key Unique identifier for the data
   * @returns The stored data, or null if not found
   */
  load(key: string): Promise<any | null>;

  /**
   * Delete data from storage
   * @param key Unique identifier for the data
   */
  delete(key: string): Promise<void>;

  /**
   * List all keys in storage
   * @returns Array of all keys
   */
  list(): Promise<string[]>;

  /**
   * Check if a key exists in storage
   * @param key Unique identifier to check
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get the size of stored data (in bytes, if applicable)
   * @param key Unique identifier for the data
   */
  size?(key: string): Promise<number>;

  /**
   * Save multiple entries at once (batch operation)
   * @param entries Record of key-value pairs to save
   */
  saveMany?(entries: Record<string, any>): Promise<void>;

  /**
   * Load multiple entries at once (batch operation)
   * @param keys Array of keys to load
   * @returns Record of key-value pairs
   */
  loadMany?(keys: string[]): Promise<Record<string, any>>;

  /**
   * Clear all data from storage
   */
  clear?(): Promise<void>;
}
