import type { StorageAdapter, LocalStorageOptions } from './types';

export class LocalStorageAdapter<T = any> implements StorageAdapter<T> {
  private prefix: string;
  private serialize: (value: any) => string;
  private deserialize: (value: string) => any;

  constructor(options: LocalStorageOptions = {}) {
    this.prefix = options.prefix || '';
    this.serialize = options.serialize || JSON.stringify;
    this.deserialize = options.deserialize || JSON.parse;
  }

  private getKey(key: string): string {
    return this.prefix + key;
  }

  public async get(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? this.deserialize(item) : null;
    } catch (error) {
      console.error('LocalStorageAdapter: Failed to get item', error);
      return null;
    }
  }

  public async set(key: string, value: T): Promise<void> {
    try {
      const serialized = this.serialize(value);
      localStorage.setItem(this.getKey(key), serialized);
    } catch (error) {
      console.error('LocalStorageAdapter: Failed to set item', error);
      throw error;
    }
  }

  public async delete(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
  }

  public async clear(): Promise<void> {
    const keys = await this.keys();
    keys.forEach(key => localStorage.removeItem(this.getKey(key)));
  }

  public async keys(): Promise<string[]> {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        allKeys.push(key.slice(this.prefix.length));
      }
    }
    return allKeys;
  }

  public async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.getKey(key)) !== null;
  }
}
