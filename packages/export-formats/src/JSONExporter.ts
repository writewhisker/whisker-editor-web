import type {
  StoryData,
  Exporter,
  ExportOptions,
  AssetExportOptions,
  AssetManifest,
  AssetEmbedding,
  StoryAsset,
  Passage,
} from './types';
import { AssetManager } from './AssetManager';

/**
 * Extended JSON export data with WLS version and assets (GAP-048)
 */
export interface JSONExportData extends Omit<StoryData, 'assets'> {
  wls: string;
  format_version: string;
  exportedAt: string;
  assets?: AssetManifest;
}

/**
 * JSON Exporter with asset support (GAP-048)
 */
export class JSONExporter implements Exporter {
  private assetManager: AssetManager;

  constructor() {
    this.assetManager = new AssetManager();
  }

  public async export(
    data: StoryData,
    options: AssetExportOptions = { format: 'json' }
  ): Promise<string> {
    // Reset asset manager
    this.assetManager.clear();

    // Process assets if provided
    if (data.assets && data.assets.length > 0) {
      await this.processAssets(data.assets, options);
    }

    // Scan passages for asset references
    this.scanPassagesForAssets(data.passages, options);

    const exportData: JSONExportData = {
      wls: '1.0.0',
      format_version: '1.0',
      title: data.title,
      author: data.author,
      passages: data.passages,
      metadata: data.metadata,
      exportedAt: new Date().toISOString(),
    };

    // Add asset manifest if any assets found
    const manifest = this.assetManager.generateManifest();
    if (manifest.manifest.length > 0) {
      exportData.assets = manifest;
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Process provided assets
   */
  private async processAssets(
    assets: StoryAsset[],
    options: AssetExportOptions
  ): Promise<void> {
    for (const asset of assets) {
      if (asset.data) {
        const bytes = asset.data instanceof Uint8Array
          ? asset.data
          : new Uint8Array(asset.data);
        const embedding = this.determineEmbedding(bytes.length, options);
        await this.assetManager.addAsset(asset.path, bytes, {
          embedding,
          mimeType: asset.mimeType,
          altText: asset.altText,
        });
      }
    }
  }

  /**
   * Determine embedding strategy based on options and size
   */
  private determineEmbedding(
    size: number,
    options: AssetExportOptions
  ): AssetEmbedding {
    const strategy = options.assetEmbedding || 'reference';
    const threshold = options.assetSizeThreshold || 100 * 1024; // 100KB default

    if (strategy === 'base64') return 'base64';
    if (strategy === 'reference') return 'reference';
    // Mixed mode: embed if under threshold
    return size <= threshold ? 'base64' : 'reference';
  }

  /**
   * Scan passage content for asset references
   */
  private scanPassagesForAssets(
    passages: Passage[],
    _options: AssetExportOptions
  ): void {
    // Regex to find asset references in content
    // Matches: ![alt](src) or <img src="..."> or <audio src="..."> or <video src="...">
    const assetRegex = /!\[([^\]]*)\]\(([^)]+)\)|<(?:img|audio|video)[^>]+src=["']([^"']+)["']/gi;

    for (const passage of passages) {
      let match;
      while ((match = assetRegex.exec(passage.content)) !== null) {
        const assetPath = match[2] || match[3];
        if (assetPath && !assetPath.startsWith('http://') && !assetPath.startsWith('https://')) {
          // Local asset reference found
          const existing = this.assetManager.findAssetByPath(assetPath);
          if (!existing) {
            // Note: We can't actually read the file here without file system access
            // This just records that an asset reference was found
            // In a real implementation, the caller would provide asset data
          }
        }
      }
    }
  }

  public getFileExtension(): string {
    return 'json';
  }

  public getMimeType(): string {
    return 'application/json';
  }

  /**
   * Get the asset manager for direct asset manipulation
   */
  public getAssetManager(): AssetManager {
    return this.assetManager;
  }
}
