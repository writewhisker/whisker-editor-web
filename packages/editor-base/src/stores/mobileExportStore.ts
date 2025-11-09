/**
 * Mobile Export Store
 *
 * Manages export of interactive stories to mobile platforms:
 * - PWA (Progressive Web App) configuration
 * - Cordova/Capacitor packaging
 * - Self-contained HTML bundles
 * - Mobile-optimized player
 * - App store metadata
 */

import { writable, derived } from 'svelte/store';
import type { Story } from '@whisker/core-ts';

export type ExportTarget = 'pwa' | 'cordova' | 'capacitor' | 'standalone';
export type Orientation = 'portrait' | 'landscape' | 'any';
export type ThemePreference = 'light' | 'dark' | 'auto';

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui';
  orientation: Orientation;
  startUrl: string;
  scope: string;
  icons: PWAIcon[];
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
}

export interface CordovaConfig {
  id: string;
  version: string;
  author: string;
  email: string;
  website: string;
  platforms: ('ios' | 'android')[];
  preferences: Record<string, string>;
  plugins: CordovaPlugin[];
}

export interface CordovaPlugin {
  name: string;
  spec: string;
  variables?: Record<string, string>;
}

export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime: boolean;
  plugins: Record<string, any>;
}

export interface MobilePlayerConfig {
  enableSwipeGestures: boolean;
  enableVibration: boolean;
  enableFullscreen: boolean;
  autoSave: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: ThemePreference;
  transitions: boolean;
}

export interface AppStoreMetadata {
  title: string;
  subtitle: string;
  description: string;
  keywords: string[];
  category: string;
  contentRating: string;
  screenshots: string[];
  privacyPolicyUrl?: string;
  supportUrl?: string;
}

export interface MobileExportConfig {
  target: ExportTarget;
  pwa?: PWAConfig;
  cordova?: CordovaConfig;
  capacitor?: CapacitorConfig;
  player: MobilePlayerConfig;
  metadata: AppStoreMetadata;
}

const DEFAULT_PWA_CONFIG: PWAConfig = {
  name: 'My Interactive Story',
  shortName: 'Story',
  description: 'An interactive fiction experience',
  themeColor: '#2563eb',
  backgroundColor: '#ffffff',
  display: 'standalone',
  orientation: 'portrait',
  startUrl: '/',
  scope: '/',
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
};

const DEFAULT_CORDOVA_CONFIG: CordovaConfig = {
  id: 'com.example.story',
  version: '1.0.0',
  author: '',
  email: '',
  website: '',
  platforms: ['ios', 'android'],
  preferences: {
    Orientation: 'portrait',
    Fullscreen: 'false',
  },
  plugins: [
    {
      name: 'cordova-plugin-whitelist',
      spec: '^1.0.0',
    },
  ],
};

const DEFAULT_CAPACITOR_CONFIG: CapacitorConfig = {
  appId: 'com.example.story',
  appName: 'My Story',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {},
};

const DEFAULT_PLAYER_CONFIG: MobilePlayerConfig = {
  enableSwipeGestures: true,
  enableVibration: true,
  enableFullscreen: false,
  autoSave: true,
  fontSize: 'medium',
  theme: 'auto',
  transitions: true,
};

const DEFAULT_METADATA: AppStoreMetadata = {
  title: 'My Interactive Story',
  subtitle: 'An engaging tale',
  description: 'Embark on an interactive adventure',
  keywords: ['interactive', 'fiction', 'story', 'adventure'],
  category: 'Entertainment',
  contentRating: 'Everyone',
  screenshots: [],
};

const DEFAULT_CONFIG: MobileExportConfig = {
  target: 'pwa',
  pwa: DEFAULT_PWA_CONFIG,
  cordova: DEFAULT_CORDOVA_CONFIG,
  capacitor: DEFAULT_CAPACITOR_CONFIG,
  player: DEFAULT_PLAYER_CONFIG,
  metadata: DEFAULT_METADATA,
};

// Generate PWA manifest
function generateManifest(config: PWAConfig): string {
  return JSON.stringify({
    name: config.name,
    short_name: config.shortName,
    description: config.description,
    start_url: config.startUrl,
    scope: config.scope,
    display: config.display,
    orientation: config.orientation,
    theme_color: config.themeColor,
    background_color: config.backgroundColor,
    icons: config.icons,
  }, null, 2);
}

// Generate service worker for PWA
function generateServiceWorker(): string {
  return `
const CACHE_NAME = 'story-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/bundle.css',
  '/bundle.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});
`.trim();
}

// Generate Cordova config.xml
function generateCordovaConfig(config: CordovaConfig, metadata: AppStoreMetadata): string {
  return `<?xml version='1.0' encoding='utf-8'?>
<widget id="${config.id}" version="${config.version}" xmlns="http://www.w3.org/ns/widgets">
  <name>${metadata.title}</name>
  <description>${metadata.description}</description>
  <author email="${config.email}" href="${config.website}">
    ${config.author}
  </author>
  <content src="index.html" />
  <access origin="*" />
  <allow-intent href="http://*/*" />
  <allow-intent href="https://*/*" />

  ${Object.entries(config.preferences).map(([key, value]) =>
    `<preference name="${key}" value="${value}" />`
  ).join('\n  ')}

  ${config.platforms.map(platform => `<platform name="${platform}"></platform>`).join('\n  ')}

  ${config.plugins.map(plugin =>
    `<plugin name="${plugin.name}" spec="${plugin.spec}" />`
  ).join('\n  ')}
</widget>`;
}

// Generate Capacitor config
function generateCapacitorConfig(config: CapacitorConfig): string {
  return JSON.stringify({
    appId: config.appId,
    appName: config.appName,
    webDir: config.webDir,
    bundledWebRuntime: config.bundledWebRuntime,
    plugins: config.plugins,
  }, null, 2);
}

// Generate mobile-optimized player HTML
function generateMobilePlayer(story: Story, playerConfig: MobilePlayerConfig): string {
  const storyData = JSON.stringify(story);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <title>${story.metadata.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text-color);
      background: var(--bg-color);
      overflow-x: hidden;
      ${playerConfig.fontSize === 'small' ? 'font-size: 14px;' : ''}
      ${playerConfig.fontSize === 'large' ? 'font-size: 18px;' : ''}
    }

    :root {
      --text-color: #1f2937;
      --bg-color: #ffffff;
      --link-color: #2563eb;
      --border-color: #e5e7eb;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --text-color: #f9fafb;
        --bg-color: #111827;
        --link-color: #60a5fa;
        --border-color: #374151;
      }
    }

    ${playerConfig.theme === 'dark' ? `
    :root {
      --text-color: #f9fafb;
      --bg-color: #111827;
      --link-color: #60a5fa;
      --border-color: #374151;
    }
    ` : ''}

    ${playerConfig.theme === 'light' ? `
    :root {
      --text-color: #1f2937;
      --bg-color: #ffffff;
      --link-color: #2563eb;
      --border-color: #e5e7eb;
    }
    ` : ''}

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--border-color);
    }

    h1 { font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #6b7280; font-size: 14px; }

    .passage {
      flex: 1;
      margin-bottom: 20px;
      ${playerConfig.transitions ? 'animation: fadeIn 0.3s ease-in;' : ''}
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .passage-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
    }

    .passage-content {
      margin-bottom: 20px;
      white-space: pre-wrap;
    }

    .choices {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .choice {
      background: var(--link-color);
      color: white;
      padding: 15px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: opacity 0.2s;
      text-align: left;
      -webkit-tap-highlight-color: transparent;
    }

    .choice:active {
      opacity: 0.7;
    }

    .footer {
      margin-top: auto;
      padding-top: 15px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #6b7280;
    }

    button {
      background: var(--border-color);
      color: var(--text-color);
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 id="story-title"></h1>
      <div class="subtitle" id="story-author"></div>
    </div>

    <div class="passage" id="passage-container">
      <div class="passage-title" id="passage-title"></div>
      <div class="passage-content" id="passage-content"></div>
      <div class="choices" id="choices"></div>
    </div>

    <div class="footer">
      <button onclick="restart()">Restart</button>
      <button onclick="toggleFullscreen()">Fullscreen</button>
    </div>
  </div>

  <script>
    const story = ${storyData};
    const config = ${JSON.stringify(playerConfig)};
    let currentPassageId = story.startPassage || story.passages[0]?.id;
    let gameState = { variables: {}, history: [] };

    // Load saved game
    if (config.autoSave) {
      const saved = localStorage.getItem('game_save');
      if (saved) {
        try {
          gameState = JSON.parse(saved);
          currentPassageId = gameState.currentPassageId || currentPassageId;
        } catch (e) {
          console.error('Failed to load save:', e);
        }
      }
    }

    function init() {
      document.getElementById('story-title').textContent = story.metadata.title;
      document.getElementById('story-author').textContent = story.metadata.author || '';
      displayPassage(currentPassageId);
    }

    function displayPassage(passageId) {
      const passage = story.passages.find(p => p.id === passageId);
      if (!passage) {
        console.error('Passage not found:', passageId);
        return;
      }

      currentPassageId = passageId;
      gameState.history.push(passageId);

      document.getElementById('passage-title').textContent = passage.title;
      document.getElementById('passage-content').textContent = passage.content;

      const choicesContainer = document.getElementById('choices');
      choicesContainer.innerHTML = '';

      // Extract links from passage content
      const linkRegex = /\\[\\[([^\\]]+)\\]\\]/g;
      let match;
      const links = [];

      while ((match = linkRegex.exec(passage.content)) !== null) {
        const linkText = match[1];
        const parts = linkText.split('|');
        const displayText = parts[0];
        const targetTitle = parts[1] || displayText;

        const targetPassage = story.passages.find(p => p.title === targetTitle);
        if (targetPassage) {
          links.push({ displayText, targetId: targetPassage.id });
        }
      }

      links.forEach(link => {
        const button = document.createElement('button');
        button.className = 'choice';
        button.textContent = link.displayText;
        button.onclick = () => {
          if (config.enableVibration && navigator.vibrate) {
            navigator.vibrate(10);
          }
          displayPassage(link.targetId);
        };
        choicesContainer.appendChild(button);
      });

      // Auto-save
      if (config.autoSave) {
        gameState.currentPassageId = currentPassageId;
        localStorage.setItem('game_save', JSON.stringify(gameState));
      }
    }

    function restart() {
      if (confirm('Restart the story?')) {
        gameState = { variables: {}, history: [] };
        localStorage.removeItem('game_save');
        currentPassageId = story.startPassage || story.passages[0]?.id;
        displayPassage(currentPassageId);
      }
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }

    ${playerConfig.enableSwipeGestures ? `
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });

    function handleSwipe() {
      if (touchStartX - touchEndX > 50) {
        // Swipe left - go forward (not implemented)
      }
      if (touchEndX - touchStartX > 50) {
        // Swipe right - go back
        if (gameState.history.length > 1) {
          gameState.history.pop(); // Remove current
          const previousId = gameState.history.pop(); // Get previous
          displayPassage(previousId);
        }
      }
    }
    ` : ''}

    init();
  </script>
</body>
</html>`;
}

// Create mobile export store
const createMobileExportStore = () => {
  const { subscribe, set, update } = writable<MobileExportConfig>(DEFAULT_CONFIG);

  return {
    subscribe,

    /**
     * Set export target
     */
    setTarget: (target: ExportTarget) => {
      update(state => ({ ...state, target }));
    },

    /**
     * Update PWA config
     */
    updatePWAConfig: (updates: Partial<PWAConfig>) => {
      update(state => ({
        ...state,
        pwa: { ...state.pwa!, ...updates },
      }));
    },

    /**
     * Update Cordova config
     */
    updateCordovaConfig: (updates: Partial<CordovaConfig>) => {
      update(state => ({
        ...state,
        cordova: { ...state.cordova!, ...updates },
      }));
    },

    /**
     * Update Capacitor config
     */
    updateCapacitorConfig: (updates: Partial<CapacitorConfig>) => {
      update(state => ({
        ...state,
        capacitor: { ...state.capacitor!, ...updates },
      }));
    },

    /**
     * Update player config
     */
    updatePlayerConfig: (updates: Partial<MobilePlayerConfig>) => {
      update(state => ({
        ...state,
        player: { ...state.player, ...updates },
      }));
    },

    /**
     * Update metadata
     */
    updateMetadata: (updates: Partial<AppStoreMetadata>) => {
      update(state => ({
        ...state,
        metadata: { ...state.metadata, ...updates },
      }));
    },

    /**
     * Generate export package
     */
    generateExport: (story: Story): { files: Map<string, string>; instructions: string } => {
      let config: MobileExportConfig = DEFAULT_CONFIG;
      const unsubscribe = subscribe(state => { config = state; });
      unsubscribe();

      const files = new Map<string, string>();

      if (config.target === 'pwa') {
        files.set('manifest.json', generateManifest(config.pwa!));
        files.set('sw.js', generateServiceWorker());
        files.set('index.html', generateMobilePlayer(story, config.player));

        return {
          files,
          instructions: `
PWA Export Instructions:
1. Upload all files to a web server with HTTPS
2. Register the service worker in your main HTML
3. Add <link rel="manifest" href="/manifest.json"> to your HTML
4. Generate icons at required sizes (192x192, 512x512)
5. Test installation on mobile devices
6. Users can "Add to Home Screen" to install
          `.trim(),
        };
      }

      if (config.target === 'cordova') {
        files.set('config.xml', generateCordovaConfig(config.cordova!, config.metadata));
        files.set('www/index.html', generateMobilePlayer(story, config.player));

        return {
          files,
          instructions: `
Cordova Export Instructions:
1. Install Cordova: npm install -g cordova
2. Create project: cordova create myapp ${config.cordova!.id} "${config.metadata.title}"
3. Copy config.xml and www/index.html to project
4. Add platforms: cordova platform add ios android
5. Build: cordova build
6. Test: cordova run android/ios
7. For App Store submission, use cordova build --release
          `.trim(),
        };
      }

      if (config.target === 'capacitor') {
        files.set('capacitor.config.json', generateCapacitorConfig(config.capacitor!));
        files.set('dist/index.html', generateMobilePlayer(story, config.player));

        return {
          files,
          instructions: `
Capacitor Export Instructions:
1. Install Capacitor: npm install @capacitor/core @capacitor/cli
2. Initialize: npx cap init
3. Copy capacitor.config.json to project root
4. Copy dist/index.html to your webDir
5. Add platforms: npx cap add ios android
6. Sync: npx cap sync
7. Open IDE: npx cap open ios/android
8. Build and submit through Xcode/Android Studio
          `.trim(),
        };
      }

      // Standalone HTML
      files.set('story.html', generateMobilePlayer(story, config.player));

      return {
        files,
        instructions: `
Standalone HTML Instructions:
1. Open story.html in any mobile browser
2. Can be hosted on any web server
3. Works offline once loaded
4. No installation required
        `.trim(),
      };
    },

    /**
     * Reset to defaults
     */
    reset: () => {
      set(DEFAULT_CONFIG);
    },
  };
};

export const mobileExportStore = createMobileExportStore();

// Derived stores
export const exportTarget = derived(mobileExportStore, $store => $store.target);
export const playerConfig = derived(mobileExportStore, $store => $store.player);
export const appMetadata = derived(mobileExportStore, $store => $store.metadata);
