/**
 * Electron Preload Script
 *
 * Preload scripts for secure IPC communication in Whisker Editor.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { Story } from '@writewhisker/story-models';

/**
 * File API
 */
const fileAPI = {
  /**
   * Open a story file
   */
  open: async (): Promise<{ path: string; content: Story } | null> => {
    return ipcRenderer.invoke('file:open');
  },

  /**
   * Save story to existing path
   */
  save: async (path: string, story: Story): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('file:save', path, story);
  },

  /**
   * Save story with file picker
   */
  saveAs: async (story: Story): Promise<{ path: string; success: boolean } | null> => {
    return ipcRenderer.invoke('file:saveAs', story);
  },
};

/**
 * Dialog API
 */
const dialogAPI = {
  /**
   * Show message dialog
   */
  showMessage: async (options: {
    type: 'info' | 'warning' | 'error';
    message: string;
    detail?: string;
  }): Promise<number> => {
    return ipcRenderer.invoke('dialog:message', options);
  },

  /**
   * Show confirmation dialog
   */
  confirm: async (options: { message: string; detail?: string }): Promise<boolean> => {
    return ipcRenderer.invoke('dialog:confirm', options);
  },
};

/**
 * System API
 */
const systemAPI = {
  /**
   * Get platform
   */
  getPlatform: (): string => {
    return process.platform;
  },

  /**
   * Get app version
   */
  getVersion: (): string => {
    return process.versions.electron;
  },

  /**
   * Get process versions
   */
  getVersions: (): NodeJS.ProcessVersions => {
    return process.versions;
  },
};

/**
 * Expose APIs to renderer process
 */
export function exposeAPIs(): void {
  contextBridge.exposeInMainWorld('whiskerAPI', {
    file: fileAPI,
    dialog: dialogAPI,
    system: systemAPI,
  });
}

/**
 * Auto-expose when module loads
 */
if (typeof window !== 'undefined') {
  exposeAPIs();
}

/**
 * TypeScript declarations for window object
 */
declare global {
  interface Window {
    whiskerAPI: {
      file: typeof fileAPI;
      dialog: typeof dialogAPI;
      system: typeof systemAPI;
    };
  }
}
