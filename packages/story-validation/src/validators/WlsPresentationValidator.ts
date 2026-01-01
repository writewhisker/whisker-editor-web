/**
 * WLS 1.0 Presentation Validator
 *
 * Validates THEME, STYLE, and rich text formatting.
 * Error codes: WLS-PRS-001 through WLS-PRS-008
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
]);

/**
 * Check if a string is a valid CSS class name
 */
function isValidCssClass(str: string): boolean {
  return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(str);
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
}
