/**
 * Presentation Validation Tests (GAP-051)
 *
 * Tests for all PRS error codes:
 * - WLS-PRS-001: Invalid markdown
 * - WLS-PRS-002: Invalid CSS class
 * - WLS-PRS-003: Undefined CSS class
 * - WLS-PRS-004: Missing media source
 * - WLS-PRS-005: Invalid media format
 * - WLS-PRS-006: Theme not found
 * - WLS-PRS-007: Invalid style property
 */

import { describe, it, expect } from 'vitest';
import {
  validatePresentation,
  CSS_CLASS_PATTERN,
  RESERVED_CLASS_PREFIXES,
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
  KNOWN_THEMES,
} from './presentation';
import type { StoryNode, PassageNode, ClassedBlockNode, ImageNode, ThemeDirectiveNode, StyleBlockNode } from '../ast';
import { WLS_ERROR_CODES } from '../ast';

// Helper to create a minimal story with specified content
function createStoryWithPassage(passage: Partial<PassageNode>): StoryNode {
  const defaultLocation = {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
  };

  return {
    type: 'story',
    metadata: [],
    variables: [],
    lists: [],
    arrays: [],
    maps: [],
    includes: [],
    functions: [],
    namespaces: [],
    theme: null,
    styles: null,
    passages: [{
      type: 'passage',
      name: 'Test',
      tags: [],
      metadata: [],
      content: [],
      location: defaultLocation,
      ...passage,
    }],
    threads: [],
    audioDeclarations: [],
    effectDeclarations: [],
    externalDeclarations: [],
    location: defaultLocation,
  };
}

// Helper to create story with classed content
function createStoryWithClass(className: string): StoryNode {
  const location = {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 10, offset: 10 },
  };

  const classedBlock: ClassedBlockNode = {
    type: 'classed_block',
    classes: [className],
    content: [{ type: 'text', value: 'content', location }],
    location,
  };

  return createStoryWithPassage({ content: [classedBlock] });
}

// Helper to create story with image
function createStoryWithImage(src: string, alt: string = 'test'): StoryNode {
  const location = {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 10, offset: 10 },
  };

  const image: ImageNode = {
    type: 'image',
    src,
    alt,
    location,
  };

  return createStoryWithPassage({ content: [image] });
}

// Helper to create story with theme
function createStoryWithTheme(themeName: string): StoryNode {
  const location = {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 10, offset: 10 },
  };

  const theme: ThemeDirectiveNode = {
    type: 'theme_directive',
    themeName,
    location,
  };

  const story = createStoryWithPassage({});
  story.theme = theme;
  return story;
}

// Helper to create story with style block
function createStoryWithStyle(properties: Map<string, string>): StoryNode {
  const location = {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 10, offset: 10 },
  };

  const styles: StyleBlockNode = {
    type: 'style_block',
    properties,
    location,
  };

  const story = createStoryWithPassage({});
  story.styles = styles;
  return story;
}

describe('Presentation Validation (GAP-051)', () => {
  describe('PRS-002: Invalid CSS Class', () => {
    it('should error on class name starting with number', () => {
      const story = createStoryWithClass('123invalid');
      const result = validatePresentation(story);

      expect(result.valid).toBe(false);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: WLS_ERROR_CODES.INVALID_CSS_CLASS,
          severity: 'error',
        })
      );
    });

    it('should error on class name with invalid characters', () => {
      const story = createStoryWithClass('my@class');
      const result = validatePresentation(story);

      expect(result.valid).toBe(false);
      expect(result.diagnostics[0].code).toBe(WLS_ERROR_CODES.INVALID_CSS_CLASS);
    });

    it('should error on reserved prefix whisker-', () => {
      const story = createStoryWithClass('whisker-custom');
      const result = validatePresentation(story);

      expect(result.valid).toBe(false);
      expect(result.diagnostics[0].code).toBe(WLS_ERROR_CODES.INVALID_CSS_CLASS);
      expect(result.diagnostics[0].message).toContain('reserved prefix');
    });

    it('should error on reserved prefix ws-', () => {
      const story = createStoryWithClass('ws-button');
      const result = validatePresentation(story);

      expect(result.valid).toBe(false);
      expect(result.diagnostics[0].code).toBe(WLS_ERROR_CODES.INVALID_CSS_CLASS);
    });

    it('should accept valid class name', () => {
      const story = createStoryWithClass('my-valid-class');
      const result = validatePresentation(story);

      expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.INVALID_CSS_CLASS)).toHaveLength(0);
    });

    it('should accept class name starting with underscore', () => {
      const story = createStoryWithClass('_private');
      const result = validatePresentation(story);

      expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.INVALID_CSS_CLASS)).toHaveLength(0);
    });

    it('should accept class name starting with hyphen', () => {
      const story = createStoryWithClass('-modifier');
      const result = validatePresentation(story);

      expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.INVALID_CSS_CLASS)).toHaveLength(0);
    });
  });

  describe('PRS-004: Missing Media Source', () => {
    it('should error on image without src', () => {
      const story = createStoryWithImage('');
      const result = validatePresentation(story);

      expect(result.valid).toBe(false);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: WLS_ERROR_CODES.MISSING_MEDIA_SOURCE,
          severity: 'error',
        })
      );
    });

    it('should error on image with whitespace-only src', () => {
      const story = createStoryWithImage('   ');
      const result = validatePresentation(story);

      expect(result.valid).toBe(false);
      expect(result.diagnostics[0].code).toBe(WLS_ERROR_CODES.MISSING_MEDIA_SOURCE);
    });

    it('should accept image with valid src', () => {
      const story = createStoryWithImage('path/to/image.png');
      const result = validatePresentation(story);

      expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.MISSING_MEDIA_SOURCE)).toHaveLength(0);
    });
  });

  describe('PRS-005: Invalid Media Format', () => {
    it('should warn on unsupported image format', () => {
      const story = createStoryWithImage('file.tiff');
      const result = validatePresentation(story);

      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: WLS_ERROR_CODES.INVALID_MEDIA_FORMAT,
          severity: 'warning',
        })
      );
    });

    it('should accept supported image formats', () => {
      for (const format of ['.png', '.jpg', '.gif', '.webp', '.svg']) {
        const story = createStoryWithImage(`file${format}`);
        const result = validatePresentation(story);
        expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.INVALID_MEDIA_FORMAT)).toHaveLength(0);
      }
    });

    it('should skip validation for data URIs', () => {
      const story = createStoryWithImage('data:image/png;base64,ABC123');
      const result = validatePresentation(story);

      expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.INVALID_MEDIA_FORMAT)).toHaveLength(0);
    });

    it('should skip validation for URLs without extension', () => {
      const story = createStoryWithImage('https://example.com/image');
      const result = validatePresentation(story);

      expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.INVALID_MEDIA_FORMAT)).toHaveLength(0);
    });
  });

  describe('PRS-006: Theme Not Found', () => {
    it('should error on missing theme name', () => {
      const story = createStoryWithTheme('');
      const result = validatePresentation(story);

      expect(result.valid).toBe(false);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: WLS_ERROR_CODES.THEME_NOT_FOUND,
          severity: 'error',
        })
      );
    });

    it('should warn on unknown theme', () => {
      const story = createStoryWithTheme('unknown-theme');
      const result = validatePresentation(story);

      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: WLS_ERROR_CODES.THEME_NOT_FOUND,
          severity: 'warning',
        })
      );
    });

    it('should accept known themes', () => {
      for (const theme of ['dark', 'light', 'default', 'sepia']) {
        const story = createStoryWithTheme(theme);
        const result = validatePresentation(story);
        expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.THEME_NOT_FOUND)).toHaveLength(0);
      }
    });
  });

  describe('PRS-007: Invalid Style Property', () => {
    it('should warn on unknown CSS property', () => {
      const props = new Map([['unknownprop', 'value']]);
      const story = createStoryWithStyle(props);
      const result = validatePresentation(story);

      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: WLS_ERROR_CODES.INVALID_STYLE_PROPERTY,
          severity: 'warning',
        })
      );
    });

    it('should accept known CSS properties', () => {
      const props = new Map([
        ['color', 'red'],
        ['background-color', 'white'],
        ['font-size', '16px'],
      ]);
      const story = createStoryWithStyle(props);
      const result = validatePresentation(story);

      expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.INVALID_STYLE_PROPERTY)).toHaveLength(0);
    });

    it('should accept CSS variables (--custom)', () => {
      const props = new Map([['--custom-color', '#fff']]);
      const story = createStoryWithStyle(props);
      const result = validatePresentation(story);

      expect(result.diagnostics.filter(d => d.code === WLS_ERROR_CODES.INVALID_STYLE_PROPERTY)).toHaveLength(0);
    });
  });

  describe('CSS_CLASS_PATTERN constant', () => {
    it('should match valid class names', () => {
      expect(CSS_CLASS_PATTERN.test('valid')).toBe(true);
      expect(CSS_CLASS_PATTERN.test('my-class')).toBe(true);
      expect(CSS_CLASS_PATTERN.test('_private')).toBe(true);
      expect(CSS_CLASS_PATTERN.test('-modifier')).toBe(true);
      expect(CSS_CLASS_PATTERN.test('CamelCase')).toBe(true);
      expect(CSS_CLASS_PATTERN.test('with123numbers')).toBe(true);
    });

    it('should not match invalid class names', () => {
      expect(CSS_CLASS_PATTERN.test('123invalid')).toBe(false);
      expect(CSS_CLASS_PATTERN.test('with space')).toBe(false);
      expect(CSS_CLASS_PATTERN.test('with@symbol')).toBe(false);
    });
  });

  describe('format constants', () => {
    it('SUPPORTED_IMAGE_FORMATS includes common formats', () => {
      expect(SUPPORTED_IMAGE_FORMATS).toContain('.png');
      expect(SUPPORTED_IMAGE_FORMATS).toContain('.jpg');
      expect(SUPPORTED_IMAGE_FORMATS).toContain('.gif');
      expect(SUPPORTED_IMAGE_FORMATS).toContain('.webp');
      expect(SUPPORTED_IMAGE_FORMATS).toContain('.svg');
    });

    it('SUPPORTED_AUDIO_FORMATS includes common formats', () => {
      expect(SUPPORTED_AUDIO_FORMATS).toContain('.mp3');
      expect(SUPPORTED_AUDIO_FORMATS).toContain('.wav');
      expect(SUPPORTED_AUDIO_FORMATS).toContain('.ogg');
    });

    it('SUPPORTED_VIDEO_FORMATS includes common formats', () => {
      expect(SUPPORTED_VIDEO_FORMATS).toContain('.mp4');
      expect(SUPPORTED_VIDEO_FORMATS).toContain('.webm');
    });

    it('KNOWN_THEMES includes standard themes', () => {
      expect(KNOWN_THEMES.has('default')).toBe(true);
      expect(KNOWN_THEMES.has('dark')).toBe(true);
      expect(KNOWN_THEMES.has('light')).toBe(true);
    });
  });
});
