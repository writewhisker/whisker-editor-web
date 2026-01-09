/**
 * Presentation Validator
 *
 * Validates THEME, STYLE, and rich text formatting.
 * Error codes: WLS-PRS-001 through WLS-PRS-015
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

/**
 * Valid built-in theme names
 */
const VALID_THEMES = new Set([
  'default',
  'dark',
  'classic',
  'minimal',
  'sepia',
  'high-contrast',
  'print',
]);

/**
 * Check if a string is a valid CSS class name
 */
function isValidCssClass(str: string): boolean {
  return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(str);
}

/**
 * Check if a string is a valid CSS color
 */
function isValidCssColor(value: string): boolean {
  // Hex colors
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(value)) {
    return true;
  }
  // RGB/RGBA
  if (/^rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(value)) {
    return true;
  }
  // HSL/HSLA
  if (/^hsla?\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/.test(value)) {
    return true;
  }
  // Named colors
  const namedColors = new Set([
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
    'gray', 'grey', 'orange', 'purple', 'pink', 'brown', 'transparent',
    'inherit', 'currentColor', 'initial', 'unset',
  ]);
  return namedColors.has(value.toLowerCase());
}

/**
 * Check if a string is a valid CSS length
 */
function isValidCssLength(value: string): boolean {
  return /^-?[\d.]+\s*(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|pt|pc|cm|mm|in)?$/.test(value);
}

/**
 * Extended story interface with presentation properties
 */
interface StoryWithPresentation {
  theme?: string;
  styles?: Record<string, string>;
  passages?: Map<string, { name: string; content?: string }> | Record<string, { name: string; content?: string }>;
}

export class WlsPresentationValidator implements Validator {
  name = 'wls_presentation';
  category = 'presentation' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate THEME directive
    issues.push(...this.validateTheme(story));

    // Validate STYLE properties
    issues.push(...this.validateStyles(story));

    // Validate CSS classes in content
    issues.push(...this.validateCssClasses(story));

    // Validate markdown formatting
    issues.push(...this.validateMarkdown(story));

    // Validate media references (images, audio, video)
    issues.push(...this.validateMediaReferences(story));

    // Validate accessibility
    issues.push(...this.validateAccessibility(story));

    // Validate style consistency
    issues.push(...this.validateStyleConsistency(story));

    return issues;
  }

  private validateTheme(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithPresentation = story as unknown as StoryWithPresentation;
    const themeName = storyWithPresentation.theme;

    if (!themeName) {
      return issues;
    }

    // Check if it's a valid theme name format
    if (!VALID_THEMES.has(themeName) && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(themeName)) {
      issues.push({
        id: `invalid_theme_${themeName}`,
        code: 'WLS-PRS-004',
        severity: 'error',
        category: 'presentation',
        message: `Invalid theme: "${themeName}"`,
        description: 'Unknown or invalid theme name.',
        context: { themeName },
        fixable: false,
      });
    }

    return issues;
  }

  private validateStyles(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithPresentation = story as unknown as StoryWithPresentation;
    const styles = storyWithPresentation.styles;

    if (!styles || typeof styles !== 'object') {
      return issues;
    }

    // Valid standard properties
    const validProperties = new Set([
      // Color properties
      '--bg-color',
      '--text-color',
      '--accent-color',
      '--link-color',
      '--choice-bg',
      '--choice-hover',
      '--error-color',
      '--warning-color',
      '--success-color',
      // Typography
      '--font-family',
      '--font-size',
      '--line-height',
      '--heading-font',
      // Spacing
      '--passage-padding',
      '--choice-gap',
      '--paragraph-margin',
      // Standard properties
      'passage-font',
      'choice-style',
    ]);

    for (const prop of Object.keys(styles)) {
      // Custom properties (--name) are always allowed
      if (!prop.startsWith('--') && !validProperties.has(prop)) {
        issues.push({
          id: `invalid_style_prop_${prop.replace(/[^a-zA-Z0-9]/g, '_')}`,
          code: 'WLS-PRS-007',
          severity: 'warning',
          category: 'presentation',
          message: `Invalid style property: "${prop}"`,
          description: 'Unknown CSS custom property in STYLE block.',
          context: { property: prop },
          fixable: false,
        });
      }
    }

    return issues;
  }

  private validateCssClasses(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithPresentation = story as unknown as StoryWithPresentation;
    const passages = storyWithPresentation.passages;

    if (!passages) {
      return issues;
    }

    // Handle both Map and Object passage storage
    const passageEntries = passages instanceof Map
      ? Array.from(passages.entries())
      : Object.entries(passages);

    for (const [passageId, passage] of passageEntries) {
      if (!passage.content) continue;

      // Look for .class { patterns
      const blockClassPattern = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g;
      let match;
      while ((match = blockClassPattern.exec(passage.content)) !== null) {
        const className = match[1];
        if (!isValidCssClass(className)) {
          issues.push({
            id: `invalid_class_${passageId}_${className}`,
            code: 'WLS-PRS-002',
            severity: 'error',
            category: 'presentation',
            message: `Invalid CSS class name: "${className}"`,
            description: 'CSS class names must start with a letter or hyphen and contain only alphanumerics, hyphens, and underscores.',
            passageId,
            context: { className },
            fixable: false,
          });
        }
      }

      // Look for [.class patterns
      const inlineClassPattern = /\[\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s/g;
      while ((match = inlineClassPattern.exec(passage.content)) !== null) {
        const className = match[1];
        if (!isValidCssClass(className)) {
          issues.push({
            id: `invalid_inline_class_${passageId}_${className}`,
            code: 'WLS-PRS-002',
            severity: 'error',
            category: 'presentation',
            message: `Invalid CSS class name: "${className}"`,
            description: 'CSS class names must start with a letter or hyphen and contain only alphanumerics, hyphens, and underscores.',
            passageId,
            context: { className },
            fixable: false,
          });
        }
      }
    }

    return issues;
  }

  private validateMarkdown(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithPresentation = story as unknown as StoryWithPresentation;
    const passages = storyWithPresentation.passages;

    if (!passages) {
      return issues;
    }

    // Handle both Map and Object passage storage
    const passageEntries = passages instanceof Map
      ? Array.from(passages.entries())
      : Object.entries(passages);

    for (const [passageId, passage] of passageEntries) {
      if (!passage.content) continue;

      const content = passage.content;

      // Check for unclosed bold markers
      const boldCount = (content.match(/\*\*/g) || []).length;
      if (boldCount % 2 !== 0) {
        issues.push({
          id: `unclosed_bold_${passageId}`,
          code: 'WLS-PRS-006',
          severity: 'error',
          category: 'presentation',
          message: 'Unclosed formatting: **',
          description: 'Formatting markers like ** or * must be closed.',
          passageId,
          context: { marker: '**' },
          fixable: false,
        });
      }

      // Check for unclosed code markers
      const codeCount = (content.match(/`/g) || []).length;
      if (codeCount % 2 !== 0) {
        issues.push({
          id: `unclosed_code_${passageId}`,
          code: 'WLS-PRS-006',
          severity: 'error',
          category: 'presentation',
          message: 'Unclosed formatting: `',
          description: 'Formatting markers like ** or * must be closed.',
          passageId,
          context: { marker: '`' },
          fixable: false,
        });
      }

      // Check for deeply nested blockquotes
      let maxDepth = 0;
      for (const line of content.split('\n')) {
        const prefix = line.match(/^([>\s]+)/);
        if (prefix) {
          const depth = (prefix[1].match(/>/g) || []).length;
          if (depth > maxDepth) {
            maxDepth = depth;
          }
        }
      }

      if (maxDepth > 3) {
        issues.push({
          id: `deep_blockquote_${passageId}`,
          code: 'WLS-PRS-008',
          severity: 'warning',
          category: 'presentation',
          message: `Blockquote nesting exceeds recommended depth (${maxDepth})`,
          description: 'Deeply nested blockquotes may affect readability.',
          passageId,
          context: { depth: maxDepth },
          fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Validate media references (WLS-PRS-009, WLS-PRS-010, WLS-PRS-011)
   */
  private validateMediaReferences(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithPresentation = story as unknown as StoryWithPresentation;
    const passages = storyWithPresentation.passages;

    if (!passages) {
      return issues;
    }

    // Handle both Map and Object passage storage
    const passageEntries = passages instanceof Map
      ? Array.from(passages.entries())
      : Object.entries(passages);

    // Pattern for image references: ![alt](url) or {image: url}
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)|\{image:\s*([^}]+)\}/g;
    // Pattern for audio references: {audio: url} or {sound: url}
    const audioPattern = /\{(audio|sound):\s*([^}]+)\}/g;
    // Pattern for video references: {video: url}
    const videoPattern = /\{video:\s*([^}]+)\}/g;

    for (const [passageId, passage] of passageEntries) {
      if (!passage.content) continue;
      const content = passage.content;

      // Validate images
      let match;
      while ((match = imagePattern.exec(content)) !== null) {
        const altText = match[1];
        const url = match[2] || match[3];

        // Check for empty or placeholder URLs
        if (!url || url.trim() === '' || url === 'url' || url === 'path') {
          issues.push({
            id: `invalid_image_url_${passageId}`,
            code: 'WLS-PRS-009',
            severity: 'error',
            category: 'presentation',
            message: 'Invalid image URL',
            description: 'Image reference has an empty or placeholder URL.',
            passageId,
            context: { url },
            fixable: false,
          });
        }

        // WLS-PRS-003: Check for missing/broken media (simple validation)
        if (url && url.startsWith('./') && !url.includes('{{')) {
          // Local relative path - warn about potential missing asset
          issues.push({
            id: `potentially_missing_media_${passageId}_${match.index}`,
            code: 'WLS-PRS-003',
            severity: 'info',
            category: 'presentation',
            message: `Local media reference: "${url}"`,
            description: 'Local file reference detected. Ensure the file exists at build time.',
            passageId,
            context: { path: url },
            fixable: false,
          });
        }

        // Check for missing alt text (accessibility)
        if (altText !== undefined && altText.trim() === '') {
          issues.push({
            id: `missing_alt_text_${passageId}`,
            code: 'WLS-PRS-012',
            severity: 'warning',
            category: 'presentation',
            message: 'Image missing alt text',
            description: 'Images should have descriptive alt text for accessibility.',
            passageId,
            context: { url },
            suggestion: 'Add descriptive alt text between the brackets: ![description](url)',
            fixable: false,
          });
        }
      }

      // Validate audio references
      while ((match = audioPattern.exec(content)) !== null) {
        const url = match[2];

        if (!url || url.trim() === '' || url === 'url' || url === 'path') {
          issues.push({
            id: `invalid_audio_url_${passageId}`,
            code: 'WLS-PRS-010',
            severity: 'error',
            category: 'presentation',
            message: 'Invalid audio URL',
            description: 'Audio reference has an empty or placeholder URL.',
            passageId,
            context: { url },
            fixable: false,
          });
        }
      }

      // Validate video references
      while ((match = videoPattern.exec(content)) !== null) {
        const url = match[1];

        if (!url || url.trim() === '' || url === 'url' || url === 'path') {
          issues.push({
            id: `invalid_video_url_${passageId}`,
            code: 'WLS-PRS-011',
            severity: 'error',
            category: 'presentation',
            message: 'Invalid video URL',
            description: 'Video reference has an empty or placeholder URL.',
            passageId,
            context: { url },
            fixable: false,
          });
        }
      }

      // WLS-PRS-005: Check for invalid media attributes
      const mediaAttrPattern = /\{(image|audio|video|sound):\s*[^}]+\s+(\w+)=[^}]*\}/g;
      const validMediaAttrs = new Set([
        'alt', 'width', 'height', 'loop', 'autoplay', 'muted', 'controls',
        'poster', 'preload', 'volume', 'playbackRate', 'src', 'type',
      ]);

      while ((match = mediaAttrPattern.exec(content)) !== null) {
        const mediaType = match[1];
        const attrName = match[2];

        if (!validMediaAttrs.has(attrName.toLowerCase())) {
          issues.push({
            id: `invalid_media_attr_${passageId}_${match.index}`,
            code: 'WLS-PRS-005',
            severity: 'warning',
            category: 'presentation',
            message: `Unknown ${mediaType} attribute: "${attrName}"`,
            description: `"${attrName}" is not a recognized media attribute.`,
            passageId,
            context: { attribute: attrName, mediaType },
            fixable: false,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate accessibility (WLS-PRS-012, WLS-PRS-013, WLS-PRS-014)
   */
  private validateAccessibility(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithPresentation = story as unknown as StoryWithPresentation;
    const passages = storyWithPresentation.passages;

    if (!passages) {
      return issues;
    }

    // Handle both Map and Object passage storage
    const passageEntries = passages instanceof Map
      ? Array.from(passages.entries())
      : Object.entries(passages);

    for (const [passageId, passage] of passageEntries) {
      if (!passage.content) continue;
      const content = passage.content;

      // Check for very long paragraphs (accessibility/readability issue)
      const paragraphs = content.split(/\n\n+/);
      for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i].trim();
        const wordCount = para.split(/\s+/).filter(w => w.length > 0).length;

        if (wordCount > 150) {
          issues.push({
            id: `long_paragraph_${passageId}_${i}`,
            code: 'WLS-PRS-013',
            severity: 'info',
            category: 'presentation',
            message: `Long paragraph (${wordCount} words)`,
            description: 'Very long paragraphs may reduce readability. Consider breaking into smaller paragraphs.',
            passageId,
            context: { wordCount, paragraphIndex: i },
            fixable: false,
          });
        }
      }

      // Check for color contrast issues in inline styles
      const inlineStylePattern = /style\s*=\s*["']([^"']+)["']/gi;
      let match;
      while ((match = inlineStylePattern.exec(content)) !== null) {
        const style = match[1];

        // Check for text color without background or vice versa
        const hasColor = /\bcolor\s*:/i.test(style);
        const hasBgColor = /background(-color)?\s*:/i.test(style);

        if (hasColor && !hasBgColor) {
          issues.push({
            id: `color_without_bg_${passageId}`,
            code: 'WLS-PRS-014',
            severity: 'info',
            category: 'presentation',
            message: 'Text color set without background color',
            description: 'Setting text color without background color may cause contrast issues in different themes.',
            passageId,
            context: { style },
            suggestion: 'Consider setting both color and background-color for consistent contrast.',
            fixable: false,
          });
        }
      }

      // Check for heading hierarchy (accessibility)
      const headingPattern = /^(#{1,6})\s/gm;
      const headings: number[] = [];
      while ((match = headingPattern.exec(content)) !== null) {
        headings.push(match[1].length);
      }

      // Check for skipped heading levels
      for (let i = 1; i < headings.length; i++) {
        if (headings[i] > headings[i - 1] + 1) {
          issues.push({
            id: `skipped_heading_level_${passageId}`,
            code: 'WLS-PRS-015',
            severity: 'warning',
            category: 'presentation',
            message: 'Skipped heading level',
            description: `Heading level jumped from ${headings[i - 1]} to ${headings[i]}. Heading hierarchy should be sequential.`,
            passageId,
            context: {
              previousLevel: headings[i - 1],
              currentLevel: headings[i],
            },
            fixable: false,
          });
          break; // Only report first instance per passage
        }
      }
    }

    return issues;
  }

  /**
   * Validate style consistency across the story
   */
  private validateStyleConsistency(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithPresentation = story as unknown as StoryWithPresentation;
    const styles = storyWithPresentation.styles;

    if (!styles || typeof styles !== 'object') {
      return issues;
    }

    // Validate color values
    const colorProps = ['--bg-color', '--text-color', '--accent-color', '--link-color',
      '--choice-bg', '--choice-hover', '--error-color', '--warning-color', '--success-color'];

    for (const prop of colorProps) {
      const value = styles[prop];
      if (value && !isValidCssColor(value)) {
        issues.push({
          id: `invalid_color_${prop.replace(/[^a-zA-Z0-9]/g, '_')}`,
          code: 'WLS-PRS-007',
          severity: 'warning',
          category: 'presentation',
          message: `Invalid color value for ${prop}`,
          description: `"${value}" is not a valid CSS color.`,
          context: { property: prop, value },
          fixable: false,
        });
      }
    }

    // Validate length values
    const lengthProps = ['--font-size', '--line-height', '--passage-padding',
      '--choice-gap', '--paragraph-margin'];

    for (const prop of lengthProps) {
      const value = styles[prop];
      if (value && !isValidCssLength(value) && !/^[\d.]+$/.test(value)) {
        issues.push({
          id: `invalid_length_${prop.replace(/[^a-zA-Z0-9]/g, '_')}`,
          code: 'WLS-PRS-007',
          severity: 'warning',
          category: 'presentation',
          message: `Invalid length value for ${prop}`,
          description: `"${value}" is not a valid CSS length.`,
          context: { property: prop, value },
          fixable: false,
        });
      }
    }

    return issues;
  }
}
