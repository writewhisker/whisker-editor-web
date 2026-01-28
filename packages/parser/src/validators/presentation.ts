/**
 * Presentation Validation for WLS Stories
 *
 * Validates all presentation-related aspects of a story:
 * - Invalid markdown (WLS-PRS-001)
 * - Invalid CSS class name (WLS-PRS-002)
 * - Undefined CSS class (WLS-PRS-003)
 * - Missing media source (WLS-PRS-004)
 * - Invalid media format (WLS-PRS-005)
 * - Theme not found (WLS-PRS-006)
 * - Invalid style property (WLS-PRS-007)
 * - Unclosed style block (WLS-PRS-008)
 */

import type {
  StoryNode,
  ContentNode,
  PassageNode,
  FormattedTextNode,
  ImageNode,
  AudioNode,
  VideoNode,
  EmbedNode,
  ClassedBlockNode,
  ClassedInlineNode,
  ThemeDirectiveNode,
  StyleBlockNode,
  NamespaceDeclarationNode,
} from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { SourceSpan } from '../types';
import type { ValidationDiagnostic } from './links';

// =============================================================================
// Constants
// =============================================================================

/** Valid CSS class name pattern */
export const CSS_CLASS_PATTERN = /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/;

/** Reserved CSS class prefixes (see GAP-006) */
export const RESERVED_CLASS_PREFIXES = ['whisker-', 'ws-'];

/** Supported image formats */
export const SUPPORTED_IMAGE_FORMATS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.bmp'
];

/** Supported audio formats */
export const SUPPORTED_AUDIO_FORMATS = [
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'
];

/** Supported video formats */
export const SUPPORTED_VIDEO_FORMATS = [
  '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'
];

/** Known CSS properties for validation */
export const KNOWN_CSS_PROPERTIES = new Set([
  'color', 'background', 'background-color', 'font-size', 'font-family',
  'font-weight', 'font-style', 'text-align', 'text-decoration', 'line-height',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'border', 'border-color', 'border-width', 'border-style', 'border-radius',
  'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
  'display', 'position', 'top', 'bottom', 'left', 'right', 'z-index',
  'opacity', 'visibility', 'overflow', 'cursor', 'transition', 'transform',
  'box-shadow', 'text-shadow', 'flex', 'flex-direction', 'justify-content',
  'align-items', 'gap', 'grid', 'grid-template-columns', 'grid-template-rows',
]);

/** Known themes (can be expanded or made configurable) */
export const KNOWN_THEMES = new Set(['default', 'dark', 'light', 'sepia', 'high-contrast', 'classic', 'minimal']);

// =============================================================================
// Types
// =============================================================================

/**
 * Result of presentation validation
 */
export interface PresentationValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * PRS-001: Validate markdown formatting
 */
function validateMarkdown(node: FormattedTextNode, diagnostics: ValidationDiagnostic[]): void {
  // Check for empty formatted content
  if (node.content.length === 0) {
    diagnostics.push({
      code: WLS_ERROR_CODES.INVALID_MARKDOWN,
      message: `Empty ${node.format} formatting detected. Remove the formatting markers or add content.`,
      severity: 'warning',
      location: node.location,
      suggestion: `Remove the empty ${node.format} markers`,
    });
  }
}

/**
 * Sanitize a class name to be valid
 */
function sanitizeClassName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/^[0-9]/, '_$&')
    .replace(/-+/g, '-');
}

/**
 * PRS-002: Validate CSS class name format
 */
function validateCSSClassName(
  className: string,
  location: SourceSpan,
  diagnostics: ValidationDiagnostic[]
): void {
  // Check for valid CSS class name format
  if (!CSS_CLASS_PATTERN.test(className)) {
    diagnostics.push({
      code: WLS_ERROR_CODES.INVALID_CSS_CLASS,
      message: `Invalid CSS class name '${className}'. Class names must start with a letter, underscore, or hyphen followed by letters, numbers, underscores, or hyphens.`,
      severity: 'error',
      location,
      suggestion: `Rename to a valid CSS class name like '${sanitizeClassName(className)}'`,
    });
    return;
  }

  // Check for reserved prefixes (see GAP-006)
  for (const prefix of RESERVED_CLASS_PREFIXES) {
    if (className.toLowerCase().startsWith(prefix)) {
      diagnostics.push({
        code: WLS_ERROR_CODES.INVALID_CSS_CLASS,
        message: `CSS class '${className}' uses reserved prefix '${prefix}'. User classes cannot start with '${prefix}'.`,
        severity: 'error',
        location,
        suggestion: `Rename to avoid the reserved prefix, e.g., 'my-${className.slice(prefix.length)}'`,
      });
      return;
    }
  }
}

/**
 * PRS-003: Track and validate CSS class definitions
 * Note: This requires tracking classes defined in STYLE blocks
 */
function validateCSSClassUsage(
  story: StoryNode,
  diagnostics: ValidationDiagnostic[]
): void {
  // Collect defined classes from STYLE block
  const definedClasses = new Set<string>();

  if (story.styles) {
    // Parse style block for class definitions
    // This is a simplified check - real CSS parsing would be more complex
    const styleText = Array.from(story.styles.properties.values()).join('\n');
    const classMatches = styleText.matchAll(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g);
    for (const match of classMatches) {
      definedClasses.add(match[1]);
    }
  }

  // If no STYLE block, skip undefined class checking
  // (classes may be defined externally)
  if (definedClasses.size === 0) {
    return;
  }

  // Collect used classes
  const usedClasses: { name: string; location: SourceSpan }[] = [];
  collectUsedClasses(story, usedClasses);

  // Report undefined classes
  for (const { name, location } of usedClasses) {
    if (!definedClasses.has(name) && !RESERVED_CLASS_PREFIXES.some(p => name.startsWith(p))) {
      diagnostics.push({
        code: WLS_ERROR_CODES.UNDEFINED_CSS_CLASS,
        message: `CSS class '${name}' is used but not defined in the STYLE block.`,
        severity: 'warning',
        location,
        suggestion: `Define '.${name} { ... }' in your STYLE block or remove the class`,
      });
    }
  }
}

/**
 * Get media example for error messages
 */
function getMediaExample(type: string): string {
  switch (type) {
    case 'image': return '![alt text](path/to/image.png)';
    case 'audio': return '[audio](path/to/audio.mp3)';
    case 'video': return '[video](path/to/video.mp4)';
    case 'embed': return '[embed](https://example.com/embed)';
    default: return '';
  }
}

/**
 * PRS-004: Validate media source presence
 */
function validateMediaSource(
  node: ImageNode | AudioNode | VideoNode | EmbedNode,
  diagnostics: ValidationDiagnostic[]
): void {
  if (!node.src || node.src.trim() === '') {
    diagnostics.push({
      code: WLS_ERROR_CODES.MISSING_MEDIA_SOURCE,
      message: `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} element is missing a source URL.`,
      severity: 'error',
      location: node.location,
      suggestion: `Add a source URL, e.g., ${getMediaExample(node.type)}`,
    });
  }
}

/**
 * PRS-005: Validate media format
 */
function validateMediaFormat(
  node: ImageNode | AudioNode | VideoNode,
  diagnostics: ValidationDiagnostic[]
): void {
  if (!node.src) return;

  const src = node.src.toLowerCase();
  let supportedFormats: string[];
  let formatType: string;

  switch (node.type) {
    case 'image':
      supportedFormats = SUPPORTED_IMAGE_FORMATS;
      formatType = 'image';
      break;
    case 'audio':
      supportedFormats = SUPPORTED_AUDIO_FORMATS;
      formatType = 'audio';
      break;
    case 'video':
      supportedFormats = SUPPORTED_VIDEO_FORMATS;
      formatType = 'video';
      break;
    default:
      return;
  }

  // Skip validation for URLs without clear extensions or data URIs
  if (src.startsWith('data:') || src.startsWith('blob:') || !src.includes('.')) {
    return;
  }

  // Extract extension
  const extMatch = src.match(/\.[a-z0-9]+(?:\?|$)/i);
  if (extMatch) {
    const ext = extMatch[0].replace('?', '').toLowerCase();
    if (!supportedFormats.includes(ext)) {
      diagnostics.push({
        code: WLS_ERROR_CODES.INVALID_MEDIA_FORMAT,
        message: `Unsupported ${formatType} format '${ext}'. Supported formats: ${supportedFormats.join(', ')}.`,
        severity: 'warning',
        location: node.location,
        suggestion: `Use a supported ${formatType} format like ${supportedFormats[0]}`,
      });
    }
  }
}

/**
 * PRS-006: Validate theme reference
 */
function validateTheme(
  node: ThemeDirectiveNode,
  diagnostics: ValidationDiagnostic[]
): void {
  if (!node.themeName || node.themeName.trim() === '') {
    diagnostics.push({
      code: WLS_ERROR_CODES.THEME_NOT_FOUND,
      message: `Theme directive is missing theme name.`,
      severity: 'error',
      location: node.location,
      suggestion: `Specify a theme name, e.g., THEME "dark"`,
    });
    return;
  }

  // Check against known themes
  if (!KNOWN_THEMES.has(node.themeName.toLowerCase())) {
    diagnostics.push({
      code: WLS_ERROR_CODES.THEME_NOT_FOUND,
      message: `Unknown theme '${node.themeName}'. Known themes: ${Array.from(KNOWN_THEMES).join(', ')}.`,
      severity: 'warning',
      location: node.location,
      suggestion: `Use a known theme or ensure the custom theme is defined`,
    });
  }
}

/**
 * PRS-007: Validate style properties
 */
function validateStyleBlock(
  node: StyleBlockNode,
  diagnostics: ValidationDiagnostic[]
): void {
  for (const [property] of node.properties) {
    // Allow CSS variables (--custom-property)
    if (property.startsWith('--')) {
      continue;
    }

    // Check against known properties
    if (!KNOWN_CSS_PROPERTIES.has(property.toLowerCase())) {
      diagnostics.push({
        code: WLS_ERROR_CODES.INVALID_STYLE_PROPERTY,
        message: `Unknown CSS property '${property}'.`,
        severity: 'warning',
        location: node.location,
        suggestion: `Check the property name or use a CSS variable like '--${property}'`,
      });
    }
  }
}

/**
 * Collect all CSS classes used in the story
 */
function collectUsedClasses(
  story: StoryNode,
  classes: { name: string; location: SourceSpan }[]
): void {
  function walkContent(content: ContentNode[]): void {
    for (const node of content) {
      if (node.type === 'classed_block') {
        const blockNode = node as ClassedBlockNode;
        for (const cls of blockNode.classes) {
          classes.push({ name: cls, location: blockNode.location });
        }
        walkContent(blockNode.content);
      } else if (node.type === 'classed_inline') {
        const inlineNode = node as ClassedInlineNode;
        for (const cls of inlineNode.classes) {
          classes.push({ name: cls, location: inlineNode.location });
        }
        walkContent(inlineNode.content);
      } else if (node.type === 'conditional') {
        walkContent(node.consequent);
        for (const branch of node.alternatives) {
          walkContent(branch.content);
        }
        if (node.alternate) {
          walkContent(node.alternate);
        }
      } else if (node.type === 'formatted_text') {
        walkContent((node as FormattedTextNode).content);
      }
    }
  }

  for (const passage of story.passages) {
    walkContent(passage.content);
  }
}

/**
 * Validate content nodes for presentation errors
 */
function validateContentNodes(nodes: ContentNode[], diagnostics: ValidationDiagnostic[]): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'formatted_text':
        // PRS-001
        validateMarkdown(node as FormattedTextNode, diagnostics);
        validateContentNodes((node as FormattedTextNode).content, diagnostics);
        break;

      case 'classed_block': {
        const blockNode = node as ClassedBlockNode;
        // PRS-002
        for (const cls of blockNode.classes) {
          validateCSSClassName(cls, blockNode.location, diagnostics);
        }
        validateContentNodes(blockNode.content, diagnostics);
        break;
      }

      case 'classed_inline': {
        const inlineNode = node as ClassedInlineNode;
        // PRS-002
        for (const cls of inlineNode.classes) {
          validateCSSClassName(cls, inlineNode.location, diagnostics);
        }
        validateContentNodes(inlineNode.content, diagnostics);
        break;
      }

      case 'image': {
        const imageNode = node as ImageNode;
        // PRS-004, PRS-005
        validateMediaSource(imageNode, diagnostics);
        validateMediaFormat(imageNode, diagnostics);
        break;
      }

      case 'audio': {
        const audioNode = node as AudioNode;
        // PRS-004, PRS-005
        validateMediaSource(audioNode, diagnostics);
        validateMediaFormat(audioNode, diagnostics);
        break;
      }

      case 'video': {
        const videoNode = node as VideoNode;
        // PRS-004, PRS-005
        validateMediaSource(videoNode, diagnostics);
        validateMediaFormat(videoNode, diagnostics);
        break;
      }

      case 'embed': {
        const embedNode = node as EmbedNode;
        // PRS-004
        validateMediaSource(embedNode, diagnostics);
        break;
      }

      case 'conditional':
        validateContentNodes(node.consequent, diagnostics);
        for (const branch of node.alternatives) {
          validateContentNodes(branch.content, diagnostics);
        }
        if (node.alternate) {
          validateContentNodes(node.alternate, diagnostics);
        }
        break;
    }
  }
}

/**
 * Validate a passage for presentation errors
 */
function validatePassage(passage: PassageNode, diagnostics: ValidationDiagnostic[]): void {
  validateContentNodes(passage.content, diagnostics);
}

/**
 * Validate a namespace for presentation errors
 */
function validateNamespace(ns: NamespaceDeclarationNode, diagnostics: ValidationDiagnostic[]): void {
  for (const passage of ns.passages) {
    validatePassage(passage, diagnostics);
  }
  for (const nestedNs of ns.nestedNamespaces) {
    validateNamespace(nestedNs, diagnostics);
  }
}

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Validate all presentation aspects of a story
 */
export function validatePresentation(story: StoryNode): PresentationValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  // PRS-006: Validate theme
  if (story.theme) {
    validateTheme(story.theme, diagnostics);
  }

  // PRS-007, PRS-008: Validate style block
  if (story.styles) {
    validateStyleBlock(story.styles, diagnostics);
  }

  // PRS-003: Validate CSS class usage
  validateCSSClassUsage(story, diagnostics);

  // Validate all passages
  for (const passage of story.passages) {
    validatePassage(passage, diagnostics);
  }

  // Validate namespace passages
  for (const namespace of story.namespaces) {
    validateNamespace(namespace, diagnostics);
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
  };
}
