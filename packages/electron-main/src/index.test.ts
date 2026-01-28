/**
 * Electron Main Process Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Story } from '@writewhisker/story-models';

// Use vi.hoisted() to ensure mocks are available before vi.mock is called
const { mockApp, mockBrowserWindow, mockWebContents, mockIpcMain, mockDialog, mockMenu, mockTray } = vi.hoisted(() => {
  const mockWebContents = {
    openDevTools: vi.fn()
  };
  const mockApp = {
    getPath: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
    requestSingleInstanceLock: vi.fn(),
    isPackaged: false
  };
  const mockBrowserWindow = vi.fn().mockReturnValue({
    webContents: mockWebContents
  });
  const mockIpcMain = {
    handle: vi.fn()
  };
  const mockDialog = {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn()
  };
  const mockMenu = {
    buildFromTemplate: vi.fn()
  };
  const mockTray = vi.fn();

  return { mockApp, mockBrowserWindow, mockWebContents, mockIpcMain, mockDialog, mockMenu, mockTray };
});

vi.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain,
  dialog: mockDialog,
  Menu: mockMenu,
  Tray: mockTray
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/'))
}));

vi.mock('url', () => ({
  fileURLToPath: vi.fn((url: string) => url.replace('file://', ''))
}));

// Import after mocking
import {
  createMainWindow,
  setupIPC,
  createMenu,
  setupAutoUpdater,
  getAppPaths,
  setupAppHandlers,
  createTray,
  ensureSingleInstance
} from './index.js';
import { readFile, writeFile } from 'fs/promises';

describe('createMainWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBrowserWindow.mockReturnValue({
      webContents: mockWebContents
    });
  });

  it('should create a BrowserWindow with default config', () => {
    createMainWindow();
    expect(mockBrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'Whisker Editor'
      })
    );
  });

  it('should create a BrowserWindow with custom config', () => {
    const config = {
      width: 1600,
      height: 1000,
      minWidth: 1024,
      minHeight: 768,
      title: 'Custom Title'
    };
    createMainWindow(config);
    expect(mockBrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining(config)
    );
  });

  it('should set security preferences', () => {
    createMainWindow();
    expect(mockBrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        webPreferences: expect.objectContaining({
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        })
      })
    );
  });

  it('should open DevTools when devTools is true and not packaged', () => {
    mockApp.isPackaged = false;
    createMainWindow({ devTools: true });
    expect(mockWebContents.openDevTools).toHaveBeenCalled();
  });

  it('should not open DevTools when devTools is false', () => {
    mockApp.isPackaged = false;
    createMainWindow({ devTools: false });
    expect(mockWebContents.openDevTools).not.toHaveBeenCalled();
  });

  it('should not open DevTools when app is packaged', () => {
    mockApp.isPackaged = true;
    createMainWindow({ devTools: true });
    expect(mockWebContents.openDevTools).not.toHaveBeenCalled();
    mockApp.isPackaged = false; // Reset
  });
});

describe('setupIPC', () => {
  let handlers: Map<string, Function>;
  let mockStory: Story;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = new Map();
    mockIpcMain.handle.mockImplementation((channel: string, handler: Function) => {
      handlers.set(channel, handler);
    });
    // Use plain objects instead of Maps to match JSON.parse behavior
    // (JSON serialization converts Maps to empty objects)
    mockStory = {
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      startPassage: 'Start',
      passages: {},
      variables: {},
      settings: {},
      stylesheets: [],
      scripts: [],
      assets: {},
      luaFunctions: {},
    } as unknown as Story;
  });

  it('should register IPC handlers', () => {
    setupIPC();
    expect(mockIpcMain.handle).toHaveBeenCalledWith('file:open', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('file:save', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('file:saveAs', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('dialog:message', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('dialog:confirm', expect.any(Function));
  });

  describe('file:open handler', () => {
    beforeEach(() => {
      setupIPC();
    });

    it('should return null when dialog is canceled', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
      const handler = handlers.get('file:open')!;
      const result = await handler();
      expect(result).toBeNull();
    });

    it('should return null when no file selected', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [] });
      const handler = handlers.get('file:open')!;
      const result = await handler();
      expect(result).toBeNull();
    });

    it('should read and parse file when selected', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/story.json']
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockStory));
      const handler = handlers.get('file:open')!;
      const result = await handler();
      expect(result).toEqual({
        path: '/path/to/story.json',
        content: mockStory
      });
      expect(readFile).toHaveBeenCalledWith('/path/to/story.json', 'utf-8');
    });

    it('should use correct file filters', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
      const handler = handlers.get('file:open')!;
      await handler();
      expect(mockDialog.showOpenDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: [
            { name: 'Whisker Story', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        })
      );
    });
  });

  describe('file:save handler', () => {
    beforeEach(() => {
      setupIPC();
    });

    it('should save file to specified path', async () => {
      vi.mocked(writeFile).mockResolvedValue();
      const handler = handlers.get('file:save')!;
      const result = await handler(null, '/path/to/story.json', mockStory);
      expect(writeFile).toHaveBeenCalledWith(
        '/path/to/story.json',
        JSON.stringify(mockStory, null, 2),
        'utf-8'
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('file:saveAs handler', () => {
    beforeEach(() => {
      setupIPC();
    });

    it('should return null when dialog is canceled', async () => {
      mockDialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined });
      const handler = handlers.get('file:saveAs')!;
      const result = await handler(null, mockStory);
      expect(result).toBeNull();
    });

    it('should return null when no file path selected', async () => {
      mockDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: undefined });
      const handler = handlers.get('file:saveAs')!;
      const result = await handler(null, mockStory);
      expect(result).toBeNull();
    });

    it('should save file when path selected', async () => {
      mockDialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/path/to/new-story.json'
      });
      vi.mocked(writeFile).mockResolvedValue();
      const handler = handlers.get('file:saveAs')!;
      const result = await handler(null, mockStory);
      expect(writeFile).toHaveBeenCalledWith(
        '/path/to/new-story.json',
        JSON.stringify(mockStory, null, 2),
        'utf-8'
      );
      expect(result).toEqual({ path: '/path/to/new-story.json', success: true });
    });

    it('should use default filename from story name', async () => {
      mockDialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined });
      const handler = handlers.get('file:saveAs')!;
      await handler(null, mockStory);
      expect(mockDialog.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPath: 'Test Story.json'
        })
      );
    });

    it('should use "story.json" when story has no name', async () => {
      const storyNoName = { ...mockStory, metadata: { ...mockStory.metadata, title: '' } };
      mockDialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined });
      const handler = handlers.get('file:saveAs')!;
      await handler(null, storyNoName);
      expect(mockDialog.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPath: 'story.json'
        })
      );
    });
  });

  describe('dialog:message handler', () => {
    beforeEach(() => {
      setupIPC();
    });

    it('should show message box with options', async () => {
      mockDialog.showMessageBox.mockResolvedValue({ response: 0 });
      const handler = handlers.get('dialog:message')!;
      const options = {
        type: 'info',
        message: 'Test message',
        detail: 'Test detail'
      };
      const result = await handler(null, options);
      expect(mockDialog.showMessageBox).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: 'Test message',
          detail: 'Test detail',
          buttons: ['OK']
        })
      );
      expect(result).toBe(0);
    });

    it('should handle message without detail', async () => {
      mockDialog.showMessageBox.mockResolvedValue({ response: 0 });
      const handler = handlers.get('dialog:message')!;
      const options = {
        type: 'warning',
        message: 'Warning message'
      };
      await handler(null, options);
      expect(mockDialog.showMessageBox).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: 'Warning message',
          detail: undefined
        })
      );
    });
  });

  describe('dialog:confirm handler', () => {
    beforeEach(() => {
      setupIPC();
    });

    it('should return true when OK is clicked', async () => {
      mockDialog.showMessageBox.mockResolvedValue({ response: 1 });
      const handler = handlers.get('dialog:confirm')!;
      const result = await handler(null, { message: 'Confirm?' });
      expect(result).toBe(true);
    });

    it('should return false when Cancel is clicked', async () => {
      mockDialog.showMessageBox.mockResolvedValue({ response: 0 });
      const handler = handlers.get('dialog:confirm')!;
      const result = await handler(null, { message: 'Confirm?' });
      expect(result).toBe(false);
    });

    it('should show confirmation dialog with correct options', async () => {
      mockDialog.showMessageBox.mockResolvedValue({ response: 1 });
      const handler = handlers.get('dialog:confirm')!;
      const options = {
        message: 'Are you sure?',
        detail: 'This cannot be undone'
      };
      await handler(null, options);
      expect(mockDialog.showMessageBox).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'question',
          message: 'Are you sure?',
          detail: 'This cannot be undone',
          buttons: ['Cancel', 'OK'],
          defaultId: 1,
          cancelId: 0
        })
      );
    });
  });
});

describe('createMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMenu.buildFromTemplate.mockReturnValue({});
  });

  it('should create menu with callbacks', () => {
    const callbacks = {
      onNew: vi.fn(),
      onOpen: vi.fn(),
      onSave: vi.fn(),
      onSaveAs: vi.fn(),
      onQuit: vi.fn()
    };
    createMenu(callbacks);
    expect(mockMenu.buildFromTemplate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'File',
          submenu: expect.arrayContaining([
            expect.objectContaining({ label: 'New', click: callbacks.onNew }),
            expect.objectContaining({ label: 'Open', click: callbacks.onOpen }),
            expect.objectContaining({ label: 'Save', click: callbacks.onSave }),
            expect.objectContaining({ label: 'Save As...', click: callbacks.onSaveAs })
          ])
        })
      ])
    );
  });

  it('should use app.quit for Quit when no callback provided', () => {
    createMenu({});
    const calls = mockMenu.buildFromTemplate.mock.calls[0][0];
    const fileMenu = calls.find((item: any) => item.label === 'File');
    const quitItem = fileMenu.submenu.find((item: any) => item.label === 'Quit');
    quitItem.click();
    expect(mockApp.quit).toHaveBeenCalled();
  });

  it('should include Edit menu with standard items', () => {
    createMenu({});
    expect(mockMenu.buildFromTemplate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Edit',
          submenu: expect.arrayContaining([
            expect.objectContaining({ role: 'undo' }),
            expect.objectContaining({ role: 'redo' }),
            expect.objectContaining({ role: 'cut' }),
            expect.objectContaining({ role: 'copy' }),
            expect.objectContaining({ role: 'paste' })
          ])
        })
      ])
    );
  });

  it('should include View menu with standard items', () => {
    createMenu({});
    expect(mockMenu.buildFromTemplate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'View',
          submenu: expect.arrayContaining([
            expect.objectContaining({ role: 'reload' }),
            expect.objectContaining({ role: 'toggleDevTools' }),
            expect.objectContaining({ role: 'zoomIn' }),
            expect.objectContaining({ role: 'zoomOut' })
          ])
        })
      ])
    );
  });

  it('should include keyboard shortcuts', () => {
    createMenu({});
    const calls = mockMenu.buildFromTemplate.mock.calls[0][0];
    const fileMenu = calls.find((item: any) => item.label === 'File');
    const newItem = fileMenu.submenu.find((item: any) => item.label === 'New');
    const openItem = fileMenu.submenu.find((item: any) => item.label === 'Open');
    const saveItem = fileMenu.submenu.find((item: any) => item.label === 'Save');
    expect(newItem.accelerator).toBe('CmdOrCtrl+N');
    expect(openItem.accelerator).toBe('CmdOrCtrl+O');
    expect(saveItem.accelerator).toBe('CmdOrCtrl+S');
  });
});

describe('setupAutoUpdater', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log placeholder message', () => {
    setupAutoUpdater();
    expect(consoleSpy).toHaveBeenCalledWith('Auto-updater setup (placeholder)');
  });

  it('should accept callbacks without error', () => {
    const callbacks = {
      onUpdateAvailable: vi.fn(),
      onUpdateDownloaded: vi.fn(),
      onError: vi.fn()
    };
    expect(() => setupAutoUpdater(callbacks)).not.toThrow();
  });
});

describe('getAppPaths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApp.getPath.mockImplementation((name: string) => `/mock/${name}`);
  });

  it('should return all app paths', () => {
    const paths = getAppPaths();
    expect(paths).toEqual({
      userData: '/mock/userData',
      documents: '/mock/documents',
      downloads: '/mock/downloads',
      desktop: '/mock/desktop',
      temp: '/mock/temp'
    });
  });

  it('should call app.getPath for each path type', () => {
    getAppPaths();
    expect(mockApp.getPath).toHaveBeenCalledWith('userData');
    expect(mockApp.getPath).toHaveBeenCalledWith('documents');
    expect(mockApp.getPath).toHaveBeenCalledWith('downloads');
    expect(mockApp.getPath).toHaveBeenCalledWith('desktop');
    expect(mockApp.getPath).toHaveBeenCalledWith('temp');
  });
});

describe('setupAppHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register app event handlers', () => {
    const callbacks = {
      onReady: vi.fn(),
      onActivate: vi.fn(),
      onWindowAllClosed: vi.fn()
    };
    setupAppHandlers(callbacks);
    expect(mockApp.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockApp.on).toHaveBeenCalledWith('activate', expect.any(Function));
    expect(mockApp.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
  });

  it('should call onReady callback when ready event fires', () => {
    const callbacks = { onReady: vi.fn() };
    let readyHandler: Function = () => {};
    mockApp.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'ready') readyHandler = handler;
    });
    setupAppHandlers(callbacks);
    readyHandler();
    expect(callbacks.onReady).toHaveBeenCalled();
  });

  it('should call onActivate callback when activate event fires', () => {
    const callbacks = { onActivate: vi.fn() };
    let activateHandler: Function = () => {};
    mockApp.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'activate') activateHandler = handler;
    });
    setupAppHandlers(callbacks);
    activateHandler();
    expect(callbacks.onActivate).toHaveBeenCalled();
  });

  it('should quit app on window-all-closed for non-macOS', () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32' });
    let windowAllClosedHandler: Function = () => {};
    mockApp.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'window-all-closed') windowAllClosedHandler = handler;
    });
    setupAppHandlers({});
    windowAllClosedHandler();
    expect(mockApp.quit).toHaveBeenCalled();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('should not quit app on window-all-closed for macOS', () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    let windowAllClosedHandler: Function = () => {};
    mockApp.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'window-all-closed') windowAllClosedHandler = handler;
    });
    setupAppHandlers({});
    windowAllClosedHandler();
    expect(mockApp.quit).not.toHaveBeenCalled();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });
});

describe('createTray', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTray.mockReturnValue({
      on: vi.fn()
    });
  });

  it('should create tray with icon path', () => {
    createTray('/path/to/icon.png');
    expect(mockTray).toHaveBeenCalledWith('/path/to/icon.png');
  });

  it('should register click callback', () => {
    const callbacks = { onClick: vi.fn() };
    const trayInstance = { on: vi.fn() };
    mockTray.mockReturnValue(trayInstance);
    createTray('/path/to/icon.png', callbacks);
    expect(trayInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('should register right-click callback', () => {
    const callbacks = { onRightClick: vi.fn() };
    const trayInstance = { on: vi.fn() };
    mockTray.mockReturnValue(trayInstance);
    createTray('/path/to/icon.png', callbacks);
    expect(trayInstance.on).toHaveBeenCalledWith('right-click', expect.any(Function));
  });

  it('should call onClick when tray is clicked', () => {
    const callbacks = { onClick: vi.fn() };
    const trayInstance = { on: vi.fn() };
    let clickHandler: Function = () => {};
    trayInstance.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'click') clickHandler = handler;
    });
    mockTray.mockReturnValue(trayInstance);
    createTray('/path/to/icon.png', callbacks);
    clickHandler();
    expect(callbacks.onClick).toHaveBeenCalled();
  });
});

describe('ensureSingleInstance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when lock is acquired', () => {
    mockApp.requestSingleInstanceLock.mockReturnValue(true);
    const result = ensureSingleInstance();
    expect(result).toBe(true);
    expect(mockApp.quit).not.toHaveBeenCalled();
  });

  it('should quit and return false when lock is not acquired', () => {
    mockApp.requestSingleInstanceLock.mockReturnValue(false);
    const result = ensureSingleInstance();
    expect(result).toBe(false);
    expect(mockApp.quit).toHaveBeenCalled();
  });

  it('should register second-instance callback when lock acquired', () => {
    mockApp.requestSingleInstanceLock.mockReturnValue(true);
    const callback = vi.fn();
    ensureSingleInstance(callback);
    expect(mockApp.on).toHaveBeenCalledWith('second-instance', expect.any(Function));
  });

  it('should call callback when second instance is launched', () => {
    mockApp.requestSingleInstanceLock.mockReturnValue(true);
    const callback = vi.fn();
    let secondInstanceHandler: Function = () => {};
    mockApp.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'second-instance') secondInstanceHandler = handler;
    });
    ensureSingleInstance(callback);
    secondInstanceHandler();
    expect(callback).toHaveBeenCalled();
  });
});
