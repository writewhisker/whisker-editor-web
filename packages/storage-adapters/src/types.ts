export interface StorageAdapter<T = any> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
}

export interface StorageOptions {
  prefix?: string;
  namespace?: string;
}

export interface IndexedDBOptions extends StorageOptions {
  dbName: string;
  storeName: string;
  version?: number;
}

export interface LocalStorageOptions extends StorageOptions {
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}
