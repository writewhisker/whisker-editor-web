import type { StorageAdapter, StorageOptions } from './types';

export class MemoryAdapter<T = any> implements StorageAdapter<T> {
  private store: Map<string, T>;
  private prefix: string;

  constructor(options: StorageOptions = {}) {
    this.store = new Map();
    this.prefix = options.prefix || '';
  }

  private getKey(key: string): string {
    return this.prefix + key;
  }

  public async get(key: string): Promise<T | null> {
    return this.store.get(this.getKey(key)) ?? null;
  }

  public async set(key: string, value: T): Promise<void> {
    this.store.set(this.getKey(key), value);
  }

  public async delete(key: string): Promise<void> {
    this.store.delete(this.getKey(key));
  }

  public async clear(): Promise<void> {
    const keys = await this.keys();
    keys.forEach(key => this.store.delete(this.getKey(key)));
  }

  public async keys(): Promise<string[]> {
    const allKeys = Array.from(this.store.keys());
    return allKeys
      .filter(k => k.startsWith(this.prefix))
      .map(k => k.slice(this.prefix.length));
  }

  public async has(key: string): Promise<boolean> {
    return this.store.has(this.getKey(key));
  }

  public getSize(): number {
    return this.store.size;
  }
}
