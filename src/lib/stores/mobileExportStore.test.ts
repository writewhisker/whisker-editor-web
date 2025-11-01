import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  mobileExportStore,
  exportTarget,
  playerConfig,
  appMetadata,
  type ExportTarget,
  type PWAConfig,
  type CordovaConfig,
  type CapacitorConfig,
  type MobilePlayerConfig,
  type AppStoreMetadata,
} from './mobileExportStore';
import type { Story } from './projectStore';

describe('mobileExportStore', () => {
  let story: Story;

  beforeEach(() => {
    story = {
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
      },
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          content: 'Welcome to the story. [[Continue|passage-2]]',
          choices: [],
          x: 0,
          y: 0,
        },
        {
          id: 'passage-2',
          title: 'Middle',
          content: 'The middle of the story. [[End|passage-3]]',
          choices: [],
          x: 100,
          y: 0,
        },
        {
          id: 'passage-3',
          title: 'End',
          content: 'The end of the story.',
          choices: [],
          x: 200,
          y: 0,
        },
      ],
      startPassage: 'passage-1',
      variables: [],
    } as Story;

    mobileExportStore.reset();
  });

  afterEach(() => {
    mobileExportStore.reset();
  });

  describe('initial state', () => {
    it('should initialize with PWA as default target', () => {
      expect(get(exportTarget)).toBe('pwa');
    });

    it('should initialize with default player config', () => {
      const config = get(playerConfig);
      expect(config.enableSwipeGestures).toBe(true);
      expect(config.enableVibration).toBe(true);
      expect(config.fontSize).toBe('medium');
      expect(config.theme).toBe('auto');
    });

    it('should initialize with default app metadata', () => {
      const metadata = get(appMetadata);
      expect(metadata.title).toBe('My Interactive Story');
      expect(metadata.category).toBe('Entertainment');
      expect(metadata.contentRating).toBe('Everyone');
    });
  });

  describe('setTarget', () => {
    it('should set export target to PWA', () => {
      mobileExportStore.setTarget('pwa');
      expect(get(exportTarget)).toBe('pwa');
    });

    it('should set export target to Cordova', () => {
      mobileExportStore.setTarget('cordova');
      expect(get(exportTarget)).toBe('cordova');
    });

    it('should set export target to Capacitor', () => {
      mobileExportStore.setTarget('capacitor');
      expect(get(exportTarget)).toBe('capacitor');
    });

    it('should set export target to standalone', () => {
      mobileExportStore.setTarget('standalone');
      expect(get(exportTarget)).toBe('standalone');
    });
  });

  describe('updatePWAConfig', () => {
    it('should update PWA name', () => {
      mobileExportStore.updatePWAConfig({ name: 'My Custom PWA' });

      const state = get(mobileExportStore);
      expect(state.pwa?.name).toBe('My Custom PWA');
    });

    it('should update PWA theme color', () => {
      mobileExportStore.updatePWAConfig({ themeColor: '#ff0000' });

      const state = get(mobileExportStore);
      expect(state.pwa?.themeColor).toBe('#ff0000');
    });

    it('should update PWA display mode', () => {
      mobileExportStore.updatePWAConfig({ display: 'fullscreen' });

      const state = get(mobileExportStore);
      expect(state.pwa?.display).toBe('fullscreen');
    });

    it('should update PWA orientation', () => {
      mobileExportStore.updatePWAConfig({ orientation: 'landscape' });

      const state = get(mobileExportStore);
      expect(state.pwa?.orientation).toBe('landscape');
    });

    it('should preserve other PWA config fields', () => {
      mobileExportStore.updatePWAConfig({ name: 'Updated Name' });

      const state = get(mobileExportStore);
      expect(state.pwa?.shortName).toBeDefined();
      expect(state.pwa?.description).toBeDefined();
    });
  });

  describe('updateCordovaConfig', () => {
    it('should update Cordova app ID', () => {
      mobileExportStore.updateCordovaConfig({ id: 'com.mycompany.app' });

      const state = get(mobileExportStore);
      expect(state.cordova?.id).toBe('com.mycompany.app');
    });

    it('should update Cordova version', () => {
      mobileExportStore.updateCordovaConfig({ version: '2.0.0' });

      const state = get(mobileExportStore);
      expect(state.cordova?.version).toBe('2.0.0');
    });

    it('should update Cordova author', () => {
      mobileExportStore.updateCordovaConfig({ author: 'John Doe' });

      const state = get(mobileExportStore);
      expect(state.cordova?.author).toBe('John Doe');
    });

    it('should update Cordova platforms', () => {
      mobileExportStore.updateCordovaConfig({ platforms: ['ios'] });

      const state = get(mobileExportStore);
      expect(state.cordova?.platforms).toEqual(['ios']);
    });
  });

  describe('updateCapacitorConfig', () => {
    it('should update Capacitor app ID', () => {
      mobileExportStore.updateCapacitorConfig({ appId: 'io.myapp.story' });

      const state = get(mobileExportStore);
      expect(state.capacitor?.appId).toBe('io.myapp.story');
    });

    it('should update Capacitor app name', () => {
      mobileExportStore.updateCapacitorConfig({ appName: 'Story App' });

      const state = get(mobileExportStore);
      expect(state.capacitor?.appName).toBe('Story App');
    });

    it('should update Capacitor web directory', () => {
      mobileExportStore.updateCapacitorConfig({ webDir: 'build' });

      const state = get(mobileExportStore);
      expect(state.capacitor?.webDir).toBe('build');
    });
  });

  describe('updatePlayerConfig', () => {
    it('should toggle swipe gestures', () => {
      mobileExportStore.updatePlayerConfig({ enableSwipeGestures: false });

      const config = get(playerConfig);
      expect(config.enableSwipeGestures).toBe(false);
    });

    it('should toggle vibration', () => {
      mobileExportStore.updatePlayerConfig({ enableVibration: false });

      const config = get(playerConfig);
      expect(config.enableVibration).toBe(false);
    });

    it('should toggle fullscreen', () => {
      mobileExportStore.updatePlayerConfig({ enableFullscreen: true });

      const config = get(playerConfig);
      expect(config.enableFullscreen).toBe(true);
    });

    it('should toggle auto-save', () => {
      mobileExportStore.updatePlayerConfig({ autoSave: false });

      const config = get(playerConfig);
      expect(config.autoSave).toBe(false);
    });

    it('should update font size', () => {
      mobileExportStore.updatePlayerConfig({ fontSize: 'large' });

      const config = get(playerConfig);
      expect(config.fontSize).toBe('large');
    });

    it('should update theme', () => {
      mobileExportStore.updatePlayerConfig({ theme: 'dark' });

      const config = get(playerConfig);
      expect(config.theme).toBe('dark');
    });

    it('should toggle transitions', () => {
      mobileExportStore.updatePlayerConfig({ transitions: false });

      const config = get(playerConfig);
      expect(config.transitions).toBe(false);
    });
  });

  describe('updateMetadata', () => {
    it('should update app title', () => {
      mobileExportStore.updateMetadata({ title: 'Amazing Story' });

      const metadata = get(appMetadata);
      expect(metadata.title).toBe('Amazing Story');
    });

    it('should update app subtitle', () => {
      mobileExportStore.updateMetadata({ subtitle: 'An epic tale' });

      const metadata = get(appMetadata);
      expect(metadata.subtitle).toBe('An epic tale');
    });

    it('should update app description', () => {
      mobileExportStore.updateMetadata({ description: 'A detailed description' });

      const metadata = get(appMetadata);
      expect(metadata.description).toBe('A detailed description');
    });

    it('should update keywords', () => {
      mobileExportStore.updateMetadata({ keywords: ['rpg', 'adventure', 'fantasy'] });

      const metadata = get(appMetadata);
      expect(metadata.keywords).toEqual(['rpg', 'adventure', 'fantasy']);
    });

    it('should update category', () => {
      mobileExportStore.updateMetadata({ category: 'Games' });

      const metadata = get(appMetadata);
      expect(metadata.category).toBe('Games');
    });

    it('should update content rating', () => {
      mobileExportStore.updateMetadata({ contentRating: 'Teen' });

      const metadata = get(appMetadata);
      expect(metadata.contentRating).toBe('Teen');
    });

    it('should update support URL', () => {
      mobileExportStore.updateMetadata({ supportUrl: 'https://support.example.com' });

      const metadata = get(appMetadata);
      expect(metadata.supportUrl).toBe('https://support.example.com');
    });
  });

  describe('generateExport - PWA', () => {
    beforeEach(() => {
      mobileExportStore.setTarget('pwa');
    });

    it('should generate PWA manifest file', () => {
      const { files } = mobileExportStore.generateExport(story);

      expect(files.has('manifest.json')).toBe(true);
      const manifest = files.get('manifest.json')!;
      expect(manifest).toContain('"name"');
      expect(manifest).toContain('"short_name"');
    });

    it('should generate service worker file', () => {
      const { files } = mobileExportStore.generateExport(story);

      expect(files.has('sw.js')).toBe(true);
      const sw = files.get('sw.js')!;
      expect(sw).toContain('CACHE_NAME');
      expect(sw).toContain('addEventListener');
    });

    it('should generate mobile player HTML', () => {
      const { files } = mobileExportStore.generateExport(story);

      expect(files.has('index.html')).toBe(true);
      const html = files.get('index.html')!;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain(story.metadata.title);
    });

    it('should include PWA installation instructions', () => {
      const { instructions } = mobileExportStore.generateExport(story);

      expect(instructions).toContain('PWA Export Instructions');
      expect(instructions).toContain('HTTPS');
      expect(instructions).toContain('manifest.json');
    });

    it('should embed story data in player', () => {
      const { files } = mobileExportStore.generateExport(story);

      const html = files.get('index.html')!;
      expect(html).toContain('const story =');
      expect(html).toContain(story.passages[0].title);
    });
  });

  describe('generateExport - Cordova', () => {
    beforeEach(() => {
      mobileExportStore.setTarget('cordova');
    });

    it('should generate config.xml', () => {
      const { files } = mobileExportStore.generateExport(story);

      expect(files.has('config.xml')).toBe(true);
      const config = files.get('config.xml')!;
      expect(config).toContain('<?xml version');
      expect(config).toContain('<widget');
    });

    it('should include app metadata in config.xml', () => {
      mobileExportStore.updateMetadata({
        title: 'My Cordova App',
        description: 'Test description',
      });

      const { files } = mobileExportStore.generateExport(story);
      const config = files.get('config.xml')!;

      expect(config).toContain('My Cordova App');
      expect(config).toContain('Test description');
    });

    it('should generate player in www directory', () => {
      const { files } = mobileExportStore.generateExport(story);

      expect(files.has('www/index.html')).toBe(true);
    });

    it('should include Cordova installation instructions', () => {
      const { instructions } = mobileExportStore.generateExport(story);

      expect(instructions).toContain('Cordova Export Instructions');
      expect(instructions).toContain('npm install -g cordova');
      expect(instructions).toContain('cordova platform add');
    });
  });

  describe('generateExport - Capacitor', () => {
    beforeEach(() => {
      mobileExportStore.setTarget('capacitor');
    });

    it('should generate capacitor.config.json', () => {
      const { files } = mobileExportStore.generateExport(story);

      expect(files.has('capacitor.config.json')).toBe(true);
      const config = files.get('capacitor.config.json')!;
      const parsed = JSON.parse(config);
      expect(parsed.appId).toBeDefined();
      expect(parsed.appName).toBeDefined();
    });

    it('should generate player in dist directory', () => {
      const { files } = mobileExportStore.generateExport(story);

      expect(files.has('dist/index.html')).toBe(true);
    });

    it('should include Capacitor installation instructions', () => {
      const { instructions } = mobileExportStore.generateExport(story);

      expect(instructions).toContain('Capacitor Export Instructions');
      expect(instructions).toContain('@capacitor/core');
      expect(instructions).toContain('npx cap');
    });
  });

  describe('generateExport - Standalone', () => {
    beforeEach(() => {
      mobileExportStore.setTarget('standalone');
    });

    it('should generate single HTML file', () => {
      const { files } = mobileExportStore.generateExport(story);

      expect(files.has('story.html')).toBe(true);
      expect(files.size).toBe(1);
    });

    it('should include simple instructions', () => {
      const { instructions } = mobileExportStore.generateExport(story);

      expect(instructions).toContain('Standalone HTML Instructions');
      expect(instructions).toContain('mobile browser');
    });

    it('should embed all resources inline', () => {
      const { files } = mobileExportStore.generateExport(story);

      const html = files.get('story.html')!;
      expect(html).toContain('<style>');
      expect(html).toContain('<script>');
    });
  });

  describe('player configuration in export', () => {
    it('should apply font size to player', () => {
      mobileExportStore.updatePlayerConfig({ fontSize: 'large' });

      const { files } = mobileExportStore.generateExport(story);
      const html = files.get('index.html')!;

      expect(html).toContain('font-size: 18px');
    });

    it('should apply dark theme to player', () => {
      mobileExportStore.updatePlayerConfig({ theme: 'dark' });

      const { files } = mobileExportStore.generateExport(story);
      const html = files.get('index.html')!;

      expect(html).toContain('--bg-color: #111827');
    });

    it('should apply light theme to player', () => {
      mobileExportStore.updatePlayerConfig({ theme: 'light' });

      const { files } = mobileExportStore.generateExport(story);
      const html = files.get('index.html')!;

      expect(html).toContain('--bg-color: #ffffff');
    });

    it('should include swipe gesture code when enabled', () => {
      mobileExportStore.updatePlayerConfig({ enableSwipeGestures: true });

      const { files } = mobileExportStore.generateExport(story);
      const html = files.get('index.html')!;

      expect(html).toContain('touchstart');
      expect(html).toContain('touchend');
    });

    it('should exclude swipe gesture code when disabled', () => {
      mobileExportStore.updatePlayerConfig({ enableSwipeGestures: false });

      const { files } = mobileExportStore.generateExport(story);
      const html = files.get('index.html')!;

      expect(html).not.toContain('handleSwipe');
    });

    it('should include vibration code when enabled', () => {
      mobileExportStore.updatePlayerConfig({ enableVibration: true });

      const { files } = mobileExportStore.generateExport(story);
      const html = files.get('index.html')!;

      expect(html).toContain('navigator.vibrate');
    });

    it('should include auto-save code when enabled', () => {
      mobileExportStore.updatePlayerConfig({ autoSave: true });

      const { files } = mobileExportStore.generateExport(story);
      const html = files.get('index.html')!;

      expect(html).toContain('localStorage.getItem');
      expect(html).toContain('game_save');
    });

    it('should exclude transitions when disabled', () => {
      mobileExportStore.updatePlayerConfig({ transitions: false });

      const { files } = mobileExportStore.generateExport(story);
      const html = files.get('index.html')!;

      expect(html).not.toContain('animation: fadeIn');
    });
  });

  describe('reset', () => {
    it('should reset to default configuration', () => {
      mobileExportStore.setTarget('cordova');
      mobileExportStore.updatePlayerConfig({ fontSize: 'large', theme: 'dark' });
      mobileExportStore.updateMetadata({ title: 'Custom Title' });

      mobileExportStore.reset();

      expect(get(exportTarget)).toBe('pwa');
      expect(get(playerConfig).fontSize).toBe('medium');
      expect(get(playerConfig).theme).toBe('auto');
      expect(get(appMetadata).title).toBe('My Interactive Story');
    });
  });

  describe('edge cases', () => {
    it('should handle story with no passages', () => {
      const emptyStory = {
        ...story,
        passages: [],
      };

      const { files } = mobileExportStore.generateExport(emptyStory);
      const html = files.get('index.html')!;

      expect(html).toContain('const story =');
    });

    it('should handle story with special characters in title', () => {
      const specialStory = {
        ...story,
        metadata: {
          ...story.metadata,
          title: 'Story "with" <special> & characters',
        },
      };

      const { files } = mobileExportStore.generateExport(specialStory);
      const html = files.get('index.html')!;

      expect(html).toContain('Story "with" <special> & characters');
    });

    it('should handle empty metadata fields', () => {
      mobileExportStore.updateMetadata({
        title: '',
        description: '',
        keywords: [],
      });

      const { files } = mobileExportStore.generateExport(story);

      expect(files.has('index.html')).toBe(true);
    });
  });

  describe('derived stores', () => {
    it('should update exportTarget derived store', () => {
      mobileExportStore.setTarget('capacitor');

      expect(get(exportTarget)).toBe('capacitor');
    });

    it('should update playerConfig derived store', () => {
      mobileExportStore.updatePlayerConfig({ fontSize: 'small' });

      const config = get(playerConfig);
      expect(config.fontSize).toBe('small');
    });

    it('should update appMetadata derived store', () => {
      mobileExportStore.updateMetadata({ category: 'Education' });

      const metadata = get(appMetadata);
      expect(metadata.category).toBe('Education');
    });
  });
});
