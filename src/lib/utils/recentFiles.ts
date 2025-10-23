/**
 * Recent Files Manager
 *
 * Tracks recently opened files for quick access
 */

const RECENT_FILES_KEY = 'whisker-recent-files';
const MAX_RECENT_FILES = 5;

export interface RecentFile {
  name: string;
  path?: string; // File system path (if available)
  lastOpened: number;
  storyTitle?: string;
}

/**
 * Get recent files from localStorage
 */
export function getRecentFiles(): RecentFile[] {
  try {
    const data = localStorage.getItem(RECENT_FILES_KEY);
    if (!data) return [];

    const files = JSON.parse(data) as RecentFile[];
    return files.slice(0, MAX_RECENT_FILES);
  } catch (error) {
    console.error('Failed to load recent files:', error);
    return [];
  }
}

/**
 * Add a file to recent files list
 */
export function addRecentFile(file: Omit<RecentFile, 'lastOpened'>): void {
  try {
    const recent = getRecentFiles();

    // Check if file already exists (by name)
    const existingIndex = recent.findIndex(f => f.name === file.name);
    if (existingIndex !== -1) {
      // Remove existing entry
      recent.splice(existingIndex, 1);
    }

    // Add to beginning with current timestamp
    const newFile: RecentFile = {
      ...file,
      lastOpened: Date.now(),
    };
    recent.unshift(newFile);

    // Keep only MAX_RECENT_FILES
    const trimmed = recent.slice(0, MAX_RECENT_FILES);

    // Save back to localStorage
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save recent file:', error);
  }
}

/**
 * Remove a file from recent files list
 */
export function removeRecentFile(name: string): void {
  try {
    const recent = getRecentFiles();
    const filtered = recent.filter(f => f.name !== name);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove recent file:', error);
  }
}

/**
 * Clear all recent files
 */
export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(RECENT_FILES_KEY);
  } catch (error) {
    console.error('Failed to clear recent files:', error);
  }
}

/**
 * Format last opened time
 */
export function formatLastOpened(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(timestamp).toLocaleDateString();
  }
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}
