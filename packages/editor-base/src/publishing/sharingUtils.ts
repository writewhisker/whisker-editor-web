/**
 * Sharing Utilities
 *
 * Helper functions for sharing published stories.
 */

export interface SharingOptions {
  /** Type of share */
  type: 'link' | 'embed' | 'qr' | 'email' | 'social';
  /** The URL to share */
  url: string;
  /** Title for the shared content */
  title?: string;
  /** Description for the shared content */
  description?: string;
  /** Width for embed code */
  embedWidth?: number;
  /** Height for embed code */
  embedHeight?: number;
  /** Social platform to share on */
  platform?: 'twitter' | 'facebook' | 'reddit';
}

/**
 * Generate embed code for iframe
 */
export function generateEmbedCode(options: SharingOptions): string {
  const width = options.embedWidth || 800;
  const height = options.embedHeight || 600;
  const title = options.title || 'Interactive Story';

  return `<iframe src="${options.url}" width="${width}" height="${height}" title="${escapeHTML(title)}" style="border: none; max-width: 100%;"></iframe>`;
}

/**
 * Generate QR code data URL
 */
export function generateQRCode(url: string): string {
  // Simple QR code generation using a public API
  // In production, you might want to use a library like qrcode.js
  const encodedUrl = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Generate social media share URL
 */
export function generateSocialShareUrl(
  platform: 'twitter' | 'facebook' | 'reddit',
  url: string,
  title?: string,
  description?: string
): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title || 'Check out this interactive story!');
  const encodedDesc = encodeURIComponent(description || '');

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;

    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    case 'reddit':
      return `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;

    default:
      return url;
  }
}

/**
 * Generate email share URL
 */
export function generateEmailShareUrl(
  url: string,
  title?: string,
  description?: string
): string {
  const subject = encodeURIComponent(title || 'Check out this interactive story!');
  const body = encodeURIComponent(
    `${description || 'I wanted to share this interactive story with you.'}\n\n${url}`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Escape HTML characters
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Download file from blob
 */
export function downloadFile(
  data: Blob | string,
  filename: string,
  mimeType = 'application/octet-stream'
): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate shareable link with metadata
 */
export function generateShareableLink(
  baseUrl: string,
  story: { title?: string; author?: string; description?: string }
): string {
  // For now, just return the base URL
  // In the future, this could add query parameters or generate a short URL
  return baseUrl;
}
