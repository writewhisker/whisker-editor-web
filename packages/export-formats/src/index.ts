export { HTMLExporter } from './HTMLExporter';
export { JSONExporter, type JSONExportData } from './JSONExporter';
export { TextExporter, storyToText, formatPassage } from './TextExporter';  // GAP-049
export { AssetManager } from './AssetManager';  // GAP-048

// Export all types
export type {
  StoryData,
  Passage,
  ExportOptions,
  Exporter,
  // GAP-048: Asset types
  AssetType,
  AssetEmbedding,
  AssetMetadata,
  AssetManifest,
  AssetExportOptions,
  StoryAsset,
  // GAP-049: Text export types
  TextExportOptions,
} from './types';
