/**
 * Asset Manager (GAP-048)
 * Handles asset processing, type detection, and checksum generation
 */

import type {
  AssetMetadata,
  AssetType,
  AssetEmbedding,
  AssetManifest,
} from './types';

/**
 * MIME type to asset type mapping
 */
const MIME_TO_ASSET_TYPE: Record<string, AssetType> = {
  // Images
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  // Audio
  'audio/mpeg': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'audio/flac': 'audio',
  'audio/webm': 'audio',
  // Video
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  // Fonts
  'font/woff': 'font',
  'font/woff2': 'font',
  'font/ttf': 'font',
  'font/otf': 'font',
  'application/font-woff': 'font',
  'application/font-woff2': 'font',
  // Data
  'application/json': 'data',
  'text/csv': 'data',
  'text/plain': 'data',
  'application/xml': 'data',
};

/**
 * Extension to MIME type mapping
 */
const EXT_TO_MIME: Record<string, string> = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'mp3': 'audio/mpeg',
  'ogg': 'audio/ogg',
  'wav': 'audio/wav',
  'flac': 'audio/flac',
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'woff': 'font/woff',
  'woff2': 'font/woff2',
  'ttf': 'font/ttf',
  'otf': 'font/otf',
  'json': 'application/json',
  'csv': 'text/csv',
  'txt': 'text/plain',
  'xml': 'application/xml',
};

/**
 * Asset manager for processing and embedding assets
 */
export class AssetManager {
  private assets: Map<string, AssetMetadata> = new Map();
  private assetCounter: number = 0;

  /**
   * Detect asset type from MIME type or file extension
   */
  public detectAssetType(mimeType: string, path?: string): AssetType {
    if (MIME_TO_ASSET_TYPE[mimeType]) {
      return MIME_TO_ASSET_TYPE[mimeType];
    }

    // Fallback to extension-based detection
    if (path) {
      const ext = path.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
        case 'svg':
          return 'image';
        case 'mp3':
        case 'ogg':
        case 'wav':
        case 'flac':
          return 'audio';
        case 'mp4':
        case 'webm':
          return 'video';
        case 'woff':
        case 'woff2':
        case 'ttf':
        case 'otf':
          return 'font';
        default:
          return 'data';
      }
    }

    return 'data';
  }

  /**
   * Detect MIME type from file extension
   */
  public detectMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    return EXT_TO_MIME[ext || ''] || 'application/octet-stream';
  }

  /**
   * Calculate SHA-256 checksum (browser-compatible)
   * Uses SubtleCrypto when available, falls back to a simple hash otherwise
   */
  public async calculateChecksum(data: Uint8Array | Buffer): Promise<string> {
    // Ensure we have a Uint8Array
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Try to use SubtleCrypto if available (browser/Node 15+)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Create a new ArrayBuffer to ensure compatibility with SubtleCrypto
      const buffer = new ArrayBuffer(bytes.length);
      const view = new Uint8Array(buffer);
      view.set(bytes);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `sha256:${hashHex}`;
    }

    // Fallback: simple checksum for environments without SubtleCrypto
    // This is a simplified hash, not cryptographically secure
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash + bytes[i]) | 0;
    }
    return `simple:${Math.abs(hash).toString(16)}`;
  }

  /**
   * Calculate checksum synchronously (for Node.js environments)
   */
  public calculateChecksumSync(data: Uint8Array | Buffer): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Simple hash fallback
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash + bytes[i]) | 0;
    }
    return `simple:${Math.abs(hash).toString(16)}`;
  }

  /**
   * Add asset to manifest
   */
  public async addAsset(
    path: string,
    data: Uint8Array | Buffer,
    options: {
      embedding: AssetEmbedding;
      mimeType?: string;
      altText?: string;
    }
  ): Promise<AssetMetadata> {
    const id = `asset-${String(++this.assetCounter).padStart(3, '0')}`;
    const mimeType = options.mimeType || this.detectMimeType(path);
    const type = this.detectAssetType(mimeType, path);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    const metadata: AssetMetadata = {
      id,
      type,
      path,
      mimeType,
      size: bytes.length,
      checksum: await this.calculateChecksum(bytes),
      embedding: options.embedding,
      filename: path.split('/').pop(),
      altText: options.altText,
    };

    if (options.embedding === 'base64') {
      // Convert to base64
      metadata.data = this.bytesToBase64(bytes);
    }

    this.assets.set(id, metadata);
    return metadata;
  }

  /**
   * Add asset synchronously (without async checksum)
   */
  public addAssetSync(
    path: string,
    data: Uint8Array | Buffer,
    options: {
      embedding: AssetEmbedding;
      mimeType?: string;
      altText?: string;
    }
  ): AssetMetadata {
    const id = `asset-${String(++this.assetCounter).padStart(3, '0')}`;
    const mimeType = options.mimeType || this.detectMimeType(path);
    const type = this.detectAssetType(mimeType, path);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    const metadata: AssetMetadata = {
      id,
      type,
      path,
      mimeType,
      size: bytes.length,
      checksum: this.calculateChecksumSync(bytes),
      embedding: options.embedding,
      filename: path.split('/').pop(),
      altText: options.altText,
    };

    if (options.embedding === 'base64') {
      metadata.data = this.bytesToBase64(bytes);
    }

    this.assets.set(id, metadata);
    return metadata;
  }

  /**
   * Convert bytes to base64 string
   */
  private bytesToBase64(bytes: Uint8Array): string {
    // Browser environment
    if (typeof btoa !== 'undefined') {
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    // Node.js environment
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }

    throw new Error('No base64 encoding method available');
  }

  /**
   * Get asset by ID
   */
  public getAsset(id: string): AssetMetadata | undefined {
    return this.assets.get(id);
  }

  /**
   * Get asset by path
   */
  public findAssetByPath(path: string): AssetMetadata | undefined {
    for (const asset of this.assets.values()) {
      if (asset.path === path) {
        return asset;
      }
    }
    return undefined;
  }

  /**
   * Generate complete manifest
   */
  public generateManifest(): AssetManifest {
    const manifest = Array.from(this.assets.values());
    const totalSize = manifest.reduce((sum, a) => sum + a.size, 0);
    const embeddedCount = manifest.filter(a => a.embedding === 'base64').length;
    const referencedCount = manifest.filter(a => a.embedding === 'reference').length;

    return {
      manifest,
      totalSize,
      embeddedCount,
      referencedCount,
    };
  }

  /**
   * Get all assets
   */
  public getAllAssets(): AssetMetadata[] {
    return Array.from(this.assets.values());
  }

  /**
   * Clear all assets
   */
  public clear(): void {
    this.assets.clear();
    this.assetCounter = 0;
  }

  /**
   * Get asset count
   */
  public getAssetCount(): number {
    return this.assets.size;
  }
}
