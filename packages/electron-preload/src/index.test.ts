/**
 * Electron Preload Script Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Story } from '@writewhisker/story-models';

// Mock electron module
const mockContextBridge = {
  exposeInMainWorld: vi.fn()
};

const mockIpcRenderer = {
  invoke: vi.fn()
};

vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer
}));

// Mock process object
const mockProcess = {
  platform: 'darwin',
  versions: {
    electron: '27.0.0',
    node: '18.17.0',
    chrome: '118.0.0.0'
  }
};

global.process = mockProcess as any;

// Import after mocking
import { exposeAPIs } from './index.js';

describe('exposeAPIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose whiskerAPI to main world', () => {
    exposeAPIs();
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'whiskerAPI',
      expect.objectContaining({
        file: expect.any(Object),
        dialog: expect.any(Object),
        system: expect.any(Object)
      })
    );
  });

  it('should expose file API methods', () => {
    exposeAPIs();
    const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];
    expect(exposedAPI.file).toHaveProperty('open');
    expect(exposedAPI.file).toHaveProperty('save');
    expect(exposedAPI.file).toHaveProperty('saveAs');
  });

  it('should expose dialog API methods', () => {
    exposeAPIs();
    const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];
    expect(exposedAPI.dialog).toHaveProperty('showMessage');
    expect(exposedAPI.dialog).toHaveProperty('confirm');
  });

  it('should expose system API methods', () => {
    exposeAPIs();
    const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];
    expect(exposedAPI.system).toHaveProperty('getPlatform');
    expect(exposedAPI.system).toHaveProperty('getVersion');
    expect(exposedAPI.system).toHaveProperty('getVersions');
  });
});

describe('File API', () => {
  let fileAPI: any;
  let mockStory: Story;

  beforeEach(() => {
    vi.clearAllMocks();
    exposeAPIs();
    fileAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1].file;
    mockStory = {
      id: 'story-1',
      name: 'Test Story',
      author: 'Test Author',
      startPassage: 'Start',
      passages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  describe('open', () => {
    it('should invoke file:open IPC channel', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({
        path: '/path/to/story.json',
        content: mockStory
      });
      const result = await fileAPI.open();
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('file:open');
      expect(result).toEqual({
        path: '/path/to/story.json',
        content: mockStory
      });
    });

    it('should return null when no file selected', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(null);
      const result = await fileAPI.open();
      expect(result).toBeNull();
    });

    it('should handle errors from main process', async () => {
      mockIpcRenderer.invoke.mockRejectedValue(new Error('Failed to open file'));
      await expect(fileAPI.open()).rejects.toThrow('Failed to open file');
    });
  });

  describe('save', () => {
    it('should invoke file:save IPC channel with path and story', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      const result = await fileAPI.save('/path/to/story.json', mockStory);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('file:save', '/path/to/story.json', mockStory);
      expect(result).toEqual({ success: true });
    });

    it('should handle save errors', async () => {
      mockIpcRenderer.invoke.mockRejectedValue(new Error('Failed to save file'));
      await expect(fileAPI.save('/path/to/story.json', mockStory)).rejects.toThrow('Failed to save file');
    });
  });

  describe('saveAs', () => {
    it('should invoke file:saveAs IPC channel with story', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({
        path: '/path/to/new-story.json',
        success: true
      });
      const result = await fileAPI.saveAs(mockStory);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('file:saveAs', mockStory);
      expect(result).toEqual({
        path: '/path/to/new-story.json',
        success: true
      });
    });

    it('should return null when dialog is canceled', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(null);
      const result = await fileAPI.saveAs(mockStory);
      expect(result).toBeNull();
    });

    it('should handle saveAs errors', async () => {
      mockIpcRenderer.invoke.mockRejectedValue(new Error('Failed to save file'));
      await expect(fileAPI.saveAs(mockStory)).rejects.toThrow('Failed to save file');
    });
  });
});

describe('Dialog API', () => {
  let dialogAPI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    exposeAPIs();
    dialogAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1].dialog;
  });

  describe('showMessage', () => {
    it('should invoke dialog:message IPC channel', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(0);
      const options = {
        type: 'info' as const,
        message: 'Test message',
        detail: 'Test detail'
      };
      const result = await dialogAPI.showMessage(options);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:message', options);
      expect(result).toBe(0);
    });

    it('should handle info messages', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(0);
      await dialogAPI.showMessage({
        type: 'info',
        message: 'Information'
      });
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:message', {
        type: 'info',
        message: 'Information'
      });
    });

    it('should handle warning messages', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(0);
      await dialogAPI.showMessage({
        type: 'warning',
        message: 'Warning'
      });
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:message', {
        type: 'warning',
        message: 'Warning'
      });
    });

    it('should handle error messages', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(0);
      await dialogAPI.showMessage({
        type: 'error',
        message: 'Error',
        detail: 'Something went wrong'
      });
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:message', {
        type: 'error',
        message: 'Error',
        detail: 'Something went wrong'
      });
    });

    it('should handle messages without detail', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(0);
      await dialogAPI.showMessage({
        type: 'info',
        message: 'Simple message'
      });
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:message', {
        type: 'info',
        message: 'Simple message'
      });
    });
  });

  describe('confirm', () => {
    it('should invoke dialog:confirm IPC channel', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(true);
      const options = {
        message: 'Are you sure?',
        detail: 'This action cannot be undone'
      };
      const result = await dialogAPI.confirm(options);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:confirm', options);
      expect(result).toBe(true);
    });

    it('should return true when user confirms', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(true);
      const result = await dialogAPI.confirm({ message: 'Confirm?' });
      expect(result).toBe(true);
    });

    it('should return false when user cancels', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(false);
      const result = await dialogAPI.confirm({ message: 'Confirm?' });
      expect(result).toBe(false);
    });

    it('should handle confirm without detail', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(true);
      await dialogAPI.confirm({ message: 'Simple confirm' });
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:confirm', {
        message: 'Simple confirm'
      });
    });

    it('should handle confirm with detail', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(true);
      await dialogAPI.confirm({
        message: 'Delete file?',
        detail: 'This cannot be undone'
      });
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:confirm', {
        message: 'Delete file?',
        detail: 'This cannot be undone'
      });
    });
  });
});

describe('System API', () => {
  let systemAPI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    exposeAPIs();
    systemAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1].system;
  });

  describe('getPlatform', () => {
    it('should return process.platform', () => {
      const result = systemAPI.getPlatform();
      expect(result).toBe('darwin');
    });

    it('should return correct platform for Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true });
      exposeAPIs();
      const api = mockContextBridge.exposeInMainWorld.mock.calls[mockContextBridge.exposeInMainWorld.mock.calls.length - 1][1].system;
      expect(api.getPlatform()).toBe('win32');
      Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
    });

    it('should return correct platform for Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      exposeAPIs();
      const api = mockContextBridge.exposeInMainWorld.mock.calls[mockContextBridge.exposeInMainWorld.mock.calls.length - 1][1].system;
      expect(api.getPlatform()).toBe('linux');
      Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
    });
  });

  describe('getVersion', () => {
    it('should return electron version', () => {
      const result = systemAPI.getVersion();
      expect(result).toBe('27.0.0');
    });

    it('should return actual electron version from process.versions', () => {
      const originalVersions = process.versions;
      Object.defineProperty(process, 'versions', {
        value: { ...originalVersions, electron: '28.0.0' },
        writable: true
      });
      exposeAPIs();
      const api = mockContextBridge.exposeInMainWorld.mock.calls[mockContextBridge.exposeInMainWorld.mock.calls.length - 1][1].system;
      expect(api.getVersion()).toBe('28.0.0');
      Object.defineProperty(process, 'versions', { value: originalVersions, writable: true });
    });
  });

  describe('getVersions', () => {
    it('should return all process versions', () => {
      const result = systemAPI.getVersions();
      expect(result).toEqual({
        electron: '27.0.0',
        node: '18.17.0',
        chrome: '118.0.0.0'
      });
    });

    it('should return object with electron, node, and chrome versions', () => {
      const result = systemAPI.getVersions();
      expect(result).toHaveProperty('electron');
      expect(result).toHaveProperty('node');
      expect(result).toHaveProperty('chrome');
    });

    it('should return actual versions from process', () => {
      const originalVersions = process.versions;
      const customVersions = {
        electron: '29.0.0',
        node: '20.0.0',
        chrome: '120.0.0.0'
      };
      Object.defineProperty(process, 'versions', {
        value: customVersions,
        writable: true
      });
      exposeAPIs();
      const api = mockContextBridge.exposeInMainWorld.mock.calls[mockContextBridge.exposeInMainWorld.mock.calls.length - 1][1].system;
      expect(api.getVersions()).toEqual(customVersions);
      Object.defineProperty(process, 'versions', { value: originalVersions, writable: true });
    });
  });
});

describe('Auto-expose behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-expose when window is defined', () => {
    // The module auto-exposes on import when window is defined
    // This test verifies that behavior
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalled();
  });
});

describe('TypeScript declarations', () => {
  it('should provide correct type for window.whiskerAPI', () => {
    exposeAPIs();
    const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];

    // Verify structure matches TypeScript declaration
    expect(exposedAPI).toHaveProperty('file');
    expect(exposedAPI).toHaveProperty('dialog');
    expect(exposedAPI).toHaveProperty('system');

    // Verify file API methods
    expect(typeof exposedAPI.file.open).toBe('function');
    expect(typeof exposedAPI.file.save).toBe('function');
    expect(typeof exposedAPI.file.saveAs).toBe('function');

    // Verify dialog API methods
    expect(typeof exposedAPI.dialog.showMessage).toBe('function');
    expect(typeof exposedAPI.dialog.confirm).toBe('function');

    // Verify system API methods
    expect(typeof exposedAPI.system.getPlatform).toBe('function');
    expect(typeof exposedAPI.system.getVersion).toBe('function');
    expect(typeof exposedAPI.system.getVersions).toBe('function');
  });
});

describe('IPC communication', () => {
  let fileAPI: any;
  let dialogAPI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    exposeAPIs();
    const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];
    fileAPI = exposedAPI.file;
    dialogAPI = exposedAPI.dialog;
  });

  it('should handle concurrent file operations', async () => {
    mockIpcRenderer.invoke
      .mockResolvedValueOnce({ path: '/file1.json', content: {} })
      .mockResolvedValueOnce({ path: '/file2.json', content: {} });

    const [result1, result2] = await Promise.all([
      fileAPI.open(),
      fileAPI.open()
    ]);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(2);
    expect(result1.path).toBe('/file1.json');
    expect(result2.path).toBe('/file2.json');
  });

  it('should handle concurrent dialog operations', async () => {
    mockIpcRenderer.invoke
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(true);

    const [message, confirm] = await Promise.all([
      dialogAPI.showMessage({ type: 'info', message: 'Test' }),
      dialogAPI.confirm({ message: 'Confirm?' })
    ]);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(2);
    expect(message).toBe(0);
    expect(confirm).toBe(true);
  });

  it('should pass complex story objects through IPC', async () => {
    const complexStory: Story = {
      id: 'story-1',
      name: 'Complex Story',
      author: 'Test Author',
      startPassage: 'Start',
      passages: [
        {
          id: 'p1',
          title: 'Start',
          content: 'Content with [[links]]',
          position: { x: 0, y: 0 },
          tags: ['tag1', 'tag2']
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockIpcRenderer.invoke.mockResolvedValue({ success: true });
    await fileAPI.save('/path/to/story.json', complexStory);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      'file:save',
      '/path/to/story.json',
      complexStory
    );
  });
});

describe('Error handling', () => {
  let fileAPI: any;
  let dialogAPI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    exposeAPIs();
    const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];
    fileAPI = exposedAPI.file;
    dialogAPI = exposedAPI.dialog;
  });

  it('should propagate errors from file operations', async () => {
    const error = new Error('File read error');
    mockIpcRenderer.invoke.mockRejectedValue(error);

    await expect(fileAPI.open()).rejects.toThrow('File read error');
  });

  it('should propagate errors from dialog operations', async () => {
    const error = new Error('Dialog error');
    mockIpcRenderer.invoke.mockRejectedValue(error);

    await expect(dialogAPI.showMessage({ type: 'info', message: 'Test' }))
      .rejects.toThrow('Dialog error');
  });

  it('should handle network errors', async () => {
    const error = new Error('Network error');
    mockIpcRenderer.invoke.mockRejectedValue(error);

    await expect(fileAPI.saveAs({})).rejects.toThrow('Network error');
  });

  it('should handle permission errors', async () => {
    const error = new Error('Permission denied');
    mockIpcRenderer.invoke.mockRejectedValue(error);

    await expect(fileAPI.save('/restricted/file.json', {}))
      .rejects.toThrow('Permission denied');
  });
});
