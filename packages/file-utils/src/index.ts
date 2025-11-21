/**
 * File Utils
 * MIME detection, size formatting, path utilities
 */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'md': 'text/markdown',
    'ts': 'text/typescript',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext);
}

export function isTextFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'xml'].includes(ext);
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9._-]/gi, '_');
}

export function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

export function getBasename(path: string): string {
  return path.split('/').pop() || '';
}

export function getDirname(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
}
