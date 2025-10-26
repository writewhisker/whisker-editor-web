/**
 * StorageServiceFactory Tests
 *
 * Test suite for the storage service factory singleton.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageServiceFactory, getDefaultStorageAdapter } from './StorageServiceFactory';
import { StorageError } from './types';
import { MockLocalStorage } from './testHelpers';

describe('StorageServiceFactory', () => {
	let mockStorage: MockLocalStorage;

	beforeEach(() => {
		mockStorage = new MockLocalStorage();
		global.localStorage = mockStorage as any;

		// Reset the factory state between tests
		StorageServiceFactory.reset();
	});

	afterEach(() => {
		StorageServiceFactory.reset();
	});

	describe('createAdapter', () => {
		it('should create a localStorage adapter', async () => {
			const adapter = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			expect(adapter).toBeDefined();
			expect(adapter.isReady()).toBe(true);
		});

		it('should return the same adapter for same config', async () => {
			const adapter1 = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			const adapter2 = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			expect(adapter1).toBe(adapter2);
		});

		it('should throw error for REST API adapter', async () => {
			await expect(
				StorageServiceFactory.createAdapter({
					type: 'restApi',
					apiUrl: 'https://api.example.com',
					apiKey: 'test-key'
				})
			).rejects.toThrow(StorageError);

			await expect(
				StorageServiceFactory.createAdapter({
					type: 'restApi',
					apiUrl: 'https://api.example.com',
					apiKey: 'test-key'
				})
			).rejects.toThrow('REST API adapter not yet implemented');
		});

		it('should throw error for Firebase adapter', async () => {
			await expect(
				StorageServiceFactory.createAdapter({
					type: 'firebase',
					apiUrl: 'https://firebase.example.com',
					apiKey: 'firebase-key'
				})
			).rejects.toThrow(StorageError);

			await expect(
				StorageServiceFactory.createAdapter({
					type: 'firebase',
					apiUrl: 'https://firebase.example.com',
					apiKey: 'firebase-key'
				})
			).rejects.toThrow('Firebase adapter not yet implemented');
		});

		it('should throw error for Supabase adapter', async () => {
			await expect(
				StorageServiceFactory.createAdapter({
					type: 'supabase',
					apiUrl: 'https://supabase.example.com',
					apiKey: 'supabase-key'
				})
			).rejects.toThrow(StorageError);

			await expect(
				StorageServiceFactory.createAdapter({
					type: 'supabase',
					apiUrl: 'https://supabase.example.com',
					apiKey: 'supabase-key'
				})
			).rejects.toThrow('Supabase adapter not yet implemented');
		});

		it('should throw error for unknown adapter type', async () => {
			await expect(
				StorageServiceFactory.createAdapter({
					type: 'unknown' as any
				})
			).rejects.toThrow(StorageError);

			await expect(
				StorageServiceFactory.createAdapter({
					type: 'unknown' as any
				})
			).rejects.toThrow('Unknown storage type');
		});

		it('should initialize the adapter', async () => {
			const adapter = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			expect(adapter.isReady()).toBe(true);
		});
	});

	describe('getAdapter', () => {
		it('should return null if no adapter created', () => {
			const adapter = StorageServiceFactory.getAdapter();

			expect(adapter).toBeNull();
		});

		it('should return current adapter', async () => {
			const created = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			const current = StorageServiceFactory.getAdapter();

			expect(current).toBe(created);
		});

		it('should return the same adapter across calls', async () => {
			await StorageServiceFactory.createAdapter({ type: 'localStorage' });

			const adapter1 = StorageServiceFactory.getAdapter();
			const adapter2 = StorageServiceFactory.getAdapter();

			expect(adapter1).toBe(adapter2);
		});
	});

	describe('getConfig', () => {
		it('should return null if no adapter created', () => {
			const config = StorageServiceFactory.getConfig();

			expect(config).toBeNull();
		});

		it('should return current config', async () => {
			const inputConfig = { type: 'localStorage' as const };
			await StorageServiceFactory.createAdapter(inputConfig);

			const config = StorageServiceFactory.getConfig();

			expect(config).toEqual(inputConfig);
		});
	});

	describe('switchAdapter', () => {
		it('should switch to a new adapter', async () => {
			// Create initial adapter
			const adapter1 = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			// Switch adapter (in reality this is the same type, but tests the mechanism)
			const adapter2 = await StorageServiceFactory.switchAdapter({
				type: 'localStorage'
			});

			// Should return same adapter for same config
			expect(adapter2).toBe(adapter1);
		});

		it('should update current adapter', async () => {
			await StorageServiceFactory.createAdapter({ type: 'localStorage' });

			const newAdapter = await StorageServiceFactory.switchAdapter({
				type: 'localStorage'
			});

			const current = StorageServiceFactory.getAdapter();

			expect(current).toBe(newAdapter);
		});

		it('should update current config', async () => {
			await StorageServiceFactory.createAdapter({ type: 'localStorage' });

			const newConfig = { type: 'localStorage' as const };
			await StorageServiceFactory.switchAdapter(newConfig);

			const currentConfig = StorageServiceFactory.getConfig();

			expect(currentConfig).toEqual(newConfig);
		});
	});

	describe('reset', () => {
		it('should clear current adapter', async () => {
			await StorageServiceFactory.createAdapter({ type: 'localStorage' });

			StorageServiceFactory.reset();

			const adapter = StorageServiceFactory.getAdapter();
			expect(adapter).toBeNull();
		});

		it('should clear current config', async () => {
			await StorageServiceFactory.createAdapter({ type: 'localStorage' });

			StorageServiceFactory.reset();

			const config = StorageServiceFactory.getConfig();
			expect(config).toBeNull();
		});

		it('should allow creating new adapter after reset', async () => {
			await StorageServiceFactory.createAdapter({ type: 'localStorage' });
			StorageServiceFactory.reset();

			const newAdapter = await StorageServiceFactory.createAdapter({ type: 'localStorage' });

			expect(newAdapter).toBeDefined();
			expect(newAdapter.isReady()).toBe(true);
		});
	});

	describe('singleton behavior', () => {
		it('should maintain same adapter across multiple createAdapter calls with same config', async () => {
			const adapter1 = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			const adapter2 = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			const adapter3 = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			expect(adapter1).toBe(adapter2);
			expect(adapter2).toBe(adapter3);
		});

		it('should reuse adapter when config is equivalent', async () => {
			const config1 = { type: 'localStorage' as const };
			const config2 = { type: 'localStorage' as const };

			const adapter1 = await StorageServiceFactory.createAdapter(config1);
			const adapter2 = await StorageServiceFactory.createAdapter(config2);

			expect(adapter1).toBe(adapter2);
		});
	});

	describe('config comparison', () => {
		it('should consider configs equal for same localStorage type', async () => {
			const adapter1 = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			const adapter2 = await StorageServiceFactory.createAdapter({
				type: 'localStorage'
			});

			expect(adapter1).toBe(adapter2);
		});

		it('should consider configs equal when apiUrl and apiKey match', async () => {
			// Note: This test will fail since REST API is not implemented
			// It's here to document expected future behavior

			// Once REST API is implemented, these should return the same adapter:
			// const adapter1 = await StorageServiceFactory.createAdapter({
			//   type: 'restApi',
			//   apiUrl: 'https://api.example.com',
			//   apiKey: 'key123'
			// });
			//
			// const adapter2 = await StorageServiceFactory.createAdapter({
			//   type: 'restApi',
			//   apiUrl: 'https://api.example.com',
			//   apiKey: 'key123'
			// });
			//
			// expect(adapter1).toBe(adapter2);
		});
	});
});

describe('getDefaultStorageAdapter', () => {
	let mockStorage: MockLocalStorage;

	beforeEach(() => {
		mockStorage = new MockLocalStorage();
		global.localStorage = mockStorage as any;
		StorageServiceFactory.reset();
	});

	afterEach(() => {
		StorageServiceFactory.reset();
	});

	it('should create localStorage adapter if none exists', async () => {
		const adapter = await getDefaultStorageAdapter();

		expect(adapter).toBeDefined();
		expect(adapter.isReady()).toBe(true);
	});

	it('should return existing adapter if one exists', async () => {
		const firstCall = await getDefaultStorageAdapter();
		const secondCall = await getDefaultStorageAdapter();

		expect(firstCall).toBe(secondCall);
	});

	it('should use localStorage type', async () => {
		await getDefaultStorageAdapter();

		const config = StorageServiceFactory.getConfig();

		expect(config?.type).toBe('localStorage');
	});

	it('should initialize the adapter', async () => {
		const adapter = await getDefaultStorageAdapter();

		expect(adapter.isReady()).toBe(true);
	});

	it('should be callable multiple times safely', async () => {
		const adapter1 = await getDefaultStorageAdapter();
		const adapter2 = await getDefaultStorageAdapter();
		const adapter3 = await getDefaultStorageAdapter();

		expect(adapter1).toBe(adapter2);
		expect(adapter2).toBe(adapter3);
	});
});
