export interface StoryData {
  title: string;
  author?: string;
  passages: Passage[];
  metadata?: Record<string, any>;
  assets?: StoryAsset[];  // GAP-048: Asset support
}

export interface Passage {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  position?: { x: number; y: number };
  links?: string[];
}

export interface ExportOptions {
  format: 'html' | 'json' | 'markdown' | 'pdf' | 'ws';  // GAP-049: Added 'ws' format
  includeMetadata?: boolean;
  compress?: boolean;
}

export interface Exporter {
  export(data: StoryData, options?: ExportOptions): Promise<string | Blob>;
  getFileExtension(): string;
  getMimeType(): string;
}

// ============================================================================
// GAP-048: Asset Types
// ============================================================================

/**
 * Asset type enumeration
 */
export type AssetType = 'image' | 'audio' | 'video' | 'font' | 'data';

/**
 * Asset embedding strategy
 */
export type AssetEmbedding = 'reference' | 'base64';

/**
 * Individual asset metadata
 */
export interface AssetMetadata {
  /** Unique asset identifier */
  id: string;
  /** Asset type category */
  type: AssetType;
  /** Original file path (relative to story root) */
  path: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** SHA-256 checksum for integrity */
  checksum: string;
  /** How the asset is stored in the export */
  embedding: AssetEmbedding;
  /** Base64-encoded data (if embedded) */
  data?: string;
  /** Original filename */
  filename?: string;
  /** Alt text for images */
  altText?: string;
  /** Duration in seconds (for audio/video) */
  duration?: number;
  /** Dimensions (for images/video) */
  dimensions?: { width: number; height: number };
}

/**
 * Asset manifest in exported JSON
 */
export interface AssetManifest {
  /** List of all assets */
  manifest: AssetMetadata[];
  /** Total size of all assets in bytes */
  totalSize: number;
  /** Count of embedded assets */
  embeddedCount: number;
  /** Count of referenced (external) assets */
  referencedCount: number;
}

/**
 * Extended export options with asset handling
 */
export interface AssetExportOptions extends ExportOptions {
  /** How to handle assets */
  assetEmbedding?: AssetEmbedding | 'mixed';
  /** Size threshold for mixed mode (bytes) */
  assetSizeThreshold?: number;
  /** Generate checksums */
  generateChecksums?: boolean;
  /** Include asset dimensions metadata */
  includeAssetDimensions?: boolean;
  /** Base path for resolving relative asset paths */
  assetBasePath?: string;
}

/**
 * Asset reference in story data
 */
export interface StoryAsset {
  path: string;
  data?: Buffer | Uint8Array;
  mimeType?: string;
  altText?: string;
}

// ============================================================================
// GAP-049: Text Export Types
// ============================================================================

/**
 * Text format export options
 */
export interface TextExportOptions extends ExportOptions {
  /** Indentation string (default: 2 spaces) */
  indent?: string;
  /** Line ending style */
  lineEnding?: 'lf' | 'crlf';
  /** Include blank lines between passages */
  passageSeparator?: boolean;
  /** Sort passages alphabetically */
  sortPassages?: boolean;
  /** Preserve original whitespace where possible */
  preserveWhitespace?: boolean;
}
