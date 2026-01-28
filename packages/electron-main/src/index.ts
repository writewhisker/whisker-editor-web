/**
 * Electron Main Process
 *
 * Main process utilities for Whisker Editor in Electron.
 */

import { app, BrowserWindow, ipcMain, dialog, Menu, Tray } from 'electron';
import type { Story } from '@writewhisker/story-models';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Window configuration
 */
export interface WindowConfig {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  title?: string;
  devTools?: boolean;
}

/**
 * Create main window
 */
export function createMainWindow(config: WindowConfig = {}): BrowserWindow {
  const window = new BrowserWindow({
    width: config.width || 1200,
    height: config.height || 800,
    minWidth: config.minWidth || 800,
    minHeight: config.minHeight || 600,
    title: config.title || 'Whisker Editor',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: join(__dirname, '../preload/index.js'),
    },
  });

  // Open DevTools in development
  if (config.devTools && !app.isPackaged) {
    window.webContents.openDevTools();
  }

  return window;
}

/**
 * Setup IPC handlers
 */
export function setupIPC(): void {
  // File operations
  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Whisker Story', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const content = await readFile(result.filePaths[0], 'utf-8');
    return {
      path: result.filePaths[0],
      content: JSON.parse(content),
    };
  });

  ipcMain.handle('file:save', async (_event, path: string, story: Story) => {
    await writeFile(path, JSON.stringify(story, null, 2), 'utf-8');
    return { success: true };
  });

  ipcMain.handle('file:saveAs', async (_event, story: Story) => {
    const result = await dialog.showSaveDialog({
      filters: [
        { name: 'Whisker Story', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath: `${story.metadata.title || 'story'}.json`,
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await writeFile(result.filePath, JSON.stringify(story, null, 2), 'utf-8');
    return { path: result.filePath, success: true };
  });

  // Dialog
  ipcMain.handle('dialog:message', async (_event, options: { type: string; message: string; detail?: string }) => {
    const result = await dialog.showMessageBox({
      type: options.type as any,
      message: options.message,
      detail: options.detail,
      buttons: ['OK'],
    });

    return result.response;
  });

  ipcMain.handle('dialog:confirm', async (_event, options: { message: string; detail?: string }) => {
    const result = await dialog.showMessageBox({
      type: 'question',
      message: options.message,
      detail: options.detail,
      buttons: ['Cancel', 'OK'],
      defaultId: 1,
      cancelId: 0,
    });

    return result.response === 1;
  });
}

/**
 * Create application menu
 */
export function createMenu(callbacks: {
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onQuit?: () => void;
}): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: callbacks.onNew,
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: callbacks.onOpen,
        },
        {
          type: 'separator',
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: callbacks.onSave,
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: callbacks.onSaveAs,
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: callbacks.onQuit || (() => app.quit()),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

/**
 * Setup auto-updater
 */
export function setupAutoUpdater(callbacks: {
  onUpdateAvailable?: () => void;
  onUpdateDownloaded?: () => void;
  onError?: (error: Error) => void;
} = {}): void {
  // Auto-updater implementation would go here
  // This is a placeholder for the actual implementation
  console.log('Auto-updater setup (placeholder)');
}

/**
 * Get app paths
 */
export function getAppPaths() {
  return {
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads'),
    desktop: app.getPath('desktop'),
    temp: app.getPath('temp'),
  };
}

/**
 * Setup app event handlers
 */
export function setupAppHandlers(callbacks: {
  onReady?: () => void;
  onActivate?: () => void;
  onWindowAllClosed?: () => void;
} = {}): void {
  app.on('ready', () => {
    callbacks.onReady?.();
  });

  app.on('activate', () => {
    callbacks.onActivate?.();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
    callbacks.onWindowAllClosed?.();
  });
}

/**
 * Create tray icon
 */
export function createTray(iconPath: string, callbacks: {
  onClick?: () => void;
  onRightClick?: () => void;
} = {}) {
  const tray = new Tray(iconPath);

  tray.on('click', () => {
    callbacks.onClick?.();
  });

  tray.on('right-click', () => {
    callbacks.onRightClick?.();
  });

  return tray;
}

/**
 * Check for single instance
 */
export function ensureSingleInstance(callback?: () => void): boolean {
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    app.quit();
    return false;
  }

  app.on('second-instance', () => {
    callback?.();
  });

  return true;
}
