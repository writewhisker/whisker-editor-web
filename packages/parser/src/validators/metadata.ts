/**
 * Metadata Validation for WLS Stories
 *
 * Validates all metadata-related aspects of a story:
 * - Missing IFID (WLS-META-001)
 * - Invalid IFID format (WLS-META-002)
 * - Invalid dimensions (WLS-META-003)
 * - Reserved metadata key (WLS-META-004)
 * - Duplicate metadata key (WLS-META-005)
 */

import type { StoryNode, MetadataNode } from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { ValidationDiagnostic } from './links';

/** Reserved metadata keys that should not be user-defined */
const RESERVED_KEYS = new Set([
  'ifid',
  'format',
  'format-version',
  'generator',
  'generator-version',
  'zoom',
  '_internal',
  '_system',
  '_whisker',
]);

/** Standard metadata keys with specific validation rules */
const STANDARD_KEYS = new Set([
  'title',
  'author',
  'version',
  'start',
  'ifid',
  'format',
  'width',
  'height',
  'description',
  'license',
  'language',
  'tags',
]);

/** UUID v4 regex pattern for IFID validation */
const IFID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Result of metadata validation
 */
export interface MetadataValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
  metadata: Map<string, string>;
}

/**
 * Check if a string is a valid UUID v4 (IFID format)
 */
function isValidIFID(value: string): boolean {
  return IFID_PATTERN.test(value);
}

/**
 * Check if a dimension value is valid
 */
function isValidDimension(value: string): boolean {
  // Accept positive integers or percentages
  if (/^\d+$/.test(value)) {
    const num = parseInt(value, 10);
    return num > 0 && num <= 10000;
  }
  if (/^\d+%$/.test(value)) {
    const num = parseInt(value, 10);
    return num > 0 && num <= 100;
  }
  // Accept CSS units
  if (/^\d+(px|em|rem|vh|vw)$/.test(value)) {
    return true;
  }
  return false;
}

/**
 * Check if a key uses reserved prefix
 */
function hasReservedPrefix(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return lowerKey.startsWith('_') ||
         lowerKey.startsWith('whisker') ||
         lowerKey.startsWith('wls');
}

/**
 * Extract metadata from story
 */
function extractMetadata(story: StoryNode): Map<string, { value: string; node?: MetadataNode }> {
  const metadata = new Map<string, { value: string; node?: MetadataNode }>();

  // From metadata array
  if (story.metadata && Array.isArray(story.metadata)) {
    for (const item of story.metadata) {
      const metaNode = item as MetadataNode;
      if (metaNode.key && metaNode.value !== undefined) {
        metadata.set(metaNode.key.toLowerCase(), {
          value: String(metaNode.value),
          node: metaNode,
        });
      }
    }
  }

  // Also check for direct properties on story
  const storyAny = story as unknown as Record<string, unknown>;
  for (const key of STANDARD_KEYS) {
    if (key in storyAny && storyAny[key] !== undefined && !metadata.has(key)) {
      metadata.set(key, { value: String(storyAny[key]) });
    }
  }

  return metadata;
}

/**
 * Validate all metadata in a story
 */
export function validateMetadata(story: StoryNode): MetadataValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  const metadataEntries = extractMetadata(story);
  const metadata = new Map<string, string>();
  const seenKeys = new Map<string, boolean>();

  // Check for required IFID (WLS-META-001)
  if (!metadataEntries.has('ifid')) {
    diagnostics.push({
      code: WLS_ERROR_CODES.MISSING_IFID,
      message: 'Story is missing IFID (Interactive Fiction IDentifier)',
      severity: 'warning',
      suggestion: 'Add @ifid: <uuid> to your story header. Generate a UUID v4 for your story.',
    });
  }

  // Validate each metadata entry
  for (const [key, { value, node }] of metadataEntries) {
    const lowerKey = key.toLowerCase();
    metadata.set(lowerKey, value);

    // Check for duplicate keys (WLS-META-005)
    if (seenKeys.has(lowerKey)) {
      diagnostics.push({
        code: WLS_ERROR_CODES.DUPLICATE_META_KEY,
        message: `Duplicate metadata key "${key}"`,
        severity: 'warning',
        location: node?.location,
        suggestion: 'Remove duplicate metadata declaration',
      });
    }
    seenKeys.set(lowerKey, true);

    // Check for reserved key usage (WLS-META-004)
    if (hasReservedPrefix(key) && !RESERVED_KEYS.has(lowerKey)) {
      diagnostics.push({
        code: WLS_ERROR_CODES.RESERVED_META_KEY,
        message: `Metadata key "${key}" uses reserved prefix`,
        severity: 'warning',
        location: node?.location,
        suggestion: 'Avoid using prefixes like _, whisker, or wls for custom metadata',
      });
    }

    // Specific validation for known keys
    switch (lowerKey) {
      case 'ifid':
        // Validate IFID format (WLS-META-002)
        if (!isValidIFID(value)) {
          diagnostics.push({
            code: WLS_ERROR_CODES.INVALID_IFID,
            message: `Invalid IFID format: "${value}"`,
            severity: 'error',
            location: node?.location,
            suggestion: 'IFID must be a valid UUID v4 (e.g., 550e8400-e29b-41d4-a716-446655440000)',
          });
        }
        break;

      case 'width':
      case 'height':
        // Validate dimensions (WLS-META-003)
        if (!isValidDimension(value)) {
          diagnostics.push({
            code: WLS_ERROR_CODES.INVALID_DIMENSIONS,
            message: `Invalid ${key} value: "${value}"`,
            severity: 'warning',
            location: node?.location,
            suggestion: 'Use a positive number, percentage (e.g., 50%), or CSS unit (e.g., 800px)',
          });
        }
        break;

      case 'version':
        // Basic semver-like validation
        if (!/^\d+(\.\d+)*(-[\w.]+)?(\+[\w.]+)?$/.test(value)) {
          diagnostics.push({
            code: WLS_ERROR_CODES.INVALID_IFID, // Reuse for version format
            message: `Invalid version format: "${value}"`,
            severity: 'info',
            location: node?.location,
            suggestion: 'Use semantic versioning (e.g., 1.0.0)',
          });
        }
        break;
    }
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
    metadata,
  };
}

/**
 * Generate a new random IFID (UUID v4)
 */
export function generateIFID(): string {
  // Simple UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
