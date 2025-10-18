import type { ProjectData } from '../models/types';

export interface FileHandle {
  name: string;
  handle?: FileSystemFileHandle;
}

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}

// Open a project file
export async function openProjectFile(): Promise<{ data: ProjectData; handle: FileHandle } | null> {
  try {
    if (isFileSystemAccessSupported()) {
      // Use File System Access API
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Whisker Project Files',
            accept: {
              'application/json': ['.whisker', '.json'],
            },
          },
        ],
      });

      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text) as ProjectData;

      return {
        data,
        handle: { name: file.name, handle: fileHandle },
      };
    } else {
      // Fallback to file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.whisker,.json';

        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve(null);
            return;
          }

          const text = await file.text();
          const data = JSON.parse(text) as ProjectData;

          resolve({
            data,
            handle: { name: file.name },
          });
        };

        input.click();
      });
    }
  } catch (error) {
    console.error('Error opening file:', error);
    return null;
  }
}

// Save a project file
export async function saveProjectFile(
  data: ProjectData,
  handle?: FileHandle
): Promise<FileHandle | null> {
  const jsonString = JSON.stringify(data, null, 2);

  try {
    if (isFileSystemAccessSupported() && handle?.handle) {
      // Use existing file handle
      const writable = await handle.handle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      return handle;
    } else if (isFileSystemAccessSupported()) {
      // Show save picker
      const fileHandle = await (window as any).showSaveFilePicker({
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

      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      return { name: fileHandle.name, handle: fileHandle };
    } else {
      // Fallback to download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = handle?.name || 'story.whisker';
      a.click();
      URL.revokeObjectURL(url);

      return { name: a.download };
    }
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}

// Save as (always show save picker)
export async function saveProjectFileAs(data: ProjectData): Promise<FileHandle | null> {
  return saveProjectFile(data, undefined);
}
