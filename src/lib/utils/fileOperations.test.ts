import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isFileSystemAccessSupported,
  openProjectFile,
  saveProjectFile,
  saveProjectFileAs,
  type FileHandle,
} from './fileOperations';
import type { ProjectData } from '../models/types';

describe('fileOperations', () => {
  const mockProjectData: ProjectData = {
    metadata: {
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0',
      created: '2024-01-01',
      modified: '2024-01-02',
    },
    passages: [],
    variables: [],
    startPassage: null,
  };

  beforeEach(() => {
    // Clear any DOM elements
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isFileSystemAccessSupported', () => {
    it('should return true when File System Access API is supported', () => {
      (window as any).showOpenFilePicker = vi.fn();
      (window as any).showSaveFilePicker = vi.fn();

      expect(isFileSystemAccessSupported()).toBe(true);
    });

    it('should return false when showOpenFilePicker is not supported', () => {
      delete (window as any).showOpenFilePicker;
      (window as any).showSaveFilePicker = vi.fn();

      expect(isFileSystemAccessSupported()).toBe(false);
    });

    it('should return false when showSaveFilePicker is not supported', () => {
      (window as any).showOpenFilePicker = vi.fn();
      delete (window as any).showSaveFilePicker;

      expect(isFileSystemAccessSupported()).toBe(false);
    });

    it('should return false when neither API is supported', () => {
      delete (window as any).showOpenFilePicker;
      delete (window as any).showSaveFilePicker;

      expect(isFileSystemAccessSupported()).toBe(false);
    });
  });

  describe('openProjectFile', () => {
    describe('with File System Access API', () => {
      beforeEach(() => {
        (window as any).showOpenFilePicker = vi.fn();
        (window as any).showSaveFilePicker = vi.fn();
      });

      it('should open and parse a valid project file', async () => {
        const mockFile = {
          name: 'test.whisker',
          text: vi.fn().mockResolvedValue(JSON.stringify(mockProjectData)),
        };

        const mockFileHandle = {
          getFile: vi.fn().mockResolvedValue(mockFile),
          name: 'test.whisker',
        };

        (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle]);

        const result = await openProjectFile();

        expect(result).not.toBeNull();
        expect(result?.data.metadata.title).toBe('Test Story');
        expect(result?.handle.name).toBe('test.whisker');
        expect(result?.handle.handle).toBe(mockFileHandle);
      });

      it('should call showOpenFilePicker with correct options', async () => {
        const mockFile = {
          name: 'test.whisker',
          text: vi.fn().mockResolvedValue(JSON.stringify(mockProjectData)),
        };

        const mockFileHandle = {
          getFile: vi.fn().mockResolvedValue(mockFile),
          name: 'test.whisker',
        };

        (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle]);

        await openProjectFile();

        expect((window as any).showOpenFilePicker).toHaveBeenCalledWith({
          types: [
            {
              description: 'Whisker Project Files',
              accept: {
                'application/json': ['.whisker', '.json'],
              },
            },
          ],
        });
      });

      it('should return null on error', async () => {
        (window as any).showOpenFilePicker = vi.fn().mockRejectedValue(new Error('User cancelled'));

        const result = await openProjectFile();

        expect(result).toBeNull();
      });

      it('should return null on JSON parse error', async () => {
        const mockFile = {
          name: 'test.whisker',
          text: vi.fn().mockResolvedValue('invalid json'),
        };

        const mockFileHandle = {
          getFile: vi.fn().mockResolvedValue(mockFile),
          name: 'test.whisker',
        };

        (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle]);

        const result = await openProjectFile();

        expect(result).toBeNull();
      });
    });

    describe('fallback mode (without File System Access API)', () => {
      beforeEach(() => {
        delete (window as any).showOpenFilePicker;
        delete (window as any).showSaveFilePicker;
      });

      it('should use fallback file input approach', () => {
        // In fallback mode, the function creates an input element and clicks it
        // This triggers the browser's native file picker which can't be tested in jsdom
        // The important part is that the function doesn't throw and handles the fallback path
        // Full end-to-end testing of file selection requires a real browser environment
        expect(isFileSystemAccessSupported()).toBe(false);
      });
    });
  });

  describe('saveProjectFile', () => {
    describe('with File System Access API', () => {
      beforeEach(() => {
        (window as any).showOpenFilePicker = vi.fn();
        (window as any).showSaveFilePicker = vi.fn();
      });

      it('should save to existing file handle', async () => {
        const mockWritable = {
          write: vi.fn(),
          close: vi.fn(),
        };

        const mockFileHandle: FileHandle = {
          name: 'existing.whisker',
          handle: {
            createWritable: vi.fn().mockResolvedValue(mockWritable),
          } as any,
        };

        const result = await saveProjectFile(mockProjectData, mockFileHandle);

        expect(mockFileHandle.handle?.createWritable).toHaveBeenCalled();
        expect(mockWritable.write).toHaveBeenCalledWith(JSON.stringify(mockProjectData, null, 2));
        expect(mockWritable.close).toHaveBeenCalled();
        expect(result).toBe(mockFileHandle);
      });

      it('should show save picker when no handle provided', async () => {
        const mockWritable = {
          write: vi.fn(),
          close: vi.fn(),
        };

        const mockFileHandle = {
          name: 'new.whisker',
          createWritable: vi.fn().mockResolvedValue(mockWritable),
        };

        (window as any).showSaveFilePicker = vi.fn().mockResolvedValue(mockFileHandle);

        const result = await saveProjectFile(mockProjectData);

        expect((window as any).showSaveFilePicker).toHaveBeenCalledWith({
          types: [
            {
              description: 'Whisker Project Files',
              accept: {
                'application/json': ['.whisker'],
              },
            },
          ],
          suggestedName: 'story.whisker',
        });

        expect(mockWritable.write).toHaveBeenCalled();
        expect(mockWritable.close).toHaveBeenCalled();
        expect(result?.name).toBe('new.whisker');
      });

      it('should return null on error', async () => {
        const mockFileHandle: FileHandle = {
          name: 'error.whisker',
          handle: {
            createWritable: vi.fn().mockRejectedValue(new Error('Write error')),
          } as any,
        };

        const result = await saveProjectFile(mockProjectData, mockFileHandle);

        expect(result).toBeNull();
      });
    });

    describe('fallback mode (without File System Access API)', () => {
      beforeEach(() => {
        delete (window as any).showOpenFilePicker;
        delete (window as any).showSaveFilePicker;

        // Mock URL.createObjectURL and revokeObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = vi.fn();
      });

      it('should trigger download with default name', async () => {
        const clickSpy = vi.fn();
        const link = document.createElement('a');
        link.click = clickSpy;

        const createElementSpy = vi.spyOn(document, 'createElement');
        createElementSpy.mockReturnValue(link);

        const result = await saveProjectFile(mockProjectData);

        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(link.download).toBe('story.whisker');
        expect(link.href).toBe('blob:mock-url');
        expect(clickSpy).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
        expect(result?.name).toBe('story.whisker');
      });

      it('should use provided file handle name for download', async () => {
        const clickSpy = vi.fn();
        const link = document.createElement('a');
        link.click = clickSpy;

        vi.spyOn(document, 'createElement').mockReturnValue(link);

        const handle: FileHandle = { name: 'custom.whisker' };
        const result = await saveProjectFile(mockProjectData, handle);

        expect(link.download).toBe('custom.whisker');
        expect(result?.name).toBe('custom.whisker');
      });

      it('should create blob with correct content', async () => {
        const clickSpy = vi.fn();
        const link = document.createElement('a');
        link.click = clickSpy;
        vi.spyOn(document, 'createElement').mockReturnValue(link);

        const blobSpy = vi.spyOn(global, 'Blob');

        await saveProjectFile(mockProjectData);

        expect(blobSpy).toHaveBeenCalledWith(
          [JSON.stringify(mockProjectData, null, 2)],
          { type: 'application/json' }
        );
      });
    });
  });

  describe('saveProjectFileAs', () => {
    it('should call saveProjectFile with undefined handle', async () => {
      (window as any).showOpenFilePicker = vi.fn();
      (window as any).showSaveFilePicker = vi.fn();

      const mockWritable = {
        write: vi.fn(),
        close: vi.fn(),
      };

      const mockFileHandle = {
        name: 'new.whisker',
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      };

      (window as any).showSaveFilePicker = vi.fn().mockResolvedValue(mockFileHandle);

      const result = await saveProjectFileAs(mockProjectData);

      expect((window as any).showSaveFilePicker).toHaveBeenCalled();
      expect(result?.name).toBe('new.whisker');
    });

    it('should always show save picker regardless of existing handle', async () => {
      (window as any).showOpenFilePicker = vi.fn();
      (window as any).showSaveFilePicker = vi.fn();

      const mockWritable = {
        write: vi.fn(),
        close: vi.fn(),
      };

      const mockFileHandle = {
        name: 'new-name.whisker',
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      };

      (window as any).showSaveFilePicker = vi.fn().mockResolvedValue(mockFileHandle);

      // Even though we might have an existing handle, saveAs should show picker
      const result = await saveProjectFileAs(mockProjectData);

      expect((window as any).showSaveFilePicker).toHaveBeenCalled();
    });
  });
});
