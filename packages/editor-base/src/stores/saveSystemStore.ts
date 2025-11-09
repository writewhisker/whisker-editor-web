/**
 * Save System Generator Store
 *
 * Allows users to configure and generate save/load systems for their stories:
 * - Save slot configuration (number of slots, auto-save)
 * - Variable persistence settings (which variables to save)
 * - Save metadata (timestamp, playtime, screenshot)
 * - Export formats (localStorage, IndexedDB, JSON file)
 * - Code generation for save/load functionality
 */

import { writable, derived } from 'svelte/store';
import type { Story, Variable } from '@whisker/core-ts';

export type SaveStorageType = 'localStorage' | 'indexedDB' | 'json' | 'custom';
export type SaveSlotType = 'manual' | 'auto' | 'quick';

export interface SaveMetadata {
  includeTimestamp: boolean;
  includePlaytime: boolean;
  includeScreenshot: boolean;
  includePassageTitle: boolean;
  includeStoryProgress: boolean;
  customFields: { key: string; label: string; type: 'string' | 'number' | 'boolean' }[];
}

export interface SaveSlotConfig {
  type: SaveSlotType;
  count: number;
  label: string;
  enabled: boolean;
}

export interface SaveSystemConfig {
  storageType: SaveStorageType;
  slots: SaveSlotConfig[];
  metadata: SaveMetadata;
  persistVariables: string[]; // Variable names to persist
  excludeVariables: string[]; // Variable names to exclude
  persistAll: boolean; // Save all variables by default
  compression: boolean; // Compress save data
  encryption: boolean; // Encrypt save data (basic)
  versionTracking: boolean; // Track story version in saves
  maxSaveSize: number; // Max size in KB (0 = unlimited)
}

export interface GeneratedSaveCode {
  saveFunction: string;
  loadFunction: string;
  deleteFunction: string;
  listFunction: string;
  types: string;
  utilities: string;
}

const DEFAULT_CONFIG: SaveSystemConfig = {
  storageType: 'localStorage',
  slots: [
    { type: 'manual', count: 3, label: 'Save Slot', enabled: true },
    { type: 'auto', count: 1, label: 'Auto Save', enabled: true },
    { type: 'quick', count: 1, label: 'Quick Save', enabled: false },
  ],
  metadata: {
    includeTimestamp: true,
    includePlaytime: true,
    includeScreenshot: false,
    includePassageTitle: true,
    includeStoryProgress: true,
    customFields: [],
  },
  persistVariables: [],
  excludeVariables: [],
  persistAll: true,
  compression: false,
  encryption: false,
  versionTracking: true,
  maxSaveSize: 0,
};

// Generate save system code
function generateSaveCode(config: SaveSystemConfig, story: Story): GeneratedSaveCode {
  const variables = config.persistAll
    ? (Array.from(story.variables.values()) as Variable[]).filter(v => !config.excludeVariables.includes(v.name))
    : (Array.from(story.variables.values()) as Variable[]).filter(v => config.persistVariables.includes(v.name));

  // Generate TypeScript types
  const types = `
export interface SaveData {
  version: string;
  timestamp: number;
  ${config.metadata.includePlaytime ? 'playtime: number;' : ''}
  ${config.metadata.includePassageTitle ? 'passageTitle: string;' : ''}
  ${config.metadata.includePassageTitle ? 'passageId: string;' : ''}
  ${config.metadata.includeStoryProgress ? 'progress: number; // 0-100' : ''}
  ${config.metadata.includeScreenshot ? 'screenshot?: string; // Base64 data URL' : ''}
  variables: {
${variables.map(v => `    ${v.name}: ${v.type};`).join('\n')}
  };
${config.metadata.customFields.map(f => `  ${f.key}: ${f.type};`).join('\n')}
}

export interface SaveSlot {
  id: string;
  type: '${config.slots.map(s => s.type).join("' | '")}';
  data: SaveData;
}
`.trim();

  // Generate save function
  const saveFunction = `
/**
 * Save game state to a slot
 * @param slotId Unique identifier for the save slot
 * @param slotType Type of save slot
 * @param currentState Current game state
 * @returns Promise that resolves to saved data
 */
export async function saveGame(
  slotId: string,
  slotType: SaveSlot['type'],
  currentState: {
    passageId: string;
    passageTitle: string;
    variables: Record<string, any>;
    ${config.metadata.includePlaytime ? 'playtime: number;' : ''}
    ${config.metadata.includeStoryProgress ? 'progress: number;' : ''}
    ${config.metadata.includeScreenshot ? 'screenshot?: string;' : ''}
  }
): Promise<SaveSlot> {
  const saveData: SaveData = {
    version: '${story.metadata.version || '1.0.0'}',
    timestamp: Date.now(),
    ${config.metadata.includePassageTitle ? 'passageTitle: currentState.passageTitle,' : ''}
    ${config.metadata.includePassageTitle ? 'passageId: currentState.passageId,' : ''}
    ${config.metadata.includePlaytime ? 'playtime: currentState.playtime,' : ''}
    ${config.metadata.includeStoryProgress ? 'progress: currentState.progress,' : ''}
    ${config.metadata.includeScreenshot ? 'screenshot: currentState.screenshot,' : ''}
    variables: {
${variables.map(v => `      ${v.name}: currentState.variables.${v.name},`).join('\n')}
    },
  };

  const slot: SaveSlot = {
    id: slotId,
    type: slotType,
    data: saveData,
  };

  ${config.compression ? '// Compress data\n  const compressed = compressData(JSON.stringify(slot));' : ''}
  ${config.encryption ? '// Encrypt data\n  const encrypted = encryptData(' + (config.compression ? 'compressed' : 'JSON.stringify(slot)') + ');' : ''}

  ${config.maxSaveSize > 0 ? `
  // Check size limit
  const dataStr = ${config.encryption ? 'encrypted' : config.compression ? 'compressed' : 'JSON.stringify(slot)'};
  const sizeKB = new Blob([dataStr]).size / 1024;
  if (sizeKB > ${config.maxSaveSize}) {
    throw new Error(\`Save data too large: \${sizeKB}KB exceeds limit of ${config.maxSaveSize}KB\`);
  }
  ` : ''}

  ${config.storageType === 'localStorage' ? `
  // Save to localStorage
  localStorage.setItem(\`save_\${slotId}\`, ${config.encryption ? 'encrypted' : config.compression ? 'compressed' : 'JSON.stringify(slot)'});
  ` : ''}

  ${config.storageType === 'indexedDB' ? `
  // Save to IndexedDB
  await saveToIndexedDB(slotId, ${config.encryption ? 'encrypted' : config.compression ? 'compressed' : 'slot'});
  ` : ''}

  ${config.storageType === 'json' ? `
  // Export as JSON file
  downloadJSON(\`save_\${slotId}.json\`, slot);
  ` : ''}

  return slot;
}
`.trim();

  // Generate load function
  const loadFunction = `
/**
 * Load game state from a slot
 * @param slotId Unique identifier for the save slot
 * @returns Promise that resolves to loaded data or null if not found
 */
export async function loadGame(slotId: string): Promise<SaveSlot | null> {
  ${config.storageType === 'localStorage' ? `
  const saved = localStorage.getItem(\`save_\${slotId}\`);
  if (!saved) return null;
  ` : ''}

  ${config.storageType === 'indexedDB' ? `
  const saved = await loadFromIndexedDB(slotId);
  if (!saved) return null;
  ` : ''}

  ${config.encryption ? '// Decrypt data\n  const decrypted = decryptData(saved);' : ''}
  ${config.compression ? '// Decompress data\n  const decompressed = decompressData(' + (config.encryption ? 'decrypted' : 'saved') + ');' : ''}

  const slot: SaveSlot = ${config.encryption || config.compression ? 'JSON.parse(' + (config.compression ? 'decompressed' : 'decrypted') + ')' : 'JSON.parse(saved)'};

  ${config.versionTracking ? `
  // Check version compatibility
  if (slot.data.version !== '${story.metadata.version || '1.0.0'}') {
    console.warn(\`Save version \${slot.data.version} may not be compatible with current version ${story.metadata.version || '1.0.0'}\`);
  }
  ` : ''}

  return slot;
}
`.trim();

  // Generate delete function
  const deleteFunction = `
/**
 * Delete a save slot
 * @param slotId Unique identifier for the save slot
 */
export async function deleteSave(slotId: string): Promise<void> {
  ${config.storageType === 'localStorage' ? `
  localStorage.removeItem(\`save_\${slotId}\`);
  ` : ''}

  ${config.storageType === 'indexedDB' ? `
  await deleteFromIndexedDB(slotId);
  ` : ''}
}
`.trim();

  // Generate list function
  const listFunction = `
/**
 * List all available save slots
 * @returns Promise that resolves to array of save slots
 */
export async function listSaves(): Promise<SaveSlot[]> {
  const saves: SaveSlot[] = [];

  ${config.storageType === 'localStorage' ? `
  // Find all saves in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('save_')) {
      const slotId = key.replace('save_', '');
      const slot = await loadGame(slotId);
      if (slot) saves.push(slot);
    }
  }
  ` : ''}

  ${config.storageType === 'indexedDB' ? `
  // Find all saves in IndexedDB
  const allSlots = await listFromIndexedDB();
  saves.push(...allSlots);
  ` : ''}

  // Sort by timestamp (newest first)
  return saves.sort((a, b) => b.data.timestamp - a.data.timestamp);
}
`.trim();

  // Generate utility functions
  const utilities = `
${config.compression ? `
// Simple compression using LZ-based algorithm
function compressData(data: string): string {
  // In production, use a library like lz-string
  // This is a placeholder
  return btoa(data);
}

function decompressData(data: string): string {
  return atob(data);
}
` : ''}

${config.encryption ? `
// Basic encryption (use proper encryption in production!)
function encryptData(data: string): string {
  // In production, use Web Crypto API
  // This is a simple XOR cipher for demonstration
  const key = '${story.metadata.title.replace(/[^a-zA-Z0-9]/g, '')}';
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function decryptData(data: string): string {
  const decoded = atob(data);
  const key = '${story.metadata.title.replace(/[^a-zA-Z0-9]/g, '')}';
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}
` : ''}

${config.storageType === 'indexedDB' ? `
// IndexedDB helpers
const DB_NAME = '${story.metadata.title.replace(/[^a-zA-Z0-9]/g, '_')}_saves';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function saveToIndexedDB(slotId: string, data: any): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.put({ id: slotId, data });
}

async function loadFromIndexedDB(slotId: string): Promise<any> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const result = await store.get(slotId);
  return result?.data || null;
}

async function deleteFromIndexedDB(slotId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.delete(slotId);
}

async function listFromIndexedDB(): Promise<SaveSlot[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const results = request.result.map(r => r.data);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}
` : ''}

${config.storageType === 'json' ? `
// JSON file download helper
function downloadJSON(filename: string, data: any): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
` : ''}
`.trim();

  return {
    saveFunction,
    loadFunction,
    deleteFunction,
    listFunction,
    types,
    utilities,
  };
}

// Create save system store
const createSaveSystemStore = () => {
  const { subscribe, set, update } = writable<SaveSystemConfig>(DEFAULT_CONFIG);

  return {
    subscribe,

    /**
     * Set storage type
     */
    setStorageType: (type: SaveStorageType) => {
      update(config => ({ ...config, storageType: type }));
    },

    /**
     * Update slot configuration
     */
    updateSlot: (type: SaveSlotType, updates: Partial<SaveSlotConfig>) => {
      update(config => ({
        ...config,
        slots: config.slots.map(slot =>
          slot.type === type ? { ...slot, ...updates } : slot
        ),
      }));
    },

    /**
     * Update metadata settings
     */
    updateMetadata: (updates: Partial<SaveMetadata>) => {
      update(config => ({
        ...config,
        metadata: { ...config.metadata, ...updates },
      }));
    },

    /**
     * Add custom metadata field
     */
    addCustomField: (key: string, label: string, type: 'string' | 'number' | 'boolean') => {
      update(config => ({
        ...config,
        metadata: {
          ...config.metadata,
          customFields: [...config.metadata.customFields, { key, label, type }],
        },
      }));
    },

    /**
     * Remove custom metadata field
     */
    removeCustomField: (key: string) => {
      update(config => ({
        ...config,
        metadata: {
          ...config.metadata,
          customFields: config.metadata.customFields.filter(f => f.key !== key),
        },
      }));
    },

    /**
     * Set variables to persist
     */
    setPersistVariables: (variables: string[]) => {
      update(config => ({ ...config, persistVariables: variables }));
    },

    /**
     * Set variables to exclude
     */
    setExcludeVariables: (variables: string[]) => {
      update(config => ({ ...config, excludeVariables: variables }));
    },

    /**
     * Toggle persist all variables
     */
    togglePersistAll: () => {
      update(config => ({ ...config, persistAll: !config.persistAll }));
    },

    /**
     * Set compression
     */
    setCompression: (enabled: boolean) => {
      update(config => ({ ...config, compression: enabled }));
    },

    /**
     * Set encryption
     */
    setEncryption: (enabled: boolean) => {
      update(config => ({ ...config, encryption: enabled }));
    },

    /**
     * Set version tracking
     */
    setVersionTracking: (enabled: boolean) => {
      update(config => ({ ...config, versionTracking: enabled }));
    },

    /**
     * Set max save size
     */
    setMaxSaveSize: (size: number) => {
      update(config => ({ ...config, maxSaveSize: size }));
    },

    /**
     * Reset to defaults
     */
    reset: () => {
      set(DEFAULT_CONFIG);
    },

    /**
     * Generate save system code
     */
    generateCode: (story: Story): GeneratedSaveCode => {
      let config: SaveSystemConfig = DEFAULT_CONFIG;
      const unsubscribe = subscribe(c => { config = c; });
      unsubscribe();
      return generateSaveCode(config, story);
    },
  };
};

export const saveSystemStore = createSaveSystemStore();

// Derived stores
export const storageType = derived(saveSystemStore, $store => $store.storageType);
export const slots = derived(saveSystemStore, $store => $store.slots);
export const metadata = derived(saveSystemStore, $store => $store.metadata);
export const persistAll = derived(saveSystemStore, $store => $store.persistAll);
