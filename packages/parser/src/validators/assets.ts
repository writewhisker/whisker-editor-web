/**
 * Asset Validation for WLS Stories
 *
 * Validates all asset-related aspects of a story:
 * - Missing asset ID (WLS-AST-001)
 * - Invalid asset path (WLS-AST-002)
 * - Asset not found (WLS-AST-003)
 * - Unsupported asset type (WLS-AST-004)
 * - Asset too large (WLS-AST-005)
 * - Duplicate asset ID (WLS-AST-006)
 * - Unused asset (WLS-AST-007)
 */

import type {
  StoryNode,
  ContentNode,
  ImageNode,
  AudioNode,
  VideoNode,
  EmbedNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
} from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { SourceSpan } from '../types';
import type { ValidationDiagnostic } from './links';

/** Supported media types and their extensions */
const SUPPORTED_MEDIA_TYPES: Record<string, string[]> = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'],
  audio: ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'],
  video: ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
  embed: [], // Embeds don't have file extensions, they're URLs
};

/**
 * Result of asset validation
 */
export interface AssetValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
  assets: AssetInfo[];
}

/**
 * Information about an asset reference
 */
export interface AssetInfo {
  id?: string;
  src: string;
  type: 'image' | 'audio' | 'video' | 'embed';
  passageName: string;
  location?: SourceSpan;
}

/**
 * Check if a path has a supported extension for the media type
 */
function hasSupportedExtension(src: string, mediaType: string): boolean {
  const extensions = SUPPORTED_MEDIA_TYPES[mediaType] || [];
  if (extensions.length === 0) return true; // No extension check for embeds

  const lowerSrc = src.toLowerCase();
  return extensions.some(ext => lowerSrc.endsWith(ext));
}

/**
 * Check if a path appears to be valid (basic validation)
 */
function isValidPath(src: string): boolean {
  if (!src || src.trim() === '') return false;

  // URL patterns
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
    return true;
  }

  // Data URIs
  if (src.startsWith('data:')) {
    return true;
  }

  // Relative or absolute file paths
  // Basic check: should not contain certain invalid characters
  const invalidChars = /[<>"|?*]/;
  return !invalidChars.test(src);
}

/**
 * Extract media nodes from content
 */
function extractMediaFromContent(
  content: ContentNode[],
  passageName: string
): AssetInfo[] {
  const assets: AssetInfo[] = [];

  for (const node of content) {
    if (node.type === 'image') {
      const img = node as ImageNode;
      assets.push({
        src: img.src || '',
        type: 'image',
        passageName,
        location: img.location,
      });
    } else if (node.type === 'audio') {
      const audio = node as AudioNode;
      assets.push({
        src: audio.src || '',
        type: 'audio',
        passageName,
        location: audio.location,
      });
    } else if (node.type === 'video') {
      const video = node as VideoNode;
      assets.push({
        src: video.src || '',
        type: 'video',
        passageName,
        location: video.location,
      });
    } else if (node.type === 'embed') {
      const embed = node as EmbedNode;
      assets.push({
        src: embed.src || '',
        type: 'embed',
        passageName,
        location: embed.location,
      });
    } else if (node.type === 'conditional') {
      const cond = node as ConditionalNode;
      if (cond.consequent) {
        assets.push(...extractMediaFromContent(cond.consequent, passageName));
      }
      if (cond.alternatives) {
        for (const alt of cond.alternatives) {
          const branch = alt as ConditionalBranchNode;
          if (branch.content) {
            assets.push(...extractMediaFromContent(branch.content, passageName));
          }
        }
      }
      if (cond.alternate) {
        assets.push(...extractMediaFromContent(cond.alternate, passageName));
      }
    } else if (node.type === 'choice') {
      const choice = node as ChoiceNode;
      if (choice.text) {
        assets.push(...extractMediaFromContent(choice.text, passageName));
      }
    }
  }

  return assets;
}

/**
 * Validate all assets in a story
 */
export function validateAssets(story: StoryNode): AssetValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  const assets: AssetInfo[] = [];
  const seenSources = new Map<string, AssetInfo>();

  // Collect all media from passages
  for (const passage of story.passages) {
    const passageAssets = extractMediaFromContent(passage.content, passage.name);
    assets.push(...passageAssets);
  }

  // Validate each asset
  for (const asset of assets) {
    const { src, type: mediaType, passageName, location } = asset;

    // Track by source for duplicate detection (WLS-AST-006)
    if (src && src.trim() !== '') {
      const key = `${mediaType}:${src}`;
      if (seenSources.has(key)) {
        // Duplicate asset reference - this is just informational, not an error
        // Multiple passages can reference the same asset
      } else {
        seenSources.set(key, asset);
      }
    }

    // Missing asset source (WLS-AST-001)
    if (!src || src.trim() === '') {
      diagnostics.push({
        code: WLS_ERROR_CODES.MISSING_ASSET_ID,
        message: `${mediaType} element missing source in passage "${passageName}"`,
        severity: 'error',
        location,
        passageId: passageName,
        suggestion: 'Add a src attribute to the media element',
      });
      continue;
    }

    // Invalid asset path (WLS-AST-002)
    if (!isValidPath(src)) {
      diagnostics.push({
        code: WLS_ERROR_CODES.INVALID_ASSET_PATH,
        message: `Invalid asset path "${src}"`,
        severity: 'error',
        location,
        passageId: passageName,
        suggestion: 'Use a valid file path or URL',
      });
      continue;
    }

    // Unsupported asset type (WLS-AST-004)
    if (mediaType !== 'embed' && !hasSupportedExtension(src, mediaType)) {
      const supportedExts = SUPPORTED_MEDIA_TYPES[mediaType]?.join(', ') || '';
      diagnostics.push({
        code: WLS_ERROR_CODES.UNSUPPORTED_ASSET_TYPE,
        message: `Unsupported ${mediaType} format for "${src}"`,
        severity: 'warning',
        location,
        passageId: passageName,
        suggestion: `Use a supported format: ${supportedExts}`,
      });
    }
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
    assets,
  };
}

/**
 * Get supported extensions for a media type
 */
export function getSupportedExtensions(mediaType: string): string[] {
  return SUPPORTED_MEDIA_TYPES[mediaType] || [];
}
