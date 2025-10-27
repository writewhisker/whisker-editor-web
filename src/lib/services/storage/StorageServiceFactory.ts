/**
 * Storage Service Factory
 *
 * Factory for creating and managing storage adapter instances.
 * Implements singleton pattern to ensure single adapter instance.
 */

import type { IStorageAdapter, StorageConfig } from './types';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { StorageError } from './types';

/**
 * Storage Service Factory (Singleton)
 */
class StorageServiceFactoryImpl {
	private static instance: StorageServiceFactoryImpl;
	private currentAdapter: IStorageAdapter | null = null;
	private currentConfig: StorageConfig | null = null;

	/**
	 * Private constructor for singleton
	 */
	private constructor() {}

	/**
	 * Get singleton instance
	 */
	static getInstance(): StorageServiceFactoryImpl {
		if (!StorageServiceFactoryImpl.instance) {
			StorageServiceFactoryImpl.instance = new StorageServiceFactoryImpl();
		}
		return StorageServiceFactoryImpl.instance;
	}

	/**
	 * Create or get storage adapter
	 */
	async createAdapter(config: StorageConfig): Promise<IStorageAdapter> {
		// If same config, return existing adapter
		if (this.currentAdapter && this.isSameConfig(config, this.currentConfig)) {
			return this.currentAdapter;
		}

		// Create new adapter based on type
		let adapter: IStorageAdapter;

		switch (config.type) {
			case 'localStorage':
				adapter = new LocalStorageAdapter();
				break;

			case 'restApi':
				throw new StorageError(
					'REST API adapter not yet implemented',
					'NOT_IMPLEMENTED'
				);

			case 'firebase':
				throw new StorageError(
					'Firebase adapter not yet implemented',
					'NOT_IMPLEMENTED'
				);

			case 'supabase':
				throw new StorageError(
					'Supabase adapter not yet implemented',
					'NOT_IMPLEMENTED'
				);

			default:
				throw new StorageError(
					`Unknown storage type: ${(config as any).type}`,
					'INVALID_CONFIG'
				);
		}

		// Initialize adapter
		await adapter.initialize();

		// Store adapter and config
		this.currentAdapter = adapter;
		this.currentConfig = config;

		return adapter;
	}

	/**
	 * Get current adapter
	 */
	getAdapter(): IStorageAdapter | null {
		return this.currentAdapter;
	}

	/**
	 * Get current config
	 */
	getConfig(): StorageConfig | null {
		return this.currentConfig;
	}

	/**
	 * Switch to a different adapter
	 */
	async switchAdapter(config: StorageConfig): Promise<IStorageAdapter> {
		// Create new adapter
		const newAdapter = await this.createAdapter(config);

		// TODO: In the future, we might want to:
		// 1. Migrate data from old adapter to new adapter
		// 2. Sync pending changes
		// 3. Emit events for adapter change

		return newAdapter;
	}

	/**
	 * Reset factory (mainly for testing)
	 */
	reset(): void {
		this.currentAdapter = null;
		this.currentConfig = null;
	}

	/**
	 * Check if two configs are the same
	 */
	private isSameConfig(config1: StorageConfig, config2: StorageConfig | null): boolean {
		if (!config2) return false;

		if (config1.type !== config2.type) return false;

		// For localStorage, no additional config needed
		if (config1.type === 'localStorage') return true;

		// For other adapters, compare URLs and keys
		return (
			config1.apiUrl === config2.apiUrl &&
			config1.apiKey === config2.apiKey
		);
	}
}

/**
 * Export singleton instance methods
 */
export const StorageServiceFactory = {
	/**
	 * Create or get storage adapter
	 */
	async createAdapter(config: StorageConfig): Promise<IStorageAdapter> {
		return StorageServiceFactoryImpl.getInstance().createAdapter(config);
	},

	/**
	 * Get current adapter
	 */
	getAdapter(): IStorageAdapter | null {
		return StorageServiceFactoryImpl.getInstance().getAdapter();
	},

	/**
	 * Get current config
	 */
	getConfig(): StorageConfig | null {
		return StorageServiceFactoryImpl.getInstance().getConfig();
	},

	/**
	 * Switch to a different adapter
	 */
	async switchAdapter(config: StorageConfig): Promise<IStorageAdapter> {
		return StorageServiceFactoryImpl.getInstance().switchAdapter(config);
	},

	/**
	 * Reset factory (for testing)
	 */
	reset(): void {
		StorageServiceFactoryImpl.getInstance().reset();
	}
};

/**
 * Convenience function to get or create default localStorage adapter
 */
export async function getDefaultStorageAdapter(): Promise<IStorageAdapter> {
	let adapter = StorageServiceFactory.getAdapter();

	if (!adapter) {
		adapter = await StorageServiceFactory.createAdapter({
			type: 'localStorage'
		});
	}

	return adapter;
}
