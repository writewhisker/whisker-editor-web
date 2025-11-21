import type { StorageAdapter } from '@writewhisker/storage-adapters';

export interface Migration {
  version: number;
  name: string;
  up: (data: any) => any | Promise<any>;
  down?: (data: any) => any | Promise<any>;
}

export interface MigrationStatus {
  currentVersion: number;
  appliedMigrations: number[];
  pending: number[];
  errors: MigrationError[];
}

export interface MigrationError {
  version: number;
  message: string;
  timestamp: number;
}

export class MigrationManager {
  private storage: StorageAdapter;
  private migrations: Migration[];
  private versionKey = '__migration_version__';

  constructor(storage: StorageAdapter, migrations: Migration[] = []) {
    this.storage = storage;
    this.migrations = migrations.sort((a, b) => a.version - b.version);
  }

  public async getCurrentVersion(): Promise<number> {
    const version = await this.storage.get(this.versionKey);
    return version ?? 0;
  }

  public async getStatus(): Promise<MigrationStatus> {
    const currentVersion = await this.getCurrentVersion();
    const applied = this.migrations.filter(m => m.version <= currentVersion).map(m => m.version);
    const pending = this.migrations.filter(m => m.version > currentVersion).map(m => m.version);

    return {
      currentVersion,
      appliedMigrations: applied,
      pending,
      errors: [],
    };
  }

  public async migrate(targetVersion?: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const target = targetVersion ?? Math.max(...this.migrations.map(m => m.version), 0);

    if (target > currentVersion) {
      await this.migrateUp(currentVersion, target);
    } else if (target < currentVersion) {
      await this.migrateDown(currentVersion, target);
    }
  }

  private async migrateUp(from: number, to: number): Promise<void> {
    const migrationsToApply = this.migrations.filter(
      m => m.version > from && m.version <= to
    );

    for (const migration of migrationsToApply) {
      await this.applyMigration(migration);
      await this.storage.set(this.versionKey, migration.version);
    }
  }

  private async migrateDown(from: number, to: number): Promise<void> {
    const migrationsToRevert = this.migrations
      .filter(m => m.version > to && m.version <= from)
      .reverse();

    for (const migration of migrationsToRevert) {
      if (migration.down) {
        await this.revertMigration(migration);
        await this.storage.set(this.versionKey, migration.version - 1);
      } else {
        throw new Error(`Migration ${migration.version} has no down method`);
      }
    }
  }

  private async applyMigration(migration: Migration): Promise<void> {
    const keys = await this.storage.keys();

    for (const key of keys) {
      if (key === this.versionKey) continue;

      const data = await this.storage.get(key);
      if (data !== null) {
        const migrated = await migration.up(data);
        await this.storage.set(key, migrated);
      }
    }
  }

  private async revertMigration(migration: Migration): Promise<void> {
    if (!migration.down) {
      throw new Error(`Migration ${migration.version} has no down method`);
    }

    const keys = await this.storage.keys();

    for (const key of keys) {
      if (key === this.versionKey) continue;

      const data = await this.storage.get(key);
      if (data !== null) {
        const reverted = await migration.down(data);
        await this.storage.set(key, reverted);
      }
    }
  }

  public addMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }
}
