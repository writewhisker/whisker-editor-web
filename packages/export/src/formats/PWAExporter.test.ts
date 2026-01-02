/**
 * PWA Exporter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PWAExporter } from './PWAExporter';
import { Story, Passage } from '@writewhisker/story-models';
import type { ExportContext } from '../types';

describe('PWAExporter', () => {
  let exporter: PWAExporter;
  let testStory: Story;

  beforeEach(() => {
    exporter = new PWAExporter();
    testStory = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        description: 'A test story',
      },
      startPassage: 'start',
      passages: {
        start: {
          id: 'start',
          title: 'Start',
          content: 'Welcome to the story!',
          choices: [
            { id: 'c1', text: 'Continue', target: 'end' }
          ]
        },
        end: {
          id: 'end',
          title: 'End',
          content: 'The End.',
          choices: []
        }
      },
      variables: {}
    });
  });

  describe('metadata', () => {
    it('should have correct name and format', () => {
      expect(exporter.name).toBe('PWA Exporter');
      expect(exporter.format).toBe('pwa');
      expect(exporter.extension).toBe('.zip');
      expect(exporter.mimeType).toBe('application/zip');
    });
  });

  describe('export', () => {
    const createContext = (story: Story, options = {}): ExportContext => ({
      story,
      options,
    });

    it('should export a story successfully', async () => {
      const result = await exporter.export(createContext(testStory));

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.filename).toContain('test_story');
      expect(result.filename).toContain('pwa.zip');
    });

    it('should generate multiple files', async () => {
      const result = await exporter.export(createContext(testStory));

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      expect(result.files!.has('index.html')).toBe(true);
      expect(result.files!.has('manifest.json')).toBe(true);
      expect(result.files!.has('sw.js')).toBe(true);
      expect(result.files!.has('offline.html')).toBe(true);
    });

    it('should generate valid manifest.json', async () => {
      const result = await exporter.export(createContext(testStory));

      expect(result.success).toBe(true);
      const manifest = JSON.parse(result.files!.get('manifest.json')!);

      expect(manifest.name).toBe('Test Story');
      expect(manifest.short_name).toBeDefined();
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThan(0);
    });

    it('should include service worker', async () => {
      const result = await exporter.export(createContext(testStory));

      expect(result.success).toBe(true);
      const sw = result.files!.get('sw.js')!;

      expect(sw).toContain('CACHE_NAME');
      expect(sw).toContain("self.addEventListener('install'");
      expect(sw).toContain("self.addEventListener('fetch'");
    });

    it('should include PWA meta tags in HTML', async () => {
      const result = await exporter.export(createContext(testStory));

      expect(result.success).toBe(true);
      const html = result.files!.get('index.html')!;

      expect(html).toContain('rel="manifest"');
      expect(html).toContain('meta name="theme-color"');
      expect(html).toContain('apple-mobile-web-app-capable');
      expect(html).toContain('serviceWorker');
    });

    it('should use custom options', async () => {
      const result = await exporter.export(createContext(testStory, {
        appName: 'Custom App',
        themeColor: '#ff0000',
        display: 'fullscreen',
      }));

      expect(result.success).toBe(true);
      const manifest = JSON.parse(result.files!.get('manifest.json')!);

      expect(manifest.name).toBe('Custom App');
      expect(manifest.theme_color).toBe('#ff0000');
      expect(manifest.display).toBe('fullscreen');
    });

    it('should include story data in HTML', async () => {
      const result = await exporter.export(createContext(testStory));

      expect(result.success).toBe(true);
      const html = result.files!.get('index.html')!;

      expect(html).toContain('STORY_DATA');
      expect(html).toContain('Welcome to the story');
    });

    it('should generate offline page', async () => {
      const result = await exporter.export(createContext(testStory));

      expect(result.success).toBe(true);
      const offline = result.files!.get('offline.html')!;

      expect(offline).toContain("You're Offline");
      expect(offline).toContain('Retry');
    });

    it('should handle story without description', async () => {
      const storyNoDesc = new Story({
        metadata: {
          title: 'No Description',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
        startPassage: 'start',
        passages: {
          start: { id: 'start', title: 'Start', content: 'Hello', choices: [] }
        },
        variables: {}
      });

      const result = await exporter.export(createContext(storyNoDesc));

      expect(result.success).toBe(true);
      const manifest = JSON.parse(result.files!.get('manifest.json')!);
      expect(manifest.description).toBeDefined();
    });
  });
});
