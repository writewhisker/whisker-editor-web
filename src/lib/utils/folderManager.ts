/**
 * Folder/Chapter Management Utility
 *
 * Provides folder organization for passages using metadata.
 * Folders are stored in passage.metadata.folder
 */

import type { Passage } from '../models/Passage';
import type { Story } from '../models/Story';

export interface Folder {
  name: string;
  color?: string;
  passageCount: number;
}

export class FolderManager {
  /**
   * Get the folder name for a passage
   */
  static getFolder(passage: Passage): string | null {
    return passage.getMetadata('folder', null);
  }

  /**
   * Set the folder for a passage
   */
  static setFolder(passage: Passage, folderName: string | null): void {
    if (folderName) {
      passage.setMetadata('folder', folderName);
    } else {
      passage.deleteMetadata('folder');
    }
    passage.modified = new Date().toISOString();
  }

  /**
   * Get all unique folders in a story
   */
  static getAllFolders(story: Story): Folder[] {
    const folderMap = new Map<string, number>();

    story.passages.forEach(passage => {
      const folder = this.getFolder(passage);
      if (folder) {
        folderMap.set(folder, (folderMap.get(folder) || 0) + 1);
      }
    });

    return Array.from(folderMap.entries())
      .map(([name, passageCount]) => ({ name, passageCount }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get passages in a specific folder
   */
  static getPassagesInFolder(story: Story, folderName: string): Passage[] {
    return story.passages.filter(passage =>
      this.getFolder(passage) === folderName
    );
  }

  /**
   * Get passages not in any folder
   */
  static getUnfolderedPassages(story: Story): Passage[] {
    return story.passages.filter(passage =>
      !this.getFolder(passage)
    );
  }

  /**
   * Rename a folder
   */
  static renameFolder(story: Story, oldName: string, newName: string): number {
    let count = 0;
    story.passages.forEach(passage => {
      if (this.getFolder(passage) === oldName) {
        this.setFolder(passage, newName);
        count++;
      }
    });
    return count;
  }

  /**
   * Delete a folder (removes folder metadata from all passages)
   */
  static deleteFolder(story: Story, folderName: string): number {
    let count = 0;
    story.passages.forEach(passage => {
      if (this.getFolder(passage) === folderName) {
        this.setFolder(passage, null);
        count++;
      }
    });
    return count;
  }

  /**
   * Move passages to a folder
   */
  static moveToFolder(passages: Passage[], folderName: string | null): void {
    passages.forEach(passage => {
      this.setFolder(passage, folderName);
    });
  }
}
