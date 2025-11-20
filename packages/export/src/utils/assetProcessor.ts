/**
 * Asset Processing Utilities
 *
 * Handles asset embedding and bundling for story exports.
 */

import type { AssetReference } from '@writewhisker/core-ts';

/**
 * Processed asset with embedding or bundling information
 */
export interface ProcessedAsset {
  id: string;
  type: 'image' | 'audio' | 'video' | 'font' | 'other';
  originalPath: string;
  embeddedData?: string; // Base64 data URL
  bundledPath?: string;  // Relative path for bundled assets
  size: number;
  mimeType: string;
}

/**
 * Asset processing mode
 */
export type AssetMode = 'embed' | 'bundle' | 'external';

/**
 * Asset processor for embedding and bundling
 */
export class AssetProcessor {
  /**
   * Process assets for export
   */
  async processAssets(
    assets: AssetReference[] | undefined,
    mode: AssetMode,
    maxEmbedSize: number = 1024 * 1024 // 1MB default
  ): Promise<ProcessedAsset[]> {
    if (!assets || assets.length === 0) {
      return [];
    }

    const processed: ProcessedAsset[] = [];

    for (const asset of assets) {
      try {
        const processedAsset = await this.processAsset(asset, mode, maxEmbedSize);
        processed.push(processedAsset);
      } catch (error) {
        console.error(`Failed to process asset ${asset.id}:`, error);
        // Keep as external reference on error
        processed.push({
          id: asset.id,
          type: asset.type,
          originalPath: asset.path,
          size: asset.size || 0,
          mimeType: asset.mimeType,
        });
      }
    }

    return processed;
  }

  /**
   * Process a single asset
   */
  private async processAsset(
    asset: AssetReference,
    mode: AssetMode,
    maxEmbedSize: number
  ): Promise<ProcessedAsset> {
    const size = asset.size || 0;

    if (mode === 'embed') {
      // Check if asset is already a data URL
      if (this.isDataUrl(asset.path)) {
        return {
          id: asset.id,
          type: asset.type,
          originalPath: asset.path,
          embeddedData: asset.path,
          size,
          mimeType: asset.mimeType,
        };
      }

      // Embed if size permits
      if (size <= maxEmbedSize) {
        // For browser environment, we assume assets are already data URLs
        // For Node environment, we would fetch and convert
        return {
          id: asset.id,
          type: asset.type,
          originalPath: asset.path,
          embeddedData: asset.path, // Use path as-is if already a data URL
          size,
          mimeType: asset.mimeType,
        };
      } else {
        // Too large, keep as external
        return {
          id: asset.id,
          type: asset.type,
          originalPath: asset.path,
          size,
          mimeType: asset.mimeType,
        };
      }
    } else if (mode === 'bundle') {
      // Bundle as separate file
      const extension = this.getExtension(asset.path, asset.type);
      const filename = `assets/${asset.type}s/${asset.id}${extension}`;
      return {
        id: asset.id,
        type: asset.type,
        originalPath: asset.path,
        bundledPath: filename,
        size,
        mimeType: asset.mimeType,
      };
    } else {
      // Keep external
      return {
        id: asset.id,
        type: asset.type,
        originalPath: asset.path,
        size,
        mimeType: asset.mimeType,
      };
    }
  }

  /**
   * Check if a URL is a data URL
   */
  private isDataUrl(url: string): boolean {
    return url.startsWith('data:');
  }

  /**
   * Get file extension from path or type
   */
  private getExtension(path: string, type: string): string {
    // Try to extract from path
    const match = path.match(/\.([^./?#]+)(?:[?#]|$)/);
    if (match) {
      return `.${match[1]}`;
    }

    // Fall back to type-based extensions
    const extensionMap: Record<string, string> = {
      image: '.png',
      audio: '.mp3',
      video: '.mp4',
      font: '.woff2',
      other: '.bin',
    };

    return extensionMap[type] || '.bin';
  }

  /**
   * Generate asset warnings
   */
  generateWarnings(assets: ProcessedAsset[]): string[] {
    const warnings: string[] = [];

    // Check for external assets
    const externalAssets = assets.filter(a => !a.embeddedData && !a.bundledPath);
    if (externalAssets.length > 0) {
      warnings.push(
        `${externalAssets.length} asset(s) kept as external references (too large to embed). ` +
        `Exported file may not work offline.`
      );
    }

    // Check total embedded size
    const totalEmbeddedSize = assets
      .filter(a => a.embeddedData)
      .reduce((sum, a) => sum + a.size, 0);

    if (totalEmbeddedSize > 5 * 1024 * 1024) { // > 5MB
      warnings.push(
        `Embedded assets total ${(totalEmbeddedSize / 1024 / 1024).toFixed(2)}MB. ` +
        `Large file size may be slow to load.`
      );
    }

    return warnings;
  }

  /**
   * Replace asset URLs in content
   */
  replaceAssetUrls(content: string, assets: ProcessedAsset[]): string {
    let updatedContent = content;

    for (const asset of assets) {
      if (asset.embeddedData) {
        // Replace with embedded data
        updatedContent = updatedContent.replace(
          new RegExp(this.escapeRegex(asset.originalPath), 'g'),
          asset.embeddedData
        );
      } else if (asset.bundledPath) {
        // Replace with bundled path
        updatedContent = updatedContent.replace(
          new RegExp(this.escapeRegex(asset.originalPath), 'g'),
          asset.bundledPath
        );
      }
    }

    return updatedContent;
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
