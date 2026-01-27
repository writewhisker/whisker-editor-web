import { describe, it, expect } from 'vitest';
import * as Module from './index';
import {
  JSONExporter,
  TextExporter,
  AssetManager,
  storyToText,
  formatPassage,
  type StoryData,
  type Passage,
} from './index';

describe('@writewhisker/export-formats', () => {
  describe('module exports', () => {
    it('should export module', () => {
      expect(Module).toBeDefined();
      const exports = Object.keys(Module);
      expect(exports.length).toBeGreaterThan(0);
    });

    it('should export all required classes', () => {
      expect(Module.JSONExporter).toBeDefined();
      expect(Module.TextExporter).toBeDefined();
      expect(Module.AssetManager).toBeDefined();
    });
  });

  // ==========================================================================
  // GAP-048: JSON Assets Tests
  // ==========================================================================

  describe('AssetManager (GAP-048)', () => {
    let assetManager: AssetManager;

    beforeEach(() => {
      assetManager = new AssetManager();
    });

    describe('detectAssetType', () => {
      it('should detect image types', () => {
        expect(assetManager.detectAssetType('image/png')).toBe('image');
        expect(assetManager.detectAssetType('image/jpeg')).toBe('image');
        expect(assetManager.detectAssetType('image/gif')).toBe('image');
        expect(assetManager.detectAssetType('image/webp')).toBe('image');
        expect(assetManager.detectAssetType('image/svg+xml')).toBe('image');
      });

      it('should detect audio types', () => {
        expect(assetManager.detectAssetType('audio/mpeg')).toBe('audio');
        expect(assetManager.detectAssetType('audio/ogg')).toBe('audio');
        expect(assetManager.detectAssetType('audio/wav')).toBe('audio');
      });

      it('should detect video types', () => {
        expect(assetManager.detectAssetType('video/mp4')).toBe('video');
        expect(assetManager.detectAssetType('video/webm')).toBe('video');
      });

      it('should detect font types', () => {
        expect(assetManager.detectAssetType('font/woff')).toBe('font');
        expect(assetManager.detectAssetType('font/woff2')).toBe('font');
        expect(assetManager.detectAssetType('font/ttf')).toBe('font');
      });

      it('should fallback to data for unknown types', () => {
        expect(assetManager.detectAssetType('application/unknown')).toBe('data');
      });

      it('should detect type from path extension as fallback', () => {
        expect(assetManager.detectAssetType('application/octet-stream', 'image.png')).toBe('image');
        expect(assetManager.detectAssetType('application/octet-stream', 'audio.mp3')).toBe('audio');
      });
    });

    describe('detectMimeType', () => {
      it('should detect common MIME types from extensions', () => {
        expect(assetManager.detectMimeType('image.png')).toBe('image/png');
        expect(assetManager.detectMimeType('photo.jpg')).toBe('image/jpeg');
        expect(assetManager.detectMimeType('audio.mp3')).toBe('audio/mpeg');
        expect(assetManager.detectMimeType('video.mp4')).toBe('video/mp4');
        expect(assetManager.detectMimeType('font.woff2')).toBe('font/woff2');
      });

      it('should return application/octet-stream for unknown extensions', () => {
        expect(assetManager.detectMimeType('file.xyz')).toBe('application/octet-stream');
      });
    });

    describe('addAssetSync', () => {
      it('should add asset with base64 embedding', () => {
        const data = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG header
        const asset = assetManager.addAssetSync('images/test.png', data, {
          embedding: 'base64',
        });

        expect(asset.id).toMatch(/^asset-\d{3}$/);
        expect(asset.path).toBe('images/test.png');
        expect(asset.type).toBe('image');
        expect(asset.mimeType).toBe('image/png');
        expect(asset.size).toBe(4);
        expect(asset.embedding).toBe('base64');
        expect(asset.data).toBeDefined();
      });

      it('should add asset with reference embedding', () => {
        const data = new Uint8Array([0x00, 0x00]);
        const asset = assetManager.addAssetSync('audio/sound.mp3', data, {
          embedding: 'reference',
        });

        expect(asset.embedding).toBe('reference');
        expect(asset.data).toBeUndefined();
      });

      it('should include alt text when provided', () => {
        const data = new Uint8Array([0x00]);
        const asset = assetManager.addAssetSync('images/hero.png', data, {
          embedding: 'reference',
          altText: 'Hero portrait',
        });

        expect(asset.altText).toBe('Hero portrait');
      });
    });

    describe('generateManifest', () => {
      it('should generate complete manifest', () => {
        const data1 = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
        const data2 = new Uint8Array([0xFF, 0xD8, 0xFF]);

        assetManager.addAssetSync('img1.png', data1, { embedding: 'base64' });
        assetManager.addAssetSync('img2.jpg', data2, { embedding: 'reference' });

        const manifest = assetManager.generateManifest();

        expect(manifest.manifest).toHaveLength(2);
        expect(manifest.totalSize).toBe(7);
        expect(manifest.embeddedCount).toBe(1);
        expect(manifest.referencedCount).toBe(1);
      });
    });

    describe('findAssetByPath', () => {
      it('should find asset by path', () => {
        const data = new Uint8Array([0x00]);
        assetManager.addAssetSync('images/test.png', data, { embedding: 'reference' });

        const found = assetManager.findAssetByPath('images/test.png');
        expect(found).toBeDefined();
        expect(found?.path).toBe('images/test.png');
      });

      it('should return undefined for non-existent path', () => {
        const found = assetManager.findAssetByPath('nonexistent.png');
        expect(found).toBeUndefined();
      });
    });
  });

  describe('JSONExporter with Assets (GAP-048)', () => {
    it('should export story with WLS version', async () => {
      const story: StoryData = {
        title: 'Test Story',
        author: 'Test Author',
        passages: [
          { id: '1', title: 'Start', content: 'Begin here' },
        ],
      };

      const exporter = new JSONExporter();
      const json = await exporter.export(story);
      const data = JSON.parse(json);

      expect(data.wls).toBe('1.0.0');
      expect(data.format_version).toBe('1.0');
    });

    it('should include asset manifest when assets present', async () => {
      const assetData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
      const story: StoryData = {
        title: 'Test Story',
        passages: [{ id: '1', title: 'Start', content: 'Hello' }],
        assets: [
          {
            path: 'images/hero.png',
            data: assetData,
            mimeType: 'image/png',
            altText: 'Hero image',
          },
        ],
      };

      const exporter = new JSONExporter();
      const json = await exporter.export(story, {
        format: 'json',
        assetEmbedding: 'base64',
      });
      const data = JSON.parse(json);

      expect(data.assets).toBeDefined();
      expect(data.assets.manifest).toHaveLength(1);
      expect(data.assets.manifest[0].path).toBe('images/hero.png');
      expect(data.assets.manifest[0].embedding).toBe('base64');
    });
  });

  // ==========================================================================
  // GAP-049: JSON to Text Export Tests
  // ==========================================================================

  describe('TextExporter (GAP-049)', () => {
    let exporter: TextExporter;

    beforeEach(() => {
      exporter = new TextExporter();
    });

    describe('export', () => {
      it('should export story to .ws format', async () => {
        const story: StoryData = {
          title: 'Test Story',
          author: 'Test Author',
          passages: [
            { id: '1', title: 'Start', content: 'You begin your journey.', tags: ['start'] },
            { id: '2', title: 'End', content: 'The end.', tags: ['ending'] },
          ],
        };

        const text = await exporter.export(story);

        expect(text).toContain('@title Test Story');
        expect(text).toContain('@author Test Author');
        expect(text).toContain(':: Start [start]');
        expect(text).toContain('You begin your journey.');
        expect(text).toContain(':: End [ending]');
        expect(text).toContain('The end.');
      });

      it('should handle passages without tags', async () => {
        const story: StoryData = {
          title: 'Simple',
          passages: [
            { id: '1', title: 'Intro', content: 'Hello' },
          ],
        };

        const text = await exporter.export(story);
        expect(text).toContain(':: Intro');
        expect(text).not.toContain('[]');
      });

      it('should sort passages when sortPassages is true', async () => {
        const story: StoryData = {
          title: 'Test',
          passages: [
            { id: '1', title: 'Zebra', content: 'Z' },
            { id: '2', title: 'Apple', content: 'A' },
          ],
        };

        const text = await exporter.export(story, { format: 'ws', sortPassages: true });
        const appleIndex = text.indexOf(':: Apple');
        const zebraIndex = text.indexOf(':: Zebra');
        expect(appleIndex).toBeLessThan(zebraIndex);
      });

      it('should use CRLF line endings when specified', async () => {
        const story: StoryData = {
          title: 'Test',
          passages: [{ id: '1', title: 'P1', content: 'C1' }],
        };

        const text = await exporter.export(story, { format: 'ws', lineEnding: 'crlf' });
        expect(text).toContain('\r\n');
      });
    });

    describe('getFileExtension', () => {
      it('should return ws', () => {
        expect(exporter.getFileExtension()).toBe('ws');
      });
    });

    describe('getMimeType', () => {
      it('should return text/x-whisker', () => {
        expect(exporter.getMimeType()).toBe('text/x-whisker');
      });
    });
  });

  describe('storyToText utility (GAP-049)', () => {
    it('should convert story to text', async () => {
      const story: StoryData = {
        title: 'Quick Test',
        passages: [{ id: '1', title: 'Main', content: 'Content here' }],
      };

      const text = await storyToText(story);
      expect(text).toContain('@title Quick Test');
      expect(text).toContain(':: Main');
    });
  });

  describe('formatPassage utility (GAP-049)', () => {
    it('should format passage with tags', () => {
      const passage: Passage = {
        id: '1',
        title: 'TestPassage',
        content: 'Some content',
        tags: ['tag1', 'tag2'],
      };

      const formatted = formatPassage(passage);
      expect(formatted).toBe(':: TestPassage [tag1, tag2]\nSome content');
    });

    it('should format passage without tags', () => {
      const passage: Passage = {
        id: '1',
        title: 'Simple',
        content: 'Just text',
      };

      const formatted = formatPassage(passage);
      expect(formatted).toBe(':: Simple\nJust text');
    });
  });
});
